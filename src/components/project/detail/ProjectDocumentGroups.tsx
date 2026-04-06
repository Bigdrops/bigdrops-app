import React from 'react'
import { ChevronRight } from 'lucide-react'
import { DOC_TYPE, getPaymentStatusConfig, formatCurrency, formatDate } from '@/domain/projectDetailUtils'

export default function ProjectDocumentGroups({
  invoices,
  quotations,
  csrs,
  waybills,
  navigate,
}) {
  const commercialDocs = [
    ...quotations.map((q) => ({ ...q, _type: 'quotation', _date: q.issue_date })),
    ...invoices.map((inv) => ({ ...inv, _type: 'invoice', _date: inv.issue_date })),
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())

  const fieldDocs = [
    ...csrs.map((c) => ({ ...c, _type: 'csr', _date: c.created_at })),
    ...waybills.map((w) => ({ ...w, _type: 'waybill', _date: w.date || w.created_at })),
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())

  return (
    <div className="space-y-6 pt-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">Job Documents</h3>
        <span className="inline-flex h-5 items-center rounded-full bg-slate-100 px-2 text-[10px] font-bold text-slate-500">
          {commercialDocs.length + fieldDocs.length} total
        </span>
      </div>

      {/* ── Commercial documents ─────────── */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Commercial</span>
          {commercialDocs.length > 0 ? (
            <span className="inline-flex items-center rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-500 ring-1 ring-violet-100">
              {commercialDocs.length}
            </span>
          ) : null}
        </div>

        {commercialDocs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
            <div className="text-sm font-semibold text-slate-600">No quotations or invoices yet</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Use Quick Actions to create one, or link an existing document.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {commercialDocs.map((doc) => {
              const cfg = DOC_TYPE[doc._type]
              const Icon = cfg.icon
              const docNumber = doc.invoice_number || doc.quotation_number || '—'
              const docTitle = doc.invoice_title || ''
              const docPath = doc._type === 'invoice' ? `/invoices/${doc.id}` : `/quotations/${doc.id}`
              const invoiceFinancials = doc.invoiceFinancials
              const paymentStatus =
                doc._type === 'invoice' ? getPaymentStatusConfig(invoiceFinancials?.computed_status) : null
              const balanceDue = Number(invoiceFinancials?.balance_due || 0)
              return (
                <button
                  key={`${doc._type}-${doc.id}`}
                  type="button"
                  onClick={() => navigate(docPath)}
                  className="group flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm ring-1 ring-ring transition hover:border-border hover:shadow-md"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cfg.iconWrapClassName}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.labelClassName}`}>
                        {cfg.label}
                      </span>
                      <span className="text-sm font-bold text-foreground">{docNumber}</span>
                      {paymentStatus ? (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentStatus.className}`}>
                          {paymentStatus.label}
                        </span>
                      ) : null}
                      {doc.status && doc._type === 'quotation' ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 capitalize">
                          {doc.status}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {docTitle ? <span className="truncate">{docTitle}</span> : null}
                      {doc._date ? <span>{formatDate(doc._date)}</span> : null}
                    </div>
                    {doc._type === 'invoice' ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        {balanceDue > 0 ? (
                          <span className="font-semibold text-red-600">{formatCurrency(balanceDue)} outstanding</span>
                        ) : (
                          <span className="font-semibold text-emerald-600">Paid</span>
                        )}
                        {invoiceFinancials?.cash_received ? (
                          <span className="text-emerald-600">Collected {formatCurrency(invoiceFinancials.cash_received)}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {doc.total ? (
                      <div
                        className={`text-sm font-bold ${
                          doc._type === 'invoice' && balanceDue > 0 ? 'text-red-600' : 'text-slate-700'
                        }`}
                      >
                        {formatCurrency(doc.total)}
                      </div>
                    ) : null}
                    <ChevronRight
                      size={16}
                      className="text-slate-300 transition group-hover:text-muted-foreground"
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Field / operational docs ───────────── */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Field</span>
          {fieldDocs.length > 0 ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-100">
              {fieldDocs.length}
            </span>
          ) : null}
        </div>

        {fieldDocs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
            <div className="text-sm font-semibold text-slate-600">No CSRs or waybills yet</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Use Quick Actions to create one, or link an existing document.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {fieldDocs.map((doc) => {
              const cfg = DOC_TYPE[doc._type]
              const Icon = cfg.icon
              const docNumber = doc.csr_number || doc.waybill_number || '—'
              const docTitle = doc.title || ''
              const docPath = doc._type === 'csr' ? `/csr/${doc.id}` : `/waybills/${doc.id}`
              return (
                <button
                  key={`${doc._type}-${doc.id}`}
                  type="button"
                  onClick={() => navigate(docPath)}
                  className="group flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm ring-1 ring-ring transition hover:border-border hover:shadow-md"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cfg.iconWrapClassName}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.labelClassName}`}>
                        {cfg.label}
                      </span>
                      <span className="text-sm font-bold text-foreground">{docNumber}</span>
                      {doc.status ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 capitalize">
                          {doc.status}
                        </span>
                      ) : null}
                    </div>
                    {docTitle || doc._date ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {docTitle ? <span className="truncate">{docTitle}</span> : null}
                        {doc._date ? <span>{formatDate(doc._date)}</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <ChevronRight
                    size={16}
                    className="mt-1 shrink-0 text-slate-300 transition group-hover:text-muted-foreground"
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
