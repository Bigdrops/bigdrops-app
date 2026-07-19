import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateDocument,
  normalizeDocumentInput,
  computeDocument,
} from '../../lib/Calculations.ts'

function doc(items, overrides = {}) {
  return {
    items,
    globalVatPercent: overrides.vatPercent ?? 0,
    discountType: overrides.discountType ?? 'fixed',
    discountTiming: overrides.discountTiming ?? 'before_tax',
    discountValue: overrides.discountValue ?? 0,
    whtType: overrides.whtType ?? 'percent',
    whtValue: overrides.whtValue ?? 0,
    extraCharges: overrides.extraCharges ?? [],
    visibleRowEffects: overrides.visibleRowEffects ?? { install: true, vat: true, discount: true },
  }
}

function item(overrides = {}) {
  return {
    row_type: 'standard',
    quantity: overrides.quantity ?? 1,
    unit_price: overrides.unit_price ?? 100,
    install_rate: 'install_rate' in overrides ? overrides.install_rate : null,
    install_rate_taxable: overrides.install_rate_taxable ?? false,
    vat_rate: 'vat_rate' in overrides ? overrides.vat_rate : null,
    discount_rate: 'discount_rate' in overrides ? overrides.discount_rate : null,
    group_id: 'group_id' in overrides ? overrides.group_id : null,
    group_name: 'group_name' in overrides ? overrides.group_name : null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Block 1 — Basic: no discount, no VAT, simple items
// ─────────────────────────────────────────────────────────────────────────────

test('Block 1a: single standard item subtotal', () => {
  const result = calculateDocument(doc([item({ quantity: 2, unit_price: 500 })]))
  assert.equal(result.items.length, 1)
  assert.equal(result.subtotal, 1000)
  assert.equal(result.grandTotal, 1000)
  assert.equal(result.totalPayable, 1000)
  assert.equal(result.items[0].line_subtotal, 1000)
  assert.equal(result.items[0].line_total, 1000)
})

test('Block 1b: multiple items sum correctly', () => {
  const result = calculateDocument(doc([
    item({ quantity: 3, unit_price: 200 }),
    item({ quantity: 1, unit_price: 1500 }),
  ]))
  assert.equal(result.subtotal, 2100)
  assert.equal(result.grandTotal, 2100)
})

test('Block 1c: zero-quantity item yields zero subtotal', () => {
  const result = calculateDocument(doc([item({ quantity: 0, unit_price: 500 })]))
  assert.equal(result.subtotal, 0)
  assert.equal(result.items[0].line_subtotal, 0)
})

test('Block 1d: group_header row is skipped in totals', () => {
  const result = calculateDocument(doc([
    { row_type: 'group_header', group_id: 'g1', group_name: 'Section A', quantity: 0, unit_price: 0 },
    item({ quantity: 2, unit_price: 300 }),
  ]))
  assert.equal(result.items.length, 2)
  assert.equal(result.subtotal, 600)
  assert.equal(result.items[0].row_type, 'group_header')
  assert.equal(result.items[0].line_subtotal, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 2 — VAT calculations
// ─────────────────────────────────────────────────────────────────────────────

test('Block 2a: global VAT at 7.5 percent', () => {
  const result = calculateDocument(doc([item({ quantity: 2, unit_price: 1000 })], { vatPercent: 7.5 }))
  assert.equal(result.subtotal, 2000)
  assert.equal(result.vat, 150)
  assert.equal(result.taxableBase, 2000)
  assert.equal(result.grandTotal, 2150)
  assert.equal(result.totalPayable, 2150)
  assert.equal(result.items[0].effective_vat_rate, 7.5)
  assert.equal(result.items[0].line_vat_base, 2000)
  assert.equal(result.items[0].line_vat, 150)
})

test('Block 2b: row-level VAT override differs from global', () => {
  const result = calculateDocument(doc([
    item({ vat_rate: 10 }),
    item({ vat_rate: 5 }),
  ], { vatPercent: 7.5 }))
  assert.equal(result.items[0].effective_vat_rate, 10)
  assert.equal(result.items[0].line_vat, 10)
  assert.equal(result.items[1].effective_vat_rate, 5)
  assert.equal(result.items[1].line_vat, 5)
  assert.equal(result.vat, 15)
  assert.equal(result.taxableBase, 200)
})

test('Block 2c: row-level VAT override of 0 is exempt', () => {
  const result = calculateDocument(doc([
    item({ vat_rate: 0 }),
  ], { vatPercent: 7.5 }))
  assert.equal(result.items[0].effective_vat_rate, 0)
  assert.equal(result.items[0].line_vat, 0)
  assert.equal(result.vat, 0)
  assert.equal(result.taxableBase, 100)
})

test('Block 2d: null vat_rate inherits global', () => {
  const result = calculateDocument(doc([item({ vat_rate: null })], { vatPercent: 7.5 }))
  assert.equal(result.items[0].effective_vat_rate, 7.5)
  assert.equal(result.items[0].line_vat, 7.5)
})

test('Block 2e: zero global VAT', () => {
  const result = calculateDocument(doc([item({ quantity: 5, unit_price: 200 })], { vatPercent: 0 }))
  assert.equal(result.vat, 0)
  assert.equal(result.grandTotal, 1000)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 3 — Percent discount before_tax
// ─────────────────────────────────────────────────────────────────────────────

test('Block 3a: 10% discount before_tax with no VAT', () => {
  const result = calculateDocument(doc([item({ quantity: 2, unit_price: 500 })], {
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 10,
  }))
  assert.equal(result.subtotal, 1000)
  assert.equal(result.discount, 100) // 10% of 1000
  assert.equal(result.grandTotal, 900)
  assert.equal(result.items[0].line_discount, 100)
  assert.equal(result.items[0].effective_discount_rate, 10)
})

test('Block 3b: 10% discount before_tax with 7.5% VAT', () => {
  const result = calculateDocument(doc([item({ quantity: 2, unit_price: 500 })], {
    vatPercent: 7.5,
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 10,
  }))
  assert.equal(result.subtotal, 1000)
  assert.equal(result.discount, 100)
  assert.equal(result.vat, 67.5) // (1000-100) * 7.5/100 = 900 * 0.075 = 67.5
  assert.equal(result.taxableBase, 900)
  assert.equal(result.grandTotal, 967.5)
  assert.equal(result.items[0].line_vat_base, 900)
})

test('Block 3c: 0% discount is no-op', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 100 })], {
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 0,
  }))
  assert.equal(result.discount, 0)
  assert.equal(result.subtotal, 100)
  assert.equal(result.grandTotal, 100)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 4 — Percent discount after_tax
// ─────────────────────────────────────────────────────────────────────────────

test('Block 4a: 10% discount after_tax with VAT', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 1000 })], {
    vatPercent: 7.5,
    discountType: 'percent',
    discountTiming: 'after_tax',
    discountValue: 10,
  }))
  assert.equal(result.subtotal, 1000)
  // line_discount = (1000 + 75) * 10/100 = 1075 * 0.1 = 107.5
  assert.equal(result.discount, 107.5)
  // line_vat = 1000 * 7.5/100 = 75 (VAT on full base)
  assert.equal(result.vat, 75)
  assert.equal(result.taxableBase, 1000)
  // line_total = 1000 + 75 - 107.5 = 967.5
  // grandTotal = 1000 + 75 - 107.5 = 967.5
  assert.equal(result.grandTotal, 967.5)
  assert.equal(result.items[0].line_total, 967.5)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 5 — Fixed discount before_tax (proportional allocation)
