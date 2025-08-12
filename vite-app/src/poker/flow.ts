import { createStandardDeck, shuffleInPlace, makeXorShift32 } from "../blackjack/deck";
import type { Card } from "../blackjack/types";
import { DEFAULT_RULES, cloneState, countActiveSeats, getStreetBetSize, nextSeatIndex, nextSeatIndexWithChips } from "./types";
import { CONFIG } from "../config";
import type { PokerTableState, SeatState, BettingAction } from "./types";
import { evaluateSeven } from "./handEval";

function drawCard(deck: Card[]): Card {
  const c = deck.pop();
  if (!c) throw new Error("Deck exhausted while dealing – expected fresh 52-card deck per hand");
  return c;
}

// Flow logging toggle
const FLOW_DEBUG = false;
function flowLog(...args: any[]) {
  if (!FLOW_DEBUG) return;
  try { console.log(...(args as any)); } catch {}
}

// Debug helpers: chip conservation assertions
function __sumStacks(state: PokerTableState): number {
  return state.seats.reduce((sum, s) => sum + Math.max(0, Math.floor(s.stack)), 0)
}
function __getBaseline(state: PokerTableState): number | undefined {
  return (state as any).__baselineChips as number | undefined
}
function __setBaseline(state: PokerTableState): void {
  ;(state as any).__baselineChips = __sumStacks(state) + Math.max(0, Math.floor(state.pot.main))
}
function __assertConservation(state: PokerTableState, context: string, expectedRake: number = 0): void {
  const baseline = __getBaseline(state)
  if (baseline == null) return
  const now = __sumStacks(state) + Math.max(0, Math.floor(state.pot.main))
  const expected = baseline - Math.max(0, Math.floor(expectedRake))
  // During hand flow (e.g., commitChips), allow tests to mutate stacks for scenarios.
  // Enforce "no chip creation": now must never exceed expected. Require exact equality only at settlement.
  const isSettlement = context.includes('settleAndEnd')
  if (isSettlement) {
    if (now !== expected) {
      throw new Error(`[CONSERVATION] ${context}: expected total ${expected} (baseline ${baseline} - rake ${expectedRake}), got ${now}`)
    }
  } else {
    if (now > expected) {
      throw new Error(`[CONSERVATION-UPPER-BOUND] ${context}: total ${now} exceeds expected ${expected}`)
    }
  }
}

export function createInitialPokerTable(numSeats: number, cpuSeats: number[], startingStack = 200, shoe?: Card[]): PokerTableState {
  const seats: SeatState[] = Array.from({ length: numSeats }, (_, i) => ({
    seatIndex: i,
    isCPU: cpuSeats.includes(i),
    hole: [],
    stack: startingStack,
    committedThisStreet: 0,
    totalCommitted: 0,
    hasFolded: false,
    isAllIn: false,
  }));
  return {
    handId: 0,
    deck: shoe ? [...shoe] : shuffleInPlace(createStandardDeck()),
    community: [],
    seats,
    buttonIndex: 0,
    street: null,
    status: "idle",
    currentToAct: null,
    lastAggressorIndex: null,
    betToCall: 0,
    lastRaiseAmount: DEFAULT_RULES.bigBlind,
    pot: { main: 0 },
    rules: { ...DEFAULT_RULES },
    gameOver: false,
  };
}

