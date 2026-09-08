import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ClipboardList, Wrench, Truck, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateShort } from '@/domain/clientWorkspace'

interface Document {
  id: string
  number?: string | null
  date?: string | null
  created_at?: string
  total?: number | null
  status?: string | null
  title?: string | null
}

interface Props {
  type: 'invoice' | 'quotation' | 'csr' | 'waybill'
  documents: Document[]
}

const DOC_CONFIG = {
  invoice: { icon: FileText, label: 'Invoices', path: '/invoices', className: 'bg-blue-600 text-white' },
  quotation: { icon: ClipboardList, label: 'Quotations', path: '/quotations', className: 'bg-violet-600 text-white' },
  csr: { icon: Wrench, label: 'CSRs', path: '/csr', className: 'bg-emerald-600 text-white' },
  waybill: { icon: Truck, label: 'Waybills', path: '/waybills', className: 'bg-orange-600 text-white' },
}

const STATUS_VARIANTS = {
  paid: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))] ring-[hsl(var(--bd-status-success-border))]',
  unpaid: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))] ring-[hsl(var(--bd-status-info-border))]',
  partially_paid: 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))] ring-[hsl(var(--bd-status-warning-border))]',
  converted: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))] ring-[hsl(var(--bd-status-success-border))]',
  overdue: 'bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))] ring-[hsl(var(--bd-status-danger-border))]',
  cancelled: 'bg-[hsl(var(--bd-status-neutral-bg))] text-[hsl(var(--bd-status-neutral-text))] ring-[hsl(var(--bd-status-neutral-border))]',
  open: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))] ring-[hsl(var(--bd-status-info-border))]',
  confirmed: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))] ring-[hsl(var(--bd-status-success-border))]',
  archived: 'bg-[hsl(var(--bd-status-neutral-bg))] text-[hsl(var(--bd-status-neutral-text))] ring-[hsl(var(--bd-status-neutral-border))]',
}

export const ClientDocumentsTab: React.FC<Props> = ({ type, documents }) => {
  const navigate = useNavigate()
  const cfg = DOC_CONFIG[type]
  const Icon = cfg.icon

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 text-muted-foreground shadow-sm ring-1 ring-border/50">
           <Icon className="size-8" />
        </div>
        <h3 className="mt-4 text-sm font-bold text-foreground">No {cfg.label.toLowerCase()} yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">Any {cfg.label.toLowerCase()} linked to this client will appear here.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-bd-border/50 overflow-hidden rounded-2xl border border-bd-border bg-bd-surface shadow-sm">
      {documents.map((doc) => {
        const number = doc.number || doc.title || cfg.label.slice(0, -1)
        const date = doc.date || doc.created_at
        const status = (doc.status || 'open').toLowerCase()
        const statusClass = STATUS_VARIANTS[status as keyof typeof STATUS_VARIANTS] || STATUS_VARIANTS.archived

        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => navigate(`${cfg.path}/${doc.id}`)}
            className="group flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bd-surface-muted/50 active:bg-bd-surface-muted"
          >
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${cfg.className}`}>
               <Icon className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
               <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-[13px] font-black uppercase tracking-wider text-foreground">
                     {number}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{formatDateShort(date)}</span>
               </div>
               <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                     <Badge variant="ghost" className={`h-4 shrink-0 p-0 px-2 text-[9px] font-black uppercase tracking-widest ring-1 ring-inset ${statusClass}`}>
                        {status}
                     </Badge>
                     {doc.total && (
                        <>
                           <span className="text-[10px] text-muted-foreground/30">•</span>
                           <span className="truncate text-xs font-bold text-foreground">{formatCurrency(doc.total)}</span>
                        </>
                     )}
                  </div>
               </div>
            </div>

            <div className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-full text-muted-foreground transition group-hover:text-foreground">
               <ChevronRight className="size-5" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
