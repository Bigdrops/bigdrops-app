import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, type InvoiceRecord } from '@/domain/clientWorkspace'

interface Props {
  overdue: InvoiceRecord[]
}

export const NeedsAttentionGroup: React.FC<Props> = ({ overdue }) => {
  const navigate = useNavigate()

  if (overdue.length === 0) return null

  return (
    <section
      aria-label="Needs attention"
      className="rounded-2xl border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--bd-status-danger-text))]">
        <AlertCircle className="size-3.5" />
        Needs attention ({overdue.length})
      </div>
      <div className="space-y-2">
        {overdue.slice(0, 3).map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-[hsl(var(--bd-status-danger-border))] bg-bd-surface p-3 shadow-sm"
          >
            <div className="min-w-0">
              <span className="block truncate font-mono text-xs font-bold text-[hsl(var(--bd-status-danger-text))]">
                {inv.invoice_number}
              </span>
              <span className="mt-0.5 block text-[10px] font-medium text-[hsl(var(--bd-status-danger-text))] opacity-80">
                Past due · {formatCurrency(inv.balance_due)}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[44px] shrink-0 rounded-full px-4 text-[10px] font-bold uppercase text-[hsl(var(--bd-status-danger-text))]"
              onClick={() => navigate(`/invoices/${inv.id}`)}
            >
              View
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
