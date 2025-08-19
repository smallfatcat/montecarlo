/**
 * Debug Integration Example
 * Shows how to integrate the debugging-enabled runtime adapter with existing systems
 */

import { createStateMachineRuntimeAdapter } from './runtimeAdapter.js'

/**
 * Example of how to integrate the state machine with existing PokerRuntime
 * This would typically be done in the server runtime table
 */
export function integrateWithExistingRuntime(existingRuntime: any) {
  console.log('🚀 [Integration] Starting state machine integration...')
  
  // Create the state machine adapter with debugging enabled
  const adapter = createStateMachineRuntimeAdapter(existingRuntime, {
    enableStateMachine: true,
    enableTimerIntegration: true,
    enablePerformanceMonitoring: true,
    defaultPlayerTimeout: 15000,
    defaultCpuTimeout: 1000,
    defaultAutoDealDelay: 2000
  })
  
  // Log initial status
  console.log('🚀 [Integration] Adapter created, checking status...')
  adapter.logCurrentState()
  
  // Example: Process a game event
  console.log('🚀 [Integration] Processing PLAYERS_READY event...')
  const result = adapter.processGameEvent({ type: 'PLAYERS_READY' })
  
  if (result) {
    console.log('🚀 [Integration] Event processed successfully:', {
      success: result.success,
      newState: result.currentState,
      timerEvents: result.timerEvents?.length || 0
    })
  }
  
  // Log updated state
  console.log('🚀 [Integration] Updated state:')
  adapter.logCurrentState()
  
  return adapter
}

/**
 * Example of how to wrap existing runtime methods to add state machine processing
 */
export function createWrappedRuntime(originalRuntime: any) {
  console.log('🚀 [Wrapper] Creating wrapped runtime with state machine...')
  
  // Create the adapter
  const adapter = createStateMachineRuntimeAdapter(originalRuntime, {
    enableStateMachine: true,
    enableTimerIntegration: true,
    enablePerformanceMonitoring: true
  })
  
  // Create a wrapped runtime that intercepts actions
  const wrappedRuntime = {
    ...originalRuntime,
    
    // Wrap the act method to process through state machine
    act: function(action: any) {
      console.log('🚀 [Wrapper] Intercepting action:', action)
      
      // Process through state machine first
      const stateMachineResult = adapter.processAction(0, action) // Assuming seat 0 for demo
      
      if (stateMachineResult) {
        console.log('🚀 [Wrapper] State machine processed action:', {
          success: stateMachineResult.success,
          error: stateMachineResult.error,
          timerEvents: stateMachineResult.timerEvents?.length || 0
        })
      }
      
      // Call original method
      const originalResult = originalRuntime.act.call(this, action)
      
      // Log final state
      adapter.logCurrentState()
      
      return originalResult
    },
    
    // Wrap the beginHand method
    beginHand: function() {
      console.log('🚀 [Wrapper] Intercepting beginHand...')
      
      // Process through state machine
      const result = adapter.processGameEvent({ type: 'START_HAND' })
      
      if (result) {
        console.log('🚀 [Wrapper] State machine processed START_HAND:', {
          success: result.success,
          newState: result.currentState
        })
      }
      
      // Call original method
      const originalResult = originalRuntime.beginHand.call(this)
      
      // Log final state
      adapter.logCurrentState()
      
      return originalResult
    },
    
    // Add state machine status methods
    getStateMachineStatus: () => adapter.getStatus(),
    getStateMachinePerformance: () => adapter.getPerformanceSummary(),
    getStateMachineTimers: () => adapter.getTimerStats(),
    logStateMachineState: () => adapter.logCurrentState(),
    setStateMachineDebug: (enabled: boolean) => adapter.setDebugMode(enabled)
  }
  
  console.log('🚀 [Wrapper] Wrapped runtime created with state machine integration')
  return wrappedRuntime
}

/**
 * Example of how to add state machine monitoring to existing runtime
 */
export function addStateMachineMonitoring(originalRuntime: any) {
  console.log('🚀 [Monitoring] Adding state machine monitoring...')
  
  // Create the adapter
  const adapter = createStateMachineRuntimeAdapter(originalRuntime, {
    enableStateMachine: true,
    enableTimerIntegration: true,
    enablePerformanceMonitoring: true
  })
  
  // Add monitoring methods to the original runtime
  originalRuntime.stateMachineAdapter = adapter
  
  // Add monitoring methods
  originalRuntime.getStateMachineStatus = () => adapter.getStatus()
  originalRuntime.getStateMachinePerformance = () => adapter.getPerformanceSummary()
  originalRuntime.getStateMachineTimers = () => adapter.getTimerStats()
  originalRuntime.logStateMachineState = () => adapter.logCurrentState()
  originalRuntime.setStateMachineDebug = (enabled: boolean) => adapter.setDebugMode(enabled)
  
  // Example: Monitor state changes
  const originalOnState = originalRuntime.cb?.onState
  if (originalOnState) {
    originalRuntime.cb.onState = (state: any) => {
      console.log('🚀 [Monitoring] Runtime state changed:', {
        status: state.status,
        handId: state.handId,
        street: state.street
      })
      
      // Log state machine state for comparison
      adapter.logCurrentState()
      
      // Call original callback
      originalOnState(state)
    }
  }
  
  console.log('🚀 [Monitoring] State machine monitoring added to runtime')
  return originalRuntime
}

// Example usage:
// const existingRuntime = getExistingPokerRuntime()
// const monitoredRuntime = addStateMachineMonitoring(existingRuntime)
// 
// // Now you can call:
// monitoredRuntime.getStateMachineStatus()
// monitoredRuntime.logStateMachineState()
// monitoredRuntime.setStateMachineDebug(true)
