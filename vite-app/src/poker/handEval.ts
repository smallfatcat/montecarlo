import type { Card, Rank } from "../blackjack/types";

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
  ranks: number[]; // descending strength tiebreakers (0..12 mapped A high)
}

// Map ranks to numbers for comparison. Aces can be high (12) or low (for A-2-3-4-5 straight)
const RANK_ORDER: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_TO_VAL = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i])) as Record<Rank, number>;

function byDesc(a: number, b: number) {
  return b - a;
}

function cardVal(c: Card): number {
  return RANK_TO_VAL[c.rank];
}

function isSequential(sortedValsDesc: number[]): boolean {
  for (let i = 1; i < sortedValsDesc.length; i += 1) {
    if (sortedValsDesc[i - 1] - 1 !== sortedValsDesc[i]) return false;
  }
  return true;
}

function uniqueSorted(vals: number[]): number[] {
  return Array.from(new Set(vals)).sort(byDesc);
}

export function evaluateSeven(cards: Card[]): EvaluatedHand {
  if (cards.length !== 7) throw new Error("evaluateSeven expects exactly 7 cards");

  // Count ranks and suits
  const countByRank = new Map<number, number>();
  const cardsBySuit = new Map<string, Card[]>();
  for (const c of cards) {
    const v = cardVal(c);
    countByRank.set(v, (countByRank.get(v) ?? 0) + 1);
    const s = c.suit;
    const arr = cardsBySuit.get(s) ?? [];
    arr.push(c);
    cardsBySuit.set(s, arr);
  }

  // Check for flush and straight flush
  for (const [, suited] of cardsBySuit) {
    if (suited.length >= 5) {
      const vals = suited.map(cardVal).sort(byDesc);
      const uniq = uniqueSorted(vals);
      // Handle wheel straight (A-5)
      const withWheel = uniq.includes(12) ? [...uniq, -1] : uniq; // represent Ace low as -1 below 2
      for (let i = 0; i + 4 < withWheel.length; i += 1) {
        const window = withWheel.slice(i, i + 5);
        if (isSequential(window)) {
          const top = window[0] === -1 ? 3 /* 5-high straight */ : window[0];
          return { class: "straight_flush", ranks: [top, ...window.slice(1)] };
        }
      }
    }
  }

  // Quads / Full house / Trips / Pairs
  const groups = Array.from(countByRank.entries())
    .map(([v, n]) => ({ v, n }))
    .sort((a, b) => (b.n - a.n) || (b.v - a.v));

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

  // Flush
  for (const [, suited] of cardsBySuit) {
    if (suited.length >= 5) {
      const top5 = suited.map(cardVal).sort(byDesc).slice(0, 5);
      return { class: "flush", ranks: top5 };
    }
  }

  // Straight
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

  // Trips
  if (trips.length >= 1) {
    const t = trips[0];
    const kickers = groups.filter((g) => g.n === 1).map((g) => g.v).sort(byDesc).slice(0, 2);
    return { class: "three_kind", ranks: [t.v, ...kickers] };
  }

  // Two pair / One pair
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

  // High card
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
  return 0; // tie
}

// Human-readable formatting for an evaluated 7-card hand
const RANK_NAMES = [
  'Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Jack','Queen','King','Ace'
];

function rankName(v: number): string {
  return RANK_NAMES[v] ?? String(v);
}

export function formatEvaluated(ev: EvaluatedHand): string {
  switch (ev.class) {
    case 'straight_flush':
      return `Straight flush to ${rankName(ev.ranks[0])}`;
    case 'four_kind':
      return `Four of a kind, ${rankName(ev.ranks[0])}s`;
    case 'full_house':
      return `Full house, ${rankName(ev.ranks[0])}s over ${rankName(ev.ranks[1])}s`;
    case 'flush':
      return `Flush, ${rankName(ev.ranks[0])}-high`;
    case 'straight':
      return `Straight to ${rankName(ev.ranks[0])}`;
    case 'three_kind':
      return `Three of a kind, ${rankName(ev.ranks[0])}s`;
    case 'two_pair': {
      const a = rankName(ev.ranks[0]);
      const b = rankName(ev.ranks[1]);
      return `Two pair, ${a}s and ${b}s`;
    }
    case 'pair':
      return `Pair of ${rankName(ev.ranks[0])}s`;
    case 'high_card':
    default:
      return `${rankName(ev.ranks[0])}-high`;
  }
}

// Evaluate exactly 5 cards using same logic as evaluateSeven
export function evaluateFive(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) throw new Error("evaluateFive expects exactly 5 cards");
  // Count ranks and suits
  const countByRank = new Map<number, number>();
  const cardsBySuit = new Map<string, Card[]>();
  for (const c of cards) {
    const v = cardVal(c);
    countByRank.set(v, (countByRank.get(v) ?? 0) + 1);
    const s = c.suit;
    const arr = cardsBySuit.get(s) ?? [];
    arr.push(c);
    cardsBySuit.set(s, arr);
  }

  // Straight flush / flush
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
      // No straight, plain flush
      const top5 = suited.map(cardVal).sort(byDesc).slice(0, 5);
      if (top5.length === 5) return { class: "flush", ranks: top5 };
    }
  }

  // Quads / boats / trips / pairs
  const groups = Array.from(countByRank.entries())
    .map(([v, n]) => ({ v, n }))
    .sort((a, b) => (b.n - a.n) || (b.v - a.v));
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

  // Straight
  const uniq = uniqueSorted(cards.map(cardVal));
  const withWheel = uniq.includes(12) ? [...uniq, -1] : uniq;
  for (let i = 0; i + 4 < withWheel.length; i += 1) {
    const window = withWheel.slice(i, i + 5);
    if (isSequential(window)) {
      const top = window[0] === -1 ? 3 : window[0];
      return { class: "straight", ranks: [top, ...window.slice(1)] };
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

// From 7 cards, pick the best 5 with indices
export function pickBestFive(allCards: Card[]): { eval: EvaluatedHand; indices: number[] } {
  if (allCards.length !== 7) throw new Error('pickBestFive expects 7 cards')
  let best: EvaluatedHand | null = null
  let bestIdx: number[] = []
  for (let a = 0; a <= 2; a += 1) {
    for (let b = a + 1; b <= 3; b += 1) {
      for (let c = b + 1; c <= 4; c += 1) {
        for (let d = c + 1; d <= 5; d += 1) {
          for (let e = d + 1; e <= 6; e += 1) {
            const idx = [a, b, c, d, e]
            const hand = idx.map((i) => allCards[i])
            const ev = evaluateFive(hand)
            if (!best || compareEvaluated(ev, best) > 0) {
              best = ev
              bestIdx = idx
            }
          }
        }
      }
    }
  }
  // non-null assertion as best set must be found
  return { eval: best!, indices: bestIdx }
}


