export type Difficulty = 'facil' | 'medio' | 'dificil'
export type CardStatus = 'virada' | 'ativa' | 'resolvida'
export type MatchStatus = 'setup' | 'playing' | 'finished'
export type ErrorPenaltyMode = 'manual' | 'automatico'
export type TurnDieFace = '0' | '1' | '2' | '3' | 'passar' | 'palpite-livre'
export type TurnPhase = 'aguardandoDado' | 'rolandoDado' | 'jogando'
export type ChallengeState =
  | 'idle'
  | 'selecionandoDesafiante'
  | 'selecionandoDesafiado'
  | 'mostrandoTresQuestoes'
  | 'selecionandoQuestao'
  | 'mostrandoPergunta'
  | 'selecionandoAposta'
  | 'aguardandoResposta'
  | 'resultadoDesafio'
  | 'finalizado'

export type Group = {
  id: string
  nome: string
  pontuacao: number
  acertos: number
  desafiosUsados: number
  acertosAltos: number
  acertosConsecutivos: number
}

export type Card = {
  id: string
  dificuldade: Difficulty
  categoria: string
  resposta: string
  temaPrincipal: 'Lombalgia'
  fonteBase?: string
  dicas: {
    '1': string
    '2': string
    '3': string
    '4': string
    '5': string
    '6': string
  }
}

export type CardInPlay = {
  slotId: number
  cardId: string
  status: CardStatus
  dicasReveladas: number
  pontosAtuais: number
  lastClickTimestamp?: number
  grupoQueAcertou?: string
}

export type ChallengeQuestion = {
  id: string
  dificuldade: Difficulty
  categoria: string
  pergunta: string
  alternativas: string[]
  respostaCorreta: string
  explicacaoCurta?: string
  usadaNaPartida?: boolean
}

export type BonusSettings = {
  primeiraDica: boolean
  sequencia: boolean
}

export type MatchSettings = {
  tempoTurno: 15 | 30 | 45 | 60
  tempoDesafioSelecao: number
  tempoDesafioResposta: number
  bonus: BonusSettings
  modoPenalidadeErro: ErrorPenaltyMode
  tempoTotalPartidaMinutos?: number | null
  demoMode: boolean
  imagemCartaFrente: string | null
  imagemCartaVerso: string | null
}

export type ToastMessage = {
  id: string
  tone: 'success' | 'warning' | 'info'
  message: string
}

export type AnswerModalState = {
  isOpen: boolean
  slotId: number | null
  revealAnswer: boolean
  step: 'confirmarGrupoDaVez' | 'selecionarGrupo' | 'perguntarExplicacao'
  selectedGroupId: string | null
  explanationOpen: boolean
}

export type TurnRollOutcome = {
  face: TurnDieFace
  label: string
  hintsAllowed: number
  canGuessWithoutPenalty: boolean
  shouldPassTurn: boolean
  description: string
}

export type TurnState = {
  phase: TurnPhase
  rollOutcome: TurnRollOutcome | null
  hintsUsed: number
  guessedWithoutPenaltyUsed: boolean
}

export type ChallengeSession = {
  isOpen: boolean
  state: ChallengeState
  challengerGroupId: string | null
  challengedGroupId: string | null
  offeredQuestionIds: string[]
  selectedQuestionId: string | null
  selectedWager: number | null
  result: 'acertou' | 'errou' | null
  selectionTimeLeft: number
  responseTimeLeft: number
  feedback?: string
}

export type FinalSummary = {
  ranking: Group[]
  criterioDesempate?: string
  empatados?: string[]
}

export type PersistedSnapshot = {
  status: MatchStatus
  groups: Group[]
  settings: MatchSettings
  turnIndex: number
  board: CardInPlay[]
  usedCardIds: string[]
  consumedChallengeQuestionIds: string[]
  activeSlotId: number | null
  turn: TurnState
  timer: {
    isPaused: boolean
    timeLeft: number
  }
  answerModal: AnswerModalState
  challenge: ChallengeSession
  finalSummary: FinalSummary | null
}
