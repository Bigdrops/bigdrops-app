import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BIGDROPS_LOCAL_AI_LITE_MODEL,
  BIGDROPS_LOCAL_AI_POC_MODEL,
  getLocalAIModelManifest,
  LOCAL_AI_MODEL_CATALOG,
} from '../../lib/local-ai/modelManifest.ts'
import {
  getLocalAIModelProgress,
  isLocalAIModelReady,
  localAIModelStatusLabel,
  verifyLocalAIModelDigest,
} from '../../lib/local-ai/modelStatus.ts'
import {
  getSelectedLocalAIModelId,
  listLocalAIModelChoices,
  recommendLocalAIModel,
  refreshLocalAIModelSelectionSnapshot,
  resolveLocalAIModelForJob,
  setSelectedLocalAIModelId,
} from '../../lib/local-ai/modelSelection.ts'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => {
      values.set(key, String(value))
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

function installedStatus(manifest) {
  return {
    modelId: manifest.modelId,
    state: 'installed',
    verified: true,
    expectedBytes: manifest.expectedBytes,
    expectedSha256: manifest.expectedSha256,
  }
}

test('model catalog holds Lite and Standard entries and no third artifact', () => {
  assert.equal(LOCAL_AI_MODEL_CATALOG.length, 2)
  assert.deepEqual(
    LOCAL_AI_MODEL_CATALOG.map((entry) => entry.tier),
    ['lite', 'standard'],
  )
  assert.ok(LOCAL_AI_MODEL_CATALOG.every((entry) => entry.enabled))
  assert.ok(
    LOCAL_AI_MODEL_CATALOG.every(
      (entry) =>
        entry.modelId &&
        entry.displayName &&
        entry.family === 'Qwen3' &&
        entry.quantization === 'Q4_K_M' &&
        entry.expectedBytes > 0 &&
        /^[a-f0-9]{64}$/.test(entry.expectedSha256) &&
        entry.downloadUrl.startsWith('https://huggingface.co/') &&
        entry.downloadUrl.includes(entry.sourceRepository) &&
        entry.downloadUrl.includes(entry.sourceRevision) &&
        entry.downloadUrl.includes(entry.sourceFilename),
    ),
  )

  const ids = LOCAL_AI_MODEL_CATALOG.map((entry) => entry.modelId)
  assert.equal(new Set(ids).size, ids.length)
  const filenames = LOCAL_AI_MODEL_CATALOG.map((entry) => entry.appPrivateFilename)
  assert.equal(new Set(filenames).size, filenames.length)

  assert.equal(BIGDROPS_LOCAL_AI_LITE_MODEL.tier, 'lite')
  assert.equal(BIGDROPS_LOCAL_AI_LITE_MODEL.expectedBytes, 484_220_000)
  assert.equal(BIGDROPS_LOCAL_AI_POC_MODEL.tier, 'standard')
  assert.equal(BIGDROPS_LOCAL_AI_POC_MODEL.expectedBytes, 1_107_409_472)
  assert.equal(BIGDROPS_LOCAL_AI_POC_MODEL.recommended, true)
  assert.equal(BIGDROPS_LOCAL_AI_LITE_MODEL.recommended, false)
})

test('arbitrary model IDs resolve to no manifest entry', () => {
  assert.equal(getLocalAIModelManifest('qwen3-9b-instruct-gguf'), undefined)
  assert.equal(getLocalAIModelManifest(''), undefined)
  assert.equal(getLocalAIModelManifest(null), undefined)
  assert.equal(
    getLocalAIModelManifest(BIGDROPS_LOCAL_AI_LITE_MODEL.modelId)?.tier,
    'lite',
  )
  assert.equal(
    getLocalAIModelManifest(BIGDROPS_LOCAL_AI_POC_MODEL.modelId)?.tier,
    'standard',
  )
})

test('model selection persists Lite and Standard choices independently', () => {
  const storage = memoryStorage()

  assert.equal(getSelectedLocalAIModelId(storage), null)

  setSelectedLocalAIModelId(BIGDROPS_LOCAL_AI_LITE_MODEL.modelId, storage)
  assert.equal(getSelectedLocalAIModelId(storage), BIGDROPS_LOCAL_AI_LITE_MODEL.modelId)

  setSelectedLocalAIModelId(BIGDROPS_LOCAL_AI_POC_MODEL.modelId, storage)
  assert.equal(getSelectedLocalAIModelId(storage), BIGDROPS_LOCAL_AI_POC_MODEL.modelId)

  setSelectedLocalAIModelId(null, storage)
  assert.equal(getSelectedLocalAIModelId(storage), null)
})

test('model choices expose independent install states without coupling models', () => {
  const choices = listLocalAIModelChoices(
    { [BIGDROPS_LOCAL_AI_LITE_MODEL.modelId]: installedStatus(BIGDROPS_LOCAL_AI_LITE_MODEL) },
    BIGDROPS_LOCAL_AI_LITE_MODEL.modelId,
    BIGDROPS_LOCAL_AI_POC_MODEL.modelId,
  )

  const lite = choices.find((choice) => choice.manifest.tier === 'lite')
  const standard = choices.find((choice) => choice.manifest.tier === 'standard')
  assert.equal(lite.installed, true)
  assert.equal(lite.selected, true)
  assert.equal(standard.installed, false)
  assert.equal(standard.selected, false)
  assert.equal(standard.recommended, true)
})

test('job resolution uses the selected installed model and reports a missing selection', () => {
  const ready = resolveLocalAIModelForJob({
    selectedId: BIGDROPS_LOCAL_AI_LITE_MODEL.modelId,
    statusesById: { [BIGDROPS_LOCAL_AI_LITE_MODEL.modelId]: installedStatus(BIGDROPS_LOCAL_AI_LITE_MODEL) },
    recommendedId: BIGDROPS_LOCAL_AI_POC_MODEL.modelId,
  })
  assert.equal(ready.kind, 'ready')
  assert.equal(ready.manifest.modelId, BIGDROPS_LOCAL_AI_LITE_MODEL.modelId)
  assert.equal(ready.selected, true)

  const missing = resolveLocalAIModelForJob({
    selectedId: BIGDROPS_LOCAL_AI_POC_MODEL.modelId,
    statusesById: {},
    recommendedId: BIGDROPS_LOCAL_AI_POC_MODEL.modelId,
  })
  assert.equal(missing.kind, 'selected-missing')
  assert.equal(missing.manifest.modelId, BIGDROPS_LOCAL_AI_POC_MODEL.modelId)

  const none = resolveLocalAIModelForJob({ selectedId: null, statusesById: {}, recommendedId: null })
  assert.equal(none.kind, 'no-selection')
})

test('job resolution falls back to the installed recommended model without persisting a selection', () => {
  const storage = memoryStorage()
  const resolved = resolveLocalAIModelForJob({
    selectedId: getSelectedLocalAIModelId(storage),
    statusesById: { [BIGDROPS_LOCAL_AI_POC_MODEL.modelId]: installedStatus(BIGDROPS_LOCAL_AI_POC_MODEL) },
    recommendedId: BIGDROPS_LOCAL_AI_POC_MODEL.modelId,
  })

  assert.equal(resolved.kind, 'ready')
  assert.equal(resolved.selected, false)
  assert.equal(getSelectedLocalAIModelId(storage), null)
})

test('selection snapshot refreshes selected model status after remount or resume', async () => {
  const storage = memoryStorage()
  setSelectedLocalAIModelId(BIGDROPS_LOCAL_AI_POC_MODEL.modelId, storage)
  const reads = []

  const snapshot = await refreshLocalAIModelSelectionSnapshot({
    readSelectedId: () => getSelectedLocalAIModelId(storage),
    recommendedId: BIGDROPS_LOCAL_AI_LITE_MODEL.modelId,
    readStatus: async (modelId) => {
      reads.push(modelId)
      return modelId === BIGDROPS_LOCAL_AI_POC_MODEL.modelId
        ? installedStatus(BIGDROPS_LOCAL_AI_POC_MODEL)
        : null
    },
  })

  assert.equal(snapshot.selectedId, BIGDROPS_LOCAL_AI_POC_MODEL.modelId)
  assert.equal(snapshot.resolved.kind, 'ready')
  assert.equal(snapshot.resolved.manifest.modelId, BIGDROPS_LOCAL_AI_POC_MODEL.modelId)
  assert.deepEqual(reads.sort(), LOCAL_AI_MODEL_CATALOG.map((entry) => entry.modelId).sort())
})

test('selection snapshot fails closed when selected native status is stale or missing', async () => {
  const snapshot = await refreshLocalAIModelSelectionSnapshot({
    selectedId: BIGDROPS_LOCAL_AI_POC_MODEL.modelId,
    recommendedId: BIGDROPS_LOCAL_AI_POC_MODEL.modelId,
    readStatus: async () => null,
  })

  assert.equal(snapshot.resolved.kind, 'selected-missing')
  assert.equal(snapshot.resolved.manifest.modelId, BIGDROPS_LOCAL_AI_POC_MODEL.modelId)
})

test('device recommendation prefers Standard only with sufficient memory', () => {
  assert.equal(recommendLocalAIModel(8_000_000_000).modelId, BIGDROPS_LOCAL_AI_POC_MODEL.modelId)
  assert.equal(recommendLocalAIModel(1_500_000_000).modelId, BIGDROPS_LOCAL_AI_LITE_MODEL.modelId)
  assert.equal(recommendLocalAIModel(null).modelId, BIGDROPS_LOCAL_AI_POC_MODEL.modelId)
})

test('local AI model digest verification fails closed on size or sha mismatch', () => {
  for (const manifest of LOCAL_AI_MODEL_CATALOG) {
    assert.deepEqual(
      verifyLocalAIModelDigest({
        manifest,
        actualBytes: manifest.expectedBytes,
        actualSha256: manifest.expectedSha256,
      }),
      { ok: true },
    )
    assert.equal(
      verifyLocalAIModelDigest({
        manifest,
        actualBytes: manifest.expectedBytes - 1,
        actualSha256: manifest.expectedSha256,
      }).ok,
      false,
    )
    assert.equal(
      verifyLocalAIModelDigest({
        manifest,
        actualBytes: manifest.expectedBytes,
        actualSha256: '0'.repeat(64),
      }).ok,
      false,
    )
  }
})

test('local AI model readiness requires installed and verified status', () => {
  assert.equal(isLocalAIModelReady({ state: 'installed', verified: true }), true)
  assert.equal(isLocalAIModelReady({ state: 'installed', verified: false }), false)
  assert.equal(isLocalAIModelReady({ state: 'not_installed', verified: false }), false)
  assert.equal(localAIModelStatusLabel({ state: 'installed', verified: true }), 'Installed and verified')
})

test('local AI model progress is bounded by the expected size', () => {
  assert.equal(getLocalAIModelProgress({ downloadedBytes: 0, expectedBytes: 100, totalBytes: 100 }), 0)
  assert.equal(getLocalAIModelProgress({ downloadedBytes: 50, expectedBytes: 100, totalBytes: 100 }), 50)
  assert.equal(getLocalAIModelProgress({ downloadedBytes: 150, expectedBytes: 100, totalBytes: 100 }), 100)
})
