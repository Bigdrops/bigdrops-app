import type { Boq } from './types'
import { createEmptyTableRow } from '@/domain/table-document/rows'
import { getDefaultColumnsForDocument } from '@/domain/table-document/templateRegistry'

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyBoq(): Boq {
  const now = new Date().toISOString()

  return {
    id: createId('boq'),
    boq_number: '',
    template_id: 'bordered_schedule',
    title: 'BILL OF QUANTITIES',
    vendor_name: '',
    vendor_contact: '',
    issue_date: new Date().toISOString().split('T')[0],
    show_vendor_identity: true,
    show_brand_name: false,
    brand_name_override: '',
    background_color: '#FFFFFF',
    text_color: '#1F2937',
    border_color: '#94A3B8',
    accent_color: '#0F172A',
    preset_name: 'Clean Slate',
    notes: '',
    table_rows: [createEmptyTableRow(0, 'section'), createEmptyTableRow(1, 'item')],
    table_columns: getDefaultColumnsForDocument('boq'),
    created_at: now,
    updated_at: now,
  }
}
