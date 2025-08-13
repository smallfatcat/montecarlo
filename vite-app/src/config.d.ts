export declare const CONFIG: {
    readonly version: any;
    readonly autoplay: {
        readonly cpuActionDelayMs: 350;
        readonly playerActionDelayMs: 450;
        readonly autoDealDelayMs: 900;
    };
    readonly pokerAutoplay: {
        readonly cpuActionDelayMs: 150;
        readonly playerActionDelayMs: 200;
        readonly autoDealDelayMs: 500;
    };
    readonly poker: {
        readonly startingStack: 5000;
        readonly chipIconSizePx: 30;
        readonly chipSizePx: 30;
        readonly chipOverlap: 0.8;
        readonly maxChipsPerRow: 20;
        readonly rakePercent: 0;
        readonly rakeCap: 0;
        readonly showRakeInUI: true;
        readonly blinds: {
            readonly startingSmallBlind: 5;
            readonly startingBigBlind: 10;
            readonly increaseEveryHands: 50;
            readonly increaseFactor: 2;
        };
        readonly horseshoe: {
            readonly tableWidthPx: 1200;
            readonly tableHeightPx: 720;
            readonly centerYOffsetPx: -30;
            readonly basePaddingPx: 80;
            readonly radiusXScale: 1.6;
            readonly radiusYScale: 1;
            readonly arcStartDeg: 205;
            readonly arcEndDeg: -25;
            readonly edgeBoostEnd: 1.1;
            readonly edgeBoostNearEnd: 1.08;
            readonly topBoostEnd: 1.4;
            readonly topBoostNearEnd: 1.5;
            readonly boardOffsetY: -60;
            readonly boardGapPx: 10;
            readonly seatWidthPx: 200;
            readonly seatCardScale: 0.9;
            readonly potOffsetY: 35;
            readonly showdownOffsetY: 70;
        };
        readonly random: {
            readonly useSeeded: true;
            readonly seed: 42;
            readonly perHandIncrement: 1;
        };
        readonly deal: {
            readonly perHoleCardMs: 300;
            readonly perBoardCardMs: 300;
            readonly streetPauseMs: 1000;
        };
        readonly animations: {
            readonly chipFlyDurationMs: 150;
        };
    };
    readonly shoe: {
        readonly defaultNumDecks: 6;
        readonly reshuffleCutoffRatio: 0.2;
        readonly cardsPerDeck: 52;
    };
    readonly bankroll: {
        readonly initialPerSeat: 100;
        readonly casinoInitial: 10000;
    };
    readonly bets: {
        readonly defaultPerSeat: 10;
    };
    readonly animation: {
        readonly cardEnterOffsetTop: -160;
        readonly cardEnterOffsetDefault: -20;
        readonly cardExitOffsetY: 10;
        readonly cardStaggerStepMs: 80;
        readonly flatEnterOffsetTop: -80;
        readonly cardFlipDurationSec: 0.35;
    };
    readonly layout: {
        readonly appMaxWidthPx: 1280;
        readonly handsColumns: 3;
        readonly appControlsMarginBottomPx: 12;
        readonly flatCardOverlapPx: 72;
        readonly flatAppMaxWidthPx: 1600;
        readonly flat: {
            readonly containerMinHeightVh: 75;
            readonly containerPaddingTopPx: 5;
            readonly containerPaddingBottomPx: 10;
            readonly controlsGapPx: 8;
            readonly dealerLaneGapPx: 8;
            readonly dealerLaneMarginTopPx: 8;
            readonly dealerTotalMarginTopPx: 4;
            readonly playersLaneBottomPx: 150;
            readonly edgePaddingPx: 16;
            readonly playersLaneGapPx: 16;
            readonly playersLanePaddingBottomPx: 4;
            readonly seatPaddingPx: 8;
            readonly seatMinWidthPx: 240;
            readonly seatLowerBoundWidthPx: 180;
            readonly handRowGapPx: 4;
            readonly handRowMarginBottomPx: 6;
            readonly cardRowGapPx: 8;
            readonly infoRowGapPx: 8;
            readonly seatNameMarginBottomPx: 4;
            readonly actionsBottomPx: 12;
            readonly actionsGapPx: 8;
            readonly actionsPaddingPx: 8;
            readonly actionsBorderRadiusPx: 10;
            readonly actionsBetMarginLeftPx: 8;
        };
        readonly multi: {
            readonly rulesGapPx: 12;
            readonly rulesMarginTopPx: 8;
            readonly detailsMarginTopPx: 8;
            readonly detailsMarginBottomPx: 16;
            readonly progressMarginLeftPx: 8;
            readonly seatBetInputWidthPx: 64;
            readonly doubleTotalsInputWidthPx: 120;
            readonly splitRanksInputWidthPx: 140;
        };
    };
    readonly simulation: {
        readonly handsPerRun: 10000;
        readonly progressUpdateSteps: 100;
    };
    readonly table: {
        readonly minPlayers: 1;
        readonly maxPlayers: 5;
        readonly defaultNumPlayers: 3;
    };
    readonly ui: {
        readonly defaultView: "multi" | "flat";
        readonly enableFaceImages: boolean;
    };
    readonly rules: {
        readonly dealerHitsSoft17: boolean;
        readonly blackjackPayout: number;
        readonly doubleTotals: number[];
        readonly doubleAfterSplit: boolean;
        readonly allowSplitRanks: null | Array<"A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K">;
    };
};
export type AppConfig = typeof CONFIG;
//# sourceMappingURL=config.d.ts.map