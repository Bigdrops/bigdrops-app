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
    snapshot_id: exportPayload.snapshot_id,
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

test('flagged cleanup snapshot identity is deterministic for the logical review set', () => {
  const exportA = buildFlaggedCleanupExportPayload({
    duplicateGroups: [
      {
        group_id: 'group-b',
        label: 'Group B',
        reason: 'Similar wording',
        normalized_label: 'group b',
        members: [
          { item_id: 'item-b2', name: 'Item B2', usage_count: 2, last_sold_price: 20 },
          { item_id: 'item-b1', name: 'Item B1', usage_count: 1, last_sold_price: 10 },
        ],
      },
      {
        group_id: 'group-a',
        label: 'Group A',
        reason: 'Similar wording',
        normalized_label: 'group a',
        members: [
          { item_id: 'item-a1', name: 'Item A1', usage_count: 1, last_sold_price: 10 },
          { item_id: 'item-a2', name: 'Item A2', usage_count: 2, last_sold_price: 20 },
        ],
      },
    ],
    aliases: [
      { id: 'alias-b', item_id: 'item-b1', alias_text: 'B one' },
      { id: 'alias-a', item_id: 'item-a1', alias_text: 'A one' },
    ],
    generatedAt: '2026-09-25T10:00:00.000Z',
  })

  const exportB = buildFlaggedCleanupExportPayload({
    duplicateGroups: [
      {
        group_id: 'group-a',
        label: 'Group A',
        reason: 'Similar wording',
        normalized_label: 'group a',
        members: [
          { item_id: 'item-a2', name: 'Item A2', usage_count: 2, last_sold_price: 20 },
          { item_id: 'item-a1', name: 'Item A1', usage_count: 1, last_sold_price: 10 },
        ],
      },
      {
        group_id: 'group-b',
        label: 'Group B',
        reason: 'Similar wording',
        normalized_label: 'group b',
        members: [
          { item_id: 'item-b1', name: 'Item B1', usage_count: 1, last_sold_price: 10 },
          { item_id: 'item-b2', name: 'Item B2', usage_count: 2, last_sold_price: 20 },
        ],
      },
    ],
    aliases: [
      { id: 'alias-a', item_id: 'item-a1', alias_text: 'A one' },
      { id: 'alias-b', item_id: 'item-b1', alias_text: 'B one' },
    ],
    generatedAt: '2026-09-25T11:00:00.000Z',
  })

  const changedMembership = buildFlaggedCleanupExportPayload({
    duplicateGroups: [
      {
        group_id: 'group-a',
        label: 'Group A',
        reason: 'Similar wording',
        normalized_label: 'group a',
        members: [
          { item_id: 'item-a1', name: 'Item A1', usage_count: 1, last_sold_price: 10 },
          { item_id: 'item-a3', name: 'Item A3', usage_count: 2, last_sold_price: 20 },
        ],
      },
    ],
    aliases: [],
    generatedAt: '2026-09-25T10:00:00.000Z',
  })

  assert.equal(exportA.snapshot_id, exportB.snapshot_id)
  assert.notEqual(exportA.snapshot_id, changedMembership.snapshot_id)
})

test('flagged cleanup rejects legacy or mismatched snapshot results before proposal validation', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups,
    aliases,
  })

  const baseResult = {
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    merge_groups: [],
    ignored_group_ids: [],
  }

  const legacyValidation = validateFlaggedCleanupImport(JSON.stringify(baseResult), exportPayload)
  assert.equal(legacyValidation.ok, false)
  assert.equal(legacyValidation.preview, null)
  assert.equal(legacyValidation.parsed, null)
  assert.match(legacyValidation.errors.join(' '), /older export format/i)

  const mismatchedValidation = validateFlaggedCleanupImport(
    JSON.stringify({ ...baseResult, snapshot_id: 'cleanup-v1-stale' }),
    exportPayload,
  )
  assert.equal(mismatchedValidation.ok, false)
  assert.equal(mismatchedValidation.preview, null)
  assert.equal(mismatchedValidation.parsed, null)
  assert.match(mismatchedValidation.errors.join(' '), /older or different Cleanup export/i)
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
    snapshot_id: exportPayload.snapshot_id,
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
  assert.equal(validation.preview.merge_groups.length, 0)
  assert.equal(validation.preview.rejected_groups.length, 1)
  assert.match(validation.preview.rejected_groups[0].reason, /group_id does not match/i)
  assert.equal(validation.parsed, null)
})

