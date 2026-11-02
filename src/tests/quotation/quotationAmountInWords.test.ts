import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveAmountInWords } from '../../domain/document/amountInWords'
import { buildQuotationPreviewModel } from '../../domain/quotation/previewModel'

test('stored amount in words wins over a computed fallback', () => {
  assert.equal(
    resolveAmountInWords({ stored: 'Five Hundred Naira Only', payableTotal: 1200 }),
    'Five Hundred Naira Only',
  )
})

test('shared resolver preserves nonempty stored text exactly', () => {
  assert.equal(resolveAmountInWords({ stored: '  Stored text  ', payableTotal: 1200 }), '  Stored text  ')
})

test('quotation preview derives words from the authoritative payable total when stored text is blank', () => {
  const preview = buildQuotationPreviewModel({
    quotation: { amount_in_words: '' },
    items: [],
    totals: { subtotal: 1200, totalPayable: 1200 },
    client: null,
    settings: {},
    bankAccounts: [],
    customFields: {},
    resolvedSignatory: null,
    pdfOutput: {},
    linkedProject: null,
  })

  assert.equal(
    preview.previewAmountInWords,
    'ONE THOUSAND TWO HUNDRED NAIRA ONLY',
  )
})

test('quotation preview preserves a nonempty stored amount-in-words value', () => {
  const preview = buildQuotationPreviewModel({
    quotation: { amount_in_words: 'Stored quotation text' },
    items: [],
    totals: { totalPayable: 1200 },
    client: null,
    settings: {},
    bankAccounts: [],
    customFields: {},
    resolvedSignatory: null,
    pdfOutput: {},
    linkedProject: null,
  })

  assert.equal(preview.previewAmountInWords, 'Stored quotation text')
})

test('shared resolver preserves the converter wording for a numeric zero payable total', () => {
  assert.equal(
    resolveAmountInWords({ stored: null, payableTotal: 0 }),
    'ZERO NAIRA ONLY',
  )
})

test('quotation preview derives the converter wording for a zero payable total', () => {
  const preview = buildQuotationPreviewModel({
    quotation: {},
    items: [],
    totals: { totalPayable: 0 },
    client: null,
    settings: {},
    bankAccounts: [],
    customFields: {},
    resolvedSignatory: null,
    pdfOutput: {},
    linkedProject: null,
  })

  assert.equal(preview.previewAmountInWords, 'ZERO NAIRA ONLY')
})

test('missing and non-finite payable totals produce no fabricated words', () => {
  assert.equal(resolveAmountInWords({ stored: null, payableTotal: undefined }), '')
  assert.equal(resolveAmountInWords({ stored: '', payableTotal: Number.NaN }), '')
  assert.equal(resolveAmountInWords({ stored: '', payableTotal: Number.POSITIVE_INFINITY }), '')
})

test('show=false suppresses amount in words', () => {
  assert.equal(
    resolveAmountInWords({ stored: 'Five Hundred Naira Only', show: false, payableTotal: 1200 }),
    '',
  )
})

test('quotation preview suppresses text when disabled and returns blank for missing or invalid totals', () => {
  const buildPreview = (quotation: Record<string, unknown>, totalPayable: number | undefined, pdfOutput: Record<string, unknown> = {}) =>
    buildQuotationPreviewModel({
      quotation,
      items: [],
      totals: { totalPayable },
      client: null,
      settings: {},
      bankAccounts: [],
      customFields: {},
      resolvedSignatory: null,
      pdfOutput,
      linkedProject: null,
    })

  assert.equal(buildPreview({ amount_in_words: 'Stored quotation text' }, 1200, { showAmountInWords: false }).previewAmountInWords, '')
  assert.equal(buildPreview({}, undefined).previewAmountInWords, '')
  assert.equal(buildPreview({}, Number.NaN).previewAmountInWords, '')
})

test('quotation preview and shared resolver agree for the same payable total', () => {
  const preview = buildQuotationPreviewModel({
    quotation: {},
    items: [],
    totals: { subtotal: 1200, totalPayable: 1200 },
    client: null,
    settings: {},
    bankAccounts: [],
    customFields: {},
    resolvedSignatory: null,
    pdfOutput: {},
    linkedProject: null,
  })

  assert.equal(preview.previewAmountInWords, resolveAmountInWords({ payableTotal: 1200 }))
})

test('quotation PDF download transports the prepared preview amount-in-words value', async () => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const handler = await readFile(resolve('src/domain/quotation/pdfDownloadHandler.ts'), 'utf8')

  assert.match(handler, /amountInWords:\s*String\(previewModel\?\.previewAmountInWords \|\| ""\)/)
})
