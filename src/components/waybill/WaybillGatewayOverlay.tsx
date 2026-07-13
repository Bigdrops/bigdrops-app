import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ArrowRight, FileText } from 'lucide-react'
import type { WaybillType } from './waybillUtils'

interface WaybillGatewayOverlayProps {
  open: boolean
  onClose: () => void
  onSelect: (type: WaybillType) => void
  onDownloadBlank: (type: WaybillType) => void
}

const OPTIONS: { type: WaybillType; label: string; description: string; badge: string }[] = [
  {
    type: 'external',
    label: 'External Delivery Note',
    description: 'Outbound shipment to clients and vendors. Links to invoice on record.',
    badge: 'Type 01 / Outbound',
  },
  {
    type: 'internal',
    label: 'Internal Transfer Note',
    description: 'Stock movement between depots, workshops, and service centers.',
    badge: 'Type 02 / Internal',
  },
]

export default function WaybillGatewayOverlay({ open, onClose, onSelect, onDownloadBlank }: WaybillGatewayOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-lg gap-5 p-6">
        <DialogHeader>
          <span className="text-[10px] uppercase tracking-[0.3em] text-bd-accent font-mono">
            Create Document
          </span>
          <DialogTitle className="text-[32px] font-bold leading-[1.1]">
            New <span className="text-bd-accent">Waybill</span>
          </DialogTitle>
          <DialogDescription className="text-xs tracking-wider">
            Select document type
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(opt.type)}
              className="group flex cursor-pointer flex-col gap-2 rounded-[var(--bd-radius-md)] border border-bd-overlay-border bg-bd-overlay-section-bg p-4 text-left transition-all duration-200 hover:border-bd-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-focus-ring"
            >
              <span className="text-[9px] uppercase tracking-[0.2em] text-bd-overlay-muted font-mono">
                {opt.badge}
              </span>
              <span className="text-base font-semibold text-bd-overlay-text">
                {opt.label}
              </span>
              <span className="text-xs leading-relaxed text-bd-overlay-muted">
                {opt.description}
              </span>
              <span className="flex justify-end mt-1">
                <ArrowRight className="h-4 w-4 text-bd-overlay-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-bd-accent" />
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-bd-overlay-border" />
          <span className="text-[9px] uppercase tracking-[0.2em] text-bd-overlay-muted font-mono shrink-0">
            or download blank
          </span>
          <div className="h-px flex-1 bg-bd-overlay-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['external', 'internal'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onDownloadBlank(type)}
              className="flex cursor-pointer flex-col gap-1 rounded-[var(--bd-radius-md)] border border-bd-overlay-border bg-transparent p-3 text-left transition-all duration-200 hover:border-bd-overlay-section-border hover:bg-bd-overlay-section-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-focus-ring"
            >
              <span className="text-[9px] uppercase tracking-[0.2em] text-bd-overlay-muted font-mono">
                Blank Template
              </span>
              <span className="text-xs font-semibold text-bd-overlay-muted">
                {type === 'external' ? 'External (PDF)' : 'Internal (PDF)'}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-[var(--bd-radius-md)] bg-bd-surface p-3">
          <FileText className="h-3.5 w-3.5 text-bd-overlay-muted mt-0.5 shrink-0" />
          <span className="text-[11px] leading-relaxed text-bd-overlay-muted">
            Waybill numbering follows <span className="text-bd-overlay-text font-medium">WB-{'{'}6-digit serial{'}'}</span> — auto-generated on creation.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

