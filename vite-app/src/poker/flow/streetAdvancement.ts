import type { PokerTableState } from "../types";
import { dealCommunityCards } from "./dealing";

/**
 * Advance to the next street in poker
 */
export function advanceStreet(state: PokerTableState): void {
  const s = state;
  
  switch (s.street) {
    case null:
      // Preflop -> Flop
      s.street = "flop";
      dealCommunityCards(s, 3);
      break;
      
    case "flop":
      // Flop -> Turn
      s.street = "turn";
      dealCommunityCards(s, 1);
      break;
      
    case "turn":
      // Turn -> River
      s.street = "river";
      dealCommunityCards(s, 1);
      break;
      
    case "river":
      // River -> Hand complete
      s.status = "hand_over";
      break;
      
    default:
      break;
  }
}

/**
 * Find the first eligible actor after the current position
 */
export function findFirstEligibleActor(
  state: PokerTableState,
  startIndex: number
): number | null {
  const numSeats = state.seats.length;
  
  for (let i = 0; i < numSeats; i++) {
    const seatIndex = (startIndex + i) % numSeats;
    
    if (isEligibleToAct(state, seatIndex)) {
      return seatIndex;
    }
  }
  
  return null;
}

/**
 * Check if a seat is eligible to act
 */
export function isEligibleToAct(
  state: PokerTableState,
  seatIndex: number
): boolean {
  const seat = state.seats[seatIndex];
  
  // Must have chips and not be folded
  if (seat.stack <= 0 || seat.hasFolded) {
    return false;
  }
  
  // Must not be all-in
  if (seat.isAllIn) {
    return false;
  }
  
  return true;
}

/**
 * Check if betting round should close
 */
export function shouldCloseBettingRound(state: PokerTableState): boolean {
  const eligibleSeats = state.seats.filter((_, i) => isEligibleToAct(state, i));
  
  if (eligibleSeats.length <= 1) {
    return true;
  }
  
  // Check if all eligible seats have committed the same amount
  const committedAmounts = eligibleSeats.map(seat => seat.committedThisStreet);
  const firstAmount = committedAmounts[0];
  
  return committedAmounts.every(amount => amount === firstAmount);
}

/**
 * Move to the next actor in sequence
 */
export function moveToNextActor(
  state: PokerTableState,
  currentIndex: number
): number | null {
  const nextIndex = (currentIndex + 1) % state.seats.length;
  
  // Find the next eligible actor
  return findFirstEligibleActor(state, nextIndex);
}
