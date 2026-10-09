import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  canUseColumnLabel,
  createUniqueColumnLabel,
  findColumnByLogicalIdentity,
  normalizeColumnLabelIdentity,
} from '../../domain/financial/columnIdentity.ts'

const hookSource = readFileSync(
  new URL('../../components/useInvoiceColumns.tsx', import.meta.url),
  'utf8',
)

test('column label identity normalizes whitespace, case, and punctuation', () => {
  assert.equal(normalizeColumnLabelIdentity('Part no '), 'part_no')
  assert.equal(normalizeColumnLabelIdentity('PART NO'), 'part_no')
  assert.equal(normalizeColumnLabelIdentity('Part-no'), 'part_no')
})

test('shared column guard blocks custom/custom and built-in/custom collisions', () => {
  const columns = [
    { key: 'unit', label: 'Unit' },
    { key: 'custom_part_no', label: 'Part no' },
  ]

  assert.equal(canUseColumnLabel(columns, 'custom_new', 'PART NO'), false)
  assert.equal(canUseColumnLabel(columns, 'custom_new', 'Unit'), false)
  assert.equal(canUseColumnLabel(columns, 'custom_part_no', 'Part no '), true)
  assert.equal(canUseColumnLabel(columns, 'custom_new', 'Serial'), true)
})

test('default custom-column names remain unique through shared identity', () => {
  const label = createUniqueColumnLabel('New Column', [
    { key: 'custom_a', label: 'New Column' },
    { key: 'custom_b', label: 'New Column 2' },
  ])

  assert.equal(label, 'New Column 3')
})

test('import-style lookup reuses existing logical custom columns', () => {
  const column = findColumnByLogicalIdentity(
    [{ key: 'custom_part_no', label: 'Part no' }],
    'Part no ',
  )

  assert.equal(column?.key, 'custom_part_no')
})

test('Invoice column hook uses shared duplicate protection for add and rename paths', () => {
  assert.match(hookSource, /createUniqueColumnLabel\('New Column', cols\)/)
  assert.match(hookSource, /canUseColumnLabel\(cols, key, value\)/)
})