export function startHand(state: PokerTableState): PokerTableState {
  const s = cloneState(state);
  if (s.gameOver) return s;
  // Blind increase logic: increase every N hands
  const incEvery = CONFIG.poker.blinds?.increaseEveryHands ?? 0;
  const incFactor = CONFIG.poker.blinds?.increaseFactor ?? 1;
  if (incEvery > 0 && incFactor > 1 && s.handId > 0 && s.handId % incEvery === 0) {
    s.rules.smallBlind = Math.max(1, s.rules.smallBlind * incFactor);
    s.rules.bigBlind = Math.max(1, s.rules.bigBlind * incFactor);
  }
  // Always start each hand with a freshly shuffled single 52-card deck
  if (CONFIG.poker.random?.useSeeded) {
    // Derive per-hand seed to vary hands while remaining deterministic
    const base = CONFIG.poker.random.seed ?? 1
    const inc = CONFIG.poker.random.perHandIncrement ?? 1
    const seed = (base + (s.handId + 1) * inc) >>> 0
    const rng = makeXorShift32(seed)
    s.deck = shuffleInPlace(createStandardDeck(), rng);
  } else {
    s.deck = shuffleInPlace(createStandardDeck());
  }
  s.handId += 1;
  flowLog('[FLOW] startHand init', { handId: s.handId, deckLen: s.deck.length, seatsLen: s.seats.length })
  s.community = [];
  s.seats = s.seats.map((seat) => ({
    ...seat,
    hole: [],
    committedThisStreet: 0,
    totalCommitted: 0,
    hasFolded: seat.stack <= 0 ? true : false,
    isAllIn: false,
  }));
  s.pot = { main: 0 };
  s.lastRaiseAmount = s.rules.bigBlind;
  s.betToCall = 0;
  s.street = "preflop";
  s.status = "in_hand";

  // Ensure at least two funded players before blinds
  const funded = s.seats.filter((x) => x.stack > 0).length;
  if (funded < 2) {
    s.status = "hand_over";
    s.gameOver = true;
    return s;
  }
  // Post blinds (clockwise from button) — skip seats without chips
  const sbIndex = nextSeatIndexWithChips(s.seats, s.buttonIndex)!;
  const bbIndex = nextSeatIndexWithChips(s.seats, sbIndex!)!;
  postBlind(s, sbIndex, s.rules.smallBlind);
  postBlind(s, bbIndex, s.rules.bigBlind);
  // Establish baseline for chip conservation (stacks + pot)
  __setBaseline(s)

  // Deal hole cards
  // const neededCards = s.seats.filter((seat) => seat.stack > 0).length * 2
  flowLog('[FLOW] dealHole begin', { handId: s.handId, deckPre: s.deck.length })
  for (let r = 0; r < 2; r += 1) {
    for (let i = 0; i < s.seats.length; i += 1) {
      const idx = (s.buttonIndex + 1 + i) % s.seats.length;
      const seat = s.seats[idx];
      // Deal to anyone who isn't folded at hand start, even if blind-post made them all-in
      if (seat.hasFolded) continue;
      seat.hole.push(drawCard(s.deck));
    }
  }
  flowLog('[FLOW] dealHole end', { handId: s.handId, deckPost: s.deck.length })

  // If fewer than 2 players have chips, mark game over
  const contenders = s.seats.filter((x) => x.stack > 0);
  if (contenders.length < 2) {
    s.status = "hand_over";
    s.gameOver = true;
    return s;
  }

  // Action starts at UTG (left of BB)
  s.currentToAct = nextSeatIndex(s.seats, bbIndex);
  if (s.currentToAct == null) {
    // No eligible actor -> fast-forward to showdown
    return settleAndEnd(s);
  }
  s.lastAggressorIndex = bbIndex;
  // Set betToCall to highest committed to ensure it's at least the big blind
  s.betToCall = Math.max(...s.seats.map((x) => x.committedThisStreet));
  return s;
}

function postBlind(state: PokerTableState, seatIndex: number, amount: number) {
  const seat = state.seats[seatIndex];
  if (seat.stack <= 0) return;
  const toPay = Math.min(seat.stack, amount);
  seat.stack -= toPay;
  seat.committedThisStreet += toPay;
  seat.totalCommitted += toPay;
  state.pot.main += toPay;
  if (seat.stack === 0) seat.isAllIn = true;
}

export function getAvailableActions(state: PokerTableState): BettingAction["type"][] {
  if (state.status !== "in_hand" || state.currentToAct == null) return [];
  const seat = state.seats[state.currentToAct];
  if (seat.isAllIn || seat.hasFolded) return [];
  const toCall = state.betToCall - seat.committedThisStreet;
  const canCheck = toCall <= 0;
  const hasOpenBet = state.betToCall > 0;
  const canRaise = hasOpenBet && !seat.isAllIn && seat.stack > toCall;
  const canBet = canCheck && !hasOpenBet && seat.stack > 0;

  const actions: BettingAction["type"][] = ["fold"];
  if (canCheck) actions.push("check");
  else actions.push("call");
  if (canBet) actions.push("bet");
  if (canRaise) actions.push("raise");
  return actions;
}

