import { useEffect, useRef, useState } from 'react'
import type { BettingActionType } from '../../poker/types'
import { PokerBettingButtons, PokerBetInput, PokerStackLabel } from './components'
import { PokerPotSlider } from './components/PokerPotSlider'
import { PokerStackSlider } from './components/PokerStackSlider'
import { Card } from '../components/Card'
import './PokerInlineControls.css'

type Rect = { left?: number; top?: number; width?: number; height?: number }
type ControlsLayout = Record<string, Rect>

export function PokerInlineControls(props: {
  available: BettingActionType[]
  disabled: boolean
  pot: number
  stack: number
  toCall?: number
  minOpen?: number
  // optional: min raise extra hint (defaults to last raise or minOpen)
  minRaiseExtraHint?: number
  onCheck?: () => void
  onCall?: () => void
  onFold?: () => void
  onBet?: (amount?: number) => void
  onRaise?: (amount?: number) => void
  scale?: number
  boxWidth?: number
  boxHeight?: number
  // Edit mode for positioning child elements
  editLayout?: boolean
  layout?: ControlsLayout
  onLayoutChange?: (next: ControlsLayout) => void
}) {
  const { available, disabled, pot, stack, toCall, minOpen, minRaiseExtraHint, onCheck, onCall, onFold, onBet, onRaise, scale = 1, boxWidth = 320, boxHeight = 220, editLayout = false, layout, onLayoutChange } = props

  const [betAmount, setBetAmount] = useState<number>(0)
  const prevDisabledRef = useRef<boolean>(true)
  const minVal = (() => {
    const stackCapped = Math.max(0, Math.floor(stack || 0))
    const callNeeded = Math.max(0, Math.floor(toCall || 0))
    if (callNeeded > 0) return Math.min(stackCapped, callNeeded)
    // No bet to call: allow default 0 (check) as the starting value in UI
    return 0
  })()
  const maxVal = Math.max(0, Math.floor(stack || 0))

  // Compute legal raise minimums when facing a bet
  const { minRaiseExtra, minRaiseTotal } = (() => {
    const callNeeded = Math.max(0, Math.floor(toCall || 0))
    if (callNeeded <= 0) return { minRaiseExtra: null as number | null, minRaiseTotal: null as number | null }
    const extra = Math.max(Math.floor(minRaiseExtraHint || 0), Math.max(1, Math.floor(minOpen || 1)))
    const total = Math.min(callNeeded + extra, maxVal)
    return { minRaiseExtra: extra, minRaiseTotal: total }
  })()

  useEffect(() => {
    const callNeeded = Math.max(0, Math.floor(toCall || 0))
    const stackCapped = Math.max(0, Math.floor(stack || 0))
    
    // Handle edge cases where stack might be 0
    if (stackCapped === 0) {
      setBetAmount(0)
      return
    }
    
    let init: number
    // Always default to the toCall amount when action passes
    init = Math.min(callNeeded, stackCapped)
    
    // Ensure the initial value is within bounds
    init = Math.max(minVal, Math.min(maxVal, init))
    
    const wasDisabled = prevDisabledRef.current
    // Re-initialize when controls become enabled for a new turn
    if (wasDisabled && !disabled) setBetAmount(init)
    // If disabled, keep tracking; don't override mid-turn changes otherwise
    prevDisabledRef.current = disabled
  }, [disabled, pot, stack, toCall, minOpen, minVal, maxVal])

  // Clamp to current legal bounds when constraints change during the turn
  useEffect(() => {
    if (disabled) return
    setBetAmount((prev) => {
      const clamped = Math.max(minVal, Math.min(maxVal, Math.floor(prev)))
      return clamped
    })
  }, [toCall, minOpen, stack, disabled, minVal, maxVal])

  // Helper function to safely set bet amount with validation
  const setBetAmountSafe = (value: number) => {
    let desired = Math.max(minVal, Math.min(maxVal, Math.floor(value)))
    const callNeeded = Math.max(0, Math.floor(toCall || 0))
    const minOpenLocal = Math.max(1, Math.floor(minOpen || 1))
    // If check and bet are available (no bet to call), clamp any positive bet to at least the minimum open
    if (callNeeded === 0 && desired > 0 && available.includes('bet')) {
      desired = Math.max(desired, Math.min(maxVal, minOpenLocal))
    }
    // If facing a bet and exceeding call, ensure at least min-raise total
    if (callNeeded > 0 && desired > callNeeded && minRaiseTotal != null) {
      desired = Math.max(desired, minRaiseTotal)
    }
    setBetAmount(desired)
  }

  const rootRef = useRef<HTMLDivElement | null>(null)

  const DEFAULTS: ControlsLayout = {
    check: { left: 70, top: 30 },
    call: { left: 70, top: 65 },
    fold: { left: 70, top: 100 },
    betBtn: { left: 70, top: 135 },
    raise: { left: 70, top: 170 },
    betLabel: { left: 230, top: 26 },
    betInput: { left: 290, top: 26 },
    potSlider: { left: 230, top: 120 },
    stackSlider: { left: 290, top: 120 },
    stackLabel: { left: 270, top: 200 },
  }

  const currentLayout: ControlsLayout = { ...DEFAULTS, ...(layout || {}) }

  return (
    <Card
      variant="elevated"
      padding="sm"
      className="poker-inline-controls"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        width: boxWidth,
        height: boxHeight,
        position: 'relative',
      }}
    >
      <PokerBettingButtons
        available={available}
        disabled={disabled}
        betAmount={betAmount}
        toCall={toCall}
        minRaiseExtra={minRaiseExtra ?? undefined}
        onCheck={onCheck}
        onCall={onCall}
        onFold={onFold}
        onBet={onBet}
        onRaise={onRaise}
        layout={currentLayout}
        editLayout={editLayout}
        onLayoutChange={onLayoutChange}
      />

      <PokerBetInput
        betAmount={betAmount}
        minVal={minVal}
        maxVal={maxVal}
        toCall={toCall}
        setBetAmountSafe={setBetAmountSafe}
        layout={currentLayout.betLabel || {}}
        inputLayout={currentLayout.betInput || currentLayout.betLabel || {}}
        editLayout={editLayout}
        onLayoutChange={onLayoutChange}
      />

      <PokerPotSlider
        pot={pot}
        betAmount={betAmount}
        setBetAmountSafe={setBetAmountSafe}
        layout={currentLayout.potSlider || {}}
        labelLayout={currentLayout.potSliderLabel}
        editLayout={editLayout}
        onLayoutChange={onLayoutChange}
      />

      <PokerStackSlider
        stack={stack}
        betAmount={betAmount}
        setBetAmountSafe={setBetAmountSafe}
        layout={currentLayout.stackSlider || {}}
        labelLayout={currentLayout.stackSliderLabel}
        editLayout={editLayout}
        onLayoutChange={onLayoutChange}
      />

      <PokerStackLabel
        stack={stack}
        layout={currentLayout.stackLabel || {}}
        editLayout={editLayout}
        onLayoutChange={onLayoutChange}
      />
    </Card>
  )
}


