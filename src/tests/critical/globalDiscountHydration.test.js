import test from 'node:test'
import assert from 'node:assert/strict'

import { computeDocument } from '../../lib/Calculations.ts'
import {
  buildCalculationInputs,
  inferLegacyCalculationState,
} from '../../domain/invoice/calculations.ts'
import { healLegacyCalculationOverrides } from '../../domain/invoice/normalize.ts'

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

// ─────────────────────────────────────────────────────────────────────────────
// Legacy healing — the missing invoice step that the quotation hydration has
// ─────────────────────────────────────────────────────────────────────────────

function legacyItem(overrides = {}) {
  return {
    id: null,
    item_id: null,
    description: 'A',
    quantity: 1,
    unit_price: 100000,
    amount: 100000,
    install_rate: null,
    install_rate_override: false,
    vat_rate: 0,
    discount_rate: 0,
    row_type: 'standard',
    group_id: null,
    group_name: '',
    sort_order: 0,
    image_url: null,
    custom_data: {},
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

// TEST 7 — The helper mirrors the quotation hydration.
// Without saved calculation inputs, explicit 0 is healed to null. With saved
// calculation inputs and no persisted global discount, explicit 0 stays a
// deliberate zero override. With a persisted non-zero global discount, 0 is
// the Aug 2026 RPC corruption signature and heals to null.
test('healLegacyCalculationOverrides heals corrupted 0 and keeps deliberate 0', () => {
  // Legacy document (no calculationInputs): heal vat and discount.
  const healed = healLegacyCalculationOverrides(legacyItem(), false)
  assert.equal(healed.vat_rate, null)
  assert.equal(healed.discount_rate, null)

  // Document with calculationInputs and NO global discount: keep explicit 0.
  const kept = healLegacyCalculationOverrides(legacyItem(), true, 0)
  assert.equal(kept.vat_rate, 0)
  assert.equal(kept.discount_rate, 0)

  // Document with a persisted global discount: 0 rows heal to inherit.
  const corrupted = healLegacyCalculationOverrides(legacyItem(), true, 24918.66)
  assert.equal(corrupted.discount_rate, null)
  assert.equal(corrupted.vat_rate, 0) // vat was never corrupted by the RPC

  const nonZero = healLegacyCalculationOverrides(legacyItem({ vat_rate: 7.5, discount_rate: 5 }), false)
  assert.equal(nonZero.vat_rate, 7.5)
  assert.equal(nonZero.discount_rate, 5)

  const nulls = healLegacyCalculationOverrides(legacyItem({ vat_rate: null, discount_rate: null }), false)
  assert.equal(nulls.vat_rate, null)
  assert.equal(nulls.discount_rate, null)
})

// TEST 8 — End-to-end legacy scenario.
// A legacy invoice (no persisted calculationInputs) with rows stored as 0 must
// hydrate the global discount and apply it, exactly like the quotation path.
test('legacy invoice rows heal to inherit and the global discount applies', () => {
  const rawItems = [legacyItem()]
  const hasSavedCalculationInputs = false
  const loadedItems = rawItems.map((item) =>
    healLegacyCalculationOverrides(item, hasSavedCalculationInputs),
  )

  // Legacy documents store discountType at the top level of custom_fields.
  const state = inferLegacyCalculationState({
    invoice: { discount: 10000, vat: 7.5, wht: 0 },
    items: loadedItems,
    customFields: { discountType: 'fixed', discountTiming: 'before' },
  })

  assert.equal(state.useGlobalDiscountInput, true)
  assert.equal(state.editableInputs.discountValue, 10000)

  const result = computeDocument({
    items: loadedItems,
    columns: [{ key: 'discount_rate', visibilityMode: 'hide_display' }],
    document: { discount: 10000, vat: 7.5, wht: 0 },
    cf: { extraCharges: [], calculationInputs: state.calculationInputs },
  })

  // Row heals to NULL, inherits the fixed 10000 discount.
  assert.equal(result.discount, 10000)
  assert.equal(result.items[0].inherits_global_discount, true)
})

// TEST 9 — The healed legacy row is written back as NULL on the next save.
// The save serializer must persist NULL (inherit) so the corruption does not
// re-occur. toDbItem already does this; assert the contract.
test('healed rows serialize back as NULL discount_rate', () => {
  const healed = healLegacyCalculationOverrides(legacyItem(), false)
  const dbRow = {
    ...healed,
    discount_rate: healed.discount_rate ?? null,
  }
  assert.equal(dbRow.discount_rate, null)
})

// TEST 10 — SASINV079-profile end to end.
// An invoice WITH persisted calculationInputs and a fixed global discount,
// whose rows were corrupted to 0 by the Aug 2026 RPC COALESCE, must now
// hydrate the global discount and apply it to the total.
test('corrupted RPC rows heal and the persisted fixed global discount applies', () => {
  const rawItems = [legacyItem({ quantity: 2, unit_price: 635680 })]
  const hasSavedCalculationInputs = true
  const persistedGlobalDiscount = 24918.66
  const loadedItems = rawItems.map((item) =>
    healLegacyCalculationOverrides(item, hasSavedCalculationInputs, persistedGlobalDiscount),
  )

  const state = inferLegacyCalculationState({
    invoice: { discount: 0, vat: 7.5, wht: 0 },
    items: loadedItems,
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

  assert.equal(state.editableInputs.discountValue, 24918.66)
  assert.equal(loadedItems[0].discount_rate, null)

  const calculationInputs = buildCalculationInputs({
    invoice: { discount: 30000, vat: 7.5, wht: 0 },
    discountType: state.calculationInputs.discountType,
    discountTiming: state.calculationInputs.discountTiming,
    whtType: state.calculationInputs.whtType,
  })

  const result = computeDocument({
    items: loadedItems,
    columns: [{ key: 'discount_rate', visibilityMode: 'hide_display' }],
    document: { discount: 30000, vat: 7.5, wht: 0 },
    cf: { extraCharges: [], calculationInputs },
  })

  // The typed 30000 global discount now changes the total.
  assert.equal(result.discount, 30000)
  assert.equal(result.items[0].inherits_global_discount, true)
})
