# Testing & Security Implementation Plan

## Executive Summary

This document provides comprehensive implementation plans for **testing improvements** and **security hardening** based on analysis of the Montecarlo monorepo. Both areas have solid foundations but need strategic enhancements for production readiness.

**Current Status:**
- **Testing**: Good foundation (75/100) - needs comprehensive coverage
- **Security**: Good basics (80/100) - needs hardening for production

---

## 🧪 Testing Implementation Plan

### Current Testing State Analysis

#### ✅ **Strengths**
- **Excellent Test Setup**: Vitest + React Testing Library + JSDOM
- **Good Test Coverage Structure**: 22 test files across domains
- **Comprehensive Mocking**: WebSocket, Socket.IO, localStorage, etc.
- **Domain Separation**: Tests organized by feature (poker, blackjack, UI)
- **Testing Rules**: Clear testing guidelines in project rules

#### 🟡 **Current Test Coverage**
```
📊 Test Files Found: 22 total
├── UI Components: 4 files (Button, Badge, Card, PokerLobby)
├── Poker Engine: 8 files (flow, rules, evaluation, etc.)
├── Blackjack: 8 files (complete engine coverage)
├── Stores: 1 file (lobbyStore)
└── Integration: 1 file (websocket integration)
```

#### ❌ **Critical Gaps**
1. **State Machine Testing**: No tests for the comprehensive state machine system
2. **Real-time Integration**: Limited WebSocket/Convex integration testing
3. **Security Testing**: No security-focused test suites
4. **Performance Testing**: No load/stress testing
5. **End-to-End Testing**: No E2E testing for multiplayer scenarios
6. **Property-Based Testing**: Missing for game logic validation

### 🎯 Testing Implementation Roadmap

#### **Phase 1: Foundation Enhancement (Week 1-2)**

##### 1.1 State Machine Test Suite
**Priority**: 🔴 Critical | **Effort**: High | **Impact**: High

```typescript
// packages/poker-engine/src/stateMachine/__tests__/stateMachine.test.ts
import { describe, it, expect, vi } from 'vitest'
import { IntegratedPokerStateMachine } from '../integratedPokerMachine'
import { TimedPokerStateMachine } from '../timedPokerMachine'

describe('State Machine Core Functionality', () => {
  describe('Hand Progression', () => {
    it('should transition through all streets correctly', () => {
      const machine = new IntegratedPokerStateMachine([0, 1], new Map([[0, 1000], [1, 1000]]))
      
      // Test preflop -> flop -> turn -> river -> showdown
      expect(machine.getCurrentState().street).toBe('preflop')
      
      machine.processPlayerAction(0, { type: 'call' })
      machine.processPlayerAction(1, { type: 'check' })
      expect(machine.getCurrentState().street).toBe('flop')
      
      // Continue testing all transitions...
    })

    it('should handle all-in scenarios correctly', () => {
      // Test all-in detection and side pot creation
    })

    it('should validate player actions correctly', () => {
      // Test all action validation scenarios
    })
  })

  describe('Timer Integration', () => {
    it('should handle player timeouts correctly', async () => {
      const machine = new TimedPokerStateMachine([0, 1], new Map([[0, 1000], [1, 1000]]))
      
      // Test timeout scenarios
      const timeoutPromise = new Promise(resolve => {
        machine.startTimer({
          type: 'player_action',
          delayMs: 100,
          callback: resolve,
          priority: 'normal'
        })
      })

      await timeoutPromise
      // Verify timeout handling
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid state transitions gracefully', () => {
      // Test error scenarios and recovery
    })

    it('should validate timer configurations', () => {
      // Test timer validation
    })
  })
})
```

##### 1.2 Property-Based Testing Implementation
**Priority**: 🔴 Critical | **Effort**: Medium | **Impact**: High

```bash
# Install property-based testing library
npm install --save-dev fast-check
```

