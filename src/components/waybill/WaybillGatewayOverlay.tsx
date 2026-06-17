import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowRight } from 'lucide-react'

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
      className={`fixed inset-0 z-[999] flex items-center justify-center p-4 transition-all duration-200 ${
        visible ? 'bg-[var(--bd-overlay-scrim,rgba(0,0,0,0.4))]' : 'bg-transparent'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`relative flex w-full max-w-[420px] flex-col gap-[12px] rounded-[var(--bd-overlay-radius,28px)] bg-[var(--bd-overlay-bg,var(--bd-bg,#FFFFFF))] p-6 shadow-[var(--bd-shadow-lg)] transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-[var(--bd-overlay-close-bg,var(--bd-surface-muted,#F1F5F9))] text-[var(--bd-overlay-close-text,var(--bd-text-muted,#64748B))] transition-colors hover:text-[var(--bd-overlay-text,var(--bd-text,#0F172A))]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--bd-primary,#2563EB)]">
            Create Document
          </div>
          <h2 className="mb-1.5 mt-1 font-sans text-[32px] font-bold leading-[1.1] text-[var(--bd-overlay-text,var(--bd-text,#0F172A))]">
            New <span className="text-[var(--bd-warning,#D97706)]">Waybill</span>
          </h2>
          <div className="font-mono text-[11px] tracking-[0.1em] text-[var(--bd-overlay-muted,var(--bd-text-muted,#94A3B8))]">
            Select document type
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect('external')}
          className="group flex w-full cursor-pointer items-center gap-[18px] rounded-[var(--bd-radius-md,4px)] border border-[var(--bd-overlay-border,var(--bd-border,#E2E8F0))] bg-[var(--bd-overlay-section-bg,var(--bd-surface,#F8FAFC))] p-[22px_20px] text-left transition-all duration-200 hover:border-[var(--bd-border-hover,var(--bd-primary,#2563EB))] hover:bg-[var(--bd-surface-hover,#F1F5F9)]"
        >
          <div className="h-[48px] w-[3px] shrink-0 rounded-[2px] bg-[var(--bd-primary,#2563EB)]" />
          <div className="flex-1">
            <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--bd-overlay-muted,var(--bd-text-muted,#94A3B8))]">
              Type 01 / Outbound
            </div>
            <div className="mb-1 font-sans text-[18px] font-semibold text-[var(--bd-overlay-text,var(--bd-text,#0F172A))]">
              External Delivery Note
            </div>
            <div className="font-sans text-[13px] leading-[1.5] text-[var(--bd-overlay-muted,var(--bd-text-muted,#64748B))]">
              Outbound shipment to clients and vendors. Links to invoice on record.
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[var(--bd-text-subtle,var(--bd-text-muted,#CBD5E1))] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--bd-primary,#2563EB)]" />
        </button>

        <button
          type="button"
          onClick={() => onSelect('internal')}
          className="group flex w-full cursor-pointer items-center gap-[18px] rounded-[var(--bd-radius-md,4px)] border border-[var(--bd-overlay-border,var(--bd-border,#E2E8F0))] bg-[var(--bd-overlay-section-bg,var(--bd-surface,#F8FAFC))] p-[22px_20px] text-left transition-all duration-200 hover:border-[var(--bd-border-hover,var(--bd-primary,#2563EB))] hover:bg-[var(--bd-surface-hover,#F1F5F9)]"
        >
          <div className="h-[48px] w-[3px] shrink-0 rounded-[2px] bg-[var(--bd-warning,#D97706)]" />
          <div className="flex-1">
            <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--bd-overlay-muted,var(--bd-text-muted,#94A3B8))]">
              Type 02 / Internal
            </div>
            <div className="mb-1 font-sans text-[18px] font-semibold text-[var(--bd-overlay-text,var(--bd-text,#0F172A))]">
              Internal Transfer Note
            </div>
            <div className="font-sans text-[13px] leading-[1.5] text-[var(--bd-overlay-muted,var(--bd-text-muted,#64748B))]">
              Stock movement between depots, workshops, and service centers.
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[var(--bd-text-subtle,var(--bd-text-muted,#CBD5E1))] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--bd-primary,#2563EB)]" />
        </button>

        <div className="my-1.5 flex items-center gap-[12px]">
          <div className="h-px flex-1 bg-[var(--bd-overlay-border,var(--bd-border,#E2E8F0))]" />
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--bd-overlay-muted,var(--bd-text-muted,#94A3B8))]">
            or download blank
          </div>
          <div className="h-px flex-1 bg-[var(--bd-overlay-border,var(--bd-border,#E2E8F0))]" />
        </div>

        <div className="flex gap-[10px]">
          <button
            type="button"
            onClick={() => onDownloadBlank('external')}
            className="flex-1 cursor-pointer rounded-[var(--bd-radius-md,4px)] border border-[var(--bd-overlay-border,var(--bd-border,#E2E8F0))] bg-transparent p-[14px] text-left transition-all duration-200 hover:border-[var(--bd-border-hover,#94A3B8)] hover:bg-[var(--bd-overlay-section-bg,var(--bd-surface,#F8FAFC))]"
          >
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--bd-overlay-muted,var(--bd-text-muted,#94A3B8))]">
              Blank Template
            </div>
            <div className="font-sans text-[13px] font-semibold text-[var(--bd-overlay-muted,var(--bd-text-muted,#64748B))]">
              External (PDF)
            </div>
          </button>
          <button
            type="button"
            onClick={() => onDownloadBlank('internal')}
            className="flex-1 cursor-pointer rounded-[var(--bd-radius-md,4px)] border border-[var(--bd-overlay-border,var(--bd-border,#E2E8F0))] bg-transparent p-[14px] text-left transition-all duration-200 hover:border-[var(--bd-border-hover,#94A3B8)] hover:bg-[var(--bd-overlay-section-bg,var(--bd-surface,#F8FAFC))]"
          >
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--bd-overlay-muted,var(--bd-text-muted,#94A3B8))]">
              Blank Template
            </div>
            <div className="font-sans text-[13px] font-semibold text-[var(--bd-overlay-muted,var(--bd-text-muted,#64748B))]">
              Internal (PDF)
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

