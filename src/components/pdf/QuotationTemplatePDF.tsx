import TemplatePdfLayout from '@/components/pdf/templates/TemplatePdfLayout'
import { mapQuotationToPdfModel } from '@/components/pdf/templates/mapQuotationToPdfModel'
import type { InvoiceItem } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'
import type { DocumentResult } from '@/lib/Calculations'
import type { PdfBankAccount, PdfOutputState, RefrensTemplateId } from '@/components/pdf/templates/types'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'

type QuotationTemplatePdfProps = {
  template?: RefrensTemplateId
  document: Quotation
  items: InvoiceItem[]
  client?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  computedResult: DocumentResult
  bankAccounts?: PdfBankAccount[]
  pdfOutput?: PdfOutputState
  designPreset?: PdfDesignPreset
}

export default function QuotationTemplatePDF({
  template = 'minimal',
  document,
  items,
  client = null,
  settings = null,
  computedResult,
  bankAccounts = [],
  pdfOutput,
  designPreset,
}: QuotationTemplatePdfProps) {
  const model = mapQuotationToPdfModel({
    templateId: template,
    document,
    items,
    client,
    settings,
    computedResult,
    bankAccounts,
    pdfOutput,
    designPreset,
  })

  return <TemplatePdfLayout model={model} />
}
