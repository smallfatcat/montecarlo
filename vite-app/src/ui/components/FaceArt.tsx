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

export function FaceArt({ suit, rank }: { suit: Card['suit']; rank: Exclude<Card['rank'], '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'> }) {
  const primary = isRed(suit) ? '#d0021b' : '#111'
  const accent = isRed(suit) ? '#ffb3bd' : '#b5b5b5'
  const border = isRed(suit) ? '#e57373' : '#888'

  if (rank === 'A') {
    return (
      <svg viewBox="0 0 100 100" aria-hidden>
        <SuitShape suit={suit} fill={primary} />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {/* Framed panel */}
      <rect x="12" y="8" width="76" height="84" rx="8" fill="#fff" stroke={border} strokeWidth="2" />
      <rect x="18" y="14" width="64" height="72" rx="6" fill={isRed(suit) ? 'rgba(208,2,27,0.06)' : 'rgba(0,0,0,0.06)'} stroke={border} strokeWidth="1" />

      {/* Crown / weapon motifs vary by rank */}
      {rank === 'K' ? (
        <g>
          <path d="M30 36 L40 22 L50 34 L60 22 L70 36 L70 40 L30 40 Z" fill={primary} stroke={primary} strokeWidth="1" />
          <rect x="32" y="42" width="36" height="6" rx="3" fill={primary} opacity="0.8" />
          <rect x="48" y="50" width="4" height="28" fill={primary} />
          <rect x="36" y="58" width="28" height="14" rx="7" fill={accent} stroke={border} />
        </g>
      ) : rank === 'Q' ? (
        <g>
          <circle cx="50" cy="34" r="10" fill={accent} stroke={border} />
          <path d="M34 46 C46 56, 54 56, 66 46" fill="none" stroke={primary} strokeWidth="3" />
          <path d="M30 64 C40 54, 60 54, 70 64" fill="none" stroke={primary} strokeWidth="3" />
          <rect x="38" y="66" width="24" height="10" rx="5" fill={accent} stroke={border} />
        </g>
      ) : (
        // Jack
        <g>
          <rect x="46" y="22" width="8" height="42" rx="3" fill={primary} />
          <polygon points="50,18 56,24 44,24" fill={primary} />
          <circle cx="50" cy="70" r="8" fill={accent} stroke={border} />
          <rect x="34" y="60" width="32" height="6" rx="3" fill={primary} opacity="0.85" />
        </g>
      )}

      {/* Suit corners inside the frame for extra detail */}
      <g transform="scale(0.25) translate(48, 240)" opacity="0.85">
        <SuitShape suit={suit} fill={primary} />
      </g>
      <g transform="scale(0.25) translate(240, 48) rotate(180 50 50)" opacity="0.85">
        <SuitShape suit={suit} fill={primary} />
      </g>
    </svg>
  )
}


