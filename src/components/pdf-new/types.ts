import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'

export type PdfDocumentKind = 'invoice' | 'quotation'

export type PdfTextAlign = 'left' | 'center' | 'right'

export type PdfDocumentIdentity = {
  id: string
  kind: PdfDocumentKind
  number: string
  title?: string | null
  issueDate?: string | null
  dueDate?: string | null
  validUntil?: string | null
  poNumber?: string | null
  status?: string | null
  currency?: string | null
}

export type PdfParty = {
  label?: string | null
  name?: string | null
  taxId?: string | null
  attention?: string | null
  email?: string | null
  phone?: string | null
  addressLines?: string[]
}

export type PdfHeaderField = {
  label: string
  value: string
}

export type PdfColumnDefinition = {
  key: string
  label: string
  align?: PdfTextAlign
}

export type PdfLineItem = {
  id: string
  rowType?: 'line' | 'group_header'
  groupLabel?: string | null
  description?: string | null
  subDescription?: string | null
  make?: string | null
  quantity?: number | null
  unit?: string | null
  unitPrice?: number | null
  amount?: number | null
  imageUrl?: string | null
  customData?: Record<string, string | number | boolean | null | undefined>
}

export type PdfTotalRow = {
  key?: string
  label: string
  amount: number
  emphasis?: boolean
  tone?: 'default' | 'muted' | 'danger' | 'success' | 'primary'
}

export type PdfAdvanceSummary = {
  contractValue: number
  requestedAmount: number
  balanceRemaining: number
  percentage?: number | null
  balancePercentage?: number | null
  primaryLabel?: string | null
  secondaryLabel?: string | null
}

export type PdfTotalsMode = 'standard' | 'advance'

export type PdfTotals = {
  mode?: PdfTotalsMode
  rows: PdfTotalRow[]
  amountInWords?: string | null
  balanceDue?: number | null
  advanceSummary?: PdfAdvanceSummary | null
}

export type PdfTextSection = {
  title: string
  content: string
  format?: 'text' | 'html'
}

export type PdfSignature = {
  name?: string | null
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

export type PdfFontConfig = {
  useCustomFonts?: boolean
  headerFont?: string
  bodyFont?: string
}

export type PdfTemplateConfig = {
  name?: 'minimal'
  designPreset?: Partial<PdfDesignPreset> | null
  fontConfig?: PdfFontConfig | null
}

export type PdfBaseDocumentModel = {
  identity: PdfDocumentIdentity
  issuer?: PdfParty | null
  recipient?: PdfParty | null
  headerFields?: PdfHeaderField[]
  items: PdfLineItem[]
  columns?: PdfColumnDefinition[]
  mergeQtyUnit?: boolean
  totals: PdfTotals
  bankDetails?: PdfBankDetails | null
  notes?: PdfTextSection | null
  terms?: PdfTextSection | null
  additionalSections?: PdfTextSection[]
  referenceLinks?: PdfReferenceLink[]
  attachments?: PdfAttachmentReference[]
  signature?: PdfSignature | null
  logo?: PdfLogo | null
  footerText?: string | null
  tagline?: string | null
  metaFooter?: {
    companyName?: string | null
  }
  template?: PdfTemplateConfig | null
}

export type InvoicePdfModel = PdfBaseDocumentModel & {
  identity: PdfDocumentIdentity & {
    kind: 'invoice'
  }
}

export type QuotationPdfModel = PdfBaseDocumentModel & {
  identity: PdfDocumentIdentity & {
    kind: 'quotation'
  }
}

export type PdfDocumentModel = InvoicePdfModel | QuotationPdfModel
