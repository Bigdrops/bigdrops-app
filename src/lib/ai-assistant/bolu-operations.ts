/**
 * bolu-operations.ts — Typed Business Operation Contract for Bolu
 *
 * Enforces application-owned validation, authorization, and financial integrity.
 * The AI model interprets intent and proposes structured operations.
 * The application owns validation, calculation, authorization, and persistence.
 *
 * Two Distinct Approval Gates:
 * - Gate 1: User explicitly approves the exact structured proposal (modifying working draft).
 * - Gate 2: User separately confirms saving before the document is persisted.
 */

import { calculateDocument, type ComputedItem, type DocumentResult } from '@/lib/Calculations'
import {
  buildAdvanceParentInvoiceMetadata,
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
  ADVANCE_SUFFIX_DEFAULT,
} from '@/domain/invoice/advanceChildFlow'
import {
  applyFieldOperations,
  applyGroupOperations,
  fingerprintFieldFamily,
  fingerprintItems,
  normalizeFieldEntry,
} from './bolu-document-ops'
import {
  applyPresentationPatch,
  fingerprintPresentation,
  DEFAULT_COLUMN_ORDER,
} from './bolu-presentation'
import type { CommercialRichTextBlock } from '@/lib/commercialRichText'
import type { TenantClient } from '@/lib/tenantClient'
import type { BoluClientMatch, BoluReadAuthorization, BoluWriteAuthorization } from './bolu-data'

const RICH_TEXT_BLOCK_TYPES = new Set(['paragraph', 'heading', 'ordered_list', 'unordered_list'])

/**
 * Accepts the two documented rich-text contracts for notes/terms:
 * a string (plain text or HTML you may hand to the normalizer) or the
 * CommercialRichTextBlock[] array. Returns null for anything else.
 */
function asRichText(value: unknown): string | CommercialRichTextBlock[] | null {
  if (typeof value === 'string') {
    return value
  }
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((block) =>
      block &&
      typeof block === 'object' &&
      !Array.isArray(block) &&
      RICH_TEXT_BLOCK_TYPES.has((block as Record<string, unknown>).type as string),
    )
  ) {
    return value as CommercialRichTextBlock[]
  }
  return null
}

export type BoluOperationType = 'create-document' | 'modify-document' | 'advance-invoice-config'
export type BoluDocumentFamily = 'invoice' | 'quotation'
export type BoluSideEffect = 'draft-mutation' | 'persistence'

export type BoluProposalStatus =
  | 'pending_approval'      // Awaiting Gate 1 (Review & approve change)
  | 'approved_pending_save' // Gate 1 approved; awaiting Gate 2 (Confirm save)
  | 'saving'                // Gate 2 confirmed; persistence in flight
  | 'persisted'             // Successfully written to database
  | 'rejected'              // Gate 1 rejected by user; state unchanged
  | 'cancelled'             // Gate 2 cancelled by user; persistence aborted
  | 'failed'                // Persistence or validation failed

export interface BoluInvoiceItemInput {
  description: string
  quantity: number
  unit_price: number
  unit?: string
  // Extended item fields
  row_type?: 'standard'
  group_id?: string | null
  group_name?: string | null
  item_id?: string | null
  install_rate?: number | null
  install_rate_taxable?: boolean
  vat_rate?: number | null
  discount_rate?: number | null
  sub_description?: string | null
  make?: string | null
  /** Stored in the item's `custom_data`, the form's extension field. */
  part_number?: string | null
  /** Stored in the item's `custom_data`, the form's extension field. */
  condition?: string | null
  /** `null` clears the existing item photo; adding/replacing photos is not available through the assistant yet. */
  image_url?: string | null
}

/**
 * A focused question Bolu asks when a request is ambiguous or incomplete.
 * Reusable across operations; answers update the pending proposal and never
 * authorize a database write.
 */
export interface BoluClarificationOption {
  id: string
  label: string
  description?: string
}

export interface BoluClarificationQuestion {
  id: string
  prompt: string
  options: BoluClarificationOption[]
  allowFreeText?: boolean
  deferrable?: boolean
}

export interface BoluClarification {
  id: string
  reason: string
  questions: BoluClarificationQuestion[]
}

/** Outcome of resolving a client name hint against the tenant directory. */
export type BoluClientResolution =
  | { status: 'resolved'; client: BoluClientMatch }
  | { status: 'ambiguous'; query: string; matches: BoluClientMatch[] }
  | { status: 'not_found'; query: string }
  | { status: 'search_error'; query: string; error: string }

/**
 * A named extra charge that can be attached to a document.
 * Maps directly to ExtraCharge from @/lib/Calculations.
 */
export interface BoluExtraCharge {
  label: string        // charge name e.g. "Transportation", "Installation fee"
  value: number        // charge amount (non-negative)
  vatApplicable: boolean  // whether VAT applies to this charge
}

export interface BoluInvoiceCreatePayload {
  client_name: string
  client_id?: string | null
  items: BoluInvoiceItemInput[]
  issue_date?: string
  due_date?: string
  /** Plain text with newlines, or the structured CommercialRichTextBlock[] contract. */
  notes?: string | CommercialRichTextBlock[]
  payment_terms?: string
  /** Terms and conditions, distinct from the payment terms text. Plain text or blocks. */
  terms?: string | CommercialRichTextBlock[] | null
  // Extended fields
  title?: string | null           // invoice_title / quotation_title
  po_number?: string | null
  project_id?: string | null
  work_duration?: string | null
  workmanship?: number            // fixed commercial charge
  transportation?: number         // fixed commercial charge
  shipping?: number               // fixed commercial charge
  discount?: number               // global discount value
  discount_type?: 'fixed' | 'percent'
  discount_timing?: 'before_tax' | 'after_tax'
  wht?: number                    // WHT value
  wht_type?: 'fixed' | 'percent'
  global_vat_percent?: number     // default 7.5
  extra_charges?: BoluExtraCharge[] // custom named extra charges
}

/**
 * One scalar-ish modification field — the complete catalog of the modify
 * contract. Numeric commercial charges carry numbers; text fields carry
 * strings; notes/terms carry the rich-text contract; `"<name>_removal"` is
 * not a field — use the blocks below.
 */
export type BoluModifyFieldKey =
  | 'client_name'
  | 'notes'
  | 'payment_terms'
  | 'due_date'
  | 'issue_date'
  | 'terms'
  | 'po_number'
  | 'title'
  | 'project_id'
  | 'work_duration'
  | 'workmanship'
  | 'transportation'
  | 'shipping'

/** A document detail row ({ label, value }) in custom_fields.header or custom_fields.additionalFields. */
export interface BoluFieldEntry {
  id?: string
  label: string
  value: string
  [key: string]: unknown
}

export interface BoluFieldMatch {
  id?: string
  label?: string
}

/**
 * Operations on one custom-document-field family. Entries are matched by id
 * when present, or by trimmed, case-insensitive label (unique-match required).
 * Labels and values are both required and trimmed; empty entries never persist.
 */
export type BoluFieldEntryOp =
  | { op: 'add'; label: string; value: string }
  | { op: 'update'; match: BoluFieldMatch; set: { label?: string; value?: string } }
  | { op: 'remove'; match: BoluFieldMatch }

/** Group-of-items operations for custom_fields.groupMeta and row_type: 'group_header' rows. */
export type BoluGroupOp =
  | { op: 'create-group'; name: string; showSubtotal?: boolean }
  | { op: 'rename-group'; group: string; set: { name?: string; showSubtotal?: boolean } }
  | { op: 'add-items'; group: string | null; items: string[] }
  | { op: 'set-subtotal'; group: string; showSubtotal: boolean }
  | { op: 'remove-group'; group: string; disposition: 'ungroup-items' | 'delete-items' }
  | { op: 'reorder-groups'; order: string[] }

/** Custom detail-row and chip family changes. Both families are independent siblings of payment_terms etc. */
export interface BoluCustomFieldsChange {
  header?: BoluFieldEntryOp[]
  additionalFields?: BoluFieldEntryOp[]
}

/** Presentation controls — PDF output, headings, labels, quantity/unit merge, image visibility, columns, signatory. */
export interface BoluPdfOutputPatch {
  showBankDetails?: boolean
  /** null = reset to the business-default bank account; absent = keep the persisted one. */
  bankAccountId?: string | null
  showFooter?: boolean
  showTagline?: boolean
  showBalanceDue?: boolean
  showAmountInWords?: boolean
  compact?: boolean
  landscapeLayout?: boolean
}

export interface BoluChargeLabelsPatch {
  workmanship?: string | null
  transportation?: string | null
  shipping?: string | null
}

export interface BoluColumnModeOp {
  key: string
  mode: 'show' | 'hide_display' | 'hide_full'
}

export interface BoluColumnLabelOp {
  key: string
  label: string
}

export interface BoluColumnsPatch {
  setMode?: BoluColumnModeOp[]
  setLabel?: BoluColumnLabelOp[]
  /** Cassette of builtin column keys; unknown keys rejected, full builtin set required. */
  order?: string[]
  resetToDefaults?: boolean
}

export interface BoluPresentationChange {
  pdfOutput?: BoluPdfOutputPatch
  /** String = set; null/empty string = restore the default heading. */
  notesTitle?: string | null
  /** String = set; null/empty string = restore the default heading. */
  termsTitle?: string | null
  chargeLabels?: BoluChargeLabelsPatch
  mergeQtyUnit?: boolean
  showItemImages?: boolean
  columns?: BoluColumnsPatch
  /** Signatory id (uuid) or exact name; null = remove the signatory. */
  signatory?: string | null
}

/** Calculation inputs are patched as a block; every field is optional, at least one required. */
export interface BoluCalculationInputValues {
  vatPercent?: number
  discountValue?: number
  discountType?: 'fixed' | 'percent'
  discountTiming?: 'before_tax' | 'after_tax'
  whtValue?: number
  whtType?: 'fixed' | 'percent'
}

export type BoluExtraChargeInput = {
  label: string
  value: number
  withTax: boolean
}

/** Persisted snapshot carried by a proposal so the executor and preview share one authority. */
export interface BoluModifyCurrentSnapshot {
  document: Record<string, unknown>
  items: Array<Record<string, unknown>>
}

export interface BoluInvoiceModifyPayload {
  documentId: string
  /** Resolved family the request targets; the envelope carries the caller's explicit family when present. */
  documentFamily?: 'invoice' | 'quotation'
  field?: BoluModifyFieldKey
  oldValue?: string | number | null
  newValue?: string | number | CommercialRichTextBlock[] | null
  items?: BoluInvoiceItemInput[]
  oldItems?: BoluInvoiceItemInput[]
  /** Desired extra-charges set for the parent document, validated and normalized at input time. */
  extraChargesChange?: BoluExtraChargeInput[]
  /** Partial patch to the document's calculation inputs. */
  calculationInputsChange?: Partial<BoluCalculationInputValues>
  /** Custom document detail-row / chip edits (F3-04). */
  customFieldsChange?: BoluCustomFieldsChange
  /** Structured group operations (F3-05/F3-13); cannot be combined with itemsChange. */
  groupsChange?: BoluGroupOp[]
  /** Presentation controls (PDF output, headings, labels, columns, signatory). */
  presentationChange?: BoluPresentationChange
  /** Build-time resolved signatory identity (Gate 1 preview). Resolved again at Gate 2. */
  resolvedSignatory?: { id: string; name: string; role: string } | null
  /** Build-time resolved bank account (Gate 1 preview). Resolved again at Gate 2. */
  resolvedBankAccount?: { id: string; label: string } | null
}

export interface BoluOperationContract {
  opId: string
  operationType: BoluOperationType
  documentFamily: BoluDocumentFamily
  schemaVersion: '1.0'
  requiredPermission: {
    resource: 'invoice' | 'quotation'
    /** Canonical has_entity_permission action. Never 'save'. */
    action: 'view' | 'create' | 'edit'
  }
  sideEffect: BoluSideEffect
  gate1Required: true
  gate2Required: true
  status: BoluProposalStatus
  createdAt: string
  expiresAt: string // Stale detection timestamp (15 minutes)
}