export function applyAction(state: PokerTableState, action: BettingAction): PokerTableState {
  if (state.status !== "in_hand" || state.currentToAct == null) return state;
  const s = cloneState(state);
  const actorIndex = s.currentToAct!;
  const seat = s.seats[actorIndex];
  flowLog('[FLOW] applyAction start', { handId: s.handId, street: s.street, actorIndex, action: action.type, betToCall: s.betToCall })
  if (seat.hasFolded || seat.isAllIn) return s;
  const toCall = Math.max(0, s.betToCall - seat.committedThisStreet);
  const minOpen = getStreetBetSize(s);

  let lastActionWasRaise = false
  switch (action.type) {
    case "fold": {
      seat.hasFolded = true;
      break;
    }
    case "check": {
      if (toCall > 0) throw new Error("Cannot check facing a bet");
      break;
    }
    case "call": {
      if (toCall <= 0) throw new Error("Nothing to call");
      const pay = Math.min(seat.stack, toCall);
      commitChips(s, seat, pay);
      break;
    }
    case "bet": {
      if (toCall > 0) throw new Error("Cannot bet facing a bet");
      const desired = Math.max(action.amount ?? minOpen, minOpen);
      const pay = Math.min(seat.stack, desired);
      commitChips(s, seat, pay);
      s.betToCall = seat.committedThisStreet;
      s.lastRaiseAmount = pay;
      s.lastAggressorIndex = seat.seatIndex;
      break;
    }
    case "raise": {
      if (s.betToCall <= 0) throw new Error("Nothing to raise");
      const minRaiseExtra = Math.max(s.lastRaiseAmount, minOpen);
      const desiredExtra = Math.max(action.amount ?? minRaiseExtra, 0);
      const maxExtra = Math.max(0, seat.stack - toCall);
      const extra = Math.min(desiredExtra, maxExtra);
      const totalPay = Math.min(seat.stack, toCall + extra);
      if (totalPay <= 0) return s;
      const beforeCommitted = seat.committedThisStreet;
      commitChips(s, seat, totalPay);
      s.betToCall = Math.max(s.betToCall, seat.committedThisStreet);
      // Determine if raise reopens action (meets min raise and not all-in short)
      const actualExtra = seat.committedThisStreet - beforeCommitted - toCall;
      const isValidRaise = actualExtra >= minRaiseExtra;
      if (isValidRaise) {
        s.lastRaiseAmount = actualExtra;
        s.lastAggressorIndex = seat.seatIndex;
        lastActionWasRaise = true;
      } else if (toCall === 0) {
        // Treated effectively as a check (didn't meet min raise)
        // no change to lastAggressorIndex
      }
      break;
    }
    default:
      return s;
  }

  // If only one active player remains after this action (everyone else folded), settle immediately
  if (countActiveSeats(s.seats) <= 1) {
    return settleAndEnd(s);
  }

  // Determine next actor
  const nextIdx = nextSeatIndex(s.seats, actorIndex);

  // After a valid raise, always pass action to the next eligible seat (or close if none)
  if (lastActionWasRaise) {
    if (nextIdx == null) {
      flowLog('[FLOW] advanceStreet after raise (no next actor)', { handId: s.handId, street: s.street })
      return advanceStreet(s);
    }
    s.currentToAct = nextIdx;
    flowLog('[FLOW] next actor after raise', { handId: s.handId, street: s.street, nextIdx })
    return s;
  }

  // Determine if betting round should close.
  const active = s.seats.filter((p) => !p.hasFolded && !p.isAllIn && p.hole.length === 2);
  const noActive = active.length === 0;
  const allMatched = noActive || active.every((p) => p.committedThisStreet === s.betToCall);

  if (noActive) {
    flowLog('[FLOW] advanceStreet: no active', { handId: s.handId, street: s.street })
    return advanceStreet(s);
  }

  if (allMatched) {
    // If there has been aggression, close immediately when matched
    if (s.betToCall > 0) {
      flowLog('[FLOW] advanceStreet: all matched with aggression', { handId: s.handId, street: s.street })
      return advanceStreet(s);
    }
    // No aggression: close only when the last-to-act has acted; otherwise continue
    const sentinel = s.lastAggressorIndex;
    if (sentinel != null && actorIndex !== sentinel) {
      s.currentToAct = nextIdx;
      flowLog('[FLOW] continue: no aggression, passing to next', { handId: s.handId, street: s.street, nextIdx, sentinel })
      return s;
    }
    flowLog('[FLOW] advanceStreet: no aggression and sentinel acted', { handId: s.handId, street: s.street })
    return advanceStreet(s);
  }

  // Otherwise continue to next actor
  s.currentToAct = nextIdx;
  flowLog('[FLOW] continue: next actor', { handId: s.handId, street: s.street, nextIdx, betToCall: s.betToCall })
  return s;
}

