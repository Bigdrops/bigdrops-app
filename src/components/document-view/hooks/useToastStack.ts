import { useCallback, useMemo } from 'react'
import { feedback, type FeedbackOptions } from '@/lib/feedback'

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

function createOptions(input: ShowToastInput): FeedbackOptions | undefined {
  const options: FeedbackOptions = {}

  if (input.description) {
    options.description = input.description
  }

  if (typeof input.durationMs === 'number') {
    options.duration = input.durationMs
  }

  return Object.keys(options).length ? options : undefined
}

// Deprecated document-view shim. The app now renders feedback through the
// single global goey toaster.
export function useToastStack(_: ToastStackItem[] = []) {
  const dismissToast = useCallback((toastId: string) => {
    feedback.dismiss(toastId)
  }, [])

  const showToast = useCallback((input: ShowToastInput) => {
    const options = createOptions(input)

    if (input.tone === 'success') {
      return feedback.success(input.title, options)
    }

    if (input.tone === 'warning') {
      return feedback.warning(input.title, options)
    }

    if (input.tone === 'danger') {
      return feedback.error(input.title, options)
    }

    return feedback.info(input.title, options)
  }, [])

  const clearToasts = useCallback(() => {
    feedback.dismiss()
  }, [])

  return useMemo(
    () => ({
      toasts: [] as ToastStackItem[],
      showToast,
      dismissToast,
      clearToasts,
    }),
    [clearToasts, dismissToast, showToast],
  )
}