```typescript
// packages/poker-engine/src/__tests__/properties.test.ts
import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { validateAction, executeAction } from '../flow/bettingLogic'
import { createInitialPokerTable } from '../flow'

describe('Poker Engine Properties', () => {
  it('should maintain chip conservation', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        type: fc.constantFrom('call', 'raise', 'fold', 'check'),
        amount: fc.integer({ min: 0, max: 1000 })
      }), { minLength: 1, maxLength: 10 }),
      (actions) => {
        const table = createInitialPokerTable(3, [10, 20], 1000)
        const initialChips = table.seats.reduce((sum, seat) => sum + seat.stack, 0)
        
        // Apply actions and verify chip conservation
        let currentTable = table
        for (const action of actions) {
          const validation = validateAction(currentTable, currentTable.activePlayerIndex, action)
          if (validation.valid) {
            executeAction(currentTable, currentTable.activePlayerIndex, action)
          }
        }
        
        const finalChips = currentTable.seats.reduce((sum, seat) => sum + seat.stack, 0) +
                          currentTable.pots.reduce((sum, pot) => sum + pot.amount, 0)
        
        expect(finalChips).toBe(initialChips)
      }
    ))
  })

  it('should never mutate input state', () => {
    fc.assert(fc.property(
      fc.record({
        seats: fc.array(fc.record({
          stack: fc.integer({ min: 0, max: 1000 }),
          hasFolded: fc.boolean()
        })),
        betToCall: fc.integer({ min: 0, max: 100 })
      }),
      (initialState) => {
        const stateCopy = JSON.parse(JSON.stringify(initialState))
        
        // Perform operations that should not mutate input
        validateAction(initialState as any, 0, { type: 'call' })
        
        expect(initialState).toEqual(stateCopy)
      }
    ))
  })
})
```

##### 1.3 Integration Test Suite
**Priority**: 🟡 High | **Effort**: Medium | **Impact**: High

```typescript
// vite-app/src/__tests__/integration/multiplayer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConvexReactClient } from 'convex/react'
import { PokerLobbyRefactored } from '../../ui/poker/PokerLobbyRefactored'

// Mock WebSocket and Convex for integration testing
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: true
}

const mockConvex = {
  query: vi.fn(),
  mutation: vi.fn(),
  subscribe: vi.fn()
}

describe('Multiplayer Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle complete game flow from connection to showdown', async () => {
    // Test full multiplayer game scenario
    render(<PokerLobbyRefactored />)
    
    // Simulate connection
    expect(mockSocket.connect).toHaveBeenCalled()
    
    // Simulate joining table
    fireEvent.click(screen.getByText('Join Table'))
    expect(mockSocket.emit).toHaveBeenCalledWith('join_table', expect.any(Object))
    
    // Simulate receiving game state
    const mockGameState = {
      status: 'in_hand',
      street: 'preflop',
      seats: [/* mock seats */],
      activePlayerIndex: 0
    }
    
    // Trigger state update
    const onStateCallback = mockSocket.on.mock.calls.find(call => call[0] === 'state')?.[1]
    onStateCallback?.(mockGameState)
    
    await waitFor(() => {
      expect(screen.getByText('Preflop')).toBeInTheDocument()
    })
    
    // Test player actions
    fireEvent.click(screen.getByText('Call'))
    expect(mockSocket.emit).toHaveBeenCalledWith('action', { type: 'call' })
  })

  it('should handle network disconnection and reconnection', async () => {
    // Test network resilience
  })

  it('should sync state with Convex backend', async () => {
    // Test Convex integration
  })
})
```

#### **Phase 2: Advanced Testing (Week 3-4)**

##### 2.1 Performance and Load Testing
**Priority**: 🟡 Medium | **Effort**: High | **Impact**: Medium

