import test from 'node:test'
import assert from 'node:assert/strict'

import { computeDocument } from '../../lib/Calculations.ts'

const baseInput = {
  items: [
    {
      id: 'row-1',
      row_type: 'standard',
      description: 'AC installation',
      quantity: 2,
      unit_price: 100,
      install_rate: 50,
      install_rate_taxable: true,
      vat_rate: 10,
      discount_rate: 5,
    },
  ],
  document: {
    workmanship: 0,
    transportation: 0,
    shipping: 0,
  },
  cf: {
    calculationInputs: {
      vatRate: 0,
      vatPercent: 0,
      discountValue: 0,
      whtValue: 0,
      discountType: 'percent',
      discountTiming: 'after_tax',
      whtType: 'percent',
    },
  },
}

test('visible row amount only includes visible row-level financial columns', () => {
  const hiddenFinancialColumns = computeDocument({
    ...baseInput,
    columns: [
      { key: 'install_rate', visible: false },
      { key: 'vat_rate', visible: false },
      { key: 'discount_rate', visible: false },
    ],
  })

  const visibleFinancialColumns = computeDocument({
    ...baseInput,
    columns: [
      { key: 'install_rate', visible: true },
      { key: 'vat_rate', visible: true },
      { key: 'discount_rate', visible: true },
    ],
  })

  const installOnly = computeDocument({
    ...baseInput,
    columns: [
      { key: 'install_rate', visible: true },
      { key: 'vat_rate', visible: false },
      { key: 'discount_rate', visible: false },
    ],
  })

  const vatOnly = computeDocument({
    ...baseInput,
    columns: [
      { key: 'install_rate', visible: false },
      { key: 'vat_rate', visible: true },
      { key: 'discount_rate', visible: false },
    ],
  })

  const discountOnly = computeDocument({
    ...baseInput,
    columns: [
      { key: 'install_rate', visible: false },
      { key: 'vat_rate', visible: false },
      { key: 'discount_rate', visible: true },
    ],
  })

  assert.equal(hiddenFinancialColumns.items[0].line_subtotal, 200)
  assert.equal(hiddenFinancialColumns.items[0].visible_line_total, 200)
  assert.equal(visibleFinancialColumns.items[0].visible_line_total, 261.25)
  assert.equal(installOnly.items[0].visible_line_total, 250)
  assert.equal(vatOnly.items[0].visible_line_total, 225)
  assert.equal(discountOnly.items[0].visible_line_total, 186.25)
})

test('percent discount timing changes both discount amount and payable total', () => {
  const beforeVat = computeDocument({
    items: [
      {
        id: 'row-1',
        row_type: 'standard',
        description: 'Generator supply',
        quantity: 2,
        unit_price: 100,
        install_rate: 50,
        install_rate_taxable: true,
        vat_rate: 10,
        discount_rate: null,
      },
    ],
    document: {
      workmanship: 0,
      transportation: 0,
      shipping: 0,
    },
    cf: {
      calculationInputs: {
        discountType: 'percent',
        discountTiming: 'before_tax',
        discountValue: 10,
        vatPercent: 0,
        whtType: 'percent',
        whtValue: 0,
      },
    },
  })

  const afterVat = computeDocument({
    items: [
      {
        id: 'row-1',
        row_type: 'standard',
        description: 'Generator supply',
        quantity: 2,
        unit_price: 100,
        install_rate: 50,
        install_rate_taxable: true,
        vat_rate: 10,
        discount_rate: null,
      },
    ],
    document: {
      workmanship: 0,
      transportation: 0,
      shipping: 0,
    },
    cf: {
      calculationInputs: {
        discountType: 'percent',
        discountTiming: 'after_tax',
        discountValue: 10,
        vatPercent: 0,
        whtType: 'percent',
        whtValue: 0,
      },
    },
  })

  assert.equal(beforeVat.discount, 20)
  assert.equal(beforeVat.vat, 23)
  assert.equal(beforeVat.totalPayable, 253)

  assert.equal(afterVat.discount, 27.5)
  assert.equal(afterVat.vat, 25)
  assert.equal(afterVat.totalPayable, 247.5)
})
