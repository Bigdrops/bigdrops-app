import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('invoice view chrome CSS avoids legacy surface variables', () => {
  const css = read('components/document-view/invoice/InvoicePresentation.module.css')

  for (const legacyVar of ['var(--text)', 'var(--primary)', 'var(--border-soft)', 'var(--bg3)']) {
    assert.equal(css.includes(legacyVar), false, `expected ${legacyVar} to be removed from invoice chrome CSS`)
  }
})

test('linked document icon chrome avoids hardcoded invoice view colors', () => {
  const css = read('components/document-view/shared/DocumentRelatedDocsSection.module.css')

  for (const hardcoded of ['#f0fdf4', '#16a34a', '#fdf4ff', '#a21caf', '#f1f5f9', '#475569']) {
    assert.equal(css.includes(hardcoded), false, `expected ${hardcoded} to be removed from linked document icon chrome`)
  }
})
