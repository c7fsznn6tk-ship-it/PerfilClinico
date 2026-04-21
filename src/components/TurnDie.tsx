import { forwardRef, useEffect, useMemo, useState } from 'react'
import type { Ref } from 'react'
import dice01 from '../assets/dice/dice-01.png'
import dice02 from '../assets/dice/dice-02.png'
import dice03 from '../assets/dice/dice-03.png'
import diceLivre from '../assets/dice/dice-livre.png'
import dicePassar from '../assets/dice/dice-passar.png'
import diceSemDicas from '../assets/dice/dice-semdicas.png'

type TurnDieProps = {
  orientationClass: string
  isRolling?: boolean
  size?: 'hero' | 'compact'
  centerLabel?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
}

const dieImageMap: Record<string, { src: string; alt: string }> = {
  'is-front': { src: diceSemDicas, alt: 'Dado sem dicas' },
  'is-right': { src: dice01, alt: 'Dado com 1 dica' },
  'is-top': { src: dice02, alt: 'Dado com 2 dicas' },
  'is-left': { src: dice03, alt: 'Dado com 3 dicas' },
  'is-bottom': { src: dicePassar, alt: 'Dado para passar a vez' },
  'is-back': { src: diceLivre, alt: 'Dado de palpite livre' },
}

const rollingFrames = [
  dieImageMap['is-front'],
  dieImageMap['is-right'],
  dieImageMap['is-top'],
  dieImageMap['is-left'],
  dieImageMap['is-bottom'],
  dieImageMap['is-back'],
]

export const TurnDie = forwardRef<HTMLButtonElement | HTMLDivElement, TurnDieProps>(function TurnDie(
  {
    orientationClass,
    isRolling = false,
    size = 'hero',
    centerLabel,
    onClick,
    disabled = false,
    className = '',
  },
  ref,
) {
  const finalFace = useMemo(
    () => dieImageMap[orientationClass] ?? dieImageMap['is-front'],
    [orientationClass],
  )
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    if (!isRolling) {
      setFrameIndex(0)
      return
    }

    let step = 0
    let timeout: number | null = null
    const delays = [70, 80, 92, 106, 124, 148, 176, 210, 250]

    function scheduleNextFrame() {
      setFrameIndex((current) => (current + 1) % rollingFrames.length)
      const delay = delays[Math.min(step, delays.length - 1)]
      step += 1
      timeout = window.setTimeout(scheduleNextFrame, delay)
    }

    scheduleNextFrame()

    return () => {
      if (timeout) window.clearTimeout(timeout)
    }
  }, [isRolling])

  const activeFace = isRolling ? rollingFrames[frameIndex] : finalFace

  const content = (
    <div className={`turn-die-scene ${size === 'compact' ? 'is-compact' : ''} ${className}`.trim()}>
      <div className={`turn-die-image-wrap ${isRolling ? 'is-rolling' : ''}`}>
        <img className="turn-die-image" src={activeFace.src} alt={activeFace.alt} draggable={false} />
      </div>
      <div className="turn-die-shadow" />
      {centerLabel ? <span className="turn-die-center-label">{centerLabel}</span> : null}
    </div>
  )

  if (!onClick) {
    return <div ref={ref as Ref<HTMLDivElement>}>{content}</div>
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      className={`turn-die-trigger ${size === 'compact' ? 'is-compact' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={centerLabel ?? activeFace.alt}
    >
      {content}
    </button>
  )
})
