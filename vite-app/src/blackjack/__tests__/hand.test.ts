import { describe, it, expect } from "vitest";
import type { Card } from "../types";
import { evaluateHand } from "../hand";

const C = (rank: Card["rank"], suit: Card["suit"]): Card => ({ rank, suit });

describe("hand evaluation", () => {
  it("detects blackjack (A + 10-value)", () => {
    const hand = [C("A", "Spades"), C("K", "Hearts")];
    const v = evaluateHand(hand);
    expect(v.isBlackjack).toBe(true);
    expect(v.bestTotal).toBe(21);
    expect(v.isBust).toBe(false);
  });

  it("handles multiple aces correctly", () => {
    const hand = [C("A", "Spades"), C("9", "Clubs"), C("A", "Diamonds")];
    const v = evaluateHand(hand);
    expect(v.bestTotal).toBe(21);
    expect(v.isSoft).toBe(true);
    expect(v.isBlackjack).toBe(false);
    expect(v.isBust).toBe(false);
  });

  it("busts when exceeding 21", () => {
    const hand = [C("K", "Spades"), C("Q", "Clubs"), C("5", "Hearts")];
    const v = evaluateHand(hand);
    expect(v.isBust).toBe(true);
    expect(v.hardTotal).toBe(25);
  });
});


