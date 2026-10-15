import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PURCHASE_ORDER_DEFAULT_CURRENCY,
  PURCHASE_ORDER_STATUSES,
  createEmptyPurchaseOrder,
  createEmptyPurchaseOrderItem,
  isPurchaseOrderStatus,
  parsePurchaseOrderCalculationInputs,
  parsePurchaseOrderExtraCharges,
  toPurchaseOrder,
} from '../../domain/purchase-order/types.ts'
import {
  PURCHASE_ORDER_TRANSITIONS,
  allowedPurchaseOrderTransitions,
  assertPurchaseOrderTransition,
  canTransitionPurchaseOrder,
  isActivePurchaseOrderStatus,
  isTerminalPurchaseOrderStatus,
  nextPurchaseOrderStatuses,
} from '../../domain/purchase-order/status.ts'
import { isIsoCalendarDate, validatePurchaseOrder } from '../../domain/purchase-order/validation.ts'
import {
  PURCHASE_ORDER_DEFAULT_PREFIX,
  PURCHASE_ORDER_PREFIX_KEY,
  formatPurchaseOrderNumber,
  getNextPurchaseOrderNumber,
  isAutomaticPurchaseOrderNumber,
  purchaseOrderNumberFamily,
  resolvePurchaseOrderPrefix,
} from '../../domain/purchase-order/numbering.ts'
import { toPurchaseOrderRpcPayload, toPurchaseOrderItemRpcPayloads } from '../../domain/purchase-order/normalize.ts'

/* ------------------------------------------------------------------ */
/* Status vocabulary                                                  */
/* ------------------------------------------------------------------ */

test('po: status vocabulary is exactly the four independent procurement states', () => {
  assert.deepEqual([...PURCHASE_ORDER_STATUSES], ['draft', 'issued', 'cancelled', 'closed'])

  // Fulfilment and settlement states are deliberately absent: a PO is a
  // commitment, not a fulfilment or a payment record.
  for (const forbidden of ['partially_received', 'received', 'partially_paid', 'paid']) {
    assert.equal(isPurchaseOrderStatus(forbidden), false, `${forbidden} must not be a PO status`)
  }
  assert.equal(isPurchaseOrderStatus('draft'), true)
})

/* ------------------------------------------------------------------ */
/* Lifecycle                                                          */
/* ------------------------------------------------------------------ */

test('po: lifecycle permits exactly the documented transitions', () => {
  assert.deepEqual([...allowedPurchaseOrderTransitions('draft')], ['draft', 'issued', 'cancelled'])
  assert.deepEqual([...allowedPurchaseOrderTransitions('issued')], ['issued', 'cancelled', 'closed'])
  assert.deepEqual([...allowedPurchaseOrderTransitions('cancelled')], ['cancelled'])
  assert.deepEqual([...allowedPurchaseOrderTransitions('closed')], ['closed'])

  // A self-transition is a normal content edit.
  assert.equal(canTransitionPurchaseOrder('draft', 'draft'), true)

  // Forward edges.
  assert.equal(canTransitionPurchaseOrder('draft', 'issued'), true)
  assert.equal(canTransitionPurchaseOrder('issued', 'closed'), true)

  // No skipping: a draft is issued before it is closed.
  assert.equal(canTransitionPurchaseOrder('draft', 'closed'), false)

  // An issued order is never edited back into a draft.
  assert.equal(canTransitionPurchaseOrder('issued', 'draft'), false)

  // Unknown statuses are refused rather than thrown.
  assert.equal(canTransitionPurchaseOrder('archived', 'draft'), false)
  assert.equal(canTransitionPurchaseOrder('draft', 'paid'), false)
})

