import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPdfRowCells,
  buildPdfTableColumns,
  interpretPdfTableSettings,
  resolvePdfPageLayout,
} from '../../components/pdf-new/table.ts'

test('interpretPdfTableSettings keeps fixed pdf columns and visible configurable columns', () => {
  const resolved = interpretPdfTableSettings([
    { key: 'make', label: 'Make', visible: true },
    { key: 'unit', label: 'Unit', visible: false },
    { key: 'custom_finish', label: 'Finish', type: 'text', visible: true },
  ])

  assert.equal(resolved.mergeQtyUnit, false)
  assert.deepEqual(
    resolved.columns.map((column) => column.key),
    ['num', 'description', 'make', 'quantity', 'unit_price', 'amount', 'custom_finish'],
  )
  assert.deepEqual(
    resolved.customColumns.map((column) => column.key),
    ['custom_finish'],
  )
})

test('interpretPdfTableSettings respects merged qty-unit without inventing layout metadata', () => {
  const resolved = interpretPdfTableSettings(
    [{ key: 'unit', label: 'Unit', visible: true }],
    { mergeQtyUnit: true },
  )

  assert.equal(resolved.mergeQtyUnit, true)
  assert.equal(resolved.columns.find((column) => column.key === 'quantity')?.label, 'Qty / Unit')
  assert.equal(resolved.columns.some((column) => column.key === 'unit'), false)
})

test('buildPdfTableColumns returns truthful pdf column definitions for optional builtin rates', () => {
  const columns = buildPdfTableColumns([
    { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: true },
    { key: 'vat_rate', label: 'VAT Rate', type: 'vat_rate', visible: true },
    { key: 'discount_rate', label: 'Discount Rate', type: 'discount_rate', visible: true },
  ])

  assert.deepEqual(
    columns.map((column) => [column.key, column.kind, column.align, column.dataType || null]),
    [
      ['num', 'builtin', 'center', null],
      ['description', 'builtin', 'left', null],
      ['quantity', 'builtin', 'center', null],
      ['unit_price', 'builtin', 'right', null],
      ['amount', 'builtin', 'right', null],
      ['install_rate', 'builtin', 'right', 'install_rate'],
      ['vat_rate', 'builtin', 'center', 'vat_rate'],
      ['discount_rate', 'builtin', 'center', 'discount_rate'],
    ],
  )
})

test('buildPdfRowCells uses the active install-rate column logic instead of dropping calculated row values', () => {
  const resolved = interpretPdfTableSettings([
    { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: true, formula: '0.1' },
  ])

  const cells = buildPdfRowCells({
    description: 'Panel',
    quantity: 2,
    unit_price: 100,
    install_rate: null,
    custom_data: {},
  }, resolved.columns, { configuredColumns: resolved.configuredColumns })

  assert.equal(cells.install_rate, '20')
})

test('resolvePdfPageLayout keeps narrow tables portrait and promotes wide tables to landscape', () => {
  const portraitLayout = resolvePdfPageLayout(interpretPdfTableSettings([]).columns)
  const landscapeLayout = resolvePdfPageLayout(interpretPdfTableSettings([
    { key: 'make', label: 'Make', visible: true },
    { key: 'unit', label: 'Unit', visible: true },
    { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: true },
    { key: 'vat_rate', label: 'VAT Rate', type: 'vat_rate', visible: true },
    { key: 'discount_rate', label: 'Discount Rate', type: 'discount_rate', visible: true },
    { key: 'custom_finish', label: 'Finish', type: 'text', visible: true },
  ]).columns)

  assert.deepEqual(portraitLayout, { size: 'A4', orientation: 'portrait' })
  assert.deepEqual(landscapeLayout, { size: 'A4', orientation: 'landscape' })
})
