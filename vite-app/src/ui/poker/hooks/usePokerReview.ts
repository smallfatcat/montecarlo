import { useState } from 'react'
import type { HistoryEvent, HandHistory } from '../../../poker/history'
import { buildTableFrom } from '../../../poker/history'

export function usePokerReview() {
  // Review mode (declared once)
  type ActionEvent = Extract<HistoryEvent, { type: 'action' }>
  type SetupEvent = Extract<HistoryEvent, { type: 'hand_setup' }>
  type ReviewState = { handId: number; setup: SetupEvent; actions: ActionEvent[]; step: number }
  const [review, setReview] = useState<ReviewState | null>(null)

  function startReviewFromHistory(h: HandHistory) {
    const setup = h.events.find((e) => (e as any).type === 'hand_setup') as SetupEvent | undefined
    if (!setup) return null
    const actions = h.events.filter((e) => (e as any).type === 'action') as ActionEvent[]
    // Build table from setup only (no actions applied) and display player hole only
    const initial = buildTableFrom(setup, [], 0)
    const newReview = { handId: h.handId, setup, actions, step: 0 }
    setReview(newReview)
    return { initial, newReview }
  }

  function reviewToStep(step: number) {
    if (!review) return null
    const clamped = Math.max(0, Math.min(step, review.actions.length))
    const nextState = buildTableFrom(review.setup, review.actions, clamped)
    setReview({ ...review, step: clamped })
    // Reveal only player hole until showdown
    const contenders = nextState.seats.filter((s) => !s.hasFolded && s.hole.length === 2).length
    const showAll = nextState.street === 'showdown' && nextState.community.length >= 5 && contenders > 1
    const revealed = {
      holeCounts: Array.from({ length: Math.max(6, nextState.seats.length) }, (_, i) => (i === 0 || showAll ? 2 : 0)),
      boardCount: nextState.community.length,
    }
    return { nextState, revealed }
  }

  function reviewNextStep() { 
    if (review) reviewToStep(review.step + 1) 
  }
  
  function reviewPrevStep() { 
    if (review) reviewToStep(review.step - 1) 
  }
  
  function endReview() { 
    setReview(null) 
  }

  return {
    review,
    setReview,
    startReviewFromHistory,
    reviewToStep,
    reviewNextStep,
    reviewPrevStep,
    endReview,
  }
}
