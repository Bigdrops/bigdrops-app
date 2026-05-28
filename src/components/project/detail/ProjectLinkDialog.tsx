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
      className="fixed inset-0 z-[999] flex items-center justify-center bg-bd-overlay-bg p-5"
      onClick={() => {
        setShowLink(false)
        setLinkDocId('')
        setLinkError('')
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-bd-border bg-bd-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-bd-text">Link Existing Document</h3>
            <p className="mt-1 text-sm leading-6 text-bd-text-muted">
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
            className="rounded-full border border-bd-border bg-bd-surface-muted p-2 text-bd-text-muted transition hover:bg-bd-surface-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-bd-text-muted">Document Type</div>
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
                        ? 'bg-bd-accent text-bd-accent-foreground'
                        : 'border border-bd-border bg-bd-surface text-bd-text hover:bg-bd-surface-muted'
                    }`}
                  >
                    {typeLabels[type]}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-bd-text-muted">
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
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-2.5 text-sm text-bd-status-danger-text">
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
              className="rounded-lg border border-bd-border bg-bd-surface-muted px-4 py-2.5 text-sm font-semibold text-bd-text transition hover:bg-bd-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLink}
              disabled={linking}
              className="rounded-lg bg-bd-status-success-bg px-4 py-2.5 text-sm font-semibold text-bd-status-success-text transition hover:bg-bd-status-success-hover-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {linking ? 'Linking...' : 'Link Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
