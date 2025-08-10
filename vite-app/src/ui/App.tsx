import { useEffect, useState } from 'react'
import { Table } from './Table'
import { CONFIG } from '../config'
import { DeckGallery } from './DeckGallery'

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
  return showDeck ? <DeckGallery /> : <Table />
}


