# Montecarlo Architecture

## Overview

Montecarlo is a casino game application built with a modern, modular architecture. The application supports both poker and blackjack games with real-time multiplayer capabilities, plus high-speed simulation features. The codebase follows strict readability standards with single responsibility principles and clear separation of concerns.

## Architecture Principles

- **Separation of Concerns**: Each component has a single responsibility
- **Modular Architecture**: Files limited to 200 lines, functions to 50 lines
- **Component Composition**: Complex UIs are built from smaller, focused components
- **Type Safety**: Comprehensive TypeScript usage throughout
- **Performance First**: Optimized rendering and state management with Web Workers
- **Accessibility**: Built-in support for screen readers and keyboard navigation
- **Simulation Speed**: Pure function runners for maximum simulation performance
- **Real-time Communication**: WebSocket-based multiplayer with authoritative server
- **Code Quality**: Comprehensive readability standards and documentation

## Project Structure

```
montecarlo/
├── vite-app/                 # Frontend React application
│   ├── src/
│   │   ├── ui/              # UI components and hooks
│   │   │   ├── components/      # Shared UI components
│   │   │   ├── hooks/           # Shared UI hooks
│   │   │   ├── controls/        # Game control components
│   │   │   └── handLayouts/     # Hand layout components
│   │   ├── config/          # Modular configuration
│   │   │   ├── index.ts         # Main config aggregator
│   │   │   ├── poker.config.ts  # Poker-specific configuration
│   │   │   ├── blackjack.config.ts # Blackjack configuration
│   │   │   ├── ui.config.ts     # UI configuration
│   │   │   └── legacy.config.ts # Legacy configuration
│   │   ├── poker/           # Poker game logic (modular)
│   │   │   ├── flow/            # Game flow management
│   │   │   │   ├── gameSetup.ts     # Hand setup and deck preparation
│   │   │   │   ├── dealing.ts       # Card dealing logic
│   │   │   │   ├── actionHandling.ts # Player action processing
│   │   │   │   ├── chipManagement.ts # Betting and chip handling
│   │   │   │   ├── streetAdvancement.ts # Street progression
│   │   │   │   └── index.ts         # Barrel exports
│   │   │   ├── strategy/         # Poker strategy engine
│   │   │   │   ├── handAnalysis.ts     # Hand strength analysis
│   │   │   │   ├── preflopAnalysis.ts  # Preflop hand evaluation
│   │   │   │   ├── bettingStrategy.ts  # Betting decision logic
│   │   │   │   └── index.ts            # Barrel exports
│   │   │   ├── handEval/         # Hand evaluation
│   │   │   │   ├── rankUtils.ts        # Rank and suit utilities
│   │   │   │   ├── handClassification.ts # Hand classification
│   │   │   │   └── index.ts            # Barrel exports
│   │   │   └── predefinedHands/  # Predefined hand histories
│   │   │       ├── handBuilders.ts      # Hand builder patterns
│   │   │       └── index.ts             # Barrel exports
│   │   ├── blackjack/       # Blackjack game logic (modular)
│   │   │   ├── simulation/       # Simulation engine
│   │   │   │   ├── simulationEngine.ts  # Core simulation logic
│   │   │   │   └── index.ts             # Barrel exports
│   │   │   └── table.ts          # Table state management
│   │   ├── stores/          # State management (modular)
│   │   │   ├── lobby/            # Lobby store modules
│   │   │   │   ├── connectionManager.ts # WebSocket connection
│   │   │   │   ├── playerManager.ts     # Player management
│   │   │   │   ├── tableManager.ts      # Table operations
│   │   │   │   ├── uiManager.ts         # UI state management
│   │   │   │   └── index.ts             # Barrel exports
│   │   │   └── index.ts          # Store exports
│   │   └── workers/         # Web Workers for simulations
│   │       ├── equity/            # Equity calculation worker
│   │       │   ├── equityCalculator.ts  # Core calculation logic
│   │       │   ├── equityWorker.ts      # Worker implementation
│   │       │   └── index.ts             # Barrel exports
│   │       └── simWorker.ts       # Simulation worker
├── packages/                 # Shared packages
│   ├── shared/              # Common types and protocols (modular)
│   │   └── src/
│   │       └── protocol/         # Protocol schemas
│   │           ├── common.ts         # Shared types
│   │           ├── clientToServer.ts # Client message schemas
│   │           ├── serverToClient.ts # Server message schemas
│   │           └── index.ts          # Barrel exports
│   └── poker-engine/        # Poker game engine (modular)
│       └── src/
│           ├── flow/             # Game flow management
│           │   ├── tableCreation.ts    # Table setup
│           │   ├── handManagement.ts   # Hand lifecycle
│           │   ├── bettingLogic.ts     # Betting mechanics
│           │   ├── streetAdvancement.ts # Street progression
│           │   └── index.ts            # Barrel exports
│           ├── strategy/          # Strategy engine
│           │   ├── handAnalysis.ts     # Hand analysis
│           │   ├── preflopAnalysis.ts  # Preflop evaluation
│           │   ├── actionSuggestion.ts # Action recommendations
│           │   └── index.ts            # Barrel exports
│           └── types.ts           # Core types
├── apps/                     # Applications
│   └── game-server/         # WebSocket game server (modular)
│       └── src/
│           ├── config/            # Environment configuration
│           │   └── env.ts             # Environment parsing
│           ├── server/              # Server setup
│           │   ├── http.ts               # HTTP server configuration
│           │   └── socket.ts             # Socket.IO setup
│           ├── identity/             # Identity management
│           │   └── tokenStore.ts         # Token storage
│           ├── tables/                # Table factory exports
│           │   └── index.ts             # Barrel exports
│           ├── sockets/                # Socket event handlers
│           │   └── handlers.ts             # Event registration
│           └── index.ts             # Main server orchestration
└── docs/                     # Project documentation
```

