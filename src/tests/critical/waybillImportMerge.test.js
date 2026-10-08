import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const waybillFormPath = path.resolve('src/components/waybill/WaybillForm.tsx')

test('waybill import reuses only genuinely empty starter rows', () => {
  const source = fs.readFileSync(waybillFormPath, 'utf8')

  assert.match(source, /function isEmptyStarterItem\(item: WaybillItem\)/)
  assert.match(source, /String\(item\.description \|\| ''\)\.trim\(\) === ''/)
  assert.match(source, /Number\(item\.quantity \|\| 1\) === 1/)
  assert.match(source, /!hasMeaningfulCustomData\(item\.custom_data\)/)
  assert.match(source, /String\(candidate\.sub_description \|\| ''\)\.trim\(\) === ''/)
  assert.match(source, /String\(candidate\.image_url \|\| ''\)\.trim\(\) === ''/)
})

test('waybill import preserves occupied rows and appends remaining imported rows', () => {
  const source = fs.readFileSync(waybillFormPath, 'utf8')

  assert.match(source, /function mergeImportedWaybillItems\(existingItems: WaybillItem\[\], importedItems: WaybillItem\[\]\)/)
  assert.match(source, /if \(!isEmptyStarterItem\(nextItems\[index\]\)\) continue/)
  assert.match(source, /nextItems\.push\(\.\.\.meaningfulImports\.slice\(importIndex\)/)
  assert.doesNotMatch(source, /items:\s*result\.items/)
  assert.match(source, /items:\s*mergeImportedWaybillItems\(prev\.items, result\.items\)/)
})
