import { evaluateSeven } from '../../poker/handEval';
import { createStandardDeck, makeXorShift32 } from '../../blackjack/deck';
import { CONFIG } from '../../config';
import type { Card } from '../../blackjack/types';

export type SeatIn = { hole: Card[]; folded: boolean };

export interface EquityResult {
  win: number[];
  tie: number[];
}

/**
 * Get active and unknown seat indices
 */
export function getSeatIndices(seats: SeatIn[]): {
  activeIdx: number[];
  unknownIdx: number[];
} {
  const activeIdx: number[] = [];
  const unknownIdx: number[] = [];
  
  seats.forEach((s, i) => { 
    if (!s.folded && s.hole.length === 2) activeIdx.push(i);
    if (!s.folded && s.hole.length !== 2) unknownIdx.push(i);
  });
  
  return { activeIdx, unknownIdx };
}

/**
 * Build remaining deck excluding known cards
 */
export function buildRemainingDeck(seats: SeatIn[], community: Card[]): Card[] {
  const full = createStandardDeck();
  const key = (c: Card) => `${c.rank}-${c.suit}`;
  const knownKey = new Set<string>();
  
  // Add community cards to known set
  community.forEach((c) => knownKey.add(key(c)));
  
  // Add known hole cards to known set
  seats.forEach((s) => { 
    if (s.hole.length === 2) s.hole.forEach((c) => knownKey.add(key(c))); 
  });
  
  return full.filter((c) => !knownKey.has(key(c)));
}

/**
 * Get RNG function based on configuration
 */
export function getRngFunction(): () => number {
  try {
    if ((CONFIG as any)?.poker?.random?.useSeeded) {
      const base = ((CONFIG.poker.random.seed ?? 1) ^ 0xA5A5A5A5) >>> 0;
      return makeXorShift32(base);
    }
  } catch {}
  
  return Math.random;
}

/**
 * Assign trial hole cards to unknown seats
 */
export function assignTrialHoles(
  pool: Card[],
  unknownIdx: number[]
): Record<number, [Card, Card]> {
  const trialHoles: Record<number, [Card, Card]> = {};
  
  for (const si of unknownIdx) {
    const a = pool.pop()!;
    const b = pool.pop()!;
    trialHoles[si] = [a, b];
  }
  
  return trialHoles;
}

/**
 * Evaluate a single trial and update win/tie counts
 */
export function evaluateTrial(
  seats: SeatIn[],
  community: Card[],
  trialHoles: Record<number, [Card, Card]>,
  activeIdx: number[],
  unknownIdx: number[],
  wins: number[],
  ties: number[]
): void {
  const board = community;
  let bestClass = -1;
  let bestRanks: number[] = [];
  let bestIdxs: number[] = [];
  
  const consider = (si: number, cards: Card[]) => {
    const ev = evaluateSeven([...cards, ...board]);
    const cls = classOrder(ev.class);
    
    if (bestIdxs.length === 0) { 
      bestClass = cls; 
      bestRanks = ev.ranks; 
      bestIdxs = [si]; 
    } else {
      const cmp = compareRanks(cls, ev.ranks, bestClass, bestRanks);
      if (cmp > 0) { 
        bestClass = cls; 
        bestRanks = ev.ranks; 
        bestIdxs = [si]; 
      } else if (cmp === 0) { 
        bestIdxs.push(si); 
      }
    }
  };
  
  // Evaluate known hole cards
  activeIdx.forEach((si) => consider(si, seats[si].hole));
  
  // Evaluate trial hole cards
  unknownIdx.forEach((si) => consider(si, trialHoles[si]));
  
  // Update win/tie counts
  if (bestIdxs.length === 1) {
    wins[bestIdxs[0]] += 1;
  } else {
    bestIdxs.forEach((i) => { ties[i] += 1; });
  }
}

/**
 * Get hand class order for comparison
 */
export function classOrder(c: string): number {
  switch (c) {
    case 'high_card': return 0;
    case 'pair': return 1;
    case 'two_pair': return 2;
    case 'three_kind': return 3;
    case 'straight': return 4;
    case 'flush': return 5;
    case 'full_house': return 6;
    case 'four_kind': return 7;
    case 'straight_flush': return 8;
    default: return 0;
  }
}

/**
 * Compare hand ranks for tie-breaking
 */
export function compareRanks(
  aClass: number, 
  aRanks: number[], 
  bClass: number, 
  bRanks: number[]
): number {
  if (aClass !== bClass) return aClass - bClass;
  
  const len = Math.max(aRanks.length, bRanks.length);
  for (let i = 0; i < len; i += 1) {
    const a = aRanks[i] ?? -1;
    const b = bRanks[i] ?? -1;
    if (a !== b) return a - b;
  }
  
  return 0;
}

/**
 * Shuffle array in place using provided RNG
 */
export function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}
