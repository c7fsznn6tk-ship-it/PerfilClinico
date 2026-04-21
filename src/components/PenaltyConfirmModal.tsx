type PenaltyConfirmModalProps = {
  isOpen: boolean
  groupName: string | null
  onConfirm: () => void
  onClose: () => void
}

export function PenaltyConfirmModal({
  isOpen,
  groupName,
  onConfirm,
  onClose,
}: PenaltyConfirmModalProps) {
  if (!isOpen || !groupName) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card penalty-modal-card">
        <div className="section-header">
          <h2>Aplicar penalidade</h2>
        </div>

        <div className="answer-followup-card">
          <p className="support-text answer-followup-question">
            Confirma que o grupo <strong>{groupName}</strong> errou?
          </p>
          <p className="support-text">Ele perderá 1 ponto por isso, sem ficar com pontuação negativa.</p>
        </div>

        <div className="action-row">
          <button type="button" className="danger-button" onClick={onConfirm}>
            Confirmar penalidade
          </button>
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
