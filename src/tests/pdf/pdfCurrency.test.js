import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const projectDocumentsPath = path.resolve('src/domain/projectDocuments.ts')
const adapterPath = path.resolve('src/components/pdf/industryAdapter.ts')
const sharedFontsPath = path.resolve('src/lib/pdfSharedFonts.ts')
const formatterPath = path.resolve('src/lib/formatters/pdfCurrency.ts')

test('project document export currency already formats with the naira symbol', () => {
  const source = fs.readFileSync(projectDocumentsPath, 'utf8')

  assert.match(source, /formatPdfCurrencyString\(toNumber\(value\)\)/)
})

test('industry adapter pre-formats currency and strips the naira sign for the Forme font path', () => {
  const adapterSource = fs.readFileSync(adapterPath, 'utf8')
  const sharedFontSource = fs.readFileSync(sharedFontsPath, 'utf8')
  const formatterSource = fs.readFileSync(formatterPath, 'utf8')

  assert.match(sharedFontSource, /PDF_CURRENCY_FONT_FAMILY = 'Noto Sans'/)
  assert.match(sharedFontSource, /family: PDF_CURRENCY_FONT_FAMILY/)
  assert.match(formatterSource, /PDF_CURRENCY_WITH_SPACE = `\$\{PDF_CURRENCY_SYMBOL\} `/)
  assert.match(adapterSource, /const formatted = formatPdfCurrencyString\(value as [^)]+\)/)
  assert.ok(adapterSource.includes(".replace(/^₦\\s*/, '')"))
})
