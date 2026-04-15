import test from 'node:test'
import assert from 'node:assert/strict'

import { buildPdfTableColumns, renderPdfLineCell } from '../../components/pdf-new/table.ts'

test('buildPdfTableColumns includes implicit standard pdf columns plus configured visible columns', () => {
  const columns = buildPdfTableColumns([
    { key: 'make', label: 'Make', visible: true },
    { key: 'unit', label: 'Unit', visible: false },
    { key: 'custom_color', label: 'Color', type: 'text', visible: true },
  ])

  assert.deepEqual(
    columns.map((column) => column.key),
    ['num', 'description', 'make', 'quantity', 'unit_price', 'amount', 'custom_color'],
  )
})

test('buildPdfTableColumns merges qty and unit when requested', () => {
  const columns = buildPdfTableColumns([{ key: 'unit', label: 'Unit', visible: true }], {
    mergeQtyUnit: true,
  })

  assert.equal(columns.find((column) => column.key === 'quantity')?.label, 'Qty / Unit')
  assert.equal(columns.some((column) => column.key === 'unit'), false)
})

test('renderPdfLineCell reads standard invoice fields with live keys', () => {
  const item = {
    id: '1',
    description: 'LED Panel',
    subDescription: '600 x 600',
    make: 'Philips',
    quantity: 4,
    unit: 'pcs',
    unitPrice: 12500,
    installRate: 2500,
    vatRate: 7.5,
    discountRate: 5,
    amount: 50000,
    customData: { custom_color: 'White' },
  }

  assert.equal(renderPdfLineCell(item, 'description'), 'LED Panel\n600 x 600')
  assert.equal(renderPdfLineCell(item, 'num', { rowNumber: 3 }), '3')
  assert.equal(renderPdfLineCell(item, 'quantity', { mergeQtyUnit: true }), '4 pcs')
  assert.match(String(renderPdfLineCell(item, 'unit_price', { currency: 'NGN' })), /12,500\.00/)
  assert.match(String(renderPdfLineCell(item, 'install_rate', { currency: 'NGN' })), /2,500\.00/)
  assert.equal(renderPdfLineCell(item, 'vat_rate'), '7.5%')
  assert.equal(renderPdfLineCell(item, 'discount_rate'), '5%')
  assert.equal(renderPdfLineCell(item, 'custom_color'), 'White')
})
