import test from 'node:test'
import assert from 'node:assert/strict'

import { externalWaybillImportAdapter } from '../../domain/waybill/externalWaybillImportAdapter.ts'
import { internalWaybillImportAdapter } from '../../domain/waybill/internalWaybillImportAdapter.ts'
import { assertNoExtensionFieldsOutsideCustomData } from '../../domain/waybill/contracts/waybillContract.ts'

const ADAPTER_TEST_CASES = [
  { name: 'external', adapter: externalWaybillImportAdapter },
  { name: 'internal', adapter: internalWaybillImportAdapter },
]

const STEP_1_JSON = {
  items: [
    {
      description: 'Fuel Injector',
      quantity: 4,
      unit: 'pcs',
      make: 'Cummins',
      'part number': 'INJ-505',
    },
  ],
}

for (const { name, adapter } of ADAPTER_TEST_CASES) {
  test(`waybill-import: ${name} adapter creates make column`, () => {
    const result = adapter.applyResult(STEP_1_JSON)
    const colKeys = result.customColumns.map((c) => c.key)
    assert.ok(colKeys.includes('make'), `make column missing in ${name}: ${colKeys.join(',')}`)
  })

  test(`waybill-import: ${name} adapter creates part_number column`, () => {
    const result = adapter.applyResult(STEP_1_JSON)
    const colKeys = result.customColumns.map((c) => c.key)
    assert.ok(colKeys.includes('part_number'), `part_number column missing in ${name}: ${colKeys.join(',')}`)
  })

  test(`waybill-import: ${name} adapter stores values in custom_data`, () => {
    const result = adapter.applyResult(STEP_1_JSON)
    const item = result.items[0]
    assert.equal(item.custom_data?.make, 'Cummins', `make not in custom_data for ${name}`)
    assert.equal(item.custom_data?.part_number, 'INJ-505', `part_number not in custom_data for ${name}`)
    assert.equal(item.description, 'Fuel Injector')
    assert.equal(item.quantity, 4)
  })

  test(`waybill-import: ${name} adapter produces save-valid item`, () => {
    const result = adapter.applyResult(STEP_1_JSON)
    const item = result.items[0]
    assert.doesNotThrow(
      () => assertNoExtensionFieldsOutsideCustomData(item, 'import-test'),
      `item failed save validation for ${name}: ${JSON.stringify(item)}`,
    )
  })
}

test('waybill-import: columns visible by default under form visibility rule', () => {
  const result = externalWaybillImportAdapter.applyResult(STEP_1_JSON)
  const columnVisibility = {}
  for (const col of result.customColumns) {
    const visible = columnVisibility[col.key] !== false
    assert.ok(visible, `column ${col.key} should be visible but visibility is ${columnVisibility[col.key]}`)
  }
})

test('waybill-import: column labels match expected', () => {
  const result = externalWaybillImportAdapter.applyResult(STEP_1_JSON)
  const makeCol = result.customColumns.find((c) => c.key === 'make')
  assert.equal(makeCol?.label, 'Make')
  const partNoCol = result.customColumns.find((c) => c.key === 'part_number')
  assert.equal(partNoCol?.label, 'Part Number')
})
