// Poker-specific configuration constants
export const POKER_CONFIG = {
  // Game settings
  startingStack: 5000,
  rakePercent: 0.00, // e.g., 0.05 for 5% rake
  rakeCap: 0,     // absolute cap in chips; set >0 to cap rake
  showRakeInUI: true,
  
  // Chip display settings
  chipIconSizePx: 30,
  chipSizePx: 30,
  chipOverlap: 0.8,
  maxChipsPerRow: 20,
  
  // Blind structure
  blinds: {
    startingSmallBlind: 5,
    startingBigBlind: 10,
    increaseEveryHands: 50, // increase blinds every N hands (0 disables)
    increaseFactor: 2,      // multiply blinds by this factor at each level
  },
  
  // Table layout (horseshoe)
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
    topBoostNearEnd: 1.5,
    boardOffsetY: -60,             // pixels from center for board row
    boardGapPx: 10,
    seatWidthPx: 200,
    seatCardScale: 0.9,
    potOffsetY: 35,
    showdownOffsetY: 70,
  },
  
  // Random number generation
  random: {
    useSeeded: true,
    seed: 42,
    perHandIncrement: 1,
  },
  
  // Deal timing
  deal: {
    perHoleCardMs: 300,
    perBoardCardMs: 300,
    streetPauseMs: 1000,
  },
  
  // Animation settings
  animations: {
    chipFlyDurationMs: 150,
  },
  
  // Autoplay settings
  autoplay: {
    cpuActionDelayMs: 150,
    playerActionDelayMs: 200,
    autoDealDelayMs: 500,
  },
} as const;

export type PokerConfig = typeof POKER_CONFIG;