// ─────────────────────────────────────────────────────────────────────────────

test('Block 5a: fixed 100 discount before_tax split across 2 eligible rows', () => {
  const result = calculateDocument(doc([
    item({ quantity: 1, unit_price: 300 }),
    item({ quantity: 1, unit_price: 700 }),
  ], {
    vatPercent: 7.5,
    discountType: 'fixed',
    discountTiming: 'before_tax',
    discountValue: 100,
  }))
  // eligibleVatBase = 300 + 700 = 1000
  // Row 0: allocated = 100 * 300/1000 = 30, lineDiscountBeforeVat = min(30, 300) = 30
  // Row 1: allocated = 100 * 700/1000 = 70, lineDiscountBeforeVat = min(70, 700) = 70
  // total discount = 30 + 70 = 100
  assert.equal(result.discount, 100)
  assert.equal(result.items[0].line_discount, 30)
  assert.equal(result.items[1].line_discount, 70)
  // VAT bases: 270 and 630 → vat = 20.25 + 47.25 = 67.5
  assert.equal(result.vat, 67.5)
  assert.equal(result.taxableBase, 900)
})

test('Block 5b: exempt row with 0% vat_rate not eligible for fixed discount', () => {
  const result = calculateDocument(doc([
    item({ quantity: 1, unit_price: 200, vat_rate: 0 }),
    item({ quantity: 1, unit_price: 800 }),
  ], {
    vatPercent: 7.5,
    discountType: 'fixed',
    discountTiming: 'before_tax',
    discountValue: 100,
  }))
  // Only row 1 is eligible (vat_rate > 0)
  // eligibleVatBase = 800
  // Row 1 gets all 100 discount
  assert.equal(result.discount, 100)
  assert.equal(result.items[0].line_discount, 0)
  assert.equal(result.items[1].line_discount, 100)
  assert.equal(result.items[0].line_vat, 0) // exempt row
})

