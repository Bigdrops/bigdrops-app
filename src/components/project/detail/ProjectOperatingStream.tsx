import React from 'react'
import { ChevronRight } from 'lucide-react'
import { DOC_TYPE, cardClassName, formatDate } from '@/domain/projectDetailUtils'

export default function ProjectOperatingStream({ timeline, navigate }) {
  return (
    <div className={`${cardClassName} overflow-hidden border-t-4 border-t-slate-800`}>
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Operating Stream</div>
        <div className="text-[10px] font-medium text-slate-400">Latest activity</div>
      </div>
      <div className="divide-y divide-slate-50 px-5 py-1">
        {timeline.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet for this project.</div>
        ) : (
          timeline.slice(0, 10).map((event, idx) => {
            const cfg = DOC_TYPE[event._type]
            const Icon = cfg.icon
            const docNumber =
              event.invoice_number ||
              event.quotation_number ||
              event.csr_number ||
              event.waybill_number ||
              '—'
            const docPath =
              event._type === 'invoice'
                ? `/invoices/${event.id}`
                : event._type === 'quotation'
                  ? `/quotations/${event.id}`
                  : event._type === 'csr'
                    ? `/csr/${event.id}`
                    : `/waybills/${event.id}`

            return (
              <div key={`${event._type}-${event.id}-${idx}`} className="flex items-center gap-4 py-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.iconWrapClassName} scale-90`}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {cfg.label} <span className="font-bold">{docNumber}</span>{' '}
                      {event.total ? `(${(event.total / 1000).toFixed(1)}k)` : ''}
                    </div>
                    <div className="shrink-0 text-[10px] text-slate-400 capitalize">{formatDate(event._date)}</div>
                  </div>
                  {event.status ? (
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 capitalize">Status: {event.status}</span>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(docPath)}
                  className="rounded-full p-1 text-slate-300 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
