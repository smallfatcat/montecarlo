import type { Card } from '../../blackjack'

function isRed(suit: Card['suit']) {
  return suit === 'Hearts' || suit === 'Diamonds'
}

function SuitShape({ suit, fill = '#000' }: { suit: Card['suit']; fill?: string }) {
  switch (suit) {
    case 'Hearts':
      return (
        <path d="M50 88 C35 78 14 64 8 46 C3 32 9 18 22 13 C32 9 43 12 50 20 C57 12 68 9 78 13 C91 18 97 32 92 46 C86 64 65 78 50 88 Z" fill={fill} />
      )
    case 'Diamonds':
      return <path d="M50 5 L92 50 L50 95 L8 50 Z" fill={fill} />
    case 'Spades':
      return (
        <g fill={fill}>
          <path d="M50 10 C38 22 18 36 12 52 C9 60 12 70 20 75 C29 81 41 77 46 69 L50 62 L54 69 C59 77 71 81 80 75 C88 70 91 60 88 52 C82 36 62 22 50 10 Z" />
          <rect x="45" y="72" width="10" height="18" rx="3" />
        </g>
      )
    case 'Clubs':
      return (
        <g fill={fill}>
          <circle cx="35" cy="42" r="12" />
          <circle cx="65" cy="42" r="12" />
          <circle cx="50" cy="28" r="12" />
          <rect x="45" y="48" width="10" height="18" rx="3" />
        </g>
      )
  }
}

type Pip = { x: number; y: number }

function layoutForRank(rank: Card['rank']): Pip[] {
  const rows = { r1: 12, r2: 25, r3: 38, r4: 50, r5: 62, r6: 75, r7: 88 }
  const cols = { L: 28, C: 50, R: 72 }
  switch (rank) {
    case '2':
      return [ { x: cols.C, y: rows.r2 }, { x: cols.C, y: rows.r6 } ]
    case '3':
      return [ { x: cols.C, y: rows.r2 }, { x: cols.C, y: rows.r4 }, { x: cols.C, y: rows.r6 } ]
    case '4':
      return [ { x: cols.L, y: rows.r2 }, { x: cols.R, y: rows.r2 }, { x: cols.L, y: rows.r6 }, { x: cols.R, y: rows.r6 } ]
    case '5':
      return [ { x: cols.L, y: rows.r2 }, { x: cols.R, y: rows.r2 }, { x: cols.C, y: rows.r4 }, { x: cols.L, y: rows.r6 }, { x: cols.R, y: rows.r6 } ]
    case '6':
      return [ { x: cols.L, y: rows.r2 }, { x: cols.R, y: rows.r2 }, { x: cols.L, y: rows.r4 }, { x: cols.R, y: rows.r4 }, { x: cols.L, y: rows.r6 }, { x: cols.R, y: rows.r6 } ]
    case '7':
      return [ ...layoutForRank('6'), { x: cols.C, y: rows.r1 } ]
    case '8':
      return [ ...layoutForRank('6'), { x: cols.C, y: rows.r1 }, { x: cols.C, y: rows.r7 } ]
    case '9':
      return [ ...layoutForRank('8'), { x: cols.C, y: rows.r4 } ]
    case '10':
      return [ ...layoutForRank('9'), { x: cols.C, y: rows.r3 } ]
    default:
      return []
  }
}

export function SvgPips({ suit, rank }: { suit: Card['suit']; rank: Card['rank'] }) {
  const fill = isRed(suit) ? '#d0021b' : '#111'
  const pips = layoutForRank(rank)
  const size = 22 // percentage of 100x100 viewBox
  return (
    <svg viewBox="0 0 100 100" className="pips-svg" aria-hidden>
      {pips.map((p, i) => (
        <g key={i} transform={`translate(${p.x}, ${p.y}) scale(${size/100}) translate(-50, -50)`}>
          <SuitShape suit={suit} fill={fill} />
        </g>
      ))}
    </svg>
  )
}


