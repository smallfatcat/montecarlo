import { useRef, useEffect, useCallback } from 'react'
import type { PokerTableState, BettingAction } from '../../../poker/types'
// Local runtime removed for WS-only mode
import { createRealtimeRuntimeAdapter } from '../../../poker/realtime/wsAdapter'
import type { HistoryEvent } from '../../../poker/history'

export type RuntimeLike = {
  beginHand: () => void
  act: (action: BettingAction) => void
  setSeatAutoPlay: (seatIndex: number, enabled: boolean) => void
  isSeatAutoPlayEnabled: (seatIndex: number) => boolean
  sit?: (seatIndex: number, name: string) => void
  leave?: () => void
  reset?: () => void
  dispose: () => void
}

export function usePokerRuntime(
  numPlayers: number,
  startingStack: number,
  appendEvent: (handId: number, e: HistoryEvent) => void,
  setTable: (table: PokerTableState | ((prev: PokerTableState) => PokerTableState)) => void,
  setPlayerNames: (names: Array<string | null> | ((prev: Array<string | null>) => Array<string | null>)) => void,
  setMySeatIndex: (seatIndex: number | null) => void,
  setAutoplayForSeat: (seatIndex: number, enabled: boolean) => void,
  clearAutoplayOnLeave: () => void,
) {
  const runtimeRef = useRef<RuntimeLike | null>(null)
  // WS-only mode: no remote autoplay broadcasting, no local mirror needed
  
  // Store callback functions in refs to prevent infinite re-renders
  const callbacksRef = useRef({
    appendEvent,
    setTable,
    setPlayerNames,
    setMySeatIndex,
    setAutoplayForSeat,
    clearAutoplayOnLeave,
  })

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      appendEvent,
      setTable,
      setPlayerNames,
      setMySeatIndex,
      setAutoplayForSeat,
      clearAutoplayOnLeave,
    }
  })

  const createRuntimeCallbacks = useCallback(() => ({
    onState: (s: PokerTableState) => {
      callbacksRef.current.setTable(s)
    },
    onAction: (handId: number, seat: number, action: BettingAction, toCall: number, street: PokerTableState['street']) => {
      callbacksRef.current.appendEvent(handId, { ts: Date.now(), type: 'action', seat, action: action.type, amount: (action as any).amount ?? null, toCall, street })
    },
    onDeal: (handId: number, street: any, cardCodes: string[]) => {
      const type = street === 'flop' ? 'deal_flop' : street === 'turn' ? 'deal_turn' : 'deal_river'
      callbacksRef.current.appendEvent(handId, { ts: Date.now(), type: type as any, cards: cardCodes as any })
    },
    onHandStart: (handId: number, buttonIndex: number, smallBlind: number, bigBlind: number) => {
      callbacksRef.current.appendEvent(handId, { ts: Date.now(), type: 'hand_start', handId, buttonIndex, smallBlind, bigBlind } as any)
    },
    onPostBlind: (seat: number, amount: number) => {
      const hid = (runtimeRef.current as any)?.['state']?.handId ?? 0
      callbacksRef.current.appendEvent(hid, { ts: Date.now(), type: 'post_blind', seat, amount } as any)
    },
    onHandSetup: (setup: any) => {
      callbacksRef.current.appendEvent(setup.handId, { ts: Date.now(), type: 'hand_setup', ...setup } as any)
    },
    onSeatUpdate: (m: { seatIndex: number; isCPU: boolean; playerId: string | null; playerName: string | null }) => {
      callbacksRef.current.setPlayerNames((prev) => {
        const next = [...prev]
        next[m.seatIndex] = m.playerName
        return next
      })
    },
    onSeatReserved: (m: { seatIndex: number; playerName: string | null; expiresAt: number }) => {
      // Render countdown inline by appending to the display name temporarily
      callbacksRef.current.setPlayerNames((prev) => {
        const next = [...prev]
        // Keep base name; we show countdown separately, so don't mutate the name label here
        if (!next[m.seatIndex] && m.playerName) next[m.seatIndex] = m.playerName
        return next
      })
      // Store expiresAt into runtime state for per-seat overlay; optional lightweight approach could be enhanced later
      ;(window as any).__pokerReserved = (window as any).__pokerReserved || {}
      ;(window as any).__pokerReserved[m.seatIndex] = m.expiresAt
    },
    onSeatReservationCleared: (m: { seatIndex: number }) => {
      callbacksRef.current.setPlayerNames((prev) => {
        const next = [...prev]
        // No need to modify the name here; state updates will reflect the current player name
        return next
      })
      if ((window as any)?.__pokerReserved) delete (window as any).__pokerReserved[m.seatIndex]
    },
    onYouSeatChange: (seatIndex: number | null) => callbacksRef.current.setMySeatIndex(seatIndex),
  }), [])

  const resetRuntime = useCallback(() => {
    // WS-only: ask server to reset table in place
    if (runtimeRef.current?.reset) {
      runtimeRef.current.reset()
    }
  }, [])

  // Initialize runtime once and bridge state changes to React
  useEffect(() => {
    if (runtimeRef.current) return
    const cb = createRuntimeCallbacks()
    const wsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined
    let tableId: string | undefined
    try {
      const h = typeof window !== 'undefined' ? window.location.hash : ''
      if (h.startsWith('#poker/')) tableId = h.slice('#poker/'.length)
    } catch {}
    runtimeRef.current = createRealtimeRuntimeAdapter(wsUrl!, cb as any, tableId)
    // start first hand is driven by UI control (Deal button)
    return () => { runtimeRef.current?.dispose(); runtimeRef.current = null }
  }, [numPlayers, startingStack, createRuntimeCallbacks])

  return {
    runtimeRef,
    resetRuntime,
  }
}
