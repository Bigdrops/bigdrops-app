import test from 'node:test'
import assert from 'node:assert/strict'

import {
  cleanupAssistantDecisionLabel,
  detectCleanupAssistantSpecDifferences,
  parseCleanupAssistantIntent,
  summarizeCleanupAssistantResults,
} from '../../modules/item-library/domain/cleanupLocalAIAssistant.ts'

function makeGroup(names) {
  return {
    group_id: 'group-pot-lights',
    label: 'Pot lights',
    reason: 'Similar wording',
    normalized_label: 'pot lights',
    members: names.map((name, index) => ({
      item_id: `item-${index + 1}`,
      name,
      usage_count: 1,
      last_sold_price: null,
    })),
  }
}

test('assistant command parser maps bounded cleanup requests to explicit intents', () => {
  assert.deepEqual(parseCleanupAssistantIntent('Review all duplicates.'), { type: 'review_all' })
  assert.deepEqual(parseCleanupAssistantIntent('Check both but do not merge anything.'), { type: 'review_all' })
  assert.deepEqual(parseCleanupAssistantIntent('Review the next 50.'), { type: 'review_next', limit: 50 })
  assert.deepEqual(parseCleanupAssistantIntent('Show unsure'), { type: 'show_filter', filter: 'unsure' })
  assert.deepEqual(parseCleanupAssistantIntent('Show me only the failed ones'), { type: 'show_filter', filter: 'failed' })
  assert.deepEqual(parseCleanupAssistantIntent('Show groups'), { type: 'show_groups' })
  assert.deepEqual(parseCleanupAssistantIntent('Use Standard model.'), { type: 'choose_model', tier: 'standard' })
  assert.deepEqual(parseCleanupAssistantIntent('Use Lite.'), { type: 'choose_model', tier: 'lite' })
  assert.deepEqual(parseCleanupAssistantIntent('Why are these two flagged?'), { type: 'explain', groupId: null })
  assert.deepEqual(parseCleanupAssistantIntent("What's left?"), { type: 'status' })
  assert.deepEqual(parseCleanupAssistantIntent('Tell me tomorrow weather'), { type: 'unsupported' })
})

test('specification detector treats wattage differences as identity significant without hard-coded names', () => {
  const differences = detectCleanupAssistantSpecDifferences(makeGroup(['6 Watts pot lights', '18 watts pot lights']))

  assert.equal(differences.length, 1)
  assert.equal(differences[0].kind, 'wattage')
  assert.deepEqual(differences[0].values, ['6W', '18W'])
  assert.deepEqual(differences[0].itemNames, ['6 Watts pot lights', '18 watts pot lights'])
})

test('specification detector handles other rating units generically', () => {
  const differences = detectCleanupAssistantSpecDifferences(makeGroup(['Cable 2.5mm red', 'Cable 4mm red', 'Cable 2.5mm black']))

  assert.equal(differences.length, 1)
  assert.equal(differences[0].kind, 'dimension')
  assert.deepEqual(differences[0].values, ['2.5mm', '4mm'])
})

test('assistant summaries distinguish analyzed recommendations from applied mutations', () => {
  const summary = summarizeCleanupAssistantResults([
    {
      group_id: 'a',
      label: 'A',
      task_id: 't-a',
      status: 'ready',
      modelId: 'model',
      proposals: [{ group_id: 'a', decision: 'DIFFERENT_ITEM', reason_codes: ['rating_difference'], reason: 'Different wattage.', referenced_evidence_ids: [] }],
      errors: [],
    },
    {
      group_id: 'b',
      label: 'B',
      task_id: 't-b',
      status: 'ready',
      modelId: 'model',
      proposals: [{ group_id: 'b', decision: 'SAME_ITEM', reason_codes: ['same_name'], reason: 'Same name.', referenced_evidence_ids: [] }],
      errors: [],
    },
    {
      group_id: 'c',
      label: 'C',
      task_id: 't-c',
      status: 'unsure',
      modelId: 'model',
      proposals: [{ group_id: 'c', decision: 'UNSURE', reason_codes: ['insufficient_evidence'], reason: 'Need review.', referenced_evidence_ids: [] }],
      errors: [],
    },
    {
      group_id: 'd',
      label: 'D',
      task_id: 't-d',
      status: 'failed',
      modelId: 'model',
      proposals: [],
      errors: ['native failure'],
    },
  ])

  assert.deepEqual(summary, {
    total: 4,
    merge: 1,
    keepSeparate: 1,
    unsure: 1,
    failed: 1,
    conflict: 0,
  })
  assert.equal(cleanupAssistantDecisionLabel('DIFFERENT_ITEM'), 'Keep separate recommendation')
  assert.equal(cleanupAssistantDecisionLabel('SAME_ITEM'), 'Merge recommendation')
  assert.equal(cleanupAssistantDecisionLabel('UNSURE'), 'Needs your decision')
})
