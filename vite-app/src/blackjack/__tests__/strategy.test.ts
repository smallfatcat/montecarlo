import { describe, it, expect, afterEach } from 'vitest'
import type { Card } from '../types'
import { suggestAction, type SuggestedAction } from '../strategy'
import { CONFIG } from '../../config'

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

function avail(list: Array<SuggestedAction | 'surrender'>) {
  return new Set(list)
}

describe('strategy: pairs', () => {
  it('A,A -> split always if allowed', () => {
    const action = suggestAction({ hand: [C('A','Spades'), C('A','Hearts')], dealerUp: C('9','Clubs'), available: avail(['hit','stand','double','split']), canSplit: true })
    expect(action).toBe('split')
  })

  it('T,T -> stand', () => {
    const action = suggestAction({ hand: [C('K','Spades'), C('10','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand','double']), canSplit: false })
    expect(action).toBe('stand')
  })

  it('9,9 -> split vs 2-6,8-9; stand vs 7,10,A', () => {
    const vs7 = suggestAction({ hand: [C('9','Spades'), C('9','Hearts')], dealerUp: C('7','Clubs'), available: avail(['hit','stand','split']), canSplit: true })
    expect(vs7).toBe('stand')
    const vs6 = suggestAction({ hand: [C('9','Spades'), C('9','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand','split']), canSplit: true })
    expect(vs6).toBe('split')
    const vs10 = suggestAction({ hand: [C('9','Spades'), C('9','Hearts')], dealerUp: C('K','Clubs'), available: avail(['hit','stand','split']), canSplit: true })
    expect(vs10).toBe('stand')
  })

  it('5,5 -> double vs up<=9 else hit; respects availability', () => {
    const dbl = suggestAction({ hand: [C('5','Spades'), C('5','Hearts')], dealerUp: C('9','Clubs'), available: avail(['hit','stand','double']), canSplit: false })
    expect(dbl).toBe('double')
    const noDbl = suggestAction({ hand: [C('5','Spades'), C('5','Hearts')], dealerUp: C('9','Clubs'), available: avail(['hit','stand']), canSplit: false })
    expect(noDbl).toBe('hit')
  })

  it('4,4 -> split only vs 5 or 6; otherwise hit', () => {
    const vs5 = suggestAction({ hand: [C('4','Spades'), C('4','Hearts')], dealerUp: C('5','Clubs'), available: avail(['hit','stand','split']), canSplit: true })
    expect(vs5).toBe('split')
    const vs7 = suggestAction({ hand: [C('4','Spades'), C('4','Hearts')], dealerUp: C('7','Clubs'), available: avail(['hit','stand','split']), canSplit: true })
    expect(vs7).toBe('hit')
  })
})

describe('strategy: soft totals', () => {
  const rulesBackup = JSON.parse(JSON.stringify(CONFIG.rules))
  afterEach(() => {
    Object.assign(CONFIG.rules, rulesBackup)
  })

  it('soft 18 (A,7): stand vs 2, 7-8; double vs 3-6 (if allowed); hit vs 9,A', () => {
    // stand vs 2
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('2','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('stand')
    // double vs 3-6
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('3','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('double')
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('double')
    // no double available -> strategy falls back to 'stand' vs small upcards
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('3','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('stand')
    // stand vs 7-8
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('7','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('stand')
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('8','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('stand')
    // hit vs 9 or Ace
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('9','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('hit')
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('A','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('hit')
  })

  it('soft 18 (A,7) under H17: double vs 2 when allowed, otherwise stand', () => {
    Object.assign(CONFIG.rules, { dealerHitsSoft17: true })
    // double vs 2 when allowed
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('2','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('double')
    // fallback to stand when double unavailable
    expect(suggestAction({ hand: [C('A','Spades'), C('7','Hearts')], dealerUp: C('2','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('stand')
  })

  it('soft 19 (A,8) under H17: double vs 6 when allowed; otherwise stand', () => {
    Object.assign(CONFIG.rules, { dealerHitsSoft17: true })
    expect(suggestAction({ hand: [C('A','Spades'), C('8','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('double')
    expect(suggestAction({ hand: [C('A','Spades'), C('8','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('stand')
  })
})

describe('strategy: hard totals', () => {
  it('16: surrender vs 9-10-A if allowed; else hit; stand vs 2-6', () => {
    expect(suggestAction({ hand: [C('9','Spades'), C('7','Hearts')], dealerUp: C('10','Clubs'), available: avail(['hit','stand','surrender']), canSplit: false })).toBe('surrender')
    expect(suggestAction({ hand: [C('9','Spades'), C('7','Hearts')], dealerUp: C('10','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('hit')
    expect(suggestAction({ hand: [C('9','Spades'), C('7','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('stand')
  })

  it('15: surrender vs 10 if allowed; else hit; stand vs 2-6', () => {
    expect(suggestAction({ hand: [C('8','Spades'), C('7','Hearts')], dealerUp: C('10','Clubs'), available: avail(['hit','stand','surrender']), canSplit: false })).toBe('surrender')
    expect(suggestAction({ hand: [C('8','Spades'), C('7','Hearts')], dealerUp: C('10','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('hit')
    expect(suggestAction({ hand: [C('8','Spades'), C('7','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('stand')
  })

  it('12: stand vs 4-6 else hit', () => {
    expect(suggestAction({ hand: [C('7','Spades'), C('5','Hearts')], dealerUp: C('4','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('stand')
    expect(suggestAction({ hand: [C('7','Spades'), C('5','Hearts')], dealerUp: C('2','Clubs'), available: avail(['hit','stand']), canSplit: false })).toBe('hit')
  })

  it('11: double except vs Ace; 10: double vs up<=9; 9: double vs 3-6', () => {
    expect(suggestAction({ hand: [C('6','Spades'), C('5','Hearts')], dealerUp: C('9','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('double')
    expect(suggestAction({ hand: [C('6','Spades'), C('5','Hearts')], dealerUp: C('A','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('hit')
    expect(suggestAction({ hand: [C('5','Spades'), C('5','Hearts')], dealerUp: C('9','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('double')
    expect(suggestAction({ hand: [C('5','Spades'), C('4','Hearts')], dealerUp: C('3','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('double')
    expect(suggestAction({ hand: [C('5','Spades'), C('4','Hearts')], dealerUp: C('2','Clubs'), available: avail(['hit','stand','double']), canSplit: false })).toBe('hit')
  })
})

describe('strategy: availability fallbacks', () => {
  const rulesBackup2 = JSON.parse(JSON.stringify(CONFIG.rules))
  afterEach(() => { Object.assign(CONFIG.rules, rulesBackup2) })
  it('suggest split falls back to hit if split not available (canSplit=true but no split in availability)', () => {
    const action = suggestAction({ hand: [C('8','Spades'), C('8','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand']), canSplit: true })
    expect(action).toBe('hit')
  })

  it('suggest split respects allowSplitRanks rule', () => {
    Object.assign(CONFIG.rules, { allowSplitRanks: ['A'] })
    const action = suggestAction({ hand: [C('8','Spades'), C('8','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand','split']), canSplit: true })
    expect(action).toBe('hit')
    // Allow 8s now
    Object.assign(CONFIG.rules, { allowSplitRanks: ['A','8'] })
    const action2 = suggestAction({ hand: [C('8','Spades'), C('8','Hearts')], dealerUp: C('6','Clubs'), available: avail(['hit','stand','split']), canSplit: true })
    expect(action2).toBe('split')
  })
})


