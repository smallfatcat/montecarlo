# State Machine Integration Guide

This guide shows you how to add temporary debugging to trace the new state machine in operation with your existing PokerRuntime.

## 🔧 **Quick Integration (Recommended)**

The easiest way to add state machine debugging is to use the `addStateMachineMonitoring` function:

```typescript
import { addStateMachineMonitoring } from '@montecarlo/poker-engine/stateMachine'

// In your server runtime table creation
export function createServerRuntimeTable(io: SocketIOServer, tableId: TableId, opts?: { seats?: number; startingStack?: number; onSummaryChange?: (summary: any) => void; disconnectGraceMs?: number; public?: boolean }) {
  // ... existing code ...
  
  // Create the runtime as usual
  const runtime = new PokerRuntime(runtimeOpts, runtimeCallbacks)
  
  // Add state machine monitoring (this adds debugging automatically)
  const monitoredRuntime = addStateMachineMonitoring(runtime)
  
  // ... rest of your existing code ...
  
  return {
    // ... existing return object ...
    runtime: monitoredRuntime, // Use the monitored version
  }
}
```

## 🚀 **What You'll See in the Console**

With debugging enabled, you'll see logs like:

```
🔧 [StateMachine] Adapter created with options: {
  enableStateMachine: true,
  enableTimerIntegration: true,
  enablePerformanceMonitoring: true
}

🔧 [StateMachine] Initializing with runtime state: {
  status: 'idle',
  handId: 0,
  street: null,
  currentToAct: null,
  seatsCount: 6
}

🔧 [StateMachine] Extracted player info: {
  playerIds: [0, 1, 2, 3, 4, 5],
  playerStacks: { '0': 1000, '1': 1000, '2': 1000, '3': 1000, '4': 1000, '5': 1000 }
}

🔧 [StateMachine] State machine initialized successfully

🔧 [StateMachine] Syncing runtime state to state machine: {
  status: 'idle',
  handId: 0,
  street: null
}

🔧 [StateMachine] Sending PLAYERS_READY event
```

## 📊 **Monitoring State Machine Operations**

Once integrated, you can monitor the state machine in real-time:

```typescript
// Get current status
const status = runtime.getStateMachineStatus()
console.log('State Machine Status:', status)

// Log current state
runtime.logStateMachineState()

// Get performance metrics
const performance = runtime.getStateMachinePerformance()
console.log('Performance:', performance)

// Get timer statistics
const timers = runtime.getStateMachineTimers()
console.log('Timers:', timers)

// Toggle debug mode on/off
runtime.setStateMachineDebug(false) // Disable debug logging
runtime.setStateMachineDebug(true)  // Re-enable debug logging
```

## 🔍 **Debug Output Examples**

### **Action Processing**
```
🔧 [StateMachine] Processing action: {
  seatIndex: 0,
  action: { type: 'call' },
  currentState: { type: 'hand_in_progress' },
  handState: { type: 'betting_round', street: 'preflop', currentPlayer: 0, actionRequired: true }
}

🔧 [StateMachine] Action processed successfully: {
  success: true,
  error: undefined,
  newState: { type: 'hand_in_progress' },
  timerEvents: 2,
  performance: { actionTime: 5, averageActionTime: 3.2, activeTimers: 1 }
}
```

### **Game Events**
```
🔧 [StateMachine] Processing game event: {
  type: 'START_HAND'
}

🔧 [StateMachine] Game event processed successfully: {
  success: true,
  error: undefined,
  newState: { type: 'hand_in_progress' },
  timerEvents: 1,
  performance: { actionTime: 8, averageActionTime: 4.1, activeTimers: 1 }
}
```

### **State Synchronization**
```
🔧 [StateMachine] Syncing state machine state to runtime: {
  gameState: 'hand_in_progress',
  handState: 'betting_round',
  runtimeStatus: 'in_hand'
}

🔧 [StateMachine] Updating runtime to in_hand status with street: preflop
```

## 🛠️ **Advanced Integration Options**

### **Option 1: Wrapped Runtime (Full Control)**
```typescript
import { createWrappedRuntime } from '@montecarlo/poker-engine/stateMachine'

const wrappedRuntime = createWrappedRuntime(originalRuntime)
// This wraps all methods and adds full state machine processing
```

### **Option 2: Direct Adapter (Manual Control)**
```typescript
import { createStateMachineRuntimeAdapter } from '@montecarlo/poker-engine/stateMachine'

const adapter = createStateMachineRuntimeAdapter(originalRuntime, {
  enableStateMachine: true,
  enableTimerIntegration: true,
  enablePerformanceMonitoring: true
})

// Manual processing
adapter.processGameEvent({ type: 'PLAYERS_READY' })
adapter.processAction(0, { type: 'call' })
```

## 📋 **Integration Checklist**

- [ ] Import the state machine monitoring function
- [ ] Apply monitoring to your existing runtime
- [ ] Check console for initialization logs
- [ ] Verify state machine is processing events
- [ ] Monitor performance and timer statistics
- [ ] Test with real game actions

## 🚨 **Troubleshooting**

### **No Debug Output?**
- Check that `enableStateMachine: true` is set
- Verify the adapter is created successfully
- Look for any error messages in the console

### **State Machine Not Processing Actions?**
- Ensure the runtime state is properly initialized
- Check that player IDs and stacks are extracted correctly
- Verify the state machine is enabled

### **Performance Issues?**
- Monitor the performance metrics in real-time
- Check timer statistics for any bottlenecks
- Use `setStateMachineDebug(false)` to reduce logging overhead

## 🎯 **Next Steps**

1. **Test the Integration**: Start a game and watch the debug output
2. **Monitor Performance**: Check action processing times and timer usage
3. **Verify State Sync**: Ensure runtime and state machine states match
4. **Customize Debugging**: Adjust debug levels based on your needs
5. **Production Ready**: Once satisfied, disable debug mode for production

## 📞 **Need Help?**

If you encounter issues:
1. Check the console for error messages
2. Verify all imports are correct
3. Ensure the runtime state is properly initialized
4. Use `runtime.logStateMachineState()` to inspect current state

The state machine is now ready to provide comprehensive debugging and monitoring of your poker game operations! 🎰⏰
