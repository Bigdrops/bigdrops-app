import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getBoluProviderConfig,
  buildProviderHeaders,
  normalizeChatEndpoint,
} from '../../lib/ai-assistant/bolu-provider.ts'
import { maskKey } from '../../lib/ai-assistant/protocol.ts'

test('AMD provider configuration resolves exact official Token Factory endpoints and defaults', () => {
  const config = getBoluProviderConfig({
    BOLU_PROVIDER_NAME: 'amd',
    BOLU_PROVIDER_API_KEY: 'rc-valid-token-factory-key',
  })

  assert.equal(config.provider, 'amd')
  assert.equal(config.baseUrl, 'https://developer.amd.com.cn/radeon/api/v1')
  assert.equal(config.endpoint, 'https://developer.amd.com.cn/radeon/api/v1/chat/completions')
  assert.equal(config.model, 'DeepSeek-V4-Flash')
  assert.equal(config.mode, 'live')
  assert.equal(config.isConfigured, true)
  assert.equal(config.apiKey, 'rc-valid-token-factory-key')
  assert.equal(config.timeoutMs, 45000)
})

test('AMD provider key rotation cleanly updates active credentials and models', () => {
  // Initial configuration
  const initialEnv = {
    BOLU_PROVIDER_NAME: 'amd',
    BOLU_PROVIDER_API_KEY: 'rc-key-version-1',
    BOLU_PROVIDER_MODEL: 'DeepSeek-V4-Flash',
  }
  const initialConfig = getBoluProviderConfig(initialEnv)
  assert.equal(initialConfig.apiKey, 'rc-key-version-1')
  assert.equal(initialConfig.model, 'DeepSeek-V4-Flash')

  // Rotated configuration with new key and model upgrade
  const rotatedEnv = {
    ...initialEnv,
    BOLU_PROVIDER_API_KEY: 'rc-key-version-2',
    BOLU_PROVIDER_MODEL: 'DeepSeek-V4.1-Flash',
    BOLU_PROVIDER_TIMEOUT_MS: '60000',
  }
  const rotatedConfig = getBoluProviderConfig(rotatedEnv)
  assert.equal(rotatedConfig.apiKey, 'rc-key-version-2')
  assert.equal(rotatedConfig.model, 'DeepSeek-V4.1-Flash')
  assert.equal(rotatedConfig.timeoutMs, 60000)
  assert.equal(rotatedConfig.endpoint, 'https://developer.amd.com.cn/radeon/api/v1/chat/completions')
})

test('Smart auto-detection infers AMD provider from rc- key prefix without explicit provider name', () => {
  const config = getBoluProviderConfig({
    BOLU_PROVIDER_API_KEY: 'rc-unnamed-provider-key-99',
  })

  assert.equal(config.provider, 'amd')
  assert.equal(config.baseUrl, 'https://developer.amd.com.cn/radeon/api/v1')
  assert.equal(config.model, 'DeepSeek-V4-Flash')
  assert.equal(config.endpoint, 'https://developer.amd.com.cn/radeon/api/v1/chat/completions')
})

test('buildProviderHeaders produces clean headers for AMD without OpenRouter referer tags', () => {
  const amdConfig = getBoluProviderConfig({
    BOLU_PROVIDER_NAME: 'amd',
    BOLU_PROVIDER_API_KEY: 'rc-secret-token',
  })
  const headers = buildProviderHeaders(amdConfig)

  assert.equal(headers['Content-Type'], 'application/json')
  assert.equal(headers['Authorization'], 'Bearer rc-secret-token')
  assert.equal(headers['HTTP-Referer'], undefined)
  assert.equal(headers['X-Title'], undefined)
})

test('maskKey safely conceals AMD keys showing only last 4 characters', () => {
  assert.equal(maskKey('rc-1234567890abcdef'), '••••cdef')
  assert.equal(maskKey('rc-short'), '••••')
  assert.equal(maskKey(''), '')
})
