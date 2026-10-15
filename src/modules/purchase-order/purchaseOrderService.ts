// ============================================================================
// SUPPLIER PURCHASE ORDER — persistence service
// ============================================================================
// Persistence only. Business rules live in `src/domain/purchase-order/*`
// (docs/standard/lifecycle-ownership-standard.md).
//
// Every query runs through the tenant-scoped client, so a call can only ever
// reach the caller's own `entity_*` schema. No function accepts a schema name.
//
// TRANSACTION SAFETY
//   All writes go through `save_purchase_order_with_items_transaction`, which
//   writes the header and its items in ONE transaction. A failure anywhere
//   rolls the whole save back, so a partial header/item write cannot survive.
//   The invoice and quotation save RPCs are NOT reused: a PO has no client and
//   posts no revenue.
//
// PREPARED TOTALS
//   Totals are produced by `withPurchaseOrderTotals()`, which delegates to
//   `computeDocument()`. A caller cannot submit totals that disagree with its
//   own lines, and no caller-supplied total is trusted.
//
// NUMBERING
//   Automatic numbers come from the shared numbering primitives and retry on a
//   unique-constraint collision. A MANUAL number is authoritative: a collision
//   is surfaced, never silently replaced, and a manual number never advances
//   the automatic cursor.
//
// ACCOUNTING AND INVENTORY ISOLATION
//   Nothing here writes `source_transactions`, `journal_entries`,
//   `journal_lines`, `expenses`, `payments`, or any stock table. A PO is a
//   procurement commitment only. The invoice save path dispatches an
//   accounting event; this path deliberately does NOT.
//
// AUDIT
//   Lifecycle audit rides the canonical `recordAuditLog` field-diff authority
//   into `audit_logs` (Mechanism 1 of `audit-trail-standard.md`), the same
//   foundation the CPS audit migration established. `AuditEntityType` includes
//   `purchase_order` and the `audit_logs` entity CHECK admits it; no new action
//   name exists. Every audit call is best-effort post-write work: a lost audit
//   row is logged and never fails the lifecycle mutation (invoice convention).
//   No `activity_events` row is written: discrete PO events live in `audit_logs`
//   and surface through the merged audit feed.
// ============================================================================

import { advanceAutoCursor, fetchAutoCursor } from '@/domain/documentNumbering'
import { parseTrailingSequence, type DocumentPrefixes } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { withPurchaseOrderTotals } from '@/domain/purchase-order/calculations'
import {
  getNextPurchaseOrderNumber,
  purchaseOrderNumberFamily,
  resolvePurchaseOrderPrefix,
} from '@/domain/purchase-order/numbering'
import {
  toPurchaseOrderItemRpcPayloads,
  toPurchaseOrderRpcPayload,
} from '@/domain/purchase-order/normalize'
import {
  assertPurchaseOrderTransition,
  isPurchaseOrderContentEditable,
} from '@/domain/purchase-order/status'
import {
  toPurchaseOrder,
  toPurchaseOrderItem,
  type DbPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type PurchaseOrderStatus,
} from '@/domain/purchase-order/types'
import { validatePurchaseOrder } from '@/domain/purchase-order/validation'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PurchaseOrderResult<T> {
  data: T | null
  error: string | null
}

export interface SavedPurchaseOrderRef {
  id: string
  po_number: string
}

export const SAVE_RPC = 'save_purchase_order_with_items_transaction'
export const TRANSITION_RPC = 'transition_purchase_order_status'

/** Best-effort lifecycle audit. A lost audit row never fails the mutation. */
export async function auditPurchaseOrder(
  tenantClient: any,
  run: () => Promise<unknown>,
): Promise<void> {
  try {
    await run()
  } catch (auditError) {
    console.error('Purchase order audit trail failed:', auditError)
  }
}

const PURCHASE_ORDER_COLUMNS =
  'id, po_number, po_date, supplier_id, supplier_name, status, currency, ' +
  'subtotal, discount, vat, extra_charges, total, calculation_inputs, ' +
  'notes, terms, created_at, updated_at, created_by, updated_by, archived_at'

const PURCHASE_ORDER_ITEM_COLUMNS =
  'id, purchase_order_id, description, quantity, unit, unit_cost, line_total, ' +
  'sort_order, created_at, updated_at'

