import { createContext, useContext } from 'react'
import type { PropsWithChildren } from 'react'
import { usePokerGame } from './usePokerGame'
// (removed unused type import)

type PokerGameContextValue = ReturnType<typeof usePokerGame>

const PokerGameContext = createContext<PokerGameContextValue | null>(null)

export function PokerGameProvider({ children }: PropsWithChildren<{}>) {
  const value = usePokerGame()
  return (
    <PokerGameContext.Provider value={value}>
      {children}
    </PokerGameContext.Provider>
  )
}

export function usePokerGameContext(): PokerGameContextValue {
  const ctx = useContext(PokerGameContext)
  if (!ctx) throw new Error('usePokerGameContext must be used within PokerGameProvider')
  return ctx
}


