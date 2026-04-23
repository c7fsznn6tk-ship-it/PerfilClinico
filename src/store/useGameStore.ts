import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import cardsData from '../data/cards.json'
import challengeQuestionsData from '../data/challengeQuestions.json'
import type {
  AnswerModalState,
  Card,
  ChallengeQuestion,
  ChallengeSession,
  MatchSettings,
  PersistedSnapshot,
  ToastMessage,
  TurnRollOutcome,
  TurnState,
} from '../types'
import {
  applyRanking,
  buildBoard,
  clampScore,
  createInitialGroups,
  drawReplacementCard,
  getCardPoints,
  getChallengeOptions,
  getDefaultSettings,
  getInitialChallengeTimes,
  normalizeSettings,
  normalizeCards,
  sanitizeImportedCards,
  sanitizeImportedSnapshot,
} from '../utils/gameUtils'
import { CARD_CLICK_THROTTLE_MS, STORAGE_KEY } from '../utils/constants'

const baseCards = normalizeCards(cardsData as Card[])
const allChallengeQuestions = challengeQuestionsData as ChallengeQuestion[]

type FinalizeCorrectAnswerResult = {
  slotId: number
  groupId: string
  slot: PersistedSnapshot['board'][number]
  currentGroup: PersistedSnapshot['groups'][number]
  replacementCard: Card | null
  totalEarned: number
}

type GameStore = PersistedSnapshot & {
  customCards: Card[] | null
  toast: ToastMessage | null
  openSettingsModal: boolean
  initializeMatch: (groupNames: string[], settings: MatchSettings) => void
  rollTurnDie: () => TurnRollOutcome | null
  finalizeTurnRoll: () => void
  revealNextHint: (slotId: number) => void
  selectCard: (slotId: number | null) => void
  pauseTimer: () => void
  resumeTimer: () => void
  tickTimer: () => void
  advanceTurn: (reason?: string) => void
  registerErrorForCurrentGroup: () => void
  applyManualPenaltyToCurrentGroup: () => void
  updateSettings: (partial: Partial<MatchSettings>) => void
  openAnswerModal: (slotId: number) => void
  closeAnswerModal: () => void
  selectCorrectGroup: (groupId: string) => void
  continueWithoutExplanation: () => void
  openAnswerExplanation: () => void
  closeAnswerExplanation: () => void
  setCustomCards: (cards: Card[]) => void
  resetCustomCards: () => void
  importCustomCards: (cards: unknown) => boolean
  startChallenge: () => void
  cancelChallenge: () => void
  setChallengeParticipants: (challengerGroupId: string, challengedGroupId: string) => void
  chooseChallengeQuestion: (questionId: string) => void
  chooseChallengeWager: (wager: number) => void
  resolveChallenge: (result: 'acertou' | 'errou') => void
  tickChallengeTimer: () => void
  finishMatch: () => void
  restartMatch: () => void
  resetAll: () => void
  exportSnapshot: () => PersistedSnapshot
  importSnapshot: (snapshot: PersistedSnapshot) => boolean
  clearToast: () => void
  setToast: (message: string, tone?: ToastMessage['tone']) => void
  setOpenSettingsModal: (open: boolean) => void
}

const defaultSettings = getDefaultSettings()
const turnDieOptions: TurnRollOutcome[] = [
  {
    face: '0',
    label: '0 dicas',
    hintsAllowed: 0,
    canGuessWithoutPenalty: false,
    shouldPassTurn: false,
    description: 'Nesta rodada o grupo precisa responder sem receber dicas.',
  },
  {
    face: '1',
    label: '1 dica',
    hintsAllowed: 1,
    canGuessWithoutPenalty: false,
    shouldPassTurn: false,
    description: 'Nesta rodada o grupo pode revelar 1 dica antes de responder.',
  },
  {
    face: '2',
    label: '2 dicas',
    hintsAllowed: 2,
    canGuessWithoutPenalty: false,
    shouldPassTurn: false,
    description: 'Nesta rodada o grupo pode revelar até 2 dicas.',
  },
  {
    face: '3',
    label: '3 dicas',
    hintsAllowed: 3,
    canGuessWithoutPenalty: false,
    shouldPassTurn: false,
    description: 'Nesta rodada o grupo pode revelar até 3 dicas.',
  },
  {
    face: 'passar',
    label: 'Passar a vez',
    hintsAllowed: 0,
    canGuessWithoutPenalty: false,
    shouldPassTurn: true,
    description: 'O grupo perde a rodada e a vez segue para o próximo.',
  },
  {
    face: 'palpite-livre',
    label: 'Palpite livre',
    hintsAllowed: 0,
    canGuessWithoutPenalty: true,
    shouldPassTurn: false,
    description: 'O grupo pode responder nesta rodada sem sofrer penalidade se errar.',
  },
]
const weightedTurnDieOptions = [
  turnDieOptions[1],
  turnDieOptions[1],
  turnDieOptions[1],
  turnDieOptions[2],
  turnDieOptions[2],
  turnDieOptions[2],
  turnDieOptions[3],
  turnDieOptions[3],
  turnDieOptions[3],
  turnDieOptions[0],
  turnDieOptions[4],
  turnDieOptions[5],
]

