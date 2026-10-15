import test from 'node:test'
import assert from 'node:assert/strict'

import { computeDocument } from '../../lib/Calculations.ts'
import {
  PURCHASE_ORDER_COLUMNS,
  buildPurchaseOrderRawInput,
  computePurchaseOrderTotals,
  withPurchaseOrderTotals,
} from '../../domain/purchase-order/calculations.ts'
import { createEmptyPurchaseOrder, createEmptyPurchaseOrderItem } from '../../domain/purchase-order/types.ts'

/**
 * Every assertion below is a CONTRACT CHECK on the canonical engine's output.
 * None of these numbers is computed by the adapter: the adapter defines no
 * arithmetic at all, so a regression here means the engine changed, not the
 * adapter.
 */
function close(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message ?? 'value'}: expected ${expected}, received ${actual}`,
  )
}

function poWith({ items, inputs = {}, extraCharges = [] }) {
  const po = createEmptyPurchaseOrder({ po_number: 'PO-000001', supplier_id: 'supplier-1' })
  po.items = items.map((item, index) => ({ ...createEmptyPurchaseOrderItem(index), ...item }))
  po.calculation_inputs = {
    vatPercent: 0,
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 0,
    ...inputs,
  }
  po.extra_charges = extraCharges
  return po
}

test('po calc: a line amount is quantity x unit_cost, in source order', () => {
  const po = poWith({
    items: [
      { description: 'Cement 50kg', quantity: 20, unit_cost: 7500 },
      { description: 'Sand', quantity: 3, unit: 'trip', unit_cost: 45000 },
      { description: 'Labour', quantity: 2.5, unit_cost: 1000 },
    ],
  })

  const { totals, lineTotals, result } = computePurchaseOrderTotals(po)

  assert.deepEqual(lineTotals, [150000, 135000, 2500])
  close(totals.subtotal, 287500, 'subtotal')
  close(totals.vat, 0, 'vat')
  close(totals.total, 287500, 'total')

  // Line order is preserved positionally, so a duplicated or absent id cannot
  // misalign the amounts.
  assert.equal(result.items.length, 3)
  assert.deepEqual(result.items.map((row) => row.description), [
    'Cement 50kg',
    'Sand',
    'Labour',
  ])
})

test('po calc: a purchase order never carries an install or workmanship component', () => {
  // `install_rate` is force-hidden, so the engine nulls the field outright.
  // This is what a procurement document needs: no workmanship leg at all.
  const po = poWith({ items: [{ description: 'Cement', quantity: 10, unit_cost: 1000 }] })
  po.items[0].install_rate = 99999
  po.items[0].install_rate_taxable = true

  const { totals, result } = computePurchaseOrderTotals(po)

  close(result.installRateTotal, 0, 'installRateTotal')
  close(totals.total, 10000, 'total')
  close(result.items[0].line_install, 0, 'line install')
  close(result.items[0].line_total, 10000, 'line total')

  assert.deepEqual([...PURCHASE_ORDER_COLUMNS], [
    { key: 'install_rate', visibilityMode: 'hide_full' },
    { key: 'vat_rate', visibilityMode: 'show' },
    { key: 'discount_rate', visibilityMode: 'show' },
  ])
})

test('po calc: VAT comes from the engine rate, not from a stored total', () => {
  const po = poWith({
    items: [{ description: 'Cement', quantity: 20, unit_cost: 7500 }],
    inputs: { vatPercent: 7.5 },
  })

  const { totals, result } = computePurchaseOrderTotals(po)

  assert.equal(result.wht, 0, 'WHT is out of scope and must be zero')
  close(result.taxableBase, 150000, 'taxable base')
  close(totals.vat, 11250, 'vat')
  close(totals.total, 161250, 'total')
})

test('po calc: stored totals are never read as rate inputs', () => {
  // The engine must read RATES. A corrupted stored total on the header must not
  // be able to change the computed result.
  const clean = poWith({
    items: [{ description: 'Cement', quantity: 20, unit_cost: 7500 }],
    inputs: { vatPercent: 7.5 },
  })
  const corrupted = {
    ...clean,
    subtotal: 999999,
    vat: 888888,
    discount: 777777,
    total: 666666,
  }

  const expected = computePurchaseOrderTotals(clean)
  const actual = computePurchaseOrderTotals(corrupted)

  close(actual.totals.subtotal, expected.totals.subtotal, 'subtotal')
  close(actual.totals.vat, expected.totals.vat, 'vat')
  close(actual.totals.total, expected.totals.total, 'total')
})

test('po calc: a percent discount applies before tax and reduces the VAT base', () => {
  const po = poWith({
    items: [{ description: 'Cement', quantity: 20, unit_cost: 7500 }],
    inputs: { vatPercent: 7.5, discountType: 'percent', discountTiming: 'before_tax', discountValue: 10 },
  })

  const { totals, result } = computePurchaseOrderTotals(po)

  close(totals.discount, 15000, 'discount')
  // VAT is charged on the reduced base, not on the gross subtotal.
  close(result.taxableBase, 135000, 'taxable base')
  close(totals.vat, 10125, 'vat')
  close(totals.total, 145125, 'total')
})

test('po calc: a fixed before-tax discount distributes across the eligible base', () => {
  const po = poWith({
    items: [{ description: 'Cement', quantity: 20, unit_cost: 7500 }],
    inputs: { vatPercent: 7.5, discountType: 'fixed', discountTiming: 'before_tax', discountValue: 15000 },
  })

  const { totals, result } = computePurchaseOrderTotals(po)

  // A fixed 15000 before-tax discount is equivalent to 10% of the 150000 base.
  close(totals.discount, 15000, 'discount')
  close(result.taxableBase, 135000, 'taxable base')
  close(totals.vat, 10125, 'vat')
  close(totals.total, 145125, 'total')
})

test('po calc: an extra charge is taxed only when it sets its own explicit flag', () => {
  // The VAT base of an extra charge is NEVER inferred: it is read from the
  // per-charge flag the user set.
  const taxable = poWith({
    items: [{ description: 'Cement', quantity: 20, unit_cost: 7500 }],
    inputs: { vatPercent: 7.5 },
    extraCharges: [{ label: 'Delivery', value: 5000, withTax: true }],
  })
  const taxableResult = computePurchaseOrderTotals(taxable)

  close(taxableResult.totals.extraChargesTotal, 5000, 'extra charges total')
  close(taxableResult.result.taxableBase, 155000, 'taxable base includes the charge')
  close(taxableResult.totals.vat, 11625, 'vat')
  close(taxableResult.totals.total, 166625, 'total')

  const exempt = poWith({
    items: [{ description: 'Cement', quantity: 20, unit_cost: 7500 }],
    inputs: { vatPercent: 7.5 },
    extraCharges: [{ label: 'Delivery', value: 5000, withTax: false }],
  })
  const exemptResult = computePurchaseOrderTotals(exempt)

  close(exemptResult.totals.extraChargesTotal, 5000, 'extra charges total')
  close(exemptResult.result.taxableBase, 150000, 'taxable base excludes the charge')
  close(exemptResult.totals.vat, 11250, 'vat')
  close(exemptResult.totals.total, 166250, 'total')
})

test('po calc: the committed total is the engine grand total', () => {
  const po = poWith({
    items: [
      { description: 'Cement', quantity: 20, unit_cost: 7500 },
      { description: 'Sand', quantity: 3, unit_cost: 45000 },
    ],
    inputs: { vatPercent: 7.5, discountType: 'fixed', discountTiming: 'before_tax', discountValue: 20000 },
    extraCharges: [{ label: 'Delivery', value: 5000, withTax: true }],
  })

  const { totals, result } = computePurchaseOrderTotals(po)

  // WHT is out of scope, so the two engine totals coincide exactly.
  close(result.wht, 0, 'wht')
  close(result.grandTotal, result.totalPayable, 'grandTotal vs totalPayable')
  close(totals.total, result.grandTotal, 'committed total')

  // subtotal + extra charges - discount + VAT
  close(
    totals.total,
    totals.subtotal + totals.extraChargesTotal - totals.discount + totals.vat,
    'total identity',
  )
})

test('po calc: prepared totals land on the document without mutating it', () => {
  const po = poWith({
    items: [
      { description: 'Cement', quantity: 20, unit_cost: 7500 },
      { description: 'Sand', quantity: 3, unit_cost: 45000 },
    ],
    inputs: { vatPercent: 7.5 },
  })
  const before = JSON.parse(JSON.stringify({ ...po, items: po.items }))

  const applied = withPurchaseOrderTotals(po)

  // 20 x 7500 = 150000, 3 x 45000 = 135000, subtotal 285000.
  close(applied.subtotal, 285000, 'subtotal')
  close(applied.vat, 21375, 'vat')
  close(applied.total, 306375, 'total')

  // Line amounts are written back in order, and the line order is preserved by
  // sort_order rather than trusted from the input.
  assert.deepEqual(applied.items.map((item) => item.line_total), [150000, 135000])
  assert.deepEqual(applied.items.map((item) => item.sort_order), [0, 1])

  // The input is untouched: the helper is pure.
  assert.deepEqual(JSON.parse(JSON.stringify({ ...po, items: po.items })), before)
})

test('po calc: the prepared engine input never reads a stored document total', () => {
  const po = poWith({
    items: [{ description: 'Cement', quantity: 20, unit_cost: 7500 }],
    inputs: { vatPercent: 7.5, discountType: 'fixed', discountTiming: 'before_tax', discountValue: 15000 },
  })
  po.subtotal = 123456
  po.vat = 234567
  po.discount = 345678

  const raw = buildPurchaseOrderRawInput(po)

  // An empty `document` is what guarantees no stored total can be read as a rate.
  assert.deepEqual(raw.document, {})
  assert.equal(raw.cf.calculationInputs.vatPercent, 7.5)
  assert.equal(raw.cf.calculationInputs.discountValue, 15000)

  // `unit_cost` occupies the engine's price slot. There is no `unit_price` on a
  // purchase order at all, so a procurement cost can never be mistaken for one.
  assert.equal(raw.items[0].unit_price, 7500)
  assert.equal('unit_price' in po.items[0], false)

  // The adapter output is exactly the canonical engine's output for that input:
  // feeding the prepared input straight to `computeDocument` reproduces it.
  const direct = computeDocument(raw)
  const viaAdapter = computePurchaseOrderTotals(po)
  close(viaAdapter.totals.total, direct.grandTotal, 'adapter vs engine')
})