```typescript
// packages/poker-engine/src/__tests__/performance.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'
import { IntegratedPokerStateMachine } from '../stateMachine/integratedPokerMachine'

describe('Performance Tests', () => {
  it('should process 1000 actions under 100ms', () => {
    const machine = new IntegratedPokerStateMachine([0, 1], new Map([[0, 10000], [1, 10000]]))
    
    const start = performance.now()
    
    for (let i = 0; i < 1000; i++) {
      machine.processPlayerAction(i % 2, { type: 'call' })
    }
    
    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })

  it('should handle concurrent state machine operations', async () => {
    // Test concurrent access patterns
    const machines = Array.from({ length: 10 }, () => 
      new IntegratedPokerStateMachine([0, 1], new Map([[0, 1000], [1, 1000]]))
    )

    const promises = machines.map(async (machine, index) => {
      return machine.processPlayerAction(index % 2, { type: 'call' })
    })

    const results = await Promise.all(promises)
    expect(results).toHaveLength(10)
  })
})
```

##### 2.2 Security-Focused Testing
**Priority**: 🔴 Critical | **Effort**: Medium | **Impact**: High

```typescript
// vite-app/src/__tests__/security/input-validation.test.ts
import { describe, it, expect } from 'vitest'
import { validateAction } from '../../../packages/poker-engine/src/flow/bettingLogic'
import { sanitizeInput } from '../../utils/security'

describe('Security Tests', () => {
  describe('Input Validation', () => {
    it('should reject malicious input in betting amounts', () => {
      const maliciousInputs = [
        '"><script>alert("xss")</script>',
        'DROP TABLE users;',
        '../../../etc/passwd',
        'Infinity',
        'NaN',
        '-1',
        '1e308'
      ]

      maliciousInputs.forEach(input => {
        const result = validateAction(mockTable, 0, { 
          type: 'bet', 
          amount: input as any 
        })
        expect(result.valid).toBe(false)
      })
    })

    it('should sanitize user display names', () => {
      const maliciousNames = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><svg onload=alert(1)>'
      ]

      maliciousNames.forEach(name => {
        const sanitized = sanitizeInput(name)
        expect(sanitized).not.toContain('<')
        expect(sanitized).not.toContain('>')
        expect(sanitized).not.toContain('javascript:')
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should throttle rapid action submissions', () => {
      // Test rate limiting implementation
    })
  })

  describe('Authentication', () => {
    it('should validate API keys correctly', () => {
      // Test API key validation
    })
  })
})
```

##### 2.3 End-to-End Testing with Playwright
**Priority**: 🟡 Medium | **Effort**: High | **Impact**: High

```bash
# Install Playwright
npm install --save-dev @playwright/test
```

```typescript
// e2e/multiplayer-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Multiplayer Poker Flow', () => {
  test('should complete a full poker hand with multiple players', async ({ page, context }) => {
    // Start game server and Convex backend
    await page.goto('http://localhost:5173')
    
    // Create second browser context for second player
    const secondContext = await context.browser()?.newContext()
    const secondPage = await secondContext?.newPage()
    await secondPage?.goto('http://localhost:5173')
    
    // Player 1 joins table
    await page.click('[data-testid="join-table"]')
    await expect(page.locator('[data-testid="seat-0"]')).toContainText('Player 1')
    
    // Player 2 joins table
    await secondPage?.click('[data-testid="join-table"]')
    await expect(secondPage?.locator('[data-testid="seat-1"]')).toContainText('Player 2')
    
    // Start hand
    await page.click('[data-testid="deal-button"]')
    
    // Verify both players see the same game state
    await expect(page.locator('[data-testid="street"]')).toContainText('Preflop')
    await expect(secondPage?.locator('[data-testid="street"]')).toContainText('Preflop')
    
    // Player 1 calls
    await page.click('[data-testid="call-button"]')
    
    // Player 2 checks
    await secondPage?.click('[data-testid="check-button"]')
    
    // Verify progression to flop
    await expect(page.locator('[data-testid="street"]')).toContainText('Flop')
    await expect(secondPage?.locator('[data-testid="street"]')).toContainText('Flop')
    
    await secondContext?.close()
  })
})
```

