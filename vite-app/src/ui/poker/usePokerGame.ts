import { useEffect, useState } from 'react'
import { useTimerQueue } from './useTimerQueue'
import { usePokerOrchestrator } from './usePokerOrchestrator'
import {
  usePokerGameState,
  usePokerActions,
  usePokerHistory,
  usePokerReview,
  usePokerRuntime,
  usePokerGameFlow,
  usePokerReplay,
  usePokerSeating,
} from './hooks'

export function usePokerGame() {
  // Core game state
  const {
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
    resetGameState,
  } = usePokerGameState()

  // Revealed state
  const [revealed, setRevealed] = useState<{ holeCounts: number[]; boardCount: number }>({ 
    holeCounts: Array.from({ length: 9 }, () => 0), 
    boardCount: 0 
  })

  // Event queue and orchestrator
  const eventQueue = useTimerQueue()
  const orchestrator = usePokerOrchestrator({
    schedule: eventQueue.schedule,
    scheduleUnique: eventQueue.scheduleUnique,
    clearByTag: eventQueue.clearByTag,
  } as any, setRevealed)

  // History management
  const {
    histories,
    historyLines,
    appendEvent,
    clearHistory,
  } = usePokerHistory()

  // Review system
  const {
    review,
    startReviewFromHistory,
    reviewToStep,
    reviewNextStep,
    reviewPrevStep,
    endReview,
  } = usePokerReview()

  // Runtime management
  const {
    runtimeRef,
    resetRuntime,
  } = usePokerRuntime(
    numPlayers,
    startingStack,
    appendEvent,
    setTable,
    setPlayerNames,
    setMySeatIndex,
    setAutoplayForSeat,
    clearAutoplayOnLeave,
  )

  // Game flow
  const {
    beginHand,
    dealNext,
  } = usePokerGameFlow(
    table,
    revealed,
    review,
    orchestrator,
    eventQueue,
    runtimeRef,
    appendEvent,
  )

  // Replay functionality
  const {
    loadFromSetup,
    loadFromHistory,
    stopReplay,
    replayHistory,
  } = usePokerReplay(
    eventQueue,
    setTable,
    setRevealed,
    // Create a wrapper for backward compatibility with usePokerReplay
    (auto: boolean) => {
      if (mySeatIndex !== null) {
        setAutoplayForSeat(mySeatIndex, auto)
      }
    },
  )

  // Seating management
  const {
    renameCurrentPlayer,
    sit,
    leave,
  } = usePokerSeating(
    mySeatIndex,
    table,
    runtimeRef,
    clearAutoplayOnLeave,
  )

  // Betting actions
  const {
    fold,
    check,
    call,
    bet,
    raise,
    available,
  } = usePokerActions(
    table,
    mySeatIndex,
    review,
    runtimeRef,
  )

  // Reset the entire local game state and runtime
  function resetGame() {
    try { eventQueue.clearAll() } catch {}
    clearHistory()
    resetGameState()
    resetRuntime()
  }

  // Cleanup on unmount: clear all pending timers
  useEffect(() => {
    return () => {
      try { eventQueue.clearAll() } catch {}
    }
  }, [eventQueue.clearAll])

  // Reflect autoplay toggle into server via runtime
  useEffect(() => {
    if (mySeatIndex !== null) {
      const enabled = mySeatAutoplay === mySeatIndex
      runtimeRef.current?.setSeatAutoPlay(mySeatIndex, enabled)
    }
  }, [mySeatAutoplay, mySeatIndex])

  // Staged hole reveal whenever a new hand begins
  useEffect(() => {
    orchestrator.scheduleHoleReveal(table, hideHoleCardsUntilShowdown, mySeatIndex)
  }, [table.handId, table.buttonIndex, table.seats.length, table.street, table.status, hideHoleCardsUntilShowdown, mySeatIndex, orchestrator.scheduleHoleReveal])

  return {
    // State
    table,
    mySeatIndex,
    revealed,
    clearing,
    histories,
    historyLines,
    review,
    hideHoleCardsUntilShowdown,
    setHideHoleCardsUntilShowdown,
    numPlayers,
    setNumPlayers,
    startingStack,
    setStartingStack,
    
    // Actions
    beginHand,
    dealNext,
    mySeatAutoplay,
    isAutoplayEnabled,
    setAutoplayForSeat,
    clearAutoplayOnLeave,
    available,
    fold,
    check,
    call,
    bet,
    raise,
    
    // Game management
    resetGame,
    loadFromSetup,
    loadFromHistory,
    replayHistory,
    stopReplay,
    
    // Review system
    startReviewFromHistory,
    reviewToStep,
    reviewNextStep,
    reviewPrevStep,
    endReview,
    
    // Player management
    playerNames,
    renameCurrentPlayer,
    sit,
    leave,
  }
}


