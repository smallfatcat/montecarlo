// Blackjack-specific configuration constants
export const BLACKJACK_CONFIG = {
  // Shoe settings
  shoe: {
    defaultNumDecks: 6,
    reshuffleCutoffRatio: 0.2,
    cardsPerDeck: 52,
  },
  
  // Bankroll settings
  bankroll: {
    initialPerSeat: 100,
    casinoInitial: 10000,
  },
  
  // Betting settings
  bets: {
    defaultPerSeat: 10,
  },
  
  // Game rules
  rules: {
    dealerHitsSoft17: false, // S17 by default; set true for H17
    blackjackPayout: 1.5, // 3:2 default; set 1.2 for 6:5 or 1.0 for 1:1
    doubleTotals: [] as number[], // [] means allow any two-card double; otherwise restrict to these hard totals (e.g., [10, 11])
    doubleAfterSplit: true, // DAS allowed by default
    allowSplitRanks: null as null | Array<'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'>, // null = allow any true pair; otherwise restrict to listed ranks
  },
  
  // Animation settings
  animation: {
    cardEnterOffsetTop: -160,
    cardEnterOffsetDefault: -20,
    cardExitOffsetY: 10,
    cardStaggerStepMs: 80,
    // Smaller enter offset for flat view to avoid overflowing container and causing reflow
    flatEnterOffsetTop: -80,
    cardFlipDurationSec: 0.35,
  },
  
  // Autoplay settings
  autoplay: {
    cpuActionDelayMs: 350,
    playerActionDelayMs: 450,
    autoDealDelayMs: 900,
  },
  
  // Table settings
  table: {
    minPlayers: 1,
    maxPlayers: 5,
    defaultNumPlayers: 3,
  },
} as const;

export type BlackjackConfig = typeof BLACKJACK_CONFIG;
