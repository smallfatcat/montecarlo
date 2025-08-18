import { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from 'app-convex/_generated/api'
import type { Id } from 'app-convex/_generated/dataModel'
import { PokerTableHorseshoeView } from './PokerTableHorseshoeView'
import { evaluateSeven } from '../../poker/handEval'
import type { PokerTableState, SeatState, Pot, RulesNoLimit } from '../../poker/types'
import type { Card } from '../../blackjack/types'

// Helper function to convert card codes to readable format
const fromCode = (code: string): Card => ({ 
  rank: code.slice(0, code.length - 1) as any, 
  suit: ({ C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades' } as any)[code.slice(-1)] 
})

// Helper function to build table state from Convex data
const buildTableFromConvex = (hand: any, actions: any[]): PokerTableState => {
  // Create a basic table structure that matches PokerTableState
  const table: PokerTableState = {
    handId: hand.handSeq,
    status: 'hand_over',
    seats: [] as SeatState[],
    community: [] as Card[],
    deck: [], // Empty deck for history view
    street: 'showdown',
    currentToAct: null,
    lastAggressorIndex: null,
    betToCall: 0,
    lastRaiseAmount: 0,
    buttonIndex: hand.buttonIndex,
    pot: { main: 0 } as Pot,
    rules: { smallBlind: 25, bigBlind: 50 } as RulesNoLimit,
  }

  // Process actions to build the game state
  let currentBoard: Card[] = []
  let seatStates = new Map<number, SeatState>()
  
  for (const action of actions) {
    if (action.street === 'preflop') {
      // Initialize seats for preflop actions
      if (!seatStates.has(action.seatIndex)) {
        seatStates.set(action.seatIndex, {
          seatIndex: action.seatIndex,
          isCPU: false,
          hole: [], // We don't have hole cards in Convex data
          stack: 1000, // Default starting stack
          committedThisStreet: 0,
          totalCommitted: 0,
          hasFolded: false,
          isAllIn: false,
        })
      }
    }
  }

  // Convert board cards
  if (hand.board && hand.board.length > 0) {
    currentBoard = hand.board.map(fromCode)
  }

  // Build results summary
  const results = hand.results || []
  results.forEach((result: any) => {
    if (!seatStates.has(result.seatIndex)) {
      seatStates.set(result.seatIndex, {
        seatIndex: result.seatIndex,
        isCPU: false,
        hole: [],
        stack: 1000 + result.delta, // Starting stack + delta
        committedThisStreet: 0,
        totalCommitted: 0,
        hasFolded: false,
        isAllIn: false,
      })
    }
  })

  // Convert to array and sort by seat index
  table.seats = Array.from(seatStates.values()).sort((a, b) => a.seatIndex - b.seatIndex)
  table.community = currentBoard
  
  // Calculate pot from results
  const totalPot = results.reduce((sum: number, r: any) => sum + Math.abs(r.delta), 0) / 2
  table.pot = { main: totalPot }

  return table
}

export function PokerHistoryPage() {
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null)
  
  // Fetch recent hands from Convex
  const recentHands = useQuery(api.history.listRecentHands, { 
    paginationOpts: { numItems: 50, cursor: null } 
  })
  
  // Fetch selected hand details
  const handDetail = useQuery(
    api.history.getHandDetail, 
    selectedHandId ? { handId: (selectedHandId as unknown as Id<'hands'>) } : 'skip'
  )

  const selectedHand = useMemo(() => {
    if (!handDetail) return null
    return handDetail.hand
  }, [handDetail])

  const selectedActions = useMemo(() => {
    if (!handDetail) return []
    return handDetail.actions || []
  }, [handDetail])

  const tableState = useMemo(() => {
    if (!selectedHand || !selectedActions) return null
    return buildTableFromConvex(selectedHand, selectedActions)
  }, [selectedHand, selectedActions])

  const winnersSet = useMemo((): Set<number> | undefined => {
    if (!tableState) return undefined
    if (tableState.status !== 'hand_over') return undefined
    
    const community = tableState.community
    const contenders = tableState.seats.filter((s) => !s.hasFolded && s.hole.length === 2).length
    
    if (community.length < 5 || contenders <= 1) {
      const winners = new Set<number>()
      tableState.seats.forEach((s, i) => { 
        if (!s.hasFolded && s.hole.length > 0) winners.add(i) 
      })
      return winners
    }

    // Evaluate hands if we have a full board
    const classOrder: Record<string, number> = { 
      high_card: 0, pair: 1, two_pair: 2, three_kind: 3, straight: 4, 
      flush: 5, full_house: 6, four_kind: 7, straight_flush: 8 
    } as const as any
    
    let best: { classIdx: number; ranks: number[] } | null = null
    tableState.seats.forEach((s) => {
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
    
    if (!best) return new Set()
    
    const winners = new Set<number>()
    tableState.seats.forEach((s, i) => {
      if (s.hasFolded || s.hole.length !== 2) return
      const ev = evaluateSeven([...(s.hole as any), ...(community as any)])
      const score = { classIdx: classOrder[(ev as any).class], ranks: (ev as any).ranks }
      const equal = score.classIdx === best!.classIdx && JSON.stringify(score.ranks) === JSON.stringify(best!.ranks)
      if (equal) winners.add(i)
    })
    return winners
  }, [tableState])

  // Reset when switching selected hand
  useEffect(() => {
    // Reset any state when switching hands
  }, [selectedHandId])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatBoard = (board: string[]) => {
    if (!board || board.length === 0) return 'No board'
    return board.join(' ')
  }

  const formatResults = (results: any[]) => {
    if (!results || results.length === 0) return 'No results'
    return results
      .filter((r: any) => r.delta !== 0)
      .map((r: any) => `Seat ${r.seatIndex} ${r.delta > 0 ? '+' : ''}${r.delta}`)
      .join(' • ')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
      {/* Left sidebar - Hand list */}
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { window.location.hash = '#poker' }}>Back to Table</button>
        </div>
        
        <div style={{ fontWeight: 700, fontSize: 18 }}>Game History</div>
        
        <div style={{ 
          maxHeight: 600, 
          overflowY: 'auto', 
          border: '1px solid rgba(255,255,255,0.14)', 
          borderRadius: 8,
          background: 'rgba(0,0,0,0.12)'
        }}>
          {!recentHands || recentHands.page.length === 0 ? (
            <div style={{ padding: 16, opacity: 0.8, textAlign: 'center' }}>
              No games recorded yet
            </div>
          ) : (
            recentHands.page.map((hand: any) => (
              <div 
                key={hand._id}
                onClick={() => setSelectedHandId(hand._id)}
                style={{ 
                  padding: 12, 
                  cursor: 'pointer', 
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  background: selectedHandId === hand._id ? 'rgba(255,213,79,0.15)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Hand #{hand.handSeq}
                </div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                  {formatTime(hand.startedAt)}
                </div>
                {hand.endedAt && (
                  <div style={{ opacity: 0.6, fontSize: 11, marginTop: 2 }}>
                    Duration: {Math.round((hand.endedAt - hand.startedAt) / 1000)}s
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right side - Hand details and table view */}
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Hand Details</div>
          {selectedHand && (
            <div style={{ opacity: 0.85 }}>Hand #{selectedHand.handSeq}</div>
          )}
        </div>

        {selectedHand && tableState ? (
          <>
            {/* Table visualization */}
            <div style={{ 
              border: '1px solid rgba(255,255,255,0.14)', 
              borderRadius: 8, 
              padding: 16,
              background: 'rgba(0,0,0,0.12)'
            }}>
              <PokerTableHorseshoeView
                table={tableState}
                revealed={{ 
                  holeCounts: Array.from({ length: Math.max(6, tableState.seats.length) }, () => 2), 
                  boardCount: tableState.community.length 
                }}
                hideHoleCardsUntilShowdown={false}
                winnersSet={winnersSet}
              />
            </div>

            {/* Hand information */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 16 
            }}>
              <div style={{ 
                border: '1px solid rgba(255,255,255,0.14)', 
                borderRadius: 8, 
                padding: 16,
                background: 'rgba(0,0,0,0.12)'
              }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Game Info</div>
                <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
                  <div><strong>Started:</strong> {formatTime(selectedHand.startedAt)}</div>
                  {selectedHand.endedAt && (
                    <div><strong>Ended:</strong> {formatTime(selectedHand.endedAt)}</div>
                  )}
                  <div><strong>Button:</strong> Seat {selectedHand.buttonIndex}</div>
                  <div><strong>Board:</strong> {formatBoard(selectedHand.board)}</div>
                  <div><strong>Pot:</strong> ${tableState.pot.main}</div>
                </div>
              </div>

              <div style={{ 
                border: '1px solid rgba(255,255,255,0.14)', 
                borderRadius: 8, 
                padding: 16,
                background: 'rgba(0,0,0,0.12)'
              }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Results</div>
                <div style={{ fontSize: 14 }}>
                  {formatResults(selectedHand.results)}
                </div>
              </div>
            </div>

            {/* Actions log */}
            <div style={{ 
              border: '1px solid rgba(255,255,255,0.14)', 
              borderRadius: 8, 
              padding: 16,
              background: 'rgba(0,0,0,0.12)'
            }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Actions</div>
              <div style={{ 
                maxHeight: 300, 
                overflowY: 'auto',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 12
              }}>
                {selectedActions.length === 0 ? (
                  <div style={{ opacity: 0.8 }}>No actions recorded</div>
                ) : (
                  selectedActions.map((action: any, i: number) => (
                    <div key={i} style={{ 
                      padding: 4, 
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: 12,
                      alignItems: 'center'
                    }}>
                      <span style={{ opacity: 0.7, minWidth: 60 }}>
                        {action.street}
                      </span>
                      <span>
                        Seat {action.seatIndex} {action.type}
                        {action.amount && ` $${action.amount}`}
                      </span>
                      <span style={{ opacity: 0.6, fontSize: 11 }}>
                        {formatTime(action._creationTime)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            opacity: 0.8, 
            textAlign: 'center', 
            padding: 40,
            border: '1px solid rgba(255,255,255,0.14)', 
            borderRadius: 8,
            background: 'rgba(0,0,0,0.12)'
          }}>
            Select a hand to view details
          </div>
        )}
      </div>
    </div>
  )
}


