import { ChevronDown, UserRound, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DateField } from '@/components/ui/date-field'
import { DocumentSectionHead } from './DocumentFormPresentation'

interface FormHeaderProps {
  modeLabel: string
  title: string
  onOpenActionsSheet: () => void
  invoice: any
  invoiceTitle: string
  setInvoiceTitle: (val: string) => void
  updateInvoice: (field: string, value: any) => void
  isQuotation: boolean
  isEdit?: boolean
  onOpenClientPicker: () => void
  onLockedFieldClick?: (field: 'client' | 'invoice_number') => void
  customFields: Array<{ id?: string; label?: string; value?: string }>
  onAddHeaderField: () => void
  onUpdateHeaderField: (id: string | undefined, field: 'label' | 'value', value: string) => void
  onRemoveHeaderField: (id: string | undefined) => void
}

export function FormHeader({
  onOpenActionsSheet,
  invoice,
  invoiceTitle,
  setInvoiceTitle,
  updateInvoice,
  isQuotation,
  isEdit = false,
  onOpenClientPicker,
  onLockedFieldClick,
  customFields,
  onAddHeaderField,
  onUpdateHeaderField,
  onRemoveHeaderField,
}: FormHeaderProps) {
  return (
    <section className="cps-sec">
      <DocumentSectionHead
        number="1."
        title="Document details"
        meta={invoice.invoice_number || (isQuotation ? 'New quotation' : 'New invoice')}
      />
      <div className="cps-dgrid">
        <div className="full">
          <span className="cps-label">Client <span className="cps-req">*</span></span>
          <button
            type="button"
            className={`cps-clientpick ${invoice.client_name ? 'filled' : ''}`}
            onClick={isEdit ? () => onLockedFieldClick?.('client') : onOpenClientPicker}
            aria-label={invoice.client_name ? `Client ${invoice.client_name}` : 'Select a client'}
          >
            <span className="ci"><UserRound /></span>
            <span className="ct">
              <b>{invoice.client_name || 'Select a client'}</b>
              <small>Bill to · Client</small>
            </span>
            {invoice.client_name && !isEdit ? (
              <span
                role="button"
                tabIndex={0}
                className="cx"
                aria-label="Clear client"
                onClick={(event) => {
                  event.stopPropagation()
                  updateInvoice('client_id', '')
                  updateInvoice('client_name', '')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    updateInvoice('client_id', '')
                    updateInvoice('client_name', '')
                  }
                }}
              >
                <X />
              </span>
            ) : null}
            <span className="chev"><ChevronDown /></span>
          </button>
        </div>

        <label className="full">
          <span className="cps-label">{isQuotation ? 'Quotation Title' : 'Invoice Title'}</span>
          <Input
            value={invoiceTitle || ''}
            onChange={(event) => setInvoiceTitle(event.target.value)}
            placeholder={isQuotation ? 'e.g. Website Overhaul' : 'e.g. Monthly Maintenance'}
            className="cps-field"
          />
        </label>

        <label>
          <span className="cps-label">{isQuotation ? 'Quotation No.' : 'Invoice No.'}</span>
          {isEdit ? (
            <input
              value={invoice.invoice_number || ''}
              readOnly
              onClick={() => onLockedFieldClick?.('invoice_number')}
              className="cps-field mono"
              aria-label={isQuotation ? 'Quotation No.' : 'Invoice No.'}
            />
          ) : (
            <Input
              value={invoice.invoice_number || ''}
              onChange={(event) => updateInvoice('invoice_number', event.target.value)}
              className="cps-field mono"
            />
          )}
        </label>

        <label>
          <span className="cps-label">PO Number</span>
          <Input
            value={invoice.po_number || ''}
            onChange={(event) => updateInvoice('po_number', event.target.value)}
            placeholder="Optional"
            className="cps-field"
          />
        </label>

        <label>
          <span className="cps-label">{isQuotation ? 'Quotation Date' : 'Issue Date'}</span>
          <DateField
            label={isQuotation ? 'Quotation Date' : 'Issue Date'}
            value={invoice.issue_date || ''}
            onChange={(next) => updateInvoice('issue_date', next)}
            className="cps-field"
          />
        </label>

        <label>
          <span className="cps-label">{isQuotation ? 'Valid Until' : 'Due Date'}</span>
          <DateField
            label={isQuotation ? 'Valid Until' : 'Due Date'}
            value={invoice.due_date || ''}
            onChange={(next) => updateInvoice('due_date', next)}
            className="cps-field"
          />
        </label>

        <div className="full">
          <span className="cps-label">Header Fields</span>
          {customFields.length === 0 ? (
            <button
              type="button"
              onClick={onAddHeaderField}
              className="cps-gadd"
            >
              + Add header field
            </button>
          ) : (
            <>
              <div className="cps-fgrid">
                {customFields.map((field) => (
                  <div key={field.id} className="cps-cfield" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        value={field.label || ''}
                        onChange={(event) => onUpdateHeaderField(field.id, 'label', event.target.value)}
                        placeholder="Label"
                        aria-label="Header field label"
                        className="cps-field"
                      />
                      <Input
                        value={field.value || ''}
                        onChange={(event) => onUpdateHeaderField(field.id, 'value', event.target.value)}
                        placeholder="Value"
                        aria-label="Header field value"
                        className="cps-field"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveHeaderField(field.id)}
                        className="cps-rbtn"
                        aria-label="Remove header field"
                      >
                        <X />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onAddHeaderField}
                className="cps-gadd"
                style={{ marginTop: 8 }}
              >
                + Add header field
              </button>
            </>
          )}
        </div>
      </div>
      <button type="button" onClick={onOpenActionsSheet} className="sr-only">Open document actions</button>
    </section>
  )
}
