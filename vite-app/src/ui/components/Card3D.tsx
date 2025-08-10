import { motion } from 'framer-motion'
import { CONFIG } from '../../config'
import type { Card } from '../../blackjack'
import { SvgPips } from './SvgPips'
import { FaceArt } from './FaceArt'
import { useMemo } from 'react'

export function Card3D({ card, faceDown = false, index = 0, enterFromTop = false, flat = false, highlight = false }: { card: Card; faceDown?: boolean; index?: number; enterFromTop?: boolean; flat?: boolean; highlight?: boolean }) {
  const suit = suitSymbol(card.suit)
  const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds'
  const rank = card.rank
  return (
    <motion.div
      className="card3d"
      style={{ transformStyle: 'preserve-3d' }}
      initial={{ opacity: 0, y: enterFromTop ? (flat ? CONFIG.animation.flatEnterOffsetTop : CONFIG.animation.cardEnterOffsetTop) : CONFIG.animation.cardEnterOffsetDefault, rotate: -3 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, y: CONFIG.animation.cardExitOffsetY }}
      transition={{ delay: index * (CONFIG.animation.cardStaggerStepMs / 1000) }}
    >
      <motion.div
        className={`card__face card__front ${isRed ? 'card--red' : 'card--black'}`}
        style={highlight ? { boxShadow: '0 0 0 3px var(--accent)', borderRadius: 12 } : undefined}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: CONFIG.animation.cardFlipDurationSec }}
      >
        <div className="card__corner card__corner--tl">
          <span className="card__rank">{card.rank}</span>
          <span className="card__suit">{suit}</span>
        </div>
        <div className="card__center">
          {isFaceCard(rank) ? (
            <FaceCenter suit={card.suit} rank={rank as any} />
          ) : (
            <SvgPips suit={card.suit} rank={rank} />
          )}
        </div>
        <div className="card__corner card__corner--br">
          <span className="card__rank">{card.rank}</span>
          <span className="card__suit">{suit}</span>
        </div>
      </motion.div>
      <motion.div
        className="card__face card__back"
        style={{ rotateY: 180 }}
        animate={{ rotateY: faceDown ? 0 : 180 }}
        transition={{ duration: CONFIG.animation.cardFlipDurationSec }}
      />
    </motion.div>
  )
}

function suitSymbol(s: Card['suit']) {
  return s === 'Hearts' ? '♥' : s === 'Diamonds' ? '♦' : s === 'Clubs' ? '♣' : '♠'
}

function isFaceCard(rank: Card['rank']): boolean {
  return rank === 'A' || rank === 'J' || rank === 'Q' || rank === 'K'
}

// Pip layout for number cards is handled by SvgPips

function FaceCenter({ suit, rank }: { suit: Card['suit']; rank: 'A' | 'J' | 'Q' | 'K' }) {
  const url = useMemo(() => {
    const s = suit.toLowerCase()
    const r = rank.toLowerCase()
    return `/face/${s}_${r}.png`
  }, [suit, rank])

  // Use an <img> that hides on error, falling back to SVG FaceArt
  return (
    <div style={{ width: '84%', height: '84%', display: 'grid', placeItems: 'center' }}>
      <img
        src={url}
        alt={`${rank} of ${suit}`}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <FaceArt suit={suit} rank={rank} />
    </div>
  )
}