/**
 * A document creation proposal. Invoices and quotations share the identical
 * payload and financial contract; only `documentFamily` selects the table row
 * family that Gate 2 writes to.
 */
export interface BoluDocumentCreateProposal extends BoluOperationContract {
  operationType: 'create-document'
  documentFamily: BoluDocumentFamily
  payload: BoluInvoiceCreatePayload
  computedTotals: {
    subtotal: number
    vat: number
    total: number
    wht: number
    discount: number
    extraChargesTotal: number
    items: ComputedItem[]
  }
  candidateNumber: string
  persistedId?: string
  errorMessage?: string
  /** Client resolution outcome that the preview can surface as a picker. */
  clientResolution?: BoluClientResolution
  /** Focused questions the user must answer before the proposal is complete. */
  clarification?: BoluClarification
  /**
   * Answers already given to clarification questions. Recording an answer
   * updates the draft only; it never approves the document or authorizes a write.
   */
  clarificationAnswers?: Record<string, string>
  /**
   * Optional, grounded improvements. They are shown for the user to accept by
   * describing the change in chat; nothing here is applied automatically.
   */
  suggestions?: string[]
}

export type BoluInvoiceCreateProposal = BoluDocumentCreateProposal

export interface BoluDocumentModifyProposal extends BoluOperationContract {
  operationType: 'modify-document'
  documentFamily: BoluDocumentFamily
  targetDocumentId: string
  targetDocumentNumber: string
  field?: BoluModifyFieldKey
  oldValue?: string | number | null
  newValue?: string | number | CommercialRichTextBlock[] | null
  itemsChange?: {
    oldItems: BoluInvoiceItemInput[]
    newItems: BoluInvoiceItemInput[]
  }
  /** Full-list desired extra-charges set. old/new are contract-normalized by the builder. */
  extraChargesChange?: {
    oldExtraCharges: BoluExtraChargeInput[]
    newExtraCharges: BoluExtraChargeInput[]
  }
  /** Custom document fields family diff, snapshot-derived by the builder. */
  customFieldsChange?: {
    oldHeader: BoluFieldEntry[]
    newHeader: BoluFieldEntry[]
    oldAdditionalFields: BoluFieldEntry[]
    newAdditionalFields: BoluFieldEntry[]
    summary: string[]
    errors: string[]
    fingerprintHeader: string
    fingerprintAdditionalFields: string
    headerOps?: BoluFieldEntryOp[]
    additionalOps?: BoluFieldEntryOp[]
  }
  /** Group operations carried verbatim; `after` is snapshot-derived for the preview. */
  groupsChange?: BoluGroupOp[]
  groupsApplication?: {
    summary: string[]
    errors: string[]
    after: Array<{ name: string; members: number; showSubtotal: boolean }>
    /** Flat presentation rows in document order, for the preview to render group headings distinctly. */
    previewRows: Array<
      | { type: 'group'; text: string; showSubtotal: boolean }
      | { type: 'item'; text: string }
    >
  }
  /** Fingerprint of the items+groupMeta snapshot, re-checked at Gate 2. */
  itemsFingerprint?: string
  /** Presentation controls — snapshot-derived for the preview; re-checked at Gate 2. */
  presentationChange?: {
    old: Record<string, unknown>
    new: Record<string, unknown>
    rows: Array<{ key: string; label: string; before: string; after: string; cleared?: boolean }>
    summary: string[]
    errors: string[]
    fingerprint: string
  }
  /** Calculation-inputs patch. old carries every persisted key in play; new carries only requested keys. */
  calculationInputsChange?: {
    old: Partial<BoluCalculationInputValues>
    new: Partial<BoluCalculationInputValues>
  }
  computedTotals?: {
    subtotal: number
    vat: number
    total: number
    discount?: number
    wht?: number
    installRateTotal?: number
    extraChargesTotal?: number
  }
  /** Fixed commercial charges after the requested change (persisted snapshot carry-through for preview/executor). */
  chargesSnapshot?: {
    workmanship: number
    transportation: number
    shipping: number
  }
  persistedId?: string
  errorMessage?: string
}

export type BoluInvoiceModifyProposal = BoluDocumentModifyProposal

export type BoluAdvanceFieldKey = 'suffix' | 'mode' | 'value' | 'primary_label' | 'secondary_label'
export type BoluAdvanceIntent = 'configure' | 'update' | 'remove'
export type BoluAdvanceModeInput = 'percentage' | 'percent' | 'fixed'

/**
 * Bolu proposal for the parent invoice's Advance Invoice configuration
 * (`custom_fields.advance_invoice`). It never creates, mutates or deletes a
 * child invoice row; other `custom_fields` keys and every persisted column
 * are carried through untouched by the executor.
 */
export interface BoluAdvanceConfigProposal extends BoluOperationContract {
  operationType: 'advance-invoice-config'
  /** Restricted to the invoice family; quotations/non-invoices are rejected. */
  documentFamily: 'invoice'
  targetDocumentId: string
  targetDocumentNumber: string
  intent: BoluAdvanceIntent
  /**
   * New values for the five editable fields. Absent keys mean "leave the
   * persisted value unchanged" - never reset to default. Only meaningful for
   * `configure`/`update`; must be empty for `remove`.
   */
  newValues: {
    suffix?: string
    mode?: BoluAdvanceModeInput
    value?: number
    primary_label?: string
    secondary_label?: string
  }
  /** Optimistic concurrency snapshot for the five fields, exactly as shown at Gate 1. */
  oldValues: Partial<Record<BoluAdvanceFieldKey, string | number | null>>
  /** Structured Gate 1 preview: exact before/after for the five fields plus derived values. */
  preview: {
    advance_present_before: boolean
    advance_present_after: boolean
    fields: Record<BoluAdvanceFieldKey, { before: string | number | null; after: string | number | null }>
    /** Derived document number (`<number>-<suffix>`) for configure/update. */
    documentNumber?: string | null
    /** Derived advance amount for configure/update. */
    amount?: number | null
    contractValue?: number
  }
  persistedId?: string
  errorMessage?: string
}

export type BoluProposal = BoluDocumentCreateProposal | BoluDocumentModifyProposal | BoluAdvanceConfigProposal

/**
 * Generate a unique, monotonic, stable operation ID.
 */
let opSequence = 0
export function generateOperationId(): string {
  return `bolu-op-${Date.now()}-${++opSequence}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Validates invoice line items with strict boundaries.
 */
export function validateInvoiceItems(items: unknown): {
  valid: boolean
  errors: string[]
  data: BoluInvoiceItemInput[]
} {
  const errors: string[] = []
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, errors: ['At least one item is required.'], data: [] }
  }

  const validated: BoluInvoiceItemInput[] = []
  for (let i = 0; i < items.length; i++) {
    const raw = items[i]
    if (!raw || typeof raw !== 'object') {
      errors.push(`Item #${i + 1} is invalid.`)
      continue
    }
    const item = raw as Record<string, unknown>
    const description = typeof item.description === 'string' ? item.description.trim() : ''
    if (!description) {
      errors.push(`Item #${i + 1} is missing a description.`)
    }

    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`Item #${i + 1} must have a positive quantity (> 0).`)
    }

    const unitPrice = Number(item.unit_price)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      errors.push(`Item #${i + 1} must have a valid non-negative unit price.`)
    }

    // Conversational image authoring is not available: `null` clears an
    // existing photo; anything else is refused with honest guidance.
    if (item.image_url !== undefined && item.image_url !== null) {
      errors.push(`Item #${i + 1}: adding or replacing item photos is not available through the assistant. Clear the existing photo, or use the document form to upload one.`)
    }

    if (description && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unitPrice) && unitPrice >= 0) {
      const optionalNumber = (value: unknown): number | null | undefined =>
        // Tri-state: undefined = key absent (caller keeps the existing value);
        // null = explicit clear request; number = explicit value.
        value === undefined ? undefined
          : value === null ? null
            : typeof value === 'number' && Number.isFinite(value) ? value
              : undefined
      const optionalString = (value: unknown): string | null | undefined =>
        value === undefined ? undefined
          : typeof value !== 'string' ? undefined
            : value.trim() ? value.trim()
              : null

      validated.push({
        description,
        quantity,
        unit_price: unitPrice,
        unit: typeof item.unit === 'string' ? item.unit.trim() : undefined,
        row_type: 'standard',
        group_id: optionalString(item.group_id),
        group_name: optionalString(item.group_name),
        item_id: optionalString(item.item_id),
        install_rate: optionalNumber(item.install_rate),
        install_rate_taxable: typeof item.install_rate_taxable === 'boolean' ? item.install_rate_taxable : undefined,
        vat_rate: optionalNumber(item.vat_rate),
        discount_rate: optionalNumber(item.discount_rate),
        sub_description: optionalString(item.sub_description),
        make: optionalString(item.make),
        part_number: optionalString(item.part_number ?? item.partNo),
        condition: optionalString(item.condition),
        image_url: item.image_url === null ? null : undefined,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: validated,
  }
}

/** Field-family ops must carry usable match/target data and capped batch sizes. */
export function validateBoluCustomFieldsChange(raw: unknown): { data?: BoluCustomFieldsChange; errors: string[] } {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { errors: ['The document fields change must be an object with "header" and/or "additionalFields".'] }
  }
  const payload = raw as Record<string, unknown>
  const ALLOWED_FAMILIES = new Set(['header', 'additionalFields'])
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_FAMILIES.has(key)) {
      errors.push(`"${key}" is not a document field family. Supported families: header and additionalFields.`)
    }
  }

  const cleanFamily = (family: 'header' | 'additionalFields') => {
    const rawOps = payload[family]
    if (rawOps === undefined) return undefined
    if (!Array.isArray(rawOps)) {
      errors.push(`The ${family} change must be a list of operations.`)
      return undefined
    }
    if (rawOps.length > 25) {
      errors.push(`The ${family} change must not exceed 25 operations.`)
      return undefined
    }
    const ops: BoluFieldEntryOp[] = []
    const batchLabels = new Set<string>()
    for (let i = 0; i < rawOps.length; i++) {
      const op = rawOps[i] as Record<string, unknown>
      if (!op || typeof op !== 'object' || Array.isArray(op)) {
        errors.push(`${family}[${i}] is invalid.`)
        continue
      }
      const opName = typeof op.op === 'string' ? op.op : ''
      if (opName === 'add') {
        const label = typeof op.label === 'string' ? op.label.trim() : ''
        const value = typeof op.value === 'string' ? op.value.trim() : ''
        if (!label || !value) {
          errors.push(`${family}[${i}]: new entries need both a label and a value.`)
          continue
        }
        const key = label.toLowerCase()
        if (batchLabels.has(key)) {
          errors.push(`${family}[${i}]: the same label appears twice in this change. Labels must be unique within each family.`)
          continue
        }
        batchLabels.add(key)
        ops.push({ op: 'add', label, value })
        continue
      }
      if (opName === 'update') {
        const match = op.match as Record<string, unknown> | undefined
        const matchId = match && typeof match.id === 'string' ? match.id.trim() : ''
        const matchLabel = match && typeof match.label === 'string' ? match.label.trim() : ''
        if (!matchId && !matchLabel) {
          errors.push(`${family}[${i}]: which entry should I update? Give me its label (and value, if shared).`)
          continue
        }
        const set = op.set as Record<string, unknown> | undefined
        const setLabel = set && typeof set.label === 'string' ? set.label.trim() : undefined
        const setValue = set && typeof set.value === 'string' ? set.value.trim() : undefined
        if (setLabel === undefined && setValue === undefined) {
          errors.push(`${family}[${i}]: provide the new label and/or value to set.`)
          continue
        }
        if (setLabel !== undefined && !setLabel) errors.push(`${family}[${i}]: the new label cannot be blank.`)
        if (setValue !== undefined && !setValue) errors.push(`${family}[${i}]: the new value cannot be blank.`)
        if (errors.length === 0) {
          ops.push({ op: 'update', match: { id: matchId || undefined, label: matchLabel || undefined }, set: { label: setLabel, value: setValue } })
        }
        continue
      }
      if (opName === 'remove') {
        const match = op.match as Record<string, unknown> | undefined
        const matchId = match && typeof match.id === 'string' ? match.id.trim() : ''
        const matchLabel = match && typeof match.label === 'string' ? match.label.trim() : ''
        if (!matchId && !matchLabel) {
          errors.push(`${family}[${i}]: which entry should I remove? Give me its label (and value, if shared).`)
          continue
        }
        ops.push({ op: 'remove', match: { id: matchId || undefined, label: matchLabel || undefined } })
        continue
      }
      errors.push(`${family}[${i}]: unknown operation "${opName}". Supported: add, update, remove.`)
    }
    return ops.length > 0 ? ops : undefined
  }

  const header = cleanFamily('header')
  const additionalFields = cleanFamily('additionalFields')
  if (header === undefined && additionalFields === undefined) {
    return { errors: ['The document fields change must name at least one operation to apply.'] }
  }
  return { data: { ...(header ? { header } : {}), ...(additionalFields ? { additionalFields } : {}) }, errors }
}

