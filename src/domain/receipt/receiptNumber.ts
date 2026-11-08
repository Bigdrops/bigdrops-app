import {
  belongsToFamily,
  nextAutomaticNumber,
  parseTrailingSequence,
  resolvePrefix,
} from '@/domain/prefixConstants'
import type { DocumentPrefixes } from '@/domain/prefixConstants'

/**
 * Generates the next receipt number.
 * Format: {resolvedPrefix}-{6-digit serial}
 * Fallback prefix: RCP
 */
export function getNextReceiptNumber(
  rows: Array<{ receipt_number?: string | null }>,
  prefixes?: DocumentPrefixes | null,
  cursor?: number,
): string {
  const prefix = resolvePrefix(prefixes, 'receipt') || 'RCP'
  const family = `${prefix}-`


  const occupied = rows
    .map((row) => String(row.receipt_number || '').trim().toUpperCase())
    .filter((value) => belongsToFamily(value, family))
  const maxNumber = occupied
    .map((value) => parseTrailingSequence(value))
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return nextAutomaticNumber(family, cursor, occupied, maxNumber).candidate
}
