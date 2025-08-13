import type { Card } from "./blackjack/types";
export type HandClass = "high_card" | "pair" | "two_pair" | "three_kind" | "straight" | "flush" | "full_house" | "four_kind" | "straight_flush";
export interface EvaluatedHand {
    class: HandClass;
    ranks: number[];
}
export declare function evaluateSeven(cards: Card[]): EvaluatedHand;
export declare function compareEvaluated(a: EvaluatedHand, b: EvaluatedHand): number;
export declare function evaluateFive(cards: Card[]): EvaluatedHand;
//# sourceMappingURL=handEval.d.ts.map