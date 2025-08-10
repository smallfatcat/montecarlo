// Web Worker to run high-speed poker simulations with progress updates
import type { PokerTableState } from '../poker/types'
import { createInitialPokerTable, startHand, applyAction } from '../poker/flow'
import { suggestActionPoker } from '../poker/strategy'

type RunMessage = {
  type: 'run'
  options: {
    hands: number
    seats: number
    startingStack: number
  }
}

type ProgressMessage = { type: 'progress'; completed: number; total: number }
type DoneMessage = { type: 'done'; result: { endingStacks: number[]; handsPlayed: number } }
type ErrorMessage = { type: 'error'; error: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: any = self

ctx.onmessage = (ev: MessageEvent<RunMessage>) => {
  const msg = ev.data
  if (!msg || msg.type !== 'run') return
  try {
    const res = runWithProgress(msg.options, (completed, total) => {
      const progress: ProgressMessage = { type: 'progress', completed, total }
      ctx.postMessage(progress)
    })
    const done: DoneMessage = { type: 'done', result: res }
    ctx.postMessage(done)
  } catch (e) {
    const err: ErrorMessage = { type: 'error', error: (e as Error).message }
    ctx.postMessage(err)
  }
}

function runWithProgress(options: RunMessage['options'], onProgress: (completed: number, total: number) => void) {
  const { hands, seats, startingStack } = options
  const cpuSeats = Array.from({ length: Math.max(0, seats - 1) }, (_, i) => i + 1)
  let state: PokerTableState = createInitialPokerTable(seats, cpuSeats, startingStack)
  const chunk = Math.max(1, Math.floor(hands / 20))

  for (let h = 0; h < hands; h += 1) {
    state = startHand(state)
    let guard = 2000
    while (state.status === 'in_hand' && guard-- > 0) {
      state = applyAction(state, suggestActionPoker(state, 'tight'))
    }
    if ((h + 1) % chunk === 0 || h + 1 === hands) onProgress(h + 1, hands)
  }

  return { endingStacks: state.seats.map((s) => s.stack), handsPlayed: hands }
}


