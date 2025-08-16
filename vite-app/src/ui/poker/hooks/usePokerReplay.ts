import type { HandHistory, HistoryEvent } from '../../../poker/history'
import { createInitialPokerTable, applyAction } from '../../../poker/flow'
import { nextSeatIndex } from '../../../poker/types'
import type { Card } from '../../../blackjack/types'

export function usePokerReplay(
  eventQueue: any,
  setTable: (table: any) => void,
  setRevealed: (revealed: { holeCounts: number[]; boardCount: number }) => void,
  setAutoPlay: (auto: boolean) => void,
) {
  // Loader helpers
  const fromCode = (code: string): Card => ({ 
    rank: code.slice(0, code.length - 1) as any, 
    suit: ({ C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' } as any)[code.slice(-1)] 
  })

  function loadFromSetup(setup: Extract<HistoryEvent, { type: 'hand_setup' }>) {
    setAutoPlay(false)
    setTable(() => {
      const seatsLen = setup.seats.length
      const cpuSeats = Array.from({ length: Math.max(0, seatsLen - 1) }, (_, i) => i + 1)
      let s = createInitialPokerTable(seatsLen, cpuSeats, 0)
      s.handId = setup.handId
      s.buttonIndex = setup.buttonIndex
      s.rules.smallBlind = setup.rules.smallBlind
      s.rules.bigBlind = setup.rules.bigBlind
      s.deck = setup.deck.map(fromCode)
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
          hasFolded: snap.stack <= 0 ? true : false,
          isAllIn: snap.isAllIn,
          hole: snap.hole.map(fromCode),
        }
      })
      s.pot.main = s.seats.reduce((sum, x) => sum + x.committedThisStreet, 0)
      s.betToCall = Math.max(0, ...s.seats.map((x) => x.committedThisStreet))
      const bbIndex = s.seats.reduce((best, x, i) => (x.committedThisStreet > (s.seats[best]?.committedThisStreet ?? -1) ? i : best), 0)
      s.currentToAct = nextSeatIndex(s.seats as any, bbIndex)
      s.lastAggressorIndex = bbIndex
      setRevealed({ holeCounts: Array.from({ length: Math.max(6, s.seats.length) }, () => 2), boardCount: 0 })
      return s
    })
  }

  function loadFromHistory(h: HandHistory) {
    const setup = h.events.find((e) => (e as any).type === 'hand_setup') as Extract<HistoryEvent, { type: 'hand_setup' }> | undefined
    if (!setup) return
    setAutoPlay(false)
    loadFromSetup(setup)
  }

  function stopReplay() {
    eventQueue.clearByTag('replay')
  }

  function replayHistory(h: HandHistory, stepMs = 600) {
    stopReplay()
    setAutoPlay(false)
    const setup = h.events.find((e) => (e as any).type === 'hand_setup') as Extract<HistoryEvent, { type: 'hand_setup' }> | undefined
    if (!setup) return
    // Load starting snapshot
    loadFromSetup(setup)
    // Sequence all recorded actions (in order)
    const actions = h.events.filter((e) => (e as any).type === 'action') as Array<Extract<HistoryEvent, { type: 'action' }>>
    actions.forEach((a, i) => {
      eventQueue.schedule(() => {
        setTable((t: any) => {
          const forced = { ...t, currentToAct: a.seat } as any
          return applyAction(forced, { type: a.action, amount: (a.amount == null ? undefined : a.amount) })
        })
      }, i * stepMs, 'replay')
    })
  }

  return {
    loadFromSetup,
    loadFromHistory,
    stopReplay,
    replayHistory,
  }
}
