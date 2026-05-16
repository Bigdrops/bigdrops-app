import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canDeleteInvoice,
  canRevertInvoice,
  canTransitionTo,
  resolveEffectiveStatus,
} from '../../modules/invoices/domain/invoiceStatusTransitions.ts'

test('invoice status transitions allow active settlement progress but block terminal states', () => {
  assert.equal(canTransitionTo('unpaid', 'partially_paid'), true)
  assert.equal(canTransitionTo('unpaid', 'paid'), true)
  assert.equal(canTransitionTo('partially_paid', 'paid'), true)

  assert.equal(canTransitionTo('paid', 'unpaid'), false)
  assert.equal(canTransitionTo('voided', 'paid'), false)
  assert.equal(canTransitionTo('unknown', 'paid'), false)
})

test('resolveEffectiveStatus trusts computed financial state before stored invoice status', () => {
  assert.equal(resolveEffectiveStatus('unpaid', { paymentState: 'paid' }), 'paid')
  assert.equal(resolveEffectiveStatus('', null), 'unpaid')
})

test('revert and delete guards block archived or settled invoices', () => {
  assert.deepEqual(canRevertInvoice({ settledAmount: 0 }, null), { allowed: true })
  assert.deepEqual(canDeleteInvoice({ settledAmount: 0 }, null), { allowed: true })

  assert.equal(canRevertInvoice({ settledAmount: 1 }, null).allowed, false)
  assert.equal(canDeleteInvoice(null, '2026-05-16T00:00:00.000Z').allowed, false)
})
