import type { BettingAction } from "./types";
import type { PokerTableState } from "./types";
import { getAvailableActions } from "./flow";
import type { Card, Rank } from "../blackjack/types";

export type BotProfile = "tight" | "loose";

const RANK_ORDER: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_TO_VAL = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i])) as Record<Rank, number>;

function rankVal(r: Rank): number { return RANK_TO_VAL[r]; }

function isSuited(a: Card, b: Card): boolean { return a.suit === b.suit; }

function countByRank(cards: Card[]): Map<Rank, number> {
  const m = new Map<Rank, number>();
  for (const c of cards) m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
  return m;
}

function countBySuit(cards: Card[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of cards) m.set(c.suit, (m.get(c.suit) ?? 0) + 1);
  return m;
}

function boardTopRank(community: Card[]): Rank | null {
  if (community.length === 0) return null;
  return community.map((c) => c.rank).sort((a, b) => rankVal(b) - rankVal(a))[0] ?? null;
}

function hasFlushDraw(hole: Card[], community: Card[]): boolean {
  const m = countBySuit([...hole, ...community]);
  for (const [, n] of m) if (n >= 4) return true;
  return false;
}

function hasOpenEndedStraightDraw(hole: Card[], community: Card[]): boolean {
  const vals = Array.from(new Set([...hole, ...community].map((c) => rankVal(c.rank)))).sort((a, b) => a - b);
  // Check for any 4-sequence window allowing open-ended draw
  for (let i = 0; i + 3 < vals.length; i += 1) {
    const a = vals[i], b = vals[i + 1], c = vals[i + 2], d = vals[i + 3];
    if (b === a + 1 && c === b + 1 && d === c + 1) return true;
  }
  // Wheel draw A-2-3-4
  if (vals.includes(rankVal("A")) && vals.includes(rankVal("2")) && vals.includes(rankVal("3")) && vals.includes(rankVal("4"))) return true;
  return false;
}

function analyzeMadeHand(hole: Card[], community: Card[]): { pair: boolean; topPair: boolean; overPair: boolean; twoPair: boolean; trips: boolean } {
  const ranks = countByRank([...hole, ...community]);
  const top = boardTopRank(community);
  let pair = false, twoPair = false, trips = false;
  let pairsCount = 0;
  for (const [, n] of ranks) {
    if (n === 3) trips = true;
    if (n === 2) pairsCount += 1;
  }
  if (pairsCount >= 1) pair = true;
  if (pairsCount >= 2) twoPair = true;

  // Determine if the pair is top pair or overpair
  let topPair = false;
  let overPair = false;
  if (pair) {
    if (community.length >= 3) {
      // topPair: one of hole cards pairs the highest board rank
      if (top && (hole.find((c) => c.rank === top) != null)) topPair = true;
      // overPair: pocket pair higher than any board card
      if (hole.length === 2 && hole[0].rank === hole[1].rank) {
        const pocketVal = rankVal(hole[0].rank);
        const maxBoardVal = Math.max(...community.map((c) => rankVal(c.rank)));
        if (pocketVal > maxBoardVal) overPair = true;
      }
    } else {
      // preflop pair -> treat as overpair placeholder
      if (hole.length === 2 && hole[0].rank === hole[1].rank) overPair = true;
    }
  }
  return { pair, topPair, overPair, twoPair, trips };
}

function preflopCategory(hole: Card[]): "premium" | "strong" | "speculative" | "trash" {
  const [a, b] = hole;
  const va = rankVal(a.rank);
  const vb = rankVal(b.rank);
  const high = Math.max(va, vb);
  const low = Math.min(va, vb);
  const pair = a.rank === b.rank;
  const suited = isSuited(a, b);
  const gap = Math.abs(va - vb);
  // Premium
  if (pair && va >= rankVal("J")) return "premium"; // JJ+
  if (suited && ((a.rank === "A" && b.rank === "K") || (b.rank === "A" && a.rank === "K"))) return "premium"; // AKs
  // Strong
  if (pair && va >= rankVal("9")) return "strong"; // 99, TT
  if (high >= rankVal("A") && low >= rankVal("Q") && suited) return "strong"; // AQ+, suited
  if (high >= rankVal("A") && low >= rankVal("K")) return "strong"; // AKo
  // Speculative: small pairs, suited connectors/gappers
  if (pair) return "speculative";
  if (suited && gap <= 2 && high >= rankVal("7") && low >= rankVal("4")) return "speculative";
  return "trash";
}

