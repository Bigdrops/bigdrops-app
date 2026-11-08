'use client'

import { useState, useEffect, useRef, useCallback, type PointerEvent as ReactPointerEvent } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react'
import { toastStore, type ToastItem, type ToastTone } from '@/lib/toastStore'
import { cn } from '@/lib/utils'

function ToastGlyph({ tone }: { tone: ToastTone }) {
  switch (tone) {
    case 'success':
      return <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
    case 'error':
      return <AlertCircle className="size-4 shrink-0 text-rose-500" aria-hidden="true" />
    case 'warning':
      return <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
    case 'info':
      return <Info className="size-4 shrink-0 text-sky-500" aria-hidden="true" />
    case 'loading':
      return <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
    default:
      return <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  }
}

interface ToastPillProps {
  toast: ToastItem
  slot: number
  isFanned: boolean
  onDismiss: (id: string) => void
}

function ToastPill({ toast, slot, isFanned, onDismiss }: ToastPillProps) {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || !isDragging) return
    const deltaX = e.clientX - pointerStartRef.current.x
    setDragOffset(deltaX)
  }

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return
    const deltaX = e.clientX - pointerStartRef.current.x
    setIsDragging(false)
    pointerStartRef.current = null
    try {
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    } catch {
      // Best-effort release
    }

    if (Math.abs(deltaX) > 60) {
      setDragOffset(deltaX > 0 ? 300 : -300)
      setTimeout(() => onDismiss(toast.id), 150)
    } else {
      setDragOffset(0)
    }
  }

  // Pile vs Fan slot calculations
  let transform = `translateX(${dragOffset}px)`
  let opacity = 1
  let zIndex = 30 - slot * 10

  if (!isFanned) {
    if (slot === 0) {
      transform += ' translateY(0px) scale(1)'
      opacity = 1
    } else if (slot === 1) {
      transform += ' translateY(-8px) scale(0.96)'
      opacity = 0.88
    } else if (slot === 2) {
      transform += ' translateY(-16px) scale(0.92)'
      opacity = 0.65
    } else {
      opacity = 0
    }
  } else {
    // Fanned: natural vertical flow
    transform += ' translateY(0px) scale(1)'
    opacity = 1
  }

  return (
    <div
      role="status"
      aria-live="polite"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform,
        opacity,
        zIndex,
        transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.24s ease',
      }}
      className={cn(
        'pointer-events-auto relative flex max-w-[92vw] items-center gap-2 select-none touch-none',
        'rounded-[18px] border border-border/80 bg-card/95 px-3.5 py-1.5 shadow-lg backdrop-blur-md sm:max-w-md',
        'text-foreground',
        slot === 0 ? 'min-h-[36px]' : 'min-h-[36px]'
      )}
    >
      <div className="flex shrink-0 items-center justify-center">
        {toast.icon ?? <ToastGlyph tone={toast.tone} />}
      </div>

      <div className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden py-0.5">
        <span className="truncate text-xs font-semibold tracking-tight text-foreground">
          {toast.title}
        </span>
        {toast.description && (
          <span className="truncate text-[11px] text-muted-foreground">
            {toast.description}
          </span>
        )}
      </div>

      {toast.action && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toast.action?.onClick()
          }}
          className="ml-1 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20 active:scale-95"
        >
          {toast.action.label}
        </button>
      )}

      {toast.tone !== 'loading' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss(toast.id)
          }}
          aria-label="Dismiss notification"
          className="ml-1 shrink-0 rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:scale-95"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [isHovered, setIsHovered] = useState(false)
  const [isDocHidden, setIsDocHidden] = useState(false)
  const remainingTimeRef = useRef<Record<string, number>>({})
  const lastTickRef = useRef<number>(Date.now())

  useEffect(() => {
    return toastStore.subscribe((updated) => {
      setToasts(updated)
    })
  }, [])

  // Track document visibility to pause timers when app/tab is backgrounded
  useEffect(() => {
    const handleVisibility = () => {
      setIsDocHidden(document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Auto-dismiss countdown with pause support
  useEffect(() => {
    const isPaused = isHovered || isDocHidden
    lastTickRef.current = Date.now()

    if (isPaused || toasts.length === 0) return

    const interval = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now

      toasts.forEach((t) => {
        if (t.duration === Number.POSITIVE_INFINITY || t.duration <= 0) return

        const currentRem = remainingTimeRef.current[t.id] ?? t.duration
        const nextRem = currentRem - delta
        if (nextRem <= 0) {
          delete remainingTimeRef.current[t.id]
          toastStore.dismiss(t.id)
        } else {
          remainingTimeRef.current[t.id] = nextRem
        }
      })
    }, 100)

    return () => clearInterval(interval)
  }, [toasts, isHovered, isDocHidden])

  const handleDismiss = useCallback((id: string) => {
    delete remainingTimeRef.current[id]
    toastStore.dismiss(id)
  }, [])

  if (toasts.length === 0) return null

  const visibleToasts = toasts.slice(0, 3)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[9999] flex flex-col items-center justify-end px-4 sm:bottom-8"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className={cn('relative flex flex-col items-center', isHovered ? 'gap-2' : '')}>
        {visibleToasts.map((toast, index) => (
          <ToastPill
            key={toast.id}
            toast={toast}
            slot={index}
            isFanned={isHovered}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  )
}