test('Block 5c: row with explicit discount override not eligible for fixed allocation', () => {
  const result = calculateDocument(doc([
    item({ quantity: 1, unit_price: 300 }),
    item({ quantity: 1, unit_price: 700, discount_rate: 5 }),
  ], {
    vatPercent: 7.5,
    discountType: 'fixed',
    discountTiming: 'before_tax',
    discountValue: 100,
  }))
  // Row 0 eligible (inheritsGlobal=true) → eligibleVatBase = 300
  // Row 1 not eligible (inheritsGlobal=false, has own discount_rate)
  // Row 0 gets allocated = min(100 * 300/300 = 100, 300) = 100
  // Row 1 gets own discount: 700 * 5/100 = 35
  assert.equal(result.discount, 135)
  assert.equal(result.items[0].line_discount, 100)
  assert.equal(result.items[1].line_discount, 35)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 6 — Fixed discount after_tax
// ─────────────────────────────────────────────────────────────────────────────

test('Block 6a: fixed 200 discount after_tax', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 1000 })], {
    vatPercent: 7.5,
    discountType: 'fixed',
    discountTiming: 'after_tax',
    discountValue: 200,
  }))
  // VAT on full base = 1000 * 7.5/100 = 75
  // afterTaxFixedDiscount = 200
  // totalDiscount = 200
  // grandTotal = 1000 + 75 - 200 = 875
  // totalPayable = 1000 + 75 - 200 = 875
  assert.equal(result.vat, 75)
  assert.equal(result.discount, 200)
  assert.equal(result.grandTotal, 875)
  assert.equal(result.taxableBase, 1000)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 7 — Fixed discount clamping
// ─────────────────────────────────────────────────────────────────────────────

