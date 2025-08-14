# Montecarlo Architecture

## Overview

Montecarlo is a casino game application built with a modern, component-based architecture. The application supports both poker and blackjack games with real-time multiplayer capabilities.

## Architecture Principles

- **Separation of Concerns**: Each component has a single responsibility
- **Component Composition**: Complex UIs are built from smaller, focused components
- **Type Safety**: Comprehensive TypeScript usage throughout
- **Performance First**: Optimized rendering and state management
- **Accessibility**: Built-in support for screen readers and keyboard navigation

## Project Structure

```
montecarlo/
├── vite-app/                 # Frontend React application
│   ├── src/
│   │   ├── ui/              # UI components
│   │   │   ├── poker/       # Poker-specific components
│   │   │   │   ├── components/  # Reusable poker components
│   │   │   │   ├── hooks/       # Custom poker hooks
│   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── config/          # Configuration files
│   │   ├── poker/           # Poker game logic
│   │   └── blackjack/       # Blackjack game logic
├── packages/                 # Shared packages
│   ├── shared/              # Common types and protocols
│   └── poker-engine/        # Poker game engine
├── apps/                     # Applications
│   └── game-server/         # WebSocket game server
└── docs/                     # Documentation
```

## Component Architecture

### Poker Table Components

The poker table has been refactored into focused, reusable components:

- **PokerTableLayout**: Handles layout management and editing
- **PokerTableSeats**: Manages individual seat rendering
- **PokerTableBoard**: Displays community cards
- **PokerTablePot**: Shows pot and showdown information
- **PokerTableControls**: Game action controls

### Hook Architecture

Game logic has been split into focused hooks:

- **usePokerGameState**: Core game state management
- **usePokerHistory**: Game history tracking
- **usePokerSettings**: Game settings and preferences
- **useAccessibility**: Accessibility features
- **usePerformanceMonitor**: Performance monitoring

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

## Performance Optimizations

- **React.memo**: Prevents unnecessary re-renders
- **useCallback**: Stable function references
- **useMemo**: Expensive computation caching
- **Web Workers**: Background processing for simulations
- **Lazy Loading**: Code splitting for better initial load

## Error Handling

- **Error Boundaries**: React error boundaries for graceful error handling
- **Performance Monitoring**: Real-time performance metrics
- **Logging**: Structured logging for debugging

## Accessibility Features

- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard support
- **High Contrast Mode**: Visual accessibility
- **Focus Management**: Proper focus handling

## Testing Strategy

- **Unit Tests**: Individual component and hook testing
- **Integration Tests**: Component interaction testing
- **Performance Tests**: Rendering and memory usage testing

## Build and Deployment

- **Monorepo**: Single repository with multiple packages
- **Workspace Management**: npm workspaces for package management
- **Build Pipeline**: Optimized build process with proper ordering
- **Development Tools**: Concurrent development servers

## Future Improvements

- **State Machine**: Implement XState for complex game flows
- **Virtual Scrolling**: For large game histories
- **Service Workers**: Offline support and caching
- **WebAssembly**: Performance-critical game logic
- **Micro-frontends**: Independent game module deployment
