import { CONFIG } from '../../config';

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

// Simple seat state interface for simulation
interface SimSeatState {
  bet: number;
  hands: any[][];
  bankroll: number;
}

/**
 * Calculate reshuffle cutoff point
 */
export function calculateReshuffleCutoff(shoeSize: number): number {
  return Math.floor(shoeSize * CONFIG.blackjack.shoe.reshuffleCutoffRatio);
}

/**
 * Check if shoe needs reshuffling
 */
export function needsReshuffle(shoe: any[], cutoff: number): boolean {
  return shoe.length <= cutoff;
}

/**
 * Create a new shoe with specified number of decks
 */
export function createNewShoe(): any[] {
  const numDecks = CONFIG.blackjack.shoe.defaultNumDecks;
  const cardsPerDeck = CONFIG.blackjack.shoe.cardsPerDeck;
  const shoe: any[] = [];
  
  for (let deck = 0; deck < numDecks; deck++) {
    for (let card = 0; card < cardsPerDeck; card++) {
      shoe.push(card);
    }
  }
  
  // Shuffle the shoe
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  
  return shoe;
}

/**
 * Get betting amounts for each seat
 */
export function getBettingAmounts(table: SimTableState): number[] {
  return table.seats.map((seat: SimSeatState) => seat.bet);
}

/**
 * Determine the best action for a seat
 */
export function determineSeatAction(
  _seat: SimSeatState, 
  hand: any[], 
  dealerUpCard: any
): 'hit' | 'stand' | 'double' | 'split' {
  // Simple basic strategy implementation
  const total = hand.reduce((sum: number, c: any) => sum + (c.rank === 'A' ? 11 : Math.min(10, parseInt(c.rank))), 0);
  
  if (total >= 17) return 'stand';
  if (total <= 11) return 'hit';
  
  // Basic strategy for 12-16
  const dealerValue = dealerUpCard.rank === 'A' ? 11 : Math.min(10, parseInt(dealerUpCard.rank));
  
  if (total === 12 && (dealerValue >= 4 && dealerValue <= 6)) return 'stand';
  if (total === 13 && (dealerValue >= 2 && dealerValue <= 6)) return 'stand';
  if (total === 14 && (dealerValue >= 2 && dealerValue <= 6)) return 'stand';
  if (total === 15 && (dealerValue >= 2 && dealerValue <= 6)) return 'stand';
  if (total === 16 && (dealerValue >= 2 && dealerValue <= 6)) return 'stand';
  
  return 'hit';
}

/**
 * Execute an action for a seat
 */
export function executeSeatAction(
  action: 'hit' | 'stand' | 'double' | 'split',
  _seat: SimSeatState,
  hand: any[],
  shoe: any[]
): void {
  switch (action) {
    case 'hit':
      const card = shoe.pop();
      if (card) {
        hand.push(card);
      }
      break;
    case 'stand':
      // No action needed, hand is complete
      break;
    case 'double':
      // Double down logic would go here
      const doubleCard = shoe.pop();
      if (doubleCard) {
        hand.push(doubleCard);
      }
      break;
    case 'split':
      // Split logic would go here
      break;
  }
}

/**
 * Calculate bankroll changes for all seats
 */
export function calculateBankrollChanges(table: SimTableState): number[] {
  return table.seats.map((seat: SimSeatState) => {
    // Calculate winnings/losses based on hand outcomes
    // This is a simplified implementation
    return seat.bet * 0; // Placeholder
  });
}

/**
 * Update bankrolls for all seats
 */
export function updateBankrolls(table: SimTableState, changes: number[]): void {
  changes.forEach((change, index) => {
    if (table.seats[index]) {
      table.seats[index].bankroll += change;
    }
  });
}

/**
 * Update casino bank
 */
export function updateCasinoBank(table: SimTableState, changes: number[]): void {
  const totalChange = changes.reduce((sum, change) => sum + change, 0);
  table.casinoBank -= totalChange;
}

/**
 * Prepare table for the next hand
 */
export function prepareTableForNextHand(table: SimTableState): void {
  // Reset hands and bets
  table.seats.forEach((seat: SimSeatState) => {
    seat.hands = [[]];
    seat.bet = 0;
  });
  
  table.dealerHand = [];
  table.status = 'waiting_for_bets';
}
