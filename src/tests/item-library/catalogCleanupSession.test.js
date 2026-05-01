import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCatalogCleanupBatchExportPayload,
  createCatalogCleanupSession,
  validateCatalogCleanupBatchImport,
} from '../../modules/item-library/domain/itemCleanupExchange.ts'

const items = [
  {
    item_id: 'item-01',
    name: 'Cable Lug 10mm',
    standard_price: 1000,
    last_sold_price: 950,
    usage_count: 8,
    appears_in_invoice: true,
    appears_in_quotation: true,
    is_active: true,
  },
  {
    item_id: 'item-02',
    name: 'Cable Lug 10 mm',
    standard_price: 1000,
    last_sold_price: 960,
    usage_count: 5,
    appears_in_invoice: true,
    appears_in_quotation: false,
    is_active: true,
  },
  {
    item_id: 'item-03',
    name: 'MCB 16A',
    standard_price: 3500,
    last_sold_price: 3400,
    usage_count: 10,
    appears_in_invoice: true,
    appears_in_quotation: true,
    is_active: true,
  },
  {
    item_id: 'item-04',
    name: 'MCB 16 A',
    standard_price: 3550,
    last_sold_price: 3450,
    usage_count: 6,
    appears_in_invoice: false,
    appears_in_quotation: true,
    is_active: true,
  },
  {
    item_id: 'item-05',
    name: 'Socket 13A',
    standard_price: 4200,
    last_sold_price: 4100,
    usage_count: 12,
    appears_in_invoice: true,
    appears_in_quotation: true,
    is_active: true,
  },
  {
    item_id: 'item-06',
    name: 'Flexible Cable 2.5mm',
    standard_price: 7800,
    last_sold_price: 7600,
    usage_count: 4,
    appears_in_invoice: false,
    appears_in_quotation: true,
    is_active: true,
  },
  {
    item_id: 'item-07',
    name: 'Changeover Switch 63A',
    standard_price: 22500,
    last_sold_price: 22000,
    usage_count: 3,
    appears_in_invoice: true,
    appears_in_quotation: false,
    is_active: true,
  },
]

const aliases = [
  { id: 'alias-1', item_id: 'item-01', alias_text: 'lug 10mm' },
  { id: 'alias-2', item_id: 'item-03', alias_text: '16a breaker' },
  { id: 'alias-3', item_id: 'item-05', alias_text: '13a switched socket' },
]

const duplicateGroups = [
  {
    group_id: 'item-01::item-02',
    label: 'Cable Lug 10mm',
    reason: 'Similar wording',
    normalized_label: 'cable lug 10mm',
    members: [
      { item_id: 'item-01', name: 'Cable Lug 10mm', usage_count: 8, last_sold_price: 950 },
      { item_id: 'item-02', name: 'Cable Lug 10 mm', usage_count: 5, last_sold_price: 960 },
    ],
  },
  {
    group_id: 'item-03::item-04',
    label: 'MCB 16A',
    reason: 'Similar wording',
    normalized_label: 'mcb 16a',
    members: [
      { item_id: 'item-03', name: 'MCB 16A', usage_count: 10, last_sold_price: 3400 },
      { item_id: 'item-04', name: 'MCB 16 A', usage_count: 6, last_sold_price: 3450 },
    ],
  },
]

function createSession(batchSize = 3) {
  return createCatalogCleanupSession({
    items,
    aliases,
    duplicateGroups,
    batchSize,
    sessionId: 'session-locked-1',
    generatedAt: '2026-05-01T10:00:00.000Z',
  })
}

test('numeric cleanup batching creates simple Batch N labels from the full catalog', () => {
  const session = createSession(3)

  assert.equal(session.batch_size, 3)
  assert.equal(session.batches.length, 3)
  assert.deepEqual(
    session.batches.map((batch) => batch.title),
    ['Batch 1', 'Batch 2', 'Batch 3'],
  )
  assert.ok(session.batches.every((batch) => /^Batch \d+$/.test(batch.title)))
  assert.ok(session.batches.every((batch) => !/[()]/.test(batch.title)))
})

