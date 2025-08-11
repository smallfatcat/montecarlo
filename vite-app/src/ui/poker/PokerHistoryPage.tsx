import { useMemo, useState } from 'react'
import { usePokerGameContext } from './PokerGameContext'

function download(text: string, filename: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function PokerHistoryPage() {
  const { histories, loadFromHistory, replayHistory, stopReplay, startReviewFromHistory } = usePokerGameContext()
  const [selected, setSelected] = useState<number | null>(null)

  const sorted = useMemo(() => {
    return [...histories].sort((a, b) => (a.handId - b.handId))
  }, [histories])

  const selectedHistory = useMemo(() => {
    if (selected == null) return null
    return sorted.find((h) => h.handId === selected) ?? null
  }, [selected, sorted])

  return (
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>
      <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { window.location.hash = '#poker' }}>Back to Table</button>
          <button onClick={() => download(JSON.stringify(histories, null, 2), 'poker-hand-histories.json')}>Export JSON</button>
          <button disabled={selected == null} onClick={() => { const h = sorted.find(x => x.handId === selected!); if (h) { loadFromHistory(h); window.location.hash = '#poker' } }}>Load into Table</button>
          <button disabled={selected == null} onClick={() => { const h = sorted.find(x => x.handId === selected!); if (h) { startReviewFromHistory(h); window.location.hash = '#poker' } }}>Review</button>
          <button disabled={selected == null} onClick={() => { const h = sorted.find(x => x.handId === selected!); if (h) replayHistory(h, 700) }}>Replay</button>
          <button onClick={() => stopReplay()}>Stop</button>
        </div>
        <div style={{ fontWeight: 700 }}>Hands</div>
        <div style={{ maxHeight: 520, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8 }}>
          {sorted.length === 0 ? (
            <div style={{ padding: 8, opacity: 0.8 }}>No hands recorded yet</div>
          ) : (
            sorted.map((h) => (
              <div key={h.handId}
                   onClick={() => setSelected(h.handId)}
                   style={{ padding: 8, cursor: 'pointer', background: selected === h.handId ? 'rgba(255,213,79,0.15)' : undefined }}>
                <div style={{ fontWeight: 700 }}>Hand #{h.handId}</div>
                <div style={{ opacity: 0.85, fontSize: 12 }}>{h.events?.length ?? 0} events</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>Details</div>
          {selected != null && (
            <div style={{ opacity: 0.85 }}>Hand #{selected}</div>
          )}
        </div>
        <div style={{ marginTop: 8, minHeight: 200, width: 780, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: 8, background: 'rgba(0,0,0,0.12)', overflowX: 'hidden' }}>
          {selectedHistory ? (
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, display: 'grid', gap: 4, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {selectedHistory.events.map((e, i) => (
                <div key={i}>
                  {(() => {
                    const ts = new Date((e as any).ts || Date.now()).toLocaleTimeString()
                    switch ((e as any).type) {
                      case 'hand_start': return `${ts} • Start BTN ${(e as any).buttonIndex} blinds ${(e as any).smallBlind}/${(e as any).bigBlind}`
                      case 'post_blind': return `${ts} • Seat ${(e as any).seat} posts ${ (e as any).amount }`
                      case 'deal_flop': return `${ts} • Flop ${((e as any).cards || []).join(' ')}`
                      case 'deal_turn': return `${ts} • Turn ${((e as any).cards || []).join(' ')}`
                      case 'deal_river': return `${ts} • River ${((e as any).cards || []).join(' ')}`
                      case 'action': {
                        const a = e as any
                        return `${ts} • Seat ${a.seat} ${a.action}${a.amount != null ? ' ' + a.amount : ''} (toCall ${a.toCall})`
                      }
                      case 'showdown': return `${ts} • Showdown ${ (e as any).summary }`
                      case 'results': {
                        const rs = (e as any).perSeat || []
                        const parts = rs.filter((x: any) => x.delta !== 0).map((x: any) => `Seat ${x.seat} ${x.delta > 0 ? '+' : ''}${x.delta}${x.revealed ? ` (${x.revealed})` : ''}`)
                        return `${ts} • Result ${parts.join(' • ')}`
                      }
                      case 'hand_end': return `${ts} • End`
                      default: return `${ts} • ${JSON.stringify(e)}`
                    }
                  })()}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.8 }}>Select a hand to view details</div>
          )}
        </div>
      </div>
    </div>
  )
}