test('observed mixed old and current cleanup result blocks all merge proposals', () => {
  const currentGroups = [
    {
      group_id: 'dcf1e5e6-78bb-4136-a96e-699c9d2e15f8::08a37a28-ff0e-4f3d-bbd0-081964ef9e95',
      label: 'Charging alternator',
      reason: 'Similar wording',
      normalized_label: 'charging alternator',
      members: [
        { item_id: 'dcf1e5e6-78bb-4136-a96e-699c9d2e15f8', name: 'Charging alternator', usage_count: 1, last_sold_price: 10 },
        { item_id: '08a37a28-ff0e-4f3d-bbd0-081964ef9e95', name: 'charging alternator 24volts', usage_count: 1, last_sold_price: 10 },
      ],
    },
    {
      group_id: '0b344c6e-315b-4975-a625-70555b43dcc4::09a63b01-cff5-4f32-b1bd-dc61c3db5096',
      label: 'Engine Oil',
      reason: 'Similar wording',
      normalized_label: 'engine oil',
      members: [
        { item_id: '0b344c6e-315b-4975-a625-70555b43dcc4', name: 'Engine Oil', usage_count: 1, last_sold_price: 10 },
        { item_id: '09a63b01-cff5-4f32-b1bd-dc61c3db5096', name: 'Generator Engine Oil 15W-40', usage_count: 1, last_sold_price: 10 },
      ],
    },
    {
      group_id: 'eaf64f62-25d0-4d79-aec6-8076a5f3a1b3::031ed85c-a1c8-47ef-bfbe-e41b2332704a',
      label: '6 Watts pot lights',
      reason: 'Similar wording',
      normalized_label: 'watts pot lights',
      members: [
        { item_id: 'eaf64f62-25d0-4d79-aec6-8076a5f3a1b3', name: '6 Watts pot lights', usage_count: 1, last_sold_price: 10 },
        { item_id: '031ed85c-a1c8-47ef-bfbe-e41b2332704a', name: '18 watts pot lights', usage_count: 1, last_sold_price: 10 },
      ],
    },
    {
      group_id: '24a072a0-8dfc-4d08-9d62-54f9c6f65aa7::78a53f77-e3fb-4d52-b3ae-61b61f1759b7',
      label: 'COPPER REWINDING WIRE SWG 17',
      reason: 'Similar wording',
      normalized_label: 'copper rewinding wire swg',
      members: [
        { item_id: '24a072a0-8dfc-4d08-9d62-54f9c6f65aa7', name: 'COPPER REWINDING WIRE SWG 17', usage_count: 1, last_sold_price: 10 },
        { item_id: '78a53f77-e3fb-4d52-b3ae-61b61f1759b7', name: 'COPPER REWINDING WIRE SWG 17.5', usage_count: 1, last_sold_price: 10 },
      ],
    },
  ]
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups: currentGroups,
    aliases: [],
  })

  const mixedResult = JSON.stringify({
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    snapshot_id: exportPayload.snapshot_id,
    merge_groups: [
      {
        group_id: currentGroups[0].group_id,
        canonical_name: 'Charging alternator',
        winner_item_id: 'dcf1e5e6-78bb-4136-a96e-699c9d2e15f8',
        merged_item_ids: ['08a37a28-ff0e-4f3d-bbd0-081964ef9e95'],
        aliases_to_keep: [],
        aliases_to_retire: [],
      },
      {
        group_id: 'f94cc373-feea-464c-a8dc-f5caef9f29c7::9c8c6219-93df-4bcd-9ada-d7125cf13edd',
        canonical_name: 'Oil filter',
        winner_item_id: 'f94cc373-feea-464c-a8dc-f5caef9f29c7',
        merged_item_ids: ['9c8c6219-93df-4bcd-9ada-d7125cf13edd'],
        aliases_to_keep: [],
        aliases_to_retire: [],
      },
    ],
    ignored_group_ids: [],
  })

  const validation = validateFlaggedCleanupImport(mixedResult, exportPayload)

  assert.equal(validation.ok, false)
  assert.equal(validation.preview.merge_groups.length, 0)
  assert.equal(validation.parsed, null)
  assert.equal(validation.preview.rejected_groups.length, 1)
  assert.equal(
    validation.preview.rejected_groups[0].group_id,
    'f94cc373-feea-464c-a8dc-f5caef9f29c7::9c8c6219-93df-4bcd-9ada-d7125cf13edd',
  )
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
    snapshot_id: exportPayload.snapshot_id,
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
  assert.equal(validation.preview.merge_groups.length, 0)
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
    snapshot_id: exportPayload.snapshot_id,
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
  assert.equal(validation.preview.merge_groups.length, 0)
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
    snapshot_id: exportPayload.snapshot_id,
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
  assert.equal(validation.preview.merge_groups.length, 0)
  assert.equal(validation.preview.rejected_groups.length, 1)
  assert.match(validation.preview.rejected_groups[0].reason, /merged_item_ids must contain at least one item id/i)
})

test('self merge and duplicate group proposals are rejected before application', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups,
    aliases,
  })

  const invalidResult = JSON.stringify({
    response_type: 'flagged_cleanup_result',
    schema_version: 1,
    source_export_type: 'flagged_cleanup',
    snapshot_id: exportPayload.snapshot_id,
    merge_groups: [
      {
        group_id: 'group-1',
        canonical_name: 'Cable Lug 10mm',
        winner_item_id: 'item-1',
        merged_item_ids: ['item-1'],
        aliases_to_keep: [],
        aliases_to_retire: [],
      },
      {
        group_id: 'group-1',
        canonical_name: 'Cable Lug 10mm',
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
  assert.equal(validation.preview.merge_groups.length, 0)
  assert.equal(validation.preview.rejected_groups.length, 2)
  assert.match(validation.preview.rejected_groups[0].reason, /must not include the winner_item_id/i)
  assert.match(validation.preview.rejected_groups[1].reason, /only once/i)
  assert.equal(validation.parsed, null)
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
    snapshot_id: exportPayload.snapshot_id,
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
