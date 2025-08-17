import { io, Socket } from 'socket.io-client'
import type { BettingAction, PokerTableState } from '../types'

export type RuntimeCallbacks = {
  onState: (state: PokerTableState) => void
  onAction?: (handId: number, seat: number, action: BettingAction, toCall: number, street: PokerTableState['street']) => void
  onDeal?: (handId: number, street: Exclude<PokerTableState['street'], 'preflop' | 'showdown' | null>, cardCodes: string[]) => void
  onHandStart?: (handId: number, buttonIndex: number, smallBlind: number, bigBlind: number) => void
  onPostBlind?: (seat: number, amount: number) => void
  onHandSetup?: (setup: any) => void
  onSeatUpdate?: (m: { seatIndex: number; isCPU: boolean; playerId: string | null; playerName: string | null }) => void
  onYouSeatChange?: (seatIndex: number | null) => void
  onAutoplay?: (seatIndex: number, auto: boolean) => void
  onSeatReserved?: (m: { seatIndex: number; playerName: string | null; expiresAt: number }) => void
  onSeatReservationCleared?: (m: { seatIndex: number }) => void
}

export function createRealtimeRuntimeAdapter(wsUrl: string, cb: RuntimeCallbacks, tableIdParam?: string) {
  let socket: Socket | null = null
  let mySeatIndexLocal: number | null = null
  let forcedPolling = false
  let playerToken: string | null = null
  const tableId = tableIdParam || (() => {
    try {
      const h = typeof window !== 'undefined' ? window.location.hash : ''
      if (h.startsWith('#poker/')) return h.slice('#poker/'.length)
    } catch {}
    return 'table-1'
  })()

  function connect() {
    console.log('[wsAdapter] init', { wsUrl })
    socket = io(wsUrl, {
      path: '/socket.io',
      // Allow polling fallback for environments where websocket is blocked or TLS is misconfigured
      transports: forcedPolling ? ['polling'] : ['websocket', 'polling'],
      upgrade: !forcedPolling,
      withCredentials: false,
      timeout: 12000,
    })
    socket.on('connect', () => {
      console.log('[wsAdapter] connected', socket?.id)
      // Identity first
      try {
        const existing = sessionStorage?.getItem('playerToken') || null
        const suggested = `Player-${Math.floor(Math.random()*1000)}`
        const name = sessionStorage?.getItem('playerName') || suggested
        sessionStorage?.setItem('playerName', name)
        socket?.emit('identify', { token: existing || undefined, name }, (ack: any) => {
          try { if (ack?.token) { playerToken = String(ack.token); sessionStorage?.setItem('playerToken', playerToken) } } catch {}
          // Join table after identity
          socket?.emit('join', { tableId }, (ack2: any) => {
            console.log('[wsAdapter] join ack', ack2)
            if (ack2?.state) cb.onState(ack2.state)
          })
        })
      } catch (e) {
        // Fallback join without identity
        socket?.emit('join', { tableId }, (ack2: any) => {
          console.log('[wsAdapter] join ack', ack2)
          if (ack2?.state) cb.onState(ack2.state)
        })
      }
    })
    socket.on('connect_error', (err) => {
      console.error('[client] connect_error', err?.message || err)
      if (!forcedPolling) {
        try { socket?.disconnect() } catch {}
        socket = null
        forcedPolling = true
        setTimeout(() => connect(), 200)
      }
    })
    socket.on('error', (err) => console.error('[client] error', err))
    socket.on('state', (s: PokerTableState) => { console.log('[wsAdapter] state', { handId: s.handId, street: s.street, toAct: s.currentToAct }); cb.onState(s) })
    // Autoplay state is client-owned UI; server no longer broadcasts autoplay
    socket.on('hand_start', (m: any) => cb.onHandStart?.(m.handId, m.buttonIndex, m.smallBlind, m.bigBlind))
    socket.on('post_blind', (m: any) => cb.onPostBlind?.(m.seat, m.amount))
    socket.on('hand_setup', (m: any) => cb.onHandSetup?.(m))
    socket.on('deal', (m: any) => cb.onDeal?.(m.handId, m.street, m.cards))
    socket.on('action', (m: any) => cb.onAction?.(m.handId, m.seat, m.action, m.toCall, m.street))
    socket.on('seat_update', (m: any) => {
      try {
        const myId = playerToken || socket?.id
        if (myId && (m.playerId === myId)) { mySeatIndexLocal = m.seatIndex; cb.onYouSeatChange?.(m.seatIndex) }
        else if (myId && m.playerId == null && mySeatIndexLocal === m.seatIndex) { mySeatIndexLocal = null; cb.onYouSeatChange?.(null) }
      } catch {}
      cb.onSeatUpdate?.(m)
    })
    socket.on('seat_reserved', (m: any) => { try { if (m && typeof m.seatIndex === 'number') cb.onSeatReserved?.(m) } catch {} })
    socket.on('seat_reservation_cleared', (m: any) => { try { if (m && typeof m.seatIndex === 'number') cb.onSeatReservationCleared?.(m) } catch {} })
  }

  function beginHand() {
    console.log('[wsAdapter] begin')
    socket?.emit('begin', { tableId })
  }

  function act(action: BettingAction) {
    console.log('[wsAdapter] act', action)
    socket?.emit('act', { tableId, action })
  }

  function setSeatAutoPlay(seatIndex: number, enabled: boolean) {
    console.log('[wsAdapter] setSeatAuto', { seatIndex, enabled })
    // Use the updated setAuto endpoint with per-seat autoplay
    socket?.emit('setAuto', { tableId, seatIndex, auto: enabled }, (ack: any) => {
      try { 
        if (typeof ack?.auto === 'boolean') {
          // Emit the new per-seat autoplay event
          cb.onAutoplay?.(seatIndex, ack.auto)
        }
      } catch {}
    })
  }

  function isSeatAutoPlayEnabled(_seatIndex: number): boolean {
    // For remote runtime, we don't have local state - this would need server support
    // For now, return false as we can't know the current state
    return false
  }

  function sit(seatIndex: number, name: string) {
    console.log('[wsAdapter] sit', { seatIndex, name })
    socket?.emit('sit', { tableId, seatIndex, name })
  }

  function leave() {
    console.log('[wsAdapter] leave')
    socket?.emit('leave', { tableId })
  }

  function reset() {
    console.log('[wsAdapter] reset')
    socket?.emit('reset', { tableId })
  }

  function dispose() {
    try { socket?.disconnect() } catch {}
    socket = null
  }

  connect()
  return { beginHand, act, setSeatAutoPlay, isSeatAutoPlayEnabled, sit, leave, reset, dispose }
}



