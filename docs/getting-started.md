# Getting Started with Montecarlo

## Prerequisites

- Node.js 18+ 
- npm 9+
- Git

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/smallfatcat/montecarlo.git
   cd montecarlo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   # Start both frontend and backend
   npm run dev:all
   
   # Or start individually
   npm run dev:frontend    # Frontend only
   npm run dev:backend     # Backend only
   ```

4. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8080

## Development Workflow

### 1. Component Development

When working on poker table components:

```typescript
// Import from the modular component structure
import { 
  PokerTableLayout,
  PokerTableSeats,
  PokerTableBoard 
} from './components'

// Use focused hooks for specific functionality
import { 
  usePokerGameState,
  usePokerHistory,
  usePokerSettings 
} from './hooks'
```

### 2. Configuration Changes

Configuration is organized by domain with modular structure:

```typescript
// Domain-specific configuration
import { POKER_CONFIG } from '../config/poker.config'
import { BLACKJACK_CONFIG } from '../config/blackjack.config'
import { UI_CONFIG } from '../config/ui.config'

// Main config (combines all domains)
import { CONFIG } from '../config'
```

### 3. Adding New Features

#### New Component
```typescript
// vite-app/src/ui/poker/components/NewComponent.tsx
export interface NewComponentProps {
  // Define props
}

export function NewComponent({ ...props }: NewComponentProps) {
  // Component logic
}
```

#### New Hook
```typescript
// vite-app/src/ui/poker/hooks/useNewFeature.ts
export function useNewFeature() {
  // Hook logic
  return { /* values */ }
}
```

#### Update Exports
```typescript
// vite-app/src/ui/poker/components/index.ts
export { NewComponent } from './NewComponent'
```

### 4. Working with Modular Architecture

The project follows strict modular patterns:

- **File Size Limit**: Maximum 200 lines per file
- **Function Size Limit**: Maximum 50 lines per function
- **Single Responsibility**: Each file has one clear purpose
- **Barrel Exports**: Clean import/export patterns

#### Example: Adding New Poker Strategy

```typescript
// vite-app/src/poker/strategy/newStrategy.ts
export function calculateNewStrategy(/* params */) {
  // Strategy logic (under 50 lines)
}

// vite-app/src/poker/strategy/index.ts
export { calculateNewStrategy } from './newStrategy'
```

#### Example: Adding New Game Flow

```typescript
// vite-app/src/poker/flow/newFlow.ts
export function handleNewFlow(/* params */) {
  // Flow logic (under 50 lines)
}

// vite-app/src/poker/flow/index.ts
export { handleNewFlow } from './newFlow'
```

## Project Structure

### Frontend (`vite-app/`)
```
src/
├── ui/                    # UI components and hooks
├── config/                # Modular configuration
│   ├── index.ts          # Main config aggregator
│   ├── poker.config.ts   # Poker configuration
│   ├── blackjack.config.ts # Blackjack configuration
│   ├── ui.config.ts      # UI configuration
│   └── legacy.config.ts  # Legacy compatibility
├── poker/                 # Poker game logic (modular)
│   ├── flow/             # Game flow management
│   ├── strategy/          # Strategy engine
│   ├── handEval/         # Hand evaluation
│   └── predefinedHands/  # Predefined hands
├── blackjack/             # Blackjack game logic (modular)
│   └── simulation/        # Simulation engine
├── stores/                # State management (modular)
│   └── lobby/             # Lobby store modules
└── workers/               # Web Workers for simulations
    └── equity/            # Equity calculation worker
```

### Backend (`apps/game-server/`)
```
src/
├── config/                # Environment configuration
├── server/                # Server setup
├── identity/              # Identity management
├── tables/                # Table factory exports
├── sockets/                # Socket event handlers
└── index.ts               # Main server orchestration
```

### Shared Packages (`packages/`)
```
packages/
├── shared/                # Common types and protocols
│   └── src/protocol/      # Protocol schemas (modular)
└── poker-engine/          # Poker game engine (modular)
    └── src/
        ├── flow/          # Game flow management
        ├── strategy/       # Strategy engine
        └── types.ts       # Core types
```

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

## Building and Testing

### Development Build
```bash
# Build all packages
npm run build:all

# Build specific package
npm run build:shared
npm run build:poker-engine
npm run build:game-server
```

### Testing
```bash
# Run all tests
npm run test:all

# Type checking
npm run typecheck
```

### Clean Rebuild
```bash
# Clean rebuild with version generation
npm run rebuild
```

## Common Development Tasks

### Adding New Configuration
1. Create domain-specific config file in `src/config/`
2. Export configuration object
3. Import and combine in main `config/index.ts`
4. Update types if needed

### Adding New Game Logic
1. Create focused module file (under 200 lines)
2. Implement single responsibility functions (under 50 lines)
3. Add to appropriate barrel export
4. Update tests and documentation

### Adding New Socket Events
1. Define message schema in `packages/shared/src/protocol/`
2. Add handler in `apps/game-server/src/sockets/handlers.ts`
3. Update client-side event handling
4. Test end-to-end communication

## Troubleshooting

### Common Issues

#### Build Errors
- Ensure all packages are built in correct order
- Check TypeScript compilation in each package
- Verify import/export paths are correct

#### Module Resolution
- Use relative imports within packages
- Use package imports for cross-package dependencies
- Check barrel export files are up to date

#### Configuration Issues
- Verify domain-specific config files exist
- Check main config aggregator imports
- Ensure backward compatibility for legacy components

### Getting Help

- Check the [Architecture](./architecture.md) documentation
- Review [System Overview](./system-overview.md) for high-level understanding
- Examine existing modular patterns for guidance
- Use TypeScript compiler for type checking and error detection
