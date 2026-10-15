// ============================================================================
// SUPPLIER PURCHASE ORDER — numbering contract
// ============================================================================
// The PO does NOT get a numbering engine of its own. It joins the established
// authority:
//
//   `settings.document_prefixes.purchase_order`   configured prefix ('PO')
//   `formatDocumentNumber()`                      `{PREFIX}-{6-digit sequence}`
//   `nextAutomaticNumber()` + `findFreeSequence()` skip-scan past occupied ids
//   `settings.document_prefixes.__auto_seq`       automatic cursor, `PO-` family
//   `purchase_orders.po_number UNIQUE`            database arbitration
//
// Rules inherited unchanged from the prefix-engine standard:
//   * An automatic number uses the configured prefix.
//   * Manual numbers must be unique, and collide with no occupied number.
//   * A MANUAL number never advances the automatic sequence.
//   * An AUTOMATIC number skips every occupied number, whatever its origin.
//   * Two concurrent saves cannot produce the same PO number: the unique
//     constraint rejects the loser, and the loser retries a fresh candidate.
//
// Existing Invoice / Quotation / CPS numbering is untouched by this module.
// ============================================================================

import {
  formatDocumentNumber,
  nextAutomaticNumber,
  parseTrailingSequence,
  resolvePrefix,
  type DocumentPrefixes,
} from '@/domain/prefixConstants'

/** The `document_prefixes` key and `settings` CHECK key for this document. */
export const PURCHASE_ORDER_PREFIX_KEY = 'purchase_order'

/** Fallback prefix when the tenant has configured none. Matches `DEFAULT_PREFIXES`. */
export const PURCHASE_ORDER_DEFAULT_PREFIX = 'PO'

/** The tenant's configured PO prefix, or the canonical fallback. */
export function resolvePurchaseOrderPrefix(
  documentPrefixes: Partial<DocumentPrefixes> | Record<string, string> | null | undefined,
): string {
  return resolvePrefix(documentPrefixes, PURCHASE_ORDER_PREFIX_KEY)
}

/** The automatic cursor family for a prefix. A PO has a single family. */
export function purchaseOrderNumberFamily(prefix: string): string {
  return `${prefix}-`
}

/**
 * The next automatic PO number.
 *
 * `cursor` is the persisted automatic position, or undefined to bootstrap from
 * existing rows. `rows` is the ground truth of already-allocated numbers.
 */
export function getNextPurchaseOrderNumber(
  rows: Array<{ po_number?: string | null }>,
  prefix: string = PURCHASE_ORDER_DEFAULT_PREFIX,
  cursor?: number,
): string {
  const family = purchaseOrderNumberFamily(prefix)
  const upperPrefix = prefix.toUpperCase()
  const occupied = rows
    .map((row) => String(row.po_number ?? '').trim().toUpperCase())
    .filter((value) => value.startsWith(upperPrefix))
  const maxSequence = occupied
    .map((value) => parseTrailingSequence(value))
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return nextAutomaticNumber(family, cursor, occupied, maxSequence).candidate
}

/** Canonical preview formatting, shared with the Settings preview contract. */
export function formatPurchaseOrderNumber(prefix: string, sequence: number): string {
  return formatDocumentNumber(prefix, sequence)
}

/**
 * True when a number is a system-generated candidate for this prefix, i.e. it
 * matches the canonical `{PREFIX}-{6 digits}` shape.
 *
 * The save path advances the automatic cursor only for automatic numbers, so
 * this predicate is what keeps a manual number from moving the sequence.
 */
export function isAutomaticPurchaseOrderNumber(
  value: string | null | undefined,
  prefix: string,
): boolean {
  const candidate = String(value ?? '').trim().toUpperCase()
  if (!candidate) return false
  return new RegExp(`^${prefix.toUpperCase()}-\\d{6}$`).test(candidate)
}
