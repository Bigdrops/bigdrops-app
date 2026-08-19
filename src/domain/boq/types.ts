import type { TableDocumentColumn, TableDocumentRow, TableTemplateId } from '@/domain/table-document/types'

export interface Boq {
  id: string
  boq_number: string
  template_id: TableTemplateId
  title: string
  vendor_name: string
  vendor_contact: string
  issue_date: string
  show_vendor_identity: boolean
  show_brand_name: boolean
  brand_name_override: string
  background_color: string
  text_color: string
  border_color: string
  accent_color: string
  preset_name: string
  notes: string
  table_rows: TableDocumentRow[]
  table_columns: TableDocumentColumn[]
  created_at: string
  updated_at: string
  custom_fields?: Record<string, any>
}

export interface DbBoq extends Omit<Boq, 'custom_fields'> {
  custom_fields: string | Record<string, any> | null
}

export interface DbBoqRow {
  boq_id: string
  sort_order: number
  row_type: string
  description?: string | null
  section_title?: string | null
  unit?: string | null
  quantity?: number | null
  notes?: string | null
  cells?: Record<string, any> | null
}
