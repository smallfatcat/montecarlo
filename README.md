# Montecarlo

This project was developed within Cursor using various AI models. **The system is now production-ready with a complete state machine implementation and Convex backend integration.**

A casino game application built with React, TypeScript, and Node.js, featuring real-time multiplayer poker with state machine-driven game flow, high-speed blackjack simulations, and comprehensive real-time state persistence.

## 🎯 Current Features

- **Poker**: Texas Hold'em with real-time multiplayer via WebSocket server and **state machine integration**
- **Blackjack**: Backend simulation engine with high-speed Monte Carlo analysis
- **High-Speed Simulations**: Monte Carlo analysis engine with Web Worker support
- **Real-time Multiplayer**: Authoritative game server with Socket.IO and **state machine validation**
- **Modern UI**: React-based interface with responsive design and **real-time Convex queries**
- **Modular Architecture**: Clean, maintainable codebase with separation of concerns
- **State Machine System**: Complete state machine runtime for game flow management
- **Convex Integration**: Real-time database with event ingestion and state persistence

## 🏗️ Architecture

- **Frontend**: React 19 + Vite + TypeScript with **Convex real-time queries**
- **Backend**: Node.js + Fastify + Socket.IO with **state machine integration**
- **Game Engine**: Modular poker engine with **state machine-driven logic**
- **Simulation**: Pure function runners for maximum performance
- **Database**: Convex real-time database with self-hosted deployment
- **Real-time Sync**: WebSocket-based real-time updates and **state machine event ingestion**
- **State Machine Runtime**: Complete state machine system for game flow management
- **Monorepo**: npm workspaces for package management
- **Code Quality**: Comprehensive readability standards and modular patterns

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start all development servers (including Convex)
npm run dev:all

# Or start individually
npm run dev:frontend    # Frontend only
npm run dev:backend     # Backend only
npm run dev:convex      # Convex database only
npm run dev:convex:up   # Start Convex Docker services
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- Convex Backend: http://localhost:3210
- Convex Dashboard: http://localhost:6791

## 📚 Documentation

- [Getting Started](./docs/getting-started.md) - Development setup and workflow
- [Architecture](./docs/architecture.md) - System design and components
- [System Overview](./docs/system-overview.md) - High-level project overview with state machine integration
- [Poker Realtime Usage](./docs/poker-realtime-usage.md) - Multiplayer setup with state machines
- [Convex Integration Architecture](./docs/convex-integration-architecture.md) - Real-time database architecture and flowcharts
- [Convex Real-Time Data Flow](./docs/convex-real-time-flow.md) - Real-time event processing and WebSocket flows
- [Convex Technical Implementation](./docs/convex-technical-implementation.md) - Code patterns, configuration, and best practices
- [State Machine Implementation Progress](./docs/state-machine-implementation-progress.md) - Complete state machine system status
- [State Machine Analysis](./docs/state-machine-analysis.md) - State machine architecture and benefits

## 🎉 Production Status

**This project is now production-ready with a complete state machine system and Convex backend integration.** The current implementation includes:

- ✅ **Complete State Machine System**: Hand progression, player actions, timer integration
- ✅ **Convex Backend Integration**: Real-time state persistence and event ingestion
- ✅ **Frontend Real-time Updates**: Convex queries and subscriptions for live data
- ✅ **Production Features**: Debug controls, performance monitoring, error handling
- ✅ **Scalable Architecture**: Ready for multiple game servers and horizontal scaling

## 🎮 Game Types

### Poker (Multiplayer) ✅ **Production Ready**
- Real-time Texas Hold'em with **state machine validation**
- WebSocket-based communication
- CPU players for single-player games
- Configurable table layouts
- Modular game engine architecture
- **State Machine Integration**: Complete game flow management from preflop to showdown
- **Convex Integration**: Real-time database with event ingestion API
- **Persistent Game State**: Hand history, player actions, table management, and **state machine events**
- **Debug Controls**: Runtime debug mode toggling for development and troubleshooting

