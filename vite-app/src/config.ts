export const CONFIG = {
  version: (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'),
  autoplay: {
    cpuActionDelayMs: 350,
    playerActionDelayMs: 450,
    autoDealDelayMs: 900,
  },
  pokerAutoplay: {
    cpuActionDelayMs: 250,
    playerActionDelayMs: 300,
    autoDealDelayMs: 700,
  },
  poker: {
    rakePercent: 0.00, // e.g., 0.05 for 5% rake
    rakeCap: 0,     // absolute cap in chips; set >0 to cap rake
    showRakeInUI: true,
    blinds: {
      increaseEveryHands: 50, // increase blinds every N hands (0 disables)
      increaseFactor: 2,      // multiply blinds by this factor at each level
    },
    horseshoe: {
      tableWidthPx: 1200,
      tableHeightPx: 720,
      centerYOffsetPx: -30,          // relative to height/2
      basePaddingPx: 80,             // margin from table edge used for base radius
      radiusXScale: 1.6,             // horizontal ellipse radius scale
      radiusYScale: 1.0,             // vertical ellipse radius scale
      arcStartDeg: 205,              // horseshoe start angle
      arcEndDeg: -25,                // horseshoe end angle
      edgeBoostEnd: 1.1,             // additional horizontal push for index 0 and last
      edgeBoostNearEnd: 1.08,        // for index 1 and last-2
      topBoostEnd: 1.4,              // slight vertical adjust for index 0 and last
      topBoostNearEnd: 1.0,
      boardOffsetY: -60,             // pixels from center for board row
      boardGapPx: 10,
      seatWidthPx: 200,
      seatCardScale: 0.9,
      potOffsetY: 35,
      showdownOffsetY: 70,
    }
    ,
    deal: {
      perHoleCardMs: 300,
      perBoardCardMs: 300,
      streetPauseMs: 1000,
    }
  },
  shoe: {
    defaultNumDecks: 6,
    reshuffleCutoffRatio: 0.2,
    cardsPerDeck: 52,
  },
  bankroll: {
    initialPerSeat: 100,
    casinoInitial: 10000,
  },
  bets: {
    defaultPerSeat: 10,
  },
  animation: {
    cardEnterOffsetTop: -160,
    cardEnterOffsetDefault: -20,
    cardExitOffsetY: 10,
    cardStaggerStepMs: 80,
    // Smaller enter offset for flat view to avoid overflowing container and causing reflow
    flatEnterOffsetTop: -80,
    cardFlipDurationSec: 0.35,
  },
  layout: {
    appMaxWidthPx: 1280,
    handsColumns: 3,
    appControlsMarginBottomPx: 12,
    // Overlap between adjacent cards in flat view (positive number, px)
    flatCardOverlapPx: 72,
    flatAppMaxWidthPx: 1600,
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
  simulation: {
    handsPerRun: 10000,
    progressUpdateSteps: 100,
  },
  table: {
    minPlayers: 1,
    maxPlayers: 5,
    defaultNumPlayers: 3,
  },
  ui: {
    defaultView: 'flat' as 'multi' | 'flat',
  },
  rules: {
    dealerHitsSoft17: false as boolean, // S17 by default; set true for H17
    blackjackPayout: 1.5 as number, // 3:2 default; set 1.2 for 6:5 or 1.0 for 1:1
    doubleTotals: [] as number[], // [] means allow any two-card double; otherwise restrict to these hard totals (e.g., [10, 11])
    doubleAfterSplit: true as boolean, // DAS allowed by default
    allowSplitRanks: null as null | Array<'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'>, // null = allow any true pair; otherwise restrict to listed ranks
  },
} as const

export type AppConfig = typeof CONFIG


