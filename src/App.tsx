import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { AnswerModal } from './components/AnswerModal'
import { ChallengeModal } from './components/ChallengeModal'
import { ExpandedCardModal } from './components/ExpandedCardModal'
import { ExplanationModal } from './components/ExplanationModal'
import { FinalRanking } from './components/FinalRanking'
import { GameBoard } from './components/GameBoard'
import { ModeratorControls } from './components/ModeratorControls'
import { PenaltyConfirmModal } from './components/PenaltyConfirmModal'
import { ScoreBoard } from './components/ScoreBoard'
import { SettingsModal } from './components/SettingsModal'
import { SetupScreen } from './components/SetupScreen'
import { Toast } from './components/Toast'
import { TurnDie } from './components/TurnDie'
import { TurnStartModal } from './components/TurnStartModal'
import { getBaseCards, getResolvedCards, useGameStore } from './store/useGameStore'
import { GAME_TITLE, LEGACY_STORAGE_KEYS } from './utils/constants'

function App() {
  const {
    status,
    groups,
    settings,
    turnIndex,
    board,
    activeSlotId,
    turn,
    answerModal,
    challenge,
    finalSummary,
    toast,
    openSettingsModal,
    initializeMatch,
    rollTurnDie,
    finalizeTurnRoll,
    revealNextHint,
    selectCard,
    advanceTurn,
    registerErrorForCurrentGroup,
    applyManualPenaltyToCurrentGroup,
    openAnswerModal,
    closeAnswerModal,
    selectCorrectGroup,
    continueWithoutExplanation,
    openAnswerExplanation,
    closeAnswerExplanation,
    customCards,
    setCustomCards,
    resetCustomCards,
    importCustomCards,
    startChallenge,
    cancelChallenge,
    setChallengeParticipants,
    chooseChallengeQuestion,
    chooseChallengeWager,
    resolveChallenge,
    tickChallengeTimer,
    finishMatch,
    restartMatch,
    resetAll,
    exportSnapshot,
    importSnapshot,
    clearToast,
    updateSettings,
    setOpenSettingsModal,
  } = useGameStore()

  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false)
  const [zoomedSlotId, setZoomedSlotId] = useState<number | null>(null)
  const revealTimeoutRef = useRef<number | null>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const flightTimeoutRef = useRef<number | null>(null)
  const [flyingDie, setFlyingDie] = useState<{
    orientationClass: string
    startRect: DOMRect
    endRect: DOMRect
    active: boolean
  } | null>(null)

  const currentGroup = turnIndex >= 0 ? groups[turnIndex] ?? null : null
  const answerCard = board.find((slot) => slot.slotId === answerModal.slotId) ?? null
  const zoomedCard = board.find((slot) => slot.slotId === zoomedSlotId) ?? null
  const activeCard = board.find((slot) => slot.slotId === activeSlotId) ?? null
  const resolvedCards = getResolvedCards()
  const baseCards = getBaseCards()
  const hintsAllowed = turn.rollOutcome?.hintsAllowed ?? 0
  const canRevealMoreHintsOnActiveCard =
    turn.phase === 'jogando' &&
    activeCard?.status === 'ativa' &&
    activeCard.dicasReveladas < 6 &&
    hintsAllowed > 0 &&
    turn.hintsUsed < hintsAllowed &&
    !answerModal.isOpen
  const turnBadge =
    turn.phase === 'jogando' || turn.phase === 'rolandoDado'
      ? turn.rollOutcome?.canGuessWithoutPenalty
        ? 'Palpite livre sem penalidade'
        : `${Math.min(turn.hintsUsed, hintsAllowed)}/${hintsAllowed} dica(s) exibidas`
      : 'Aguardando lancamento do dado'

  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      tickChallengeTimer()
    }, 1000)
    return () => window.clearInterval(interval)
  }, [tickChallengeTimer])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => clearToast(), 2500)
    return () => window.clearTimeout(timeout)
  }, [toast, clearToast])

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) {
        window.clearTimeout(revealTimeoutRef.current)
      }
      if (flightTimeoutRef.current) {
        window.clearTimeout(flightTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (revealTimeoutRef.current) {
      window.clearTimeout(revealTimeoutRef.current)
      revealTimeoutRef.current = null
    }

    const shouldAutoReveal =
      turn.phase === 'jogando' &&
      activeSlotId !== null &&
      hintsAllowed > 0 &&
      turn.hintsUsed < hintsAllowed &&
      !answerModal.isOpen &&
      activeCard?.status === 'ativa'

    if (!shouldAutoReveal) return

    revealTimeoutRef.current = window.setTimeout(() => {
      revealNextHint(activeSlotId)
    }, turn.hintsUsed === 0 ? 350 : 850)

    return () => {
      if (revealTimeoutRef.current) {
        window.clearTimeout(revealTimeoutRef.current)
        revealTimeoutRef.current = null
      }
    }
  }, [
    activeSlotId,
    answerModal.isOpen,
    board,
    hintsAllowed,
    revealNextHint,
    turn.hintsUsed,
    turn.phase,
  ])

  function handleCardClick(slotId: number) {
    const slot = board.find((item) => item.slotId === slotId)
    const isActiveCard = slot?.slotId === activeSlotId && slot?.status === 'ativa'

    if (isActiveCard && canRevealMoreHintsOnActiveCard) {
      revealNextHint(slotId)
      return
    }

    if (isActiveCard) {
      setZoomedSlotId(slotId)
      return
    }

    selectCard(slotId)
  }

  function handleLaunchDie(orientationClass: string, sourceRect: DOMRect) {
    const targetRect = dockRef.current?.getBoundingClientRect()
    if (!targetRect) {
      finalizeTurnRoll()
      return
    }

    setFlyingDie({
      orientationClass,
      startRect: sourceRect,
      endRect: targetRect,
      active: false,
    })

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setFlyingDie((current) => (current ? { ...current, active: true } : null))
      })
    })

    flightTimeoutRef.current = window.setTimeout(() => {
      setFlyingDie(null)
      finalizeTurnRoll()
    }, 920)
  }

  function handleExportState() {
    const snapshot = exportSnapshot()
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'mente-clinica-estado.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handleImportState(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!importSnapshot(parsed)) {
          window.alert('Arquivo invalido para importacao.')
        }
      } catch {
        window.alert('Nao foi possivel importar o arquivo informado.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function handleConfirmCurrentGroupAnswer() {
    if (!currentGroup) return
    selectCorrectGroup(currentGroup.id)
  }

  function handleRejectCurrentGroupAnswer() {
    useGameStore.setState((state) => ({
      answerModal: {
        ...state.answerModal,
        step: 'selecionarGrupo',
        selectedGroupId: null,
      },
    }))
  }

  function handleOpenPenaltyModal() {
    if (!currentGroup) return
    setIsPenaltyModalOpen(true)
  }

  function handleConfirmPenalty() {
    applyManualPenaltyToCurrentGroup()
    setIsPenaltyModalOpen(false)
  }

  if (status === 'setup') {
    return (
      <main className="app-shell">
        <SetupScreen onStart={initializeMatch} />
      </main>
    )
  }

  if (status === 'finished' && finalSummary) {
    return (
      <main className="app-shell">
        <FinalRanking summary={finalSummary} onRestart={restartMatch} onReset={resetAll} />
      </main>
    )
  }

  return (
    <main className="app-shell app-shell-wide">
      <Toast toast={toast} />

      <header className="topbar">
        <div>
          <span className="eyebrow">Jogo educacional</span>
          <h1>{GAME_TITLE}</h1>
        </div>
        <div className="topbar-meta">
          <div className="turn-card">
            <span>Grupo da vez</span>
            <strong>{currentGroup?.nome ?? 'Aguardando primeira dica'}</strong>
            <small className="turn-card-meta">{turnBadge}</small>
          </div>
        </div>
      </header>

      <ScoreBoard groups={groups} currentGroupId={currentGroup?.id} />

      <GameBoard
        board={board}
        activeSlotId={activeSlotId}
        cardFrontImage={settings.imagemCartaFrente}
        cardBackImage={settings.imagemCartaVerso}
        canExpandActiveCardOnClick={!canRevealMoreHintsOnActiveCard}
        currentGroupName={currentGroup?.nome ?? null}
        currentTurnSummary={turn.rollOutcome?.label ?? null}
        currentTurnOutcome={turn.phase === 'jogando' ? turn.rollOutcome : null}
        dockRef={dockRef}
        hideDockDie={Boolean(flyingDie)}
        interactionLocked={turn.phase !== 'jogando' || Boolean(turn.rollOutcome?.shouldPassTurn)}
        onAdvanceTurn={() => advanceTurn()}
        onCardClick={handleCardClick}
        onShowAnswer={(slotId) => openAnswerModal(slotId)}
        onExpandCard={(slotId) => setZoomedSlotId(slotId)}
      />

      <ModeratorControls
        onRegisterError={registerErrorForCurrentGroup}
        onApplyManualPenalty={handleOpenPenaltyModal}
        onStartChallenge={startChallenge}
        onFinish={finishMatch}
        onRestart={restartMatch}
        onOpenSettings={() => setOpenSettingsModal(true)}
        onExportState={handleExportState}
        onImportState={handleImportState}
        settings={settings}
      />

      <AnswerModal
        state={answerModal}
        activeCard={answerCard}
        groups={groups}
        currentGroup={currentGroup}
        onClose={closeAnswerModal}
        onConfirmCurrentGroup={handleConfirmCurrentGroupAnswer}
        onRejectCurrentGroup={handleRejectCurrentGroupAnswer}
        onSelectGroup={selectCorrectGroup}
        onShowExplanation={openAnswerExplanation}
        onContinueWithoutExplanation={continueWithoutExplanation}
      />

      <ExpandedCardModal
        isOpen={zoomedSlotId !== null}
        slot={zoomedCard}
        frontImage={settings.imagemCartaFrente}
        onClose={() => setZoomedSlotId(null)}
      />

      <ExplanationModal
        isOpen={answerModal.explanationOpen}
        activeCard={answerCard}
        onClose={closeAnswerExplanation}
      />

      <PenaltyConfirmModal
        isOpen={isPenaltyModalOpen}
        groupName={currentGroup?.nome ?? null}
        onConfirm={handleConfirmPenalty}
        onClose={() => setIsPenaltyModalOpen(false)}
      />

      <ChallengeModal
        challenge={challenge}
        groups={groups}
        onCancel={cancelChallenge}
        onSetParticipants={setChallengeParticipants}
        onChooseQuestion={chooseChallengeQuestion}
        onChooseWager={chooseChallengeWager}
        onResolve={resolveChallenge}
      />

      <SettingsModal
        isOpen={openSettingsModal}
        settings={settings}
        cards={resolvedCards}
        baseCards={baseCards}
        hasCustomCards={Boolean(customCards)}
        onClose={() => setOpenSettingsModal(false)}
        onSave={updateSettings}
        onSaveCards={setCustomCards}
        onResetCards={resetCustomCards}
        onImportCards={importCustomCards}
      />

      <TurnStartModal
        isOpen={
          status === 'playing' &&
          currentGroup !== null &&
          (turn.phase === 'aguardandoDado' || turn.phase === 'rolandoDado' || Boolean(flyingDie))
        }
        currentGroupName={currentGroup?.nome ?? ''}
        phase={turn.phase}
        outcome={turn.rollOutcome}
        isLaunching={Boolean(flyingDie)}
        onRoll={rollTurnDie}
        onLaunch={handleLaunchDie}
      />

      {flyingDie ? (
        <div
          className={`turn-die-flight ${flyingDie.active ? 'is-active' : ''}`}
          style={
            {
              '--die-start-left': `${flyingDie.startRect.left}px`,
              '--die-start-top': `${flyingDie.startRect.top}px`,
              '--die-start-width': `${flyingDie.startRect.width}px`,
              '--die-start-height': `${flyingDie.startRect.height}px`,
              '--die-end-left': `${flyingDie.endRect.left}px`,
              '--die-end-top': `${flyingDie.endRect.top}px`,
              '--die-end-width': `${flyingDie.endRect.width}px`,
              '--die-end-height': `${flyingDie.endRect.height}px`,
            } as React.CSSProperties
          }
        >
          <div className="turn-die-flight-inner">
            <div className="turn-die-flight-scale">
              <GameBoardDieShim orientationClass={flyingDie.orientationClass} />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function GameBoardDieShim({ orientationClass }: { orientationClass: string }) {
  return <TurnDie orientationClass={orientationClass} size="compact" />
}

export default App