/** Group ops must carry usable identifiers and enum dispositions; counts bounded. */
export function validateBoluGroupOps(raw: unknown): { data?: BoluGroupOp[]; errors: string[] } {
  const errors: string[] = []
  if (!Array.isArray(raw)) {
    return { errors: ['The groups change must be a list of operations.'] }
  }
  if (raw.length > 15) {
    return { errors: ['The groups change must not exceed 15 operations.'] }
  }

  const data: BoluGroupOp[] = []
  for (let i = 0; i < raw.length; i++) {
    const op = raw[i] as Record<string, unknown>
    if (!op || typeof op !== 'object' || Array.isArray(op)) {
      errors.push(`Group operation ${i + 1} is invalid.`)
      continue
    }
    const cleanName = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
    const opName = typeof op.op === 'string' ? op.op : ''

    if (opName === 'create-group') {
      const name = cleanName(op.name)
      if (!name || name.length > 60) {
        errors.push(`Group operation ${i + 1}: give the group a name of 60 characters or fewer.`)
        continue
      }
      data.push({ op: 'create-group', name, showSubtotal: op.showSubtotal === true })
      continue
    }
    if (opName === 'rename-group') {
      const group = cleanName(op.group)
      if (!group) {
        errors.push(`Group operation ${i + 1}: which group should I rename?`)
        continue
      }
      const set = op.set as Record<string, unknown> | undefined
      const name = set && set.name !== undefined ? cleanName(set.name) : undefined
      const showSubtotal = set && typeof set.showSubtotal === 'boolean' ? set.showSubtotal : undefined
      if (name === undefined && showSubtotal === undefined) {
        errors.push(`Group operation ${i + 1}: rename-group needs "set" with a new name and/or showSubtotal.`)
        continue
      }
      if (name !== undefined && !name) {
        errors.push(`Group operation ${i + 1}: the new group name cannot be blank.`)
        continue
      }
      data.push({ op: 'rename-group', group, set: { ...(name !== undefined ? { name } : {}), ...(showSubtotal !== undefined ? { showSubtotal } : {}) } })
      continue
    }
    if (opName === 'add-items') {
      const group = op.group === null ? null : cleanName(op.group)
      if (op.group !== null && !group) {
        errors.push(`Group operation ${i + 1}: which group should those items go into?`)
        continue
      }
      if (!Array.isArray(op.items) || op.items.length === 0 || op.items.length > 30) {
        errors.push(`Group operation ${i + 1}: list 1 to 30 item descriptions to assign.`)
        continue
      }
      const items: string[] = []
      for (const item of op.items) {
        const description = cleanName(item)
        if (description) items.push(description)
      }
      if (items.length === 0) {
        errors.push(`Group operation ${i + 1}: the item list must carry non-empty descriptions.`)
        continue
      }
      data.push({ op: 'add-items', group, items })
      continue
    }
    if (opName === 'set-subtotal') {
      const group = cleanName(op.group)
      if (!group || typeof op.showSubtotal !== 'boolean') {
        errors.push(`Group operation ${i + 1}: set-subtotal needs the group name and a true/false showSubtotal.`)
        continue
      }
      data.push({ op: 'set-subtotal', group, showSubtotal: op.showSubtotal })
      continue
    }
    if (opName === 'remove-group') {
      const group = cleanName(op.group)
      const disposition = op.disposition === 'ungroup-items' || op.disposition === 'delete-items' ? op.disposition : null
      if (!group || !disposition) {
        errors.push(`Group operation ${i + 1}: remove-group needs the group name and a disposition ("ungroup-items" or "delete-items").`)
        continue
      }
      data.push({ op: 'remove-group', group, disposition })
      continue
    }
    if (opName === 'reorder-groups') {
      if (!Array.isArray(op.order) || op.order.length === 0 || op.order.length > 12) {
        errors.push(`Group operation ${i + 1}: reorder-groups needs 1 to 12 group names, each exactly once.`)
        continue
      }
      const order = op.order.map((name) => cleanName(name)).filter((name) => name.length > 0)
      if (order.length !== op.order.length) {
        errors.push(`Group operation ${i + 1}: reorder-groups order must carry non-empty group names.`)
        continue
      }
      data.push({ op: 'reorder-groups', order })
      continue
    }
    errors.push(`Group operation ${i + 1}: unknown operation "${opName}".`)
  }

  if (errors.length > 0) return { errors }
  if (data.length === 0) return { errors: ['The groups change must name at least one operation.'] }
  return { data, errors: [] }
}

/** Presentation controls — shape and type validation per family. */
export function validateBoluPresentationChange(raw: unknown): { data?: BoluPresentationChange; errors: string[] } {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { errors: ['The presentation change must be an object.'] }
  }
  const payload = raw as Record<string, unknown>
  const ALLOWED = new Set(['pdfOutput', 'notesTitle', 'termsTitle', 'chargeLabels', 'mergeQtyUnit', 'showItemImages', 'columns', 'signatory'])
  for (const key of Object.keys(payload)) {
    if (!ALLOWED.has(key)) {
      errors.push(`"${key}" is not a presentation setting I can change.`)
    }
  }

  const data: BoluPresentationChange = {}

  if (payload.pdfOutput !== undefined) {
    if (!payload.pdfOutput || typeof payload.pdfOutput !== 'object' || Array.isArray(payload.pdfOutput)) {
      errors.push('The PDF settings must be given as a set of on/off values.')
    } else {
      const rawOut = payload.pdfOutput as Record<string, unknown>
      const allowedBooleans = ['showBankDetails', 'showFooter', 'showTagline', 'showBalanceDue', 'showAmountInWords', 'compact', 'landscapeLayout'] as const
      const ALLOWED_PDF = new Set([...allowedBooleans, 'bankAccountId'])
      for (const key of Object.keys(rawOut)) {
        if (!ALLOWED_PDF.has(key)) errors.push(`"${key}" is not a PDF setting I can change.`)
      }
      const pdfOut: BoluPdfOutputPatch = {}
      for (const key of allowedBooleans) {
        const value = rawOut[key]
        if (value !== undefined) {
          if (typeof value !== 'boolean') {
            errors.push(`${key} must be true or false.`)
          } else {
            (pdfOut as Record<string, unknown>)[key] = value
          }
        }
      }
      if (rawOut.bankAccountId !== undefined) {
        if (rawOut.bankAccountId === null) {
          pdfOut.bankAccountId = null
        } else if (typeof rawOut.bankAccountId === 'string') {
          const trimmed = rawOut.bankAccountId.trim()
          if (!UUID_PATTERN.test(trimmed)) {
            errors.push('The bank account must be a valid reference or null for the business default.')
          } else {
            pdfOut.bankAccountId = trimmed
          }
        } else {
          errors.push('The bank account must be a valid reference or null for the business default.')
        }
      }
      data.pdfOutput = pdfOut
    }
  }

  if (payload.notesTitle !== undefined) {
    if (payload.notesTitle === null) {
      data.notesTitle = null // explicit reset → default heading
    } else if (typeof payload.notesTitle !== 'string') {
      errors.push('The Notes heading must be text (or null to restore the default).')
    } else {
      const trimmed = payload.notesTitle.trim()
      if (!trimmed) {
        data.notesTitle = null // explicit reset → default heading
      } else if (trimmed.length > 80) {
        errors.push('The Notes heading must be 80 characters or fewer.')
      } else {
        data.notesTitle = trimmed
      }
    }
  }
  if (payload.termsTitle !== undefined) {
    if (payload.termsTitle === null) {
      data.termsTitle = null
    } else if (typeof payload.termsTitle !== 'string') {
      errors.push('The Terms heading must be text (or null to restore the default).')
    } else {
      const trimmed = payload.termsTitle.trim()
      if (!trimmed) {
        data.termsTitle = null
      } else if (trimmed.length > 80) {
        errors.push('The Terms heading must be 80 characters or fewer.')
      } else {
        data.termsTitle = trimmed
      }
    }
  }

  if (payload.chargeLabels !== undefined) {
    if (!payload.chargeLabels || typeof payload.chargeLabels !== 'object' || Array.isArray(payload.chargeLabels)) {
      errors.push('The charge labels must be given as workmanship/transportation/shipping labels.')
    } else {
      const rawLabels = payload.chargeLabels as Record<string, unknown>
      const KEYS = ['workmanship', 'transportation', 'shipping'] as const
      for (const key of Object.keys(rawLabels)) {
        if (!(KEYS as readonly string[]).includes(key)) {
          errors.push(`"${key}" is not a charge label I can change (workmanship, transportation, shipping).`)
        }
      }
      const labels: BoluChargeLabelsPatch = {}
      for (const key of KEYS) {
        const value = rawLabels[key]
        if (value === undefined) continue
        if (value === null) {
          labels[key] = null
          continue
        }
        if (typeof value !== 'string' || !value.trim()) {
          errors.push(`The ${key} label must be text, or null to restore the default.`)
          continue
        }
        if (value.trim().length > 60) {
          errors.push(`The ${key} label must be 60 characters or fewer.`)
          continue
        }
        labels[key] = value.trim()
      }
      data.chargeLabels = labels
    }
  }

  if (payload.mergeQtyUnit !== undefined) {
    if (typeof payload.mergeQtyUnit !== 'boolean') errors.push('mergeQtyUnit must be true or false.')
    else data.mergeQtyUnit = payload.mergeQtyUnit
  }
  if (payload.showItemImages !== undefined) {
    if (typeof payload.showItemImages !== 'boolean') errors.push('showItemImages must be true or false.')
    else data.showItemImages = payload.showItemImages
  }

  const BUILTIN_KEYS = new Set(DEFAULT_COLUMN_ORDER as readonly string[])
  const HIDDEN_PROHIBITED = new Set(['description', 'quantity', 'unit_price'])

  if (payload.columns !== undefined) {
    if (!payload.columns || typeof payload.columns !== 'object' || Array.isArray(payload.columns)) {
      errors.push('The columns change must be given as setMode/setLabel/order/resetToDefaults.')
    } else {
      const rawCols = payload.columns as Record<string, unknown>
      const ALLOWED_COLS = new Set(['setMode', 'setLabel', 'order', 'resetToDefaults'])
      for (const key of Object.keys(rawCols)) {
        if (!ALLOWED_COLS.has(key)) errors.push(`"${key}" is not a columns operation (setMode, setLabel, order, resetToDefaults).`)
      }
      if (rawCols.resetToDefaults === true && Object.keys(rawCols).length > 1) {
        errors.push('resetToDefaults cannot be combined with other column operations; ask for it alone.')
      }
      if (rawCols.resetToDefaults !== undefined && typeof rawCols.resetToDefaults !== 'boolean') {
        errors.push('resetToDefaults must be true or false.')
      }
      const cols: BoluColumnsPatch = {}
      if (typeof rawCols.resetToDefaults === 'boolean' && rawCols.resetToDefaults) cols.resetToDefaults = true

      if (rawCols.setMode !== undefined) {
        if (!Array.isArray(rawCols.setMode)) {
          errors.push('The column visibility changes must be a list.')
        } else {
          cols.setMode = []
          for (let i = 0; i < rawCols.setMode.length; i++) {
            const op = rawCols.setMode[i] as Record<string, unknown>
            if (!op || typeof op !== 'object' || Array.isArray(op)) {
              errors.push(`setMode[${i}] is invalid.`)
              continue
            }
            const key = typeof op.key === 'string' ? op.key.trim() : ''
            const mode = op.mode
            if (!BUILTIN_KEYS.has(key)) {
              errors.push(`setMode[${i}]: unknown column "${key}".`)
              continue
            }
            if (mode !== 'show' && mode !== 'hide_display' && mode !== 'hide_full') {
              errors.push(`setMode[${i}]: mode must be show, hide_display or hide_full.`)
              continue
            }
            if (HIDDEN_PROHIBITED.has(key) && mode !== 'show') {
              errors.push(`setMode[${i}]: the ${key} column cannot be hidden.`)
              continue
            }
            cols.setMode.push({ key, mode })
          }
        }
      }

      if (rawCols.setLabel !== undefined) {
        if (!Array.isArray(rawCols.setLabel)) {
          errors.push('The column label changes must be a list.')
        } else {
          cols.setLabel = []
          for (let i = 0; i < rawCols.setLabel.length; i++) {
            const op = rawCols.setLabel[i] as Record<string, unknown>
            if (!op || typeof op !== 'object' || Array.isArray(op)) {
              errors.push(`setLabel[${i}] is invalid.`)
              continue
            }
            const key = typeof op.key === 'string' ? op.key.trim() : ''
            const label = typeof op.label === 'string' ? op.label.trim() : ''
            if (!BUILTIN_KEYS.has(key)) {
              errors.push(`setLabel[${i}]: unknown column "${key}".`)
              continue
            }
            if (!label || label.length > 40) {
              errors.push(`setLabel[${i}]: the label must be 1 to 40 characters.`)
              continue
            }
            cols.setLabel.push({ key, label })
          }
        }
      }

      if (rawCols.order !== undefined) {
        if (!Array.isArray(rawCols.order)) {
          errors.push('The column order must be a list of column keys.')
        } else {
          const order: string[] = []
          const seen = new Set<string>()
          for (let i = 0; i < rawCols.order.length; i++) {
            const key = typeof rawCols.order[i] === 'string' ? rawCols.order[i].trim() : ''
            if (!BUILTIN_KEYS.has(key)) {
              errors.push(`order[${i}]: unknown column "${String(rawCols.order[i])}".`)
              continue
            }
            if (seen.has(key)) {
              errors.push(`order[${i}]: the same column appears twice.`)
              continue
            }
            seen.add(key)
            order.push(key)
          }
          cols.order = order
        }
      }

      if (Object.keys(cols).length === 0) {
        errors.push('The columns change must name at least one operation.')
      } else {
        data.columns = cols
      }
    }
  }

  if (payload.signatory !== undefined) {
    if (payload.signatory === null) {
      data.signatory = null
    } else if (typeof payload.signatory === 'string' && payload.signatory.trim()) {
      data.signatory = payload.signatory.trim()
    } else {
      errors.push('The signatory must be a signatory name or id, or null to remove.')
    }
  }

  if (errors.length > 0) return { errors }
  if (Object.keys(data).length === 0) return { errors: ['The presentation change must name at least one setting to change.'] }
  return { data, errors: [] }
}