#### **Phase 3: Continuous Testing (Week 5-6)**

##### 3.1 Test Coverage Monitoring
```bash
# Add to package.json scripts
"test:coverage": "vitest run --coverage",
"test:coverage:watch": "vitest --coverage --watch",
"test:coverage:threshold": "vitest run --coverage --coverage.threshold.statements=80 --coverage.threshold.functions=80 --coverage.threshold.branches=75"
```

##### 3.2 Automated Test Quality Gates
```yaml
# .github/workflows/test-quality-gates.yml
name: Test Quality Gates
on: [push, pull_request]

jobs:
  test-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:coverage:threshold
      - run: npm run test:e2e
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### 📊 Testing Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Unit Test Coverage | ~40% | >80% | Week 2 |
| Integration Test Coverage | ~10% | >60% | Week 3 |
| State Machine Test Coverage | 0% | >90% | Week 1 |
| E2E Test Coverage | 0% | >50% | Week 4 |
| Performance Test Suite | 0% | Complete | Week 3 |
| Security Test Suite | 0% | Complete | Week 2 |

---

## 🔒 Security Implementation Plan

### Current Security State Analysis

#### ✅ **Current Security Measures**
- **Input Validation**: Zod schema validation throughout
- **API Authentication**: `x-convex-ingest-secret` header authentication
- **Type Safety**: Comprehensive TypeScript prevents many runtime errors
- **Authoritative Server**: Server-side game state validation
- **Environment Configuration**: Basic environment variable usage

#### ❌ **Critical Security Vulnerabilities**

##### 🔴 **High Priority Vulnerabilities**

1. **Hard-coded URLs and Secrets**
```typescript
// VULNERABILITY: Hard-coded production URLs
VITE_CONVEX_URL=https://148.230.118.4  // Exposed in build
prodUrl: "http://148.230.118.4/"        // Exposed in config
```

2. **Missing Rate Limiting**
```typescript
// VULNERABILITY: No rate limiting on API endpoints
http.route({
  path: "/ingest/action",
  method: "POST",
  handler: withIngestAuth(async (ctx, req) => {
    // No rate limiting - vulnerable to DoS
  })
})
```

3. **Insufficient Environment Validation**
```typescript
// VULNERABILITY: No validation of required environment variables
const url = import.meta.env.VITE_CONVEX_URL as string | undefined
if (!url) {
  console.warn('[convex] VITE_CONVEX_URL not set')  // Just warns, continues
}
```

4. **CORS Configuration Issues**
```typescript
// VULNERABILITY: Overly permissive CORS in development
ALLOW_ALL_ORIGINS=1  // Dangerous for production
```

### 🛡️ Security Implementation Roadmap

#### **Phase 1: Critical Security Fixes (Week 1)**

##### 1.1 Environment Variable Security
**Priority**: 🔴 Critical | **Effort**: Low | **Impact**: High

```typescript
// packages/shared/src/config/environment.ts
import { z } from 'zod'

const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  VITE_CONVEX_URL: z.string().url(),
  VITE_WS_URL: z.string().url().optional(),
  CONVEX_INGEST_SECRET: z.string().min(32),
  INSTANCE_SECRET: z.string().min(32),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  FRONTEND_ORIGINS: z.string().transform(str => str.split(',').map(s => s.trim()))
})

export type Environment = z.infer<typeof EnvironmentSchema>

export function validateEnvironment(): Environment {
  const result = EnvironmentSchema.safeParse(process.env)
  
  if (!result.success) {
    console.error('❌ Environment validation failed:')
    result.error.errors.forEach(error => {
      console.error(`  - ${error.path.join('.')}: ${error.message}`)
    })
    process.exit(1)
  }
  
  return result.data
}

