import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildFlaggedCleanupExportPayload,
  validateFlaggedCleanupImport,
  createCleanupApplyProposal,
} from '../../modules/item-library/domain/itemCleanupExchange.ts'

const duplicateGroups = Array.from({ length: 10 }, (_, i) => ({
  group_id: `group-${i}`,
  label: `Item Group ${i}`,
  reason: 'Duplicate',
  normalized_label: `item group ${i}`,
  members: [
    { item_id: `item-${i}-1`, name: `Item ${i} Version A`, usage_count: 2, last_sold_price: 100 },
    { item_id: `item-${i}-2`, name: `Item ${i} Version B`, usage_count: 1, last_sold_price: 110 },
  ],
}))

test('regression: duplicate outsource flow handles malformed arrays and missing fields safely', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups,
    aliases: [],
  })

  // Simulate AI JSON that might have missing fields or nulls in risky places
  const flaggedJson = JSON.stringify({
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    merge_groups: [
      {
        group_id: 'group-0',
        canonical_name: 'Item 0 Canonical',
        winner_item_id: 'item-0-1',
        merged_item_ids: ['item-0-2'],
        // aliases_to_keep missing
        // aliases_to_retire missing
      },
      {
        group_id: 'group-1',
        canonical_name: 'Item 1 Canonical',
        winner_item_id: 'item-1-1',
        merged_item_ids: ['item-1-2'],
        aliases_to_keep: null,
        aliases_to_retire: undefined,
      },
      {
        group_id: 'group-2',
        canonical_name: 'Item 2 Canonical',
        winner_item_id: 'item-2-1',
        merged_item_ids: ['item-2-2'],
        aliases_to_keep: [],
        aliases_to_retire: [],
      },
      {
        group_id: 'group-3',
        canonical_name: 'Item 3 Canonical',
        winner_item_id: 'item-3-1',
        merged_item_ids: ['item-3-2'],
        aliases_to_keep: ['A'],
        aliases_to_retire: ['B'],
      },
      {
        group_id: 'group-4',
        canonical_name: 'Item 4 Canonical',
        winner_item_id: 'item-4-1',
        merged_item_ids: ['item-4-2'],
        aliases_to_keep: ['K'],
      },
    ],
    ignored_group_ids: ['group-5', 'group-6', 'group-7', 'group-8', 'group-9'],
  })

  const validation = validateFlaggedCleanupImport(flaggedJson, exportPayload)

  // Validation should catch missing fields if it's strict, but the domain logic should be safe
  // In the current implementation, validateFlaggedCleanupImport is somewhat strict.
  // Let's see if it passes or returns rejected groups.
  
  assert.equal(validation.preview.merge_groups.length + validation.preview.rejected_groups.length, 5)
  
  // The goal is that createCleanupApplyProposal does NOT crash even if we pass it something funky
  validation.preview.merge_groups.forEach((group) => {
    try {
      const proposal = createCleanupApplyProposal(group)
      assert.ok(proposal)
      assert.ok(Array.isArray(proposal.merged_item_ids))
      assert.ok(Array.isArray(proposal.aliases_to_keep))
      assert.ok(Array.isArray(proposal.aliases_to_retire))
    } catch (e) {
      assert.fail(`createCleanupApplyProposal crashed for group ${group.group_id}: ${e.message}`)
    }
  })

  // Test ignored groups normalization
  assert.ok(Array.isArray(validation.preview.ignored_groups))
  validation.preview.ignored_groups.forEach(g => {
    assert.ok(g.group_id)
    assert.ok(g.label)
  })
})
