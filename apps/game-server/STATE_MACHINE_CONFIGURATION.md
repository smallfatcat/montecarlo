# 🎛️ State Machine Configuration Guide

## 🔧 **Configuration Options**

The state machine monitoring can now be configured when creating server runtime tables. Here are all the available options:

### **Basic Configuration Structure:**

```typescript
const table = createServerRuntimeTable(io, 'my-table', {
  seats: 6,
  startingStack: 1000,
  // State Machine configuration
  stateMachine: {
    enabled: true,                    // Enable/disable state machine monitoring
    debugMode: true,                  // Enable/disable debug logging
    enableTimerIntegration: true,     // Enable/disable timer integration
    enablePerformanceMonitoring: true // Enable/disable performance monitoring
  }
})
```

## 📋 **Configuration Options Explained**

### **1. `enabled` (boolean)**
- **Default**: `true`
- **Purpose**: Master switch for state machine monitoring
- **Effect**: When `false`, no state machine monitoring is added

```typescript
// Disable state machine monitoring entirely
stateMachine: {
  enabled: false
}
```

### **2. `debugMode` (boolean)**
- **Default**: `true`
- **Purpose**: Controls console debug output
- **Effect**: When `false`, reduces console noise but maintains monitoring

```typescript
// Production mode - minimal logging
stateMachine: {
  enabled: true,
  debugMode: false  // Reduces console output
}
```

### **3. `enableTimerIntegration` (boolean)**
- **Default**: `true`
- **Purpose**: Enables timer management and CPU action handling
- **Effect**: When `false`, disables automatic timer management

```typescript
// Disable timer integration
stateMachine: {
  enabled: true,
  enableTimerIntegration: false
}
```

### **4. `enablePerformanceMonitoring` (boolean)**
- **Default**: `true`
- **Purpose**: Tracks action processing times and performance metrics
- **Effect**: When `false`, disables performance tracking

```typescript
// Disable performance monitoring
stateMachine: {
  enabled: true,
  enablePerformanceMonitoring: false
}
```

## 🚀 **Configuration Presets**

### **Preset 1: Full Debugging (Default)**
```typescript
stateMachine: {
  enabled: true,
  debugMode: true,
  enableTimerIntegration: true,
  enablePerformanceMonitoring: true
}
```
**Use Case**: Development, debugging, testing
**Console Output**: Full debug information, performance metrics, timer details

### **Preset 2: Production Mode**
```typescript
stateMachine: {
  enabled: true,
  debugMode: false,        // Reduce console noise
  enableTimerIntegration: true,
  enablePerformanceMonitoring: false  // Disable performance tracking
}
```
**Use Case**: Production environment, performance critical
**Console Output**: Minimal logging, no performance overhead

### **Preset 3: Timer Only**
```typescript
stateMachine: {
  enabled: true,
  debugMode: false,
  enableTimerIntegration: true,
  enablePerformanceMonitoring: false
}
```
**Use Case**: Need timer management without debugging
**Console Output**: Timer events only, minimal logging

### **Preset 4: Monitoring Only**
```typescript
stateMachine: {
  enabled: true,
  debugMode: false,
  enableTimerIntegration: false,
  enablePerformanceMonitoring: true
}
```
**Use Case**: Performance analysis without timer integration
**Console Output**: Performance metrics only

### **Preset 5: Completely Disabled**
```typescript
stateMachine: {
  enabled: false
}
```
**Use Case**: No state machine monitoring needed
**Console Output**: None

## 🔍 **Runtime Control**

Even after configuration, you can control debugging at runtime:

```typescript
// Get table instance
const table = createServerRuntimeTable(io, 'my-table', options)

// Runtime control methods
table.setStateMachineDebug(true)   // Enable debug logging
table.setStateMachineDebug(false)  // Disable debug logging

// Check current status
const status = table.getStateMachineStatus()
console.log('Debug mode:', status?.debugMode)
```

