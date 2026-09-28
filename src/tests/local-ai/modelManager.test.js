import test from 'node:test'
import assert from 'node:assert/strict'

import { BIGDROPS_LOCAL_AI_POC_MODEL } from '../../lib/local-ai/modelManifest.ts'
import {
  getLocalAIModelProgress,
  isLocalAIModelReady,
  localAIModelStatusLabel,
  verifyLocalAIModelDigest,
} from '../../lib/local-ai/modelStatus.ts'

test('local AI POC manifest pins a concrete model artifact and checksum', () => {
  assert.equal(BIGDROPS_LOCAL_AI_POC_MODEL.modelId, 'qwen3-0.6b-instruct-q4-k-m-gguf-poc')
  assert.equal(BIGDROPS_LOCAL_AI_POC_MODEL.sourceRepository, 'QuantFactory/Qwen3-0.6B-GGUF')
  assert.equal(BIGDROPS_LOCAL_AI_POC_MODEL.sourceRevision, 'e7e05d713acaa2baccdfb52e967eaba8ba562ba8')
  assert.equal(BIGDROPS_LOCAL_AI_POC_MODEL.sourceFilename, 'Qwen3-0.6B.Q4_K_M.gguf')
  assert.equal(BIGDROPS_LOCAL_AI_POC_MODEL.expectedBytes, 484_220_000)
  assert.match(BIGDROPS_LOCAL_AI_POC_MODEL.expectedSha256, /^[a-f0-9]{64}$/)
})

test('local AI model digest verification fails closed on size or sha mismatch', () => {
  assert.deepEqual(
    verifyLocalAIModelDigest({
      actualBytes: BIGDROPS_LOCAL_AI_POC_MODEL.expectedBytes,
      actualSha256: BIGDROPS_LOCAL_AI_POC_MODEL.expectedSha256,
    }),
    { ok: true },
  )

  assert.equal(
    verifyLocalAIModelDigest({
      actualBytes: BIGDROPS_LOCAL_AI_POC_MODEL.expectedBytes - 1,
      actualSha256: BIGDROPS_LOCAL_AI_POC_MODEL.expectedSha256,
    }).ok,
    false,
  )

  assert.equal(
    verifyLocalAIModelDigest({
      actualBytes: BIGDROPS_LOCAL_AI_POC_MODEL.expectedBytes,
      actualSha256: '0'.repeat(64),
    }).ok,
    false,
  )
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

