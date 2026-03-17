import type {
  ColumnConfig,
  InvoiceCustomFields,
  InvoiceFieldEntry,
  InvoiceItem,
  InvoiceTotalsSource,
} from '@/domain/invoice'

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface DbQuotation {
  id?: string | null
  quotation_number?: string | null
  quotation_title?: string | null
  client_id?: string | null
  client_name?: string | null
  project_id?: string | null
  issue_date?: string | null
  valid_until?: string | null
  status?: QuotationStatus | string | null
  notes?: string | null
  terms?: string | null
  workmanship?: number | string | null
  transportation?: number | string | null
  shipping?: number | string | null
  discount?: number | string | null
  vat?: number | string | null
  wht?: number | string | null
  subtotal?: number | string | null
  install_rate_total?: number | string | null
  total?: number | string | null
  amount_in_words?: string | null
  custom_fields?: string | Record<string, unknown> | null
  archived_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

export interface DbQuotationItem {
  id?: string | null
  quotation_id?: string | null
  description?: string | null
  sub_description?: string | null
  make?: string | null
  quantity?: number | string | null
  unit?: string | null
  unit_price?: number | string | null
  amount?: number | string | null
  install_rate?: number | string | null
  vat_rate?: number | string | null
  discount_rate?: number | string | null
  row_type?: 'standard' | 'group_header' | string | null
  group_id?: string | null
  group_name?: string | null
  sort_order?: number | string | null
  image_url?: string | null
  custom_data?: string | Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

export interface QuotationCustomFields extends InvoiceCustomFields {
  quotationTitle?: string
  clientName?: string
  notesHtml?: string
  termsHtml?: string
  columnConfig?: ColumnConfig[]
  header?: InvoiceFieldEntry[]
  bottom?: InvoiceFieldEntry[]
}

export interface Quotation extends InvoiceTotalsSource {
  id?: string | null
  quotation_number?: string
  quotation_title?: string
  client_id?: string | null
  client_name?: string
  project_id?: string | null
  issue_date?: string | null
  valid_until?: string | null
  status?: QuotationStatus
  notes?: string
  terms?: string
  workmanship?: number
  transportation?: number
  shipping?: number
  discount?: number
  vat?: number
  wht?: number
  subtotal?: number
  install_rate_total?: number
  total?: number
  amount_in_words?: string
  custom_fields?: QuotationCustomFields
  archived_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface QuotationFormState {
  quotation: Quotation
  items: InvoiceItem[]
  columns: ColumnConfig[]
  headerFields: InvoiceFieldEntry[]
  bottomFields: InvoiceFieldEntry[]
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  whtType: 'fixed' | 'percent'
  notesTitle: string
  termsTitle: string
  mergeQtyUnit: boolean
  showItemImages: boolean
}
