export const DEFAULT_PREFIXES = {
  waybill: 'WBL',
  invoice: 'INV',
  boq: 'BOQ',
  rfq: 'RFQ',
  quotation: 'QTN',
  project: 'PRJ',
  csr: 'CSR',
  receipt: 'RCP',
  letter: 'LTR',
} as const

export type DocumentPrefixKey = keyof typeof DEFAULT_PREFIXES

export type DocumentPrefixes = Record<DocumentPrefixKey, string>

export function resolvePrefix(
  documentPrefixes: Record<string, string> | null | undefined,
  key: DocumentPrefixKey,
): string {
  const value = documentPrefixes?.[key]
  if (typeof value === 'string' && /^[A-Z0-9]{2,6}$/.test(value)) {
    return value
  }
  return DEFAULT_PREFIXES[key]
}

/**
 * Canonical serial width for automatic document numbers.
 * Matches the prefix-engine standard and the Settings preview contract.
 */
export const DOCUMENT_SERIAL_WIDTH = 6

/**
 * Canonical automatic document number: `{PREFIX}-{zero-padded sequence}`.
 * Examples: `SASINV-000001`, `QTN-000001`, `RFQ-000001`.
 * All automatic generators MUST use this instead of local formatting.
 */
export function formatDocumentNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(DOCUMENT_SERIAL_WIDTH, '0')}`
}

/**
 * Extracts the trailing digit sequence from a document number.
 * Returns null when the number ends in non-digit characters.
 */
export function parseTrailingSequence(value: string | null | undefined): number | null {
  const match = String(value || '').trim().match(/(\d+)$/)
  return match ? Number(match[1]) : null
}

/**
 * Reserved `document_prefixes` key holding per-family automatic cursors:
 * `{ "__auto_seq": { "SASINV-": 4 } }`.
 * A cursor records automatic allocation progression only. Manual numbers
 * never move it. The CHECK constraint pattern-checks listed prefix keys
 * only, so this reserved key needs no schema migration.
 */
export const AUTO_CURSOR_KEY = '__auto_seq'

/**
 * Reads the persisted automatic cursor for a family.
 * Returns undefined when absent or invalid (caller bootstraps instead).
 */
export function readAutoCursor(prefixesJson: unknown, family: string): number | undefined {
  if (!prefixesJson || typeof prefixesJson !== 'object' || Array.isArray(prefixesJson)) return undefined
  const cursors = (prefixesJson as Record<string, unknown>)[AUTO_CURSOR_KEY]
  if (!cursors || typeof cursors !== 'object' || Array.isArray(cursors)) return undefined
  const value = (cursors as Record<string, unknown>)[family]
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

/**
 * Merges a cursor bump into raw prefixes JSON. Monotonic per family:
 * the stored value never moves backward, so late writes cannot rewind it.
 * All other keys pass through untouched.
 */
export function mergeAutoCursor(
  prefixesJson: unknown,
  family: string,
  seq: number,
): Record<string, unknown> {
  const raw = (
    prefixesJson && typeof prefixesJson === 'object' && !Array.isArray(prefixesJson)
      ? prefixesJson
      : {}
  ) as Record<string, unknown>
  const existing = raw[AUTO_CURSOR_KEY]
  const cursors =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {}
  const previous = cursors[family]
  const prevSeq = typeof previous === 'number' && Number.isInteger(previous) && previous > 0 ? previous : 0
  cursors[family] = Math.max(prevSeq, seq)
  return { ...raw, [AUTO_CURSOR_KEY]: cursors }
}

/**
 * Drops cursor state for the given families. Used when a prefix reset
 * promises a fresh sequence. Historical numbers are untouched; the
 * skip-scan still refuses to reuse occupied identifiers.
 */
export function clearAutoCursors(
  prefixesJson: unknown,
  families: string[],
): Record<string, unknown> {
  const raw = (
    prefixesJson && typeof prefixesJson === 'object' && !Array.isArray(prefixesJson)
      ? prefixesJson
      : {}
  ) as Record<string, unknown>
  const existing = raw[AUTO_CURSOR_KEY]
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) return { ...raw }
  const cursors = { ...(existing as Record<string, unknown>) }
  for (const family of families) delete cursors[family]
  if (Object.keys(cursors).length === 0) {
    const rest = { ...(raw as Record<string, unknown>) }
    delete rest[AUTO_CURSOR_KEY]
    return rest
  }
  return { ...raw, [AUTO_CURSOR_KEY]: cursors }
}

/**
 * Cursor families owned by a prefix key. A reset of that prefix clears
 * exactly these families. Families embed routing/variant tokens, so
 * waybill owns four and CSR owns two.
 */
export function cursorFamiliesForPrefixKey(docKey: string, prefix: string): string[] {
  if (docKey === 'waybill') return [`${prefix}-E-`, `${prefix}-I-`, `${prefix}-ME-`, `${prefix}-MI-`]
  if (docKey === 'csr') return [`${prefix}-`, `${prefix}-M-`]
  return [`${prefix}-`]
}

/**
 * Merges a prefix draft over raw stored JSON without dropping unknown
 * keys (in particular the automatic cursor map). Settings UIs MUST save
 * through this helper instead of replacing the whole object.
 */
export function mergePrefixUpdate(
  raw: unknown,
  draft: Record<string, string>,
): Record<string, unknown> {
  const base =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return { ...base, ...draft }
}

/**
 * Prefix reset that also clears the affected cursor families, so the
 * promised fresh sequence actually restarts. Occupied historical numbers
 * are still skipped, so a restart can never reuse an existing identifier.
 */
export function resetPrefixUpdate(
  raw: unknown,
  key: string,
  defaultVal: string,
  families: string[],
): Record<string, unknown> {
  return clearAutoCursors(mergePrefixUpdate(raw, { [key]: defaultVal }), families)
}

/**
 * Full reset to defaults with all cursor state dropped.
 */
export function resetAllPrefixesUpdate(
  raw: unknown,
  defaults: Record<string, string>,
): Record<string, unknown> {
  const merged = mergePrefixUpdate(raw, defaults)
  delete merged[AUTO_CURSOR_KEY]
  return merged
}

/**
 * Advances from a start sequence past every occupied identifier.
 * Pure skip-scan over ground-truth strings: occupied manual numbers,
 * legacy numbers, and concurrent allocations are all skipped alike.
 */
export function findFreeSequence(
  family: string,
  fromSeq: number,
  occupied: Set<string> | string[],
): number {
  const occupiedSet = Array.isArray(occupied) ? new Set(occupied) : occupied
  let seq = Math.max(1, Math.floor(fromSeq) || 1)
  while (occupiedSet.has(`${family}${String(seq).padStart(DOCUMENT_SERIAL_WIDTH, '0')}`)) {
    seq += 1
  }
  return seq
}

/**
 * Next automatic candidate for a family. `cursor` is the persisted
 * automatic position, or undefined to bootstrap from existing rows.
 * Manual numbers in `occupied` never move the start; they are only
 * skipped when the scan reaches them.
 */
export function nextAutomaticNumber(
  family: string,
  cursor: number | undefined,
  occupied: string[],
  maxSeq: number = 0,
): { candidate: string; seq: number } {
  const start = cursor ?? maxSeq + 1
  const seq = findFreeSequence(family, start, occupied)
  return {
    candidate: `${family}${String(seq).padStart(DOCUMENT_SERIAL_WIDTH, '0')}`,
    seq,
  }
}
