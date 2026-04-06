import React from 'react'
import { X, AlertCircle } from 'lucide-react'
import { inputClassName } from '@/domain/projectDetailUtils'

export default function ProjectLinkDialog({
  showLink,
  setShowLink,
  linkType,
  setLinkType,
  linkDocId,
  setLinkDocId,
  linkError,
  setLinkError,
  linking,
  handleLink,
}) {
  if (!showLink) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/55 p-5"
      onClick={() => {
        setShowLink(false)
        setLinkDocId('')
        setLinkError('')
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl ring-1 ring-ring"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-foreground">Link Existing Document</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Search by the exact document number, like <strong>SASINV-B021</strong>, <strong>SASQ-0012</strong>, or{' '}
              <strong>CSR-004</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowLink(false)
              setLinkDocId('')
              setLinkError('')
            }}
            className="rounded-full border border-border bg-muted/50 p-2 text-muted-foreground transition hover:bg-muted/50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document Type</div>
            <div className="grid grid-cols-2 gap-2">
              {['invoice', 'quotation', 'csr', 'waybill'].map((type) => {
                const typeLabels = { invoice: 'Invoice', quotation: 'Quotation', csr: 'CSR', waybill: 'Waybill' }
                const active = linkType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLinkType(type)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {typeLabels[type]}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Document Number
            </div>
            <input
              className={inputClassName}
              value={linkDocId}
              onChange={(e) => {
                setLinkDocId(e.target.value)
                setLinkError('')
              }}
              placeholder={
                linkType === 'invoice'
                  ? 'e.g. SASINV-B021'
                  : linkType === 'quotation'
                    ? 'e.g. SASQ-0012'
                    : linkType === 'csr'
                      ? 'e.g. CSR-004'
                      : 'e.g. SASWB-E003'
              }
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleLink()}
            />
            {linkError ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{linkError}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setShowLink(false)
                setLinkDocId('')
                setLinkError('')
              }}
              className="rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLink}
              disabled={linking}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {linking ? 'Linking...' : 'Link Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
