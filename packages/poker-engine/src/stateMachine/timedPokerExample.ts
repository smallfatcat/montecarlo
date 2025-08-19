/**
 * Timed Poker State Machine Example
 * Demonstrates timer integration and advanced features
 */

import { TimedPokerStateMachine } from './timedPokerMachine.js'
import type { BettingAction } from '../types.js'
import type { TimerType } from './timerTypes.js'

/**
 * Example demonstrating timer integration with poker state machine
 */
export function timedPokerExample() {
  console.log('\n=== TIMED POKER STATE MACHINE EXAMPLE ===')
  
  // Create game with 3 players
  const playerStacks = new Map([
    [0, 1000], // Player 0: 1000 chips
    [1, 1500], // Player 1: 1500 chips  
    [2, 800]   // Player 2: 800 chips
  ])
  
  // Create timer callbacks for demonstration
  const timerCallbacks = {
    onCpuAction: (playerId: number) => {
      console.log(`⏰ CPU action timer fired for player ${playerId}`)
    },
    onPlayerAction: (playerId: number) => {
      console.log(`⏰ Player action timer fired for player ${playerId} - auto-folding`)
    },
    onAutoDeal: () => {
      console.log(`⏰ Auto-deal timer fired - starting next hand`)
    },
    onWatchdog: (playerId: number) => {
      console.log(`⏰ Watchdog timer fired for player ${playerId}`)
    },
    onStreetTimeout: (street: string) => {
      console.log(`⏰ Street timeout timer fired for ${street}`)
    },
    onHandTimeout: () => {
      console.log(`⏰ Hand timeout timer fired`)
    }
  }
  
  const machine = new TimedPokerStateMachine(
    [0, 1, 2], 
    playerStacks,
    timerCallbacks,
    true,  // autoPlayEnabled
    true   // autoDealEnabled
  )
  
  console.log('Initial game state:', machine.getGameState())
  console.log('Timer stats:', machine.getTimerStats())
  
  // Set custom timeouts for players
  machine.setPlayerTimeout(0, 15000) // 15 seconds
  machine.setPlayerTimeout(1, 20000) // 20 seconds
  machine.setPlayerTimeout(2, 10000) // 10 seconds
  
  console.log('\n--- Starting Game with Timers ---')
  const gameResult = machine.processGameEvent({ type: 'PLAYERS_READY' })
  console.log('Game event result:', {
    success: gameResult.success,
    message: gameResult.message,
    timerEvents: gameResult.timerEvents,
    performance: gameResult.performance
  })
  
  console.log('\n--- Starting Hand with Timer Management ---')
  const handResult = machine.processGameEvent({ type: 'START_HAND' })
  console.log('Hand start result:', {
    success: handResult.success,
    timerEvents: handResult.timerEvents,
    performance: handResult.performance
  })
  
  console.log('Current timers:', machine.getTimerStats())
  console.log('Active timers:', Array.from(machine.getContext().activeTimers))
  
  // Simulate player actions with timer management
  console.log('\n--- Player Actions with Timer Management ---')
  
  // Player 0 calls
  console.log('Player 0 calls...')
  const action1Result = machine.processPlayerAction(0, { type: 'call' })
  console.log('Action result:', {
    success: action1Result.success,
    timerEvents: action1Result.timerEvents,
    performance: action1Result.performance
  })
  
  console.log('Timer stats after P0 action:', machine.getTimerStats())
  console.log('Active timers:', Array.from(machine.getContext().activeTimers))
  
  // Player 1 raises
  console.log('\nPlayer 1 raises to 50...')
  const action2Result = machine.processPlayerAction(1, { type: 'raise', amount: 50 })
  console.log('Action result:', {
    success: action2Result.success,
    timerEvents: action2Result.timerEvents,
    performance: action2Result.performance
  })
  
  console.log('Timer stats after P1 action:', machine.getTimerStats())
  console.log('Active timers:', Array.from(machine.getContext().activeTimers))
  
  // Player 2 folds
  console.log('\nPlayer 2 folds...')
  const action3Result = machine.processPlayerAction(2, { type: 'fold' })
  console.log('Action result:', {
    success: action3Result.success,
    timerEvents: action3Result.timerEvents,
    performance: action3Result.performance
  })
  
  console.log('Timer stats after P2 action:', machine.getTimerStats())
  console.log('Active timers:', Array.from(machine.getContext().activeTimers))
  
  // Player 0 calls the raise
  console.log('\nPlayer 0 calls the raise...')
  const action4Result = machine.processPlayerAction(0, { type: 'call' })
  console.log('Action result:', {
    success: action4Result.success,
    timerEvents: action4Result.timerEvents,
    performance: action4Result.performance
  })
  
  console.log('Timer stats after P0 call:', machine.getTimerStats())
  console.log('Active timers:', Array.from(machine.getContext().activeTimers))
  
  // Demonstrate timer management
  console.log('\n--- Timer Management Demo ---')
  
  // Check specific timer status
  console.log('Player action timer active:', machine.isTimerActive('player_action'))
  console.log('CPU action timer active:', machine.isTimerActive('cpu_action'))
  console.log('Watchdog timer active:', machine.isTimerActive('watchdog'))
  
  // Get remaining time for active timers
  const playerActionRemaining = machine.getTimerRemainingTime('player_action')
  if (playerActionRemaining > 0) {
    console.log(`Player action timer remaining: ${playerActionRemaining}ms`)
  }
  
  // Demonstrate timer cancellation
  console.log('\n--- Cancelling Timers ---')
  const cancelled = machine.cancelTimer('player_action')
  console.log('Cancelled player action timer:', cancelled)
  console.log('Timer stats after cancellation:', machine.getTimerStats())
  
  // Demonstrate auto-play toggle
  console.log('\n--- Toggling Auto-Play ---')
  machine.setAutoPlay(false)
  console.log('Auto-play disabled, all timers cancelled')
  console.log('Timer stats after disabling auto-play:', machine.getTimerStats())
  
  // Re-enable auto-play
  machine.setAutoPlay(true)
  console.log('Auto-play re-enabled, timers rearmed')
  console.log('Timer stats after re-enabling auto-play:', machine.getTimerStats())
  
  // Demonstrate auto-deal toggle
  console.log('\n--- Toggling Auto-Deal ---')
  machine.setAutoDeal(false)
  console.log('Auto-deal disabled')
  
  machine.setAutoDeal(true)
  console.log('Auto-deal re-enabled')
  
  // Get final performance summary
  console.log('\n--- Final Performance Summary ---')
  const performance = machine.getPerformanceSummary()
  console.log('Performance metrics:', performance)
  
  // Cleanup
  machine.dispose()
  console.log('Machine disposed, all timers cleared')
}

