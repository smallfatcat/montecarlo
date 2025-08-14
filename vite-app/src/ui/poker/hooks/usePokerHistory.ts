import { useState, useRef } from 'react'
import type { HistoryEvent, HandHistory } from '../../../poker/history'

export function usePokerHistory() {
  const [histories, setHistories] = useState<HandHistory[]>([])
  const [historyLines, setHistoryLines] = useState<string[]>([])
  const lastActionKeyRef = useRef<string>('')

  const appendEvent = (handId: number, e: HistoryEvent) => {
    // De-dupe repeated action logs (e.g., due to effects scheduling twice in dev)
    if ((e as any).type === 'action') {
      const a = e as Extract<HistoryEvent, { type: 'action' }>
      const key = `${handId}|${a.type}|${a.seat}|${a.action}|${a.amount ?? 'null'}|${a.toCall}|${a.street}`
      if (key === lastActionKeyRef.current) return
      lastActionKeyRef.current = key
    } else {
      // Reset on non-action to ensure future distinct actions log
      lastActionKeyRef.current = ''
    }

    setHistories((prev) => {
      const idx = prev.findIndex((h) => h.handId === handId)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], events: [...copy[idx].events, e] }
        return copy
      }
      return [...prev, { handId, events: [e] }]
    })

    // Flat line
    const line = (() => {
      switch (e.type) {
        case 'hand_start': 
          return `Hand #${e.handId} start (BTN ${e.buttonIndex}) blinds ${e.smallBlind}/${e.bigBlind}`
        case 'post_blind': 
          return `Seat ${e.seat} posts blind ${e.amount}`
        case 'hand_setup': 
          return `Setup: BTN ${e.buttonIndex} stacks [${e.seats.map((s)=>s.stack).join(', ')}] deck ${e.deckRemaining}/${e.deckTotal}`
        case 'deal_flop': 
          return `Flop: ${e.cards.join(' ')}`
        case 'deal_turn': 
          return `Turn: ${e.cards.join(' ')}`
        case 'deal_river': 
          return `River: ${e.cards.join(' ')}`
        case 'action': 
          return `Seat ${e.seat} ${e.action}${e.amount != null ? ' ' + e.amount : ''} (toCall ${e.toCall})`
        case 'showdown': 
          return `Showdown: ${e.summary}`
        case 'results': {
          const parts = e.perSeat
            .filter(x => x.delta !== 0)
            .map(x => `Seat ${x.seat} ${x.delta > 0 ? '+' : ''}${x.delta}${x.revealed ? ` (${x.revealed})` : ''}`)
          return parts.length ? `Result: ${parts.join(' • ')}` : `Result: no net changes`
        }
        case 'hand_end': 
          return `Hand #${e.handId} end`
        default:
          return `Unknown event: ${(e as any).type}`
      }
    })()

    setHistoryLines((prev) => [...prev, line])
  }

  const clearHistory = () => {
    setHistories([])
    setHistoryLines([])
    lastActionKeyRef.current = ''
  }

  return {
    histories,
    historyLines,
    appendEvent,
    clearHistory,
  }
}
