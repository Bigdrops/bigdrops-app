import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAvailableBoluCapabilities,
  matchBoluIntent,
} from '../../lib/ai-assistant/bolu-capabilities.ts'

const dashboard = {
  origin: { module: 'dashboard', page: 'dashboard-home', pathname: '/', launcher: 'dashboard' },
  formState: 'none',
  filters: {},
  record: null,
}
const invoiceDetail = {
  origin: { module: 'invoice', page: 'invoice-detail', pathname: '/invoices/1', launcher: 'contextual' },
  formState: 'none',
  filters: {},
  record: { kind: 'invoice', id: '1', persistence: 'persisted' },
}
const quotationDetail = {
  origin: { module: 'quotation', page: 'quotation-detail', pathname: '/quotations/1', launcher: 'contextual' },
  formState: 'none',
  filters: {},
  record: { kind: 'quotation', id: '1', persistence: 'persisted' },
}

test('only read capabilities are available', () => {
  assert.deepEqual(getAvailableBoluCapabilities(dashboard), [
    'search-invoices',
    'read-receivables',
    'search-quotations',
  ])
})

test('invoice search matches natural language and document numbers', () => {
  assert.equal(matchBoluIntent('Find invoice INV-00124'), 'search-invoices')
  assert.equal(matchBoluIntent('Find the invoice for Sun & Shield'), 'search-invoices')
})

test('receivable questions map to authoritative receivables capability', () => {
  assert.equal(matchBoluIntent('Show outstanding invoices'), 'read-receivables')
  assert.equal(matchBoluIntent('Which invoices are overdue?'), 'read-receivables')
})

test('record-specific requests use the current record capability', () => {
  assert.equal(matchBoluIntent('Explain this invoice', invoiceDetail), 'read-receivables')
  assert.equal(matchBoluIntent('Check payment status for this invoice', invoiceDetail), 'read-receivables')
  assert.equal(matchBoluIntent('Show this quotation status', quotationDetail), 'search-quotations')
})

test('unsupported or mutating requests do not map to a read capability', () => {
  assert.equal(matchBoluIntent('Create an invoice'), null)
  assert.equal(matchBoluIntent('Record a payment'), null)
  assert.equal(matchBoluIntent('Tell me a joke'), null)
})
