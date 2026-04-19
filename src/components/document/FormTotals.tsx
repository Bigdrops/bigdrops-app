import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import {
  fieldCls,
  formatCurrency,
  labelCls,
  pageCardCls,
  SectionLabel,
} from '@/components/invoice/mobile/mobileFormPrimitives'
import { Input } from '@/components/ui/input'

interface FormTotalsProps {
  invoice: any
  updateInvoice: (field: string, value: any) => void
  summaryRows: any[]
  totalPayable: number
  amountInWords?: string
}

export function FormTotals({
  invoice,
  updateInvoice,
  summaryRows,
  totalPayable,
  amountInWords,
}: FormTotalsProps) {
  const [showVatAdjust, setShowVatAdjust] = useState(false)

  return (
    <div>
      <SectionLabel color="#059669">Totals Summary</SectionLabel>
      <div className={`${pageCardCls} p-5`}>
        <div className="space-y-2.5">
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between gap-3 text-[14px] ${
                row.strong ? 'border-t border-[var(--bd-border-soft)] pt-3 mt-1' : ''
              }`}
            >
              <span className={row.strong ? 'font-bold text-[var(--bd-text)]' : 'font-medium text-[var(--bd-text2)]'}>
                {row.label}
              </span>
              <span
                className={`font-mono font-bold ${
                  row.negative ? 'text-[var(--bd-rose)]' : 'text-[var(--bd-text)]'
                }`}
              >
                {row.negative ? '-' : ''}
                {formatCurrency(Math.abs(Number(row.value || 0)))}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowVatAdjust(!showVatAdjust)}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--bd-border)] bg-[var(--bd-surface)] px-3 text-[11px] font-extrabold text-[var(--bd-text2)] transition hover:bg-[var(--bd-bg2)]"
          >
            {showVatAdjust ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Adjust Global VAT
          </button>
          {showVatAdjust && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-1">
              <label className={labelCls}>VAT Rate (%)</label>
              <Input
                type="number"
                min="0"
                value={Number(invoice.vat || 0)}
                onChange={(e) => updateInvoice('vat', Number(e.target.value))}
                className={fieldCls}
              />
            </div>
          )}
        </div>

        {amountInWords && (
          <div className="mt-6 rounded-[var(--bd-radius)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-bg)] p-3 text-[12px] font-medium italic text-[var(--bd-text2)] leading-relaxed">
            {amountInWords}
          </div>
        )}

        <div className="mt-8 border-t border-[var(--bd-text)] pt-5">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-extrabold text-[var(--bd-text)] uppercase tracking-wider">Total Payable</span>
            <span className="font-serif text-[28px] font-bold text-[var(--bd-text)]">
              {formatCurrency(totalPayable)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-end gap-1.5 opacity-40">
            <span className="h-1 w-1 rounded-full bg-[var(--bd-text)]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Final Amount Due</span>
          </div>
        </div>
      </div>
    </div>
  )
}
