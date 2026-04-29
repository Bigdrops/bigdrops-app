import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveColumnBehavior } from '../../domain/invoice/columns.ts'
import { computeDocument } from '../../lib/Calculations.ts'

test('resolveColumnBehavior keeps hide_display out of form/view and preserves description', () => {
  const columns = [
    { key: 'description', label: 'Description', visibilityMode: 'hide_full' },
    { key: 'quantity', label: 'Quantity', visibilityMode: 'show' },
    { key: 'make', label: 'Make', visibilityMode: 'hide_display' },
  ]

  const formColumns = resolveColumnBehavior(columns, [], 'form')
  const viewColumns = resolveColumnBehavior(columns, [{ description: 'UPS', quantity: 1, make: 'APC', custom_data: {} }], 'view')

  assert.deepEqual(formColumns.map((column) => column.key), ['description', 'quantity'])
  assert.deepEqual(viewColumns.map((column) => column.key), ['description', 'quantity'])
})

test('computeDocument removes hide_full financial columns from totals while keeping hide_display in totals', () => {
  const hiddenDisplay = computeDocument({
    items: [
      {
        description: 'AC kit',
        quantity: 0,
        unit_price: 100,
        install_rate: 25,
        vat_rate: 10,
        discount_rate: 5,
      },
    ],
    document: {},
    cf: {
      calculationInputs: {
        discountType: 'percent',
        discountTiming: 'before_tax',
        discountValue: 0,
        vatPercent: 0,
        whtType: 'percent',
        whtValue: 0,
      },
    },
    columns: [
      { key: 'install_rate', visibilityMode: 'hide_display' },
      { key: 'vat_rate', visibilityMode: 'hide_display' },
      { key: 'discount_rate', visibilityMode: 'hide_display' },
    ],
  })

  const hiddenFully = computeDocument({
    items: [
      {
        description: 'AC kit',
        quantity: 0,
        unit_price: 100,
        install_rate: 25,
        vat_rate: 10,
        discount_rate: 5,
      },
    ],
    document: {},
    cf: {
      calculationInputs: {
        discountType: 'percent',
        discountTiming: 'before_tax',
        discountValue: 0,
        vatPercent: 0,
        whtType: 'percent',
        whtValue: 0,
      },
    },
    columns: [
      { key: 'install_rate', visibilityMode: 'hide_full' },
      { key: 'vat_rate', visibilityMode: 'hide_full' },
      { key: 'discount_rate', visibilityMode: 'hide_full' },
    ],
  })

  assert.equal(hiddenDisplay.subtotal, 100)
  assert.equal(hiddenDisplay.installRateTotal, 25)
  assert.equal(hiddenDisplay.discount, 5)
  assert.equal(hiddenDisplay.vat, 9.5)
  assert.equal(hiddenFully.subtotal, 100)
  assert.equal(hiddenFully.installRateTotal, 0)
  assert.equal(hiddenFully.discount, 0)
  assert.equal(hiddenFully.vat, 0)
})