## Game Server Architecture

### Overview

The game server (`apps/game-server/`) is a Node.js application that provides authoritative real-time multiplayer functionality for poker games. It acts as the single source of truth for game state and enforces game rules.

### Technology Stack

- **Fastify**: High-performance HTTP server framework
- **Socket.IO**: Real-time WebSocket communication
- **TypeScript**: Full type safety throughout
- **Zod**: Runtime message validation and type inference
- **Environment Configuration**: Flexible deployment configuration

### Core Components

#### Server Runtime (`serverRuntimeTable.ts`)

The heart of the game server that manages individual poker table instances:

- **Table State Management**: Maintains authoritative game state
- **Player Management**: Handles player seating, joining, and leaving
- **Game Flow Control**: Manages hand progression and player actions
- **Real-time Broadcasting**: Emits game events to all connected clients
- **CPU Player Integration**: Seamless integration with AI players

#### Protocol Layer (`packages/shared/src/protocol/`)

Defines the communication contract between client and server:

- **Message Schemas**: Zod-based validation for all messages
- **Client-to-Server (C2S)**: Player actions and table management
- **Server-to-Client (S2C)**: Game state updates and server responses
- **Type Safety**: Full TypeScript integration with runtime validation
- **Modular Organization**: Clean separation of protocol concerns

#### Table Management

- **Dynamic Table Creation**: Tables are created on-demand
- **Multi-table Support**: Multiple concurrent game tables
- **Room-based Communication**: Socket.IO rooms for table isolation
- **Client Lifecycle**: Automatic cleanup on disconnection

### Real-time Communication Protocol

#### Client-to-Server Messages

- **`join`**: Connect to a specific table
- **`sit`**: Take a seat at the table
- **`leave`**: Vacate seat and disconnect
- **`begin`**: Start a new hand
- **`act`**: Perform betting actions (fold, check, call, bet, raise)
- **`setAuto`**: Enable/disable automatic play
- **`reset`**: Reset table to initial state

#### Server-to-Client Events

- **`ready`**: Server ready confirmation
- **`state`**: Complete table state update
- **`error`**: Error messages and validation failures
- **`table_list`**: Available tables for joining

## Frontend Architecture

### Component Organization

The frontend follows a modular component architecture:

- **Domain Separation**: Poker, blackjack, and UI components are clearly separated
- **Single Responsibility**: Each component has one clear purpose
- **Composition**: Complex UIs are built from smaller, focused components
- **Hooks**: Custom hooks encapsulate reusable logic and state management

### State Management

The application uses Zustand for state management with a modular approach:

- **Lobby Store**: Manages connection, player, table, and UI state
- **Connection Manager**: Handles WebSocket connections and reconnection
- **Player Manager**: Manages player identification and session
- **Table Manager**: Handles table operations and navigation
- **UI Manager**: Manages UI state and preferences

### Configuration Management

Configuration is organized into domain-specific modules:

- **Poker Config**: Poker-specific settings and rules
- **Blackjack Config**: Blackjack-specific settings and rules
- **UI Config**: UI-related settings and preferences
- **Legacy Config**: Backward compatibility for existing components

## Code Quality Standards

### File Organization

- **Maximum File Size**: 200 lines per file
- **Maximum Function Size**: 50 lines per function
- **Single Responsibility**: Each file has one clear purpose
- **Barrel Exports**: Clean import/export patterns

### Module Patterns

- **Flow Modules**: Game flow management with clear progression
- **Strategy Modules**: Game strategy with focused analysis
- **Protocol Modules**: Communication schemas with validation
- **Server Modules**: Server concerns with clear separation

### Documentation Standards

- **JSDoc Comments**: All public functions documented
- **README Files**: Module-level documentation
- **Inline Comments**: Complex logic explained
- **Type Definitions**: Comprehensive TypeScript coverage

## Performance Considerations

### Web Workers

- **Equity Calculations**: CPU-intensive poker calculations
- **Simulation Engine**: High-speed blackjack simulations
- **Background Processing**: Non-blocking UI operations

### State Management

- **Selective Re-renders**: Only affected components update
- **Memoization**: Automatic performance optimization
- **Efficient Updates**: Minimal state mutations

### Real-time Communication

- **WebSocket Optimization**: Efficient binary protocols
- **Message Validation**: Runtime type checking with Zod
- **Connection Management**: Automatic reconnection and error handling

## Testing Strategy

### Unit Testing

- **Component Testing**: Individual component behavior
- **Store Testing**: State management logic
- **Utility Testing**: Pure function validation

### Integration Testing

- **Game Flow**: End-to-end game scenarios
- **Real-time Communication**: WebSocket message handling
- **State Synchronization**: Client-server state consistency

## Deployment Architecture

### Development

- **Local Development**: Hot reloading and fast iteration
- **Monorepo Builds**: Coordinated package development
- **Environment Configuration**: Flexible local setup

### Production

- **Static Frontend**: Optimized React build
- **Backend Services**: Scalable Node.js deployment
- **Real-time Infrastructure**: WebSocket support
- **Monitoring**: Health checks and performance metrics
