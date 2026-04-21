import type { ToastMessage } from '../types'

type ToastProps = {
  toast: ToastMessage | null
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null
  return <div className={`toast toast-${toast.tone}`}>{toast.message}</div>
}
