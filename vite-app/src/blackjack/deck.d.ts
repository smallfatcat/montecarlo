import type { Card } from "./types";
export declare function createStandardDeck(): Card[];
export declare function createShoe(numberOfDecks: number): Card[];
export declare function shuffleInPlace(deck: Card[], rng?: () => number): Card[];
export declare function makeXorShift32(seed: number): () => number;
export declare function drawCard(deck: Card[]): Card;
export declare function top(deck: Card[]): Card | undefined;
//# sourceMappingURL=deck.d.ts.map