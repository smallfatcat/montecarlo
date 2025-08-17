import { describe, it, expect } from 'vitest'
import { canEditConfig, resizePreserveNumbers } from '../../ui/useTableGame_removed'
import type { TableStatus } from '../table'

describe('UI state helpers', () => {
  it('canEditConfig only allows editing when idle or round_over', () => {
    const allowed: TableStatus[] = ['idle', 'round_over']
    const disallowed: TableStatus[] = ['seat_turn', 'dealer_turn']
    allowed.forEach(s => expect(canEditConfig(s)).toBe(true))
    disallowed.forEach(s => expect(canEditConfig(s)).toBe(false))
  })

  it('resizePreserveNumbers preserves existing values and fills new entries', () => {
    expect(resizePreserveNumbers([1,2,3], 2, 9)).toEqual([1,2])
    expect(resizePreserveNumbers([1,2], 4, 7)).toEqual([1,2,7,7])
    expect(resizePreserveNumbers([], 3, 5)).toEqual([5,5,5])
  })
})


