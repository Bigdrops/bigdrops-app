import type { TableDocumentRow } from '@/domain/table-document/types'

/**
 * Phase 2 — stable row-level lineage and downstream feedback authority.
 *
 * This module is pure: no network import, no Supabase import. It is safe to
 * unit test and to reuse from the future Phase 3 feedback writer.
 *
 * Identity rule: a CPS-origin downstream row is identified ONLY by explicit
 * stored ids. Lineage never derives from description, row position, quantity,
 * unit, price, group, image, catalog `item_id`, or any fuzzy matching.
 */

export type FeedbackAuthorityStage = 'quotation' | 'invoice'

export const FEEDBACK_AUTHORITY_STAGES: readonly FeedbackAuthorityStage[] = ['quotation', 'invoice']

/**
 * The uniform lineage contract carried by both line-item tables
 * (`quotation_items` and `invoice_items`).
 *
 * Both tables carry all four columns so the single shared item serializer
 * (`toDbItem`) can round-trip lineage for either target without knowing which
 * table it is writing to. On `quotation_items`, the two `source_quotation_*`
 * columns are always NULL; they describe the Quotation ancestry of an
 * Invoice row.
 */
export interface ItemLineage {
  source_cps_id: string | null
  source_cps_row_id: string | null
  source_quotation_id: string | null
  source_quotation_item_id: string | null
}

export const LINEAGE_COLUMNS = [
  'source_cps_id',
  'source_cps_row_id',
  'source_quotation_id',
  'source_quotation_item_id',
] as const

export type LineageColumn = (typeof LINEAGE_COLUMNS)[number]

const CPS_LINEAGE_COLUMNS: readonly LineageColumn[] = ['source_cps_id', 'source_cps_row_id']

export function emptyLineage(): ItemLineage {
  return {
    source_cps_id: null,
    source_cps_row_id: null,
    source_quotation_id: null,
    source_quotation_item_id: null,
  }
}

/** Columns an insert may reference (also the shape accepted by the writers). */
export type LineageCarrier = Partial<Record<LineageColumn, string | null | undefined>>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A lineage id is only written when it is a real persisted uuid.
 *
 * Client-side row identities (`_uiKey`) and empty strings are rejected, so a
 * row that has not been persisted yet can never claim ancestry. `null` is
 * always a safe answer: "lineage unavailable", never a guess.
 */
export function isPersistableLineageId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim())
}

/** Normalise a lineage id to a writable value or null. Never guesses. */
export function normalizeLineageId(value: unknown): string | null {
  return isPersistableLineageId(value) ? value.trim() : null
}

/**
 * The CPS row identity used for lineage.
 *
 * ONLY the persisted `cps_rows.id` qualifies. The in-memory `_uiKey` is a
 * client-side identity that does not survive reload, so it is never promoted
 * to lineage. A row without a persisted id yields null and is reported as an
 * un-lineaged row instead of being matched by position or description.
 */
export function cpsRowLineageId(row: Pick<TableDocumentRow, 'id'>): string | null {
  return normalizeLineageId(row?.id)
}

/**
 * Lineage written onto a Quotation item created by a CPS → Quotation
 * conversion.
 *
 * Section/group rows receive document ancestry only (`source_cps_id`) and
 * never a row id, so a structural row can never be mistaken for commercial
 * item feedback lineage. Phase 3 synchronises approved item rows only.
 */
export function buildCpsRowLineage(
  cpsId: unknown,
  row: Pick<TableDocumentRow, 'id' | 'row_type'>,
): ItemLineage {
  const isSection = row?.row_type === 'section'
  return {
    source_cps_id: normalizeLineageId(cpsId),
    source_cps_row_id: isSection ? null : cpsRowLineageId(row),
    source_quotation_id: null,
    source_quotation_item_id: null,
  }
}

/**
 * Lineage written onto an Invoice item created from a Quotation item.
 *
 * CPS ancestry is copied verbatim from the source Quotation item; the
 * Quotation document/item ancestry is added explicitly. A Quotation row that
 * never had CPS ancestry keeps `source_cps_*` NULL — it is not inferred from
 * a neighbouring row, a shared catalog item, or an identical description.
 */
export function buildInvoiceItemLineage(
  quotationId: unknown,
  item: {
    id?: string | null
    row_type?: string | null
    source_cps_id?: string | null
    source_cps_row_id?: string | null
  } | null | undefined,
): ItemLineage {
  const isGroupHeader = item?.row_type === 'group_header'
  return {
    source_cps_id: normalizeLineageId(item?.source_cps_id),
    source_cps_row_id: isGroupHeader ? null : normalizeLineageId(item?.source_cps_row_id),
    source_quotation_id: normalizeLineageId(quotationId),
    source_quotation_item_id: normalizeLineageId(item?.id),
  }
}

/** True when the row claims a CPS origin (document or row level). */
export function hasCpsLineage(row: LineageCarrier | null | undefined): boolean {
  return CPS_LINEAGE_COLUMNS.some((column) => isPersistableLineageId(row?.[column]))
}

/** True when the row claims any lineage at all. */
export function hasAnyLineage(row: LineageCarrier | null | undefined): boolean {
  return LINEAGE_COLUMNS.some((column) => isPersistableLineageId(row?.[column]))
}

/** Stable comparison key for lineage state. Used to skip no-op writes. */
export function lineageSignature(row: LineageCarrier | null | undefined): string {
  return LINEAGE_COLUMNS.map((column) => normalizeLineageId(row?.[column]) ?? '').join('|')
}

/** True when two lineage carriers describe the same ancestry. */
export function sameLineage(
  left: LineageCarrier | null | undefined,
  right: LineageCarrier | null | undefined,
): boolean {
  return lineageSignature(left) === lineageSignature(right)
}

