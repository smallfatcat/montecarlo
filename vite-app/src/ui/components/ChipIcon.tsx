import React from 'react'
import { CONFIG } from '../../config'

export type ChipDenomination = 5 | 10 | 25 | 100 | 500 | 1000 | 5000

const CHIP_COLORS: Record<ChipDenomination, { base: string; ring: string; text: string }> = {
  // 1:   { base: '#ffffff', ring: '#cfd8dc', text: '#263238' }, // white / grey
  5:   { base: '#ef5350', ring: '#b71c1c', text: '#ffffff' }, // red
  10:  { base: '#42a5f5', ring: '#1565c0', text: '#ffffff' }, // blue
  25:  { base: '#66bb6a', ring: '#2e7d32', text: '#ffffff' }, // green
  100: { base: '#424242', ring: '#000000', text: '#ffffff' }, // black
  500: { base: '#ab47bc', ring: '#6a1b9a', text: '#ffffff' }, // purple
  1000:{ base: '#ff9800', ring: '#e65100', text: '#1a1a1a' }, // orange
  5000:{ base: '#00bcd4', ring: '#00838f', text: '#1a1a1a' }, // teal
}

export function ChipIcon({ denom, size = CONFIG.poker.chipIconSizePx, style }: { denom: ChipDenomination; size?: number; style?: React.CSSProperties }) {
  const c = CHIP_COLORS[denom]
  const s = size
  const r = s / 2
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={style} aria-label={`Chip ${denom}`}>
      <defs>
        <linearGradient id={`g-${denom}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.ring} />
        </linearGradient>
      </defs>
      <circle cx={r} cy={r} r={r - 1} fill={`url(#g-${denom})`} stroke={c.ring} strokeWidth={1.5} />
      {/* Edge stripes */}
      {Array.from({ length: 6 }, (_, i) => {
        const ang = (i * 60 * Math.PI) / 180
        const x1 = r + Math.cos(ang) * (r - 2)
        const y1 = r + Math.sin(ang) * (r - 2)
        const x2 = r + Math.cos(ang) * (r - 6)
        const y2 = r + Math.sin(ang) * (r - 6)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={2} opacity={0.8} />
      })}
      {/* Center label */}
      <circle cx={r} cy={r} r={r * 0.45} fill="#ffffff" opacity={0.85} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={s * 0.38} fontWeight={800} fill={c.text}>
        {denom}
      </text>
    </svg>
  )
}

export const DEFAULT_DENOMS: ChipDenomination[] = [5000, 1000, 500, 100, 25, 10, 5]


