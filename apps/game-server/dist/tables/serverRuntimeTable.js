import { PokerRuntime } from '@montecarlo/poker-engine';
export function createServerRuntimeTable(io, tableId, opts) {
    const seats = opts?.seats ?? 6;
    const startingStack = opts?.startingStack ?? 5000;
    const cpuSeats = Array.from({ length: seats }, (_, i) => i);
    let lastState = null;
    let autoPlay = false;
    const room = `table:${tableId}`;
    // Seat ownership map socket.id -> seat index
    const seatOwners = new Map();
    const playerNames = new Map();
    let runtime = new PokerRuntime({ seats, cpuSeats, startingStack }, {
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
        if (lastState)
            socket.emit('state', lastState);
        // Always send current autoplay state on join
        try {
            socket.emit('autoplay', { auto: autoPlay });
        }
        catch { }
        try {
            console.log('[server-runtime] join', { socketId: socket.id });
        }
        catch { }
    }
    function removeClient(socket) {
        socket.leave(room);
        const seatIdx = seatOwners.get(socket.id);
        if (seatIdx != null) {
            // Vacate seat: flip back to CPU
            seatOwners.delete(socket.id);
            playerNames.delete(socket.id);
            try {
                runtime.setSeatCpu?.(seatIdx, true);
            }
            catch { }
            io.to(room).emit('seat_update', { seatIndex: seatIdx, isCPU: true, playerId: null, playerName: null });
        }
    }
    return {
        tableId,
        beginHand() { runtime.beginHand(); },
        actFrom(socket, action) {
            const s = lastState;
            if (!s)
                return { ok: false, error: 'no_state' };
            const seatIdx = seatOwners.get(socket.id);
            if (seatIdx == null) {
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
        setAuto(auto) {
            autoPlay = !!auto;
            try {
                runtime.setAutoPlay?.(autoPlay);
            }
            catch { }
            // Emit to everyone including sender so all clients get a consistent event
            io.in(room).emit('autoplay', { auto: autoPlay });
        },
        getAuto() { return autoPlay; },
        getState() { return lastState; },
        addClient,
        removeClient,
        sit(socket, seatIndex, name) {
            const s = lastState;
            if (!s)
                return { ok: false, error: 'no_state' };
            if (seatIndex < 0 || seatIndex >= s.seats.length)
                return { ok: false, error: 'invalid_seat' };
            if (s.status === 'in_hand')
                return { ok: false, error: 'mid_hand' };
            // If this socket already has a seat, vacate it first (move seats)
            const existing = seatOwners.get(socket.id);
            if (existing != null && existing !== seatIndex) {
                try {
                    runtime.setSeatCpu?.(existing, true);
                }
                catch { }
                io.to(room).emit('seat_update', { seatIndex: existing, isCPU: true, playerId: null, playerName: null });
                seatOwners.delete(socket.id);
                playerNames.delete(socket.id);
            }
            // Reject if seat is already taken by another user
            for (const [sid, idx] of seatOwners.entries()) {
                if (idx === seatIndex && sid !== socket.id)
                    return { ok: false, error: 'seat_taken' };
            }
            // Assign seat to this socket and flip to human
            seatOwners.set(socket.id, seatIndex);
            playerNames.set(socket.id, name);
            try {
                runtime.setSeatCpu?.(seatIndex, false);
            }
            catch { }
            io.to(room).emit('seat_update', { seatIndex, isCPU: false, playerId: socket.id, playerName: name });
            return { ok: true };
        },
        leave(socket) {
            const s = lastState;
            if (!s)
                return { ok: false, error: 'no_state' };
            const seatIdx = seatOwners.get(socket.id);
            if (seatIdx == null)
                return { ok: false, error: 'not_seated' };
            if (s.status === 'in_hand')
                return { ok: false, error: 'mid_hand' };
            seatOwners.delete(socket.id);
            playerNames.delete(socket.id);
            try {
                runtime.setSeatCpu?.(seatIdx, true);
            }
            catch { }
            io.to(room).emit('seat_update', { seatIndex: seatIdx, isCPU: true, playerId: null, playerName: null });
            return { ok: true };
        },
        reset() {
            try {
                runtime.dispose?.();
            }
            catch { }
            runtime = new PokerRuntime({ seats, cpuSeats, startingStack }, {
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
                        console.log('[server-runtime] action', { handId, seat, action: action?.type, toCall, street });
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
            autoPlay = false;
            lastState = runtime['state'];
            io.to(room).emit('state', lastState);
            io.in(room).emit('autoplay', { auto: autoPlay });
        },
    };
}
