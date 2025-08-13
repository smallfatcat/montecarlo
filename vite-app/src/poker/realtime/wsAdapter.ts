import { io, Socket } from 'socket.io-client'
import type { BettingAction, PokerTableState } from '../types'

export type RuntimeCallbacks = {
  onState: (state: PokerTableState) => void
  onAction?: (handId: number, seat: number, action: BettingAction, toCall: number, street: PokerTableState['street']) => void
  onDeal?: (handId: number, street: Exclude<PokerTableState['street'], 'preflop' | 'showdown' | null>, cardCodes: string[]) => void
  onHandStart?: (handId: number, buttonIndex: number, smallBlind: number, bigBlind: number) => void
  onPostBlind?: (seat: number, amount: number) => void
  onHandSetup?: (setup: any) => void
}

export function createRealtimeRuntimeAdapter(wsUrl: string, cb: RuntimeCallbacks) {
  let socket: Socket | null = null

  function connect() {
    console.log('[wsAdapter] init', { wsUrl })
    socket = io(wsUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: false,
      timeout: 8000,
    })
    socket.on('connect', () => {
      console.log('[wsAdapter] connected', socket?.id)
      socket?.emit('join', { tableId: 'table-1' }, (ack: any) => {
        console.log('[wsAdapter] join ack', ack)
        if (ack?.state) cb.onState(ack.state)
      })
    })
    socket.on('connect_error', (err) => console.error('[client] connect_error', err?.message || err))
    socket.on('error', (err) => console.error('[client] error', err))
    socket.on('state', (s: PokerTableState) => { console.log('[wsAdapter] state', { handId: s.handId, street: s.street, toAct: s.currentToAct }); cb.onState(s) })
    socket.on('hand_start', (m: any) => cb.onHandStart?.(m.handId, m.buttonIndex, m.smallBlind, m.bigBlind))
    socket.on('post_blind', (m: any) => cb.onPostBlind?.(m.seat, m.amount))
    socket.on('hand_setup', (m: any) => cb.onHandSetup?.(m))
    socket.on('deal', (m: any) => cb.onDeal?.(m.handId, m.street, m.cards))
    socket.on('action', (m: any) => cb.onAction?.(m.handId, m.seat, m.action, m.toCall, m.street))
  }

  function beginHand() {
    console.log('[wsAdapter] begin')
    socket?.emit('begin', { tableId: 'table-1' })
  }

  function act(action: BettingAction) {
    console.log('[wsAdapter] act', action)
    socket?.emit('act', { tableId: 'table-1', action })
  }

  function setAutoPlay(v: boolean) {
    console.log('[wsAdapter] setAuto', v)
    socket?.emit('setAuto', { tableId: 'table-1', auto: v })
  }

  function dispose() {
    try { socket?.disconnect() } catch {}
    socket = null
  }

  connect()
  return { beginHand, act, setAutoPlay, dispose }
}



