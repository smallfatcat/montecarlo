import type { Card, Rank } from "../../blackjack/types";

// Map ranks to numbers for comparison. Aces can be high (12) or low (for A-2-3-4-5 straight)
export const RANK_ORDER: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const RANK_TO_VAL = Object.fromEntries(RANK_ORDER.map((r, i) => [r, i])) as Record<Rank, number>;

/**
 * Sort numbers in descending order
 */
export function byDesc(a: number, b: number): number {
  return b - a;
}

/**
 * Get numeric value of a card for comparison
 */
export function cardVal(c: Card): number {
  return RANK_TO_VAL[c.rank];
}

/**
 * Check if an array of numbers is sequential
 */
export function isSequential(sortedValsDesc: number[]): boolean {
  for (let i = 1; i < sortedValsDesc.length; i += 1) {
    if (sortedValsDesc[i - 1] - 1 !== sortedValsDesc[i]) return false;
  }
  return true;
}

/**
 * Get unique sorted values in descending order
 */
export function uniqueSorted(vals: number[]): number[] {
  return Array.from(new Set(vals)).sort(byDesc);
}

/**
 * Check if a straight includes a wheel (A-2-3-4-5)
 */
export function hasWheelStraight(vals: number[]): boolean {
  return vals.includes(12) && // Ace
         vals.includes(0) &&   // 2
         vals.includes(1) &&   // 3
         vals.includes(2) &&   // 4
         vals.includes(3);     // 5
}

/**
 * Get wheel straight values with Ace as low
 */
export function getWheelStraightValues(vals: number[]): number[] {
  if (!hasWheelStraight(vals)) return vals;
  
  // Represent Ace low as -1 below 2
  return [...vals, -1];
}