export function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '')
    if (message) return message
  }
  if (typeof error === 'string' && error) return error
  return fallback
}

/** Postgres unique-constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ((error as { code?: unknown }).code === '23505') return true
  const message = String((error as { message?: unknown }).message ?? '')
  return /duplicate key value|unique constraint/i.test(message)
}

/**
 * Map a raw database refusal onto user-facing copy.
 *
 * The save RPC raises deliberate, stable messages. Matching them here keeps the
 * service's contract readable while leaving the database as the final arbiter.
 */
export function describeSaveError(error: unknown, fallback: string): string {
  if (isUniqueViolation(error)) {
    return 'That purchase order number is already used. Choose a different number.'
  }

  const raw = messageFrom(error, '')
  if (/purchase_order\/create required|purchase_order\/edit required|Insufficient permissions/i.test(raw)) {
    return 'You do not have permission to save purchase orders for this business.'
  }
  if (/does not exist in this tenant/i.test(raw)) {
    return 'That purchase order or supplier no longer exists in this business.'
  }
  if (/terminal and cannot transition/i.test(raw)) {
    return 'This purchase order is final and its status can no longer change.'
  }
  if (/Illegal purchase order transition/i.test(raw)) {
    return 'That status change is not allowed for this purchase order.'
  }
  if (/content is immutable|immutable once issued/i.test(raw)) {
    return 'Purchase order content cannot change after it leaves draft. Change only its status.'
  }
  if (/Archived purchase order/i.test(raw)) {
    return 'This purchase order is archived. Restore it before making changes.'
  }
  if (/changed since you loaded|stale/i.test(raw)) {
    return 'This purchase order changed since you loaded it. Reload and try again.'
  }
  if (/must not be negative/i.test(raw)) {
    return 'Amounts and quantities on a purchase order cannot be negative.'
  }
  if (/currency|violates check constraint/i.test(raw)) {
    return 'The purchase order failed a data check. Review its amounts and status.'
  }

  return raw || fallback
}

/** PostgREST wraps a jsonb-returning function in a single-element array. */
export function unwrapRpcPayload(data: unknown): Record<string, any> | null {
  const first = Array.isArray(data) ? data[0] : data
  return first && typeof first === 'object' ? (first as Record<string, any>) : null
}

/* ------------------------------------------------------------------ */
/* Reads                                                              */
/* ------------------------------------------------------------------ */

export async function listPurchaseOrders(
  tenantClient: any,
  options: {
    includeArchived?: boolean
    supplierId?: string
    status?: PurchaseOrderStatus
  } = {},
): Promise<PurchaseOrderResult<PurchaseOrder[]>> {
  const { includeArchived = false, supplierId, status } = options

  let query = tenantClient
    .from('purchase_orders')
    .select(PURCHASE_ORDER_COLUMNS)
    .order('po_date', { ascending: false, nullsFirst: false })

  if (!includeArchived) query = query.is('archived_at', null)
  if (supplierId) query = query.eq('supplier_id', supplierId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    return { data: null, error: messageFrom(error, 'Could not load purchase orders.') }
  }

  return {
    data: (data ?? []).map((row: DbPurchaseOrder) => toPurchaseOrder(row)),
    error: null,
  }
}

/** A PO header with its item rows, ordered by the persisted line order. */
export async function getPurchaseOrder(
  tenantClient: any,
  purchaseOrderId: string,
): Promise<PurchaseOrderResult<PurchaseOrder>> {
  if (!purchaseOrderId) return { data: null, error: 'Missing purchase order id.' }

  const { data: header, error: headerError } = await tenantClient
    .from('purchase_orders')
    .select(PURCHASE_ORDER_COLUMNS)
    .eq('id', purchaseOrderId)
    .maybeSingle()

  if (headerError) {
    return { data: null, error: messageFrom(headerError, 'Could not load this purchase order.') }
  }
  if (!header) return { data: null, error: null }

  const { data: itemRows, error: itemError } = await tenantClient
    .from('purchase_order_items')
    .select(PURCHASE_ORDER_ITEM_COLUMNS)
    .eq('purchase_order_id', purchaseOrderId)
    .order('sort_order', { ascending: true })

  if (itemError) {
    return { data: null, error: messageFrom(itemError, 'Could not load purchase order items.') }
  }

  return {
    data: {
      ...toPurchaseOrder(header as DbPurchaseOrder),
      items: (itemRows ?? []).map((row: Record<string, unknown>) => toPurchaseOrderItem(row)),
    },
    error: null,
  }
}

