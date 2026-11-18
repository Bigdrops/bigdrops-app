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
import type { TenantClient } from '@/lib/tenantClient'
import type { BoluClientMatch, BoluReadAuthorization, BoluWriteAuthorization } from './bolu-data'

export type BoluOperationType = 'create-document' | 'modify-document'
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
  row_type?: 'standard' | 'group_header'
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
  notes?: string
  payment_terms?: string
  /** Terms and conditions, distinct from the payment terms text. */
  terms?: string | null
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

export interface BoluInvoiceModifyPayload {
  documentId: string
  field?: 'client_name' | 'notes' | 'payment_terms' | 'due_date' | 'issue_date'
  oldValue?: string | number | null
  newValue?: string | number | null
  items?: BoluInvoiceItemInput[]
  oldItems?: BoluInvoiceItemInput[]
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
  field?: string
  oldValue?: string | number | null
  newValue?: string | number | null
  itemsChange?: {
    oldItems: BoluInvoiceItemInput[]
    newItems: BoluInvoiceItemInput[]
  }
  computedTotals?: {
    subtotal: number
    vat: number
    total: number
  }
  persistedId?: string
  errorMessage?: string
}

export type BoluInvoiceModifyProposal = BoluDocumentModifyProposal

export type BoluProposal = BoluDocumentCreateProposal | BoluDocumentModifyProposal

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
        typeof value === 'number' && Number.isFinite(value) ? value : null
      const optionalString = (value: unknown): string | null | undefined =>
        typeof value === 'string' && value.trim() ? value.trim() : null

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
        install_rate_taxable: item.install_rate_taxable === true,
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
      notes: typeof payload.notes === 'string' ? payload.notes.trim() : '',
      payment_terms: typeof payload.payment_terms === 'string' ? payload.payment_terms.trim() : '',
      terms: typeof payload.terms === 'string' ? payload.terms.trim() || null : null,
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

/**
 * Validates invoice modification input.
 */
export function validateInvoiceModifyInput(raw: unknown): {
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
  if (!documentId || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(documentId)) {
    errors.push('A valid document UUID is required.')
  }

  // Commercial charges are not part of the modification contract; editing them
  // requires the document form so the authoritative calculation stays intact.
  if (payload.extra_charges !== undefined || payload.extraCharges !== undefined) {
    errors.push('Modifying extra_charges through Bolu is not supported. Open the document to adjust commercial charges.')
  }

  const field = typeof payload.field === 'string' ? payload.field : undefined
  const allowedFields = ['client_name', 'notes', 'payment_terms', 'due_date', 'issue_date']
  if (field && !allowedFields.includes(field)) {
    errors.push(`Modifying field "${field}" directly is not allowed. Only non-computed fields can be modified.`)
  }

  let validatedItems: BoluInvoiceItemInput[] | undefined
  if (payload.items !== undefined) {
    const itemsResult = validateInvoiceItems(payload.items)
    if (!itemsResult.valid) {
      errors.push(...itemsResult.errors)
    } else {
      validatedItems = itemsResult.data
    }
  }

  if (!field && !validatedItems) {
    errors.push('Modification must specify either a valid field or items to update.')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: {
      documentId,
      field: field as BoluInvoiceModifyPayload['field'],
      oldValue: payload.oldValue as string | number | null | undefined,
      newValue: payload.newValue as string | number | null | undefined,
      items: validatedItems,
      oldItems: Array.isArray(payload.oldItems) ? (payload.oldItems as BoluInvoiceItemInput[]) : undefined,
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

/**
 * Creates an authoritative invoice modification proposal.
 */
export function buildInvoiceModifyProposal(params: {
  targetDocumentId: string
  targetDocumentNumber: string
  documentFamily?: BoluDocumentFamily
  field?: 'client_name' | 'notes' | 'payment_terms' | 'due_date' | 'issue_date'
  oldValue?: string | number | null
  newValue?: string | number | null
  itemsChange?: {
    oldItems: BoluInvoiceItemInput[]
    newItems: BoluInvoiceItemInput[]
  }
}): BoluInvoiceModifyProposal {
  const documentFamily = params.documentFamily ?? 'invoice'
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()

  let computedTotals: { subtotal: number; vat: number; total: number } | undefined
  if (params.itemsChange?.newItems) {
    const calc = computeAuthoritativeTotals(params.itemsChange.newItems)
    computedTotals = {
      subtotal: calc.subtotal,
      vat: calc.vat,
      total: calc.totalPayable,
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
    field: params.field,
    oldValue: params.oldValue,
    newValue: params.newValue,
    itemsChange: params.itemsChange,
    computedTotals,
  }
}

/**
 * Checks whether a proposal has expired or is stale.
 */
export function isProposalStale(proposal: BoluProposal): boolean {
  return new Date(proposal.expiresAt).getTime() < Date.now()
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