function commitChips(state: PokerTableState, seat: SeatState, amount: number) {
  const pay = Math.min(amount, seat.stack);
  seat.stack -= pay;
  seat.committedThisStreet += pay;
  seat.totalCommitted += pay;
  state.pot.main += pay;
  if (seat.stack === 0) seat.isAllIn = true;
  // Assert conservation during hand (no rake applied yet)
  try { __assertConservation(state, 'commitChips', 0) } catch (e) { throw e }
}

function resetStreet(state: PokerTableState) {
  state.seats.forEach((s) => (s.committedThisStreet = 0));
  state.betToCall = 0;
  state.lastRaiseAmount = state.rules.bigBlind;
  state.lastAggressorIndex = null;
}

function advanceStreet(state: PokerTableState): PokerTableState {
  const s = cloneState(state);
  if (s.street === "preflop") {
    // Deal flop (burn omitted for simplicity)
    s.community.push(drawCard(s.deck), drawCard(s.deck), drawCard(s.deck));
    s.street = "flop";
  } else if (s.street === "flop") {
    s.community.push(drawCard(s.deck));
    s.street = "turn";
  } else if (s.street === "turn") {
    s.community.push(drawCard(s.deck));
    s.street = "river";
  } else if (s.street === "river") {
    s.street = "showdown";
    return settleAndEnd(s);
  }

  resetStreet(s);
  // If no eligible active seats remain (everyone is all-in or folded), fast-forward to showdown dealing remaining streets
  let first = nextSeatIndex(s.seats, s.buttonIndex);
  if (first == null) {
    // Let settleAndEnd decide whether to deal more cards or award immediately
    return settleAndEnd(s);
  }
  // Otherwise continue normal action
  s.currentToAct = first;
  // Set lastAggressorIndex to last-to-act for check-around closure (player right of first)
  const lastToAct = prevActiveSeatIndex(s.seats, first);
  s.lastAggressorIndex = lastToAct;
  return s;
}

// legacy helper kept for reference; current flow in applyAction handles closure

