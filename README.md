# Montecarlo

A casino game application built with React, TypeScript, and Node.js, featuring real-time multiplayer poker and high-speed blackjack simulations.

## 🎯 Current Features

- **Poker**: Texas Hold'em with real-time multiplayer via WebSocket server
- **Blackjack**: Single-player with configurable rules and strategies
- **High-Speed Simulations**: Monte Carlo analysis using Web Workers
- **Real-time Multiplayer**: Authoritative game server with Socket.IO
- **Modern UI**: React-based interface with responsive design

## 🏗️ Architecture

- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Node.js + Fastify + Socket.IO
- **Game Engine**: Extracted poker engine with deterministic logic
- **Simulation**: Pure function runners for maximum performance
- **Monorepo**: npm workspaces for package management

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev:all

# Or start individually
npm run dev:frontend    # Frontend only
npm run dev:backend     # Backend only
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080

## 📚 Documentation

- [Getting Started](./docs/getting-started.md) - Development setup and workflow
- [Architecture](./docs/architecture.md) - System design and components
- [System Overview](./docs/system-overview.md) - High-level project overview
- [Poker Realtime Usage](./docs/poker-realtime-usage.md) - Multiplayer setup

## ⚠️ Development Status

**This project is in very early development stages.** Features are actively being developed and the API may change frequently. The current focus is on:

- Core game logic and multiplayer infrastructure
- UI component architecture and design
- Performance optimization and simulation capabilities
- Documentation and developer experience

## 🎮 Game Types

### Poker (Multiplayer)
- Real-time Texas Hold'em
- WebSocket-based communication
- CPU players for single-player games
- Configurable table layouts

### Blackjack (Single-player)
- Standard rules with house rule options
- Multi-deck shoe management
- Basic strategy implementation
- High-volume Monte Carlo simulations

## 🔧 Development

```bash
# Build all packages
npm run build:all

# Run tests
npm run test:all

# Type checking
npm run typecheck

# Clean rebuild
npm run rebuild
```

## 📦 Project Structure

```
montecarlo/
├── vite-app/          # React frontend application
├── apps/game-server/  # WebSocket multiplayer server
├── packages/          # Shared packages and game engine
└── docs/             # Project documentation
```

## 📄 License

MIT — see [LICENSE](./LICENSE)


