import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface DocumentSheetProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

export default function DocumentSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: DocumentSheetProps) {
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
      aria-hidden={!open}
      onClick={onClose}
      style={{
        background: 'rgba(15, 23, 42, 0.4)',
        inset: 0,
        position: 'fixed',
        zIndex: 60,
      }}
    >
      <div
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={{
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          bottom: 0,
          left: 0,
          margin: '0 auto',
          maxHeight: '80vh',
          maxWidth: 960,
          overflowY: 'auto',
          padding: '16px 16px 24px',
          position: 'absolute',
          right: 0,
        }}
      >
        <div
          style={{
            background: '#d6d3d1',
            borderRadius: 999,
            height: 4,
            margin: '0 auto 16px',
            width: 56,
          }}
        />
        <div
          style={{
            alignItems: 'flex-start',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: 18, margin: 0 }}>{title}</h3>
            {subtitle ? (
              <p style={{ color: '#6b7280', fontSize: 13, margin: '6px 0 0' }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f5f5f4',
              border: '1px solid #e7e5e4',
              borderRadius: 999,
              cursor: 'pointer',
              height: 36,
              width: 36,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