test('po: terminal statuses cannot be silently reactivated or reopened', () => {
  assert.equal(isTerminalPurchaseOrderStatus('cancelled'), true)
  assert.equal(isTerminalPurchaseOrderStatus('closed'), true)
  assert.equal(isTerminalPurchaseOrderStatus('draft'), false)
  assert.equal(isTerminalPurchaseOrderStatus('issued'), false)

  assert.equal(isActivePurchaseOrderStatus('draft'), true)
  assert.equal(isActivePurchaseOrderStatus('issued'), true)
  assert.equal(isActivePurchaseOrderStatus('cancelled'), false)
  assert.equal(isActivePurchaseOrderStatus('closed'), false)

  for (const terminal of ['cancelled', 'closed']) {
    for (const target of ['draft', 'issued', 'closed', 'cancelled']) {
      if (target === terminal) continue
      assert.equal(
        canTransitionPurchaseOrder(terminal, target),
        false,
        `${terminal} -> ${target} must be refused`,
      )
      const result = assertPurchaseOrderTransition(terminal, target)
      assert.equal(result.valid, false)
      assert.match(result.errorDescription, /final and cannot be changed/)
    }
  }
})

test('po: transition guard explains a refused change', () => {
  assert.deepEqual(assertPurchaseOrderTransition('draft', 'issued'), { valid: true })

  const skipped = assertPurchaseOrderTransition('draft', 'closed')
  assert.equal(skipped.valid, false)
  assert.equal(skipped.error, 'Illegal status change')
  assert.match(skipped.errorDescription, /cannot move from draft to closed/)

  // Every status appears in its own transition list, so no status is orphaned.
  for (const status of PURCHASE_ORDER_STATUSES) {
    assert.ok(
      PURCHASE_ORDER_TRANSITIONS[status].includes(status),
      `${status} must be reachable from itself`,
    )
  }

  assert.deepEqual(nextPurchaseOrderStatuses('draft'), ['issued', 'cancelled'])
  assert.deepEqual(nextPurchaseOrderStatuses('cancelled'), [])
})

/* ------------------------------------------------------------------ */
/* Validation                                                         */
/* ------------------------------------------------------------------ */

function validDraft(overrides = {}) {
  return createEmptyPurchaseOrder({
    po_number: 'PO-000001',
    supplier_id: 'supplier-1',
    items: [createEmptyPurchaseOrderItem(0)],
    ...overrides,
  })
}

test('po: a well-formed draft validates', () => {
  const draft = validDraft()
  draft.items[0].description = 'Cement 50kg'
  draft.items[0].quantity = 20
  draft.items[0].unit_cost = 7500

  assert.deepEqual(validatePurchaseOrder(draft), { valid: true })
})

test('po: a supplier is required and the refusal names the field', () => {
  const draft = validDraft({ supplier_id: '' })
  draft.items[0].description = 'Cement'

  const result = validatePurchaseOrder(draft)
  assert.equal(result.valid, false)
  assert.equal(result.field, 'supplier_id')
  assert.match(result.errorDescription, /Choose the supplier/)
})

test('po: a number is required only when the caller supplies none', () => {
  const draft = validDraft({ po_number: '' })
  draft.items[0].description = 'Cement'

  assert.equal(validatePurchaseOrder(draft, { requireNumber: true }).valid, false)
  assert.equal(validatePurchaseOrder(draft, { requireNumber: true }).field, 'po_number')

  // On update the number is immutable identity and is not part of the payload,
  // so its absence is not a validation fault.
  assert.equal(validatePurchaseOrder(draft, { requireNumber: false }).valid, true)
})

test('po: dates are real calendar days, not merely well-shaped strings', () => {
  assert.equal(isIsoCalendarDate('2026-10-15'), true)
  assert.equal(isIsoCalendarDate('2024-02-29'), true)

  assert.equal(isIsoCalendarDate('2026-02-31'), false)
  assert.equal(isIsoCalendarDate('2025-02-29'), false)
  assert.equal(isIsoCalendarDate('15/10/2026'), false)
  assert.equal(isIsoCalendarDate('2026-1-5'), false)

  const bad = validDraft({ po_date: '2026-02-31' })
  bad.items[0].description = 'Cement'
  const result = validatePurchaseOrder(bad)
  assert.equal(result.valid, false)
  assert.equal(result.field, 'po_date')
})

