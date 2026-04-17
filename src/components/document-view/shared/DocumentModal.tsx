import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface DocumentModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

export default function DocumentModal({
  open,
  title,
  description,
  onClose,
  footer,
  children,
}: DocumentModalProps) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        inset: 0,
        justifyContent: 'center',
        padding: 16,
        position: 'fixed',
        zIndex: 70,
      }}
    >
      <div
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={{
          background: '#fff',
          border: '1px solid #e7e5e4',
          borderRadius: 24,
          maxWidth: 520,
          padding: 24,
          width: '100%',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{title}</h3>
          {description ? (
            <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '8px 0 0' }}>
              {description}
            </p>
          ) : null}
        </div>

        <div>{children}</div>

        {footer ? (
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              marginTop: 20,
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
