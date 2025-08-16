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
// Import from the component structure
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

Configuration is split by domain:

```typescript
// Game rules and logic
import { GAME_CONFIG } from '../config/game'

// UI layout and styling
import { UI_CONFIG } from '../config/ui'

// Poker-specific settings
import { POKER_CONFIG } from '../config/poker'

// Main config (combines all)
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

// vite-app/src/ui/poker/hooks/index.ts
export { useNewFeature } from './useNewFeature'
```

### 4. Testing

```bash
# Run all tests
npm run test:all

# Watch mode for frontend tests
npm run test:watch

# Type checking
npm run typecheck
```

## Project Structure

### Frontend (vite-app/)

```
src/
├── ui/                    # UI components and hooks
│   ├── poker/            # Poker-specific UI
│   │   ├── components/   # Reusable poker components
│   │   ├── hooks/        # Custom poker hooks
│   │   └── ...
│   ├── components/       # Shared UI components
│   ├── hooks/            # Shared UI hooks
│   ├── controls/         # Game control components
│   └── handLayouts/      # Hand layout components
├── config/               # Configuration files
├── poker/                # Poker game logic
├── blackjack/            # Blackjack game logic
└── workers/              # Web Workers for simulations
```

### Backend (apps/game-server/)

The game server provides authoritative multiplayer functionality for poker games:

```
src/
├── index.ts              # Main server file with Socket.IO setup
├── tables/               # Table management and runtime
│   ├── serverRuntimeTable.ts  # Core table logic and state management
│   └── inMemoryTable.ts       # Table instance creation
├── protocol.ts           # Message schemas (imported from shared package)
└── dev/                  # Development utilities
```

**Key Features:**
- **Real-time Communication**: WebSocket-based multiplayer
- **Authoritative State**: Single source of truth for game state
- **Message Validation**: Zod-based protocol validation
- **Table Management**: Dynamic table creation and management
- **CPU Integration**: AI players for single-player games

### Shared (packages/)

```
packages/
├── shared/               # Common types and protocols
│   └── src/
│       └── protocol.ts   # Zod schemas for client-server communication
└── poker-engine/         # Poker game engine
```

## Key Concepts

### Component Architecture

- **Single Responsibility**: Each component has one clear purpose
- **Composition**: Build complex UIs from simple components
- **Props Interface**: Well-defined component contracts
- **Reusability**: Components can be used in different contexts

### Hook Architecture

- **Focused Logic**: Each hook handles one aspect of functionality
- **State Management**: Local state with clear update patterns
- **Side Effects**: Controlled effect management
- **Custom Logic**: Encapsulate complex behavior

### Configuration Management

- **Domain Separation**: Different configs for different concerns
- **Type Safety**: Full TypeScript support
- **Environment Support**: Development vs production configs
- **Validation**: Runtime configuration validation

### Simulation Architecture

- **High-Speed Runner**: Pure function simulation for maximum performance
- **Web Worker Integration**: Background thread processing
- **Progress Tracking**: Real-time simulation updates
- **Configurable Parameters**: Adjustable simulation settings

### Multiplayer Architecture

- **Authoritative Server**: Game server enforces all rules
- **Real-time Protocol**: WebSocket communication with validation
- **State Synchronization**: Automatic client state updates
- **Connection Management**: Robust connection handling

## Common Patterns

### 1. Component with Props

```typescript
interface ComponentProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function Component({ value, onChange, disabled = false }: ComponentProps) {
  // Component implementation
}
```

### 2. Custom Hook

```typescript
export function useCustomHook(initialValue: string) {
  const [value, setValue] = useState(initialValue)
  
  const updateValue = useCallback((newValue: string) => {
    setValue(newValue)
  }, [])
  
  return { value, updateValue }
}
```

### 3. Simulation Runner

```typescript
import { useSimulationRunner } from '../ui/useSimulationRunner'

function SimulationComponent() {
  const { run, progress, isRunning } = useSimulationRunner()
  
  const handleRunSimulation = () => {
    run({
      numHands: 10000,
      numPlayers: 4,
      deckCount: 6,
      initialBankrolls: [1000, 1000, 1000, 1000],
      casinoInitial: 10000,
      betsBySeat: [10, 10, 10, 10]
    }, (result) => {
      console.log('Simulation complete:', result)
    })
  }
  
  return (
    <div>
      <button onClick={handleRunSimulation} disabled={isRunning}>
        Run Simulation
      </button>
      {progress && (
        <div>Progress: {progress.done}/{progress.total}</div>
      )}
    </div>
  )
}
```

### 4. Game Server Integration

```typescript
import { usePokerGame } from '../ui/poker/usePokerGame'

function PokerGameComponent() {
  const { 
    connect, 
    joinTable, 
    sit, 
    act, 
    state, 
    isConnected 
  } = usePokerGame()
  
  const handleJoinGame = () => {
    connect('ws://localhost:8080')
    joinTable('table-1')
    sit(0, 'Player1')
  }
  
  const handleAction = (action: 'fold' | 'call' | 'raise', amount?: number) => {
    act(action, amount)
  }
  
  return (
    <div>
      {!isConnected ? (
        <button onClick={handleJoinGame}>Join Game</button>
      ) : (
        <div>
          <button onClick={() => handleAction('fold')}>Fold</button>
          <button onClick={() => handleAction('call')}>Call</button>
          <button onClick={() => handleAction('raise', 100)}>Raise $100</button>
        </div>
      )}
    </div>
  )
}
```

## Troubleshooting

### Build Issues

```bash
# Clean and rebuild
npm run rebuild

# Check for type errors
npm run typecheck

# Verify workspace setup
npm run build:packages
```

### Development Issues

```bash
# Restart development servers
npm run dev:all

# Check backend status
curl http://localhost:8080/healthz

# Clear browser cache and reload
```

### Performance Issues

- Use React DevTools Profiler
- Check Web Worker performance
- Verify WebSocket connection stability
- Monitor memory usage

### Game Server Issues

```bash
# Check server logs
cd apps/game-server
npm run dev

# Verify environment configuration
cat .env

# Test WebSocket connection
curl http://localhost:8080/healthz
```

## Contributing

1. **Create a feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes following the established patterns**

3. **Test your changes**
   ```bash
   npm run test:all
   npm run typecheck
   ```

4. **Submit a pull request**

## Next Steps

- Read the [Architecture Guide](./architecture.md)
- Explore the [System Overview](./system-overview.md)
- Check out the [Poker Realtime Usage](./poker-realtime-usage.md)
- Join the development discussions
