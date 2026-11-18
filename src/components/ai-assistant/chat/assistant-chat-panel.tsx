import { useState } from 'react'
import { FileText, CheckCircle2, Clock, X, EyeOff, Check, FileCheck, Loader2 } from 'lucide-react'
import type { BoluProposal } from '@/lib/ai-assistant/bolu-operations'
import type {
  BoluClientCreateInput,
  BoluClientCreationOutcome,
  BoluClientMatch,
  BoluClientSearchResult,
} from '@/lib/ai-assistant/bolu-data'
import { formatNaira } from '@/lib/formatters/money'
import { ProposalClarificationCard, ProposalClientPicker, ProposalCommercialBreakdown, AdvanceConfigPreview } from './assistant-chat-parts'

export interface DocumentArtifactState {
  number: string
  client: string | null
  lines: Array<{
    id?: string
    description: string
    quantity: number
    unitPrice: number
  }>
  delivery: number
  dueDate: string | null
  filed: boolean
}

/**
 * InvoicePanel — Contextual Document Artifact & Mobile Decision Surface (Bolu 2.0)
 *
 * Displays a compact, structured review surface for draft and active documents.
 * Integrates directly with Two-Gate approval handlers so decisions can be made
 * inside the mobile preview or in chat with full state synchronization.
 */
