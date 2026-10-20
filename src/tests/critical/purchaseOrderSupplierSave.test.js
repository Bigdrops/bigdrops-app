import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { createEmptyPurchaseOrder } from '../../domain/purchase-order/types.ts'
import { toPurchaseOrder } from '../../domain/purchase-order/types.ts'
import { validatePurchaseOrder } from '../../domain/purchase-order/validation.ts'
import {
  applyPurchaseOrderItemUpdate,
  applySharedHeaderUpdate,
  purchaseOrderItemFromImport,
  toPurchaseOrderFormItems,
} from '../../domain/purchase-order/formAdapter.ts'
import {
  toPurchaseOrderItemRpcPayloads,
  toPurchaseOrderRpcPayload,
} from '../../domain/purchase-order/normalize.ts'
import { withPurchaseOrderTotals } from '../../domain/purchase-order/calculations.ts'

/* ------------------------------------------------------------------ */
/* Phase C2.1 — supplier selection save repair                        */
/* ------------------------------------------------------------------ */
/* Live defect: the picker visibly showed the supplier name while save
 * rejected the document as missing a supplier. Root cause was the form
 * page's header updater closing over a stale snapshot: the shared form
 * emits party selection as two synchronous updates (id, then name), and
 * the second recomputed from the pre-selection state, discarding the
 * just-written supplier_id while keeping supplier_name.
 *
 * These tests pin the integration boundary with the real functions in
 * the real call order. `foldUpdates` reproduces the exact semantics the
 * page must guarantee (each update builds on the previous result, as a
 * functional setState does). A stale-snapshot application is shown to
 * reproduce the live failure, proving the tests guard the defect. */

const SUPPLIER_ID = '11111111-2222-4333-8555-666666666666'
const SUPPLIER_NAME = 'BIGDROPS'

/** Apply updates in shared-form order, each on the previous result. */
function foldUpdates(po, updates) {
  let current = po
  for (const [field, value] of updates) {
    current = applySharedHeaderUpdate(current, field, value) ?? current
  }
  return current
}

/** The stale-closure shape that caused the live failure: every update
 * recomputed from the original snapshot, so the last write wins whole. */
function staleUpdates(po, updates) {
  let current = po
  for (const [field, value] of updates) {
    current = applySharedHeaderUpdate(po, field, value) ?? current
  }
  return current
}

function selectableDraft() {
  const po = createEmptyPurchaseOrder({ supplier_id: '', po_number: 'PO-000001' })
  po.items = [
    { description: 'Cement', quantity: 1, unit: 'bag', unit_cost: 1000, line_total: 1000, sort_order: 0 },
  ]
  return po
}

/* ------------------------------------------------------------------ */
/* Selection populates the authoritative UUID                         */
/* ------------------------------------------------------------------ */

test('po supplier: selecting a supplier stores its UUID with the display name', () => {
  const selected = foldUpdates(selectableDraft(), [
    ['supplier_id', SUPPLIER_ID],
    ['supplier_name', SUPPLIER_NAME],
  ])

  assert.equal(selected.supplier_id, SUPPLIER_ID)
  assert.equal(selected.supplier_name, SUPPLIER_NAME)
  assert.equal(validatePurchaseOrder(selected, { requireNumber: false }).valid, true)
})

test('po supplier: the stale application shape reproduces the live failure', () => {
  const broken = staleUpdates(selectableDraft(), [
    ['supplier_id', SUPPLIER_ID],
    ['supplier_name', SUPPLIER_NAME],
  ])

  // The display name survived while the UUID was discarded: exactly the
  // observed state (name visible, save rejected as missing supplier).
  assert.equal(broken.supplier_name, SUPPLIER_NAME)
  assert.equal(broken.supplier_id, '')
  const result = validatePurchaseOrder(broken, { requireNumber: false })
  assert.equal(result.valid, false)
  assert.match(result.errorDescription ?? '', /Choose the supplier/)
})

/* ------------------------------------------------------------------ */
/* Selection survives unrelated form edits                            */
/* ------------------------------------------------------------------ */

