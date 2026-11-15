import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Check, Loader2, Sparkles, AlertCircle, FileCheck, FileText, ShieldAlert, ArrowRight, type LucideIcon } from 'lucide-react'
import type { BoluProposal } from '@/lib/ai-assistant/bolu-operations'
import { formatNaira } from '@/lib/formatters/money'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: LucideIcon }[]
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-full border border-[var(--ac-line)] bg-[var(--ac-surface)] p-0.5"
    >
      {options.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              value === option.value
                ? 'bg-[var(--ac-ink)] text-[var(--ac-surface)]'
                : 'text-[var(--ac-muted)] hover:text-[var(--ac-ink)]'
            }`}
          >
            {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The BOUXRE mark: a geometric B drawn in two bowls around one stem.
 */
export function AssistantMark({
  size = 28,
  tone = 'soft',
  className = '',
  title,
}: {
  size?: number
  tone?: 'soft' | 'solid'
  className?: string
  title?: string
}) {
  return (
    <span
      className={`ac-mark ac-mark--${tone} ${className}`.trim()}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true">
        <path
          d="M11 7v18M11 7h7.5a5.5 5.5 0 0 1 0 11H11M11 18h8.5a5 5 0 0 1 0 10H11"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="ac-status" data-done={done}>
      <span className="ac-status-icon" aria-hidden="true">
        {done ? <Check className="size-3.5" strokeWidth={2.6} /> : <Loader2 className="ac-spin size-3.5" />}
      </span>
      <span>{label}</span>
    </div>
  )
}

/**
 * ProposalCardView — Two-Gate Operation Decision Surface (DEC-05)
 *
 * Consumes authoritative `BoluProposal` payloads from `bolu-operations.ts`.
 * - Gate 1: Review draft change proposal (Approve / Reject)
 * - Gate 2: Explicit human confirmation before persistent database write (Confirm Save / Cancel)
 */
export function ProposalCardView({
  proposal,
  onApproveGate1,
  onRejectGate1,
  onConfirmGate2,
  onCancelGate2,
  compact = false,
}: {
  proposal: BoluProposal
  onApproveGate1?: () => void
  onRejectGate1?: () => void
  onConfirmGate2?: () => void
  onCancelGate2?: () => void
  compact?: boolean
}) {
  const titleId = useId()
  const cardRef = useRef<HTMLElement | null>(null)
  const rejectRef = useRef<HTMLButtonElement | null>(null)
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  const isPendingGate1 = proposal.status === 'pending_approval'
  const isApprovedGate2 = proposal.status === 'approved_pending_save'
  const isSaving = proposal.status === 'saving'
  const isPersisted = proposal.status === 'persisted'
  const isRejected = proposal.status === 'rejected'
  const isCancelled = proposal.status === 'cancelled'
  const isFailed = proposal.status === 'failed'

  useEffect(() => {
    if (!compact && isPendingGate1) {
      rejectRef.current?.focus()
    } else if (!compact && isApprovedGate2) {
      confirmRef.current?.focus()
    }
  }, [proposal.status, compact, isPendingGate1, isApprovedGate2])

  // Derive status badge
  let statusText = 'Pending Decision'
  let statusTone: 'ok' | 'off' | 'warn' | undefined
  if (isPendingGate1) {
    statusText = 'Gate 1 · Awaiting Approval'
    statusTone = 'warn'
  } else if (isApprovedGate2) {
    statusText = 'Gate 2 · Approved, Ready to Save'
    statusTone = 'warn'
  } else if (isSaving) {
    statusText = 'Saving to Database…'
    statusTone = 'warn'
  } else if (isPersisted) {
    statusText = '✓ Persisted to Database'
    statusTone = 'ok'
  } else if (isRejected) {
    statusText = 'Rejected (Gate 1)'
    statusTone = 'off'
  } else if (isCancelled) {
    statusText = 'Cancelled (Gate 2)'
    statusTone = 'off'
  } else if (isFailed) {
    statusText = 'Operation Failed'
    statusTone = 'off'
  }

  // Derive display values based on proposal type and document family
  const isCreate = proposal.operationType === 'create-document'
  const isQuotation = proposal.documentFamily === 'quotation'
  const documentNoun = isQuotation ? 'Quotation' : 'Invoice'
  const kindLabel = isCreate ? `New ${documentNoun} Proposal` : `${documentNoun} Modification`
  const title = isCreate
    ? `Create ${documentNoun} for ${proposal.payload.client_name || 'Client'}`
    : `Update ${documentNoun} ${proposal.targetDocumentNumber || 'Document'}`

  const items = isCreate
    ? proposal.payload.items
    : proposal.itemsChange?.newItems ?? []

  const total = proposal.computedTotals?.total ?? 0
  const subtotal = proposal.computedTotals?.subtotal ?? 0
  const vat = proposal.computedTotals?.vat ?? 0

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      className={`ac-card${compact ? ' ac-card--compact' : ''} border border-[var(--ac-line)] rounded-2xl bg-[var(--ac-surface)] p-4 shadow-sm`}
      data-status={proposal.status}
      data-family={proposal.documentFamily}
      role="group"
      aria-labelledby={titleId}
    >
      <div className="ac-card-head flex items-center justify-between gap-2 pb-2 border-b border-[var(--ac-line)]">
        <span
          className={`ac-card-kind inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${
            isQuotation ? 'text-[var(--ac-sage,green)]' : 'text-[var(--ac-accent)]'
          }`}
        >
          {isQuotation ? <FileText className="size-3.5" aria-hidden="true" /> : null}
          {kindLabel}
        </span>
        <span
          className="ac-card-flag px-2 py-0.5 rounded-full text-[11px] font-bold"
          data-tone={statusTone}
          role="status"
          aria-live="polite"
        >
          {statusText}
        </span>
      </div>

      <h3 className="ac-card-title text-sm font-bold text-[var(--ac-ink)] mt-2" id={titleId}>
        {title}
      </h3>

      {/* Field changes for modify proposal */}
      {!isCreate && proposal.field ? (
        <div className="ac-card-change my-2 p-2 rounded-lg bg-[var(--ac-muted-surface)] text-xs flex items-center gap-2">
          <span className="font-medium text-[var(--ac-muted)]">{proposal.field}:</span>
          <span className="ac-card-from line-through text-[var(--ac-muted)]">{String(proposal.oldValue ?? '')}</span>
          <ArrowRight className="size-3 text-[var(--ac-muted)]" />
          <span className="ac-card-to font-bold text-[var(--ac-ink)]">{String(proposal.newValue ?? '')}</span>
        </div>
      ) : null}

      {/* Item summary */}
      {items.length > 0 ? (
        <div className="my-2 space-y-1">
          <p className="text-[11px] font-semibold text-[var(--ac-muted)] uppercase tracking-wider">Line Items</p>
          <ul className="divide-y divide-[var(--ac-line)] text-xs">
            {items.map((item, idx) => (
              <li key={idx} className="py-1.5 flex justify-between items-center">
                <span className="text-[var(--ac-ink)] truncate max-w-[65%]">
                  {item.quantity} × {item.description}
                </span>
                <span className="font-medium text-[var(--ac-ink)]">
                  {formatNaira(item.quantity * item.unit_price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Authoritative Financial Totals */}
      {total > 0 ? (
        <div className="ac-card-money mt-3 pt-2 border-t border-[var(--ac-line)] text-xs space-y-1">
          {vat > 0 ? (
            <div className="flex justify-between text-[var(--ac-muted)]">
              <span>Subtotal</span>
              <span>{formatNaira(subtotal)}</span>
            </div>
          ) : null}
          {vat > 0 ? (
            <div className="flex justify-between text-[var(--ac-muted)]">
              <span>VAT (7.5%)</span>
              <span>{formatNaira(vat)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold text-sm text-[var(--ac-ink)]">
            <span>Authoritative Total</span>
            <strong className="text-[var(--ac-accent)]">{formatNaira(total)}</strong>
          </div>
        </div>
      ) : null}

      {/* Candidate / Reference metadata */}
      {isCreate && proposal.candidateNumber ? (
        <p className="text-[11px] text-[var(--ac-muted)] mt-2">
          Target identifier: <span className="font-mono font-medium">{proposal.candidateNumber}</span>
        </p>
      ) : null}

      {/* Gate 1 Approval Buttons */}
      {isPendingGate1 && onApproveGate1 && onRejectGate1 ? (
        <div className="ac-card-actions mt-3 pt-3 border-t border-[var(--ac-line)] flex items-center justify-end gap-2">
          <button
            ref={rejectRef}
            type="button"
            className="ac-btn ac-btn--ghost px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--ac-line)] hover:bg-[var(--ac-muted-surface)] text-[var(--ac-muted)]"
            onClick={onRejectGate1}
          >
            Reject Changes
          </button>
          <button
            type="button"
            className="ac-btn ac-btn--solid px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--ac-accent)] text-white hover:opacity-90 shadow-sm"
            onClick={onApproveGate1}
          >
            Approve Changes (Gate 1)
          </button>
        </div>
      ) : null}

      {/* Gate 2 Save Confirmation Buttons */}
      {(isApprovedGate2 || isSaving) && onConfirmGate2 && onCancelGate2 ? (
        <div className="ac-card-actions mt-3 pt-3 border-t border-[var(--ac-line)] flex items-center justify-end gap-2 bg-[var(--ac-muted-surface)] -mx-4 -mb-4 p-3 rounded-b-2xl">
          <button
            type="button"
            disabled={isSaving}
            className="ac-btn ac-btn--ghost px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--ac-line)] hover:bg-[var(--ac-surface)] text-[var(--ac-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onCancelGate2}
          >
            Cancel Save
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={isSaving}
            className="ac-btn ac-btn--solid px-4 py-1.5 rounded-lg text-xs font-semibold bg-[hsl(var(--primary))] text-white hover:opacity-90 shadow-md flex items-center gap-1.5 disabled:opacity-75 disabled:cursor-wait"
            onClick={onConfirmGate2}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving to Database…
              </>
            ) : (
              <>
                <FileCheck className="size-3.5" />
                Confirm &amp; Save (Gate 2)
              </>
            )}
          </button>
        </div>
      ) : null}

      {/* Persisted Confirmation Notice */}
      {isPersisted ? (
        <div className="mt-3 pt-2 text-xs text-[var(--ac-sage,green)] flex items-center gap-1.5 font-medium">
          <Check className="size-3.5" />
          <span>
            Successfully filed {proposal.persistedId ? `as record ${proposal.persistedId}` : 'to database'}.
          </span>
        </div>
      ) : null}
    </article>
  )
}
