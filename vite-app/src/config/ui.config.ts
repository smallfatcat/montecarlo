// UI-specific configuration constants
export const UI_CONFIG = {
  // Layout settings
  layout: {
    appMaxWidthPx: 1280,
    handsColumns: 3,
    appControlsMarginBottomPx: 12,
    // Overlap between adjacent cards in flat view (positive number, px)
    flatCardOverlapPx: 72,
    flatAppMaxWidthPx: 1600,
    
    // Flat view layout
    flat: {
      containerMinHeightVh: 75,
      containerPaddingTopPx: 5,
      containerPaddingBottomPx: 10,
      controlsGapPx: 8,
      dealerLaneGapPx: 8,
      dealerLaneMarginTopPx: 8,
      dealerTotalMarginTopPx: 4,
      playersLaneBottomPx: 150,
      edgePaddingPx: 16,
      playersLaneGapPx: 16,
      playersLanePaddingBottomPx: 4,
      seatPaddingPx: 8,
      seatMinWidthPx: 240,
      seatLowerBoundWidthPx: 180,
      handRowGapPx: 4,
      handRowMarginBottomPx: 6,
      cardRowGapPx: 8,
      infoRowGapPx: 8,
      seatNameMarginBottomPx: 4,
      actionsBottomPx: 12,
      actionsGapPx: 8,
      actionsPaddingPx: 8,
      actionsBorderRadiusPx: 10,
      actionsBetMarginLeftPx: 8,
    },
    
    // Multi view layout
    multi: {
      rulesGapPx: 12,
      rulesMarginTopPx: 8,
      detailsMarginTopPx: 8,
      detailsMarginBottomPx: 16,
      progressMarginLeftPx: 8,
      seatBetInputWidthPx: 64,
      doubleTotalsInputWidthPx: 120,
      splitRanksInputWidthPx: 140,
    },
  },
  
  // UI preferences
  ui: {
    defaultView: 'flat' as 'multi' | 'flat',
    enableFaceImages: false as boolean, // when true, attempts to load /face/<suit>_<rank>.png
    enableCardBackImage: true as boolean, // when true, uses /cardback/default.png instead of CSS gradient
    cardBackImage: 'default.png' as string, // filename of the card back image to use
  },
  
  // Simulation settings
  simulation: {
    handsPerRun: 10000,
    progressUpdateSteps: 100,
  },
} as const;

export type UIConfig = typeof UI_CONFIG;
