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
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null)
  const [playerNames, setPlayerNames] = useState<Array<string | null>>(() => 
    Array.from({ length: 9 }, () => null)
  )

  const resetGame = () => {
    const cpuSeats = Array.from({ length: Math.max(0, numPlayers - 1) }, (_, i) => i + 1)
    const newTable = createInitialPokerTable(numPlayers, cpuSeats, startingStack)
    setTable(newTable)
    setMySeatIndex(null)
  }

  const updateTable = (newTable: PokerTableState) => {
    setTable(newTable)
  }

  return {
    // State
    numPlayers,
    setNumPlayers,
    startingStack,
    setStartingStack,
    table,
    mySeatIndex,
    setMySeatIndex,
    playerNames,
    setPlayerNames,
    
    // Actions
    resetGame,
    updateTable,
  }
}
