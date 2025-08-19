import type { Card } from "../../blackjack/types";
import { rankVal, isSuited } from "./handAnalysis";

/**
 * Categorize preflop hands by strength
 */
export function preflopCategory(hole: Card[]): "premium" | "strong" | "speculative" | "trash" {
  if (hole.length !== 2) return "trash";
  
  const [a, b] = hole;
  const rankA = rankVal(a.rank);
  const rankB = rankVal(b.rank);
  const suited = isSuited(a, b);
  
  // Premium hands: AA, KK, QQ, JJ, AKs, AKo
  if (rankA === 12 && rankB === 12) return "premium"; // AA
  if (rankA === 11 && rankB === 11) return "premium"; // KK
  if (rankA === 10 && rankB === 10) return "premium"; // QQ
  if (rankA === 9 && rankB === 9) return "premium";   // JJ
  if (rankA === 12 && rankB === 11) return "premium"; // AK
  if (rankA === 11 && rankB === 12) return "premium"; // KA
  
  // Strong hands: TT, 99, AQs, AQo, AJs, KQs
  if (rankA === 8 && rankB === 8) return "strong";   // TT
  if (rankA === 7 && rankB === 7) return "strong";   // 99
  if (rankA === 12 && rankB === 10) return "strong"; // AQ
  if (rankA === 10 && rankB === 12) return "strong"; // QA
  if (rankA === 12 && rankB === 9) return "strong";  // AJ
  if (rankA === 9 && rankB === 12) return "strong";  // JA
  if (rankA === 11 && rankB === 10) return "strong"; // KQ
  if (rankA === 10 && rankB === 11) return "strong"; // QK
  
  // Speculative hands: suited connectors, small pairs
  if (suited && Math.abs(rankA - rankB) === 1) return "speculative";
  if (rankA === rankB && rankA <= 6) return "speculative";
  
  return "trash";
}

/**
 * Determine acting position
 */
export function actingPosition(
  numSeats: number, 
  buttonIndex: number, 
  seatIndex: number
): "early" | "middle" | "late" | "blinds" {
  const relativePosition = (seatIndex - buttonIndex + numSeats) % numSeats;
  
  if (relativePosition <= 2) return "blinds";
  if (relativePosition <= Math.ceil(numSeats / 3)) return "early";
  if (relativePosition <= Math.ceil(2 * numSeats / 3)) return "middle";
  return "late";
}

/**
 * Determine if aggressive play is recommended
 */
export function shouldPlayAggressively(
  category: "premium" | "strong" | "speculative" | "trash",
  profile: "tight" | "loose",
  position: "early" | "middle" | "late" | "blinds"
): boolean {
  // Premium hands: always aggressive
  if (category === "premium") return true;
  
  // Strong hands: aggressive in late position or with loose profile
  if (category === "strong") {
    return position === "late" || profile === "loose";
  }
  
  // Speculative hands: aggressive only in late position with loose profile
  if (category === "speculative") {
    return profile === "loose" && position === "late";
  }
  
  // Trash hands: never aggressive
  return false;
}
