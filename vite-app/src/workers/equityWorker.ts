// Web Worker to compute Monte Carlo equities for current poker hand
import { evaluateSeven } from '../poker/handEval'
import { createStandardDeck } from '../blackjack/deck'
import type { Card } from '../blackjack/types'

type SeatIn = { hole: Card[]; folded: boolean }

type RunMsg = {
  type: 'run'
  data: {
    seats: SeatIn[]
    community: Card[]
    samples: number
  }
}

type DoneMsg = { type: 'done'; result: { win: number[]; tie: number[] } }
type ErrorMsg = { type: 'error'; error: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: any = self

ctx.onmessage = (ev: MessageEvent<RunMsg>) => {
  try {
    const msg = ev.data
    if (!msg || msg.type !== 'run') return
    const { seats, community, samples } = msg.data
    const result = runEquity(seats, community, samples)
    const out: DoneMsg = { type: 'done', result }
    ctx.postMessage(out)
  } catch (e) {
    const err: ErrorMsg = { type: 'error', error: (e as Error).message }
    ctx.postMessage(err)
  }
}

function runEquity(seats: SeatIn[], community: Card[], samples: number): { win: number[]; tie: number[] } {
  const activeIdx: number[] = []
  seats.forEach((s, i) => { if (!s.folded && s.hole.length === 2) activeIdx.push(i) })
  const unknownIdx: number[] = []
  seats.forEach((s, i) => { if (!s.folded && s.hole.length !== 2) unknownIdx.push(i) })
  const numActive = activeIdx.length + unknownIdx.length
  const wins = new Array(seats.length).fill(0)
  const ties = new Array(seats.length).fill(0)
  if (numActive <= 1) return { win: wins, tie: ties }

  // Build base remaining deck (exclude only known public cards and known holes)
  const full = createStandardDeck()
  const key = (c: Card) => `${c.rank}-${c.suit}`
  const knownKey = new Set<string>()
  community.forEach((c) => knownKey.add(key(c)))
  seats.forEach((s) => { if (s.hole.length === 2) s.hole.forEach((c) => knownKey.add(key(c))) })
  const baseRemaining: Card[] = full.filter((c) => !knownKey.has(key(c)))

  const needBoard = Math.max(0, 5 - community.length)
  const rng = Math.random

  for (let t = 0; t < samples; t += 1) {
    // Copy and shuffle remaining deck for this trial
    const pool = baseRemaining.slice()
    shuffleInPlace(pool, rng)

    // Assign unknown holes from the pool without replacement
    const trialHoles: Record<number, [Card, Card]> = {}
    for (const si of unknownIdx) {
      const a = pool.pop()!
      const b = pool.pop()!
      trialHoles[si] = [a, b]
    }

    // Draw remaining board from pool
    const draw = pool.slice(0, needBoard)
    const board = [...community, ...draw]

    // Evaluate all active players (known and unknown)
    let bestClass = -1
    let bestRanks: number[] = []
    let bestIdxs: number[] = []
    const consider = (si: number, cards: Card[]) => {
      const ev = evaluateSeven([...cards, ...board])
      const cls = classOrder(ev.class)
      if (bestIdxs.length === 0) { bestClass = cls; bestRanks = ev.ranks; bestIdxs = [si] }
      else {
        const cmp = compareRanks(cls, ev.ranks, bestClass, bestRanks)
        if (cmp > 0) { bestClass = cls; bestRanks = ev.ranks; bestIdxs = [si] }
        else if (cmp === 0) { bestIdxs.push(si) }
      }
    }
    activeIdx.forEach((si) => consider(si, seats[si].hole))
    unknownIdx.forEach((si) => consider(si, trialHoles[si]))

    if (bestIdxs.length === 1) wins[bestIdxs[0]] += 1
    else bestIdxs.forEach((i) => { ties[i] += 1 })
  }

  return { win: wins, tie: ties }
}

function shuffleInPlace<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
  }
}

function classOrder(c: string): number {
  switch (c) {
    case 'high_card': return 0
    case 'pair': return 1
    case 'two_pair': return 2
    case 'three_kind': return 3
    case 'straight': return 4
    case 'flush': return 5
    case 'full_house': return 6
    case 'four_kind': return 7
    case 'straight_flush': return 8
    default: return 0
  }
}

function compareRanks(aClass: number, aRanks: number[], bClass: number, bRanks: number[]): number {
  if (aClass !== bClass) return aClass - bClass
  const len = Math.max(aRanks.length, bRanks.length)
  for (let i = 0; i < len; i += 1) {
    const a = aRanks[i] ?? -1
    const b = bRanks[i] ?? -1
    if (a !== b) return a - b
  }
  return 0
}


