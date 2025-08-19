import {
  calculateReshuffleCutoff,
  needsReshuffle,
  createNewShoe,
  determineSeatAction,
  executeSeatAction,
  calculateBankrollChanges,
  updateBankrolls,
  updateCasinoBank,
  prepareTableForNextHand
} from './simulationEngine';

// Simple table state interface for simulation
interface SimTableState {
  seats: Array<{
    bet: number;
    hands: any[][];
    bankroll: number;
  }>;
  dealerHand: any[];
  shoe: any[];
  status: string;
  casinoBank: number;
}

/**
 * Play a single hand to completion
 */
export function playHandToCompletion(table: SimTableState): void {
  // Dealer plays out their hand
  while (table.dealerHand.length > 0 && !table.dealerHand.every((c: any) => c.rank === 'A')) {
    const dealerTotal = table.dealerHand.reduce((sum: number, c: any) => sum + (c.rank === 'A' ? 11 : Math.min(10, parseInt(c.rank))), 0);
    if (dealerTotal >= 17) break;
    
    const card = table.shoe.pop();
    if (card) {
      table.dealerHand.push(card);
    }
  }
  
  // Determine outcomes and update bankrolls
  const changes = calculateBankrollChanges(table);
  updateBankrolls(table, changes);
  updateCasinoBank(table, changes);
}

/**
 * Simulate a blackjack session with multiple hands
 */
export function simulateSession(
  numHands: number,
  table: SimTableState
): void {
  const reshuffleCutoff = calculateReshuffleCutoff(table.shoe.length);
  
  for (let hand = 0; hand < numHands; hand++) {
    // Check if reshuffle is needed
    if (needsReshuffle(table.shoe, reshuffleCutoff)) {
      table.shoe = createNewShoe();
    }
    
    // Deal initial cards
    for (let i = 0; i < 2; i++) {
      for (let seatIndex = 0; seatIndex < table.seats.length; seatIndex++) {
        const seat = table.seats[seatIndex];
        if (seat.bet > 0) {
          const card = table.shoe.pop();
          if (card) {
            seat.hands[0].push(card);
          }
        }
      }
      
      // Deal dealer card
      const dealerCard = table.shoe.pop();
      if (dealerCard) {
        table.dealerHand.push(dealerCard);
      }
    }
    
    // Play out each seat's hands
    for (let seatIndex = 0; seatIndex < table.seats.length; seatIndex++) {
      const seat = table.seats[seatIndex];
      if (seat.bet <= 0) continue;
      
      for (let handIndex = 0; handIndex < seat.hands.length; handIndex++) {
        const hand = seat.hands[handIndex];
        
        while (true) {
          const action = determineSeatAction(seat, hand, table.dealerHand[0]);
          if (action === 'stand') break;
          
          executeSeatAction(action, seat, hand, table.shoe);
          
          if (action === 'hit') {
            const total = hand.reduce((sum: number, c: any) => sum + (c.rank === 'A' ? 11 : Math.min(10, parseInt(c.rank))), 0);
            if (total >= 21) break;
          } else {
            break;
          }
        }
      }
    }
    
    // Play dealer hand and determine outcomes
    playHandToCompletion(table);
    
    // Prepare for next hand
    prepareTableForNextHand(table);
  }
}
