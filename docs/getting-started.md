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
// Import from the new component structure
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

Configuration is now split by domain:

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
├── ui/                    # UI components
│   ├── poker/            # Poker-specific UI
│   │   ├── components/   # Reusable poker components
│   │   ├── hooks/        # Custom poker hooks
│   │   └── ...
│   └── components/       # Shared UI components
├── config/               # Configuration files
├── poker/                # Poker game logic
├── blackjack/            # Blackjack game logic
└── workers/              # Web Workers
```

### Backend (apps/game-server/)

```
src/
├── index.ts              # Main server file
├── tables/               # Table management
├── protocol.ts           # Message schemas
└── ...
```

### Shared (packages/)

```
packages/
├── shared/               # Common types and protocols
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

### 3. Error Boundary

```typescript
import { PokerErrorBoundary } from '../components/ErrorBoundary'

function App() {
  return (
    <PokerErrorBoundary>
      <PokerGame />
    </PokerErrorBoundary>
  )
}
```

### 4. Performance Monitoring

```typescript
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor'

function Component() {
  const { metrics, measureRenderTime } = usePerformanceMonitor()
  
  useEffect(() => {
    const startTime = performance.now()
    // Component logic
    measureRenderTime(startTime)
  }, [measureRenderTime])
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
- Check performance monitoring metrics
- Verify WebSocket connection stability
- Monitor memory usage

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
- Explore the [API Reference](./api-reference.md)
- Check out the [Contributing Guidelines](./contributing.md)
- Join the development discussions