test('Block 7a: fixed discount clamped to eligible VAT base', () => {
  const result = calculateDocument(doc([
    item({ quantity: 1, unit_price: 100 }),
  ], {
    vatPercent: 7.5,
    discountType: 'fixed',
    discountTiming: 'before_tax',
    discountValue: 9999,
  }))
  // eligibleVatBase = 100, fixedDiscountTotal = 9999
  // effectiveFixedDiscount = min(9999, 100) = 100
  assert.equal(result.discount, 100)
  assert.equal(result.items[0].line_discount, 100)
  assert.equal(result.items[0].line_vat_base, 0)
  assert.equal(result.items[0].line_vat, 0)
  assert.equal(result.vat, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 8 — Row-level VAT overrides
// ─────────────────────────────────────────────────────────────────────────────

test('Block 8a: mixed VAT rates across 3 items', () => {
  const result = calculateDocument(doc([
    item({ quantity: 2, unit_price: 500, vat_rate: null }),               // inherit 7.5
    item({ quantity: 1, unit_price: 1000, vat_rate: 0 }),                 // exempt
    item({ quantity: 3, unit_price: 200, vat_rate: 5 }),                  // 5% override
  ], { vatPercent: 7.5 }))
  // Row 0: sub=1000, vat=1000*7.5/100=75
  // Row 1: sub=1000, vat=0
  // Row 2: sub=600, vat=600*5/100=30
  // Total vat = 75 + 0 + 30 = 105
  // taxableBase = 1000 + 1000 + 600 = 2600
  assert.equal(result.vat, 105)
  assert.equal(result.taxableBase, 2600)
  assert.equal(result.items[0].effective_vat_rate, 7.5)
  assert.equal(result.items[1].effective_vat_rate, 0)
  assert.equal(result.items[2].effective_vat_rate, 5)
})

test('Block 8b: explicit null vs explicit 0 vat_rate differ', () => {
  const nullRow = item({ vat_rate: null })
  const zeroRow = item({ vat_rate: 0 })
  const result = calculateDocument(doc([nullRow, zeroRow], { vatPercent: 7.5 }))
  assert.equal(result.items[0].effective_vat_rate, 7.5) // null → inherit
  assert.equal(result.items[1].effective_vat_rate, 0)    // 0 → exempt
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 9 — Row-level discount overrides
// ─────────────────────────────────────────────────────────────────────────────

test('Block 9a: explicit per-row discount_rate with percent before_tax', () => {
  const result = calculateDocument(doc([
    item({ quantity: 1, unit_price: 1000, discount_rate: null }), // inherit
    item({ quantity: 1, unit_price: 500, discount_rate: 5 }),      // override 5%
  ], {
    vatPercent: 7.5,
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 10,
  }))
  // Row 0: inherits → 10% of 1000 = 100 discount, vat_base = 900
  // Row 1: override 5% → 500 * 5/100 = 25 discount, vat_base = 475
  assert.equal(result.discount, 125)
  assert.equal(result.items[0].line_discount, 100)
  assert.equal(result.items[1].line_discount, 25)
  assert.equal(result.items[1].effective_discount_rate, 5)
})

test('Block 9b: explicit discount_rate=0 means 0 discount, not inherit', () => {
  const result = calculateDocument(doc([
    item({ discount_rate: 0 }),
  ], {
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 10,
  }))
  assert.equal(result.items[0].inherits_global_discount, false)
  assert.equal(result.items[0].effective_discount_rate, 0)
  assert.equal(result.items[0].line_discount, 0)
  assert.equal(result.discount, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 10 — Install rate
// ─────────────────────────────────────────────────────────────────────────────

test('Block 10a: install rate non-taxable', () => {
  const result = calculateDocument(doc([item({
    quantity: 1, unit_price: 1000,
    install_rate: 200,
    install_rate_taxable: false,
  })], { vatPercent: 7.5 }))
  // line_subtotal = 1000, line_install = 200
  // vat_base = line_subtotal = 1000 (install not taxable)
  // vat = 1000 * 7.5/100 = 75
  // line_total = 1000 + 200 + 75 = 1275
  // installRateTotal = 200
  assert.equal(result.items[0].line_install, 200)
  assert.equal(result.items[0].line_vat_base, 1000)
  assert.equal(result.items[0].line_vat, 75)
  assert.equal(result.items[0].line_total, 1275)
  assert.equal(result.installRateTotal, 200)
  assert.equal(result.grandTotal, 1275)
})

test('Block 10b: install rate taxable', () => {
  const result = calculateDocument(doc([item({
    quantity: 1, unit_price: 1000,
    install_rate: 200,
    install_rate_taxable: true,
  })], { vatPercent: 7.5 }))
  // vat_base = line_subtotal + line_install = 1000 + 200 = 1200
  // vat = 1200 * 7.5/100 = 90
  // line_total = 1000 + 200 + 90 = 1290
  assert.equal(result.items[0].line_vat_base, 1200)
  assert.equal(result.items[0].line_vat, 90)
  assert.equal(result.installRateTotal, 200)
  assert.equal(result.grandTotal, 1290)
})

test('Block 10c: visible_line_total respects visibleRowEffects', () => {
  const result = calculateDocument(doc([item({
    quantity: 1, unit_price: 1000,
    install_rate: 200,
    install_rate_taxable: false,
  })], {
    vatPercent: 7.5,
    visibleRowEffects: { install: false, vat: false, discount: false },
  }))
  // visible_line_total = 1000 + 0 - 0 + 0 = 1000
  assert.equal(result.items[0].visible_line_total, 1000)
  assert.equal(result.items[0].line_total, 1275) // real line_total unchanged
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 11 — Extra charges
// ─────────────────────────────────────────────────────────────────────────────

test('Block 11a: extra charge without VAT', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 1000 })], {
    vatPercent: 7.5,
    extraCharges: [{ label: 'Shipping', value: 50, vatApplicable: false }],
  }))
  // extraChargesTotal = 50, extraChargesTaxBase = 0
  // taxableBase unchanged = 1000
  // vat unchanged = 75
  // grandTotal = 1000 + 50 + 75 = 1125
  assert.equal(result.extraChargesTotal, 50)
  assert.equal(result.vat, 75)
  assert.equal(result.grandTotal, 1125)
})

test('Block 11b: extra charge with VAT', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 1000 })], {
    vatPercent: 7.5,
    extraCharges: [{ label: 'Handling', value: 100, vatApplicable: true }],
  }))
  // extraChargesTaxBase = 100
  // extraVat = 100 * 7.5/100 = 7.5
  // total vat = 75 + 7.5 = 82.5
  // taxableBase = 1000 + 100 = 1100
  // grandTotal = 1000 + 100 + 82.5 = 1182.5
  assert.equal(result.extraChargesTotal, 100)
  assert.equal(result.vat, 82.5)
  assert.equal(result.taxableBase, 1100)
  assert.equal(result.grandTotal, 1182.5)
})