test('po: negative amounts and quantities are rejected', () => {
  const negativeTotal = validDraft({ total: -1 })
  negativeTotal.items[0].description = 'Cement'
  assert.equal(validatePurchaseOrder(negativeTotal).field, 'total')

  const negativeQuantity = validDraft()
  negativeQuantity.items[0].description = 'Cement'
  negativeQuantity.items[0].quantity = -5
  const quantityResult = validatePurchaseOrder(negativeQuantity)
  assert.equal(quantityResult.valid, false)
  assert.equal(quantityResult.rowIndex, 0)

  const negativeCost = validDraft()
  negativeCost.items[0].description = 'Cement'
  negativeCost.items[0].unit_cost = -1
  const costResult = validatePurchaseOrder(negativeCost)
  assert.equal(costResult.valid, false)
  assert.match(costResult.errorDescription, /unit cost/)

  const notANumber = validDraft({ subtotal: Number.NaN })
  notANumber.items[0].description = 'Cement'
  assert.equal(validatePurchaseOrder(notANumber).field, 'subtotal')
})

test('po: at least one described line is required', () => {
  const empty = createEmptyPurchaseOrder({ po_number: 'PO-000002', supplier_id: 'supplier-1' })
  empty.items = []
  const result = validatePurchaseOrder(empty)
  assert.equal(result.valid, false)
  assert.match(result.errorDescription, /Add at least one item/)

  // Every line needs a description, matching the invoice save convention. A
  // blank trailing row is refused rather than silently dropped.
  const withBlankTrailer = validDraft()
  withBlankTrailer.items = [
    { ...createEmptyPurchaseOrderItem(0), description: 'Cement', quantity: 2, unit_cost: 100 },
    createEmptyPurchaseOrderItem(1),
  ]
  const trailerResult = validatePurchaseOrder(withBlankTrailer)
  assert.equal(trailerResult.valid, false)
  assert.equal(trailerResult.rowIndex, 1)
  assert.match(trailerResult.errorDescription, /Item 2 needs a description/)

  // When nothing at all is described, the document-level message is the
  // useful one, even if a row happens to carry a quantity.
  const dataNoDescription = validDraft()
  dataNoDescription.items = [
    { ...createEmptyPurchaseOrderItem(0), description: '', quantity: 3, unit_cost: 10 },
  ]
  const documentResult = validatePurchaseOrder(dataNoDescription)
  assert.equal(documentResult.valid, false)
  assert.equal(documentResult.field, 'items')
  assert.match(documentResult.errorDescription, /Add at least one item/)

  // Once at least one line is described, an undescribed row is a row fault and
  // the refusal names it.
  const mixed = validDraft()
  mixed.items = [
    { ...createEmptyPurchaseOrderItem(0), description: 'Cement', quantity: 2, unit_cost: 100 },
    { ...createEmptyPurchaseOrderItem(1), description: '', quantity: 3, unit_cost: 10 },
  ]
  const rowResult = validatePurchaseOrder(mixed)
  assert.equal(rowResult.valid, false)
  assert.equal(rowResult.rowIndex, 1)
  assert.match(rowResult.errorDescription, /Item 2 needs a description/)

  // A single described line is the minimum valid document.
  const oneLine = validDraft()
  oneLine.items = [{ ...createEmptyPurchaseOrderItem(0), description: 'Cement', quantity: 2, unit_cost: 100 }]
  assert.equal(validatePurchaseOrder(oneLine).valid, true)
})

test('po: an unknown status is refused', () => {
  const draft = validDraft({ status: 'received' })
  draft.items[0].description = 'Cement'
  const result = validatePurchaseOrder(draft)
  assert.equal(result.valid, false)
  assert.equal(result.field, 'status')
})

/* ------------------------------------------------------------------ */
/* Parsing and factories                                              */
/* ------------------------------------------------------------------ */

test('po: extra charges keep their explicit VAT flag and drop unlabelled rows', () => {
  const charges = parsePurchaseOrderExtraCharges([
    { label: 'Delivery', value: 5000, withTax: true },
    { label: 'Handling', value: 2000, withTax: false },
    { label: '   ', value: 999, withTax: true },
  ])

  assert.deepEqual(charges, [
    { label: 'Delivery', value: 5000, withTax: true },
    { label: 'Handling', value: 2000, withTax: false },
  ])

  // A jsonb column may arrive as a raw string over the wire.
  assert.deepEqual(parsePurchaseOrderExtraCharges('[{"label":"Freight","value":10,"withTax":true}]'), [
    { label: 'Freight', value: 10, withTax: true },
  ])
  assert.deepEqual(parsePurchaseOrderExtraCharges(null), [])
  assert.deepEqual(parsePurchaseOrderExtraCharges('not json'), [])
})

