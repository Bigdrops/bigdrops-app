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

  assert.match(source, /if \(resolvedItemId\) \{\s*updateField\('item_id', null\)/)
  assert.match(source, /resolvedItemId && priceContextText \? \(/)
  assert.match(source, />\s*\{priceContextText\}\s*<\/div>/)
})

test('mobile item card uses the suggestion engine and keeps selection item ids canonical', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /useItemSuggestionEngine/)
  assert.match(source, /updateField\('item_id', exactMatch\.item_id\)/)
  assert.match(source, /updateField\('item_id', selection\.item_id\)/)
  assert.doesNotMatch(source, /onUpdate\(index, 'item_id', selection\.item_id\)/)
})

test('mobile item card suggestion panel is opaque, compact, dismissable, and keyboard aware', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /bg-bd-card-bg/)
  assert.match(source, /z-\[60\]/)
  assert.match(source, /max-h-\[min\(13rem,calc\(100dvh-14rem\)\)\]/)
  assert.match(source, /document\.addEventListener\('pointerdown'/)
  assert.match(source, /document\.addEventListener\('keydown'/)
  assert.match(source, /window\.addEventListener\('scroll', handleScroll, true\)/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /event\.key === 'ArrowDown'/)
  assert.match(source, /event\.key === 'ArrowUp'/)
  assert.match(source, /event\.key === 'Enter'/)
  assert.match(source, /role="listbox"/)
  assert.match(source, /role="option"/)
  assert.doesNotMatch(source, /setTimeout\(\(\) => setDescriptionFocused\(false\), 150\)/)
})
