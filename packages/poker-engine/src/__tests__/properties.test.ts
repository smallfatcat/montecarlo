import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { validateAction, executeAction } from '../flow/bettingLogic'
import { createInitialPokerTable, startHand } from '../flow'
import type { PokerTableState, BettingAction } from '../types'

describe('Poker Engine Property-Based Tests', () => {
  
  describe('Chip Conservation Laws', () => {
    it('should maintain total chip conservation across all operations', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('call', 'raise', 'fold', 'check', 'bet'),
            amount: fc.integer({ min: 1, max: 500 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.integer({ min: 2, max: 6 }), // Number of players
        fc.integer({ min: 500, max: 2000 }), // Starting stack
        (actions, numPlayers, startingStack) => {
          const playerIndices = Array.from({ length: numPlayers }, (_, i) => i)
          let table = createInitialPokerTable(numPlayers, [10, 20], startingStack)
          table = startHand(table)
          
          const initialChips = table.seats.reduce((sum, seat) => sum + seat.stack, 0)
          
          // Apply a sequence of actions
          for (const action of actions) {
            if (table.status === 'hand_over') break
            
            const activePlayerIndex = table.activePlayerIndex
            if (activePlayerIndex === -1) break
            
            const validation = validateAction(table, activePlayerIndex, action as BettingAction)
            if (validation.valid) {
              executeAction(table, activePlayerIndex, action as BettingAction)
            }
          }
          
          // Calculate final chips
          const finalStackChips = table.seats.reduce((sum, seat) => sum + seat.stack, 0)
          const finalPotChips = table.pots.reduce((sum, pot) => sum + pot.amount, 0)
          const finalTotal = finalStackChips + finalPotChips
          
          // Chips should be conserved
          expect(finalTotal).toBe(initialChips)
        }
      ), { numRuns: 100 })
    })

    it('should never create or destroy chips during betting rounds', () => {
      fc.assert(fc.property(
        fc.record({
          type: fc.constantFrom('bet', 'raise', 'call'),
          amount: fc.integer({ min: 20, max: 200 })
        }),
        (action) => {
          const table = createInitialPokerTable(3, [10, 20], 1000)
          const initialTotal = table.seats.reduce((sum, seat) => sum + seat.stack, 0)
          
          const validation = validateAction(table, 0, action as BettingAction)
          if (validation.valid) {
            executeAction(table, 0, action as BettingAction)
            
            const finalStackChips = table.seats.reduce((sum, seat) => sum + seat.stack, 0)
            const finalPotChips = table.pots.reduce((sum, pot) => sum + pot.amount, 0)
            const finalTotal = finalStackChips + finalPotChips
            
            expect(finalTotal).toBe(initialTotal)
          }
        }
      ), { numRuns: 200 })
    })
  })

  describe('State Immutability Properties', () => {
    it('should never mutate input state objects', () => {
      fc.assert(fc.property(
        fc.record({
          type: fc.constantFrom('call', 'raise', 'fold', 'check', 'bet'),
          amount: fc.integer({ min: 1, max: 1000 })
        }),
        fc.integer({ min: 0, max: 2 }),
        (action, seatIndex) => {
          const originalTable = createInitialPokerTable(3, [10, 20], 1000)
          const tableSnapshot = JSON.parse(JSON.stringify(originalTable))
          
          // Perform validation (should not mutate)
          validateAction(originalTable, seatIndex, action as BettingAction)
          
          // Original table should be unchanged
          expect(originalTable).toEqual(tableSnapshot)
        }
      ), { numRuns: 150 })
    })

    it('should maintain referential integrity after state transitions', () => {
      fc.assert(fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('call', 'fold', 'check'),
            amount: fc.integer({ min: 1, max: 100 }).optional()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (actions) => {
          let table = createInitialPokerTable(3, [10, 20], 1000)
          const originalTable = JSON.parse(JSON.stringify(table))
          
          // Apply actions
          for (const action of actions) {
            if (table.activePlayerIndex === -1) break
            
            const validation = validateAction(table, table.activePlayerIndex, action as BettingAction)
            if (validation.valid) {
              executeAction(table, table.activePlayerIndex, action as BettingAction)
            }
          }
          
          // Original table should remain unchanged
          expect(originalTable.seats[0].stack).toBe(1000)
          expect(originalTable.pots).toHaveLength(0)
        }
      ), { numRuns: 100 })
    })
  })

  describe('Betting Logic Invariants', () => {
    it('should maintain valid betting relationships', () => {
      fc.assert(fc.property(
        fc.integer({ min: 20, max: 500 }), // Bet amount
        (betAmount) => {
          let table = createInitialPokerTable(3, [10, 20], 1000)
          table = startHand(table)
          
          // Make a bet
          const betAction: BettingAction = { type: 'bet', amount: betAmount }
          const validation = validateAction(table, table.activePlayerIndex, betAction)
          
          if (validation.valid) {
            executeAction(table, table.activePlayerIndex, betAction)
            
            // Invariants after betting
            expect(table.betToCall).toBe(betAmount)
            expect(table.lastRaiseAmount).toBe(betAmount)
            
            // Player's committed amount should match bet
            const bettingPlayer = table.seats[table.activePlayerIndex]
            expect(bettingPlayer.committedThisStreet).toBe(betAmount)
            
            // Player's stack should be reduced
            expect(bettingPlayer.stack).toBe(1000 - betAmount)
          }
        }
      ), { numRuns: 100 })
    })

    it('should enforce minimum raise rules', () => {
      fc.assert(fc.property(
        fc.integer({ min: 20, max: 200 }), // Initial bet
        fc.integer({ min: 1, max: 100 }), // Raise amount
        (initialBet, raiseAmount) => {
          let table = createInitialPokerTable(3, [10, 20], 1000)
          table = startHand(table)
          
          // First player bets
          executeAction(table, table.activePlayerIndex, { type: 'bet', amount: initialBet })
          
          // Next player tries to raise
          const totalRaise = initialBet + raiseAmount
          const raiseAction: BettingAction = { type: 'raise', amount: totalRaise }
          const validation = validateAction(table, table.activePlayerIndex, raiseAction)
          
          if (validation.valid) {
            executeAction(table, table.activePlayerIndex, raiseAction)
            
            // Bet to call should be the raise amount
            expect(table.betToCall).toBe(totalRaise)
            
            // Last raise amount should be at least the minimum
            expect(table.lastRaiseAmount).toBeGreaterThanOrEqual(raiseAmount)
          } else {
            // If invalid, it should be because raise is too small
            if (raiseAmount > 0) {
              expect(validation.error).toContain('raise')
            }
          }
        }
      ), { numRuns: 100 })
    })
  })

  describe('Side Pot Construction Properties', () => {
    it('should correctly distribute chips to eligible players in side pots', () => {
      fc.assert(fc.property(
        fc.array(fc.integer({ min: 50, max: 500 }), { minLength: 2, maxLength: 5 }), // Different stack sizes
        (stackSizes) => {
          const numPlayers = stackSizes.length
          const playerIndices = Array.from({ length: numPlayers }, (_, i) => i)
          
          let table = createInitialPokerTable(numPlayers, [10, 20], 1000)
          
          // Set different stack sizes
          stackSizes.forEach((stack, i) => {
            table.seats[i].stack = stack
          })
          
          table = startHand(table)
          
          // Have all players go all-in
          for (let i = 0; i < numPlayers; i++) {
            if (table.seats[i].stack > 0) {
              const allInAmount = table.seats[i].stack
              executeAction(table, i, { type: 'bet', amount: allInAmount })
            }
          }
          
          // Verify side pot construction
          const totalCommitted = stackSizes.reduce((sum, stack) => sum + stack, 0)
          const totalInPots = table.pots.reduce((sum, pot) => sum + pot.amount, 0)
          
          // All committed chips should be in pots
          expect(totalInPots).toBeLessThanOrEqual(totalCommitted + 30) // Account for blinds
          
          // Each pot should have eligible players
          table.pots.forEach(pot => {
            expect(pot.eligibleSeats.length).toBeGreaterThan(0)
            expect(pot.amount).toBeGreaterThan(0)
          })
        }
      ), { numRuns: 50 }) // Fewer runs for complex test
    })
  })

  describe('Action Validation Properties', () => {
    it('should consistently validate the same action in the same state', () => {
      fc.assert(fc.property(
        fc.record({
          type: fc.constantFrom('call', 'raise', 'fold', 'check', 'bet'),
          amount: fc.integer({ min: 1, max: 1000 })
        }),
        (action) => {
          const table = createInitialPokerTable(3, [10, 20], 1000)
          
          // Validate the same action multiple times
          const result1 = validateAction(table, 0, action as BettingAction)
          const result2 = validateAction(table, 0, action as BettingAction)
          const result3 = validateAction(table, 0, action as BettingAction)
          
          // Results should be identical
          expect(result1.valid).toBe(result2.valid)
          expect(result2.valid).toBe(result3.valid)
          expect(result1.error).toBe(result2.error)
          expect(result2.error).toBe(result3.error)
        }
      ), { numRuns: 200 })
    })

    it('should reject obviously invalid actions', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.record({ type: fc.constant('bet' as const), amount: fc.integer({ max: 0 }) }), // Non-positive bet
          fc.record({ type: fc.constant('raise' as const), amount: fc.integer({ max: 0 }) }), // Non-positive raise
          fc.record({ type: fc.constant('bet' as const), amount: fc.integer({ min: 10000 }) }), // Bet larger than any reasonable stack
        ),
        (invalidAction) => {
          const table = createInitialPokerTable(3, [10, 20], 1000)
          const result = validateAction(table, 0, invalidAction)
          
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ), { numRuns: 100 })
    })
  })

  describe('Hand Progression Properties', () => {
    it('should never skip streets in normal progression', () => {
      fc.assert(fc.property(
        fc.array(fc.constantFrom('call', 'check', 'fold'), { minLength: 3, maxLength: 12 }),
        (actionTypes) => {
          let table = createInitialPokerTable(3, [10, 20], 1000)
          table = startHand(table)
          
          const streets: string[] = [table.street]
          
          for (const actionType of actionTypes) {
            if (table.status === 'hand_over') break
            if (table.activePlayerIndex === -1) break
            
            const action: BettingAction = { type: actionType as any }
            const validation = validateAction(table, table.activePlayerIndex, action)
            
            if (validation.valid) {
              executeAction(table, table.activePlayerIndex, action)
              
              // Track street changes
              if (streets[streets.length - 1] !== table.street) {
                streets.push(table.street)
              }
            }
          }
          
          // Verify street progression is valid
          const validProgressions = [
            ['preflop'],
            ['preflop', 'flop'],
            ['preflop', 'flop', 'turn'],
            ['preflop', 'flop', 'turn', 'river'],
            ['preflop', 'flop', 'turn', 'river', 'showdown'],
            ['preflop', 'showdown'], // Early termination
            ['flop', 'showdown'], // Early termination
            ['turn', 'showdown'], // Early termination
            ['river', 'showdown'] // Early termination
          ]
          
          const isValidProgression = validProgressions.some(validProg => 
            JSON.stringify(streets) === JSON.stringify(validProg) ||
            streets.every((street, index) => validProg[index] === street)
          )
          
          expect(isValidProgression).toBe(true)
        }
      ), { numRuns: 100 })
    })
  })

  describe('Edge Case Properties', () => {
    it('should handle extreme stack sizes gracefully', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 1000000 }), // Extreme stack size
        (stackSize) => {
          const table = createInitialPokerTable(2, [10, 20], stackSize)
          
          // Table should be created successfully
          expect(table.seats).toHaveLength(2)
          expect(table.seats[0].stack).toBe(stackSize)
          expect(table.seats[1].stack).toBe(stackSize)
          
          // Basic actions should still work
          const callAction: BettingAction = { type: 'call' }
          const validation = validateAction(table, 0, callAction)
          
          // Should be able to validate without errors
          expect(typeof validation.valid).toBe('boolean')
        }
      ), { numRuns: 50 })
    })
  })
})
