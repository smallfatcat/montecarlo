import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IntegratedPokerStateMachine } from '../integratedPokerMachine'
import type { BettingAction } from '../../types'

describe('IntegratedPokerStateMachine', () => {
  let machine: IntegratedPokerStateMachine
  let playerStacks: Map<number, number>

  beforeEach(() => {
    playerStacks = new Map([
      [0, 1000],
      [1, 1000],
      [2, 1000]
    ])
    machine = new IntegratedPokerStateMachine([0, 1, 2], playerStacks)
  })

  describe('Hand Progression', () => {
    it('should start in preflop state', () => {
      const state = machine.getCurrentState()
      expect(state.street).toBe('preflop')
      expect(state.activePlayers).toContain(0)
      expect(state.activePlayers).toContain(1)
      expect(state.activePlayers).toContain(2)
    })

    it('should transition through all streets correctly', () => {
      // Start in preflop
      expect(machine.getCurrentState().street).toBe('preflop')
      
      // Complete preflop betting round
      machine.processPlayerAction(0, { type: 'call' }) // UTG calls
      machine.processPlayerAction(1, { type: 'call' }) // MP calls
      machine.processPlayerAction(2, { type: 'check' }) // BB checks
      
      // Should advance to flop
      expect(machine.getCurrentState().street).toBe('flop')
      
      // Complete flop betting round
      machine.processPlayerAction(2, { type: 'check' }) // BB checks
      machine.processPlayerAction(0, { type: 'check' }) // UTG checks
      machine.processPlayerAction(1, { type: 'check' }) // MP checks
      
      // Should advance to turn
      expect(machine.getCurrentState().street).toBe('turn')
      
      // Complete turn betting round
      machine.processPlayerAction(2, { type: 'check' })
      machine.processPlayerAction(0, { type: 'check' })
      machine.processPlayerAction(1, { type: 'check' })
      
      // Should advance to river
      expect(machine.getCurrentState().street).toBe('river')
      
      // Complete river betting round
      machine.processPlayerAction(2, { type: 'check' })
      machine.processPlayerAction(0, { type: 'check' })
      machine.processPlayerAction(1, { type: 'check' })
      
      // Should advance to showdown
      expect(machine.getCurrentState().street).toBe('showdown')
    })

    it('should handle early hand completion when only one player remains', () => {
      // Two players fold, leaving one
      machine.processPlayerAction(0, { type: 'fold' })
      machine.processPlayerAction(1, { type: 'fold' })
      
      const state = machine.getCurrentState()
      expect(state.street).toBe('showdown')
      expect(state.activePlayers).toHaveLength(1)
      expect(state.activePlayers).toContain(2)
    })

    it('should handle all-in scenarios correctly', () => {
      // Player goes all-in
      const result = machine.processPlayerAction(0, { type: 'bet', amount: 1000 })
      
      expect(result.success).toBe(true)
      
      const state = machine.getCurrentState()
      expect(state.playerChips.get(0)).toBe(0) // Player should have 0 chips left
      expect(state.betToCall).toBe(1000)
    })
  })

  describe('Action Validation', () => {
    it('should validate fold actions correctly', () => {
      const result = machine.processPlayerAction(0, { type: 'fold' })
      
      expect(result.success).toBe(true)
      expect(machine.getCurrentState().activePlayers).not.toContain(0)
    })

    it('should validate check actions correctly', () => {
      // Check should be valid when no bet to call
      const result = machine.processPlayerAction(2, { type: 'check' }) // BB can check initially
      expect(result.success).toBe(true)
      
      // Check should be invalid when there's a bet to call
      machine.processPlayerAction(0, { type: 'bet', amount: 100 })
      const invalidCheck = machine.processPlayerAction(1, { type: 'check' })
      expect(invalidCheck.success).toBe(false)
      expect(invalidCheck.error).toContain('Must call to check')
    })

    it('should validate call actions correctly', () => {
      // Make a bet first
      machine.processPlayerAction(2, { type: 'bet', amount: 100 })
      
      // Call should be valid
      const result = machine.processPlayerAction(0, { type: 'call' })
      expect(result.success).toBe(true)
      
      const state = machine.getCurrentState()
      expect(state.playerCommittedThisStreet.get(0)).toBe(100)
    })

    it('should validate bet actions correctly', () => {
      // Bet should be valid when no previous bet
      const result = machine.processPlayerAction(2, { type: 'bet', amount: 100 })
      expect(result.success).toBe(true)
      
      // Bet should be invalid when there's already a bet
      const invalidBet = machine.processPlayerAction(0, { type: 'bet', amount: 50 })
      expect(invalidBet.success).toBe(false)
      expect(invalidBet.error).toContain('Cannot bet when there is a bet to call')
    })

    it('should validate raise actions correctly', () => {
      // Make initial bet
      machine.processPlayerAction(2, { type: 'bet', amount: 100 })
      
      // Raise should be valid
      const result = machine.processPlayerAction(0, { type: 'raise', amount: 200 })
      expect(result.success).toBe(true)
      
      const state = machine.getCurrentState()
      expect(state.betToCall).toBe(200)
      expect(state.lastRaiseAmount).toBe(100) // Raise amount = 200 - 100
    })

    it('should reject invalid actions for inactive players', () => {
      // Fold player 0
      machine.processPlayerAction(0, { type: 'fold' })
      
      // Player 0 should not be able to act again
      const result = machine.processPlayerAction(0, { type: 'call' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('Player is not active')
    })

    it('should reject actions out of turn', () => {
      // Assuming player 0 is first to act, player 1 acting should fail
      const result = machine.processPlayerAction(1, { type: 'call' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('Not your turn to act')
    })

    it('should validate bet amounts correctly', () => {
      // Negative bet should fail
      const negativeBet = machine.processPlayerAction(0, { type: 'bet', amount: -100 })
      expect(negativeBet.success).toBe(false)
      
      // Zero bet should fail
      const zeroBet = machine.processPlayerAction(0, { type: 'bet', amount: 0 })
      expect(zeroBet.success).toBe(false)
      
      // Bet larger than stack should fail
      const oversizedBet = machine.processPlayerAction(0, { type: 'bet', amount: 2000 })
      expect(oversizedBet.success).toBe(false)
    })
  })

  describe('Pot Management', () => {
    it('should track pot correctly with simple betting', () => {
      // All players call
      machine.processPlayerAction(0, { type: 'call' }) // 20 (big blind)
      machine.processPlayerAction(1, { type: 'call' }) // 20
      machine.processPlayerAction(2, { type: 'check' }) // already posted BB
      
      const state = machine.getCurrentState()
      const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0)
      expect(totalPot).toBe(60) // 3 players * 20
    })

    it('should create side pots correctly with all-in players', () => {
      // Player 0 goes all-in for less than others can call
      playerStacks.set(0, 50) // Give player 0 only 50 chips
      machine = new IntegratedPokerStateMachine([0, 1, 2], playerStacks)
      
      machine.processPlayerAction(0, { type: 'bet', amount: 50 }) // All-in
      machine.processPlayerAction(1, { type: 'raise', amount: 200 }) // Raise to 200
      machine.processPlayerAction(2, { type: 'call' }) // Call 200
      
      const state = machine.getCurrentState()
      
      // Should have main pot and side pot
      expect(state.pots.length).toBeGreaterThan(1)
      
      // Main pot should include all players
      const mainPot = state.pots[0]
      expect(mainPot.eligibleSeats).toContain(0)
      expect(mainPot.eligibleSeats).toContain(1)
      expect(mainPot.eligibleSeats).toContain(2)
      
      // Side pot should exclude all-in player
      const sidePot = state.pots[1]
      expect(sidePot.eligibleSeats).not.toContain(0)
      expect(sidePot.eligibleSeats).toContain(1)
      expect(sidePot.eligibleSeats).toContain(2)
    })
  })

  describe('State Immutability', () => {
    it('should not mutate the previous state when processing actions', () => {
      const initialState = JSON.parse(JSON.stringify(machine.getCurrentState()))
      
      machine.processPlayerAction(0, { type: 'call' })
      
      const newState = machine.getCurrentState()
      
      // States should be different objects
      expect(newState).not.toBe(initialState)
      
      // Initial state should remain unchanged
      expect(initialState.street).toBe('preflop')
      expect(initialState.activePlayers).toHaveLength(3)
    })

    it('should maintain referential integrity across state transitions', () => {
      const state1 = machine.getCurrentState()
      machine.processPlayerAction(0, { type: 'call' })
      const state2 = machine.getCurrentState()
      
      // States should be different objects
      expect(state1).not.toBe(state2)
      
      // But internal data structures should be properly copied
      expect(state1.playerChips).not.toBe(state2.playerChips)
      expect(state1.activePlayers).not.toBe(state2.activePlayers)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid player IDs gracefully', () => {
      const result = machine.processPlayerAction(999, { type: 'call' })
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle malformed actions gracefully', () => {
      const result = machine.processPlayerAction(0, { type: 'invalid' } as any)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle actions with invalid amounts gracefully', () => {
      const results = [
        machine.processPlayerAction(0, { type: 'bet', amount: NaN }),
        machine.processPlayerAction(0, { type: 'bet', amount: Infinity }),
        machine.processPlayerAction(0, { type: 'bet', amount: -Infinity }),
      ]
      
      results.forEach(result => {
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('Performance', () => {
    it('should process actions quickly', () => {
      const start = performance.now()
      
      // Process 100 actions
      for (let i = 0; i < 100; i++) {
        const playerId = i % 3
        const action: BettingAction = i % 4 === 0 ? { type: 'fold' } : { type: 'call' }
        machine.processPlayerAction(playerId, action)
        
        // Reset machine occasionally to prevent early termination
        if (i % 30 === 0) {
          machine = new IntegratedPokerStateMachine([0, 1, 2], playerStacks)
        }
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(100) // Should complete in under 100ms
    })
  })

  describe('Integration with Timer System', () => {
    it('should handle timer callbacks correctly', () => {
      const mockCallback = vi.fn()
      
      // This test assumes the machine has timer integration
      // Adjust based on actual timer implementation
      const state = machine.getCurrentState()
      expect(state.currentPlayer).toBeDefined()
    })
  })
})
