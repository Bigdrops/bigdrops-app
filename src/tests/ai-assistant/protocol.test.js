import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AI_CHAT_MAX_TOKENS,
  buildChatRequestBody,
  classifyProviderFailure,
  extractSseText,
  maskKey,
  readProviderErrorBody,
} from '../../lib/ai-assistant/protocol.ts'

test('the request carries only the accepted parameters', () => {
  const body = buildChatRequestBody('openrouter/free', [
    { role: 'user', content: 'hello' },
  ])

  assert.deepEqual(Object.keys(body).sort(), ['max_tokens', 'messages', 'model', 'stream'])
  assert.equal(body.stream, true)
  assert.equal(body.max_tokens, AI_CHAT_MAX_TOKENS)
  assert.equal(body.model, 'openrouter/free')

  for (const banned of ['stop', 'seed', 'logit_bias', 'logprobs', 'top_k', 'min_p', 'repetition_penalty', 'thinking']) {
    assert.equal(banned in body, false, `${banned} must not be sent`)
  }
})

test('the request copies messages without extra fields', () => {
  const body = buildChatRequestBody('model', [
    { role: 'user', content: 'a', extra: 'dropped' },
  ])

  assert.deepEqual(body.messages, [{ role: 'user', content: 'a' }])
})

test('quota, auth and server failures advance the chain', () => {
  assert.equal(classifyProviderFailure(429), 'advance')
  assert.equal(classifyProviderFailure(401), 'advance')
  assert.equal(classifyProviderFailure(403), 'advance')
  assert.equal(classifyProviderFailure(404), 'advance')
  assert.equal(classifyProviderFailure(500), 'advance')
  assert.equal(classifyProviderFailure(502), 'advance')
  assert.equal(classifyProviderFailure(503), 'advance')
  assert.equal(classifyProviderFailure(504), 'advance')
  assert.equal(classifyProviderFailure(529), 'advance')
})

test('a bad request stops the chain', () => {
  assert.equal(classifyProviderFailure(400), 'stop')
  assert.equal(classifyProviderFailure(422), 'stop')
  assert.equal(classifyProviderFailure(200), 'stop')
})

test('a stream delta is read from an OpenAI compatible chunk', () => {
  const line = 'data: {"choices":[{"delta":{"content":"Hello"}}]}'
  assert.equal(extractSseText(line), 'Hello')
})

test('a stream line with no text is ignored', () => {
  assert.equal(extractSseText('data: [DONE]'), null)
  assert.equal(extractSseText('data: {"choices":[{"delta":{}}]}'), null)
  assert.equal(extractSseText('data: {"choices":[]}'), null)
  assert.equal(extractSseText(': keep-alive'), null)
  assert.equal(extractSseText(''), null)
  assert.equal(extractSseText('data: not-json'), null)
})

test('a non streaming message body is still readable', () => {
  const line = 'data: {"choices":[{"message":{"content":"Full answer"}}]}'
  assert.equal(extractSseText(line), 'Full answer')
})

test('a key is masked to the last four characters', () => {
  assert.equal(maskKey('nvapi-abcdefghijklmnop1234'), '••••1234')
  assert.equal(maskKey('short'), '••••')
  assert.equal(maskKey('   '), '')
})

test('an error body message is read without the key', () => {
  assert.equal(
    readProviderErrorBody('{"error":{"message":"Rate limit reached"}}'),
    'Rate limit reached',
  )
  assert.equal(readProviderErrorBody('{"message":"Model not found"}'), 'Model not found')
  assert.equal(readProviderErrorBody(''), 'The provider returned no message.')
  assert.equal(readProviderErrorBody('<html>502</html>'), '<html>502</html>')
})
