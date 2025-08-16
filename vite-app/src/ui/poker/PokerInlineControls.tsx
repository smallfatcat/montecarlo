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
  const { available, disabled, pot, stack, toCall, minOpen, minRaiseExtraHint, onCheck, onCall, onFold, onBet, onRaise, scale = 1, boxWidth = 400, boxHeight = 300, editLayout = false, layout, onLayoutChange } = props

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

  // Removed unused rootRef after grid refactor

  // New 1-9 rectangle schema defaults kept minimal for editability only
  const DEFAULTS: ControlsLayout = {
    checkBtn: { left: 70, top: 30 },
    callBtn: { left: 70, top: 65 },
    foldBtn: { left: 70, top: 100 },
    betBtn: { left: 70, top: 135 },
    raiseBtn: { left: 70, top: 170 },
    betBox: { left: 280, top: 26, width: 120, height: 52 },
    potSlider: { left: 280, top: 120 },
    stackSlider: { left: 340, top: 120 },
    stackLabel: { left: 310, top: 250, width: 120, height: 30 },
  }

  const currentLayout: ControlsLayout = { ...DEFAULTS, ...(layout || {}) }
  const areaMode = Boolean((layout as any)?.betBox)

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
      {areaMode ? (
        <>
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
            boxLayout={currentLayout.betBox}
            editLayout={editLayout}
            onLayoutChange={onLayoutChange}
          />

          <PokerPotSlider
            pot={pot}
            betAmount={betAmount}
            setBetAmountSafe={setBetAmountSafe}
            layout={currentLayout.potSlider || {}}
            editLayout={editLayout}
            onLayoutChange={onLayoutChange}
          />

          <PokerStackSlider
            stack={stack}
            betAmount={betAmount}
            setBetAmountSafe={setBetAmountSafe}
            layout={currentLayout.stackSlider || {}}
            editLayout={editLayout}
            onLayoutChange={onLayoutChange}
          />

          <PokerStackLabel
            stack={stack}
            layout={currentLayout.stackLabel || {}}
            editLayout={editLayout}
            onLayoutChange={onLayoutChange}
          />
        </>
      ) : (
        <div className="pic-grid" style={{ position: 'absolute', inset: 0 }}>
          <div className="pic-area pic-area--buttons" style={{ gridArea: 'buttons', position: 'relative' }}>
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
          </div>

          <div className="pic-area pic-area--bet" style={{ gridArea: 'bet', position: 'relative' }}>
            <PokerBetInput
              betAmount={betAmount}
              minVal={minVal}
              maxVal={maxVal}
              toCall={toCall}
              setBetAmountSafe={setBetAmountSafe}
              boxLayout={currentLayout.betBox}
              editLayout={editLayout}
              onLayoutChange={onLayoutChange}
            />
          </div>

          <div className="pic-area pic-area--sliders" style={{ gridArea: 'sliders', position: 'relative' }}>
            <PokerPotSlider
              pot={pot}
              betAmount={betAmount}
              setBetAmountSafe={setBetAmountSafe}
              layout={currentLayout.potSlider || {}}
              editLayout={editLayout}
              onLayoutChange={onLayoutChange}
            />

            <PokerStackSlider
              stack={stack}
              betAmount={betAmount}
              setBetAmountSafe={setBetAmountSafe}
              layout={currentLayout.stackSlider || {}}
              editLayout={editLayout}
              onLayoutChange={onLayoutChange}
            />
          </div>

          <div className="pic-area pic-area--stack" style={{ gridArea: 'stack', position: 'relative' }}>
            <PokerStackLabel
              stack={stack}
              layout={currentLayout.stackLabel || {}}
              editLayout={editLayout}
              onLayoutChange={onLayoutChange}
            />
          </div>
        </div>
      )}
    </Card>
  )
}


