import { useEffect, useMemo, useRef, useState } from 'react'
import { usePokerGameContext } from './PokerGameContext'
import { evaluateSeven, pickBestFive, formatEvaluated } from '../../poker/handEval'
import { useEquity } from './useEquity'
import { PokerTableHorseshoeView } from './PokerTableHorseshoeView'
import { PokerTableHorseshoeControls } from './PokerTableHorseshoeControls'

export function PokerTableHorseshoe() {
  const { table, revealed, dealNext, isAutoplayEnabled, setAutoplayForSeat, available, fold, check, call, bet, raise, hideHoleCardsUntilShowdown, setHideHoleCardsUntilShowdown, review, reviewNextStep, reviewPrevStep, endReview, sit, leave, mySeatIndex, playerNames, renameCurrentPlayer, resetGame, hasHumanPlayers, canEnableAutoplay } = usePokerGameContext()
  const { equity, run: runEquity, running: equityRunning } = useEquity()

  const community = table.community
  const showdownText = useMemo(() => {
    if (table.status !== 'hand_over') return ''
    if (community.length < 5) return ''
    const ranked: { seat: number; text: string }[] = []
    table.seats.forEach((s, i) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      ranked.push({ seat: i, text: formatEvaluated(ev) })
    })
    if (ranked.length === 0) return ''
    const pot = table.pot.main
    const potText = `Pot: ${pot}`
    return `${potText} • ` + ranked.map((r) => `Seat ${r.seat}: ${r.text}`).join(' • ')
  }, [table.status, community, table.seats, table.pot.main])

  // Trigger equity computation during active hands (avoid re-render loops)
  const samples = 2000
  const lastEqKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const shouldRun = (table.status === 'in_hand' && table.currentToAct != null && table.seats[table.currentToAct]?.isCPU) || (table.status === 'hand_over' && community.length >= 5)
    if (!shouldRun) return
    const keyPartSeats = table.seats.map((s, i) => {
      if (s.hasFolded) return 'X'
      const hidden = hideHoleCardsUntilShowdown && table.status !== 'hand_over' && i !== mySeatIndex
      return hidden ? '??' : (s.hole.map((c) => `${c.rank}${c.suit[0]}`).join(''))
    }).join('|')
    const keyPartBoard = community.map((c) => `${c.rank}${c.suit[0]}`).join('')
    const k = `${keyPartSeats}#${keyPartBoard}`
    if (k === lastEqKeyRef.current) return
    lastEqKeyRef.current = k
    const seatsForEquity = table.seats.map((s, i) => ({
      hole: (hideHoleCardsUntilShowdown && table.status !== 'hand_over' && i !== mySeatIndex) ? [] : s.hole,
      folded: s.hasFolded,
    }))
    runEquity(seatsForEquity as any, community as any, samples)
  }, [table.status, table.currentToAct, table.seats, community, hideHoleCardsUntilShowdown, mySeatIndex])

  const highlightSet = useMemo(() => {
    if (table.status !== 'hand_over' || community.length < 5) return new Set<string>()
    const classOrder: Record<string, number> = { high_card:0,pair:1,two_pair:2,three_kind:3,straight:4,flush:5,full_house:6,four_kind:7,straight_flush:8 } as const as any
    let best: { classIdx: number; ranks: number[] } | null = null
    table.seats.forEach((s) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      if (!best) best = score
      else {
        const cd = score.classIdx - best.classIdx
        if (cd > 0) best = score
        else if (cd === 0) {
          for (let i = 0; i < Math.max(score.ranks.length, best.ranks.length); i += 1) {
            const a = score.ranks[i] ?? -1
            const b = best.ranks[i] ?? -1
            if (a !== b) { if (a > b) best = score; break }
          }
        }
      }
    })
    const out = new Set<string>()
    if (!best) return out
    table.seats.forEach((s, si) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const all = [...s.hole, ...community]
      const { eval: ev, indices } = pickBestFive(all)
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      const equal = score.classIdx === best!.classIdx && JSON.stringify(score.ranks) === JSON.stringify(best!.ranks)
      if (equal) { indices.forEach((j) => { if (j <= 1) out.add(`S${si}-${j}`); else out.add(`B${j-2}`) }) }
    })
    return out
  }, [table.status, community, table.seats])

  const winnersSet = useMemo(() => {
    const winners = new Set<number>()
    if (table.status !== 'hand_over') return winners
    const contenders = table.seats.filter((s) => !s.hasFolded && s.hole.length === 2).length
    if (community.length < 5 || contenders <= 1) {
      table.seats.forEach((s, i) => { if (!s.hasFolded && s.hole.length > 0) winners.add(i) })
      return winners
    }
    const classOrder: Record<string, number> = { high_card:0,pair:1,two_pair:2,three_kind:3,straight:4,flush:5,full_house:6,four_kind:7,straight_flush:8 } as const as any
    let best: { classIdx: number; ranks: number[] } | null = null
    table.seats.forEach((s) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      if (!best) best = score
      else {
        const cd = score.classIdx - best.classIdx
        if (cd > 0) best = score
        else if (cd === 0) {
          for (let i = 0; i < Math.max(score.ranks.length, best.ranks.length); i += 1) {
            const a = score.ranks[i] ?? -1
            const b = best.ranks[i] ?? -1
            if (a !== b) { if (a > b) best = score; break }
          }
        }
      }
    })
    if (!best) return winners
    table.seats.forEach((s, i) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...s.hole, ...community])
      const score = { classIdx: classOrder[ev.class], ranks: ev.ranks }
      const equal = score.classIdx === best!.classIdx && JSON.stringify(score.ranks) === JSON.stringify(best!.ranks)
      if (equal) winners.add(i)
    })
    return winners
  }, [table.status, community, table.seats])

  const equityVm = equity ? {
    winPct: table.seats.map((_, i) => (equity.win[i] / samples) * 100),
    tiePct: table.seats.map((_, i) => (equity.tie[i] / samples) * 100),
    running: !!equityRunning,
  } : null

  const viewRef = useRef<{ exportLayoutToJson: () => void; resetLayout: () => void } | null>(null)
  const [editLayoutMode] = useState<boolean>(false)

  const SIDEBAR_WIDTH = 220
  return (
    <div style={{ display: 'flex' }}>
      <PokerTableHorseshoeControls
        table={table}
        autoPlay={mySeatIndex !== null ? isAutoplayEnabled(mySeatIndex) : false}
        onToggleAutoPlay={(enabled: boolean) => {
          if (mySeatIndex !== null) {
            setAutoplayForSeat(mySeatIndex, enabled)
          }
        }}
        onDealNext={dealNext}
        onResetGame={resetGame}
        
        hideHoleCardsUntilShowdown={hideHoleCardsUntilShowdown}
        onToggleHideHoleCards={setHideHoleCardsUntilShowdown}
        
        hasHumanPlayers={hasHumanPlayers()}
        canEnableAutoplay={canEnableAutoplay}
        
        onOpenHistory={() => { window.location.hash = '#poker-history' }}
        onOpenLobby={() => { window.location.hash = '#lobby' }}
        reviewInfo={review ? { handId: review.handId, step: review.step, total: review.actions.length } : null}
        onReviewPrev={reviewPrevStep}
        onReviewNext={reviewNextStep}
        onEndReview={endReview}
        mySeatIndex={mySeatIndex}
        playerNames={playerNames}
        onRenameMe={renameCurrentPlayer}
        onLeaveSeat={() => leave?.()}
        variant="sidebar"
        sidebarWidth={SIDEBAR_WIDTH}
      />
      <div style={{ marginLeft: SIDEBAR_WIDTH, width: '100%' }}>
        <PokerTableHorseshoeView
        ref={viewRef as any}
        table={table}
        revealed={revealed}
        hideHoleCardsUntilShowdown={hideHoleCardsUntilShowdown}
        editLayoutMode={editLayoutMode}
        available={available}
        onCheck={check}
        onCall={call}
        onFold={fold}
        onBet={bet}
        onRaise={raise}
        onSitHere={(i) => {
        let name = sessionStorage.getItem('playerName') || ''
        if (!name) {
          const suggested = `Player-${Math.floor(Math.random() * 1000)}`
          name = prompt('Enter your name', suggested) || suggested
          sessionStorage.setItem('playerName', name)
        }
        sit?.(i, name)
        }}
        mySeatIndex={mySeatIndex}
        playerNames={playerNames}
        winnersSet={winnersSet}
        highlightSet={highlightSet}
        showdownText={showdownText}
        equity={equityVm}
        />
      </div>
    </div>
  )
}