test('Block 11c: multiple extra charges mixed VAT applicability', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 1000 })], {
    vatPercent: 7.5,
    extraCharges: [
      { label: 'Shipping', value: 50, vatApplicable: false },
      { label: 'Handling', value: 100, vatApplicable: true },
    ],
  }))
  assert.equal(result.extraChargesTotal, 150)
  assert.equal(result.vat, 82.5) // 75 + 7.5
  assert.equal(result.grandTotal, 1232.5) // 1000 + 150 + 82.5
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 12 — WHT calculations
// ─────────────────────────────────────────────────────────────────────────────

test('Block 12a: percent WHT at 5%', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 1000 })], {
    vatPercent: 7.5,
    whtType: 'percent',
    whtValue: 5,
  }))
  // whtBase = max(1000 - 0, 0) = 1000
  // wht = 1000 * 5/100 = 50
  // totalPayable = 1000 + 75 - 50 = 1025
  assert.equal(result.wht, 50)
  assert.equal(result.grandTotal, 1075)
  assert.equal(result.totalPayable, 1025)
})

test('Block 12b: fixed WHT of 200', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 1000 })], {
    whtType: 'fixed',
    whtValue: 200,
  }))
  assert.equal(result.wht, 200)
  assert.equal(result.totalPayable, 800)
})

test('Block 12c: zero WHT', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 1000 })], {
    whtType: 'percent',
    whtValue: 0,
  }))
  assert.equal(result.wht, 0)
  assert.equal(result.totalPayable, result.grandTotal)
})

