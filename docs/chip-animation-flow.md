### Chip Animation Flow (Current Implementation)

#### Overview

This document captures how poker chip animations currently work in the frontend. It describes triggers, anchors, motion, timing, and performance considerations for the three directions of chip movement rendered in the UI.

#### Components involved

- `PokerTableBettingSpots.tsx`: Stack → Bet entry flight; Bet → Pot exit flight
- `PokerTableHorseshoeView.tsx` (PotPayoutOverlay): Pot → Stacks payout flight
- `PokerTableStacks.tsx`: Visual stack updates (scale pop)
- `PokerTablePot.tsx`: Visual pot updates (scale/rotate pop)
- `PokerRuntime.ts`: Adds timing bumps so actions don’t overlap animations

---

### 1) Stack → Bet (entry flight)

- Trigger
  - Seat `committedThisStreet > 0` for a given seat.

- Anchors
  - Source (stack): `layoutOverrides.stacks[seatIndex]` (fallback to deterministic XY).
  - Target (bet): `layoutOverrides.bets[seatIndex]` (fallback to stack/pot-derived XY).

- Motion/Visual
  - Framer Motion `motion.div` rendered at the bet spot container.
  - Initial `{ x: betX - stackX, y: betY - stackY, opacity: 0, scale: 0.8 }`.
  - Animate to `{ x: 0, y: 0, opacity: 1, scale: 1 }`.
  - Ease: easeOut.
  - Duration: `CONFIG.poker.animations.chipFlyDurationMs / 1000`.
  - Inside: `ChipStack` scaled in with a short 0.3s pop; subtle shadow (no glow).

---

### 2) Bet → Pot (exit flight)

- Trigger
  - Street advances such that `committedThisStreet` collapses into the pot (e.g., after all calls/raises are resolved on a street).

- Anchors
  - Source (bet): bet spot center.
  - Target (pot): `layoutOverrides.pot` center (fallback numeric anchors).

- Motion/Visual
  - The same `motion.div` at the bet spot animates on exit.
  - Exit `{ x: potX - betX, y: potY - betY, opacity: 0, scale: 0.8 }`.
  - Ease/Duration: same as entry flight.
  - Value label fades out.

---

### 3) Pot → Stacks (payout flight)

- Trigger
  - Transition to `hand_over` where `pot.main` goes to 0 and one or more stacks increase.

- Anchors
  - Source (pot): `layoutOverrides.pot` center.
  - Targets (stacks): `layoutOverrides.stacks[seatIndex]` centers for seats whose `stack` increased.

- Motion/Visual
  - `PotPayoutOverlay` creates per-seat `motion.div` flights.
  - Initial `{ x: stackX - potX, y: stackY - potY, opacity: 0, scale: 0.8 }` → animate to `{ x: 0, y: 0, opacity: 1, scale: 1 }`.
  - Ease/Duration: same as entry/exit flights.
  - Renders a small `ChipStack` plus a “+amount” label; overlay auto-clears after the animation duration.

---

### 4) Timing coordination (runtime)

- `PokerRuntime.delayBumpOnceMs` adds a one-shot delay (=`chipFlyDurationMs`) to CPU/player/autodeal timers to avoid stepping on active chip flights.
- Applied when:
  - Blinds are posted
  - Chips move stack→bet or when a street closes and chips move bet→pot
  - Autodeal between hands (pot payout → next hand)

---


---

### 6) Current limitations and gaps (for future rewrite)

- Anchors rely on numeric layout overrides; when pot/spot widths/heights are missing or percentage-based, centers can be approximate. Using DOM measurements (`getBoundingClientRect`) per frame could increase fidelity.
- Flights are straight-line (linear x/y). No bezier arcs or scatter effects for large amounts.
- Payout animation uses one compact `ChipStack` per winner; amount doesn’t yet control number of “in-flight” chips.
- No reduced-motion toggle exposed to users (we can add a configuration flag to disable/scale animations).
- No central animation manager—bet/pot/stack flights are orchestrated locally and could be unified.

---

### 7) Summary of configuration hooks

- Duration: `CONFIG.poker.animations.chipFlyDurationMs`
- Chip visuals: `ChipStack` parameters (`size`, `overlap`, `maxChipsPerRow`) used for flight and static stacks.

---

### 8) Proposed next steps (high-level)

- Standardize anchors via DOM measurement to ensure consistent paths across responsive layouts.
- Introduce bezier paths and per-chip scattering for larger amounts.
- Add reduced-motion switch and battery-saver mode.
- Centralize a chip-flight manager to coordinate stack↔bet↔pot↔stacks animations and timings.


