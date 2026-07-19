import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useOperation } from '@/context/OperationContext'
import { Check, X, Loader2 } from 'lucide-react'

// Ponytail: single-operation overlay. Stack if queue support needed later.
export default function OperationOverlay() {
  const { operation } = useOperation()
  const [visible, setVisible] = useState(false)
  const [render, setRender] = useState(false)
  const prefersReduced = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    if (operation) {
      setRender(true)
      // Enter on next frame so transition fires
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    if (!operation && render) {
      setVisible(false)
      const t = setTimeout(() => setRender(false), 300)
      return () => clearTimeout(t)
    }
  }, [operation, render])

  if (!render || !operation) return null

  const isActive = operation.status === 'active'
  const isSuccess = operation.status === 'success'
  const isError = operation.status === 'error'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2',
        'flex items-center gap-3 rounded-2xl px-5 py-3.5',
        'border shadow-lg backdrop-blur-md',
        'max-w-[90vw] min-w-[280px]',
        // Transition: skip for reduced-motion
        prefersReduced.current
          ? 'translate-y-0 opacity-100'
          : 'transition-all duration-300 ease-out will-change-transform',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-2 opacity-0',
        // State colors via Clinical Design System tokens
        isActive && 'border-border bg-card/95 text-foreground shadow-primary/5',
        isSuccess && 'border-bd-status-success-border bg-bd-status-success-bg text-bd-status-success-text shadow-bd-status-success/10',
        isError && 'border-bd-status-danger-border bg-bd-status-danger-bg text-bd-status-danger-text shadow-bd-status-danger/10',
      )}
    >
      {/* Icon — animated spinner, then check/X */}
      <div className="flex-shrink-0">
        {isActive && (
          <Loader2
            className={cn(
              'h-5 w-5 text-primary',
              prefersReduced.current ? '' : 'animate-spin',
            )}
            aria-hidden="true"
          />
        )}
        {isSuccess && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        )}
        {isError && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight">
          {operation.title}
        </p>
        {operation.description && (
          <p className="mt-0.5 truncate text-xs opacity-70">
            {operation.description}
          </p>
        )}
      </div>
    </div>
  )
}
