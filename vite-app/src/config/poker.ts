export const POKER_CONFIG = {
  horseshoe: {
    tableWidthPx: 1200,
    tableHeightPx: 720,
    centerYOffsetPx: -30,          // relative to height/2
    basePaddingPx: 80,             // margin from table edge used for base radius
    radiusXScale: 1.6,             // horizontal ellipse radius scale
    radiusYScale: 1.0,             // vertical ellipse radius scale
    arcStartDeg: 205,              // horseshoe start angle
    arcEndDeg: -25,                // horseshoe end angle
    edgeBoostEnd: 1.1,             // additional horizontal push for index 0 and last
    edgeBoostNearEnd: 1.08,        // for index 1 and last-2
    topBoostEnd: 1.4,              // slight vertical adjust for index 0 and last
    topBoostNearEnd: 1.5,
    boardOffsetY: -60,             // pixels from center for board row
    boardGapPx: 10,
    seatWidthPx: 200,
    seatCardScale: 0.9,
    potOffsetY: 35,
    showdownOffsetY: 70,
  }
} as const
