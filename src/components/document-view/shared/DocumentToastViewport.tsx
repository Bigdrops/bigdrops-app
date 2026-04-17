import { useEffect } from 'react'

import type { ToastStackItem } from '../hooks/useToastStack'

interface DocumentToastViewportProps {
  toasts: ToastStackItem[]
  onDismiss: (toastId: string) => void
}

const toastTones: Record<string, { background: string; border: string; color: string }> = {
  info: { background: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  success: { background: '#ecfdf5', border: '#a7f3d0', color: '#047857' },
  warning: { background: '#fffbeb', border: '#fde68a', color: '#b45309' },
  danger: { background: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
}

export default function DocumentToastViewport({
  toasts,
  onDismiss,
}: DocumentToastViewportProps) {
  useEffect(() => {
    const timers = toasts.map((toast) => {
      const timeoutId = window.setTimeout(() => {
        onDismiss(toast.id)
      }, toast.durationMs ?? 3200)

      return timeoutId
    })

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [onDismiss, toasts])

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      style={{
        bottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        left: 16,
        position: 'fixed',
        right: 16,
        zIndex: 80,
      }}
    >
      {toasts.map((toast) => {
        const tone = toastTones[toast.tone ?? 'info'] ?? toastTones.info

        return (
          <div
            key={toast.id}
            style={{
              background: tone.background,
              border: `1px solid ${tone.border}`,
              borderRadius: 18,
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.1)',
              color: '#111827',
              marginLeft: 'auto',
              maxWidth: 380,
              padding: '14px 16px',
              width: '100%',
            }}
          >
            <div
              style={{
                alignItems: 'flex-start',
                display: 'flex',
                gap: 12,
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ color: tone.color, fontSize: 14, fontWeight: 700 }}>
                  {toast.title}
                </div>
                {toast.description ? (
                  <div style={{ color: '#4b5563', fontSize: 13, marginTop: 4 }}>
                    {toast.description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
