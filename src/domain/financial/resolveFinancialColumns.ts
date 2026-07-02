import type { ColumnConfig } from '../invoice/types'
import {
  BUILTIN_COLUMNS,
  getResetColumnConfigs,
  normalizeColumnConfig,
} from '../invoice/columns'

export interface ColumnRuntime extends ColumnConfig {
  width?: string
  [key: string]: unknown
}

export function ensureColumnOrderIntegrity(
  saved: ColumnConfig[],
): ColumnConfig[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return getResetColumnConfigs()
  }

  const desc = saved.find(c => c.key === 'description')
  const rest = saved.filter(c => c.key !== 'description')

  const seen = new Set<string>()
  const result: ColumnConfig[] = []

  if (desc) {
    result.push(desc)
    seen.add('description')
  }

  for (const col of rest) {
    if (!seen.has(col.key)) {
      result.push(col)
      seen.add(col.key)
    }
  }

  return result
}

export function resolveFinancialColumns(
  saved: ColumnConfig[] | undefined | null,
): ColumnRuntime[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return BUILTIN_COLUMNS.map(c => normalizeColumnConfig({ ...c }) as ColumnRuntime)
  }

  const integrityColumns = ensureColumnOrderIntegrity(saved)
  const builtinByKey = new Map(BUILTIN_COLUMNS.map(c => [c.key, c]))
  const seen = new Set<string>()
  const resolved: ColumnRuntime[] = []

  for (const col of integrityColumns) {
    if (seen.has(col.key)) continue
    seen.add(col.key)
    const builtin = builtinByKey.get(col.key)
    if (builtin) {
      resolved.push(normalizeColumnConfig({ ...builtin, ...col }) as ColumnRuntime)
    } else {
      resolved.push(normalizeColumnConfig(col) as ColumnRuntime)
    }
  }

  for (const builtin of BUILTIN_COLUMNS) {
    if (!seen.has(builtin.key)) {
      seen.add(builtin.key)
      resolved.push(normalizeColumnConfig({ ...builtin }) as ColumnRuntime)
    }
  }

  const descIdx = resolved.findIndex(c => c.key === 'description')
  if (descIdx > 0) {
    const [desc] = resolved.splice(descIdx, 1)
    resolved.unshift(desc)
  }

  return resolved
}
