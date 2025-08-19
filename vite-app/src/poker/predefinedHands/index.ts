import {
  createSidePotHand,
  createSidePotTieHand,
  createFoldedContributorHand,
  createHeadsUpTieHand
} from './handBuilders';

/**
 * Collection of predefined hand histories for testing and demonstration
 */
export const PREDEFINED_HAND_HISTORIES = [
  createSidePotHand(),
  createSidePotTieHand(),
  createFoldedContributorHand(),
  createHeadsUpTieHand()
];

// Re-export hand builders for direct use
export {
  createSidePotHand,
  createSidePotTieHand,
  createFoldedContributorHand,
  createHeadsUpTieHand,
  type PredefinedHandConfig,
  type PredefinedSeat
} from './handBuilders';
