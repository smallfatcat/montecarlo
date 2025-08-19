import type { PokerTableState } from '../types.js'
import type { Card } from '../blackjack/types.js'
import { CONFIG } from '../localConfig.js'
import { prepareDeckForHand } from './tableCreation.js'
import { postBlind } from './bettingLogic.js'
import { nextSeatIndexWithChips } from '../types.js'

/**
 * Starts a new hand on the poker table
 */
export function startHand(state: PokerTableState): PokerTableState {
  const s = { ...state }
  if (s.gameOver) return s

  // Handle blind increases
  const incEvery = CONFIG.poker.blinds?.increaseEveryHands ?? 0
  const incFactor = CONFIG.poker.blinds?.increaseFactor ?? 1
  if (incEvery > 0 && incFactor > 1 && s.handId > 0 && s.handId % incEvery === 0) {
    s.rules.smallBlind = Math.max(1, s.rules.smallBlind * incFactor)
    s.rules.bigBlind = Math.max(1, s.rules.bigBlind * incFactor)
  }

  // Prepare deck (seeded or random)
  const useSeeded = CONFIG.poker.random?.useSeeded ?? false
  const baseSeed = CONFIG.poker.random?.seed ?? 1
  s.deck = prepareDeckForHand(s.handId, useSeeded, baseSeed)

  // Reset hand state
  s.handId += 1
  s.community = []
  s.seats = s.seats.map((seat) => ({
    ...seat,
    hole: [],
    committedThisStreet: 0,
    totalCommitted: 0,
    hasFolded: seat.stack <= 0,
    isAllIn: false,
  }))

  // Reset pot and betting
  s.pot = { main: 0 }
  s.lastRaiseAmount = s.rules.bigBlind
  s.betToCall = 0
  s.street = 'preflop'
  s.status = 'in_hand'

  // Check if enough players to continue
  const funded = s.seats.filter((x) => x.stack > 0).length
  if (funded < 2) {
    s.status = 'hand_over'
    s.gameOver = true
    return s
  }

  // Post blinds
  const sbIndex = nextSeatIndexWithChips(s.seats, s.buttonIndex)!
  const bbIndex = nextSeatIndexWithChips(s.seats, sbIndex)!
  postBlind(s, sbIndex, s.rules.smallBlind)
  postBlind(s, bbIndex, s.rules.bigBlind)

  return s
}

/**
 * Deals cards to players and community
 */
export function dealCards(state: PokerTableState): void {
  const s = state
  
  // Deal hole cards
  s.seats.forEach((seat) => {
    if (!seat.hasFolded && seat.stack > 0) {
      seat.hole = [drawCard(s.deck), drawCard(s.deck)]
    }
  })

  // Deal community cards based on street
  switch (s.street) {
    case 'preflop':
      s.street = 'flop'
      dealCommunityCards(s, 3)
      break
    case 'flop':
      s.street = 'turn'
      dealCommunityCards(s, 1)
      break
    case 'turn':
      s.street = 'river'
      dealCommunityCards(s, 1)
      break
    case 'river':
      s.street = 'showdown'
      break
    default:
      break
  }
}

/**
 * Draws a card from the deck
 */
function drawCard(deck: Card[]): Card {
  const c = deck.pop()
  if (!c) throw new Error('Deck exhausted while dealing – expected fresh 52-card deck per hand')
  return c
}

/**
 * Deals community cards to the board
 */
function dealCommunityCards(state: PokerTableState, count: number): void {
  for (let i = 0; i < count; i++) {
    state.community.push(drawCard(state.deck))
  }
}
