import { CONFIG } from '../../config';
import { makeXorShift32 } from '../../blackjack/deck';
import { applyAction, createInitialPokerTable, getAvailableActions, startHand } from '../flow';
import { suggestActionPoker } from '../strategy';
export class PokerRuntime {
    state;
    autoPlay = false;
    timers = {
        cpu: null,
        player: null,
        autoDeal: null,
        watchdog: null,
    };
    cb;
    // One-shot delay bump to allow UI animations (e.g., chips flying to pot) to complete
    delayBumpOnceMs = 0;
    constructor(opts, cb) {
        this.state = createInitialPokerTable(opts.seats, opts.cpuSeats, opts.startingStack);
        this.cb = cb;
        // Install deterministic RNG for strategy when enabled
        if (CONFIG.poker.random?.useSeeded) {
            const base = CONFIG.poker.random.seed ?? 1;
            const rng = makeXorShift32(((base * 0x9E3779B1) >>> 0));
            globalThis.__POKER_RNG__ = rng;
        }
        this.cb.onState(this.state);
    }
    dispose() {
        this.clearAllTimers();
    }
    setAutoPlay(v) {
        this.autoPlay = v;
        this.armTimers();
    }
    beginHand() {
        this.state = startHand(this.state);
        // Emit hand start + blinds + setup synchronously before any timers are armed
        const s = this.state;
        const toCode = (c) => `${c.rank}${c.suit[0]}`;
        this.cb.onHandStart?.(s.handId, s.buttonIndex, s.rules.smallBlind, s.rules.bigBlind);
        s.seats.forEach((seat, i) => {
            if (seat.committedThisStreet > 0)
                this.cb.onPostBlind?.(i, seat.committedThisStreet);
        });
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
        // Publish state and arm timers
        this.cb.onState(this.state);
        // If blinds were posted (committed present), allow stack->bet animation to complete before first action
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
        if (isPlayer === false && this.autoPlay === false)
            return;
        // Apply and publish
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
        // If this action closed betting for the street, the flow resets committedThisStreet to 0 when advancing.
        // Detect that transition and bump next timers to allow chip fly animation to complete.
        const nextCommittedSum = next.seats.reduce((sum, s) => sum + (s.committedThisStreet || 0), 0);
        if (prevCommittedSum > 0 && nextCommittedSum === 0) {
            const bump = CONFIG.poker.animations?.chipFlyDurationMs ?? 0;
            this.delayBumpOnceMs = Math.max(this.delayBumpOnceMs, bump);
        }
        // If this action committed additional chips from actor stack -> bet spot, bump once for that animation
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
        if (this.cb.onAction)
            this.cb.onAction(handId, actorIndex, action, toCall, street);
        // After logging the action, emit deal event if street advanced
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
    clearAllTimers() {
        Object.keys(this.timers).forEach((k) => {
            const key = k;
            const id = this.timers[key];
            if (id != null)
                clearTimeout(id);
            this.timers[key] = null;
        });
    }
    armTimers() {
        // Clear previous timers
        this.clearAllTimers();
        const s = this.state;
        if (s.status === 'hand_over') {
            if (s.gameOver)
                return;
            // Auto-deal next hand if autoplay is on
            if (this.autoPlay) {
                const bump = this.delayBumpOnceMs;
                this.delayBumpOnceMs = 0;
                // Add bump to allow pot->stack payout animation before next hand
                const delay = CONFIG.pokerAutoplay.autoDealDelayMs + (CONFIG.poker.animations?.chipFlyDurationMs ?? 0) + bump;
                this.timers.autoDeal = setTimeout(() => this.beginHand(), delay);
            }
            return;
        }
        if (s.status !== 'in_hand')
            return;
        const toAct = s.currentToAct;
        if (toAct == null)
            return;
        const scheduleCpu = () => {
            const bump = this.delayBumpOnceMs;
            this.delayBumpOnceMs = 0;
            const delay = CONFIG.pokerAutoplay.cpuActionDelayMs + bump;
            this.timers.cpu = setTimeout(() => {
                // Only act if still same turn
                if (this.state.status !== 'in_hand' || this.state.currentToAct !== toAct)
                    return;
                const a = this.suggestCpuAction();
                this.act(a);
            }, delay);
            // Watchdog
            this.timers.watchdog = setTimeout(() => {
                if (this.state.status !== 'in_hand' || this.state.currentToAct !== toAct)
                    return;
                const a = this.suggestCpuAction();
                this.act(a);
            }, delay + 1200);
        };
        const schedulePlayer = () => {
            if (!this.autoPlay)
                return;
            const bump = this.delayBumpOnceMs;
            this.delayBumpOnceMs = 0;
            const delay = CONFIG.pokerAutoplay.playerActionDelayMs + bump;
            this.timers.player = setTimeout(() => {
                if (this.state.status !== 'in_hand' || this.state.currentToAct !== 0)
                    return;
                const a = this.suggestCpuAction();
                this.act(a);
            }, delay);
        };
        if (toAct === 0)
            schedulePlayer();
        else
            scheduleCpu();
    }
    suggestCpuAction() {
        // Use existing poker strategy to produce realistic actions (including bet/raise sizing)
        // Fallback to availability if strategy cannot suggest
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
