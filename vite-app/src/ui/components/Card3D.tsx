import { motion } from 'framer-motion'
import { CONFIG } from '../../config'
import type { Card } from '../../blackjack'
import { SvgPips } from './SvgPips'

export function Card3D({ card, faceDown = false, index = 0, enterFromTop = false, flat = false }: { card: Card; faceDown?: boolean; index?: number; enterFromTop?: boolean; flat?: boolean }) {
  const suit = suitSymbol(card.suit)
  const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds'
  const rank = card.rank
  const pipCoords = getPipCoords(rank)
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
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="card__corner card__corner--tl">
          <span className="card__rank">{card.rank}</span>
          <span className="card__suit">{suit}</span>
        </div>
        <div className="card__center">
          {isFaceCard(rank) ? (
            <span className="card__faceletter">{rank === 'A' ? suit : rank}</span>
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
        transition={{ duration: 0.35 }}
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

// Grid is 7 rows x 3 cols (rows 1..7, cols 1..3)
function getPipCoords(_: Card['rank']): Array<[number, number]> { return [] }


