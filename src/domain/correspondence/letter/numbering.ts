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

import {
  belongsToFamily,
  nextAutomaticNumber,
  parseTrailingSequence,
  resolvePrefix,
} from '@/domain/prefixConstants'
import type { DocumentPrefixes } from '@/domain/prefixConstants'

/**
 * Generates the next letter number from existing rows.
 *
 * @param rows - Existing letter rows with `letter_number` field
 * @param prefixes - Document prefix configuration (from settings)
 * @param cursor - Optional persisted auto cursor for letter family
 * @returns Next available letter number (e.g. "LTR-000001")
 */
export function getNextLetterNumber(
  rows: Array<{ letter_number?: string | null }>,
  prefixes?: DocumentPrefixes | null,
  cursor?: number,
): string {
  const prefix = resolvePrefix(prefixes, 'letter')
  const family = `${prefix}-`


  const occupied = rows
    .map((row) => String(row.letter_number || '').trim().toUpperCase())
    .filter((value) => belongsToFamily(value, family))
  const maxSerial = occupied
    .map((value) => parseTrailingSequence(value))
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, serial) => Math.max(max, serial), 0)

  return nextAutomaticNumber(family, cursor, occupied, maxSerial).candidate
}