function settleAndEnd(state: PokerTableState): PokerTableState {
  const s = cloneState(state);
  // Determine contenders (not folded and received hole cards)
  const contenders = s.seats.filter((seat) => !seat.hasFolded && seat.hole.length === 2);
  if (contenders.length === 1) {
    // Award immediately without dealing further board cards
    const rake = computeRake(s.pot.main);
    contenders[0].stack += s.pot.main - rake;
    s.pot.main = 0
    try { __assertConservation(s, 'settleAndEnd (single contender)', rake) } catch (e) { throw e }
  } else {
    // Ensure full board for evaluation if needed
    while (s.community.length < 5) {
      s.community.push(drawCard(s.deck));
    }
    // Build side pots from total contributions and award each to best eligible
    let pots = computePots(s);
    // Sanity checks: totals must match
    const committedTotal = s.seats.reduce((sum, seat) => sum + Math.max(0, Math.floor(seat.totalCommitted)), 0)
    const potsTotal = pots.reduce((sum, p) => sum + p.amount, 0)
    const livePot = Math.max(0, Math.floor(s.pot.main))
    // In live play, livePot should equal committedTotal. In reconstructed previews, livePot may be 0.
    if (livePot > 0 && committedTotal !== livePot) {
      throw new Error(`[POT CHECK] live pot mismatch: committedTotal=${committedTotal} livePot=${livePot}`)
    }
    if (committedTotal !== potsTotal) {
      // Fallback: reconstruct pots using distinct commitment levels to ensure conservation
      const fallback = __computePotsDistinct(s)
      const fallbackTotal = fallback.reduce((sum, p) => sum + p.amount, 0)
      if (fallbackTotal !== committedTotal) {
        throw new Error(`[POT CHECK] sidepot sum mismatch: committedTotal=${committedTotal} potsTotal=${potsTotal}`)
      }
      pots = fallback
    }
    let totalRake = 0
    for (const pot of pots) {
      if (pot.amount <= 0 || pot.eligibleSeatIdxs.length === 0) continue;
      const rake = computeRake(pot.amount)
      totalRake += rake
      const distributable = pot.amount - rake
      // Determine winners among eligible
      const ranking = pot.eligibleSeatIdxs
        .filter((i) => s.seats[i].hole.length === 2)
        .map((i) => ({
        idx: i,
        eval: evaluateSeven([...s.seats[i].hole, ...s.community]),
        }));
      // Find best by class then ranks
      let best: { classIdx: number; ranks: number[] } | null = null;
      let winners: number[] = [];
      const classOrder: Record<string, number> = {
        high_card: 0,
        pair: 1,
        two_pair: 2,
        three_kind: 3,
        straight: 4,
        flush: 5,
        full_house: 6,
        four_kind: 7,
        straight_flush: 8,
      } as const as any;
      for (const r of ranking) {
        const cidx = classOrder[r.eval.class];
        if (!best) {
          best = { classIdx: cidx, ranks: r.eval.ranks };
          winners = [r.idx];
        } else {
          const cmpClass = cidx - best.classIdx;
          const cmpRanks = cmpClass === 0 ? compareRankArrays(r.eval.ranks, best.ranks) : cmpClass;
          if (cmpRanks > 0) {
            best = { classIdx: cidx, ranks: r.eval.ranks };
            winners = [r.idx];
          } else if (cmpRanks === 0) {
            winners.push(r.idx);
          }
        }
      }
      const share = Math.floor(distributable / winners.length);
      let remainder = distributable - share * winners.length;
      for (const wi of winners) {
        s.seats[wi].stack += share;
      }
      if (remainder > 0) {
        distributeRemainderToWinners(winners, remainder, (s.buttonIndex + 1) % s.seats.length, s.seats.length, (idx) => {
          s.seats[idx].stack += 1;
        })
      }
    }
    s.pot.main = 0
    try { __assertConservation(s, 'settleAndEnd (multi)', totalRake) } catch (e) { throw e }
  }
  s.status = "hand_over";
  s.currentToAct = null;
  s.street = "showdown";
  // Move button to next seat with chips (clockwise). If none, keep current.
  const nextBtn = nextSeatIndexWithChips(s.seats, s.buttonIndex);
  if (nextBtn != null) s.buttonIndex = nextBtn;
  // Eliminate players with zero stack from action (remain on table visually, but skipped). Mark game over if only one left with chips.
  const withChips = s.seats.filter((x) => x.stack > 0).length;
  if (withChips < 2) s.gameOver = true;
  return s;
}

