import { createStandardDeck, shuffleInPlace, makeXorShift32 } from './blackjack/deck'
import type { Card } from './blackjack/types'
import {
  cloneState,
  countActiveSeats,
  getStreetBetSize,
  nextSeatIndex,
  nextSeatIndexWithChips,
} from './types'
import type { PokerTableState, SeatState, BettingAction } from './types'
import { evaluateSeven } from './handEval'
import { CONFIG } from './localConfig'

function drawCard(deck: Card[]): Card {
  const c = deck.pop()
  if (!c) throw new Error('Deck exhausted while dealing – expected fresh 52-card deck per hand')
  return c
}

export function createInitialPokerTable(
  numSeats: number,
  cpuSeats: number[],
  startingStack: number = CONFIG.poker.startingStack,
  shoe?: Card[],
): PokerTableState {
  const seats: SeatState[] = Array.from({ length: numSeats }, (_, i) => ({
    seatIndex: i,
    isCPU: cpuSeats.includes(i),
    hole: [],
    stack: startingStack,
    committedThisStreet: 0,
    totalCommitted: 0,
    hasFolded: false,
    isAllIn: false,
  }))
  return {
    handId: 0,
    deck: shoe ? [...shoe] : shuffleInPlace(createStandardDeck()),
    community: [],
    seats,
    buttonIndex: 0,
    street: null,
    status: 'idle',
    currentToAct: null,
    lastAggressorIndex: null,
    betToCall: 0,
    lastRaiseAmount: CONFIG.poker.blinds.startingBigBlind,
    pot: { main: 0 },
    rules: {
      smallBlind: CONFIG.poker.blinds.startingSmallBlind,
      bigBlind: CONFIG.poker.blinds.startingBigBlind,
    },
    gameOver: false,
  }
}

export function startHand(state: PokerTableState): PokerTableState {
  const s = cloneState(state)
  if (s.gameOver) return s
  const incEvery = CONFIG.poker.blinds?.increaseEveryHands ?? 0
  const incFactor = CONFIG.poker.blinds?.increaseFactor ?? 1
  if (incEvery > 0 && incFactor > 1 && s.handId > 0 && s.handId % incEvery === 0) {
    s.rules.smallBlind = Math.max(1, s.rules.smallBlind * incFactor)
    s.rules.bigBlind = Math.max(1, s.rules.bigBlind * incFactor)
  }
  if (CONFIG.poker.random?.useSeeded) {
    const base = CONFIG.poker.random.seed ?? 1
    const inc = CONFIG.poker.random.perHandIncrement ?? 1
    const seed = (base + (s.handId + 1) * inc) >>> 0
    const rng = makeXorShift32(seed)
    s.deck = shuffleInPlace(createStandardDeck(), rng)
  } else {
    s.deck = shuffleInPlace(createStandardDeck())
  }
  s.handId += 1
  s.community = []
  s.seats = s.seats.map((seat) => ({
    ...seat,
    hole: [],
    committedThisStreet: 0,
    totalCommitted: 0,
    hasFolded: seat.stack <= 0 ? true : false,
    isAllIn: false,
  }))
  s.pot = { main: 0 }
  s.lastRaiseAmount = s.rules.bigBlind
  s.betToCall = 0
  s.street = 'preflop'
  s.status = 'in_hand'

  const funded = s.seats.filter((x) => x.stack > 0).length
  if (funded < 2) {
    s.status = 'hand_over'
    s.gameOver = true
    return s
  }
  const sbIndex = nextSeatIndexWithChips(s.seats, s.buttonIndex)!
  const bbIndex = nextSeatIndexWithChips(s.seats, sbIndex)!
  postBlind(s, sbIndex, s.rules.smallBlind)
  postBlind(s, bbIndex, s.rules.bigBlind)

  for (let r = 0; r < 2; r += 1) {
    for (let i = 0; i < s.seats.length; i += 1) {
      const idx = (s.buttonIndex + 1 + i) % s.seats.length
      const seat = s.seats[idx]
      if (seat.hasFolded) continue
      seat.hole.push(drawCard(s.deck))
    }
  }

  const contenders = s.seats.filter((x) => x.stack > 0)
  if (contenders.length < 2) {
    s.status = 'hand_over'
    s.gameOver = true
    return s
  }

  s.currentToAct = nextSeatIndex(s.seats, bbIndex)
  if (s.currentToAct == null) return settleAndEnd(s)
  s.lastAggressorIndex = bbIndex
  s.betToCall = Math.max(...s.seats.map((x) => x.committedThisStreet))
  return s
}

