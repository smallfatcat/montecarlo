import { useRef, useEffect, useCallback } from 'react'
import type { PokerTableState, BettingAction } from '../../../poker/types'
import { PokerRuntime } from '../../../poker/runtime/PokerRuntime'
import { createRealtimeRuntimeAdapter } from '../../../poker/realtime/wsAdapter'
import type { HistoryEvent } from '../../../poker/history'

export type RuntimeLike = {
  beginHand: () => void
  act: (action: BettingAction) => void
  setAutoPlay: (v: boolean) => void
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
  setAutoPlay: (auto: boolean) => void,
) {
  const runtimeRef = useRef<RuntimeLike | null>(null)
  const lastRemoteAutoRef = useRef<boolean | null>(null)
  
  // Store callback functions in refs to prevent infinite re-renders
  const callbacksRef = useRef({
    appendEvent,
    setTable,
    setPlayerNames,
    setMySeatIndex,
    setAutoPlay,
  })

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      appendEvent,
      setTable,
      setPlayerNames,
      setMySeatIndex,
      setAutoPlay,
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
    onYouSeatChange: (seatIndex: number | null) => callbacksRef.current.setMySeatIndex(seatIndex),
    onAutoplay: (auto: boolean) => { lastRemoteAutoRef.current = auto; callbacksRef.current.setAutoPlay(auto) },
  }), [])

  const resetRuntime = useCallback(() => {
    const wsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined
    if (wsUrl) {
      // Ask server to reset table in place
      if (runtimeRef.current?.reset) {
        runtimeRef.current.reset()
      }
      return
    }
    // Local-only reset: Dispose runtime and re-create in local mode
    try { runtimeRef.current?.dispose() } catch {}
    runtimeRef.current = null
    const cb = createRuntimeCallbacks()
    const cpuSeats = Array.from({ length: Math.max(0, numPlayers - 1) }, (_, i) => i + 1)
    const rt = new PokerRuntime({ seats: numPlayers, cpuSeats, startingStack }, cb as any)
    runtimeRef.current = rt as unknown as RuntimeLike
  }, [numPlayers, startingStack, createRuntimeCallbacks])

  // Initialize runtime once and bridge state changes to React
  useEffect(() => {
    if (runtimeRef.current) return
    const cb = createRuntimeCallbacks()
    const wsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined
    if (wsUrl) {
      let tableId: string | undefined
      try {
        const h = typeof window !== 'undefined' ? window.location.hash : ''
        if (h.startsWith('#poker/')) tableId = h.slice('#poker/'.length)
      } catch {}
      runtimeRef.current = createRealtimeRuntimeAdapter(wsUrl, cb as any, tableId)
    } else {
      const cpuSeats = Array.from({ length: Math.max(0, numPlayers - 1) }, (_, i) => i + 1)
      const rt = new PokerRuntime({ seats: numPlayers, cpuSeats, startingStack }, cb as any)
      runtimeRef.current = rt as unknown as RuntimeLike
      // Local runtime has no concept of remote seating; treat seat 0 as the player's seat
      callbacksRef.current.setMySeatIndex(0)
    }
    // start first hand is driven by UI control (Deal button)
    return () => { runtimeRef.current?.dispose(); runtimeRef.current = null }
  }, [numPlayers, startingStack, createRuntimeCallbacks])

  return {
    runtimeRef,
    lastRemoteAutoRef,
    resetRuntime,
  }
}
