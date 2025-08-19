import type { Card } from '../../blackjack/types';
import type { SeatIn, EquityResult } from './equityCalculator';
import {
  getSeatIndices,
  buildRemainingDeck,
  getRngFunction,
  assignTrialHoles,
  evaluateTrial,
  shuffleInPlace
} from './equityCalculator';

type RunMsg = {
  type: 'run';
  data: {
    seats: SeatIn[];
    community: Card[];
    samples: number;
  };
};

type DoneMsg = { type: 'done'; result: EquityResult };
type ErrorMsg = { type: 'error'; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: any = self;

ctx.onmessage = (ev: MessageEvent<RunMsg>) => {
  try {
    const msg = ev.data;
    if (!msg || msg.type !== 'run') return;
    
    const { seats, community, samples } = msg.data;
    const result = runEquity(seats, community, samples);
    
    const out: DoneMsg = { type: 'done', result };
    ctx.postMessage(out);
  } catch (e) {
    const err: ErrorMsg = { type: 'error', error: (e as Error).message };
    ctx.postMessage(err);
  }
};

/**
 * Run Monte Carlo equity calculation
 */
export function runEquity(
  seats: SeatIn[], 
  community: Card[], 
  samples: number
): EquityResult {
  // Get seat indices and validate
  const { activeIdx, unknownIdx } = getSeatIndices(seats);
  const numActive = activeIdx.length + unknownIdx.length;
  
  if (numActive <= 1) {
    return { 
      win: new Array(seats.length).fill(0), 
      tie: new Array(seats.length).fill(0) 
    };
  }

  // Build remaining deck and get RNG
  const baseRemaining = buildRemainingDeck(seats, community);
  const rng = getRngFunction();
  
  // Initialize result arrays
  const wins = new Array(seats.length).fill(0);
  const ties = new Array(seats.length).fill(0);

  // Run Monte Carlo trials
  for (let t = 0; t < samples; t += 1) {
    // Copy and shuffle remaining deck for this trial
    const pool = baseRemaining.slice();
    shuffleInPlace(pool, rng);

    // Assign unknown holes from the pool
    const trialHoles = assignTrialHoles(pool, unknownIdx);

    // Evaluate this trial
    evaluateTrial(
      seats, 
      community, 
      trialHoles, 
      activeIdx, 
      unknownIdx, 
      wins, 
      ties
    );
  }

  return { win: wins, tie: ties };
}
