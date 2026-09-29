import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCleanupLocalAIPrompt,
  buildCleanupLocalAITask,
  validateCleanupLocalAIResult,
} from '../../modules/item-library/domain/cleanupLocalAI.ts'
import {
  buildCleanupLocalAIJobPlan,
  CLEANUP_LOCAL_AI_JOB_CHUNK_GROUPS,
  parseCleanupLocalAICommand,
  runCleanupLocalAIJobPlan,
  summarizeCleanupLocalAIJobResults,
} from '../../modules/item-library/domain/cleanupLocalAIJob.ts'
import { getLocalAINativeStage } from '../../lib/native/localAI.ts'
import { buildFlaggedCleanupExportPayload } from '../../modules/item-library/domain/itemCleanupExchange.ts'

function makeGroup(index) {
  return {
    group_id: `group-${index}`,
    label: `Cable Lug ${index}`,
    reason: 'Similar wording',
    normalized_label: `cable lug ${index}`,
    members: [
      { item_id: `item-${index}-a`, name: `Cable Lug ${index}`, usage_count: 8, last_sold_price: 950 },
      { item_id: `item-${index}-b`, name: `Cable Lug ${index} `, usage_count: 5, last_sold_price: 960 },
    ],
  }
}

function makePlanFixture(groupCount = 3) {
  const groups = Array.from({ length: groupCount }, (_, index) => makeGroup(index + 1))
  const exportPayload = buildFlaggedCleanupExportPayload({ duplicateGroups: groups, aliases: [] })
  return { groups, exportPayload }
}

function validRawText(task, decision = 'SAME_ITEM', candidateIndex = 0) {
  const group = task.groups[0]
  const winner = group.candidates[candidateIndex]
  const merged = group.candidates.filter((candidate) => candidate.item_id !== winner.item_id)
  return JSON.stringify({
    response_type: 'cleanup_ai_review_result',
    schema_version: 1,
    task_id: task.task_id,
    cleanup_snapshot_id: task.cleanup_snapshot_id,
    provider_id: 'local_android',
    model_id: 'test-model',
    proposals: [
      {
        group_id: group.group_id,
        decision,
        winner_item_id: decision === 'SAME_ITEM' ? winner.item_id : undefined,
        merged_item_ids: decision === 'SAME_ITEM' ? merged.map((candidate) => candidate.item_id) : [],
        reason_codes: decision === 'UNSURE' ? ['insufficient_evidence'] : ['same_catalog_wording'],
        reason: decision === 'UNSURE' ? 'Not enough evidence.' : 'Names differ only by spacing.',
        referenced_evidence_ids: [group.evidence_ids[0]],
        warnings: [],
      },
    ],
  })
}

test('job plan caps groups at the requested batch size and keeps snapshot binding', () => {
  const { groups, exportPayload } = makePlanFixture(4)
  const plan = buildCleanupLocalAIJobPlan({ groups, exportPayload, aliases: [], modelId: 'test-model', limit: 2, now: 123 })

  assert.equal(plan.tasks.length, 2)
  assert.equal(plan.skipped.length, 0)
  assert.equal(plan.snapshotId, exportPayload.snapshot_id)
  assert.ok(plan.jobId.includes(exportPayload.snapshot_id))
  assert.ok(plan.tasks.every((entry) => entry.task.cleanup_snapshot_id === exportPayload.snapshot_id))
  assert.ok(plan.tasks.every((entry) => entry.prompt.includes('Task JSON:')))
})

test('job plan marks groups outside the locked export as skipped', () => {
  const { exportPayload } = makePlanFixture(1)
  const outsider = makeGroup(99)
  const plan = buildCleanupLocalAIJobPlan({ groups: [outsider], exportPayload, aliases: [], modelId: 'test-model', limit: null, now: 1 })

  assert.equal(plan.tasks.length, 0)
  assert.equal(plan.skipped.length, 1)
  assert.equal(plan.skipped[0].group_id, 'group-99')
})

