import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from 'convex-api'
import type { Id } from 'convex-types'
import { HandReplay } from './HandReplay'

export function PokerHistoryPage() {
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null)
  const [replayHandId, setReplayHandId] = useState<Id<'hands'> | null>(null)
  
  // Fetch recent hands from Convex
  const recentHands = useQuery(api.history.listRecentHands, {})
  
  // Fetch selected hand details
  const handDetail = useQuery(
    api.history.getHandDetail, 
    selectedHandId ? { handId: selectedHandId as Id<'hands'> } : 'skip'
  )

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
    <div id="history-page" style={{ 
      padding: 24, 
      maxWidth: 1800, 
      margin: '0 auto',
      color: 'white',
      minHeight: '100vh'
    }}>
      <div id="history-title" style={{ marginBottom: 16 }}>
        <h1 style={{ 
          fontSize: 32, 
          fontWeight: 700, 
          margin: 0,
          textAlign: 'center',
          color: 'var(--text)'
        }}>
          Poker Hand History
        </h1>
      </div>

      {/* Hand Replay Section */}
      {replayHandId && (
        <div id="history-replay" style={{ margin: '12px 0 24px 0' }}>
          <HandReplay 
            handId={replayHandId} 
            onClose={() => setReplayHandId(null)}
          />
        </div>
      )}

      <div id="history-content" style={{ display: 'grid', gap: 24 }}>
        {/* Recent hands list */}
        <div style={{ 
          border: '1px solid rgba(255,255,255,0.14)', 
          borderRadius: 12, 
          padding: 24,
          background: 'rgba(0,0,0,0.12)'
        }}>
          <h2 style={{ 
            fontSize: 24, 
            fontWeight: 600, 
            marginBottom: 20 
          }}>
            All Hands ({recentHands?.page?.length || 0})
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gap: 12,
            maxHeight: 400,
            overflowY: 'auto'
          }}>
            {recentHands?.page?.map((hand: any) => (
              <div key={hand._id} style={{ 
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 16,
                alignItems: 'center',
                padding: 16,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                background: selectedHandId === hand._id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setSelectedHandId(hand._id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectedHandId === hand._id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'
              }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Hand #{hand.handSeq} • {formatTime(hand.startedAt)}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>
                    Button: Seat {hand.buttonIndex} • Status: {hand.endedAt ? 'Completed' : 'In Progress'} • Actions: {hand.actionsCount || 0}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <button
                    className="as-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setReplayHandId(hand._id)
                    }}
                  >
                    📺 Replay
                  </button>
                </div>
                
                <div style={{ textAlign: 'right', fontSize: 14, opacity: 0.7 }}>
                  {hand.endedAt ? formatTime(hand.endedAt) : 'Active'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected hand details */}
        {selectedHandId && handDetail ? (
          <>
            {/* Table visualization */}
            <div style={{ 
              border: '1px solid rgba(255,255,255,0.14)', 
              borderRadius: 12, 
              padding: 24,
              background: 'rgba(0,0,0,0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600 }}>
                  Hand #{handDetail.hand.handSeq} Details
                </h3>
                <button className="as-button" onClick={() => setReplayHandId(handDetail.hand._id)}>
                  📺 Full Replay
                </button>
              </div>

              {/* Hand information */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: 16,
                marginBottom: 20
              }}>
                <div style={{ 
                  border: '1px solid rgba(255,255,255,0.14)', 
                  borderRadius: 8, 
                  padding: 16,
                  background: 'rgba(0,0,0,0.12)'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>Game Info</div>
                  <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
                    <div><strong>Started:</strong> {formatTime(handDetail.hand.startedAt)}</div>
                    {handDetail.hand.endedAt && (
                      <div><strong>Ended:</strong> {formatTime(handDetail.hand.endedAt)}</div>
                    )}
                    <div><strong>Button:</strong> Seat {handDetail.hand.buttonIndex}</div>
                    <div><strong>Board:</strong> {formatBoard(handDetail.hand.board)}</div>
                    <div><strong>Pot:</strong> ${handDetail.hand.pot?.main || 0}</div>
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
                    {formatResults(handDetail.hand.results)}
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
                  {handDetail.actions.length === 0 ? (
                    <div style={{ opacity: 0.8 }}>No actions recorded</div>
                  ) : (
                    handDetail.actions.map((action: any, i: number) => (
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