test('po: calculation inputs default deterministically and accept a wire string', () => {
  assert.deepEqual(parsePurchaseOrderCalculationInputs(undefined), {
    vatPercent: 0,
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 0,
  })

  assert.deepEqual(
    parsePurchaseOrderCalculationInputs({
      vatPercent: 7.5,
      discountType: 'fixed',
      discountTiming: 'after_tax',
      discountValue: 1000,
    }),
    { vatPercent: 7.5, discountType: 'fixed', discountTiming: 'after_tax', discountValue: 1000 },
  )

  // Unknown enum members fall back to the neutral default rather than through.
  const coerced = parsePurchaseOrderCalculationInputs({ discountType: 'bogus', discountTiming: 'bogus' })
  assert.equal(coerced.discountType, 'percent')
  assert.equal(coerced.discountTiming, 'before_tax')
})

test('po: a tenant row converts into the domain shape', () => {
  const po = toPurchaseOrder({
    id: 'po-1',
    po_number: 'PO-000003',
    po_date: '2026-10-15',
    supplier_id: 'supplier-9',
    supplier_name: 'Frozen Name Ltd',
    status: 'issued',
    currency: '',
    subtotal: 100,
    discount: 0,
    vat: 7.5,
    total: 107.5,
    extra_charges: [],
    calculation_inputs: {},
    notes: null,
    terms: null,
  })

  assert.equal(po.currency, PURCHASE_ORDER_DEFAULT_CURRENCY)
  assert.equal(po.status, 'issued')
  assert.deepEqual(po.extra_charges, [])
  assert.equal(po.calculation_inputs.vatPercent, 0)

  // A corrupt status must not reach the domain as an unknown value.
  const corrupt = toPurchaseOrder({ ...po, status: 'received' })
  assert.equal(corrupt.status, 'draft')
})

test('po: a new draft starts blank with no guessed number', () => {
  const draft = createEmptyPurchaseOrder()

  assert.equal(draft.po_number, '')
  assert.equal(draft.supplier_id, '')
  assert.equal(draft.status, 'draft')
  assert.equal(draft.currency, PURCHASE_ORDER_DEFAULT_CURRENCY)
  assert.equal(draft.total, 0)
  assert.equal(draft.items.length, 1)
  assert.match(draft.po_date, /^\d{4}-\d{2}-\d{2}$/)

  // No client identity exists anywhere in the PO contract.
  assert.equal('client_id' in draft, false)
  assert.equal('wht' in draft, false)
})

/* ------------------------------------------------------------------ */
/* Numbering                                                          */
/* ------------------------------------------------------------------ */

test('po: numbering joins the shared authority with the PO key', () => {
  assert.equal(PURCHASE_ORDER_PREFIX_KEY, 'purchase_order')
  assert.equal(PURCHASE_ORDER_DEFAULT_PREFIX, 'PO')

  // Configured prefix wins; an invalid one falls back to the canonical default.
  assert.equal(resolvePurchaseOrderPrefix({ purchase_order: 'XPOR' }), 'XPOR')
  assert.equal(resolvePurchaseOrderPrefix({ purchase_order: 'lower' }), 'PO')
  assert.equal(resolvePurchaseOrderPrefix({ purchase_order: '' }), 'PO')
  assert.equal(resolvePurchaseOrderPrefix(null), 'PO')
  assert.equal(resolvePurchaseOrderPrefix({}), 'PO')

  assert.equal(purchaseOrderNumberFamily('PO'), 'PO-')
  assert.equal(formatPurchaseOrderNumber('PO', 1), 'PO-000001')
  assert.equal(formatPurchaseOrderNumber('XPOR', 114), 'XPOR-000114')
})

