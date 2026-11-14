import test from 'node:test'
import assert from 'node:assert/strict'

import { validateBoluProviderRequest } from '../../lib/ai-assistant/bolu-provider.ts'

test('provider request requires authenticated user and bounded messages', () => {
  assert.equal(validateBoluProviderRequest({ userId: '', messages: [] }).ok, false)
  assert.equal(validateBoluProviderRequest({ userId: 'user-1', messages: [] }).ok, false)
  assert.equal(
    validateBoluProviderRequest({
      userId: 'user-1',
      messages: [{ role: 'user', content: 'x'.repeat(5000) }],
    }).ok,
    false,
  )
})

test('provider request allows only bounded user and assistant messages', () => {
  const result = validateBoluProviderRequest({
    userId: 'user-1',
    messages: [
      { role: 'user', content: 'Explain this invoice.' },
      { role: 'assistant', content: 'I can help.' },
    ],
  })

  assert.equal(result.ok, true)
  assert.deepEqual(result.messages.map((message) => message.role), ['user', 'assistant'])
})
