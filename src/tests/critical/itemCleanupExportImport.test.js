import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildFlaggedCleanupExportPayload,
  createCleanupBatches,
  buildCatalogCleanupBatchExportPayload,
  createCatalogCleanupSession,
  validateFlaggedCleanupImport,
} from '../../modules/item-library/domain/itemCleanupExchange.ts'
import { getCleanupExportItemIds } from '../../modules/item-library/domain/cleanupExportPayload.ts'
import { isImportedDescriptionItemId, hasSyntheticCleanupItemIds } from '../../modules/item-library/domain/cleanupApply.ts'

test('isImportedDescriptionItemId detects synthetic ID prefix', () => {
  assert.equal(isImportedDescriptionItemId('imported-desc:some-text'), true)
  assert.equal(isImportedDescriptionItemId('550e8400-e29b-41d4-a716-446655440000'), false)
  assert.equal(isImportedDescriptionItemId(''), false)
})

test('hasSyntheticCleanupItemIds detects imported description IDs in proposal', () => {
  assert.equal(
    hasSyntheticCleanupItemIds({
      group_id: 'g1',
      export_label: 'test',
      canonical_name: 'test',
      winner_item_id: '550e8400-e29b-41d4-a716-446655440000',
      merged_item_ids: ['imported-desc:foo'],
      aliases_to_keep: [],
      aliases_to_retire: [],
    }),
    true,
  )

  assert.equal(
    hasSyntheticCleanupItemIds({
      group_id: 'g1',
      export_label: 'test',
      canonical_name: 'test',
      winner_item_id: '550e8400-e29b-41d4-a716-446655440000',
      merged_item_ids: ['550e8400-e29b-41d4-a716-446655440001'],
      aliases_to_keep: [],
      aliases_to_retire: [],
    }),
    false,
  )

  assert.equal(
    hasSyntheticCleanupItemIds({
      group_id: 'g1',
      export_label: 'test',
      canonical_name: 'test',
      winner_item_id: 'imported-desc:winner',
      merged_item_ids: ['550e8400-e29b-41d4-a716-446655440001'],
      aliases_to_keep: [],
      aliases_to_retire: [],
    }),
    true,
  )
})

test('getCleanupExportItemIds extracts IDs from catalog batch payload', () => {
  const payload = {
    export_type: 'catalog_cleanup_batch',
    schema_version: 1,
    batch_id: 'batch-1',
    generated_at: new Date().toISOString(),
    session: { session_id: 's1', batch_size: 50, batch_index: 1, batch_count: 2 },
    scope: { mode: 'full_catalog_batch', item_count: 2 },
    items: [
      { item_id: 'a-0001', name: 'Item A' },
      { item_id: 'b-0002', name: 'Item B' },
    ],
  }

  const ids = getCleanupExportItemIds(payload)
  assert.equal(ids.size, 2)
  assert.ok(ids.has('a-0001'))
  assert.ok(ids.has('b-0002'))
})

test('getCleanupExportItemIds extracts IDs from flagged batch payload', () => {
  const payload = {
    export_type: 'flagged_cleanup_batch',
    schema_version: 1,
    batch_id: 'batch-1',
    generated_at: new Date().toISOString(),
    scope: { mode: 'flagged_batch', group_count: 1, item_count: 2 },
    groups: [
      {
        group_id: 'g1',
        label: 'Test Group',
        items: [
          { item_id: 'a-0001', name: 'Item A' },
          { item_id: 'b-0002', name: 'Item B' },
        ],
      },
    ],
  }

  const ids = getCleanupExportItemIds(payload)
  assert.equal(ids.size, 2)
  assert.ok(ids.has('a-0001'))
  assert.ok(ids.has('b-0002'))
})

test('getCleanupExportItemIds returns empty set for unknown payload shape', () => {
  const ids = getCleanupExportItemIds({ export_type: 'unknown', items: null })
  assert.equal(ids.size, 0)
})

test('createCleanupBatches classifies groups into categories', () => {
  const makeGroup = (label) => ({
    group_id: label.toLowerCase().replace(/\s+/g, '-'),
    label,
    items: [{ item_id: 'id-1', name: label, aliases: [], usage_count: 1, last_price: null, is_active: true }],
  })

  const groups = [
    makeGroup('LED Floodlight 200W'),
    makeGroup('MCB 32A Single Pole'),
    makeGroup('Armoured Cable 16mm'),
    makeGroup('13A Socket with Switch'),
    makeGroup('Submersible Pump 1.5HP'),
    makeGroup('PVC Pipe 50mm'),
    makeGroup('Safety Helmet Yellow'),
  ]

  const batches = createCleanupBatches(groups)

  const titles = batches.map((b) => b.title)
  assert.ok(titles.some((t) => t.startsWith('Lighting')), `Lighting not found in ${titles.join(', ')}`)
  assert.ok(titles.some((t) => t.startsWith('Breakers, Contactors')), `Breakers not found in ${titles.join(', ')}`)
  assert.ok(titles.some((t) => t.startsWith('Cables, Lugs')), `Cables not found in ${titles.join(', ')}`)
  assert.ok(titles.some((t) => t.startsWith('Sockets, Switches')), `Sockets not found in ${titles.join(', ')}`)
  assert.ok(titles.some((t) => t.startsWith('Pumps, Panels')), `Pumps not found in ${titles.join(', ')}`)
  assert.ok(titles.some((t) => t.startsWith('Plumbing & Pipe')), `Plumbing not found in ${titles.join(', ')}`)
  assert.ok(titles.some((t) => t.startsWith('Safety Equipment')), `Safety not found in ${titles.join(', ')}`)
})

