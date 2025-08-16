import { Card3D } from '../../components/Card3D'
import type { Card } from '../../../blackjack/types'

export interface PokerSeatCardsProps {
  seatIndex: number
  handId?: number
  seatCardScale: number
  hole: Card[]
  hasFolded: boolean
  highlightSet: Set<string>
  visibleHoleCount: number
  forceFaceDown: boolean
  idPrefix: string
}

const CARD_HEIGHT_PX = 140

export function PokerSeatCards({ 
  seatIndex, 
  handId, 
  seatCardScale, 
  hole, 
  hasFolded, 
  highlightSet, 
  visibleHoleCount, 
  forceFaceDown, 
  idPrefix 
}: PokerSeatCardsProps) {
  const scaledCardHeight = Math.ceil(CARD_HEIGHT_PX * seatCardScale) + 2

  if (hasFolded) return null

  return (
    <div
      id={`${idPrefix}-cards-${seatIndex}`}
      style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', height: scaledCardHeight }}
    >
      {hole.slice(0, 2).map((c, k) => (
        <div key={`${handId ?? 'H'}-${seatIndex}-${k}-${c.rank}-${c.suit}`} style={{ transform: `scale(${seatCardScale})`, transformOrigin: 'center' }}>
          <Card3D 
            card={c as any} 
            highlight={highlightSet.has(`S${seatIndex}-${k}`)} 
            faceDown={forceFaceDown || k >= visibleHoleCount} 
          />
        </div>
      ))}
    </div>
  )
}
