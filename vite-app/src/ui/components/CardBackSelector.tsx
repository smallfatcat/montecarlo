import { useState, useEffect } from 'react'
import { CONFIG } from '../../config'

interface CardBackImage {
  filename: string
  url: string
  selected: boolean
}

export function CardBackSelector() {
  const [availableImages, setAvailableImages] = useState<CardBackImage[]>([])
  const [selectedImage, setSelectedImage] = useState<string>(CONFIG.ui.cardBackImage)

  // Scan for available card back images
  useEffect(() => {
    const scanCardBackImages = async () => {
      try {
        // Try to fetch a list of images from the cardback directory
        // Since we can't directly list files, we'll try common names and check if they exist
        const commonNames = [
          'default.png',
          'playingcard_00010_.png',
          'playingcard_00021_.png',
          'playingcard_00022_.png',
          'playingcard_00034_.png',
          'playingcard_00059_.png',
          'playingcard_00071_.png',
          'playingcard_00213_.png',
        ]
        
        const images: CardBackImage[] = []
        
        for (const name of commonNames) {
          try {
            const response = await fetch(`/cardback/${name}`)
            if (response.ok) {
              console.log(`Found card back image: ${name}`)
              images.push({
                filename: name,
                url: `/cardback/${name}`,
                selected: name === selectedImage
              })
            } else {
              console.log(`Image not found: ${name} (${response.status})`)
            }
          } catch (error) {
            console.log(`Error loading image ${name}:`, error)
          }
        }
        
        // If no images found, add the default one
        if (images.length === 0) {
          images.push({
            filename: 'default.png',
            url: '/cardback/default.png',
            selected: true
          })
        }
        
        setAvailableImages(images)
      } catch (error) {
        console.error('Error scanning card back images:', error)
        // Fallback to default
        setAvailableImages([{
          filename: 'default.png',
          url: '/cardback/default.png',
          selected: true
        }])
      }
    }
    
    scanCardBackImages()
  }, [selectedImage])

  const handleImageSelect = (filename: string) => {
    setSelectedImage(filename)
    // Update the global config
    if (typeof window !== 'undefined') {
      // Store in localStorage for persistence
      localStorage.setItem('selectedCardBack', filename)
      // Update the CONFIG object (this is a simple approach)
      ;(CONFIG.ui as any).cardBackImage = filename
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const filename = file.name
        const newImage: CardBackImage = {
          filename,
          url: e.target?.result as string,
          selected: true
        }
        
        // Add to available images and select it
        setAvailableImages(prev => prev.map(img => ({ ...img, selected: false })).concat(newImage))
        setSelectedImage(filename)
        
        // Store in localStorage
        localStorage.setItem('selectedCardBack', filename)
        localStorage.setItem(`cardBack_${filename}`, e.target?.result as string)
        ;(CONFIG.ui as any).cardBackImage = filename
      }
      reader.readAsDataURL(file)
    }
  }

  // Load selected card back from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedCardBack')
    if (saved) {
      setSelectedImage(saved)
      ;(CONFIG.ui as any).cardBackImage = saved
    }
  }, [])

  return (
    <div className="card-back-selector">
      <h3>Card Back Selection</h3>
      
      <div className="card-back-options">
        {availableImages.map((image) => (
          <div
            key={image.filename}
            className={`card-back-option ${image.selected ? 'selected' : ''}`}
            onClick={() => handleImageSelect(image.filename)}
          >
            <img
              src={image.url}
              alt={`Card back: ${image.filename}`}
              className="card-back-preview"
              onError={(e) => {
                // Hide broken images
                (e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
            <span className="card-back-name">{image.filename}</span>
          </div>
        ))}
      </div>
      
      <div className="card-back-upload">
        <label htmlFor="card-back-file" className="upload-label">
          <input
            id="card-back-file"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          Upload New Card Back
        </label>
        <small>Upload a PNG image (96x140px recommended)</small>
      </div>
      
      <div className="card-back-info">
        <p>
          <strong>Current:</strong> {selectedImage}
        </p>
        <p>
          <small>
            Images are stored locally in your browser. 
            To share with others, place images in the <code>public/cardback/</code> folder.
          </small>
        </p>
      </div>
    </div>
  )
}
