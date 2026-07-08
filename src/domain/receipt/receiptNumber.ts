import { resolvePrefix } from '@/domain/prefixConstants'
import type { DocumentPrefixes } from '@/domain/prefixConstants'

/**
 * Generates the next receipt number.
 * Format: {resolvedPrefix}-{6-digit serial}
 * Fallback prefix: RCP
 */
export function getNextReceiptNumber(
  rows: Array<{ receipt_number?: string | null }>,
  prefixes?: DocumentPrefixes | null,
): string {
  const prefix = resolvePrefix(prefixes, 'receipt') || 'RCP'

  const maxSerial = rows
    .map((row) => String(row.receipt_number || '').trim().toUpperCase())
    .filter((value) => value.startsWith(prefix.toUpperCase()))
    .map((value) => {
      const match = value.match(/(\d+)$/)
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return `${prefix}-${String(maxSerial + 1).padStart(6, '0')}`
}
