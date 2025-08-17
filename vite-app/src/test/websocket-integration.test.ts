import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { WebSocketTestClientImpl, createMockWebSocketClient } from './websocket-test-utils'

// These tests require the game server to be running
// Set VITE_SKIP_WEBSOCKET_TESTS=true to skip them in CI/CD
const SKIP_WEBSOCKET_TESTS = import.meta.env.VITE_SKIP_WEBSOCKET_TESTS === 'true'

describe('WebSocket Integration Tests', () => {
  let client: WebSocketTestClientImpl

  beforeAll(async () => {
    if (SKIP_WEBSOCKET_TESTS) {
      console.log('Skipping WebSocket integration tests')
      return
    }

    client = new WebSocketTestClientImpl()
  })

  afterAll(async () => {
    if (client) {
      client.disconnect()
    }
  })

  beforeEach(async () => {
    if (SKIP_WEBSOCKET_TESTS) return
    client.clearEvents()
  })

  it('should connect to the WebSocket server', async () => {
    if (SKIP_WEBSOCKET_TESTS) {
      expect(true).toBe(true) // Skip test
      return
    }

    await expect(client.connect()).resolves.toBeUndefined()
    expect(client.socket.connected).toBe(true)
  }, 10000) // Increased timeout for real connection

  it('should receive ready event on connection', async () => {
    if (SKIP_WEBSOCKET_TESTS) {
      expect(true).toBe(true) // Skip test
      return
    }

    await client.connect()

    const readyEvent = await client.waitForEvent('ready', 2000)
    expect(readyEvent).toBeDefined()
    expect(readyEvent.serverTime).toBeDefined()
    expect(typeof readyEvent.serverTime).toBe('number')
  }, 10000)

  it('should identify player successfully', async () => {
    if (SKIP_WEBSOCKET_TESTS) {
      expect(true).toBe(true) // Skip test
      return
    }

    await client.connect()

    const response = await client.emit('identify', { name: 'TestPlayer' })
    expect(response).toBeDefined()
    expect(response.token).toBeDefined()
    expect(response.name).toBe('TestPlayer')
  }, 10000)

  it('should join lobby and receive table list', async () => {
    if (SKIP_WEBSOCKET_TESTS) {
      expect(true).toBe(true) // Skip test
      return
    }

    await client.connect()
    await client.emit('identify', { name: 'TestPlayer' })

    const response = await client.emit('joinLobby', {})
    expect(response).toBeDefined()
    expect(response.tables).toBeDefined()
    expect(Array.isArray(response.tables)).toBe(true)
  }, 10000)

  it('should create a new table', async () => {
    if (SKIP_WEBSOCKET_TESTS) {
      expect(true).toBe(true) // Skip test
      return
    }

    await client.connect()
    await client.emit('identify', { name: 'TestPlayer' })

    const response = await client.emit('createTable', {
      seats: 6,
      startingStack: 5000
    })
    expect(response).toBeDefined()
    expect(response.ok).toBe(true)
  }, 10000)

  it('should handle table updates in real-time', async () => {
    if (SKIP_WEBSOCKET_TESTS) {
      expect(true).toBe(true) // Skip test
      return
    }

    await client.connect()
    await client.emit('identify', { name: 'TestPlayer' })

    // Create a table
    await client.emit('createTable', { seats: 6, startingStack: 5000 })

    // Wait for table update event
    const tableUpdate = await client.waitForEvent('table_update', 3000)
    expect(tableUpdate).toBeDefined()
    expect(tableUpdate.tableId).toBeDefined()
    expect(tableUpdate.seats).toBe(6)
  }, 15000)

  it('should handle ping/pong for connection health', async () => {
    if (SKIP_WEBSOCKET_TESTS) {
      expect(true).toBe(true) // Skip test
      return
    }

    await client.connect()

    const timestamp = Date.now()
    const response = await client.emit('ping', { ts: timestamp })
    expect(response).toBeDefined()
    expect(response.ok).toBe(true)
    expect(response.echoedAt).toBeDefined()
    expect(response.echoedAt).toBeGreaterThanOrEqual(timestamp)
  }, 10000)
})

describe('WebSocket Mock Tests', () => {
  let mockClient: ReturnType<typeof createMockWebSocketClient>

  beforeEach(() => {
    mockClient = createMockWebSocketClient()
  })

  it('should create mock client successfully', () => {
    expect(mockClient).toBeDefined()
    expect(mockClient.socket).toBeDefined()
    expect(mockClient.connect).toBeDefined()
    expect(mockClient.emit).toBeDefined()
  })

  it('should mock connection successfully', async () => {
    await expect(mockClient.connect()).resolves.toBeUndefined()
  })

  it('should mock emit successfully', async () => {
    const response = await mockClient.emit('test', { data: 'test' })
    expect(response).toEqual({ ok: true })
  })

  it('should mock event waiting', async () => {
    const eventPromise = mockClient.waitForEvent('test')
    await expect(eventPromise).resolves.toEqual({})
  })
})
