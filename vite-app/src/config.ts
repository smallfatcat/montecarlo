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
  },
  bets: {
    defaultPerSeat: 10,
  },
  animation: {
    cardEnterOffsetTop: -160,
    cardEnterOffsetDefault: -20,
    cardExitOffsetY: 10,
    cardStaggerStepMs: 80,
  },
  layout: {
    appMaxWidthPx: 1280,
    handsColumns: 3,
  },
} as const

export type AppConfig = typeof CONFIG


