# System Overview

This project delivers a casino game application with a poker UI backed by an authoritative realtime server with state machine integration, plus high-speed simulation capabilities for both poker and blackjack. The frontend currently renders poker tables and user interactions; the backend enforces game rules and streams state over WebSockets with comprehensive state machine management. Blackjack is implemented as a backend simulation engine only and does not yet have a UI.

---

## Components

### Frontend (`vite-app/`)
- **React + Vite SPA** with TypeScript
- **Modular Architecture**: Clean separation of concerns with focused modules
- **UI Components**: Organized in domain-specific directories (poker, blackjack, ui)
- **State Management**: Convex real-time queries with modular Zustand stores
- **Configuration**: Domain-specific config files (poker, blackjack, ui, legacy)
- **Workers**: Web Worker support for high-performance simulations
- **Renders poker tables** and captures user actions (deal, bet, fold)
- **High-speed simulation runner** available as a hook; UI integration pending
- **Connects to the backend** via Socket.IO using `VITE_WS_URL` (ws/wss)
- **Real-time updates** via Convex queries and subscriptions

### Backend (`apps/game-server/`)
- **Node.js (Fastify HTTP + Socket.IO for realtime)**
- **Modular Architecture**: Clean separation of server, socket, and identity concerns
- **Authoritative Game Server**: Single source of truth for multiplayer poker games
- **State Machine Integration**: Complete state machine system for game flow management
- **Real-time Protocol**: WebSocket-based communication with Zod validation
- **Table Management**: Dynamic table creation and multi-table support
- **State Enforcement**: Enforces game rules and validates all player actions via state machines
- **CPU Integration**: Seamless AI player integration for single-player games
- **Hosts table instances** and applies validated actions to the state machine engine
- **Broadcasts authoritative table state** to connected clients
- **Convex Integration**: Real-time state persistence and event ingestion

### Convex Backend (`convex/`)
- **Self-hosted Convex instance** for real-time data persistence
- **Database Schema**: Comprehensive poker data model with state machine events
- **HTTP Endpoints**: Event ingestion for game server state changes
- **Real-time Queries**: Frontend components can query live game data
- **State Machine Events**: All state transitions and game state snapshots
- **Authentication**: Secure event ingestion with secret-based auth
- **Idempotency**: Prevents duplicate event processing

### Shared packages (`packages/`)
- **`packages/shared`**: Shared types and message contracts (Zod-ready, modular)
- **`packages/poker-engine`**: Modular engine with deterministic state transitions
  - **Flow Management**: Hand creation, dealing, betting, street advancement
  - **Strategy Engine**: Hand analysis, preflop analysis, action suggestions
  - **Clean Architecture**: Single responsibility modules under 200 lines
- **State Machine Packages**: Complete state machine implementation for poker games

---

## Game Types

### Poker
- **Texas Hold'em** with configurable rules
- **Real-time multiplayer** gameplay via game-server with state machines
- **Hand evaluation** and equity calculations
- **Game history** and replay functionality with state machine events
- **Layout editor** for custom table configurations
- **CPU players** for single-player games
- **Modular engine** with clean separation of concerns
- **State machine-driven** game flow with comprehensive validation

### Blackjack
- **Standard blackjack rules** with configurable house rules (backend engine)
- **Multi-deck shoe management** (backend engine)
- **Basic strategy implementation** (backend engine)
- **High-speed Monte Carlo simulations** (backend engine)
- **Bankroll tracking and analysis** (backend engine)
- **Modular simulation engine** with focused responsibilities
- **Note**: Backend-only at this time (no UI or multiplayer server support)

---

## Simulation Features

The application includes a high-performance simulation runner:

- **Backend Engine**: Pure function simulation engine for maximum performance
- **Web Worker Support**: Background processing capabilities
- **Monte Carlo Analysis**: High-volume statistical simulations
- **Modular Architecture**: Clean separation of simulation concerns
- **Status**: Engine implemented; UI to control and visualize simulations is pending

**Note**: While the simulation engine exists and is fully functional, users cannot currently control or run simulations through the interface.

### Simulation Use Cases

- **Strategy Analysis**: Test different playing strategies
- **Rule Impact**: Analyze house rule effects on player advantage
- **Bankroll Management**: Study long-term bankroll behavior
- **Performance Testing**: Benchmark game engine performance

