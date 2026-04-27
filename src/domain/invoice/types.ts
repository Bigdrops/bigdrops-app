export type InvoiceColumnKind = 'builtin' | 'custom'
export type ColumnDataType = 'text' | 'number' | 'install_rate' | 'vat_rate' | 'discount_rate'
export type DiscountType = 'fixed' | 'percent'
export type DiscountTiming = 'before' | 'after'
export type WhtType = 'fixed' | 'percent'

export type RowType = 'standard' | 'group_header'

export interface CustomDataMap {
  [key: string]: string | number | null | undefined
}

export interface InvoiceAttachment {
  label?: string
  name?: string
  url?: string
  [key: string]: unknown
}

export interface AdvanceConfig {
  enabled?: boolean
  mode: 'percent' | 'fixed'
  value: number
  suffix?: string
  primaryLabel?: string
  secondaryLabel?: string
  parentId?: string | null
  role?: string | null
  position?: number
  contractValue?: number
}

export interface InvoicePdfOutput {
  showBankDetails: boolean
  bankAccountId: string | null
  showFooter: boolean
  showTagline: boolean
  showBalanceDue: boolean
  showAmountInWords: boolean
  showVatPercentage: boolean
  showWhtPercentage: boolean
  showDiscountPercentage: boolean
}

export const INVOICE_PDF_TEMPLATE_IDS = ['industry', 'civicslate', 'naijabiz', 'obsidian-receipt'] as const

export type InvoicePdfTemplateId = (typeof INVOICE_PDF_TEMPLATE_IDS)[number]

export function isInvoicePdfTemplateId(value: unknown): value is InvoicePdfTemplateId {
  return typeof value === 'string' && (INVOICE_PDF_TEMPLATE_IDS as readonly string[]).includes(value)
}

export interface Payment {
  id: string
  invoice_id: string
  cash_amount: number
  wht_amount: number
  wht_rate?: number
  wht_type?: string
  amount: number
  date: string
  method: string
  reference?: string
  notes?: string
  voided_at?: string | null
  void_reason?: string | null
  source?: string
  created_at: string
}

export interface DocumentTrailLink {
  id?: string | null
  type?: 'invoice' | 'quotation'
  number?: string
  project_id?: string | null
  po_number?: string | null
  created_at?: string | null
}

export interface DocumentConversionTrail {
  source?: DocumentTrailLink | null
  derived?: DocumentTrailLink[]
}

export interface InvoiceFieldEntry {
  id?: string
  label?: string
  value?: string
  text?: string
  [key: string]: unknown
}

export interface DbInvoice {
  id?: string | null
  invoice_number?: string | null
  po_number?: string | null
  client_id?: string | null
  client_name?: string | null
  issue_date?: string | null
  due_date?: string | null
  status?: string | null
  document_type?: string | null
  payment_terms?: string | null
  custom_payment_terms?: string | null
  notes?: string | null
  terms?: string | null
  workmanship?: number | string | null
  transportation?: number | string | null
  shipping?: number | string | null
  discount?: number | string | null
  vat?: number | string | null
  wht?: number | string | null
  subtotal?: number | string | null
  total?: number | string | null
  work_duration?: string | null
  amount_in_words?: string | null
  invoice_title?: string | null
  custom_fields?: string | Record<string, unknown> | null
  archived_at?: string | null
  project_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

export interface DbInvoiceItem {
  id?: string | null
  invoice_id?: string | null
  item_id?: string | null
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
  row_type?: RowType | string | null
  group_id?: string | null
  group_name?: string | null
  sort_order?: number | string | null
  image_url?: string | null
  custom_data?: string | CustomDataMap | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

export interface InvoiceItem {
  id?: string | null
  _uiKey?: string
  invoice_id?: string | null
  item_id?: string | null
  description?: string
  sub_description?: string
  make?: string
  quantity?: number
  unit?: string
  unit_price?: number
  amount?: number
  install_rate?: number | null
  install_rate_override?: boolean
  vat_rate?: number | null
  discount_rate?: number | null
  row_type?: RowType
  group_id?: string | null
  group_name?: string
  sort_order?: number
  image_url?: string | null
  custom_data?: CustomDataMap
  created_at?: string | null
  updated_at?: string | null
}

export interface Invoice extends InvoiceTotalsSource {
  id?: string | null
  invoice_number?: string
  po_number?: string
  client_id?: string | null
  client_name?: string
  issue_date?: string | null
  due_date?: string | null
  status?: string
  document_type?: string
  payment_terms?: string
  custom_payment_terms?: string
  notes?: string
  terms?: string
  workmanship?: number
  transportation?: number
  shipping?: number
  discount?: number
  vat?: number
  wht?: number
  subtotal?: number
  total?: number


  work_duration?: string
  amount_in_words?: string
  invoice_title?: string
  custom_fields?: InvoiceCustomFields
  attachments?: InvoiceAttachment[]
  archived_at?: string | null
  project_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface InvoiceGroup {
  id?: string
  name?: string
  showSubtotal?: boolean
  items?: InvoiceItem[]
}

export interface ExtraCharge {
  id?: string
  label?: string
  value?: number | string
  withTax?: boolean
}

export interface ColumnConfig {
  key: string
  label: string
  type?: ColumnDataType
  visible?: boolean
  removable?: boolean
  includeInTotal?: boolean
  formula?: string
}

export interface ColumnTypeOption {
  value: Extract<ColumnDataType, 'text' | 'number'>
  label: string
}

export interface PdfColumnDefinition {
  key: string
  label: string
  kind: InvoiceColumnKind
  align: 'left' | 'center' | 'right'
  pdfWidth: number
  pdfFlex: number
  type?: ColumnDataType
}

export interface CalculationInputs {
  vatRate: number
  vatPercent?: number
  discountValue: number
  whtValue: number
  discountType: DiscountType
  discountTiming: DiscountTiming
  whtType: WhtType
}

export interface EditableCalculationInputs extends CalculationInputs {}

export interface LegacyCalculationState {
  calculationInputs: CalculationInputs
  editableInputs: EditableCalculationInputs
  useGlobalVatInput: boolean
  useGlobalDiscountInput: boolean
}

export interface CalculationResult {
  rawSubtotal: number
  installRateTotal: number
  vatAmount: number
  discountAmount: number
  grandTotal: number
  whtAmount: number
  totalPayable: number
  customColTotal: number
  extraWithTax: number
  extraWithoutTax: number
  fixedChargesTotal: number
}

export interface InvoiceTotalsSource {
  vat?: number | string | null
  discount?: number | string | null
  wht?: number | string | null
  workmanship?: number | string | null
  transportation?: number | string | null
  shipping?: number | string | null
  total?: number | string | null
  _extraCharges?: ExtraCharge[]
}

export interface InvoiceCustomFields {
  calculationInputs?: Partial<CalculationInputs>
  discountType?: DiscountType
  discountTiming?: DiscountTiming
  whtType?: WhtType
  pdfOutput?: Partial<InvoicePdfOutput>
  pdfTemplateId?: InvoicePdfTemplateId
  signatoryId?: string | null
  extraCharges?: ExtraCharge[]
  groupMeta?: Record<string, { name?: string; showSubtotal?: boolean }>
  attachments?: InvoiceAttachment[]
  header?: Array<Record<string, unknown>>
  additionalFields?: InvoiceFieldEntry[]
  bottom?: Array<Record<string, unknown>>
  conversionTrail?: DocumentConversionTrail
  advance_invoice?: AdvanceConfig
  [key: string]: unknown
}


export interface PdfCellValueHelpers {
  amount?: number
  installColumn?: ColumnConfig | undefined
  installValue?: number
}
