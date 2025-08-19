import React, { useState } from 'react';
import { CONFIG } from '../../config';

interface CardBackSelectorProps {
  onCardBackChange: (cardBack: string) => void;
}

export const CardBackSelector: React.FC<CardBackSelectorProps> = ({ onCardBackChange }) => {
  const [selectedImage, setSelectedImage] = useState<string>(CONFIG.cardBackImage)
  const [isOpen, setIsOpen] = useState(false)

  const cardBackOptions = [
    { value: 'default.png', label: 'Default' },
    { value: 'blue.png', label: 'Blue' },
    { value: 'red.png', label: 'Red' },
    { value: 'green.png', label: 'Green' },
    { value: 'purple.png', label: 'Purple' }
  ]

  const handleCardBackChange = (cardBack: string) => {
    setSelectedImage(cardBack)
    onCardBackChange(cardBack)
    setIsOpen(false)
  }

  return (
    <div className="card-back-selector">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="card-back-button"
        style={{
          padding: '8px 16px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: '#fff',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Select Card Back
      </button>
      
      {isOpen && (
        <div className="card-back-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          minWidth: '150px'
        }}>
          {cardBackOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => handleCardBackChange(option.value)}
              className={`card-back-option ${selectedImage === option.value ? 'selected' : ''}`}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
                background: selectedImage === option.value ? '#f0f0f0' : 'transparent'
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
