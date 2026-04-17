import test from 'node:test'
import assert from 'node:assert/strict'

import { getUserFacingMutationMessage } from '../../lib/userFacingMutationErrors.ts'

test('maps missing client database errors to user-facing save guidance', () => {
  const message = getUserFacingMutationMessage(
    new Error('null value in column "client_id" of relation "invoices" violates not-null constraint'),
    { action: 'save' },
  )

  assert.equal(message, 'Pick a client before saving')
})

test('maps required-field database errors without exposing technical details', () => {
  const message = getUserFacingMutationMessage(
    new Error('null value in column "invoice_number" of relation "invoices" violates not-null constraint'),
    { action: 'save' },
  )

  assert.equal(message, 'Please fill the required field')
})

test('maps duplicate or conflict database errors to plain language', () => {
  const message = getUserFacingMutationMessage(
    new Error('duplicate key value violates unique constraint "clients_name_key"'),
    { action: 'create' },
  )

  assert.equal(message, 'This already exists')
})

test('falls back to a clean generic save message', () => {
  const message = getUserFacingMutationMessage(new Error('unexpected postgres failure'), { action: 'save' })

  assert.equal(message, 'Could not save right now. Try again.')
})
