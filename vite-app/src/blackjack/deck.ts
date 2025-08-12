import type { Card, Rank, Suit } from "./types";

const SUITS: Suit[] = ["Clubs", "Diamonds", "Hearts", "Spades"];
const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function createShoe(numberOfDecks: number): Card[] {
  if (!Number.isInteger(numberOfDecks) || numberOfDecks <= 0) {
    throw new Error("numberOfDecks must be a positive integer");
  }
  const shoe: Card[] = [];
  for (let i = 0; i < numberOfDecks; i += 1) {
    shoe.push(...createStandardDeck());
  }
  return shoe;
}

export function shuffleInPlace(deck: Card[], rng: () => number = Math.random): Card[] {
  // Fisher-Yates shuffle with robust index clamping in case rng() returns 1.0 due to rounding
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const r = rng()
    const clamped = r >= 1 ? (1 - Number.EPSILON) : (r < 0 ? 0 : r)
    const j = Math.floor(clamped * (i + 1))
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  return deck;
}

// Deterministic PRNG (xorshift32)
export function makeXorShift32(seed: number): () => number {
  let x = seed >>> 0
  return () => {
    x ^= x << 13; x >>>= 0
    x ^= x >> 17; x >>>= 0
    x ^= x << 5;  x >>>= 0
    return (x >>> 0) / 4294967296
  }
}

export function drawCard(deck: Card[]): Card {
  const card = deck.pop();
  if (!card) {
    throw new Error("Cannot draw from an empty deck");
  }
  return card;
}

export function top(deck: Card[]): Card | undefined {
  return deck[deck.length - 1];
}


