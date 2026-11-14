import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAdapterHeaders,
  buildChatPayload,
  classifyProviderFailure,
  resolveChatEndpoint,
  resolveModelsEndpoint,
} from '../../lib/ai-assistant/provider-adapters.ts'

const openaiConfig = {
  providerId: 'openai',
  protocol: 'openai',
  authScheme: 'bearer',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-test-key',
  model: 'gpt-4o-mini',
  timeoutMs: 45000,
}

const anthropicConfig = {
  ...openaiConfig,
  providerId: 'anthropic',
  protocol: 'anthropic',
  authScheme: 'x-api-key',
  baseUrl: 'https://api.anthropic.com/v1',
  apiKey: 'sk-ant-test',
  model: 'claude-sonnet-4-5',
}

test('resolveChatEndpoint normalizes per protocol without double suffixes', () => {
  assert.equal(resolveChatEndpoint('https://api.openai.com/v1', 'openai'), 'https://api.openai.com/v1/chat/completions')
  assert.equal(resolveChatEndpoint('https://api.openai.com/v1/', 'openai'), 'https://api.openai.com/v1/chat/completions')
  assert.equal(resolveChatEndpoint('https://api.openai.com/v1/chat/completions', 'openai'), 'https://api.openai.com/v1/chat/completions')
  assert.equal(resolveChatEndpoint('https://api.anthropic.com/v1', 'anthropic'), 'https://api.anthropic.com/v1/messages')
  assert.equal(resolveChatEndpoint('https://api.anthropic.com/v1/messages', 'anthropic'), 'https://api.anthropic.com/v1/messages')
})

test('resolveModelsEndpoint strips chat/messages suffixes before appending models', () => {
  assert.equal(resolveModelsEndpoint('https://api.openai.com/v1'), 'https://api.openai.com/v1/models')
  assert.equal(resolveModelsEndpoint('https://api.openai.com/v1/chat/completions'), 'https://api.openai.com/v1/models')
  assert.equal(resolveModelsEndpoint('https://api.anthropic.com/v1/messages'), 'https://api.anthropic.com/v1/models')
  assert.equal(resolveModelsEndpoint('https://api.openai.com/v1/'), 'https://api.openai.com/v1/models')
})

test('buildAdapterHeaders is provider-aware (bearer vs x-api-key) and adds routing headers', () => {
  const bearer = buildAdapterHeaders(openaiConfig)
  assert.equal(bearer['Authorization'], 'Bearer sk-test-key')
  assert.equal(bearer['Content-Type'], 'application/json')
  assert.equal(bearer['x-api-key'], undefined)
  assert.equal(bearer['HTTP-Referer'], undefined)

  const anthropic = buildAdapterHeaders(anthropicConfig)
  assert.equal(anthropic['x-api-key'], 'sk-ant-test')
  assert.equal(anthropic['anthropic-version'], '2023-06-01')
  assert.equal(anthropic['Authorization'], undefined)

  const openrouter = buildAdapterHeaders({ ...openaiConfig, providerId: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1' })
  assert.equal(openrouter['HTTP-Referer'], 'https://bourxe.com')
  assert.equal(openrouter['X-Title'], 'BOURXE Bolu')
})

test('buildChatPayload separates Anthropic system prompts and keeps OpenAI turns intact', () => {
  const messages = [
    { role: 'system', content: 'You are Bolu.' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi' },
  ]

  const openai = buildChatPayload(openaiConfig, messages, { stream: true, maxTokens: 1000, temperature: 0.1 })
  assert.equal(openai.model, 'gpt-4o-mini')
  assert.equal(openai.max_tokens, 1000)
  assert.equal(openai.stream, true)
  assert.equal(openai.temperature, 0.1)
  assert.equal(openai.messages.length, 3)
  assert.equal(openai.system, undefined)

  const anthropic = buildChatPayload(anthropicConfig, messages, { stream: false, maxTokens: 16 })
  assert.equal(anthropic.system, 'You are Bolu.')
  assert.equal(anthropic.max_tokens, 16)
  assert.deepEqual(anthropic.messages.map((m) => m.role), ['user', 'assistant'])
  assert.equal(anthropic.temperature, undefined)

  // No system message -> no system key.
  const noSystem = buildChatPayload(anthropicConfig, [{ role: 'user', content: 'Hi' }], { stream: false, maxTokens: 16 })
  assert.equal(noSystem.system, undefined)
})

test('classifyProviderFailure maps HTTP status to actionable categories', () => {
  const body = '{"error":{"message":"detail"}}'
  const cases = [
    [401, 'provider_auth'],
    [403, 'provider_auth'],
    [404, 'provider_not_found'],
    [429, 'provider_rate_limit'],
    [400, 'provider_bad_request'],
    [422, 'provider_bad_request'],
    [500, 'provider_server'],
    [503, 'provider_server'],
    [418, 'unknown'],
  ]
  for (const [status, category] of cases) {
    const result = classifyProviderFailure(status, body)
    assert.equal(result.category, category, `HTTP ${status}`)
    assert.ok(result.message.length > 0)
    assert.ok(result.suggestedAction.length > 0)
  }
})