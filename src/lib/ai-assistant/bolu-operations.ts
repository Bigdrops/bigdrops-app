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
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: validated,
  }
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
    return { valid: false, errors: ['"extra_charges" must be an array.'], data: [] }
  }
  if (raw.length > 20) {
    return { valid: false, errors: ['"extra_charges" must not exceed 20 entries.'], data: [] }
  }

  const data: BoluExtraCharge[] = []
  for (let i = 0; i < raw.length; i++) {
    const charge = raw[i] as Record<string, unknown>
    if (!charge || typeof charge !== 'object') {
      errors.push(`extra_charges[${i}] is invalid.`)
      continue
    }
    const label = typeof charge.name === 'string' ? charge.name.trim()
      : typeof charge.label === 'string' ? charge.label.trim()
        : ''
    if (!label) {
      errors.push(`extra_charges[${i}].name must be a non-empty string.`)
    }

    const rawAmount = charge.amount !== undefined ? charge.amount : charge.value
    const value = Number(rawAmount)
    if (!Number.isFinite(value) || value < 0) {
      errors.push(`extra_charges[${i}].amount must be a finite non-negative number.`)
    }

    const vatApplicable = charge.withTax !== undefined ? charge.withTax === true : charge.vatApplicable === true

    if (label && Number.isFinite(value) && value >= 0) {
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
    errors.push('A valid document UUID is required.')
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
    errors.push(`Modifying field "${payload.field}" directly is not allowed.`)
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
      errors.push('calculationInputs must be an object.')
    } else {
      const input = rawInputs as Record<string, unknown>
      const patch: BoluCalculationInputValues = {}
      const allowed = ['vatPercent', 'discountValue', 'discountType', 'discountTiming', 'whtValue', 'whtType'] as const
      for (const key of Object.keys(input)) {
        if (!(allowed as readonly string[]).includes(key)) {
          errors.push(`Unknown calculation input "${key}". Supported: ${allowed.join(', ')}.`)
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
          errors.push('vatPercent must be a number between 0 and 100.')
        } else {
          patch.vatPercent = vatPercent
        }
      }
      const discountValue = numOrNull(input.discountValue)
      if (discountValue !== undefined) {
        if (discountValue === 'invalid' || discountValue < 0) {
          errors.push('discountValue must be a finite non-negative number.')
        } else {
          patch.discountValue = discountValue
        }
      }
      const discountType = input.discountType
      if (discountType !== undefined) {
        if (discountType === 'fixed' || discountType === 'percent') {
          patch.discountType = discountType
        } else {
          errors.push('discountType must be "fixed" or "percent".')
        }
      }
      const discountTiming = input.discountTiming
      if (discountTiming !== undefined) {
        if (discountTiming === 'before_tax' || discountTiming === 'after_tax') {
          patch.discountTiming = discountTiming
        } else {
          errors.push('discountTiming must be "before_tax" or "after_tax".')
        }
      }
      const whtValue = numOrNull(input.whtValue)
      if (whtValue !== undefined) {
        if (whtValue === 'invalid' || whtValue < 0) {
          errors.push('whtValue must be a finite non-negative number.')
        } else {
          patch.whtValue = whtValue
        }
      }
      const whtType = input.whtType
      if (whtType !== undefined) {
        if (whtType === 'fixed' || whtType === 'percent') {
          patch.whtType = whtType
        } else {
          errors.push('whtType must be "fixed" or "percent".')
        }
      }
      // Percentage-bounded combos — percent discounts/WHT must stay in range
      const effectiveDiscountType = patch.discountType
      if (effectiveDiscountType === 'percent' && patch.discountValue !== undefined && patch.discountValue > 100) {
        errors.push('discountValue must be between 0 and 100 for percentage discounts.')
      }
      if (patch.whtType === 'percent' && patch.whtValue !== undefined && patch.whtValue > 100) {
        errors.push('whtValue must be between 0 and 100 for percentage WHT.')
      }
      if (Object.keys(patch).length === 0) {
        errors.push('calculationInputs must contain at least one supported key.')
      } else {
        validatedCalculationInputsChange = patch
      }
    }
  }

  if (!field && !validatedItems && !validatedExtraChargesChange && !validatedCalculationInputsChange) {
    errors.push('Modification must specify a field, items, extra charges, or calculation inputs.')
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
    return {
      description: String(row.description ?? ''),
      quantity: Number.isFinite(qty) ? qty : 1,
      unit_price: Number(row.unit_price ?? 0) || 0,
      unit: typeof row.unit === 'string' ? row.unit : undefined,
      row_type: 'standard',
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
  const recalcItems = params.itemsChange?.newItems ?? persistedItemsBolu

  let computedTotals: BoluInvoiceModifyProposal['computedTotals']
  const recalcRelevant =
    Boolean(params.itemsChange) ||
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
