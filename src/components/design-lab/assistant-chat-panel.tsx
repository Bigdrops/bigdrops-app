import { FileText, KeyRound, Settings2, SlidersHorizontal } from 'lucide-react'

import {
  invoiceTotal,
  lineAmount,
  naira,
  type ChangeCard,
  type InvoiceState,
} from './assistant-chat-script'
import { ChangeCardView } from './assistant-chat-parts'
import { maskedKey, type ProviderEntry } from './assistant-chat-providers'

export type PendingCard = { messageId: string; card: ChangeCard }

/**
 * The living document panel. It is the same component in the fold-open split,
 * the tablet drawer, the desktop artifact column, and the phone bottom sheet.
 * Every number comes from the invoice state, never from assistant prose.
 */
export function InvoicePanel({
  invoice,
  pending,
  provider,
  onDecide,
  onManageProviders,
}: {
  invoice: InvoiceState
  pending: PendingCard[]
  provider: ProviderEntry | undefined
  onDecide: (messageId: string, cardId: string, accepted: boolean) => void
  onManageProviders: () => void
}) {
  const total = invoiceTotal(invoice)

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
            <p className="ac-panel-empty">No line items yet. They appear here as you accept cards.</p>
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

        <div className="ac-panel-section">
          <p className="ac-panel-label">
            {pending.length > 0 ? `Waiting on you · ${pending.length}` : 'No open changes'}
          </p>
          {pending.length === 0 ? (
            <p className="ac-panel-empty">Accepted changes apply here at once. Rejected changes never touch the form.</p>
          ) : (
            <div className="ac-panel-cards">
              {pending.map((entry) => (
                <ChangeCardView
                  key={entry.card.id}
                  card={entry.card}
                  compact
                  onDecide={(accepted) => onDecide(entry.messageId, entry.card.id, accepted)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="ac-panel-section">
          <p className="ac-panel-label">Provider</p>
          <div className="ac-provider-card">
            <span className="ac-menu-mark" aria-hidden="true">
              {provider?.short ?? '—'}
            </span>
            <div className="ac-provider-id">
              <p>{provider?.label ?? 'No provider'}</p>
              <span>{provider?.model || 'Add a key to start'}</span>
            </div>
            <button
              type="button"
              className="ac-icon-btn"
              aria-label="Provider settings"
              onClick={onManageProviders}
            >
              <Settings2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="ac-panel-action" onClick={onManageProviders}>
            <KeyRound className="size-3.5" aria-hidden="true" />
            {provider?.key ? `Key ${maskedKey(provider.key)}` : 'Paste an API key'}
            <SlidersHorizontal className="size-3.5 ac-panel-action-end" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
