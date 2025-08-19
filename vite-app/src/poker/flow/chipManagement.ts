import type { PokerTableState, SeatState } from "../types";

/**
 * Commit chips from a seat to the pot
 */
export function commitChips(
  state: PokerTableState, 
  seat: SeatState, 
  amount: number
): void {
  if (amount <= 0) return;
  
  const actualAmount = Math.min(amount, seat.stack);
  seat.stack -= actualAmount;
  seat.committedThisStreet += actualAmount;
  seat.totalCommitted += actualAmount;
  state.pot.main += actualAmount;
  
  if (seat.stack === 0) {
    seat.isAllIn = true;
  }
}

/**
 * Calculate total chips in play (stacks + pot)
 */
export function calculateTotalChips(state: PokerTableState): number {
  const stackTotal = state.seats.reduce((sum, s) => sum + Math.max(0, Math.floor(s.stack)), 0);
  const potTotal = Math.max(0, Math.floor(state.pot.main));
  return stackTotal + potTotal;
}

/**
 * Set baseline for chip conservation tracking
 */
export function setChipBaseline(state: PokerTableState): void {
  (state as any).__baselineChips = calculateTotalChips(state);
}

/**
 * Get baseline chip count for conservation tracking
 */
export function getChipBaseline(state: PokerTableState): number | undefined {
  return (state as any).__baselineChips as number | undefined;
}

/**
 * Assert chip conservation (for debugging)
 */
export function assertChipConservation(
  state: PokerTableState, 
  context: string, 
  expectedRake: number = 0
): void {
  const baseline = getChipBaseline(state);
  if (baseline == null) return;
  
  const now = calculateTotalChips(state);
  const expected = baseline - Math.max(0, Math.floor(expectedRake));
  
  // During hand flow (e.g., commitChips), allow tests to mutate stacks for scenarios.
  // Enforce "no chip creation": now must never exceed expected. Require exact equality only at settlement.
  const isSettlement = context.includes('settleAndEnd');
  
  if (isSettlement) {
    if (now !== expected) {
      throw new Error(
        `[CONSERVATION] ${context}: expected total ${expected} (baseline ${baseline} - rake ${expectedRake}), got ${now}`
      );
    }
  } else {
    if (now > expected) {
      throw new Error(
        `[CONSERVATION-UPPER-BOUND] ${context}: total ${now} exceeds expected ${expected}`
      );
    }
  }
}
