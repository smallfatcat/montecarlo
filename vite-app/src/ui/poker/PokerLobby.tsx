import { useEffect, useMemo, useState } from 'react'
import { io, Socket } from 'socket.io-client'

type TableSummary = {
  tableId: string
  seats: number
  humans: number
  cpus: number
  status: string
  handId: number | null
  updatedAt: number
}

export function PokerLobby() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [tables, setTables] = useState<TableSummary[]>([])
  const [creating, setCreating] = useState<boolean>(false)
  const wsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined

  useEffect(() => {
    if (!wsUrl) return
    let sock: Socket | null = null
    function connect() {
      const s = io(wsUrl, {
        path: '/socket.io',
        transports: ['websocket'],
        upgrade: false,
        withCredentials: false,
        timeout: 12000,
      })
      sock = s
      setSocket(s)
      s.on('connect_error', (_err) => {
        // Optionally retry later
        try { s.disconnect() } catch {}
        setTimeout(connect, 1000)
      })
      s.on('table_update', (summary: any) => {
        try {
          if (!summary || !summary.tableId) return
          setTables((prev) => {
            const idx = prev.findIndex((t) => t.tableId === summary.tableId)
            if (idx === -1) return [...prev, summary]
            const next = [...prev]
            next[idx] = summary
            return next
          })
        } catch {}
      })
      s.on('table_removed', (m: any) => {
        try { if (m?.tableId) setTables((prev) => prev.filter((t) => t.tableId !== m.tableId)) } catch {}
      })
      const suggested = `Player-${Math.floor(Math.random()*1000)}`
      const name = sessionStorage?.getItem('playerName') || suggested
      sessionStorage?.setItem('playerName', name)
      const token = localStorage?.getItem('playerToken') || undefined
      s.emit('identify', { token, name }, (ack: any) => {
        try { if (ack?.token) localStorage?.setItem('playerToken', String(ack.token)) } catch {}
        s.emit('joinLobby', {}, (resp: any) => {
          try { if (Array.isArray(resp?.tables)) setTables(resp.tables as TableSummary[]) } catch {}
        })
      })
    }
    connect()
    return () => { try { sock?.disconnect() } catch {} }
  }, [wsUrl])

  const sorted = useMemo(() => {
    return [...tables].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [tables])

  function createTable() {
    if (!socket) return
    setCreating(true)
    socket.emit('createTable', {}, (_resp: any) => {
      setCreating(false)
    })
  }

  function joinTable(id: string) {
    try { window.location.hash = `#poker/${id}` } catch {}
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Poker Lobby</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={createTable} disabled={!socket || creating}>Create Table</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {sorted.map((t) => (
          <div key={t.tableId} style={{ border: '1px solid #444', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{t.tableId}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t.status} {t.handId != null ? `(hand ${t.handId})` : ''}</div>
            <div style={{ marginTop: 8 }}>Seats: {t.humans}/{t.seats} humans, {t.cpus} CPUs</div>
            <div style={{ marginTop: 12 }}>
              <button onClick={() => joinTable(t.tableId)}>Join</button>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div style={{ opacity: 0.7 }}>No tables yet. Create one to get started.</div>
        )}
      </div>
    </div>
  )
}


