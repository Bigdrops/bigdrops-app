import type { AuditChangeKind } from '@/domain/audit/auditTypes'
import {
  isPersistableLineageId,
  normalizeChainId,
  normalizeLineageId,
  type FeedbackAuthorityStage,
} from './lineage'

/**
 * Phase 3 — pure CPS downstream-feedback planner.
 *
 * A Cost & Pricing Sheet is converted once into a Quotation, and that
 * Quotation may later become an Invoice. The newest document in the conversion
 * chain owns *downstream feedback authority*. While a document owns authority,
 * a user edit to one of its CPS-linked item rows may flow back into the
 * originating CPS row.
 *
 * This module is pure: no network import, no Supabase import, no clock, no
 * random value. It reads only the caller's before/after row state and the
 * resolved authority, and it returns a plan. The persistence layer applies the
 * plan. Diff logic therefore never hides inside a save hook.
 *
 * Identity rules:
 *  - A downstream row participates ONLY when it carries a persisted
 *    `source_cps_id` + `source_cps_row_id` pair. Nothing else is consulted:
 *    never description, `item_id`, row order, price, quantity, unit, image,
 *    group, or similarity.
 *  - A row that has no lineage is downstream-only. It can never create,
 *    attach to, or inherit a CPS row.
 *
 * Approved feedback contract — exactly three fields:
 *  - downstream `unit_price`   -> CPS `sp`
 *  - downstream `description`  -> CPS `description`
 *  - downstream `image_url`    -> CPS `image_url`
 *
 * Every other downstream field is out of contract. `cp` is never written:
 * downstream commercial price is selling price only.
 */

/** The approved CPS fields that downstream feedback may write. */
export const CPS_FEEDBACK_FIELDS = ['sp', 'description', 'image_url'] as const

export type CpsFeedbackField = (typeof CPS_FEEDBACK_FIELDS)[number]

/** The downstream document stage that owns feedback authority. */
export type CpsFeedbackDocumentType = FeedbackAuthorityStage

/**
 * A downstream item row as the planner sees it.
 *
 * Every field is optional on purpose. The planner distinguishes "field
 * omitted" from "field explicitly cleared" with an own-property check, so a
 * caller that patches only one field can never clear a CPS image by accident.
 */
export interface CpsFeedbackRow {
  id?: string | null
  row_type?: string | null
  description?: string | null
  unit_price?: number | string | null
  image_url?: string | null
  source_cps_id?: string | null
  source_cps_row_id?: string | null
}

/**
 * Persisted authority for one conversion chain.
 *
 * `stage` is the document type that currently owns authority, `documentId` is
 * that document's id, and `chainId` is the chain the authority belongs to.
 * All three come from persisted state. Edit recency, document status, document
 * number, and client state are never inputs.
 */
export interface CpsFeedbackAuthority {
  stage: FeedbackAuthorityStage | null
  documentId: string | null
  chainId: string | null
}

export interface CpsFeedbackFieldChange {
  /** The CPS field written by feedback. */
  cpsField: CpsFeedbackField
  /** The downstream field the value came from. */
  downstreamField: 'unit_price' | 'description' | 'image_url'
  /** Human label used by the CPS audit timeline. */
  label: string
  kind: AuditChangeKind
  /** Downstream value before the edit. Used for the parent (dependency) event. */
  downstreamOldValue: unknown
  /** Downstream value after the edit. */
  downstreamNewValue: unknown
  /** The value feedback writes to CPS. Equals `downstreamNewValue` canonically. */
  cpsNewValue: unknown
}

/**
 * One CPS-linked downstream row whose approved fields changed.
 *
 * The shape carries only what is needed to apply and audit the mutation. No
 * unrelated business state (totals, VAT, discount, charges, groups) travels
 * with it.
 */
