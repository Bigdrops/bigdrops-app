import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface WaybillFormOverlayProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export default function WaybillFormOverlay({ open, title, children, onClose }: WaybillFormOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-200 ${
        visible ? 'bg-black/60' : 'bg-transparent'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--bd-bg-card)] shadow-2xl transition-all duration-200 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--bd-border)] px-6 py-4">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--bd-text-muted)]">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text-muted)] hover:bg-[var(--bd-surface-muted)] hover:text-[var(--bd-text)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-10 pt-5">
          {children}
        </div>
      </div>
    </div>
  )
}
