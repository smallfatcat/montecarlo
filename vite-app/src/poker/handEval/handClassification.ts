import type { Card } from "../../blackjack/types";
import type { EvaluatedHand } from "../handEval";
import { cardVal, byDesc, uniqueSorted, getWheelStraightValues, isSequential } from "./rankUtils";

/**
 * Count cards by rank
 */
export function countByRank(cards: Card[]): Map<number, number> {
  const countByRank = new Map<number, number>();
  
  for (const c of cards) {
    const v = cardVal(c);
    countByRank.set(v, (countByRank.get(v) ?? 0) + 1);
  }
  
  return countByRank;
}

/**
 * Group cards by suit
 */
export function groupCardsBySuit(cards: Card[]): Map<string, Card[]> {
  const cardsBySuit = new Map<string, Card[]>();
  
  for (const c of cards) {
    const s = c.suit;
    const arr = cardsBySuit.get(s) ?? [];
    arr.push(c);
    cardsBySuit.set(s, arr);
  }
  
  return cardsBySuit;
}

/**
 * Check for straight flush
 */
export function checkStraightFlush(suitedCards: Card[]): EvaluatedHand | null {
  if (suitedCards.length < 5) return null;
  
  const vals = suitedCards.map(cardVal).sort(byDesc);
  const uniq = uniqueSorted(vals);
  
  // Handle wheel straight (A-5)
  const withWheel = getWheelStraightValues(uniq);
  
  for (let i = 0; i + 4 < withWheel.length; i += 1) {
    const window = withWheel.slice(i, i + 5);
    if (isSequential(window)) {
      const top = window[0] === -1 ? 3 /* 5-high straight */ : window[0];
      return { 
        class: "straight_flush", 
        ranks: [top, ...window.slice(1)] 
      };
    }
  }
  
  return null;
}

/**
 * Check for four of a kind
 */
export function checkFourOfAKind(rankGroups: Array<{ v: number; n: number }>): EvaluatedHand | null {
  const quads = rankGroups.find((g) => g.n === 4);
  if (!quads) return null;
  
  const kickers = rankGroups
    .filter((g) => g.v !== quads.v)
    .map((g) => g.v)
    .sort(byDesc);
    
  return { 
    class: "four_kind", 
    ranks: [quads.v, kickers[0]] 
  };
}

/**
 * Check for full house
 */
export function checkFullHouse(rankGroups: Array<{ v: number; n: number }>): EvaluatedHand | null {
  const trips = rankGroups.filter((g) => g.n === 3);
  const pairs = rankGroups.filter((g) => g.n === 2);
  
  if (trips.length < 1) return null;
  if (trips.length < 2 && pairs.length < 1) return null;
  
  const topTrips = trips[0];
  const topPair = trips.length >= 2 ? { v: trips[1].v } : { v: pairs[0].v };
  
  return { 
    class: "full_house", 
    ranks: [topTrips.v, topPair.v] 
  };
}

/**
 * Check for flush
 */
export function checkFlush(suitedCards: Card[]): EvaluatedHand | null {
  if (suitedCards.length < 5) return null;
  
  const top5 = suitedCards
    .map(cardVal)
    .sort(byDesc)
    .slice(0, 5);
    
  return { 
    class: "flush", 
    ranks: top5 
  };
}

/**
 * Check for straight
 */
export function checkStraight(allCards: Card[]): EvaluatedHand | null {
  const vals = allCards.map(cardVal);
  const uniq = uniqueSorted(vals);
  
  // Handle wheel straight (A-5)
  const withWheel = getWheelStraightValues(uniq);
  
  for (let i = 0; i + 4 < withWheel.length; i += 1) {
    const window = withWheel.slice(i, i + 5);
    if (isSequential(window)) {
      const top = window[0] === -1 ? 3 /* 5-high straight */ : window[0];
      return { 
        class: "straight", 
        ranks: [top, ...window.slice(1)] 
      };
    }
  }
  
  return null;
}

/**
 * Check for three of a kind
 */
export function checkThreeOfAKind(rankGroups: Array<{ v: number; n: number }>): EvaluatedHand | null {
  const trips = rankGroups.find((g) => g.n === 3);
  if (!trips) return null;
  
  const kickers = rankGroups
    .filter((g) => g.v !== trips.v)
    .map((g) => g.v)
    .sort(byDesc)
    .slice(0, 2);
    
  return { 
    class: "three_kind", 
    ranks: [trips.v, ...kickers] 
  };
}

/**
 * Check for two pair
 */
export function checkTwoPair(rankGroups: Array<{ v: number; n: number }>): EvaluatedHand | null {
  const pairs = rankGroups.filter((g) => g.n === 2);
  if (pairs.length < 2) return null;
  
  const topPairs = pairs.slice(0, 2).map(p => p.v).sort(byDesc);
  const kicker = rankGroups
    .filter((g) => g.n === 1)
    .map((g) => g.v)
    .sort(byDesc)[0];
    
  return { 
    class: "two_pair", 
    ranks: [...topPairs, kicker] 
  };
}

/**
 * Check for one pair
 */
export function checkOnePair(rankGroups: Array<{ v: number; n: number }>): EvaluatedHand | null {
  const pair = rankGroups.find((g) => g.n === 2);
  if (!pair) return null;
  
  const kickers = rankGroups
    .filter((g) => g.v !== pair.v)
    .map((g) => g.v)
    .sort(byDesc)
    .slice(0, 3);
    
  return { 
    class: "pair", 
    ranks: [pair.v, ...kickers] 
  };
}

/**
 * Get high card hand
 */
export function getHighCard(rankGroups: Array<{ v: number; n: number }>): EvaluatedHand {
  const highCards = rankGroups
    .filter((g) => g.n === 1)
    .map((g) => g.v)
    .sort(byDesc)
    .slice(0, 5);
    
  return { 
    class: "high_card", 
    ranks: highCards 
  };
}
