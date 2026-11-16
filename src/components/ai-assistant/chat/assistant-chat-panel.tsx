import { FileText, CheckCircle2, Clock, X, EyeOff } from 'lucide-react'
import type { BoluProposal } from '@/lib/ai-assistant/bolu-operations'
import { formatNaira } from '@/lib/formatters/money'

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
 * InvoicePanel — Contextual Document Artifact Surface (Bolu 2.0)
 * Displays a structured, read-only preview of active proposal or selected document.
 * When no document is active, displays a clean contextual placeholder and allows collapsing.
 */
export function InvoicePanel({
  proposal,
  fallbackDocument,
  onClose,
}: {
  proposal?: BoluProposal | null
  fallbackDocument?: DocumentArtifactState | null
  onClose?: () => void
}) {
  const hasActiveDocument = Boolean(proposal || fallbackDocument)

  // Derive artifact state from live proposal if present, else fallback
  const isCreate = proposal?.operationType === 'create-document'
  const isFiled = proposal?.status === 'persisted' || fallbackDocument?.filed

  const number = isCreate
    ? (proposal?.persistedId || proposal?.candidateNumber || 'INV-DRAFT')
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
    : (proposal?.itemsChange?.newItems?.map((i, idx) => ({
        id: `mod-line-${idx}`,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unit_price,
      })) ?? fallbackDocument?.lines ?? [])

  const subtotal = proposal?.computedTotals?.subtotal ?? 0
  const vat = proposal?.computedTotals?.vat ?? 0
  const total = proposal?.computedTotals?.total ?? (
    fallbackDocument
      ? fallbackDocument.lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0) + fallbackDocument.delivery
      : 0
  )

  return (
    <div className="ac-panel h-full flex flex-col bg-[var(--ac-surface)] border-l border-[var(--ac-line)]">
      {/* Panel Header */}
      <div className="ac-panel-head flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--ac-line)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="ac-panel-icon size-7 rounded-lg bg-[var(--ac-muted-surface)] flex items-center justify-center shrink-0" aria-hidden="true">
            <FileText className="size-3.5 text-[var(--ac-ink)]" />
          </span>
          <div className="ac-panel-title min-w-0">
            <p className="text-xs font-bold text-[var(--ac-ink)] truncate leading-tight">Document Artifact</p>
            <span className="text-[10px] text-[var(--ac-muted)] truncate block">{hasActiveDocument ? number : 'Context Surface'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {hasActiveDocument ? (
            <span className="ac-pill text-[10px] px-2 py-0.5 rounded-full border border-[var(--ac-line)]" data-state={isFiled ? 'filed' : 'draft'}>
              {isFiled ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="size-3" /> Filed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <Clock className="size-3" /> Draft
                </span>
              )}
            </span>
          ) : null}

          {onClose ? (
            <button
              type="button"
              className="p-1.5 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
              aria-label="Collapse document panel"
              title="Collapse document panel"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Panel Body */}
      <div className="ac-panel-scroll flex-1 overflow-y-auto p-4 space-y-4">
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
            <div className="ac-doc p-3 rounded-xl bg-[var(--ac-muted-surface)] border border-[var(--ac-line)] space-y-2 text-xs">
              <div className="ac-doc-row flex justify-between text-[var(--ac-muted)]">
                <span>Client</span>
                <strong className="text-[var(--ac-ink)] font-semibold">{client}</strong>
              </div>
              <div className="ac-doc-row flex justify-between text-[var(--ac-muted)]">
                <span>Due Date</span>
                <strong className="text-[var(--ac-ink)] font-semibold">{dueDate}</strong>
              </div>
              <div className="ac-doc-total flex justify-between pt-2 border-t border-[var(--ac-line)] font-bold text-xs text-[var(--ac-ink)]">
                <span>Authoritative Total</span>
                <span>{formatNaira(total)}</span>
              </div>
            </div>

            <div className="ac-panel-section space-y-2">
              <p className="ac-panel-label text-[10px] font-bold uppercase tracking-wider text-[var(--ac-muted)]">Line Items</p>
              {lines.length === 0 ? (
                <p className="ac-panel-empty text-xs text-[var(--ac-muted)] italic">
                  No line items yet. Propose or approve changes in chat to populate this document.
                </p>
              ) : (
                <ul className="ac-lines divide-y divide-[var(--ac-line)] border border-[var(--ac-line)] rounded-xl bg-[var(--ac-surface)] overflow-hidden">
                  {lines.map((line, idx) => (
                    <li key={line.id ?? idx} className="ac-line p-2.5 flex justify-between items-center text-xs">
                      <div className="ac-line-id min-w-0 pr-2">
                        <p className="font-medium text-[var(--ac-ink)] truncate">{line.description}</p>
                        <span className="text-[11px] text-[var(--ac-muted)]">
                          {line.quantity} × {formatNaira(line.unitPrice)}
                        </span>
                      </div>
                      <strong className="font-semibold text-[var(--ac-ink)] shrink-0">
                        {formatNaira(line.quantity * line.unitPrice)}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {vat > 0 ? (
              <div className="ac-panel-section border-t border-[var(--ac-line)] pt-3 text-xs space-y-1">
                <div className="flex justify-between text-[var(--ac-muted)]">
                  <span>Subtotal</span>
                  <span>{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[var(--ac-muted)]">
                  <span>VAT (7.5%)</span>
                  <span>{formatNaira(vat)}</span>
                </div>
              </div>
            ) : null}

            {proposal && proposal.status === 'pending_approval' ? (
              <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Clock className="size-4 shrink-0" />
                <span>Waiting for your review on Gate 1 card in chat.</span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
