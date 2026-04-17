import { useCallback, useMemo, useState } from 'react'

export interface ToastStackItem {
  id: string
  title: string
  description?: string
  tone?: 'info' | 'success' | 'warning' | 'danger'
  durationMs?: number
}

export interface ShowToastInput {
  title: string
  description?: string
  tone?: ToastStackItem['tone']
  durationMs?: number
}

const createToastId = () =>
  `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function useToastStack(initialToasts: ToastStackItem[] = []) {
  const [toasts, setToasts] = useState<ToastStackItem[]>(initialToasts)

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId))
  }, [])

  const showToast = useCallback((input: ShowToastInput) => {
    const nextToast: ToastStackItem = {
      id: createToastId(),
      tone: 'info',
      durationMs: 3200,
      ...input,
    }

    setToasts((current) => [...current, nextToast])
    return nextToast.id
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      clearToasts,
    }),
    [clearToasts, dismissToast, showToast, toasts],
  )
}
