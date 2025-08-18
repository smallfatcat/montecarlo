import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useMyRecentHands } from './hooks/useConvexHistory'

export function ConvexHistoryDebug() {
  const { hands } = useMyRecentHands(10)
  const recent = useQuery(api.history.listRecentHands as any, { paginationOpts: { numItems: 10, cursor: null } }) as any
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detail = useQuery(api.history.getHandDetail as any, selectedId ? { handId: selectedId } : 'skip') as any

  const items = useMemo(() => {
    const a = Array.isArray(recent?.page) ? recent.page : []
    const b = Array.isArray(hands) ? hands : []
    const merged = [...a, ...b]
    const dedup = new Map<string, any>()
    for (const h of merged) { dedup.set(String(h._id || h.id), h) }
    return Array.from(dedup.values()).map((h: any) => ({ id: String(h._id || h.id), seq: Number(h.handSeq) }))
  }, [recent, hands])

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 700 }}>Convex Hands (debug)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12 }}>
        <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8 }}>
          {items.length === 0 ? (
            <div style={{ padding: 8, opacity: 0.8 }}>No Convex hands yet</div>
          ) : (
            items.map((h) => (
              <div key={h.id}
                   onClick={() => setSelectedId(h.id)}
                   style={{ padding: 8, cursor: 'pointer', background: selectedId === h.id ? 'rgba(79,209,255,0.18)' : undefined }}>
                Hand #{h.seq}
              </div>
            ))
          )}
        </div>
        <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: 8, minHeight: 200 }}>
          {selectedId && detail ? (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(detail, null, 2)}</pre>
          ) : (
            <div style={{ opacity: 0.8 }}>Select a Convex hand to view details</div>
          )}
        </div>
      </div>
    </div>
  )
}


