/**
 * Timer Manager Implementation
 * Manages all timers for the poker state machine, replacing manual setTimeout management
 */

import type { 
  TimerId, 
  TimerType, 
  TimerConfig, 
  TimerState, 
  TimerEvent,
  TimerCallbacks 
} from './timerTypes.js'
import { validateTimerConfig, TIMER_PRESETS } from './timerTypes.js'

export class StateMachineTimerManager {
  private timers: Map<TimerType, TimerState> = new Map()
  private callbacks: TimerCallbacks = {}
  private nextTimerId = 1

  constructor(callbacks: TimerCallbacks = {}) {
    this.callbacks = callbacks
  }

  /**
   * Start a timer with the given configuration
   */
  startTimer(config: TimerConfig): TimerId {
    // Validate configuration
    const validation = validateTimerConfig(config)
    if (!validation.valid) {
      throw new Error(`Invalid timer config: ${validation.error}`)
    }

    // Cancel existing timer of the same type
    this.cancelTimer(config.type)

    // Create timer state
    const timerState: TimerState = {
      id: this.nextTimerId++,
      type: config.type,
      startTime: Date.now(),
      delayMs: config.delayMs,
      callback: config.callback,
      priority: config.priority,
      autoRestart: config.autoRestart ?? false,
      maxRestarts: config.maxRestarts ?? 0,
      restartCount: 0,
      isActive: true
    }

    // Store timer state
    this.timers.set(config.type, timerState)

    // Start the actual timer
    const timeoutId = setTimeout(() => {
      this.handleTimerComplete(config.type)
    }, config.delayMs) as unknown as number

    // Update the timer ID to the actual timeout ID
    timerState.id = timeoutId

    return timeoutId
  }

  /**
   * Cancel a specific timer
   */
  cancelTimer(timerType: TimerType): boolean {
    const timer = this.timers.get(timerType)
    if (!timer || !timer.isActive) {
      return false
    }

    // Clear the timeout
    if (timer.id !== null) {
      clearTimeout(timer.id as number)
    }

    // Mark as inactive
    timer.isActive = false
    this.timers.delete(timerType)

    return true
  }

  /**
   * Cancel all active timers
   */
  cancelAllTimers(): void {
    for (const [timerType, timer] of this.timers) {
      if (timer.isActive && timer.id !== null) {
        clearTimeout(timer.id as number)
      }
    }
    this.timers.clear()
  }

  /**
   * Get the state of a specific timer
   */
  getTimerState(timerType: TimerType): TimerState | null {
    return this.timers.get(timerType) || null
  }

  /**
   * Get all active timers
   */
  getAllActiveTimers(): TimerState[] {
    return Array.from(this.timers.values()).filter(timer => timer.isActive)
  }

  /**
   * Check if a timer is currently active
   */
  isTimerActive(timerType: TimerType): boolean {
    const timer = this.timers.get(timerType)
    return timer?.isActive ?? false
  }

  /**
   * Clear all timers (alias for cancelAllTimers)
   */
  clearAllTimers(): void {
    this.cancelAllTimers()
  }

  /**
   * Restart a timer with optional new delay
   */
  restartTimer(timerType: TimerType, newDelayMs?: number): boolean {
    const timer = this.timers.get(timerType)
    if (!timer || !timer.isActive) {
      return false
    }

    // Check restart limits
    if (timer.maxRestarts > 0 && timer.restartCount >= timer.maxRestarts) {
      return false
    }

    // Cancel current timer
    this.cancelTimer(timerType)

    // Create new timer with updated delay
    const config: TimerConfig = {
      type: timer.type,
      delayMs: newDelayMs ?? timer.delayMs,
      callback: timer.callback,
      priority: timer.priority,
      autoRestart: timer.autoRestart,
      maxRestarts: timer.maxRestarts
    }

    // Start new timer
    this.startTimer(config)

    // Update restart count
    const newTimer = this.timers.get(timerType)
    if (newTimer) {
      newTimer.restartCount = timer.restartCount + 1
    }

    return true
  }

