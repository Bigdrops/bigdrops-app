import type { TableDocumentColumn, TableDocumentType, TableTemplateId } from './types'

export const SHARED_TABLE_TEMPLATES: Array<{
  id: TableTemplateId
  label: string
  description: string
}> = [
  { id: 'modern', label: 'Modern', description: 'Current styled document presentation' },
  { id: 'bordered_schedule', label: 'Bordered Schedule', description: 'Excel-style full-border material schedule' },
]

export const DEFAULT_TABLE_TEMPLATE: TableTemplateId = 'modern'

const RFQ_COLUMNS: TableDocumentColumn[] = [
  { key: 'description', label: 'Item / Description', visible: true },
  { key: 'specification', label: 'Specification', visible: true },
  { key: 'quantity', label: 'Qty', visible: true },
  { key: 'unit', label: 'Unit', visible: true },
  { key: 'make_brand', label: 'Make / Brand', visible: false },
  { key: 'cp', label: 'CP', visible: false },
  { key: 'sp', label: 'SP', visible: false },
]

const BOQ_COLUMNS: TableDocumentColumn[] = [
  { key: 'description', label: 'Material Description', visible: true },
  { key: 'specification', label: 'Specification', visible: false },
  { key: 'quantity', label: 'Required Qty.', visible: true },
  { key: 'unit', label: 'UOM', visible: true },
  { key: 'make_brand', label: 'Make / Brand', visible: true },
  { key: 'cp', label: 'CP', visible: true },
  { key: 'sp', label: 'SP', visible: true },
]

export function getDefaultColumnsForDocument(documentType: TableDocumentType): TableDocumentColumn[] {
  const source = documentType === 'boq' ? BOQ_COLUMNS : RFQ_COLUMNS
  return source.map((column) => ({ ...column }))
}

export function getTemplateLabel(templateId: TableTemplateId): string {
  return SHARED_TABLE_TEMPLATES.find((template) => template.id === templateId)?.label || 'Modern'
}
