import type { ColumnConfig, InvoiceItem } from '@/domain/invoice'

export type ImportMode = 'Add' | 'Update'

export type ImportFieldKey =
  | 'description'
  | 'sub_description'
  | 'quantity'
  | 'unit'
  | 'unit_price'
  | 'make'
  | 'row_number'

export type AcceptedTopLevelKey = 'title' | 'po_number' | 'notes' | 'terms' | 'extra_charges' | 'items'

export type CustomColumnDecision =
  | { action: 'create'; label?: string }
  | { action: 'map'; columnKey: string }
  | { action: 'drop' }

export type ImportStage = 'parse' | 'validate' | 'resolve' | 'apply'

export type ParseError = {
  stage: ImportStage
  message: string
}

export type ExtraChargeImport = {
  label: string
  value: number
  withTax?: boolean
  taxable?: boolean
  tax?: boolean
  appliesTax?: boolean
}

export type ParsedImportRoot = {
  po_number?: unknown
  notes?: unknown
  terms?: unknown
  extra_charges?: Array<Record<string, unknown>>
  items: Array<Record<string, unknown>>
}

export type ImportTopLevelData = {
  title?: string
  po_number?: string
  notes?: string
  terms?: string
  extra_charges?: ExtraChargeImport[]
}

export type NormalizedImportItem = {
  sourceIndex: number
  row_number?: number
  baseFields: Partial<Record<ImportFieldKey, string | number>>
  extraFields: Record<string, unknown>
}

export type UnknownColumnCandidate = {
  key: string
  sourceLabels: string[]
  sampleValues: unknown[]
  inferredType: 'text' | 'number'
}

export type NormalizedImportData = {
  topLevel: ImportTopLevelData
  items: NormalizedImportItem[]
  unknownCandidates: UnknownColumnCandidate[]
}

export type ValidationIssue = {
  sourceIndex: number
  message: string
}

export type ValidatedImportData = {
  topLevel: ImportTopLevelData
  items: NormalizedImportItem[]
  unknownCandidates: UnknownColumnCandidate[]
  skippedRows: ValidationIssue[]
}

export type ResolvedImportItem = {
  sourceIndex: number
  row_number?: number
  baseFields: Partial<Record<Exclude<ImportFieldKey, 'row_number'>, string | number>>
  customFields: Record<string, unknown>
}

export type ResolvedImportData = {
  topLevel: ImportTopLevelData
  items: ResolvedImportItem[]
  columns: ColumnConfig[]
  createdColumns: ColumnConfig[]
}

export type OverwriteTarget = {
  id: string
  rowNumber: number
  columnKey: string
  columnLabel: string
  currentValue: string | number
  nextValue: string | number
}

export type ApplyImportResult = {
  mode: ImportMode
  items: InvoiceItem[]
  columns: ColumnConfig[]
  topLevel: ImportTopLevelData
  createdColumns: ColumnConfig[]
  createdRowCount: number
  updatedRowNumbers: number[]
  overwriteTargets: OverwriteTarget[]
  skippedRows: ValidationIssue[]
}

export type BuildApplyResultOptions = {
  mode: ImportMode
  existingItems: InvoiceItem[]
  existingColumns: ColumnConfig[]
  resolved: ResolvedImportData
  skippedRows?: ValidationIssue[]
  exemptOverwriteIds?: string[]
  createItem: () => InvoiceItem
}
