import type { PokerTableState, BettingAction } from "../types";
import { getStreetBetSize } from "../types";
import { commitChips } from "./chipManagement";

/**
 * Handle fold action
 */
export function handleFoldAction(state: PokerTableState, seatIndex: number): void {
  const seat = state.seats[seatIndex];
  seat.hasFolded = true;
}

/**
 * Handle check action
 */
export function handleCheckAction(state: PokerTableState, seatIndex: number): void {
  const seat = state.seats[seatIndex];
  const toCall = state.betToCall - seat.committedThisStreet;
  
  if (toCall > 0) {
    throw new Error("Cannot check facing a bet");
  }
}

/**
 * Handle call action
 */
export function handleCallAction(state: PokerTableState, seatIndex: number): void {
  const seat = state.seats[seatIndex];
  const toCall = Math.max(0, state.betToCall - seat.committedThisStreet);
  
  if (toCall <= 0) {
    throw new Error("Nothing to call");
  }
  
  const pay = Math.min(seat.stack, toCall);
  commitChips(state, seat, pay);
}

/**
 * Handle bet action
 */
export function handleBetAction(
  state: PokerTableState, 
  seatIndex: number, 
  amount: number
): void {
  const seat = state.seats[seatIndex];
  const toCall = state.betToCall - seat.committedThisStreet;
  
  if (toCall > 0) {
    throw new Error("Cannot bet facing a bet");
  }
  
  const minOpen = getStreetBetSize(state);
  const desired = Math.max(amount ?? minOpen, minOpen);
  const pay = Math.min(seat.stack, desired);
  
  commitChips(state, seat, pay);
  state.betToCall = seat.committedThisStreet;
  state.lastRaiseAmount = pay;
  state.lastAggressorIndex = seat.seatIndex;
}

/**
 * Handle raise action
 */
export function handleRaiseAction(
  state: PokerTableState, 
  seatIndex: number, 
  amount: number
): { lastActionWasRaise: boolean } {
  const seat = state.seats[seatIndex];
  
  if (state.betToCall <= 0) {
    throw new Error("Nothing to raise");
  }
  
  const toCall = Math.max(0, state.betToCall - seat.committedThisStreet);
  const minRaiseExtra = Math.max(state.lastRaiseAmount, getStreetBetSize(state));
  const desiredExtra = Math.max(amount ?? minRaiseExtra, 0);
  const maxExtra = Math.max(0, seat.stack - toCall);
  const extra = Math.min(desiredExtra, maxExtra);
  const totalPay = Math.min(seat.stack, toCall + extra);
  
  if (totalPay <= 0) {
    return { lastActionWasRaise: false };
  }
  
  const beforeCommitted = seat.committedThisStreet;
  commitChips(state, seat, totalPay);
  state.betToCall = Math.max(state.betToCall, seat.committedThisStreet);
  
  // Determine if raise reopens action (meets min raise and not all-in short)
  const actualExtra = seat.committedThisStreet - beforeCommitted - toCall;
  const isValidRaise = actualExtra >= minRaiseExtra;
  
  if (isValidRaise) {
    state.lastRaiseAmount = actualExtra;
    state.lastAggressorIndex = seat.seatIndex;
    return { lastActionWasRaise: true };
  } else if (toCall === 0) {
    // Treated effectively as a check (didn't meet min raise)
    // no change to lastAggressorIndex
  }
  
  return { lastActionWasRaise: false };
}

/**
 * Apply a betting action to the game state
 */
export function applyAction(state: PokerTableState, action: BettingAction): {
  lastActionWasRaise: boolean;
  shouldSettle: boolean;
} {
  if (state.status !== "in_hand" || state.currentToAct == null) {
    return { lastActionWasRaise: false, shouldSettle: false };
  }
  
  const actorIndex = state.currentToAct;
  const seat = state.seats[actorIndex];
  
  if (seat.hasFolded || seat.isAllIn) {
    return { lastActionWasRaise: false, shouldSettle: false };
  }
  
  let lastActionWasRaise = false;
  
  switch (action.type) {
    case "fold":
      handleFoldAction(state, actorIndex);
      break;
      
    case "check":
      handleCheckAction(state, actorIndex);
      break;
      
    case "call":
      handleCallAction(state, actorIndex);
      break;
      
    case "bet":
      handleBetAction(state, actorIndex, action.amount ?? 0);
      break;
      
    case "raise":
      const result = handleRaiseAction(state, actorIndex, action.amount ?? 0);
      lastActionWasRaise = result.lastActionWasRaise;
      break;
      
    default:
      return { lastActionWasRaise: false, shouldSettle: false };
  }
  
  // Check if only one active player remains after this action
  const activeSeats = state.seats.filter(s => !s.hasFolded && !s.isAllIn);
  const shouldSettle = activeSeats.length <= 1;
  
  return { lastActionWasRaise, shouldSettle };
}
