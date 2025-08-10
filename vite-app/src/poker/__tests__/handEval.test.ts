import { describe, it, expect } from 'vitest'
import type { Card } from '../../blackjack/types'
import { evaluateSeven, compareEvaluated } from '../handEval'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('poker hand evaluator (7 cards)', () => {
  it('detects straight flush', () => {
    const ev = evaluateSeven([
      C('9', 'Hearts'), C('10', 'Hearts'), C('J', 'Hearts'), C('Q', 'Hearts'), C('K', 'Hearts'),
      C('2', 'Clubs'), C('3', 'Spades'),
    ])
    expect(ev.class).toBe('straight_flush')
  })

  it('detects full house over flush', () => {
    const ev = evaluateSeven([
      C('K', 'Clubs'), C('K', 'Spades'), C('K', 'Hearts'),
      C('9', 'Hearts'), C('9', 'Diamonds'),
      C('2', 'Hearts'), C('4', 'Hearts'),
    ])
    expect(ev.class).toBe('full_house')
  })

  it('handles wheel straight A-2-3-4-5', () => {
    const ev = evaluateSeven([
      C('A', 'Clubs'), C('2', 'Spades'), C('3', 'Clubs'), C('4', 'Hearts'), C('5', 'Diamonds'),
      C('9', 'Clubs'), C('Q', 'Spades'),
    ])
    expect(ev.class).toBe('straight')
  })
})


