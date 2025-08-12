import { CONFIG } from '../../config'
import { makeXorShift32 } from '../../blackjack/deck'
import { applyAction, createInitialPokerTable, getAvailableActions, startHand } from '../flow'
import { suggestActionPoker } from '../strategy'
import type { PokerTableState, BettingAction } from '../types'

export type RuntimeCallbacks = {
  onState: (state: PokerTableState) => void
  onAction?: (handId: number, seat: number, action: BettingAction, toCall: number, street: PokerTableState['street']) => void
  onDeal?: (handId: number, street: Exclude<PokerTableState['street'], 'preflop' | 'showdown' | null>, cardCodes: string[]) => void
  onHandStart?: (handId: number, buttonIndex: number, smallBlind: number, bigBlind: number) => void
  onPostBlind?: (seat: number, amount: number) => void
  onHandSetup?: (setup: {
    handId: number
    buttonIndex: number
    rules: { smallBlind: number; bigBlind: number }
    deck: string[]
    deckRemaining: number
    deckTotal: number
    seats: Array<{
      stack: number
      committedThisStreet: number
      totalCommitted: number
      hasFolded: boolean
      isAllIn: boolean
      hole: string[]
    }>
  }) => void
}

export interface RuntimeOptions {
  seats: number
  cpuSeats: number[]
  startingStack: number
}

type TimerId = number | null

export class PokerRuntime {
  private state: PokerTableState
  private autoPlay: boolean = false
  private timers: { cpu: TimerId; player: TimerId; autoDeal: TimerId; watchdog: TimerId } = {
    cpu: null,
    player: null,
    autoDeal: null,
    watchdog: null,
  }
  private readonly cb: RuntimeCallbacks

  constructor(opts: RuntimeOptions, cb: RuntimeCallbacks) {
    this.state = createInitialPokerTable(opts.seats, opts.cpuSeats, opts.startingStack)
    this.cb = cb
    // Install deterministic RNG for strategy when enabled
    if (CONFIG.poker.random?.useSeeded) {
      const base = CONFIG.poker.random.seed ?? 1
      const rng = makeXorShift32(((base * 0x9E3779B1) >>> 0))
      ;(globalThis as any).__POKER_RNG__ = rng
    }
    this.cb.onState(this.state)
  }

  dispose() {
    this.clearAllTimers()
  }

  setAutoPlay(v: boolean) {
    this.autoPlay = v
    this.armTimers()
  }

  beginHand() {
    this.state = startHand(this.state)
    // Emit hand start + blinds + setup synchronously before any timers are armed
    const s = this.state
    const toCode = (c: any) => `${c.rank}${c.suit[0]}`
    this.cb.onHandStart?.(s.handId, s.buttonIndex, s.rules.smallBlind, s.rules.bigBlind)
    s.seats.forEach((seat, i) => {
      if (seat.committedThisStreet > 0) this.cb.onPostBlind?.(i, seat.committedThisStreet)
    })
    const setup = {
      handId: s.handId,
      buttonIndex: s.buttonIndex,
      rules: { smallBlind: s.rules.smallBlind, bigBlind: s.rules.bigBlind },
      deck: s.deck.map(toCode),
      deckRemaining: s.deck.length,
      deckTotal: s.deck.length + s.community.length + s.seats.reduce((sum, seat) => sum + seat.hole.length, 0),
      seats: s.seats.map((seat) => ({
        stack: seat.stack,
        committedThisStreet: seat.committedThisStreet,
        totalCommitted: seat.totalCommitted,
        hasFolded: seat.hasFolded,
        isAllIn: seat.isAllIn,
        hole: seat.hole.map(toCode),
      })),
    }
    this.cb.onHandSetup?.(setup)
    // Publish state and arm timers
    this.cb.onState(this.state)
    this.armTimers()
  }

  act(action: BettingAction) {
    if (this.state.status !== 'in_hand') return
    const toAct = this.state.currentToAct
    const isPlayer = toAct === 0
    if (isPlayer === false && this.autoPlay === false) return
    // Apply and publish
    const before = this.state
    const actorIndex = before.currentToAct ?? -1
    const toCall = Math.max(0, before.betToCall - (before.seats[actorIndex]?.committedThisStreet || 0))
    const street = before.street
    const handId = before.handId
    const next = applyAction(before, action)
    if (next === before) return
    // If a new street was dealt (community increased), emit deal event synchronously
    const prevComm = before.community.length
    const nextComm = next.community.length
    if (nextComm > prevComm) {
      const toCode = (c: any) => `${c.rank}${c.suit[0]}`
      if (nextComm === 3) this.cb.onDeal?.(handId, 'flop', next.community.slice(0, 3).map(toCode))
      else if (nextComm === 4) this.cb.onDeal?.(handId, 'turn', next.community.slice(3, 4).map(toCode))
      else if (nextComm === 5) this.cb.onDeal?.(handId, 'river', next.community.slice(4, 5).map(toCode))
    }
    this.state = next
    if (this.cb.onAction) this.cb.onAction(handId, actorIndex, action, toCall, street)
    this.cb.onState(this.state)
    this.armTimers()
  }

  private clearAllTimers() {
    Object.keys(this.timers).forEach((k) => {
      const key = k as keyof typeof this.timers
      const id = this.timers[key]
      if (id != null) clearTimeout(id as number)
      this.timers[key] = null
    })
  }

  private armTimers() {
    // Clear previous timers
    this.clearAllTimers()

    const s = this.state
    if (s.status === 'hand_over') {
      if (s.gameOver) return
      // Auto-deal next hand if autoplay is on
      if (this.autoPlay) {
        const delay = CONFIG.pokerAutoplay.autoDealDelayMs
        this.timers.autoDeal = setTimeout(() => this.beginHand(), delay) as unknown as number
      }
      return
    }
    if (s.status !== 'in_hand') return

    const toAct = s.currentToAct
    if (toAct == null) return

    const scheduleCpu = () => {
      const delay = CONFIG.pokerAutoplay.cpuActionDelayMs
      this.timers.cpu = setTimeout(() => {
        // Only act if still same turn
        if (this.state.status !== 'in_hand' || this.state.currentToAct !== toAct) return
        const a = this.suggestCpuAction()
        this.act(a)
      }, delay) as unknown as number
      // Watchdog
      this.timers.watchdog = setTimeout(() => {
        if (this.state.status !== 'in_hand' || this.state.currentToAct !== toAct) return
        const a = this.suggestCpuAction()
        this.act(a)
      }, delay + 1200) as unknown as number
    }

    const schedulePlayer = () => {
      if (!this.autoPlay) return
      const delay = CONFIG.pokerAutoplay.playerActionDelayMs
      this.timers.player = setTimeout(() => {
        if (this.state.status !== 'in_hand' || this.state.currentToAct !== 0) return
        const a = this.suggestCpuAction()
        this.act(a)
      }, delay) as unknown as number
    }

    if (toAct === 0) schedulePlayer()
    else scheduleCpu()
  }

  private suggestCpuAction(): BettingAction {
    // Use existing poker strategy to produce realistic actions (including bet/raise sizing)
    // Fallback to availability if strategy cannot suggest
    const suggested = suggestActionPoker(this.state, 'tight')
    if (suggested) return suggested
    const avail = getAvailableActions(this.state)
    if (avail.includes('check')) return { type: 'check' }
    if (avail.includes('call')) return { type: 'call' }
    if (avail.includes('fold')) return { type: 'fold' }
    return { type: 'fold' }
  }
}


