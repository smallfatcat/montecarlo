import { useMemo, useState } from 'react'
import { createStandardDeck, type Card } from '../blackjack'
import { Card3D } from './components/Card3D'

export function DeckGallery() {
  const [faceDown, setFaceDown] = useState(false)
  const [flat, setFlat] = useState(false)
  const [scale, setScale] = useState(1)
  const deck: Card[] = useMemo(() => createStandardDeck(), [])

  return (
    <div id="deck-gallery" className="deck-gallery">
      <h1>Card Layout Gallery</h1>
      <div className="deck-controls">
        <label>
          <input type="checkbox" checked={faceDown} onChange={(e) => setFaceDown(e.target.checked)} /> Face down
        </label>
        <label>
          <input type="checkbox" checked={flat} onChange={(e) => setFlat(e.target.checked)} /> Use flat-enter animation
        </label>
        <label className="scale">
          Scale
          <input
            type="range"
            min={0.7}
            max={1.3}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
          <span>{scale.toFixed(2)}x</span>
        </label>
      </div>

      <div className="deck-grid">
        {deck.map((card) => (
          <div key={`${card.suit}-${card.rank}`} className="deck-item">
            <div className="deck-card-wrapper" style={{ transform: `scale(${scale})` }}>
              <Card3D card={card} faceDown={faceDown} index={0} enterFromTop={false} flat={flat} />
            </div>
            <div className="deck-label">{card.rank} of {card.suit}</div>
          </div>
        ))}
      </div>
    </div>
  )
}


