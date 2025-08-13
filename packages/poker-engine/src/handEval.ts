import type { Card, Rank } from "./blackjack/types";

export type HandClass =
  | "high_card"
  | "pair"
  | "two_pair"
  | "three_kind"
  | "straight"
  | "flush"
  | "full_house"
  | "four_kind"
  | "straight_flush";

export interface EvaluatedHand {
  class: HandClass;
  ranks: number[];
}

const RANK_ORDER: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_TO_VAL = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i])) as Record<Rank, number>;

function byDesc(a: number, b: number) { return b - a }
function cardVal(c: Card): number { return RANK_TO_VAL[c.rank] }
function isSequential(sortedValsDesc: number[]): boolean {
  for (let i = 1; i < sortedValsDesc.length; i += 1) {
    if (sortedValsDesc[i - 1] - 1 !== sortedValsDesc[i]) return false;
  }
  return true;
}
function uniqueSorted(vals: number[]): number[] { return Array.from(new Set(vals)).sort(byDesc) }

export function evaluateSeven(cards: Card[]): EvaluatedHand {
  if (cards.length !== 7) throw new Error("evaluateSeven expects exactly 7 cards");
  const countByRank = new Map<number, number>();
  const cardsBySuit = new Map<string, Card[]>();
  for (const c of cards) {
    const v = cardVal(c);
    countByRank.set(v, (countByRank.get(v) ?? 0) + 1);
    const s = c.suit as unknown as string;
    const arr = cardsBySuit.get(s) ?? [];
    arr.push(c);
    cardsBySuit.set(s, arr);
  }
  for (const [, suited] of cardsBySuit) {
    if (suited.length >= 5) {
      const vals = suited.map(cardVal).sort(byDesc);
      const uniq = uniqueSorted(vals);
      const withWheel = uniq.includes(12) ? [...uniq, -1] : uniq;
      for (let i = 0; i + 4 < withWheel.length; i += 1) {
        const window = withWheel.slice(i, i + 5);
        if (isSequential(window)) {
          const top = window[0] === -1 ? 3 : window[0];
          return { class: "straight_flush", ranks: [top, ...window.slice(1)] };
        }
      }
    }
  }
  const groups = Array.from(countByRank.entries()).map(([v, n]) => ({ v, n })).sort((a, b) => (b.n - a.n) || (b.v - a.v));
  const quads = groups.find((g) => g.n === 4);
  if (quads) {
    const kickers = groups.filter((g) => g.v !== quads.v).map((g) => g.v).sort(byDesc);
    return { class: "four_kind", ranks: [quads.v, kickers[0]] };
  }
  const trips = groups.filter((g) => g.n === 3);
  const pairs = groups.filter((g) => g.n === 2);
  if (trips.length >= 2 || (trips.length >= 1 && pairs.length >= 1)) {
    const topTrips = trips[0];
    const topPair = trips.length >= 2 ? { v: trips[1].v } : { v: pairs[0].v };
    return { class: "full_house", ranks: [topTrips.v, topPair.v] };
  }
  for (const [, suited] of cardsBySuit) {
    if (suited.length >= 5) {
      const top5 = suited.map(cardVal).sort(byDesc).slice(0, 5);
      return { class: "flush", ranks: top5 };
    }
  }
  {
    const uniq = uniqueSorted(cards.map(cardVal));
    const withWheel = uniq.includes(12) ? [...uniq, -1] : uniq;
    for (let i = 0; i + 4 < withWheel.length; i += 1) {
      const window = withWheel.slice(i, i + 5);
      if (isSequential(window)) {
        const top = window[0] === -1 ? 3 : window[0];
        return { class: "straight", ranks: [top, ...window.slice(1)] };
      }
    }
  }
  if (trips.length >= 1) {
    const t = trips[0];
    const kickers = groups.filter((g) => g.n === 1).map((g) => g.v).sort(byDesc).slice(0, 2);
    return { class: "three_kind", ranks: [t.v, ...kickers] };
  }
  if (pairs.length >= 2) {
    const [p1, p2] = pairs.slice(0, 2).sort((a, b) => b.v - a.v);
    const kicker = groups.filter((g) => g.n === 1).map((g) => g.v).sort(byDesc)[0];
    return { class: "two_pair", ranks: [p1.v, p2.v, kicker] };
  }
  if (pairs.length === 1) {
    const p = pairs[0];
    const kickers = groups.filter((g) => g.n === 1).map((g) => g.v).sort(byDesc).slice(0, 3);
    return { class: "pair", ranks: [p.v, ...kickers] };
  }
  const highs = uniqueSorted(cards.map(cardVal)).slice(0, 5);
  return { class: "high_card", ranks: highs };
}

