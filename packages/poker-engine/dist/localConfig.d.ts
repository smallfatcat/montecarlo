export declare const CONFIG: {
    readonly pokerAutoplay: {
        readonly cpuActionDelayMs: 150;
        readonly playerActionDelayMs: 200;
        readonly autoDealDelayMs: 500;
    };
    readonly poker: {
        readonly startingStack: 5000;
        readonly rakePercent: 0;
        readonly rakeCap: 0;
        readonly showRakeInUI: true;
        readonly blinds: {
            readonly startingSmallBlind: 5;
            readonly startingBigBlind: 10;
            readonly increaseEveryHands: 50;
            readonly increaseFactor: 2;
        };
        readonly random: {
            readonly useSeeded: true;
            readonly seed: 42;
            readonly perHandIncrement: 1;
        };
        readonly animations: {
            readonly chipFlyDurationMs: 150;
        };
    };
};
export type EngineConfig = typeof CONFIG;
//# sourceMappingURL=localConfig.d.ts.map