export interface CpsFeedbackMutation {
  sourceDocumentType: CpsFeedbackDocumentType
  sourceDocumentId: string
  sourceDocumentNumber: string | null
  /** Persisted downstream row id when the caller knows it, else null. */
  sourceRowId: string | null
  sourceCpsId: string
  sourceCpsRowId: string
  rowLabel: string
  chainId: string
  changes: CpsFeedbackFieldChange[]
}

export type CpsFeedbackSkipReason =
  | 'authority-mismatch'
  | 'no-chain'
  | 'invalid-source-document'
  | 'invalid-lineage'
  | 'ambiguous-lineage'
  | 'row-not-in-baseline'
  | 'section-row'

export interface CpsFeedbackSkip {
  reason: CpsFeedbackSkipReason
  sourceCpsRowId: string | null
  rowLabel: string | null
}

export interface CpsFeedbackPlan {
  /**
   * True when the authority gate passed. A plan may still carry zero mutations
   * when nothing approved changed: an ordinary save is not a feedback event.
   */
  ok: boolean
  /** Why the authority gate refused, or null when it passed. */
  reason: CpsFeedbackSkipReason | null
  chainId: string | null
  sourceDocumentType: CpsFeedbackDocumentType
  sourceDocumentId: string | null
  sourceDocumentNumber: string | null
  sourceCpsId: string | null
  mutations: CpsFeedbackMutation[]
  /** Diagnostic rows that could not participate. Never used for retargeting. */
  skipped: CpsFeedbackSkip[]
}

export interface PlanCpsFeedbackInput {
  sourceDocumentType: CpsFeedbackDocumentType
  sourceDocumentId: string | null | undefined
  sourceDocumentNumber?: string | null
  chainId: string | null | undefined
  authority: CpsFeedbackAuthority | null | undefined
  /** Persisted downstream rows as they were before the save. */
  beforeRows: readonly CpsFeedbackRow[] | null | undefined
  /** Downstream rows exactly as they are written by this save. */
  afterRows: readonly CpsFeedbackRow[] | null | undefined
}

const DOWNSTREAM_FIELD_FOR_CPS: Record<
  CpsFeedbackField,
  CpsFeedbackFieldChange['downstreamField']
> = {
  sp: 'unit_price',
  description: 'description',
  image_url: 'image_url',
}

const LABEL_FOR_CPS_FIELD: Record<CpsFeedbackField, string> = {
  sp: 'Selling price',
  description: 'Description',
  image_url: 'Image',
}

const KIND_FOR_CPS_FIELD: Record<CpsFeedbackField, AuditChangeKind> = {
  sp: 'money',
  description: 'default',
  image_url: 'image',
}

function hasOwn(row: CpsFeedbackRow, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, key)
}

/**
 * Canonical price value. Mirrors the money normalization already used by the
 * CPS audit diff: a blank value is zero and a non-finite value is zero. So
 * `25000` and `25000.00` are the same price, and `''` and `0` are the same
 * price. No second normalization rule is invented here.
 */
