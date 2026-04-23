import type { RefObject } from 'react'
import type { CardInPlay, TurnRollOutcome } from '../types'
import { CardTile } from './CardTile'
import { TurnDie } from './TurnDie'

function getOrientationClass(outcome: TurnRollOutcome | null) {
  if (!outcome) return 'is-front'
  switch (outcome.face) {
    case '0':
      return 'is-front'
    case '1':
      return 'is-right'
    case '2':
      return 'is-top'
    case '3':
      return 'is-left'
    case 'passar':
      return 'is-bottom'
    case 'palpite-livre':
      return 'is-back'
    default:
      return 'is-front'
  }
}

type GameBoardProps = {
  board: CardInPlay[]
  activeSlotId: number | null
  cardFrontImage?: string | null
  cardBackImage?: string | null
  canExpandActiveCardOnClick: boolean
  currentGroupName?: string | null
  currentTurnSummary?: string | null
  currentTurnOutcome?: TurnRollOutcome | null
  dockRef: RefObject<HTMLDivElement>
  hideDockDie?: boolean
  interactionLocked: boolean
  onAdvanceTurn: () => void
  onCardClick: (slotId: number) => void
  onShowAnswer: (slotId: number) => void
  onExpandCard: (slotId: number) => void
}

export function GameBoard({
  board,
  activeSlotId,
  cardFrontImage,
  cardBackImage,
  canExpandActiveCardOnClick,
  currentGroupName,
  currentTurnSummary,
  currentTurnOutcome,
  dockRef,
  hideDockDie = false,
  interactionLocked,
  onAdvanceTurn,
  onCardClick,
  onShowAnswer,
  onExpandCard,
}: GameBoardProps) {
  return (
    <section className="panel board-panel">
      <div className="section-header">
        <div className="board-header-title">
          <h2>Cartas em jogo</h2>
          <button type="button" className="ghost-button board-advance-button" onClick={onAdvanceTurn}>
            Avancar turno
          </button>
          <div className={`board-die-dock ${currentTurnOutcome && !hideDockDie ? 'is-visible' : ''}`} ref={dockRef}>
            {currentTurnOutcome && !hideDockDie ? (
              <TurnDie orientationClass={getOrientationClass(currentTurnOutcome)} size="compact" />
            ) : null}
          </div>
        </div>
        <div className="board-status">
          <span className="board-current-group">
            {currentGroupName ? `Grupo jogando: ${currentGroupName}` : 'Aguardando inicio da partida'}
          </span>
          {currentTurnSummary ? <span className="board-turn-chip">Dado: {currentTurnSummary}</span> : null}
          <span>{board.length} posicoes</span>
        </div>
      </div>

      <div className="board-grid">
        {board.map((slot) => (
          <CardTile
            key={`${slot.slotId}-${slot.cardId}`}
            slot={slot}
            frontImage={cardFrontImage}
            backImage={cardBackImage}
            isActive={activeSlotId === slot.slotId}
            interactionLocked={interactionLocked}
            expandOnCardClick={activeSlotId === slot.slotId && canExpandActiveCardOnClick}
            onClick={() => onCardClick(slot.slotId)}
            onShowAnswer={() => onShowAnswer(slot.slotId)}
            onExpand={() => onExpandCard(slot.slotId)}
          />
        ))}
      </div>
    </section>
  )
}
