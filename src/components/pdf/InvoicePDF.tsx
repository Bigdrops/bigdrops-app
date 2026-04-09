import QuotationPDF from '@/components/quotation/QuotationPDF'
import RefrensPdfDocument from '@/components/pdf/refrens/RefrensPdfDocument'
import { mapInvoiceToPdfModel } from '@/components/pdf/refrens/mapInvoiceToPdfModel'
import type { Invoice, InvoiceItem } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'
import type { DocumentResult } from '@/lib/Calculations'
import type { PdfBankAccount, PdfOutputState, RefrensTemplateId } from '@/components/pdf/refrens/types'

type InvoicePdfProps = {
  template?: 'standard' | RefrensTemplateId
  document: Invoice | Quotation
  items: InvoiceItem[]
  client?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  computedResult: DocumentResult & {
    grandTotal?: number
    cashReceived?: number
    settledTotal?: number
    balanceDue?: number
  }
  bankAccounts?: PdfBankAccount[]
  pdfOutput?: PdfOutputState
  signatory?: Record<string, unknown> | null
}

function isStandardTemplate(template?: string): template is 'standard' {
  return template === 'standard'
}

export default function InvoicePDF({
  template = 'classic',
  document,
  items,
  client = null,
  settings = null,
  computedResult,
  bankAccounts = [],
  pdfOutput,
  signatory = null,
}: InvoicePdfProps) {
  if (isStandardTemplate(template)) {
    return (
      <QuotationPDF
        document={document as Quotation}
        items={items}
        client={client}
        settings={settings}
        computedResult={computedResult}
      />
    )
  }

  const model = mapInvoiceToPdfModel({
    templateId: template,
    document: document as Invoice,
    items,
    client,
    settings,
    computedResult,
    bankAccounts,
    pdfOutput,
    signatory,
  })

  return <RefrensPdfDocument model={model} />
}
