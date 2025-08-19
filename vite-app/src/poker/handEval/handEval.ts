import type { Card } from "../../blackjack/types";
import {
  countByRank,
  groupCardsBySuit,
  checkStraightFlush,
  checkFourOfAKind,
  checkFullHouse,
  checkFlush,
  checkStraight,
  checkThreeOfAKind,
  checkTwoPair,
  checkOnePair,
  getHighCard
} from "./handClassification";

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

/**
 * Evaluate a 7-card hand and return the best 5-card combination
 */
export function evaluateSeven(cards: Card[]): EvaluatedHand {
  if (cards.length !== 7) {
    throw new Error("evaluateSeven expects exactly 7 cards");
  }

  // Count ranks and group by suit
  const rankGroups = Array.from(countByRank(cards).entries())
    .map(([v, n]) => ({ v, n }))
    .sort((a, b) => (b.n - a.n) || (b.v - a.v));
    
  const cardsBySuit = groupCardsBySuit(cards);

  // Check for straight flush first
  for (const [, suited] of cardsBySuit) {
    if (suited.length >= 5) {
      const straightFlush = checkStraightFlush(suited);
      if (straightFlush) return straightFlush;
    }
  }

  // Check for four of a kind
  const quads = checkFourOfAKind(rankGroups);
  if (quads) return quads;

  // Check for full house
  const fullHouse = checkFullHouse(rankGroups);
  if (fullHouse) return fullHouse;

  // Check for flush
  for (const [, suited] of cardsBySuit) {
    if (suited.length >= 5) {
      const flush = checkFlush(suited);
      if (flush) return flush;
    }
  }

  // Check for straight
  const straight = checkStraight(cards);
  if (straight) return straight;

  // Check for three of a kind
  const trips = checkThreeOfAKind(rankGroups);
  if (trips) return trips;

  // Check for two pair
  const twoPair = checkTwoPair(rankGroups);
  if (twoPair) return twoPair;

  // Check for one pair
  const pair = checkOnePair(rankGroups);
  if (pair) return pair;

  // High card
  return getHighCard(rankGroups);
}

/**
 * Evaluate a 5-card hand
 */
export function evaluateFive(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error("evaluateFive expects exactly 5 cards");
  }

  // For 5 cards, we can use the 7-card evaluator logic
  // by creating a temporary array with the 5 cards
  return evaluateSeven(cards);
}

/**
 * Compare two evaluated hands to determine winner
 * Returns positive if a wins, negative if b wins, 0 if tie
 */
export function compareEvaluated(a: EvaluatedHand, b: EvaluatedHand): number {
  // First compare hand class
  const classOrder: Record<HandClass, number> = {
    "high_card": 0,
    "pair": 1,
    "two_pair": 2,
    "three_kind": 3,
    "straight": 4,
    "flush": 5,
    "full_house": 6,
    "four_kind": 7,
    "straight_flush": 8,
  };

  const classDiff = classOrder[a.class] - classOrder[b.class];
  if (classDiff !== 0) return classDiff;

  // If same class, compare ranks
  for (let i = 0; i < Math.min(a.ranks.length, b.ranks.length); i++) {
    const rankDiff = a.ranks[i] - b.ranks[i];
    if (rankDiff !== 0) return rankDiff;
  }

  return 0; // Tie
}

/**
 * Format an evaluated hand for display
 */
export function formatEvaluated(hand: EvaluatedHand): string {
  const rankNames = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const classNames: Record<HandClass, string> = {
    "high_card": "High Card",
    "pair": "Pair",
    "two_pair": "Two Pair",
    "three_kind": "Three of a Kind",
    "straight": "Straight",
    "flush": "Flush",
    "full_house": "Full House",
    "four_kind": "Four of a Kind",
    "straight_flush": "Straight Flush",
  };

  const topRank = rankNames[hand.ranks[0]];
  return `${classNames[hand.class]}${hand.class === "high_card" ? "" : ` of ${topRank}s`}`;
}
