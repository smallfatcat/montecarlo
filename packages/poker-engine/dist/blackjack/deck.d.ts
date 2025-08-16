import type { Card } from "./types";
export declare function createStandardDeck(): Card[];
export declare function shuffleInPlace(deck: Card[], rng?: () => number): Card[];
export declare function makeXorShift32(seed: number): () => number;
//# sourceMappingURL=deck.d.ts.map