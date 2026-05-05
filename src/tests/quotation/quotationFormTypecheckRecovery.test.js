import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const quotationFormPath = path.resolve('src/components/quotation/QuotationForm.tsx')

test('quotation form restores the missing PdfOutputState and toGroupMetaMap references from existing quotation modules', () => {
  const source = fs.readFileSync(quotationFormPath, 'utf8')

  assert.match(source, /PdfOutputState/)
  assert.match(source, /toGroupMetaMap/)
  assert.match(source, /from '\.\/quotationFormTypes'/)
  assert.match(source, /from '\.\/quotationFormUtils'/)
})