function actingPosition(state: PokerTableState, seatIndex: number): "early" | "middle" | "late" | "blinds" {
  const n = state.seats.length;
  const sb = (state.buttonIndex + 1) % n;
  const bb = (state.buttonIndex + 2) % n;
  if (seatIndex === sb || seatIndex === bb) return "blinds";
  // distance clockwise from UTG (left of BB)
  const utg = (bb + 1) % n;
  let dist = seatIndex - utg; if (dist < 0) dist += n;
  if (dist <= 1) return "early";
  if (dist <= n - 3) return "middle"; // rough bucket
  return "late";
}

export function suggestActionPoker(state: PokerTableState, profile: BotProfile = "tight"): BettingAction {
  const available = new Set(getAvailableActions(state));
  const seatIndex = state.currentToAct ?? 0;
  const seat = state.seats[seatIndex];
  const hole = seat.hole;
  const board = state.community;
  const toCall = Math.max(0, state.betToCall - seat.committedThisStreet);
  const pos = actingPosition(state, seatIndex);

  // Preflop
  if (state.street === "preflop") {
    const cat = preflopCategory(hole);
    const aggressive = profile === "loose" || cat === "premium" || (cat === "strong" && (pos === "late" || pos === "middle"));
    if (toCall > 0) {
      if (aggressive && available.has("raise")) {
        const open3x = Math.max(state.rules.bigBlind * 3, state.rules.bigBlind);
        const callers = 0; // simple; could count prior callers
        const raiseExtra = Math.max(open3x - state.betToCall + toCall + callers * state.rules.bigBlind, state.rules.bigBlind);
        return { type: "raise", amount: raiseExtra };
      }
      if (cat !== "trash" && available.has("call")) return { type: "call" };
      return available.has("fold") ? { type: "fold" } : (available.has("check") ? { type: "check" } : { type: "call" });
    } else {
      if (aggressive && available.has("bet")) {
        const open = Math.max(state.rules.bigBlind * 3, state.rules.bigBlind);
        return { type: "bet", amount: open };
      }
      if (available.has("check")) return { type: "check" };
      return available.has("call") ? { type: "call" } : { type: "fold" };
    }
  }

  // Postflop: simple made-hand and draw heuristics
  const made = analyzeMadeHand(hole, board);
  const flushDraw = hasFlushDraw(hole, board);
  const straightDraw = hasOpenEndedStraightDraw(hole, board);
  const strongMade = made.trips || made.twoPair || made.overPair;
  const mediumMade = made.topPair || made.pair;
  const hasDraw = flushDraw || straightDraw;

  const pot = state.pot.main;
  if (toCall > 0) {
    if (strongMade && available.has("raise")) {
      // Pot-sized raise extra approximation
      const extra = Math.max(Math.floor((pot + toCall) * (profile === "tight" ? 0.8 : 1.0)), state.rules.bigBlind);
      return { type: "raise", amount: extra };
    }
    if ((strongMade || mediumMade || hasDraw) && available.has("call")) return { type: "call" };
    return available.has("fold") ? { type: "fold" } : (available.has("call") ? { type: "call" } : { type: "check" });
  } else {
    if (strongMade && available.has("bet")) {
      const amt = Math.max(Math.floor(pot * 0.66), state.rules.bigBlind);
      return { type: "bet", amount: amt };
    }
    if ((mediumMade || hasDraw) && available.has("bet") && Math.random() < 0.4) {
      const amt = Math.max(Math.floor(pot * 0.5), state.rules.bigBlind);
      return { type: "bet", amount: amt };
    }
    if (available.has("check")) return { type: "check" };
    return available.has("call") ? { type: "call" } : { type: "fold" };
  }
}


