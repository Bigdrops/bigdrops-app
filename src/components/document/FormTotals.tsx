import {
  formatCurrency,
} from '@/components/invoice/mobile/mobileFormPrimitives'
import { DocumentSectionHead } from './DocumentFormPresentation'

interface FormTotalsProps {
  invoice: any
  updateInvoice: (field: string, value: any) => void
  summaryRows: any[]
  totalPayable: number
  amountInWords?: string
  finalLabel?: string
}

export function FormTotals({
  summaryRows,
  totalPayable,
  amountInWords,
  finalLabel = 'Grand Total',
}: FormTotalsProps) {
  return (
    <section className="cps-sec">
      <DocumentSectionHead number="4." title="Totals" meta={formatCurrency(totalPayable)} />
      <div className="cps-totals">
        <div className="cps-close-top" aria-hidden="true"><i /></div>
        <div className="cps-close-eyebrow">Invoice Summary</div>
        <div className="cps-totals-grid">
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className={`cps-sumline${row.negative ? ' neg' : ''}`}
            >
              <span>{row.label}</span>
              <b>
                {row.negative ? '-' : ''}
                {formatCurrency(Math.abs(Number(row.value || 0)))}
              </b>
            </div>
          ))}
        </div>

        {amountInWords && (
          <div className="cps-words">
            {amountInWords}
          </div>
        )}

        <div className="cps-sumtotal">
          <span>
            <small>{finalLabel}</small>
            <b>{formatCurrency(totalPayable)}</b>
          </span>
        </div>
      </div>
    </section>
  )
}
