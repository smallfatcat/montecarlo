import { useEffect } from 'react'
import { Table } from './Table'
import { CONFIG } from '../config'

export function App() {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--app-max-width', `${CONFIG.layout.appMaxWidthPx}px`)
  }, [])
  return <Table />
}


