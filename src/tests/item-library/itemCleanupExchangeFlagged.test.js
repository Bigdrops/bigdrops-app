import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildFlaggedCleanupExportPayload,
  validateFlaggedCleanupImport,
  createCleanupApplyProposal,
} from '../../modules/item-library/domain/itemCleanupExchange.ts'

const duplicateGroups = [
  {
    group_id: 'group-1',
    label: 'Cable Lug 10mm',
    reason: 'Similar wording',
    normalized_label: 'cable lug 10mm',
    members: [
      { item_id: 'item-1', name: 'Cable Lug 10mm', usage_count: 8, last_sold_price: 950 },
      { item_id: 'item-2', name: 'Cable Lug 10 mm', usage_count: 5, last_sold_price: 960 },
    ],
  },
]

const aliases = [
  { id: 'alias-1', item_id: 'item-1', alias_text: 'lug 10mm' },
]

test('valid flagged duplicate import does not crash and identifies as ok', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups,
    aliases,
  })

  const validResult = JSON.stringify({
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    merge_groups: [
      {
        group_id: 'group-1',
        canonical_name: 'Cable Lug 10mm',
        winner_item_id: 'item-1',
        merged_item_ids: ['item-2'],
        aliases_to_keep: ['lug 10mm'],
        aliases_to_retire: [],
      },
    ],
    ignored_group_ids: [],
  })

  const validation = validateFlaggedCleanupImport(validResult, exportPayload)

  assert.equal(validation.ok, true)
  assert.equal(validation.preview.merge_groups.length, 1)
  assert.equal(validation.preview.merge_groups[0].export_label, 'Cable Lug 10mm')
  assert.equal(validation.preview.merge_groups[0].winner_item_id, 'item-1')
  assert.deepEqual(validation.preview.merge_groups[0].merged_item_ids, ['item-2'])
})

test('unknown group_id is rejected cleanly', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups,
    aliases,
  })

  const invalidResult = JSON.stringify({
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    merge_groups: [
      {
        group_id: 'unknown-group',
        canonical_name: 'Whatever',
        winner_item_id: 'item-1',
        merged_item_ids: ['item-2'],
        aliases_to_keep: [],
        aliases_to_retire: [],
      },
    ],
    ignored_group_ids: [],
  })

  const validation = validateFlaggedCleanupImport(invalidResult, exportPayload)

  assert.equal(validation.ok, false)
  assert.equal(validation.preview.rejected_groups.length, 1)
  assert.match(validation.preview.rejected_groups[0].reason, /group_id does not match/i)
})

test('unknown winner_item_id is rejected cleanly', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups,
    aliases,
  })

  const invalidResult = JSON.stringify({
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    merge_groups: [
      {
        group_id: 'group-1',
        canonical_name: 'Cable Lug 10mm',
        winner_item_id: 'unknown-item',
        merged_item_ids: ['item-2'],
        aliases_to_keep: [],
        aliases_to_retire: [],
      },
    ],
    ignored_group_ids: [],
  })

  const validation = validateFlaggedCleanupImport(invalidResult, exportPayload)

  assert.equal(validation.ok, false)
  assert.equal(validation.preview.rejected_groups.length, 1)
  assert.match(validation.preview.rejected_groups[0].reason, /winner_item_id must reference an item inside the same exported group/i)
})

test('merged item from another group is rejected cleanly', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups,
    aliases,
  })

  const invalidResult = JSON.stringify({
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    merge_groups: [
      {
        group_id: 'group-1',
        canonical_name: 'Cable Lug 10mm',
        winner_item_id: 'item-1',
        merged_item_ids: ['item-from-nowhere'],
        aliases_to_keep: [],
        aliases_to_retire: [],
      },
    ],
    ignored_group_ids: [],
  })

  const validation = validateFlaggedCleanupImport(invalidResult, exportPayload)

  assert.equal(validation.ok, false)
  assert.equal(validation.preview.rejected_groups.length, 1)
  assert.match(validation.preview.rejected_groups[0].reason, /merged_item_ids must all reference items inside the same exported group/i)
})

