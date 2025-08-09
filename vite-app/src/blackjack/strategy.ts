import { evaluateHand } from './hand'
import type { Card } from './types'

export type SuggestedAction = 'hit' | 'stand' | 'double' | 'surrender' | 'split'

export interface SuggestParams {
  hand: Card[]
  dealerUp: Card
  available: Set<'hit' | 'stand' | 'double' | 'split' | 'surrender'>
  canSplit: boolean
}

export function suggestAction(params: SuggestParams): SuggestedAction | null {
  const { hand, dealerUp, available, canSplit } = params
  if (!hand || hand.length === 0) return null
  if (!dealerUp) return null

  const up = upcardValue(dealerUp)
  const v = evaluateHand(hand)

  // Pair strategy
  if (hand.length === 2 && hand[0].rank === hand[1].rank && canSplit) {
    const r = hand[0].rank
    const pair = r === '10' || r === 'J' || r === 'Q' || r === 'K' ? 'T' : r
    const decidePair = (rank: string): SuggestedAction => {
      switch (rank) {
        case 'A': return 'split'
        case 'T': return 'stand'
        case '9': return up === 7 || up >= 10 ? 'stand' : 'split' // split 2-6,8-9
        case '8': return 'split'
        case '7': return up <= 7 ? 'split' : 'hit'
        case '6': return up <= 6 ? 'split' : 'hit'
        case '5': return up <= 9 ? 'double' : 'hit'
        case '4': return up === 5 || up === 6 ? 'split' : 'hit'
        case '3':
        case '2':
          return up <= 7 ? 'split' : 'hit'
        default: return 'hit'
      }
    }
    const choice = decidePair(pair)
    if (choice === 'split') return available.has('split') ? 'split' : (available.has('hit') ? 'hit' : 'stand')
    if (choice === 'double' && available.has('double')) return 'double'
    return fallbackToAvailable(choice, available)
  }

  // Soft totals
  if (v.isSoft) {
    const soft = v.bestTotal
    let choice: SuggestedAction = 'hit'
    if (soft >= 19) choice = 'stand'
    else if (soft === 18) choice = up <= 6 ? (up >= 3 ? 'double' : 'stand') : (up <= 8 ? 'stand' : 'hit')
    else if (soft === 17) choice = up >= 3 && up <= 6 ? 'double' : 'hit'
    else if (soft === 16 || soft === 15) choice = up >= 4 && up <= 6 ? 'double' : 'hit'
    else if (soft === 14 || soft === 13) choice = up >= 5 && up <= 6 ? 'double' : 'hit'
    if (choice === 'double' && available.has('double')) return 'double'
    return fallbackToAvailable(choice, available)
  }

  // Hard totals
  const hard = v.hardTotal
  if (hard >= 17) return 'stand'
  if (hard === 16) {
    if (up >= 9 && available.has('surrender')) return 'surrender'
    return up <= 6 ? 'stand' : 'hit'
  }
  if (hard === 15) {
    if (up === 10 && available.has('surrender')) return 'surrender'
    return up <= 6 ? 'stand' : 'hit'
  }
  if (hard >= 13 && hard <= 14) return up <= 6 ? 'stand' : 'hit'
  if (hard === 12) return up >= 4 && up <= 6 ? 'stand' : 'hit'
  if (hard === 11) return available.has('double') && up !== 11 ? 'double' : 'hit'
  if (hard === 10) return available.has('double') && up <= 9 ? 'double' : 'hit'
  if (hard === 9) return available.has('double') && up >= 3 && up <= 6 ? 'double' : 'hit'
  return 'hit'
}

function upcardValue(card: Card): number {
  if (card.rank === 'A') return 11
  if (card.rank === 'K' || card.rank === 'Q' || card.rank === 'J' || card.rank === '10') return 10
  return Number(card.rank)
}

function fallbackToAvailable(choice: SuggestedAction, available: Set<string>): SuggestedAction {
  if (choice === 'split') return available.has('hit') ? 'hit' : 'stand'
  if (choice === 'double' && !available.has('double')) return 'hit'
  if (choice === 'surrender' && !available.has('surrender')) return 'hit'
  return choice
}


