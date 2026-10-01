export type TableDocumentType = 'rfq' | 'cps_sheets'

export type TableTemplateId = 'modern' | 'bordered_schedule'

export type TableRowType = 'item' | 'section'

export type TableColumnKey =
  | 'description'
  | 'specification'
  | 'unit'
  | 'quantity'
  | 'make_brand'
  | 'cp'
  | 'sp'

export interface TableDocumentColumn {
  key: TableColumnKey
  label: string
  visible: boolean
}

export interface TableDocumentRow {
  id?: string
  _uiKey?: string
  row_type: TableRowType
  sort_order: number
  section_title: string
  description: string
  specification: string
  quantity: number
  unit: string
  notes: string
  make_brand: string
  cp: string
  sp: string
  image_url?: string | null
  group_id?: string | null
  vat_rate?: number | string | null
  discount_rate?: number | string | null
  install_rate?: number | string | null
  install_rate_override?: boolean | null
  install_rate_taxable?: boolean | null
  custom_data?: Record<string, unknown> | null
}
