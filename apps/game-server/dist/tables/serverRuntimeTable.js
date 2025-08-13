import { PokerRuntime } from '@montecarlo/poker-engine';
export function createServerRuntimeTable(io, tableId, opts) {
    const seats = opts?.seats ?? 6;
    const startingStack = opts?.startingStack ?? 5000;
    const cpuSeats = Array.from({ length: Math.max(0, seats - 1) }, (_, i) => i + 1);
    let lastState = null;
    const room = `table:${tableId}`;
    // Simple seat assignment: first join gets seat 0; others are spectators
    let seat0Owner = null;
    const runtime = new PokerRuntime({ seats, cpuSeats, startingStack }, {
        onState: (s) => {
            lastState = s;
            io.to(room).emit('state', s);
            try {
                console.log('[server-runtime] state', { handId: s.handId, street: s.street, toAct: s.currentToAct });
            }
            catch { }
        },
        onAction: (handId, seat, action, toCall, street) => {
            io.to(room).emit('action', { handId, seat, action, toCall, street });
            try {
                console.log('[server-runtime] action', { handId, seat, action: action.type, toCall, street });
            }
            catch { }
        },
        onDeal: (handId, street, cardCodes) => {
            io.to(room).emit('deal', { handId, street, cards: cardCodes });
            try {
                console.log('[server-runtime] deal', { handId, street, cards: cardCodes.join(' ') });
            }
            catch { }
        },
        onHandStart: (handId, buttonIndex, smallBlind, bigBlind) => {
            io.to(room).emit('hand_start', { handId, buttonIndex, smallBlind, bigBlind });
            try {
                console.log('[server-runtime] hand_start', { handId, buttonIndex, smallBlind, bigBlind });
            }
            catch { }
        },
        onPostBlind: (seat, amount) => {
            // Attach to last known hand id if available
            const hid = lastState?.handId ?? null;
            io.to(room).emit('post_blind', { handId: hid, seat, amount });
            try {
                console.log('[server-runtime] post_blind', { handId: hid, seat, amount });
            }
            catch { }
        },
        onHandSetup: (setup) => {
            io.to(room).emit('hand_setup', setup);
            try {
                console.log('[server-runtime] hand_setup', { handId: setup.handId, seats: setup.seats.length, deckRemaining: setup.deckRemaining });
            }
            catch { }
        },
    });
    function addClient(socket) {
        socket.join(room);
        if (seat0Owner == null)
            seat0Owner = socket.id;
        if (lastState)
            socket.emit('state', lastState);
        try {
            console.log('[server-runtime] join', { socketId: socket.id, seat0Owner });
        }
        catch { }
    }
    function removeClient(socket) {
        socket.leave(room);
        if (seat0Owner === socket.id)
            seat0Owner = null;
    }
    return {
        tableId,
        beginHand() { runtime.beginHand(); },
        actFrom(socket, action) {
            const s = lastState;
            if (!s)
                return { ok: false, error: 'no_state' };
            const seatIdx = (seat0Owner === socket.id) ? 0 : -1;
            if (seatIdx !== 0) {
                try {
                    console.log('[server-runtime] act rejected', { socketId: socket.id, reason: 'not_seated' });
                }
                catch { }
                ;
                return { ok: false, error: 'not_seated' };
            }
            if (s.status !== 'in_hand' || s.currentToAct !== seatIdx) {
                try {
                    console.log('[server-runtime] act rejected', { socketId: socket.id, reason: 'not_your_turn', currentToAct: s.currentToAct });
                }
                catch { }
                ;
                return { ok: false, error: 'not_your_turn' };
            }
            try {
                runtime.act(action);
                try {
                    console.log('[server-runtime] act accepted', { socketId: socket.id, action: action?.type });
                }
                catch { }
                return { ok: true };
            }
            catch (e) {
                try {
                    console.log('[server-runtime] act error', { socketId: socket.id, error: e?.message });
                }
                catch { }
                return { ok: false, error: e?.message || 'act_failed' };
            }
        },
        setAuto(auto) { runtime.setAutoPlay ? runtime.setAutoPlay(auto) : undefined; },
        getState() { return lastState; },
        addClient,
        removeClient,
    };
}
