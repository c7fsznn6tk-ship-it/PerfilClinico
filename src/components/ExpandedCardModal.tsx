import { useEffect } from 'react'
import type { CardInPlay } from '../types'
import { getCardDetails } from '../store/useGameStore'
import cartaFrente from '../assets/cards/CartaFrente2.png'

type ExpandedCardModalProps = {
  isOpen: boolean
  slot: CardInPlay | null
  frontImage?: string | null
  onClose: () => void
}

export function ExpandedCardModal({ isOpen, slot, frontImage, onClose }: ExpandedCardModalProps) {
  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !slot) return null

  const card = getCardDetails(slot.cardId)
  if (!card) return null

  const visibleHintKeys = Array.from({ length: slot.dicasReveladas }, (_, index) => String(6 - index))
  const revealedHintSet = new Set(visibleHintKeys)
  const displayNumber = card.id.replace('card-', '')

  return (
    <div className="modal-overlay expanded-card-overlay">
      <div className="modal-card expanded-card-modal">
        <button
          type="button"
          className="ghost-button expanded-card-close"
          onClick={onClose}
          aria-label="Fechar carta ampliada"
        >
          Fechar
        </button>

        <div className="expanded-card-stage">
          <div
            className="expanded-card-surface"
            onClick={onClose}
            role="button"
            tabIndex={0}
            aria-label="Fechar carta ampliada"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClose()
              }
            }}
            style={{ backgroundImage: `url(${frontImage || cartaFrente})` }}
          >
            <span className="card-position expanded-card-position" aria-label={`Carta ${displayNumber}`}>
              <span className="card-position-label">Carta</span>
              <strong className="card-position-value">#{displayNumber}</strong>
            </span>

            <div className="card-header-chip expanded-card-header-chip">
              <span className="card-header-label expanded-card-header-label">{card.categoria}</span>
            </div>

            <div
              className="card-hints-overlay expanded-card-hints-overlay"
              aria-label="Carta ampliada com dicas reveladas"
            >
              {(['1', '2', '3', '4', '5', '6'] as const).map((hintKey) => {
                const hintText = revealedHintSet.has(hintKey) ? card.dicas[hintKey] ?? '' : ''

                return (
                  <div
                    key={hintKey}
                    className={`card-hint-line expanded-card-hint-line ${revealedHintSet.has(hintKey) ? 'is-visible' : ''}`}
                  >
                    <span className="card-hint-number expanded-card-hint-number">{hintKey}.</span>
                    <span className="card-hint-text expanded-card-hint-text">{hintText}</span>
                  </div>
                )
              })}
            </div>

            <div className="card-footer-meta expanded-card-footer-meta">
              <span>{slot.dicasReveladas} dica(s) revelada(s)</span>
              <span>Carta ampliada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
