import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Card, MatchSettings } from '../types'
import { editorHintOrder } from '../utils/gameUtils'

type SettingsModalProps = {
  isOpen: boolean
  settings: MatchSettings
  cards: Card[]
  baseCards: Card[]
  hasCustomCards: boolean
  onClose: () => void
  onSave: (settings: Partial<MatchSettings>) => void
  onSaveCards: (cards: Card[]) => void
  onResetCards: () => void
  onImportCards: (cards: unknown) => boolean
}

type SettingsTab = 'geral' | 'cartas'

function cloneCards(cards: Card[]) {
  return cards.map((card) => ({
    ...card,
    dicas: { ...card.dicas },
  }))
}

function buildCardMap(cards: Card[]) {
  return new Map(cards.map((card) => [card.id, { ...card, dicas: { ...card.dicas } }]))
}

export function SettingsModal({
  isOpen,
  settings,
  cards,
  baseCards,
  hasCustomCards,
  onClose,
  onSave,
  onSaveCards,
  onResetCards,
  onImportCards,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('geral')
  const [search, setSearch] = useState('')
  const [draftCards, setDraftCards] = useState<Card[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string>('')

  useEffect(() => {
    if (!isOpen) return
    const nextCards = cloneCards(cards)
    setDraftCards(nextCards)
    setSelectedCardId((current) =>
      nextCards.some((card) => card.id === current) ? current : (nextCards[0]?.id ?? ''),
    )
    setActiveTab('geral')
    setSearch('')
  }, [isOpen, cards])

  const baseCardMap = useMemo(() => buildCardMap(baseCards), [baseCards])
  const savedCardMap = useMemo(() => buildCardMap(cards), [cards])

  const filteredCards = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return draftCards

    return draftCards.filter((card) => {
      const haystack = `${card.id} ${card.categoria} ${card.resposta}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [draftCards, search])

  const selectedCard = draftCards.find((card) => card.id === selectedCardId) ?? null

  const hasUnsavedChanges = useMemo(() => JSON.stringify(draftCards) !== JSON.stringify(cards), [draftCards, cards])

  function updateSelectedCard(updater: (card: Card) => Card) {
    if (!selectedCard) return
    setDraftCards((current) => current.map((card) => (card.id === selectedCard.id ? updater(card) : card)))
  }

  function moveHint(card: Card, key: (typeof editorHintOrder)[number], direction: -1 | 1): Card {
    const orderedValues = editorHintOrder.map((hintKey) => card.dicas[hintKey])
    const index = editorHintOrder.indexOf(key)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= orderedValues.length) return card

    const swapped = [...orderedValues]
    ;[swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]]

    return {
      ...card,
      dicas: {
        '1': swapped[0],
        '2': swapped[1],
        '3': swapped[2],
        '4': swapped[3],
        '5': swapped[4],
        '6': swapped[5],
      },
    }
  }

  function handleExportCards() {
    const blob = new Blob([JSON.stringify(draftCards, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'mente-clinica-cartas-editadas.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handleImportCards(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!onImportCards(parsed)) {
          window.alert('Arquivo de cartas inválido.')
          return
        }
        const importedCards = cloneCards(Array.isArray(parsed) ? (parsed as Card[]) : [])
        setDraftCards(importedCards)
        setSelectedCardId(importedCards[0]?.id ?? '')
      } catch {
        window.alert('Não foi possível importar o arquivo informado.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card settings-modal-card large">
        <div className="section-header">
          <h2>Configurações da partida</h2>
          <div className="settings-tab-row">
            <button
              type="button"
              className={`ghost-button settings-tab-button ${activeTab === 'geral' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('geral')}
            >
              Geral
            </button>
            <button
              type="button"
              className={`ghost-button settings-tab-button ${activeTab === 'cartas' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('cartas')}
            >
              Editar cartas
            </button>
          </div>
        </div>

        {activeTab === 'geral' ? (
          <>
            <div className="two-columns">
              <label className="field">
                <span>Tempo por turno</span>
                <select
                  value={settings.tempoTurno}
                  onChange={(event) =>
                    onSave({
                      tempoTurno: Number(event.target.value) as MatchSettings['tempoTurno'],
                    })
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
                <span>Penalidade por erro</span>
                <select
                  value={settings.modoPenalidadeErro}
                  onChange={(event) =>
                    onSave({
                      modoPenalidadeErro: event.target.value as MatchSettings['modoPenalidadeErro'],
                    })
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="automatico">Automática</option>
                </select>
              </label>

              <label className="field">
                <span>Seleção do desafio</span>
                <select
                  value={settings.tempoDesafioSelecao}
                  onChange={(event) =>
                    onSave({
                      tempoDesafioSelecao: Number(event.target.value),
                    })
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
                    onSave({
                      tempoDesafioResposta: Number(event.target.value),
                    })
                  }
                >
                  {[20, 30, 45, 60].map((value) => (
                    <option key={value} value={value}>
                      {value} segundos
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="switch-list">
              <label className="switch-card">
                <input
                  type="checkbox"
                  checked={settings.bonus.primeiraDica}
                  onChange={(event) =>
                    onSave({
                      bonus: {
                        ...settings.bonus,
                        primeiraDica: event.target.checked,
                      },
                    })
                  }
                />
                <span>Bônus de primeira dica</span>
              </label>

              <label className="switch-card">
                <input
                  type="checkbox"
                  checked={settings.bonus.sequencia}
                  onChange={(event) =>
                    onSave({
                      bonus: {
                        ...settings.bonus,
                        sequencia: event.target.checked,
                      },
                    })
                  }
                />
                <span>Bônus de sequência</span>
              </label>
            </div>
          </>
        ) : (
          <div className="card-editor-layout">
            <aside className="card-editor-sidebar">
              <div className="field">
                <span>Buscar carta</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ID, categoria ou resposta"
                />
              </div>

              <div className="card-editor-summary">
                <span>{draftCards.length} cartas disponíveis</span>
                <span>{hasCustomCards ? 'Banco personalizado ativo' : 'Banco padrão ativo'}</span>
              </div>

              <div className="card-editor-list">
                {filteredCards.map((card) => {
                  const savedCard = savedCardMap.get(card.id)
                  const isChanged = JSON.stringify(card) !== JSON.stringify(savedCard)
                  return (
                    <button
                      key={card.id}
                      type="button"
                      className={`card-editor-list-item ${selectedCardId === card.id ? 'is-selected' : ''}`}
                      onClick={() => setSelectedCardId(card.id)}
                    >
                      <strong>{card.resposta}</strong>
                      <span>{card.id}</span>
                      <span>{card.categoria}</span>
                      {isChanged ? <em>Alterada</em> : null}
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="card-editor-panel">
              {selectedCard ? (
                <>
                  <div className="section-header">
                    <div>
                      <h3>{selectedCard.resposta}</h3>
                      <p className="support-text">{selectedCard.id} • tema fixo: Lombalgia</p>
                    </div>
                    <span className="card-editor-badge">{selectedCard.dificuldade}</span>
                  </div>

                  <div className="two-columns">
                    <label className="field">
                      <span>Dificuldade</span>
                      <select
                        value={selectedCard.dificuldade}
                        onChange={(event) =>
                          updateSelectedCard((card) => ({
                            ...card,
                            dificuldade: event.target.value as Card['dificuldade'],
                          }))
                        }
                      >
                        <option value="facil">Fácil</option>
                        <option value="medio">Médio</option>
                        <option value="dificil">Difícil</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Categoria</span>
                      <input
                        value={selectedCard.categoria}
                        onChange={(event) =>
                          updateSelectedCard((card) => ({
                            ...card,
                            categoria: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>Resposta</span>
                    <input
                      value={selectedCard.resposta}
                      onChange={(event) =>
                        updateSelectedCard((card) => ({
                          ...card,
                          resposta: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div className="card-editor-hints-header">
                    <div>
                      <h3>Dicas</h3>
                      <p className="support-text">
                        A dica 1 é a mais reveladora. No jogo, a revelação continua acontecendo de 6 para 1.
                      </p>
                    </div>
                  </div>

                  <div className="card-editor-hints-list">
                    {editorHintOrder.map((key, index) => (
                      <div key={key} className="card-editor-hint-item">
                        <div className="card-editor-hint-topbar">
                          <strong>Dica {key}</strong>
                          <div className="card-editor-hint-actions">
                            <button
                              type="button"
                              className="ghost-button"
                              disabled={index === 0}
                              onClick={() => updateSelectedCard((card) => moveHint(card, key, -1))}
                            >
                              Subir
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              disabled={index === editorHintOrder.length - 1}
                              onClick={() => updateSelectedCard((card) => moveHint(card, key, 1))}
                            >
                              Descer
                            </button>
                          </div>
                        </div>
                        <textarea
                          className="card-editor-textarea"
                          value={selectedCard.dicas[key]}
                          onChange={(event) =>
                            updateSelectedCard((card) => ({
                              ...card,
                              dicas: {
                                ...card.dicas,
                                [key]: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="action-row settings-card-actions">
                    <button type="button" className="primary-button" onClick={() => onSaveCards(draftCards)}>
                      Salvar alterações
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setDraftCards(cloneCards(cards))}
                      disabled={!hasUnsavedChanges}
                    >
                      Cancelar edição
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        const original = baseCardMap.get(selectedCard.id)
                        if (!original) return
                        updateSelectedCard(() => ({ ...original, dicas: { ...original.dicas } }))
                      }}
                    >
                      Restaurar carta original
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setDraftCards(cloneCards(baseCards))}
                    >
                      Restaurar todas as cartas
                    </button>
                    <button type="button" className="ghost-button" onClick={handleExportCards}>
                      Exportar JSON
                    </button>
                    <label className="import-button">
                      Importar JSON
                      <input type="file" accept="application/json" onChange={handleImportCards} />
                    </label>
                    <button type="button" className="danger-button" onClick={onResetCards}>
                      Voltar ao banco padrão salvo
                    </button>
                  </div>
                </>
              ) : (
                <p className="support-text">Selecione uma carta para editar.</p>
              )}
            </section>
          </div>
        )}

        <button type="button" className="ghost-button" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}