function createInitialTurnState(): TurnState {
  return {
    phase: 'aguardandoDado',
    rollOutcome: null,
    hintsUsed: 0,
    guessedWithoutPenaltyUsed: false,
  }
}

const initialAnswerModal: AnswerModalState = {
  isOpen: false,
  slotId: null,
  revealAnswer: false,
  step: 'confirmarGrupoDaVez',
  selectedGroupId: null,
  explanationOpen: false,
}

const defaultChallengeSession: ChallengeSession = {
  isOpen: false,
  state: 'idle',
  challengerGroupId: null,
  challengedGroupId: null,
  offeredQuestionIds: [],
  selectedQuestionId: null,
  selectedWager: null,
  result: null,
  selectionTimeLeft: defaultSettings.tempoDesafioSelecao,
  responseTimeLeft: defaultSettings.tempoDesafioResposta,
}

const initialState: PersistedSnapshot = {
  status: 'setup',
  groups: [],
  settings: defaultSettings,
  turnIndex: 0,
  board: [],
  usedCardIds: [],
  consumedChallengeQuestionIds: [],
  activeSlotId: null,
  turn: createInitialTurnState(),
  timer: {
    isPaused: true,
    timeLeft: defaultSettings.tempoTurno,
  },
  answerModal: initialAnswerModal,
  challenge: defaultChallengeSession,
  finalSummary: null,
}

function toast(message: string, tone: ToastMessage['tone'] = 'info'): ToastMessage {
  return {
    id: crypto.randomUUID(),
    tone,
    message,
  }
}

function getResolvedCardsFromState(state: { customCards: Card[] | null; settings: MatchSettings }) {
  const resolvedCards = state.customCards ?? baseCards
  return state.settings.demoMode ? resolvedCards.slice(0, 24) : resolvedCards
}

