import { useEffect, useMemo, useState } from 'react'
import {
  createInitialState,
  startRoundWithBet,
  playerHit,
  playerStand,
  playerDoubleDown,
  playerSurrender,
  finalizeRound,
  getAvailableActions,
  canSplit,
  playerSplit,
  placeInsurance,
  declineInsurance,
  evaluateHand,
} from '../blackjack'
import type { Card, GameState } from '../blackjack'
import { createShoe, shuffleInPlace } from '../blackjack/deck'

export function useBlackjackGame() {
  const [state, setState] = useState<GameState>(() => createInitialState(100))
  const [shoe, setShoe] = useState<Card[] | undefined>(undefined)
  const [deckCount, setDeckCount] = useState<number>(6)

  // Initialize with a shuffled 6-deck shoe on first mount
  useEffect(() => {
    const initial = shuffleInPlace(createShoe(deckCount))
    setShoe(initial)
    setState(s => ({ ...s, deck: initial }))
  }, [])

  const actions = useMemo(() => ({
    deal: (bet: number) => {
      // Phase 1: finalize (if needed) and clear current cards immediately
      setState((s) => {
        const base = s.status === 'round_over' ? finalizeRound(s) : s
        return {
          ...base,
          status: 'idle',
          playerHand: [],
          dealerHand: [],
          playerHands: undefined,
          activeHandIndex: undefined,
          handOutcomes: undefined,
          outcome: undefined,
        }
      })
      // Phase 2: in the next tick, actually deal the new round
      window.setTimeout(() => {
        setState((s) => {
          const cutoff = Math.floor(deckCount * 52 * 0.2)
          const needNewShoe = !shoe || shoe.length <= cutoff
          const deckToUse = needNewShoe ? shuffleInPlace(createShoe(deckCount)) : shoe
          const next = startRoundWithBet(s, bet, deckToUse, { shuffleDeck: false })
          setShoe(next.deck)
          return next
        })
      }, 50)
    },
    finalize: () => setState(s => finalizeRound(s)),
    hit: () => setState(s => playerHit(s)),
    stand: () => setState(s => playerStand(s)),
    double: () => setState(s => playerDoubleDown(s)),
    surrender: () => setState(s => playerSurrender(s)),
    split: () => setState(s => playerSplit(s)),
    insure: () => setState(s => placeInsurance(s)),
    noInsure: () => setState(s => declineInsurance(s)),
    newShoe: (decks: number, build: (n: number) => Card[], shuffle: (d: Card[]) => Card[]) => {
      const normalized = Math.max(1, Math.floor(decks || 6))
      const next = shuffle(build(normalized))
      setDeckCount(normalized)
      setShoe(next)
      setState(s => ({ ...s, deck: next }))
    },
    resetBankroll: (amount: number) => setState(s => ({ ...s, bankroll: amount })),
  }), [shoe])

  // Keep external shoe cache in sync with the game's deck at all times
  useEffect(() => {
    if (state.deck && state.deck !== shoe) {
      setShoe(state.deck)
    }
  }, [state.deck])

  const derived = {
    available: getAvailableActions(state),
    canSplit: canSplit(state),
    dealerEval: evaluateHand(state.dealerHand),
  }

  return { state, setState, shoe, setShoe, ...actions, ...derived }
}


