import React, { useEffect, useRef, useState } from 'react'
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion'
import type { Card, RoundOutcome } from '../blackjack'
import { evaluateHand } from '../blackjack'
// Table engine imports are present for the next iteration where Table UI will be swapped to multi-seat
import { suggestAction } from '../blackjack/strategy'
import { Card3D } from './components/Card3D'
import { createShoe, shuffleInPlace } from '../blackjack/deck'

// Temporary bridge: render table UI driven from existing single-seat flow for player; upgrade gradually to full TableState
export function Table({ state, available, canSplit, deal, finalize, hit, stand, double, surrender, split, insure, noInsure, newShoe, resetBankroll }: any) {
  const [bet, setBet] = useState(10)
  const [decks, setDecks] = useState(6)
  const [autoPlay, setAutoPlay] = useState(false)
  const ACTION_DELAY_MS = 300
  const BETWEEN_HANDS_DELAY_MS = 1000
  const timersRef = useRef<number[]>([])
  const phaseRef = useRef<'idle' | 'waitingDeal'>('idle')
  const lastCardCountRef = useRef(0)
  const [roundEpoch, setRoundEpoch] = useState(0)

  const clearTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current = []
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (!autoPlay) {
      clearTimers()
      phaseRef.current = 'idle'
    }
  }, [autoPlay])

  // Increment an epoch whenever a new round begins (from 0 cards to > 0)
  useEffect(() => {
    const count = (state.playerHand?.length ?? 0) + (state.dealerHand?.length ?? 0)
    if (lastCardCountRef.current === 0 && count > 0) {
      setRoundEpoch((e) => e + 1)
    }
    lastCardCountRef.current = count
  }, [state.playerHand?.length, state.dealerHand?.length])

  const playerHands: Card[][] = state.playerHands ?? [state.playerHand]
  const activeIdx: number = state.activeHandIndex ?? 0

  // Auto play logic
  useEffect(() => {
    if (!autoPlay) return
    // If round over, finalize and deal a new hand
    if (state.status === 'round_over') {
      if (phaseRef.current !== 'waitingDeal') {
        phaseRef.current = 'waitingDeal'
        const t1 = window.setTimeout(() => {
          finalize()
          const t2 = window.setTimeout(() => {
            deal(bet)
            phaseRef.current = 'idle'
          }, BETWEEN_HANDS_DELAY_MS)
          timersRef.current.push(t2)
        }, 300)
        timersRef.current.push(t1)
      }
      return
    }
    if (state.status !== 'player_turn') return
    // During player turn, act based on suggestion
    const suggestion = suggestAction(state)
    if (!suggestion) return
    const delay = ACTION_DELAY_MS
    switch (suggestion) {
      case 'hit':
        timersRef.current.push(window.setTimeout(() => { hit() }, delay))
        break
      case 'stand':
        timersRef.current.push(window.setTimeout(() => { stand() }, delay))
        break
      case 'double':
        timersRef.current.push(window.setTimeout(() => { double() }, delay))
        break
      case 'surrender':
        timersRef.current.push(window.setTimeout(() => { surrender() }, delay))
        break
      case 'split':
        timersRef.current.push(window.setTimeout(() => { split() }, delay))
        break
    }
  }, [autoPlay, state])

  return (
    <div>
      <div className="controls">
        <div className="bankroll">Bankroll: ${state.bankroll}</div>
        <label>Bet: $ <input type="number" value={bet} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBet(parseInt(e.target.value || '0'))} /></label>
        <button onClick={() => deal(bet)} disabled={!(state.status === 'idle' || state.status === 'round_over')}>Deal</button>
        <button onClick={finalize} disabled={state.status !== 'round_over'}>Finalize Payout</button>
        <span className="sep" />
        <label>Shoe decks: <input type="number" value={decks} min={1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDecks(parseInt(e.target.value || '1'))} /></label>
        <button onClick={() => newShoe(decks, createShoe, shuffleInPlace)}>New Shoe</button>
        <button onClick={() => resetBankroll(100)}>Reset Bankroll</button>
        <span className="cards-left">Cards left: {state.deck?.length ?? 0}</span>
        <span className="sep" />
        <label><input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Auto Play</label>
      </div>

      <LayoutGroup key={roundEpoch}>
        <section className="hands">
          <div className="hand">
            {(() => {
              const dv = evaluateHand(state.dealerHand)
              const revealed = state.status !== 'player_turn'
              return (
                <div className="hand-header">
                  <h2>Dealer</h2>
                  <span className={`hand-total ${revealed && dv.isBust ? 'is-bust' : revealed && dv.isBlackjack ? 'is-bj' : ''}`}>{revealed ? handTotalLabel(dv) : ''}</span>
                </div>
              )
            })()}
            <div className="cards">
              <AnimatePresence initial={false}>
                {state.dealerHand.map((c: Card, i: number) => (
                  <motion.div layoutId={`dealer-${roundEpoch}-${c.rank}-${c.suit}-${i}`} key={`dealer-${roundEpoch}-${c.rank}-${c.suit}-${i}`} className="card-slot">
                    <Card3D card={c} faceDown={state.status === 'player_turn' && i === 1} index={i} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {playerHands.map((hand, i) => {
            const hv = evaluateHand(hand)
            const outcome = state.handOutcomes ? state.handOutcomes[i] : state.outcome
            const badge = state.status === 'round_over' && outcome ? outcomeBadge(outcome) : null
            const suggestion = i === activeIdx ? suggestAction(state) : null
            return (
            <div className={`hand ${i === activeIdx ? 'hand--active' : ''}`} key={`hand-${i}`}>
              <div className="hand-header">
                <h2>Player {playerHands.length > 1 ? `Hand ${i + 1}` : ''}</h2>
                <span className={`hand-total ${hv.isBust ? 'is-bust' : hv.isBlackjack ? 'is-bj' : hv.isSoft ? 'is-soft' : ''}`}>{handTotalLabel(hv)}</span>
                {badge}
                {suggestion ? <span className={`suggest-badge`}>Suggest: {suggestion.toUpperCase()}</span> : null}
              </div>
              <div className="cards">
                <AnimatePresence initial={false}>
                  {hand.map((c, j) => (
                    <motion.div layoutId={`player-${roundEpoch}-${i}-${c.rank}-${c.suit}-${j}`} key={`player-${roundEpoch}-${i}-${c.rank}-${c.suit}-${j}`} className="card-slot">
                      <Card3D card={c} index={j} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )})}
        </section>
      </LayoutGroup>

      <div className="actions">
        <button onClick={hit} disabled={!available.includes('hit')}>Hit</button>
        <button onClick={stand} disabled={!available.includes('stand')}>Stand</button>
        <button onClick={double} disabled={!available.includes('double')}>Double</button>
        <button onClick={surrender} disabled={!available.includes('surrender')}>Surrender</button>
        <button onClick={split} disabled={!canSplit}>Split</button>
        <button onClick={insure} disabled={!state.canOfferInsurance}>Insurance</button>
        <button onClick={noInsure} disabled={!state.canOfferInsurance}>No Insurance</button>
      </div>
    </div>
  )
}

function handTotalLabel(v: ReturnType<typeof evaluateHand>): string {
  if (v.isBust) return `Bust (${v.hardTotal})`
  if (v.isBlackjack) return 'Blackjack (21)'
  if (v.isSoft) return `Soft ${v.bestTotal}`
  return `${v.bestTotal}`
}

function outcomeBadge(outcome: RoundOutcome | undefined) {
  if (!outcome) return null
  const { text, kind } = mapOutcome(outcome)
  return <span className={`outcome-badge ${kind}`}>{text}</span>
}

function mapOutcome(o: RoundOutcome): { text: string; kind: 'win' | 'push' | 'lose' } {
  switch (o) {
    case 'player_blackjack':
    case 'player_win':
    case 'dealer_bust':
      return { text: 'Win', kind: 'win' }
    case 'push':
      return { text: 'Push', kind: 'push' }
    case 'player_bust':
    case 'dealer_win':
    default:
      return { text: 'Lose', kind: 'lose' }
  }
}


