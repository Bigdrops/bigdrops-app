export type TableDocumentType = 'rfq' | 'boq'

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
}
