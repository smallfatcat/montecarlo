# 🔧 Debug Toggle Button Integration Guide

## ✅ **What We've Added:**

A debug toggle button has been added to the poker table controls that allows you to toggle state machine debugging on/off in real-time.

## 🎛️ **Button Location:**

The debug toggle button appears in the **left sidebar** of the poker table, below the "Autoplay" checkbox. It shows as:

```
☐ 🔧 Debug Mode
```

## 🔧 **Current Implementation:**

### **Frontend (Complete):**
- ✅ Debug toggle button added to `PokerTableHorseshoeControls`
- ✅ State management for debug mode
- ✅ UI updates when toggled
- ✅ Console logging when toggled

### **Backend (Ready):**
- ✅ `setStateMachineDebug()` method available on table API
- ✅ Runtime control for debug mode
- ✅ State machine monitoring integrated

## 🔗 **Next Step: Connect Frontend to Backend**

To make the button actually control the server's debug mode, you need to:

### **Option 1: Add WebSocket Message (Recommended)**

Add a new message type to handle debug mode toggling:

1. **Add to protocol** (`packages/shared/src/protocol/clientToServer.ts`):
```typescript
export const clientToServerSchema = z.discriminatedUnion('type', [
  // ... existing messages
  z.object({
    type: z.literal('toggle_debug_mode'),
    tableId: z.string(),
    enabled: z.boolean()
  })
])
```

2. **Handle in server** (`apps/game-server/src/tables/serverRuntimeTable.ts`):
```typescript
// In your message handling logic
if (message.type === 'toggle_debug_mode') {
  const table = getTable(message.tableId)
  if (table) {
    table.setStateMachineDebug(message.enabled)
    // Broadcast to all clients in the room
    io.to(`table:${message.tableId}`).emit('debug_mode_changed', { 
      enabled: message.enabled 
    })
  }
}
```

3. **Update frontend** to send the message:
```typescript
// In PokerTableHorseshoe.tsx
const handleToggleDebugMode = (enabled: boolean) => {
  setDebugMode(enabled)
  
  // Send to server
  if (socket) {
    socket.emit('message', {
      type: 'toggle_debug_mode',
      tableId: table.tableId, // You'll need to add this to the table state
      enabled: enabled
    })
  }
}
```

### **Option 2: Add HTTP Endpoint**

Create a simple HTTP endpoint for toggling debug mode:

1. **Add endpoint** to your game server
2. **Call from frontend** using `fetch()`

## 🎯 **Quick Test:**

1. **Start your game server** with state machine monitoring enabled
2. **Open the poker table** in your browser
3. **Look for the debug toggle button** in the left sidebar
4. **Click the button** - you should see console logs
5. **Check server console** for state machine debug output

## 📊 **Expected Behavior:**

### **When Debug Mode is ON:**
- Console shows: `🔧 [UI] Debug mode toggled: ON`
- Server shows: `🔧 [StateMachine] Action processed successfully: {...}`
- Full state machine monitoring output

### **When Debug Mode is OFF:**
- Console shows: `🔧 [UI] Debug mode toggled: OFF`
- Server shows minimal logging
- State machine still active but quiet

## 🚀 **Current Status:**

- **Frontend**: ✅ Complete - Button visible and functional
- **Backend**: ✅ Ready - Methods available for control
- **Integration**: 🔄 Pending - Need to connect the two

## 🎊 **Result:**

Once integrated, you'll have a **real-time debug toggle** that lets you:
- Turn on debugging when you need to investigate issues
- Turn off debugging for clean production logs
- Control debugging without restarting the server
- See immediate feedback in both UI and console

The button is now visible in your poker table! 🎰⏰🔧
