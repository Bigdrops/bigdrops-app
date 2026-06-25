import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatCommaMaterialsText,
  resolveMaterialColumnBlocks,
  resolveZincLifecycleStages,
  safeText,
} from '../../components/csr/preview-templates/layoutModel.ts'

test('formatCommaMaterialsText renders one paragraph with thick pipe separators', () => {
  const text = formatCommaMaterialsText([
    { item: 'Fuse carrier', quantity: 2, unit: 'pcs' },
    { item: 'Control cable', quantity: 15, unit: 'm' },
    { item: 'Relay base', quantity: '', unit: '' },
  ])

  assert.equal(text, 'Fuse carrier 2 pcs  │  Control cable 15 m  │  Relay base')
})

test('resolveMaterialColumnBlocks preserves template row ceilings before comma fallback', () => {
  assert.equal(resolveMaterialColumnBlocks(5, 'signalbands'), 1)
  assert.equal(resolveMaterialColumnBlocks(6, 'signalbands'), 2)
  assert.equal(resolveMaterialColumnBlocks(18, 'zinc'), 3)
  assert.equal(resolveMaterialColumnBlocks(19, 'zinc'), 0)
})

test('resolveZincLifecycleStages activates only the current report status stage', () => {
  const stages = resolveZincLifecycleStages('Working solution provided')

  assert.deepEqual(
    stages.map((stage) => [stage.label, stage.active]),
    [
      ['Arrival', false],
      ['Diagnostic', false],
      ['Repair', false],
      ['Observation', true],
      ['Handover', false],
    ],
  )
})

test('safeText protects nullish and nested top-level values', () => {
  assert.equal(safeText(null), '')
  assert.equal(safeText(undefined), '')
  assert.equal(safeText(123), '123')
})
