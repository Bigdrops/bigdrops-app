/**
 * bolu-document-service.ts — Application-Side Persistence Service for Bolu Operations
 *
 * Implements authoritative application-owned execution and database persistence
 * for invoices and quotations initiated through Bolu.
 *
 * Strict Guardrails:
 * - Enforces authorization at the tenant boundary and database RPC.
 * - Reuses existing transactional RPC (`save_invoice_with_items_transaction`) when entityId is present.
 * - Employs `withUniqueRetry` for collision-safe sequence numbering.
 * - Cleans up partial writes if sequential fallback is used.
 * - Enforces Gate 1 and Gate 2 before database writes.
 * - Recalculates financial fields via authoritative `calculateDocument`.
 * - Prevents duplicate submissions and rejects stale proposals.
 */

import { numberToWords } from '@/lib/formatters/money'
import type { TenantClient } from '@/lib/tenantClient'
import { toDbItem } from '@/domain/invoice'
import { computeDocument } from '@/lib/Calculations'
import { inferLegacyCalculationInputs } from '@/domain/invoice'
import { getNextInvoiceNumber } from '@/domain/documentConversion'
import { resolvePrefix } from '@/domain/prefixConstants'
import { advanceAutoCursor, fetchAutoCursor, fetchDocumentPrefixesSafe } from '@/domain/documentNumbering'
import { getNextQuotationNumber } from '@/domain/quotation'
import { parseTrailingSequence } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import {
  getAdvanceInvoiceMetadata,
  mergeAdvanceInvoiceMetadata,
  clearAdvanceInvoiceMetadata,
} from '@/domain/invoice/advanceMetadata'
import { buildAdvanceParentInvoiceMetadata } from '@/domain/invoice/advanceChildFlow'
import { normalizeRichTextHtml } from '@/components/pdf/core/richText'
import type { BoluReadAuthorization, BoluWriteAuthorization } from './bolu-data'
import {
  recordBoluDocumentCreationAudit,
  recordBoluDocumentModificationAudit,
  type BoluAuditActor,
} from './bolu-audit'
import {
  computeAuthoritativeTotals,
  isProposalStale,
  type BoluInvoiceCreateProposal,
  type BoluInvoiceModifyProposal,
  type BoluAdvanceConfigProposal,
  type BoluAdvanceFieldKey,
  type BoluInvoiceItemInput,
  type BoluExtraChargeInput,
  type BoluCalculationInputValues,
} from './bolu-operations'

// Supplementary in-process guard against accidental double-clicks.
// The database-level unique index on the `operation_id` column is the
// authoritative concurrency guarantee (see migration 20261118120000).
// This Set only spans one serverless instance and is not a substitute
// for the database enforcement.
const executedOperationIds = new Set<string>()

/**
 * Exact database constraint identities for the operation-id unique indexes
 * created by migration 20261118120000. Kept distinct per document family so
 * a quotation violation can never be classified as an invoice replay (or
 * vice versa).
 */
const OPERATION_ID_CONSTRAINTS = {
  invoice: 'idx_invoices_operation_id_unique',
  quotation: 'idx_quotations_operation_id_unique',
} as const

/**
 * Returns true when `text` contains `identifier` as a whole word. PostgreSQL
 * reports the violated constraint name inside the PostgREST error `message`
 * (e.g. `duplicate key value violates unique constraint
 * "idx_invoices_operation_id_unique"`). Matching the whole identifier —
 * not a loose substring — prevents `idx_invoices_invoice_number_unique`
 * from ever being mistaken for an operation-id violation.
 */
