import type { PokerTableState } from "./types";
import { createInitialPokerTable, startHand, applyAction } from "./flow";
import { suggestActionPoker } from "./strategy";

export interface SimulationConfig {
  hands: number;
  seats: number;
  startingStack: number;
}

export interface SimulationResult {
  totalHands: number;
  endingStacks: number[];
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  const cpuSeats = Array.from({ length: config.seats }, (_, i) => i);
  let state: PokerTableState = createInitialPokerTable(config.seats, cpuSeats, config.startingStack as number);

  for (let h = 0; h < config.hands; h += 1) {
    state = startHand(state);
    // crude loop: random-ish until hand_over; bots act using simple heuristic
    let guard = 1000;
    while (state.status === "in_hand" && guard-- > 0) {
      const action = suggestActionPoker(state, "tight");
      state = applyAction(state, action);
    }
  }
  return { totalHands: config.hands, endingStacks: state.seats.map((s) => s.stack) };
}


