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
  onAutoplay?: (auto: boolean) => void
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
        const existing = localStorage?.getItem('playerToken') || null
        const suggested = `Player-${Math.floor(Math.random()*1000)}`
        const name = sessionStorage?.getItem('playerName') || suggested
        sessionStorage?.setItem('playerName', name)
        socket?.emit('identify', { token: existing || undefined, name }, (ack: any) => {
          try { if (ack?.token) { playerToken = String(ack.token); localStorage?.setItem('playerToken', playerToken) } } catch {}
          // Join table after identity
          socket?.emit('join', { tableId }, (ack2: any) => {
            console.log('[wsAdapter] join ack', ack2)
            if (ack2?.state) cb.onState(ack2.state)
            if (typeof ack2?.auto === 'boolean') cb.onAutoplay?.(ack2.auto)
            // If no one is seated yet, attempt to auto-sit into seat 0 using our name
            try {
              if (ack2?.state?.seats?.every((s:any)=>s.isCPU)) {
                socket?.emit('sit', { tableId, seatIndex: 0, name })
              }
            } catch {}
          })
        })
      } catch (e) {
        // Fallback join without identity
        socket?.emit('join', { tableId }, (ack2: any) => {
          console.log('[wsAdapter] join ack', ack2)
          if (ack2?.state) cb.onState(ack2.state)
          if (typeof ack2?.auto === 'boolean') cb.onAutoplay?.(ack2.auto)
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
    socket.on('autoplay', (m: any) => { try { if (typeof m?.auto === 'boolean') cb.onAutoplay?.(m.auto) } catch {} })
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
  }

  function beginHand() {
    console.log('[wsAdapter] begin')
    socket?.emit('begin', { tableId })
  }

  function act(action: BettingAction) {
    console.log('[wsAdapter] act', action)
    socket?.emit('act', { tableId, action })
  }

  function setAutoPlay(v: boolean) {
    console.log('[wsAdapter] setAuto', v)
    socket?.emit('setAuto', { tableId, auto: v }, (ack: any) => {
      try { if (typeof ack?.auto === 'boolean') cb.onAutoplay?.(ack.auto) } catch {}
    })
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
  return { beginHand, act, setAutoPlay, sit, leave, reset, dispose }
}