test('runner classifies ready, unsure, conflict, and failed outcomes', async () => {
  const { groups, exportPayload } = makePlanFixture(4)
  const plan = buildCleanupLocalAIJobPlan({ groups, exportPayload, aliases: [], modelId: 'test-model', limit: null, now: 2 })
  const calls = []

  const results = await runCleanupLocalAIJobPlan(
    plan,
    'test-model',
    {
      loadModel: async () => ({ loaded: true }),
      analyze: async (task) => {
        calls.push(task.groups[0].group_id)
        if (task.groups[0].group_id === 'group-2') {
          return { rawText: validRawText(task, 'UNSURE'), elapsedMs: 10 }
        }
        if (task.groups[0].group_id === 'group-3') {
          return { rawText: 'not json', elapsedMs: 10 }
        }
        if (task.groups[0].group_id === 'group-4') {
          throw new Error('Out of memory during prompt decode. [stage=prompt_decode]')
        }
        return { rawText: validRawText(task, 'SAME_ITEM'), elapsedMs: 10 }
      },
      unloadModel: async () => true,
    },
    {},
  )

  assert.deepEqual(calls, ['group-1', 'group-2', 'group-3', 'group-4'])
  const byGroup = new Map(results.map((result) => [result.group_id, result]))
  assert.equal(byGroup.get('group-1').status, 'ready')
  assert.equal(byGroup.get('group-2').status, 'unsure')
  assert.equal(byGroup.get('group-3').status, 'failed')
  assert.equal(byGroup.get('group-4').status, 'failed')
  assert.match(byGroup.get('group-4').errors.join(' '), /\[stage=prompt_decode\]/)
  assert.equal(getLocalAINativeStage(new Error(byGroup.get('group-4').errors[0])), 'prompt_decode')
})

test('runner preserves elapsed timing from native failure diagnostics', async () => {
  const { groups, exportPayload } = makePlanFixture(1)
  const plan = buildCleanupLocalAIJobPlan({ groups, exportPayload, aliases: [], modelId: 'test-model', limit: null, now: 21 })

  const results = await runCleanupLocalAIJobPlan(
    plan,
    'test-model',
    {
      loadModel: async () => ({ loaded: true }),
      analyze: async () => {
        throw new Error('llama.cpp native generation failed. [stage=token_sample] [elapsedMs=1432]')
      },
    },
    {},
  )

  assert.equal(results.length, 1)
  assert.equal(results[0].status, 'failed')
  assert.equal(results[0].elapsedMs, 1432)
  assert.equal(getLocalAINativeStage(new Error(results[0].errors[0])), 'token_sample')
})

test('runner keeps validated results when cancelled and unloads the model', async () => {
  const { groups, exportPayload } = makePlanFixture(3)
  const plan = buildCleanupLocalAIJobPlan({ groups, exportPayload, aliases: [], modelId: 'test-model', limit: null, now: 3 })
  let cancelled = false
  let unloaded = 0

  const results = await runCleanupLocalAIJobPlan(
    plan,
    'test-model',
    {
      loadModel: async () => ({ loaded: true }),
      analyze: async (task) => ({ rawText: validRawText(task, 'DIFFERENT_ITEM'), elapsedMs: 5 }),
      unloadModel: async () => {
        unloaded += 1
      },
    },
    {
      onGroupComplete: (_result, done) => {
        if (done === 1) cancelled = true
      },
      isCancelled: () => cancelled,
    },
  )

  assert.equal(results.length, 1)
  assert.equal(results[0].status, 'ready')
  assert.equal(unloaded, 1)
})

test('runner stops after repeated consecutive failures and reports load failure on every group', async () => {
  const { groups, exportPayload } = makePlanFixture(5)
  const plan = buildCleanupLocalAIJobPlan({ groups, exportPayload, aliases: [], modelId: 'test-model', limit: null, now: 4 })
  let analyzeCalls = 0

  const stopped = await runCleanupLocalAIJobPlan(
    plan,
    'test-model',
    {
      loadModel: async () => ({ loaded: true }),
      analyze: async () => {
        analyzeCalls += 1
        throw new Error('boom')
      },
    },
    {},
  )

  assert.equal(analyzeCalls, 3)
  assert.equal(stopped.length, 3)
  assert.ok(stopped.every((result) => result.status === 'failed'))

  const loadFailed = await runCleanupLocalAIJobPlan(
    plan,
    'test-model',
    {
      loadModel: async () => {
        throw new Error('No model is loaded.')
      },
      analyze: async () => ({ rawText: '{}', elapsedMs: 0 }),
    },
    {},
  )

  assert.equal(loadFailed.length, 5)
  assert.ok(loadFailed.every((result) => result.status === 'failed'))
})

