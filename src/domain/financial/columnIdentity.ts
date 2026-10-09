import type { ColumnConfig } from '@/domain/invoice/types'

export function normalizeColumnLabelIdentity(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

export function isCustomColumnKey(key: unknown): boolean {
  return String(key || '').startsWith('custom_')
}

export function getColumnLogicalIdentity(column: Pick<ColumnConfig, 'key' | 'label'>): string {
  return normalizeColumnLabelIdentity(column.label || column.key)
}

export function findColumnByLogicalIdentity(
  columns: Array<Pick<ColumnConfig, 'key' | 'label'>>,
  label: unknown,
): Pick<ColumnConfig, 'key' | 'label'> | null {
  const identity = normalizeColumnLabelIdentity(label)
  if (!identity) return null
  return columns.find((column) => getColumnLogicalIdentity(column) === identity) || null
}

export function canUseColumnLabel(
  columns: Array<Pick<ColumnConfig, 'key' | 'label'>>,
  key: string,
  nextLabel: unknown,
): boolean {
  const nextIdentity = normalizeColumnLabelIdentity(nextLabel)
  if (!nextIdentity) return true

  const current = columns.find((column) => column.key === key)
  if (current && getColumnLogicalIdentity(current) === nextIdentity) return true

  return !columns.some((column) => column.key !== key && getColumnLogicalIdentity(column) === nextIdentity)
}

export function createUniqueColumnLabel(baseLabel: string, columns: Array<Pick<ColumnConfig, 'key' | 'label'>>): string {
  const base = String(baseLabel || '').trim() || 'New Column'
  const identities = new Set(columns.map(getColumnLogicalIdentity).filter(Boolean))
  let label = base
  let suffix = 2

  while (identities.has(normalizeColumnLabelIdentity(label))) {
    label = `${base} ${suffix}`
    suffix += 1
  }

  return label
}

export function createUniqueCustomColumnKey(
  label: unknown,
  columns: Array<Pick<ColumnConfig, 'key'>>,
): string {
  const base = normalizeColumnLabelIdentity(label) || 'field'
  const existingKeys = new Set(columns.map((column) => column.key))
  let key = `custom_${base}`
  let suffix = 2

  while (existingKeys.has(key)) {
    key = `custom_${base}_${suffix}`
    suffix += 1
  }

  return key
}
