import { PokerRuntime } from '@montecarlo/poker-engine';
export function createServerRuntimeTable(io, tableId, opts) {
    const seats = opts?.seats ?? 6;
    const startingStack = opts?.startingStack ?? 5000;
    const cpuSeats = Array.from({ length: seats }, (_, i) => i);
    let lastState = null;
    let autoPlay = false;
    const room = `table:${tableId}`;
    // Seat ownership map playerId -> seat index
    const seatOwners = new Map();
    const playerNames = new Map();
    const disconnectGraceMs = Math.max(0, opts?.disconnectGraceMs ?? 15000);
    const pendingReleases = new Map();
    let runtime = new PokerRuntime({ seats, cpuSeats, startingStack }, {
        onState: (s) => {
            lastState = s;
            io.to(room).emit('state', s);
            try {
                console.log('[server-runtime] state', { handId: s.handId, street: s.street, toAct: s.currentToAct });
            }
            catch { }
            try {
                opts?.onSummaryChange?.(getSummary());
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
        // If this socket has an identified playerId and that player already owns a seat, inform them
        try {
            const pid = socket.data?.playerId || null;
            if (pid && seatOwners.has(pid)) {
                const seatIdx = seatOwners.get(pid);
                const name = playerNames.get(pid) ?? null;
                socket.emit('seat_update', { seatIndex: seatIdx, isCPU: false, playerId: pid, playerName: name });
            }
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
            // Do not auto-vacate seat on raw client removal; reconnection grace is handled separately
        }
    }
    return {
        tableId,
        beginHand() { runtime.beginHand(); },
        actFrom(socket, action) {
            // Back-compat: use socket.id as playerId if identity not used
            return this.actFromId(socket.id, action);
        },
        actFromId(playerId, action) {
            const s = lastState;
            if (!s)
                return { ok: false, error: 'no_state' };
            const seatIdx = seatOwners.get(playerId);
            if (seatIdx == null) {
                try {
                    console.log('[server-runtime] act rejected', { playerId, reason: 'not_seated' });
                }
                catch { }
                ;
                return { ok: false, error: 'not_seated' };
            }
            if (s.status !== 'in_hand' || s.currentToAct !== seatIdx) {
                try {
                    console.log('[server-runtime] act rejected', { playerId, reason: 'not_your_turn', currentToAct: s.currentToAct });
                }
                catch { }
                ;
                return { ok: false, error: 'not_your_turn' };
            }
            try {
                runtime.act(action);
                try {
                    console.log('[server-runtime] act accepted', { playerId, action: action?.type });
                }
                catch { }
                return { ok: true };
            }
            catch (e) {
                try {
                    console.log('[server-runtime] act error', { playerId, error: e?.message });
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
            return this.sitId(socket.id, seatIndex, name);
        },
        sitId(playerId, seatIndex, name) {
            const s = lastState;
            if (!s)
                return { ok: false, error: 'no_state' };
            if (seatIndex < 0 || seatIndex >= s.seats.length)
                return { ok: false, error: 'invalid_seat' };
            if (s.status === 'in_hand')
                return { ok: false, error: 'mid_hand' };
            // If this player already has a seat, vacate it first (move seats)
            const existing = seatOwners.get(playerId);
            if (existing != null && existing !== seatIndex) {
                try {
                    runtime.setSeatCpu?.(existing, true);
                }
                catch { }
                io.to(room).emit('seat_update', { seatIndex: existing, isCPU: true, playerId: null, playerName: null });
                seatOwners.delete(playerId);
                playerNames.delete(playerId);
            }
            // Reject if seat is already taken by another user
            for (const [pid, idx] of seatOwners.entries()) {
                if (idx === seatIndex && pid !== playerId)
                    return { ok: false, error: 'seat_taken' };
            }
            // Assign seat to this player and flip to human
            seatOwners.set(playerId, seatIndex);
            playerNames.set(playerId, name);
            // Cancel pending release if reconnecting
            const pending = pendingReleases.get(playerId);
            if (pending) {
                try {
                    clearTimeout(pending);
                }
                catch { }
                ;
                pendingReleases.delete(playerId);
            }
            try {
                runtime.setSeatCpu?.(seatIndex, false);
            }
            catch { }
            io.to(room).emit('seat_update', { seatIndex, isCPU: false, playerId, playerName: name });
            try {
                opts?.onSummaryChange?.(getSummary());
            }
            catch { }
            return { ok: true };
        },
        leave(socket) {
            return this.leaveId(socket.id);
        },
        leaveId(playerId) {
            const s = lastState;
            if (!s)
                return { ok: false, error: 'no_state' };
            const seatIdx = seatOwners.get(playerId);
            if (seatIdx == null)
                return { ok: false, error: 'not_seated' };
            if (s.status === 'in_hand')
                return { ok: false, error: 'mid_hand' };
            seatOwners.delete(playerId);
            playerNames.delete(playerId);
            try {
                runtime.setSeatCpu?.(seatIdx, true);
            }
            catch { }
            io.to(room).emit('seat_update', { seatIndex: seatIdx, isCPU: true, playerId: null, playerName: null });
            try {
                opts?.onSummaryChange?.(getSummary());
            }
            catch { }
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
                    try {
                        opts?.onSummaryChange?.(getSummary());
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
            try {
                opts?.onSummaryChange?.(getSummary());
            }
            catch { }
        },
        getSummary,
        handleDisconnect(playerId) {
            if (!seatOwners.has(playerId))
                return;
            if (pendingReleases.has(playerId))
                return;
            if (disconnectGraceMs <= 0)
                return;
            const seatIdx = seatOwners.get(playerId);
            const handle = setTimeout(() => {
                pendingReleases.delete(playerId);
                try {
                    runtime.setSeatCpu?.(seatIdx, true);
                }
                catch { }
                seatOwners.delete(playerId);
                playerNames.delete(playerId);
                io.to(room).emit('seat_update', { seatIndex: seatIdx, isCPU: true, playerId: null, playerName: null });
                try {
                    opts?.onSummaryChange?.(getSummary());
                }
                catch { }
            }, disconnectGraceMs);
            pendingReleases.set(playerId, handle);
        }
    };
    function getSummary() {
        const s = lastState;
        const totalSeats = s?.seats?.length ?? seats;
        let humans = seatOwners.size;
        humans = Math.min(humans, totalSeats);
        const cpus = Math.max(0, totalSeats - humans);
        const status = s?.status || 'unknown';
        const handId = typeof s?.handId === 'number' ? s.handId : null;
        return {
            tableId,
            seats: totalSeats,
            humans,
            cpus,
            status,
            handId,
            updatedAt: Date.now(),
        };
    }
}
