import type React from 'react'
import type { MatchSettings } from '../types'

type ModeratorControlsProps = {
  onRegisterError: () => void
  onApplyManualPenalty: () => void
  onStartChallenge: () => void
  onFinish: () => void
  onRestart: () => void
  onOpenSettings: () => void
  onExportState: () => void
  onImportState: (event: React.ChangeEvent<HTMLInputElement>) => void
  settings: MatchSettings
}

export function ModeratorControls({
  onRegisterError,
  onApplyManualPenalty,
  onStartChallenge,
  onFinish,
  onRestart,
  onOpenSettings,
  onExportState,
  onImportState,
  settings,
}: ModeratorControlsProps) {
  return (
    <section className="panel controls-panel">
      <div className="section-header">
        <h2>Painel do mediador</h2>
        <span>{settings.modoPenalidadeErro === 'manual' ? 'Erro manual' : 'Erro automático'}</span>
      </div>

      <div className="controls-grid">
        <button type="button" className="ghost-button" onClick={onRegisterError}>
          Registrar erro
        </button>
        <button type="button" className="ghost-button" onClick={onApplyManualPenalty}>
          Aplicar penalidade
        </button>
        <button type="button" className="danger-button" onClick={onStartChallenge}>
          DESAFIO
        </button>
        <button type="button" className="ghost-button" onClick={onOpenSettings}>
          Abrir configurações
        </button>
        <button type="button" className="ghost-button" onClick={onExportState}>
          Exportar estado
        </button>
        <label className="import-button">
          Importar estado
          <input type="file" accept="application/json" onChange={onImportState} />
        </label>
        <button type="button" className="ghost-button" onClick={onRestart}>
          Reiniciar partida
        </button>
        <button type="button" className="danger-button" onClick={onFinish}>
          Encerrar partida
        </button>
      </div>
    </section>
  )
}
