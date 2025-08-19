import { CardBackSelector } from './components/CardBackSelector'
import { Card3D } from './components/Card3D'
import type { Card } from '../blackjack'

export function DeckGallery() {
  const handleCardBackChange = (cardBack: string) => {
    console.log('Card back changed to:', cardBack)
  }

  // Create a sample deck for display
  const sampleCards: Card[] = [
    { rank: 'A', suit: 'Hearts' },
    { rank: 'K', suit: 'Spades' },
    { rank: 'Q', suit: 'Diamonds' },
    { rank: 'J', suit: 'Clubs' },
    { rank: '10', suit: 'Hearts' },
    { rank: '9', suit: 'Spades' },
    { rank: '8', suit: 'Diamonds' },
    { rank: '7', suit: 'Clubs' },
  ]

  return (
    <div className="deck-gallery" style={{ padding: '20px' }}>
      <h2>Deck Gallery</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Card Back Selection</h3>
        <CardBackSelector onCardBackChange={handleCardBackChange} />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Sample Cards</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {sampleCards.map((card, index) => (
            <div key={`${card.rank}-${card.suit}-${index}`}>
              <Card3D card={card} faceDown={false} index={0} enterFromTop={false} flat={false} />
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Face Down Cards</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {sampleCards.slice(0, 4).map((card, index) => (
            <div key={`face-down-${card.rank}-${card.suit}-${index}`}>
              <Card3D card={card} faceDown={true} index={index} enterFromTop={false} flat={false} />
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h3>Animation Examples</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {sampleCards.slice(0, 3).map((card, index) => (
            <div key={`animated-${card.rank}-${card.suit}-${index}`}>
              <Card3D card={card} faceDown={false} index={index} enterFromTop={true} flat={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


