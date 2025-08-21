import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IntegratedPokerStateMachine } from '../../stateMachine/integratedPokerMachine'
import { TimedPokerStateMachine } from '../../stateMachine/timedPokerMachine'
import type { BettingAction, PokerTableState } from '../../types'

/**
 * Integration Test Suite for Multiplayer Poker Scenarios
 * Tests complete game flows with multiple players
 */

describe('Multiplayer Integration Tests', () => {
  let machine: IntegratedPokerStateMachine
  let timedMachine: TimedPokerStateMachine
  
  beforeEach(() => {
    // Setup a 6-player table with various stack sizes
    const playerSeats = [0, 1, 2, 3, 4, 5]
    const stackSizes = new Map([
      [0, 1000], // Big stack
      [1, 500],  // Medium stack
      [2, 200],  // Short stack
      [3, 1500], // Chip leader
      [4, 300],  // Medium-small stack
      [5, 50],   // Very short stack
    ])
    
    machine = new IntegratedPokerStateMachine(playerSeats, stackSizes)
    timedMachine = new TimedPokerStateMachine(playerSeats, stackSizes)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Complete Hand Scenarios', () => {
    it('should handle a complete preflop all-in scenario', () => {
      // Scenario: Short stack goes all-in, gets called by multiple players
      const initialState = machine.getCurrentState()
      
      // Player 5 (50 chips) goes all-in
      machine.processPlayerAction(5, { type: 'raise', amount: 50 })
      
      // Player 0 calls
      machine.processPlayerAction(0, { type: 'call' })
      
      // Player 1 calls
      machine.processPlayerAction(1, { type: 'call' })
      
      // Other players fold
      machine.processPlayerAction(2, { type: 'fold' })
      machine.processPlayerAction(3, { type: 'fold' })
      machine.processPlayerAction(4, { type: 'fold' })
      
      const finalState = machine.getCurrentState()
      
      // Verify all-in scenario is handled correctly
      expect(finalState.pots).toBeDefined()
      expect(finalState.pots.length).toBeGreaterThan(0)
      
      // Verify chips are properly distributed
      const totalChipsInPots = finalState.pots.reduce((sum, pot) => sum + pot.amount, 0)
      expect(totalChipsInPots).toBe(50 * 3) // 3 players called the all-in
    })

    it('should handle multi-street betting with side pots', () => {
      // Complex scenario with multiple all-ins creating side pots
      
      // Preflop: Short stack all-in, multiple callers
      machine.processPlayerAction(5, { type: 'raise', amount: 50 }) // All-in
      machine.processPlayerAction(0, { type: 'call' })
      machine.processPlayerAction(1, { type: 'call' })
      machine.processPlayerAction(2, { type: 'raise', amount: 200 }) // All-in
      machine.processPlayerAction(3, { type: 'call' })
      machine.processPlayerAction(4, { type: 'fold' })
      
      const prelopState = machine.getCurrentState()
      expect(prelopState.street).toBe('preflop')
      
      // Should advance to flop with proper side pots
      if (prelopState.street === 'flop') {
        expect(prelopState.pots.length).toBeGreaterThanOrEqual(2) // Main pot + side pot
      }
    })

    it('should handle heads-up play after other players fold', () => {
      // All players except 0 and 3 fold
      machine.processPlayerAction(1, { type: 'fold' })
      machine.processPlayerAction(2, { type: 'fold' })
      machine.processPlayerAction(4, { type: 'fold' })
      machine.processPlayerAction(5, { type: 'fold' })
      
      // Now heads-up between players 0 and 3
      machine.processPlayerAction(0, { type: 'raise', amount: 100 })
      machine.processPlayerAction(3, { type: 'call' })
      
      const flopState = machine.getCurrentState()
      expect(flopState.street).toBe('flop')
      
      // Continue heads-up play through all streets
      machine.processPlayerAction(0, { type: 'bet', amount: 150 })
      machine.processPlayerAction(3, { type: 'call' })
      
      const turnState = machine.getCurrentState()
      expect(turnState.street).toBe('turn')
      
      machine.processPlayerAction(0, { type: 'bet', amount: 200 })
      machine.processPlayerAction(3, { type: 'call' })
      
      const riverState = machine.getCurrentState()
      expect(riverState.street).toBe('river')
      
      // Final betting round
      machine.processPlayerAction(0, { type: 'check' })
      machine.processPlayerAction(3, { type: 'check' })
      
      const finalState = machine.getCurrentState()
      expect(finalState.street).toBe('showdown')
    })
  })

  describe('Timer Integration', () => {
    it('should handle player timeouts correctly', async () => {
      const timeoutPromises: Promise<any>[] = []
      
      // Mock timer for quick testing
      vi.useFakeTimers()
      
      // Start timer for current player
      const currentPlayer = timedMachine.getCurrentState().toAct
      expect(typeof currentPlayer).toBe('number')
      
      // Simulate timeout
      const timeoutPromise = new Promise(resolve => {
        timedMachine.startTimer({
          type: 'player_action',
          delayMs: 30000, // 30 second timeout
          callback: () => {
            // Auto-fold on timeout
            timedMachine.processPlayerAction(currentPlayer!, { type: 'fold' })
            resolve(true)
          },
          priority: 'high'
        })
      })
      
      // Fast-forward time
      vi.advanceTimersByTime(30000)
      
      await timeoutPromise
      
      const stateAfterTimeout = timedMachine.getCurrentState()
      // Verify player was folded and action moved to next player
      expect(stateAfterTimeout.toAct).not.toBe(currentPlayer)
      
      vi.useRealTimers()
    })

    it('should handle rapid action sequences without timing issues', async () => {
      const actions: BettingAction[] = [
        { type: 'call' },
        { type: 'call' },
        { type: 'raise', amount: 100 },
        { type: 'fold' },
        { type: 'fold' },
        { type: 'call' }
      ]
      
      const startTime = performance.now()
      
      // Process actions rapidly
      for (let i = 0; i < actions.length; i++) {
        const currentPlayer = machine.getCurrentState().toAct
        if (currentPlayer !== null) {
          machine.processPlayerAction(currentPlayer, actions[i])
        }
      }
      
      const endTime = performance.now()
      
      // Should complete quickly (< 100ms for 6 actions)
      expect(endTime - startTime).toBeLessThan(100)
      
      // Verify final state is valid
      const finalState = machine.getCurrentState()
      expect(['preflop', 'flop', 'turn', 'river', 'showdown']).toContain(finalState.street)
    })
  })

  describe('Chip Management Integration', () => {
    it('should maintain chip conservation throughout the hand', () => {
      const initialChips = Array.from(machine.getCurrentState().seats)
        .filter(seat => seat !== null)
        .reduce((sum, seat) => sum + seat!.stack, 0)
      
      // Play through a complete hand
      machine.processPlayerAction(0, { type: 'raise', amount: 50 })
      machine.processPlayerAction(1, { type: 'call' })
      machine.processPlayerAction(2, { type: 'fold' })
      machine.processPlayerAction(3, { type: 'call' })
      machine.processPlayerAction(4, { type: 'fold' })
      machine.processPlayerAction(5, { type: 'fold' })
      
      // Continue through flop
      const flopState = machine.getCurrentState()
      if (flopState.street === 'flop') {
        machine.processPlayerAction(0, { type: 'bet', amount: 75 })
        machine.processPlayerAction(1, { type: 'call' })
        machine.processPlayerAction(3, { type: 'fold' })
      }
      
      // Check chip conservation at any point
      const currentState = machine.getCurrentState()
      const currentChips = Array.from(currentState.seats)
        .filter(seat => seat !== null)
        .reduce((sum, seat) => sum + seat!.stack, 0)
      
      const chipsInPots = currentState.pots?.reduce((sum, pot) => sum + pot.amount, 0) || 0
      
      // Total chips should remain constant
      expect(currentChips + chipsInPots).toBe(initialChips)
    })

    it('should handle complex side pot calculations', () => {
      // Create a scenario with multiple all-ins
      const testCases = [
        { player: 5, amount: 50 },  // All-in (50 chips)
        { player: 2, amount: 200 }, // All-in (200 chips)  
        { player: 1, amount: 500 }, // All-in (500 chips)
        { player: 0, amount: 300 }, // Call
        { player: 3, amount: 300 }, // Call
        { player: 4, amount: 300 }, // Call
      ]
      
      testCases.forEach(({ player, amount }, index) => {
        const currentState = machine.getCurrentState()
        if (currentState.toAct === player) {
          machine.processPlayerAction(player, { 
            type: amount >= currentState.seats[player]!.stack ? 'raise' : 'call',
            amount: Math.min(amount, currentState.seats[player]!.stack)
          })
        }
      })
      
      const finalState = machine.getCurrentState()
      
      // Should have multiple side pots
      expect(finalState.pots.length).toBeGreaterThan(1)
      
      // Verify side pot amounts are calculated correctly
      const mainPot = finalState.pots.find(pot => pot.eligiblePlayers.length === 6)
      const sidePot1 = finalState.pots.find(pot => pot.eligiblePlayers.length === 5)
      const sidePot2 = finalState.pots.find(pot => pot.eligiblePlayers.length === 3)
      
      expect(mainPot?.amount).toBe(50 * 6) // 6 players x 50 chips
      expect(sidePot1?.amount).toBe(150 * 5) // 5 players x 150 more chips
      expect(sidePot2?.amount).toBe(300 * 3) // 3 players x 300 more chips
    })
  })

  describe('State Transitions and Consistency', () => {
    it('should maintain consistent state through complex action sequences', () => {
      const stateHistory: PokerTableState[] = []
      
      // Record each state transition
      const recordState = () => {
        stateHistory.push(JSON.parse(JSON.stringify(machine.getCurrentState())))
      }
      
      recordState() // Initial state
      
      // Complex sequence of actions
      const actionSequence = [
        { player: 0, action: { type: 'raise', amount: 100 } as BettingAction },
        { player: 1, action: { type: 'call' } as BettingAction },
        { player: 2, action: { type: 'raise', amount: 200 } as BettingAction },
        { player: 3, action: { type: 'fold' } as BettingAction },
        { player: 4, action: { type: 'fold' } as BettingAction },
        { player: 5, action: { type: 'fold' } as BettingAction },
        { player: 0, action: { type: 'call' } as BettingAction },
        { player: 1, action: { type: 'call' } as BettingAction },
      ]
      
      actionSequence.forEach(({ player, action }) => {
        const currentState = machine.getCurrentState()
        if (currentState.toAct === player) {
          machine.processPlayerAction(player, action)
          recordState()
        }
      })
      
      // Validate state consistency
      stateHistory.forEach((state, index) => {
        // Each state should be valid
        expect(state.handId).toBeDefined()
        expect(['preflop', 'flop', 'turn', 'river', 'showdown']).toContain(state.street)
        expect(state.seats.length).toBe(6)
        
        // Street should never go backwards
        if (index > 0) {
          const prevState = stateHistory[index - 1]
          const streetOrder = ['preflop', 'flop', 'turn', 'river', 'showdown']
          const currentStreetIndex = streetOrder.indexOf(state.street)
          const prevStreetIndex = streetOrder.indexOf(prevState.street)
          expect(currentStreetIndex).toBeGreaterThanOrEqual(prevStreetIndex)
        }
      })
    })

    it('should handle edge cases in action validation', () => {
      // Test various invalid actions
      const invalidActions = [
        { player: 0, action: { type: 'raise', amount: -100 } }, // Negative amount
        { player: 0, action: { type: 'bet', amount: 10000 } },  // More than stack
        { player: 1, action: { type: 'call' } },               // Wrong player
        { player: 0, action: { type: 'check' } },              // Check when bet to call
      ]
      
      const initialState = machine.getCurrentState()
      
      invalidActions.forEach(({ player, action }) => {
        const stateBefore = machine.getCurrentState()
        
        // Attempt invalid action
        try {
          machine.processPlayerAction(player, action as BettingAction)
        } catch (error) {
          // Expected to throw or handle gracefully
        }
        
        const stateAfter = machine.getCurrentState()
        
        // State should be unchanged for invalid actions
        expect(stateAfter.handId).toBe(stateBefore.handId)
        expect(stateAfter.street).toBe(stateBefore.street)
        expect(stateAfter.toAct).toBe(stateBefore.toAct)
      })
    })
  })

  describe('Performance Under Load', () => {
    it('should handle 1000 rapid state changes efficiently', () => {
      const iterations = 1000
      const startTime = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        const currentState = machine.getCurrentState()
        const currentPlayer = currentState.toAct
        
        if (currentPlayer !== null) {
          // Alternate between call and fold actions
          const action: BettingAction = i % 2 === 0 ? { type: 'call' } : { type: 'fold' }
          
          try {
            machine.processPlayerAction(currentPlayer, action)
          } catch (error) {
            // Hand might end, start a new one
            machine = new IntegratedPokerStateMachine([0, 1, 2, 3, 4, 5], new Map([
              [0, 1000], [1, 500], [2, 200], [3, 1500], [4, 300], [5, 50]
            ]))
          }
        }
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete 1000 operations in less than 1 second
      expect(duration).toBeLessThan(1000)
      
      // Performance benchmark: less than 1ms per operation
      expect(duration / iterations).toBeLessThan(1)
    })

    it('should maintain memory efficiency during extended play', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Simulate 100 complete hands
      for (let hand = 0; hand < 100; hand++) {
        machine = new IntegratedPokerStateMachine([0, 1, 2, 3, 4, 5], new Map([
          [0, 1000], [1, 500], [2, 200], [3, 1500], [4, 300], [5, 50]
        ]))
        
        // Play a quick hand
        machine.processPlayerAction(0, { type: 'call' })
        machine.processPlayerAction(1, { type: 'call' })
        machine.processPlayerAction(2, { type: 'fold' })
        machine.processPlayerAction(3, { type: 'fold' })
        machine.processPlayerAction(4, { type: 'fold' })
        machine.processPlayerAction(5, { type: 'fold' })
        
        // Force garbage collection occasionally
        if (hand % 20 === 0 && global.gc) {
          global.gc()
        }
      }
      
      // Force final garbage collection
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (< 50MB for 100 hands)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })
  })

  describe('Concurrency and Race Conditions', () => {
    it('should handle simultaneous action attempts gracefully', async () => {
      // Simulate multiple players trying to act simultaneously
      const currentPlayer = machine.getCurrentState().toAct!
      
      const simultaneousActions = [
        { type: 'call' },
        { type: 'raise', amount: 100 },
        { type: 'fold' }
      ] as BettingAction[]
      
      // Attempt all actions simultaneously
      const results = await Promise.allSettled(
        simultaneousActions.map(action => 
          new Promise(resolve => {
            try {
              machine.processPlayerAction(currentPlayer, action)
              resolve('success')
            } catch (error) {
              resolve('error')
            }
          })
        )
      )
      
      // Only one action should succeed
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value === 'success').length
      expect(successCount).toBe(1)
    })
  })
})