/**
 * Validates and normalizes custom named extra charges.
 * Canonical shape: { name, amount, withTax }. The internal
 * { label, value, vatApplicable } shape is accepted as an alias.
 */
export function validateBoluExtraCharges(raw: unknown): {
  valid: boolean
  errors: string[]
  data: BoluExtraCharge[]
} {
  const errors: string[] = []
  if (!Array.isArray(raw)) {
    return { valid: false, errors: ['The named extra charges must be a list.'], data: [] }
  }
  if (raw.length > 20) {
    return { valid: false, errors: ['The named extra charges must not exceed 20 entries.'], data: [] }
  }

  const data: BoluExtraCharge[] = []
  for (let i = 0; i < raw.length; i++) {
    const charge = raw[i] as Record<string, unknown>
    if (!charge || typeof charge !== 'object' || Array.isArray(charge)) {
      errors.push(`Named extra charge ${i + 1} is invalid.`)
      continue
    }
    const label = typeof charge.name === 'string' ? charge.name.trim()
      : typeof charge.label === 'string' ? charge.label.trim()
        : ''
    if (!label) {
      errors.push(`Named extra charge ${i + 1} must have a non-empty name.`)
    }

    // Strict numeric handling: booleans, objects, blanks and NaN never become amounts.
    const rawAmount = charge.amount !== undefined ? charge.amount : charge.value
    let value: number | null = null
    if (typeof rawAmount === 'number' && Number.isFinite(rawAmount)) {
      value = rawAmount
    } else if (typeof rawAmount === 'string') {
      const trimmed = rawAmount.trim()
      if (trimmed !== '' && Number.isFinite(Number(trimmed))) {
        value = Number(trimmed)
      }
    }
    if (value === null || value < 0) {
      errors.push(`Named extra charge ${i + 1} must have a finite non-negative amount.`)
    }

    const vatApplicable = charge.withTax !== undefined ? charge.withTax === true : charge.vatApplicable === true

    if (label && value !== null && value >= 0) {
      data.push({ label, value, vatApplicable })
    }
  }

  return { valid: errors.length === 0, errors, data }
}

/**
 * Validates invoice creation input.
 */
export function validateInvoiceCreateInput(raw: unknown): {
  valid: boolean
  errors: string[]
  data?: BoluInvoiceCreatePayload
} {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Payload must be an object.'] }
  }

  const payload = raw as Record<string, unknown>
  const clientName = typeof payload.client_name === 'string' ? payload.client_name.trim() : ''
  if (!clientName || clientName.length < 2) {
    errors.push('Customer name is required and must be at least 2 characters.')
  }
  if (clientName.length > 120) {
    errors.push('Customer name must not exceed 120 characters.')
  }

  // Validate extra_charges if provided
  let validatedExtraCharges: BoluExtraCharge[] | undefined
  if (payload.extra_charges !== undefined || payload.extraCharges !== undefined) {
    const rawCharges = payload.extra_charges ?? payload.extraCharges
    const chargeResult = validateBoluExtraCharges(rawCharges)
    if (!chargeResult.valid) {
      errors.push(...chargeResult.errors)
    } else {
      validatedExtraCharges = chargeResult.data
    }
  }

  const itemsResult = validateInvoiceItems(payload.items)
  if (!itemsResult.valid) {
    errors.push(...itemsResult.errors)
  }

  const issueDate = typeof payload.issue_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.issue_date)
    ? payload.issue_date
    : new Date().toISOString().split('T')[0]

  const dueDate = typeof payload.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.due_date)
    ? payload.due_date
    : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: {
      client_name: clientName,
      client_id: typeof payload.client_id === 'string' ? payload.client_id : null,
      items: itemsResult.data,
      issue_date: issueDate,
      due_date: dueDate,
      notes: (asRichText(payload.notes) ?? '') as BoluInvoiceCreatePayload['notes'],
      payment_terms: typeof payload.payment_terms === 'string' ? payload.payment_terms.trim() : '',
      terms: asRichText(payload.terms),
      title: typeof payload.title === 'string' ? payload.title.trim() || null : null,
      po_number: typeof payload.po_number === 'string' ? payload.po_number.trim() || null : null,
      project_id: typeof payload.project_id === 'string' ? payload.project_id.trim() || null : null,
      work_duration: typeof payload.work_duration === 'string' ? payload.work_duration.trim() || null : null,
      workmanship: typeof payload.workmanship === 'number' && Number.isFinite(payload.workmanship) ? payload.workmanship : undefined,
      transportation: typeof payload.transportation === 'number' && Number.isFinite(payload.transportation) ? payload.transportation : undefined,
      shipping: typeof payload.shipping === 'number' && Number.isFinite(payload.shipping) ? payload.shipping : undefined,
      discount: typeof payload.discount === 'number' && Number.isFinite(payload.discount) ? payload.discount : undefined,
      discount_type: payload.discount_type === 'fixed' || payload.discount_type === 'percent' ? payload.discount_type : undefined,
      discount_timing: payload.discount_timing === 'before_tax' || payload.discount_timing === 'after_tax' ? payload.discount_timing : undefined,
      wht: typeof payload.wht === 'number' && Number.isFinite(payload.wht) ? payload.wht : undefined,
      wht_type: payload.wht_type === 'fixed' || payload.wht_type === 'percent' ? payload.wht_type : undefined,
      global_vat_percent: typeof payload.global_vat_percent === 'number' && Number.isFinite(payload.global_vat_percent) ? payload.global_vat_percent : undefined,
      extra_charges: validatedExtraCharges,
    },
  }
}

function validateModifyFieldString(raw: unknown): { value: string | null; ok: boolean } {
  if (raw === undefined || raw === null) return { value: null, ok: true }
  if (typeof raw !== 'string') return { value: null, ok: false }
  const trimmed = raw.trim()
  return { value: trimmed.length > 0 ? trimmed : null, ok: true }
}

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

/**
 * Validates a Bolu modification request.
 *
 * Every scalar field maps one-to-one onto a persisted column or custom_fields
 * key; the plain-text and rich-text contracts are both honoured; commercial
 * charges, named extra charges and calculation inputs are supported. Old
 * values are not trusted from the model here — the Gate 1 builder replaces
 * them with the persisted snapshot before the proposal is shown.
 */
