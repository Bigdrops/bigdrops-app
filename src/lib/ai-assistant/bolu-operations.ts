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
import type { BoluReadAuthorization, BoluWriteAuthorization } from './bolu-data'

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
}

export interface BoluInvoiceCreatePayload {
  client_name: string
  client_id?: string | null
  items: BoluInvoiceItemInput[]
  issue_date?: string
  due_date?: string
  notes?: string
  payment_terms?: string
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
    action: 'view' | 'modify' | 'save'
  }
  sideEffect: BoluSideEffect
  gate1Required: true
  gate2Required: true
  status: BoluProposalStatus
  createdAt: string
  expiresAt: string // Stale detection timestamp (15 minutes)
}

export interface BoluInvoiceCreateProposal extends BoluOperationContract {
  operationType: 'create-document'
  documentFamily: 'invoice'
  payload: BoluInvoiceCreatePayload
  computedTotals: {
    subtotal: number
    vat: number
    total: number
    wht: number
    items: ComputedItem[]
  }
  candidateNumber: string
  persistedId?: string
  errorMessage?: string
}

export interface BoluInvoiceModifyProposal extends BoluOperationContract {
  operationType: 'modify-document'
  documentFamily: 'invoice'
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

export type BoluProposal = BoluInvoiceCreateProposal | BoluInvoiceModifyProposal

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
      validated.push({
        description,
        quantity,
        unit_price: unitPrice,
        unit: typeof item.unit === 'string' ? item.unit.trim() : undefined,
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
  globalVatPercent = 7.5,
): DocumentResult {
  return calculateDocument({
    items: items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      row_type: 'standard',
    })),
    globalVatPercent,
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 0,
    whtType: 'percent',
    whtValue: 0,
    extraCharges: [],
    visibleRowEffects: { install: false, vat: true, discount: false },
  })
}

/**
 * Creates an authoritative invoice creation proposal with precomputed financial math.
 */
export function buildInvoiceCreateProposal(
  payload: BoluInvoiceCreatePayload,
  candidateNumber = 'INV-DRAFT',
): BoluInvoiceCreateProposal {
  const totals = computeAuthoritativeTotals(payload.items)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString()

  return {
    opId: generateOperationId(),
    operationType: 'create-document',
    documentFamily: 'invoice',
    schemaVersion: '1.0',
    requiredPermission: { resource: 'invoice', action: 'save' },
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
      items: totals.items,
    },
  }
}

/**
 * Creates an authoritative invoice modification proposal.
 */
export function buildInvoiceModifyProposal(params: {
  targetDocumentId: string
  targetDocumentNumber: string
  field?: 'client_name' | 'notes' | 'payment_terms' | 'due_date' | 'issue_date'
  oldValue?: string | number | null
  newValue?: string | number | null
  itemsChange?: {
    oldItems: BoluInvoiceItemInput[]
    newItems: BoluInvoiceItemInput[]
  }
}): BoluInvoiceModifyProposal {
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
    documentFamily: 'invoice',
    schemaVersion: '1.0',
    requiredPermission: { resource: 'invoice', action: 'save' },
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
