import type { Card } from '../blackjack/types'
import type { PokerTableState, BettingAction } from './types'
import { nextSeatIndex } from './types'
import { createInitialPokerTable, applyAction } from './flow'
import { createStandardDeck } from '../blackjack/deck'

export type HistoryEvent =
  | { ts: number; type: 'hand_start'; handId: number; buttonIndex: number; smallBlind: number; bigBlind: number }
  | { ts: number; type: 'hand_setup'; handId: number; buttonIndex: number; rules: { smallBlind: number; bigBlind: number }; deck: string[]; deckRemaining: number; deckTotal: number; seats: Array<{ stack: number; committedThisStreet: number; totalCommitted: number; hasFolded: boolean; isAllIn: boolean; hole: string[] }> }
  | { ts: number; type: 'post_blind'; seat: number; amount: number }
  | { ts: number; type: 'deal_flop' | 'deal_turn' | 'deal_river'; cards: string[] }
  | { ts: number; type: 'action'; seat: number; action: BettingAction['type']; amount?: number | null; toCall: number; street: PokerTableState['street'] }
  | { ts: number; type: 'showdown'; winners: number[]; summary: string }
  | { ts: number; type: 'results'; perSeat: Array<{ seat: number; delta: number; stackAfter: number; committed: number; revealed?: string | null }> }
  | { ts: number; type: 'hand_end'; handId: number }

export interface HandHistory { handId: number; events: HistoryEvent[] }

export type ActionEvent = Extract<HistoryEvent, { type: 'action' }>
export type SetupEvent = Extract<HistoryEvent, { type: 'hand_setup' }>

const fromCode = (code: string): Card => ({ rank: code.slice(0, code.length - 1) as any, suit: ({ C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' } as any)[code.slice(-1)] })

export function buildTableFrom(setup: SetupEvent, actions: ActionEvent[], uptoExclusive: number): PokerTableState {
  const seatsLen = setup.seats.length
  const cpuSeats = Array.from({ length: Math.max(0, seatsLen - 1) }, (_, i) => i + 1)
  let s = createInitialPokerTable(seatsLen, cpuSeats, 0)
  s.handId = setup.handId
  s.buttonIndex = setup.buttonIndex
  s.rules.smallBlind = setup.rules.smallBlind
  s.rules.bigBlind = setup.rules.bigBlind
  // Ensure a non-empty deck so advanceStreet can deal without exhausting
  s.deck = (setup.deck && setup.deck.length > 0) ? setup.deck.map(fromCode) : createStandardDeck()
  s.community = []
  s.status = 'in_hand'
  s.street = 'preflop'
  s.seats = s.seats.map((seat, i) => {
    const snap = setup.seats[i]
    return {
      ...seat,
      stack: snap.stack,
      committedThisStreet: snap.committedThisStreet,
      totalCommitted: snap.totalCommitted,
      hasFolded: !!snap.hasFolded,
      isAllIn: !!snap.isAllIn,
      hole: snap.hole.map(fromCode),
    }
  })
  s.pot.main = s.seats.reduce((sum, x) => sum + x.committedThisStreet, 0)
  s.betToCall = Math.max(0, ...s.seats.map((x) => x.committedThisStreet))
  const bbIndex = s.seats.reduce((best, x, i) => (x.committedThisStreet > (s.seats[best]?.committedThisStreet ?? -1) ? i : best), 0)
  s.currentToAct = nextSeatIndex(s.seats as any, bbIndex)
  s.lastAggressorIndex = bbIndex
  for (let i = 0; i < uptoExclusive; i += 1) {
    const a = actions[i]
    // Force actor and normalize action based on current state to avoid invariant errors
    s = { ...s, currentToAct: a.seat } as PokerTableState
    const seat = s.seats[a.seat]
    const toCall = Math.max(0, s.betToCall - (seat?.committedThisStreet ?? 0))
    let type: BettingAction['type'] = a.action
    let amount: number | undefined = (a.amount == null ? undefined : a.amount)
    if (type === 'call' && toCall <= 0) type = 'check'
    else if (type === 'check' && toCall > 0) type = 'call'
    else if (type === 'bet' && toCall > 0) { type = 'call'; amount = toCall }
    else if (type === 'raise' && s.betToCall <= 0) { type = 'bet' }
    s = applyAction(s, { type, amount })
  }
  return s
}


