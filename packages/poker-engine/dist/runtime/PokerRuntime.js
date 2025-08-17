import { makeXorShift32 } from '../blackjack/deck.js';
import { applyAction, createInitialPokerTable, getAvailableActions, startHand } from '../flow.js';
import { suggestActionPoker } from '../strategy.js';
import { CONFIG } from '../localConfig.js';
export class PokerRuntime {
    state;
    // Deprecated: global autoplay flag; prefer shouldAutoplaySeat callback for human seats
    autoPlay = false;
    timers = {
        cpu: null,
        player: null,
        autoDeal: null,
        watchdog: null,
    };
    cb;
    delayBumpOnceMs = 0;
    shouldAutoplaySeatFn;
    constructor(opts, cb) {
        this.state = createInitialPokerTable(opts.seats, opts.cpuSeats, opts.startingStack);
        this.cb = cb;
        this.shouldAutoplaySeatFn = typeof opts.shouldAutoplaySeat === 'function' ? opts.shouldAutoplaySeat : () => false;
        if (CONFIG.poker.random?.useSeeded) {
            const base = CONFIG.poker.random.seed ?? 1;
            const rng = makeXorShift32(((base * 0x9E3779B1) >>> 0));
            globalThis.__POKER_RNG__ = rng;
        }
        this.cb.onState(this.state);
    }
    dispose() { this.clearAllTimers(); }
    setAutoPlay(v) { this.autoPlay = v; this.armTimers(); }
    // Public method for hosts (e.g., server) to force a timer reevaluation when external
    // conditions change (like toggling per-seat autoplay preferences)
    rearmTimers() { this.armTimers(); }
    /**
     * Toggle whether a given seat should be driven by CPU logic.
     * When set to false, the runtime will not schedule an automatic CPU action when it is this seat's turn.
     */
    setSeatCpu(seatIndex, isCpu) {
        if (seatIndex < 0 || seatIndex >= this.state.seats.length)
            return;
        const before = this.state.seats[seatIndex].isCPU;
        if (before === isCpu)
            return;
        this.state.seats[seatIndex].isCPU = isCpu;
        this.cb.onState(this.state);
        this.armTimers();
    }
    beginHand() {
        this.state = startHand(this.state);
        const s = this.state;
        const toCode = (c) => `${c.rank}${c.suit[0]}`;
        this.cb.onHandStart?.(s.handId, s.buttonIndex, s.rules.smallBlind, s.rules.bigBlind);
        s.seats.forEach((seat, i) => { if (seat.committedThisStreet > 0)
            this.cb.onPostBlind?.(i, seat.committedThisStreet); });
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
        };
        this.cb.onHandSetup?.(setup);
        this.cb.onState(this.state);
        try {
            const committedSum = this.state.seats.reduce((sum, s) => sum + (s.committedThisStreet || 0), 0);
            if (committedSum > 0) {
                const bump = CONFIG.poker.animations?.chipFlyDurationMs ?? 0;
                this.delayBumpOnceMs = Math.max(this.delayBumpOnceMs, bump);
            }
        }
        catch { }
        this.armTimers();
    }
    act(action) {
        if (this.state.status !== 'in_hand')
            return;
        const toAct = this.state.currentToAct;
        const isPlayer = toAct === 0;
        const before = this.state;
        const actorIndex = before.currentToAct ?? -1;
        const toCall = Math.max(0, before.betToCall - (before.seats[actorIndex]?.committedThisStreet || 0));
        const street = before.street;
        const handId = before.handId;
        const prevCommittedSum = before.seats.reduce((sum, s) => sum + (s.committedThisStreet || 0), 0);
        const next = applyAction(before, action);
        if (next === before)
            return;
        const prevComm = before.community.length;
        const nextComm = next.community.length;
        this.state = next;
        const nextCommittedSum = next.seats.reduce((sum, s) => sum + (s.committedThisStreet || 0), 0);
        if (prevCommittedSum > 0 && nextCommittedSum === 0) {
            const bump = CONFIG.poker.animations?.chipFlyDurationMs ?? 0;
            this.delayBumpOnceMs = Math.max(this.delayBumpOnceMs, bump);
        }
        try {
            const actorBefore = before.seats[actorIndex];
            const actorAfter = next.seats[actorIndex];
            if (actorBefore && actorAfter) {
                const deltaCommitted = (actorAfter.committedThisStreet || 0) - (actorBefore.committedThisStreet || 0);
                if (deltaCommitted > 0) {
                    const bump = CONFIG.poker.animations?.chipFlyDurationMs ?? 0;
                    this.delayBumpOnceMs = Math.max(this.delayBumpOnceMs, bump);
                }
            }
        }
        catch { }
        this.cb.onAction?.(handId, actorIndex, action, toCall, street);
        if (nextComm > prevComm) {
            const toCode = (c) => `${c.rank}${c.suit[0]}`;
            if (nextComm === 3)
                this.cb.onDeal?.(handId, 'flop', next.community.slice(0, 3).map(toCode));
            else if (nextComm === 4)
                this.cb.onDeal?.(handId, 'turn', next.community.slice(3, 4).map(toCode));
            else if (nextComm === 5)
                this.cb.onDeal?.(handId, 'river', next.community.slice(4, 5).map(toCode));
        }
        this.cb.onState(this.state);
        this.armTimers();
    }
    clearAllTimers() { Object.keys(this.timers).forEach((k) => { const key = k; const id = this.timers[key]; if (id != null)
        clearTimeout(id); this.timers[key] = null; }); }
    armTimers() {
        this.clearAllTimers();
        const s = this.state;
        if (s.status === 'hand_over') {
            if (s.gameOver)
                return;
            // Always auto-deal the next hand; per-seat autoplay only affects per-turn actions
            const bump = this.delayBumpOnceMs;
            this.delayBumpOnceMs = 0;
            const delay = CONFIG.pokerAutoplay.autoDealDelayMs + (CONFIG.poker.animations?.chipFlyDurationMs ?? 0) + bump;
            this.timers.autoDeal = setTimeout(() => this.beginHand(), delay);
            return;
        }
        if (s.status !== 'in_hand')
            return;
        const toAct = s.currentToAct;
        if (toAct == null)
            return;
        const toActSeat = s.seats[toAct];
        const scheduleCpu = () => {
            const bump = this.delayBumpOnceMs;
            this.delayBumpOnceMs = 0;
            const delay = CONFIG.pokerAutoplay.cpuActionDelayMs + bump;
            this.timers.cpu = setTimeout(() => {
                const cur = this.state;
                if (cur.status !== 'in_hand' || cur.currentToAct !== toAct)
                    return;
                const seat = cur.seats[toAct];
                if (!seat?.isCPU)
                    return;
                const a = this.suggestCpuAction();
                this.act(a);
            }, delay);
            this.timers.watchdog = setTimeout(() => {
                const cur = this.state;
                if (cur.status !== 'in_hand' || cur.currentToAct !== toAct)
                    return;
                const seat = cur.seats[toAct];
                if (!seat?.isCPU)
                    return;
                const a = this.suggestCpuAction();
                this.act(a);
            }, delay + 1200);
        };
        const schedulePlayer = () => {
            // Only schedule human-seat autoplay if host indicates this seat should auto-act
            if (!this.shouldAutoplaySeatFn(toAct))
                return;
            const bump = this.delayBumpOnceMs;
            this.delayBumpOnceMs = 0;
            const delay = CONFIG.pokerAutoplay.playerActionDelayMs + bump;
            this.timers.player = setTimeout(() => {
                if (this.state.status !== 'in_hand' || this.state.currentToAct !== toAct)
                    return;
                const a = this.suggestCpuAction();
                this.act(a);
            }, delay);
        };
        // Drive by seat type: if CPU seat, schedule CPU; otherwise, treat as human and only schedule player when autoplay is enabled
        if (toActSeat?.isCPU)
            scheduleCpu();
        else
            schedulePlayer();
    }
    suggestCpuAction() {
        const suggested = suggestActionPoker(this.state, 'tight');
        if (suggested)
            return suggested;
        const avail = getAvailableActions(this.state);
        if (avail.includes('check'))
            return { type: 'check' };
        if (avail.includes('call'))
            return { type: 'call' };
        if (avail.includes('fold'))
            return { type: 'fold' };
        return { type: 'fold' };
    }
}
