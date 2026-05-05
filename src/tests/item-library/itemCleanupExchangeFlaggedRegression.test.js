import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildFlaggedCleanupExportPayload,
  validateFlaggedCleanupImport,
  createCleanupApplyProposal,
} from '../../modules/item-library/domain/itemCleanupExchange.ts'
import {
  getSyntheticCleanupItemIdFailure,
  hasSyntheticCleanupItemIds,
} from '../../modules/item-library/domain/cleanupApply.ts'
import { getCleanupExportItemIds } from '../../modules/item-library/domain/cleanupExportPayload.ts'

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

test('getCleanupExportItemIds supports catalog and flagged cleanup payloads', () => {
  const flaggedPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups: duplicateGroups.slice(0, 2),
    aliases: [],
  })

  const flaggedIds = getCleanupExportItemIds(flaggedPayload)
  assert.deepEqual(
    [...flaggedIds].sort(),
    ['item-0-1', 'item-0-2', 'item-1-1', 'item-1-2'],
  )

  const catalogPayload = {
    export_type: 'catalog_cleanup_batch',
    schema_version: 1,
    session: {
      session_id: 'session-1',
      batch_size: 2,
      batch_index: 0,
      batch_count: 1,
    },
    batch_id: 'batch-1',
    generated_at: '2026-05-05T00:00:00.000Z',
    scope: {
      mode: 'full_catalog_batch',
      item_count: 2,
    },
    items: [
      {
        item_id: 'catalog-1',
        name: 'Catalog Item 1',
        standard_price: null,
        last_sold_price: null,
        usage_count: 0,
        aliases: [],
        appears_in_invoice: false,
        appears_in_quotation: false,
        cleanup_flags: [],
        duplicate_group_id: null,
      },
      {
        item_id: 'catalog-2',
        name: 'Catalog Item 2',
        standard_price: null,
        last_sold_price: null,
        usage_count: 0,
        aliases: [],
        appears_in_invoice: false,
        appears_in_quotation: false,
        cleanup_flags: [],
        duplicate_group_id: null,
      },
    ],
  }

  const catalogIds = getCleanupExportItemIds(catalogPayload)
  assert.deepEqual([...catalogIds].sort(), ['catalog-1', 'catalog-2'])
})

test('synthetic cleanup item id helper blocks imported fallback proposals and allows real catalog ids', () => {
  const syntheticWinnerProposal = {
    group_id: 'group-synthetic-winner',
    export_label: 'Imported winner',
    canonical_name: 'Imported winner',
    winner_item_id: 'imported-desc:cable%20lug%2010mm',
    merged_item_ids: ['550e8400-e29b-41d4-a716-446655440000'],
    aliases_to_keep: [],
    aliases_to_retire: [],
  }

  assert.equal(hasSyntheticCleanupItemIds(syntheticWinnerProposal), true)
  assert.match(
    getSyntheticCleanupItemIdFailure(syntheticWinnerProposal),
    /imported fallback items that are not saved catalog records yet/i,
  )

  const syntheticMergedProposal = {
    group_id: 'group-synthetic-merged',
    export_label: 'Imported merged',
    canonical_name: 'Imported merged',
    winner_item_id: '550e8400-e29b-41d4-a716-446655440001',
    merged_item_ids: ['imported-desc:cable%20lug%2016mm'],
    aliases_to_keep: [],
    aliases_to_retire: [],
  }

  assert.equal(hasSyntheticCleanupItemIds(syntheticMergedProposal), true)
  assert.match(
    getSyntheticCleanupItemIdFailure(syntheticMergedProposal),
    /imported fallback items that are not saved catalog records yet/i,
  )

  const realCatalogProposal = {
    group_id: 'group-real',
    export_label: 'Real ids',
    canonical_name: 'Real ids',
    winner_item_id: '550e8400-e29b-41d4-a716-446655440002',
    merged_item_ids: [
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004',
    ],
    aliases_to_keep: [],
    aliases_to_retire: [],
  }

  assert.equal(hasSyntheticCleanupItemIds(realCatalogProposal), false)
  assert.equal(getSyntheticCleanupItemIdFailure(realCatalogProposal), null)
})
