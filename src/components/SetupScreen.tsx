import { useMemo, useState } from 'react'
import type { MatchSettings } from '../types'
import { getDefaultSettings } from '../utils/gameUtils'

type SetupScreenProps = {
  onStart: (groupNames: string[], settings: MatchSettings) => void
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const defaults = useMemo(() => getDefaultSettings(), [])
  const [groupCount, setGroupCount] = useState(2)
  const [groupNames, setGroupNames] = useState<string[]>(['Grupo 1', 'Grupo 2'])
  const [settings, setSettings] = useState<MatchSettings>(defaults)
  const [error, setError] = useState('')

  function updateGroupCount(nextCount: number) {
    setGroupCount(nextCount)
    setGroupNames((current) => {
      const next = [...current]
      while (next.length < nextCount) next.push(`Grupo ${next.length + 1}`)
      return next.slice(0, nextCount)
    })
  }

  function updateGroupName(index: number, value: string) {
    setGroupNames((current) => current.map((name, itemIndex) => (itemIndex === index ? value : name)))
  }

  function fillDemo() {
    updateGroupCount(3)
    setGroupNames(['Equipe Azul', 'Equipe Verde', 'Equipe Coral'])
    setSettings((current) => ({
      ...current,
      demoMode: true,
      tempoTurno: 15,
      tempoDesafioSelecao: 20,
      tempoDesafioResposta: 30,
    }))
  }

  function handleSubmit() {
    const normalizedNames = groupNames.map((name) => name.trim())
    if (normalizedNames.some((name) => name.length === 0)) {
      setError('Todos os nomes dos grupos são obrigatórios.')
      return
    }

    const uniqueNames = new Set(normalizedNames.map((name) => name.toLowerCase()))
    if (uniqueNames.size !== normalizedNames.length) {
      setError('Não é permitido cadastrar nomes duplicados.')
      return
    }

    setError('')
    onStart(normalizedNames, settings)
  }

  return (
    <section className="setup-screen">
      <div className="panel panel-hero">
        <span className="eyebrow">Uso em sala de aula</span>
        <h1>Mente Clínica: Perfil da Lombalgia</h1>
        <p>
          Configure grupos, tempos e regras de mediação para iniciar uma partida
          responsiva, clara e pronta para projeção.
        </p>
      </div>

      <div className="setup-grid">
        <div className="panel">
          <h2>Grupos</h2>
          <label className="field">
            <span>Quantidade de grupos</span>
            <select
              value={groupCount}
              onChange={(event) => updateGroupCount(Number(event.target.value))}
            >
              {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                <option key={count} value={count}>
                  {count} grupos
                </option>
              ))}
            </select>
          </label>

          <div className="group-fields">
            {Array.from({ length: groupCount }, (_, index) => (
              <label key={`group-${index + 1}`} className="field">
                <span>Nome do grupo {index + 1}</span>
                <input
                  value={groupNames[index] ?? ''}
                  onChange={(event) => updateGroupName(index, event.target.value)}
                  maxLength={40}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Configurações</h2>
          <div className="two-columns">
            <label className="field">
              <span>Tempo por turno</span>
              <select
                value={settings.tempoTurno}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    tempoTurno: Number(event.target.value) as MatchSettings['tempoTurno'],
                  }))
                }
              >
                {[15, 30, 45, 60].map((value) => (
                  <option key={value} value={value}>
                    {value} segundos
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Seleção do desafio</span>
              <select
                value={settings.tempoDesafioSelecao}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    tempoDesafioSelecao: Number(event.target.value),
                  }))
                }
              >
                {[15, 20, 30, 45].map((value) => (
                  <option key={value} value={value}>
                    {value} segundos
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Resposta do desafio</span>
              <select
                value={settings.tempoDesafioResposta}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    tempoDesafioResposta: Number(event.target.value),
                  }))
                }
              >
                {[20, 30, 45, 60].map((value) => (
                  <option key={value} value={value}>
                    {value} segundos
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Penalidade por erro</span>
              <select
                value={settings.modoPenalidadeErro}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    modoPenalidadeErro: event.target.value as MatchSettings['modoPenalidadeErro'],
                  }))
                }
              >
                <option value="manual">Manual</option>
                <option value="automatico">Automática</option>
              </select>
            </label>
          </div>

          <div className="switch-list">
            <label className="switch-card">
              <input
                type="checkbox"
                checked={settings.bonus.primeiraDica}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    bonus: {
                      ...current.bonus,
                      primeiraDica: event.target.checked,
                    },
                  }))
                }
              />
              <span>Bônus de primeira dica</span>
            </label>

            <label className="switch-card">
              <input
                type="checkbox"
                checked={settings.bonus.sequencia}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    bonus: {
                      ...current.bonus,
                      sequencia: event.target.checked,
                    },
                  }))
                }
              />
              <span>Bônus de sequência</span>
            </label>

            <label className="switch-card">
              <input
                type="checkbox"
                checked={settings.demoMode}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    demoMode: event.target.checked,
                  }))
                }
              />
              <span>Modo de demonstração</span>
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="action-row">
            <button type="button" className="ghost-button" onClick={fillDemo}>
              Carregar demonstração
            </button>
            <button type="button" className="primary-button" onClick={handleSubmit}>
              Iniciar partida
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
