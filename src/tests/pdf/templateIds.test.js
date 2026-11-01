import test from 'node:test'
import assert from 'node:assert/strict'

import {
  INVOICE_PDF_TEMPLATE_IDS,
  normalizeInvoicePdfTemplateId,
} from '../../domain/invoice/types.ts'

test('invoice pdf template ids keep live templates and reject legacy classic variants', () => {
  assert.deepEqual(INVOICE_PDF_TEMPLATE_IDS, [
    'industrial',
    'industry',
    'industry-forme',
    'industry-react-pdf',
    'crest',
    'minimal',
    'evergreen',
  ])
  assert.equal(normalizeInvoicePdfTemplateId('industrial'), 'industrial')
  assert.equal(normalizeInvoicePdfTemplateId('industry'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-forme'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-react-pdf'), 'industry-react-pdf')
  assert.equal(normalizeInvoicePdfTemplateId('crest'), 'crest')
  assert.equal(normalizeInvoicePdfTemplateId('minimal'), 'minimal')
  assert.equal(normalizeInvoicePdfTemplateId('evergreen'), 'evergreen')
  assert.equal(normalizeInvoicePdfTemplateId('bolt'), null)
  assert.equal(normalizeInvoicePdfTemplateId('ledger'), null)
  assert.equal(normalizeInvoicePdfTemplateId('ember'), null)
  assert.equal(normalizeInvoicePdfTemplateId('apex'), null)
  assert.equal(normalizeInvoicePdfTemplateId('naijabiz'), null)
  assert.equal(normalizeInvoicePdfTemplateId('classic'), null)
  assert.equal(normalizeInvoicePdfTemplateId('bold'), null)
  assert.equal(normalizeInvoicePdfTemplateId('compact'), null)
  assert.equal(normalizeInvoicePdfTemplateId('proforma'), null)
})