test('Block 12d: WHT base excludes discount', () => {
  const result = calculateDocument(doc([item({ quantity: 2, unit_price: 500 })], {
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 10,
    whtType: 'percent',
    whtValue: 5,
  }))
  // subtotal=1000, discount=100
  // whtBase = max(1000 - 100, 0) = 900
  // wht = 900 * 5/100 = 45
  // totalPayable = 1000 - 100 + 0 - 45 = 855
  assert.equal(result.wht, 45)
  assert.equal(result.totalPayable, 855)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 13 — Rate-vs-total anti-regression (LOCKED behavior)
// ─────────────────────────────────────────────────────────────────────────────

test('Block 13a: ci.vatPercent is rate, document.vat is computed total', () => {
  // normalizeDocumentInput reads vatPercent from ci, NOT document.vat
  const result = computeDocument({
    items: [{ quantity: 2, unit_price: 500, row_type: 'standard' }],
    document: { vat: 5000 }, // computed total — must NOT be used as rate
    cf: { calculationInputs: { vatPercent: 7.5 } },
  })
  assert.equal(result.vat, 75) // 2*500*7.5/100=75, not 5000*...
  assert.equal(result.subtotal, 1000)
})

test('Block 13b: ci.discountValue is rate, document.discount is computed total', () => {
  const result = computeDocument({
    items: [{ quantity: 1, unit_price: 1000, row_type: 'standard' }],
    document: { discount: 5000 },
    cf: { calculationInputs: { discountValue: 10, discountType: 'percent', discountTiming: 'before_tax' } },
  })
  assert.equal(result.discount, 100) // 10% of 1000, not 5000
})

test('Block 13c: cf computation total fields are not mistaken for rates', () => {
  const result = computeDocument({
    items: [{ quantity: 1, unit_price: 1000, row_type: 'standard' }],
    document: { vat: 999, discount: 888, wht_percent: 5, wht_amount: 777 },
    cf: { calculationInputs: { vatPercent: 7.5, whtValue: 5, whtType: 'percent' } },
  })
  assert.equal(result.vat, 75)         // not 999
  assert.equal(result.wht, 50)          // wht: 1000 * 5/100 = 50
  assert.equal(result.totalPayable, 1025)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 14 — Decimal precision
// ─────────────────────────────────────────────────────────────────────────────

test('Block 14a: odd VAT percentage rounds correctly', () => {
  const result = calculateDocument(doc([item({ quantity: 3, unit_price: 1000 })], {
    vatPercent: 7.5,
  }))
  // 3000 * 7.5/100 = 225
  assert.equal(result.vat, 225)
})

test('Block 14b: fraction of unit_price', () => {
  const result = calculateDocument(doc([item({ quantity: 3, unit_price: 33.33 })], { vatPercent: 7.5 }))
  // 33.33 * 3 = 99.99
  // vat = 99.99 * 7.5 / 100 = 7.49925
  assert.equal(result.subtotal, 99.99)
  assert.equal(result.vat, 7.49925)
  assert.equal(result.grandTotal, 107.48925)
})

test('Block 14c: deep discount fraction with VAT precision', () => {
  const result = calculateDocument(doc([item({ quantity: 7, unit_price: 123.45 })], {
    vatPercent: 7.5,
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 12.5,
  }))
  // subtotal = 7 * 123.45 = 864.15
  // discount = 864.15 * 12.5/100 = 108.01875
  // vat_base = 864.15 - 108.01875 = 756.13125
  // vat = 756.13125 * 7.5/100 = 56.70984375
  // grandTotal = 864.15 - 108.01875 + 56.70984375 = 812.84109375
  assert.equal(result.subtotal, 864.15)
  assert.equal(result.discount, 108.01875)
  assert.equal(result.vat, 56.70984375)
  assert.equal(result.grandTotal, 812.84109375)
})

test('Block 14d: fixed discount proportional split with precision', () => {
  const result = calculateDocument(doc([
    item({ quantity: 1, unit_price: 333.33 }),
    item({ quantity: 2, unit_price: 666.67 }),
  ], {
    vatPercent: 7.5,
    discountType: 'fixed',
    discountTiming: 'before_tax',
    discountValue: 100,
  }))
  // eligibleVatBase = 333.33 + 1333.34 = 1666.67
  // row0: allocated = 100 * 333.33 / 1666.67
  // Use approximate: ~20.000...
  assert.equal(result.discount, 100)
  assert.ok(Math.abs(result.grandTotal - (1666.67 - 100 + 117.50025)) < 0.001)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 15 — normalizeDocumentInput
// ─────────────────────────────────────────────────────────────────────────────

test('Block 15a: basic normalization picks ci.vatPercent over cf.vatPercent', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 2, unit_price: 500 }],
    document: {},
    cf: { vatPercent: 5, calculationInputs: { vatPercent: 7.5 } },
  })
  assert.equal(input.globalVatPercent, 7.5)
})

test('Block 15b: falls back to cf.vatPercent when ci is missing', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: {},
    cf: { vatPercent: 5 },
  })
  assert.equal(input.globalVatPercent, 5)
})

