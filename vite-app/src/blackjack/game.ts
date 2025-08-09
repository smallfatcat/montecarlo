import type { Card } from "./types";
import { createStandardDeck, drawCard, shuffleInPlace } from "./deck";
import { evaluateHand } from "./hand";

export type GameStatus = "idle" | "player_turn" | "dealer_turn" | "round_over";

export type RoundOutcome =
  | "player_blackjack"
  | "player_win"
  | "dealer_win"
  | "push"
  | "player_bust"
  | "dealer_bust"
  | "player_surrender";

export interface GameState {
  deck: Card[];
  playerHand: Card[]; // active hand (for non-split mode compatibility)
  dealerHand: Card[];
  status: GameStatus;
  outcome?: RoundOutcome;
  bankroll: number; // player's money balance
  currentBet: number; // active bet for the current round
  // Split support (optional)
  playerHands?: Card[][]; // all player hands if split
  activeHandIndex?: number; // which hand is currently acted upon
  currentBetsByHand?: number[]; // bet per hand after split
  handOutcomes?: RoundOutcome[]; // outcome per hand after dealer plays
  // Insurance support
  canOfferInsurance?: boolean;
  insuranceBet?: number;
}

export interface DealOptions {
  shuffleDeck?: boolean;
}

export interface DealerRules {
  standOnSoft17?: boolean; // default true
}

export function createInitialState(initialBankroll: number = 0): GameState {
  return {
    deck: [],
    playerHand: [],
    dealerHand: [],
    status: "idle",
    bankroll: initialBankroll,
    currentBet: 0,
  };
}

export function startNewRound(existingDeck?: Card[], dealOptions: DealOptions = {}): GameState {
  let deck = existingDeck ? [...existingDeck] : createStandardDeck();
  if (dealOptions.shuffleDeck !== false) {
    deck = shuffleInPlace(deck);
  }

  // Deal alternately: player1, dealer1, player2, dealer2
  const playerHand: Card[] = [drawCard(deck)];
  const dealerHand: Card[] = [drawCard(deck)];
  playerHand.push(drawCard(deck));
  dealerHand.push(drawCard(deck));

  const playerEval = evaluateHand(playerHand);
  const dealerEval = evaluateHand(dealerHand);

  // Offer insurance if dealer shows Ace
  const canOfferInsurance = dealerHand[0]?.rank === "A";

  if (playerEval.isBlackjack || dealerEval.isBlackjack) {
    // If dealer shows Ace and actually has blackjack, allow insurance decision before revealing
    if (dealerEval.isBlackjack && dealerHand[0]?.rank === "A") {
      return {
        deck,
        playerHand,
        dealerHand,
        status: "player_turn",
        bankroll: 0,
        currentBet: 0,
        canOfferInsurance: true,
      };
    }
    const outcome = resolveOutcome(playerHand, dealerHand);
    return {
      deck,
      playerHand,
      dealerHand,
      status: "round_over",
      outcome,
      bankroll: 0,
      currentBet: 0,
      canOfferInsurance,
    };
  }

  return {
    deck,
    playerHand,
    dealerHand,
    status: "player_turn",
    bankroll: 0,
    currentBet: 0,
    canOfferInsurance,
  };
}

export function playerHit(state: GameState): GameState {
  if (state.status !== "player_turn") return state;
  const deck = [...state.deck];
  const dealerHand = [...state.dealerHand];
  if (state.playerHands && state.activeHandIndex !== undefined) {
    const playerHands = state.playerHands.map((h) => [...h]);
    const idx = state.activeHandIndex;
    playerHands[idx].push(drawCard(deck));
    const evalPlayer = evaluateHand(playerHands[idx]);
    if (evalPlayer.isBust) {
      // Advance to next hand or to dealer
      const next = advanceToNextHandOrDealer({ ...state, deck, dealerHand, playerHands, playerHand: playerHands[idx] });
      return next;
    }
    return { ...state, deck, dealerHand, playerHands, playerHand: playerHands[idx] };
  } else {
    const playerHand = [...state.playerHand, drawCard(deck)];
    const evalPlayer = evaluateHand(playerHand);
    if (evalPlayer.isBust) {
      return { ...state, deck, playerHand, dealerHand, status: "round_over", outcome: "player_bust" };
    }
    return { ...state, deck, playerHand, dealerHand, status: "player_turn" };
  }
}

