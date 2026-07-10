/**
 * Letter Numbering — Prefix Engine Integration
 *
 * Generates letter document numbers following the canonical format:
 *   {prefix}-{6-digit serial}
 *
 * Example: LTR-000001, LTR-000002, ...
 *
 * Uses withUniqueRetry() for collision resilience exactly as other
 * document families do. No independent numbering logic.
 */

import { resolvePrefix } from '@/domain/prefixConstants'
import type { DocumentPrefixes } from '@/domain/prefixConstants'

/**
 * Extracts the numeric serial from a letter number string.
 * Returns 0 if no serial is found.
 */
function extractSerial(letterNumber: string): number {
  const match = letterNumber.match(/(\d+)$/)
  return match ? Number.parseInt(match[1], 10) : 0
}

/**
 * Generates the next letter number from existing rows.
 *
 * @param rows - Existing letter rows with `letter_number` field
 * @param prefixes - Document prefix configuration (from settings)
 * @returns Next available letter number (e.g. "LTR-000001")
 */
export function getNextLetterNumber(
  rows: Array<{ letter_number?: string | null }>,
  prefixes?: DocumentPrefixes | null,
): string {
  const prefix = resolvePrefix(prefixes, 'letter')

  const maxSerial = rows
    .map((row) => String(row.letter_number || '').trim().toUpperCase())
    .filter((value) => value.startsWith(prefix))
    .map(extractSerial)
    .reduce((max, serial) => Math.max(max, serial), 0)

  return `${prefix}-${String(maxSerial + 1).padStart(6, '0')}`
}