test('Block 15c: legacy document.vat_rate fallback', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: { vat_rate: 5 },
    cf: {},
  })
  assert.equal(input.globalVatPercent, 5)
})

test('Block 15d: discountType defaults to fixed', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: {},
    cf: {},
  })
  assert.equal(input.discountType, 'fixed')
  assert.equal(input.discountTiming, 'before_tax')
})

test('Block 15e: discount_percent legacy fallback', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: { discount_percent: 10 },
    cf: { discountType: 'percent' },
  })
  assert.equal(input.discountValue, 10)
})

test('Block 15f: discount_amount legacy fallback', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: { discount_amount: 50 },
    cf: { discountType: 'fixed' },
  })
  assert.equal(input.discountValue, 50)
})

test('Block 15g: wht_percent legacy fallback', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: { wht_percent: 5 },
    cf: { whtType: 'percent' },
  })
  assert.equal(input.whtValue, 5)
})

test('Block 15h: wht_amount legacy fallback', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: { wht_amount: 200 },
    cf: { whtType: 'fixed' },
  })
  assert.equal(input.whtValue, 200)
})

test('Block 15i: hide_full column visibility zeroes out rates', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 2, unit_price: 500, install_rate: 100 }],
    document: { vat: 999 },
    cf: { vatPercent: 7.5, calculationInputs: { discountValue: 10 } },
    columns: [
      { key: 'vat_rate', visible: false, visibilityMode: 'hide_full' },
      { key: 'discount_rate', visible: false, visibilityMode: 'hide_full' },
      { key: 'install_rate', visible: false, visibilityMode: 'hide_full' },
    ],
  })
  assert.equal(input.globalVatPercent, 0)
  assert.equal(input.discountValue, 0)
  assert.equal(input.items[0].install_rate, null)
  assert.equal(input.items[0].install_rate_taxable, false)
  assert.equal(input.items[0].vat_rate, null)
})

test('Block 15j: extra charges from cf.extraCharges', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: {},
    cf: {
      extraCharges: [
        { label: 'Custom Fee', value: 50, withTax: true },
        { label: 'Packaging', value: 25, withTax: false },
      ],
    },
  })
  assert.equal(input.extraCharges.length, 2)
  assert.equal(input.extraCharges[0].value, 50)
  assert.equal(input.extraCharges[0].vatApplicable, true)
  assert.equal(input.extraCharges[1].value, 25)
  assert.equal(input.extraCharges[1].vatApplicable, false)
})

test('Block 15k: zero-value extra charges filtered out', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: {},
    cf: { extraCharges: [{ label: 'Zero Fee', value: 0, withTax: true }] },
  })
  assert.equal(input.extraCharges.length, 0)
})

test('Block 15l: visibleRowEffects derived from columns', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    columns: [
      { key: 'vat_rate', visible: true, visibilityMode: 'show' },
      { key: 'discount_rate', visible: false, visibilityMode: 'hide_display' },
      { key: 'install_rate', visible: true, visibilityMode: 'show' },
    ],
  })
  assert.equal(input.visibleRowEffects.install, true)
  assert.equal(input.visibleRowEffects.vat, true)
  assert.equal(input.visibleRowEffects.discount, false)
})