/**
 * Example demonstrating timer configuration and customization
 */
export function timerConfigurationExample() {
  console.log('\n=== TIMER CONFIGURATION EXAMPLE ===')
  
  const playerStacks = new Map([
    [0, 500],
    [1, 500]
  ])
  
  const machine = new TimedPokerStateMachine([0, 1], playerStacks)
  
  // Start custom timers
  console.log('Starting custom timers...')
  
  // Start a street timeout timer
  const streetTimerId = machine.startTimer({
    type: 'street_timeout',
    delayMs: 30000, // 30 seconds
    callback: () => console.log('⏰ Custom street timeout fired!'),
    priority: 'high'
  })
  console.log('Street timeout timer started with ID:', streetTimerId)
  
  // Start a hand timeout timer
  const handTimerId = machine.startTimer({
    type: 'hand_timeout',
    delayMs: 120000, // 2 minutes
    callback: () => console.log('⏰ Custom hand timeout fired!'),
    priority: 'normal',
    autoRestart: true,
    maxRestarts: 3
  })
  console.log('Hand timeout timer started with ID:', handTimerId)
  
  console.log('Timer stats:', machine.getTimerStats())
  console.log('Active timers:', Array.from(machine.getContext().activeTimers))
  
  // Demonstrate timer restart
  console.log('\n--- Timer Restart Demo ---')
  const restarted = machine.restartTimer('street_timeout', 15000) // 15 seconds
  console.log('Restarted street timeout timer:', restarted)
  console.log('Remaining time:', machine.getTimerRemainingTime('street_timeout'))
  
  // Demonstrate timer priority
  console.log('\n--- Timer Priority Demo ---')
  const highPriorityTimerId = machine.startTimer({
    type: 'cpu_action',
    delayMs: 5000,
    callback: () => console.log('⏰ High priority CPU timer fired!'),
    priority: 'high'
  })
  
  const lowPriorityTimerId = machine.startTimer({
    type: 'auto_deal',
    delayMs: 3000,
    callback: () => console.log('⏰ Low priority auto-deal timer fired!'),
    priority: 'low'
  })
  
  console.log('High priority timer ID:', highPriorityTimerId)
  console.log('Low priority timer ID:', lowPriorityTimerId)
  console.log('Timer stats by priority:', machine.getTimerStats().byPriority)
  
  // Cleanup
  machine.dispose()
  console.log('Machine disposed')
}

