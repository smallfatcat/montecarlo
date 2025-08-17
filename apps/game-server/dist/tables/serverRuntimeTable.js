import { PokerRuntime } from '@montecarlo/poker-engine';
export function createServerRuntimeTable(io, tableId, opts) {
    const seats = opts?.seats ?? 6;
    const startingStack = opts?.startingStack ?? 5000;
    const cpuSeats = Array.from({ length: seats }, (_, i) => i);
    let lastState = null;
    // Track autoplay per client per seat
    const clientAutoplay = new Map(); // playerId -> Set of seat indices with autoplay enabled
    const room = `table:${tableId}`;
    // Seat ownership map playerId -> seat index
    const seatOwners = new Map();
    const playerNames = new Map();
    const disconnectGraceMs = Math.max(0, opts?.disconnectGraceMs ?? 15000);
    const pendingReleases = new Map();
    const playersInRoom = new Set();
    const reservedBySeat = new Map(); // seatIndex -> reservation
    const shouldAutoplaySeat = (seatIndex) => {
        for (const [, seatSet] of clientAutoplay.entries()) {
            if (seatSet.has(seatIndex))
                return true;
        }
        return false;
    };
    let runtime = new PokerRuntime({ seats, cpuSeats, startingStack, shouldAutoplaySeat }, {
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
        // If this socket has an identified playerId and that player already owns a seat, inform them
        try {
            const pid = socket.data?.playerId || null;
            if (pid) {
                playersInRoom.add(pid);
                // Cancel pending release on reconnect into table room
                const pending = pendingReleases.get(pid);
                if (pending) {
                    try {
                        clearTimeout(pending);
                    }
                    catch { }
                    ;
                    pendingReleases.delete(pid);
                }
                // If this player had a reservation, clear it for everyone
                for (const [seatIdx, res] of reservedBySeat.entries()) {
                    if (res.playerId === pid) {
                        reservedBySeat.delete(seatIdx);
                        try {
                            io.in(room).emit('seat_reservation_cleared', { seatIndex: seatIdx });
                        }
                        catch { }
                    }
                }
            }
            // Send current seating map (all occupied seats) to this client
            for (const [ownerId, seatIdx] of seatOwners.entries()) {
                const pname = playerNames.get(ownerId) ?? null;
                socket.emit('seat_update', { seatIndex: seatIdx, isCPU: false, playerId: ownerId, playerName: pname });
            }
            // Send current reserved seats to this client so they see countdowns immediately
            for (const [seatIdx, res] of reservedBySeat.entries()) {
                const pname = playerNames.get(res.playerId) ?? null;
                socket.emit('seat_reserved', { seatIndex: seatIdx, playerName: pname, expiresAt: res.expiresAt });
            }
        }
        catch { }
        try {
            opts?.onSummaryChange?.(getSummary());
        }
        catch { }
        // Broadcast reserved seats when applicable
        try {
            for (const [seatIdx, res] of reservedBySeat.entries()) {
                const pname = playerNames.get(res.playerId) ?? null;
                socket.emit('seat_reserved', { seatIndex: seatIdx, playerName: pname, expiresAt: res.expiresAt });
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
        try {
            const pid = socket.data?.playerId || null;
            if (pid)
                playersInRoom.delete(pid);
        }
        catch { }
        // Do not auto-vacate seat on raw client removal; reconnection grace is handled separately
        try {
            opts?.onSummaryChange?.(getSummary());
        }
        catch { }
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
        // Remove legacy global autoplay behavior
        setAuto(_auto) { },
        getAuto() { return false; },
        // New per-client per-seat autoplay functions
        setClientSeatAuto(playerId, seatIndex, enabled) {
            if (enabled) {
                const seatSet = clientAutoplay.get(playerId) || new Set();
                seatSet.add(seatIndex);
                clientAutoplay.set(playerId, seatSet);
            }
            else {
                const seatSet = clientAutoplay.get(playerId);
                if (seatSet) {
                    seatSet.delete(seatIndex);
                    if (seatSet.size === 0) {
                        clientAutoplay.delete(playerId);
                    }
                }
            }
            // Re-arm timers so runtime reevaluates current toAct autoplay conditions
            try {
                runtime.rearmTimers?.();
            }
            catch { }
            // Only emit to the specific client, not broadcast to all
            const clientSocket = Array.from(io.sockets.sockets.values()).find(s => s.data?.playerId === playerId);
            if (clientSocket) {
                clientSocket.emit('seat_autoplay', { playerId, seatIndex, enabled });
            }
        },
        getClientSeatAuto(playerId, seatIndex) {
            const seatSet = clientAutoplay.get(playerId);
            return seatSet?.has(seatIndex) ?? false;
        },
        // Check if a seat should act automatically (for any client)
        shouldSeatAutoPlay(seatIndex) {
            for (const [playerId, seatSet] of clientAutoplay.entries()) {
                if (seatSet.has(seatIndex)) {
                    return true;
                }
            }
            return false;
        },
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
                // Clear any reservation held on the old seat
                try {
                    reservedBySeat.delete(existing);
                }
                catch { }
            }
            // Reject if seat is already taken by another user
            for (const [pid, idx] of seatOwners.entries()) {
                if (idx === seatIndex && pid !== playerId)
                    return { ok: false, error: 'seat_taken' };
            }
            // If seat is reserved for someone else, block
            const reservedFor = reservedBySeat.get(seatIndex);
            if (reservedFor && reservedFor.playerId !== playerId)
                return { ok: false, error: 'seat_reserved' };
            // If reserved for this player, clear reservation
            if (reservedFor && reservedFor.playerId === playerId) {
                reservedBySeat.delete(seatIndex);
                try {
                    io.in(room).emit('seat_reservation_cleared', { seatIndex });
                }
                catch { }
                try {
                    opts?.onSummaryChange?.(getSummary());
                }
                catch { }
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
            runtime = new PokerRuntime({ seats, cpuSeats, startingStack, shouldAutoplaySeat }, {
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
            // Clear all client autoplay settings on reset
            clientAutoplay.clear();
            lastState = runtime['state'];
            io.to(room).emit('state', lastState);
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
            // Mark seat as reserved for this player during grace
            reservedBySeat.set(seatIdx, { playerId, expiresAt: Date.now() + disconnectGraceMs });
            // Broadcast reservation to everyone at the table
            try {
                const pname = playerNames.get(playerId) ?? null;
                io.in(room).emit('seat_reserved', { seatIndex: seatIdx, playerName: pname, expiresAt: Date.now() + disconnectGraceMs });
            }
            catch { }
            try {
                opts?.onSummaryChange?.(getSummary());
            }
            catch { }
            const handle = setTimeout(() => {
                pendingReleases.delete(playerId);
                try {
                    runtime.setSeatCpu?.(seatIdx, true);
                }
                catch { }
                seatOwners.delete(playerId);
                playerNames.delete(playerId);
                reservedBySeat.delete(seatIdx);
                io.to(room).emit('seat_update', { seatIndex: seatIdx, isCPU: true, playerId: null, playerName: null });
                try {
                    io.in(room).emit('seat_reservation_cleared', { seatIndex: seatIdx });
                }
                catch { }
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
        // Humans = seated owners who are currently present in the table room
        let humans = 0;
        for (const [pid] of seatOwners) {
            if (playersInRoom.has(pid))
                humans += 1;
        }
        humans = Math.min(humans, totalSeats);
        const cpus = Math.max(0, totalSeats - humans);
        const status = s?.status || 'unknown';
        const handId = typeof s?.handId === 'number' ? s.handId : null;
        const reserved = [];
        for (const [seatIndex, res] of reservedBySeat.entries()) {
            reserved.push({ seatIndex, playerName: playerNames.get(res.playerId) ?? null, expiresAt: res.expiresAt });
        }
        return {
            tableId,
            seats: totalSeats,
            humans,
            cpus,
            status,
            handId,
            updatedAt: Date.now(),
            reserved,
        };
    }
}
