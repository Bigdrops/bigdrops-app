import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const commercialTermsPath = path.resolve('src/components/document/FormCommercialTerms.tsx')
const totalsPanelPath = path.resolve('src/components/document/FormTotals.tsx')
const mobilePrimitivesPath = path.resolve('src/components/invoice/mobile/mobileFormPrimitives.tsx')
const mobileSectionsPath = path.resolve('src/components/invoice/mobile/MobileInvoiceCollapsibleSections.tsx')

test('commercial terms section uses tokenized action and destructive surfaces', () => {
  const source = fs.readFileSync(commercialTermsPath, 'utf8')

  assert.match(source, /hsl\(var\(--bd-surface\)\)/)
  assert.match(source, /hsl\(var\(--bd-status-danger-bg\)\)/)
  assert.match(source, /hsl\(var\(--bd-button-primary-bg\)\)/)
  assert.doesNotMatch(source, /border-\[#e2e8f0\]|bg-white|text-\[#0f172a\]|bg-\[#fff5f5\]/)
})

test('totals panel uses tokenized sections and segmented states', () => {
  const source = fs.readFileSync(totalsPanelPath, 'utf8')

  assert.match(source, /var\(--bd-text\)/)
  assert.match(source, /var\(--bd-border\)/)
  assert.doesNotMatch(source, /bg-\[#0f172a\]|text-white|border-\[#e2e8f0\]|bg-\[#f8fafc\]/)
})

test('mobile document form primitives keep tokenized field and segmented surfaces', () => {
  const source = fs.readFileSync(mobilePrimitivesPath, 'utf8')

  assert.match(source, /fieldCls =\s+'h-11 rounded-\[var\(--bd-radius-md\)\] border border-\[hsl\(var\(--bd-border\)\)\] bg-\[hsl\(var\(--bd-surface\)\)\]/)
  assert.match(source, /active \? 'border-\[hsl\(var\(--bd-button-primary-bg\)\)\] bg-\[hsl\(var\(--bd-button-primary-bg\)\)\] text-\[hsl\(var\(--bd-button-primary-text\)\)\]'/)
})

test('mobile footer actions use safe-area-aware tokenized surfaces and readable disabled states', () => {
  const source = fs.readFileSync(mobileSectionsPath, 'utf8')

  assert.match(source, /bg-\[hsl\(var\(--bd-card-bg\)\)\]/)
  assert.match(source, /bottom-\[calc\(var\(--bd-app-bottom-nav-offset,\s*72px\)\+env\(safe-area-inset-bottom,\s*0px\)\+16px\)\]/)
  assert.match(source, /disabled:text-\[hsl\(var\(--bd-text-muted\)\)\]/)
  assert.doesNotMatch(source, /border-\[#e2e8f0\]|bg-white|text-\[#475569\]|shadow-\[0_8px_24px_rgba/)
})