test('createCleanupBatches places unknown items in Miscellaneous', () => {
  const groups = [
    {
      group_id: 'g1',
      label: 'Office Chair Ergonomic',
      items: [{ item_id: 'id-1', name: 'Chair', aliases: [], usage_count: 1, last_price: null, is_active: true }],
    },
  ]

  const batches = createCleanupBatches(groups)
  assert.equal(batches.length, 1)
  assert.ok(batches[0].title.startsWith('Miscellaneous'))
})

test('buildFlaggedCleanupExportPayload creates correct structure', () => {
  const payload = buildFlaggedCleanupExportPayload({
    duplicateGroups: [
      {
        group_id: 'g1',
        label: 'Test Group',
        label_normalized: 'test group',
        label_canonical: 'test group',
        match_method: 'name_similarity',
        members: [
          { item_id: 'id-1', name: 'Item A', usage_count: 5, last_sold_price: 100 },
          { item_id: 'id-2', name: 'Item B', usage_count: 3, last_sold_price: null },
        ],
      },
    ],
    aliases: [],
    generatedAt: '2026-01-01T00:00:00.000Z',
  })

  assert.equal(payload.export_type, 'flagged_cleanup')
  assert.equal(payload.schema_version, 1)
  assert.equal(payload.groups.length, 1)
  assert.equal(payload.groups[0].items.length, 2)
  assert.equal(payload.scope.group_count, 1)
  assert.equal(payload.scope.item_count, 2)
})

test('createCatalogCleanupSession creates batches correctly', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({
    item_id: `id-${String(i).padStart(4, '0')}`,
    name: `Item ${i}`,
    usage_count: i,
  }))

  const session = createCatalogCleanupSession({
    items,
    aliases: [],
    batchSize: 10,
  })

  assert.ok(session.batches.length >= 2)
  assert.ok(session.batches[0].item_count <= 10)
  assert.ok(session.batch_size === 10)
})

test('buildCatalogCleanupBatchExportPayload creates correct structure', () => {
  const session = createCatalogCleanupSession({
    items: [{ item_id: 'id-1', name: 'Test Item', usage_count: 1 }],
    aliases: [],
    batchSize: 10,
  })

  const payload = buildCatalogCleanupBatchExportPayload({
    session,
    batch: session.batches[0],
    batchIndex: 0,
    generatedAt: '2026-01-01T00:00:00.000Z',
  })

  assert.equal(payload.export_type, 'catalog_cleanup_batch')
  assert.equal(payload.session.batch_index, 1)
  assert.equal(payload.session.batch_count, session.batch_count)
  assert.equal(payload.items.length, 1)
})

test('validateFlaggedCleanupImport rejects empty input', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups: [],
    aliases: [],
  })

  const result = validateFlaggedCleanupImport('', exportPayload)
  assert.equal(result.ok, false)
  assert.equal(result.preview, null)
  assert.equal(result.parsed, null)
})

test('validateFlaggedCleanupImport rejects non-JSON text', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups: [
      {
        group_id: 'g1',
        label: 'Test',
        label_normalized: 'test',
        label_canonical: 'test',
        match_method: 'name_similarity',
        members: [{ item_id: 'uuid-1', name: 'A', usage_count: 1 }],
      },
    ],
    aliases: [],
  })

  const result = validateFlaggedCleanupImport('This is a summary of my review', exportPayload)
  assert.equal(result.ok, false)
  assert.ok(result.errors[0].includes('final JSON'))
})

test('validateFlaggedCleanupImport validates merge groups against export groups', () => {
  const exportPayload = buildFlaggedCleanupExportPayload({
    duplicateGroups: [
      {
        group_id: 'g1',
        label: 'Test Group',
        label_normalized: 'test group',
        label_canonical: 'test group',
        match_method: 'name_similarity',
        members: [
          { item_id: 'uuid-aaaa', name: 'Item A', usage_count: 5 },
          { item_id: 'uuid-bbbb', name: 'Item B', usage_count: 3 },
        ],
      },
    ],
    aliases: [],
  })

  const result = validateFlaggedCleanupImport(
    JSON.stringify({
      response_type: 'flagged_cleanup_result',
      schema_version: 1,
      source_export_type: 'flagged_cleanup',
      merge_groups: [
        {
          group_id: 'g1',
          canonical_name: 'Item A',
          winner_item_id: 'uuid-aaaa',
          merged_item_ids: ['uuid-bbbb'],
          aliases_to_keep: [],
          aliases_to_retire: [],
        },
      ],
      ignored_group_ids: [],
    }),
    exportPayload,
  )

  assert.equal(result.ok, true)
  assert.equal(result.preview.merge_groups.length, 1)
  assert.equal(result.preview.merge_groups[0].canonical_name, 'Item A')
})
