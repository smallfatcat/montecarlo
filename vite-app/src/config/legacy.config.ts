// Legacy configuration that hasn't been moved to domain-specific configs yet
export const LEGACY_CONFIG = {
  // Legacy autoplay config (kept for backward compatibility)
  autoplay: {
    cpuActionDelayMs: 350,
    playerActionDelayMs: 450,
    autoDealDelayMs: 900,
  },
  
  // Legacy shoe config (kept for backward compatibility)
  shoe: {
    defaultNumDecks: 6,
    reshuffleCutoffRatio: 0.2,
    cardsPerDeck: 52,
  },
  
  // Legacy bankroll config (kept for backward compatibility)
  bankroll: {
    initialPerSeat: 100,
    casinoInitial: 10000,
  },
  
  // Legacy bets config (kept for backward compatibility)
  bets: {
    defaultPerSeat: 10,
  },
  
  // Legacy animation config (kept for backward compatibility)
  animation: {
    cardEnterOffsetTop: -160,
    cardEnterOffsetDefault: -20,
    cardExitOffsetY: 10,
    cardStaggerStepMs: 80,
    // Smaller enter offset for flat view to avoid overflowing container and causing reflow
    flatEnterOffsetTop: -80,
    cardFlipDurationSec: 0.35,
  },
  
  // Legacy table config (kept for backward compatibility)
  table: {
    minPlayers: 1,
    maxPlayers: 5,
    defaultNumPlayers: 3,
  },
  
  // Legacy rules config (kept for backward compatibility)
  rules: {
    dealerHitsSoft17: false as boolean, // S17 by default; set true for H17
    blackjackPayout: 1.5 as number, // 3:2 default; set 1.2 for 6:5 or 1.0 for 1:1
    doubleTotals: [] as number[], // [] means allow any two-card double; otherwise restrict to these hard totals (e.g., [10, 11])
    doubleAfterSplit: true as boolean, // DAS allowed by default
    allowSplitRanks: null as null | Array<'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'>, // null = allow any true pair; otherwise restrict to listed ranks
  },
} as const;

export type LegacyConfig = typeof LEGACY_CONFIG;
