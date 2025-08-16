import { useEffect, useState, type ReactNode } from 'react'
import { Table } from './Table'
import { CONFIG } from '../config'
import { DeckGallery } from './DeckGallery'
import { PokerTableHorseshoe } from './poker/PokerTableHorseshoe'
import { PokerLobby } from './poker/PokerLobby'
import { PokerGameProvider } from './poker/PokerGameContext'
import { PokerTestDashboard } from './poker/PokerTestDashboard'
import { PokerHistoryPage } from './poker/PokerHistoryPage'
import { PokerLayoutEditorPage } from './poker/PokerLayoutEditorPage'
import { Landing } from './Landing'
import VersionDisplay from '../components/VersionDisplay'

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
  const showPoker = hash === '#poker' || hash.startsWith('#poker/')
  const showPokerTest = hash === '#poker-test'
  const showPokerHistory = hash === '#poker-history'
  const showPokerLayoutEditor = hash === '#poker-layout-editor'
  const showBlackjack = hash === '#blackjack'
  const showPokerLobby = hash === '#lobby' || hash === '#poker-lobby'
  const pokerTableId = showPoker && hash.startsWith('#poker/') ? hash.slice('#poker/'.length) : 'table-1'

  let content: ReactNode
  if (showDeck) content = <DeckGallery />
  else if (showPokerTest) content = <PokerTestDashboard />
  else if (showPokerHistory) content = (
    <PokerGameProvider>
      <PokerHistoryPage />
    </PokerGameProvider>
  )
  else if (showPokerLayoutEditor) content = (
    <PokerGameProvider>
      <PokerLayoutEditorPage />
    </PokerGameProvider>
  )
  else if (showPokerLobby) content = (
    <PokerLobby />
  )
  else if (showPoker) content = (
    <PokerGameProvider key={pokerTableId}>
      <PokerTableHorseshoe />
    </PokerGameProvider>
  )
  else if (showBlackjack) content = <Table />
  else content = <Landing />



  return (
    <div style={{ position: 'relative' }}>
      {content}
      <div
        id="app-version"
        style={{
          position: 'fixed',
          bottom: 6,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 12,
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      >
        <VersionDisplay />
      </div>
    </div>
  )
}


