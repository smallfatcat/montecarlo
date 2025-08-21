import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IntegratedPokerStateMachine } from '../../stateMachine/integratedPokerMachine'
import { TimedPokerStateMachine } from '../../stateMachine/timedPokerMachine'
import type { BettingAction } from '../../types'

/**
 * Performance and Load Testing Suite
 * Tests system performance under various load conditions
 */

describe('Performance and Load Testing', () => {
  
  describe('Throughput Benchmarks', () => {
    it('should handle high-frequency action processing', () => {
      const machine = new IntegratedPokerStateMachine([0, 1], new Map([[0, 1000], [1, 1000]]))
      const actionsPerSecond = 1000
      const testDuration = 1000 // 1 second
      
      const startTime = performance.now()
      let actionsProcessed = 0
      
      while (performance.now() - startTime < testDuration) {
        const currentState = machine.getCurrentState()
        const currentPlayer = currentState.toAct
        
        if (currentPlayer !== null) {
          try {
            machine.processPlayerAction(currentPlayer, { type: 'call' })
            actionsProcessed++
          } catch (error) {
            // Hand ended, create new machine
            machine.getCurrentState = () => new IntegratedPokerStateMachine([0, 1], new Map([[0, 1000], [1, 1000]])).getCurrentState()
          }
        }
      }
      
      const endTime = performance.now()
      const actualDuration = endTime - startTime
      const actualThroughput = (actionsProcessed / actualDuration) * 1000
      
      // Should achieve at least 500 actions per second
      expect(actualThroughput).toBeGreaterThan(500)
      
      console.log(`Performance: ${actualThroughput.toFixed(0)} actions/second`)
    })

    it('should maintain performance with multiple concurrent tables', () => {
      const tableCount = 100
      const machines: IntegratedPokerStateMachine[] = []
      
      // Create multiple tables
      for (let i = 0; i < tableCount; i++) {
        machines.push(new IntegratedPokerStateMachine(
          [0, 1, 2, 3, 4, 5], 
          new Map([[0, 1000], [1, 1000], [2, 1000], [3, 1000], [4, 1000], [5, 1000]])
        ))
      }
      
      const startTime = performance.now()
      let totalActions = 0
      
      // Process actions on all tables simultaneously
      machines.forEach((machine, tableIndex) => {
        for (let action = 0; action < 10; action++) {
          const currentState = machine.getCurrentState()
          const currentPlayer = currentState.toAct
          
          if (currentPlayer !== null) {
            try {
              machine.processPlayerAction(currentPlayer, { type: 'call' })
              totalActions++
            } catch (error) {
              // Handle end of hand
            }
          }
        }
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete all actions on 100 tables in under 1 second
      expect(duration).toBeLessThan(1000)
      
      const throughput = (totalActions / duration) * 1000
      console.log(`Multi-table performance: ${throughput.toFixed(0)} actions/second across ${tableCount} tables`)
    })
  })

  describe('Memory Usage Benchmarks', () => {
    it('should maintain stable memory usage over extended gameplay', () => {
      const initialMemory = process.memoryUsage().heapUsed
      const maxMemoryIncrease = 100 * 1024 * 1024 // 100MB limit
      
      // Simulate extended gameplay - 1000 hands
      for (let hand = 0; hand < 1000; hand++) {
        const machine = new IntegratedPokerStateMachine(
          [0, 1, 2, 3, 4, 5], 
          new Map([[0, 1000], [1, 1000], [2, 1000], [3, 1000], [4, 1000], [5, 1000]])
        )
        
        // Play quick hand with random actions
        for (let action = 0; action < 20; action++) {
          const currentState = machine.getCurrentState()
          const currentPlayer = currentState.toAct
          
          if (currentPlayer !== null) {
            const actions: BettingAction[] = [
              { type: 'call' },
              { type: 'fold' },
              { type: 'raise', amount: 50 }
            ]
            const randomAction = actions[Math.floor(Math.random() * actions.length)]
            
            try {
              machine.processPlayerAction(currentPlayer, randomAction)
            } catch (error) {
              break // Hand ended
            }
          } else {
            break // No more actions needed
          }
        }
        
        // Periodic garbage collection
        if (hand % 100 === 0 && global.gc) {
          global.gc()
        }
        
        // Check memory usage periodically
        if (hand % 100 === 0) {
          const currentMemory = process.memoryUsage().heapUsed
          const memoryIncrease = currentMemory - initialMemory
          
          // Memory should not grow excessively
          if (memoryIncrease > maxMemoryIncrease) {
            console.warn(`Memory usage increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB at hand ${hand}`)
          }
          expect(memoryIncrease).toBeLessThan(maxMemoryIncrease)
        }
      }
      
      // Final memory check
      if (global.gc) global.gc()
      const finalMemory = process.memoryUsage().heapUsed
      const totalIncrease = finalMemory - initialMemory
      
      console.log(`Memory usage after 1000 hands: +${(totalIncrease / 1024 / 1024).toFixed(2)}MB`)
      expect(totalIncrease).toBeLessThan(maxMemoryIncrease)
    })

    it('should efficiently handle large state objects', () => {
      // Create a machine with detailed state tracking
      const machine = new IntegratedPokerStateMachine([0, 1, 2, 3, 4, 5], new Map([
        [0, 1000000], [1, 1000000], [2, 1000000], [3, 1000000], [4, 1000000], [5, 1000000]
      ]))
      
      const startMemory = process.memoryUsage().heapUsed
      
      // Generate large state object through complex gameplay
      for (let i = 0; i < 100; i++) {
        const currentState = machine.getCurrentState()
        const currentPlayer = currentState.toAct
        
        if (currentPlayer !== null) {
          // Create complex action scenarios
          const complexAction: BettingAction = {
            type: 'raise',
            amount: Math.floor(Math.random() * 10000) + 1000
          }
          
          try {
            machine.processPlayerAction(currentPlayer, complexAction)
          } catch (error) {
            // Handle invalid actions gracefully
          }
        }
      }
      
      const endMemory = process.memoryUsage().heapUsed
      const stateSize = endMemory - startMemory
      
      // State should not consume excessive memory (< 10MB)
      expect(stateSize).toBeLessThan(10 * 1024 * 1024)
      
      console.log(`Complex state memory usage: ${(stateSize / 1024).toFixed(2)}KB`)
    })
  })

  describe('Timer Performance', () => {
    it('should handle many concurrent timers efficiently', async () => {
      const timerCount = 1000
      const machines: TimedPokerStateMachine[] = []
      const completedTimers: number[] = []
      
      vi.useFakeTimers()
      
      // Create multiple timed machines
      for (let i = 0; i < timerCount; i++) {
        const machine = new TimedPokerStateMachine([0, 1], new Map([[0, 1000], [1, 1000]]))
        machines.push(machine)
        
        // Start timer for each machine
        machine.startTimer({
          type: 'player_action',
          delayMs: Math.random() * 1000 + 100, // Random delay 100-1100ms
          callback: () => {
            completedTimers.push(i)
          },
          priority: 'normal'
        })
      }
      
      const startTime = performance.now()
      
      // Advance time to trigger all timers
      vi.advanceTimersByTime(2000)
      
      const endTime = performance.now()
      const processingTime = endTime - startTime
      
      // All timers should complete
      expect(completedTimers.length).toBe(timerCount)
      
      // Processing should be efficient (< 100ms for 1000 timers)
      expect(processingTime).toBeLessThan(100)
      
      console.log(`Timer performance: ${timerCount} timers processed in ${processingTime.toFixed(2)}ms`)
      
      vi.useRealTimers()
    })

    it('should maintain timer accuracy under load', async () => {
      const expectedDelays = [100, 200, 500, 1000, 2000]
      const actualDelays: number[] = []
      const startTimes: number[] = []
      
      vi.useFakeTimers()
      
      expectedDelays.forEach((delay, index) => {
        const machine = new TimedPokerStateMachine([0, 1], new Map([[0, 1000], [1, 1000]]))
        
        startTimes[index] = performance.now()
        
        machine.startTimer({
          type: 'player_action',
          delayMs: delay,
          callback: () => {
            actualDelays[index] = performance.now() - startTimes[index]
          },
          priority: 'high'
        })
      })
      
      // Advance time incrementally
      for (let time = 0; time <= 2000; time += 50) {
        vi.advanceTimersByTime(50)
      }
      
      // Check timer accuracy
      expectedDelays.forEach((expected, index) => {
        const actual = actualDelays[index]
        const tolerance = 50 // 50ms tolerance
        
        expect(Math.abs(actual - expected)).toBeLessThan(tolerance)
      })
      
      vi.useRealTimers()
    })
  })

  describe('Stress Testing', () => {
    it('should handle rapid player connections and disconnections', () => {
      const connectionCycles = 1000
      let machine = new IntegratedPokerStateMachine([], new Map())
      
      const startTime = performance.now()
      
      for (let cycle = 0; cycle < connectionCycles; cycle++) {
        // Add players
        const playerCount = Math.floor(Math.random() * 6) + 2 // 2-6 players
        const players: number[] = []
        const stacks = new Map<number, number>()
        
        for (let i = 0; i < playerCount; i++) {
          players.push(i)
          stacks.set(i, Math.floor(Math.random() * 1000) + 500)
        }
        
        // Create new machine with players
        machine = new IntegratedPokerStateMachine(players, stacks)
        
        // Play a few actions
        for (let action = 0; action < 5; action++) {
          const currentState = machine.getCurrentState()
          const currentPlayer = currentState.toAct
          
          if (currentPlayer !== null) {
            try {
              machine.processPlayerAction(currentPlayer, { type: 'call' })
            } catch (error) {
              break
            }
          }
        }
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should handle 1000 connection cycles in under 2 seconds
      expect(duration).toBeLessThan(2000)
      
      console.log(`Connection stress test: ${connectionCycles} cycles in ${duration.toFixed(2)}ms`)
    })

    it('should handle invalid input flood gracefully', () => {
      const machine = new IntegratedPokerStateMachine([0, 1, 2], new Map([[0, 1000], [1, 1000], [2, 1000]]))
      
      const invalidActions = [
        { type: 'invalid_action' },
        { type: 'raise', amount: -1000 },
        { type: 'bet', amount: Number.POSITIVE_INFINITY },
        { type: 'call', amount: 'invalid' },
        null,
        undefined,
        { type: 'fold', extraProperty: 'should not exist' }
      ] as any[]
      
      const startTime = performance.now()
      let errorsHandled = 0
      
      // Flood with invalid actions
      for (let i = 0; i < 10000; i++) {
        const invalidAction = invalidActions[i % invalidActions.length]
        const randomPlayer = Math.floor(Math.random() * 3)
        
        try {
          machine.processPlayerAction(randomPlayer, invalidAction)
        } catch (error) {
          errorsHandled++
          // Should handle errors gracefully without crashing
        }
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should handle 10000 invalid actions in under 1 second
      expect(duration).toBeLessThan(1000)
      expect(errorsHandled).toBeGreaterThan(0) // Should have caught errors
      
      // System should still be functional
      const finalState = machine.getCurrentState()
      expect(finalState).toBeDefined()
      expect(finalState.handId).toBeDefined()
      
      console.log(`Invalid input flood test: ${errorsHandled} errors handled in ${duration.toFixed(2)}ms`)
    })
  })

  describe('Resource Utilization', () => {
    it('should efficiently utilize CPU under high load', () => {
      const iterations = 100000
      const machines: IntegratedPokerStateMachine[] = []
      
      // Create multiple machines for parallel processing
      for (let i = 0; i < 10; i++) {
        machines.push(new IntegratedPokerStateMachine([0, 1, 2, 3], new Map([
          [0, 1000], [1, 1000], [2, 1000], [3, 1000]
        ])))
      }
      
      const startTime = performance.now()
      let totalOperations = 0
      
      // Distribute work across machines
      for (let i = 0; i < iterations; i++) {
        const machineIndex = i % machines.length
        const machine = machines[machineIndex]
        const currentState = machine.getCurrentState()
        const currentPlayer = currentState.toAct
        
        if (currentPlayer !== null) {
          try {
            machine.processPlayerAction(currentPlayer, { type: 'call' })
            totalOperations++
          } catch (error) {
            // Reset machine on hand end
            machines[machineIndex] = new IntegratedPokerStateMachine([0, 1, 2, 3], new Map([
              [0, 1000], [1, 1000], [2, 1000], [3, 1000]
            ]))
          }
        }
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const operationsPerSecond = (totalOperations / duration) * 1000
      
      // Should achieve high throughput (> 10000 ops/sec)
      expect(operationsPerSecond).toBeGreaterThan(10000)
      
      console.log(`CPU utilization test: ${operationsPerSecond.toFixed(0)} operations/second`)
    })

    it('should scale well with increasing complexity', () => {
      const complexityLevels = [
        { players: 2, hands: 100 },
        { players: 4, hands: 100 },
        { players: 6, hands: 100 },
        { players: 8, hands: 100 },
        { players: 10, hands: 100 }
      ]
      
      const results: { players: number; throughput: number }[] = []
      
      complexityLevels.forEach(({ players, hands }) => {
        const playerList = Array.from({ length: players }, (_, i) => i)
        const stackMap = new Map(playerList.map(p => [p, 1000]))
        
        const startTime = performance.now()
        let operations = 0
        
        for (let hand = 0; hand < hands; hand++) {
          const machine = new IntegratedPokerStateMachine(playerList, stackMap)
          
          // Play until hand ends or max actions reached
          for (let action = 0; action < players * 10; action++) {
            const currentState = machine.getCurrentState()
            const currentPlayer = currentState.toAct
            
            if (currentPlayer !== null) {
              try {
                machine.processPlayerAction(currentPlayer, { type: 'call' })
                operations++
              } catch (error) {
                break // Hand ended
              }
            } else {
              break
            }
          }
        }
        
        const endTime = performance.now()
        const duration = endTime - startTime
        const throughput = (operations / duration) * 1000
        
        results.push({ players, throughput })
        
        console.log(`${players} players: ${throughput.toFixed(0)} ops/sec`)
      })
      
      // Throughput should not degrade significantly with more players
      // (should be at least 50% of 2-player throughput at 10 players)
      const baseThroughput = results[0].throughput
      const maxPlayerThroughput = results[results.length - 1].throughput
      
      expect(maxPlayerThroughput).toBeGreaterThan(baseThroughput * 0.5)
    })
  })
})
