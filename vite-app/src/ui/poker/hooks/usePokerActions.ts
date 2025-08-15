import { useMemo } from 'react'
import type { BettingAction, PokerTableState } from '../../../poker/types'
import { getAvailableActions } from '../../../poker/flow'

export function usePokerActions(
  table: PokerTableState,
  mySeatIndex: number | null,
  review: any,
  runtimeRef: React.MutableRefObject<any>,
) {
  // Human action helpers (seat 0 only)
  const act = (type: BettingAction['type'], amount?: number) => {
    if (review) return
    // Only allow acting when it's our turn
    if (mySeatIndex == null || table.currentToAct !== mySeatIndex) return
    runtimeRef.current?.act({ type, amount })
  }

  const fold = () => act('fold')
  const check = () => act('check')
  const call = () => act('call')
  const bet = (amount?: number) => act('bet', amount)
  const raise = (amount?: number) => act('raise', amount)

  const available = useMemo(() => {
    if (mySeatIndex == null || table.currentToAct !== mySeatIndex) return []
    return getAvailableActions(table)
  }, [table, mySeatIndex])

  return {
    fold,
    check,
    call,
    bet,
    raise,
    available,
  }
}