export function validateInvoiceModifyInput(raw: unknown, options?: { documentFamily?: BoluDocumentFamily }): {
  valid: boolean
  errors: string[]
  data?: BoluInvoiceModifyPayload
} {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Payload must be an object.'] }
  }

  const payload = raw as Record<string, unknown>
  const documentId = typeof payload.documentId === 'string' ? payload.documentId.trim() : ''
  if (!documentId || !UUID_PATTERN.test(documentId)) {
    errors.push('A valid document reference is required.')
  }

  const family =
    payload.documentFamily === 'quotation' || payload.documentFamily === 'invoice'
      ? payload.documentFamily
      : options?.documentFamily

  const documentFamily = family ?? 'invoice'

  const ALLOWED_FIELDS: readonly BoluModifyFieldKey[] = [
    'client_name',
    'notes',
    'payment_terms',
    'due_date',
    'issue_date',
    'terms',
    'po_number',
    'title',
    'project_id',
    'work_duration',
    'workmanship',
    'transportation',
    'shipping',
  ]
  const field =
    typeof payload.field === 'string' && (ALLOWED_FIELDS as readonly string[]).includes(payload.field)
      ? (payload.field as BoluModifyFieldKey)
      : undefined
  if (typeof payload.field === 'string' && !field) {
    // Do not echo the envelope key back to the user; it is model vocabulary.
    errors.push('That is not a supported change for this document.')
  }

  const hasRichTextField = field === 'notes' || field === 'terms'

  if (field === 'work_duration' && documentFamily === 'quotation') {
    errors.push('work_duration applies to invoices only; quotations do not carry a work duration.')
  }

  // A modification to an existing document must state the value explicitly.
  // Omitted is rejected; explicit null clears an optional field. (F-01)
  if (field && payload.newValue === undefined) {
    errors.push(`Provide a value for "${field}" — the change is incomplete without one. Use null to clear it.`)
  }

  let newValue: BoluInvoiceModifyPayload['newValue']
  if (field === 'workmanship' || field === 'transportation' || field === 'shipping') {
    const rawValue = payload.newValue
    // Strict numerics only: finite number or a non-empty numeric string >= 0.
    // Booleans, arrays, objects and blank strings are refused. (F-02)
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      if (rawValue < 0) {
        errors.push(`${field} must be a finite non-negative number.`)
      } else {
        newValue = rawValue
      }
    } else if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim()
      if (trimmed === '') {
        errors.push(`${field} must be a finite non-negative number; the blank string is not accepted.`)
      } else {
        const parsed = Number(trimmed)
        if (!Number.isFinite(parsed) || parsed < 0) {
          errors.push(`${field} must be a finite non-negative number.`)
        } else {
          newValue = parsed
        }
      }
    } else {
      errors.push(`${field} must be a finite non-negative number.`)
    }
  } else if (field === 'project_id') {
    const candidate = payload.newValue
    if (candidate === null || candidate === '') {
      newValue = null // explicit clear
    } else if (candidate === undefined) {
      // caught by the uniform missing-value check above
      newValue = undefined
    } else if (typeof candidate === 'string' && UUID_PATTERN.test(candidate.trim())) {
      newValue = candidate.trim()
    } else {
      errors.push('project_id must be a valid project UUID or null to clear the project.')
    }
  } else if (field && hasRichTextField) {
    const candidate = payload.newValue
    if (candidate === null) {
      newValue = null // explicit clear
    } else {
      const parsed = asRichText(candidate)
      if (parsed !== null) {
        newValue = parsed
      } else {
        errors.push(`${field} must be plain text or structured rich-text content.`)
      }
    }
  } else if (field === 'issue_date') {
    // The issue date anchors reporting; the domain does not permit clearing it.
    const str = validateModifyFieldString(payload.newValue)
    if (payload.newValue === undefined) {
      newValue = undefined // uniform missing-value error already recorded above
    } else if (!str.ok) {
      errors.push('Issue date must be a date string.')
    } else if (!str.value) {
      errors.push('The issue date is required. Set a new date instead of clearing it.')
    } else {
      newValue = str.value
    }
  } else if (field === 'client_name') {
    if (payload.newValue === undefined) {
      newValue = undefined // uniform missing-value error already recorded above
    } else {
    // The customer name is required to identify the document; renaming is
    // supported, clearing it is not (the document form requires it too).
    const str = validateModifyFieldString(payload.newValue)
    if (!str.ok) {
      errors.push('client_name must be a string.')
    } else if (!str.value) {
      errors.push('client_name cannot be cleared. Provide the corrected customer name.')
    } else {
      newValue = str.value
    }
    }
  } else if (field) {
    const str = validateModifyFieldString(payload.newValue)
    newValue = str.ok ? (str.value ?? null) : undefined
    if (!str.ok) {
      errors.push(`${field} must be a string.`)
    }
  }

  // Items still validate exactly as before
  let validatedItems: BoluInvoiceItemInput[] | undefined
  if (payload.items !== undefined) {
    const itemsResult = validateInvoiceItems(payload.items)
    if (!itemsResult.valid) {
      errors.push(...itemsResult.errors)
    } else {
      validatedItems = itemsResult.data
    }
  }

  // Custom document fields change — structural validation only; the snapshot
  // is required at the builder to resolve entries by id/label.
  let validatedCustomFieldsChange: BoluCustomFieldsChange | undefined
  const rawCustomFields = payload.custom_fields ?? payload.customFieldsChange
  if (rawCustomFields !== undefined) {
    const validated = validateBoluCustomFieldsChange(rawCustomFields)
    if (validated.errors.length > 0) {
      errors.push(...validated.errors)
    } else {
      validatedCustomFieldsChange = validated.data
    }
  }

  // Group operations — structural validation only; semantic resolution
  // happens against the persisted snapshot at the builder/executor.
  let validatedGroupsChange: BoluGroupOp[] | undefined
  const rawGroups = payload.groups ?? payload.groupsChange
  if (rawGroups !== undefined) {
    const validated = validateBoluGroupOps(rawGroups)
    if (validated.errors.length > 0) {
      errors.push(...validated.errors)
    } else {
      validatedGroupsChange = validated.data
    }
  }

  // Presentation controls — PDF output, headings, labels, columns, signatory.
  let validatedPresentationChange: BoluPresentationChange | undefined
  const rawPresentation = payload.presentationChange ?? payload.presentation
  if (rawPresentation !== undefined) {
    const validated = validateBoluPresentationChange(rawPresentation)
    if (validated.errors.length > 0) {
      errors.push(...validated.errors)
    } else {
      validatedPresentationChange = validated.data
    }
  }

  // One item-set concern per proposal: items cannot be combined with groups.
  if (validatedItems && validatedGroupsChange) {
    errors.push('Change items and groups in one request only within the same scope — I cannot apply both at once.')
  }

  // Desired extra-charges list (full set after the edit) — optional
  let validatedExtraChargesChange: BoluExtraChargeInput[] | undefined
  const rawCharges = payload.extra_charges ?? payload.extraCharges ?? payload.extraChargesChange
  if (rawCharges !== undefined) {
    const chargeResult = validateBoluExtraCharges(rawCharges)
    if (!chargeResult.valid) {
      errors.push(...chargeResult.errors)
    } else {
      // Desired set must have unique labels — the modification path updates by label.
      const seen = new Set<string>()
      for (const charge of chargeResult.data) {
        const key = charge.label.toLowerCase()
        if (seen.has(key)) {
          errors.push(`Duplicate extra charge label "${charge.label}" — labels must be unique in the resulting list.`)
        }
        seen.add(key)
      }
      if (errors.length === 0 || seen.size === chargeResult.data.length) {
        validatedExtraChargesChange = chargeResult.data.map((charge) => ({
          label: charge.label,
          value: charge.value,
          withTax: charge.vatApplicable,
        }))
      }
    }
  }

  // Calculation input patch — optional
  let validatedCalculationInputsChange: BoluCalculationInputValues | undefined
  const rawInputs = payload.calculation_inputs ?? payload.calculationInputs ?? payload.calculationInputsChange
  if (rawInputs !== undefined) {
    if (!rawInputs || typeof rawInputs !== 'object' || Array.isArray(rawInputs)) {
      errors.push('The calculation settings must be given as a set of specific changes (for example, a VAT rate or a discount).')
    } else {
      const input = rawInputs as Record<string, unknown>
      const patch: BoluCalculationInputValues = {}
      const allowed = ['vatPercent', 'discountValue', 'discountType', 'discountTiming', 'whtValue', 'whtType'] as const
      for (const key of Object.keys(input)) {
        if (!(allowed as readonly string[]).includes(key)) {
          errors.push('That calculation setting is not supported. Supported settings: VAT rate, discount, discount type, discount timing, WHT and WHT type.')
        }
      }
      const numOrNull = (v: unknown): number | 'invalid' | undefined => {
        if (v === undefined) return undefined
        if (typeof v !== 'number' || !Number.isFinite(v)) return 'invalid'
        return v
      }
      const vatPercent = numOrNull(input.vatPercent)
      if (vatPercent !== undefined) {
        if (vatPercent === 'invalid' || vatPercent < 0 || vatPercent > 100) {
          errors.push('VAT rate must be a number between 0 and 100.')
        } else {
          patch.vatPercent = vatPercent
        }
      }
      const discountValue = numOrNull(input.discountValue)
      if (discountValue !== undefined) {
        if (discountValue === 'invalid' || discountValue < 0) {
          errors.push('Discount must be a finite non-negative number.')
        } else {
          patch.discountValue = discountValue
        }
      }
      const discountType = input.discountType
      if (discountType !== undefined) {
        if (discountType === 'fixed' || discountType === 'percent') {
          patch.discountType = discountType
        } else {
          errors.push('Discount type must be a fixed amount or a percentage.')
        }
      }
      const discountTiming = input.discountTiming
      if (discountTiming !== undefined) {
        if (discountTiming === 'before_tax' || discountTiming === 'after_tax') {
          patch.discountTiming = discountTiming
        } else {
          errors.push('Discount timing must be before tax or after tax.')
        }
      }
      const whtValue = numOrNull(input.whtValue)
      if (whtValue !== undefined) {
        if (whtValue === 'invalid' || whtValue < 0) {
          errors.push('WHT must be a finite non-negative number.')
        } else {
          patch.whtValue = whtValue
        }
      }
      const whtType = input.whtType
      if (whtType !== undefined) {
        if (whtType === 'fixed' || whtType === 'percent') {
          patch.whtType = whtType
        } else {
          errors.push('WHT type must be a fixed amount or a percentage.')
        }
      }
      // Percentage-bounded combos — percent discounts/WHT must stay in range
      const effectiveDiscountType = patch.discountType
      if (effectiveDiscountType === 'percent' && patch.discountValue !== undefined && patch.discountValue > 100) {
        errors.push('Discount must be between 0 and 100 for a percentage discount.')
      }
      if (patch.whtType === 'percent' && patch.whtValue !== undefined && patch.whtValue > 100) {
        errors.push('WHT must be between 0 and 100 for a percentage deduction.')
      }
      if (Object.keys(patch).length === 0) {
        errors.push('Provide at least one calculation setting to change.')
      } else {
        validatedCalculationInputsChange = patch
      }
    }
  }

  if (!field && !validatedItems && !validatedExtraChargesChange && !validatedCalculationInputsChange
    && !validatedCustomFieldsChange && !validatedGroupsChange && !validatedPresentationChange) {
    errors.push('Modification must specify a field, items, extra charges, calculation inputs, document fields, groups, or presentation settings.')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: {
      documentId,
      documentFamily,
      field,
      oldValue: payload.oldValue as string | number | null | undefined,
      newValue,
      items: validatedItems,
      oldItems: Array.isArray(payload.oldItems) ? (payload.oldItems as BoluInvoiceItemInput[]) : undefined,
      extraChargesChange: validatedExtraChargesChange,
      calculationInputsChange: validatedCalculationInputsChange,
      customFieldsChange: validatedCustomFieldsChange,
      groupsChange: validatedGroupsChange,
      presentationChange: validatedPresentationChange,
    },
  }
}

/**
 * Authoritative financial math calculation using the application core engine.
 * Never allows the model to compute totals.
 */
export function computeAuthoritativeTotals(
  items: BoluInvoiceItemInput[],
  options?: {
    globalVatPercent?: number
    discountType?: 'fixed' | 'percent'
    discountTiming?: 'before_tax' | 'after_tax'
    discountValue?: number
    whtType?: 'fixed' | 'percent'
    whtValue?: number
    extraCharges?: BoluExtraCharge[]
    fixedCharges?: { workmanship?: number; transportation?: number; shipping?: number }
    visibleRowEffects?: { install: boolean; vat: boolean; discount: boolean }
  },
): DocumentResult {
  const globalVatPercent = options?.globalVatPercent ?? 7.5
  // Fixed commercial charges are non-taxable additions in the authoritative
  // calculation engine; keep them distinct from custom named extra charges.
  const fixedCharges = options?.fixedCharges ?? {}
  const fixedExtraCharges: BoluExtraCharge[] = [
    fixedCharges.workmanship ? { label: 'Workmanship', value: fixedCharges.workmanship, vatApplicable: false } : null,
    fixedCharges.transportation ? { label: 'Transportation', value: fixedCharges.transportation, vatApplicable: false } : null,
    fixedCharges.shipping ? { label: 'Shipping', value: fixedCharges.shipping, vatApplicable: false } : null,
  ].filter((charge): charge is BoluExtraCharge => charge !== null)
  const extraCharges = [...fixedExtraCharges, ...(options?.extraCharges ?? [])]

  return calculateDocument({
    items: items.map((item) => ({
      id: item.item_id ?? undefined,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      row_type: item.row_type ?? 'standard',
      group_id: item.group_id ?? null,
      group_name: item.group_name ?? null,
      install_rate: item.install_rate ?? null,
      install_rate_taxable: item.install_rate_taxable ?? false,
      vat_rate: item.vat_rate ?? null,
      discount_rate: item.discount_rate ?? null,
    })),
    globalVatPercent,
    discountType: options?.discountType ?? 'percent',
    discountTiming: options?.discountTiming ?? 'before_tax',
    discountValue: options?.discountValue ?? 0,
    whtType: options?.whtType ?? 'percent',
    whtValue: options?.whtValue ?? 0,
    extraCharges,
    visibleRowEffects: options?.visibleRowEffects ?? { install: false, vat: true, discount: false },
  })
}

