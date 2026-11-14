import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CUSTOM_PROVIDER_ID,
  PROVIDER_CATALOGUE,
  getCatalogueEntry,
  isCustomProvider,
  resolveProviderDefaults,
} from '../../lib/ai-assistant/provider-catalog.ts'

test('catalogue contains only verified, https, well-formed provider contracts', () => {
  assert.equal(PROVIDER_CATALOGUE.length, 20)

  const ids = new Set()
  for (const entry of PROVIDER_CATALOGUE) {
    assert.ok(entry.id && !ids.has(entry.id), `unique id: ${entry.id}`)
    ids.add(entry.id)
    assert.ok(entry.name.trim().length > 0)
    assert.ok(entry.baseUrl.startsWith('https://'), `${entry.id} uses https`)
    assert.ok(entry.docsUrl.startsWith('https://'), `${entry.id} docs https`)
    assert.ok(['openai', 'anthropic'].includes(entry.protocol))
    assert.ok(['bearer', 'x-api-key'].includes(entry.authScheme))
    assert.ok(entry.defaultModel.trim().length > 0)
    assert.ok(entry.curatedModels.length > 0)
    // The suggested default must be one of the curated starting points.
    assert.ok(
      entry.curatedModels.some((m) => m.id === entry.defaultModel),
      `${entry.id} defaultModel is curated`,
    )
    for (const model of entry.curatedModels) {
      assert.ok(model.id.trim().length > 0)
      assert.ok(model.label.trim().length > 0)
    }
  }
})

test('only Anthropic uses the native messages protocol and x-api-key auth', () => {
  const anthropic = getCatalogueEntry('anthropic')
  assert.equal(anthropic.protocol, 'anthropic')
  assert.equal(anthropic.authScheme, 'x-api-key')

  for (const entry of PROVIDER_CATALOGUE) {
    if (entry.id === 'anthropic') continue
    assert.equal(entry.protocol, 'openai', `${entry.id} is openai-compatible`)
    assert.equal(entry.authScheme, 'bearer', `${entry.id} uses bearer`)
  }
})

test('model discovery is honestly flagged per documented contract', () => {
  // Zhipu does not expose a documented model-listing endpoint.
  assert.equal(getCatalogueEntry('zhipu').supportsDiscovery, false)
  for (const entry of PROVIDER_CATALOGUE) {
    if (entry.id === 'zhipu') continue
    assert.equal(entry.supportsDiscovery, true, `${entry.id} supports discovery`)
  }
})

test('data-routing region notes are present for China-hosted endpoints', () => {
  assert.match(getCatalogueEntry('amd').regionNote, /China|amd\.com\.cn/i)
  assert.match(getCatalogueEntry('zhipu').regionNote, /China/i)
  assert.ok(getCatalogueEntry('qwen').regionNote)
})

test('getCatalogueEntry resolves known ids and rejects unknown ids', () => {
  assert.equal(getCatalogueEntry('amd').id, 'amd')
  assert.equal(getCatalogueEntry('openrouter').baseUrl, 'https://openrouter.ai/api/v1')
  assert.equal(getCatalogueEntry('does-not-exist'), undefined)
})

test('isCustomProvider only matches the reserved custom id', () => {
  assert.equal(CUSTOM_PROVIDER_ID, 'custom')
  assert.equal(isCustomProvider('custom'), true)
  assert.equal(isCustomProvider('amd'), false)
  assert.equal(isCustomProvider(''), false)
})

test('resolveProviderDefaults requires full overrides for custom providers', () => {
  assert.equal(resolveProviderDefaults('custom'), null)
  assert.equal(resolveProviderDefaults('custom', { baseUrl: 'https://x.ai/v1' }), null)
  assert.equal(
    resolveProviderDefaults('custom', { baseUrl: 'https://x.ai/v1', protocol: 'openai' }),
    null,
  )
  assert.deepEqual(
    resolveProviderDefaults('custom', {
      baseUrl: 'https://x.ai/v1',
      protocol: 'anthropic',
      authScheme: 'x-api-key',
    }),
    { protocol: 'anthropic', authScheme: 'x-api-key', baseUrl: 'https://x.ai/v1' },
  )
})

test('resolveProviderDefaults returns catalogue defaults and honors overrides', () => {
  assert.deepEqual(resolveProviderDefaults('amd'), {
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://developer.amd.com.cn/radeon/api/v1',
  })
  assert.deepEqual(resolveProviderDefaults('anthropic'), {
    protocol: 'anthropic',
    authScheme: 'x-api-key',
    baseUrl: 'https://api.anthropic.com/v1',
  })
  // Explicit override wins.
  assert.equal(
    resolveProviderDefaults('amd', { baseUrl: 'https://proxy.example/v1' }).baseUrl,
    'https://proxy.example/v1',
  )
  // Whitespace-only override falls back to the catalogue endpoint.
  assert.equal(
    resolveProviderDefaults('amd', { baseUrl: '   ' }).baseUrl,
    'https://developer.amd.com.cn/radeon/api/v1',
  )
  assert.equal(resolveProviderDefaults('unknown-provider'), null)
})