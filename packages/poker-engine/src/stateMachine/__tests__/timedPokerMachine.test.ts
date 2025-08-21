import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TimedPokerStateMachine } from '../timedPokerMachine'
import type { TimerConfig } from '../types'

describe('TimedPokerStateMachine', () => {
  let machine: TimedPokerStateMachine
  let playerStacks: Map<number, number>

  beforeEach(() => {
    vi.useFakeTimers()
    playerStacks = new Map([
      [0, 1000],
      [1, 1000]
    ])
    machine = new TimedPokerStateMachine([0, 1], playerStacks)
  })

  afterEach(() => {
    machine.dispose()
    vi.useRealTimers()
  })

  describe('Timer Management', () => {
    it('should start timers correctly', () => {
      const mockCallback = vi.fn()
      const timerConfig: TimerConfig = {
        type: 'player_action',
        delayMs: 5000,
        callback: mockCallback,
        priority: 'normal'
      }

      const timerId = machine.startTimer(timerConfig)
      expect(timerId).toBeDefined()
      
      // Timer should not have fired yet
      expect(mockCallback).not.toHaveBeenCalled()
      
      // Advance time
      vi.advanceTimersByTime(5000)
      
      // Timer should have fired
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    it('should cancel timers correctly', () => {
      const mockCallback = vi.fn()
      const timerConfig: TimerConfig = {
        type: 'player_action',
        delayMs: 5000,
        callback: mockCallback,
        priority: 'normal'
      }

      const timerId = machine.startTimer(timerConfig)
      const cancelled = machine.cancelTimer(timerId)
      
      expect(cancelled).toBe(true)
      
      // Advance time past when timer would have fired
      vi.advanceTimersByTime(10000)
      
      // Callback should not have been called
      expect(mockCallback).not.toHaveBeenCalled()
    })

    it('should handle multiple timers correctly', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      machine.startTimer({
        type: 'player_action',
        delayMs: 1000,
        callback: callback1,
        priority: 'normal'
      })

      machine.startTimer({
        type: 'hand_timeout',
        delayMs: 2000,
        callback: callback2,
        priority: 'high'
      })

      machine.startTimer({
        type: 'player_action',
        delayMs: 3000,
        callback: callback3,
        priority: 'low'
      })

      // Advance time incrementally
      vi.advanceTimersByTime(1000)
      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).not.toHaveBeenCalled()
      expect(callback3).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1000) // Total: 2000ms
      expect(callback2).toHaveBeenCalledTimes(1)
      expect(callback3).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1000) // Total: 3000ms
      expect(callback3).toHaveBeenCalledTimes(1)
    })

    it('should validate timer configurations', () => {
      // Negative delay should throw
      expect(() => {
        machine.startTimer({
          type: 'player_action',
          delayMs: -1000,
          callback: () => {},
          priority: 'normal'
        })
      }).toThrow()

      // Excessive delay should throw
      expect(() => {
        machine.startTimer({
          type: 'player_action',
          delayMs: 400000, // > 5 minutes
          callback: () => {},
          priority: 'normal'
        })
      }).toThrow()
    })

    it('should handle timer priority correctly', () => {
      const highPriorityCallback = vi.fn()
      const lowPriorityCallback = vi.fn()

      // Start both timers at the same time
      machine.startTimer({
        type: 'hand_timeout',
        delayMs: 1000,
        callback: highPriorityCallback,
        priority: 'high'
      })

      machine.startTimer({
        type: 'player_action',
        delayMs: 1000,
        callback: lowPriorityCallback,
        priority: 'low'
      })

      vi.advanceTimersByTime(1000)

      // Both should have been called, but high priority should be processed first
      expect(highPriorityCallback).toHaveBeenCalled()
      expect(lowPriorityCallback).toHaveBeenCalled()
    })
  })

  describe('Player Action Timeouts', () => {
    it('should handle player action timeouts', async () => {
      let timeoutOccurred = false
      
      // Mock a player action timeout
      machine.startTimer({
        type: 'player_action',
        delayMs: 10000, // 10 seconds
        callback: () => {
          timeoutOccurred = true
          // Simulate folding on timeout
          machine.processPlayerAction(machine.getCurrentState().currentPlayer, { type: 'fold' })
        },
        priority: 'high'
      })

      // Advance time to trigger timeout
      vi.advanceTimersByTime(10000)

      expect(timeoutOccurred).toBe(true)
      
      const state = machine.getCurrentState()
      // The current player should have changed due to fold
      expect(state.activePlayers.length).toBeLessThan(2)
    })

    it('should cancel player action timer when action is taken', () => {
      const timeoutCallback = vi.fn()
      
      const timerId = machine.startTimer({
        type: 'player_action',
        delayMs: 10000,
        callback: timeoutCallback,
        priority: 'high'
      })

      // Player takes action before timeout
      machine.processPlayerAction(0, { type: 'call' })
      
      // Cancel the timer (this would be done automatically in real implementation)
      machine.cancelTimer(timerId)

      // Advance past timeout
      vi.advanceTimersByTime(15000)

      // Timeout should not have occurred
      expect(timeoutCallback).not.toHaveBeenCalled()
    })
  })

  describe('Hand Timeouts', () => {
    it('should handle hand timeouts correctly', () => {
      let handTimeoutOccurred = false

      machine.startTimer({
        type: 'hand_timeout',
        delayMs: 300000, // 5 minutes
        callback: () => {
          handTimeoutOccurred = true
        },
        priority: 'critical'
      })

      // Advance time to trigger hand timeout
      vi.advanceTimersByTime(300000)

      expect(handTimeoutOccurred).toBe(true)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track timer performance metrics', () => {
      const callback = vi.fn()
      
      machine.startTimer({
        type: 'player_action',
        delayMs: 1000,
        callback,
        priority: 'normal'
      })

      vi.advanceTimersByTime(1000)

      // Get timer statistics
      const stats = machine.getTimerStats()
      expect(stats).toBeDefined()
      expect(stats.activeTimers).toBe(0) // Timer should have completed
      expect(stats.totalTimersCreated).toBe(1)
    })

    it('should handle timer cleanup on disposal', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      machine.startTimer({
        type: 'player_action',
        delayMs: 5000,
        callback: callback1,
        priority: 'normal'
      })

      machine.startTimer({
        type: 'hand_timeout',
        delayMs: 10000,
        callback: callback2,
        priority: 'high'
      })

      // Dispose machine
      machine.dispose()

      // Advance time past when timers would have fired
      vi.advanceTimersByTime(15000)

      // No callbacks should have been called after disposal
      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle timer callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Timer callback error')
      })

      // Should not throw when starting timer with error-prone callback
      expect(() => {
        machine.startTimer({
          type: 'player_action',
          delayMs: 1000,
          callback: errorCallback,
          priority: 'normal'
        })
      }).not.toThrow()

      // Should not crash when timer fires with error
      expect(() => {
        vi.advanceTimersByTime(1000)
      }).not.toThrow()

      expect(errorCallback).toHaveBeenCalled()
    })

    it('should handle cancellation of non-existent timers', () => {
      const result = machine.cancelTimer('non-existent-timer')
      expect(result).toBe(false)
    })
  })

  describe('Integration with Game State', () => {
    it('should integrate timer events with game state changes', () => {
      // Start a hand with timer integration
      const state = machine.getCurrentState()
      expect(state.currentPlayer).toBeDefined()

      // Process an action and verify state changes
      const result = machine.processPlayerAction(state.currentPlayer, { type: 'call' })
      expect(result.success).toBe(true)

      const newState = machine.getCurrentState()
      expect(newState.currentPlayer).not.toBe(state.currentPlayer)
    })
  })

  describe('Memory Management', () => {
    it('should clean up completed timers', () => {
      const callback = vi.fn()
      
      // Create and complete a timer
      machine.startTimer({
        type: 'player_action',
        delayMs: 1000,
        callback,
        priority: 'normal'
      })

      vi.advanceTimersByTime(1000)
      expect(callback).toHaveBeenCalled()

      // Timer should be cleaned up
      const stats = machine.getTimerStats()
      expect(stats.activeTimers).toBe(0)
    })
  })
})
