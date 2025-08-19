import { POKER_CONFIG } from './poker.config';
import { BLACKJACK_CONFIG } from './blackjack.config';
import { UI_CONFIG } from './ui.config';

// Main configuration object that combines all domain-specific configs
export const CONFIG = {
  version: (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'),
  
  // Domain-specific configurations
  poker: POKER_CONFIG,
  blackjack: BLACKJACK_CONFIG,
  ui: UI_CONFIG,
  
  // Legacy autoplay config (kept for backward compatibility)
  autoplay: BLACKJACK_CONFIG.autoplay,
  
  // Legacy shoe config (kept for backward compatibility)
  shoe: BLACKJACK_CONFIG.shoe,
  
  // Legacy bankroll config (kept for backward compatibility)
  bankroll: BLACKJACK_CONFIG.bankroll,
  
  // Legacy bets config (kept for backward compatibility)
  bets: BLACKJACK_CONFIG.bets,
  
  // Legacy animation config (kept for backward compatibility)
  animation: BLACKJACK_CONFIG.animation,
  
  // Legacy table config (kept for backward compatibility)
  table: BLACKJACK_CONFIG.table,
  
  // Legacy rules config (kept for backward compatibility)
  rules: BLACKJACK_CONFIG.rules,
} as const;

export type AppConfig = typeof CONFIG;

// Re-export domain-specific configs for direct access
export { POKER_CONFIG, BLACKJACK_CONFIG, UI_CONFIG };
