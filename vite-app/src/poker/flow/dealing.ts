import type { Card } from "../../blackjack/types";
import type { PokerTableState } from "../types";
import { nextSeatIndexWithChips } from "../types";

/**
 * Draw a card from the deck with error handling
 */
export function drawCard(deck: Card[]): Card {
  const c = deck.pop();
  if (!c) {
    throw new Error("Deck exhausted while dealing – expected fresh 52-card deck per hand");
  }
  return c;
}

/**
 * Post blind for a specific seat
 */
export function postBlind(
  state: PokerTableState, 
  seatIndex: number, 
  amount: number
): void {
  const seat = state.seats[seatIndex];
  if (seat.stack <= 0) return;
  
  const toPay = Math.min(seat.stack, amount);
  seat.stack -= toPay;
  seat.committedThisStreet += toPay;
  seat.totalCommitted += toPay;
  state.pot.main += toPay;
  
  if (seat.stack === 0) {
    seat.isAllIn = true;
  }
}

/**
 * Post blinds for small blind and big blind positions
 */
export function postBlinds(state: PokerTableState): void {
  // Post blinds (clockwise from button) — skip seats without chips
  const sbIndex = nextSeatIndexWithChips(state.seats, state.buttonIndex)!;
  const bbIndex = nextSeatIndexWithChips(state.seats, sbIndex)!;
  
  postBlind(state, sbIndex, state.rules.smallBlind);
  postBlind(state, bbIndex, state.rules.bigBlind);
}

/**
 * Deal hole cards to all active players
 */
export function dealHoleCards(state: PokerTableState): void {
  // Deal hole cards
  for (let r = 0; r < 2; r += 1) {
    for (let i = 0; i < state.seats.length; i += 1) {
      const idx = (state.buttonIndex + 1 + i) % state.seats.length;
      const seat = state.seats[idx];
      
      // Deal to anyone who isn't folded at hand start, even if blind-post made them all-in
      if (seat.hasFolded) continue;
      
      seat.hole.push(drawCard(state.deck));
    }
  }
}

/**
 * Deal community cards for a specific street
 */
export function dealCommunityCards(
  state: PokerTableState, 
  count: number
): void {
  for (let i = 0; i < count; i += 1) {
    state.community.push(drawCard(state.deck));
  }
}
