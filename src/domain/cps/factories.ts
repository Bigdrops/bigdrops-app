import type { Cps } from './types'
import { createEmptyTableRow } from '@/domain/table-document/rows'
import { getDefaultColumnsForDocument } from '@/domain/table-document/templateRegistry'

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyCps(): Cps {
  const now = new Date().toISOString()

  return {
    id: createId('cps_sheets'),
    cps_number: '',
    template_id: 'bordered_schedule',
    title: 'Cost & Pricing Sheet',
    client_name: '',
    project_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    show_vendor_identity: true,
    show_brand_name: false,
    brand_name_override: '',
    background_color: '',
    text_color: '',
    border_color: '',
    accent_color: '',
    preset_name: 'Clean Slate',
    notes: '',
    table_rows: [createEmptyTableRow(0, 'section'), createEmptyTableRow(1, 'item')],
    table_columns: getDefaultColumnsForDocument('cps_sheets'),
    created_at: now,
    updated_at: now,
  }
}