function mentionsConstraint(text: string | undefined, identifier: string): boolean {
  if (typeof text !== 'string') return false
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`, 'i').test(text)
}

/**
 * Identifies a 23505 that is specifically an operation-id uniqueness
 * violation for the requested document family.
 *
 * Observed error shape (verified from @supabase/postgrest-js PostgrestError):
 * `code`, `message`, `details`, `hint` only. PostgREST does NOT expose a
 * typed `constraint` field, so the constraint identity is read from the
 * `message`/`details` text. We require an exact match of the family's
 * known constraint name. A narrow fallback accepts PostgreSQL's explicit
 * `Key (operation_id)=` detail when no constraint name is present, and only
 * when the other family's constraint is not named.
 *
 * Document-number collisions and unrelated unique violations return false
 * and continue through the normal `withUniqueRetry` number-collision path.
 */
export function isOperationIdConflict(
  error: { code?: string; message?: string; details?: string } | null | undefined,
  family: 'invoice' | 'quotation',
): boolean {
  if (!error || error.code !== '23505') return false
  const expected = OPERATION_ID_CONSTRAINTS[family]
  const other = OPERATION_ID_CONSTRAINTS[family === 'invoice' ? 'quotation' : 'invoice']
  const message = error.message || ''
  const details = error.details || ''

  // Explicitly the other family's constraint: never a replay for this family.
  if (mentionsConstraint(message, other) || mentionsConstraint(details, other)) return false

  // Primary: exact constraint identity in PostgREST message or details.
  if (mentionsConstraint(message, expected) || mentionsConstraint(details, expected)) return true

  // Narrow fallback: PostgreSQL's key detail. Only when no constraint name
  // was exposed at all, so an unknown named constraint is not guessed at.
  const anyNamedConstraint = [OPERATION_ID_CONSTRAINTS.invoice, OPERATION_ID_CONSTRAINTS.quotation]
    .some((name) => mentionsConstraint(message, name) || mentionsConstraint(details, name))
  if (anyNamedConstraint) return false
  return /Key\s*\(\s*operation_id\s*\)\s*=/i.test(details)
}

export interface BoluOperationExecutionResult {
  success: boolean
  documentId?: string
  documentNumber?: string
  error?: string
  /**
   * Non-fatal integrity notices from the operation (e.g. items that could
   * not be matched safely and were recreated fresh). Never authoritative;
   * callers should surface them verbatim rather than infer preservation.
   */
  warnings?: string[]
}

/**
 * Asserts that the tenant is ready and has a valid authenticated schema.
 */
function assertTenantAuthorization(
  tenantClient: TenantClient,
  canWrite: BoluWriteAuthorization,
  resource: 'invoice' | 'quotation',
  action: 'create' | 'edit',
): void {
  if (!tenantClient.isReady || !tenantClient.schemaName) {
    throw new Error('Tenant context is not ready or unauthorized.')
  }
  if (!canWrite(resource, action)) {
    // The action is the canonical has_entity_permission action, so this reads
    // exactly like the permission the tenant RPC enforces.
    throw new Error(`You do not have permission to ${action} ${resource}s in this business entity.`)
  }
}

/**
 * Serializes the commercial metadata the standard document forms persist in
 * `custom_fields`. Keeping this shape identical lets reopened documents and the
 * authoritative calculation engine read Bolu-created records unchanged.
 */
function buildBoluCustomFields(
  proposal: BoluInvoiceCreateProposal,
  family: 'invoice' | 'quotation' = 'invoice',
): string {
  const payload = proposal.payload
  const cf: Record<string, unknown> = {
    created_via: 'bolu_assistant',
    operation_id: proposal.opId,
    extraCharges: (payload.extra_charges ?? []).map((charge) => ({
      label: charge.label,
      value: charge.value,
      withTax: charge.vatApplicable,
    })),
    chargeLabels: {},
    calculationInputs: {
      vatPercent: payload.global_vat_percent ?? 7.5,
      discountValue: payload.discount ?? 0,
      whtValue: payload.wht ?? 0,
      discountType: payload.discount_type ?? 'percent',
      discountTiming: payload.discount_timing ?? 'before_tax',
      whtType: payload.wht_type ?? 'percent',
    },
    discountType: payload.discount_type ?? 'percent',
    discountTiming: payload.discount_timing ?? 'before_tax',
    whtType: payload.wht_type ?? 'percent',
  }
  // Quotations have no payment_terms column; the form persists them in
  // custom_fields.payment_terms. The create path must mirror that so the
  // value survives and can be stale-checked on later edits.
  if (family === 'quotation' && payload.payment_terms) {
    cf.payment_terms = payload.payment_terms
  }
  return JSON.stringify(cf)
}

/**
 * Finds a document already written for this operation.
 *
 * The dedicated `operation_id` column (added by migration
 * 20261118120000_bolu_operation_idempotency.sql) is the durable idempotency
 * key. A partial unique index enforces that at most one row per tenant
 * schema can carry a given operation_id, so this lookup is backed by a
 * database guarantee — it is not merely a read-before-write race.
 *
 * The in-memory `executedOperationIds` Set only protects one serverless
 * instance. The database index is the cross-instance authority.
 */
async function findPersistedOperation(
  tenantClient: TenantClient,
  family: 'invoice' | 'quotation',
  opId: string,
): Promise<{ id: string; number: string; operationId: string | null } | null> {
  if (!opId) return null
  const table = family === 'invoice' ? 'invoices' : 'quotations'
  const numberColumn = family === 'invoice' ? 'invoice_number' : 'quotation_number'
  try {
    const { data, error } = await tenantClient
      .from(table)
      .select(`id, ${numberColumn}, operation_id`)
      .eq('operation_id', opId)
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    const row = data as Record<string, unknown>
    return {
      id: String(row.id),
      number: String(row[numberColumn] ?? ''),
      operationId: row.operation_id == null ? null : String(row.operation_id),
    }
  } catch {
    // A lookup failure is not proof of absence. The caller proceeds to
    // attempt an insert; the unique index on operation_id is the actual
    // guarantee — a duplicate insert will raise 23505 and be handled as a
    // replay by the caller's error-handling path.
    return null
  }
}

/**
 * Retrieves an existing document for a CONFIRMED operation-id conflict and
 * verifies it is the correct replay target before reporting success.
 *
 * Verification requires all of:
 *   - the tenant client is ready and scoped to a concrete schema;
 *   - a row was found in the correct family table via the tenant client;
 *   - that row's persisted `operation_id` exactly matches the proposal's.
 *
 * Any failed check returns null, so the caller reports a failure rather than
 * a false successful replay.
 */
async function findVerifiedReplay(
  tenantClient: TenantClient,
  family: 'invoice' | 'quotation',
  opId: string,
): Promise<{ id: string; number: string } | null> {
  if (!tenantClient || !tenantClient.isReady || !tenantClient.schemaName) return null
  const existing = await findPersistedOperation(tenantClient, family, opId)
  if (!existing) return null
  if (existing.operationId !== opId) return null
  return { id: existing.id, number: existing.number }
}

/**
 * Parses the persisted `custom_fields` payload. Invoices store custom_fields
 * as text, quotations as jsonb; both can also arrive as an object. Returns
 * a fresh plain object, never the parsed reference.
 */
function parseCustomFields(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) }
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, unknown>) }
      }
    } catch {
      return {}
    }
  }
  return {}
}

function parseCustomData(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) }
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, unknown>) }
      }
    } catch {
      return {}
    }
  }
  return {}
}

/** Strict RFC-4122 UUID (version 1–5, variant nibble 8/9/a/b). */
const STRICT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isStrictUuid = (value: unknown): value is string =>
  typeof value === 'string' && STRICT_UUID_RE.test(value.trim())

/**
 * Matches incoming (validated) items against the persisted item set.
 *
 * Identity contract, applied in order:
 *   Pass 1 — explicit identity: an incoming row carrying `item_id` matches a
 *   persisted row with the same identity only when that identity is unique
 *   among the currently unmatched candidates. A missing or duplicated
 *   identity is never resolved by position or arbitrary ordering; the row
 *   abstains from matching entirely and a warning is recorded.
 *   Pass 2 — similarity floor: each unmatched incoming row may borrow
 *   persisted metadata only from an unmatched candidate whose normalized
 *   description is exactly equal (which is what the score-10 floor encodes).
 *   If exactly one candidate reaches the top qualifying score (>= 10), it is
 *   used. If two or more tie for that score, the row abstains — nothing is
 *   borrowed from either candidate — and a warning is recorded. Rows below
 *   the floor are treated as new and a warning is recorded as well.
 *
 * Passes are applied independently and never consume candidates from rows
 * that abstain, so a tie on row i cannot silently transfer metadata to row j
 * by order of processing. Unmatched persisted rows are removed by the
 * caller; an incoming row that cannot borrow metadata is recreated fresh
 * (never by position).
 */
function matchBoluItems(
  currentItems: Array<Record<string, any>>,
  newItems: BoluInvoiceItemInput[],
): { matches: Array<{ current: Record<string, any> | null }>; warnings: string[] } {
  const used = new Set<number>()
  const warnings: string[] = []
  const matched: Array<Record<string, any> | null> = newItems.map(() => null)
  const abstain = new Set<number>()

  // Pass 1: explicit identity, unique among unmatched candidates.
  for (let i = 0; i < newItems.length; i++) {
    const wanted = typeof newItems[i].item_id === 'string' ? newItems[i].item_id.trim() : ''
    if (!wanted) continue
    const candidates: number[] = []
    for (let j = 0; j < currentItems.length; j++) {
      if (used.has(j)) continue
      if (String(currentItems[j]?.item_id ?? '').trim() === wanted) candidates.push(j)
    }
    if (candidates.length === 1) {
      used.add(candidates[0])
      matched[i] = currentItems[candidates[0]]
    } else {
      // Zero or duplicated identity: abstain rather than guess or fall
      // through into a similarity match that would transfer sibling rows'
      // metadata. A zero-candidate identity is not an error by itself — the
      // reference is handled by the catalog sanitizer, which emits its own
      // verdict-specific warning; a DUPLICATED identity is ambiguous and is
      // flagged here.
      abstain.add(i)
      if (candidates.length > 1) {
        warnings.push(
          `Item ${i + 1}: identity "${wanted}" could not be uniquely resolved (${candidates.length} candidates); row treated as new and persisted lineage/metadata was not retained.`,
        )
      }
    }
  }

  const score = (c: Record<string, any>, n: BoluInvoiceItemInput): number => {
    let s = 0
    if (String(c?.description ?? '').trim().toLowerCase() === String(n?.description ?? '').trim().toLowerCase()) s += 10
    if (Number(c?.quantity ?? -1) === Number(n?.quantity ?? -2)) s += 2
    if (Number(c?.unit_price ?? -1) === Number(n?.unit_price ?? -2)) s += 2
    if (String(c?.unit ?? '').trim().toLowerCase() === String(n?.unit ?? '').trim().toLowerCase()) s += 1
    return s
  }

  // Pass 2: exact-description similarity floor with ambiguity abstention.
  const FLOOR = 10
  for (let i = 0; i < newItems.length; i++) {
    if (matched[i] || abstain.has(i)) continue
    let bestScore = 0
    const top: number[] = []
    for (let j = 0; j < currentItems.length; j++) {
      if (used.has(j)) continue
      const s = score(currentItems[j], newItems[i])
      if (s < FLOOR) continue
      if (s > bestScore) {
        bestScore = s
        top.length = 0
        top.push(j)
      } else if (s === bestScore) {
        top.push(j)
      }
    }
    if (top.length === 1) {
      used.add(top[0])
      matched[i] = currentItems[top[0]]
    } else if (top.length > 1) {
      // Tied at the floor: deterministic evidence does not distinguish the
      // candidates. Abstain rather than let position decide; the row is
      // recreated fresh by the caller.
      abstain.add(i)
      warnings.push(
        `Item ${i + 1}: ${top.length} persisted rows tie for the same item; persisted identity/metadata could not be established safely and the row was treated as new.`,
      )
    } else {
      warnings.push(
        `Item ${i + 1}: no persisted row could be matched safely (similarity floor not met); the row was recreated fresh and persisted lineage/metadata may have been lost.`,
      )
    }
  }

  return { matches: matched.map((current) => ({ current })), warnings }
}

/**
 * Merges a validated incoming item with its persisted counterpart.
 * Undefined keys keep the persisted value, explicit null clears it,
 * explicit values overwrite it. Identity (rows, lineage, group-header
 * status, image_url, overrides) is never regenerated.
 */
function mergeBoluItem(
  item: BoluInvoiceItemInput,
  current: Record<string, any> | null,
): Record<string, any> {
  const pick = <T,>(incoming: T | null | undefined, fallback: T | null | undefined): T | null | undefined =>
    incoming === undefined ? fallback : incoming

  const base: Record<string, any> = current ? { ...current } : {}

  base.description = item.description
  base.quantity = item.quantity
  base.unit_price = item.unit_price
  base.unit = pick(item.unit, current?.unit) ?? ''
  // A persisted group header must survive: the validator only emits
  // 'standard', which cannot express a downgrade request.
  base.row_type =
    current?.row_type === 'group_header' && item.row_type === 'standard'
      ? 'group_header'
      : (item.row_type ?? current?.row_type ?? 'standard')
  base.group_id = pick(item.group_id, current?.group_id) ?? null
  base.group_name = pick(item.group_name, current?.group_name) ?? null

  // Identity and catalog link: persisted wins unless incoming explicitly set one.
  base.item_id = pick(item.item_id, current?.item_id) ?? null

  // Tri-state commercial fields.
  base.vat_rate = pick(item.vat_rate, current?.vat_rate) ?? null
  base.discount_rate = pick(item.discount_rate, current?.discount_rate) ?? null
  base.install_rate = pick(item.install_rate, current?.install_rate) ?? null
  base.install_rate_taxable =
    item.install_rate_taxable !== undefined ? item.install_rate_taxable : (current?.install_rate_taxable ?? false)

  // Install-rate override semantics mirror the form: an explicit install_rate
  // set flips the override flag.
  base.install_rate_override = item.install_rate !== undefined ? true : current?.install_rate_override === true
  base.show_install_rate = current?.show_install_rate ?? false
  base.formula = current?.formula ?? ''

  base.sub_description = pick(item.sub_description, current?.sub_description) ?? null
  base.make = pick(item.make, current?.make) ?? null
  base.image_url = current?.image_url ?? null

  // Lineage is system-owned; never regenerated or inferred.
  base.source_cps_id = current?.source_cps_id ?? null
  base.source_cps_row_id = current?.source_cps_row_id ?? null
  base.source_quotation_id = current?.source_quotation_id ?? null
  base.source_quotation_item_id = current?.source_quotation_item_id ?? null

  // custom_data is parsed here (unknown keys retained verbatim); the
  // partNo/condition overrides are applied by serializeBoluItem so the
  // literal create-time contract stays visible in one place.
  base.custom_data = parseCustomData(current?.custom_data)

  return base
}

/** Maps a Bolu line item onto the shared database item shape. */
function serializeBoluItem(
  item: BoluInvoiceItemInput,
  index: number,
  current?: Record<string, any> | null,
) {
  // Part number and condition are not columns on `invoice_items` /
  // `quotation_items`; the document forms store them in `custom_data`.
  // When `current` is provided (modification path), omitted metadata is
  // merged from the persisted row instead of being discarded.
  const mergedItem: Record<string, any> =
    current === undefined ? { ...item } : mergeBoluItem(item, current)

  const customData: Record<string, unknown> = { ...(mergedItem.custom_data ?? {}) }
  if (item.part_number) customData.partNo = item.part_number
  else if (item.part_number === null) delete customData.partNo
  if (item.condition) customData.condition = item.condition
  else if (item.condition === null) delete customData.condition

  return toDbItem(
    {
      description: mergedItem.description,
      quantity: mergedItem.quantity,
      unit_price: mergedItem.unit_price,
      unit: mergedItem.unit || '',
      row_type: mergedItem.row_type ?? 'standard',
      group_id: mergedItem.group_id ?? null,
      group_name: mergedItem.group_name ?? null,
      item_id: mergedItem.item_id ?? null,
      install_rate: mergedItem.install_rate ?? null,
      install_rate_taxable: mergedItem.install_rate_taxable ?? false,
      show_install_rate: mergedItem.show_install_rate ?? false,
      formula: mergedItem.formula ?? '',
      install_rate_override: mergedItem.install_rate_override === true,
      vat_rate: mergedItem.vat_rate ?? null,
      discount_rate: mergedItem.discount_rate ?? null,
      sub_description: mergedItem.sub_description ?? null,
      make: mergedItem.make ?? null,
      image_url: mergedItem.image_url ?? null,
      source_cps_id: mergedItem.source_cps_id ?? null,
      source_cps_row_id: mergedItem.source_cps_row_id ?? null,
      source_quotation_id: mergedItem.source_quotation_id ?? null,
      source_quotation_item_id: mergedItem.source_quotation_item_id ?? null,
      custom_data: customData,
    } as any,
    null,
    index,
  )
}

/**
 * Executes persistence for an approved document creation proposal.
 *
 * Routes by `documentFamily`: quotations write to `quotations` and
 * `quotation_items`, invoices to `invoices` and `invoice_items`.
 */
export async function persistInvoiceCreation(
  tenantClient: TenantClient,
  proposal: BoluInvoiceCreateProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  entityId?: string | null,
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  if (proposal?.documentFamily === 'quotation') {
    return persistQuotationCreation(tenantClient, proposal, canWrite, canRead, entityId, actor)
  }

  assertTenantAuthorization(tenantClient, canWrite, 'invoice', 'create')

  if (!proposal || !proposal.opId) {
    throw new Error('Valid proposal is required for persistence.')
  }

  if (!canRead('invoice', 'view')) {
    return { success: false, error: 'Read authorization missing for invoice verification.' }
  }

  // Prevent duplicate execution
  if (executedOperationIds.has(proposal.opId)) {
    return { success: false, error: 'This operation has already been submitted and executed.' }
  }

  // Stale check
  if (isProposalStale(proposal)) {
    return { success: false, error: 'This proposal has expired. Please create a new proposal.' }
  }

  // Gate check: Must be approved and confirmed for save
  if (proposal.status !== 'approved_pending_save' && proposal.status !== 'saving') {
    return { success: false, error: 'Operation requires user approval (Gate 1) and save confirmation (Gate 2).' }
  }

  // A previously committed save for this exact operation is returned as-is.
  // This is the durable guard against a retried or replayed Gate 2 confirmation.
  // The retrieved row's operation_id is verified before success is reported.
  const alreadyPersisted = await findVerifiedReplay(tenantClient, 'invoice', proposal.opId)
  if (alreadyPersisted) {
    executedOperationIds.add(proposal.opId)
    return {
      success: true,
      documentId: alreadyPersisted.id,
      documentNumber: alreadyPersisted.number,
    }
  }

  try {
    const createWarnings: string[] = []

    // F3-11: verify a model-supplied project reference before persisting,
    // mirroring the item_id fail-closed discard semantics.
    const requestedProjectId = proposal.payload.project_id ?? null
    let verifiedProjectId = requestedProjectId
    if (requestedProjectId) {
      const verified = await verifyProjectReference(tenantClient, String(requestedProjectId))
      if (!verified) {
        createWarnings.push(
          `project_id "${requestedProjectId}" does not reference an active project in this business entity; it was discarded.`,
        )
        verifiedProjectId = null
      }
    }

    // 1. Authoritative financial recalculation using the full commercial payload
    const calculation = computeAuthoritativeTotals(proposal.payload.items, {
      globalVatPercent: proposal.payload.global_vat_percent ?? 7.5,
      discountType: proposal.payload.discount_type ?? 'percent',
      discountTiming: proposal.payload.discount_timing ?? 'before_tax',
      discountValue: proposal.payload.discount ?? 0,
      whtType: proposal.payload.wht_type ?? 'percent',
      whtValue: proposal.payload.wht ?? 0,
      extraCharges: proposal.payload.extra_charges ?? [],
      fixedCharges: {
        workmanship: proposal.payload.workmanship,
        transportation: proposal.payload.transportation,
        shipping: proposal.payload.shipping,
      },
    })

    // 2. Authoritative numbering setup with collision retry.
    // The tenant's configured prefix is the same authority the invoice form
    // uses (`resolvePrefix(settings.document_prefixes, 'invoice')`). A failed
    // settings read must abort creation — it must never silently fall back to
    // the global `INV` default and allocate from a different sequence family.
    const prefixResult = await fetchDocumentPrefixesSafe(tenantClient)
    if (prefixResult.status === 'error') {
      return {
        success: false,
        error: prefixResult.reason,
        ...(createWarnings.length ? { warnings: createWarnings } : {}),
      }
    }
    const invoicePrefix = resolvePrefix(prefixResult.prefixes, 'invoice')
    const invoiceFamily = `${invoicePrefix}-`
    const regenerateInvoiceNumber = async () => {
      const [{ data: rows }, cursor] = await Promise.all([
        tenantClient.from('invoices').select('invoice_number'),
        fetchAutoCursor(tenantClient, invoiceFamily),
      ])
      return getNextInvoiceNumber(rows || [], invoicePrefix, cursor)
    }

    // 3. Prepare complete database fields matching useInvoiceSave
    const basePayload = {
      po_number: proposal.payload.po_number ?? null,
      invoice_title: proposal.payload.title ?? null,
      client_id: proposal.payload.client_id ?? null,
      client_name: proposal.payload.client_name,
      project_id: verifiedProjectId,
      issue_date: proposal.payload.issue_date || new Date().toISOString().split('T')[0],
      due_date: proposal.payload.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'unpaid',
      document_type: 'invoice',
      payment_terms: proposal.payload.payment_terms || '',
      notes: normalizeBoluRichText(proposal.payload.notes),
      terms: normalizeBoluRichText(proposal.payload.terms ?? proposal.payload.payment_terms),
      workmanship: proposal.payload.workmanship ?? 0,
      transportation: proposal.payload.transportation ?? 0,
      shipping: proposal.payload.shipping ?? 0,
      discount: calculation.discount,
      vat: calculation.vat,
      wht: calculation.wht,
      custom_fields: buildBoluCustomFields(proposal),
      operation_id: proposal.opId,
      work_duration: proposal.payload.work_duration ?? null,
      subtotal: calculation.subtotal,
      install_rate_total: calculation.installRateTotal,
      total: calculation.totalPayable,
      amount_in_words: numberToWords(calculation.totalPayable),
    }

    const itemsToSave = proposal.payload.items.map((item, index) => serializeBoluItem(item, index))

    // 4. Persistence with collision-safe unique retry.
    // The `operation_id` column has a partial unique index; a 23505 on that
    // index means the operation was already committed by a concurrent or
    // retried request. The retry loop below distinguishes this from a
    // document-number collision: an operation_id 23505 is treated as a
    // replay (re-read and return the existing document), while an
    // invoice_number 23505 triggers number regeneration.
    let createdInvoice: { id: string; invoice_number: string } | null = null

    const retryResult = await withUniqueRetry(
      async (candidateNumber: string) => {
        const payload = { ...basePayload, invoice_number: candidateNumber }

        // Phase 3 atomic transaction when entityId is available
        if (entityId) {
          const { data, error } = await tenantClient.rpc('save_invoice_with_items_transaction', {
            p_entity_id: entityId,
            p_invoice_payload: payload,
            p_items: itemsToSave,
            p_mode: 'create',
          })
          if (error) {
            // A 23505 naming the invoice operation-id constraint means this
            // operation was already committed. Verify and return the existing
            // document as a successful replay; all other 23505s propagate.
            if (isOperationIdConflict(error as any, 'invoice')) {
              const existing = await findVerifiedReplay(tenantClient, 'invoice', proposal.opId)
              if (existing) {
                return {
                  data: { id: existing.id, invoice_number: existing.number },
                  error: null,
                }
              }
              return { data: null, error: error as any }
            }
            return { data: null, error: error as any }
          }
          const rpcResult = Array.isArray(data) ? data[0] : data
          const resolved = rpcResult?.invoice ?? rpcResult
          return {
            data: {
              id: resolved?.id ?? rpcResult?.id,
              invoice_number: resolved?.invoice_number ?? payload.invoice_number,
            },
            error: null,
          }
        }

        // Sequential fallback (pre-cutover or test mock)
        return (tenantClient.from('invoices') as any)
          .insert([payload])
          .select('id, invoice_number')
          .single() as Promise<{ data: any; error: any }>
      },
      regenerateInvoiceNumber,
    )

    if (retryResult.error || !retryResult.data) {
      // A 23505 on the operation_id unique index means this operation was
      // already committed by a concurrent request. Retrieve the existing
      // document and return it as a successful replay rather than reporting
      // a failure.
      if (isOperationIdConflict(retryResult.error, 'invoice')) {
        const existing = await findVerifiedReplay(tenantClient, 'invoice', proposal.opId)
        if (existing) {
          executedOperationIds.add(proposal.opId)
          return {
            success: true,
            documentId: existing.id,
            documentNumber: existing.number,
            ...(createWarnings.length ? { warnings: createWarnings } : {}),
          }
        }
        // Confirmed conflict but the existing document could not be verified.
        // Never report a false successful replay.
        return {
          success: false,
          error: 'Operation already committed, but the existing document could not be verified.',
          ...(createWarnings.length ? { warnings: createWarnings } : {}),
        }
      }
      return {
        success: false,
        error: `Failed to persist invoice: ${retryResult.error?.message || 'Database insert failed'}`,
        ...(createWarnings.length ? { warnings: createWarnings } : {}),
      }
    }

    createdInvoice = retryResult.data
    const effectiveId = createdInvoice.id
    const effectiveNumber = createdInvoice.invoice_number

    // 5. If sequential fallback was used (no entityId), insert items with rollback on error
    if (!entityId) {
      const itemsWithInvoiceId = itemsToSave.map((item) => ({ ...item, invoice_id: effectiveId }))
      const { error: itemsError } = await (tenantClient.from('invoice_items') as any).insert(itemsWithInvoiceId)

      if (itemsError) {
        console.error('[bolu-persistence] Error saving items; rolling back header:', itemsError.message)
        await (tenantClient.from('invoices') as any).delete().eq('id', effectiveId)
        return {
          success: false,
          error: `Invoice item saving failed: ${itemsError.message}. The draft was rolled back.`,
          ...(createWarnings.length ? { warnings: createWarnings } : {}),
        }
      }
    }

    // 6. Advance automatic numbering cursor
    const seq = parseTrailingSequence(effectiveNumber)
    if (seq !== null) {
      await advanceAutoCursor(tenantClient, invoiceFamily, seq)
    }

    // 7. Canonical CREATE audit event: same infrastructure as the form, with
    // the authenticated user as actor and `bolu` as the operation source.
    await recordBoluDocumentCreationAudit(tenantClient, {
      family: 'invoice',
      documentId: effectiveId,
      documentNumber: effectiveNumber,
      clientName: proposal.payload.client_name,
      total: calculation.totalPayable,
      opId: proposal.opId,
      actor,
    })

    // Mark operation as executed to prevent duplicates
    executedOperationIds.add(proposal.opId)

    return {
      success: true,
      documentId: effectiveId,
      documentNumber: effectiveNumber,
      ...(createWarnings.length ? { warnings: createWarnings } : {}),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected persistence error'
    return { success: false, error: message }
  }
}

/**
 * Executes persistence for an approved quotation creation proposal.
 *
 * The quotation payload reuses the invoice payload contract and recomputes
 * every financial field through `computeAuthoritativeTotals`, so a quotation
 * can never carry model-generated totals.
 */
export async function persistQuotationCreation(
  tenantClient: TenantClient,
  proposal: BoluInvoiceCreateProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  entityId?: string | null,
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  assertTenantAuthorization(tenantClient, canWrite, 'quotation', 'create')

  if (!proposal || !proposal.opId) {
    throw new Error('Valid proposal is required for persistence.')
  }

  if (!canRead('quotation', 'view')) {
    return { success: false, error: 'Read authorization missing for quotation verification.' }
  }

  if (executedOperationIds.has(proposal.opId)) {
    return { success: false, error: 'This operation has already been submitted and executed.' }
  }

  if (isProposalStale(proposal)) {
    return { success: false, error: 'This proposal has expired. Please create a new proposal.' }
  }

  if (proposal.status !== 'approved_pending_save' && proposal.status !== 'saving') {
    return { success: false, error: 'Operation requires user approval (Gate 1) and save confirmation (Gate 2).' }
  }

  const alreadyPersisted = await findVerifiedReplay(tenantClient, 'quotation', proposal.opId)
  if (alreadyPersisted) {
    executedOperationIds.add(proposal.opId)
    return {
      success: true,
      documentId: alreadyPersisted.id,
      documentNumber: alreadyPersisted.number,
    }
  }

  try {
    const createWarnings: string[] = []

    // F3-11: verify a model-supplied project reference before persisting,
    // mirroring the item_id fail-closed discard semantics.
    const requestedProjectId = proposal.payload.project_id ?? null
    let verifiedProjectId = requestedProjectId
    if (requestedProjectId) {
      const verified = await verifyProjectReference(tenantClient, String(requestedProjectId))
      if (!verified) {
        createWarnings.push(
          `project_id "${requestedProjectId}" does not reference an active project in this business entity; it was discarded.`,
        )
        verifiedProjectId = null
      }
    }

    // F3-02: work_duration does not exist on quotations; strip with a warning
    // rather than silently dropping it.
    if (proposal.payload.work_duration != null && String(proposal.payload.work_duration).trim() !== '') {
      createWarnings.push('work_duration is not supported on quotations; it was omitted.')
    }

    // 1. Authoritative financial recalculation (identical engine to invoices)
    const calculation = computeAuthoritativeTotals(proposal.payload.items, {
      globalVatPercent: proposal.payload.global_vat_percent ?? 7.5,
      discountType: proposal.payload.discount_type ?? 'percent',
      discountTiming: proposal.payload.discount_timing ?? 'before_tax',
      discountValue: proposal.payload.discount ?? 0,
      whtType: proposal.payload.wht_type ?? 'percent',
      whtValue: proposal.payload.wht ?? 0,
      extraCharges: proposal.payload.extra_charges ?? [],
      fixedCharges: {
        workmanship: proposal.payload.workmanship,
        transportation: proposal.payload.transportation,
        shipping: proposal.payload.shipping,
      },
    })

    // 2. Authoritative numbering setup with collision retry. The tenant's
    // configured quotation prefix drives this, exactly as the quotation form
    // does. A failed settings read must abort creation — it must never
    // silently fall back to the global `QTN` default.
    const prefixResult = await fetchDocumentPrefixesSafe(tenantClient)
    if (prefixResult.status === 'error') {
      return {
        success: false,
        error: prefixResult.reason,
        ...(createWarnings.length ? { warnings: createWarnings } : {}),
      }
    }
    const quotationPrefix = resolvePrefix(prefixResult.prefixes, 'quotation')
    const quotationFamily = `${quotationPrefix}-`
    const regenerateQuotationNumber = async () => {
      const [{ data: rows }, cursor] = await Promise.all([
        tenantClient.from('quotations').select('quotation_number'),
        fetchAutoCursor(tenantClient, quotationFamily),
      ])
      return getNextQuotationNumber(rows || [], quotationPrefix, cursor)
    }

    // 3. Prepare database fields matching the quotation save contract
    const basePayload = {
      quotation_number: '',
      po_number: proposal.payload.po_number ?? null,
      quotation_title: proposal.payload.title ?? null,
      client_id: proposal.payload.client_id ?? null,
      client_name: proposal.payload.client_name,
      project_id: verifiedProjectId,
      issue_date: proposal.payload.issue_date || new Date().toISOString().split('T')[0],
      valid_until: proposal.payload.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'open',
      notes: normalizeBoluRichText(proposal.payload.notes),
      terms: normalizeBoluRichText(proposal.payload.terms ?? proposal.payload.payment_terms),
      workmanship: proposal.payload.workmanship ?? 0,
      transportation: proposal.payload.transportation ?? 0,
      shipping: proposal.payload.shipping ?? 0,
      discount: calculation.discount,
      vat: calculation.vat,
      wht: calculation.wht,
      subtotal: calculation.subtotal,
      install_rate_total: calculation.installRateTotal,
      total: calculation.totalPayable,
      amount_in_words: numberToWords(calculation.totalPayable),
      custom_fields: buildBoluCustomFields(proposal, 'quotation'),
      operation_id: proposal.opId,
    }

    const itemsToSave = proposal.payload.items.map((item, index) => serializeBoluItem(item, index))

    // 4. Persistence with collision-safe unique retry.
    // Same operation_id unique-index protection as the invoice path: a 23505
    // on operation_id is a replay, not a number collision.
    const retryResult = await withUniqueRetry(
      async (candidateNumber: string) => {
        const payload = { ...basePayload, quotation_number: candidateNumber }

        // Phase 3.5 atomic quotation transaction when entityId is available
        if (entityId) {
          const { data, error } = await tenantClient.rpc('save_quotation_with_items_transaction', {
            p_entity_id: entityId,
            p_quotation_payload: payload,
            p_items: itemsToSave,
            p_mode: 'create',
            p_cps_feedback: null,
          })
          if (error) {
            // A 23505 naming the quotation operation-id constraint means this
            // operation was already committed. Verify and return the existing
            // document as a successful replay; all other 23505s propagate.
            if (isOperationIdConflict(error as any, 'quotation')) {
              const existing = await findVerifiedReplay(tenantClient, 'quotation', proposal.opId)
              if (existing) {
                return {
                  data: { id: existing.id, quotation_number: existing.number },
                  error: null,
                }
              }
              return { data: null, error: error as any }
            }
            return { data: null, error: error as any }
          }
          const rpcResult = Array.isArray(data) ? data[0] : data
          const resolved = rpcResult?.quotation ?? rpcResult
          return {
            data: {
              id: resolved?.id ?? rpcResult?.id,
              quotation_number: resolved?.quotation_number ?? payload.quotation_number,
            },
            error: null,
          }
        }

        // Sequential fallback (pre-cutover or test mock)
        return (tenantClient.from('quotations') as any)
          .insert([payload])
          .select('id, quotation_number')
          .single() as Promise<{ data: any; error: any }>
      },
      regenerateQuotationNumber,
    )

    if (retryResult.error || !retryResult.data) {
      // A 23505 on the operation_id unique index means this operation was
      // already committed by a concurrent request. Retrieve the existing
      // document and return it as a successful replay.
      if (isOperationIdConflict(retryResult.error, 'quotation')) {
        const existing = await findVerifiedReplay(tenantClient, 'quotation', proposal.opId)
        if (existing) {
          executedOperationIds.add(proposal.opId)
          return {
            success: true,
            documentId: existing.id,
            documentNumber: existing.number,
            ...(createWarnings.length ? { warnings: createWarnings } : {}),
          }
        }
        // Confirmed conflict but the existing document could not be verified.
        return {
          success: false,
          error: 'Operation already committed, but the existing document could not be verified.',
          ...(createWarnings.length ? { warnings: createWarnings } : {}),
        }
      }
      return {
        success: false,
        error: `Failed to persist quotation: ${retryResult.error?.message || 'Database insert failed'}`,
        ...(createWarnings.length ? { warnings: createWarnings } : {}),
      }
    }

    const effectiveId = retryResult.data.id as string
    const effectiveNumber = retryResult.data.quotation_number as string

    // 5. Sequential fallback writes items separately, with header rollback on error
    if (!entityId) {
      const itemsWithQuotationId = itemsToSave.map((item) => ({ ...item, quotation_id: effectiveId }))
      const { error: itemsError } = await (tenantClient.from('quotation_items') as any).insert(itemsWithQuotationId)

      if (itemsError) {
        console.error('[bolu-persistence] Error saving quotation items; rolling back header:', itemsError.message)
        await (tenantClient.from('quotations') as any).delete().eq('id', effectiveId)
        return {
          success: false,
          error: `Quotation item saving failed: ${itemsError.message}. The draft was rolled back.`,
          ...(createWarnings.length ? { warnings: createWarnings } : {}),
        }
      }
    }

    // 6. Advance the automatic numbering cursor
    const seq = parseTrailingSequence(effectiveNumber)
    if (seq !== null) {
      await advanceAutoCursor(tenantClient, quotationFamily, seq)
    }

    // 7. Canonical CREATE audit event for the quotation family.
    await recordBoluDocumentCreationAudit(tenantClient, {
      family: 'quotation',
      documentId: effectiveId,
      documentNumber: effectiveNumber,
      clientName: proposal.payload.client_name,
      total: calculation.totalPayable,
      opId: proposal.opId,
      actor,
    })

    executedOperationIds.add(proposal.opId)

    return {
      success: true,
      documentId: effectiveId,
      documentNumber: effectiveNumber,
      ...(createWarnings.length ? { warnings: createWarnings } : {}),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected persistence error'
    return { success: false, error: message }
  }
}

/**
 * Executes persistence for an approved invoice modification proposal.
 */
interface FamilyModifyConfig {
  family: 'invoice' | 'quotation'
  table: 'invoices' | 'quotations'
  itemsTable: 'invoice_items' | 'quotation_items'
  itemsKey: 'invoice_id' | 'quotation_id'
  numberColumn: 'invoice_number' | 'quotation_number'
  titleField: 'invoice_title' | 'quotation_title'
  select: string
  rpcName: string
  rpcPayloadParam: string
  dueDateField: string
}

const INVOICE_MODIFY_CONFIG: FamilyModifyConfig = {
  family: 'invoice',
  table: 'invoices',
  itemsTable: 'invoice_items',
  itemsKey: 'invoice_id',
  numberColumn: 'invoice_number',
  titleField: 'invoice_title',
  select:
    'id, invoice_number, invoice_title, po_number, client_id, client_name, project_id, issue_date, due_date, status, document_type, payment_terms, notes, terms, workmanship, transportation, shipping, discount, vat, wht, custom_fields, work_duration, subtotal, install_rate_total, total, amount_in_words, archived_at',
  rpcName: 'save_invoice_with_items_transaction',
  rpcPayloadParam: 'p_invoice_payload',
  dueDateField: 'due_date',
}

/** User-facing read-failure copy. The raw backend detail goes to the console log only. (F-06) */
function modificationReadFailure(family: 'invoice' | 'quotation', phase: string, detail: unknown): string {
  console.warn(`[bolu-modification] ${phase} failed for ${family}:`, detail)
  return `I could not read the saved ${family} right now, so no changes were made. Please try again.`
}

/** User-facing failure copy for the modification flow. The raw backend detail
 * goes to the console log; the user sees a concise, accurate message. (F-06) */
function modificationPersistFailure(family: 'invoice' | 'quotation', phase: string, detail: unknown): string {
  console.warn(`[bolu-modification] ${phase} failed for ${family}:`, detail)
  return `The ${family} could not be saved just now. Please try again.`
}

function modificationItemsFailure(family: 'invoice' | 'quotation', detail: unknown): string {
  console.warn(`[bolu-modification] items restore failed for ${family}:`, detail)
  return `Updating the ${family} items did not complete, so the previous items were restored. Please try again.`
}

const QUOTATION_MODIFY_CONFIG: FamilyModifyConfig = {
  family: 'quotation',
  table: 'quotations',
  itemsTable: 'quotation_items',
  itemsKey: 'quotation_id',
  numberColumn: 'quotation_number',
  titleField: 'quotation_title',
  select:
    'id, quotation_number, quotation_title, po_number, client_id, client_name, project_id, issue_date, valid_until, status, notes, terms, workmanship, transportation, shipping, discount, vat, wht, custom_fields, subtotal, install_rate_total, total, amount_in_words, archived_at',
  rpcName: 'save_quotation_with_items_transaction',
  rpcPayloadParam: 'p_quotation_payload',
  dueDateField: 'valid_until',
}

/**
 * Preservation snapshot for Advance Invoice configuration writes: the same
 * full authoritative row the modification path selects, plus `total`, which
 * the advance derivation needs as the contract value. The write itself never
 * touches items, columns or sibling custom_fields keys.
 */
const ADVANCE_INVOICE_SELECT = INVOICE_MODIFY_CONFIG.select + ', total'

/**
 * Normalizes user-facing rich text (plain text, arbitrary HTML, or the
 * CommercialRichTextBlock[] contract) into the safe TipTap HTML subset.
 * Unsafe/unsupported markup never reaches the database raw.
 */
function normalizeBoluRichText(value: unknown): string {
  return normalizeRichTextHtml(value)
}

/**
 * Default calculation inputs used when a document has no persisted
 * calculationInputs yet (legacy rows) — mirrors the form defaults.
 */
/** Business labels for calculation inputs — stale-guard refusals never speak in payload keys. (F-05) */
const CALC_INPUT_BUSINESS_LABELS: Record<string, string> = {
  vatPercent: 'VAT rate',
  discountValue: 'Discount',
  discountType: 'Discount type',
  discountTiming: 'Discount timing',
  whtValue: 'WHT',
  whtType: 'WHT type',
}
const calcInputLabel = (key: unknown): string =>
  CALC_INPUT_BUSINESS_LABELS[String(key)] ?? String(key)

const DEFAULT_CALCULATION_INPUTS: BoluCalculationInputValues = {
  vatPercent: 7.5,
  discountValue: 0,
  discountType: 'percent',
  discountTiming: 'before_tax',
  whtValue: 0,
  whtType: 'percent',
}

/** Canonical value for comparing persisted calculation inputs across audits. */
function canonicalCalcValue(value: unknown): unknown {
  if (value === undefined || value === null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value
  return String(value)
}

/** Canonical normalized shape for persisted/provided extra charges. */
function normalizeExtraChargesList(list: Array<Record<string, unknown>>): Array<{ label: string; value: number; withTax: boolean }> {
  return list
    .map((row) => ({
      label: String(row?.label ?? '').trim(),
      value: Number(row?.value) || 0,
      withTax: row?.withTax === true || row?.vatApplicable === true,
    }))
    .filter((charge) => charge.label.length > 0)
    .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()))
}

function extraChargesEqual(a: Array<{ label: string; value: number; withTax: boolean }>, b: Array<{ label: string; value: number; withTax: boolean }>): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Merge a desired extra-charges list onto the persisted rows, keeping fields
 * the new set does not know about verbatim. Matching by label; the input is
 * already validated to have unique labels, and this function preserves that
 * invariant without silently dropping unrelated persisted entries.
 */
function mergeExtraChargesKeepUnknowns(
  persisted: Array<Record<string, unknown>>,
  desired: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const byKey = new Map<string, Record<string, unknown>>()
  for (const row of persisted) {
    const key = String(row?.label ?? '').trim().toLowerCase()
    if (key && !byKey.has(key)) byKey.set(key, row)
  }
  return desired.map((charge) => {
    const key = String(charge?.label ?? '').trim().toLowerCase()
    const current = key ? byKey.get(key) : undefined
    const base = current ? { ...current } : {}
    return {
      ...base,
      label: String(charge?.label ?? '').trim(),
      value: Number(charge?.value ?? 0) || 0,
      withTax: charge?.withTax === true || (charge as Record<string, unknown>)?.vatApplicable === true,
    }
  })
}

/** F3-11: project_id must exist as an active (non-archived) project in this
 * tenant before persistence; otherwise it is discarded with a warning,
 * never passed through to risk a PostgreSQL FK failure. */
async function verifyProjectReference(tenantClient: TenantClient, projectId: string): Promise<boolean> {
  try {
    const res = await (tenantClient.from('projects') as any)
      .select('id')
      .eq('id', projectId)
      .is('archived_at', null)
      .limit(1)
      .maybeSingle()
    return !res.error && Boolean(res.data)
  } catch {
    return false
  }
}

/**
 * Shared implementation for Bolu document modification (invoice and quotation).
 *
 * Preservation contract: the payload passed to the composite RPC is built from
 * the FULL persisted row (every column the RPC update branch writes), never
 * from a reduced snapshot. Unrelated fields are carried through untouched, and
 * omitted item metadata is merged from the persisted rows via matchBoluItems /
 * mergeBoluItem. See docs/reports/bolu-modification-integrity/stage-0-modification-integrity.md.
 */
async function persistDocumentModification(
  cfg: FamilyModifyConfig,
  tenantClient: TenantClient,
  proposal: BoluInvoiceModifyProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  entityId?: string | null,
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  assertTenantAuthorization(tenantClient, canWrite, cfg.family, 'edit')

  if (!proposal || !proposal.opId) {
    throw new Error('Valid proposal is required for persistence.')
  }

  if (!canRead(cfg.family, 'view')) {
    return { success: false, error: `Read authorization missing for this ${cfg.family}.` }
  }

  if (executedOperationIds.has(proposal.opId)) {
    return { success: false, error: 'This modification has already been submitted and executed.' }
  }

  if (isProposalStale(proposal)) {
    return { success: false, error: 'This proposal has expired. Please propose the change again.' }
  }

  if (proposal.status !== 'approved_pending_save' && proposal.status !== 'saving') {
    return { success: false, error: 'Modification requires user approval (Gate 1) and save confirmation (Gate 2).' }
  }

  let warnings: string[] = []
  try {
    // 1. Full preservation snapshot. Every field the composite RPC can write
    //    is selected; absent keys are preserved by explicit override only.
    const { data: currentRow, error: fetchError } = await tenantClient
      .from(cfg.table)
      .select(cfg.select)
      .eq('id', proposal.targetDocumentId)
      .is('archived_at', null)
      .single()

    if (fetchError || !currentRow) {
      return { success: false, error: `Target ${cfg.family} could not be found or has been archived.`, ...(warnings.length ? { warnings } : {}) }
    }
    const currentDoc = currentRow as Record<string, any>

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // 2. Field-level modifications, applied only when explicitly requested.
    //    Quotation payment terms persist in custom_fields (no column); the
    //    invoice form stores them in the payment_terms column.
    const effectiveCharges = {
      workmanship: Number(currentDoc.workmanship ?? 0) || 0,
      transportation: Number(currentDoc.transportation ?? 0) || 0,
      shipping: Number(currentDoc.shipping ?? 0) || 0,
    }
    // Single pending custom_fields document: sections contribute to it, one write at the end.
    let pendingCustomFields: Record<string, unknown> | null = null

    if (proposal.field === 'work_duration' && cfg.family === 'quotation') {
      return {
        success: false,
        error: 'Work duration applies to invoices only; quotations do not carry a work duration.',
        ...(warnings.length ? { warnings } : {}),
      }
    }

    if (proposal.field) {
      const field = proposal.field
      let dbField: string | null
      let cfKey: string | null = null
      let currentValueInDb: unknown

      if (field === 'payment_terms' && cfg.family === 'quotation') {
        dbField = null
        cfKey = 'payment_terms'
        currentValueInDb = parseCustomFields(currentDoc.custom_fields)[cfKey]
      } else {
        dbField =
          field === 'payment_terms' ? 'payment_terms'
            : field === 'due_date' ? cfg.dueDateField
              : field === 'title' ? cfg.titleField
                : field
        currentValueInDb = currentDoc[dbField]
      }

      // A persisted baseline is required for every scalar field edit.
      if (proposal.oldValue === undefined) {
        return {
          success: false,
          error: `I could not verify the current ${field} for this change. Reopen the document and try again.`,
          ...(warnings.length ? { warnings } : {}),
        }
      }

      // Issue dates anchor reporting and must not be cleared. (F-01)
      if (field === 'issue_date' && (proposal.newValue === null || proposal.newValue === '')) {
        return {
          success: false,
          error: 'The issue date is required. Set a new date instead of clearing it.',
          ...(warnings.length ? { warnings } : {}),
        }
      }

      const isRichText = field === 'notes' || field === 'terms'
      const currentNormalized = isRichText ? normalizeBoluRichText(String(currentValueInDb ?? '')) : currentValueInDb
      const expectedNormalized = isRichText ? normalizeBoluRichText(String(proposal.oldValue ?? '')) : proposal.oldValue
      const equal = isRichText
        ? currentNormalized === expectedNormalized
        : String(currentValueInDb ?? '') === String(proposal.oldValue ?? '')
      if (!equal) {
        return {
          success: false,
          error: `Document has been modified by another process (current ${field}: "${currentValueInDb}"). Proposal is stale.`,
        }
      }

      if (dbField) {
        const isCharge = dbField === 'workmanship' || dbField === 'transportation' || dbField === 'shipping'
        // Commercial charges: explicit finite, non-negative numbers only.
        // Booleans, arrays, objects and blank strings are refused. (F-02)
        if (isCharge) {
          let parsed: number | null = null
          const value = proposal.newValue
          if (typeof value === 'number' && Number.isFinite(value)) {
            parsed = value
          } else if (typeof value === 'string') {
            const trimmed = value.trim()
            if (trimmed !== '') {
              const asNumber = Number(trimmed)
              if (Number.isFinite(asNumber)) parsed = asNumber
            }
          }
          if (parsed === null || parsed < 0) {
            return { success: false, error: `${dbField} must be a finite non-negative number.` }
          }
          ;(effectiveCharges as Record<string, number>)[dbField] = parsed
          updates[dbField] = parsed
        } else {
          // notes/terms are rich text; normalize through the application subset (F3-07)
          updates[dbField] = (field === 'notes' || field === 'terms')
            ? normalizeBoluRichText(proposal.newValue)
            : proposal.newValue
        }
      } else if (cfKey) {
        const cf = parseCustomFields(currentDoc.custom_fields)
        pendingCustomFields = { ...cf, [cfKey]: proposal.newValue }
      }
    }

    // 2.1 Project reference — fail-closed tenant verification before any write.
    if (proposal.field === 'project_id' && proposal.newValue) {
      const projectId = String(proposal.newValue).trim()
      const ok = await verifyProjectReference(tenantClient, projectId)
      if (!ok) {
        warnings.push(`Project "${projectId}" is not active or not available in this business entity; the project reference was discarded.`)
        updates.project_id = null
      }
    }

    // 2.2 Extra charges & calculation inputs — merge with the persisted
    //     custom_fields document, never replace it wholesale.
    const persistedCf = parseCustomFields(currentDoc.custom_fields)
    const persistedExtraCharges: Array<Record<string, unknown>> = Array.isArray(persistedCf.extraCharges)
      ? (persistedCf.extraCharges as Array<Record<string, unknown>>)
      : []
    const persistedInputs = (persistedCf.calculationInputs && typeof persistedCf.calculationInputs === 'object'
      ? { ...(persistedCf.calculationInputs as Record<string, unknown>) }
      : {} as Record<string, unknown>)

    const extraChargesChanged = proposal.extraChargesChange !== undefined
    const inputsChanged = proposal.calculationInputsChange !== undefined

    if (extraChargesChanged) {
      const baseline = proposal.extraChargesChange!.oldExtraCharges ?? []
      if (!extraChargesEqual(normalizeExtraChargesList(persistedExtraCharges), normalizeExtraChargesList(baseline))) {
        return {
          success: false,
          error: 'Extra charges changed after this proposal was prepared. Please review and try again.',
        }
      }
    }

    if (inputsChanged) {
      const baseline = proposal.calculationInputsChange!.old ?? {}
      const keys = Object.keys(proposal.calculationInputsChange!.new) as Array<keyof BoluCalculationInputValues>
      for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(persistedInputs, key)) {
          // Persisted document simply does not carry this key — treat the baseline as the default.
          // This is accepted (not stale) only when the baseline already matched the default.
          const defaultKey = DEFAULT_CALCULATION_INPUTS[key]
          if (canonicalCalcValue(baseline[key]) !== canonicalCalcValue(defaultKey)) {
            return {
              success: false,
              error: `${calcInputLabel(key)} changed after this proposal was prepared. Please review and try again.`,
            }
          }
          continue
        }
        if (canonicalCalcValue(persistedInputs[key as string]) !== canonicalCalcValue((baseline as Record<string, unknown>)[key as string])) {
          return {
            success: false,
            error: `${calcInputLabel(key)} changed after this proposal was prepared. Please review and try again.`,
          }
        }
      }
    }

    const mergedExtraCharges = extraChargesChanged
      ? mergeExtraChargesKeepUnknowns(persistedExtraCharges, proposal.extraChargesChange!.newExtraCharges ?? [])
      : persistedExtraCharges
    const mergedInputs = inputsChanged
      ? { ...persistedInputs, ...(proposal.calculationInputsChange!.new as Record<string, unknown>) }
      : persistedInputs

    if (extraChargesChanged || inputsChanged) {
      const base = pendingCustomFields ?? parseCustomFields(currentDoc.custom_fields)
      const nextCf = { ...base }
      if (extraChargesChanged) nextCf.extraCharges = mergedExtraCharges
      if (inputsChanged) nextCf.calculationInputs = mergedInputs
      pendingCustomFields = nextCf
    }
    if (pendingCustomFields) {
      updates.custom_fields = cfg.family === 'invoice'
        ? JSON.stringify(pendingCustomFields)
        : pendingCustomFields
    }

    // 3. Line item modifications: merge persisted metadata, never rebuild
    //    from the reduced payload alone.
    const chargeFieldChanged =
      proposal.field === 'workmanship' ||
      proposal.field === 'transportation' ||
      proposal.field === 'shipping'
    const needsRecalc = Boolean(proposal.itemsChange?.newItems) || chargeFieldChanged || extraChargesChanged || inputsChanged
    let currentItems: Array<Record<string, any>> = []
    let itemsToSave: Array<Record<string, any>> = []
    let mergedItemObjects: Array<Record<string, any>> | null = null

    // Only charges/inputs changed — read the persisted items so totals can be recomputed.
    if (needsRecalc && !proposal.itemsChange?.newItems) {
      const { data: persistedItems, error: itemsFetchError } = await (tenantClient.from(cfg.itemsTable) as any)
        .select('*')
        .eq(cfg.itemsKey, proposal.targetDocumentId)
        .order('sort_order', { ascending: true })

      if (itemsFetchError) {
        return { success: false, error: modificationReadFailure(cfg.family, 'reading the saved items', itemsFetchError), ...(warnings.length ? { warnings } : {}) }
      }
      currentItems = Array.isArray(persistedItems) ? persistedItems : []
      mergedItemObjects = currentItems
    }

    if (proposal.itemsChange?.newItems) {
      const { data: fetchedItems, error: itemsFetchError } = await (tenantClient.from(cfg.itemsTable) as any)
        .select('*')
        .eq(cfg.itemsKey, proposal.targetDocumentId)
        .order('sort_order', { ascending: true })

      if (itemsFetchError) {
        return { success: false, error: modificationReadFailure(cfg.family, 'reading the saved items', itemsFetchError), ...(warnings.length ? { warnings } : {}) }
      }
      currentItems = Array.isArray(fetchedItems) ? fetchedItems : []

      const { matches, warnings: matchWarnings } = matchBoluItems(currentItems, proposal.itemsChange.newItems)
      warnings = [...warnings, ...matchWarnings]

      // Rows matched against persisted document items keep their document
      // identity (no catalog check). For rows that did NOT match, an explicit
      // item_id is a potential catalog reference: it must be well-formed and
      // refer to an ACTIVE record in this tenant's item_catalog, or be
      // discarded — never passed to the RPC's ::uuid cast unverified.
      const sanitizedItems = proposal.itemsChange.newItems.map((item) => ({ ...item }))
      const freshIndexes: number[] = []
      for (let i = 0; i < sanitizedItems.length; i++) {
        if (matches[i].current) continue
        const raw = sanitizedItems[i].item_id
        if (raw === undefined || raw === null) continue
        const value = String(raw).trim()
        if (!isStrictUuid(value)) {
          sanitizedItems[i].item_id = null
          warnings.push(
            `Item ${i + 1}: supplied catalog identity "${value}" is not a well-formed UUID; it was discarded and no catalog reference is retained.`,
          )
          continue
        }
        freshIndexes.push(i)
      }

      if (freshIndexes.length > 0) {
        const wanted = [...new Set(freshIndexes.map((i) => String(sanitizedItems[i].item_id).toLowerCase()))]
        const active = new Set<string>()
        let lookupOk = true
        try {
          if (!tenantClient.isReady || !tenantClient.schemaName) {
            lookupOk = false
          } else {
            const res = await (tenantClient.from('item_catalog') as any)
              .select('id')
              .in('id', wanted)
              .eq('is_active', true)
            if (res.error) {
              lookupOk = false
            } else {
              for (const row of Array.isArray(res.data) ? res.data : []) {
                active.add(String(row.id).toLowerCase())
              }
            }
          }
        } catch {
          lookupOk = false
        }

        for (const i of freshIndexes) {
          const value = String(sanitizedItems[i].item_id).toLowerCase()
          if (!active.has(value)) {
            sanitizedItems[i].item_id = null
            warnings.push(
              lookupOk
                ? `Item ${i + 1}: catalog identity "${value}" is not an active item_catalog record in this business entity; it was discarded.`
                : `Item ${i + 1}: catalog identity could not be verified (lookup failed or tenant catalog unavailable); the reference was discarded.`,
            )
          }
        }
      }

      mergedItemObjects = sanitizedItems.map((item, idx) =>
        mergeBoluItem(item, matches[idx].current),
      )

      itemsToSave = sanitizedItems.map((item, idx) =>
        serializeBoluItem(item, idx, matches[idx].current),
      )
    }

    // 3.1 Canonical recalculation with the document's PERSISTED inputs.
    //     Documents with saved calculationInputs use them verbatim (identical
    //     to the form). Documents without them fall back to the form's legacy
    //     inference (inferLegacyCalculationInputs), never to blind defaults.
    //     When extra charges, calculation inputs or fixed commercial charges
    //     changed, totals are recomputed the same way from persisted items.
    if (needsRecalc && mergedItemObjects) {
      let cf = pendingCustomFields ?? parseCustomFields(currentDoc.custom_fields)
      if (!cf.calculationInputs && !(cf as any).calculation_inputs) {
        const derived = inferLegacyCalculationInputs({
          invoice: currentDoc as any,
          items: mergedItemObjects,
          customFields: cf as any,
        })
        cf = { ...cf, calculationInputs: derived }
      }
      const documentForCalc = { ...currentDoc, ...effectiveCharges }
      const calculation = computeDocument({
        items: mergedItemObjects,
        document: documentForCalc,
        cf,
        columns: Array.isArray(cf.columnConfig) ? (cf.columnConfig as any) : [],
      })
      updates.subtotal = calculation.subtotal
      updates.discount = calculation.discount
      updates.vat = calculation.vat
      updates.wht = calculation.wht
      updates.total = calculation.totalPayable
      updates.install_rate_total = calculation.installRateTotal
      updates.amount_in_words = numberToWords(calculation.totalPayable)
    }

    // 4. Atomic RPC update when entityId is present and items are modified
    if (entityId && proposal.itemsChange?.newItems) {
      const payload = {
        ...currentDoc,
        ...updates,
        id: proposal.targetDocumentId,
      }
      const { error: rpcError } = await tenantClient.rpc(cfg.rpcName, {
        p_entity_id: entityId,
        [cfg.rpcPayloadParam]: payload,
        p_items: itemsToSave,
        p_mode: 'update',
      })
      if (rpcError) {
        return { success: false, error: modificationPersistFailure(cfg.family, 'saving the updated document', rpcError), ...(warnings.length ? { warnings } : {}) }
      }
    } else {
      // Fallback or non-item update
      if (proposal.itemsChange?.newItems) {
        // Replace the item set, restoring the previous rows on failure so a
        // failed modification cannot empty the document.
        await (tenantClient.from(cfg.itemsTable) as any).delete().eq(cfg.itemsKey, proposal.targetDocumentId)
        const { error: itemsError } = await (tenantClient.from(cfg.itemsTable) as any)
          .insert(itemsToSave.map((item) => ({ ...item, [cfg.itemsKey]: proposal.targetDocumentId })))
        if (itemsError) {
          if (currentItems.length > 0) {
            await (tenantClient.from(cfg.itemsTable) as any).insert(currentItems)
          }
          return {
            success: false,
            error: modificationItemsFailure(cfg.family, itemsError),
            ...(warnings.length ? { warnings } : {}),
          }
        }
      }

      const { error: updateError } = await (tenantClient.from(cfg.table) as any)
        .update(updates)
        .eq('id', proposal.targetDocumentId)

      if (updateError) {
        return { success: false, error: modificationPersistFailure(cfg.family, 'saving the updated document', updateError), ...(warnings.length ? { warnings } : {}) }
      }
    }

    await recordBoluDocumentModificationAudit(tenantClient, {
      family: cfg.family,
      documentId: proposal.targetDocumentId,
      documentNumber: String(currentDoc[cfg.numberColumn] ?? ''),
      opId: proposal.opId,
      changedField:
        proposal.field
        ?? (proposal.extraChargesChange ? 'extra_charges' : proposal.calculationInputsChange ? 'calculation_inputs' : null),
      itemsChanged: Boolean(proposal.itemsChange?.newItems),
      // Carry scalar diffs only; rich-text arrays are summarized for the audit trail.
      oldValue: typeof proposal.oldValue === 'object' && proposal.oldValue !== null ? '[structured text]' : proposal.oldValue as string | number | null,
      newValue: typeof proposal.newValue === 'object' && proposal.newValue !== null ? '[structured text]' : proposal.newValue as string | number | null,
      actor,
    })

    // Mark as executed
    executedOperationIds.add(proposal.opId)

    return {
      success: true,
      documentId: proposal.targetDocumentId,
      documentNumber: String(currentDoc[cfg.numberColumn] ?? ''),
      ...(warnings.length ? { warnings } : {}),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected modification persistence error'
    return { success: false, error: message, ...(warnings.length ? { warnings } : {}) }
  }
}

/**
 * Executes persistence for an approved invoice modification proposal.
 *
 * Preserves the persisted document via persistDocumentModification; see that
 * function for the preservation contract. Uses the existing tenant
 * `save_invoice_with_items_transaction` RPC with `p_mode = 'update'`.
 */
export async function persistInvoiceModification(
  tenantClient: TenantClient,
  proposal: BoluInvoiceModifyProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  entityId?: string | null,
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  return persistDocumentModification(
    INVOICE_MODIFY_CONFIG,
    tenantClient,
    proposal,
    canWrite,
    canRead,
    entityId,
    actor,
  )
}

/**
 * Executes persistence for an approved quotation modification proposal.
 *
 * Mirrors the invoice modification path and uses the existing tenant
 * `save_quotation_with_items_transaction` RPC with `p_mode = 'update'`.
 */
export async function persistQuotationModification(
  tenantClient: TenantClient,
  proposal: BoluInvoiceModifyProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  entityId?: string | null,
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  return persistDocumentModification(
    QUOTATION_MODIFY_CONFIG,
    tenantClient,
    proposal,
    canWrite,
    canRead,
    entityId,
    actor,
  )
}

/* ====================================================================== */
/* Advance Invoice configuration (parent invoice only)                     */
/* ====================================================================== */

/**
 * Executes persistence for a Bolu Advance Invoice configuration proposal
 * (configure / update / remove).
 *
 * Contract:
 * - The parent invoice remains the sole financial source of truth; the advance
 *   derivation is delegated to the shared domain helpers
 *   (buildAdvanceParentInvoiceMetadata), never reimplemented here.
 * - Only `custom_fields.advance_invoice` is added/replaced/removed. The write
 *   merges onto the persisted custom_fields document, so every sibling key
 *   (calculationInputs, extraCharges, signatoryId, pdfOutput, …) is preserved
 *   verbatim. Header columns and line items are never touched or rewritten.
 * - The five editable fields are verified optimistically against the persisted
 *   row before any write; removal requires the full five-field old-value gate.
 * - No child invoice rows are ever created, mutated or deleted.
 */
export async function persistAdvanceInvoiceConfig(
  tenantClient: TenantClient,
  proposal: BoluAdvanceConfigProposal,
  canWrite: BoluWriteAuthorization,
  canRead: BoluReadAuthorization,
  actor?: BoluAuditActor | null,
): Promise<BoluOperationExecutionResult> {
  assertTenantAuthorization(tenantClient, canWrite, 'invoice', 'edit')

  if (!proposal || !proposal.opId) {
    throw new Error('Valid proposal is required for persistence.')
  }
  if (proposal.documentFamily !== 'invoice') {
    return { success: false, error: 'Advance Invoice configuration applies to the invoice family only.' }
  }
  if (!canRead('invoice', 'view')) {
    return { success: false, error: 'Read authorization missing for this invoice.' }
  }
  if (executedOperationIds.has(proposal.opId)) {
    return { success: false, error: 'This Advance Invoice change has already been submitted and executed.' }
  }
  if (isProposalStale(proposal)) {
    return { success: false, error: 'This proposal has expired. Please propose the change again.' }
  }
  if (proposal.status !== 'approved_pending_save' && proposal.status !== 'saving') {
    return { success: false, error: 'Advance Invoice changes require user approval (Gate 1) and save confirmation (Gate 2).' }
  }

  const ADVANCE_FIELDS: readonly BoluAdvanceFieldKey[] = ['suffix', 'mode', 'value', 'primary_label', 'secondary_label']
  const newValues = proposal.newValues ?? {}
  const oldValues = proposal.oldValues ?? {}

  // Defense in depth: re-check ranges in the executor so callers that bypass
  // validateBoluAdvanceConfigInput still fail closed.
  const nvMode = newValues.mode
  if (nvMode !== undefined && nvMode !== 'percentage' && nvMode !== 'percent' && nvMode !== 'fixed') {
    return { success: false, error: 'mode must be one of: percentage, percent, fixed.' }
  }
  if (newValues.value !== undefined) {
    if (typeof newValues.value !== 'number' || !Number.isFinite(newValues.value) || newValues.value < 0) {
      return { success: false, error: 'value must be a finite, non-negative number.' }
    }
    if ((nvMode === 'percentage' || nvMode === 'percent') && newValues.value > 100) {
      return { success: false, error: 'value must be between 0 and 100 for percentage mode.' }
    }
  }
  if (proposal.intent === 'remove') {
    if (Object.keys(newValues).length > 0) {
      return { success: false, error: 'remove must not carry newValues; the Advance Invoice configuration is deleted as a unit.' }
    }
    const missing = ADVANCE_FIELDS.filter((key) => !(key in oldValues))
    if (missing.length > 0) {
      return { success: false, error: `remove requires the full five-field gate: missing oldValues.${missing.join(', oldValues.')}.` }
    }
  }

  // 1. Full preservation snapshot of the parent invoice (header + custom_fields,
  //    plus `total` as the advance contract value). ---------------------------
  const { data: currentRow, error: fetchError } = await (tenantClient.from('invoices') as any)
    .select(ADVANCE_INVOICE_SELECT)
    .eq('id', proposal.targetDocumentId)
    .is('archived_at', null)
    .single()
  if (fetchError || !currentRow) {
    return { success: false, error: 'Target invoice could not be found or has been archived.' }
  }
  const currentDoc = currentRow as Record<string, any>
  const currentMeta = getAdvanceInvoiceMetadata(currentDoc)
  const present = Boolean(currentMeta)
  const documentNumber = String(currentDoc.invoice_number ?? proposal.targetDocumentNumber ?? '')

  // 2. Intent / state gate ----------------------------------------------------
  if (proposal.intent === 'configure' && present) {
    return { success: false, error: 'Advance Invoice is already configured on this invoice; use update instead.' }
  }
  if (proposal.intent === 'update' && !present) {
    return { success: false, error: 'No Advance Invoice is configured on this invoice; use configure instead.' }
  }
  if (proposal.intent === 'remove' && !present) {
    return { success: false, error: 'No Advance Invoice is configured on this invoice; nothing was removed.' }
  }
  if (proposal.intent === 'update' && Object.keys(newValues).length === 0) {
    return { success: false, error: 'update requires at least one of: suffix, mode, value, primary_label, secondary_label.' }
  }

  // 3. Optimistic concurrency guard on the five editable fields. Runs before
  //    any write; a single mismatch fails the whole operation closed. ---------
  const currentFields: Record<BoluAdvanceFieldKey, string | number | null> = {
    suffix: currentMeta?.suffix ?? null,
    mode: currentMeta?.mode ?? null,
    value: currentMeta?.value ?? null,
    primary_label: currentMeta?.primary_label ?? null,
    secondary_label: currentMeta?.secondary_label ?? null,
  }
  for (const [rawKey, expected] of Object.entries(oldValues)) {
    if (!ADVANCE_FIELDS.includes(rawKey as BoluAdvanceFieldKey)) {
      return { success: false, error: `Unknown oldValues field "${rawKey}". Only ${ADVANCE_FIELDS.join(', ')} may be guarded.` }
    }
    const key = rawKey as BoluAdvanceFieldKey
    const actual = currentFields[key]
    const matches = (expected === null && actual === null) || String(expected) === String(actual)
    if (!matches) {
      return {
        success: false,
        error: `Document has been modified by another process (current ${key}: "${actual}"). Proposal is stale.`,
      }
    }
  }

  // 4. Build the next custom_fields document (parent row only). --------------
  let nextCustomFields: Record<string, unknown>
  if (proposal.intent === 'remove') {
    nextCustomFields = clearAdvanceInvoiceMetadata(currentDoc.custom_fields)
  } else {
    const mergedMode = (newValues.mode ?? currentMeta?.mode ?? 'percentage') as 'percentage' | 'percent' | 'fixed'
    const helperMode = mergedMode === 'fixed' ? 'fixed' : 'percent'
    const mergedValue = newValues.value ?? currentMeta?.value ?? 30
    if (!(Number.isFinite(mergedValue) && mergedValue >= 0)) {
      return { success: false, error: 'value must be a finite, non-negative number.' }
    }
    if ((mergedMode === 'percentage' || mergedMode === 'percent') && mergedValue > 100) {
      return { success: false, error: 'value must be between 0 and 100 for percentage mode.' }
    }
    const mergedSuffix = newValues.suffix !== undefined
      ? newValues.suffix // '' intentionally strips the dash (domain semantics)
      : currentMeta?.suffix ?? undefined
    const metadata = buildAdvanceParentInvoiceMetadata({
      parentInvoice: {
        id: String(currentDoc.id),
        invoice_number: documentNumber || null,
        issue_date: currentDoc.issue_date ?? null,
        due_date: currentDoc.due_date ?? null,
        total: currentDoc.total,
      },
      mode: helperMode,
      inputValue: mergedValue,
      suffix: mergedSuffix,
      primaryLabel: newValues.primary_label ?? currentMeta?.primary_label ?? '',
      secondaryLabel: newValues.secondary_label ?? currentMeta?.secondary_label ?? '',
      legacyChildInvoiceId: currentMeta?.legacy_child_invoice_id || undefined,
      legacyChildInvoiceNumber: currentMeta?.legacy_child_invoice_number || undefined,
      legacyChildInvoiceTotal: currentMeta?.legacy_child_invoice_total ?? undefined,
      issuedAt: currentMeta?.issued_at || undefined,
      dueAt: currentMeta?.due_at || undefined,
      status: currentMeta?.status || undefined,
      printSnapshot: currentMeta?.print_snapshot,
    })
    nextCustomFields = mergeAdvanceInvoiceMetadata(currentDoc.custom_fields, metadata)
  }

  // 5. Single-row write against the parent invoice. ---------------------------
  const { error: writeError } = await (tenantClient.from('invoices') as any)
    .update({ custom_fields: JSON.stringify(nextCustomFields) })
    .eq('id', String(currentDoc.id))
  if (writeError) {
    return {
      success: false,
      error: `Advance Invoice configuration could not be saved: ${writeError.message ?? 'unknown error'}`,
    }
  }

  // 6. Replay-safety marker + audit trail. ------------------------------------
  executedOperationIds.add(proposal.opId)
  const beforeSummary = currentMeta
    ? `advance_invoice present (mode=${currentMeta.mode}, value=${currentMeta.value}, suffix=${currentMeta.suffix ?? '(none)'})`
    : 'advance_invoice absent'
  const afterSummary = proposal.intent === 'remove'
    ? 'advance_invoice removed'
    : `advance_invoice ${proposal.intent === 'configure' ? 'configured' : 'updated'} (mode=${(newValues.mode ?? currentMeta?.mode) ?? 'percentage'}, value=${newValues.value ?? currentMeta?.value ?? 30})`
  await recordBoluDocumentModificationAudit(tenantClient, {
    family: 'invoice',
    documentId: String(currentDoc.id),
    documentNumber,
    opId: proposal.opId,
    changedField: 'advance_invoice',
    oldValue: beforeSummary,
    newValue: afterSummary,
    actor,
  })

  return {
    success: true,
    documentId: String(currentDoc.id),
    documentNumber,
  }
}

