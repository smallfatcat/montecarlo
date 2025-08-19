/**
 * Timer Types for State Machine Integration
 * Replaces manual setTimeout management with state machine events
 */

export type TimerId = number | null

// Timer types for different poker scenarios
export type TimerType = 
  | 'cpu_action'      // CPU player action timer
  | 'player_action'   // Human player action timer  
  | 'auto_deal'       // Auto-deal next hand timer
  | 'watchdog'        // Backup timer for CPU actions
  | 'street_timeout'  // Street completion timeout
  | 'hand_timeout'    // Hand completion timeout

// Timer configuration
export interface TimerConfig {
  type: TimerType
  delayMs: number
  callback: () => void
  priority: 'high' | 'normal' | 'low'
  autoRestart?: boolean
  maxRestarts?: number
}

// Timer state
export interface TimerState {
  id: TimerId
  type: TimerType
  startTime: number
  delayMs: number
  callback: () => void
  priority: 'high' | 'normal' | 'low'
  autoRestart: boolean
  maxRestarts: number
  restartCount: number
  isActive: boolean
}

// Timer events
export type TimerEvent = 
  | { type: 'TIMER_START'; timerType: TimerType; delayMs: number }
  | { type: 'TIMER_COMPLETE'; timerType: TimerType }
  | { type: 'TIMER_CANCEL'; timerType: TimerType }
  | { type: 'TIMER_RESTART'; timerType: TimerType; delayMs?: number }
  | { type: 'TIMER_TIMEOUT'; timerType: TimerType; reason: string }

// Timer manager interface
export interface TimerManager {
  startTimer(config: TimerConfig): TimerId
  cancelTimer(timerType: TimerType): boolean
  cancelAllTimers(): void
  getTimerState(timerType: TimerType): TimerState | null
  getAllActiveTimers(): TimerState[]
  isTimerActive(timerType: TimerType): boolean
  clearAllTimers(): void
}

// Timer callback types for different poker actions
export interface TimerCallbacks {
  onCpuAction?: (playerId: number) => void
  onPlayerAction?: (playerId: number) => void
  onAutoDeal?: () => void
  onStreetTimeout?: (street: string) => void
  onHandTimeout?: () => void
  onWatchdog?: (playerId: number) => void
}

// Timer configuration presets
export const TIMER_PRESETS: Record<TimerType, Partial<TimerConfig>> = {
  cpu_action: {
    delayMs: 1000,
    priority: 'normal',
    autoRestart: false
  },
  player_action: {
    delayMs: 30000,
    priority: 'high',
    autoRestart: false
  },
  auto_deal: {
    delayMs: 2000,
    priority: 'low',
    autoRestart: false
  },
  watchdog: {
    delayMs: 2200,
    priority: 'high',
    autoRestart: false
  },
  street_timeout: {
    delayMs: 60000,
    priority: 'normal',
    autoRestart: false
  },
  hand_timeout: {
    delayMs: 300000, // 5 minutes
    priority: 'normal',
    autoRestart: false
  }
}

// Timer validation
export function validateTimerConfig(config: TimerConfig): { valid: boolean; error?: string } {
  if (config.delayMs <= 0) {
    return { valid: false, error: 'Timer delay must be positive' }
  }
  
  if (config.delayMs > 300000) { // 5 minutes max
    return { valid: false, error: 'Timer delay cannot exceed 5 minutes' }
  }
  
  if (config.maxRestarts && config.maxRestarts < 0) {
    return { valid: false, error: 'Max restarts must be non-negative' }
  }
  
  return { valid: true }
}
