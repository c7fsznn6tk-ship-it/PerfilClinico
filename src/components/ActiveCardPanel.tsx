import { getCardDetails } from '../store/useGameStore'
import type { CardInPlay } from '../types'
import { hintOrder } from '../utils/gameUtils'

type ActiveCardPanelProps = {
  activeCard: CardInPlay | null
  onShowAnswer: () => void
}

export function ActiveCardPanel({ activeCard, onShowAnswer }: ActiveCardPanelProps) {
  if (!activeCard) {
    return (
      <section className="panel detail-panel">
        <div className="section-header">
          <h2>Carta ativa</h2>
        </div>
        <p>Selecione ou revele uma carta para acompanhar as pistas e controlar a rodada.</p>
      </section>
    )
  }

  const card = getCardDetails(activeCard.cardId)
  if (!card) return null

  return (
    <section className="panel detail-panel">
      <div className="section-header">
        <h2>Carta {activeCard.slotId}</h2>
        <span>{card.dificuldade}</span>
      </div>

      <div className="card-summary">
        <span>{card.categoria}</span>
        <strong>{activeCard.pontosAtuais} pontos atuais</strong>
        <small className="support-text">A leitura principal das pistas agora acontece na própria carta da grade.</small>
      </div>

      <div className="hint-list">
        {hintOrder.map((hintKey, index) => {
          const revealed = index < activeCard.dicasReveladas
          return (
            <article key={hintKey} className={`hint-item ${revealed ? 'is-revealed' : ''}`}>
              <span>Dica {hintKey}</span>
              <p>{revealed ? card.dicas[hintKey] : 'Ainda não revelada.'}</p>
            </article>
          )
        })}
      </div>

      <div className="detail-meta">
        <span>Resposta: {activeCard.status === 'resolvida' ? card.resposta : 'Oculta até a mediação'}</span>
        {card.fonteBase ? <span>Fonte base: {card.fonteBase}</span> : null}
      </div>

      <button
        type="button"
        className="primary-button"
        onClick={onShowAnswer}
        disabled={activeCard.status === 'virada' || activeCard.status === 'resolvida'}
      >
        Mostrar resposta
      </button>
    </section>
  )
}
