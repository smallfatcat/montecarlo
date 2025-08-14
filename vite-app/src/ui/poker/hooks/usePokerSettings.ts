import { useState } from 'react'

export function usePokerSettings() {
  const [autoPlay, setAutoPlay] = useState<boolean>(false)
  const [hideHoleCardsUntilShowdown, setHideHoleCardsUntilShowdown] = useState<boolean>(false)
  const [clearing, setClearing] = useState<boolean>(false)

  const toggleAutoPlay = () => setAutoPlay(prev => !prev)
  const toggleHideHoleCards = () => setHideHoleCardsUntilShowdown(prev => !prev)
  const setClearingState = (value: boolean) => setClearing(value)

  return {
    // Settings
    autoPlay,
    setAutoPlay,
    hideHoleCardsUntilShowdown,
    setHideHoleCardsUntilShowdown,
    clearing,
    
    // Actions
    toggleAutoPlay,
    toggleHideHoleCards,
    setClearingState,
  }
}