export function compareEvaluated(a: EvaluatedHand, b: EvaluatedHand): number {
  const order: HandClass[] = [
    "high_card",
    "pair",
    "two_pair",
    "three_kind",
    "straight",
    "flush",
    "full_house",
    "four_kind",
    "straight_flush",
  ];
  const ai = order.indexOf(a.class);
  const bi = order.indexOf(b.class);
  if (ai !== bi) return ai - bi;
  const len = Math.max(a.ranks.length, b.ranks.length);
  for (let i = 0; i < len; i += 1) {
    const av = a.ranks[i] ?? -1;
    const bv = b.ranks[i] ?? -1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

// Evaluate exactly 5 cards using same logic as evaluateSeven
export function evaluateFive(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) throw new Error("evaluateFive expects exactly 5 cards");
  const countByRank = new Map<number, number>();
  const cardsBySuit = new Map<string, Card[]>();
  for (const c of cards) {
    const v = cardVal(c);
    countByRank.set(v, (countByRank.get(v) ?? 0) + 1);
    const s = c.suit as unknown as string;
    const arr = cardsBySuit.get(s) ?? [];
    arr.push(c);
    cardsBySuit.set(s, arr);
  }
  for (const [, suited] of cardsBySuit) {
    if (suited.length >= 5) {
      const vals = suited.map(cardVal).sort(byDesc);
      const uniq = uniqueSorted(vals);
      const withWheel = uniq.includes(12) ? [...uniq, -1] : uniq;
      for (let i = 0; i + 4 < withWheel.length; i += 1) {
        const window = withWheel.slice(i, i + 5);
        if (isSequential(window)) {
          const top = window[0] === -1 ? 3 : window[0];
          return { class: "straight_flush", ranks: [top, ...window.slice(1)] };
        }
      }
      const top5 = suited.map(cardVal).sort(byDesc).slice(0, 5);
      if (top5.length === 5) return { class: "flush", ranks: top5 };
    }
  }
  const groups = Array.from(countByRank.entries()).map(([v, n]) => ({ v, n })).sort((a, b) => (b.n - a.n) || (b.v - a.v));
  const quads = groups.find((g) => g.n === 4);
  if (quads) {
    const kickers = groups.filter((g) => g.v !== quads.v).map((g) => g.v).sort(byDesc);
    return { class: "four_kind", ranks: [quads.v, kickers[0]] };
  }
  const trips = groups.filter((g) => g.n === 3);
  const pairs = groups.filter((g) => g.n === 2);
  if (trips.length >= 1 && (pairs.length >= 1 || trips.length >= 2)) {
    const topTrips = trips[0];
    const topPair = trips.length >= 2 ? { v: trips[1].v } : { v: pairs[0].v };
    return { class: "full_house", ranks: [topTrips.v, topPair.v] };
  }
  {
    const uniq = uniqueSorted(cards.map(cardVal));
    const withWheel = uniq.includes(12) ? [...uniq, -1] : uniq;
    for (let i = 0; i + 4 < withWheel.length; i += 1) {
      const window = withWheel.slice(i, i + 5);
      if (isSequential(window)) {
        const top = window[0] === -1 ? 3 : window[0];
        return { class: "straight", ranks: [top, ...window.slice(1)] };
      }
    }
  }
  if (trips.length >= 1) {
    const t = trips[0];
    const kickers = groups.filter((g) => g.n === 1).map((g) => g.v).sort(byDesc).slice(0, 2);
    return { class: "three_kind", ranks: [t.v, ...kickers] };
  }
  if (pairs.length >= 2) {
    const [p1, p2] = pairs.slice(0, 2).sort((a, b) => b.v - a.v);
    const kicker = groups.filter((g) => g.n === 1).map((g) => g.v).sort(byDesc)[0];
    return { class: "two_pair", ranks: [p1.v, p2.v, kicker] };
  }
  if (pairs.length === 1) {
    const p = pairs[0];
    const kickers = groups.filter((g) => g.n === 1).map((g) => g.v).sort(byDesc).slice(0, 3);
    return { class: "pair", ranks: [p.v, ...kickers] };
  }
  const highs = uniqueSorted(cards.map(cardVal)).slice(0, 5);
  return { class: "high_card", ranks: highs };
}



