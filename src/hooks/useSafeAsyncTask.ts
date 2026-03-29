import { useCallback, useEffect, useRef } from 'react'

type SafeAsyncHandlers<T> = {
  onSuccess?: (value: T) => void
  onError?: (error: unknown) => void
  onSettled?: () => void
}

export function useSafeAsyncTask() {
  const runIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      runIdRef.current += 1
    }
  }, [])

  const cancel = useCallback(() => {
    runIdRef.current += 1
  }, [])

  const runLatest = useCallback(async <T,>(task: () => Promise<T>, handlers: SafeAsyncHandlers<T> = {}) => {
    const runId = ++runIdRef.current

    try {
      const value = await task()
      if (!mountedRef.current || runId !== runIdRef.current) {
        return { cancelled: true as const }
      }
      handlers.onSuccess?.(value)
      return { cancelled: false as const, value }
    } catch (error) {
      if (!mountedRef.current || runId !== runIdRef.current) {
        return { cancelled: true as const, error }
      }
      handlers.onError?.(error)
      return { cancelled: false as const, error }
    } finally {
      if (mountedRef.current && runId === runIdRef.current) {
        handlers.onSettled?.()
      }
    }
  }, [])

  return { runLatest, cancel }
}
