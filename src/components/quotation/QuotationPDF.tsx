import InvoicePDF from '@/components/InvoicePDF'
import type { InvoiceItem } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'

type QuotationPdfProps = {
  quotation: Quotation
  items: InvoiceItem[]
  client?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
}

export default function QuotationPDF({
  quotation,
  items,
  client = null,
  settings = null,
}: QuotationPdfProps) {
  const pdfDocument = {
    ...quotation,
    invoice_number: quotation.quotation_number || '',
    invoice_title: quotation.quotation_title || '',
    document_type: 'QUOTATION',
    due_date: quotation.valid_until || null,
    payment_terms: undefined,
    custom_payment_terms: undefined,
  }

  return (
    <InvoicePDF
      invoice={pdfDocument}
      items={items}
      client={client}
      settings={settings || {}}
    />
  )
}