// Validate on import
export const env = validateEnvironment()
```

```typescript
// apps/game-server/src/config/env.ts
import { validateEnvironment } from '@montecarlo/shared/config/environment'

export const config = validateEnvironment()

// Additional server-specific validation
if (config.NODE_ENV === 'production') {
  if (config.CONVEX_INGEST_SECRET.length < 64) {
    throw new Error('Production requires CONVEX_INGEST_SECRET to be at least 64 characters')
  }
  
  if (config.HOST === '0.0.0.0') {
    console.warn('⚠️  Warning: Binding to 0.0.0.0 in production. Ensure proper firewall configuration.')
  }
}
```

##### 1.2 API Rate Limiting Implementation
**Priority**: 🔴 Critical | **Effort**: Medium | **Impact**: High

```bash
# Install rate limiting dependencies
npm install --save express-rate-limit express-slow-down
```

```typescript
// convex/rateLimit.ts
import { httpAction } from "./_generated/server"
import { v } from "convex/values"

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMITS = {
  '/ingest/action': { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  '/ingest/handStarted': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 hands per minute
  '/ingest/stateMachineEvent': { maxRequests: 1000, windowMs: 60 * 1000 } // 1000 events per minute
}

export function createRateLimitedHandler(
  endpoint: string,
  handler: Parameters<typeof httpAction>[0]
) {
  return httpAction(async (ctx, req) => {
    const clientId = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'
    
    const key = `${endpoint}:${clientId}`
    const limit = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS]
    
    if (!limit) {
      return handler(ctx, req)
    }
    
    const now = Date.now()
    const record = rateLimitStore.get(key)
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs })
      return handler(ctx, req)
    }
    
    if (record.count >= limit.maxRequests) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((record.resetTime - now) / 1000))
        }
      })
    }
    
    record.count++
    return handler(ctx, req)
  })
}
```

```typescript
// convex/http.ts - Updated with rate limiting
import { createRateLimitedHandler } from './rateLimit'

http.route({
  path: "/ingest/action",
  method: "POST",
  handler: createRateLimitedHandler('/ingest/action', withIngestAuth(async (ctx, req) => {
    const body = await req.json()
    await ctx.runMutation(internal.ingest.action, body)
    return new Response(null, { status: 204 })
  }))
})
```

##### 1.3 Input Sanitization and Validation
**Priority**: 🔴 Critical | **Effort**: Medium | **Impact**: High

```typescript
// packages/shared/src/utils/security.ts
import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 1000) // Limit length
}

// Enhanced validation schemas
export const PlayerNameSchema = z.string()
  .min(1, 'Name cannot be empty')
  .max(50, 'Name too long')
  .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Name contains invalid characters')
  .transform(sanitizeInput)

export const BetAmountSchema = z.number()
  .int('Bet amount must be an integer')
  .min(0, 'Bet amount cannot be negative')
  .max(1000000, 'Bet amount too large')
  .finite('Bet amount must be finite')

export const TableIdSchema = z.string()
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid table ID format')
  .max(100, 'Table ID too long')
```

```typescript
// packages/poker-engine/src/flow/bettingLogic.ts - Enhanced validation
import { BetAmountSchema } from '@montecarlo/shared/utils/security'

