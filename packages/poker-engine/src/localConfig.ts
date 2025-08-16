export const CONFIG = {
  pokerAutoplay: {
    cpuActionDelayMs: 150,
    playerActionDelayMs: 200,
    autoDealDelayMs: 500,
  },
  poker: {
    startingStack: 5000,
    rakePercent: 0.0,
    rakeCap: 0,
    showRakeInUI: true,
    blinds: {
      startingSmallBlind: 5,
      startingBigBlind: 10,
      increaseEveryHands: 50,
      increaseFactor: 2,
    },
    random: {
      useSeeded: true,
      seed: 42,
      perHandIncrement: 1,
    },
    animations: {
      chipFlyDurationMs: 150,
    },
  },
} as const

export type EngineConfig = typeof CONFIG


