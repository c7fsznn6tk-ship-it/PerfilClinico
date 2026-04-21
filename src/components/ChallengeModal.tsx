import { useMemo, useState } from 'react'
import { getChallengeQuestionDetails } from '../store/useGameStore'
import type { ChallengeSession, Group } from '../types'

type ChallengeModalProps = {
  challenge: ChallengeSession
  groups: Group[]
  onCancel: () => void
  onSetParticipants: (challengerGroupId: string, challengedGroupId: string) => void
  onChooseQuestion: (questionId: string) => void
  onChooseWager: (wager: number) => void
  onResolve: (result: 'acertou' | 'errou') => void
}

export function ChallengeModal({
  challenge,
  groups,
  onCancel,
  onSetParticipants,
  onChooseQuestion,
  onChooseWager,
  onResolve,
}: ChallengeModalProps) {
  const [challengerGroupId, setChallengerGroupId] = useState('')
  const [challengedGroupId, setChallengedGroupId] = useState('')

  const offeredQuestions = useMemo(
    () =>
      challenge.offeredQuestionIds
        .map((questionId) => getChallengeQuestionDetails(questionId))
        .filter((question): question is NonNullable<typeof question> => Boolean(question)),
    [challenge.offeredQuestionIds],
  )

  const selectedQuestion = challenge.selectedQuestionId
    ? getChallengeQuestionDetails(challenge.selectedQuestionId)
    : undefined
  const challenger = groups.find((group) => group.id === challenge.challengerGroupId)
  const maxWager = challenger ? Math.min(3, challenger.pontuacao) : 0

  if (!challenge.isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card large">
        <div className="section-header">
          <h2>DESAFIO</h2>
          <span>
            Seleção: {challenge.selectionTimeLeft}s | Resposta: {challenge.responseTimeLeft}s
          </span>
        </div>

        {(challenge.state === 'selecionandoDesafiante' ||
          challenge.state === 'selecionandoDesafiado') && (
          <div className="challenge-section">
            <p>Selecione manualmente o grupo desafiante e o grupo desafiado.</p>
            <div className="two-columns">
              <label className="field">
                <span>Grupo desafiante</span>
                <select
                  value={challengerGroupId}
                  onChange={(event) => setChallengerGroupId(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Grupo desafiado</span>
                <select
                  value={challengedGroupId}
                  onChange={(event) => setChallengedGroupId(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {challenge.feedback ? <p className="form-error">{challenge.feedback}</p> : null}
            <div className="action-row">
              <button type="button" className="ghost-button" onClick={onCancel}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!challengerGroupId || !challengedGroupId}
                onClick={() => onSetParticipants(challengerGroupId, challengedGroupId)}
              >
                Confirmar participantes
              </button>
            </div>
          </div>
        )}

        {challenge.state === 'mostrandoTresQuestoes' && (
          <div className="challenge-section">
            <p>Escolha a questão apenas pelas alternativas. O enunciado ainda não aparece.</p>
            <div className="question-grid">
              {offeredQuestions.map((question, index) => (
                <article key={question.id} className="question-card">
                  <h3>Questão {String.fromCharCode(65 + index)}</h3>
                  <ul>
                    {question.alternativas.map((alternative) => (
                      <li key={alternative}>{alternative}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => onChooseQuestion(question.id)}
                  >
                    Escolher
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}

        {challenge.state === 'mostrandoPergunta' && selectedQuestion && (
          <div className="challenge-section">
            <p className="support-text">{selectedQuestion.categoria}</p>
            <h3>{selectedQuestion.pergunta}</h3>
            <ul className="question-list">
              {selectedQuestion.alternativas.map((alternative) => (
                <li key={alternative}>{alternative}</li>
              ))}
            </ul>
            <div className="option-list compact">
              {Array.from({ length: maxWager }, (_, index) => index + 1).map((wager) => (
                <button
                  key={wager}
                  type="button"
                  className="option-button"
                  onClick={() => onChooseWager(wager)}
                >
                  Apostar {wager} ponto(s)
                </button>
              ))}
            </div>
          </div>
        )}

        {challenge.state === 'aguardandoResposta' && selectedQuestion && (
          <div className="challenge-section">
            <p className="support-text">Aposta confirmada: {challenge.selectedWager} ponto(s)</p>
            <h3>{selectedQuestion.pergunta}</h3>
            <p>O grupo desafiado respondeu. Agora marque se acertou ou errou.</p>
            <div className="action-row">
              <button type="button" className="danger-button" onClick={() => onResolve('errou')}>
                Errou
              </button>
              <button type="button" className="primary-button" onClick={() => onResolve('acertou')}>
                Acertou
              </button>
            </div>
          </div>
        )}

        {challenge.state === 'resultadoDesafio' && (
          <div className="challenge-section">
            <h3>Resultado do desafio</h3>
            <p>{challenge.feedback}</p>
            <button type="button" className="primary-button" onClick={onCancel}>
              Fechar desafio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
