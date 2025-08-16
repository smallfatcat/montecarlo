import { io } from 'socket.io-client';
const url = process.env.WS_URL || 'ws://127.0.0.1:8080';
const socket = io(url, { path: '/socket.io' });
socket.on('connect', () => {
    console.log('[client] connected', socket.id);
    socket.emit('join', { tableId: 'table-1' }, (ack) => {
        console.log('[client] join ack', ack);
        setTimeout(() => {
            socket.emit('begin', { tableId: 'table-1' }, (ack2) => {
                console.log('[client] begin ack', ack2);
            });
        }, 200);
    });
});
socket.on('state', (s) => console.log('[client] state', { handId: s.handId, street: s.street, toAct: s.currentToAct }));
socket.on('hand_start', (m) => console.log('[client] hand_start', m));
socket.on('post_blind', (m) => console.log('[client] post_blind', m));
socket.on('hand_setup', (m) => console.log('[client] hand_setup deckRemaining', m.deckRemaining));
socket.on('deal', (m) => console.log('[client] deal', m));
socket.on('action', (m) => console.log('[client] action', m));
socket.on('disconnect', (r) => console.log('[client] disconnect', r));