/** Every PO number already allocated in this tenant. Ground truth for skip-scan. */
export async function listOccupiedPurchaseOrderNumbers(
  tenantClient: any,
): Promise<string[]> {
  const { data, error } = await tenantClient.from('purchase_orders').select('po_number')
  if (error) return []
  return (data ?? [])
    .map((row: { po_number?: string | null }) => String(row.po_number ?? '').trim())
    .filter((value: string) => value.length > 0)
}

/**
 * The next automatic PO number for this tenant.
 *
 * Advisory only: the number is not reserved by reading it. The unique
 * constraint arbitrates, and `savePurchaseOrder` retries a fresh candidate when
 * it loses. Exposed for a form's number preview.
 */
export async function peekNextPurchaseOrderNumber(
  tenantClient: any,
  documentPrefixes?: Partial<DocumentPrefixes> | Record<string, string> | null,
): Promise<string> {
  const prefix = resolvePurchaseOrderPrefix(documentPrefixes)
  const family = purchaseOrderNumberFamily(prefix)
  const [{ data: rows }, cursor] = await Promise.all([
    tenantClient.from('purchase_orders').select('po_number'),
    fetchAutoCursor(tenantClient, family),
  ])
  return getNextPurchaseOrderNumber(rows ?? [], prefix, cursor)
}

/* ------------------------------------------------------------------ */
/* Transactional save                                                 */
/* ------------------------------------------------------------------ */

export interface SavePurchaseOrderParams {
  purchaseOrder: PurchaseOrder
  mode: 'create' | 'update'
  documentPrefixes?: Partial<DocumentPrefixes> | Record<string, string> | null
  /**
   * An explicitly typed number, and authoritative when present. Omit it (or
   * pass an empty string) to let the automatic sequence allocate one under
   * collision retry. Only the create path uses it.
   */
  manualNumber?: string
}

/**
 * Create or update a PO and its items atomically.
 *
 * Create: the header and items are inserted in one transaction, and the number
 * is either the caller's manual number (authoritative) or an automatically
 * allocated candidate that retries on collision.
 *
 * Update: `po_number` and `supplier_id` are identity and are never rewritten.
 * The stored status is read first so an illegal transition is refused with a
 * domain message before the transaction starts; the RPC refuses again.
 */
