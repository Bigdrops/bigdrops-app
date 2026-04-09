import type { DocumentResult } from '@/lib/Calculations'
import type { ColumnConfig, InvoiceItem } from '@/domain/invoice'

export type RefrensTemplateId = 'classic' | 'minimal' | 'modern' | 'elegant' | 'bold'

export type PdfBankAccount = {
  id?: string | null
  bank_name?: string | null
  account_name?: string | null
  account_number?: string | null
  sort_code?: string | null
  is_default?: boolean | null
}

export type PdfOutputState = {
  showBankDetails?: boolean
  bankAccountId?: string | null
  showFooter?: boolean
  showTagline?: boolean
  showBalanceDue?: boolean
}

export type DocumentMetaEntry = {
  label: string
  value: string
}

export type DocumentParty = {
  label: string
  name: string
  lines: string[]
}

export type AttachmentLink = {
  label: string
  url: string
}

export type RenderableSupportBlock =
  | { type: 'bank'; title: string; rows: Array<{ label: string; value: string }> }
  | { type: 'text'; title: string; text: string }
  | { type: 'links'; title: string; links: AttachmentLink[] }
  | { type: 'signature'; title: string; name?: string; role?: string; signatureUrl?: string }

export type RefrensPdfModel = {
  templateId: RefrensTemplateId
  documentLabel: string
  documentNumber: string
  title?: string
  logoUrl?: string
  companyName: string
  companyTagline?: string
  metaEntries: DocumentMetaEntry[]
  leftParty: DocumentParty
  rightParty: DocumentParty
  items: InvoiceItem[]
  computedResult: DocumentResult & {
    grandTotal?: number
    cashReceived?: number
    settledTotal?: number
    balanceDue?: number
  }
  columnConfig: ColumnConfig[]
  descriptionExtras: (item: InvoiceItem) => string[]
  supportBlocks: RenderableSupportBlock[]
  footerText?: string
  amountInWords?: string
  totalLabel: string
  showBalanceDue: boolean
}

export type MapperContext<TDocument> = {
  templateId: RefrensTemplateId
  document: TDocument
  items: InvoiceItem[]
  client?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  computedResult: RefrensPdfModel['computedResult']
  pdfOutput?: PdfOutputState
  bankAccounts?: PdfBankAccount[]
  signatory?: Record<string, unknown> | null
}