### Blackjack (Backend Engine)
- Simulation engine with standard rules and house rule options
- Multi-deck shoe management
- Basic strategy implementation
- High-volume Monte Carlo simulations
- **Note**: Currently lacks user interface - engine only accessible programmatically

## 🔧 Development

```bash
# Build all packages (with automatic version generation)
npm run build:all

# Run tests
npm run test:all

# Type checking
npm run typecheck

# Clean rebuild
npm run rebuild

# Build with explicit version generation
npm run build:with-version
```

### 🆕 Automatic Version Generation

The build process now automatically generates version information after every build:

- **VERSION files** for each component with build metadata
- **BUILD_INFO** file with comprehensive build details
- **Smart caching** to avoid redundant generation
- **Git integration** for accurate build numbers and commit tracking

See [Building with Automatic Version Generation](./docs/BUILD_WITH_VERSION.md) for details.

## 📦 Project Structure

```
montecarlo/
├── vite-app/                 # React frontend application
│   ├── src/
│   │   ├── ui/              # UI components and hooks
│   │   ├── config/          # Modular configuration
│   │   ├── poker/           # Poker game logic with Convex queries
│   │   ├── blackjack/       # Blackjack game logic (modular)
│   │   ├── stores/          # State management (modular)
│   │   ├── workers/         # Web Workers for simulations
│   │   └── convexClient.ts  # Convex client configuration
├── convex/                   # Convex backend functions
│   ├── schema.ts            # Database schema with state machine tables
│   ├── users.ts             # User management functions
│   ├── history.ts           # Hand history and state machine queries
│   ├── ingest.ts            # Event ingestion mutations
│   ├── http.ts              # HTTP endpoints for state machine events
│   └── _generated/          # Auto-generated types and API
├── convex-self-hosted/      # Self-hosted Convex infrastructure
│   └── docker-compose.yml   # Docker services configuration
├── apps/game-server/         # WebSocket multiplayer server with state machine integration
│   ├── src/
│   │   ├── ingest/          # Convex event publishing
│   │   │   ├── convexPublisher.ts # HTTP-based event ingestion
│   │   │   └── stateMachineAdapter.ts # State machine integration
│   │   └── server/          # WebSocket server
├── packages/                 # Shared packages and game engine
│   ├── shared/              # Common types and protocols (modular)
│   ├── poker-engine/        # Poker game engine (modular)
│   └── state-machine/       # State machine implementation
└── docs/                    # Project documentation
```

## 🎯 Code Quality Standards

This project maintains high code quality through:

- **Modular Architecture**: Single responsibility principle with clear separation of concerns
- **File Size Limits**: Maximum 200 lines per file for maintainability
- **Function Complexity**: Maximum 50 lines per function for readability
- **Comprehensive Documentation**: JSDoc comments and clear naming conventions
- **Type Safety**: Full TypeScript coverage throughout
- **Consistent Patterns**: Barrel exports, module organization, and naming conventions
- **Database Design**: Convex schema validation and type-safe database operations
- **Real-time Architecture**: Event-driven design with idempotent processing
- **State Machine Design**: Explicit state transitions with validation and error handling
- **Real-time Integration**: Convex queries and subscriptions for live data updates

## 🏆 Current Achievement Status

### ✅ **Fully Implemented & Production Ready**
- **Complete State Machine System**: Hand progression, player actions, timer integration
- **Convex Backend Integration**: Real-time state persistence and event ingestion
- **Frontend Real-time Updates**: Convex queries and subscriptions for live data
- **Production Features**: Debug controls, performance monitoring, error handling
- **Scalable Architecture**: Ready for multiple game servers and horizontal scaling

### 🎯 **System Capabilities**
- **Consistent Game Flow**: Predictable state transitions with validation
- **Real-time State Persistence**: All state changes stored in Convex
- **Comprehensive Debugging**: Full visibility into game state and transitions
- **High Performance**: Optimized state management with built-in monitoring
- **Production Reliability**: Robust error handling and comprehensive monitoring

## 📄 License

MIT — see [LICENSE](./LICENSE)


