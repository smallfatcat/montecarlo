import type { Card, Rank } from '../blackjack/types.js'
import { evaluateSeven, evaluateFive, compareEvaluated } from '../handEval.js'

const RANK_ORDER: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
const RANK_TO_VAL = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i])) as Record<Rank, number>

/**
 * Converts a rank to its numeric value
 */
export function rankVal(r: Rank): number { 
  return RANK_TO_VAL[r] 
}

/**
 * Checks if two cards are suited
 */
export function isSuited(a: Card, b: Card): boolean { 
  return a.suit === b.suit 
}

/**
 * Counts cards by rank
 */
export function countByRank(cards: Card[]): Map<Rank, number> { 
  const m = new Map<Rank, number>()
  for (const c of cards) {
    m.set(c.rank, (m.get(c.rank) ?? 0) + 1)
  }
  return m 
}

/**
 * Counts cards by suit
 */
export function countBySuit(cards: Card[]): Map<string, number> { 
  const m = new Map<string, number>()
  for (const c of cards) {
    m.set(c.suit, (m.get(c.suit) ?? 0) + 1)
  }
  return m 
}

/**
 * Gets the highest rank on the board
 */
export function boardTopRank(community: Card[]): Rank | null { 
  if (community.length === 0) return null
  return community.map((c) => c.rank).sort((a, b) => rankVal(b) - rankVal(a))[0] ?? null 
}

/**
 * Checks if there's a flush draw
 */
export function hasFlushDraw(hole: Card[], community: Card[]): boolean { 
  const m = countBySuit([...hole, ...community])
  for (const [, n] of m) {
    if (n >= 4) return true
  }
  return false 
}

/**
 * Checks if there's an open-ended straight draw
 */
export function hasOpenEndedStraightDraw(hole: Card[], community: Card[]): boolean {
  const vals = Array.from(new Set([...hole, ...community].map((c) => rankVal(c.rank)))).sort((a, b) => a - b)
  
  for (let i = 0; i + 3 < vals.length; i += 1) { 
    const a = vals[i], b = vals[i + 1], c = vals[i + 2], d = vals[i + 3]
    if (b === a + 1 && c === b + 1 && d === c + 1) return true 
  }
  
  // Check for wheel straight (A-2-3-4)
  if (vals.includes(rankVal("A")) && vals.includes(rankVal("2")) && 
      vals.includes(rankVal("3")) && vals.includes(rankVal("4"))) {
    return true
  }
  
  return false
}

/**
 * Analyzes the made hand strength
 */
export function analyzeMadeHand(hole: Card[], community: Card[]): { 
  pair: boolean
  topPair: boolean
  overPair: boolean
  twoPair: boolean
  trips: boolean
  quads: boolean
  fullHouse: boolean
  flush: boolean
  straight: boolean
  straightFlush: boolean 
} {
  const ranks = countByRank([...hole, ...community])
  const top = boardTopRank(community)
  
  let pair = false, twoPair = false, trips = false, quads = false, fullHouse = false
  let pairsCount = 0
  let tripsCount = 0
  
  for (const [, n] of ranks) { 
    if (n === 4) quads = true
    if (n === 3) tripsCount += 1
    if (n === 2) pairsCount += 1 
  }
  
  if (pairsCount >= 1) pair = true
  if (pairsCount >= 2) twoPair = true
  if (tripsCount >= 1) trips = true
  if (tripsCount >= 1 && (pairsCount >= 1 || tripsCount >= 2)) fullHouse = true
  
  let topPair = false
  let overPair = false
  
  if (pair) { 
    if (community.length >= 3) { 
      if (top && (hole.find((c) => c.rank === top) != null)) topPair = true
      if (hole.length === 2 && hole[0].rank === hole[1].rank) { 
        const pocketVal = rankVal(hole[0].rank)
        const maxBoardVal = Math.max(...community.map((c) => rankVal(c.rank)))
        if (pocketVal > maxBoardVal) overPair = true 
      } 
    } else { 
      if (hole.length === 2 && hole[0].rank === hole[1].rank) overPair = true 
    } 
  }
  
  let straightFlush = false
  let straight = false
  let flush = false
  
  const total = hole.length + community.length
  if (total >= 5) {
    const cards = [...hole, ...community]
    
    if (total === 7) { 
      const ev = evaluateSeven(cards)
      const cls = ev.class
      straightFlush = cls === "straight_flush"
      straight = straightFlush || cls === "straight"
      flush = straightFlush || cls === "flush" 
    } else if (total === 6) {
      let best = evaluateFive(cards.filter((_, i) => i !== 0))
      for (let drop = 1; drop < 6; drop += 1) { 
        const ev = evaluateFive(cards.filter((_, i) => i !== drop))
        if (compareEvaluated(ev as any, best as any) > 0) best = ev 
      }
      const cls = best.class
      straightFlush = cls === "straight_flush"
      straight = straightFlush || cls === "straight"
      flush = straightFlush || cls === "flush"
    } else if (total === 5) { 
      const ev = evaluateFive(cards)
      const cls = ev.class
      straightFlush = cls === "straight_flush"
      straight = straightFlush || cls === "straight"
      flush = straightFlush || cls === "flush" 
    } 
  }
  
  return { pair, topPair, overPair, twoPair, trips, quads, fullHouse, flush, straight, straightFlush }
}
