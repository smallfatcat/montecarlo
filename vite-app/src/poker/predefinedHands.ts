import type { HandHistory, HistoryEvent } from './history'
import { buildTableFrom } from './history'
import { __test__finalizeShowdown, computePots } from './flow'
import { evaluateSeven, formatEvaluated } from './handEval'
import type { Card } from '../blackjack/types'

function handSetupSidePots(): HandHistory {
  const handId = 900001
  const ts = Date.now()
  const seats = [
    { stack: 0, committedThisStreet: 0, totalCommitted: 100, hasFolded: false, isAllIn: true, hole: ['AC','AS'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 50, hasFolded: false, isAllIn: true, hole: ['KC','KS'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 10, hasFolded: false, isAllIn: true, hole: ['QC','QS'] },
  ]
  const events: HistoryEvent[] = [
    { ts, type: 'hand_start', handId, buttonIndex: 0, smallBlind: 1, bigBlind: 2 },
    {
      ts,
      type: 'hand_setup',
      handId,
      buttonIndex: 0,
      rules: { smallBlind: 1, bigBlind: 2 },
      deck: [],
      deckRemaining: 0,
      deckTotal: 0,
      seats,
    } as any,
    { ts, type: 'deal_flop', cards: ['2H','3H','4H'] },
    { ts, type: 'deal_turn', cards: ['5H'] },
    { ts, type: 'deal_river', cards: ['9S'] },
    // Optional: could include showdown/results text, but the preview uses computePots for display
  ]
  return { handId, events }
}

export const PREDEFINED_HAND_HISTORIES: HandHistory[] = [handSetupSidePots()]

function handSidePotsTieMainSideToSeat3(): HandHistory {
  const handId = 900002
  const ts = Date.now()
  // Totals: 30,30,30,31 → main pot 120 split (0,1,2 eligible), side pot 1 (1 chip) eligible [3]
  const seats = [
    { stack: 0, committedThisStreet: 0, totalCommitted: 30, hasFolded: false, isAllIn: true, hole: ['AC','3S'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 30, hasFolded: false, isAllIn: true, hole: ['AD','4S'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 30, hasFolded: false, isAllIn: true, hole: ['AH','2S'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 31, hasFolded: false, isAllIn: true, hole: ['QC','8H'] },
  ]
  const events: HistoryEvent[] = [
    { ts, type: 'hand_start', handId, buttonIndex: 0, smallBlind: 1, bigBlind: 2 },
    { ts, type: 'hand_setup', handId, buttonIndex: 0, rules: { smallBlind: 1, bigBlind: 2 }, deck: [], deckRemaining: 0, deckTotal: 0, seats } as any,
    { ts, type: 'deal_flop', cards: ['2C','5D','9S'] },
    { ts, type: 'deal_turn', cards: ['JH'] },
    { ts, type: 'deal_river', cards: ['KC'] },
  ]
  return { handId, events }
}

function handSidePotsFoldedContributor(): HandHistory {
  const handId = 900003
  const ts = Date.now()
  // Totals: seat0=50, seat1=15, seat2=15(folded) → main 45 eligible [0,1], side 5 eligible [0]
  const seats = [
    { stack: 0, committedThisStreet: 0, totalCommitted: 50, hasFolded: false, isAllIn: true, hole: ['KS','KD'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 15, hasFolded: false, isAllIn: true, hole: ['QS','QD'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 15, hasFolded: true,  isAllIn: false, hole: ['JH','JC'] },
  ]
  const events: HistoryEvent[] = [
    { ts, type: 'hand_start', handId, buttonIndex: 1, smallBlind: 1, bigBlind: 2 },
    { ts, type: 'hand_setup', handId, buttonIndex: 1, rules: { smallBlind: 1, bigBlind: 2 }, deck: [], deckRemaining: 0, deckTotal: 0, seats } as any,
    { ts, type: 'deal_flop', cards: ['7C','2D','3S'] },
    { ts, type: 'deal_turn', cards: ['9D'] },
    { ts, type: 'deal_river', cards: ['AS'] },
  ]
  return { handId, events }
}

function handSidePotsRakeRemainderTieHU(): HandHistory {
  const handId = 900004
  const ts = Date.now()
  // Heads-up, totals: 10/10, with rake expected (configure UI separately). Tied high-card → split with remainder.
  const seats = [
    { stack: 0, committedThisStreet: 0, totalCommitted: 10, hasFolded: false, isAllIn: true, hole: ['2C','3C'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 10, hasFolded: false, isAllIn: true, hole: ['2H','3H'] },
  ]
  const events: HistoryEvent[] = [
    { ts, type: 'hand_start', handId, buttonIndex: 0, smallBlind: 1, bigBlind: 2 },
    { ts, type: 'hand_setup', handId, buttonIndex: 0, rules: { smallBlind: 1, bigBlind: 2 }, deck: [], deckRemaining: 0, deckTotal: 0, seats } as any,
    { ts, type: 'deal_flop', cards: ['AC','KD','QC'] },
    { ts, type: 'deal_turn', cards: ['JD'] },
    { ts, type: 'deal_river', cards: ['10S'] },
  ]
  return { handId, events }
}

// Append scenarios to export
PREDEFINED_HAND_HISTORIES.push(
  handSidePotsTieMainSideToSeat3(),
  handSidePotsFoldedContributor(),
  handSidePotsRakeRemainderTieHU(),
)

// Full flow with actions creating side pots preflop (UTG raise, BB shove, SB short-call)
function handFullFlow_SidePots_PreflopAllIn(): HandHistory {
  const handId = 900005
  const ts = Date.now()
  // Stacks: s0=150, s1=40, s2=100; Blinds SB seat1=1, BB seat2=2 (BTN seat0)
  const seats = [
    { stack: 150, committedThisStreet: 0, totalCommitted: 0, hasFolded: false, isAllIn: false, hole: ['AH','AD'] },
    { stack: 40, committedThisStreet: 1, totalCommitted: 1, hasFolded: false, isAllIn: false, hole: ['QS','QH'] },
    { stack: 100, committedThisStreet: 2, totalCommitted: 2, hasFolded: false, isAllIn: false, hole: ['KC','KD'] },
  ]
  const events: HistoryEvent[] = [
    { ts, type: 'hand_start', handId, buttonIndex: 0, smallBlind: 1, bigBlind: 2 },
    { ts, type: 'hand_setup', handId, buttonIndex: 0, rules: { smallBlind: 1, bigBlind: 2 }, deck: [], deckRemaining: 0, deckTotal: 0, seats } as any,
    // Preflop actions: seat0 raises to 10 (raise extra 8), seat1 calls, seat2 shoves to 100, seat0 calls, seat1 short-calls all-in
    { ts, type: 'action', seat: 0, action: 'raise', amount: 8, toCall: 2, street: 'preflop' },
    { ts, type: 'action', seat: 1, action: 'call', amount: null, toCall: 9, street: 'preflop' },
    { ts, type: 'action', seat: 2, action: 'raise', amount: 90, toCall: 8, street: 'preflop' },
    { ts, type: 'action', seat: 0, action: 'call', amount: null, toCall: 90, street: 'preflop' },
    { ts, type: 'action', seat: 1, action: 'call', amount: null, toCall: 90, street: 'preflop' },
    // Deal streets (everyone effectively all-in / matched)
    { ts, type: 'deal_flop', cards: ['2C','2D','7S'] },
    { ts, type: 'deal_turn', cards: ['9C'] },
    { ts, type: 'deal_river', cards: ['4H'] },
  ]
  return { handId, events }
}

// Full flow with a fold creating ineligible contributor and later all-in
function handFullFlow_SidePots_WithFold(): HandHistory {
  const handId = 900006
  const ts = Date.now()
  // Stacks: s0=120, s1=60, s2=60; Blinds SB seat1=1, BB seat2=2 (BTN seat0)
  const seats = [
    { stack: 120, committedThisStreet: 0, totalCommitted: 0, hasFolded: false, isAllIn: false, hole: ['AC','KC'] },
    { stack: 60, committedThisStreet: 1, totalCommitted: 1, hasFolded: false, isAllIn: false, hole: ['JH','JD'] },
    { stack: 60, committedThisStreet: 2, totalCommitted: 2, hasFolded: false, isAllIn: false, hole: ['9S','9C'] },
  ]
  const events: HistoryEvent[] = [
    { ts, type: 'hand_start', handId, buttonIndex: 0, smallBlind: 1, bigBlind: 2 },
    { ts, type: 'hand_setup', handId, buttonIndex: 0, rules: { smallBlind: 1, bigBlind: 2 }, deck: [], deckRemaining: 0, deckTotal: 0, seats } as any,
    // Preflop: UTG raises to 8, SB folds, BB calls
    { ts, type: 'action', seat: 0, action: 'raise', amount: 6, toCall: 2, street: 'preflop' },
    { ts, type: 'action', seat: 1, action: 'fold', toCall: 7, street: 'preflop' },
    { ts, type: 'action', seat: 2, action: 'call', toCall: 6, street: 'preflop' },
    { ts, type: 'deal_flop', cards: ['QS','7D','2H'] },
    // Flop: BB shoves, UTG calls
    { ts, type: 'action', seat: 2, action: 'bet', amount: 52, toCall: 0, street: 'flop' },
    { ts, type: 'action', seat: 0, action: 'call', toCall: 52, street: 'flop' },
    { ts, type: 'deal_turn', cards: ['5C'] },
    { ts, type: 'deal_river', cards: ['3D'] },
  ]
  return { handId, events }
}

PREDEFINED_HAND_HISTORIES.push(
  handFullFlow_SidePots_PreflopAllIn(),
  handFullFlow_SidePots_WithFold(),
)

// 4-way all-in layered side pots: AA > KK > QQ > JJ, board 2H 3C 6S 7D 8H
function handPredef_FourWayAllIn_Layered(): HandHistory {
  const handId = 900007
  const ts = Date.now()
  const seats = [
    { stack: 0, committedThisStreet: 0, totalCommitted: 10, hasFolded: false, isAllIn: true, hole: ['AC','AH'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 20, hasFolded: false, isAllIn: true, hole: ['KC','KH'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 30, hasFolded: false, isAllIn: true, hole: ['QC','QH'] },
    { stack: 0, committedThisStreet: 0, totalCommitted: 40, hasFolded: false, isAllIn: true, hole: ['JC','JH'] },
  ]
  const events: HistoryEvent[] = [
    { ts, type: 'hand_start', handId, buttonIndex: 0, smallBlind: 1, bigBlind: 2 },
    { ts, type: 'hand_setup', handId, buttonIndex: 0, rules: { smallBlind: 1, bigBlind: 2 }, deck: [], deckRemaining: 0, deckTotal: 0, seats } as any,
    { ts, type: 'deal_flop', cards: ['2H','3C','6S'] },
    { ts, type: 'deal_turn', cards: ['7D'] },
    { ts, type: 'deal_river', cards: ['8H'] },
  ]
  return { handId, events }
}

PREDEFINED_HAND_HISTORIES.push(
  handPredef_FourWayAllIn_Layered(),
)

// Append showdown and results to each predefined history for complete end-of-hand view
function toCode(c: Card): string { return `${c.rank}${(c.suit as any)[0]}` }
function fromCode(code: string): Card { return { rank: code.slice(0, code.length - 1) as any, suit: ({ C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' } as any)[code.slice(-1)] } }

function withShowdown(h: HandHistory): HandHistory {
  const setup = h.events.find((e) => (e as any).type === 'hand_setup') as any
  if (!setup) return h
  const actions = h.events.filter((e) => (e as any).type === 'action') as any[]
  // Build state up to end of actions
  let s = buildTableFrom(setup, actions as any, actions.length)
  // Apply board from events
  const board: Card[] = []
  for (const e of h.events) {
    const t = (e as any).type
    if (t === 'deal_flop') board.push(...((e as any).cards || []).map(fromCode))
    if (t === 'deal_turn') board.push(...((e as any).cards || []).map(fromCode))
    if (t === 'deal_river') board.push(...((e as any).cards || []).map(fromCode))
  }
  if (board.length >= 3) s = { ...s, community: board as any }
  const settled = __test__finalizeShowdown(s)
  const pots = computePots(settled)
  const totalPot = pots.reduce((sum, p) => sum + p.amount, 0)
  // Showdown summary
  let summary = ''
  if ((settled.community?.length ?? 0) >= 5) {
    const ranked: { seat: number; text: string }[] = []
    settled.seats.forEach((ss: any, i: number) => {
      if (ss.hasFolded || ss.hole.length !== 2) return
      const ev = evaluateSeven([...(ss.hole as any), ...(settled.community as any)] as any)
      ranked.push({ seat: i, text: formatEvaluated(ev as any) })
    })
    summary = `Pot ${totalPot} • ` + ranked.map((r) => `Seat ${r.seat}: ${r.text}`).join(' • ')
  } else {
    summary = `Pot ${totalPot} • No showdown`
  }
  const showdownEvt: HistoryEvent = { ts: Date.now(), type: 'showdown', winners: [], summary }
  // Results
  const startStacks = setup.seats.map((x: any) => x.stack)
  const resultsEvt: HistoryEvent = {
    ts: Date.now(),
    type: 'results',
    perSeat: settled.seats.map((ss: any, i: number) => ({
      seat: i,
      delta: ss.stack - startStacks[i],
      stackAfter: ss.stack,
      committed: ss.totalCommitted,
      revealed: (!ss.hasFolded && ss.hole.length === 2) ? `${toCode(ss.hole[0])} ${toCode(ss.hole[1])}` : null,
    }))
  } as any
  const endEvt: HistoryEvent = { ts: Date.now(), type: 'hand_end', handId: setup.handId }
  // Append if missing
  const hasShowdown = h.events.some((e) => (e as any).type === 'showdown')
  const hasResults = h.events.some((e) => (e as any).type === 'results')
  const hasEnd = h.events.some((e) => (e as any).type === 'hand_end')
  const extra: HistoryEvent[] = []
  if (!hasShowdown) extra.push(showdownEvt)
  if (!hasResults) extra.push(resultsEvt)
  if (!hasEnd) extra.push(endEvt)
  return { handId: h.handId, events: [...h.events, ...extra] }
}

for (let i = 0; i < PREDEFINED_HAND_HISTORIES.length; i += 1) {
  PREDEFINED_HAND_HISTORIES[i] = withShowdown(PREDEFINED_HAND_HISTORIES[i])
}


