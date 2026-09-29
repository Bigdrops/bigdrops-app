import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  BIGDROPS_LOCAL_AI_POC_MODEL_ID,
  validateCleanupLocalAIResult,
} from '../../modules/item-library/domain/cleanupLocalAI.ts'
import { buildFlaggedCleanupExportPayload } from '../../modules/item-library/domain/itemCleanupExchange.ts'
import { buildCleanupLocalAITask } from '../../modules/item-library/domain/cleanupLocalAI.ts'

const repoRoot = process.cwd()
const nativeSourcePath = join(repoRoot, 'android/app/src/main/cpp/local_ai_jni.cpp')
const javaPluginPath = join(repoRoot, 'android/app/src/main/java/com/bigdrops/app/plugins/LocalAIPlugin.java')
const pinnedSamplerPath = join(
  repoRoot,
  'android/app/.cxx/Debug/562g676f/arm64-v8a/_deps/llama_cpp-src/src/llama-sampler.cpp',
)

const group = {
  group_id: 'group-1',
  label: 'Cable Lug 10mm',
  reason: 'Similar wording',
  normalized_label: 'cable lug 10mm',
  members: [
    { item_id: 'item-1', name: 'Cable Lug 10mm', usage_count: 8, last_sold_price: 950 },
    { item_id: 'item-2', name: 'Cable Lug 10 mm', usage_count: 5, last_sold_price: 960 },
  ],
}

function makeTask() {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups: [group],
    aliases: [],
    generatedAt: '2026-09-29T12:00:00.000Z',
  })

  return buildCleanupLocalAITask({
    group,
    exportPayload,
    aliases: [],
    reviewedSeparatePairs: [],
  })
}

function nativeContractResult(task, decision) {
  const groupTask = task.groups[0]
  const winner = groupTask.candidates[0]
  const merged = groupTask.candidates.slice(1)
  return JSON.stringify({
    response_type: 'cleanup_ai_review_result',
    schema_version: 1,
    task_id: task.task_id,
    cleanup_snapshot_id: task.cleanup_snapshot_id,
    provider_id: 'local_android',
    model_id: BIGDROPS_LOCAL_AI_POC_MODEL_ID,
    proposals: [
      {
        group_id: groupTask.group_id,
        decision,
        winner_item_id: decision === 'SAME_ITEM' ? winner.item_id : null,
        merged_item_ids: decision === 'SAME_ITEM' ? merged.map((candidate) => candidate.item_id) : [],
        reason_codes: decision === 'UNSURE' ? ['insufficient_evidence'] : ['same_catalog_wording'],
        reason: decision === 'UNSURE' ? 'Needs human review.' : 'Names differ only by spacing.',
        referenced_evidence_ids: [groupTask.evidence_ids[0]],
        warnings: [],
      },
    ],
  })
}

test('native grammar contract accepts canonical SAME_ITEM, DIFFERENT_ITEM, and UNSURE envelopes', () => {
  const task = makeTask()

  for (const decision of ['SAME_ITEM', 'DIFFERENT_ITEM', 'UNSURE']) {
    const validation = validateCleanupLocalAIResult(nativeContractResult(task, decision), task)
    assert.equal(validation.ok, true, decision)
    assert.equal(validation.result.proposals[0].decision, decision)
  }
})

test('native grammar contract still rejects malformed JSON and illegal decisions after extraction', () => {
  const task = makeTask()

  assert.equal(validateCleanupLocalAIResult('{', task).ok, false)

  const illegal = JSON.parse(nativeContractResult(task, 'UNSURE'))
  illegal.proposals[0].decision = 'MAYBE_SAME'
  assert.equal(validateCleanupLocalAIResult(illegal, task).ok, false)
})

test('Java grammar exposes the strict result envelope and allowed decisions', () => {
  const javaSource = readFileSync(javaPluginPath, 'utf8')

  assert.match(javaSource, /CLEANUP_RESULT_GRAMMAR/)
  assert.match(javaSource, /response_type/)
  assert.match(javaSource, /cleanup_ai_review_result/)
  assert.match(javaSource, /cleanup_snapshot_id/)
  assert.match(javaSource, /provider_id/)
  assert.match(javaSource, /local_android/)
  assert.match(javaSource, /SAME_ITEM/)
  assert.match(javaSource, /DIFFERENT_ITEM/)
  assert.match(javaSource, /UNSURE/)
  assert.match(javaSource, /warnings/)
})

test('native generation loop does not double-accept sampled tokens into the grammar sampler', () => {
  const nativeSource = readFileSync(nativeSourcePath, 'utf8')

  assert.doesNotMatch(
    nativeSource,
    /llama_sampler_sample\(sampler,\s*ctx,\s*-1\);[\s\S]{0,240}llama_sampler_accept\(sampler,\s*next_token\)/,
  )
  assert.match(nativeSource, /samples and accepts the token/)
})

test(
  'pinned llama.cpp sampler_sample already accepts tokens',
  { skip: !existsSync(pinnedSamplerPath) },
  () => {
    const samplerSource = readFileSync(pinnedSamplerPath, 'utf8')

    assert.match(samplerSource, /llama_token llama_sampler_sample\(struct llama_sampler \* smpl/)
    assert.match(samplerSource, /llama_sampler_apply\(smpl,\s*&cur_p\)/)
    assert.match(samplerSource, /auto token = cur_p\.data\[cur_p\.selected\]\.id/)
    assert.match(samplerSource, /llama_sampler_accept\(smpl,\s*token\)/)
    assert.match(samplerSource, /return token/)
  },
)
