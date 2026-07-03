import { BriefcaseBusiness, ChevronRight, Hash, MoreHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  fieldCls,
  labelCls,
  SectionLabel,
} from '@/components/invoice/mobile/mobileFormPrimitives'

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
  customFields: Array<{ id?: string; label?: string; value?: string }>
  onAddHeaderField: () => void
  onUpdateHeaderField: (id: string | undefined, field: 'label' | 'value', value: string) => void
  onRemoveHeaderField: (id: string | undefined) => void
}

export function FormHeader({
  modeLabel,
  title,
  onOpenActionsSheet,
  invoice,
  invoiceTitle,
  setInvoiceTitle,
  updateInvoice,
  isQuotation,
  isEdit = false,
  onOpenClientPicker,
  customFields,
  onAddHeaderField,
  onUpdateHeaderField,
  onRemoveHeaderField,
}: FormHeaderProps) {
  return (
    <div className="border-b border-[var(--bd-border-soft)] pb-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bd-indigo-border)] bg-[var(--bd-indigo-bg)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--bd-indigo)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--bd-indigo)]" />
            {isQuotation ? 'Quotation' : 'Invoice'}
          </div>
          <button
            type="button"
            onClick={onOpenActionsSheet}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--bd-radius)] border border-[var(--bd-border)] bg-transparent text-[var(--bd-text2)] transition hover:bg-[var(--bd-bg2)]"
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>
        </div>

        <SectionLabel color="#0f172a">{isQuotation ? 'Quotation Details' : 'Document Details'}</SectionLabel>

        <div>
          <button
            type="button"
            onClick={isEdit ? undefined : onOpenClientPicker}
            disabled={isEdit}
            className={`flex w-full items-center gap-3 rounded-[var(--bd-radius-lg)] border px-4 py-3 text-left transition ${
              isEdit
                ? 'border-[var(--bd-border)] bg-[var(--bd-bg2)] opacity-70 cursor-not-allowed'
                : 'border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)]'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bd-bg2)] text-[var(--bd-text3)]">
              <BriefcaseBusiness className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">Client</div>
              <div className="mt-0.5 truncate text-[14px] font-bold text-[var(--bd-text)]">
                {invoice.client_name || 'Select a client'}
              </div>
            </div>
            {!isEdit && <ChevronRight className="h-4.5 w-4.5 text-[var(--bd-text4)]" />}
          </button>
        </div>

        <div className="space-y-4">
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">{modeLabel}</div>
            <h1 className="mt-1 text-[25px] font-black leading-tight tracking-tight text-[var(--bd-text)]">{title}</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>{isQuotation ? 'Quotation Title' : 'Invoice Title'}</label>
              <Input
                value={invoiceTitle || ''}
                onChange={(event) => setInvoiceTitle(event.target.value)}
                placeholder={isQuotation ? 'e.g. Website Overhaul' : 'e.g. Monthly Maintenance'}
                className={`${fieldCls} h-12 text-[16px] font-bold`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{isQuotation ? 'Quotation No.' : 'Invoice No.'}</label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bd-text4)]" />
                  <Input
                    value={invoice.invoice_number || ''}
                    readOnly={isEdit}
                    onChange={isEdit ? undefined : (event) => updateInvoice('invoice_number', event.target.value)}
                    className={`${fieldCls} pl-9 font-mono text-[13px] font-bold tracking-tight text-[var(--bd-text)] ${isEdit ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>PO Number</label>
                <Input
                  value={invoice.po_number || ''}
                  onChange={(event) => updateInvoice('po_number', event.target.value)}
                  placeholder="Optional"
                  className={fieldCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{isQuotation ? 'Quotation Date' : 'Issue Date'}</label>
                <Input
                  type="date"
                  value={invoice.issue_date || ''}
                  onChange={(event) => updateInvoice('issue_date', event.target.value)}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>{isQuotation ? 'Valid Until' : 'Due Date'}</label>
                <Input
                  type="date"
                  value={invoice.due_date || ''}
                  onChange={(event) => updateInvoice('due_date', event.target.value)}
                  className={fieldCls}
                />
              </div>
            </div>

            <div className="border-t border-[var(--bd-border-soft)] pt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--bd-text3)]">
                  Header Fields
                </div>
                <button
                  type="button"
                  onClick={onAddHeaderField}
                  className="rounded-[6px] px-2 py-1 text-[11px] font-bold text-[var(--bd-indigo)] transition hover:bg-[var(--bd-indigo-bg)]"
                >
                  Add field
                </button>
              </div>

              <div className="space-y-2">
                {customFields.length === 0 ? (
                  <button
                    type="button"
                    onClick={onAddHeaderField}
                    className="w-full rounded-[var(--bd-radius)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] px-3 py-2 text-left text-[12px] font-medium text-[var(--bd-text3)] transition hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)] hover:text-[var(--bd-indigo)]"
                  >
                    Add header field
                  </button>
                ) : (
                  customFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        value={field.label || ''}
                        onChange={(event) => onUpdateHeaderField(field.id, 'label', event.target.value)}
                        placeholder="Label"
                        className={`${fieldCls} h-10 flex-1 bg-[var(--bd-bg2)] text-[13px] font-semibold text-[var(--bd-text2)]`}
                      />
                      <Input
                        value={field.value || ''}
                        onChange={(event) => onUpdateHeaderField(field.id, 'value', event.target.value)}
                        placeholder="Value"
                        className={`${fieldCls} h-10 flex-[1.5] text-[13px]`}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveHeaderField(field.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-transparent bg-transparent text-[var(--bd-text4)] transition hover:bg-[var(--bd-rose-bg)] hover:text-[var(--bd-rose)]"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