test('command parser maps only deterministic cleanup commands', () => {
  assert.deepEqual(parseCleanupLocalAICommand('Review all duplicates'), { action: 'start-job', limit: null })
  assert.deepEqual(parseCleanupLocalAICommand('review 100 items'), { action: 'start-job', limit: 100 })
  assert.deepEqual(parseCleanupLocalAICommand('  Review   25  '), { action: 'start-job', limit: 25 })
  assert.deepEqual(parseCleanupLocalAICommand('show unsure'), { action: 'show-filter', filter: 'unsure' })
  assert.deepEqual(parseCleanupLocalAICommand('unsure'), { action: 'show-filter', filter: 'unsure' })
  assert.deepEqual(parseCleanupLocalAICommand('show conflicts'), { action: 'show-filter', filter: 'conflict' })
  assert.deepEqual(parseCleanupLocalAICommand('show failed'), { action: 'show-filter', filter: 'failed' })
  assert.deepEqual(parseCleanupLocalAICommand('show all'), { action: 'show-filter', filter: 'all' })
  assert.deepEqual(parseCleanupLocalAICommand('review'), { action: 'help' })
  assert.deepEqual(parseCleanupLocalAICommand('tell me a joke'), { action: 'help' })
  assert.deepEqual(parseCleanupLocalAICommand(''), { action: 'help' })
})

test('summary counts review categories', () => {
  const summary = summarizeCleanupLocalAIJobResults([
    { group_id: 'a', label: 'a', task_id: 't', status: 'ready', proposals: [], errors: [] },
    { group_id: 'b', label: 'b', task_id: 't', status: 'unsure', proposals: [], errors: [] },
    { group_id: 'c', label: 'c', task_id: 't', status: 'conflict', proposals: [], errors: [] },
    { group_id: 'd', label: 'd', task_id: 't', status: 'failed', proposals: [], errors: [] },
  ])

  assert.deepEqual(summary, { total: 4, ready: 1, unsure: 1, conflict: 1, failed: 1 })
})

test('chunk size stays conservative and prompts stay framed for the model', () => {
  assert.ok(CLEANUP_LOCAL_AI_JOB_CHUNK_GROUPS <= 10)
  const { groups, exportPayload } = makePlanFixture(1)
  const plan = buildCleanupLocalAIJobPlan({ groups, exportPayload, aliases: [], modelId: 'test-model', limit: 1, now: 5 })
  assert.match(plan.tasks[0].prompt, /<\|im_start\|>user/)
  assert.match(plan.tasks[0].prompt, /\/no_think/)
  assert.match(plan.tasks[0].prompt, /<\|im_start\|>assistant\n$/)
})

test('job execution uses the passed selected model id and loads it exactly once', async () => {
  const { groups, exportPayload } = makePlanFixture(2)
  const plan = buildCleanupLocalAIJobPlan({
    groups,
    exportPayload,
    aliases: [],
    modelId: 'qwen3-0.6b-instruct-q4-k-m-gguf-poc',
    limit: null,
    now: 6,
  })
  const loadCalls = []
  const analyzeCalls = []

  const results = await runCleanupLocalAIJobPlan(
    plan,
    'qwen3-0.6b-instruct-q4-k-m-gguf-poc',
    {
      loadModel: async (modelId) => {
        loadCalls.push(modelId)
        return { loaded: true }
      },
      analyze: async (task, prompt) => {
        analyzeCalls.push(task.groups[0].group_id)
        assert.ok(prompt.includes('qwen3-0.6b-instruct-q4-k-m-gguf-poc'))
        assert.ok(!prompt.includes('qwen3-1.7b-instruct-q4-k-m-gguf-poc'))
        return { rawText: validRawText(task, 'SAME_ITEM'), elapsedMs: 7 }
      },
      unloadModel: async () => true,
    },
    {},
  )

  assert.deepEqual(loadCalls, ['qwen3-0.6b-instruct-q4-k-m-gguf-poc'])
  assert.equal(results.length, 2)
  assert.ok(results.every((result) => result.modelId === 'qwen3-0.6b-instruct-q4-k-m-gguf-poc'))
})


