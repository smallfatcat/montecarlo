import { useEffect, useMemo, useState } from 'react'
import { usePokerGameContext } from './PokerGameContext'
import { buildTableFrom } from '../../poker/history'
import type { HistoryEvent } from '../../poker/history'
import { PokerTableHorseshoeView } from './PokerTableHorseshoeView'
import { evaluateSeven } from '../../poker/handEval'
import { __test__finalizeShowdown } from '../../poker/flow'
import { PREDEFINED_HAND_HISTORIES } from '../../poker/predefinedHands'

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
  const { histories } = usePokerGameContext()
  const [selected, setSelected] = useState<number | null>(null)
  const [step, setStep] = useState<number>(0)

  const sorted = useMemo(() => {
    return [...PREDEFINED_HAND_HISTORIES, ...histories].sort((a, b) => (a.handId - b.handId))
  }, [histories])

  const selectedHistory = useMemo(() => {
    if (selected == null) return null
    return sorted.find((h) => h.handId === selected) ?? null
  }, [selected, sorted])

  const actions = useMemo(() => {
    if (!selectedHistory) return [] as Array<Extract<HistoryEvent, { type: 'action' }>>
    return selectedHistory.events.filter((e) => (e as any).type === 'action') as Array<Extract<HistoryEvent, { type: 'action' }>>
  }, [selectedHistory])

  const setup = useMemo(() => {
    if (!selectedHistory) return null as (Extract<HistoryEvent, { type: 'hand_setup' }> | null)
    return selectedHistory.events.find((e) => (e as any).type === 'hand_setup') as Extract<HistoryEvent, { type: 'hand_setup' }> | undefined || null
  }, [selectedHistory])

  const clampedStep = Math.max(0, Math.min(step, actions.length))

  const previewState = useMemo(() => {
    if (!selectedHistory) return null
    if (!setup) return null
    const built = buildTableFrom(setup, actions, clampedStep)
    // Derive board from recorded deal_* events up to current step to ensure correct board visibility
    const fromCode = (code: string) => ({ rank: code.slice(0, code.length - 1) as any, suit: ({ C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' } as any)[code.slice(-1)] })
    let processedActions = 0
    const board: any[] = []
    for (const e of selectedHistory.events) {
      const t = (e as any).type
      if (t === 'action') {
        processedActions += 1
        if (processedActions > clampedStep) break
      } else if (t === 'deal_flop' && processedActions <= clampedStep) {
        const codes = (e as any).cards || []
        board.push(...codes.map(fromCode))
      } else if (t === 'deal_turn' && processedActions <= clampedStep) {
        const codes = (e as any).cards || []
        board.push(...codes.map(fromCode))
      } else if (t === 'deal_river' && processedActions <= clampedStep) {
        const codes = (e as any).cards || []
        board.push(...codes.map(fromCode))
      }
    }
    const withBoard = board.length > (built.community?.length || 0) ? { ...built, community: board as any } : built
    // If we've stepped through all actions and have a full board, show resolved showdown state
    const fullBoard = (withBoard.community?.length ?? 0) >= 5
    const atEnd = clampedStep >= actions.length
    if (atEnd && fullBoard) {
      return __test__finalizeShowdown(withBoard)
    }
    return withBoard
  }, [selectedHistory, setup, actions, clampedStep])

  const winnersSet = useMemo(() => {
    if (!previewState) return undefined
    if (previewState.status !== 'hand_over') return undefined
    const community = previewState.community
    const contenders = previewState.seats.filter((s) => !s.hasFolded && s.hole.length === 2).length
    const winners = new Set<number>()
    if (community.length < 5 || contenders <= 1) {
      previewState.seats.forEach((s, i) => { if (!s.hasFolded && s.hole.length > 0) winners.add(i) })
      return winners
    }
    const classOrder: Record<string, number> = { high_card:0,pair:1,two_pair:2,three_kind:3,straight:4,flush:5,full_house:6,four_kind:7,straight_flush:8 } as const as any
    let best: { classIdx: number; ranks: number[] } | null = null
    previewState.seats.forEach((s) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...(s.hole as any), ...(community as any)])
      const score = { classIdx: classOrder[(ev as any).class], ranks: (ev as any).ranks }
      if (!best) best = score
      else {
        const cd = score.classIdx - best.classIdx
        if (cd > 0) best = score
        else if (cd === 0) {
          for (let i = 0; i < Math.max(score.ranks.length, best.ranks.length); i += 1) {
            const a = score.ranks[i] ?? -1
            const b = best.ranks[i] ?? -1
            if (a !== b) { if (a > b) { best = score } break }
          }
        }
      }
    })
    if (!best) return winners
    previewState.seats.forEach((s, i) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...(s.hole as any), ...(community as any)])
      const score = { classIdx: classOrder[(ev as any).class], ranks: (ev as any).ranks }
      const equal = score.classIdx === best!.classIdx && JSON.stringify(score.ranks) === JSON.stringify(best!.ranks)
      if (equal) winners.add(i)
    })
    return winners
  }, [previewState])

  // Reset step when switching selected hand
  useEffect(() => {
    setStep(0)
  }, [selected])

  return (
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12 }}>
      <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { window.location.hash = '#poker' }}>Back to Table</button>
          <button onClick={() => download(JSON.stringify(histories, null, 2), 'poker-hand-histories.json')}>Export JSON</button>
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
        <div style={{ marginTop: 8 }}>
          {previewState ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={clampedStep <= 0}>&laquo; Prev</button>
                <button onClick={() => setStep((s) => Math.min(actions.length, s + 1))} disabled={clampedStep >= actions.length}>Next &raquo;</button>
                <span style={{ opacity: 0.85 }}>Step {clampedStep}/{actions.length}</span>
              </div>
              <PokerTableHorseshoeView
                table={previewState}
                revealed={{ holeCounts: Array.from({ length: Math.max(6, previewState.seats.length) }, () => 2), boardCount: previewState.community.length }}
                hideCpuHoleUntilShowdown={false}
                // Pass winnersSet so result labels show correctly on preview
                winnersSet={winnersSet}
              />
            </>
          ) : (
            <div style={{ opacity: 0.8 }}>Select a hand to view details</div>
          )}
        </div>
        {selectedHistory ? (
          <div style={{ marginTop: 12, minHeight: 200, width: 780, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: 8, background: 'rgba(0,0,0,0.12)', overflowX: 'hidden' }}>
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
          </div>
        ) : null}
      </div>
    </div>
  )
}


