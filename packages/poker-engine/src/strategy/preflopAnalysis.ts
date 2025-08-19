import type { Card } from '../blackjack/types.js'
import { rankVal, isSuited } from './handAnalysis.js'

/**
 * Categorizes preflop hand strength
 */
export function preflopCategory(hole: Card[]): "premium" | "strong" | "speculative" | "trash" {
  const [a, b] = hole
  const va = rankVal(a.rank)
  const vb = rankVal(b.rank)
  const high = Math.max(va, vb)
  const low = Math.min(va, vb)
  const pair = a.rank === b.rank
  const suited = isSuited(a, b)
  const gap = Math.abs(va - vb)
  
  // Premium hands
  if (pair && va >= rankVal("J")) return "premium"
  if (suited && ((a.rank === "A" && b.rank === "K") || (b.rank === "A" && a.rank === "K"))) return "premium"
  
  // Strong hands
  if (pair && va >= rankVal("9")) return "strong"
  if (high >= rankVal("A") && low >= rankVal("Q") && suited) return "strong"
  if (high >= rankVal("A") && low >= rankVal("K")) return "strong"
  
  // Speculative hands
  if (pair) return "speculative"
  if (suited && gap <= 2 && high >= rankVal("7") && low >= rankVal("4")) return "speculative"
  
  return "trash"
}

/**
 * Determines acting position relative to button
 */
export function actingPosition(
  numSeats: number, 
  buttonIndex: number, 
  seatIndex: number
): "early" | "middle" | "late" | "blinds" {
  const n = numSeats
  const sb = (buttonIndex + 1) % n
  const bb = (buttonIndex + 2) % n
  
  if (seatIndex === sb || seatIndex === bb) return "blinds"
  
  const utg = (bb + 1) % n
  let dist = seatIndex - utg
  if (dist < 0) dist += n
  
  if (dist <= 1) return "early"
  if (dist <= n - 3) return "middle"
  return "late"
}

/**
 * Determines if a position should play aggressively
 */
export function shouldPlayAggressively(
  profile: "tight" | "loose",
  category: "premium" | "strong" | "speculative" | "trash",
  position: "early" | "middle" | "late" | "blinds"
): boolean {
  // Premium hands are always aggressive
  if (category === "premium") return true
  
  // Strong hands are aggressive in late position or with loose profile
  if (category === "strong") {
    return profile === "loose" || position === "late" || position === "middle"
  }
  
  // Speculative hands are aggressive in late position with loose profile
  if (category === "speculative") {
    return profile === "loose" && position === "late"
  }
  
  // Trash hands are never aggressive
  return false
}
