import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const mobileItemCardPath = path.resolve('src/components/invoice/MobileItemCard.tsx')

test('mobile item card treats row duplication as optional in shared form flows', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /onDuplicate\s*=\s*undefined/)
  assert.match(source, /\{onDuplicate\s*&&\s*\(/)
})

test('mobile item card keeps a tight utility rail and a clean subtotal endpoint', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /grid-cols-\[16px_minmax\(0,1fr\)_30px\]/)
  assert.match(source, /className="flex w-4 flex-col items-center gap-0\.5 pt-2"/)
  assert.match(source, />Subtotal</)
  assert.doesNotMatch(source, /Quantity × unit rate summary/)
})

test('mobile item card clears linked item context on manual description edits and renders a compact price strip', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /if \(item\.item_id\) \{\s*onUpdate\(index, 'item_id', null\)/)
  assert.match(source, /item\.item_id && selectedSuggestionContextText \? \(/)
  assert.match(source, />\s*\{selectedSuggestionContextText\}\s*<\/div>/)
})