export function InvoicePanel({
  proposal,
  fallbackDocument,
  onClose,
  onApproveGate1,
  onRejectGate1,
  onConfirmGate2,
  onCancelGate2,
  onSearchClients,
  onSelectClient,
  onCreateClient,
  onAnswerClarification,
  onReturnToReview,
}: {
  proposal?: BoluProposal | null
  fallbackDocument?: DocumentArtifactState | null
  onClose?: () => void
  onApproveGate1?: (opId: string) => void | Promise<unknown>
  onRejectGate1?: (opId: string) => void | Promise<unknown>
  onConfirmGate2?: (opId: string) => void | Promise<unknown>
  onCancelGate2?: (opId: string) => void | Promise<unknown>
  onSearchClients?: (opId: string, term: string) => Promise<BoluClientSearchResult>
  onSelectClient?: (opId: string, client: BoluClientMatch) => void | Promise<unknown>
  onCreateClient?: (
    opId: string,
    input: BoluClientCreateInput,
  ) => Promise<BoluClientCreationOutcome>
  onAnswerClarification?: (
    opId: string,
    questionId: string,
    answer: { optionId?: string; text?: string },
  ) => void | Promise<unknown>
  /** Reopens Gate 1 review; the earlier approval no longer authorizes a save. */
  onReturnToReview?: (opId: string) => void | Promise<unknown>
}) {
  const [submitting, setSubmitting] = useState(false)
  const hasActiveDocument = Boolean(proposal || fallbackDocument)

  // Derive artifact state from live proposal if present, else fallback
  const isCreate = proposal?.operationType === 'create-document'
  const isAdvance = proposal?.operationType === 'advance-invoice-config'
  const isFiled = proposal?.status === 'persisted' || fallbackDocument?.filed
  const isQuotation = proposal?.documentFamily === 'quotation'
  const isPendingGate1 = proposal?.status === 'pending_approval'
  const isApprovedGate2 = proposal?.status === 'approved_pending_save'
  const isSaving = proposal?.status === 'saving'
  const isRejected = proposal?.status === 'rejected'
  const isCancelled = proposal?.status === 'cancelled'

  // A draft placeholder is never shown as the document number. Only a value
  // already allocated by the numbering engine (or a persisted id) is displayed.
  const candidateNumber = proposal?.operationType === 'create-document'
    ? proposal.candidateNumber
    : undefined
  const authoritativeCandidate = /^[A-Z0-9]{2,6}-\d{3,}$/.test(candidateNumber || '')
    ? candidateNumber
    : null
  const number = isCreate
    ? (proposal?.persistedId || authoritativeCandidate || 'Assigned on save')
    : (proposal?.targetDocumentNumber || fallbackDocument?.number || 'Draft')

  const client = isCreate
    ? (proposal?.payload.client_name ?? fallbackDocument?.client ?? 'Not set')
    : (fallbackDocument?.client ?? 'Not set')

  const dueDate = isCreate
    ? (proposal?.payload.due_date ?? fallbackDocument?.dueDate ?? 'Not set')
    : (fallbackDocument?.dueDate ?? 'Not set')

  const lines = isCreate
    ? (proposal?.payload.items.map((i, idx) => ({
        id: `line-${idx}`,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unit_price,
      })) ?? [])
    : proposal?.operationType === 'modify-document'
      ? (proposal.itemsChange?.newItems?.map((i, idx) => ({
          id: `mod-line-${idx}`,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unit_price,
        })) ?? fallbackDocument?.lines ?? [])
      : (fallbackDocument?.lines ?? [])

  const proposalTotals = isAdvance || !proposal ? undefined : proposal.computedTotals
  const subtotal = proposalTotals?.subtotal ?? 0
  const vat = proposalTotals?.vat ?? 0
  // A modify proposal carries only subtotal/vat/total; read the extras safely.
  const discount = (proposalTotals as { discount?: number } | undefined)?.discount ?? 0
  const wht = (proposalTotals as { wht?: number } | undefined)?.wht ?? 0
  const vatPercent = isCreate ? (proposal?.payload.global_vat_percent ?? 7.5) : 7.5
  const advanceAction = isAdvance && proposal?.operationType === 'advance-invoice-config'
    ? proposal.intent === 'configure'
      ? 'Configure Advance Invoice'
      : proposal.intent === 'update'
        ? 'Update Advance Invoice'
        : 'Remove Advance Invoice'
    : null
  const documentLabel = isAdvance
    ? `${advanceAction} on ${number}`
    : `${isQuotation ? 'Quotation' : 'Invoice'} ${number}`

  const handleReturnToReview = async () => {
    if (!proposal || submitting || !onReturnToReview) return
    try {
      setSubmitting(true)
      await onReturnToReview(proposal.opId)
    } finally {
      setSubmitting(false)
    }
  }
  const total = isAdvance
    ? (proposal?.operationType === 'advance-invoice-config' ? proposal.preview.amount ?? 0 : 0)
    : proposalTotals?.total ?? (
        fallbackDocument
          ? fallbackDocument.lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0) + fallbackDocument.delivery
          : 0
      )

  const handleApprove = async () => {
    if (!proposal || submitting) return
    try {
      setSubmitting(true)
      await onApproveGate1?.(proposal.opId)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!proposal || submitting) return
    try {
      setSubmitting(true)
      await onRejectGate1?.(proposal.opId)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!proposal || submitting) return
    try {
      setSubmitting(true)
      await onConfirmGate2?.(proposal.opId)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!proposal || submitting) return
    try {
      setSubmitting(true)
      await onCancelGate2?.(proposal.opId)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ac-panel h-full flex flex-col bg-[var(--ac-surface)] border-l border-[var(--ac-line)]">
      {/* Panel Header */}
      <div className="ac-panel-head flex items-center justify-between gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-[var(--ac-line)] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="ac-panel-icon size-7 rounded-lg bg-[var(--ac-muted-surface)] flex items-center justify-center shrink-0" aria-hidden="true">
            <FileText className="size-3.5 text-[var(--ac-ink)]" />
          </span>
          <div className="ac-panel-title min-w-0">
            <p className="text-xs font-bold text-[var(--ac-ink)] truncate leading-tight">
              {isQuotation ? 'Quotation Preview' : 'Document Preview'}
            </p>
            <span className="text-[10px] text-[var(--ac-muted)] truncate block font-mono">
              {hasActiveDocument ? number : 'Context Surface'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasActiveDocument ? (
            <span
              className="ac-pill text-[10px] px-2 py-0.5 rounded-full border border-[var(--ac-line)] font-medium"
              data-state={isFiled ? 'filed' : isPendingGate1 ? 'pending' : 'draft'}
            >
              {isFiled ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="size-3" /> Filed
                </span>
              ) : isPendingGate1 ? (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <Clock className="size-3" /> Draft (Gate 1)
                </span>
              ) : isApprovedGate2 ? (
                <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                  <Clock className="size-3" /> Approved (Gate 2)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                  <Clock className="size-3" /> Draft
                </span>
              )}
            </span>
          ) : null}

          {onClose ? (
            <button
              type="button"
              className="p-1.5 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
              aria-label="Close document preview"
              title="Close preview"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Panel Scrollable Body */}
      <div className="ac-panel-scroll flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
        {!hasActiveDocument ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--ac-muted)] space-y-3">
            <div className="size-12 rounded-2xl bg-[var(--ac-muted-surface)] border border-[var(--ac-line)] flex items-center justify-center">
              <FileText className="size-6 text-[var(--ac-muted)] opacity-60" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--ac-ink)]">No active document</p>
              <p className="text-[11px] text-[var(--ac-muted)] mt-1 max-w-[220px] leading-relaxed">
                When you create or modify an invoice or quotation in chat, a live structured preview will appear here.
              </p>
            </div>
            {onClose ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--ac-line)] text-xs text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition mt-2"
                onClick={onClose}
              >
                <EyeOff className="size-3.5" />
                <span>Hide Panel</span>
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Document Summary Card */}
            {isAdvance && proposal?.operationType === 'advance-invoice-config' ? (
              <div className="ac-doc p-3 rounded-xl bg-[var(--ac-muted-surface)] border border-[var(--ac-line)] space-y-2 text-xs shadow-xs">
                <div className="ac-doc-row flex justify-between items-center text-[var(--ac-muted)]">
                  <span className="text-[11px]">Operation</span>
                  <strong className="text-[var(--ac-ink)] font-semibold text-right">{advanceAction}</strong>
                </div>
                <div className="ac-doc-row flex justify-between items-center text-[var(--ac-muted)]">
                  <span className="text-[11px]">Target Invoice</span>
                  <strong className="text-[var(--ac-ink)] font-mono font-semibold truncate max-w-[65%] text-right">{number}</strong>
                </div>
                {proposal.preview.amount != null ? (
                  <div className="ac-doc-row flex justify-between items-center text-[var(--ac-muted)]">
                    <span className="text-[11px]">Advance Amount</span>
                    <strong className="text-[var(--ac-ink)] font-semibold">{formatNaira(proposal.preview.amount)}</strong>
                  </div>
                ) : null}
                {proposal.preview.contractValue != null ? (
                  <div className="ac-doc-row flex justify-between items-center text-[var(--ac-muted)]">
                    <span className="text-[11px]">Contract Value</span>
                    <strong className="text-[var(--ac-ink)] font-semibold">{formatNaira(proposal.preview.contractValue)}</strong>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="ac-doc p-3 rounded-xl bg-[var(--ac-muted-surface)] border border-[var(--ac-line)] space-y-2 text-xs shadow-xs">
              <div className="ac-doc-row flex justify-between items-center text-[var(--ac-muted)]">
                <span className="text-[11px]">Client</span>
                <strong className="text-[var(--ac-ink)] font-semibold truncate max-w-[60%] text-right">{client}</strong>
              </div>
              <div className="ac-doc-row flex justify-between items-center text-[var(--ac-muted)]">
                <span className="text-[11px]">Due Date</span>
                <strong className="text-[var(--ac-ink)] font-semibold">{dueDate}</strong>
              </div>
              <div className="ac-doc-total flex justify-between items-baseline pt-2 border-t border-[var(--ac-line)] font-bold text-xs text-[var(--ac-ink)]">
                <span className="text-[11px] uppercase tracking-wider text-[var(--ac-muted)]">Authoritative Total</span>
                <span className="text-sm font-extrabold text-[var(--ac-ink)]">{formatNaira(total)}</span>
              </div>
              </div>
            )}

            {/* Client resolution: searchable fallback picker inside the preview.
                Gate 2 confirms a reviewed operation, so no editable field or
                client replacement is offered once Gate 1 is approved. */}
            {proposal && isCreate && isPendingGate1 && (onSearchClients || proposal.clientResolution) ? (
              <ProposalClientPicker
                resolution={proposal.clientResolution}
                clientName={proposal.payload.client_name}
                disabled={false}
                onSearch={
                  onSearchClients
                    ? (term) => onSearchClients(proposal.opId, term)
                    : async (term) => ({
                        status: 'search_error',
                        query: term,
                        error: 'Client search is unavailable.',
                      })
                }
                onSelect={onSelectClient ? (client) => onSelectClient(proposal.opId, client) : () => undefined}
                onCreate={
                  onCreateClient ? (input) => onCreateClient(proposal.opId, input) : undefined
                }
              />
            ) : null}

            {/* Advance Invoice configuration preview; line items stay untouched */}
            {isAdvance && proposal?.operationType === 'advance-invoice-config' ? (
              <AdvanceConfigPreview proposal={proposal} />
            ) : (
            <>
            {/* Line Items Section */}
            <div className="ac-panel-section space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="ac-panel-label text-[10px] font-bold uppercase tracking-wider text-[var(--ac-muted)]">
                  Line Items
                </p>
                <span className="text-[10px] font-semibold text-[var(--ac-muted)]">
                  {lines.length} {lines.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {lines.length === 0 ? (
                <p className="ac-panel-empty text-xs text-[var(--ac-muted)] italic p-3 rounded-lg border border-dashed border-[var(--ac-line)] text-center">
                  No line items yet.
                </p>
              ) : (
                <ul className="ac-lines divide-y divide-[var(--ac-line)] border border-[var(--ac-line)] rounded-xl bg-[var(--ac-surface)] overflow-hidden">
                  {lines.map((line, idx) => (
                    <li key={line.id ?? idx} className="ac-line p-2.5 flex justify-between items-start gap-2 text-xs">
                      <div className="ac-line-id min-w-0 flex-1">
                        <p className="font-medium text-[var(--ac-ink)] leading-snug break-words">{line.description}</p>
                        <span className="text-[11px] text-[var(--ac-muted)] block mt-0.5">
                          {line.quantity} × {formatNaira(line.unitPrice)}
                        </span>
                      </div>
                      <strong className="font-semibold text-[var(--ac-ink)] shrink-0 text-right mt-0.5">
                        {formatNaira(line.quantity * line.unitPrice)}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Totals Section: every amount that produces the authoritative total */}
            {proposal && (subtotal > 0 || total > 0) ? (
              <div className="ac-panel-section border-t border-[var(--ac-line)] pt-2.5 text-xs space-y-1">
                <div className="flex justify-between text-[var(--ac-muted)]">
                  <span>Subtotal</span>
                  <span>{formatNaira(subtotal)}</span>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between text-[var(--ac-muted)]">
                    <span>Discount</span>
                    <span>-{formatNaira(discount)}</span>
                  </div>
                ) : null}
                {vat > 0 ? (
                  <div className="flex justify-between text-[var(--ac-muted)]">
                    <span>VAT ({vatPercent}%)</span>
                    <span>{formatNaira(vat)}</span>
                  </div>
                ) : null}
                {wht > 0 ? (
                  <div className="flex justify-between text-[var(--ac-muted)]">
                    <span>WHT</span>
                    <span>-{formatNaira(wht)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-1.5 mt-0.5 border-t border-[var(--ac-line)] font-bold text-[var(--ac-ink)]">
                  <span>Total due</span>
                  <span>{formatNaira(total)}</span>
                </div>
              </div>
            ) : null}

            {/* Fixed and custom charges, kept distinct from line items */}
            {proposal ? <ProposalCommercialBreakdown proposal={proposal} /> : null}
            </>
            )}

            {/* Contextual clarification for the pending operation */}
            {proposal && isCreate && isPendingGate1 && proposal.clarification && onAnswerClarification ? (
              <ProposalClarificationCard
                clarification={proposal.clarification}
                disabled={!isPendingGate1}
                onAnswer={(questionId, answer) =>
                  onAnswerClarification(proposal.opId, questionId, answer)
                }
              />
            ) : null}

            {/* Review Status Messages */}
            {isPendingGate1 ? (
              <div className="p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] leading-tight">Review proposal items and prices below or in chat.</span>
              </div>
            ) : null}

            {isApprovedGate2 ? (
              <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-2.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
                  <Clock className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] leading-tight">Gate 1 approved. Confirm Gate 2 to persist to database.</span>
                </div>
                {/* Confirmation summary: identity and the exact amount being saved */}
                <dl className="text-[11px] space-y-0.5 border-t border-blue-500/20 pt-1.5 text-[var(--ac-ink)]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--ac-muted)]">Saving</dt>
                    <dd className="font-semibold truncate">{documentLabel}</dd>
                  </div>
                  {!isAdvance ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--ac-muted)]">Client</dt>
                      <dd className="font-semibold truncate">{client}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--ac-muted)]">{isAdvance ? 'Advance' : 'Amount'}</dt>
                    <dd className="font-bold">{formatNaira(total)}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {isFiled ? (
              <div className="p-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="size-4 shrink-0 text-emerald-600" />
                <span className="text-[11px] leading-tight">Document successfully saved to database.</span>
              </div>
            ) : null}

            {isRejected ? (
              <div className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 text-xs text-[var(--ac-muted)] flex items-center gap-2">
                <X className="size-4 shrink-0" />
                <span className="text-[11px] leading-tight">Proposal was rejected at Gate 1.</span>
              </div>
            ) : null}

            {isCancelled ? (
              <div className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 text-xs text-[var(--ac-muted)] flex items-center gap-2">
                <X className="size-4 shrink-0" />
                <span className="text-[11px] leading-tight">Document save cancelled at Gate 2.</span>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Decision Action Footer (Gate 1 & Gate 2) */}
      {proposal && (isPendingGate1 || isApprovedGate2 || isSaving) ? (
        <div className="ac-panel-footer border-t border-[var(--ac-line)] p-3 sm:p-4 bg-[var(--ac-surface)] pb-[max(12px,env(safe-area-inset-bottom,12px))] shrink-0">
          {/* Gate 1 Approval Actions */}
          {isPendingGate1 && onApproveGate1 && onRejectGate1 ? (
            <div className="flex flex-row items-center gap-2.5">
              <button
                type="button"
                disabled={submitting}
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--ac-line)] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 text-[var(--ac-muted)] transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleReject}
              >
                Reject Changes
              </button>
              <button
                type="button"
                disabled={submitting}
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleApprove}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <span>Approve Changes (Gate 1)</span>
                )}
              </button>
            </div>
          ) : null}

          {/* Gate 2 Confirmation Actions */}
          {(isApprovedGate2 || isSaving) && onConfirmGate2 && onCancelGate2 ? (
            <div className="space-y-2">
              {onReturnToReview ? (
                <button
                  type="button"
                  disabled={isSaving || submitting}
                  className="w-full min-h-[34px] px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--ac-muted)] underline underline-offset-2 hover:text-[var(--ac-ink)] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleReturnToReview}
                >
                  Change something? Back to review
                </button>
              ) : null}
              <div className="flex flex-row items-center gap-2.5">
              <button
                type="button"
                disabled={isSaving || submitting}
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--ac-line)] hover:bg-[var(--ac-muted-surface)] text-[var(--ac-muted)] transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCancel}
              >
                Cancel Save
              </button>
              <button
                type="button"
                disabled={isSaving || submitting}
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-[hsl(var(--primary))] hover:opacity-90 text-white shadow-md transition active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-75 disabled:cursor-wait"
                onClick={handleConfirm}
              >
                {isSaving || submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving to Database…</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="size-3.5" />
                    <span>Confirm & Save (Gate 2)</span>
                  </>
                )}
              </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
