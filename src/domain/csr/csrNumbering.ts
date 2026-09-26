/**
 * Pure CSR numbering helpers (DOM-free).
 *
 * Lives in domain so tests and non-React code can import it without
 * pulling the tsx preview-template chain in `components/csr/csrUtils`.
 * `csrUtils.ts` re-exports these to preserve existing imports.
 */

import { nextAutomaticNumber, parseTrailingSequence } from '@/domain/prefixConstants'

function normalizeLetters(value: string): string {
  return value.toUpperCase()
}

export function incrementTrailingLetters(value: string): string {
  if (!value) return 'A'
  const chars = normalizeLetters(value).split('')
  let carry = 1

  for (let index = chars.length - 1; index >= 0; index -= 1) {
    if (!carry) break
    const code = chars[index].charCodeAt(0) - 65 + carry
    if (code >= 26) {
      chars[index] = 'A'
      carry = 1
    } else {
      chars[index] = String.fromCharCode(65 + code)
      carry = 0
    }
  }

  if (carry) chars.unshift('A')
  return chars.join('')
}

/**
 * Family rule: continue the latest row's family when it belongs to this
 * prefix, otherwise seed a fresh `{prefix}-` family.
 */
export function csrFamilyFor(prefix: string, lastValue: string | null | undefined): string {
  const latest = String(lastValue || '').trim().toUpperCase()
  const plainFamily = `${prefix.toUpperCase()}-`
  const stripped = latest.replace(/(\d+|[A-Za-z]+)$/, '')
  return latest.startsWith(prefix.toUpperCase()) && stripped.endsWith('-') && stripped.length > prefix.length
    ? stripped
    : plainFamily
}

export function getNextCsrNumber(
  lastValue: string | null | undefined,
  prefix: string = 'CSR',
  cursor?: number,
  occupied: string[] = [],
): string {
  // The cursor (not the latest value) positions the sequence; manuals
  // never advance it. Occupied identifiers are skipped when reached.
  const family = csrFamilyFor(prefix, lastValue)
  const familyOccupied = [...occupied.map((n) => String(n || '').trim().toUpperCase())]
  if (lastValue) familyOccupied.push(String(lastValue).trim().toUpperCase())
  const candidates = familyOccupied.filter((value) => value.startsWith(family))
  const maxNumber = candidates
    .map((value) => parseTrailingSequence(value))
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return nextAutomaticNumber(family, cursor, candidates, maxNumber).candidate
}