/**
 * Creates an authoritative document creation proposal with precomputed
 * financial math. `documentFamily` selects the invoice or quotation family.
 */
export function buildInvoiceCreateProposal(
  payload: BoluInvoiceCreatePayload,
  candidateNumber = 'INV-DRAFT',
  documentFamily: BoluDocumentFamily = 'invoice',
  resolution?: BoluClientResolution,
): BoluDocumentCreateProposal {
  const totals = computeAuthoritativeTotals(payload.items, {
    globalVatPercent: payload.global_vat_percent ?? 7.5,
    discountType: payload.discount_type ?? 'percent',
    discountTiming: payload.discount_timing ?? 'before_tax',
    discountValue: payload.discount ?? 0,
    whtType: payload.wht_type ?? 'percent',
    whtValue: payload.wht ?? 0,
    extraCharges: payload.extra_charges ?? [],
    fixedCharges: {
      workmanship: payload.workmanship,
      transportation: payload.transportation,
      shipping: payload.shipping,
    },
  })
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()

  return {
    opId: generateOperationId(),
    operationType: 'create-document',
    documentFamily,
    schemaVersion: '1.0',
    requiredPermission: { resource: documentFamily, action: 'create' },
    sideEffect: 'draft-mutation',
    gate1Required: true,
    gate2Required: true,
    status: 'pending_approval',
    createdAt: now.toISOString(),
    expiresAt,
    candidateNumber,
    payload,
    computedTotals: {
      subtotal: totals.subtotal,
      vat: totals.vat,
      total: totals.totalPayable,
      wht: totals.wht,
      discount: totals.discount,
      extraChargesTotal: totals.extraChargesTotal,
      items: totals.items,
    },
    clientResolution: resolution,
  }
}

/**
 * Creates a document creation proposal for a model-supplied family.
 */
export function buildDocumentCreateProposal(
  documentFamily: BoluDocumentFamily,
  payload: BoluInvoiceCreatePayload,
  candidateNumber = documentFamily === 'quotation' ? 'QTN-DRAFT' : 'INV-DRAFT',
  resolution?: BoluClientResolution,
): BoluDocumentCreateProposal {
  return buildInvoiceCreateProposal(payload, candidateNumber, documentFamily, resolution)
}

/** Fields a correction may replace. Anything the correction omits is kept. */
const MERGEABLE_PAYLOAD_FIELDS = [
  'client_id',
  'client_name',
  'issue_date',
  'due_date',
  'payment_terms',
  'terms',
  'notes',
  'title',
  'po_number',
  'project_id',
  'work_duration',
  'workmanship',
  'transportation',
  'shipping',
  'discount',
  'discount_type',
  'discount_timing',
  'wht',
  'wht_type',
  'global_vat_percent',
] as const

/**
 * Applies a conversational correction to an existing draft.
 *
 * A correction is the same operation, not a second one: the calling proposal's
 * `opId` and identity are retained so no duplicate invoice or quotation is
 * created. Supplied fields replace the previous value; omitted fields are
 * preserved; supplied items replace the item set. The result is always
 * `pending_approval`, because a material change invalidates the approval the
 * user gave to the earlier version.
 */
export function mergeDocumentCreateProposal(
  previous: BoluDocumentCreateProposal,
  correction: BoluInvoiceCreatePayload,
  resolution?: BoluClientResolution,
): BoluDocumentCreateProposal {
  const merged: BoluInvoiceCreatePayload = { ...previous.payload }

  const mergedRecord = merged as unknown as Record<string, unknown>
  const correctionRecord = correction as unknown as Record<string, unknown>
  for (const field of MERGEABLE_PAYLOAD_FIELDS) {
    const value = correctionRecord[field]
    if (value !== undefined && value !== null && value !== '') {
      mergedRecord[field] = value
    }
  }

  if (Array.isArray(correction.items) && correction.items.length > 0) {
    merged.items = correction.items
  }
  if (correction.extra_charges !== undefined) {
    merged.extra_charges = correction.extra_charges
  }

  const rebuilt = buildInvoiceCreateProposal(
    merged,
    previous.candidateNumber,
    previous.documentFamily,
    resolution ?? previous.clientResolution,
  )

  return {
    ...rebuilt,
    // The operation identity survives a correction.
    opId: previous.opId,
    createdAt: previous.createdAt,
    status: 'pending_approval',
    suggestions: undefined,
  }
}

/**
 * Builds a compact clarification card for an unresolved client. The proposal
 * is retained; the user answers to resolve it.
 */
export function clarificationForClientResolution(
  resolution: BoluClientResolution,
): BoluClarification | undefined {
  if (resolution.status === 'ambiguous') {
    return {
      id: `clarify-client-${Date.now()}`,
      reason: `Multiple clients match "${resolution.query}".`,
      questions: [
        {
          id: 'client',
          prompt: 'Which client is this document for?',
          options: resolution.matches.slice(0, 6).map((match) => ({
            id: `client:${match.id}`,
            label: match.name,
            description: [match.phone, match.email].filter(Boolean).join(' · ') || undefined,
          })),
          allowFreeText: true,
        },
      ],
    }
  }

  if (resolution.status === 'not_found') {
    return {
      id: `clarify-client-${Date.now()}`,
      reason: `No existing client matches "${resolution.query}".`,
      questions: [
        {
          id: 'client',
          prompt: 'Search your client directory or enter the exact client name.',
          options: [],
          allowFreeText: true,
        },
      ],
    }
  }

  return undefined
}

/** Returns a copy of the proposal with a verified client applied. */
export function withProposalClient(
  proposal: BoluDocumentCreateProposal,
  client: BoluClientMatch,
): BoluDocumentCreateProposal {
  const payload: BoluInvoiceCreatePayload = {
    ...proposal.payload,
    client_id: client.id,
    client_name: client.name,
  }
  const rebuilt = buildInvoiceCreateProposal(payload, proposal.candidateNumber, proposal.documentFamily, {
    status: 'resolved',
    client,
  })
  // Other clarification questions stay pending; only the client question is answered.
  const remainingQuestions = (proposal.clarification?.questions ?? []).filter(
    (question) => question.id !== 'client',
  )
  // Preserve the operational identity and lifecycle fields of the pending proposal.
  return {
    ...rebuilt,
    opId: proposal.opId,
    createdAt: proposal.createdAt,
    expiresAt: proposal.expiresAt,
    status: proposal.status,
    clarificationAnswers: {
      ...(proposal.clarificationAnswers ?? {}),
      ...(proposal.clarificationAnswers?.client ? {} : { client: client.name }),
    },
    clarification: remainingQuestions.length > 0 && proposal.clarification
      ? { ...proposal.clarification, questions: remainingQuestions }
      : undefined,
  }
}

/**
 * Returns a copy of the proposal with a new client-resolution outcome.
 * Used when an automatic or manual search is ambiguous, empty, or failed.
 * The collected document fields are preserved.
 */
export function withClientResolution(
  proposal: BoluDocumentCreateProposal,
  resolution: BoluClientResolution,
): BoluDocumentCreateProposal {
  return {
    ...proposal,
    clientResolution: resolution,
    clarification: clarificationForClientResolution(resolution) ?? proposal.clarification,
  }
}

/**
 * Records one clarification answer and removes that question.
 * Never changes the proposal status, so an answer cannot authorize a write.
 * Returns the proposal unchanged when the question is not part of it.
 */
export function withClarificationAnswer(
  proposal: BoluDocumentCreateProposal,
  questionId: string,
  answerLabel: string,
): BoluDocumentCreateProposal {
  const clarification = proposal.clarification
  if (!clarification?.questions.some((question) => question.id === questionId)) {
    return proposal
  }
  const remaining = clarification.questions.filter((question) => question.id !== questionId)
  return {
    ...proposal,
    clarificationAnswers: { ...(proposal.clarificationAnswers ?? {}), [questionId]: answerLabel },
    clarification: remaining.length > 0
      ? { ...clarification, questions: remaining }
      : undefined,
  }
}

/** Removes a resolved question from a proposal's clarification card. */
export function withoutClarification(
  proposal: BoluDocumentCreateProposal,
): BoluDocumentCreateProposal {
  return { ...proposal, clarification: undefined }
}

interface ModifySnapshotRow {
  id?: string | null
  invoice_number?: string | null
  quotation_number?: string | null
  invoice_title?: string | null
  quotation_title?: string | null
  po_number?: string | null
  project_id?: string | null
  work_duration?: string | null
  workmanship?: number | string | null
  transportation?: number | string | null
  shipping?: number | string | null
  custom_fields?: unknown
}

function modifyChargesOf(row: ModifySnapshotRow | null | undefined) {
  return {
    workmanship: Number(row?.workmanship ?? 0) || 0,
    transportation: Number(row?.transportation ?? 0) || 0,
    shipping: Number(row?.shipping ?? 0) || 0,
  }
}

/** Reads the persisted extra charges / calculation inputs without ever mutating them. */
function modifyParseCustomFieldsOf(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) }
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? { ...(parsed as Record<string, unknown>) }
        : {}
    } catch {
      return {}
    }
  }
  return {}
}

function toBoluItemsFromPersisted(items: Array<Record<string, unknown>>): BoluInvoiceItemInput[] {
  return items.map((row): BoluInvoiceItemInput => {
    const qty = Number(row.quantity ?? 1)
    const isGroupHeader = row.row_type === 'group_header'
    return {
      description: String(row.description ?? ''),
      // Group headers are not commercial items; they carry no quantity for the engine.
      quantity: isGroupHeader ? 0 : Number.isFinite(qty) ? qty : 1,
      unit_price: Number(row.unit_price ?? 0) || 0,
      unit: typeof row.unit === 'string' ? row.unit : undefined,
      row_type: isGroupHeader ? ('group_header' as unknown as 'standard') : 'standard',
      group_id: typeof row.group_id === 'string' ? row.group_id : null,
      group_name: typeof row.group_name === 'string' ? row.group_name : null,
      item_id: typeof row.item_id === 'string' ? row.item_id : null,
      install_rate: row.install_rate == null ? null : Number(row.install_rate),
      install_rate_taxable: row.install_rate_taxable === true,
      vat_rate: row.vat_rate == null ? null : Number(row.vat_rate),
      discount_rate: row.discount_rate == null ? null : Number(row.discount_rate),
      sub_description: typeof row.sub_description === 'string' ? row.sub_description : null,
      make: typeof row.make === 'string' ? row.make : null,
      part_number: null,
      condition: null,
    }
  })
}

/**
 * Creates an authoritative invoice modification proposal.
 *
 * When `current` is supplied (the persisted snapshot the caller loaded immediately
 * before proposing), every scalar baseline and every block old-value is taken from
 * that snapshot. Callers that persist a modification must always supply `current` —
 * the model's claimed old values are never trusted over the persisted state.
 */