export function playerStand(state: GameState, rules: DealerRules = {}): GameState {
  if (state.status !== "player_turn") return state;
  if (state.playerHands && state.activeHandIndex !== undefined) {
    // Move to next hand if exists, otherwise dealer plays all at once
    return advanceToNextHandOrDealer(state, rules);
  }
  const afterDealer = dealerPlay({ ...state, status: "dealer_turn" }, rules);
  const outcome = resolveOutcome(afterDealer.playerHand, afterDealer.dealerHand);
  return { ...afterDealer, status: "round_over", outcome };
}

export function dealerPlay(state: GameState, rules: DealerRules = {}): GameState {
  if (state.status !== "dealer_turn") return state;
  const standOnSoft17 = rules.standOnSoft17 ?? true;
  const deck = [...state.deck];
  const dealerHand = [...state.dealerHand];
  // Dealer draws until 17 or higher. If standOnSoft17 is true, dealer stands on soft 17.
  // If false, dealer hits on soft 17.
  // Using evaluateHand.bestTotal for decision, with soft flag considered.
  // Keep drawing while condition to hit is true.
  while (true) {
    const evalDealer = evaluateHand(dealerHand);
    const total = evalDealer.bestTotal;
    const isSoft17 = total === 17 && evalDealer.isSoft;
    const shouldHit = total < 17 || (!standOnSoft17 && isSoft17);
    if (!shouldHit) break;
    dealerHand.push(drawCard(deck));
  }
  return { ...state, deck, dealerHand };
}

export function resolveOutcome(playerHand: Card[], dealerHand: Card[]): RoundOutcome {
  const p = evaluateHand(playerHand);
  const d = evaluateHand(dealerHand);

  if (p.isBlackjack && d.isBlackjack) return "push";
  if (p.isBlackjack) return "player_blackjack";
  if (d.isBlackjack) return "dealer_win";
  if (p.isBust) return "player_bust";
  if (d.isBust) return "dealer_bust";

  if (p.bestTotal > d.bestTotal) return "player_win";
  if (p.bestTotal < d.bestTotal) return "dealer_win";
  return "push";
}

export type PlayerAction = "hit" | "stand" | "double" | "surrender";

export function getAvailableActions(state: GameState): PlayerAction[] {
  if (state.status !== "player_turn") return [];
  const actions: PlayerAction[] = ["hit", "stand"];
  if (state.playerHand.length === 2) {
    actions.push("double", "surrender");
  }
  return actions;
}

// Betting helpers
export function startRoundWithBet(
  prevState: GameState,
  betAmount: number,
  existingDeck?: Card[],
  dealOptions: DealOptions = {}
): GameState {
  if (betAmount <= 0 || !Number.isFinite(betAmount)) {
    throw new Error("Bet amount must be a positive finite number");
  }
  const round = startNewRound(existingDeck, dealOptions);
  return {
    ...round,
    bankroll: prevState.bankroll,
    currentBet: betAmount,
  };
}

export function finalizeRound(state: GameState): GameState {
  if (state.status !== "round_over" || !state.outcome) return state;
  let bankroll = state.bankroll;

  const settle = (outcome: RoundOutcome, bet: number) => {
    switch (outcome) {
      case "player_blackjack":
        bankroll += bet * 1.5;
        return;
      case "player_win":
      case "dealer_bust":
        bankroll += bet;
        return;
      case "push":
        return;
      case "player_bust":
      case "dealer_win":
        bankroll -= bet;
        return;
      case "player_surrender":
        bankroll -= bet / 2;
        return;
    }
  };

  if (state.handOutcomes && state.currentBetsByHand) {
    state.handOutcomes.forEach((o, i) => settle(o, state.currentBetsByHand![i] ?? state.currentBet));
  } else {
    settle(state.outcome, state.currentBet);
  }

  // Insurance settlement
  if (state.insuranceBet && state.insuranceBet > 0) {
    const dealerHasBJ = evaluateHand(state.dealerHand).isBlackjack;
    if (dealerHasBJ) {
      bankroll += state.insuranceBet * 2;
    } else {
      bankroll -= state.insuranceBet;
    }
  }

  return { ...state, bankroll, currentBet: 0, insuranceBet: 0 };
}