test('po: automatic numbering starts at one and skips every occupied number', () => {
  assert.equal(getNextPurchaseOrderNumber([], 'PO'), 'PO-000001')

  // With no stored cursor the scan bootstraps ABOVE the highest allocated
  // number, exactly like the invoice and RFQ generators. A manual 'PO-000005'
  // therefore raises the floor rather than being back-filled.
  const occupied = ['PO-000001', 'PO-000002', 'PO-000005'].map((po_number) => ({ po_number }))
  assert.equal(getNextPurchaseOrderNumber(occupied, 'PO'), 'PO-000006')

  // The skip-scan is what makes a fully occupied run safe: starting from a
  // cursor that points at an occupied number must land past the whole run.
  const contiguous = ['PO-000001', 'PO-000002', 'PO-000003'].map((po_number) => ({ po_number }))
  assert.equal(getNextPurchaseOrderNumber(contiguous, 'PO', 1), 'PO-000004')
  assert.equal(getNextPurchaseOrderNumber(contiguous, 'PO'), 'PO-000004')

  // A persisted automatic cursor is honoured.
  assert.equal(getNextPurchaseOrderNumber(occupied, 'PO', 7), 'PO-000007')

  // Numbers belonging to another prefix are not this family's occupancy.
  assert.equal(
    getNextPurchaseOrderNumber([{ po_number: 'INV-000009' }], 'PO'),
    'PO-000001',
  )

  // Legacy unpadded numbers are parsed, so a scan cannot re-issue them.
  assert.equal(getNextPurchaseOrderNumber([{ po_number: 'PO7' }], 'PO'), 'PO-000008')
})

test('po: automatic vs manual classification drives cursor movement', () => {
  assert.equal(isAutomaticPurchaseOrderNumber('PO-000001', 'PO'), true)
  assert.equal(isAutomaticPurchaseOrderNumber('PO-000114', 'PO'), true)

  // Anything else is manual, and a manual number must never advance the
  // automatic sequence.
  assert.equal(isAutomaticPurchaseOrderNumber('PO-7', 'PO'), false)
  assert.equal(isAutomaticPurchaseOrderNumber('SPECIAL-1', 'PO'), false)
  assert.equal(isAutomaticPurchaseOrderNumber('INV-000001', 'PO'), false)
  assert.equal(isAutomaticPurchaseOrderNumber('', 'PO'), false)
  assert.equal(isAutomaticPurchaseOrderNumber(null, 'PO'), false)
})

/* ------------------------------------------------------------------ */
/* Save payload                                                       */
/* ------------------------------------------------------------------ */

test('po: the save payload carries prepared totals and ordered lines', () => {
  const draft = validDraft({ id: 'po-1', subtotal: 150, vat: 11.25, total: 161.25 })
  draft.items = [
    { ...createEmptyPurchaseOrderItem(0), description: 'Cement', quantity: 20, unit_cost: 7.5 },
    { ...createEmptyPurchaseOrderItem(0), description: 'Sand', quantity: 1, unit_cost: 0, unit: 'trip' },
  ]
  draft.extra_charges = [{ label: 'Delivery', value: 5000, withTax: true }]

  const payload = toPurchaseOrderRpcPayload(draft)
  assert.equal(payload.po_number, 'PO-000001')
  assert.equal(payload.supplier_id, 'supplier-1')
  assert.equal(payload.subtotal, 150)
  assert.equal(payload.total, 161.25)
  assert.deepEqual(payload.calculation_inputs, {
    vatPercent: 0,
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 0,
  })
  assert.deepEqual(payload.extra_charges, [{ label: 'Delivery', value: 5000, withTax: true }])

  // supplier_name is never sent: the RPC resolves the snapshot from the
  // supplier row, so a caller cannot claim a name it does not own.
  assert.equal('supplier_name' in payload, false)

  // Line order is taken from the presented order, not from the stored value.
  const items = toPurchaseOrderItemRpcPayloads(draft.items)
  assert.deepEqual(items.map((item) => item.sort_order), [0, 1])
  assert.deepEqual(items.map((item) => item.description), ['Cement', 'Sand'])
  assert.equal(items[1].unit, 'trip')
  assert.equal(items[1].unit_cost, 0)
})
