import { useState, useMemo } from 'react'
import type { PokerTableState } from '../../../poker/types'

export function usePokerLayoutEditor() {
  const [mockTable, setMockTable] = useState<PokerTableState>(() => createMockTableState())
  const [revealed, setRevealed] = useState({ 
    holeCounts: [2, 2, 2, 2, 2, 2], // All hole cards revealed
    boardCount: 5 // Full board revealed
  })

  const mockData = useMemo(() => ({
    // Mock equity data for display
    equity: {
      winPct: [35, 25, 15, 10, 10, 5], // Realistic win percentages
      tiePct: [0, 0, 0, 0, 0, 0],
      running: false
    },
    // Mock winners for visual feedback
    winnersSet: new Set([0]), // Player 1 wins
    // Mock showdown text
    showdownText: "Player 1 wins with A♠K♠ - Ace High Straight",
    // Mock highlight set for cards
    highlightSet: new Set(["Ah", "Kh", "7c", "2h", "9d", "Ts", "Ac"]),
    // Mock player names
    playerNames: ["Player 1", "CPU 2", "CPU 3", "CPU 4", "CPU 5", "CPU 6"],
    // Mock available actions
    available: ["fold", "check", "call", "bet", "raise"] as any,
    // Mock betting amounts
    betAmount: 100,
    toCall: 50,
    pot: 450,
    stack: 1500
  }), [])

  return { 
    mockTable, 
    revealed, 
    setMockTable, 
    setRevealed,
    mockData
  }
}

function createMockTableState(): PokerTableState {
  return {
    handId: 123,
    deck: [],
    community: [
      { rank: "7", suit: "Clubs" }, { rank: "2", suit: "Hearts" }, { rank: "9", suit: "Diamonds" },
      { rank: "10", suit: "Spades" }, { rank: "A", suit: "Clubs" }
    ],
    seats: [
      { seatIndex: 0, isCPU: false, hasFolded: false, isAllIn: false, stack: 1500, hole: [{ rank: "A", suit: "Spades" }, { rank: "K", suit: "Spades" }], committedThisStreet: 100, totalCommitted: 100 },
      { seatIndex: 1, isCPU: true, hasFolded: false, isAllIn: false, stack: 1200, hole: [{ rank: "Q", suit: "Diamonds" }, { rank: "J", suit: "Diamonds" }], committedThisStreet: 75, totalCommitted: 75 },
      { seatIndex: 2, isCPU: true, hasFolded: false, isAllIn: false, stack: 800, hole: [{ rank: "10", suit: "Clubs" }, { rank: "9", suit: "Clubs" }], committedThisStreet: 50, totalCommitted: 50 },
      { seatIndex: 3, isCPU: true, hasFolded: false, isAllIn: false, stack: 950, hole: [{ rank: "7", suit: "Spades" }, { rank: "2", suit: "Spades" }], committedThisStreet: 25, totalCommitted: 25 },
      { seatIndex: 4, isCPU: true, hasFolded: false, isAllIn: false, stack: 1100, hole: [{ rank: "6", suit: "Hearts" }, { rank: "5", suit: "Hearts" }], committedThisStreet: 150, totalCommitted: 150 },
      { seatIndex: 5, isCPU: true, hasFolded: false, isAllIn: false, stack: 1300, hole: [{ rank: "A", suit: "Diamonds" }, { rank: "3", suit: "Diamonds" }], committedThisStreet: 200, totalCommitted: 200 }
    ],
    buttonIndex: 2, street: "river", status: "in_hand", currentToAct: 0, lastAggressorIndex: 0, betToCall: 100, lastRaiseAmount: 100, pot: { main: 600 }, rules: { smallBlind: 10, bigBlind: 20 }
  }
}
