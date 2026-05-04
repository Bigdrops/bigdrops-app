import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('quotation view chrome CSS avoids legacy invoice-view variables', () => {
  const files = [
    read('components/document-view/shared/DocumentHero.module.css'),
    read('components/document-view/shared/DocumentPage.module.css'),
    read('components/document-view/shared/DocumentActionButtons.module.css'),
    read('components/document-view/quotation/QuotationViewPage.module.css'),
    read('components/document-view/quotation/QuotationMoneyStrip.module.css'),
  ]

  for (const legacyVar of ['var(--text)', 'var(--primary)', 'var(--border-soft)', 'var(--bg3)']) {
    assert.equal(files.some((file) => file.includes(legacyVar)), false, `expected ${legacyVar} to be absent from quotation chrome CSS`)
  }
})
