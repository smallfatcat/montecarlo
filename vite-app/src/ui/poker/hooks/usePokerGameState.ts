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
  const [autoPlay, setAutoPlay] = useState<boolean>(false)
  const [hideHoleCardsUntilShowdown, setHideHoleCardsUntilShowdown] = useState<boolean>(false)
  const [playerNames, setPlayerNames] = useState<Array<string | null>>(() => Array.from({ length: 9 }, () => null))
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null)
  const [clearing, setClearing] = useState<boolean>(false)

  const resetGameState = () => {
    setAutoPlay(false)
    setTable(() => {
      const cpuSeats = Array.from({ length: Math.max(0, numPlayers - 1) }, (_, i) => i + 1)
      return createInitialPokerTable(numPlayers, cpuSeats, startingStack)
    })
  }

  return {
    // State
    table,
    setTable,
    numPlayers,
    setNumPlayers,
    startingStack,
    setStartingStack,
    autoPlay,
    setAutoPlay,
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
  }
}
