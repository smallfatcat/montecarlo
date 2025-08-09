export type Suit = "Clubs" | "Diamonds" | "Hearts" | "Spades";

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export function isTenValueCard(card: Card): boolean {
  return card.rank === "10" || card.rank === "J" || card.rank === "Q" || card.rank === "K";
}


