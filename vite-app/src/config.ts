export const CONFIG = {
  autoplay: {
    cpuActionDelayMs: 350,
    playerActionDelayMs: 450,
    autoDealDelayMs: 900,
  },
  shoe: {
    defaultNumDecks: 6,
    reshuffleCutoffRatio: 0.2,
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
  },
  layout: {
    appMaxWidthPx: 1280,
    handsColumns: 3,
    // Overlap between adjacent cards in flat view (positive number, px)
    flatCardOverlapPx: 72,
  },
  simulation: {
    handsPerRun: 10000,
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