test('po supplier: selection survives item, date, number, and discount edits', () => {
  let po = foldUpdates(selectableDraft(), [
    ['supplier_id', SUPPLIER_ID],
    ['supplier_name', SUPPLIER_NAME],
  ])
  po = {
    ...po,
    items: [{ description: 'Cement', quantity: 3, unit: 'bag', unit_cost: 1039830, line_total: 0, sort_order: 0 }],
  }

  po = { ...po, items: applyPurchaseOrderItemUpdate(po.items, 0, 'quantity', 4) }
  po = applySharedHeaderUpdate(po, 'issue_date', '2026-10-20') ?? po
  po = applySharedHeaderUpdate(po, 'invoice_number', 'PO-000002') ?? po
  po = applySharedHeaderUpdate(po, 'discount', 1000) ?? po
  po = applySharedHeaderUpdate(po, 'vat', 7.5) ?? po
  po = applySharedHeaderUpdate(po, 'notes', 'Deliver before Friday') ?? po

  assert.equal(po.supplier_id, SUPPLIER_ID)
  assert.equal(po.supplier_name, SUPPLIER_NAME)
  assert.equal(validatePurchaseOrder(po, { requireNumber: false }).valid, true)

  // The editor mirror stays consistent with the procurement cost.
  const [row] = toPurchaseOrderFormItems(po)
  assert.equal(row.unit_price, 1039830)
  assert.equal(row.unit_cost, 1039830)
})

test('po supplier: selection survives item import', () => {
  let po = foldUpdates(selectableDraft(), [
    ['supplier_id', SUPPLIER_ID],
    ['supplier_name', SUPPLIER_NAME],
  ])
  po = {
    ...po,
    items: [purchaseOrderItemFromImport({ description: 'Sand', quantity: 2, unit: 'trip', unit_price: 25000 }, 0)],
  }

  assert.equal(po.supplier_id, SUPPLIER_ID)
  assert.equal(po.items.length, 1)
  assert.equal(validatePurchaseOrder(po, { requireNumber: false }).valid, true)
})

/* ------------------------------------------------------------------ */
/* Save payload carries the UUID; failures keep the form             */
/* ------------------------------------------------------------------ */

