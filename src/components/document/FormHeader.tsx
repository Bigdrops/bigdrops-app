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
  onOpenClientPicker: () => void
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
  onOpenClientPicker,
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
            onClick={onOpenClientPicker}
            className="flex w-full items-center gap-3 rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-3 text-left transition hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)]"
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
            <ChevronRight className="h-4.5 w-4.5 text-[var(--bd-text4)]" />
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
                    onChange={(event) => updateInvoice('invoice_number', event.target.value)}
                    className={`${fieldCls} pl-9 font-mono text-[13px] font-bold tracking-tight text-[var(--bd-text)]`}
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
          </div>
        </div>
      </div>
    </div>
  )
}
