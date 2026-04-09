import QuotationPDF from '@/components/quotation/QuotationPDF'
import RefrensPdfDocument from '@/components/pdf/refrens/RefrensPdfDocument'
import { mapQuotationToPdfModel } from '@/components/pdf/refrens/mapQuotationToPdfModel'
import type { InvoiceItem } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'
import type { DocumentResult } from '@/lib/Calculations'
import type { PdfBankAccount, PdfOutputState, RefrensTemplateId } from '@/components/pdf/refrens/types'

type QuotationTemplatePdfProps = {
  template?: 'quotation' | RefrensTemplateId
  document: Quotation
  items: InvoiceItem[]
  client?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  computedResult: DocumentResult
  bankAccounts?: PdfBankAccount[]
  pdfOutput?: PdfOutputState
  designPreset?: unknown
}

export default function QuotationTemplatePDF({
  template = 'quotation',
  document,
  items,
  client = null,
  settings = null,
  computedResult,
  bankAccounts = [],
  pdfOutput,
  designPreset,
}: QuotationTemplatePdfProps) {
  if (template === 'quotation') {
    return (
      <QuotationPDF
        document={document}
        items={items}
        client={client}
        settings={settings}
        computedResult={computedResult}
        designPreset={designPreset as never}
      />
    )
  }

  const model = mapQuotationToPdfModel({
    templateId: template,
    document,
    items,
    client,
    settings,
    computedResult,
    bankAccounts,
    pdfOutput,
  })

  return <RefrensPdfDocument model={model} />
}
