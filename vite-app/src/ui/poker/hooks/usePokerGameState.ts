import { useState } from 'react'
import type { PokerTableState } from '../../../poker/types'
import { createInitialPokerTable } from '../../../poker/flow'
import { CONFIG } from '../../../config'

export function usePokerGameState() {
  const [numPlayers, setNumPlayers] = useState<number>(6)
  const [startingStack, setStartingStack] = useState<number>(CONFIG.poker.startingStack)
  const [table, setTable] = useState<PokerTableState>(() => {
    const cpuSeats = Array.from({ length: Math.max(0, 6 - 1) }, (_, i) => i + 1)
    return createInitialPokerTable(6, cpuSeats, startingStack)
  })
  // Track autoplay per seat - each client only knows their own seat's setting
  const [mySeatAutoplay, setMySeatAutoplay] = useState<number | null>(null) // seatIndex where autoplay is enabled, or null if disabled
  const [hideHoleCardsUntilShowdown, setHideHoleCardsUntilShowdown] = useState<boolean>(false)
  const [playerNames, setPlayerNames] = useState<Array<string | null>>(() => Array.from({ length: 9 }, () => null))
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null)
  const [clearing, setClearing] = useState<boolean>(false)

  const resetGameState = () => {
    setMySeatAutoplay(null)
    setTable(() => {
      const cpuSeats = Array.from({ length: Math.max(0, numPlayers - 1) }, (_, i) => i + 1)
      return createInitialPokerTable(numPlayers, cpuSeats, startingStack)
    })
  }

  // Helper to check if autoplay is enabled for a specific seat
  const isAutoplayEnabled = (seatIndex: number) => mySeatAutoplay === seatIndex

  // Helper to enable/disable autoplay for a specific seat
  const setAutoplayForSeat = (seatIndex: number, enabled: boolean): boolean => {
    if (enabled) {
      // Only enable autoplay if there are human players at the table
      if (hasHumanPlayers()) {
        setMySeatAutoplay(seatIndex)
      } else {
        console.log('Cannot enable autoplay: no human players at table')
        return false // Indicate that autoplay was not enabled
      }
    } else {
      setMySeatAutoplay(null)
    }
    return true // Indicate success
  }

  // Helper to clear autoplay when leaving a seat
  const clearAutoplayOnLeave = () => {
    setMySeatAutoplay(null)
  }

  // Helper to check if there are any human players at the table
  const hasHumanPlayers = () => {
    return playerNames.some((name, index) => {
      // Check if this seat has a player name (not null) and is not a CPU seat
      return name !== null && index < table.seats.length && !table.seats[index]?.isCPU
    })
  }

  // Helper to automatically disable autoplay if no human players
  const checkAndDisableAutoplayIfNoHumans = () => {
    if (mySeatAutoplay !== null && !hasHumanPlayers()) {
      setMySeatAutoplay(null)
      return true // Autoplay was disabled
    }
    return false // No change
  }

  // Helper to check if autoplay can be enabled for a specific seat
  const canEnableAutoplay = (seatIndex: number): boolean => {
    // Check if the seat is valid and there are human players
    return seatIndex >= 0 && seatIndex < table.seats.length && hasHumanPlayers()
  }

  return {
    // State
    table,
    setTable,
    numPlayers,
    setNumPlayers,
    startingStack,
    setStartingStack,
    mySeatAutoplay,
    isAutoplayEnabled,
    setAutoplayForSeat,
    clearAutoplayOnLeave,
    hideHoleCardsUntilShowdown,
    setHideHoleCardsUntilShowdown,
    playerNames,
    setPlayerNames,
    mySeatIndex,
    setMySeatIndex,
    clearing,
    setClearing,
    // Actions
    resetGameState,
    hasHumanPlayers,
    checkAndDisableAutoplayIfNoHumans,
    canEnableAutoplay,
  }
}
