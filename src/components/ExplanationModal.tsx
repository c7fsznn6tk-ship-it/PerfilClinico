import { useEffect, useState } from 'react'
import { getCardDetails } from '../store/useGameStore'
import type { CardInPlay } from '../types'

type ExplanationModalProps = {
  isOpen: boolean
  activeCard: CardInPlay | null
  onClose: () => void
}

export function ExplanationModal({ isOpen, activeCard, onClose }: ExplanationModalProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false)

  useEffect(() => {
    setImageUnavailable(false)
  }, [isOpen, activeCard?.cardId])

  if (!isOpen || !activeCard) return null

  const card = getCardDetails(activeCard.cardId)
  if (!card) return null

  const imageSrc = `${import.meta.env.BASE_URL}slides/${card.id}.png`

  return (
    <div className="modal-overlay explanation-overlay">
      <div className="modal-card large explanation-modal-card">
        <button
          type="button"
          className="ghost-button explanation-floating-close"
          onClick={onClose}
          aria-label="Fechar explicação"
        >
          Fechar
        </button>

        <div className="explanation-media-shell">
          {imageUnavailable ? (
            <div className="explanation-fallback">
              <span className="eyebrow explanation-eyebrow">Slide explicativo</span>
              <h2>{card.resposta}</h2>
              <p className="answer-text">Explicação indisponível</p>
              <p className="support-text">
                Não foi possível carregar a imagem <strong>{card.id}.png</strong> em <strong>slides</strong>.
              </p>
              <p className="support-text">Você pode fechar esta janela e seguir normalmente com o jogo.</p>
            </div>
          ) : (
            <img
              src={imageSrc}
              alt={`Explicação da carta ${card.resposta}`}
              className="explanation-image"
              onError={() => setImageUnavailable(true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
