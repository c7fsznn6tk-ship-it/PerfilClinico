import { useEffect, useRef, useState } from 'react'
import type { TurnPhase, TurnRollOutcome } from '../types'
import { TurnDie } from './TurnDie'

type TurnStartModalProps = {
  isOpen: boolean
  currentGroupName: string
  phase: TurnPhase
  outcome: TurnRollOutcome | null
  isLaunching: boolean
  onRoll: () => TurnRollOutcome | null
  onLaunch: (orientationClass: string, sourceRect: DOMRect) => void
}

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

export function TurnStartModal({
  isOpen,
  currentGroupName,
  phase,
  outcome,
  isLaunching,
  onRoll,
  onLaunch,
}: TurnStartModalProps) {
  const dieRef = useRef<HTMLButtonElement | null>(null)
  const settleTimeoutRef = useRef<number | null>(null)
  const launchTimeoutRef = useRef<number | null>(null)
  const [orientationClass, setOrientationClass] = useState('is-front')
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setIsAnimating(false)
      setOrientationClass('is-front')
      return
    }

    if (phase === 'aguardandoDado') {
      setIsAnimating(false)
      setOrientationClass('is-front')
      return
    }

    if (phase === 'rolandoDado' && outcome) {
      setOrientationClass(getOrientationClass(outcome))
    }
  }, [isOpen, outcome, phase])

  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current)
      if (launchTimeoutRef.current) window.clearTimeout(launchTimeoutRef.current)
    }
  }, [])

  if (!isOpen) return null

  function handleRollClick() {
    if (isAnimating || phase !== 'aguardandoDado') return

    const rolledOutcome = onRoll()
    if (!rolledOutcome) return

    setIsAnimating(true)

    settleTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false)
      setOrientationClass(getOrientationClass(rolledOutcome))
    }, 1900)

    launchTimeoutRef.current = window.setTimeout(() => {
      const sourceRect = dieRef.current?.getBoundingClientRect()
      if (!sourceRect) return
      onLaunch(getOrientationClass(rolledOutcome), sourceRect)
    }, 3300)
  }

  return (
    <div className={`modal-overlay turn-start-overlay ${isLaunching ? 'is-launching' : ''}`}>
      <div className="turn-start-floating">
        <div className="turn-start-copy">
          <span className="eyebrow">Nova rodada</span>
          <h2>{currentGroupName} joga agora</h2>
          <p className="support-text">
            Clique no dado para rolar e sortear a condicao desta rodada.
          </p>
        </div>

        <TurnDie
          ref={dieRef}
          orientationClass={orientationClass}
          isRolling={isAnimating}
          onClick={handleRollClick}
          disabled={isAnimating || isLaunching}
          className={isLaunching ? 'is-hidden' : ''}
        />
        <button
          type="button"
          className="turn-die-action-label"
          onClick={handleRollClick}
          disabled={isAnimating || isLaunching || phase !== 'aguardandoDado'}
        >
          {isAnimating ? 'ROLANDO...' : 'JOGAR'}
        </button>

        <div className="turn-die-legend">
          <span>0-3: quantidade de dicas</span>
          <span>P: passar a vez</span>
          <span>L: palpite livre</span>
        </div>
      </div>
    </div>
  )
}
