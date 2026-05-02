import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildFlaggedCleanupExportPayload,
  validateFlaggedCleanupImport,
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
