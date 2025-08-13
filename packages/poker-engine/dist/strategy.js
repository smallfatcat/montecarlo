import { getAvailableActions } from "./flow.js";
import { evaluateSeven, evaluateFive, compareEvaluated } from "./handEval.js";
const RANK_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_TO_VAL = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i]));
function rankVal(r) { return RANK_TO_VAL[r]; }
function isSuited(a, b) { return a.suit === b.suit; }
function countByRank(cards) { const m = new Map(); for (const c of cards)
    m.set(c.rank, (m.get(c.rank) ?? 0) + 1); return m; }
function countBySuit(cards) { const m = new Map(); for (const c of cards)
    m.set(c.suit, (m.get(c.suit) ?? 0) + 1); return m; }
function boardTopRank(community) { if (community.length === 0)
    return null; return community.map((c) => c.rank).sort((a, b) => rankVal(b) - rankVal(a))[0] ?? null; }
function hasFlushDraw(hole, community) { const m = countBySuit([...hole, ...community]); for (const [, n] of m)
    if (n >= 4)
        return true; return false; }
function hasOpenEndedStraightDraw(hole, community) {
    const vals = Array.from(new Set([...hole, ...community].map((c) => rankVal(c.rank)))).sort((a, b) => a - b);
    for (let i = 0; i + 3 < vals.length; i += 1) {
        const a = vals[i], b = vals[i + 1], c = vals[i + 2], d = vals[i + 3];
        if (b === a + 1 && c === b + 1 && d === c + 1)
            return true;
    }
    if (vals.includes(rankVal("A")) && vals.includes(rankVal("2")) && vals.includes(rankVal("3")) && vals.includes(rankVal("4")))
        return true;
    return false;
}
function analyzeMadeHand(hole, community) {
    const ranks = countByRank([...hole, ...community]);
    const top = boardTopRank(community);
    let pair = false, twoPair = false, trips = false, quads = false, fullHouse = false;
    let pairsCount = 0;
    let tripsCount = 0;
    for (const [, n] of ranks) {
        if (n === 4)
            quads = true;
        if (n === 3)
            tripsCount += 1;
        if (n === 2)
            pairsCount += 1;
    }
    if (pairsCount >= 1)
        pair = true;
    if (pairsCount >= 2)
        twoPair = true;
    if (tripsCount >= 1)
        trips = true;
    if (tripsCount >= 1 && (pairsCount >= 1 || tripsCount >= 2))
        fullHouse = true;
    let topPair = false;
    let overPair = false;
    if (pair) {
        if (community.length >= 3) {
            if (top && (hole.find((c) => c.rank === top) != null))
                topPair = true;
            if (hole.length === 2 && hole[0].rank === hole[1].rank) {
                const pocketVal = rankVal(hole[0].rank);
                const maxBoardVal = Math.max(...community.map((c) => rankVal(c.rank)));
                if (pocketVal > maxBoardVal)
                    overPair = true;
            }
        }
        else {
            if (hole.length === 2 && hole[0].rank === hole[1].rank)
                overPair = true;
        }
    }
    let straightFlush = false;
    let straight = false;
    let flush = false;
    const total = hole.length + community.length;
    if (total >= 5) {
        const cards = [...hole, ...community];
        if (total === 7) {
            const ev = evaluateSeven(cards);
            const cls = ev.class;
            straightFlush = cls === "straight_flush";
            straight = straightFlush || cls === "straight";
            flush = straightFlush || cls === "flush";
        }
        else if (total === 6) {
            let best = evaluateFive(cards.filter((_, i) => i !== 0));
            for (let drop = 1; drop < 6; drop += 1) {
                const ev = evaluateFive(cards.filter((_, i) => i !== drop));
                if (compareEvaluated(ev, best) > 0)
                    best = ev;
            }
            const cls = best.class;
            straightFlush = cls === "straight_flush";
            straight = straightFlush || cls === "straight";
            flush = straightFlush || cls === "flush";
        }
        else if (total === 5) {
            const ev = evaluateFive(cards);
            const cls = ev.class;
            straightFlush = cls === "straight_flush";
            straight = straightFlush || cls === "straight";
            flush = straightFlush || cls === "flush";
        }
    }
    return { pair, topPair, overPair, twoPair, trips, quads, fullHouse, flush, straight, straightFlush };
}
function preflopCategory(hole) {
    const [a, b] = hole;
    const va = rankVal(a.rank);
    const vb = rankVal(b.rank);
    const high = Math.max(va, vb);
    const low = Math.min(va, vb);
    const pair = a.rank === b.rank;
    const suited = isSuited(a, b);
    const gap = Math.abs(va - vb);
    if (pair && va >= rankVal("J"))
        return "premium";
    if (suited && ((a.rank === "A" && b.rank === "K") || (b.rank === "A" && a.rank === "K")))
        return "premium";
    if (pair && va >= rankVal("9"))
        return "strong";
    if (high >= rankVal("A") && low >= rankVal("Q") && suited)
        return "strong";
    if (high >= rankVal("A") && low >= rankVal("K"))
        return "strong";
    if (pair)
        return "speculative";
    if (suited && gap <= 2 && high >= rankVal("7") && low >= rankVal("4"))
        return "speculative";
    return "trash";
}
function actingPosition(state, seatIndex) {
    const n = state.seats.length;
    const sb = (state.buttonIndex + 1) % n;
    const bb = (state.buttonIndex + 2) % n;
    if (seatIndex === sb || seatIndex === bb)
        return "blinds";
    const utg = (bb + 1) % n;
    let dist = seatIndex - utg;
    if (dist < 0)
        dist += n;
    if (dist <= 1)
        return "early";
    if (dist <= n - 3)
        return "middle";
    return "late";
}
export function suggestActionPoker(state, profile = "tight") {
    const available = new Set(getAvailableActions(state));
    const seatIndex = state.currentToAct ?? 0;
    const seat = state.seats[seatIndex];
    const hole = seat.hole;
    const board = state.community;
    const toCall = Math.max(0, state.betToCall - seat.committedThisStreet);
    const pos = actingPosition(state, seatIndex);
    const lastRaise = state.lastRaiseAmount || state.rules.bigBlind;
    const bb = Math.max(1, state.rules.bigBlind);
    const otherStacks = state.seats.map((s, i) => (i === seatIndex || s.hasFolded ? 0 : s.stack)).filter((x) => x > 0);
    const effectiveStack = Math.min(seat.stack, otherStacks.length ? Math.max(...otherStacks) : seat.stack);
    const effBB = effectiveStack / bb;
    const potAfterCall = state.pot.main + toCall;
    const spr = potAfterCall > 0 ? effectiveStack / potAfterCall : Infinity;
    if (state.street === "preflop") {
        const cat = preflopCategory(hole);
        const aggressive = profile === "loose" || cat === "premium" || (cat === "strong" && (pos === "late" || pos === "middle"));
        if (toCall > 0) {
            if (effBB <= 20 && available.has("raise") && (aggressive || (cat === "speculative" && pos === "late"))) {
                const shoveExtra = Math.max(0, seat.stack - toCall);
                return { type: "raise", amount: shoveExtra };
            }
            if (aggressive && available.has("raise")) {
                const minExtra = Math.max(bb, lastRaise);
                const escalated = Math.max(Math.floor(minExtra * 1.5), bb);
                const open3x = Math.max(bb * 3, bb);
                const target = state.betToCall <= bb ? open3x : escalated;
                const raiseExtra = Math.max(Math.min(target - toCall, seat.stack - toCall), bb);
                const commitFrac = (toCall + raiseExtra) / Math.max(1, seat.stack);
                if (commitFrac > 0.5 && cat === "speculative")
                    return available.has("call") ? { type: "call" } : { type: "fold" };
                return { type: "raise", amount: raiseExtra };
            }
            if (cat !== "trash" && available.has("call"))
                return { type: "call" };
            return available.has("fold") ? { type: "fold" } : (available.has("check") ? { type: "check" } : { type: "call" });
        }
        else {
            if (aggressive && available.has("bet")) {
                if (effBB <= 12 && (cat === "premium" || cat === "strong")) {
                    return { type: "bet", amount: seat.stack };
                }
                const open = Math.max(bb * 3, bb);
                return { type: "bet", amount: Math.min(open, seat.stack) };
            }
            if (available.has("check"))
                return { type: "check" };
            return available.has("call") ? { type: "call" } : { type: "fold" };
        }
    }
    const made = analyzeMadeHand(hole, board);
    const flushDraw = hasFlushDraw(hole, board);
    const straightDraw = hasOpenEndedStraightDraw(hole, board);
    const strongMade = made.straightFlush || made.quads || made.fullHouse || made.flush || made.straight || made.trips || made.twoPair || made.overPair;
    const mediumMade = made.topPair || made.pair;
    const hasDraw = flushDraw || straightDraw;
    const pot = state.pot.main;
    if (toCall > 0) {
        if (strongMade && available.has("raise")) {
            if (effBB <= 20 || spr <= 2) {
                const shoveExtra = Math.max(0, seat.stack - toCall);
                return { type: "raise", amount: shoveExtra };
            }
            const minExtra = Math.max(bb, lastRaise);
            const escalated = Math.max(Math.floor(minExtra * 1.5), bb);
            const potLike = Math.max(Math.floor((pot + toCall) * (profile === "tight" ? 0.7 : 0.9)), escalated);
            const extra = Math.min(potLike, Math.max(0, seat.stack - toCall));
            return { type: "raise", amount: extra };
        }
        if ((strongMade || mediumMade || hasDraw) && available.has("call"))
            return { type: "call" };
        if ((made.straightFlush || made.quads || made.fullHouse || made.flush || made.straight) && available.has("call"))
            return { type: "call" };
        return available.has("fold") ? { type: "fold" } : (available.has("call") ? { type: "call" } : { type: "check" });
    }
    else {
        if (strongMade && available.has("bet")) {
            if (effBB <= 20 || spr <= 2) {
                return { type: "bet", amount: seat.stack };
            }
            const amt = Math.max(Math.floor(pot * 0.66), bb);
            return { type: "bet", amount: Math.min(amt, seat.stack) };
        }
        if ((mediumMade || hasDraw) && available.has("bet")) {
            const rand = globalThis.__POKER_RNG__ ? globalThis.__POKER_RNG__() : Math.random();
            if (rand < 0.4) {
                const amt = Math.max(Math.floor(pot * 0.5), bb);
                return { type: "bet", amount: Math.min(amt, seat.stack) };
            }
        }
        if (available.has("check"))
            return { type: "check" };
        return available.has("call") ? { type: "call" } : { type: "fold" };
    }
}
