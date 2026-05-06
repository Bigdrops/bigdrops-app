import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const tablePath = path.resolve('src/components/pdf-new/table.ts')
const source = fs.readFileSync(tablePath, 'utf8')

assert.match(source, /if \(mergeQtyUnit && key === 'unit'\) return/)
assert.match(source, /\.\.\.\(key === 'quantity' && mergeQtyUnit \? \{/)
assert.match(source, /if \(key === 'unit' && !mergeQtyUnit\) overrides = \{ pdfWidth: 42, pdfFlex: 0 \}/)
assert.match(source, /if \(mergeQtyUnit && column\.key === 'quantity'\) \{/)

console.log('tableRegression.test.js: pass')
