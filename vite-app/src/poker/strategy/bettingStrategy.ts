/**
 * Calculate betting amounts for different scenarios
 */
export class BettingCalculator {
  /**
   * Calculate preflop raise amount
   */
  static calculatePreflopRaise(
    currentBet: number,
    minRaise: number,
    stack: number
  ): number {
    const raiseAmount = Math.max(currentBet * 2, minRaise);
    return Math.min(raiseAmount, stack);
  }

  /**
   * Calculate postflop raise amount
   */
  static calculatePostflopRaise(
    potSize: number,
    stack: number,
    aggression: 'passive' | 'aggressive'
  ): number {
    const betSize = aggression === 'aggressive' ? potSize * 0.75 : potSize * 0.5;
    return Math.min(betSize, stack);
  }

  /**
   * Check if we should avoid high commitment
   */
  static shouldAvoidHighCommitment(
    stack: number,
    potSize: number,
    position: 'early' | 'middle' | 'late' | 'blinds'
  ): boolean {
    const stackToPotRatio = stack / potSize;
    return position === 'early' && stackToPotRatio < 3;
  }

  /**
   * Calculate short stack shove amount
   */
  static calculateShortStackShove(
    stack: number,
    potSize: number
  ): number {
    return Math.min(stack, potSize * 2);
  }
}

/**
 * Check if a stack is considered short
 */
export function isShortStack(effectiveStackBB: number, threshold: number = 20): boolean {
  return effectiveStackBB <= threshold;
}

/**
 * Calculate Stack-to-Pot Ratio (SPR)
 */
export function calculateSPR(effectiveStack: number, potAfterCall: number): number {
  return effectiveStack / potAfterCall;
}

/**
 * Get effective stack in big blinds
 */
export function getEffectiveStackBB(effectiveStack: number, bigBlind: number): number {
  return effectiveStack / bigBlind;
}
