import type { Card } from './types'
import { drawCard, shuffleInPlace, createShoe } from './deck'
import { CONFIG } from '../config'
import { evaluateHand } from './hand'

export type TableStatus = 'idle' | 'seat_turn' | 'dealer_turn' | 'round_over'
export type RoundOutcome = 'player_blackjack' | 'player_win' | 'dealer_win' | 'push' | 'player_bust' | 'dealer_bust'

export interface SeatState {
  hands: Card[][]
  activeHandIndex: number
  outcomes?: RoundOutcome[]
  betsByHand: number[]
  isCPU: boolean
}

export interface TableState {
  deck: Card[]
  dealerHand: Card[]
  seats: SeatState[]
  activeSeatIndex: number
  status: TableStatus
}

export function createInitialTable(numSeats: number, cpuSeats: number[], shoe?: Card[]): TableState {
  const seats: SeatState[] = Array.from({ length: numSeats }, (_, i) => ({
    hands: [],
    activeHandIndex: 0,
    outcomes: undefined,
    betsByHand: [],
    isCPU: cpuSeats.includes(i),
  }))
  return {
    deck: shoe ? [...shoe] : shuffleInPlace(createShoe(CONFIG.shoe.defaultNumDecks)),
    dealerHand: [],
    seats,
    activeSeatIndex: 0,
    status: 'idle',
  }
}

export function startTableRound(state: TableState, betPerSeat: number | number[]): TableState {
  const deck = [...state.deck]
  const betsArray: number[] = Array.isArray(betPerSeat)
    ? betPerSeat
    : state.seats.map(() => betPerSeat)
  const seats = state.seats.map((s, i) => ({
    ...s,
    hands: [[ ] as Card[]],
    activeHandIndex: 0,
    outcomes: undefined,
    betsByHand: [betsArray[i] ?? betsArray[0] ?? 0],
  }))
  const dealerHand: Card[] = []
  // Deal alternately: two rounds
  for (let r = 0; r < 2; r += 1) {
    for (const seat of seats) {
      seat.hands[0].push(drawCard(deck))
    }
    dealerHand.push(drawCard(deck))
  }
  return { deck, dealerHand, seats, activeSeatIndex: 0, status: 'seat_turn' }
}

export function getActiveSeat(state: TableState): SeatState {
  return state.seats[state.activeSeatIndex]
}

export function seatHit(state: TableState): TableState {
  if (state.status !== 'seat_turn') return state
  const deck = [...state.deck]
  const seats = state.seats.map((s) => ({ ...s, hands: s.hands.map((h) => [...h]), betsByHand: [...s.betsByHand] }))
  const seat = seats[state.activeSeatIndex]
  const idx = seat.activeHandIndex
  seat.hands[idx].push(drawCard(deck))
  const v = evaluateHand(seat.hands[idx])
  if (v.isBust) {
    return advanceSeatOrDealer({ ...state, deck, seats })
  }
  return { ...state, deck, seats }
}

export function seatStand(state: TableState): TableState {
  if (state.status !== 'seat_turn') return state
  return advanceSeatOrDealer(state)
}

export function seatDouble(state: TableState): TableState {
  if (state.status !== 'seat_turn') return state
  const deck = [...state.deck]
  const seats = state.seats.map((s) => ({ ...s, hands: s.hands.map((h) => [...h]), betsByHand: [...s.betsByHand] }))
  const seat = seats[state.activeSeatIndex]
  const idx = seat.activeHandIndex
  if (seat.hands[idx].length !== 2) return state
  seat.hands[idx].push(drawCard(deck))
  seat.betsByHand[idx] *= 2
  return advanceSeatOrDealer({ ...state, deck, seats })
}

export function seatSplit(state: TableState): TableState {
  if (state.status !== 'seat_turn') return state
  const seats = state.seats.map((s) => ({ ...s, hands: s.hands.map((h) => [...h]), betsByHand: [...s.betsByHand] }))
  const seat = seats[state.activeSeatIndex]
  const idx = seat.activeHandIndex
  const hand = seat.hands[idx]
  if (hand.length !== 2) return state
  if (hand[0].rank !== hand[1].rank) return state
  // Only allow one split per seat for now
  if (seat.hands.length > 1) return state
  const [c1, c2] = hand
  seat.hands = [[c1], [c2]]
  seat.activeHandIndex = 0
  seat.betsByHand = [seat.betsByHand[0], seat.betsByHand[0]]
  return { ...state, seats }
}

function advanceSeatOrDealer(state: TableState): TableState {
  const deck = [...state.deck]
  const seats = state.seats.map((s) => ({ ...s }))
  const seat = seats[state.activeSeatIndex]
  const idx = seat.activeHandIndex
  // If not bust and not stood explicitly, we consider this call from stand/double/bust
  // Move to next hand or seat
  if (idx + 1 < seat.hands.length) {
    seat.activeHandIndex += 1
    return { ...state, deck, seats }
  }
  // Move to next seat
  if (state.activeSeatIndex + 1 < seats.length) {
    return { ...state, deck, seats, activeSeatIndex: state.activeSeatIndex + 1 }
  }
  // All seats complete → dealer turn
  const afterDealer = dealerPlay({ ...state, deck, seats })
  const finalized = settleOutcomes(afterDealer)
  return { ...finalized, status: 'round_over' }
}

function dealerPlay(state: TableState): TableState {
  const deck = [...state.deck]
  const dealerHand = [...state.dealerHand]
  // Dealer draws to 17+ standing on soft 17
  while (true) {
    const d = evaluateHand(dealerHand)
    const total = d.bestTotal
    const shouldHit = total < 17
    if (!shouldHit) break
    dealerHand.push(drawCard(deck))
  }
  return { ...state, deck, dealerHand, status: 'dealer_turn' }
}

function settleOutcomes(state: TableState): TableState {
  const dealerHand = state.dealerHand
  const seats = state.seats.map((s) => ({ ...s, outcomes: s.hands.map((h) => resolveOutcome(h, dealerHand)) }))
  return { ...state, seats }
}

function resolveOutcome(playerHand: Card[], dealerHand: Card[]): RoundOutcome {
  const p = evaluateHand(playerHand)
  const d = evaluateHand(dealerHand)
  if (p.isBlackjack && d.isBlackjack) return 'push'
  if (p.isBlackjack) return 'player_blackjack'
  if (d.isBlackjack) return 'dealer_win'
  if (p.isBust) return 'player_bust'
  if (d.isBust) return 'dealer_bust'
  if (p.bestTotal > d.bestTotal) return 'player_win'
  if (p.bestTotal < d.bestTotal) return 'dealer_win'
  return 'push'
}

export function getSeatAvailableActions(state: TableState): ('hit'|'stand'|'double'|'split')[] {
  if (state.status !== 'seat_turn') return []
  const seat = state.seats[state.activeSeatIndex]
  const idx = seat.activeHandIndex
  const hand = seat.hands[idx]
  const actions: ('hit'|'stand'|'double'|'split')[] = ['hit','stand']
  if (hand.length === 2) {
    actions.push('double')
    if (hand[0].rank === hand[1].rank && seat.hands.length === 1) actions.push('split')
  }
  return actions
}