test('empty merged_item_ids is rejected cleanly', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups,
    aliases,
  })

  const invalidResult = JSON.stringify({
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    merge_groups: [
      {
        group_id: 'group-1',
        canonical_name: 'Cable Lug 10mm',
        winner_item_id: 'item-1',
        merged_item_ids: [],
        aliases_to_keep: [],
        aliases_to_retire: [],
      },
    ],
    ignored_group_ids: [],
  })

  const validation = validateFlaggedCleanupImport(invalidResult, exportPayload)

  assert.equal(validation.ok, false)
  assert.equal(validation.preview.rejected_groups.length, 1)
  assert.match(validation.preview.rejected_groups[0].reason, /merged_item_ids must contain at least one item id/i)
})

test('non-JSON review text produces friendly validation error', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups,
    aliases,
  })

  const reviewText = `
# Summary of Changes
I suggest merging Item 1 and Item 2.
  `

  const validation = validateFlaggedCleanupImport(reviewText, exportPayload)

  assert.equal(validation.ok, false)
  assert.match(validation.errors[0], /Paste the final JSON result, not the review text/i)
})

test('complex flagged cleanup result with many ignored groups and mix of alias arrays', () => {
  const manyGroups = Array.from({ length: 10 }, (_, i) => ({
    group_id: `group-${i}`,
    label: `Item Group ${i}`,
    reason: 'Duplicate',
    normalized_label: `item group ${i}`,
    members: [
      { item_id: `item-${i}-1`, name: `Item ${i} Version A`, usage_count: 2, last_sold_price: 100 },
      { item_id: `item-${i}-2`, name: `Item ${i} Version B`, usage_count: 1, last_sold_price: 110 },
    ],
  }))

  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups: manyGroups,
    aliases: [],
  })

  const complexResult = JSON.stringify({
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    merge_groups: [
      {
        group_id: 'group-0',
        canonical_name: 'Item 0 Canonical',
        winner_item_id: 'item-0-1',
        merged_item_ids: ['item-0-2'],
        aliases_to_keep: ['Alias 0'],
        aliases_to_retire: [],
      },
      {
        group_id: 'group-1',
        canonical_name: 'Item 1 Canonical',
        winner_item_id: 'item-1-1',
        merged_item_ids: ['item-1-2'],
        aliases_to_keep: [],
        aliases_to_retire: ['Alias 1 Old'],
      },
      {
        group_id: 'group-2',
        canonical_name: 'Item 2 Canonical',
        winner_item_id: 'item-2-1',
        merged_item_ids: ['item-2-2'],
        aliases_to_keep: ['A', 'B'],
        aliases_to_retire: ['C'],
      },
      {
        group_id: 'group-3',
        canonical_name: 'Item 3 Canonical',
        winner_item_id: 'item-3-1',
        merged_item_ids: ['item-3-2'],
        aliases_to_keep: [],
        aliases_to_retire: [],
      },
      {
        group_id: 'group-4',
        canonical_name: 'Item 4 Canonical',
        winner_item_id: 'item-4-1',
        merged_item_ids: ['item-4-2'],
        aliases_to_keep: ['Keep'],
        aliases_to_retire: [],
      },
    ],
    ignored_group_ids: ['group-5', 'group-6', 'group-7', 'group-8', 'group-9'],
  })

  const validation = validateFlaggedCleanupImport(complexResult, exportPayload)

  assert.equal(validation.ok, true)
  assert.equal(validation.preview.merge_groups.length, 5)
  assert.equal(validation.preview.ignored_groups.length, 5)

  // Verify that createCleanupApplyProposal works for all 5 and has normalized arrays
  validation.preview.merge_groups.forEach((group, index) => {
    const proposal = createCleanupApplyProposal(group)
    assert.equal(proposal.group_id, `group-${index}`)
    assert.ok(Array.isArray(proposal.merged_item_ids), 'merged_item_ids must be an array')
    assert.ok(Array.isArray(proposal.aliases_to_keep), 'aliases_to_keep must be an array')
    assert.ok(Array.isArray(proposal.aliases_to_retire), 'aliases_to_retire must be an array')
    assert.equal(proposal.merged_item_ids.length, 1)
  })

  // Verify ignored groups display safely
  assert.equal(validation.preview.ignored_groups[0].label, 'Item Group 5')
})
