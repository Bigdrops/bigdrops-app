import { useEffect, useState } from 'react'
import { Globe, Warehouse, X } from 'lucide-react'

import type { WaybillType } from './waybillUtils'

interface WaybillGatewayOverlayProps {
  open: boolean
  onSelect: (type: WaybillType) => void
  onClose: () => void
}

export default function WaybillGatewayOverlay({ open, onSelect, onClose }: WaybillGatewayOverlayProps) {
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
        className={`w-full max-w-lg rounded-t-3xl bg-[var(--bd-bg-card)] px-6 pb-10 pt-8 shadow-2xl transition-all duration-200 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--bd-text-muted)]">
            New Waybill
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

        <h2 className="mb-1 text-xl font-black tracking-tight text-[var(--bd-text)]">
          Choose Waybill Type
        </h2>
        <p className="mb-6 text-sm text-[var(--bd-text-muted)]">
          Select the type of waybill you want to create.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onSelect('external')}
            className="flex w-full items-center gap-4 rounded-2xl border border-[var(--bd-border)] bg-[var(--bd-surface)] p-5 text-left transition hover:border-[var(--bd-button-primary-bg)] hover:bg-[var(--bd-button-primary-bg)]/5 active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bd-indigo-bg)] text-[var(--bd-indigo)]">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--bd-text)]">External Waybill</div>
              <div className="mt-0.5 text-xs text-[var(--bd-text-muted)]">
                For client deliveries and third-party dispatches
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelect('internal')}
            className="flex w-full items-center gap-4 rounded-2xl border border-[var(--bd-border)] bg-[var(--bd-surface)] p-5 text-left transition hover:border-[var(--bd-button-primary-bg)] hover:bg-[var(--bd-button-primary-bg)]/5 active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bd-violet-bg)] text-[var(--bd-violet)]">
              <Warehouse className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--bd-text)]">Internal Waybill</div>
              <div className="mt-0.5 text-xs text-[var(--bd-text-muted)]">
                For internal movement, custody transfer, and worksite dispatch
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