/**
 * Example demonstrating performance monitoring
 */
export function performanceMonitoringExample() {
  console.log('\n=== PERFORMANCE MONITORING EXAMPLE ===')
  
  const playerStacks = new Map([
    [0, 1000],
    [1, 1000]
  ])
  
  const machine = new TimedPokerStateMachine([0, 1], playerStacks)
  
  // Simulate multiple actions to build performance data
  console.log('Simulating multiple actions for performance data...')
  
  const actions: Array<{ playerId: number; action: BettingAction }> = [
    { playerId: 0, action: { type: 'call' } },
    { playerId: 1, action: { type: 'raise', amount: 20 } },
    { playerId: 0, action: { type: 'call' } },
    { playerId: 1, action: { type: 'check' } },
    { playerId: 0, action: { type: 'bet', amount: 30 } },
    { playerId: 1, action: { type: 'fold' } }
  ]
  
  for (const { playerId, action } of actions) {
    console.log(`Player ${playerId} ${action.type}${action.amount ? ` ${action.amount}` : ''}`)
    const result = machine.processPlayerAction(playerId, action)
    
    console.log(`  Action time: ${result.performance?.actionTime}ms`)
    console.log(`  Average action time: ${result.performance?.averageActionTime.toFixed(2)}ms`)
    console.log(`  Active timers: ${result.performance?.activeTimers}`)
  }
  
  // Get final performance summary
  console.log('\n--- Final Performance Summary ---')
  const performance = machine.getPerformanceSummary()
  console.log('Total actions processed:', performance.actionCount)
  console.log('Average action time:', performance.averageActionTime.toFixed(2), 'ms')
  console.log('Last action time:', new Date(performance.lastActionTime).toLocaleTimeString())
  console.log('Active timers:', performance.activeTimers)
  
  // Timer statistics breakdown
  console.log('\n--- Timer Statistics Breakdown ---')
  const timerStats = performance.timerStats
  console.log('Active timers:', timerStats.activeCount)
  console.log('Total timers:', timerStats.totalCount)
  console.log('By priority:', timerStats.byPriority)
  console.log('By type:', timerStats.byType)
  
  // Cleanup
  machine.dispose()
  console.log('Machine disposed')
}

/**
 * Example demonstrating error handling and validation
 */
export function errorHandlingExample() {
  console.log('\n=== ERROR HANDLING EXAMPLE ===')
  
  const playerStacks = new Map([
    [0, 1000]
  ])
  
  const machine = new TimedPokerStateMachine([0], playerStacks)
  
  // Test invalid timer configuration
  console.log('Testing invalid timer configuration...')
  
  try {
    machine.startTimer({
      type: 'player_action',
      delayMs: -1000, // Invalid negative delay
      callback: () => console.log('This should not execute'),
      priority: 'normal'
    })
  } catch (error) {
    console.log('✅ Caught invalid timer config error:', (error as Error).message)
  }
  
  try {
    machine.startTimer({
      type: 'player_action',
      delayMs: 400000, // Invalid delay > 5 minutes
      callback: () => console.log('This should not execute'),
      priority: 'normal'
    })
  } catch (error) {
    console.log('✅ Caught excessive delay error:', (error as Error).message)
  }
  
  // Test invalid player actions
  console.log('\nTesting invalid player actions...')
  
  // Try to act when it's not your turn
  const invalidResult = machine.processPlayerAction(1, { type: 'call' })
  console.log('Invalid player action result:', {
    success: invalidResult.success,
    error: invalidResult.error
  })
  
  // Test timer cancellation for non-existent timer
  console.log('\nTesting timer cancellation...')
  const cancelled = machine.cancelTimer('non_existent_timer' as any)
  console.log('Cancelled non-existent timer:', cancelled)
  
  // Cleanup
  machine.dispose()
  console.log('Machine disposed')
}

// Run examples if called directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('timedPokerExample')) {
  timedPokerExample()
  timerConfigurationExample()
  performanceMonitoringExample()
  errorHandlingExample()
}
