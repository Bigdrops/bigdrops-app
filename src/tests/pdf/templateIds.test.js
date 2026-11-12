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
    'landscape',
    'minimal',
    'evergreen',
    'architectural',
    'executive',
    'heritage',
    'mosaic',
  ])
  assert.equal(normalizeInvoicePdfTemplateId('industrial'), 'industrial')
  assert.equal(normalizeInvoicePdfTemplateId('industry'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-forme'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('industry-react-pdf'), 'industry')
  assert.equal(normalizeInvoicePdfTemplateId('landscape'), 'landscape')
  assert.equal(normalizeInvoicePdfTemplateId('modern-minimal'), 'minimal')
  assert.equal(normalizeInvoicePdfTemplateId('crest'), null)
  assert.equal(normalizeInvoicePdfTemplateId('minimal'), 'minimal')
  assert.equal(normalizeInvoicePdfTemplateId('evergreen'), 'evergreen')
  assert.equal(normalizeInvoicePdfTemplateId('architectural'), 'architectural')
  assert.equal(normalizeInvoicePdfTemplateId('executive'), 'executive')
  assert.equal(normalizeInvoicePdfTemplateId('heritage'), 'heritage')
  assert.equal(normalizeInvoicePdfTemplateId('heritage-house'), 'heritage')
  assert.equal(normalizeInvoicePdfTemplateId('mosaic'), 'mosaic')
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
