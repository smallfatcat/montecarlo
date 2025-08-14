import { GAME_CONFIG } from './game'
import { UI_CONFIG } from './ui'
import { POKER_CONFIG } from './poker'

export const CONFIG = {
  version: (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'),
  ...GAME_CONFIG,
  ...UI_CONFIG,
  poker: {
    ...GAME_CONFIG.poker,
    ...POKER_CONFIG,
  },
} as const

export type AppConfig = typeof CONFIG

// Re-export individual configs for specific use cases
export { GAME_CONFIG, UI_CONFIG, POKER_CONFIG }
