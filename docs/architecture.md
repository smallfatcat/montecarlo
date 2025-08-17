# Montecarlo Architecture

## Overview

Montecarlo is a casino game application built with a modern, component-based architecture. The application supports both poker and blackjack games with real-time multiplayer capabilities, plus high-speed simulation features.

## Architecture Principles

- **Separation of Concerns**: Each component has a single responsibility
- **Component Composition**: Complex UIs are built from smaller, focused components
- **Type Safety**: Comprehensive TypeScript usage throughout
- **Performance First**: Optimized rendering and state management with Web Workers
- **Accessibility**: Built-in support for screen readers and keyboard navigation
- **Simulation Speed**: Pure function runners for maximum simulation performance
- **Real-time Communication**: WebSocket-based multiplayer with authoritative server

## Project Structure

```
montecarlo/
├── vite-app/                 # Frontend React application
│   ├── src/
│   │   ├── ui/              # UI components and hooks
│   │   │   ├── poker/       # Poker-specific components
│   │   │   │   ├── components/  # Reusable poker components
│   │   │   │   ├── hooks/       # Custom poker hooks
│   │   │   │   └── ...
│   │   │   ├── components/      # Shared UI components
│   │   │   ├── hooks/           # Shared UI hooks
│   │   │   ├── controls/        # Game control components
│   │   │   └── handLayouts/     # Hand layout components
│   │   ├── config/          # Configuration files
│   │   ├── poker/           # Poker game logic
│   │   ├── blackjack/       # Blackjack game logic
│   │   └── workers/         # Web Workers for simulations
├── packages/                 # Shared packages
│   ├── shared/              # Common types and protocols
│   └── poker-engine/        # Poker game engine
├── apps/                     # Applications
│   └── game-server/         # WebSocket game server
└── docs/                     # Documentation
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

#### Protocol Layer (`protocol.ts`)

Defines the communication contract between client and server:

- **Message Schemas**: Zod-based validation for all messages
- **Client-to-Server (C2S)**: Player actions and table management
- **Server-to-Client (S2C)**: Game state updates and server responses
- **Type Safety**: Full TypeScript integration with runtime validation

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
- **`state`**: Complete table state updates
- **`action`**: Player action confirmations
- **`deal`**: Card dealing events
- **`hand_start`**: New hand initialization
- **`post_blind`**: Blind posting events
- **`hand_setup`**: Hand setup information
- **`seat_update`**: Player seating changes
- **`autoplay`**: Autoplay state updates

### Security and Validation

- **CORS Configuration**: Configurable origin allowlist
- **Message Validation**: Zod schema validation for all messages
- **State Authorization**: Players can only act on their turn
- **Seat Ownership**: Socket-to-seat mapping validation
- **Environment Security**: Production-ready security defaults

### Deployment Configuration

#### Environment Variables

- **`HOST`**: Server binding address (default: `127.0.0.1`)
- **`PORT`**: Server port (default: `8080`)
- **`FRONTEND_ORIGINS`**: Comma-separated allowed origins
- **`ALLOW_ALL_ORIGINS`**: Development override flag

#### Production Considerations

- **HTTPS/WSS**: Secure WebSocket connections
- **Origin Restriction**: Explicit frontend origin allowlist
- **Load Balancing**: Multiple server instances
- **Health Checks**: `/healthz` and `/readyz` endpoints
- **Logging**: Structured logging for monitoring

## Component Architecture

### Poker Table Components

The poker table has been refactored into focused, reusable components:

- **PokerTableLayout**: Handles layout management and editing
- **PokerTableSeats**: Manages individual seat rendering
- **PokerTableBoard**: Displays community cards
- **PokerTablePot**: Shows pot and showdown information
- **PokerTableControls**: Game action controls
- **PokerTableBettingSpots**: Manages betting positions
- **PokerTableStacks**: Handles chip stack displays
- **PokerSeatResult**: Shows individual seat results
- **PokerSeatEquity**: Displays equity calculations

### Hook Architecture

Game logic has been split into focused hooks:

- **usePokerGameState**: Core game state management
- **usePokerHistory**: Game history tracking
- **usePokerSettings**: Game settings and preferences
- **usePokerLayoutEditor**: Layout editing functionality
- **usePokerGameFlow**: Game flow management
- **usePokerReplay**: Replay functionality
- **usePokerRuntime**: Runtime game management
- **usePokerActions**: Game action handling
- **usePokerReview**: Game review features
- **usePokerSeating**: Seating management

### Blackjack Components

Blackjack functionality is currently implemented as a backend simulation engine:

- **Deck Management**: Card deck handling and shuffling (backend only)
- **Hand Evaluation**: Hand scoring and game logic (backend only)
- **Strategy Engine**: Basic strategy implementation (backend only)
- **Table Management**: Game table state (backend only)
- **Simulation Engine**: High-speed Monte Carlo simulations (backend only)

**Note**: Blackjack currently lacks a user interface. The simulation engine exists but is not accessible through the UI. Users cannot currently run simulations or interact with blackjack games.

## Configuration Management

Configuration has been split into domain-specific files:

- **game.ts**: Game rules and logic configuration
- **ui.ts**: UI layout and styling configuration
- **poker.ts**: Poker-specific configuration
- **index.ts**: Main configuration export

## State Management

The application uses React's built-in state management with custom hooks:

1. **Local State**: Component-specific state using `useState`
2. **Shared State**: Context providers for cross-component state
3. **Derived State**: Computed values using `useMemo`
4. **Side Effects**: Managed with `useEffect` and custom hooks

## Real-time Communication

WebSocket communication is handled through:

- **Socket.IO**: For real-time client-server communication
- **Protocol Schemas**: Zod-based message validation
- **Connection Management**: Automatic reconnection and fallback
- **Authoritative Server**: Single source of truth for game state
- **Event Broadcasting**: Real-time updates to all connected clients

## Performance Optimizations

- **React.memo**: Prevents unnecessary re-renders
- **useCallback**: Stable function references
- **useMemo**: Expensive computation caching
- **Web Workers**: Background processing for simulations
  - **simWorker**: High-speed blackjack simulations
  - **equityWorker**: Poker equity calculations
- **Lazy Loading**: Code splitting for better initial load
- **Server-side Validation**: Efficient message processing
- **Room-based Broadcasting**: Targeted event distribution

## Simulation Architecture

### High-Speed Simulation Runner

The application includes a pure function simulation runner for maximum performance:

- **useSimulationRunner**: React hook for managing simulation execution (currently unused)
- **Web Worker Integration**: Offloads computation to background threads
- **Progress Tracking**: Real-time simulation progress updates
- **Configurable Parameters**: Adjustable simulation settings
- **Performance Optimized**: Pure functions for maximum speed

**Note**: The simulation runner hook exists but is not currently integrated with any user interface. Users cannot currently control or run simulations through the UI.

### Simulation Features

- **Blackjack Simulations**: High-volume hand simulations (backend only)
- **Configurable Rules**: Adjustable house rules and deck counts (backend only)
- **Bankroll Tracking**: Player and casino bankroll management (backend only)
- **Bet Management**: Configurable betting strategies (backend only)
- **Performance Monitoring**: Real-time progress and completion tracking (backend only)

**Note**: All simulation features are currently backend-only. The simulation engine exists but lacks a user interface for configuration and execution.

## Error Handling

- **Error Boundaries**: React error boundaries for graceful error handling
- **Performance Monitoring**: Real-time performance metrics
- **Logging**: Structured logging for debugging
- **Server-side Validation**: Comprehensive message validation
- **Connection Recovery**: Automatic reconnection handling

## Accessibility Features

- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard support
- **High Contrast Mode**: Visual accessibility
- **Focus Management**: Proper focus handling

## Testing Strategy

- **Unit Tests**: Individual component and hook testing
- **Integration Tests**: Component interaction testing
- **Performance Tests**: Rendering and memory usage testing
- **Protocol Tests**: Message validation testing
- **Server Tests**: Game logic and state management testing

## Build and Deployment

- **Monorepo**: Single repository with multiple packages
- **Workspace Management**: npm workspaces for package management
- **Build Pipeline**: Optimized build process with proper ordering
- **Development Tools**: Concurrent development servers
- **GitHub Pages**: Static hosting with proper base path configuration
- **Server Deployment**: Flexible server deployment options

## Future Improvements

- **State Machine**: Implement XState for complex game flows
- **Virtual Scrolling**: For large game histories
- **Service Workers**: Offline support and caching
- **WebAssembly**: Performance-critical game logic
- **Micro-frontends**: Independent game module deployment
- **Enhanced Simulations**: More game types and analysis tools
- **Multi-game Support**: Extend server to support blackjack multiplayer
- **Scalability**: Horizontal scaling and load balancing
- **Analytics**: Game performance and player behavior tracking
