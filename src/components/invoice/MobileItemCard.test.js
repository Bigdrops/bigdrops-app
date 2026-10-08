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

test('mobile item card follows reference authoring hierarchy with terminal amount', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /className="cps-ihead"/)
  assert.match(source, /className="cps-row-rail"/)
  assert.match(source, /className="cps-idx"/)
  assert.match(source, /className="cps-rmid"/)
  assert.match(source, /className="cps-ear"/)
  assert.match(source, /className="cps-ins"/)
  assert.match(source, /className="bd-raterow"/)
  assert.match(source, /className="bd-amountbar"/)
  assert.match(source, />Amount/)
  // Rate must not sit beside the result as an equal half-width peer.
  assert.doesNotMatch(source, /cps-comm-grid/)
  assert.doesNotMatch(source, /grid-cols-\[36px_minmax\(0,1fr\)_34px\]/)
  assert.doesNotMatch(source, /Quantity × unit rate summary/)
})

test('mobile item card clears linked item context on manual description edits and renders a compact price strip', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /if \(resolvedItemId\) \{\s*updateField\('item_id', null\)/)
  assert.match(source, /resolvedItemId && priceContextText \? \(/)
  assert.match(source, /<span className="whitespace-pre-line">\{priceContextText\}<\/span>/)
  assert.match(source, /getRecognizedHistoryPriceActionValue/)
  assert.match(source, /onClick=\{\(\) => onUpdate\(index, 'unit_price', usableHistoryPrice\)\}/)
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

test('mobile item card keeps internal suggestion scrolling inside the autocomplete boundary', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /const isInsideSuggestionBoundary = \(target: EventTarget \| null\) =>/)
  assert.match(source, /suggestionRootRef\.current\?\.contains\(target\)/)
  assert.match(source, /const handleScroll = \(event: Event\) => \{\s*if \(isInsideSuggestionBoundary\(event\.target\)\) return\s*setDescriptionFocused\(false\)/)
  assert.match(source, /const handlePointerDown = \(event: PointerEvent\) => \{\s*if \(isInsideSuggestionBoundary\(event\.target\)\) return\s*setDescriptionFocused\(false\)/)
  assert.doesNotMatch(source, /stopPropagation\(/)
})

test('mobile item card can reopen suggestions for an unchanged valid description', () => {
  const source = fs.readFileSync(mobileItemCardPath, 'utf8')

  assert.match(source, /const openSuggestionInteraction = \(\) => \{\s*setDescriptionFocused\(true\)\s*setActiveSuggestionIndex\(0\)\s*\}/)
  assert.match(source, /onPointerDown=\{openSuggestionInteraction\}/)
  assert.match(source, /onFocus=\{openSuggestionInteraction\}/)
  assert.match(source, /const handleDescriptionChange = \(event: React\.ChangeEvent<HTMLTextAreaElement>\) => \{[\s\S]*setDescriptionFocused\(true\)/)
  assert.match(source, /setActiveSuggestionIndex\(0\)/)
})
