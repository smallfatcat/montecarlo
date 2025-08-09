import { describe, it, expect } from "vitest";
import { createStandardDeck, createShoe } from "../deck";

describe("deck", () => {
  it("creates a 52-card deck with unique cards", () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(52);
    const unique = new Set(deck.map((c) => `${c.rank}-${c.suit}`));
    expect(unique.size).toBe(52);
  });

  it("creates a shoe of N decks", () => {
    const shoe = createShoe(6);
    expect(shoe).toHaveLength(52 * 6);
  });
});


