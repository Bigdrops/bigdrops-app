import { ChevronDown, UserRound, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DateField } from '@/components/ui/date-field'
import { DocumentSectionHead } from './DocumentFormPresentation'
import type { DocumentDescriptor } from './documentDescriptor'

interface FormHeaderProps {
  modeLabel: string
  title: string
  onOpenActionsSheet: () => void
  invoice: any
  invoiceTitle: string
  setInvoiceTitle: (val: string) => void
  updateInvoice: (field: string, value: any) => void
  descriptor: DocumentDescriptor
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
  descriptor,
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
        meta={invoice.invoice_number || descriptor.unsavedMeta}
      />
      <div className="cps-dgrid">
        <div className="full">
          <span className="cps-label">{descriptor.party.term} <span className="cps-req">*</span></span>
          <button
            type="button"
            className={`cps-clientpick ${invoice[descriptor.party.nameField] ? 'filled' : ''}`}
            onClick={isEdit ? () => onLockedFieldClick?.('client') : onOpenClientPicker}
            aria-label={
              invoice[descriptor.party.nameField]
                ? `${descriptor.party.selectedAriaPrefix} ${invoice[descriptor.party.nameField]}`
                : descriptor.party.emptyLabel
            }
          >
            <span className="ci"><UserRound /></span>
            <span className="ct">
              <b>{invoice[descriptor.party.nameField] || descriptor.party.emptyLabel}</b>
              <small>{descriptor.party.roleHint}</small>
            </span>
            {invoice[descriptor.party.nameField] && !isEdit ? (
              <span
                role="button"
                tabIndex={0}
                className="cx"
                aria-label={descriptor.party.clearAriaLabel}
                onClick={(event) => {
                  event.stopPropagation()
                  updateInvoice(descriptor.party.idField, '')
                  updateInvoice(descriptor.party.nameField, '')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    updateInvoice(descriptor.party.idField, '')
                    updateInvoice(descriptor.party.nameField, '')
                  }
                }}
              >
                <X />
              </span>
            ) : null}
            <span className="chev"><ChevronDown /></span>
          </button>
        </div>

        {!descriptor.hiddenSections?.titleField ? (
          <label className="full">
            <span className="cps-label">{descriptor.titleFieldLabel}</span>
            <Input
              value={invoiceTitle || ''}
              onChange={(event) => setInvoiceTitle(event.target.value)}
              placeholder={descriptor.titleFieldPlaceholder}
              className="cps-field"
            />
          </label>
        ) : null}

        <label>
          <span className="cps-label">{descriptor.numberLabel}</span>
          {isEdit ? (
            <input
              value={invoice.invoice_number || ''}
              readOnly
              onClick={() => onLockedFieldClick?.('invoice_number')}
              className="cps-field mono"
              aria-label={descriptor.numberLabel}
            />
          ) : (
            <Input
              value={invoice.invoice_number || ''}
              onChange={(event) => updateInvoice('invoice_number', event.target.value)}
              className="cps-field mono"
            />
          )}
        </label>

        {!descriptor.hiddenSections?.clientPoNumberField ? (
          <label>
            <span className="cps-label">PO Number</span>
            <Input
              value={invoice.po_number || ''}
              onChange={(event) => updateInvoice('po_number', event.target.value)}
              placeholder="Optional"
              className="cps-field"
            />
          </label>
        ) : null}

        <label>
          <span className="cps-label">{descriptor.issueDateLabel}</span>
          <DateField
            label={descriptor.issueDateLabel}
            value={invoice.issue_date || ''}
            onChange={(next) => updateInvoice('issue_date', next)}
            className="cps-field"
          />
        </label>

        {!descriptor.hiddenSections?.dueDateField ? (
          <label>
            <span className="cps-label">{descriptor.dueDateLabel}</span>
            <DateField
              label={descriptor.dueDateLabel}
              value={invoice.due_date || ''}
              onChange={(next) => updateInvoice('due_date', next)}
              className="cps-field"
            />
          </label>
        ) : null}

        {!descriptor.hiddenSections?.headerFieldsSection ? (
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
        ) : null}
      </div>
      <button type="button" onClick={onOpenActionsSheet} className="sr-only">Open document actions</button>
    </section>
  )
}