  /**
   * Get remaining time for a timer
   */
  getRemainingTime(timerType: TimerType): number {
    const timer = this.timers.get(timerType)
    if (!timer || !timer.isActive) {
      return 0
    }

    const elapsed = Date.now() - timer.startTime
    return Math.max(0, timer.delayMs - elapsed)
  }

  /**
   * Start a timer using preset configuration
   */
  startPresetTimer(timerType: TimerType, callback: () => void, customDelayMs?: number): TimerId {
    const preset = TIMER_PRESETS[timerType]
    if (!preset) {
      throw new Error(`No preset configuration for timer type: ${timerType}`)
    }

    const config: TimerConfig = {
      type: timerType,
      delayMs: customDelayMs ?? preset.delayMs!,
      callback,
      priority: preset.priority!,
      autoRestart: preset.autoRestart ?? false,
      maxRestarts: preset.maxRestarts ?? 0
    }

    return this.startTimer(config)
  }

  /**
   * Start CPU action timer
   */
  startCpuActionTimer(playerId: number, delayMs?: number): TimerId {
    return this.startPresetTimer('cpu_action', () => {
      this.callbacks.onCpuAction?.(playerId)
    }, delayMs)
  }

  /**
   * Start player action timer
   */
  startPlayerActionTimer(playerId: number, delayMs?: number): TimerId {
    return this.startPresetTimer('player_action', () => {
      this.callbacks.onPlayerAction?.(playerId)
    }, delayMs)
  }

  /**
   * Start auto-deal timer
   */
  startAutoDealTimer(delayMs?: number): TimerId {
    return this.startPresetTimer('auto_deal', () => {
      this.callbacks.onAutoDeal?.()
    }, delayMs)
  }

  /**
   * Start watchdog timer
   */
  startWatchdogTimer(playerId: number, delayMs?: number): TimerId {
    return this.startPresetTimer('watchdog', () => {
      this.callbacks.onWatchdog?.(playerId)
    }, delayMs)
  }

  /**
   * Start street timeout timer
   */
  startStreetTimeoutTimer(street: string, delayMs?: number): TimerId {
    return this.startPresetTimer('street_timeout', () => {
      this.callbacks.onStreetTimeout?.(street)
    }, delayMs)
  }

  /**
   * Start hand timeout timer
   */
  startHandTimeoutTimer(delayMs?: number): TimerId {
    return this.startPresetTimer('hand_timeout', () => {
      this.callbacks.onHandTimeout?.()
    }, delayMs)
  }

  /**
   * Handle timer completion
   */
  private handleTimerComplete(timerType: TimerType): void {
    const timer = this.timers.get(timerType)
    if (!timer || !timer.isActive) {
      return
    }

    // Execute callback
    try {
      timer.callback()
    } catch (error) {
      console.error(`Error in timer callback for ${timerType}:`, error)
    }

    // Handle auto-restart
    if (timer.autoRestart) {
      if (timer.maxRestarts === 0 || timer.restartCount < timer.maxRestarts) {
        this.restartTimer(timerType)
        return
      }
    }

    // Mark as inactive and remove
    timer.isActive = false
    this.timers.delete(timerType)
  }

  /**
   * Get timer statistics
   */
  getTimerStats(): {
    activeCount: number
    totalCount: number
    byPriority: Record<string, number>
    byType: Record<TimerType, number>
  } {
    const activeTimers = this.getAllActiveTimers()
    const byPriority: Record<string, number> = { high: 0, normal: 0, low: 0 }
    const byType: Record<TimerType, number> = {
      cpu_action: 0,
      player_action: 0,
      auto_deal: 0,
      watchdog: 0,
      street_timeout: 0,
      hand_timeout: 0
    }

    for (const timer of activeTimers) {
      byPriority[timer.priority]++
      byType[timer.type]++
    }

    return {
      activeCount: activeTimers.length,
      totalCount: this.timers.size,
      byPriority,
      byType
    }
  }

  /**
   * Update callbacks
   */
  updateCallbacks(newCallbacks: Partial<TimerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...newCallbacks }
  }

  /**
   * Dispose of the timer manager
   */
  dispose(): void {
    this.cancelAllTimers()
    this.callbacks = {}
  }
}
