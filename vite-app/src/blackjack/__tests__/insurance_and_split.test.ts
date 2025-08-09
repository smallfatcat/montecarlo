import { describe, it, expect } from 'vitest'
import type { Card } from '../types'
import {
  createInitialState,
  startRoundWithBet,
  playerStand,
  finalizeRound,
  placeInsurance,
  declineInsurance,
  canSplit,
  playerSplit,
} from '../game'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })
const D = (cards: Card[]): Card[] => [...cards]

describe('insurance and split', () => {
  it('insurance pays 2:1 when dealer has blackjack', () => {
    const s0 = createInitialState(100)
    // Order bottom -> top (pop from end): P1=9♣, D1=A♠, P2=9♦, D2=10♥ (dealer BJ)
    const deck = D([
      C('5', 'Clubs'),
      C('3', 'Hearts'),
      C('10', 'Hearts'), // D2
      C('9', 'Diamonds'), // P2
      C('A', 'Spades'), // D1 (upcard Ace)
      C('9', 'Clubs'), // P1
    ])
    let s1 = startRoundWithBet(s0, 20, deck, { shuffleDeck: false })
    expect(s1.status).toBe('player_turn')
    expect(s1.canOfferInsurance).toBe(true)
    s1 = placeInsurance(s1)
    // Dealer has BJ, round should end immediately
    expect(s1.status).toBe('round_over')
    // Finalize: main bet loses (-20), insurance wins (+20) => net 0
    const s2 = finalizeRound(s1)
    expect(s2.bankroll).toBe(100)
  })

  it('insurance is lost when dealer does not have blackjack', () => {
    const s0 = createInitialState(100)
    // P1=9♣, D1=A♠, P2=9♦, D2=9♥ (dealer not BJ; stands on 20)
    const deck = D([
      C('5', 'Clubs'),
      C('3', 'Hearts'),
      C('9', 'Hearts'), // D2 => dealer A+9=20 (no BJ)
      C('9', 'Diamonds'), // P2
      C('A', 'Spades'), // D1 (insurance offered)
      C('9', 'Clubs'), // P1
    ])
    let s1 = startRoundWithBet(s0, 20, deck, { shuffleDeck: false })
    expect(s1.canOfferInsurance).toBe(true)
    s1 = placeInsurance(s1)
    // No BJ -> still player's turn
    expect(s1.status).toBe('player_turn')
    // Player stands; dealer already at 20, should win
    s1 = playerStand(s1)
    expect(s1.status).toBe('round_over')
    const s2 = finalizeRound(s1)
    // Main lost (-20) and insurance lost (-10) => 70
    expect(s2.bankroll).toBe(70)
  })

  it('split creates two hands and settles both vs dealer', () => {
    const s0 = createInitialState(100)
    // P1=8♣, D1=7♦, P2=8♥, D2=10♠ -> dealer 17
    const deck = D([
      C('4', 'Clubs'),
      C('2', 'Hearts'),
      C('10', 'Spades'), // D2
      C('8', 'Hearts'), // P2
      C('7', 'Diamonds'), // D1
      C('8', 'Clubs'), // P1 -> pair of 8s
    ])
    let s1 = startRoundWithBet(s0, 10, deck, { shuffleDeck: false })
    expect(canSplit(s1)).toBe(true)
    s1 = playerSplit(s1)
    // Stand both hands
    s1 = playerStand(s1)
    s1 = playerStand(s1)
    expect(s1.status).toBe('round_over')
    expect(Array.isArray(s1.handOutcomes)).toBe(true)
    expect(s1.handOutcomes?.length).toBe(2)
    // Dealer 17 vs player 8 and 8 -> both dealer wins
    const s2 = finalizeRound(s1)
    expect(s2.bankroll).toBe(80)
  })

  it('cannot split mixed ten-value cards (e.g., 10 and K)', () => {
    const s0 = createInitialState(100)
    // P1=10♣, D1=7♦, P2=K♥, D2=9♠ -> player has 10 and K (both 10-value but not a pair)
    const deck = D([
      C('4', 'Clubs'),
      C('2', 'Hearts'),
      C('9', 'Spades'), // D2
      C('K', 'Hearts'), // P2
      C('7', 'Diamonds'), // D1
      C('10', 'Clubs'), // P1
    ])
    const s1 = startRoundWithBet(s0, 10, deck, { shuffleDeck: false })
    expect(canSplit(s1)).toBe(false)
  })

  it('declining insurance keeps play going', () => {
    const s0 = createInitialState(100)
    const deck = D([
      C('6', 'Clubs'),
      C('5', 'Hearts'),
      C('9', 'Clubs'), // D2 (no BJ)
      C('9', 'Hearts'), // P2
      C('A', 'Spades'), // D1
      C('9', 'Spades'), // P1
    ])
    let s1 = startRoundWithBet(s0, 10, deck, { shuffleDeck: false })
    expect(s1.canOfferInsurance).toBe(true)
    s1 = declineInsurance(s1)
    expect(s1.status).toBe('player_turn')
  })
})


