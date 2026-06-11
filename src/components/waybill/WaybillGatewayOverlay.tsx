import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Globe, Warehouse, X } from 'lucide-react'

import type { WaybillType } from './waybillUtils'

interface WaybillGatewayOverlayProps {
  open: boolean
  onClose: () => void
  onSelect: (type: WaybillType) => void
  onDownloadBlank: (type: WaybillType) => void
}

export default function WaybillGatewayOverlay({ open, onClose, onSelect, onDownloadBlank }: WaybillGatewayOverlayProps) {
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

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        visible ? 'bg-[var(--bd-overlay)]' : 'bg-transparent'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`bg-[var(--bd-bg)] max-w-md w-full mx-4 rounded-[var(--bd-radius-lg)] shadow-[var(--bd-shadow-lg)] transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--bd-border)] px-6 py-4">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--bd-text-muted)]">
              Create New Waybill
            </div>
            <h2 className="mt-1 text-lg font-black tracking-tight text-[var(--bd-text)]">
              Select Document Type
            </h2>
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

        <div className="space-y-3 px-6 py-5">
          <button
            type="button"
            onClick={() => onSelect('external')}
            className="flex w-full items-center gap-4 rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] p-4 text-left transition-all hover:border-[var(--bd-primary)] cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bd-primary)]">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[var(--bd-text)]">External / Client Delivery Note</div>
              <div className="mt-0.5 text-xs text-[var(--bd-text-muted)]">
                Outbound shipment to external clients and vendors with invoice linkage
              </div>
            </div>
            <svg className="h-4 w-4 shrink-0 text-[var(--bd-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onSelect('internal')}
            className="flex w-full items-center gap-4 rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] p-4 text-left transition-all hover:border-[var(--bd-primary)] cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bd-warning)]">
              <Warehouse className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[var(--bd-text)]">Internal Transfer Note</div>
              <div className="mt-0.5 text-xs text-[var(--bd-text-muted)]">
                Stock movement between company depots, workshops, and service centers
              </div>
            </div>
            <svg className="h-4 w-4 shrink-0 text-[var(--bd-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="relative px-6">
          <div className="absolute inset-x-6 top-0 border-t border-[var(--bd-border)]" />
          <div className="flex justify-center">
            <span className="relative bg-[var(--bd-bg)] px-3 text-[11px] font-medium text-[var(--bd-text-muted)]">or</span>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5">
          <button
            type="button"
            onClick={() => onDownloadBlank('external')}
            className="flex w-full items-center gap-4 rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] p-4 text-left transition-all hover:border-[var(--bd-primary)] cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--bd-border)] bg-[var(--bd-surface)]">
              <Download className="h-5 w-5 text-[var(--bd-text-muted)]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[var(--bd-text)]">Download Blank External Template</div>
              <div className="mt-0.5 text-xs text-[var(--bd-text-muted)]">
                Blank External Delivery Note (PDF)
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onDownloadBlank('internal')}
            className="flex w-full items-center gap-4 rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] p-4 text-left transition-all hover:border-[var(--bd-primary)] cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--bd-border)] bg-[var(--bd-surface)]">
              <Download className="h-5 w-5 text-[var(--bd-text-muted)]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[var(--bd-text)]">Download Blank Internal Template</div>
              <div className="mt-0.5 text-xs text-[var(--bd-text-muted)]">
                Blank Internal Transfer Note (PDF)
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
