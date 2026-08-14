import test from 'node:test'
import assert from 'node:assert/strict'

import { computeDocument } from '../../lib/Calculations.ts'
import {
  buildCalculationInputs,
  inferLegacyCalculationState,
} from '../../domain/invoice/calculations.ts'

function calcInputs(overrides = {}) {
  return {
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 10,
    vatPercent: 0,
    whtType: 'percent',
    whtValue: 0,
    ...overrides,
  }
}

// TEST 1 — Global discount + hidden row-level discount column.
// NULL item discount_rate must inherit the global discount even when the
// discount column is hidden (hide_display). Column Manager must not be a
// global-discount switch.
test('global discount applies with the discount column hidden (hide_display)', () => {
  const result = computeDocument({
    items: [
      {
        description: 'A',
        quantity: 1,
        unit_price: 1000,
        install_rate: null,
        install_rate_taxable: false,
        vat_rate: null,
        discount_rate: null,
      },
    ],
    document: {},
    cf: { calculationInputs: calcInputs() },
    columns: [{ key: 'discount_rate', visibilityMode: 'hide_display' }],
  })

  assert.equal(result.discount, 100)
  assert.equal(result.totalPayable, 900)
})

// TEST 2 — Global discount + visible row-level column.
// NULL item discount_rate still inherits the global discount when the column
// is visible. Visibility must not change the calculation.
test('global discount applies with the discount column visible (show)', () => {
  const result = computeDocument({
    items: [
      {
        description: 'A',
        quantity: 1,
        unit_price: 1000,
        install_rate: null,
        install_rate_taxable: false,
        vat_rate: null,
        discount_rate: null,
      },
    ],
    document: {},
    cf: { calculationInputs: calcInputs() },
    columns: [{ key: 'discount_rate', visibilityMode: 'show' }],
  })

  assert.equal(result.discount, 100)
  assert.equal(result.totalPayable, 900)
})

// TEST 3 — Explicit row-level override.
// A row with an explicit discount_rate uses its own rate. NULL rows continue
// to inherit the global discount.
test('explicit row override coexists with NULL rows inheriting the global discount', () => {
  const result = computeDocument({
    items: [
      {
        description: 'A',
        quantity: 1,
        unit_price: 1000,
        install_rate: null,
        install_rate_taxable: false,
        vat_rate: null,
        discount_rate: null,
      },
      {
        description: 'B',
        quantity: 1,
        unit_price: 1000,
        install_rate: null,
        install_rate_taxable: false,
        vat_rate: null,
        discount_rate: 5,
      },
    ],
    document: {},
    cf: { calculationInputs: calcInputs() },
    columns: [{ key: 'discount_rate', visibilityMode: 'show' }],
  })

  // Row A inherits 10% (100). Row B uses its explicit 5% (50).
  assert.equal(result.discount, 150)
})

// TEST 4 — Explicit zero override.
// discount_rate = 0 is an intentional 0% row override. It must not inherit the
// global discount and must not be converted to NULL by the pipeline.
test('explicit zero override stays zero and does not inherit the global discount', () => {
  const result = computeDocument({
    items: [
      {
        description: 'A',
        quantity: 1,
        unit_price: 1000,
        install_rate: null,
        install_rate_taxable: false,
        vat_rate: null,
        discount_rate: null,
      },
      {
        description: 'B',
        quantity: 1,
        unit_price: 1000,
        install_rate: null,
        install_rate_taxable: false,
        vat_rate: null,
        discount_rate: 0,
      },
    ],
    document: {},
    cf: { calculationInputs: calcInputs() },
    columns: [{ key: 'discount_rate', visibilityMode: 'show' }],
  })

  // Row A inherits 10% (100). Row B is an explicit zero override (0).
  assert.equal(result.discount, 100)
})

// TEST 5 — Edit hydration surfaces the persisted global discount.
// The edit form must hydrate the global discount from the persisted
// calculationInputs even when every row carries an explicit discount_rate.
// This is the regression: rows coerced to 0 by the old RPC must not hide the
// persisted global discount.
test('hydration surfaces persisted global discount when all rows carry explicit rates', () => {
  const state = inferLegacyCalculationState({
    invoice: { discount: 0, vat: 7.5, wht: 0 },
    items: [
      {
        row_type: 'standard',
        description: 'A',
        quantity: 2,
        unit_price: 100,
        discount_rate: 0,
        vat_rate: null,
      },
    ],
    customFields: {
      calculationInputs: {
        discountValue: 24918.66,
        discountType: 'fixed',
        discountTiming: 'before',
        vatPercent: 7.5,
        whtValue: 0,
        whtType: 'percent',
      },
    },
  })

  assert.equal(state.useGlobalDiscountInput, true)
  assert.equal(state.editableInputs.discountValue, 24918.66)
})

// TEST 5b — Legacy fallback heuristic is preserved.
// Without persisted calculation inputs, the row heuristic still applies:
// all-explicit rows mean no inferred global discount.
test('legacy fallback keeps the gate off for all-explicit rows without calculationInputs', () => {
  const state = inferLegacyCalculationState({
    invoice: { discount: 500, vat: 0, wht: 0 },
    items: [
      {
        row_type: 'standard',
        description: 'A',
        quantity: 1,
        unit_price: 100,
        discount_rate: 5,
        vat_rate: null,
      },
    ],
    customFields: {},
  })

  assert.equal(state.useGlobalDiscountInput, false)
  assert.equal(state.editableInputs.discountValue, 0)
})

// TEST 5c — Legacy fallback keeps the gate on for NULL rows.
test('legacy fallback keeps the gate on for NULL rows without calculationInputs', () => {
  const state = inferLegacyCalculationState({
    invoice: { discount: 100, vat: 0, wht: 0 },
    items: [
      {
        row_type: 'standard',
        description: 'A',
        quantity: 1,
        unit_price: 100,
        discount_rate: null,
        vat_rate: null,
      },
    ],
    customFields: {},
  })

  assert.equal(state.useGlobalDiscountInput, true)
})

// TEST 6 — Save path carries the edited global discount into calculationInputs.
// The typed global discount in the form state must reach the persisted
// calculationInputs.discountValue, independent of row-level inputs.
test('save calculationInputs carries the edited global discount value', () => {
  const calculationInputs = buildCalculationInputs({
    invoice: { discount: 12, vat: 7.5, wht: 0 },
    discountType: 'percent',
    discountTiming: 'before',
    whtType: 'percent',
  })

  assert.equal(calculationInputs.discountValue, 12)
})
