import { useState, useEffect } from 'react'
import { Button } from './index'
import { CONFIG } from '../../config'

export function CardBackCycler() {
  const [availableImages, setAvailableImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Available card back images
  const cardBackImages = [
    'default.png',
    'playingcard_00010_.png',
    'playingcard_00021_.png',
    'playingcard_00022_.png',
    'playingcard_00034_.png',
    'playingcard_00059_.png',
    'playingcard_00071_.png',
    'playingcard_00213_.png',
  ]

  // Load current card back from localStorage or config
  useEffect(() => {
    const saved = localStorage.getItem('selectedCardBack')
    if (saved) {
      const index = cardBackImages.indexOf(saved)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [])

  // Update available images
  useEffect(() => {
    setAvailableImages(cardBackImages)
  }, [])

  const cycleCardBack = () => {
    const nextIndex = (currentIndex + 1) % availableImages.length
    setCurrentIndex(nextIndex)
    
    const selectedImage = availableImages[nextIndex]
    
    // Update config and localStorage
    ;(CONFIG.ui as any).cardBackImage = selectedImage
    localStorage.setItem('selectedCardBack', selectedImage)
    
    // Force a re-render of cards by dispatching a custom event
    window.dispatchEvent(new CustomEvent('cardBackChanged', { detail: selectedImage }))
  }

  const getCurrentImageName = () => {
    const current = availableImages[currentIndex]
    if (!current) return 'Default'
    
    // Clean up the filename for display
    return current
      .replace('.png', '')
      .replace('playingcard_', 'Style ')
      .replace('default', 'Default')
  }

  return (
    <div className="card-back-cycler">
      <Button
        variant="secondary"
        size="sm"
        onClick={cycleCardBack}
        title={`Current: ${getCurrentImageName()}. Click to cycle to next card back.`}
      >
        🃏 {getCurrentImageName()}
      </Button>
    </div>
  )
}
