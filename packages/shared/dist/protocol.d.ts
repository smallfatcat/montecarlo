import { z } from 'zod';
export declare const BettingActionType: z.ZodEnum<["fold", "check", "call", "bet", "raise"]>;
export type BettingActionType = z.infer<typeof BettingActionType>;
export declare const BettingAction: z.ZodObject<{
    type: z.ZodEnum<["fold", "check", "call", "bet", "raise"]>;
    amount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "fold" | "check" | "call" | "bet" | "raise";
    amount?: number | undefined;
}, {
    type: "fold" | "check" | "call" | "bet" | "raise";
    amount?: number | undefined;
}>;
export type BettingAction = z.infer<typeof BettingAction>;
export declare const C2S: {
    joinTable: z.ZodObject<{
        tableId: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tableId: string;
    }, {
        tableId?: string | undefined;
    }>;
    beginHand: z.ZodObject<{
        tableId: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tableId: string;
    }, {
        tableId?: string | undefined;
    }>;
    act: z.ZodObject<{
        tableId: z.ZodDefault<z.ZodString>;
        action: z.ZodObject<{
            type: z.ZodEnum<["fold", "check", "call", "bet", "raise"]>;
            amount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            type: "fold" | "check" | "call" | "bet" | "raise";
            amount?: number | undefined;
        }, {
            type: "fold" | "check" | "call" | "bet" | "raise";
            amount?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        tableId: string;
        action: {
            type: "fold" | "check" | "call" | "bet" | "raise";
            amount?: number | undefined;
        };
    }, {
        action: {
            type: "fold" | "check" | "call" | "bet" | "raise";
            amount?: number | undefined;
        };
        tableId?: string | undefined;
    }>;
    setAuto: z.ZodObject<{
        tableId: z.ZodDefault<z.ZodString>;
        auto: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        tableId: string;
        auto: boolean;
    }, {
        auto: boolean;
        tableId?: string | undefined;
    }>;
    ping: z.ZodObject<{
        ts: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        ts: number;
    }, {
        ts: number;
    }>;
};
export declare const S2C: {
    ready: z.ZodObject<{
        serverTime: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        serverTime: number;
    }, {
        serverTime: number;
    }>;
    pong: z.ZodObject<{
        ts: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        ts: number;
    }, {
        ts: number;
    }>;
    error: z.ZodObject<{
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
    }, {
        message: string;
    }>;
};
//# sourceMappingURL=protocol.d.ts.map