import type { Card } from '../blackjack'
import type { TableStatus } from '../blackjack/table'
import { CONFIG } from '../config'

export function shouldReshuffle(deckCount: number, shoe: Card[] | undefined): boolean {
  const totalCards = deckCount * CONFIG.shoe.cardsPerDeck
  const cutoff = Math.floor(totalCards * CONFIG.shoe.reshuffleCutoffRatio)
  if (!shoe) return true
  return shoe.length <= cutoff
}

export function resizePreserveNumbers(prev: number[], newLen: number, fill: number): number[] {
  const target = Math.max(0, Math.floor(newLen))
  const out: number[] = []
  for (let i = 0; i < target; i += 1) {
    const v = prev[i]
    out.push(Number.isFinite(v) ? v : fill)
  }
  return out
}

export function canEditConfig(status: TableStatus): boolean {
  return status === 'idle' || status === 'round_over'
}