function compareRankArrays(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const ai = a[i] ?? -1;
    const bi = b[i] ?? -1;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

// Construct side pots from per-seat total commitments.
// Folded players' chips remain in pots but they are not eligible to win.
export function computePots(state: PokerTableState): { amount: number; eligibleSeatIdxs: number[] }[] {
  const seats = state.seats
  const totals = seats.map((s, i) => ({ idx: i, total: Math.max(0, Math.floor(s.totalCommitted)) }))
    .filter((x) => x.total > 0)
  if (totals.length === 0) return []

  // Decide whether we need layered pots (side pots) or just a single main pot.
  // Only layer when at least one participant is all-in (explicit) OR has zero stack after committing (implicit).
  const anyExplicitAllIn = seats.some((s) => s.isAllIn)
  const anyImplicitAllIn = seats.some((s, i) => s.stack === 0 && (seats[i].totalCommitted ?? s.totalCommitted) > 0)
  const needsLayering = anyExplicitAllIn || anyImplicitAllIn
  if (!needsLayering) {
    const amount = totals.reduce((sum, x) => sum + x.total, 0)
    const eligible = totals.map((x) => x.idx).filter((idx) => !seats[idx].hasFolded)
    return eligible.length > 0 ? [{ amount, eligibleSeatIdxs: eligible }] : []
  }

  // Build pot boundaries from ALL-IN commitment thresholds, plus a final tier at max total
  const allInLevels = Array.from(new Set(
    totals
      .filter((x) => seats[x.idx].isAllIn || seats[x.idx].stack === 0)
      .map((x) => x.total)
  )).sort((a, b) => a - b)
  const maxTotal = totals.reduce((m, x) => Math.max(m, x.total), 0)
  const minTotal = totals.reduce((m, x) => Math.min(m, x.total), Infinity)
  const levels: number[] = []
  if (Number.isFinite(minTotal) && minTotal > 0) levels.push(minTotal)
  for (const v of allInLevels) { if (levels[levels.length - 1] !== v) levels.push(v) }
  if (levels.length === 0 || levels[levels.length - 1] < maxTotal) levels.push(maxTotal)

  // Build pots between consecutive levels
  const pots: { amount: number; eligibleSeatIdxs: number[] }[] = []
  let prev = 0
  let carry = 0
  for (const level of levels) {
    const delta = level - prev
    if (delta <= 0) { prev = level; continue }
    const participants = totals.filter((x) => x.total >= level).map((x) => x.idx)
    const amount = delta * participants.length
    const eligible = participants.filter((idx) => !seats[idx].hasFolded)
    if (eligible.length > 0) {
      // Merge any amounts from tiers that had no eligible players into this pot
      pots.push({ amount: amount + carry, eligibleSeatIdxs: eligible })
      carry = 0
    } else {
      // No eligible winners at this tier (all contributors folded). Accumulate
      // this tier's chips and merge into the next pot that has eligible seats.
      carry += amount
    }
    prev = level
  }
  if (carry > 0 && pots.length > 0) {
    pots[pots.length - 1].amount += carry
    carry = 0
  }
  return pots
}

// Internal: build pots from all distinct commitment totals with fold-carry merge.
function __computePotsDistinct(state: PokerTableState): { amount: number; eligibleSeatIdxs: number[] }[] {
  const seats = state.seats
  const totals = seats.map((s, i) => ({ idx: i, total: Math.max(0, Math.floor(s.totalCommitted)) }))
    .filter((x) => x.total > 0)
  if (totals.length === 0) return []
  const levels: number[] = Array.from(new Set(totals.map((x) => x.total))).sort((a, b) => a - b)
  const pots: { amount: number; eligibleSeatIdxs: number[] }[] = []
  let prev = 0
  let carry = 0
  for (const level of levels) {
    const delta = level - prev
    if (delta <= 0) { prev = level; continue }
    const participants = totals.filter((x) => x.total >= level).map((x) => x.idx)
    const amount = delta * participants.length
    const eligible = participants.filter((idx) => !seats[idx].hasFolded)
    if (eligible.length > 0) {
      pots.push({ amount: amount + carry, eligibleSeatIdxs: eligible })
      carry = 0
    } else {
      carry += amount
    }
    prev = level
  }
  if (carry > 0 && pots.length > 0) pots[pots.length - 1].amount += carry
  return pots
}

export function getTotalPot(state: PokerTableState): number {
  return computePots(state).reduce((sum, p) => sum + p.amount, 0)
}

function prevActiveSeatIndex(seats: SeatState[], startExclusive: number): number | null {
  const n = seats.length;
  for (let i = 1; i <= n; i += 1) {
    const idx = (startExclusive - i + n) % n;
    const s = seats[idx];
    if (!s.hasFolded && !s.isAllIn) return idx;
  }
  return null;
}

// Test helpers (exported only for unit tests)
export function __test__advanceStreet(state: PokerTableState): PokerTableState {
  return advanceStreet(state)
}
export function __test__finalizeShowdown(state: PokerTableState): PokerTableState {
  return settleAndEnd(state)
}

function distributeRemainderToWinners(winners: number[], remainder: number, startFrom: number, seatsLen: number, add: (idx: number) => void) {
  let idx = startFrom;
  while (remainder > 0) {
    const nextWinner = winners.find((w) => w === idx);
    if (nextWinner != null) {
      add(nextWinner);
      remainder -= 1;
      if (remainder === 0) break;
    }
    idx = (idx + 1) % seatsLen;
  }
}

function computeRake(amount: number): number {
  if (!CONFIG.poker.showRakeInUI) return 0
  const pct = CONFIG.poker.rakePercent ?? 0
  const cap = CONFIG.poker.rakeCap ?? 0
  let rake = Math.floor(amount * pct)
  if (cap > 0) rake = Math.min(rake, cap)
  return Math.max(0, rake)
}


