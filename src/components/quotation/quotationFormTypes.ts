import type { InvoiceFieldEntry, InvoiceItem } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'

export type QuotationGroupState = {
  id: string
  name: string
  showSubtotal: boolean
}

export type QuotationEditorState = Quotation & {
  project_id?: string
  payment_terms?: string
  custom_payment_terms?: string
}

export type SignatoryRow = {
  id: string
  name: string
  role?: string | null
  signature_url?: string | null
}

export type BankAccountRow = {
  id: string
  bank_name?: string | null
  account_name?: string | null
  account_number?: string | null
  sort_code?: string | null
  is_default?: boolean | null
}

export type PdfOutputState = {
  showBankDetails: boolean
  bankAccountId: string | null
  showFooter: boolean
  showTagline: boolean
}

export type ProjectPrefillState = {
  projectId?: string
  clientId?: string
  clientName?: string
}

export type RfqConversionPrefillState = ProjectPrefillState & {
  sourceRfq?: {
    rfqId?: string
    rfqNumber?: string
    title?: string
    notes?: string
    items?: Array<{
      id?: string
      description?: string
      quantity?: number
      unit?: string
      specification?: string
      notes?: string
    }>
  }
}