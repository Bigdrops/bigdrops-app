import test from 'node:test'
import assert from 'node:assert/strict'

import {
  INVOICE_PDF_TEMPLATE_IDS,
  normalizeInvoicePdfTemplateId,
} from '../../domain/invoice/types.ts'

test('invoice pdf template ids keep live templates and reject legacy classic variants', () => {
  assert.deepEqual(INVOICE_PDF_TEMPLATE_IDS, ['industry', 'ledger', 'crest', 'minimal', 'evergreen', 'bolt', 'ember'])
  assert.equal(normalizeInvoicePdfTemplateId('bolt'), 'bolt')
  assert.equal(normalizeInvoicePdfTemplateId('apex'), null)
  assert.equal(normalizeInvoicePdfTemplateId('naijabiz'), null)
  assert.equal(normalizeInvoicePdfTemplateId('classic'), null)
  assert.equal(normalizeInvoicePdfTemplateId('bold'), null)
  assert.equal(normalizeInvoicePdfTemplateId('compact'), null)
  assert.equal(normalizeInvoicePdfTemplateId('proforma'), null)
})
