// Flow logging configuration
const FLOW_DEBUG = false;

/**
 * Log flow events when debugging is enabled
 */
export function flowLog(...args: any[]): void {
  if (!FLOW_DEBUG) return;
  
  try {
    console.log(...(args as any));
  } catch {
    // Silently fail if logging fails
  }
}

/**
 * Log hand start event
 */
export function logHandStart(handId: number, deckLength: number, seatsLength: number): void {
  flowLog('[FLOW] startHand init', { 
    handId, 
    deckLen: deckLength, 
    seatsLen: seatsLength 
  });
}

/**
 * Log hole card dealing events
 */
export function logHoleCardDealing(handId: number, deckLengthBefore: number, deckLengthAfter: number): void {
  flowLog('[FLOW] dealHole begin', { 
    handId, 
    deckPre: deckLengthBefore 
  });
  
  flowLog('[FLOW] dealHole end', { 
    handId, 
    deckPost: deckLengthAfter 
  });
}

/**
 * Log action application events
 */
export function logActionApplication(
  handId: number, 
  street: string, 
  actorIndex: number, 
  actionType: string, 
  betToCall: number
): void {
  flowLog('[FLOW] applyAction start', { 
    handId, 
    street, 
    actorIndex, 
    action: actionType, 
    betToCall 
  });
}

/**
 * Log street advancement events
 */
export function logStreetAdvancement(
  handId: number, 
  street: string, 
  reason: string
): void {
  flowLog('[FLOW] advanceStreet', { 
    handId, 
    street, 
    reason 
  });
}

/**
 * Log next actor selection
 */
export function logNextActor(
  handId: number, 
  street: string, 
  nextIndex: number, 
  context?: string
): void {
  flowLog('[FLOW] next actor', { 
    handId, 
    street, 
    nextIdx: nextIndex, 
    context 
  });
}

/**
 * Log betting round continuation
 */
export function logBettingRoundContinuation(
  handId: number, 
  street: string, 
  nextIndex: number, 
  sentinel: number
): void {
  flowLog('[FLOW] continue: no aggression, passing to next', { 
    handId, 
    street, 
    nextIdx: nextIndex, 
    sentinel 
  });
}