export async function savePurchaseOrder(
  tenantClient: any,
  entityId: string | null,
  params: SavePurchaseOrderParams,
): Promise<PurchaseOrderResult<SavedPurchaseOrderRef>> {
  const { mode, documentPrefixes, purchaseOrder } = params
  const manualNumber = String(params.manualNumber ?? '').trim()

  if (!entityId) {
    return { data: null, error: 'Missing business context for this save.' }
  }
  if (mode === 'update' && !purchaseOrder.id) {
    return { data: null, error: 'Missing purchase order id for an update.' }
  }

  // The canonical engine prepares the totals. A caller-supplied total is never
  // trusted, so a header can never disagree with its own lines.
  const prepared = withPurchaseOrderTotals(purchaseOrder)
  const itemsPayload = toPurchaseOrderItemRpcPayloads(prepared.items ?? [])

  // The number is NOT validated here. On create it is supplied by
  // `manualNumber` or by the automatic sequence, so `purchaseOrder.po_number`
  // is never the source of truth; on update it is immutable identity and is
  // absent from the payload entirely.
  const validation = validatePurchaseOrder(prepared, { requireNumber: false })
  if (!validation.valid) {
    return { data: null, error: validation.errorDescription ?? validation.error ?? 'Invalid purchase order.' }
  }

  if (mode === 'update') {
    // Content updates are a draft-only operation. A non-draft PO is
    // historically frozen: the save authority rejects the rewrite and only
    // `transitionPurchaseOrderStatus` may move the status.
    const current = await readPurchaseOrderVersion(tenantClient, String(prepared.id))
    if (current.error) return { data: null, error: current.error }
    if (!current.data) return { data: null, error: 'That purchase order no longer exists.' }
    if (current.data.archived_at) {
      return { data: null, error: 'This purchase order is archived. Restore it before making changes.' }
    }
    if (!isPurchaseOrderContentEditable(current.data.status)) {
      return {
        data: null,
        error:
          'Purchase order content cannot change after it leaves draft. Change only its status.',
      }
    }

    const transition = assertPurchaseOrderTransition(current.data.status, prepared.status)
    if (!transition.valid) {
      return { data: null, error: transition.errorDescription ?? 'Illegal status change.' }
    }

    const payload = toPurchaseOrderRpcPayload(prepared)
    payload.id = String(prepared.id)

    const { data, error } = await tenantClient.rpc(SAVE_RPC, {
      p_entity_id: entityId,
      p_purchase_order_payload: payload,
      p_items: itemsPayload,
      p_mode: 'update',
      p_expected_updated_at: current.data.updated_at,
    })
    if (error) {
      return { data: null, error: describeSaveError(error, 'Could not update this purchase order.') }
    }

    // The RPC returns the stored row, which is the authoritative number: an
    // update never rewrites it, so the stored value is reported rather than
    // whatever the caller happened to hold.
    const rpcResult = unwrapRpcPayload(data)
    const saved = (rpcResult?.purchase_order ?? rpcResult) as Record<string, any> | null
    const savedNumber = String(saved?.po_number ?? prepared.po_number ?? '')

    const statusChanged = prepared.status !== current.data.status
    const oldHeader = current.data.header as Record<string, any>
    const newHeader = {
      ...oldHeader,
      ...JSON.parse(JSON.stringify(prepared)),
      po_number: current.data.header.po_number,
      supplier_id: current.data.header.supplier_id,
      supplier_name: current.data.header.supplier_name,
    }
    await auditPurchaseOrder(tenantClient, async () => {
      const audit = await import('@/lib/audit')
      if (statusChanged) {
        await audit.recordPurchaseOrderStatusChanged(
          tenantClient,
          String(prepared.id),
          savedNumber,
          current.data.status,
          prepared.status,
          oldHeader,
          newHeader,
        )
      } else {
        await audit.recordPurchaseOrderUpdated(
          tenantClient,
          String(prepared.id),
          savedNumber,
          oldHeader,
          newHeader,
        )
      }
    })

    return {
      data: {
        id: String(saved?.id ?? prepared.id),
        po_number: savedNumber,
      },
      error: null,
    }
  }

  const prefix = resolvePurchaseOrderPrefix(documentPrefixes)
  const family = purchaseOrderNumberFamily(prefix)

  const regenerateNumber = async (): Promise<string> => {
    const [{ data: rows }, cursor] = await Promise.all([
      tenantClient.from('purchase_orders').select('po_number'),
      fetchAutoCursor(tenantClient, family),
    ])
    return getNextPurchaseOrderNumber(rows ?? [], prefix, cursor)
  }

  const created = await withUniqueRetry<SavedPurchaseOrderRef>(
    async (candidateNumber: string) => {
      const payload = toPurchaseOrderRpcPayload(prepared)
      payload.po_number = candidateNumber

      const { data, error } = await tenantClient.rpc(SAVE_RPC, {
        p_entity_id: entityId,
        p_purchase_order_payload: payload,
        p_items: itemsPayload,
        p_mode: 'create',
      })
      if (error) return { data: null, error: error as any }

      const rpcResult = unwrapRpcPayload(data)
      const saved = (rpcResult?.purchase_order ?? rpcResult) as Record<string, any> | null
      const id = saved?.id ?? rpcResult?.id

      if (!id) {
        return { data: null, error: { message: 'The save returned no purchase order identifier.' } as any }
      }

      return {
        data: { id: String(id), po_number: String(saved?.po_number ?? candidateNumber) },
        error: null,
      }
    },
    regenerateNumber,
    manualNumber.length > 0 ? manualNumber : undefined,
  )

  if (created.error) {
    return { data: null, error: describeSaveError(created.error, 'Could not create this purchase order.') }
  }

  // Advance the automatic cursor only for a system-generated number. A manual
  // number never moves the sequence.
  if (manualNumber.length === 0 && created.data) {
    const sequence = parseTrailingSequence(created.data.po_number)
    if (sequence !== null) {
      await advanceAutoCursor(tenantClient, family, sequence)
    }
  }

  if (created.data) {
    await auditPurchaseOrder(tenantClient, async () => {
      const audit = await import('@/lib/audit')
      await audit.recordPurchaseOrderCreated(
        tenantClient,
        created.data.id,
        JSON.parse(JSON.stringify({ ...prepared, po_number: created.data.po_number })),
        created.data.po_number,
      )
    })
  }

  return { data: created.data, error: null }
}

