import { POKER_CONFIG } from './config/poker.config';
import { BLACKJACK_CONFIG } from './config/blackjack.config';
import { UI_CONFIG } from './config/ui.config';
import { LEGACY_CONFIG } from './config/legacy.config';

export const CONFIG = {
  version: (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'),
  poker: POKER_CONFIG,
  blackjack: BLACKJACK_CONFIG,
  ui: UI_CONFIG,
  ...LEGACY_CONFIG,
  // Backward compatibility: expose layout directly from UI config
  layout: UI_CONFIG.layout,
  // Backward compatibility: expose simulation directly from UI config
  simulation: UI_CONFIG.simulation,
  // Backward compatibility: expose UI properties directly
  cardBackImage: UI_CONFIG.ui.cardBackImage,
  enableCardBackImage: UI_CONFIG.ui.enableCardBackImage,
  enableFaceImages: UI_CONFIG.ui.enableFaceImages,
} as const;

export type AppConfig = typeof CONFIG;

// Re-export all domain-specific configs
export { POKER_CONFIG, BLACKJACK_CONFIG, UI_CONFIG, LEGACY_CONFIG };


