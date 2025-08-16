const SUITS = ["Clubs", "Diamonds", "Hearts", "Spades"];
const RANKS = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
];
export function createStandardDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    return deck;
}
export function shuffleInPlace(deck, rng = Math.random) {
    for (let i = deck.length - 1; i > 0; i -= 1) {
        const r = rng();
        const clamped = r >= 1 ? (1 - Number.EPSILON) : (r < 0 ? 0 : r);
        const j = Math.floor(clamped * (i + 1));
        const tmp = deck[i];
        deck[i] = deck[j];
        deck[j] = tmp;
    }
    return deck;
}
export function makeXorShift32(seed) {
    let x = seed >>> 0;
    return () => {
        x ^= x << 13;
        x >>>= 0;
        x ^= x >> 17;
        x >>>= 0;
        x ^= x << 5;
        x >>>= 0;
        return (x >>> 0) / 4294967296;
    };
}
