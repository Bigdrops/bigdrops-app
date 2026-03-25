import type { ColumnConfig, InvoiceItem } from '@/domain/invoice'

export const MAX_IMPORT_BYTES = 200_000
export const MAX_IMPORTED_ROWS = 200
export const MAX_NEW_COLUMNS = 10

export function toSnakeCase(value: string) {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

export function normalizeObjectKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeObjectKeys(entry)) as T
  }

  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      toSnakeCase(key),
      normalizeObjectKeys(entryValue),
    ]),
  ) as T
}

export function parseNumberish(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/,/g, '')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

export function normalizeScalar(value: unknown): unknown {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    const numberValue = parseNumberish(trimmed)
    return numberValue !== null ? numberValue : trimmed
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return normalizeText(value)
}

export function hasCellContent(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === 'number') return !Number.isNaN(value)
  return String(value).trim() !== ''
}

export function inferColumnType(values: unknown[]): 'text' | 'number' {
  const meaningful = values.filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
  if (!meaningful.length) return 'text'
  return meaningful.every((value) => parseNumberish(value) !== null) ? 'number' : 'text'
}

export function buildColumnAliases(columns: ColumnConfig[]) {
  const aliases = new Map<string, ColumnConfig>()

  columns.forEach((column) => {
    const keyAlias = toSnakeCase(column.key)
    const labelAlias = toSnakeCase(column.label)
    if (keyAlias) aliases.set(keyAlias, column)
    if (labelAlias) aliases.set(labelAlias, column)
  })

  return aliases
}

export function makeCustomColumn(
  rawLabel: string,
  existingColumns: ColumnConfig[],
  type: 'text' | 'number',
) {
  const preferredLabel = normalizeText(rawLabel) || 'Custom Column'
  const keyBase = toSnakeCase(preferredLabel) || 'custom_column'
  const existingKeys = new Set(existingColumns.map((column) => column.key))
  let nextKey = `custom_${keyBase}`
  let suffix = 2

  while (existingKeys.has(nextKey)) {
    nextKey = `custom_${keyBase}_${suffix}`
    suffix += 1
  }

  return {
    key: nextKey,
    label: preferredLabel,
    type,
    visible: true,
    removable: true,
    includeInTotal: false,
  } satisfies ColumnConfig
}

export function getStandardRowEntries(items: InvoiceItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .filter((entry) => entry.item.row_type !== 'group_header')
    .map((entry, index) => ({
      ...entry,
      rowNumber: index + 1,
    }))
}

export function getColumnLabel(columnKey: string, columns: ColumnConfig[]) {
  if (columnKey === 'description') return 'Description'
  if (columnKey === 'sub_description') return 'Sub Description'
  if (columnKey === 'quantity') return 'Quantity'
  if (columnKey === 'unit') return 'Unit'
  if (columnKey === 'unit_price') return 'Unit Price'
  return columns.find((column) => column.key === columnKey)?.label || columnKey
}
