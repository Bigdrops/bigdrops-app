import test from 'node:test'
import assert from 'node:assert/strict'

import { getActionsSheetItems, getImportHelpSteps } from './mobileFormHelpers.js'

test('actions sheet includes qty + unit merge action and reflects disabled state', () => {
  const items = getActionsSheetItems({ mergeQtyUnit: false })
  const mergeAction = items.find((item) => item.key === 'qtyUnitMerge')

  assert.ok(mergeAction)
  assert.equal(mergeAction.label, 'Qty + Unit merge')
  assert.match(mergeAction.description, /off/i)
})

test('actions sheet reflects enabled qty + unit merge state', () => {
  const items = getActionsSheetItems({ mergeQtyUnit: true })
  const mergeAction = items.find((item) => item.key === 'qtyUnitMerge')

  assert.ok(mergeAction)
  assert.match(mergeAction.description, /on/i)
})

test('import help exposes the three reference steps', () => {
  const steps = getImportHelpSteps()

  assert.deepEqual(
    steps.map((step) => step.title),
    ['Add vs Update', 'Using Import', 'Common Mistakes'],
  )
  assert.match(steps[0].description, /row_number/i)
})
