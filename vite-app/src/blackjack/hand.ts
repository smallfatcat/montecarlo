import type { Card } from "./types";
import { isTenValueCard } from "./types";

export interface HandValue {
  hardTotal: number; // all aces as 1
  softTotal: number | null; // a total where one ace is 11, if it doesn't bust
  bestTotal: number; // best playable total (<= 21) or hardTotal if bust
  isSoft: boolean; // whether bestTotal uses an ace as 11
  isBlackjack: boolean; // exactly two cards: ace + 10-value
  isBust: boolean;
}

export function evaluateHand(cards: Card[]): HandValue {
  let hardTotal = 0;
  let aceCount = 0;
  for (const card of cards) {
    if (card.rank === "A") {
      aceCount += 1;
      hardTotal += 1;
    } else if (card.rank === "J" || card.rank === "Q" || card.rank === "K" || card.rank === "10") {
      hardTotal += 10;
    } else {
      hardTotal += Number(card.rank);
    }
  }

  // Try to upgrade some aces from 1 to 11 by adding 10 per ace
  let best = hardTotal;
  let softUsed = 0;
  for (let i = 0; i < aceCount; i += 1) {
    if (best + 10 <= 21) {
      best += 10;
      softUsed += 1;
    }
  }

  const softTotal = softUsed > 0 ? best : null;
  const isSoft = softTotal !== null;
  const isBust = best > 21;
  const isBlackjack = cards.length === 2 && containsAce(cards) && containsTenValue(cards);

  return {
    hardTotal,
    softTotal,
    bestTotal: isBust ? hardTotal : best,
    isSoft: !isBust && isSoft,
    isBlackjack,
    isBust,
  };
}

function containsAce(cards: Card[]): boolean {
  return cards.some((c) => c.rank === "A");
}

function containsTenValue(cards: Card[]): boolean {
  return cards.some((c) => isTenValueCard(c));
}


