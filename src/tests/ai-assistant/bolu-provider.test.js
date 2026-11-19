import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildProviderHeaders,
  getBoluProviderConfig,
  normalizeChatEndpoint,
  validateBoluProviderRequest,
} from '../../lib/ai-assistant/bolu-provider.ts'

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

test('normalizeChatEndpoint normalizes base URLs to chat completions endpoint', () => {
  assert.equal(
    normalizeChatEndpoint('https://openrouter.ai/api/v1'),
    'https://openrouter.ai/api/v1/chat/completions',
  )
  assert.equal(
    normalizeChatEndpoint('https://openrouter.ai/api/v1/'),
    'https://openrouter.ai/api/v1/chat/completions',
  )
  assert.equal(
    normalizeChatEndpoint('https://openrouter.ai/api/v1/chat/completions'),
    'https://openrouter.ai/api/v1/chat/completions',
  )
  assert.equal(
    normalizeChatEndpoint('https://developer.amd.com.cn/radeon/api/v1'),
    'https://developer.amd.com.cn/radeon/api/v1/chat/completions',
  )
})

test('getBoluProviderConfig extracts server-side configuration safely', () => {
  // Missing key in live mode -> not configured
  const emptyConfig = getBoluProviderConfig({})
  assert.equal(emptyConfig.isConfigured, false)
  assert.equal(emptyConfig.apiKey, null)
  assert.equal(emptyConfig.mode, 'live')
  assert.equal(emptyConfig.timeoutMs, 45000)

  // Configured with custom environment
  const liveConfig = getBoluProviderConfig({
    BOLU_PROVIDER_NAME: 'openrouter',
    BOLU_PROVIDER_BASE_URL: 'https://openrouter.ai/api/v1',
    BOLU_PROVIDER_API_KEY: 'sk-or-test-key-1234',
    BOLU_PROVIDER_MODEL: 'meta-llama/llama-3.3-70b-instruct',
    BOLU_PROVIDER_TIMEOUT_MS: '60000',
  })
  assert.equal(liveConfig.isConfigured, true)
  assert.equal(liveConfig.apiKey, 'sk-or-test-key-1234')
  assert.equal(liveConfig.model, 'meta-llama/llama-3.3-70b-instruct')
  assert.equal(liveConfig.endpoint, 'https://openrouter.ai/api/v1/chat/completions')
  assert.equal(liveConfig.timeoutMs, 60000)

  // Mock mode is considered configured without API key
  const mockConfig = getBoluProviderConfig({
    BOLU_PROVIDER_MODE: 'mock',
  })
  assert.equal(mockConfig.mode, 'mock')
  assert.equal(mockConfig.isConfigured, true)

  // Backwards compatibility with BOLU_AMD_API_KEY and auto-detection of AMD key prefix
  const amdLegacyConfig = getBoluProviderConfig({
    BOLU_AMD_API_KEY: 'amd-test-key',
  })
  assert.equal(amdLegacyConfig.provider, 'amd')
  assert.equal(amdLegacyConfig.apiKey, 'amd-test-key')
  assert.equal(amdLegacyConfig.isConfigured, true)
  assert.equal(amdLegacyConfig.model, 'DeepSeek-V4-Flash')
  assert.equal(amdLegacyConfig.endpoint, 'https://developer.amd.com.cn/radeon/api/v1/chat/completions')

  const amdRcPrefixConfig = getBoluProviderConfig({
    BOLU_PROVIDER_API_KEY: 'rc-token-factory-key',
  })
  assert.equal(amdRcPrefixConfig.provider, 'amd')
  assert.equal(amdRcPrefixConfig.apiKey, 'rc-token-factory-key')
  assert.equal(amdRcPrefixConfig.model, 'DeepSeek-V4-Flash')
  assert.equal(amdRcPrefixConfig.endpoint, 'https://developer.amd.com.cn/radeon/api/v1/chat/completions')
})

test('buildProviderHeaders sets authorization and provider-specific headers', () => {
  const openRouterConfig = getBoluProviderConfig({
    BOLU_PROVIDER_NAME: 'openrouter',
    BOLU_PROVIDER_API_KEY: 'sk-or-test-key-1234',
  })
  const openRouterHeaders = buildProviderHeaders(openRouterConfig)
  assert.equal(openRouterHeaders['Content-Type'], 'application/json')
  assert.equal(openRouterHeaders['Authorization'], 'Bearer sk-or-test-key-1234')
  assert.equal(openRouterHeaders['HTTP-Referer'], 'https://bouxre.com')
  assert.equal(openRouterHeaders['X-Title'], 'BOUXRE Bolu')

  const amdConfig = getBoluProviderConfig({
    BOLU_PROVIDER_NAME: 'amd',
    BOLU_PROVIDER_API_KEY: 'rc-amd-key-5678',
  })
  const amdHeaders = buildProviderHeaders(amdConfig)
  assert.equal(amdHeaders['Content-Type'], 'application/json')
  assert.equal(amdHeaders['Authorization'], 'Bearer rc-amd-key-5678')
  assert.equal(amdHeaders['HTTP-Referer'], undefined)
  assert.equal(amdHeaders['X-Title'], undefined)
})