export function validateAction(
  state: PokerTableState, 
  seatIndex: number, 
  action: BettingAction
): { valid: boolean; error?: string } {
  // Enhanced input validation
  if (typeof seatIndex !== 'number' || !Number.isInteger(seatIndex)) {
    return { valid: false, error: 'Invalid seat index' }
  }
  
  if (seatIndex < 0 || seatIndex >= state.seats.length) {
    return { valid: false, error: 'Seat index out of range' }
  }
  
  if (action.amount !== undefined) {
    const amountValidation = BetAmountSchema.safeParse(action.amount)
    if (!amountValidation.success) {
      return { valid: false, error: 'Invalid bet amount' }
    }
    action.amount = amountValidation.data
  }
  
  // Existing validation logic...
}
```

#### **Phase 2: Advanced Security Measures (Week 2-3)**

##### 2.1 Content Security Policy (CSP)
**Priority**: 🟡 Medium | **Effort**: Low | **Impact**: Medium

```typescript
// vite-app/vite.config.ts - Add CSP headers
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'csp-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.html')) {
            res.setHeader('Content-Security-Policy', [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // Needed for Vite dev
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' ws: wss:",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; '))
          }
          next()
        })
      }
    }
  ]
})
```

##### 2.2 Enhanced Authentication System
**Priority**: 🟡 Medium | **Effort**: High | **Impact**: High

```typescript
// convex/auth.ts
import { v } from "convex/values"
import { internalQuery } from "./_generated/server"
import crypto from 'crypto'

// JWT-like token structure for enhanced security
export const TokenSchema = v.object({
  userId: v.id("users"),
  sessionId: v.string(),
  issuedAt: v.number(),
  expiresAt: v.number(),
  permissions: v.array(v.string())
})

export const createSecureToken = internalQuery({
  args: { userId: v.id("users"), permissions: v.array(v.string()) },
  returns: v.string(),
  handler: async (ctx, args) => {
    const sessionId = crypto.randomUUID()
    const now = Date.now()
    const expiresAt = now + (24 * 60 * 60 * 1000) // 24 hours
    
    const tokenData = {
      userId: args.userId,
      sessionId,
      issuedAt: now,
      expiresAt,
      permissions: args.permissions
    }
    
    // Store session in database
    await ctx.db.insert("appSessions", {
      userId: args.userId,
      deviceId: sessionId,
      createdAt: now,
      lastSeenAt: now
    })
    
    // Create signed token
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64')
    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
      .update(token)
      .digest('hex')
    
    return `${token}.${signature}`
  }
})

export const validateSecureToken = internalQuery({
  args: { token: v.string() },
  returns: v.union(TokenSchema, v.null()),
  handler: async (ctx, args) => {
    try {
      const [tokenPart, signature] = args.token.split('.')
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
        .update(tokenPart)
        .digest('hex')
      
      if (signature !== expectedSignature) {
        return null
      }
      
      // Parse token
      const tokenData = JSON.parse(Buffer.from(tokenPart, 'base64').toString())
      
      // Check expiration
      if (Date.now() > tokenData.expiresAt) {
        return null
      }
      
      // Verify session exists
      const session = await ctx.db
        .query("appSessions")
        .filter(q => 
          q.eq(q.field("userId"), tokenData.userId) &&
          q.eq(q.field("deviceId"), tokenData.sessionId)
        )
        .first()
      
      if (!session) {
        return null
      }
      
      return tokenData
    } catch {
      return null
    }
  }
})
```

##### 2.3 Network Security Hardening
**Priority**: 🟡 Medium | **Effort**: Medium | **Impact**: Medium

```typescript
// apps/game-server/src/server/security.ts
import helmet from 'helmet'
import cors from '@fastify/cors'

export const securityConfig = {
  // Helmet security headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },

  // CORS configuration
  cors: {
    origin: (origin: string, callback: Function) => {
      const allowedOrigins = process.env.FRONTEND_ORIGINS?.split(',') || []
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true)
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-convex-ingest-secret']
  }
}
```

#### **Phase 3: Monitoring and Compliance (Week 4)**

##### 3.1 Security Monitoring
**Priority**: 🟡 Medium | **Effort**: Medium | **Impact**: Medium

```typescript
// packages/shared/src/monitoring/security.ts
interface SecurityEvent {
  type: 'authentication_failure' | 'rate_limit_exceeded' | 'invalid_input' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: string
  details: Record<string, any>
  timestamp: number
}