function postBlind(state: PokerTableState, seatIndex: number, amount: number) {
  const seat = state.seats[seatIndex]
  if (seat.stack <= 0) return
  const toPay = Math.min(seat.stack, amount)
  seat.stack -= toPay
  seat.committedThisStreet += toPay
  seat.totalCommitted += toPay
  state.pot.main += toPay
  if (seat.stack === 0) seat.isAllIn = true
}

export function getAvailableActions(state: PokerTableState): BettingAction['type'][] {
  if (state.status !== 'in_hand' || state.currentToAct == null) return []
  const seat = state.seats[state.currentToAct]
  if (seat.isAllIn || seat.hasFolded) return []
  const toCall = state.betToCall - seat.committedThisStreet
  const canCheck = toCall <= 0
  const hasOpenBet = state.betToCall > 0
  const canRaise = hasOpenBet && !seat.isAllIn && seat.stack > toCall
  const canBet = canCheck && !hasOpenBet && seat.stack > 0

  const actions: BettingAction['type'][] = ['fold']
  if (canCheck) actions.push('check')
  else actions.push('call')
  if (canBet) actions.push('bet')
  if (canRaise) actions.push('raise')
  return actions
}

export function applyAction(state: PokerTableState, action: BettingAction): PokerTableState {
  if (state.status !== 'in_hand' || state.currentToAct == null) return state
  const s = cloneState(state)
  const actorIndex = s.currentToAct!
  const seat = s.seats[actorIndex]
  if (seat.hasFolded || seat.isAllIn) return s
  const toCall = Math.max(0, s.betToCall - seat.committedThisStreet)
  const minOpen = getStreetBetSize(s)

  let lastActionWasRaise = false
  switch (action.type) {
    case 'fold': {
      seat.hasFolded = true
      break
    }
    case 'check': {
      if (toCall > 0) throw new Error('Cannot check facing a bet')
      break
    }
    case 'call': {
      if (toCall <= 0) throw new Error('Nothing to call')
      const pay = Math.min(seat.stack, toCall)
      commitChips(s, seat, pay)
      break
    }
    case 'bet': {
      if (toCall > 0) throw new Error('Cannot bet facing a bet')
      const desired = Math.max(action.amount ?? minOpen, minOpen)
      const pay = Math.min(seat.stack, desired)
      commitChips(s, seat, pay)
      s.betToCall = seat.committedThisStreet
      s.lastRaiseAmount = pay
      s.lastAggressorIndex = seat.seatIndex
      break
    }
    case 'raise': {
      if (s.betToCall <= 0) throw new Error('Nothing to raise')
      const minRaiseExtra = Math.max(s.lastRaiseAmount, minOpen)
      const desiredExtra = Math.max(action.amount ?? minRaiseExtra, 0)
      const maxExtra = Math.max(0, seat.stack - toCall)
      const extra = Math.min(desiredExtra, maxExtra)
      const totalPay = Math.min(seat.stack, toCall + extra)
      if (totalPay <= 0) return s
      const beforeCommitted = seat.committedThisStreet
      commitChips(s, seat, totalPay)
      s.betToCall = Math.max(s.betToCall, seat.committedThisStreet)
      const actualExtra = seat.committedThisStreet - beforeCommitted - toCall
      const isValidRaise = actualExtra >= minRaiseExtra
      if (isValidRaise) {
        s.lastRaiseAmount = actualExtra
        s.lastAggressorIndex = seat.seatIndex
        lastActionWasRaise = true
      }
      break
    }
    default:
      return s
  }

  if (countActiveSeats(s.seats) <= 1) return settleAndEnd(s)

  const nextIdx = nextSeatIndex(s.seats, actorIndex)
  if (lastActionWasRaise) {
    if (nextIdx == null) return advanceStreet(s)
    s.currentToAct = nextIdx
    return s
  }

  const active = s.seats.filter((p) => !p.hasFolded && !p.isAllIn && p.hole.length === 2)
  const noActive = active.length === 0
  const allMatched = noActive || active.every((p) => p.committedThisStreet === s.betToCall)

  if (noActive) return advanceStreet(s)
  if (allMatched) {
    if (s.betToCall > 0) return advanceStreet(s)
    const sentinel = s.lastAggressorIndex
    if (sentinel != null && actorIndex !== sentinel) {
      s.currentToAct = nextIdx
      return s
    }
    return advanceStreet(s)
  }

  s.currentToAct = nextIdx
  return s
}

