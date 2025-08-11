import { useEffect, useState } from 'react'
import { Table } from './Table'
import { CONFIG } from '../config'
import { DeckGallery } from './DeckGallery'
import { PokerTable } from './poker/PokerTable'
import { PokerTableHorseshoe } from './poker/PokerTableHorseshoe'
import { PokerGameProvider } from './poker/PokerGameContext'
import { PokerTestDashboard } from './poker/PokerTestDashboard'
import { Landing } from './Landing'

export function App() {
  const [hash, setHash] = useState<string>(typeof window !== 'undefined' ? window.location.hash : '')
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--app-max-width', `${CONFIG.layout.appMaxWidthPx}px`)
  }, [])
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const showDeck = hash === '#cards'
  const showPoker = hash === '#poker'
  const showPokerTest = hash === '#poker-test'
  const showPokerHorseshoe = hash === '#poker-horseshoe'
  const showBlackjack = hash === '#blackjack'
  if (showDeck) return <DeckGallery />
  if (showPokerHorseshoe) return (
    <PokerGameProvider>
      <PokerTableHorseshoe />
    </PokerGameProvider>
  )
  if (showPokerTest) return <PokerTestDashboard />
  if (showPoker) return (
    <PokerGameProvider>
      <PokerTable />
    </PokerGameProvider>
  )
  if (showBlackjack) return <Table />
  return <Landing />
}


