import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { Card } from '../types'
import { simulateSession } from '../simulate'
import { CONFIG } from '../../config'
import { createInitialTable, startTableRound, getSeatAvailableActions, type TableState } from '../table'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('rule configuration effects', () => {
  const rulesBackup = JSON.parse(JSON.stringify(CONFIG.rules))

  afterEach(() => {
    Object.assign(CONFIG.rules, rulesBackup)
  })

  it('H17 vs S17 affects outcomes (soft 17 stands vs hits)', () => {
    // Deck (top=end): S0_1=9♣, D1=A♠, S0_2=9♦, D2=6♥; Dealer hit card = 2♣ next on top
    const deck: Card[] = [C('5','Clubs'), C('2','Clubs'), C('6','Hearts'), C('9','Diamonds'), C('A','Spades'), C('9','Clubs')]
    const numPlayers = 1
    const betsBySeat = [10]
    const initialBankrolls = [100]
    const casinoInitial = 10000

    // S17 (dealer stands on soft 17) -> player 18 vs 17 -> player win
    Object.assign(CONFIG.rules, { dealerHitsSoft17: false })
    const s17 = simulateSession({
      numHands: 1,
      numPlayers,
      deckCount: 6,
      reshuffleCutoffRatio: 0,
      initialBankrolls,
      casinoInitial,
      betsBySeat,
      existingShoe: deck,
    })
    expect(s17.finalBankrolls[0]).toBe(110)

    // H17 (dealer hits soft 17) -> dealer draws 2 -> 19 -> dealer win
    Object.assign(CONFIG.rules, { dealerHitsSoft17: true })
    const h17 = simulateSession({
      numHands: 1,
      numPlayers,
      deckCount: 6,
      reshuffleCutoffRatio: 0,
      initialBankrolls,
      casinoInitial,
      betsBySeat,
      existingShoe: deck,
    })
    expect(h17.finalBankrolls[0]).toBe(90)
  })

  it('blackjack payout adjusts winnings (3:2 vs 1:1)', () => {
    // Deck (top=end): S0_1=A♠, D1=9♣, S0_2=K♣, D2=9♦ -> player blackjack
    const deck: Card[] = [C('5','Clubs'), C('9','Diamonds'), C('K','Clubs'), C('9','Clubs'), C('A','Spades')]
    const numPlayers = 1
    const betsBySeat = [10]
    const initialBankrolls = [100]
    const casinoInitial = 10000

    Object.assign(CONFIG.rules, { blackjackPayout: 1.5 })
    const bj32 = simulateSession({ numHands: 1, numPlayers, deckCount: 6, reshuffleCutoffRatio: 0, initialBankrolls, casinoInitial, betsBySeat, existingShoe: deck })
    expect(bj32.finalBankrolls[0]).toBe(115)

    Object.assign(CONFIG.rules, { blackjackPayout: 1.0 })
    const bj11 = simulateSession({ numHands: 1, numPlayers, deckCount: 6, reshuffleCutoffRatio: 0, initialBankrolls, casinoInitial, betsBySeat, existingShoe: deck })
    expect(bj11.finalBankrolls[0]).toBe(110)
  })

  it('doubleTotals restricts double availability', () => {
    // Build table with single player receiving 5 and 5 (hard 10)
    const deck: Card[] = [C('5','Clubs'), C('9','Diamonds'), C('5','Hearts'), C('9','Clubs')] // order: S0_1=9♣? Wait - pop from end
    // Correct order: top=end -> S0_1=5♥, D1=9♣, S0_2=5♣, D2=9♦
    const properDeck: Card[] = [C('5','Clubs'), C('9','Diamonds'), C('5','Hearts'), C('9','Clubs')]
    const table0: TableState = startTableRound(createInitialTable(1, [/* no cpu */], properDeck), 10)

    Object.assign(CONFIG.rules, { doubleTotals: [11] })
    let actions = getSeatAvailableActions(table0)
    expect(actions).not.toContain('double')

    Object.assign(CONFIG.rules, { doubleTotals: [] })
    actions = getSeatAvailableActions(table0)
    expect(actions).toContain('double')
  })

  it('allowSplitRanks restricts split availability', () => {
    // Player 8 and 8; restrict splits to aces only
    const deck: Card[] = [C('5','Clubs'), C('9','Diamonds'), C('8','Hearts'), C('9','Clubs'), C('8','Clubs')]
    const table0: TableState = startTableRound(createInitialTable(1, [], deck), 10)
    Object.assign(CONFIG.rules, { allowSplitRanks: ['A'] })
    const actions = getSeatAvailableActions(table0)
    expect(actions).not.toContain('split')
  })
})


