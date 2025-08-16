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
  reserved?: Array<{ seatIndex: number; playerName: string | null; expiresAt: number }>
}

export function PokerLobby() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [tables, setTables] = useState<TableSummary[]>([])
  const [creating, setCreating] = useState<boolean>(false)
  const [name, setName] = useState<string>(() => (sessionStorage?.getItem('playerName') || '').trim())
  const [nameDraft, setNameDraft] = useState<string>(() => (sessionStorage?.getItem('playerName') || '').trim())
  const [identified, setIdentified] = useState<boolean>(!!(sessionStorage?.getItem('playerName') || '').trim())
  const [identifyPending, setIdentifyPending] = useState<boolean>(false)
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
      const existingName = (sessionStorage?.getItem('playerName') || '').trim()
      if (existingName) {
        const token = sessionStorage?.getItem('playerToken') || undefined
        setIdentifyPending(true)
        s.emit('identify', { token, name: existingName }, (ack: any) => {
          setIdentifyPending(false)
          try { if (ack?.token) sessionStorage?.setItem('playerToken', String(ack.token)) } catch {}
          setIdentified(true)
          setName(existingName)
          setNameDraft(existingName)
          s.emit('joinLobby', {}, (resp: any) => {
            try { if (Array.isArray(resp?.tables)) setTables(resp.tables as TableSummary[]) } catch {}
          })
        })
      }
    }
    connect()
    return () => { try { sock?.disconnect() } catch {} }
  }, [wsUrl])

  const [now, setNow] = useState<number>(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const sorted = useMemo(() => {
    return [...tables].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [tables])

  function submitName() {
    const trimmed = (nameDraft || '').trim()
    if (!trimmed || !socket) return
    const safe = trimmed.slice(0, 32)
    setIdentifyPending(true)
    try { sessionStorage?.setItem('playerName', safe) } catch {}
    const token = sessionStorage?.getItem('playerToken') || undefined
    socket.emit('identify', { token, name: safe }, (ack: any) => {
      setIdentifyPending(false)
      try { if (ack?.token) sessionStorage?.setItem('playerToken', String(ack.token)) } catch {}
      setName(safe)
      setIdentified(true)
      socket.emit('joinLobby', {}, (resp: any) => {
        try { if (Array.isArray(resp?.tables)) setTables(resp.tables as TableSummary[]) } catch {}
      })
    })
  }

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
      {!identified ? (
        <div style={{ margin: '12px 0', padding: 12, border: '1px solid #444', borderRadius: 8, maxWidth: 420 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Choose your display name</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Enter name"
              maxLength={32}
              style={{ flex: 1 }}
            />
            <button onClick={submitName} disabled={!socket || identifyPending || (nameDraft || '').trim().length === 0}>
              {identifyPending ? 'Saving...' : 'Save'}
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Your name is shown on the table when you sit.</div>
        </div>
      ) : (
        <div style={{ margin: '12px 0', opacity: 0.85 }}>You are <span style={{ fontWeight: 600 }}>{name}</span></div>
      )}
      <div style={{ marginBottom: 12 }}>
        <button onClick={createTable} disabled={!socket || creating}>Create Table</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {sorted.map((t) => (
          <div key={t.tableId} style={{ border: '1px solid #444', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{t.tableId}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{t.status} {t.handId != null ? `(hand ${t.handId})` : ''}</div>
            <div style={{ marginTop: 8 }}>Seats: {t.humans}/{t.seats} humans, {t.cpus} CPUs</div>
            {t.reserved && t.reserved.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                Reserved: {t.reserved.map(r => {
                  const fallbackGraceMs = 15000
                  const exp = Number.isFinite(Number(r.expiresAt)) ? Number(r.expiresAt) : (Number(t.updatedAt) + fallbackGraceMs)
                  const secs = Number.isFinite(exp) ? Math.max(0, Math.ceil((exp - now) / 1000)) : null
                  const timer = secs == null ? 'reserved' : `${secs}s`
                  return `${r.playerName ? r.playerName : 'Unknown'}@${r.seatIndex} (${timer})`
                }).join(', ')}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <button onClick={() => joinTable(t.tableId)} disabled={!identified}>Join</button>
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