/** Strip lineage from a payload that must not inherit ancestry (duplicates). */
export function withoutLineage<T extends Record<string, unknown>>(row: T): T {
  const clone: Record<string, unknown> = { ...row }
  for (const column of LINEAGE_COLUMNS) delete clone[column]
  return clone as T
}

export interface QuotationLineageSummaryInput {
  /** Item rows written by the conversion (standard rows only are counted). */
  items: Array<{ row_type?: string | null; source_cps_row_id?: string | null }>
  /** Labels of rows that should have carried lineage but could not. */
  unlineagedRowLabels?: string[]
}

/**
 * Human sentence for the CPS conversion audit event. Returns null when the
 * conversion established no row ancestry at all.
 */
export function summarizeQuotationLineage(input: QuotationLineageSummaryInput): string | null {
  const standardRows = (input.items || []).filter((item) => item?.row_type !== 'group_header')
  const linked = standardRows.filter((item) => isPersistableLineageId(item?.source_cps_row_id)).length
  if (linked === 0) return null

  const suffix = linked === 1 ? '1 CPS item' : `${linked} CPS items`
  return `Row ancestry established for ${suffix}.`
}

/** Diagnostic sentence for rows that could not carry lineage. */
export function summarizeUnlineagedRows(labels: string[] | undefined): string | null {
  const count = (labels || []).length
  if (count === 0) return null
  const suffix = count === 1 ? '1 converted item' : `${count} converted items`
  return `Lineage unavailable for ${suffix}.`
}

export interface FeedbackAuthorityState {
  stage: FeedbackAuthorityStage
  documentId: string | null
}

export function isFeedbackAuthorityStage(value: unknown): value is FeedbackAuthorityStage {
  return typeof value === 'string' && (FEEDBACK_AUTHORITY_STAGES as readonly string[]).includes(value)
}

/** Persisted authority columns written when a conversion changes authority. */
export function feedbackAuthorityUpdate(
  stage: FeedbackAuthorityStage,
  documentId: unknown,
  updatedAt: string,
): {
  feedback_authority: FeedbackAuthorityStage
  feedback_authority_document_id: string | null
  feedback_authority_updated_at: string
} {
  return {
    feedback_authority: stage,
    feedback_authority_document_id: normalizeLineageId(documentId),
    feedback_authority_updated_at: updatedAt,
  }
}

/**
 * Resolve the active downstream feedback authority for a CPS conversion
 * chain from persisted state only.
 *
 * Deterministic: it never considers `updated_at`, "most recently edited",
 * document existence, or any client state. A chain with no CPS ancestry, or
 * with an unreadable authority value, resolves to null (= no downstream
 * authority claimed).
 */
export function resolveActiveFeedbackAuthority(
  quotation:
    | {
        id?: string | null
        source_cps_id?: string | null
        feedback_authority?: string | null
        feedback_authority_document_id?: string | null
      }
    | null
    | undefined,
): FeedbackAuthorityState | null {
  if (!quotation) return null
  const stage = String(quotation.feedback_authority ?? '').trim().toLowerCase()
  if (!isFeedbackAuthorityStage(stage)) return null

  const documentId =
    normalizeLineageId(quotation.feedback_authority_document_id) ??
    (stage === 'quotation' ? normalizeLineageId(quotation.id) : null)

  return { stage, documentId }
}

/** True when the given stage currently owns authority for the chain. */
export function feedbackStageOwnsAuthority(
  quotation:
    | { id?: string | null; feedback_authority?: string | null; feedback_authority_document_id?: string | null }
    | null
    | undefined,
  stage: FeedbackAuthorityStage,
): boolean {
  return resolveActiveFeedbackAuthority(quotation)?.stage === stage
}

/**
 * Phase 2.5 — conversion chain identity.
 *
 * One CPS document may be converted more than once. Each conversion is a
 * separate chain, so downstream lifecycle events must correlate to the chain
 * rather than to the CPS document as a whole:
 *
 *   CPS document
 *     |-- chain A -> QTN-A -> INV-A
 *     `-- chain B -> QTN-B -> INV-B
 *
 * The chain id is generated once, when the CPS -> Quotation conversion
 * succeeds, and is then carried onto the derived Invoice. It is never derived
 * from a document number and never inferred.
 */
export type ConversionChainId = string

/** Mint a new conversion chain id. Falls back only when no CSPRNG exists. */
export function newConversionChainId(): ConversionChainId {
  const cryptoApi = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()

  // RFC 4122 v4 fallback. Only reachable in a runtime without crypto.randomUUID.
  let out = ''
  for (let i = 0; i < 32; i += 1) out += Math.floor(Math.random() * 16).toString(16)
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-4${out.slice(13, 16)}-a${out.slice(17, 20)}-${out.slice(20, 32)}`
}

/** A persisted chain id, or null. Never guesses. */
export function normalizeChainId(value: unknown): ConversionChainId | null {
  return normalizeLineageId(value)
}

/**
 * Which document currently owns downstream feedback authority for a chain.
 * `authorityRowId` is the quotation row that carries the authority columns —
 * for a revert or a re-conversion inside the same chain this is the original
 * conversion target, not the newly created document.
 */
export interface ChainAuthorityTarget {
  authorityRowId: string
  stage: FeedbackAuthorityStage
  documentId: string | null
}

/** Audit sentence for the Quotation → Invoice authority handoff. */
export function authorityTransitionSummary(
  quotationNumber: string | null | undefined,
  invoiceNumber: string | null | undefined,
): string {
  const from = String(quotationNumber || '').trim() || 'Quotation'
  const to = String(invoiceNumber || '').trim() || 'Invoice'
  return `Feedback authority moved: ${from} → ${to}`
}
