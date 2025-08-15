import type { BettingAction } from '../protocol.js'
import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { PokerTableState } from '@montecarlo/poker-engine'
import { PokerRuntime } from '@montecarlo/poker-engine'

export type TableId = string

export interface TableApi {
  tableId: TableId
  beginHand(): void
  actFrom(socket: Socket, action: BettingAction): { ok: true } | { ok: false; error: string }
  actFromId(playerId: string, action: BettingAction): { ok: true } | { ok: false; error: string }
  setAuto(auto: boolean): void
  getAuto(): boolean
  getState(): PokerTableState
  addClient(socket: Socket): void
  removeClient(socket: Socket): void
  sit(socket: Socket, seatIndex: number, name: string): { ok: true } | { ok: false; error: string }
  sitId(playerId: string, seatIndex: number, name: string): { ok: true } | { ok: false; error: string }
  leave(socket: Socket): { ok: true } | { ok: false; error: string }
  leaveId(playerId: string): { ok: true } | { ok: false; error: string }
  reset(): void
  getSummary(): {
    tableId: string
    seats: number
    humans: number
    cpus: number
    status: string
    handId: number | null
    updatedAt: number
  }
  handleDisconnect(playerId: string): void
}

export function createServerRuntimeTable(io: SocketIOServer, tableId: TableId, opts?: { seats?: number; startingStack?: number; onSummaryChange?: (summary: any) => void; disconnectGraceMs?: number }): TableApi {
  const seats = opts?.seats ?? 6
  const startingStack = opts?.startingStack ?? 5000
  const cpuSeats = Array.from({ length: seats }, (_, i) => i)
  let lastState: PokerTableState | null = null
  let autoPlay = false

  const room = `table:${tableId}`

  // Seat ownership map playerId -> seat index
  const seatOwners = new Map<string, number>()
  const playerNames = new Map<string, string>()
  const disconnectGraceMs = Math.max(0, opts?.disconnectGraceMs ?? 15000)
  const pendingReleases = new Map<string, any>()

  let runtime = new PokerRuntime({ seats, cpuSeats, startingStack }, {
    onState: (s) => {
      lastState = s
      io.to(room).emit('state', s)
      try { console.log('[server-runtime] state', { handId: s.handId, street: s.street, toAct: s.currentToAct }) } catch {}
      try { opts?.onSummaryChange?.(getSummary()) } catch {}
    },
    onAction: (handId, seat, action, toCall, street) => {
      io.to(room).emit('action', { handId, seat, action, toCall, street })
      try { console.log('[server-runtime] action', { handId, seat, action: action.type, toCall, street }) } catch {}
    },
    onDeal: (handId, street, cardCodes) => {
      io.to(room).emit('deal', { handId, street, cards: cardCodes })
      try { console.log('[server-runtime] deal', { handId, street, cards: cardCodes.join(' ') }) } catch {}
    },
    onHandStart: (handId, buttonIndex, smallBlind, bigBlind) => {
      io.to(room).emit('hand_start', { handId, buttonIndex, smallBlind, bigBlind })
      try { console.log('[server-runtime] hand_start', { handId, buttonIndex, smallBlind, bigBlind }) } catch {}
    },
    onPostBlind: (seat, amount) => {
      // Attach to last known hand id if available
      const hid = (lastState as any)?.handId ?? null
      io.to(room).emit('post_blind', { handId: hid, seat, amount })
      try { console.log('[server-runtime] post_blind', { handId: hid, seat, amount }) } catch {}
    },
    onHandSetup: (setup) => {
      io.to(room).emit('hand_setup', setup)
      try { console.log('[server-runtime] hand_setup', { handId: setup.handId, seats: setup.seats.length, deckRemaining: setup.deckRemaining }) } catch {}
    },
  })

  function addClient(socket: Socket) {
    socket.join(room)
    if (lastState) socket.emit('state', lastState)
    // Always send current autoplay state on join
    try { socket.emit('autoplay', { auto: autoPlay }) } catch {}
    // If this socket has an identified playerId and that player already owns a seat, inform them
    try {
      const pid = ((socket as any).data?.playerId as string | undefined) || null
      if (pid && seatOwners.has(pid)) {
        const seatIdx = seatOwners.get(pid)!
        const name = playerNames.get(pid) ?? null
        socket.emit('seat_update', { seatIndex: seatIdx, isCPU: false, playerId: pid, playerName: name })
      }
    } catch {}
    try { console.log('[server-runtime] join', { socketId: socket.id }) } catch {}
  }

  function removeClient(socket: Socket) {
    socket.leave(room)
    const seatIdx = seatOwners.get(socket.id)
    if (seatIdx != null) {
      // Vacate seat: flip back to CPU
      seatOwners.delete(socket.id)
      playerNames.delete(socket.id)
      try { (runtime as any).setSeatCpu?.(seatIdx, true) } catch {}
      // Do not auto-vacate seat on raw client removal; reconnection grace is handled separately
    }
  }

  return {
    tableId,
    beginHand() { runtime.beginHand() },
    actFrom(socket, action) {
      // Back-compat: use socket.id as playerId if identity not used
      return this.actFromId(socket.id, action)
    },
    actFromId(playerId, action) {
      const s = lastState
      if (!s) return { ok: false, error: 'no_state' }
      const seatIdx = seatOwners.get(playerId)
      if (seatIdx == null) { try { console.log('[server-runtime] act rejected', { playerId, reason: 'not_seated' }) } catch {}; return { ok: false, error: 'not_seated' } }
      if (s.status !== 'in_hand' || s.currentToAct !== seatIdx) { try { console.log('[server-runtime] act rejected', { playerId, reason: 'not_your_turn', currentToAct: s.currentToAct }) } catch {}; return { ok: false, error: 'not_your_turn' } }
      try {
        runtime.act(action as any)
        try { console.log('[server-runtime] act accepted', { playerId, action: (action as any)?.type }) } catch {}
        return { ok: true }
      } catch (e: any) {
        try { console.log('[server-runtime] act error', { playerId, error: e?.message }) } catch {}
        return { ok: false, error: e?.message || 'act_failed' }
      }
    },
    setAuto(auto) {
      autoPlay = !!auto
      try { (runtime as any).setAutoPlay?.(autoPlay) } catch {}
      // Emit to everyone including sender so all clients get a consistent event
      io.in(room).emit('autoplay', { auto: autoPlay })
    },
    getAuto() { return autoPlay },
    getState() { return lastState as PokerTableState },
    addClient,
    removeClient,
    sit(socket, seatIndex: number, name: string) {
      return this.sitId(socket.id, seatIndex, name)
    },
    sitId(playerId: string, seatIndex: number, name: string) {
      const s = lastState
      if (!s) return { ok: false, error: 'no_state' }
      if (seatIndex < 0 || seatIndex >= s.seats.length) return { ok: false, error: 'invalid_seat' }
      if (s.status === 'in_hand') return { ok: false, error: 'mid_hand' }
      // If this player already has a seat, vacate it first (move seats)
      const existing = seatOwners.get(playerId)
      if (existing != null && existing !== seatIndex) {
        try { (runtime as any).setSeatCpu?.(existing, true) } catch {}
        io.to(room).emit('seat_update', { seatIndex: existing, isCPU: true, playerId: null, playerName: null })
        seatOwners.delete(playerId)
        playerNames.delete(playerId)
      }
      // Reject if seat is already taken by another user
      for (const [pid, idx] of seatOwners.entries()) { if (idx === seatIndex && pid !== playerId) return { ok: false, error: 'seat_taken' } }
      // Assign seat to this player and flip to human
      seatOwners.set(playerId, seatIndex)
      playerNames.set(playerId, name)
      // Cancel pending release if reconnecting
      const pending = pendingReleases.get(playerId)
      if (pending) { try { clearTimeout(pending) } catch {}; pendingReleases.delete(playerId) }
      try { (runtime as any).setSeatCpu?.(seatIndex, false) } catch {}
      io.to(room).emit('seat_update', { seatIndex, isCPU: false, playerId, playerName: name })
      try { opts?.onSummaryChange?.(getSummary()) } catch {}
      return { ok: true }
    },
    leave(socket) {
      return this.leaveId(socket.id)
    },
    leaveId(playerId: string) {
      const s = lastState
      if (!s) return { ok: false, error: 'no_state' }
      const seatIdx = seatOwners.get(playerId)
      if (seatIdx == null) return { ok: false, error: 'not_seated' }
      if (s.status === 'in_hand') return { ok: false, error: 'mid_hand' }
      seatOwners.delete(playerId)
      playerNames.delete(playerId)
      try { (runtime as any).setSeatCpu?.(seatIdx, true) } catch {}
      io.to(room).emit('seat_update', { seatIndex: seatIdx, isCPU: true, playerId: null, playerName: null })
      try { opts?.onSummaryChange?.(getSummary()) } catch {}
      return { ok: true }
    },
    reset() {
      try { (runtime as any).dispose?.() } catch {}
      runtime = new PokerRuntime({ seats, cpuSeats, startingStack }, {
        onState: (s) => {
          lastState = s
          io.to(room).emit('state', s)
          try { console.log('[server-runtime] state', { handId: s.handId, street: s.street, toAct: s.currentToAct }) } catch {}
          try { opts?.onSummaryChange?.(getSummary()) } catch {}
        },
        onAction: (handId, seat, action, toCall, street) => {
          io.to(room).emit('action', { handId, seat, action, toCall, street })
          try { console.log('[server-runtime] action', { handId, seat, action: (action as any)?.type, toCall, street }) } catch {}
        },
        onDeal: (handId, street, cardCodes) => {
          io.to(room).emit('deal', { handId, street, cards: cardCodes })
          try { console.log('[server-runtime] deal', { handId, street, cards: (cardCodes as any).join(' ') }) } catch {}
        },
        onHandStart: (handId, buttonIndex, smallBlind, bigBlind) => {
          io.to(room).emit('hand_start', { handId, buttonIndex, smallBlind, bigBlind })
          try { console.log('[server-runtime] hand_start', { handId, buttonIndex, smallBlind, bigBlind }) } catch {}
        },
        onPostBlind: (seat, amount) => {
          const hid = (lastState as any)?.handId ?? null
          io.to(room).emit('post_blind', { handId: hid, seat, amount })
          try { console.log('[server-runtime] post_blind', { handId: hid, seat, amount }) } catch {}
        },
        onHandSetup: (setup) => {
          io.to(room).emit('hand_setup', setup)
          try { console.log('[server-runtime] hand_setup', { handId: setup.handId, seats: setup.seats.length, deckRemaining: setup.deckRemaining }) } catch {}
        },
      })
      autoPlay = false
      lastState = (runtime as any)['state'] as PokerTableState
      io.to(room).emit('state', lastState as PokerTableState)
      io.in(room).emit('autoplay', { auto: autoPlay })
      try { opts?.onSummaryChange?.(getSummary()) } catch {}
    },
    getSummary,
    handleDisconnect(playerId: string) {
      if (!seatOwners.has(playerId)) return
      if (pendingReleases.has(playerId)) return
      if (disconnectGraceMs <= 0) return
      const seatIdx = seatOwners.get(playerId)!
      const handle = setTimeout(() => {
        pendingReleases.delete(playerId)
        try { (runtime as any).setSeatCpu?.(seatIdx, true) } catch {}
        seatOwners.delete(playerId)
        playerNames.delete(playerId)
        io.to(room).emit('seat_update', { seatIndex: seatIdx, isCPU: true, playerId: null, playerName: null })
        try { opts?.onSummaryChange?.(getSummary()) } catch {}
      }, disconnectGraceMs)
      pendingReleases.set(playerId, handle)
    }
  }

  function getSummary() {
    const s = lastState as any
    const totalSeats = s?.seats?.length ?? seats
    let humans = seatOwners.size
    humans = Math.min(humans, totalSeats)
    const cpus = Math.max(0, totalSeats - humans)
    const status = s?.status || 'unknown'
    const handId = typeof s?.handId === 'number' ? s.handId : null
    return {
      tableId,
      seats: totalSeats,
      humans,
      cpus,
      status,
      handId,
      updatedAt: Date.now(),
    }
  }
}



