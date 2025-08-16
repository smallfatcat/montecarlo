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
    sit: z.ZodObject<{
        tableId: z.ZodDefault<z.ZodString>;
        seatIndex: z.ZodNumber;
        name: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tableId: string;
        seatIndex: number;
        name: string;
    }, {
        seatIndex: number;
        tableId?: string | undefined;
        name?: string | undefined;
    }>;
    leave: z.ZodObject<{
        tableId: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tableId: string;
    }, {
        tableId?: string | undefined;
    }>;
    ping: z.ZodObject<{
        ts: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        ts: number;
    }, {
        ts: number;
    }>;
    resetTable: z.ZodObject<{
        tableId: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tableId: string;
    }, {
        tableId?: string | undefined;
    }>;
    identify: z.ZodDefault<z.ZodObject<{
        token: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        token?: string | undefined;
    }, {
        name?: string | undefined;
        token?: string | undefined;
    }>>;
    joinLobby: z.ZodDefault<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
    listTables: z.ZodDefault<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
    createTable: z.ZodDefault<z.ZodObject<{
        tableId: z.ZodOptional<z.ZodString>;
        seats: z.ZodOptional<z.ZodNumber>;
        startingStack: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        tableId?: string | undefined;
        seats?: number | undefined;
        startingStack?: number | undefined;
    }, {
        tableId?: string | undefined;
        seats?: number | undefined;
        startingStack?: number | undefined;
    }>>;
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
    seatUpdate: z.ZodObject<{
        seatIndex: z.ZodNumber;
        isCPU: z.ZodBoolean;
        playerId: z.ZodNullable<z.ZodString>;
        playerName: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        seatIndex: number;
        isCPU: boolean;
        playerId: string | null;
        playerName: string | null;
    }, {
        seatIndex: number;
        isCPU: boolean;
        playerId: string | null;
        playerName: string | null;
    }>;
    identity: z.ZodObject<{
        token: z.ZodString;
        name: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string | null;
        token: string;
    }, {
        name: string | null;
        token: string;
    }>;
    tableList: z.ZodObject<{
        tables: z.ZodArray<z.ZodObject<{
            tableId: z.ZodString;
            seats: z.ZodNumber;
            humans: z.ZodNumber;
            cpus: z.ZodNumber;
            status: z.ZodString;
            handId: z.ZodNullable<z.ZodNumber>;
            updatedAt: z.ZodNumber;
            reserved: z.ZodDefault<z.ZodArray<z.ZodObject<{
                seatIndex: z.ZodNumber;
                playerName: z.ZodNullable<z.ZodString>;
                expiresAt: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                seatIndex: number;
                playerName: string | null;
                expiresAt: number;
            }, {
                seatIndex: number;
                playerName: string | null;
                expiresAt: number;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            status: string;
            tableId: string;
            seats: number;
            humans: number;
            cpus: number;
            handId: number | null;
            updatedAt: number;
            reserved: {
                seatIndex: number;
                playerName: string | null;
                expiresAt: number;
            }[];
        }, {
            status: string;
            tableId: string;
            seats: number;
            humans: number;
            cpus: number;
            handId: number | null;
            updatedAt: number;
            reserved?: {
                seatIndex: number;
                playerName: string | null;
                expiresAt: number;
            }[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        tables: {
            status: string;
            tableId: string;
            seats: number;
            humans: number;
            cpus: number;
            handId: number | null;
            updatedAt: number;
            reserved: {
                seatIndex: number;
                playerName: string | null;
                expiresAt: number;
            }[];
        }[];
    }, {
        tables: {
            status: string;
            tableId: string;
            seats: number;
            humans: number;
            cpus: number;
            handId: number | null;
            updatedAt: number;
            reserved?: {
                seatIndex: number;
                playerName: string | null;
                expiresAt: number;
            }[] | undefined;
        }[];
    }>;
    tableUpdate: z.ZodObject<{
        tableId: z.ZodString;
        seats: z.ZodNumber;
        humans: z.ZodNumber;
        cpus: z.ZodNumber;
        status: z.ZodString;
        handId: z.ZodNullable<z.ZodNumber>;
        updatedAt: z.ZodNumber;
        reserved: z.ZodDefault<z.ZodArray<z.ZodObject<{
            seatIndex: z.ZodNumber;
            playerName: z.ZodNullable<z.ZodString>;
            expiresAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            seatIndex: number;
            playerName: string | null;
            expiresAt: number;
        }, {
            seatIndex: number;
            playerName: string | null;
            expiresAt: number;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        tableId: string;
        seats: number;
        humans: number;
        cpus: number;
        handId: number | null;
        updatedAt: number;
        reserved: {
            seatIndex: number;
            playerName: string | null;
            expiresAt: number;
        }[];
    }, {
        status: string;
        tableId: string;
        seats: number;
        humans: number;
        cpus: number;
        handId: number | null;
        updatedAt: number;
        reserved?: {
            seatIndex: number;
            playerName: string | null;
            expiresAt: number;
        }[] | undefined;
    }>;
    tableRemoved: z.ZodObject<{
        tableId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tableId: string;
    }, {
        tableId: string;
    }>;
};
//# sourceMappingURL=protocol.d.ts.map