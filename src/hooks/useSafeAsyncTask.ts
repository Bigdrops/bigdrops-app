import { useCallback, useEffect, useRef } from 'react'

type SafeAsyncHandlers<T> = {
  onSuccess?: (value: T) => void
  onError?: (error: unknown) => void
  onSettled?: () => void
}

type SafeAsyncResult<T> =
  | { cancelled: true }
  | { cancelled: false; value: T }
  | { cancelled: false; error: unknown }

export function useSafeAsyncTask() {
  const runIdRef = useRef(0)
  const mountedRef = useRef(true)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      runIdRef.current += 1
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    runIdRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  const runLatest = useCallback(
    async <T,>(
      task: (signal: AbortSignal) => Promise<T>,
      handlers: SafeAsyncHandlers<T> = {}
    ): Promise<SafeAsyncResult<T>> => {
      const runId = ++runIdRef.current

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      try {
        const value = await task(controller.signal)

        if (!mountedRef.current || runId !== runIdRef.current) {
          return { cancelled: true }
        }

        handlers.onSuccess?.(value)
        return { cancelled: false, value }
      } catch (error) {
        if (
          controller.signal.aborted ||
          !mountedRef.current ||
          runId !== runIdRef.current
        ) {
          return { cancelled: true }
        }

        handlers.onError?.(error)
        return { cancelled: false, error }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }

        if (mountedRef.current && runId === runIdRef.current) {
          handlers.onSettled?.()
        }
      }
    },
    []
  )

  return { runLatest, cancel }
}