test('Block 15m: workmanship, transportation, shipping from document', () => {
  const input = normalizeDocumentInput({
    items: [{ quantity: 1, unit_price: 100 }],
    document: { workmanship: 200, transportation: 150 },
    cf: {},
  })
  assert.equal(input.extraCharges.length, 2)
  assert.equal(input.extraCharges[0].value, 200)
  assert.equal(input.extraCharges[1].value, 150)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 16 — Group accumulation
// ─────────────────────────────────────────────────────────────────────────────

test('Block 16a: items grouped together sum into group totals', () => {
  const result = calculateDocument(doc([
    item({ quantity: 2, unit_price: 300, group_id: 'g1', group_name: 'Group A' }),
    item({ quantity: 1, unit_price: 400, group_id: 'g1' }),
  ]))
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].group_id, 'g1')
  assert.equal(result.groups[0].group_name, 'Group A')
  assert.equal(result.groups[0].subtotal, 1000)
})

test('Block 16b: multiple groups accumulate separately', () => {
  const result = calculateDocument(doc([
    item({ quantity: 1, unit_price: 100, group_id: 'g1', group_name: 'Group 1' }),
    item({ quantity: 2, unit_price: 200, group_id: 'g2', group_name: 'Group 2' }),
    item({ quantity: 3, unit_price: 300, group_id: 'g2' }),
  ]))
  assert.equal(result.groups.length, 2)
  assert.equal(result.groups[0].subtotal, 100)
  assert.equal(result.groups[1].subtotal, 1300)
  assert.equal(result.subtotal, 1400)
})

test('Block 16c: ungrouped items not in groupAccumulators', () => {
  const result = calculateDocument(doc([
    item({ quantity: 1, unit_price: 100 }),
    item({ quantity: 2, unit_price: 200, group_id: 'g1' }),
  ]))
  assert.equal(result.groups.length, 1)
})

test('Block 16d: group_header rows do not affect group subtotals', () => {
  const result = calculateDocument(doc([
    { row_type: 'group_header', group_id: 'g1', group_name: 'Header', quantity: 0, unit_price: 0 },
    item({ quantity: 1, unit_price: 500, group_id: 'g1' }),
  ]))
  assert.equal(result.groups[0].subtotal, 500)
})

// ─────────────────────────────────────────────────────────────────────────────
// Block 17 — Edge cases (bonus coverage)
// ─────────────────────────────────────────────────────────────────────────────

test('Block 17a: empty items yields zero document', () => {
  const result = calculateDocument(doc([], { vatPercent: 7.5, discountType: 'percent', discountValue: 10 }))
  assert.equal(result.subtotal, 0)
  assert.equal(result.discount, 0)
  assert.equal(result.vat, 0)
  assert.equal(result.grandTotal, 0)
  assert.equal(result.totalPayable, 0)
  assert.equal(result.items.length, 0)
  assert.equal(result.groups.length, 0)
})

test('Block 17b: with no install or extra charges', () => {
  const result = calculateDocument(doc([item({ quantity: 1, unit_price: 1000 })], {
    vatPercent: 7.5,
    whtType: 'percent',
    whtValue: 5,
  }))
  assert.equal(result.installRateTotal, 0)
  assert.equal(result.extraChargesTotal, 0)
  assert.equal(result.wht, 50)
  assert.equal(result.totalPayable, 1025)
})

test('Block 17c: all visibleRowEffects false', () => {
  const result = calculateDocument(doc([item({
    quantity: 1, unit_price: 1000,
    install_rate: 200,
    install_rate_taxable: true,
  })], {
    vatPercent: 7.5,
    visibleRowEffects: { install: false, vat: false, discount: false },
  }))
  assert.equal(result.items[0].visible_line_total, 1000) // subtotal only
})
