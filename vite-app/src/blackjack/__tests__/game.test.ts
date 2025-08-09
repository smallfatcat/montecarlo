import { describe, it, expect } from "vitest";
import type { Card } from "../types";
import { startNewRound, playerHit, playerStand, resolveOutcome, getAvailableActions } from "../game";

const C = (rank: Card["rank"], suit: Card["suit"]): Card => ({ rank, suit });

// Helper to construct a deck where drawCard() pops from the end.
const makeDeck = (cardsFromTopToBottom: Card[]): Card[] => {
  // Our drawCard() pops from the end, so the last element is the top.
  return [...cardsFromTopToBottom];
};

describe("game flow", () => {
  it("player can hit and then bust", () => {
    // Create a deck that deals predictable cards:
    // Order (top -> bottom): Next draws pop from end
    const deck = makeDeck([
      // Bottom of deck .......... Top of deck
      C("5", "Clubs"), // will be drawn last if needed
      C("9", "Diamonds"),
      C("7", "Spades"),
      C("6", "Hearts"), // Dealer 2
      C("8", "Clubs"),  // Player 2
      C("Q", "Hearts"),  // Dealer 1
      C("K", "Spades"),  // Player 1
    ]);

    let state = startNewRound(deck, { shuffleDeck: false });
    expect(state.playerHand).toHaveLength(2);
    expect(state.dealerHand).toHaveLength(2);

    // Player hits: will draw 7 of Spades, making 10 + 8 + 7 = 25 (bust)
    state = playerHit(state);
    expect(state.status).toBe("round_over");
    expect(state.outcome).toBe("player_bust");
  });

  it("dealer draws to 17 and stands (soft 17 stands)", () => {
    const deck = makeDeck([
      // Bottom ................................................. Top
      C("9", "Clubs"),
      C("2", "Diamonds"), // dealer will draw to reach 17
      C("6", "Clubs"), // player hit if needed (not used)
      C("6", "Spades"), // dealer 2 -> dealer has A + 6 (soft 17)
      C("9", "Hearts"), // player 2 -> player 18
      C("A", "Hearts"), // dealer 1 -> A
      C("9", "Spades"), // player 1 -> 9
    ]);

    let state = startNewRound(deck, { shuffleDeck: false });
    // Player stands at 18
    state = playerStand(state, { standOnSoft17: true });
    // Dealer has A + 6 = soft 17 and should stand when standOnSoft17 is true
    expect(state.status).toBe("round_over");
    // Player 18 vs Dealer 17 -> player wins
    expect(state.outcome).toBe("player_win");
  });

  it("blackjack comparison resolves correctly", () => {
    const playerBJ = [C("A", "Spades"), C("K", "Clubs")];
    const dealer21NotBJ = [C("10", "Hearts"), C("9", "Spades"), C("2", "Clubs")];
    expect(resolveOutcome(playerBJ, dealer21NotBJ)).toBe("player_blackjack");
  });

  it("available actions include double and surrender only on first two cards", () => {
    // Construct a deck so that a hit does NOT bust
    // Top -> bottom (pop from end): P1=5H, D1=K♦, P2=6♣, D2=2♥, Hit=9♠ (player goes from 11 -> 20)
    const deck = makeDeck([
      C("9", "Spades"), // hit
      C("2", "Hearts"), // dealer 2
      C("6", "Clubs"),  // player 2
      C("K", "Diamonds"), // dealer 1
      C("5", "Hearts"), // player 1
    ]);
    let state = startNewRound(deck, { shuffleDeck: false });
    expect(getAvailableActions(state).sort()).toEqual(["double", "hit", "stand", "surrender"].sort());
    state = playerHit(state);
    expect(getAvailableActions(state).sort()).toEqual(["hit", "stand"].sort());
  });
});


