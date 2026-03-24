import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Download, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type ProjectDocumentCardProps = {
  document: Record<string, any>
  onDelete: (id: string) => void
}

const typeConfig = {
  purchase_order: {
    label: 'PO',
    badge: 'bg-blue-500 text-white',
    border: 'border-l-blue-500',
  },
  receipt: {
    label: 'Receipt',
    badge: 'bg-emerald-500 text-white',
    border: 'border-l-emerald-500',
  },
  receiving_waybill: {
    label: 'Waybill',
    badge: 'bg-orange-500 text-white',
    border: 'border-l-orange-500',
  },
  other: {
    label: 'Other',
    badge: 'bg-slate-500 text-white',
    border: 'border-l-slate-500',
  },
}

function formatCurrency(value: unknown) {
  const amount = Number(value || 0)
  return `₦${amount.toLocaleString()}`
}

function formatDate(value: unknown) {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function JsonValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((entry, index) => (
          <div key={index} className="rounded-xl border border-zinc-200 bg-card p-3">
            <JsonValue value={entry} />
          </div>
        ))}
      </div>
    )
  }

  if (value && typeof value === 'object') {
    return (
      <div className="space-y-2">
        {Object.entries(value as Record<string, unknown>).map(([key, entry]) => (
          <div key={key} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{key.replace(/_/g, ' ')}</div>
            <div className="mt-1 text-sm text-zinc-700">
              <JsonValue value={entry} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <span>{String(value ?? '—')}</span>
}

export default function ProjectDocumentCard({ document, onDelete }: ProjectDocumentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { toast } = useToast()

  const config = typeConfig[document.type as keyof typeof typeConfig] || typeConfig.other
  const itemCount = Array.isArray(document.data?.items) ? document.data.items.length : 0
  const total = Number(document.total || document.data?.total || 0)
  const rawJson = useMemo(
    () => document.raw_input || JSON.stringify(document.data || {}, null, 2),
    [document.data, document.raw_input],
  )

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(rawJson)
      toast({ title: 'Copied', description: 'Document JSON copied.' })
    } catch {
      alert('Could not copy JSON.')
    }
  }

  const handleExport = async () => {
    await handleCopyJson()
    toast({ title: 'Export', description: 'PDF export coming soon.' })
  }

  return (
    <div className={`rounded-[24px] border-l-4 border border-zinc-200 bg-card p-4 shadow-sm ${config.border}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${config.badge}`}>
              {config.label}
            </span>
            <span className="text-sm font-bold text-zinc-900">{document.reference_number || document.title || 'Untitled'}</span>
            {document.date ? <span className="text-xs text-zinc-500">{formatDate(document.date)}</span> : null}
          </div>
          <div className="mt-2 text-sm text-zinc-600">
            {[document.from_party || '—', document.to_party || '—'].join(' → ')}
          </div>
        </div>

        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(document.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {total > 0 ? <span className="font-bold text-zinc-900">{formatCurrency(total)}</span> : null}
        {Number(document.vat || 0) > 0 ? <span className="text-zinc-500">VAT {formatCurrency(document.vat)}</span> : null}
        {Number(document.wht || 0) > 0 ? <span className="text-zinc-500">WHT {formatCurrency(document.wht)}</span> : null}
        {itemCount > 0 ? <span className="text-zinc-500">{itemCount} items</span> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-9 rounded-xl border-zinc-200 bg-card text-zinc-700 hover:bg-zinc-50" onClick={() => setExpanded((current) => !current)}>
          {expanded ? <ChevronUp className="mr-1.5 h-4 w-4" /> : <ChevronDown className="mr-1.5 h-4 w-4" />}
          View Details
        </Button>
        <Button type="button" variant="outline" className="h-9 rounded-xl border-zinc-200 bg-card text-zinc-700 hover:bg-zinc-50" onClick={handleCopyJson}>
          <Copy className="mr-1.5 h-4 w-4" />
          Copy JSON
        </Button>
        <Button type="button" variant="outline" className="h-9 rounded-xl border-zinc-200 bg-card text-zinc-700 hover:bg-zinc-50" onClick={handleExport}>
          <Download className="mr-1.5 h-4 w-4" />
          Export
        </Button>
      </div>

      {expanded ? (
        <div className="mt-4 rounded-[20px] border border-zinc-200 bg-zinc-50 p-3">
          <JsonValue value={document.data || {}} />
        </div>
      ) : null}
    </div>
  )
}
