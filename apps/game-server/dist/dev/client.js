import { io } from 'socket.io-client';
/**
 * Development client for testing the game server
 */
class DevClient {
    socket;
    tableId = 'table-1';
    constructor(url = 'ws://127.0.0.1:8080') {
        this.socket = io(url, { path: '/socket.io' });
        this.setupEventHandlers();
    }
    /**
     * Sets up all socket event handlers
     */
    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('[client] connected', this.socket.id);
            this.joinTable();
        });
        this.socket.on('state', (s) => {
            console.log('[client] state', {
                handId: s.handId,
                street: s.street,
                toAct: s.currentToAct
            });
        });
        this.socket.on('hand_start', (m) => {
            console.log('[client] hand_start', m);
        });
        this.socket.on('post_blind', (m) => {
            console.log('[client] post_blind', m);
        });
        this.socket.on('hand_setup', (m) => {
            console.log('[client] hand_setup deckRemaining', m.deckRemaining);
        });
        this.socket.on('deal', (m) => {
            console.log('[client] deal', m);
        });
        this.socket.on('action', (m) => {
            console.log('[client] action', m);
        });
        this.socket.on('disconnect', (r) => {
            console.log('[client] disconnect', r);
        });
    }
    /**
     * Joins the default table
     */
    joinTable() {
        this.socket.emit('join', { tableId: this.tableId }, (ack) => {
            console.log('[client] join ack', ack);
            this.beginHand();
        });
    }
    /**
     * Begins a new hand
     */
    beginHand() {
        setTimeout(() => {
            this.socket.emit('begin', { tableId: this.tableId }, (ack2) => {
                console.log('[client] begin ack', ack2);
            });
        }, 200);
    }
}
// Create and start the dev client
const url = process.env.WS_URL || 'ws://127.0.0.1:8080';
new DevClient(url);