test('po supplier: the save payload contains the selected supplier UUID', () => {
  // Ten line items, mirroring the live report: all must survive.
  const items = Array.from({ length: 10 }, (_, index) => ({
    description: `Item ${index + 1}`,
    quantity: 3,
    unit: 'pcs',
    unit_cost: 1039830,
    line_total: 0,
    sort_order: index,
  }))
  let po = foldUpdates(selectableDraft(), [
    ['supplier_id', SUPPLIER_ID],
    ['supplier_name', SUPPLIER_NAME],
  ])
  po = { ...po, items }

  const prepared = withPurchaseOrderTotals(po)
  assert.equal(validatePurchaseOrder(prepared, { requireNumber: false }).valid, true)

  const payload = toPurchaseOrderRpcPayload(prepared)
  assert.equal(payload.supplier_id, SUPPLIER_ID)
  // The display snapshot is resolved server-side from the supplier row,
  // never claimed by the caller.
  assert.equal('supplier_name' in payload, false)

  const itemPayloads = toPurchaseOrderItemRpcPayloads(prepared.items ?? [])
  assert.equal(itemPayloads.length, 10)
  assert.deepEqual(itemPayloads.map((item) => item.sort_order), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  assert.equal(itemPayloads[0].unit_cost, 1039830)
})

test('po supplier: clearing the selection causes the expected refusal', () => {
  let po = foldUpdates(selectableDraft(), [
    ['supplier_id', SUPPLIER_ID],
    ['supplier_name', SUPPLIER_NAME],
  ])
  po = foldUpdates(po, [
    ['supplier_id', ''],
    ['supplier_name', ''],
  ])

  const result = validatePurchaseOrder(po, { requireNumber: false })
  assert.equal(result.valid, false)
  assert.match(result.errorDescription ?? '', /Choose the supplier/)
  assert.equal(result.field, 'supplier_id')

  // Re-selecting restores a valid document.
  po = foldUpdates(po, [
    ['supplier_id', SUPPLIER_ID],
    ['supplier_name', SUPPLIER_NAME],
  ])
  assert.equal(validatePurchaseOrder(po, { requireNumber: false }).valid, true)
})

test('po supplier: validation accepts any non-empty id; ownership stays server-side', () => {
  const po = foldUpdates(selectableDraft(), [
    ['supplier_id', 'not-a-uuid'],
    ['supplier_name', SUPPLIER_NAME],
  ])
  // Format and tenancy are enforced by the database and the save RPC,
  // not by dropping the document before it can be checked.
  assert.equal(validatePurchaseOrder(po, { requireNumber: false }).valid, true)
  assert.equal(toPurchaseOrderRpcPayload(withPurchaseOrderTotals(po)).supplier_id, 'not-a-uuid')
})

/* ------------------------------------------------------------------ */
/* Edit hydration preserves identity; validation never needs the name */
/* ------------------------------------------------------------------ */

test('po supplier: a persisted draft hydrates with its supplier identity intact', () => {
  const stored = {
    id: 'po-1',
    po_number: 'PO-000001',
    po_date: '2026-10-15',
    supplier_id: SUPPLIER_ID,
    supplier_name: SUPPLIER_NAME,
    status: 'draft',
    currency: 'NGN',
    subtotal: 100,
    discount: 0,
    vat: 0,
    extra_charges: [],
    calculation_inputs: {},
    notes: '',
    terms: '',
    archived_at: null,
  }
  const hydrated = toPurchaseOrder(stored)

  assert.equal(hydrated.supplier_id, SUPPLIER_ID)
  assert.equal(hydrated.supplier_name, SUPPLIER_NAME)
})

test('po supplier: validation keys on the UUID, never on the display name', () => {
  // An id without a name still validates: the name is display-only and
  // the snapshot is re-resolved server-side.
  const idOnly = { ...selectableDraft(), supplier_id: SUPPLIER_ID, supplier_name: '' }
  assert.equal(validatePurchaseOrder(idOnly, { requireNumber: false }).valid, true)
})

/* ------------------------------------------------------------------ */
/* Page wiring: functional updates (the actual repair)                */
/* ------------------------------------------------------------------ */

const root = process.cwd()
const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8')

test('po supplier: the form page applies header updates functionally', () => {
  const page = read('src/pages/PurchaseOrderFormPage.tsx')
  // The repair: each header update builds on current state, so the two
  // synchronous party-selection writes compose instead of clobbering.
  assert.match(page, /setPo\(\(current\) => applySharedHeaderUpdate\(current, field, value\)/)
  assert.equal(/const next = applySharedHeaderUpdate\(po, field, value\)/.test(page), false)
})

/* ------------------------------------------------------------------ */
/* Invoice and Quotation selector parity                              */
/* ------------------------------------------------------------------ */

test('po supplier: invoice and quotation client selectors are unchanged', () => {
  const clientSelector = read('src/components/ClientSelector.tsx')
  assert.match(clientSelector, /onClientChange/)
  assert.equal(/supplier/i.test(clientSelector), false)

  const partyAdapter = read('src/components/document/ClientPartySelector.tsx')
  assert.match(partyAdapter, /clientId=\{partyId\}/)
  assert.match(partyAdapter, /onClientChange=\{\(id, name\) => onPartyChange\(id, name\)\}/)
  // No supplier wiring: no supplier props, ids, or table reads.
  for (const wiring of ['supplierId', 'supplierName', 'onSupplierChange', 'supplier_id', 'from(\'suppliers\')', 'from("suppliers")']) {
    assert.equal(partyAdapter.includes(wiring), false, `ClientPartySelector must not contain ${wiring}`)
  }
})

/* ------------------------------------------------------------------ */
/* Mobile toast correction is scoped                                  */
/* ------------------------------------------------------------------ */

test('po supplier: long toast titles wrap without redesigning notifications', () => {
  const css = read('src/styles/formTheme.css')
  assert.match(css, /\.bd-goey-toast \.gooey-title \{\s*\n?\s*white-space: normal;/)
  assert.match(css, /\.bd-goey-toast \.gooey-closeButton \{[^}]*flex-shrink: 0;/)
})
