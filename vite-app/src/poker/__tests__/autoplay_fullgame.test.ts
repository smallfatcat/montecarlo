import { describe, it, expect } from 'vitest'
import { createInitialPokerTable, startHand, applyAction } from '../flow'
import type { PokerTableState } from '../types'
import { suggestActionPoker } from '../strategy'

function runOneHand(table: PokerTableState, guard: number = 8000): { state: PokerTableState; pot: number; busts: number } {
  const beforeStacks = table.seats.map((s) => s.stack)
  let t = startHand(table)
  let steps = guard
  while (t.status === 'in_hand' && steps-- > 0) {
    t = applyAction(t, suggestActionPoker(t, 'tight'))
  }
  if (steps <= 0) {
    throw new Error(`hand step guard exceeded; handId=${t.handId} street=${t.street} betToCall=${t.betToCall} currentToAct=${t.currentToAct}`)
  }
  const pot = t.seats.reduce((sum, s) => sum + s.totalCommitted, 0)
  const afterStacks = t.seats.map((s) => s.stack)
  let busts = 0
  for (let i = 0; i < beforeStacks.length; i += 1) {
    if (beforeStacks[i] > 0 && afterStacks[i] === 0) busts += 1
  }
  return { state: t, pot, busts }
}

function runManyHands(table: PokerTableState, maxHands: number, guardPerHand = 8000): PokerTableState {
  let t = table
  for (let h = 0; h < maxHands && !t.gameOver; h += 1) {
    const res = runOneHand(t, guardPerHand)
    t = res.state
  }
  return t
}

function seedRandom(seed: number): () => void {
  const original = Math.random
  // Simple LCG for determinism in tests
  let s = seed >>> 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Math as any).random = () => {
    s = (1664525 * s + 1013904223) >>> 0
    return (s & 0xffffffff) / 0x100000000
  }
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(Math as any).random = original
  }
}

describe('autoplay-style full game loops', () => {
  it('plays many hands without stalling (6-max NLHE)', () => {
    let t: PokerTableState = createInitialPokerTable(6, [1,2,3,4,5], 100)
    const maxHands = 200
    for (let h = 0; h < maxHands && !t.gameOver; h += 1) {
      t = runOneHand(t, 8000).state
    }
    // Should have completed at least a few hands without exhausting guards
    expect(t.handId).toBeGreaterThan(0)
  })

  it('continues past bust-outs and ends the game when one player remains', () => {
    let t: PokerTableState = createInitialPokerTable(4, [1,2,3], 20)
    const maxHands = 2000
    t = runManyHands(t, maxHands)
    const playersWithChips = t.seats.filter((s) => s.stack > 0).length
    expect(playersWithChips === 1 || t.gameOver === true).toBe(true)
  })

  it('heads-up deep stacks plays through many hands without stalls', () => {
    let t: PokerTableState = createInitialPokerTable(2, [1], 300)
    // Slightly increase blinds to exercise sizing logic
    t.rules.smallBlind = 2
    t.rules.bigBlind = 4
    t = runManyHands(t, 150)
    expect(t.handId).toBeGreaterThan(20)
  })

  it('6-max short stacks with higher blinds does not stall', () => {
    let t: PokerTableState = createInitialPokerTable(6, [1,2,3,4,5], 20)
    t.rules.smallBlind = 2
    t.rules.bigBlind = 4
    t = runManyHands(t, 400)
    expect(t.handId).toBeGreaterThan(30)
  })

  it('3-max mixed stacks continues and ends when only one remains', () => {
    let t: PokerTableState = createInitialPokerTable(3, [1,2], 100)
    // Manually set uneven stacks
    t.seats[0].stack = 150
    t.seats[1].stack = 40
    t.seats[2].stack = 10
    t = runManyHands(t, 1000)
    const withChips = t.seats.filter((s) => s.stack > 0).length
    expect(withChips === 1 || t.gameOver).toBe(true)
  })

  it('metrics: computes avg pot and bust count over a run', () => {
    let t: PokerTableState = createInitialPokerTable(5, [1,2,3,4], 50)
    t.rules.smallBlind = 1
    t.rules.bigBlind = 2
    const hands = 200
    let totalPot = 0
    let totalBusts = 0
    for (let h = 0; h < hands && !t.gameOver; h += 1) {
      const res = runOneHand(t, 8000)
      t = res.state
      totalPot += res.pot
      totalBusts += res.busts
    }
    const avgPot = totalPot / Math.max(1, t.handId)
    expect(avgPot).toBeGreaterThan(0)
    expect(totalBusts).toBeGreaterThanOrEqual(0)
  })

  it('randomized seeds: 6-max short stacks produce at least one bust within 300 hands', () => {
    for (let seed = 1; seed <= 8; seed += 1) {
      const restore = seedRandom(seed)
      let t: PokerTableState = createInitialPokerTable(6, [1,2,3,4,5], 20)
      t.rules.smallBlind = 2
      t.rules.bigBlind = 4
      t = runManyHands(t, 200)
      const numZero = t.seats.filter((s) => s.stack <= 0).length
      expect(numZero > 0 || t.gameOver).toBe(true)
      restore()
    }
  })

  it('randomized mixed stacks converge to a single winner within 1000 hands', () => {
    const restore = seedRandom(12345)
    let t: PokerTableState = createInitialPokerTable(5, [1,2,3,4], 30)
    t.seats[0].stack = 45
    t.seats[1].stack = 10
    t.seats[2].stack = 25
    t.seats[3].stack = 5
    t.seats[4].stack = 40
    t.rules.smallBlind = 2
    t.rules.bigBlind = 4
    t = runManyHands(t, 600)
    expect(t.gameOver || t.seats.filter((s) => s.stack > 0).length === 1).toBe(true)
    restore()
  })
})