function finalizeCorrectAnswer(
  state: PersistedSnapshot & { customCards: Card[] | null },
): FinalizeCorrectAnswerResult | null {
  const slotId = state.answerModal.slotId
  const groupId = state.answerModal.selectedGroupId
  if (slotId === null || !groupId) {
    return null
  }

  const slot = state.board.find((item) => item.slotId === slotId)
  const currentGroup = state.groups.find((group) => group.id === groupId)
  if (!slot || !currentGroup) {
    return null
  }

  const sourceCards = getResolvedCardsFromState(state)
  const replacementCard = drawReplacementCard(sourceCards, state.usedCardIds)
  const firstHintBonus = state.settings.bonus.primeiraDica && slot.pontosAtuais === 6 ? 1 : 0
  const sequenceBonus =
    state.settings.bonus.sequencia && currentGroup.acertosConsecutivos >= 1 ? 1 : 0
  const totalEarned = slot.pontosAtuais + firstHintBonus + sequenceBonus

  return {
    slotId,
    groupId,
    slot,
    currentGroup,
    replacementCard,
    totalEarned,
  }
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      customCards: null,
      toast: null,
      openSettingsModal: false,

      initializeMatch: (groupNames, settings) => {
        const normalizedSettings = normalizeSettings(settings)
        const sourceCards = normalizedSettings.demoMode
          ? (get().customCards ?? baseCards).slice(0, 24)
          : get().customCards ?? baseCards
        const { board, usedCardIds } = buildBoard(sourceCards)
        set({
          status: 'playing',
          groups: createInitialGroups(groupNames),
          settings: normalizedSettings,
          turnIndex: 0,
          board,
          usedCardIds,
          consumedChallengeQuestionIds: [],
          activeSlotId: null,
          turn: createInitialTurnState(),
          timer: {
            isPaused: false,
            timeLeft: normalizedSettings.tempoTurno,
          },
          answerModal: initialAnswerModal,
          challenge: {
            ...defaultChallengeSession,
            ...getInitialChallengeTimes(normalizedSettings),
          },
          finalSummary: null,
          toast: toast('Partida iniciada com sucesso.', 'success'),
        })
      },

      rollTurnDie: () => {
        const state = get()
        if (state.groups.length === 0) return null

        const rollOutcome =
          weightedTurnDieOptions[Math.floor(Math.random() * weightedTurnDieOptions.length)]

        set({
          turn: {
            ...state.turn,
            phase: 'rolandoDado',
            rollOutcome,
            hintsUsed: 0,
            guessedWithoutPenaltyUsed: false,
          },
          activeSlotId: null,
          toast: toast(
            rollOutcome.shouldPassTurn
              ? `${state.groups[state.turnIndex]?.nome ?? 'O grupo'} deverá passar a vez.`
              : `${state.groups[state.turnIndex]?.nome ?? 'O grupo'} tirou ${rollOutcome.label}.`,
            rollOutcome.shouldPassTurn ? 'warning' : 'info',
          ),
        })

        return rollOutcome
      },

      finalizeTurnRoll: () => {
        const state = get()
        if (!state.turn.rollOutcome) return

        set({
          turn: {
            ...state.turn,
            phase: 'jogando',
          },
          toast: toast(
            state.turn.rollOutcome.shouldPassTurn
              ? 'Rodada marcada para passar a vez. Use "Avancar turno" para seguir.'
              : state.turn.rollOutcome.canGuessWithoutPenalty
              ? 'Rodada liberada para palpite sem penalidade.'
              : `Rodada iniciada com ${state.turn.rollOutcome.hintsAllowed} dica(s) disponíveis.`,
            'info',
          ),
        })
      },

      revealNextHint: (slotId) => {
        const state = get()
        const currentGroup = state.groups[state.turnIndex]
        const currentOutcome = state.turn.rollOutcome
        if (!currentGroup || state.turn.phase !== 'jogando' || !currentOutcome) {
          set({ toast: toast('Inicie o turno pelo dado antes de revelar uma carta.', 'warning') })
          return
        }

        if (currentOutcome.hintsAllowed <= 0) {
          set({
            toast: toast(
              currentOutcome.canGuessWithoutPenalty
                ? 'Esta rodada é de palpite livre: responda sem revelar dicas.'
                : 'Esta rodada não permite revelar dicas.',
              'warning',
            ),
          })
          return
        }

        if (state.turn.hintsUsed >= currentOutcome.hintsAllowed) {
          set({
            toast: toast(
              `O limite de ${currentOutcome.hintsAllowed} dica(s) desta rodada já foi usado.`,
              'warning',
            ),
          })
          return
        }

        const activeSlot = state.board.find((slot) => slot.slotId === state.activeSlotId) ?? null
        if (activeSlot && activeSlot.status === 'ativa' && activeSlot.slotId !== slotId) {
          set({
            toast: toast(
              'Mantenha a mesma carta ativa até concluir a jogada ou avançar o turno.',
              'warning',
            ),
          })
          return
        }

        const now = Date.now()
        let revealWasValid = false

        const board = state.board.map((slot) => {
          if (slot.slotId !== slotId || slot.status === 'resolvida') return slot
          if (slot.lastClickTimestamp && now - slot.lastClickTimestamp < CARD_CLICK_THROTTLE_MS) {
            return slot
          }
          if (slot.dicasReveladas >= 6) return slot

          const dicasReveladas = Math.min(6, slot.dicasReveladas + 1)
          revealWasValid = dicasReveladas !== slot.dicasReveladas

          return {
            ...slot,
            status: 'ativa' as const,
            dicasReveladas,
            pontosAtuais: getCardPoints(dicasReveladas),
            lastClickTimestamp: now,
          }
        })

        set({
          board,
          activeSlotId: revealWasValid ? slotId : state.activeSlotId,
          turn: revealWasValid
            ? {
                ...state.turn,
                hintsUsed: state.turn.hintsUsed + 1,
              }
            : state.turn,
        })
      },

      selectCard: (slotId) => {
        const state = get()

        if (slotId === null) {
          set({ activeSlotId: null })
          return
        }

        const selectedSlot = state.board.find((slot) => slot.slotId === slotId)
        const activeSlot = state.board.find((slot) => slot.slotId === state.activeSlotId) ?? null

        if (!selectedSlot || selectedSlot.status === 'resolvida') return

        if (state.turn.phase !== 'jogando' || !state.turn.rollOutcome) {
          set({ toast: toast('Faça o sorteio do dado antes de escolher uma carta.', 'warning') })
          return
        }

        if (state.turn.rollOutcome.shouldPassTurn) {
          set({ toast: toast('Esta rodada foi sorteada como "passar a vez".', 'warning') })
          return
        }

        if (activeSlot && activeSlot.status === 'ativa' && activeSlot.slotId !== slotId) {
          set({
            toast: toast(
              'Conclua a jogada da carta atual ou avance o turno antes de trocar de carta.',
              'warning',
            ),
          })
          return
        }

        set({
          activeSlotId: slotId,
          board: state.board.map((slot) =>
            slot.slotId === slotId && slot.status === 'virada'
              ? {
                  ...slot,
                  status: 'ativa' as const,
                }
              : slot,
          ),
        })
      },

      pauseTimer: () => set((state) => ({ timer: { ...state.timer, isPaused: true } })),
      resumeTimer: () => set((state) => ({ timer: { ...state.timer, isPaused: false } })),

      tickTimer: () => {
        const state = get()
        if (state.status !== 'playing' || state.timer.isPaused || state.challenge.isOpen) return
        if (state.timer.timeLeft <= 1) {
          get().advanceTurn('Tempo esgotado. A vez passou para o próximo grupo.')
          return
        }
        set((current) => ({
          timer: {
            ...current.timer,
            timeLeft: current.timer.timeLeft - 1,
          },
        }))
      },

      advanceTurn: (reason) => {
        const state = get()
        if (state.groups.length === 0) return
        const turnIndex = (state.turnIndex + 1) % state.groups.length
        set({
          turnIndex,
          activeSlotId: null,
          turn: createInitialTurnState(),
          timer: {
            isPaused: false,
            timeLeft: state.settings.tempoTurno,
          },
          toast: toast(
            reason ?? `Turno avançado para ${state.groups[turnIndex]?.nome ?? 'o próximo grupo'}.`,
            'info',
          ),
        })
      },

      registerErrorForCurrentGroup: () => {
        const state = get()
        const currentGroup = state.groups[state.turnIndex]
        if (!currentGroup) return

        const freeGuessAvailable =
          state.turn.rollOutcome?.canGuessWithoutPenalty && !state.turn.guessedWithoutPenaltyUsed

        if (freeGuessAvailable) {
          set({
            groups: state.groups.map((group) =>
              group.id === currentGroup.id
                ? {
                    ...group,
                    acertosConsecutivos: 0,
                  }
                : group,
            ),
            turn: {
              ...state.turn,
              guessedWithoutPenaltyUsed: true,
            },
            toast: toast(
              `${currentGroup.nome} errou, mas esta rodada garante um palpite sem penalidade.`,
              'info',
            ),
          })
          return
        }

        const automatic = state.settings.modoPenalidadeErro === 'automatico'
        set({
          groups: state.groups.map((group) =>
            group.id === currentGroup.id
              ? {
                  ...group,
                  pontuacao: automatic ? clampScore(group.pontuacao - 1) : group.pontuacao,
                  acertosConsecutivos: 0,
                }
              : group,
          ),
          toast: toast(
            automatic
              ? `Erro registrado para ${currentGroup.nome}. Penalidade aplicada automaticamente.`
              : `Erro registrado para ${currentGroup.nome}. A retirada do ponto permanece sob mediação manual.`,
            'warning',
          ),
        })
      },

      applyManualPenaltyToCurrentGroup: () => {
        const state = get()
        const currentGroup = state.groups[state.turnIndex]
        if (!currentGroup) return

        set({
          groups: state.groups.map((group) =>
            group.id === currentGroup.id
              ? {
                  ...group,
                  pontuacao: clampScore(group.pontuacao - 1),
                  acertosConsecutivos: 0,
                }
              : group,
          ),
          toast: toast(`Penalidade manual aplicada a ${currentGroup.nome}.`, 'warning'),
        })
      },

      updateSettings: (partial) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            ...partial,
            bonus: {
              ...state.settings.bonus,
              ...partial.bonus,
            },
          }),
          timer: {
            ...state.timer,
            timeLeft: partial.tempoTurno ?? state.timer.timeLeft,
          },
          challenge: {
            ...state.challenge,
            selectionTimeLeft:
              partial.tempoDesafioSelecao ?? state.challenge.selectionTimeLeft,
            responseTimeLeft:
              partial.tempoDesafioResposta ?? state.challenge.responseTimeLeft,
          },
          toast: toast('Configurações atualizadas.', 'info'),
        })),

      openAnswerModal: (slotId) =>
        set({
          activeSlotId: slotId,
          answerModal: {
            isOpen: true,
            slotId,
            revealAnswer: true,
            step: 'confirmarGrupoDaVez',
            selectedGroupId: null,
            explanationOpen: false,
          },
        }),

      closeAnswerModal: () => set({ answerModal: initialAnswerModal }),

      selectCorrectGroup: (groupId) =>
        set((state) => ({
          answerModal: {
            ...state.answerModal,
            step: 'perguntarExplicacao',
            selectedGroupId: groupId,
          },
        })),

      continueWithoutExplanation: () => {
        const state = get()
        const result = finalizeCorrectAnswer(state)
        if (!result) return

        const { slotId, groupId, slot, currentGroup, replacementCard, totalEarned } = result
        const nextTurnIndex =
          state.groups.length > 0 ? (state.turnIndex + 1) % state.groups.length : state.turnIndex

        set({
          groups: state.groups.map((group) => {
            if (group.id === groupId) {
              return {
                ...group,
                pontuacao: group.pontuacao + totalEarned,
                acertos: group.acertos + 1,
                desafiosUsados: group.desafiosUsados,
                acertosAltos: group.acertosAltos + (slot.pontosAtuais >= 4 ? 1 : 0),
                acertosConsecutivos: group.acertosConsecutivos + 1,
              }
            }
            return {
              ...group,
              acertosConsecutivos: 0,
            }
          }),
          board: state.board.map((item) => {
            if (item.slotId !== slotId) return item
            if (!replacementCard) {
              return {
                ...item,
                status: 'resolvida' as const,
                grupoQueAcertou: groupId,
              }
            }
            return {
              slotId,
              cardId: replacementCard.id,
              status: 'virada' as const,
              dicasReveladas: 0,
              pontosAtuais: 6,
            }
          }),
          usedCardIds: replacementCard ? [...state.usedCardIds, replacementCard.id] : state.usedCardIds,
          answerModal: initialAnswerModal,
          activeSlotId: null,
          turnIndex: nextTurnIndex,
          turn: createInitialTurnState(),
          toast: toast(
            totalEarned > slot.pontosAtuais
              ? `${currentGroup.nome} acertou e recebeu ${totalEarned} pontos com bônus.`
              : `${currentGroup.nome} acertou e recebeu ${totalEarned} pontos.`,
            'success',
          ),
        })

        if (!replacementCard) {
          get().finishMatch()
        }
      },

      openAnswerExplanation: () =>
        set((state) => ({
          answerModal: {
            ...state.answerModal,
            explanationOpen: true,
          },
        })),

      closeAnswerExplanation: () => {
        const state = get()
        if (!state.answerModal.explanationOpen) return

        set((current) => ({
          answerModal: {
            ...current.answerModal,
            explanationOpen: false,
          },
        }))

        get().continueWithoutExplanation()
      },

      setCustomCards: (cards) =>
        set({
          customCards: normalizeCards(cards),
          toast: toast('Banco de cartas personalizado salvo.', 'success'),
        }),

      resetCustomCards: () =>
        set({
          customCards: null,
          toast: toast('Banco de cartas restaurado para o padrão original.', 'info'),
        }),

      importCustomCards: (cards) => {
        if (!sanitizeImportedCards(cards)) {
          return false
        }
        set({
          customCards: normalizeCards(cards),
          toast: toast('Banco de cartas importado com sucesso.', 'success'),
        })
        return true
      },

      startChallenge: () => {
        const state = get()
        set({
          timer: { ...state.timer, isPaused: true },
          challenge: {
            ...defaultChallengeSession,
            ...getInitialChallengeTimes(state.settings),
            isOpen: true,
            state: 'selecionandoDesafiante',
          },
        })
      },

      cancelChallenge: () => {
        const state = get()
        const shouldAdvanceTurn = state.challenge.state === 'resultadoDesafio'
        set({
          timer: { ...state.timer, isPaused: false },
          challenge: {
            ...defaultChallengeSession,
            ...getInitialChallengeTimes(state.settings),
          },
        })
        if (shouldAdvanceTurn) {
          get().advanceTurn('Desafio encerrado. A vez passou para o próximo grupo.')
        }
      },

      setChallengeParticipants: (challengerGroupId, challengedGroupId) => {
        const state = get()
        const challenger = state.groups.find((group) => group.id === challengerGroupId)
        const challenged = state.groups.find((group) => group.id === challengedGroupId)
        if (!challenger || !challenged) return

        if (challengerGroupId === challengedGroupId) {
          set({
            challenge: {
              ...state.challenge,
              state: 'selecionandoDesafiado',
              feedback: 'Grupo desafiante e grupo desafiado não podem ser o mesmo.',
            },
          })
          return
        }

        if (challenger.pontuacao >= challenged.pontuacao) {
          set({
            challenge: {
              ...state.challenge,
              state: 'selecionandoDesafiado',
              feedback: 'O desafiante precisa ter menos pontos que o desafiado.',
            },
          })
          return
        }

        if (challenger.desafiosUsados >= 2) {
          set({
            challenge: {
              ...state.challenge,
              state: 'selecionandoDesafiado',
              feedback: 'Este grupo já usou o limite de 2 desafios na partida.',
            },
          })
          return
        }

        const maxWager = Math.min(3, challenger.pontuacao)
        if (maxWager <= 0) {
          set({
            challenge: {
              ...state.challenge,
              state: 'selecionandoDesafiado',
              feedback: 'O grupo desafiante precisa ter pontuação suficiente para apostar.',
            },
          })
          return
        }

        const offered = getChallengeOptions(allChallengeQuestions, state.consumedChallengeQuestionIds)
        set({
          challenge: {
            ...state.challenge,
            isOpen: true,
            state: 'mostrandoTresQuestoes',
            challengerGroupId,
            challengedGroupId,
            offeredQuestionIds: offered.map((question) => question.id),
            feedback: undefined,
          },
          consumedChallengeQuestionIds: [
            ...state.consumedChallengeQuestionIds,
            ...offered.map((question) => question.id),
          ],
        })
      },

      chooseChallengeQuestion: (questionId) =>
        set((state) => ({
          challenge: {
            ...state.challenge,
            selectedQuestionId: questionId,
            state: 'mostrandoPergunta',
          },
        })),

      chooseChallengeWager: (wager) =>
        set((state) => ({
          challenge: {
            ...state.challenge,
            selectedWager: wager,
            state: 'aguardandoResposta',
          },
        })),

      resolveChallenge: (result) => {
        const state = get()
        const challengerId = state.challenge.challengerGroupId
        const challengedId = state.challenge.challengedGroupId
        const wager = state.challenge.selectedWager
        if (!challengerId || !challengedId || !wager) return

        set({
          groups: state.groups.map((group) => {
            if (group.id === challengerId) {
              const delta = result === 'errou' ? wager : -wager
              return {
                ...group,
                pontuacao: clampScore(group.pontuacao + delta),
                desafiosUsados: group.desafiosUsados + 1,
                acertosConsecutivos: 0,
              }
            }
            if (group.id === challengedId) {
              const delta = result === 'errou' ? -wager : wager
              return {
                ...group,
                pontuacao: clampScore(group.pontuacao + delta),
                acertosConsecutivos: 0,
              }
            }
            return {
              ...group,
              acertosConsecutivos: 0,
            }
          }),
          challenge: {
            ...state.challenge,
            result,
            state: 'resultadoDesafio',
            feedback:
              result === 'errou'
                ? 'O grupo desafiado errou e os pontos foram transferidos ao desafiante.'
                : 'O grupo desafiado acertou e venceu a aposta.',
          },
          toast: toast(
            result === 'errou'
              ? 'Desafio resolvido com erro do grupo desafiado.'
              : 'Desafio resolvido com acerto do grupo desafiado.',
            result === 'errou' ? 'success' : 'warning',
          ),
        })
      },

      tickChallengeTimer: () => {
        const state = get()
        if (!state.challenge.isOpen) return

        const selectionStates = [
          'selecionandoDesafiante',
          'selecionandoDesafiado',
          'mostrandoTresQuestoes',
          'mostrandoPergunta',
        ]

        if (selectionStates.includes(state.challenge.state)) {
          if (state.challenge.selectionTimeLeft <= 1) {
            get().cancelChallenge()
            get().advanceTurn('Tempo do desafio esgotado. A vez passou para o próximo grupo.')
            return
          }
          set((current) => ({
            challenge: {
              ...current.challenge,
              selectionTimeLeft: current.challenge.selectionTimeLeft - 1,
            },
          }))
          return
        }

        if (state.challenge.state === 'aguardandoResposta') {
          if (state.challenge.responseTimeLeft <= 1) {
            get().resolveChallenge('errou')
            return
          }
          set((current) => ({
            challenge: {
              ...current.challenge,
              responseTimeLeft: current.challenge.responseTimeLeft - 1,
            },
          }))
        }
      },

      finishMatch: () => {
        const state = get()
        set({
          status: 'finished',
          timer: { ...state.timer, isPaused: true },
          challenge: {
            ...defaultChallengeSession,
            ...getInitialChallengeTimes(state.settings),
          },
          finalSummary: applyRanking(state.groups),
        })
      },

      restartMatch: () => {
        const state = get()
        const groupNames = state.groups.map((group) => group.nome)
        if (groupNames.length < 2) {
          set({ ...initialState, customCards: state.customCards, toast: null, openSettingsModal: false })
          return
        }
        get().initializeMatch(groupNames, state.settings)
      },

      resetAll: () =>
        set((state) => ({
          ...initialState,
          customCards: state.customCards,
          toast: null,
          openSettingsModal: false,
        })),

      exportSnapshot: () => {
        const state = get()
        return {
          status: state.status,
          groups: state.groups,
          settings: state.settings,
          turnIndex: state.turnIndex,
          board: state.board,
          usedCardIds: state.usedCardIds,
          consumedChallengeQuestionIds: state.consumedChallengeQuestionIds,
          activeSlotId: state.activeSlotId,
          turn: state.turn,
          timer: state.timer,
          answerModal: state.answerModal,
          challenge: state.challenge,
          finalSummary: state.finalSummary,
        }
      },

      importSnapshot: (snapshot) => {
        if (!sanitizeImportedSnapshot(snapshot)) return false
        set((state) => ({
          ...snapshot,
          settings: normalizeSettings(snapshot.settings),
          customCards: state.customCards,
          toast: toast('Estado importado com sucesso.', 'success'),
        }))
        return true
      },

      clearToast: () => set({ toast: null }),
      setToast: (message, tone = 'info') => set({ toast: toast(message, tone) }),
      setOpenSettingsModal: (open) => set({ openSettingsModal: open }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GameStore>
        return {
          ...currentState,
          ...persisted,
          settings: normalizeSettings(persisted.settings ?? currentState.settings),
        }
      },
      partialize: (state) => ({
        status: state.status,
        groups: state.groups,
        settings: state.settings,
        turnIndex: state.turnIndex,
        board: state.board,
        usedCardIds: state.usedCardIds,
        consumedChallengeQuestionIds: state.consumedChallengeQuestionIds,
        activeSlotId: state.activeSlotId,
        turn: state.turn,
        timer: state.timer,
        answerModal: state.answerModal,
        challenge: state.challenge,
        finalSummary: state.finalSummary,
        customCards: state.customCards,
      }),
    },
  ),
)

export function getBaseCards() {
  return baseCards
}

export function getResolvedCards() {
  const state = useGameStore.getState()
  return state.customCards ?? baseCards
}

export function getCardDetails(cardId: string) {
  return getResolvedCards().find((card) => card.id === cardId)
}

export function getChallengeQuestionDetails(questionId: string) {
  return allChallengeQuestions.find((question) => question.id === questionId)
}
