import { FileText, CheckCircle2, Clock } from 'lucide-react'
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
 * InvoicePanel — Living Document Artifact Panel
 * Displays a structured, read-only preview of the active document draft.
 * Derived from active proposals or context record. Numbers are computed
 * authoritatively by Calculations.ts, never assistant prose.
 */
export function InvoicePanel({
  proposal,
  fallbackDocument,
}: {
  proposal?: BoluProposal | null
  fallbackDocument?: DocumentArtifactState | null
}) {
  // Derive artifact state from live proposal if present, else fallback
  const isCreate = proposal?.operationType === 'create-document'
  const isFiled = proposal?.status === 'persisted' || fallbackDocument?.filed

  const number = isCreate
    ? (proposal?.persistedId || proposal?.candidateNumber || 'INV-DRAFT')
    : (proposal?.targetDocumentNumber || fallbackDocument?.number || 'No document selected')

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
    <div className="ac-panel">
      <div className="ac-panel-head">
        <span className="ac-panel-icon" aria-hidden="true">
          <FileText className="size-3.5" />
        </span>
        <div className="ac-panel-title">
          <p>Document Artifact</p>
          <span>{number}</span>
        </div>
        <span className="ac-pill" data-state={isFiled ? 'filed' : 'draft'}>
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
      </div>

      <div className="ac-panel-scroll">
        <div className="ac-doc">
          <div className="ac-doc-row">
            <span>Client</span>
            <strong>{client}</strong>
          </div>
          <div className="ac-doc-row">
            <span>Due Date</span>
            <strong>{dueDate}</strong>
          </div>
          <div className="ac-doc-total">
            <span>Authoritative Total</span>
            <strong>{formatNaira(total)}</strong>
          </div>
        </div>

        <div className="ac-panel-section">
          <p className="ac-panel-label">Line Items</p>
          {lines.length === 0 ? (
            <p className="ac-panel-empty">
              No line items yet. Propose or approve changes in chat to populate this document.
            </p>
          ) : (
            <ul className="ac-lines divide-y divide-[var(--ac-line)]">
              {lines.map((line, idx) => (
                <li key={line.id ?? idx} className="ac-line py-2 flex justify-between items-center text-xs">
                  <div className="ac-line-id">
                    <p className="font-medium text-[var(--ac-ink)]">{line.description}</p>
                    <span className="text-[11px] text-[var(--ac-muted)]">
                      {line.quantity} × {formatNaira(line.unitPrice)}
                    </span>
                  </div>
                  <strong className="font-semibold text-[var(--ac-ink)]">
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
          <div className="mt-4 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs text-amber-600 flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            <span>Waiting for your approval on Gate 1 card in chat.</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
