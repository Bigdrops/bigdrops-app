import * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { uiSound } from '@/lib/uiSoundEvent'

type OperationStatus = 'idle' | 'active' | 'success' | 'error'

interface Operation {
  id: string
  title: string
  description?: string
  progress?: number
  status: OperationStatus
  startedAt: number
}

interface OperationContextValue {
  operation: Operation | null
  start: (id: string, title: string, description?: string) => void
  update: (updates: Partial<Pick<Operation, 'title' | 'description' | 'progress'>>) => void
  finish: (status?: 'success' | 'error') => void
  isActive: boolean
}

const OperationContext = createContext<OperationContextValue | null>(null)

export function OperationProvider({ children }: { children: React.ReactNode }) {
  const [operation, setOperation] = useState<Operation | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mirror of `operation` for useCallback closures - finish() needs the id
  // to route the completion sound (delete → warning, otherwise milestone).
  const operationRef = useRef<Operation | null>(null)

  useEffect(() => {
    operationRef.current = operation
  }, [operation])

  const clearDismissTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const start = useCallback(
    (id: string, title: string, description?: string) => {
      clearDismissTimer()
      setOperation({
        id,
        title,
        description,
        status: 'active',
        startedAt: Date.now(),
      })
    },
    [clearDismissTimer],
  )

  const update = useCallback(
    (updates: Partial<Pick<Operation, 'title' | 'description' | 'progress'>>) => {
      setOperation((prev) => {
        if (!prev || prev.status !== 'active') return prev
        return { ...prev, ...updates }
      })
    },
    [],
  )

  const finish = useCallback(
    (status: 'success' | 'error' = 'success') => {
      // Every long action (convert, delete, archive, duplicate, save, status)
      // completes here. Sound the completion: deletes warn, the rest milestone.
      // Error sound is for the overlay's error state - toast feedback already
      // covers most error paths, so this only guarantees every exit is heard.
      if (status === 'error') {
        uiSound('notification.error')
      } else {
        const id = operationRef.current?.id ?? ''
        uiSound(id.startsWith('delete') ? 'notification.warning' : 'hero.milestone')
      }
      setOperation((prev) => {
        if (!prev) return null
        const next = { ...prev, status, progress: status === 'success' ? 100 : prev.progress }
        // Auto-dismiss after 1.8s on success, 3s on error
        clearDismissTimer()
        timeoutRef.current = setTimeout(() => {
          setOperation(null)
        }, status === 'success' ? 1800 : 3000)
        return next
      })
    },
    [clearDismissTimer],
  )

  const isActive = operation?.status === 'active'

  const value = React.useMemo<OperationContextValue>(
    () => ({ operation, start, update, finish, isActive }),
    [operation, start, update, finish, isActive],
  )

  return <OperationContext.Provider value={value}>{children}</OperationContext.Provider>
}

export function useOperation() {
  const context = useContext(OperationContext)
  if (!context) {
    throw new Error('useOperation must be used within an OperationProvider')
  }
  return context
}
