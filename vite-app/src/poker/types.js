export const DEFAULT_RULES = {
    smallBlind: 1,
    bigBlind: 2,
};
export function isSeatActive(seat) {
    return !seat.hasFolded && !seat.isAllIn && seat.hole.length > 0;
}
export function cloneState(state) {
    return {
        ...state,
        deck: [...state.deck],
        community: [...state.community],
        seats: state.seats.map((s) => ({ ...s, hole: [...s.hole] })),
        pot: { ...state.pot },
        rules: { ...state.rules },
    };
}
export function getStreetBetSize(state) {
    // For no-limit, this returns the big blind as the minimum open bet size preflop, else 1 chip baseline
    return state.rules.bigBlind;
}
export function nextSeatIndex(seats, startExclusive) {
    const n = seats.length;
    for (let i = 1; i <= n; i += 1) {
        const idx = (startExclusive + i) % n;
        const s = seats[idx];
        if (!s.hasFolded && !s.isAllIn && s.stack > 0)
            return idx;
    }
    return null;
}
// Finds the next seat to the right (clockwise) with chips, regardless of current hand fold/all-in status.
// Useful for moving the dealer button between hands.
export function nextSeatIndexWithChips(seats, startExclusive) {
    const n = seats.length;
    for (let i = 1; i <= n; i += 1) {
        const idx = (startExclusive + i) % n;
        if (seats[idx].stack > 0)
            return idx;
    }
    return null;
}
export function countActiveSeats(seats) {
    return seats.filter((s) => !s.hasFolded && s.stack > 0).length;
}
