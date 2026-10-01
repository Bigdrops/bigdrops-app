import type { ColumnConfig } from '@/domain/invoice/types'
import { normalizeColumnConfig } from '@/domain/invoice/columns'

export const CPS_BUILTIN_COLUMNS: ColumnConfig[] = [
  { key: 'description', label: 'Description', visible: true, visibilityMode: 'show', removable: false },
  { key: 'quantity', label: 'Quantity', visible: true, visibilityMode: 'show', removable: false },
  { key: 'unit', label: 'Unit', visible: true, visibilityMode: 'show', removable: false },
  { key: 'make_brand', label: 'Make / Brand', visible: true, visibilityMode: 'show', removable: false },
  { key: 'cp', label: 'CP', type: 'number', visible: true, visibilityMode: 'show', removable: false },
  { key: 'sp', label: 'SP', type: 'number', visible: true, visibilityMode: 'show', removable: false },
  { key: 'amount', label: 'Amount', type: 'number', visible: true, visibilityMode: 'show', removable: false },
  { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: false, visibilityMode: 'hide_display', removable: false, includeInTotal: true, formula: '' },
  { key: 'vat_rate', label: 'VAT Rate', type: 'vat_rate', visible: false, visibilityMode: 'hide_display', removable: false },
  { key: 'discount_rate', label: 'Discount Rate', type: 'discount_rate', visible: false, visibilityMode: 'hide_display', removable: false },
]

export const CPS_HIDE_FULL_DENY_LIST = new Set(['description', 'quantity', 'cp', 'sp', 'amount'])

export function getResetCpsColumnConfigs(): ColumnConfig[] {
  return CPS_BUILTIN_COLUMNS.map((column) => normalizeColumnConfig({ ...column }))
}

export function normalizeCpsColumns(saved: unknown): ColumnConfig[] {
  const savedColumns = Array.isArray(saved) ? saved : []
  if (savedColumns.length === 0) return getResetCpsColumnConfigs()

  const builtins = new Map(CPS_BUILTIN_COLUMNS.map((column) => [column.key, column]))
  const seen = new Set<string>()
  const resolved: ColumnConfig[] = []

  for (const column of savedColumns as ColumnConfig[]) {
    if (!column?.key || seen.has(column.key)) continue
    seen.add(column.key)
    const builtin = builtins.get(column.key)
    resolved.push(normalizeColumnConfig({ ...(builtin || {}), ...column }))
  }

  for (const builtin of CPS_BUILTIN_COLUMNS) {
    if (!seen.has(builtin.key)) {
      resolved.push(normalizeColumnConfig({ ...builtin }))
    }
  }

  const descriptionIndex = resolved.findIndex((column) => column.key === 'description')
  if (descriptionIndex > 0) {
    const [description] = resolved.splice(descriptionIndex, 1)
    resolved.unshift(description)
  }

  return resolved
}

function toCustomKey(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `custom_${base || 'field'}`
}

export function ensureCpsCustomColumns(columns: ColumnConfig[], labels: string[]): ColumnConfig[] {
  const next = [...columns]
  const existing = new Set(next.map((column) => column.key))

  labels.slice(0, 10).forEach((label) => {
    const key = toCustomKey(label)
    if (existing.has(key)) return
    existing.add(key)
    next.push(normalizeColumnConfig({
      key,
      label,
      type: 'text',
      visible: true,
      visibilityMode: 'show',
      removable: true,
      includeInTotal: false,
    }))
  })

  return next
}

export function getCpsCustomColumnKey(label: string) {
  return toCustomKey(label)
}
