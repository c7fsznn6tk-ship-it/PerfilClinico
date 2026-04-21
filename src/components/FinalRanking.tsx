import type { FinalSummary } from '../types'

type FinalRankingProps = {
  summary: FinalSummary
  onRestart: () => void
  onReset: () => void
}

export function FinalRanking({ summary, onRestart, onReset }: FinalRankingProps) {
  return (
    <section className="final-screen">
      <div className="panel panel-hero">
        <span className="eyebrow">Partida encerrada</span>
        <h1>Ranking final</h1>
        <p>
          Confira a classificação, os critérios aplicados e prepare a próxima rodada quando
          desejar.
        </p>
      </div>

      <div className="panel">
        <div className="ranking-list">
          {summary.ranking.map((group, index) => (
            <article key={group.id} className="ranking-card">
              <span>{index + 1}º lugar</span>
              <h2>{group.nome}</h2>
              <strong>{group.pontuacao} pontos</strong>
              <p>
                Acertos: {group.acertos} | Desafios usados: {group.desafiosUsados} | Acertos
                altos: {group.acertosAltos}
              </p>
            </article>
          ))}
        </div>

        {summary.criterioDesempate ? (
          <p className="support-text">{summary.criterioDesempate}</p>
        ) : null}

        <div className="action-row">
          <button type="button" className="primary-button" onClick={onRestart}>
            Jogar novamente
          </button>
          <button type="button" className="ghost-button" onClick={onReset}>
            Nova configuração
          </button>
        </div>
      </div>
    </section>
  )
}
