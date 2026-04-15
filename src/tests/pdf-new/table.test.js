import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPdfTableColumns,
  chunkPdfTableRows,
  formatCompactPdfMoney,
  getPdfTableLayoutPlan,
  renderPdfLineCell,
} from '../../components/pdf-new/table.ts'

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
  assert.equal(String(renderPdfLineCell(item, 'unit_price', { currency: 'NGN' })), '₦12,500')
  assert.equal(String(renderPdfLineCell(item, 'install_rate', { currency: 'NGN' })), '₦2,500')
  assert.equal(renderPdfLineCell(item, 'vat_rate'), '7.5%')
  assert.equal(renderPdfLineCell(item, 'discount_rate'), '5%')
  assert.equal(renderPdfLineCell(item, 'custom_color'), 'White')
})

test('getPdfTableLayoutPlan protects description width and switches to landscape for wide tables', () => {
  const plan = getPdfTableLayoutPlan([
    { key: 'description', label: 'Description', align: 'left' },
    { key: 'make', label: 'Make', align: 'left' },
    { key: 'quantity', label: 'Qty', align: 'right' },
    { key: 'unit', label: 'Unit', align: 'left' },
    { key: 'unit_price', label: 'Unit Price', align: 'right' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'install_rate', label: 'Install Rate', align: 'right' },
    { key: 'vat_rate', label: 'VAT', align: 'right' },
    { key: 'discount_rate', label: 'Discount', align: 'right' },
    { key: 'custom_finish', label: 'Finish', align: 'left' },
  ])

  const descriptionColumn = plan.columns.find((column) => column.key === 'description')
  const amountColumn = plan.columns.find((column) => column.key === 'amount')
  const vatColumn = plan.columns.find((column) => column.key === 'vat_rate')

  assert.equal(plan.orientation, 'landscape')
  assert.ok(descriptionColumn)
  assert.ok(amountColumn)
  assert.ok(vatColumn)
  assert.ok(descriptionColumn.widthPercent > amountColumn.widthPercent)
  assert.ok(vatColumn.widthPercent < amountColumn.widthPercent)
})

test('chunkPdfTableRows repeats headers conservatively and keeps group headers with following rows', () => {
  const columns = getPdfTableLayoutPlan([
    { key: 'description', label: 'Description', align: 'left' },
    { key: 'amount', label: 'Amount', align: 'right' },
  ]).columns

  const rows = [
    { id: 'g1', rowType: 'group_header', groupLabel: 'Lighting' },
    { id: '1', description: 'LED Panel', amount: 12000 },
    { id: '2', description: 'Downlight', amount: 8000 },
    { id: '3', description: 'Track Light', amount: 5000 },
    { id: '4', description: 'Surface Light', amount: 3000 },
  ]

  const segments = chunkPdfTableRows(rows, columns, { firstPageLimit: 70, continuationPageLimit: 70 })

  assert.equal(segments.length, 2)
  assert.deepEqual(
    segments[0].map((row) => row.id),
    ['g1', '1', '2'],
  )
  assert.deepEqual(
    segments[1].map((row) => row.id),
    ['3', '4'],
  )
})

test('formatCompactPdfMoney removes currency-code width waste for NGN amounts', () => {
  assert.equal(formatCompactPdfMoney(11000, 'NGN'), '₦11,000')
  assert.equal(formatCompactPdfMoney(11000.5, 'NGN'), '₦11,000.5')
})
