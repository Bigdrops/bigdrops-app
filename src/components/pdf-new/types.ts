export type PdfDocumentKind = 'invoice' | 'quotation'

export type PdfDocumentIdentity = {
  id: string
  kind: PdfDocumentKind
  number: string
  title?: string | null
  issueDate?: string | null
  dueDate?: string | null
  validUntil?: string | null
  status?: string | null
  currency?: string | null
}

export type PdfParty = {
  name: string
  label?: string | null
  taxId?: string | null
  attention?: string | null
  email?: string | null
  phone?: string | null
  addressLines?: string[]
}

export type PdfLineItem = {
  id: string
  description: string
  detail?: string | null
  quantity?: number | null
  unit?: string | null
  unitPrice?: number | null
  amount: number
  notes?: string | null
  metadata?: Record<string, string | number | boolean | null>
}

export type PdfTotalRow = {
  label: string
  amount: number
  emphasis?: boolean
}

export type PdfTotals = {
  subtotal?: number | null
  adjustments?: PdfTotalRow[]
  total: number
  paid?: number | null
  balance?: number | null
}

export type PdfTextSection = {
  title: string
  content: string
  format?: 'text' | 'html'
}

export type PdfSignature = {
  name: string
  role?: string | null
  imageUrl?: string | null
  signedAt?: string | null
}

export type PdfLogo = {
  imageUrl?: string | null
  altText?: string | null
}

export type PdfBankDetails = {
  bankName?: string | null
  accountName?: string | null
  accountNumber?: string | null
  sortCode?: string | null
  iban?: string | null
  swift?: string | null
}

export type PdfReferenceLink = {
  label: string
  url: string
}

export type PdfAttachmentReference = {
  label: string
  url?: string | null
  fileName?: string | null
}

export type PdfAdvanceSummary = {
  contractValue: number
  advanceAmount: number
  balanceRemaining: number
  primaryLabel?: string | null
  secondaryLabel?: string | null
}

export type PdfBaseDocumentModel = {
  identity: PdfDocumentIdentity
  issuer?: PdfParty | null
  recipient?: PdfParty | null
  items: PdfLineItem[]
  totals: PdfTotals
  sections?: PdfTextSection[]
  signature?: PdfSignature | null
  logo?: PdfLogo | null
  bankDetails?: PdfBankDetails | null
  notes?: string | null
  terms?: string | null
  referenceLinks?: PdfReferenceLink[]
  attachments?: PdfAttachmentReference[]
  metadata?: Record<string, string | number | boolean | null>
}

export type InvoicePdfModel = PdfBaseDocumentModel & {
  identity: PdfDocumentIdentity & {
    kind: 'invoice'
  }
  advanceSummary?: PdfAdvanceSummary | null
}

export type QuotationPdfModel = PdfBaseDocumentModel & {
  identity: PdfDocumentIdentity & {
    kind: 'quotation'
  }
}

export type PdfDocumentModel = InvoicePdfModel | QuotationPdfModel