test('duplicate groups stay atomic even when that pushes a batch over target size', () => {
  const session = createSession(3)
  const batchWithMcbGroup = session.batches.find((batch) =>
    batch.items.some((item) => item.duplicate_group_id === 'item-03::item-04' || item.duplicate_group_id === 'item-04::item-03'),
  )
  const groupedIds = batchWithMcbGroup?.items
    .filter((item) => item.item_id === 'item-03' || item.item_id === 'item-04')
    .map((item) => item.item_id)

  assert.deepEqual(groupedIds, ['item-04', 'item-03'])
  assert.equal(batchWithMcbGroup?.item_count, 3)
  assert.equal(
    session.batches.some(
      (batch) =>
        batch.items.some((item) => item.item_id === 'item-03') &&
        batch.items.some((item) => item.item_id === 'item-04'),
    ),
    true,
  )
})

test('standalone items can fill remaining batch space without category labels', () => {
  const session = createSession(4)
  const mixedBatch = session.batches.find(
    (batch) => batch.items.some((item) => item.duplicate_group_id) && batch.items.some((item) => !item.duplicate_group_id),
  )

  assert.ok(mixedBatch)
  assert.equal(mixedBatch?.item_count, 4)
  assert.equal(mixedBatch?.items.some((item) => item.duplicate_group_id === null), true)
  assert.ok(session.batches.every((batch) => !/cables|breakers|electrical|miscellaneous/i.test(batch.title)))
})

test('batch import rejects results for the wrong session or batch', () => {
  const session = createSession(3)
  const exportPayload = buildCatalogCleanupBatchExportPayload({
    session,
    batch: session.batches[0],
    batchIndex: 0,
    generatedAt: '2026-05-01T10:05:00.000Z',
  })

  const wrongResult = JSON.stringify({
    response_type: 'catalog_cleanup_batch_result',
    schema_version: 1,
    source_export_type: 'catalog_cleanup_batch',
    session_id: 'session-other',
    batch_id: 'batch-9',
    merge_suggestions: [],
    rename_suggestions: [],
    alias_suggestions: [],
    ignored_item_ids: [],
    review_required_item_ids: [],
  })

  const validation = validateCatalogCleanupBatchImport(wrongResult, exportPayload)

  assert.equal(validation.ok, false)
  assert.match(validation.errors.join(' '), /session/i)
  assert.match(validation.errors.join(' '), /batch/i)
})

test('batch import accepts valid in-scope decisions and rejects out-of-batch ids', () => {
  const session = createSession(3)
  const mcbBatchIndex = session.batches.findIndex((batch) =>
    batch.items.some((item) => item.item_id === 'item-03') && batch.items.some((item) => item.item_id === 'item-04'),
  )
  const exportPayload = buildCatalogCleanupBatchExportPayload({
    session,
    batch: session.batches[mcbBatchIndex],
    batchIndex: mcbBatchIndex,
    generatedAt: '2026-05-01T10:05:00.000Z',
  })

  const validResult = JSON.stringify({
    response_type: 'catalog_cleanup_batch_result',
    schema_version: 1,
    source_export_type: 'catalog_cleanup_batch',
    session_id: 'session-locked-1',
    batch_id: exportPayload.batch_id,
    merge_suggestions: [
      {
        canonical_name: 'MCB 16A',
        winner_item_id: 'item-03',
        merged_item_ids: ['item-04'],
      },
    ],
    rename_suggestions: [
      {
        item_id: 'item-06',
        suggested_name: 'Flexible Cable 2.5mm',
      },
    ],
    alias_suggestions: [
      {
        item_id: 'item-06',
        suggested_aliases: ['2.5mm flex cable'],
      },
    ],
    ignored_item_ids: [],
    review_required_item_ids: ['item-06'],
  })

  const validValidation = validateCatalogCleanupBatchImport(validResult, exportPayload)

  assert.equal(validValidation.ok, true)
  assert.equal(validValidation.preview?.merge_suggestions.length, 1)
  assert.equal(validValidation.preview?.rename_suggestions.length, 1)
  assert.equal(validValidation.preview?.alias_suggestions.length, 1)

  const invalidResult = JSON.stringify({
    response_type: 'catalog_cleanup_batch_result',
    schema_version: 1,
    source_export_type: 'catalog_cleanup_batch',
    session_id: 'session-locked-1',
    batch_id: exportPayload.batch_id,
    merge_suggestions: [
      {
        canonical_name: 'Cable Lug 10mm',
        winner_item_id: 'item-01',
        merged_item_ids: ['item-04'],
      },
    ],
    rename_suggestions: [],
    alias_suggestions: [],
    ignored_item_ids: [],
    review_required_item_ids: [],
  })

  const invalidValidation = validateCatalogCleanupBatchImport(invalidResult, exportPayload)

  assert.equal(invalidValidation.ok, false)
  assert.match(invalidValidation.errors.join(' '), /current batch/i)
})