---

## Architecture Flow

### Multiplayer Poker (via Game Server + State Machines)
1. **Client connects** to game-server via WebSocket
2. **Client joins table** and takes a seat
3. **Game server manages** authoritative state via state machines
4. **All actions validated** and processed through state machine engine
5. **State changes persisted** to Convex backend in real-time
6. **State updates broadcast** to all connected clients
7. **Frontend receives updates** via Convex queries and WebSocket events
8. **Real-time synchronization** maintained with state machine validation

### Single-player & Simulations
1. **Local game logic** execution
2. **Web Worker-based** simulations
3. **No server communication** required
4. **Maximum performance** for analysis

---

## State Machine Integration

### **Complete State Machine System**
- **Game Flow Management**: Hand progression from preflop to showdown
- **Player Action Validation**: Comprehensive validation based on current state
- **Timer Integration**: Automatic timer management via state machine events
- **Context Management**: Immutable state updates with full context preservation
- **Error Handling**: Clear error messages and validation results
- **Performance Monitoring**: Built-in performance tracking and optimization

### **Convex Integration**
- **State Machine Events**: All state transitions persisted to Convex
- **Game State Snapshots**: Complete game state captured at action boundaries
- **Pot History Events**: Detailed tracking of pot state changes
- **Real-time Frontend Updates**: React components query state machine data
- **Authentication & Idempotency**: Secure event ingestion with duplicate prevention

### **Production Features**
- **Runtime Adapter**: Seamless integration with existing PokerRuntime
- **Feature Toggles**: Enable/disable state machine integration
- **Debug Controls**: Runtime debug mode toggling for development
- **Performance Optimization**: Continuous optimization based on real-world usage
- **Scalable Architecture**: Ready for multiple game servers and horizontal scaling

---

## How it works (happy path)

1) **User opens the frontend** (local dev or hosted). The app reads `VITE_WS_URL` and connects to the Socket.IO endpoint.
2) **Client sends** `join_table` (and later `action` events like call/raise/fold).
3) **Server validates messages** through state machines, updates the engine, and emits `state` events with a monotonically increasing sequence number.
4) **State machine events** are automatically persisted to Convex backend for real-time tracking.
5) **Frontend listens to `state`** and updates the UI accordingly. Optional `ack` confirms processed inputs.
6) **Frontend components** can also query state machine data via Convex for hand replay and analysis.
7) **On reconnect**, the client resumes using the last known sequence to catch up.

---

## Running locally

```bash
# Install dependencies
npm install

# Start all services
npm run dev:all

# Or start individually
npm run dev:frontend    # Frontend only
npm run dev:backend     # Backend only
npm run dev:convex      # Convex backend only
```

## Code Quality Standards

This project maintains high code quality through:

- **Modular Architecture**: Single responsibility principle with clear separation of concerns
- **File Size Limits**: Maximum 200 lines per file for maintainability
- **Function Complexity**: Maximum 50 lines per function for readability
- **Comprehensive Documentation**: JSDoc comments and clear naming conventions
- **Type Safety**: Full TypeScript coverage throughout
- **Consistent Patterns**: Barrel exports, module organization, and naming conventions
- **State Machine Design**: Explicit state transitions with validation and error handling
- **Real-time Integration**: Convex queries and subscriptions for live data updates

---

## Current Implementation Status

### ✅ **Fully Implemented**
- **Complete state machine system** for poker game flow
- **Convex backend integration** with real-time persistence
- **Frontend real-time updates** via Convex queries
- **Production deployment** with monitoring and debugging
- **Comprehensive error handling** and recovery
- **Performance optimization** and monitoring

### 🎯 **Production Ready**
- **State machine runtime** with debug controls
- **Convex event ingestion** with authentication
- **Real-time frontend integration** with state machine data
- **Scalable architecture** for multiple game servers
- **Comprehensive monitoring** and observability

The system now provides a **robust, maintainable, and scalable** poker game implementation with:
- **Consistent game flow** via state machine validation
- **Real-time state persistence** for debugging and analysis
- **High performance** with optimized state management
- **Production reliability** with comprehensive monitoring


