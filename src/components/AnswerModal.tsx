import { getCardDetails } from '../store/useGameStore'
import type { AnswerModalState, CardInPlay, Group } from '../types'

type AnswerModalProps = {
  state: AnswerModalState
  activeCard: CardInPlay | null
  groups: Group[]
  currentGroup: Group | null
  onClose: () => void
  onConfirmCurrentGroup: () => void
  onRejectCurrentGroup: () => void
  onSelectGroup: (groupId: string) => void
  onShowExplanation: () => void
  onContinueWithoutExplanation: () => void
}

export function AnswerModal({
  state,
  activeCard,
  groups,
  currentGroup,
  onClose,
  onConfirmCurrentGroup,
  onRejectCurrentGroup,
  onSelectGroup,
  onShowExplanation,
  onContinueWithoutExplanation,
}: AnswerModalProps) {
  if (!state.isOpen || !activeCard) return null

  const card = getCardDetails(activeCard.cardId)
  if (!card) return null

  const currentStep = state.step ?? 'confirmarGrupoDaVez'
  const selectedGroup = groups.find((group) => group.id === state.selectedGroupId) ?? null

  return (
    <div className="modal-overlay">
      <div className="modal-card answer-modal-card">
        <div className="section-header">
          <h2>Parabéns! Você acertou.</h2>
          <span>#{card.id.replace('card-', '')}</span>
        </div>

        <div className="answer-highlight">
          <p className="support-text answer-lead">A resposta correta era:</p>
          <p className="answer-text answer-text-strong">{card.resposta}</p>
        </div>

        {currentStep === 'confirmarGrupoDaVez' ? (
          <>
            <div className="answer-followup-card">
              <p className="support-text answer-followup-question">
                Quem acertou foi o grupo <strong>{currentGroup?.nome ?? 'da vez'}</strong>?
              </p>
            </div>
            <div className="action-row">
              <button type="button" className="primary-button" onClick={onConfirmCurrentGroup}>
                Sim
              </button>
              <button type="button" className="ghost-button" onClick={onRejectCurrentGroup}>
                Não
              </button>
            </div>
          </>
        ) : currentStep === 'selecionarGrupo' ? (
          <>
            <p className="support-text">Qual grupo acertou?</p>
            <div className="option-list answer-group-grid">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="option-button answer-group-button"
                  onClick={() => onSelectGroup(group.id)}
                >
                  {group.nome}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="answer-followup-card">
              <p className="support-text">
                Grupo confirmado: <strong>{selectedGroup?.nome ?? 'Grupo não identificado'}</strong>
              </p>
              <p className="support-text answer-followup-question">Deseja ver a explicação desta carta?</p>
            </div>
            <div className="action-row">
              <button type="button" className="primary-button" onClick={onShowExplanation}>
                Mostrar explicação
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={onContinueWithoutExplanation}
              >
                Voltar ao jogo
              </button>
            </div>
          </>
        )}

        <button type="button" className="ghost-button" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