export function canonicalFeedbackPrice(value: unknown): number {
  if (value === null || value === undefined || String(value).trim() === '') return 0
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

/** Canonical free text: trimmed. Whitespace-only noise is not a change. */
export function canonicalFeedbackText(value: unknown): string {
  return String(value ?? '').trim()
}

/** Canonical image reference: the stored reference only, trimmed. Empty = none. */
export function canonicalFeedbackImage(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text === '' ? null : text
}

/**
 * Resolve the downstream-feedback authority gate from persisted state only.
 *
 * A plan is allowed only when the chain has authority, the authority stage
 * equals the saving document type, the authority document id equals the
 * document being saved, and the chain ids agree. Anything else refuses.
 */
export function resolveCpsFeedbackGate(input: {
  sourceDocumentType: CpsFeedbackDocumentType
  sourceDocumentId: string | null | undefined
  chainId: string | null | undefined
  authority: CpsFeedbackAuthority | null | undefined
}): { allowed: boolean; reason: CpsFeedbackSkipReason | null } {
  const chainId = normalizeChainId(input.chainId)
  if (!chainId) return { allowed: false, reason: 'no-chain' }

  const sourceDocumentId = normalizeLineageId(input.sourceDocumentId)
  if (!sourceDocumentId) return { allowed: false, reason: 'invalid-source-document' }

  const authority = input.authority
  if (!authority || !authority.stage) {
    return { allowed: false, reason: 'authority-mismatch' }
  }
  if (authority.stage !== input.sourceDocumentType) {
    return { allowed: false, reason: 'authority-mismatch' }
  }
  if (normalizeLineageId(authority.documentId) !== sourceDocumentId) {
    return { allowed: false, reason: 'authority-mismatch' }
  }
  const authorityChainId = normalizeChainId(authority.chainId)
  if (authorityChainId && authorityChainId !== chainId) {
    return { allowed: false, reason: 'authority-mismatch' }
  }

  return { allowed: true, reason: null }
}

interface IndexedRow {
  row: CpsFeedbackRow
  cpsId: string
  cpsRowId: string
}

function lineageKey(cpsId: string, cpsRowId: string): string {
  return `${cpsId}|${cpsRowId}`
}

function isSectionRow(row: CpsFeedbackRow): boolean {
  return row.row_type === 'section' || row.row_type === 'group_header'
}

/**
 * Index the rows that may participate. Rows without a full, persisted lineage
 * pair are excluded. Rows whose lineage pair appears more than once are
 * excluded too: an ambiguous identity must never decide a target.
 */
function indexLinkedRows(rows: readonly CpsFeedbackRow[] | null | undefined): {
  byKey: Map<string, IndexedRow>
  duplicated: Set<string>
} {
  const byKey = new Map<string, IndexedRow>()
  const duplicated = new Set<string>()

  for (const row of rows || []) {
    if (!row || isSectionRow(row)) continue
    const cpsId = normalizeLineageId(row.source_cps_id)
    const cpsRowId = normalizeLineageId(row.source_cps_row_id)
    if (!isPersistableLineageId(cpsId) || !isPersistableLineageId(cpsRowId)) continue

    const key = lineageKey(cpsId, cpsRowId)
    if (byKey.has(key)) {
      duplicated.add(key)
      continue
    }
    byKey.set(key, { row, cpsId, cpsRowId })
  }

  return { byKey, duplicated }
}

function rowLabel(row: CpsFeedbackRow): string {
  return canonicalFeedbackText(row.description) || 'Untitled item'
}

function changeFor(
  cpsField: CpsFeedbackField,
  before: CpsFeedbackRow,
  after: CpsFeedbackRow,
): CpsFeedbackFieldChange | null {
  if (cpsField === 'sp') {
    const oldValue = canonicalFeedbackPrice(before.unit_price)
    const newValue = canonicalFeedbackPrice(after.unit_price)
    if (oldValue === newValue) return null
    return {
      cpsField,
      downstreamField: DOWNSTREAM_FIELD_FOR_CPS[cpsField],
      label: LABEL_FOR_CPS_FIELD[cpsField],
      kind: KIND_FOR_CPS_FIELD[cpsField],
      downstreamOldValue: oldValue,
      downstreamNewValue: newValue,
      cpsNewValue: newValue,
    }
  }

  if (cpsField === 'description') {
    const oldValue = canonicalFeedbackText(before.description)
    const newValue = canonicalFeedbackText(after.description)
    if (oldValue === newValue) return null
    return {
      cpsField,
      downstreamField: DOWNSTREAM_FIELD_FOR_CPS[cpsField],
      label: LABEL_FOR_CPS_FIELD[cpsField],
      kind: KIND_FOR_CPS_FIELD[cpsField],
      downstreamOldValue: oldValue,
      downstreamNewValue: newValue,
      cpsNewValue: newValue,
    }
  }

  // Image. The after row must OWN the field to express an intent at all.
  // A payload that merely omits `image_url` is not a deletion: serialization
  // omission must never clear a CPS image. An explicit null from a caller that
  // round-trips the field IS a deletion.
  if (!hasOwn(after, 'image_url')) return null

  const oldValue = hasOwn(before, 'image_url') ? canonicalFeedbackImage(before.image_url) : null
  const newValue = canonicalFeedbackImage(after.image_url)
  if (oldValue === newValue) return null
  return {
    cpsField,
    downstreamField: DOWNSTREAM_FIELD_FOR_CPS[cpsField],
    label: LABEL_FOR_CPS_FIELD[cpsField],
    kind: KIND_FOR_CPS_FIELD[cpsField],
    downstreamOldValue: oldValue,
    downstreamNewValue: newValue,
    cpsNewValue: newValue,
  }
}

/**
 * Plan the approved CPS feedback for one downstream save.
 *
 * Returns a plan with zero mutations when nothing approved changed, a row has
 * no lineage, a row was added downstream, or the authority gate refused. The
 * caller persists the plan only when it carries mutations.
 */
export function planCpsFeedback(input: PlanCpsFeedbackInput): CpsFeedbackPlan {
  const chainId = normalizeChainId(input.chainId)
  const sourceDocumentId = normalizeLineageId(input.sourceDocumentId)
  const sourceDocumentType = input.sourceDocumentType

  const base: CpsFeedbackPlan = {
    ok: false,
    reason: null,
    chainId,
    sourceDocumentType,
    sourceDocumentId,
    sourceDocumentNumber: input.sourceDocumentNumber ?? null,
    sourceCpsId: null,
    mutations: [],
    skipped: [],
  }

  const gate = resolveCpsFeedbackGate({
    sourceDocumentType,
    sourceDocumentId,
    chainId,
    authority: input.authority,
  })
  if (!gate.allowed) {
    return { ...base, reason: gate.reason }
  }

  const before = indexLinkedRows(input.beforeRows)
  const after = indexLinkedRows(input.afterRows)
  const mutations: CpsFeedbackMutation[] = []
  const skipped: CpsFeedbackSkip[] = []
  let sourceCpsId: string | null = null

  for (const [key, candidate] of after.byKey) {
    if (after.duplicated.has(key)) {
      skipped.push({
        reason: 'ambiguous-lineage',
        sourceCpsRowId: candidate.cpsRowId,
        rowLabel: rowLabel(candidate.row),
      })
      continue
    }
    if (before.duplicated.has(key)) {
      skipped.push({
        reason: 'ambiguous-lineage',
        sourceCpsRowId: candidate.cpsRowId,
        rowLabel: rowLabel(candidate.row),
      })
      continue
    }

    const previous = before.byKey.get(key)
    if (!previous) {
      skipped.push({
        reason: 'row-not-in-baseline',
        sourceCpsRowId: candidate.cpsRowId,
        rowLabel: rowLabel(candidate.row),
      })
      continue
    }

    const changes: CpsFeedbackFieldChange[] = []
    for (const field of CPS_FEEDBACK_FIELDS) {
      const change = changeFor(field, previous.row, candidate.row)
      if (change) changes.push(change)
    }
    if (changes.length === 0) continue

    sourceCpsId = sourceCpsId ?? candidate.cpsId
    mutations.push({
      sourceDocumentType,
      sourceDocumentId: sourceDocumentId as string,
      sourceDocumentNumber: input.sourceDocumentNumber ?? null,
      sourceRowId: normalizeLineageId(candidate.row.id),
      sourceCpsId: candidate.cpsId,
      sourceCpsRowId: candidate.cpsRowId,
      rowLabel: rowLabel(candidate.row),
      chainId: chainId as string,
      changes,
    })
  }

  return {
    ...base,
    ok: true,
    reason: null,
    sourceCpsId,
    mutations,
    skipped,
  }
}
