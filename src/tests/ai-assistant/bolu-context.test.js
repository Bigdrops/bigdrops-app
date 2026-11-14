import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildBoluPageContext,
  getBoluWelcome,
  getBoluSuggestions,
} from '../../lib/ai-assistant/bolu-context.ts'

test('dashboard context has dashboard-specific BI suggestions', () => {
  const context = buildBoluPageContext('/', 'dashboard')

  assert.equal(context.origin.module, 'dashboard')
  assert.equal(context.origin.page, 'dashboard-home')
  assert.deepEqual(getBoluSuggestions(context).map((item) => item.id), [
    'outstanding-invoices',
    'find-invoice',
    'find-quotation',
  ])
})

test('invoice detail context distinguishes persisted record references', () => {
  const context = buildBoluPageContext('/invoices/123e4567-e89b-12d3-a456-426614174000', 'contextual')

  assert.equal(context.origin.module, 'invoice')
  assert.equal(context.origin.page, 'invoice-detail')
  assert.deepEqual(context.record, {
    kind: 'invoice',
    id: '123e4567-e89b-12d3-a456-426614174000',
    persistence: 'persisted',
  })
  assert.match(getBoluWelcome(context), /viewing an invoice/i)
})

test('invoice draft routes do not claim a persisted record', () => {
  const context = buildBoluPageContext('/invoices/new', 'dashboard')

  assert.equal(context.origin.module, 'invoice')
  assert.equal(context.record, null)
  assert.equal(context.origin.page, 'invoice-draft')
  assert.equal(context.formState, 'unsaved-draft')
})

test('unknown routes use a general fallback without business data', () => {
  const context = buildBoluPageContext('/tax/new', 'contextual')

  assert.equal(context.origin.module, 'other')
  assert.equal(context.origin.page, 'other-page')
  assert.deepEqual(getBoluSuggestions(context).map((item) => item.id), ['find-invoice'])
})
