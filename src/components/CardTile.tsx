import type { CardInPlay } from '../types'
import { getCardDetails } from '../store/useGameStore'
import cartaVerso from '../assets/cards/CartaVerso.png'
import cartaFrente from '../assets/cards/CartaFrente2.png'

type CardTileProps = {
  slot: CardInPlay
  frontImage?: string | null
  backImage?: string | null
  isActive: boolean
  interactionLocked: boolean
  onClick: () => void
  onShowAnswer: () => void
  onExpand: () => void
}

export function CardTile({
  slot,
  frontImage,
  backImage,
  isActive,
  interactionLocked,
  onClick,
  onShowAnswer,
  onExpand,
}: CardTileProps) {
  const card = getCardDetails(slot.cardId)
  const backgroundImage =
    slot.status === 'virada' ? backImage || cartaVerso : frontImage || cartaFrente
  const isFirstReveal = slot.status === 'ativa' && slot.dicasReveladas === 1
  const displayNumber = card?.id.replace('card-', '') ?? String(slot.slotId)
  const canExpandFromCard = slot.status === 'ativa'
  const canReveal = !interactionLocked && slot.status !== 'resolvida'
  const canInteract = canReveal || canExpandFromCard

  const visibleHintKeys = Array.from({ length: slot.dicasReveladas }, (_, index) => String(6 - index))
  const revealedHintSet = new Set(visibleHintKeys)

  function handleCardAction() {
    if (canExpandFromCard) {
      onExpand()
      return
    }
    onClick()
  }

  return (
    <article className={`card-shell ${slot.status === 'resolvida' ? 'is-resolved' : ''}`}>
      <button
        type="button"
        className={`card-tile ${isActive ? 'is-active' : ''} ${slot.status === 'resolvida' ? 'is-resolved' : ''} ${slot.status === 'virada' ? 'is-face-down' : 'is-face-up'} ${isFirstReveal ? 'is-flipping' : ''} ${canExpandFromCard ? 'is-zoomable' : ''}`}
        onClick={handleCardAction}
        disabled={!canInteract}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <span className="card-position" aria-label={`Carta ${displayNumber}`}>
          <span className="card-position-label">Carta</span>
          <strong className="card-position-value">#{displayNumber}</strong>
        </span>
        {slot.status === 'virada' ? (
          <div className="card-face card-face-back">
            <span className="card-status-badge">Pronta</span>
          </div>
        ) : (
          <div className="card-face card-face-front">
            <div className="card-header-chip">
              <span className="card-header-label">{card?.categoria ?? 'Lombalgia'}</span>
            </div>

            <div className="card-hints-overlay" aria-label="Dicas reveladas na carta">
              {(['1', '2', '3', '4', '5', '6'] as const).map((hintKey) => {
                const hintText = revealedHintSet.has(hintKey) ? card?.dicas[hintKey] ?? '' : ''

                return (
                  <div
                    key={hintKey}
                    className={`card-hint-line ${revealedHintSet.has(hintKey) ? 'is-visible' : ''}`}
                  >
                    <span className="card-hint-number">{hintKey}.</span>
                    <span className="card-hint-text">{hintText}</span>
                  </div>
                )
              })}
            </div>

            <div className="card-footer-meta">
              <span>{slot.dicasReveladas} dica(s)</span>
              <span>{slot.status === 'resolvida' ? 'Resolvida' : 'Aberta'}</span>
            </div>
          </div>
        )}
      </button>

      {slot.status === 'ativa' ? (
        <div className="card-action-row">
          <button type="button" className="card-answer-button" onClick={onShowAnswer}>
            Mostrar resposta
          </button>
          <button type="button" className="card-zoom-button" onClick={onExpand} title="Ampliar carta">
            🔍
          </button>
        </div>
      ) : (
        <div className="card-answer-placeholder" aria-hidden="true" />
      )}
    </article>
  )
}