export function buildInvoiceModifyProposal(params: {
  targetDocumentId: string
  targetDocumentNumber: string
  documentFamily?: BoluDocumentFamily
  field?: BoluModifyFieldKey
  oldValue?: string | number | null
  newValue?: string | number | CommercialRichTextBlock[] | null
  itemsChange?: {
    oldItems: BoluInvoiceItemInput[]
    newItems: BoluInvoiceItemInput[]
  }
  extraChargesChange?: BoluExtraChargeInput[]
  calculationInputsChange?: Partial<BoluCalculationInputValues>
  customFieldsChange?: BoluCustomFieldsChange
  groupsChange?: BoluGroupOp[]
  presentationChange?: BoluPresentationChange
  resolvedSignatory?: { id: string; name: string; role: string } | null
  resolvedBankAccount?: { id: string; label: string } | null
  current?: BoluModifyCurrentSnapshot
}): BoluInvoiceModifyProposal {
  const documentFamily = params.documentFamily ?? 'invoice'
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()
  const current = params.current

  // 1. Persisted baselines for the requested changes.
  const row = (current?.document ?? null) as ModifySnapshotRow | null
  const persistedCf = row ? modifyParseCustomFieldsOf(row.custom_fields) : {}
  const persistedExtraCharges: BoluExtraChargeInput[] = Array.isArray(persistedCf.extraCharges)
    ? persistedCf.extraCharges.map((charge: any) => ({
        label: String(charge?.label ?? '').trim(),
        value: Number(charge?.value ?? 0) || 0,
        withTax: charge?.withTax === true || charge?.vatApplicable === true,
      })).filter((charge: BoluExtraChargeInput) => charge.label.length > 0)
    : []
  const persistedInputs = (persistedCf.calculationInputs ?? {}) as Partial<BoluCalculationInputValues>

  let resolvedField = params.field
  let resolvedOldValue = params.oldValue
  let resolvedNewValue = params.newValue
  const persistedItems = current?.items ?? []
  const persistedItemsBolu = toBoluItemsFromPersisted(persistedItems)
  const currentCharges = modifyChargesOf(row)

  if (current && params.field) {
    // Scalar-field baseline always comes from the snapshot. Keys that differ
    // between the two families (quotation payment_terms in custom_fields,
    // quotation validity stored as valid_until) are resolved explicitly.
    const rowObj = (row ?? null) as Record<string, unknown> | null
    switch (params.field) {
      case 'workmanship':
      case 'transportation':
      case 'shipping':
        resolvedOldValue = Number(rowObj?.[params.field] ?? 0) || 0
        break
      case 'po_number':
        resolvedOldValue = (row?.po_number as string | null) ?? null
        break
      case 'title':
        resolvedOldValue = (documentFamily === 'quotation'
          ? (row?.quotation_title as string | null)
          : (row?.invoice_title as string | null)) ?? null
        break
      case 'project_id':
        resolvedOldValue = (row?.project_id as string | null) ?? null
        break
      case 'work_duration':
        resolvedOldValue = (row?.work_duration as string | null) ?? null
        break
      case 'payment_terms':
        resolvedOldValue = documentFamily === 'quotation'
          ? ((persistedCf.payment_terms as string | null) ?? null)
          : ((rowObj?.payment_terms as string | null) ?? null)
        break
      case 'due_date':
        resolvedOldValue = documentFamily === 'quotation'
          ? ((rowObj?.valid_until as string | null) ?? null)
          : ((rowObj?.due_date as string | null) ?? null)
        break
      case 'issue_date':
        resolvedOldValue = (rowObj?.issue_date as string | null) ?? null
        break
      case 'client_name':
        resolvedOldValue = (rowObj?.client_name as string | null) ?? null
        break
      case 'notes':
      case 'terms':
        resolvedOldValue = (rowObj?.[params.field] as string | null) ?? null
        break
    }
  }

  const extraChargesChange = params.extraChargesChange !== undefined
    ? {
        oldExtraCharges: persistedExtraCharges,
        newExtraCharges: params.extraChargesChange,
      }
    : undefined

  const persistedGroupMeta = (persistedCf.groupMeta as Record<string, { name?: string; showSubtotal?: boolean }> | undefined)
    ?? {}
  const persistedHeader = (Array.isArray(persistedCf.header) ? persistedCf.header : []) as Record<string, unknown>[]
  const persistedAdditional = (Array.isArray(persistedCf.additionalFields) ? persistedCf.additionalFields : []) as Record<string, unknown>[]

  // Custom fields: normalize the persisted families, then apply the proposed
  // operations for the preview. Errors ride the proposal for the preview to
  // show; the executor re-derives and re-checks everything at save time.
  let customFieldsChange: BoluDocumentModifyProposal['customFieldsChange']
  if (params.customFieldsChange) {
    const headerApp = applyFieldOperations(persistedHeader, params.customFieldsChange.header ?? [], 'details row')
    const additionalApp = applyFieldOperations(persistedAdditional, params.customFieldsChange.additionalFields ?? [], 'chip')
    customFieldsChange = {
      oldHeader: (persistedHeader ?? []).map((entry) => normalizeFieldEntry(entry)),
      newHeader: headerApp.entries,
      oldAdditionalFields: (persistedAdditional ?? []).map((entry) => normalizeFieldEntry(entry)),
      newAdditionalFields: additionalApp.entries,
      summary: [...headerApp.summary, ...additionalApp.summary],
      errors: [...headerApp.errors, ...additionalApp.errors],
      fingerprintHeader: fingerprintFieldFamily(persistedHeader),
      fingerprintAdditionalFields: fingerprintFieldFamily(persistedAdditional),
      headerOps: params.customFieldsChange.header,
      additionalOps: params.customFieldsChange.additionalFields,
    }
  }

  // Groups: apply against the persisted rows for the preview (Gate 1 must
  // show which groups/items will change and refuse impossible plans).
  let groupsApplication: BoluDocumentModifyProposal['groupsApplication']
  let groupsAppliedRows: Array<Record<string, any>> | undefined
  let itemsFingerprint: string | undefined
  if (params.groupsChange && current) {
    itemsFingerprint = fingerprintItems(persistedItems, persistedGroupMeta)
    const applied = applyGroupOperations(
      persistedItems as Array<Record<string, any>>,
      persistedGroupMeta as Record<string, { name: string; showSubtotal: boolean }>,
      params.groupsChange,
    )
    groupsApplication = {
      summary: applied.summary,
      errors: applied.errors,
      after: applied.after,
      previewRows: applied.rows.map((row) => (
        row.row_type === 'group_header'
          ? {
              type: 'group' as const,
              text: String(row.group_name ?? row.description ?? 'Group'),
              showSubtotal: applied.groupMeta[String(row.group_id ?? '')]?.showSubtotal === true,
            }
          : { type: 'item' as const, text: String(row.description ?? '') }
      )),
    }
    groupsAppliedRows = applied.rows
  }

  // Calculation inputs: old snapshot covers every key the patch touches, plus the
  // full default set the app would otherwise be unknown to the diff layer.
  let calculationInputsChange: { old: Partial<BoluCalculationInputValues>; new: Partial<BoluCalculationInputValues> } | undefined
  if (params.calculationInputsChange) {
    const defaults: Partial<BoluCalculationInputValues> = {
      vatPercent: 7.5,
      discountValue: 0,
      discountType: 'percent',
      discountTiming: 'before_tax',
      whtValue: 0,
      whtType: 'percent',
    }
    const old: Record<string, number | string> = {}
    for (const key of Object.keys(params.calculationInputsChange) as Array<keyof BoluCalculationInputValues>) {
      const persisted = persistedInputs[key]
      const defaulted = (defaults as Record<string, unknown>)[key]
      old[key as string] = (persisted ?? defaulted) as number | string
    }
    calculationInputsChange = { old: old as Partial<BoluCalculationInputValues>, new: { ...params.calculationInputsChange } }
  }

  // Presentation controls — snapshot-derived for the preview; the executor re-checks at Gate 2.
  let presentationChange: BoluDocumentModifyProposal['presentationChange']
  const persistedPresentation = {
    pdfOutput: persistedCf.pdfOutput,
    notesTitle: persistedCf.notesTitle,
    termsTitle: persistedCf.termsTitle,
    chargeLabels: persistedCf.chargeLabels,
    mergeQtyUnit: persistedCf.mergeQtyUnit,
    showItemImages: persistedCf.showItemImages,
    columnConfig: persistedCf.columnConfig,
    signatoryId: persistedCf.signatoryId,
  } as Record<string, unknown>
  if (params.presentationChange && current) {
    const applied = applyPresentationPatch(
      persistedPresentation,
      params.presentationChange,
      { signatory: params.resolvedSignatory, bankAccount: params.resolvedBankAccount },
    )
    presentationChange = {
      old: persistedPresentation,
      new: applied.subtree,
      rows: applied.rows,
      summary: applied.summary,
      errors: applied.errors,
      fingerprint: fingerprintPresentation(persistedPresentation),
    }
  }

  // 2. Authoritative calculation preview — app owns the math; never the model.
  const effectiveCharges = { ...currentCharges }
  if (params.field === 'workmanship' || params.field === 'transportation' || params.field === 'shipping') {
    const num = Number(params.newValue)
    if (Number.isFinite(num)) {
      effectiveCharges[params.field] = num
    }
  }
  const effectiveInputs: BoluCalculationInputValues = {
    vatPercent: 7.5,
    discountValue: 0,
    discountType: 'percent',
    discountTiming: 'before_tax',
    whtValue: 0,
    whtType: 'percent',
    ...(persistedInputs as BoluCalculationInputValues),
    ...(params.calculationInputsChange ?? {}),
  }
  const effectiveExtraCharges = extraChargesChange ? extraChargesChange.newExtraCharges : persistedExtraCharges
  const groupRecalcItems = groupsAppliedRows ? toBoluItemsFromPersisted(groupsAppliedRows) : undefined
  const recalcItems = groupRecalcItems ?? params.itemsChange?.newItems ?? persistedItemsBolu

  let computedTotals: BoluInvoiceModifyProposal['computedTotals']
  const recalcRelevant =
    Boolean(params.itemsChange) ||
    Boolean(params.groupsChange) ||
    Boolean(params.presentationChange) ||
    params.field === 'workmanship' ||
    params.field === 'transportation' ||
    params.field === 'shipping' ||
    Boolean(extraChargesChange) ||
    Boolean(calculationInputsChange)
  if (recalcRelevant) {
    const calc = computeAuthoritativeTotals(recalcItems, {
      globalVatPercent: effectiveInputs.vatPercent,
      discountType: effectiveInputs.discountType,
      discountTiming: effectiveInputs.discountTiming,
      discountValue: effectiveInputs.discountValue,
      whtType: effectiveInputs.whtType,
      whtValue: effectiveInputs.whtValue,
      fixedCharges: {
        workmanship: effectiveCharges.workmanship,
        transportation: effectiveCharges.transportation,
        shipping: effectiveCharges.shipping,
      },
      extraCharges: effectiveExtraCharges.map((charge) => ({
        label: charge.label,
        value: charge.value,
        vatApplicable: charge.withTax,
      })),
    })
    computedTotals = {
      subtotal: calc.subtotal,
      vat: calc.vat,
      total: calc.totalPayable,
      discount: calc.discount,
      wht: calc.wht,
      installRateTotal: calc.installRateTotal,
      extraChargesTotal: calc.extraChargesTotal,
    }
  }

  return {
    opId: generateOperationId(),
    operationType: 'modify-document',
    documentFamily,
    schemaVersion: '1.0',
    requiredPermission: { resource: documentFamily, action: 'edit' },
    sideEffect: 'draft-mutation',
    gate1Required: true,
    gate2Required: true,
    status: 'pending_approval',
    createdAt: now.toISOString(),
    expiresAt,
    targetDocumentId: params.targetDocumentId,
    targetDocumentNumber: params.targetDocumentNumber,
    field: resolvedField,
    oldValue: resolvedOldValue,
    newValue: resolvedNewValue,
    itemsChange: params.itemsChange,
    extraChargesChange,
    customFieldsChange,
    groupsChange: params.groupsChange,
    groupsApplication,
    itemsFingerprint,
    presentationChange,
    calculationInputsChange,
    computedTotals,
    chargesSnapshot: { ...effectiveCharges },
  }
}

/**
 * Checks whether a proposal has expired or is stale. Accepts any proposal
 * shape that carries an expiry (structural minimum), so dedicated proposal
 * types need not widen the shared BoluProposal union.
 */
export function isProposalStale(proposal: { expiresAt: string }): boolean {
  return new Date(proposal.expiresAt).getTime() < Date.now()
}

/**
 * Validates Advance Invoice configuration input (parent invoice metadata).
 *
 * Fail-closed: anything that could produce a write the user did not
 * explicitly approve is rejected here, before any persistence is attempted.
 */