class SecurityMonitor {
  private events: SecurityEvent[] = []
  
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now()
    }
    
    this.events.push(securityEvent)
    
    // Alert on critical events
    if (event.severity === 'critical') {
      this.alertCriticalEvent(securityEvent)
    }
    
    // Clean up old events (keep last 1000)
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }
  
  private alertCriticalEvent(event: SecurityEvent) {
    console.error('🚨 CRITICAL SECURITY EVENT:', event)
    // In production: send to monitoring service, email alerts, etc.
  }
  
  getSecuritySummary() {
    const last24h = Date.now() - (24 * 60 * 60 * 1000)
    const recentEvents = this.events.filter(e => e.timestamp > last24h)
    
    return {
      totalEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
      highEvents: recentEvents.filter(e => e.severity === 'high').length,
      eventsByType: recentEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }
}

export const securityMonitor = new SecurityMonitor()
```

##### 3.2 Automated Security Scanning
```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1' # Weekly scan

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v3
        with:
          languages: typescript, javascript
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
      
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### 🎯 Security Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Environment Validation | 20% | 100% | Week 1 |
| API Rate Limiting | 0% | 100% | Week 1 |
| Input Sanitization | 60% | 100% | Week 1 |
| CSP Implementation | 0% | 100% | Week 2 |
| Security Test Coverage | 0% | 80% | Week 2 |
| Automated Security Scanning | 0% | 100% | Week 3 |
| Security Event Monitoring | 0% | 100% | Week 4 |

---

## 🚀 Implementation Timeline

### **Week 1: Critical Foundations**
- ✅ State machine test suite implementation
- ✅ Environment variable security hardening
- ✅ API rate limiting implementation
- ✅ Input validation and sanitization

### **Week 2: Advanced Testing & Security**
- ✅ Property-based testing implementation
- ✅ Security-focused test suite
- ✅ Content Security Policy implementation
- ✅ Enhanced authentication system

### **Week 3: Integration & Performance**
- ✅ Integration test suite completion
- ✅ Performance and load testing
- ✅ Network security hardening
- ✅ Automated security scanning setup

### **Week 4: Monitoring & E2E**
- ✅ End-to-end testing with Playwright
- ✅ Security monitoring implementation
- ✅ Test coverage monitoring setup
- ✅ Documentation and training materials

---

## 📋 Success Criteria

### **Testing Success Criteria**
- [ ] **>80% unit test coverage** across all packages
- [ ] **>60% integration test coverage** for critical paths
- [ ] **Complete state machine test suite** with >90% coverage
- [ ] **Property-based tests** for all game logic functions
- [ ] **E2E tests** covering complete multiplayer scenarios
- [ ] **Performance benchmarks** for all critical operations

### **Security Success Criteria**
- [ ] **Zero high-severity vulnerabilities** in security scans
- [ ] **Complete environment validation** with proper error handling
- [ ] **API rate limiting** on all public endpoints
- [ ] **100% input sanitization** for user-generated content
- [ ] **CSP headers** implemented across all routes
- [ ] **Security monitoring** with automated alerting
- [ ] **Automated security scanning** in CI/CD pipeline

---

## 💡 Best Practices & Recommendations

### **Testing Best Practices**
1. **Test-Driven Development**: Write tests before implementing new features
2. **Test Isolation**: Each test should be independent and repeatable
3. **Realistic Test Data**: Use property-based testing for comprehensive coverage
4. **Performance Benchmarks**: Include performance assertions in tests
5. **Security Testing**: Test all security boundaries and edge cases

### **Security Best Practices**
1. **Defense in Depth**: Multiple layers of security controls
2. **Principle of Least Privilege**: Minimal required permissions
3. **Input Validation**: Validate and sanitize all user inputs
4. **Secure by Default**: Secure configurations as defaults
5. **Regular Security Reviews**: Periodic security assessments

---

This comprehensive plan provides a roadmap for significantly improving both testing and security posture of the Montecarlo monorepo. The phased approach ensures critical vulnerabilities are addressed first while building a robust foundation for long-term security and quality assurance.
