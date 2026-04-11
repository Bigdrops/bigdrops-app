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
}
