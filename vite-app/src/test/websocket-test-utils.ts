import { io, Socket } from 'socket.io-client'
import { vi } from 'vitest'

export interface WebSocketTestClient {
  socket: Socket
  connect: () => Promise<void>
  disconnect: () => void
  emit: (event: string, data: any) => Promise<any>
  waitForEvent: (event: string, timeout?: number) => Promise<any>
  clearEvents: () => void
}

export class WebSocketTestClientImpl implements WebSocketTestClient {
  public socket: Socket
  private eventQueue: Map<string, any[]> = new Map()
  private eventResolvers: Map<string, Array<(value: any) => void>> = new Map()

  constructor(url: string = 'http://localhost:8080') {
    this.socket = io(url, {
      transports: ['websocket'],
      timeout: 5000,
      forceNew: true
    })

    // Set up event listeners for common events
    this.socket.on('ready', (data) => this.queueEvent('ready', data))
    this.socket.on('table_update', (data) => this.queueEvent('table_update', data))
    this.socket.on('table_removed', (data) => this.queueEvent('table_removed', data))
    this.socket.on('error', (data) => this.queueEvent('error', data))
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        resolve()
      })
      
      this.socket.on('connect_error', (error) => {
        reject(error)
      })

      this.socket.connect()
    })
  }

  disconnect(): void {
    this.socket.disconnect()
  }

  async emit(event: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, data, (response: any) => {
        if (response && response.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }

  async waitForEvent(event: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`))
      }, timeout)

      // Check if event already occurred
      const queued = this.eventQueue.get(event)
      if (queued && queued.length > 0) {
        clearTimeout(timer)
        resolve(queued.shift())
        return
      }

      // Wait for event
      if (!this.eventResolvers.has(event)) {
        this.eventResolvers.set(event, [])
      }
      this.eventResolvers.get(event)!.push((value) => {
        clearTimeout(timer)
        resolve(value)
      })
    })
  }

  private queueEvent(event: string, data: any): void {
    if (!this.eventQueue.has(event)) {
      this.eventQueue.set(event, [])
    }
    this.eventQueue.get(event)!.push(data)

    // Resolve any waiting promises
    const resolvers = this.eventResolvers.get(event)
    if (resolvers && resolvers.length > 0) {
      const resolver = resolvers.shift()!
      resolver(data)
    }
  }

  clearEvents(): void {
    this.eventQueue.clear()
    this.eventResolvers.clear()
  }
}

export function createMockWebSocketClient(): WebSocketTestClient {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false
  } as any

  return {
    socket: mockSocket,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    emit: vi.fn().mockResolvedValue({ ok: true }),
    waitForEvent: vi.fn().mockResolvedValue({}),
    clearEvents: vi.fn()
  }
}

export function setupWebSocketTestEnvironment() {
  // This function can be used to set up additional test environment if needed
  // Currently not needed as the main setup is handled in the test setup file
}