export function validateBoluAdvanceConfigInput(raw: unknown): {
  valid: boolean
  errors: string[]
  data?: {
    targetDocumentId: string
    documentFamily: 'invoice'
    targetDocumentNumber?: string
    intent: BoluAdvanceIntent
    newValues: BoluAdvanceConfigProposal['newValues']
    oldValues: BoluAdvanceConfigProposal['oldValues']
  }
} {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Payload must be an object.'] }
  }
  const payload = raw as Record<string, unknown>

  const documentId = typeof payload.targetDocumentId === 'string' ? payload.targetDocumentId.trim() : ''
  if (!documentId || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(documentId)) {
    errors.push('A valid parent invoice UUID is required.')
  }

  const family = payload.documentFamily === undefined ? 'invoice' : payload.documentFamily
  if (family !== 'invoice') {
    errors.push('Advance Invoice configuration applies to the invoice family only; quotations and non-invoice documents are rejected.')
  }

  const intent = typeof payload.intent === 'string' ? payload.intent : ''
  if (intent !== 'configure' && intent !== 'update' && intent !== 'remove') {
    errors.push('Intent must be one of: configure, update, remove.')
  }

  const targetDocumentNumber = typeof payload.targetDocumentNumber === 'string' ? payload.targetDocumentNumber.trim() || undefined : undefined

  const ADVANCE_FIELDS: readonly BoluAdvanceFieldKey[] = ['suffix', 'mode', 'value', 'primary_label', 'secondary_label']
  const MODES: readonly BoluAdvanceModeInput[] = ['percentage', 'percent', 'fixed']

  // ---- newValues: type-check each of the five fields --------------------
  const nvRaw = payload.newValues
  if (nvRaw !== undefined && (typeof nvRaw !== 'object' || nvRaw === null || Array.isArray(nvRaw))) {
    errors.push('newValues must be an object.')
  }
  const nv = (nvRaw && typeof nvRaw === 'object' && !Array.isArray(nvRaw) ? nvRaw : {}) as Record<string, unknown>
  for (const key of Object.keys(nv)) {
    if (!ADVANCE_FIELDS.includes(key as BoluAdvanceFieldKey)) {
      errors.push(`Unknown Advance Invoice field "${key}". Only ${ADVANCE_FIELDS.join(', ')} may be modified.`)
    }
  }

  const newValues: BoluAdvanceConfigProposal['newValues'] = {}
  const modeInput = nv.mode
  const modeResolved: BoluAdvanceModeInput | undefined =
    typeof modeInput === 'string' ? (modeInput as BoluAdvanceModeInput) : undefined
  if (nv.mode !== undefined) {
    if (typeof nv.mode !== 'string' || !MODES.includes(nv.mode as BoluAdvanceModeInput)) {
      errors.push('mode must be one of: percentage, percent, fixed.')
    } else {
      newValues.mode = nv.mode as BoluAdvanceModeInput
    }
  }
  if (nv.value !== undefined) {
    const value = Number(nv.value)
    if (typeof nv.value !== 'number' || !Number.isFinite(value)) {
      errors.push('value must be a finite number.')
    } else if (value < 0) {
      errors.push('value must be non-negative.')
    } else if ((modeResolved === 'percentage' || modeResolved === 'percent') && value > 100) {
      errors.push('value must be between 0 and 100 for percentage mode.')
    } else {
      newValues.value = value
    }
  }
  if (nv.suffix !== undefined) {
    if (typeof nv.suffix !== 'string') {
      errors.push('suffix must be a string.')
    } else {
      newValues.suffix = nv.suffix.trim()
    }
  }
  if (nv.primary_label !== undefined) {
    if (typeof nv.primary_label !== 'string') {
      errors.push('primary_label must be a string.')
    } else {
      newValues.primary_label = nv.primary_label.trim()
    }
  }
  if (nv.secondary_label !== undefined) {
    if (typeof nv.secondary_label !== 'string') {
      errors.push('secondary_label must be a string.')
    } else {
      newValues.secondary_label = nv.secondary_label.trim()
    }
  }

  // ---- oldValues: strict subset of the five fields, finite numbers --------
  const ovRaw = payload.oldValues
  if (ovRaw !== undefined && (typeof ovRaw !== 'object' || ovRaw === null || Array.isArray(ovRaw))) {
    errors.push('oldValues must be an object.')
  }
  const ov = (ovRaw && typeof ovRaw === 'object' && !Array.isArray(ovRaw) ? ovRaw : {}) as Record<string, unknown>
  for (const key of Object.keys(ov)) {
    if (!ADVANCE_FIELDS.includes(key as BoluAdvanceFieldKey)) {
      errors.push(`Unknown oldValues field "${key}". Only ${ADVANCE_FIELDS.join(', ')} may be guarded.`)
    }
  }
  const oldValues: BoluAdvanceConfigProposal['oldValues'] = {}
  for (const key of ADVANCE_FIELDS) {
    const value = ov[key]
    if (value === undefined) continue
    if (value === null) { oldValues[key] = null; continue }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        errors.push(`oldValues.${key} must be a finite number when provided.`)
      } else {
        oldValues[key] = value
      }
      continue
    }
    if (typeof value === 'string') { oldValues[key] = value; continue }
    errors.push(`oldValues.${key} must be a string, a finite number, or null.`)
  }

  // ---- intent-specific rules ----------------------------------------------
  const newKeys = Object.keys(newValues)
  if (intent === 'configure') {
    // Configuring from nothing may supply any subset (defaults are allowed),
    // but empty is still a valid configure (defaults apply).
  } else if (intent === 'update') {
    if (newKeys.length === 0) {
      errors.push('update requires at least one of: suffix, mode, value, primary_label, secondary_label.')
    }
  } else if (intent === 'remove') {
    if (newKeys.length > 0) {
      errors.push('remove must not carry newValues; the Advance Invoice configuration is deleted as a unit.')
    }
    // Note: the full five-field oldValues gate on removal is enforced by the
    // executor against the persisted row (before any write). Gate 1 plumbing
    // fills these from the persisted configuration; model output is never
    // trusted for them.
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }
  return {
    valid: true,
    errors: [],
    data: {
      targetDocumentId: documentId,
      documentFamily: 'invoice',
      targetDocumentNumber,
      intent: intent as BoluAdvanceIntent,
      newValues,
      oldValues,
    },
  }
}

/** Persisted snapshot of the parent's advance_invoice block, or absence. */
export interface BoluAdvanceCurrentSnapshot {
  present: boolean
  suffix?: string | null
  /** Persisted (normalized) mode: `percentage` or `fixed`. */
  mode?: string | null
  value?: number | null
  primary_label?: string | null
  secondary_label?: string | null
  contractValue?: number
  documentNumber?: string | null
  amount?: number | null
}

/**
 * Creates the authoritative Advance Invoice configuration proposal.
 *
 * `current` is the persisted snapshot the user saw at Gate 1 (or `undefined`
 * when unknown); the executor re-verifies `oldValues` against the live row
 * before any write, so a preview built from a stale snapshot fails closed
 * rather than applying blindly.
 */
export function buildBoluAdvanceConfigProposal(params: {
  targetDocumentId: string
  targetDocumentNumber: string
  intent: BoluAdvanceIntent
  newValues?: BoluAdvanceConfigProposal['newValues']
  oldValues?: BoluAdvanceConfigProposal['oldValues']
  current?: BoluAdvanceCurrentSnapshot | null
  parent?: {
    invoice_number?: string | null
    issue_date?: string | null
    due_date?: string | null
    total?: number | string | null
  } | null
}): BoluAdvanceConfigProposal {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()
  const intent = params.intent
  const current = params.current ?? undefined
  const newValues = params.newValues ?? {}
  const isRemove = intent === 'remove'

  const beforeOf = (key: BoluAdvanceFieldKey): string | number | null =>
    current?.[key] ?? null

  const afterOf = (key: BoluAdvanceFieldKey): string | number | null => {
    if (isRemove) return null
    if (newValues[key] !== undefined) return newValues[key] ?? null
    if (current?.present) return current[key] ?? null
    // Not configured yet: show exactly what the executor will persist.
    switch (key) {
      case 'suffix': return ADVANCE_SUFFIX_DEFAULT
      case 'mode': return 'percentage'
      case 'value': return 30
      case 'primary_label': return ADVANCE_PRIMARY_LABEL_DEFAULT
      case 'secondary_label': return ADVANCE_SECONDARY_LABEL_DEFAULT
    }
  }

  const fields = {
    suffix: { before: beforeOf('suffix'), after: afterOf('suffix') },
    mode: { before: beforeOf('mode'), after: afterOf('mode') },
    value: { before: beforeOf('value'), after: afterOf('value') },
    primary_label: { before: beforeOf('primary_label'), after: afterOf('primary_label') },
    secondary_label: { before: beforeOf('secondary_label'), after: afterOf('secondary_label') },
  }

  // Derived preview (document number + amount) via the same domain math the
  // executor uses; previews are display-only and re-verified at write time.
  let documentNumber: string | null | undefined
  let amount: number | null | undefined
  let contractValue: number | undefined
  if (!isRemove && params.parent) {
    const mergedMode = (newValues.mode ?? current?.mode ?? 'percentage') as 'percentage' | 'fixed'
    const mergedModeForHelper = mergedMode === 'fixed' ? 'fixed' : 'percent'
    const mergedValue = Number(newValues.value ?? current?.value ?? 30)
    const mergedSuffix = newValues.suffix !== undefined ? newValues.suffix : (current?.present ? current.suffix ?? undefined : undefined)
    const mergedPrimary = newValues.primary_label ?? (current?.present ? current.primary_label ?? undefined : undefined) ?? ADVANCE_PRIMARY_LABEL_DEFAULT
    const mergedSecondary = newValues.secondary_label ?? (current?.present ? current.secondary_label ?? undefined : undefined) ?? ADVANCE_SECONDARY_LABEL_DEFAULT
    const total = Number(params.parent.total)
    contractValue = Number.isFinite(total) ? Math.max(0, total) : 0
    const derived = buildAdvanceParentInvoiceMetadata({
      parentInvoice: {
        id: params.targetDocumentId,
        invoice_number: params.parent.invoice_number ?? null,
        issue_date: params.parent.issue_date ?? null,
        due_date: params.parent.due_date ?? null,
        total: contractValue,
      },
      mode: mergedModeForHelper,
      inputValue: mergedValue,
      suffix: mergedSuffix,
      primaryLabel: mergedPrimary,
      secondaryLabel: mergedSecondary,
    })
    documentNumber = derived.document_number ?? null
    amount = derived.amount
    contractValue = derived.contract_value
  }

  return {
    opId: generateOperationId(),
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    schemaVersion: '1.0',
    requiredPermission: { resource: 'invoice', action: 'edit' },
    sideEffect: 'draft-mutation',
    gate1Required: true,
    gate2Required: true,
    status: 'pending_approval',
    createdAt: now.toISOString(),
    expiresAt,
    targetDocumentId: params.targetDocumentId,
    targetDocumentNumber: params.targetDocumentNumber,
    intent,
    newValues,
    oldValues: params.oldValues ?? {},
    preview: {
      advance_present_before: Boolean(current?.present),
      advance_present_after: !isRemove,
      fields,
      documentNumber,
      amount,
      contractValue,
    },
  }
}

/**
 * Parses structured JSON operation envelope from model response or text.
 * Rejects arbitrary or malformed envelopes safely.
 */
export function parseStructuredOperationEnvelope(text: string): {
  hasOperation: boolean
  rawOperation?: unknown
  error?: string
} {
  const trimmed = text.trim()
  // Look for JSON block or raw JSON object
  const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/) || trimmed.match(/(\{[\s\S]*"bolu_operation"[\s\S]*\})/)
  if (!jsonMatch) {
    return { hasOperation: false }
  }

  try {
    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') {
      return { hasOperation: false }
    }
    const op = parsed.bolu_operation ?? parsed
    if (op && typeof op === 'object' && 'operationType' in op) {
      return { hasOperation: true, rawOperation: op }
    }
    return { hasOperation: false }
  } catch (err) {
    return {
      hasOperation: true,
      error: 'Malformed structured operation JSON payload.',
    }
  }
}
