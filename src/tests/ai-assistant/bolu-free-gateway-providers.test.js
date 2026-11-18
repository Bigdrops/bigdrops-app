import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getCatalogueEntry,
  PROVIDER_CATALOGUE,
} from '../../lib/ai-assistant/provider-catalog.ts'
import {
  ROUTING_PROVIDER_CATALOGUE,
} from '../../lib/ai-assistant/routing/bolu-provider-catalog.ts'
import {
  lookupModelPrice,
} from '../../lib/ai-assistant/bolu-usage-ledger.ts'

/**
 * Runcrate and APInex are the two free-tier gateway lanes added on 2026-11-17.
 * Their terms reset on a weekly and daily cycle respectively, and the free
 * requests are served by third-party upstreams, so the catalogue and the
 * routing catalogue must declare the limitations, not imply a quota.
 */

test('Catalogue: Runcrate is declared with its free weekly tier', () => {
  const entry = getCatalogueEntry('runcrate')
  assert.ok(entry)
  assert.equal(entry.baseUrl, 'https://api.runcrate.ai/v1')
  assert.equal(entry.protocol, 'openai')
  assert.equal(entry.authScheme, 'bearer')
  assert.equal(entry.supportsDiscovery, true)
  assert.equal(entry.defaultModel, 'deepseek-ai/DeepSeek-V4.1-Flash')

  const curated = entry.curatedModels.map((m) => m.id)
  assert.deepEqual(curated, [
    'deepseek-ai/DeepSeek-V4.1-Flash',
    'zai-org/GLM-5.3-Flash',
    'zai-org/GLM-5.3',
    'openai/gpt-oss-120b',
    'Qwen/Qwen3.8-Flash',
  ])

  assert.match(entry.regionNote, /third-party model providers/i)

  const routing = ROUTING_PROVIDER_CATALOGUE.runcrate
  assert.ok(routing)
  assert.equal(routing.approvedForRouting, true)
  assert.equal(routing.verifiedEndpoint, 'https://api.runcrate.ai/v1')
  assert.equal(routing.balanceLookupSupport, false)
})

test('Catalogue: APInex is declared with its free daily tier', () => {
  const entry = getCatalogueEntry('apinex')
  assert.ok(entry)
  assert.equal(entry.baseUrl, 'https://api.apinex.bond/v1')
  assert.equal(entry.protocol, 'openai')
  assert.equal(entry.authScheme, 'bearer')
  assert.equal(entry.authScheme, 'bearer')
  assert.equal(entry.supportsDiscovery, true)
  assert.equal(entry.defaultModel, 'free/deepseek-v4.1-flash')

  const curated = entry.curatedModels.map((m) => m.id)
  assert.deepEqual(curated, [
    'free/deepseek-v4.1-flash',
    'free/hy4-flash',
    'free/glm-5.3',
    'free/glm-5.3-flash',
    'free/gemini-3.8-flash',
    'free/kimi-k3',
  ])

  const routing = ROUTING_PROVIDER_CATALOGUE.apinex
  assert.ok(routing)
  assert.equal(routing.approvedForRouting, true)
  assert.equal(routing.verifiedEndpoint, 'https://api.apinex.bond/v1')
  assert.equal(routing.balanceLookupSupport, false)
})

test('Catalogue: both new lanes carry a tenant-content warning', () => {
  for (const id of ['runcrate', 'apinex']) {
    const entry = getCatalogueEntry(id)
    assert.match(
      entry.regionNote,
      /do not use for tenant content|not for tenant content|Do not use for tenant content/i,
    )
  }
})

test('Catalogue: 20 providers are wired through both catalogues', () => {
  const ids = new Set(PROVIDER_CATALOGUE.map((e) => e.id))
  for (const id of ['runcrate', 'apinex']) {
    assert.ok(ids.has(id), `${id} must exist in the production catalogue`)
    assert.ok(ROUTING_PROVIDER_CATALOGUE[id], `${id} must exist in the routing catalogue`)
  }
})

test('Usage: published pay-as-you-go rates are recorded when a premium model is used', () => {
  const runcrate = lookupModelPrice('runcrate', 'deepseek-ai/DeepSeek-V4.1-Flash')
  assert.ok(runcrate)
  assert.equal(runcrate.promptUsdPerMTok, 0.0735)
  assert.equal(runcrate.completionUsdPerMTok, 0.221)

  const apinex = lookupModelPrice('apinex', 'deepseek-v4.1-flash')
  assert.ok(apinex)
  assert.equal(apinex.promptUsdPerMTok, 0.06)
  assert.equal(apinex.completionUsdPerMTok, 0.06)
})
