import { FileText } from 'lucide-react'

import {
  invoiceTotal,
  lineAmount,
  naira,
  type ChangeCard,
  type InvoiceState,
} from './assistant-chat-script'

export type PendingCard = { messageId: string; card: ChangeCard }

/**
 * The living document panel — a read-only structured preview of the invoice
 * state. It shows client, due date, running total, and accepted line items.
 *
 * Approval cards are presented in the conversation thread only. This panel
 * does not duplicate them — doing so would create two simultaneous decision
 * surfaces for the same action.
 *
 * The same component is used in: fold-open split, tablet drawer,
 * desktop artifact column, and phone bottom sheet.
 * Every number comes from the invoice state, never from assistant prose.
 */
export function InvoicePanel({
  invoice,
  pending: _pending,
  onDecide: _onDecide,
}: {
  invoice: InvoiceState
  /** Reserved for future use — pending count is surfaced as a status indicator only. */
  pending: PendingCard[]
  onDecide: (messageId: string, cardId: string, accepted: boolean) => void
}) {
  const total = invoiceTotal(invoice)
  const pendingCount = _pending.length

  return (
    <div className="ac-panel">
      <div className="ac-panel-head">
        <span className="ac-panel-icon" aria-hidden="true">
          <FileText className="size-3.5" />
        </span>
        <div className="ac-panel-title">
          <p>Invoice</p>
          <span>{invoice.number}</span>
        </div>
        <span className="ac-pill" data-state={invoice.filed ? 'filed' : 'draft'}>
          {invoice.filed ? 'Filed' : 'Draft'}
        </span>
      </div>

      <div className="ac-panel-scroll">
        <div className="ac-doc">
          <div className="ac-doc-row">
            <span>Client</span>
            <strong>{invoice.client ?? 'Not set'}</strong>
          </div>
          <div className="ac-doc-row">
            <span>Due</span>
            <strong>{invoice.dueDate ?? 'Not set'}</strong>
          </div>
          <div className="ac-doc-total">
            <span>Total</span>
            <strong>{naira(total)}</strong>
          </div>
        </div>

        <div className="ac-panel-section">
          <p className="ac-panel-label">Lines</p>
          {invoice.lines.length === 0 ? (
            <p className="ac-panel-empty">No line items yet. Accept cards in the conversation to populate the invoice.</p>
          ) : (
            <ul className="ac-lines">
              {invoice.lines.map((line) => (
                <li key={line.id} className="ac-line">
                  <div className="ac-line-id">
                    <p>{line.description}</p>
                    <span>
                      {line.quantity} × {naira(line.unitPrice)}
                    </span>
                  </div>
                  <strong>{naira(lineAmount(line))}</strong>
                </li>
              ))}
            </ul>
          )}

          {invoice.delivery > 0 ? (
            <div className="ac-line ac-line--extra">
              <div className="ac-line-id">
                <p>Delivery</p>
                <span>Extra charge</span>
              </div>
              <strong>{naira(invoice.delivery)}</strong>
            </div>
          ) : null}
        </div>

        {pendingCount > 0 ? (
          <div className="ac-panel-section">
            <p className="ac-panel-label ac-panel-label--pending">
              {pendingCount === 1 ? '1 decision in conversation' : `${pendingCount} decisions in conversation`}
            </p>
            <p className="ac-panel-empty">
              Review the pending {pendingCount === 1 ? 'card' : 'cards'} above in the chat to continue.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
