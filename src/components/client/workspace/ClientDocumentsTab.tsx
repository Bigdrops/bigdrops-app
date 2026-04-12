import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ClipboardList, Wrench, Truck, ChevronRight } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
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
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  sent: 'bg-blue-50 text-blue-700 ring-blue-100',
  overdue: 'bg-red-50 text-red-700 ring-red-100',
  cancelled: 'bg-muted text-muted-foreground ring-border/20',
  draft: 'bg-zinc-50 text-zinc-600 ring-zinc-200',
  open: 'bg-blue-50 text-blue-700 ring-blue-100',
  confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
}

export const ClientDocumentsTab: React.FC<Props> = ({ type, documents }) => {
  const navigate = useNavigate()
  const cfg = DOC_CONFIG[type]
  const Icon = cfg.icon

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<Icon className="size-6 text-muted-foreground" />}
        title={`No ${cfg.label.toLowerCase()} yet`}
        description={`Any ${cfg.label.toLowerCase()} linked to this client will appear here.`}
        actionLabel={`Create ${cfg.label.slice(0, -1)}`}
        onAction={() => navigate(`${cfg.path}/new`)}
        className="py-16"
      />
    )
  }

  return (
    <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ring-ring">
      {documents.map((doc) => {
        const number = doc.number || doc.title || cfg.label.slice(0, -1)
        const date = doc.date || doc.created_at
        const status = (doc.status || 'draft').toLowerCase()
        const statusClass = STATUS_VARIANTS[status as keyof typeof STATUS_VARIANTS] || STATUS_VARIANTS.draft

        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => navigate(`${cfg.path}/${doc.id}`)}
            className="group flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/10 ${cfg.className}`}>
               <Icon className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
               <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-[13px] font-black uppercase tracking-wider text-zinc-900 group-hover:text-blue-600 transition-colors">
                     {number}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-muted-foreground/60">{formatDateShort(date)}</span>
               </div>
               <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                     <Badge variant="ghost" className={`h-4 p-0 px-2 text-[9px] font-black uppercase tracking-widest ring-1 ring-inset ${statusClass}`}>
                        {status}
                     </Badge>
                     {doc.total && (
                        <>
                           <span className="text-[10px] text-muted-foreground/30">•</span>
                           <span className="text-xs font-bold text-zinc-800">{formatCurrency(doc.total)}</span>
                        </>
                     )}
                  </div>
               </div>
            </div>

            <div className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600">
               <ChevronRight className="size-5" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
