import test from 'node:test'
import assert from 'node:assert/strict'

import { createBoluConversationState, boluConversationReducer } from '../../lib/ai-assistant/bolu-runtime.ts'
import { buildBoluPageContext } from '../../lib/ai-assistant/bolu-context.ts'

const dashboard = buildBoluPageContext('/', 'dashboard')
const invoice = buildBoluPageContext('/invoices/123e4567-e89b-12d3-a456-426614174000', 'contextual')

test('new conversation records one welcome and context', () => {
  const state = createBoluConversationState(dashboard)

  assert.equal(state.messages.length, 1)
  assert.equal(state.messages[0].role, 'assistant')
  assert.equal(state.context.origin.module, 'dashboard')
  assert.equal(state.welcomeShown, true)
})

test('reopen does not duplicate welcome or replace conversation context', () => {
  const state = createBoluConversationState(dashboard)
  const reopened = boluConversationReducer(state, { type: 'REOPEN', context: invoice })

  assert.equal(reopened.messages.length, 1)
  assert.equal(reopened.context.origin.module, 'dashboard')
  assert.deepEqual(reopened.pendingContext?.record, invoice.record)
})

test('user can explicitly apply new context without losing prior messages', () => {
  const state = createBoluConversationState(dashboard)
  const reopened = boluConversationReducer(state, { type: 'REOPEN', context: invoice })
  const changed = boluConversationReducer(reopened, { type: 'APPLY_CONTEXT' })

  assert.equal(changed.messages.length, 1)
  assert.equal(changed.context.origin.module, 'invoice')
  assert.equal(changed.pendingContext, null)
})

test('stop action returns active request to idle without deleting transcript', () => {
  let state = createBoluConversationState(dashboard)
  state = boluConversationReducer(state, { type: 'SUBMIT', text: 'Find invoice' })
  state = boluConversationReducer(state, { type: 'STOP' })

  assert.equal(state.status, 'idle')
  assert.equal(state.messages.at(-1).role, 'user')
})
