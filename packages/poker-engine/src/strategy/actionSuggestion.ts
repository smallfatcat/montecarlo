import type { BettingAction, PokerTableState } from '../types.js'
import type { Card } from '../blackjack/types.js'
import { getAvailableActions } from '../flow.js'
import { preflopCategory, actingPosition, shouldPlayAggressively } from './preflopAnalysis.js'
import { analyzeMadeHand } from './handAnalysis.js'

export type BotProfile = "tight" | "loose"

/**
 * Suggests the best action for a poker bot
 */
export function suggestActionPoker(
  state: PokerTableState, 
  profile: BotProfile = "tight"
): BettingAction {
  const available = new Set(getAvailableActions(state))
  const seatIndex = state.currentToAct ?? 0
  const seat = state.seats[seatIndex]
  const hole = seat.hole
  const board = state.community
  const toCall = Math.max(0, state.betToCall - seat.committedThisStreet)
  const pos = actingPosition(state.seats.length, state.buttonIndex, seatIndex)
  const lastRaise = state.lastRaiseAmount || state.rules.bigBlind
  const bb = Math.max(1, state.rules.bigBlind)
  
  const otherStacks = state.seats
    .map((s, i) => (i === seatIndex || s.hasFolded ? 0 : s.stack))
    .filter((x) => x > 0)
  
  const effectiveStack = Math.min(seat.stack, otherStacks.length ? Math.max(...otherStacks) : seat.stack)
  const effBB = effectiveStack / bb
  const potAfterCall = state.pot.main + toCall
  const spr = potAfterCall > 0 ? effectiveStack / potAfterCall : Infinity

  // Preflop strategy
  if (state.street === "preflop") {
    return suggestPreflopAction(hole, pos, profile, available, toCall, effBB, lastRaise, bb, seat.stack)
  }

  // Postflop strategy
  return suggestPostflopAction(hole, board, pos, profile, available, toCall, effBB, lastRaise, bb, seat.stack, spr)
}

/**
 * Suggests preflop actions
 */
function suggestPreflopAction(
  hole: Card[],
  position: "early" | "middle" | "late" | "blinds",
  profile: BotProfile,
  available: Set<string>,
  toCall: number,
  effBB: number,
  lastRaise: number,
  bb: number,
  stack: number
): BettingAction {
  const cat = preflopCategory(hole)
  const aggressive = shouldPlayAggressively(profile, cat, position)

  if (toCall > 0) {
    // There's a bet to call
    if (effBB <= 20 && available.has("raise") && (aggressive || (cat === "speculative" && position === "late"))) {
      const shoveExtra = Math.max(0, stack - toCall)
      return { type: "raise", amount: shoveExtra }
    }
    
    if (aggressive && available.has("raise")) {
      const minExtra = Math.max(bb, lastRaise)
      const escalated = Math.max(Math.floor(minExtra * 1.5), bb)
      const open3x = Math.max(bb * 3, bb)
      const target = toCall <= bb ? open3x : escalated
      const raiseExtra = Math.max(Math.min(target - toCall, stack - toCall), bb)
      const commitFrac = (toCall + raiseExtra) / Math.max(1, stack)
      
      if (commitFrac > 0.5 && cat === "speculative") {
        return available.has("call") ? { type: "call" } : { type: "fold" }
      }
      return { type: "raise", amount: raiseExtra }
    }
    
    if (cat !== "trash" && available.has("call")) return { type: "call" }
    return available.has("fold") ? { type: "fold" } : (available.has("check") ? { type: "check" } : { type: "call" })
  } else {
    // No bet to call
    if (aggressive && available.has("bet")) {
      if (effBB <= 12 && (cat === "premium" || cat === "strong")) {
        return { type: "bet", amount: stack }
      }
      const open = Math.max(bb * 3, bb)
      return { type: "bet", amount: Math.min(open, stack) }
    }
    
    if (available.has("check")) return { type: "check" }
    return available.has("call") ? { type: "call" } : { type: "fold" }
  }
}

/**
 * Suggests postflop actions
 */
function suggestPostflopAction(
  hole: Card[],
  board: Card[],
  position: "early" | "middle" | "late" | "blinds",
  profile: BotProfile,
  available: Set<string>,
  toCall: number,
  effBB: number,
  lastRaise: number,
  bb: number,
  stack: number,
  spr: number
): BettingAction {
  const made = analyzeMadeHand(hole, board)
  
  // Strong made hands
  if (made.straightFlush || made.quads || made.fullHouse) {
    if (available.has("raise")) {
      return { type: "raise", amount: Math.min(stack, bb * 5) }
    }
    return available.has("bet") ? { type: "bet", amount: Math.min(stack, bb * 3) } : { type: "call" }
  }
  
  if (made.flush || made.straight || made.trips) {
    if (available.has("raise")) {
      return { type: "raise", amount: Math.min(stack, bb * 3) }
    }
    return available.has("bet") ? { type: "bet", amount: Math.min(stack, bb * 2) } : { type: "call" }
  }
  
  // Medium strength hands
  if (made.twoPair || made.topPair || made.overPair) {
    if (position === "late" && available.has("bet")) {
      return { type: "bet", amount: Math.min(stack, bb) }
    }
    if (toCall > 0 && available.has("call")) {
      return { type: "call" }
    }
    return available.has("check") ? { type: "check" } : { type: "fold" }
  }
  
  // Weak hands
  if (toCall > 0) {
    return available.has("fold") ? { type: "fold" } : { type: "call" }
  }
  
  return available.has("check") ? { type: "check" } : { type: "fold" }
}