export function playerDoubleDown(state: GameState, rules: DealerRules = {}): GameState {
  if (state.status !== "player_turn") return state;
  if (state.playerHands && state.activeHandIndex !== undefined) {
    const idx = state.activeHandIndex;
    const hand = state.playerHands[idx];
    if (hand.length !== 2) return state;
    const deck = [...state.deck];
    const playerHands = state.playerHands.map((h) => [...h]);
    playerHands[idx].push(drawCard(deck));
    const evalPlayer = evaluateHand(playerHands[idx]);
    const currentBetsByHand = state.currentBetsByHand?.slice() ?? [];
    currentBetsByHand[idx] = (currentBetsByHand[idx] ?? state.currentBet) * 2;
    const nextState: GameState = { ...state, deck, playerHands, playerHand: playerHands[idx], currentBetsByHand };
    if (evalPlayer.isBust) {
      return advanceToNextHandOrDealer({ ...nextState });
    }
    // Stand automatically after double-down
    return advanceToNextHandOrDealer({ ...nextState });
  } else {
    if (state.playerHand.length !== 2) return state;
    // Double the bet, draw one card, then stand
    const deck = [...state.deck];
    const playerHand = [...state.playerHand, drawCard(deck)];
    const dealerHand = [...state.dealerHand];
    const evalPlayer = evaluateHand(playerHand);
    const doubledBetState: GameState = { ...state, deck, playerHand, dealerHand, currentBet: state.currentBet * 2 };
    if (evalPlayer.isBust) {
      return { ...doubledBetState, status: "round_over", outcome: "player_bust" };
    }
    const afterDealer = dealerPlay({ ...doubledBetState, status: "dealer_turn" }, rules);
    const outcome = resolveOutcome(afterDealer.playerHand, afterDealer.dealerHand);
    return { ...afterDealer, status: "round_over", outcome };
  }
}

export function playerSurrender(state: GameState): GameState {
  if (state.status !== "player_turn") return state;
  if (state.playerHand.length !== 2) return state;
  return { ...state, status: "round_over", outcome: "player_surrender" };
}

// Split
export function canSplit(state: GameState): boolean {
  if (state.status !== "player_turn") return false;
  if (state.playerHands) return false; // single split only
  if (state.playerHand.length !== 2) return false;
  const [c1, c2] = state.playerHand;
  const sameRank = c1.rank === c2.rank;
  return sameRank;
}

export function playerSplit(state: GameState): GameState {
  if (!canSplit(state)) return state;
  const [c1, c2] = state.playerHand;
  const playerHands: Card[][] = [[c1], [c2]];
  const currentBetsByHand = [state.currentBet, state.currentBet];
  return {
    ...state,
    playerHands,
    activeHandIndex: 0,
    currentBetsByHand,
    playerHand: playerHands[0],
  };
}

// Note: splitting is restricted to true pairs (exact same rank)

function advanceToNextHandOrDealer(state: GameState, rules: DealerRules = {}): GameState {
  if (!state.playerHands || state.activeHandIndex === undefined) return state;
  let idx = state.activeHandIndex;
  const playerHands = state.playerHands;
  // If current hand finished (stand/bust implied by caller), move to next
  const nextIdx = idx + 1;
  if (nextIdx < playerHands.length) {
    return { ...state, activeHandIndex: nextIdx, playerHand: playerHands[nextIdx] };
  }
  // All hands decided; dealer plays once and resolve each hand
  const afterDealer = dealerPlay({ ...state, status: "dealer_turn" }, rules);
  const handOutcomes = playerHands.map((h) => resolveOutcome(h, afterDealer.dealerHand));
  return { ...afterDealer, status: "round_over", handOutcomes, outcome: handOutcomes[handOutcomes.length - 1] };
}

// Insurance
export function placeInsurance(state: GameState): GameState {
  if (state.status !== "player_turn" || !state.canOfferInsurance) return state;
  const maxIns = Math.max(0, state.currentBet / 2);
  const insuranceBet = Math.floor(maxIns);
  const next = { ...state, insuranceBet, canOfferInsurance: false };
  return maybeDealerPeek(next);
}

export function declineInsurance(state: GameState): GameState {
  if (state.status !== "player_turn" || !state.canOfferInsurance) return state;
  const next = { ...state, canOfferInsurance: false };
  return maybeDealerPeek(next);
}

export function maybeDealerPeek(state: GameState): GameState {
  if (state.status !== "player_turn") return state;
  const up = state.dealerHand[0];
  if (!up) return state;
  const shouldPeek = up.rank === "A" || up.rank === "10" || up.rank === "J" || up.rank === "Q" || up.rank === "K";
  if (!shouldPeek) return state;
  const dEval = evaluateHand(state.dealerHand);
  if (dEval.isBlackjack) {
    // Round ends immediately; outcomes per hand if split
    if (state.playerHands) {
      const handOutcomes = state.playerHands.map((h) => resolveOutcome(h, state.dealerHand));
      return { ...state, status: "round_over", handOutcomes, outcome: handOutcomes[handOutcomes.length - 1] };
    }
    const outcome = resolveOutcome(state.playerHand, state.dealerHand);
    return { ...state, status: "round_over", outcome };
  }
  return state;
}


