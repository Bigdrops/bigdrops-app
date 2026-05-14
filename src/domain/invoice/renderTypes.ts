import type { ColumnConfig, InvoiceCustomFields } from './types'

export type PreviewBankAccount = {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  sortCode: string
  isDefault: boolean
}

export type PreviewDetailRow = {
  label: string
  value: string
}

export type PreviewItem =
  | { type: 'group'; label: string }
  | { type: 'group_footer'; value: string; showSubtotal: boolean }
  | { type: 'line'; label: string; detail: string; value: string; facts: string[]; imageUrl?: string | null }

export type PreviewTotalRow = {
  label: string
  value: string
  rawAmount?: number
  emphasis?: boolean
  valueClassName?: string
  labelClassName?: string
}

export type PreviewNoteSection =
  | { title: string; kind: 'html'; html: string }
  | { title: string; kind: 'text'; text: string }
  | { title: string; kind: 'fields'; fields: Array<{ label: string; value: string }> }
  | { title: string; kind: 'links'; links: { label: string; url: string }[] }

export type PreviewSignatory = {
  name: string
  role: string
  signatureUrl: string
}

export type InvoiceLike = {
  custom_fields?: unknown
  client_name?: string | null
  payment_terms?: string | null
  invoice_title?: string | null
  document_type?: string | null
  work_duration?: string | null
  subtotal?: number | string | null
  vat?: number | string | null
  workmanship?: number | string | null
  transportation?: number | string | null
  shipping?: number | string | null
  discount?: number | string | null
  wht?: number | string | null
  total?: number | string | null
  amount_in_words?: string | null
  notes?: string | null
  terms?: string | null
}

export type InvoiceItemLike = {
  row_type?: string | null
  group_name?: string | null
  description?: string | null
  sub_description?: string | null
  amount?: number | string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  unit?: string | null
  make?: string | null
  install_rate?: number | string | null
  vat_rate?: number | string | null
  discount_rate?: number | string | null
  custom_data?: Record<string, unknown> | null
  group_id?: string | null
  image_url?: string | null
}

export type ClientLike = {
  contact_person?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
}

export type SettingsLike = {
  company_address?: string | null
  company_city?: string | null
  company_state?: string | null
  company_vat?: string | null
  company_phone?: string | null
  company_email?: string | null
}

export type BankAccountLike = {
  id: string
  bank_name?: string | null
  account_name?: string | null
  account_number?: string | null
  sort_code?: string | null
  is_default?: boolean | null
}

export type SignatoryLike = {
  id?: string | null
  name?: string | null
  role?: string | null
  signature_url?: string | null
  signatureUrl?: string | null
}

export type CustomFieldObjectLike = {
  header?: Array<{ label?: string | null; value?: string | null }>
  additionalFields?: Array<{ label?: string | null; value?: string | null }>
  bottom?: Array<{ text?: string | null }>
  attachments?: Array<{ url?: string | null; label?: string | null; name?: string | null }>
  columnConfig?: Array<ColumnConfig>
  notesTitle?: string | null
  termsTitle?: string | null
} & InvoiceCustomFields

export type PdfOutputLike = {
  bankAccountId?: string | null
  showBalanceDue?: boolean
  showAmountInWords?: boolean
  showVatPercentage?: boolean
  showWhtPercentage?: boolean
  showDiscountPercentage?: boolean
}

export type BuildInvoicePreviewModelInput = {
  invoice: InvoiceLike
  items: InvoiceItemLike[]
  client?: ClientLike
  settings?: SettingsLike
  bankAccounts?: BankAccountLike[]
  customFieldObject?: CustomFieldObjectLike
  pdfOutput?: PdfOutputLike
  signatory?: PreviewSignatory | null
  poNumber?: string
  invoiceTotal: number
  cashReceived: number
  balanceDue: number
  totals?: {
    rawSubtotal?: number
    vatAmount?: number
    discountAmount?: number
    whtAmount?: number
    installRateTotal?: number
  }
  formatMoney: (value: number) => string
}
