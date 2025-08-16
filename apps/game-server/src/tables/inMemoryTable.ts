import type { BettingAction } from '../protocol.js'
import { C2S } from '../protocol'

export type TableId = string

export interface TableApi {
  tableId: TableId
  beginHand(): void
  act(action: BettingAction): void
  setAuto(auto: boolean): void
  getState(): unknown
}

export function createInMemoryTable(tableId: TableId, opts?: { seats?: number; startingStack?: number }) : TableApi {
  // For now, stub state transitions server-side; we will later extract PokerRuntime/flow.
  let lastAction: BettingAction | null = null
  let auto = false
  let handId = 0

  return {
    tableId,
    beginHand() {
      handId += 1
    },
    act(action) {
      // Basic validation only
      const parsed = C2S.act.safeParse({ tableId, action })
      if (!parsed.success) throw new Error('invalid action')
      lastAction = action
    },
    setAuto(v) {
      auto = v
    },
    getState() {
      return { tableId, handId, auto, lastAction }
    },
  }
}



