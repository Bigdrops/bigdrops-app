import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveAmountInWords } from '../../domain/document/amountInWords'
import { buildAmountInWordsProjection } from '../../domain/invoice/projections/financialProjection'

test('invoice projection prefers a stored amount-in-words value', () => {
  assert.equal(
    buildAmountInWordsProjection({ amount_in_words: 'Stored invoice text' }, {}, 1200),
    'Stored invoice text',
  )
})

test('invoice projection derives text from the authoritative payable total when stored text is empty', () => {
  assert.equal(
    buildAmountInWordsProjection({ amount_in_words: '' }, {}, 1200),
    'ONE THOUSAND TWO HUNDRED NAIRA ONLY',
  )
})

test('invoice projection suppresses text when the display setting is disabled', () => {
  assert.equal(
    buildAmountInWordsProjection({ amount_in_words: 'Stored invoice text' }, { showAmountInWords: false }, 1200),
    '',
  )
})

test('invoice projection handles zero and rejects missing or non-finite payable totals', () => {
  assert.equal(buildAmountInWordsProjection({}, {}, 0), 'ZERO NAIRA ONLY')
  assert.equal(buildAmountInWordsProjection({}, {}, undefined), '')
  assert.equal(buildAmountInWordsProjection({}, {}, Number.NaN), '')
})

test('invoice and quotation adapters share wording for equivalent payable totals', () => {
  const invoiceWords = buildAmountInWordsProjection({}, {}, 1200)
  const quotationWords = resolveAmountInWords({ payableTotal: 1200 })

  assert.equal(invoiceWords, quotationWords)
})

test('invoice PDF download transports preview amount-in-words to the shared PDF totals model', async () => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const handler = await readFile(resolve('src/components/document-view/invoice/invoicePdfActions.ts'), 'utf8')

  assert.match(handler, /amountInWords:\s*String\(targetPreviewModel\?\.previewAmountInWords \|\| ""\)/)
})
