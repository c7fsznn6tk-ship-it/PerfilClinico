type TimerProps = {
  label: string
  timeLeft: number
  paused?: boolean
}

export function Timer({ label, timeLeft, paused }: TimerProps) {
  return (
    <div className={`timer-box ${paused ? 'is-paused' : ''}`}>
      <span>{label}</span>
      <strong>{timeLeft}s</strong>
    </div>
  )
}