export interface PurchaseOrderVersion {
  status: PurchaseOrderStatus
  archived_at: string | null
  updated_at: string | null
  header: DbPurchaseOrder
}

/** Read the stored lifecycle version: status, archive state and write stamp. */
export async function readPurchaseOrderVersion(
  tenantClient: any,
  purchaseOrderId: string,
): Promise<PurchaseOrderResult<PurchaseOrderVersion>> {
  const { data, error } = await tenantClient
    .from('purchase_orders')
    .select(`${PURCHASE_ORDER_COLUMNS}, updated_at`)
    .eq('id', purchaseOrderId)
    .maybeSingle()

  if (error) {
    return { data: null, error: messageFrom(error, 'Could not read this purchase order.') }
  }
  if (!data) return { data: null, error: null }
  const row = data as DbPurchaseOrder & { updated_at?: string | null }
  return {
    data: {
      status: row.status as PurchaseOrderStatus,
      archived_at: (row.archived_at as string | null) ?? null,
      updated_at: (row.updated_at as string | null) ?? null,
      header: row,
    },
    error: null,
  }
}

/* ------------------------------------------------------------------ */
/* Archive lifecycle                                                  */
/* ------------------------------------------------------------------ */

/**
 * Archive a PO. Archiving is presentation state: it never deletes the document,
 * never changes the status, and never touches accounting or inventory.
 */
export async function archivePurchaseOrder(
  tenantClient: any,
  purchaseOrderId: string,
): Promise<PurchaseOrderResult<PurchaseOrder>> {
  if (!purchaseOrderId) return { data: null, error: 'Missing purchase order id.' }

  const { data, error } = await tenantClient
    .from('purchase_orders')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', purchaseOrderId)
    .select(PURCHASE_ORDER_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: messageFrom(error, 'Could not archive this purchase order.') }
  }
  const archived = toPurchaseOrder(data as DbPurchaseOrder)
  await auditPurchaseOrder(tenantClient, async () => {
    const audit = await import('@/lib/audit')
    await audit.recordPurchaseOrderArchived(
      tenantClient,
      purchaseOrderId,
      archived.po_number,
      JSON.parse(JSON.stringify(archived)),
    )
  })
  return { data: archived, error: null }
}

/** Restore an archived PO. */
export async function restorePurchaseOrder(
  tenantClient: any,
  purchaseOrderId: string,
): Promise<PurchaseOrderResult<PurchaseOrder>> {
  if (!purchaseOrderId) return { data: null, error: 'Missing purchase order id.' }

  const { data, error } = await tenantClient
    .from('purchase_orders')
    .update({ archived_at: null })
    .eq('id', purchaseOrderId)
    .select(PURCHASE_ORDER_COLUMNS)
    .single()

  if (error) {
    return { data: null, error: messageFrom(error, 'Could not restore this purchase order.') }
  }
  // Restore clears the archive flag only. The lifecycle status is preserved:
  // a cancelled or closed PO stays cancelled or closed after restore.
  const restored = toPurchaseOrder(data as DbPurchaseOrder)
  await auditPurchaseOrder(tenantClient, async () => {
    const audit = await import('@/lib/audit')
    await audit.recordPurchaseOrderRestored(
      tenantClient,
      purchaseOrderId,
      restored.po_number,
      JSON.parse(JSON.stringify(restored)),
    )
  })
  return { data: restored, error: null }
}

export type { PurchaseOrder, PurchaseOrderItem }
