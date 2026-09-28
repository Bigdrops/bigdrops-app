import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BIGDROPS_LOCAL_AI_POC_MODEL_ID,
  buildCleanupLocalAIPrompt,
  buildCleanupLocalAITask,
  validateCleanupLocalAIResult,
} from '../../modules/item-library/domain/cleanupLocalAI.ts'
import { buildFlaggedCleanupExportPayload } from '../../modules/item-library/domain/itemCleanupExchange.ts'

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

function makeTask(options = {}) {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups: [group],
    aliases: [{ id: 'alias-1', item_id: 'item-1', alias_text: 'lug 10mm' }],
    generatedAt: '2026-09-27T12:00:00.000Z',
  })

  return buildCleanupLocalAITask({
    group,
    exportPayload,
    aliases: [{ id: 'alias-1', item_id: 'item-1', alias_text: 'lug 10mm' }],
    reviewedSeparatePairs: options.reviewedSeparatePairs || [],
  })
}

function validResult(task, proposalOverrides = {}) {
  return {
    response_type: 'cleanup_ai_review_result',
    schema_version: 1,
    task_id: task.task_id,
    cleanup_snapshot_id: task.cleanup_snapshot_id,
    provider_id: 'local_android',
    model_id: BIGDROPS_LOCAL_AI_POC_MODEL_ID,
    proposals: [
      {
        group_id: 'group-1',
        decision: 'SAME_ITEM',
        winner_item_id: 'item-1',
        merged_item_ids: ['item-2'],
        reason_codes: ['same_catalog_wording'],
        reason: 'The names differ only by spacing in 10mm.',
        referenced_evidence_ids: ['group-1:item:item-1:name', 'group-1:item:item-2:name'],
        warnings: [],
        ...proposalOverrides,
      },
    ],
  }
}

test('buildCleanupLocalAITask creates a bounded snapshot-linked cleanup task', () => {
  const task = makeTask()

  assert.equal(task.task_type, 'item_cleanup_review')
  assert.equal(task.schema_version, 1)
  assert.equal(task.cleanup_snapshot_id.startsWith('cleanup-v1-'), true)
  assert.equal(task.groups.length, 1)
  assert.equal(task.groups[0].candidates.length, 2)
  assert.ok(task.task_id.includes(task.cleanup_snapshot_id))
  assert.ok(task.rules.some((rule) => /Similarity is review evidence/i.test(rule)))
})

test('buildCleanupLocalAIPrompt includes strict JSON and no mutation instruction', () => {
  const task = makeTask()
  const prompt = buildCleanupLocalAIPrompt(task)

  assert.match(prompt, /Return only strict JSON/i)
  assert.match(prompt, /read-only/i)
  assert.match(prompt, /Task JSON:/i)
})

test('buildCleanupLocalAIPrompt example matches native constrained output field names', () => {
  const task = makeTask()
  const prompt = buildCleanupLocalAIPrompt(task)

  assert.match(prompt, /"provider_id":\s*"local_android"/)
  assert.match(prompt, /"cleanup_snapshot_id":/)
  assert.match(prompt, /"winner_item_id":\s*null/)
  assert.match(prompt, /"referenced_evidence_ids":\s*\[\]/)
})

test('valid SAME_ITEM proposal passes validation', () => {
  const task = makeTask()
  const validation = validateCleanupLocalAIResult(JSON.stringify(validResult(task)), task)

  assert.equal(validation.ok, true)
  assert.equal(validation.result.proposals[0].decision, 'SAME_ITEM')
  assert.equal(validation.result.proposals[0].winner_item_id, 'item-1')
  assert.deepEqual(validation.result.proposals[0].merged_item_ids, ['item-2'])
})

test('valid DIFFERENT_ITEM proposal passes without merge ids', () => {
  const task = makeTask()
  const validation = validateCleanupLocalAIResult(
    validResult(task, {
      decision: 'DIFFERENT_ITEM',
      winner_item_id: undefined,
      merged_item_ids: [],
      reason_codes: ['specification_difference'],
      reason: 'The descriptions show different ratings.',
    }),
    task,
  )

  assert.equal(validation.ok, true)
  assert.equal(validation.result.proposals[0].decision, 'DIFFERENT_ITEM')
  assert.equal(validation.result.proposals[0].winner_item_id, undefined)
})

