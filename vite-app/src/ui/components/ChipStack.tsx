import React from 'react'
import { CONFIG } from '../../config'
import { ChipIcon, DEFAULT_DENOMS, type ChipDenomination } from './ChipIcon'

function splitIntoDenoms(amount: number, denoms: ChipDenomination[] = DEFAULT_DENOMS): Array<{ denom: ChipDenomination; count: number }> {
  let remaining = Math.max(0, Math.floor(amount))
  const out: Array<{ denom: ChipDenomination; count: number }> = []
  for (const d of denoms) {
    const cnt = Math.floor(remaining / d)
    if (cnt > 0) out.push({ denom: d, count: cnt })
    remaining -= cnt * d
  }
  return out
}

export function ChipStack({ amount, size = CONFIG.poker.chipSizePx, overlap = CONFIG.poker.chipOverlap, maxChipsPerRow = CONFIG.poker.maxChipsPerRow, style }: { amount: number; size?: number; overlap?: number; maxChipsPerRow?: number; style?: React.CSSProperties }) {
  const groups = splitIntoDenoms(amount)
  const chips: Array<{ key: string; denom: ChipDenomination }> = []
  groups.forEach(g => {
    for (let i = 0; i < g.count; i += 1) chips.push({ key: `${g.denom}-${i}`, denom: g.denom })
  })
  const step = Math.max(1, Math.floor(size * overlap))
  const rows: Array<typeof chips> = []
  for (let i = 0; i < chips.length; i += maxChipsPerRow) rows.push(chips.slice(i, i + maxChipsPerRow))
  return (
    <div style={{ display: 'inline-block', ...style }}>
      {rows.map((row, r) => (
        <div key={r} style={{ display: 'flex', marginTop: r === 0 ? 0 : -Math.floor(size * 0.35) }}>
          {row.map((c, i) => (
            <ChipIcon key={`${r}-${c.key}`} denom={c.denom} size={size} style={{ marginLeft: i === 0 ? 0 : -step }} />
          ))}
        </div>
      ))}
    </div>
  )
}