## 📊 **Configuration Examples**

### **Example 1: Development Environment**
```typescript
const devTable = createServerRuntimeTable(io, 'dev-table', {
  seats: 6,
  startingStack: 1000,
  stateMachine: {
    enabled: true,
    debugMode: true,        // Full debugging
    enableTimerIntegration: true,
    enablePerformanceMonitoring: true
  }
})
```

### **Example 2: Production Environment**
```typescript
const prodTable = createServerRuntimeTable(io, 'prod-table', {
  seats: 6,
  startingStack: 1000,
  stateMachine: {
    enabled: true,
    debugMode: false,       // Minimal logging
    enableTimerIntegration: true,
    enablePerformanceMonitoring: false  // No performance overhead
  }
})
```

### **Example 3: Performance Testing**
```typescript
const perfTable = createServerRuntimeTable(io, 'perf-table', {
  seats: 6,
  startingStack: 1000,
  stateMachine: {
    enabled: true,
    debugMode: false,       // No debug noise
    enableTimerIntegration: false,     // No timer overhead
    enablePerformanceMonitoring: true  // Focus on performance
  }
})
```

### **Example 4: Disabled**
```typescript
const simpleTable = createServerRuntimeTable(io, 'simple-table', {
  seats: 6,
  startingStack: 1000
  // No stateMachine config = uses defaults (all enabled)
})
```

## 🎯 **When to Use Each Configuration**

### **Use Full Debugging When:**
- Developing new features
- Debugging game logic issues
- Testing state machine integration
- Learning how the system works

### **Use Production Mode When:**
- Running in production
- Performance is critical
- Console noise should be minimal
- Still need timer integration

### **Use Timer Only When:**
- Need automatic CPU actions
- Don't need debugging output
- Don't need performance metrics

### **Use Monitoring Only When:**
- Analyzing performance
- Debugging performance issues
- Don't need timer integration

### **Disable Completely When:**
- No monitoring needed
- Maximum performance required
- Running in resource-constrained environments

## 🔧 **Environment-Based Configuration**

### **Development Environment:**
```typescript
const isDev = process.env.NODE_ENV === 'development'

const table = createServerRuntimeTable(io, 'my-table', {
  seats: 6,
  startingStack: 1000,
  stateMachine: {
    enabled: true,
    debugMode: isDev,        // Debug only in development
    enableTimerIntegration: true,
    enablePerformanceMonitoring: isDev  // Performance tracking in dev
  }
})
```

### **Production Environment:**
```typescript
const isProd = process.env.NODE_ENV === 'production'

const table = createServerRuntimeTable(io, 'my-table', {
  seats: 6,
  startingStack: 1000,
  stateMachine: {
    enabled: true,
    debugMode: !isProd,     // No debug in production
    enableTimerIntegration: true,
    enablePerformanceMonitoring: false  // No performance overhead in prod
  }
})
```

## 📝 **Configuration Best Practices**

1. **Development**: Use full debugging to understand system behavior
2. **Testing**: Use production mode to test performance
3. **Production**: Use minimal configuration for best performance
4. **Debugging Issues**: Temporarily enable full debugging
5. **Performance Analysis**: Use monitoring-only configuration

## 🚨 **Configuration Notes**

- **Defaults**: If no `stateMachine` config is provided, all features are enabled
- **Runtime Override**: `setStateMachineDebug()` can override the initial `debugMode` setting
- **Reset Protection**: Configuration is reapplied when the runtime is reset
- **Type Safety**: Use `as any` for now until TypeScript types are updated

## 🎊 **Summary**

The state machine monitoring is now **fully configurable** with sensible defaults:

- **Default**: Full debugging enabled (development-friendly)
- **Configurable**: All features can be individually controlled
- **Runtime Control**: Debug mode can be toggled at runtime
- **Environment Aware**: Easy to configure for different environments


