import type {
  Card,
  CardInPlay,
  ChallengeQuestion,
  FinalSummary,
  Group,
  MatchSettings,
  PersistedSnapshot,
} from '../types'
import {
  BOARD_SIZE,
  DEFAULT_CHALLENGE_RESPONSE_TIME,
  DEFAULT_CHALLENGE_SELECTION_TIME,
} from './constants'

export const hintOrder = ['6', '5', '4', '3', '2', '1'] as const
export const editorHintOrder = ['1', '2', '3', '4', '5', '6'] as const

export function shuffleArray<T>(items: T[]): T[] {
  const array = [...items]
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[array[index], array[randomIndex]] = [array[randomIndex], array[index]]
  }
  return array
}

export function createInitialGroups(names: string[]): Group[] {
  return names.map((nome, index) => ({
    id: `group-${index + 1}-${nome.toLowerCase().replace(/\s+/g, '-')}`,
    nome,
    pontuacao: 1,
    acertos: 0,
    desafiosUsados: 0,
    acertosAltos: 0,
    acertosConsecutivos: 0,
  }))
}

export function getDefaultSettings(): MatchSettings {
  return {
    tempoTurno: 30,
    tempoDesafioSelecao: DEFAULT_CHALLENGE_SELECTION_TIME,
    tempoDesafioResposta: DEFAULT_CHALLENGE_RESPONSE_TIME,
    bonus: {
      primeiraDica: true,
      sequencia: true,
    },
    modoPenalidadeErro: 'manual',
    tempoTotalPartidaMinutos: null,
    demoMode: false,
  }
}

export function getCardPoints(revealedHints: number): number {
  return Math.max(1, 7 - revealedHints)
}

export function buildBoard(cards: Card[]): { board: CardInPlay[]; usedCardIds: string[] } {
  const shuffled = shuffleArray(cards)
  const selectedCards = shuffled.slice(0, BOARD_SIZE)
  return {
    board: selectedCards.map((card, index) => ({
      slotId: index + 1,
      cardId: card.id,
      status: 'virada',
      dicasReveladas: 0,
      pontosAtuais: 6,
    })),
    usedCardIds: selectedCards.map((card) => card.id),
  }
}

export function drawReplacementCard(allCards: Card[], usedCardIds: string[]): Card | null {
  const availableCards = allCards.filter((card) => !usedCardIds.includes(card.id))
  if (availableCards.length === 0) {
    return null
  }
  return shuffleArray(availableCards)[0]
}

export function getChallengeOptions(
  questions: ChallengeQuestion[],
  consumedIds: string[],
): ChallengeQuestion[] {
  return shuffleArray(questions.filter((q) => !consumedIds.includes(q.id))).slice(0, 3)
}

export function clampScore(value: number): number {
  return Math.max(0, value)
}

export function applyRanking(groups: Group[]): FinalSummary {
  const sorted = [...groups].sort((a, b) => {
    if (b.pontuacao !== a.pontuacao) return b.pontuacao - a.pontuacao
    if (b.acertos !== a.acertos) return b.acertos - a.acertos
    if (b.acertosAltos !== a.acertosAltos) return b.acertosAltos - a.acertosAltos
    return a.nome.localeCompare(b.nome)
  })

  const first = sorted[0]
  const tied = sorted.filter(
    (group) =>
      group.pontuacao === first?.pontuacao &&
      group.acertos === first?.acertos &&
      group.acertosAltos === first?.acertosAltos,
  )

  let criterioDesempate: string | undefined
  if (tied.length > 1) {
    criterioDesempate =
      'Empate persistente após pontuação, acertos e acertos altos. Realizar rodada extra final apenas entre os grupos empatados.'
  } else if (sorted[1] && sorted[0].pontuacao === sorted[1].pontuacao) {
    criterioDesempate =
      sorted[0].acertos !== sorted[1].acertos
        ? 'Desempate por maior número de acertos.'
        : 'Desempate por maior número de acertos em cartas de 4 pontos ou mais.'
  }

  return {
    ranking: sorted,
    criterioDesempate,
    empatados: tied.length > 1 ? tied.map((group) => group.nome) : undefined,
  }
}

export function sanitizeImportedSnapshot(
  snapshot: Partial<PersistedSnapshot>,
): snapshot is PersistedSnapshot {
  return (
    Array.isArray(snapshot.groups) &&
    Array.isArray(snapshot.board) &&
    Array.isArray(snapshot.usedCardIds) &&
    Array.isArray(snapshot.consumedChallengeQuestionIds) &&
    typeof snapshot.turnIndex === 'number' &&
    typeof snapshot.status === 'string' &&
    typeof snapshot.settings === 'object' &&
    typeof snapshot.turn === 'object' &&
    typeof snapshot.timer === 'object' &&
    typeof snapshot.answerModal === 'object' &&
    typeof snapshot.challenge === 'object'
  )
}

function isDifficulty(value: unknown): value is Card['dificuldade'] {
  return value === 'facil' || value === 'medio' || value === 'dificil'
}

export function sanitizeImportedCards(payload: unknown): payload is Card[] {
  if (!Array.isArray(payload)) return false

  return payload.every((card) => {
    if (!card || typeof card !== 'object') return false
    const candidate = card as Partial<Card>
    const dicas = candidate.dicas as Card['dicas'] | undefined

    return (
      typeof candidate.id === 'string' &&
      isDifficulty(candidate.dificuldade) &&
      typeof candidate.categoria === 'string' &&
      typeof candidate.resposta === 'string' &&
      candidate.temaPrincipal === 'Lombalgia' &&
      typeof dicas === 'object' &&
      dicas !== null &&
      editorHintOrder.every((key) => typeof dicas[key] === 'string')
    )
  })
}

export function normalizeCards(cards: Card[]): Card[] {
  return cards.map((card) => ({
    ...card,
    categoria: card.categoria.trim(),
    resposta: card.resposta.trim(),
    temaPrincipal: 'Lombalgia',
    dicas: {
      '1': card.dicas['1'].trim(),
      '2': card.dicas['2'].trim(),
      '3': card.dicas['3'].trim(),
      '4': card.dicas['4'].trim(),
      '5': card.dicas['5'].trim(),
      '6': card.dicas['6'].trim(),
    },
  }))
}

export function getInitialChallengeTimes(settings: MatchSettings) {
  return {
    selectionTimeLeft: settings.tempoDesafioSelecao,
    responseTimeLeft: settings.tempoDesafioResposta,
  }
}