function settleAndEnd(state: PokerTableState): PokerTableState {
  const s = cloneState(state)
  const contenders = s.seats.filter((seat) => !seat.hasFolded && seat.hole.length === 2)
  if (contenders.length === 1) {
    const rake = computeRake(s.pot.main)
    contenders[0].stack += s.pot.main - rake
    s.pot.main = 0
  } else {
    while (s.community.length < 5) s.community.push(drawCard(s.deck))
    let pots = computePots(s)
    const committedTotal = s.seats.reduce((sum, seat) => sum + Math.max(0, Math.floor(seat.totalCommitted)), 0)
    const potsTotal = pots.reduce((sum, p) => sum + p.amount, 0)
    const livePot = Math.max(0, Math.floor(s.pot.main))
    if (livePot > 0 && committedTotal !== livePot) throw new Error(`[POT CHECK] live pot mismatch: committedTotal=${committedTotal} livePot=${livePot}`)
    if (committedTotal !== potsTotal) {
      const fallback = __computePotsDistinct(s)
      const fallbackTotal = fallback.reduce((sum, p) => sum + p.amount, 0)
      if (fallbackTotal !== committedTotal) throw new Error(`[POT CHECK] sidepot sum mismatch: committedTotal=${committedTotal} potsTotal=${potsTotal}`)
      pots = fallback
    }
    for (const pot of pots) {
      if (pot.amount <= 0 || pot.eligibleSeatIdxs.length === 0) continue
      const distributable = pot.amount - computeRake(pot.amount)
      const ranking = pot.eligibleSeatIdxs
        .filter((i) => s.seats[i].hole.length === 2)
        .map((i) => ({ idx: i, eval: evaluateSeven([...s.seats[i].hole, ...s.community]) }))
      let best: { classIdx: number; ranks: number[] } | null = null
      let winners: number[] = []
      const classOrder: Record<string, number> = { high_card: 0, pair: 1, two_pair: 2, three_kind: 3, straight: 4, flush: 5, full_house: 6, four_kind: 7, straight_flush: 8 } as const as any
      for (const r of ranking) {
        const cidx = classOrder[r.eval.class as unknown as string]
        if (!best) { best = { classIdx: cidx, ranks: r.eval.ranks }; winners = [r.idx] }
        else {
          const cmpClass = cidx - best.classIdx
          const cmpRanks = cmpClass === 0 ? compareRankArrays(r.eval.ranks, best.ranks) : cmpClass
          if (cmpRanks > 0) { best = { classIdx: cidx, ranks: r.eval.ranks }; winners = [r.idx] }
          else if (cmpRanks === 0) { winners.push(r.idx) }
        }
      }
      const share = Math.floor(distributable / winners.length)
      let remainder = distributable - share * winners.length
      for (const wi of winners) s.seats[wi].stack += share
      if (remainder > 0) distributeRemainderToWinners(winners, remainder, (s.buttonIndex + 1) % s.seats.length, s.seats.length, (idx) => { s.seats[idx].stack += 1 })
    }
    s.pot.main = 0
  }
  s.status = 'hand_over'
  s.currentToAct = null
  s.street = 'showdown'
  const nextBtn = nextSeatIndexWithChips(s.seats, s.buttonIndex)
  if (nextBtn != null) s.buttonIndex = nextBtn
  const withChips = s.seats.filter((x) => x.stack > 0).length
  if (withChips < 2) s.gameOver = true
  return s
}

function compareRankArrays(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    const ai = a[i] ?? -1
    const bi = b[i] ?? -1
    if (ai !== bi) return ai - bi
  }
  return 0
}

function distributeRemainderToWinners(
  winners: number[],
  remainder: number,
  startFrom: number,
  seatsLen: number,
  add: (idx: number) => void,
) {
  let idx = startFrom
  while (remainder > 0) {
    const nextWinner = winners.find((w) => w === idx)
    if (nextWinner != null) {
      add(nextWinner)
      remainder -= 1
      if (remainder === 0) break
    }
    idx = (idx + 1) % seatsLen
  }
}

function computeRake(amount: number): number {
  if (!CONFIG.poker.showRakeInUI) return 0
  const pct = CONFIG.poker.rakePercent ?? 0
  const cap = CONFIG.poker.rakeCap ?? 0
  let rake = Math.floor(amount * pct)
  if (cap > 0) rake = Math.min(rake, cap)
  return Math.max(0, rake)
}
function commitChips(state: PokerTableState, seat: SeatState, amount: number) {
  const pay = Math.min(amount, seat.stack)
  seat.stack -= pay
  seat.committedThisStreet += pay
  seat.totalCommitted += pay
  state.pot.main += pay
  if (seat.stack === 0) seat.isAllIn = true
}

function resetStreet(state: PokerTableState) {
  state.seats.forEach((s) => (s.committedThisStreet = 0))
  state.betToCall = 0
  state.lastRaiseAmount = state.rules.bigBlind
  state.lastAggressorIndex = null
}

