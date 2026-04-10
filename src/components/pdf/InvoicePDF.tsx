import TemplatePdfLayout from '@/components/pdf/templates/TemplatePdfLayout'
import { mapInvoiceToPdfModel } from '@/components/pdf/templates/mapInvoiceToPdfModel'
import type { Invoice, InvoiceItem } from '@/domain/invoice'
import type { DocumentResult } from '@/lib/Calculations'
import type { PdfBankAccount, PdfOutputState, RefrensTemplateId } from '@/components/pdf/templates/types'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'

type InvoicePdfProps = {
  template?: RefrensTemplateId
  document: Invoice
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
  designPreset?: PdfDesignPreset
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
  designPreset,
}: InvoicePdfProps) {
  const model = mapInvoiceToPdfModel({
    templateId: template,
    document,
    items,
    client,
    settings,
    computedResult,
    bankAccounts,
    pdfOutput,
    signatory,
    designPreset,
  })

  return <TemplatePdfLayout model={model} />
}
 
