import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const columnsPath = path.resolve('src/domain/invoice/columns.ts')
const hookPath = path.resolve('src/components/useInvoiceColumns.tsx')

test('table reset order keeps the stable standard column sequence', () => {
  const columnsSource = fs.readFileSync(columnsPath, 'utf8')

  assert.match(columnsSource, /const RESET_COLUMN_ORDER = \[/)
  assert.match(columnsSource, /'description',\s*'quantity',\s*'unit',\s*'unit_price',\s*'make',\s*'amount'/s)
  assert.match(columnsSource, /export function getResetColumnConfigs\(\)/)
})

test('shared invoice column reset uses the explicit reset defaults instead of raw builtin order', () => {
  const hookSource = fs.readFileSync(hookPath, 'utf8')

  assert.match(hookSource, /getResetColumnConfigs/)
  assert.match(hookSource, /setColumns\(getResetColumnConfigs\(\)\.map/)
})