function advanceStreet(state: PokerTableState): PokerTableState {
  const s = cloneState(state)
  if (s.street === 'preflop') {
    s.community.push(drawCard(s.deck), drawCard(s.deck), drawCard(s.deck))
    s.street = 'flop'
  } else if (s.street === 'flop') {
    s.community.push(drawCard(s.deck))
    s.street = 'turn'
  } else if (s.street === 'turn') {
    s.community.push(drawCard(s.deck))
    s.street = 'river'
  } else if (s.street === 'river') {
    s.street = 'showdown'
    return settleAndEnd(s)
  }
  resetStreet(s)
  const first = nextSeatIndex(s.seats, s.buttonIndex)
  if (first == null) return settleAndEnd(s)
  s.currentToAct = first
  const lastToAct = prevActiveSeatIndex(s.seats, first)
  s.lastAggressorIndex = lastToAct
  return s
}

export function computePots(state: PokerTableState): { amount: number; eligibleSeatIdxs: number[] }[] {
  const seats = state.seats
  const totals = seats
    .map((s, i) => ({ idx: i, total: Math.max(0, Math.floor(s.totalCommitted)) }))
    .filter((x) => x.total > 0)
  if (totals.length === 0) return []
  const anyExplicitAllIn = seats.some((s) => s.isAllIn)
  const anyImplicitAllIn = seats.some((s, i) => s.stack === 0 && (seats[i].totalCommitted ?? s.totalCommitted) > 0)
  const needsLayering = anyExplicitAllIn || anyImplicitAllIn
  if (!needsLayering) {
    const amount = totals.reduce((sum, x) => sum + x.total, 0)
    const eligible = totals.map((x) => x.idx).filter((idx) => !seats[idx].hasFolded)
    return eligible.length > 0 ? [{ amount, eligibleSeatIdxs: eligible }] : []
  }
  const allInLevels = Array.from(
    new Set(
      totals
        .filter((x) => seats[x.idx].isAllIn || seats[x.idx].stack === 0)
        .map((x) => x.total),
    ),
  ).sort((a, b) => a - b)
  const maxTotal = totals.reduce((m, x) => Math.max(m, x.total), 0)
  const minTotal = totals.reduce((m, x) => Math.min(m, x.total), Infinity)
  const levels: number[] = []
  if (Number.isFinite(minTotal) && minTotal > 0) levels.push(minTotal)
  for (const v of allInLevels) {
    if (levels[levels.length - 1] !== v) levels.push(v)
  }
  if (levels.length === 0 || levels[levels.length - 1] < maxTotal) levels.push(maxTotal)
  const pots: { amount: number; eligibleSeatIdxs: number[] }[] = []
  let prev = 0
  let carry = 0
  for (const level of levels) {
    const delta = level - prev
    if (delta <= 0) {
      prev = level
      continue
    }
    const participants = totals.filter((x) => x.total >= level).map((x) => x.idx)
    const amount = delta * participants.length
    const eligible = participants.filter((idx) => !seats[idx].hasFolded)
    if (eligible.length > 0) {
      pots.push({ amount: amount + carry, eligibleSeatIdxs: eligible })
      carry = 0
    } else {
      carry += amount
    }
    prev = level
  }
  if (carry > 0 && pots.length > 0) {
    pots[pots.length - 1].amount += carry
    carry = 0
  }
  return pots
}

function __computePotsDistinct(state: PokerTableState): { amount: number; eligibleSeatIdxs: number[] }[] {
  const seats = state.seats
  const totals = seats
    .map((s, i) => ({ idx: i, total: Math.max(0, Math.floor(s.totalCommitted)) }))
    .filter((x) => x.total > 0)
  if (totals.length === 0) return []
  const levels: number[] = Array.from(new Set(totals.map((x) => x.total))).sort((a, b) => a - b)
  const pots: { amount: number; eligibleSeatIdxs: number[] }[] = []
  let prev = 0
  let carry = 0
  for (const level of levels) {
    const delta = level - prev
    if (delta <= 0) {
      prev = level
      continue
    }
    const participants = totals.filter((x) => x.total >= level).map((x) => x.idx)
    const amount = delta * participants.length
    const eligible = participants.filter((idx) => !seats[idx].hasFolded)
    if (eligible.length > 0) {
      pots.push({ amount: amount + carry, eligibleSeatIdxs: eligible })
      carry = 0
    } else {
      carry += amount
    }
    prev = level
  }
  if (carry > 0 && pots.length > 0) pots[pots.length - 1].amount += carry
  return pots
}

export function getTotalPot(state: PokerTableState): number {
  return computePots(state).reduce((sum, p) => sum + p.amount, 0)
}

function prevActiveSeatIndex(seats: SeatState[], startExclusive: number): number | null {
  const n = seats.length
  for (let i = 1; i <= n; i += 1) {
    const idx = (startExclusive - i + n) % n
    const s = seats[idx]
    if (!s.hasFolded && !s.isAllIn) return idx
  }
  return null
}