test('valid UNSURE proposal passes without merge ids', () => {
  const task = makeTask()
  const validation = validateCleanupLocalAIResult(
    validResult(task, {
      decision: 'UNSURE',
      winner_item_id: undefined,
      merged_item_ids: [],
      reason_codes: ['insufficient_evidence'],
      reason: 'The group needs human review.',
    }),
    task,
  )

  assert.equal(validation.ok, true)
  assert.equal(validation.result.proposals[0].decision, 'UNSURE')
})

test('stale task and snapshot are rejected', () => {
  const task = makeTask()
  const validation = validateCleanupLocalAIResult(
    {
      ...validResult(task),
      task_id: 'other-task',
      cleanup_snapshot_id: 'cleanup-v1-other',
    },
    task,
  )

  assert.equal(validation.ok, false)
  assert.match(validation.errors.join(' '), /requested task/i)
  assert.match(validation.errors.join(' '), /locked cleanup snapshot/i)
})

test('unknown group, item, and evidence references are rejected', () => {
  const task = makeTask()
  const validation = validateCleanupLocalAIResult(
    validResult(task, {
      group_id: 'unknown-group',
      winner_item_id: 'outside-item',
      merged_item_ids: ['item-2'],
      referenced_evidence_ids: ['unknown-evidence'],
    }),
    task,
  )

  assert.equal(validation.ok, false)
  assert.match(validation.errors.join(' '), /unknown group_id/i)
})

test('outside item and outside evidence references are rejected for known group', () => {
  const task = makeTask()
  const validation = validateCleanupLocalAIResult(
    validResult(task, {
      winner_item_id: 'item-1',
      merged_item_ids: ['outside-item'],
      referenced_evidence_ids: ['unknown-evidence'],
    }),
    task,
  )

  assert.equal(validation.ok, false)
  assert.match(validation.errors.join(' '), /evidence outside the task/i)
  assert.match(validation.errors.join(' '), /inside the group/i)
})

test('self merge and duplicate proposal are rejected', () => {
  const task = makeTask()
  const result = validResult(task, {
    winner_item_id: 'item-1',
    merged_item_ids: ['item-1'],
  })
  result.proposals.push(validResult(task).proposals[0])

  const validation = validateCleanupLocalAIResult(result, task)

  assert.equal(validation.ok, false)
  assert.match(validation.errors.join(' '), /more than once/i)
  assert.match(validation.errors.join(' '), /must not include the winner_item_id/i)
})

test('SAME_ITEM without a winner is rejected', () => {
  const task = makeTask()
  const validation = validateCleanupLocalAIResult(
    validResult(task, {
      winner_item_id: undefined,
      merged_item_ids: ['item-2'],
    }),
    task,
  )

  assert.equal(validation.ok, false)
  assert.match(validation.errors.join(' '), /winner_item_id/i)
})

test('DIFFERENT_ITEM with merge ids is rejected as contradictory', () => {
  const task = makeTask()
  const validation = validateCleanupLocalAIResult(
    validResult(task, {
      decision: 'DIFFERENT_ITEM',
      winner_item_id: 'item-1',
      merged_item_ids: ['item-2'],
    }),
    task,
  )

  assert.equal(validation.ok, false)
  assert.match(validation.errors.join(' '), /cannot include merge item ids/i)
})

test('active Keep Separate conflict rejects SAME_ITEM proposal', () => {
  const task = makeTask({
    reviewedSeparatePairs: [{ id: 'pair-1', item_a_id: 'item-2', item_b_id: 'item-1', status: 'active' }],
  })

  const validation = validateCleanupLocalAIResult(validResult(task), task)

  assert.equal(validation.ok, false)
  assert.match(validation.errors.join(' '), /reviewed-separate/i)
})

test('AI task and result contract exposes no mutation operation', () => {
  const task = makeTask()
  const validation = validateCleanupLocalAIResult(validResult(task), task)

  assert.equal(validation.ok, true)
  assert.equal('apply' in task, false)
  assert.equal('mergeItems' in validation.result, false)
  assert.equal('onApplyProposals' in validation.result, false)
})
