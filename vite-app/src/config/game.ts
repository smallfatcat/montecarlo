export const GAME_CONFIG = {
  poker: {
    startingStack: 5000,
    chipIconSizePx: 30,
    chipSizePx: 30,
    chipOverlap: 0.8,
    maxChipsPerRow: 20,
    rakePercent: 0.00, // e.g., 0.05 for 5% rake
    rakeCap: 0,     // absolute cap in chips; set >0 to cap rake
    showRakeInUI: true,
    blinds: {
      startingSmallBlind: 5,
      startingBigBlind: 10,
      increaseEveryHands: 50, // increase blinds every N hands (0 disables)
      increaseFactor: 2,      // multiply blinds by this factor at each level
    },
    random: {
      useSeeded: true,
      seed: 42,
      perHandIncrement: 1,
    },
    deal: {
      perHoleCardMs: 300,
      perBoardCardMs: 300,
      streetPauseMs: 1000,
    },
    animations: {
      chipFlyDurationMs: 150,
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
  rules: {
    dealerHitsSoft17: false as boolean, // S17 by default; set true for H17
    blackjackPayout: 1.5 as number, // 3:2 default; set 1.2 for 6:5 or 1.0 for 1:1
    doubleTotals: [] as number[], // [] means allow any two-card double; otherwise restrict to these hard totals (e.g., [10, 11])
    doubleAfterSplit: true as boolean, // DAS allowed by default
    allowSplitRanks: null as null | Array<'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'>, // null = allow any true pair; otherwise restrict to listed ranks
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
} as const
