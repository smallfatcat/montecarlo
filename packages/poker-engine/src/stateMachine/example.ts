import { SimplePokerStateMachine } from './simplePokerMachine.js'
import type { PokerContext } from './types.js'

// Example usage of the poker state machine
export function demonstrateStateMachine(): void {
  console.log('🎰 Poker State Machine Demo')
  console.log('============================\n')
  
  // Create initial context with 3 players
  const initialContext: Partial<PokerContext> = {
    players: [
      {
        id: 0,
        isCPU: false,
        stack: 1000,
        committedThisStreet: 0,
        totalCommitted: 0,
        hasFolded: false,
        isAllIn: false,
        hole: []
      },
      {
        id: 1,
        isCPU: true,
        stack: 1000,
        committedThisStreet: 0,
        totalCommitted: 0,
        hasFolded: false,
        isAllIn: false,
        hole: []
      },
      {
        id: 2,
        isCPU: false,
        stack: 1000,
        committedThisStreet: 0,
        totalCommitted: 0,
        hasFolded: false,
        isAllIn: false,
        hole: []
      }
    ]
  }
  
  // Create the state machine
  const machine = new SimplePokerStateMachine(initialContext)
  
  console.log('Initial state:', machine.getState().type)
  console.log('Valid events:', machine.getValidEvents())
  console.log('Player count:', machine.getContext().players.length)
  console.log('')
  
  // Transition 1: Players ready
  console.log('🔄 Transition: PLAYERS_READY')
  const state1 = machine.transition({ type: 'PLAYERS_READY' })
  console.log('New state:', state1.type)
  console.log('Valid events:', machine.getValidEvents())
  console.log('')
  
  // Transition 2: Start hand
  console.log('🔄 Transition: START_HAND')
  const state2 = machine.transition({ type: 'START_HAND' })
  console.log('New state:', state2.type)
  console.log('Hand ID:', machine.getContext().currentHand?.id)
  console.log('Button position:', machine.getContext().currentHand?.buttonIndex)
  console.log('Valid events:', machine.getValidEvents())
  console.log('')
  
  // Transition 3: Complete hand
  console.log('🔄 Transition: HAND_COMPLETE')
  const state3 = machine.transition({ type: 'HAND_COMPLETE' })
  console.log('New state:', state3.type)
  console.log('Valid events:', machine.getValidEvents())
  console.log('')
  
  // Transition 4: Start next hand
  console.log('🔄 Transition: START_NEXT_HAND')
  const state4 = machine.transition({ type: 'START_NEXT_HAND' })
  console.log('New state:', state4.type)
  console.log('Hand ID:', machine.getContext().currentHand?.id)
  console.log('Button position:', machine.getContext().currentHand?.buttonIndex)
  console.log('')
  
  // Demonstrate player actions
  console.log('🎮 Player Actions Demo')
  console.log('======================')
  
  // Process a fold action
  console.log('Player 0 folds')
  machine.transition({
    type: 'PLAYER_ACTION',
    playerIndex: 0,
    action: { type: 'fold' }
  })
  
  const contextAfterFold = machine.getContext()
  console.log('Player 0 folded:', contextAfterFold.players[0].hasFolded)
  console.log('')
  
  // Process a call action
  console.log('Player 1 calls (bet to call: 10)')
  machine.getContext().betToCall = 10
  machine.transition({
    type: 'PLAYER_ACTION',
    playerIndex: 1,
    action: { type: 'call' }
  })
  
  const contextAfterCall = machine.getContext()
  console.log('Player 1 committed:', contextAfterCall.players[1].committedThisStreet)
  console.log('Player 1 stack:', contextAfterCall.players[1].stack)
  console.log('Pot:', contextAfterCall.pot)
  console.log('')
  
  // Show final state
  console.log('🏁 Final State')
  console.log('==============')
  console.log('Current state:', machine.getState().type)
  console.log('Valid events:', machine.getValidEvents())
  console.log('Player states:')
  machine.getContext().players.forEach((player, index) => {
    console.log(`  Player ${index}: ${player.hasFolded ? 'Folded' : 'Active'} (Stack: ${player.stack})`)
  })
}

// Example of invalid transitions
export function demonstrateInvalidTransitions(): void {
  console.log('\n❌ Invalid Transitions Demo')
  console.log('============================')
  
  const machine = new SimplePokerStateMachine()
  
  // Try to start a hand from idle state (should fail)
  console.log('Trying to start hand from idle state...')
  const canStartHand = machine.canTransition({ type: 'START_HAND' })
  console.log('Can start hand:', canStartHand)
  
  // Try to start a hand with not enough players (should fail)
  console.log('Trying to start hand with only 1 player...')
  const context = {
    players: [
      {
        id: 0,
        isCPU: false,
        stack: 1000,
        committedThisStreet: 0,
        totalCommitted: 0,
        hasFolded: false,
        isAllIn: false,
        hole: []
      }
    ]
  }
  
  const machine2 = new SimplePokerStateMachine(context)
  const canStartHand2 = machine2.canTransition({ type: 'START_HAND' })
  console.log('Can start hand with 1 player:', canStartHand2)
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateStateMachine()
  demonstrateInvalidTransitions()
}
