import { io } from 'socket.io-client'

/**
 * Development client for testing the game server
 */
class DevClient {
  private socket: any
  private tableId = 'table-1'

  constructor(url: string = 'ws://127.0.0.1:8080') {
    this.socket = io(url, { path: '/socket.io' })
    this.setupEventHandlers()
  }

  /**
   * Sets up all socket event handlers
   */
  private setupEventHandlers(): void {
    this.socket.on('connect', () => {
      console.log('[client] connected', this.socket.id)
      this.joinTable()
    })

    this.socket.on('state', (s: any) => {
      console.log('[client] state', { 
        handId: s.handId, 
        street: s.street, 
        toAct: s.currentToAct 
      })
    })

    this.socket.on('hand_start', (m: any) => {
      console.log('[client] hand_start', m)
    })

    this.socket.on('post_blind', (m: any) => {
      console.log('[client] post_blind', m)
    })

    this.socket.on('hand_setup', (m: any) => {
      console.log('[client] hand_setup deckRemaining', m.deckRemaining)
    })

    this.socket.on('deal', (m: any) => {
      console.log('[client] deal', m)
    })

    this.socket.on('action', (m: any) => {
      console.log('[client] action', m)
    })

    this.socket.on('disconnect', (r: any) => {
      console.log('[client] disconnect', r)
    })
  }

  /**
   * Joins the default table
   */
  private joinTable(): void {
    this.socket.emit('join', { tableId: this.tableId }, (ack: any) => {
      console.log('[client] join ack', ack)
      this.beginHand()
    })
  }

  /**
   * Begins a new hand
   */
  private beginHand(): void {
    setTimeout(() => {
      this.socket.emit('begin', { tableId: this.tableId }, (ack2: any) => {
        console.log('[client] begin ack', ack2)
      })
    }, 200)
  }
}

// Create and start the dev client
const url = process.env.WS_URL || 'ws://127.0.0.1:8080'
new DevClient(url)



