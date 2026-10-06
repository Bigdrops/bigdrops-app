import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  LINEAGE_COLUMNS,
  authorityTransitionSummary,
  buildCpsRowLineage,
  buildInvoiceItemLineage,
  cpsRowLineageId,
  emptyLineage,
  feedbackAuthorityUpdate,
  feedbackStageOwnsAuthority,
  hasAnyLineage,
  hasCpsLineage,
  isPersistableLineageId,
  lineageSignature,
  normalizeLineageId,
  resolveActiveFeedbackAuthority,
  sameLineage,
  summarizeQuotationLineage,
  summarizeUnlineagedRows,
  withoutLineage,
} from '@/domain/cps/lineage'
import { repairInvoiceItemLineage as applyInvoiceItemLineage, persistChainAuthority } from '@/domain/cps/lineageStore'
import { mapCpsToQuotation } from '@/domain/cps/conversion'
import { toDbItem, makeEmptyItem, normalizeExtraCharges } from '@/domain/invoice/factories'
import { mapDbInvoiceItem } from '@/domain/invoice/normalize'
import { mapDbQuotationItem } from '@/domain/quotation/normalize'
import { buildCpsAuditMeta, CPS_AUDIT_SOURCE } from '@/domain/cps/auditDiff'
import { buildAuditTrailItems } from '@/domain/audit/auditFormatters'
import { CPS_AUDIT_META_KEY } from '@/domain/audit/auditTypes'

// ── Fixtures ───────────────────────────────────────────────────────────────

const CPS_ID = '11111111-1111-4111-8111-111111111111'
const CHAIN_ID = '99999999-9999-4999-8999-999999999999'
const ROW_A = 'aaaaaaaa-1111-4111-8111-111111111111'
const ROW_B = 'bbbbbbbb-1111-4111-8111-111111111111'
const QUOTATION_ID = '22222222-2222-4222-8222-222222222222'
const INVOICE_ID = '33333333-3333-4333-8333-333333333333'
const QUOTATION_ITEM_ID = '44444444-4444-4444-8444-444444444444'

function cpsRow(overrides = {}) {
  return {
    row_type: 'item',
    sort_order: 0,
    section_title: '',
    description: 'Fuel Filter',
    specification: 'Perkins',
    quantity: 2,
    unit: 'pcs',
    notes: '',
    make_brand: 'Perkins',
    cp: '20000',
    sp: '22000',
    image_url: null,
    group_id: null,
    custom_data: {},
    ...overrides,
  }
}

function cpsSheet(overrides = {}) {
  return {
    id: CPS_ID,
    cps_number: 'CPS-000001',
    title: 'Sheet',
    client_name: 'Acme Ltd',
    project_name: '',
    issue_date: '2026-01-01',
    table_rows: [cpsRow({ id: ROW_A })],
    table_columns: [],
    custom_fields: {},
    ...overrides,
  }
}

/**
 * Minimal thenable PostgREST stand-in for the lineage writers.
 *
 * Supports both `update(payload).eq(...)` and `select(cols).eq(...).not(...).limit(n)`
 * chains, which is what the chain-authority resolver uses.
 */
function createFakeTenantClient(resolveResponse) {
  const calls = []
  const client = {
    from(table) {
      const make = (op, payload) => {
        const record = { table, op, payload, filters: {}, notFilters: [], limit: null, select: null }
        calls.push(record)
        const respond = () => resolveResponse(record)
        const builder = {
          eq(column, value) {
            record.filters[column] = value
            return builder
          },
          not(column, operator, value) {
            record.notFilters.push([column, operator, value])
            return builder
          },
          limit(value) {
            record.limit = value
            return builder
          },
          order() {
            return builder
          },
          select(columns) {
            record.select = columns
            return builder
          },
          then(onFulfilled, onRejected) {
            return Promise.resolve().then(respond).then(onFulfilled, onRejected)
          },
          catch(onRejected) {
            return Promise.resolve().then(respond).catch(onRejected)
          },
        }
        return builder
      }
      return {
        update(payload) {
          return make('update', payload)
        },
        select(columns) {
          return make('select', null).select(columns)
        },
      }
    },
  }
  return { client, calls }
}

/** Responder that behaves like a quotation row carrying authority state. */
function authorityResponder(row) {
  return (record) => {
    if (record.op === 'update') return { data: null, error: null }
    if (record.filters.id) return { data: row ? [row] : [], error: null }
    // chain lookup (conversion_chain_id + feedback_authority not null)
    return { data: row && row.feedback_authority ? [{ id: row.id }] : [], error: null }
  }
}

// ── A-D: CPS → Quotation row identity ──────────────────────────────────────

test('A/B: CPS → Quotation persists the exact CPS document id and CPS row id', () => {
  const { payload, items } = mapCpsToQuotation(cpsSheet(), 'QTN-000001')

  assert.equal(payload.source_cps_id, CPS_ID)
  assert.equal(items.length, 1)
  assert.equal(items[0].source_cps_id, CPS_ID)
  assert.equal(items[0].source_cps_row_id, ROW_A)
  assert.equal(items[0].row_type, 'standard')
  assert.equal(items[0].source_quotation_id, null)
  assert.equal(items[0].source_quotation_item_id, null)
})

test('C: two CPS rows with identical descriptions remain distinguishable', () => {
  const { items } = mapCpsToQuotation(
    cpsSheet({
      table_rows: [cpsRow({ id: ROW_A }), cpsRow({ id: ROW_B, sort_order: 1 })],
    }),
    'QTN-000001',
  )

  assert.equal(items[0].description, items[1].description)
  assert.notEqual(items[0].source_cps_row_id, items[1].source_cps_row_id)
  assert.equal(items[0].source_cps_row_id, ROW_A)
  assert.equal(items[1].source_cps_row_id, ROW_B)
})

test('D: two CPS rows sharing a catalog item_id remain distinguishable', () => {
  const { items } = mapCpsToQuotation(
    cpsSheet({
      table_rows: [
        cpsRow({ id: ROW_A, item_id: 'CAT-1' }),
        cpsRow({ id: ROW_B, item_id: 'CAT-1', sort_order: 1 }),
      ],
    }),
    'QTN-000001',
  )

  assert.notEqual(items[0].source_cps_row_id, items[1].source_cps_row_id)
  assert.equal(items[0].source_cps_row_id, ROW_A)
  assert.equal(items[1].source_cps_row_id, ROW_B)
})

test('group/section rows carry document ancestry only, never item lineage', () => {
  const section = { row_type: 'section', id: ROW_B, group_id: ROW_B, section_title: 'Group A', sort_order: 0 }
  const { items } = mapCpsToQuotation(
    cpsSheet({ table_rows: [section, cpsRow({ id: ROW_A, group_id: ROW_B, sort_order: 1 })] }),
    'QTN-000001',
  )

  const header = items.find((item) => item.row_type === 'group_header')
  assert.ok(header)
  assert.equal(header.source_cps_id, CPS_ID)
  assert.equal(header.source_cps_row_id, null, 'a structural row must not claim item ancestry')

  const standard = items.find((item) => item.row_type === 'standard')
  assert.equal(standard.source_cps_row_id, ROW_A)
})

test('a converted row without a persisted row id is reported, never guessed', () => {
  const { items, lineage } = mapCpsToQuotation(
    cpsSheet({ table_rows: [cpsRow({ id: undefined, _uiKey: 'ui-only-1' })] }),
    'QTN-000001',
  )

  assert.equal(items[0].source_cps_row_id, null)
  assert.equal(items[0].source_cps_id, CPS_ID)
  assert.deepEqual(lineage.unlineagedRowLabels, ['Fuel Filter'])
  assert.equal(lineage.linkedRowCount, 0)
  assert.equal(lineage.summary, null)
  assert.match(lineage.unlineagedSummary, /Lineage unavailable for 1 converted item/)
})

test('conversion lineage summary reports the number of linked CPS items', () => {
  const { lineage } = mapCpsToQuotation(
    cpsSheet({ table_rows: [cpsRow({ id: ROW_A }), cpsRow({ id: ROW_B, sort_order: 1 })] }),
    'QTN-000001',
  )

  assert.equal(lineage.linkedRowCount, 2)
  assert.equal(lineage.summary, 'Row ancestry established for 2 CPS items.')
})

test('conversion commercial mapping is unchanged by lineage (SP → unit_price, no CP)', () => {
  const { items } = mapCpsToQuotation(cpsSheet(), 'QTN-000001')
  assert.equal(items[0].unit_price, 22000)
  assert.equal(items[0].amount, 44000)
  assert.doesNotMatch(items[0].custom_data, /cp|cost|margin/i)
})

// ── E: document-added rows ─────────────────────────────────────────────────

test('E: a row created directly in a document has no CPS lineage', () => {
  const item = makeEmptyItem()
  assert.equal(hasCpsLineage(item), false)
  assert.equal(hasAnyLineage(item), false)

  const row = toDbItem(item, QUOTATION_ID, 0)
  assert.equal(row.source_cps_id, null)
  assert.equal(row.source_cps_row_id, null)
  assert.equal(row.source_quotation_id, null)
  assert.equal(row.source_quotation_item_id, null)
})

test('K: an invoice-added row has no CPS lineage even when siblings do', async () => {
  const { client, calls } = createFakeTenantClient(() => ({ data: [{ id: 'x' }], error: null }))
  const result = await applyInvoiceItemLineage(client, INVOICE_ID, [
    { sort_order: 0, description: '', ...emptyLineage() },
    { sort_order: 1, description: '', ...emptyLineage() },
  ])

  assert.equal(result.applied, 0)
  assert.equal(result.skipped, 2)
  assert.equal(calls.length, 0, 'rows without lineage must not be written')
})

// ── F/G/H: save, reorder, grouping preservation ─────────────────────────────

test('F: mapping a stored quotation item and re-serializing it preserves lineage', () => {
  const stored = {
    id: QUOTATION_ITEM_ID,
    quotation_id: QUOTATION_ID,
    description: 'Fuel Filter',
    quantity: 2,
    unit_price: 22000,
    row_type: 'standard',
    sort_order: 0,
    custom_data: '{}',
    source_cps_id: CPS_ID,
    source_cps_row_id: ROW_A,
    source_quotation_id: null,
    source_quotation_item_id: null,
  }

  const item = mapDbQuotationItem(stored)
  assert.equal(item.source_cps_id, CPS_ID)
  assert.equal(item.source_cps_row_id, ROW_A)

  const row = toDbItem(item, QUOTATION_ID, 0)
  assert.equal(row.source_cps_id, CPS_ID)
  assert.equal(row.source_cps_row_id, ROW_A)
  assert.ok(sameLineage(row, stored))
})

test('G: quotation reordering preserves lineage per row identity', () => {
  const a = mapDbQuotationItem({
    id: 'r-a', description: 'A', row_type: 'standard', sort_order: 0, custom_data: '{}',
    source_cps_id: CPS_ID, source_cps_row_id: ROW_A,
  })
  const b = mapDbQuotationItem({
    id: 'r-b', description: 'B', row_type: 'standard', sort_order: 1, custom_data: '{}',
  })

  const reordered = [b, a].map((item, index) => ({ ...item, sort_order: index }))
  assert.equal(reordered[0].source_cps_id, null)
  assert.equal(reordered[1].source_cps_id, CPS_ID)
  assert.equal(reordered[1].source_cps_row_id, ROW_A)
})

test('H: quotation grouping moves an item without touching its lineage', () => {
  // The grouping normalizer rewrites row_type/group_id/group_name/sort_order
  // only. It must spread the row so system-owned lineage survives a group
  // change. (The module is not loadable in the node test sandbox, so the
  // contract is asserted on its source and on the shared serializer.)
  const source = read('src/components/quotation/quotationFormUtils.ts')
  const normalizer = source.slice(source.indexOf('export function normalizeQuotationGrouping'))
  assert.match(
    normalizer,
    /return \{\s*\.\.\.item,\s*row_type: 'standard' as const/,
    'grouping must spread the row, not rebuild a fixed field set',
  )
  assert.doesNotMatch(normalizer, /source_cps_row_id:/, 'grouping must not own lineage')

  const item = mapDbQuotationItem({
    id: 'r-a', description: 'A', row_type: 'standard', sort_order: 1, custom_data: '{}',
    source_cps_id: CPS_ID, source_cps_row_id: ROW_A,
  })
  const regrouped = {
    ...item,
    row_type: 'standard',
    group_id: 'sec-2',
    group_name: 'Group B',
    sort_order: 0,
  }

  assert.equal(regrouped.source_cps_id, CPS_ID)
  assert.equal(regrouped.source_cps_row_id, ROW_A)
  assert.equal(toDbItem(regrouped, QUOTATION_ID, 0).source_cps_row_id, ROW_A)
})

// ── I/J: Quotation → Invoice ancestry ───────────────────────────────────────

test('I/J: Invoice items carry CPS ancestry and Quotation item ancestry', () => {
  const quotationItem = mapDbQuotationItem({
    id: QUOTATION_ITEM_ID,
    description: 'Fuel Filter',
    row_type: 'standard',
    sort_order: 0,
    custom_data: '{}',
    source_cps_id: CPS_ID,
    source_cps_row_id: ROW_A,
  })

  const lineage = buildInvoiceItemLineage(QUOTATION_ID, quotationItem)
  assert.equal(lineage.source_cps_id, CPS_ID)
  assert.equal(lineage.source_cps_row_id, ROW_A)
  assert.equal(lineage.source_quotation_id, QUOTATION_ID)
  assert.equal(lineage.source_quotation_item_id, QUOTATION_ITEM_ID)

  const row = toDbItem({ ...quotationItem, ...lineage }, INVOICE_ID, 0)
  assert.equal(row.source_cps_row_id, ROW_A)
  assert.equal(row.source_quotation_item_id, QUOTATION_ITEM_ID)
})

test('a quotation-added row stays CPS-lineage-null in the Invoice', () => {
  const quotationItem = mapDbQuotationItem({
    id: QUOTATION_ITEM_ID,
    description: 'Added in quotation',
    row_type: 'standard',
    sort_order: 0,
    custom_data: '{}',
  })

  const lineage = buildInvoiceItemLineage(QUOTATION_ID, quotationItem)
  assert.equal(lineage.source_cps_id, null)
  assert.equal(lineage.source_cps_row_id, null)
  assert.equal(lineage.source_quotation_id, QUOTATION_ID)
  assert.equal(lineage.source_quotation_item_id, QUOTATION_ITEM_ID)
})

test('a group header converted to an Invoice row never claims CPS item ancestry', () => {
  const lineage = buildInvoiceItemLineage(QUOTATION_ID, {
    id: QUOTATION_ITEM_ID,
    row_type: 'group_header',
    source_cps_id: CPS_ID,
    source_cps_row_id: ROW_A,
  })

  assert.equal(lineage.source_cps_id, CPS_ID)
  assert.equal(lineage.source_cps_row_id, null)
})

// ── L: invoice save preservation ───────────────────────────────────────────

test('L: applying lineage stamps converted rows keyed by (invoice_id, sort_order)', async () => {
  const { client, calls } = createFakeTenantClient(() => ({ data: [{ id: 'row' }], error: null }))

  const result = await applyInvoiceItemLineage(client, INVOICE_ID, [
    { sort_order: 0, source_cps_id: CPS_ID, source_cps_row_id: ROW_A, source_quotation_id: QUOTATION_ID, source_quotation_item_id: QUOTATION_ITEM_ID },
    { sort_order: 1, source_cps_id: CPS_ID, source_cps_row_id: ROW_B, source_quotation_id: QUOTATION_ID, source_quotation_item_id: null },
    { sort_order: 2, source_cps_id: null, source_cps_row_id: null, source_quotation_id: null, source_quotation_item_id: null },
  ])

  assert.equal(result.applied, 2)
  assert.equal(result.skipped, 1)
  assert.deepEqual(result.failures, [])
  assert.equal(calls.length, 2)
  assert.equal(calls[0].table, 'invoice_items')
  assert.equal(calls[0].filters.invoice_id, INVOICE_ID)
  assert.equal(calls[0].filters.sort_order, 0)
  assert.equal(calls[0].payload.source_cps_row_id, ROW_A)
  assert.equal(calls[1].filters.sort_order, 1)
})

test('L: a lineage stamp that matches no row is reported, not silently accepted', async () => {
  const { client } = createFakeTenantClient(() => ({ data: [], error: null }))
  const result = await applyInvoiceItemLineage(client, INVOICE_ID, [
    { sort_order: 0, source_cps_id: CPS_ID, source_cps_row_id: ROW_A },
  ])

  assert.equal(result.applied, 0)
  assert.equal(result.failures.length, 1)
  assert.match(result.failures[0].reason, /No matching invoice item row/)
})

test('L: a database error during a lineage stamp is surfaced', async () => {
  const { client } = createFakeTenantClient(() => ({ data: null, error: { message: 'permission denied' } }))
  const result = await applyInvoiceItemLineage(client, INVOICE_ID, [
    { sort_order: 0, source_cps_id: CPS_ID, source_cps_row_id: ROW_A },
  ])

  assert.equal(result.failures.length, 1)
  assert.equal(result.failures[0].reason, 'permission denied')
})

test('L: ambiguous sort orders never decide ancestry', async () => {
  const { client, calls } = createFakeTenantClient(() => ({ data: [{ id: 'row' }], error: null }))
  const result = await applyInvoiceItemLineage(client, INVOICE_ID, [
    { sort_order: 0, source_cps_id: CPS_ID, source_cps_row_id: ROW_A },
    { sort_order: 0, source_cps_id: CPS_ID, source_cps_row_id: ROW_B },
  ])

  assert.equal(calls.length, 1)
  assert.equal(result.applied, 1)
  assert.equal(result.failures.length, 1)
  assert.match(result.failures[0].reason, /Duplicate sort order/)
})

test('L: a non-uuid row identity keeps document ancestry and drops the row id', async () => {
  const { client, calls } = createFakeTenantClient(() => ({ data: [{ id: 'row' }], error: null }))
  const result = await applyInvoiceItemLineage(client, INVOICE_ID, [
    { sort_order: 0, source_cps_id: CPS_ID, source_cps_row_id: 'ui-key-only' },
  ])

  assert.equal(result.applied, 1)
  assert.equal(calls[0].payload.source_cps_id, CPS_ID)
  assert.equal(calls[0].payload.source_cps_row_id, null, 'a UI key must never reach the database')

  const noLineageAtAll = await applyInvoiceItemLineage(client, INVOICE_ID, [
    { sort_order: 0, source_cps_id: 'ui-key-only', source_cps_row_id: 'ui-key-only' },
  ])
  assert.equal(noLineageAtAll.applied, 0)
  assert.equal(noLineageAtAll.skipped, 1)
})

// ── N: document lineage intact ──────────────────────────────────────────────

test('N: document-level source_cps_id survives the round trip', () => {
  const { payload } = mapCpsToQuotation(cpsSheet(), 'QTN-000001')
  assert.equal(payload.source_cps_id, CPS_ID)
  assert.match(payload.custom_fields, new RegExp(CPS_ID))
})

// ── O-T: authority model ────────────────────────────────────────────────────

test('O: the Quotation owns authority immediately after a CPS conversion', () => {
  const { payload } = mapCpsToQuotation(cpsSheet(), 'QTN-000001')
  assert.equal(payload.feedback_authority, 'quotation')
  assert.equal(payload.feedback_authority_document_id, null)

  const quotation = { ...payload, id: QUOTATION_ID }
  const authority = resolveActiveFeedbackAuthority(quotation)
  assert.deepEqual(authority, { stage: 'quotation', documentId: QUOTATION_ID })
  assert.equal(feedbackStageOwnsAuthority(quotation, 'quotation'), true)
  assert.equal(feedbackStageOwnsAuthority(quotation, 'invoice'), false)
})

test('P/Q: after the Quotation → Invoice handoff the Invoice owns authority and the Quotation does not', () => {
  const before = {
    id: QUOTATION_ID,
    source_cps_id: CPS_ID,
    feedback_authority: 'quotation',
    feedback_authority_document_id: QUOTATION_ID,
    updated_at: '2026-01-01T00:00:00Z',
  }

  const handoff = feedbackAuthorityUpdate('invoice', INVOICE_ID, '2026-10-05T10:00:00Z')
  const after = { ...before, ...handoff }

  assert.equal(resolveActiveFeedbackAuthority(after).stage, 'invoice')
  assert.equal(resolveActiveFeedbackAuthority(after).documentId, INVOICE_ID)
  assert.equal(feedbackStageOwnsAuthority(after, 'quotation'), false)
  assert.equal(feedbackStageOwnsAuthority(after, 'invoice'), true)
})

test('R: authority ignores edit recency and cannot be regained by editing the old Quotation', () => {
  const after = {
    id: QUOTATION_ID,
    source_cps_id: CPS_ID,
    ...feedbackAuthorityUpdate('invoice', INVOICE_ID, '2026-10-05T10:00:00Z'),
    // A later edit of the quotation touches updated_at only.
    updated_at: '2026-10-06T09:00:00Z',
  }

  assert.deepEqual(resolveActiveFeedbackAuthority(after), { stage: 'invoice', documentId: INVOICE_ID })
  assert.equal(resolveActiveFeedbackAuthority({ ...after, updated_at: null }).stage, 'invoice')
})

test('R: a chain with no persisted authority resolves to no authority', () => {
  assert.equal(resolveActiveFeedbackAuthority(null), null)
  assert.equal(resolveActiveFeedbackAuthority({ id: QUOTATION_ID }), null)
  assert.equal(resolveActiveFeedbackAuthority({ id: QUOTATION_ID, feedback_authority: 'weird' }), null)
})

test('S/T: the handoff is idempotent and a retried conversion cannot contradict itself', async () => {
  const row = {
    id: QUOTATION_ID,
    feedback_authority: 'quotation',
    feedback_authority_document_id: null,
  }
  const { client, calls } = createFakeTenantClient(authorityResponder(row))

  const first = await persistChainAuthority(client, {
    chainId: CHAIN_ID,
    quotationId: QUOTATION_ID,
    stage: 'invoice',
    documentId: INVOICE_ID,
  })
  const second = await persistChainAuthority(client, {
    chainId: CHAIN_ID,
    quotationId: QUOTATION_ID,
    stage: 'invoice',
    documentId: INVOICE_ID,
  })

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(first.authorityRowId, QUOTATION_ID)
  assert.equal(second.authorityRowId, QUOTATION_ID)
  assert.deepEqual(first.previous, { stage: 'quotation', documentId: null })

  const updates = calls.filter((call) => call.op === 'update')
  assert.equal(updates.length, 2)
  for (const call of updates) {
    assert.equal(call.table, 'quotations')
    assert.equal(call.filters.id, QUOTATION_ID)
    assert.equal(call.payload.feedback_authority, 'invoice')
    assert.equal(call.payload.feedback_authority_document_id, INVOICE_ID)
    assert.equal(call.payload.conversion_chain_id, CHAIN_ID)
  }
  assert.deepEqual(
    { ...updates[0].payload, feedback_authority_updated_at: null },
    { ...updates[1].payload, feedback_authority_updated_at: null },
  )
})

test('authority always targets the row that owns the chain, not the newest document', async () => {
  const row = {
    id: QUOTATION_ID,
    feedback_authority: 'invoice',
    feedback_authority_document_id: INVOICE_ID,
  }
  const { client, calls } = createFakeTenantClient(authorityResponder(row))

  // A revert inside the same chain: the reverted quotation is a new document,
  // but authority must stay on the chain's existing authority row.
  const result = await persistChainAuthority(client, {
    chainId: CHAIN_ID,
    quotationId: '55555555-5555-4555-8555-555555555555',
    stage: 'quotation',
    documentId: '55555555-5555-4555-8555-555555555555',
  })

  assert.equal(result.authorityRowId, QUOTATION_ID)
  assert.deepEqual(result.previous, { stage: 'invoice', documentId: INVOICE_ID })
  const update = calls.find((call) => call.op === 'update')
  assert.equal(update.filters.id, QUOTATION_ID)
  assert.equal(update.payload.feedback_authority, 'quotation')
})

test('authority uses an explicitly supplied row when the caller knows it', async () => {
  const { client, calls } = createFakeTenantClient(authorityResponder(null))
  const result = await persistChainAuthority(client, {
    chainId: null,
    quotationId: '66666666-6666-4666-8666-666666666666',
    authorityRowId: QUOTATION_ID,
    stage: 'quotation',
    documentId: '66666666-6666-4666-8666-666666666666',
  })

  assert.equal(result.ok, true)
  assert.equal(result.authorityRowId, QUOTATION_ID)
  assert.equal(calls.find((call) => call.op === 'update').filters.id, QUOTATION_ID)
})

test('S: a failed authority write is reported instead of claiming success', async () => {
  const { client } = createFakeTenantClient((record) =>
    record.op === 'update'
      ? { data: null, error: { message: 'permission denied' } }
      : { data: [{ id: QUOTATION_ID, feedback_authority: 'quotation' }], error: null },
  )
  const result = await persistChainAuthority(client, {
    chainId: CHAIN_ID,
    quotationId: QUOTATION_ID,
    stage: 'invoice',
    documentId: INVOICE_ID,
  })

  assert.equal(result.ok, false)
  assert.equal(result.error, 'permission denied')
})

test('S: a chain with no owner row reports failure instead of silently succeeding', async () => {
  const { client } = createFakeTenantClient(() => ({ data: [], error: null }))
  const result = await persistChainAuthority(client, {
    chainId: CHAIN_ID,
    quotationId: '',
    stage: 'invoice',
    documentId: INVOICE_ID,
  })

  assert.equal(result.ok, false)
  assert.match(result.error, /No quotation row owns downstream feedback authority/)
})

// ── U/V: audit events and Activity History ─────────────────────────────────

test('U: the handoff audit event is emitted with readable context', () => {
  const meta = buildCpsAuditMeta({
    event: 'CONVERTED_TO_INVOICE',
    rootId: CPS_ID,
    sourceContext: CPS_AUDIT_SOURCE.view,
    related: { type: 'invoice', id: INVOICE_ID, number: 'INV-000201' },
    summary: 'Quotation converted to Invoice',
    detail: authorityTransitionSummary('QTN-000432', 'INV-000201'),
  })

  assert.equal(meta.event, 'CONVERTED_TO_INVOICE')
  assert.equal(meta.rootId, CPS_ID)
  assert.equal(meta.parentEventId, null)
  assert.equal(meta.detail, 'Feedback authority moved: QTN-000432 → INV-000201')
})

test('V: the Activity History renders the handoff with numbers and a second line', () => {
  const meta = buildCpsAuditMeta({
    event: 'CONVERTED_TO_INVOICE',
    rootId: CPS_ID,
    sourceContext: CPS_AUDIT_SOURCE.view,
    related: { type: 'invoice', id: INVOICE_ID, number: 'INV-000201' },
    summary: 'Quotation converted to Invoice',
    detail: authorityTransitionSummary('QTN-000432', 'INV-000201'),
  })

  const [entry] = buildAuditTrailItems([
    {
      id: 'log-1',
      entity_type: 'cps_sheets',
      entity_id: CPS_ID,
      entity_label: 'CPS-000001',
      action: 'CONVERT',
      actor_label: 'amina@bigdrops.com',
      created_at: '2026-10-05T10:00:00Z',
      changes: [{ field: CPS_AUDIT_META_KEY, old: null, new: meta }],
    },
  ])

  assert.equal(entry.eventType, 'CONVERTED_TO_INVOICE')
  assert.equal(entry.relatedDocument.number, 'INV-000201')
  assert.equal(entry.actionLabel, 'Quotation converted to Invoice')
  assert.equal(entry.detail, 'Feedback authority moved: QTN-000432 → INV-000201')

  const component = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/cps/CpsActivityHistory.tsx'),
    'utf8',
  )
  assert.match(component, /entry\.detail/, 'Activity History must render the detail line')
})

test('U: a conversion lineage summary is rendered as the event second line', () => {
  const { lineage } = mapCpsToQuotation(
    cpsSheet({ table_rows: [cpsRow({ id: ROW_A }), cpsRow({ id: ROW_B, sort_order: 1 })] }),
    'QTN-000001',
  )
  const meta = buildCpsAuditMeta({
    event: 'CONVERTED_TO_QUOTATION',
    rootId: CPS_ID,
    sourceContext: CPS_AUDIT_SOURCE.view,
    related: { type: 'quotation', id: QUOTATION_ID, number: 'QTN-000432' },
    summary: 'Converted to QTN-000432',
    detail: lineage.summary,
  })

  const [entry] = buildAuditTrailItems([
    {
      id: 'log-2',
      entity_type: 'cps_sheets',
      entity_id: CPS_ID,
      action: 'CONVERT',
      actor_label: 'amina@bigdrops.com',
      created_at: '2026-10-05T10:00:00Z',
      changes: [{ field: CPS_AUDIT_META_KEY, old: null, new: meta }],
    },
  ])

  assert.equal(entry.actionLabel, 'Converted to QTN-000432')
  assert.equal(entry.detail, 'Row ancestry established for 2 CPS items.')
})

// ── W: legacy data ─────────────────────────────────────────────────────────

test('W: legacy rows without stored lineage stay lineage-null', () => {
  const legacyQuotationItem = mapDbQuotationItem({
    id: 'legacy-1',
    description: 'Old row',
    row_type: 'standard',
    sort_order: 0,
    custom_data: '{}',
  })
  const legacyInvoiceItem = mapDbInvoiceItem({
    id: 'legacy-2',
    description: 'Old row',
    row_type: 'standard',
    sort_order: 0,
    custom_data: '{}',
  })

  assert.equal(legacyQuotationItem.source_cps_id, null)
  assert.equal(legacyQuotationItem.source_cps_row_id, null)
  assert.equal(legacyInvoiceItem.source_cps_id, null)
  assert.equal(legacyInvoiceItem.source_quotation_id, null)
  assert.equal(hasAnyLineage(legacyQuotationItem), false)
})

// ── Duplicates must not inherit ancestry ───────────────────────────────────

test('a duplicated row cannot inherit another document’s ancestry', () => {
  const cloned = JSON.parse(
    JSON.stringify({
      description: 'Fuel Filter',
      source_cps_id: CPS_ID,
      source_cps_row_id: ROW_A,
      source_quotation_id: QUOTATION_ID,
      source_quotation_item_id: QUOTATION_ITEM_ID,
    }),
  )

  const stripped = withoutLineage(cloned)
  assert.equal(hasAnyLineage(stripped), false)
  assert.equal(stripped.description, 'Fuel Filter')
})

// ── Pure helper contracts ──────────────────────────────────────────────────

test('lineage normalisation rejects anything that is not a persisted uuid', () => {
  assert.equal(isPersistableLineageId(CPS_ID), true)
  assert.equal(isPersistableLineageId('ui-1'), false)
  assert.equal(isPersistableLineageId(''), false)
  assert.equal(isPersistableLineageId(null), false)
  assert.equal(isPersistableLineageId(42), false)
  assert.equal(normalizeLineageId(' ui-1 '), null)
  assert.equal(normalizeLineageId(` ${CPS_ID} `), CPS_ID)
})

test('a row without a persisted cps_rows id has no row lineage', () => {
  assert.equal(cpsRowLineageId({ id: ROW_A }), ROW_A)
  assert.equal(cpsRowLineageId({ id: '_uiKey-only' }), null)
  assert.equal(cpsRowLineageId({}), null)

  const lineage = buildCpsRowLineage(CPS_ID, { id: ROW_A, row_type: 'section' })
  assert.equal(lineage.source_cps_id, CPS_ID)
  assert.equal(lineage.source_cps_row_id, null)
})

test('lineage signatures are stable and order independent of display fields', () => {
  const a = { source_cps_id: CPS_ID, source_cps_row_id: ROW_A }
  const b = { source_cps_row_id: ROW_A, source_cps_id: CPS_ID }
  assert.equal(lineageSignature(a), lineageSignature(b))
  assert.equal(sameLineage(a, b), true)
  assert.equal(sameLineage(a, { source_cps_id: CPS_ID, source_cps_row_id: ROW_B }), false)
  assert.equal(LINEAGE_COLUMNS.length, 4)
})

test('lineage summary helpers are quiet when there is nothing to report', () => {
  assert.equal(summarizeQuotationLineage({ items: [] }), null)
  assert.equal(summarizeUnlineagedRows([]), null)
  assert.equal(summarizeUnlineagedRows(undefined), null)
  assert.equal(summarizeQuotationLineage({ items: [{ row_type: 'group_header', source_cps_row_id: null }] }), null)
})

// ── M/X/Y/Z: boundary guards (source inspection) ────────────────────────────

const root = process.cwd()
const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8')
/** Prose in comments may name the anti-patterns the code must avoid. */
const code = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

const DOWNSTREAM_FILES = [
  'src/domain/cps/lineage.ts',
  'src/domain/cps/lineageStore.ts',
  'src/domain/cps/conversion.ts',
  'src/pages/view-quotation-actions.ts',
  'src/hooks/useInvoiceSave.ts',
  'src/hooks/useQuotationSave.ts',
]

test('M: no heuristic row matching is introduced anywhere in the lineage path', () => {
  for (const file of DOWNSTREAM_FILES) {
    const source = code(file)
    assert.doesNotMatch(source, /fuzzy|levenshtein|similarity/i, `${file} must not fuzzy match`)
    assert.doesNotMatch(
      source,
      /source_cps_row_id\s*[:=]\s*[^,\n]*\bindex\b/,
      `${file} must not derive a CPS row id from a positional index`,
    )
    assert.doesNotMatch(
      source,
      /find\([^)]*=>\s*[^)]*description\s*===/,
      `${file} must not match rows by description`,
    )
  }
})

test('M: lineage is read from the persisted row id, not from an in-memory UI key', () => {
  const source = read('src/domain/cps/lineage.ts')
  const normalized = source.replace(/\s+/g, ' ')
  const cpsRowIdFn = normalized.slice(normalized.indexOf('export function cpsRowLineageId'))
  assert.match(cpsRowIdFn.slice(0, 220), /row\?\.id/)
  assert.doesNotMatch(cpsRowIdFn.slice(0, 220), /_uiKey/)
})

test('X/Y/Z: no downstream → CPS feedback is implemented', () => {
  for (const file of DOWNSTREAM_FILES) {
    const source = code(file)
    assert.doesNotMatch(
      source,
      /syncToCps|applyDownstreamFeedback|pushToCps|feedbackToCps|updateCpsFrom(Invoice|Quotation)/i,
      `${file} must not implement feedback`,
    )
    assert.doesNotMatch(source, /from\('cps_rows'\)\s*\.update/, `${file} must not mutate CPS rows`)
    assert.doesNotMatch(source, /from\('cps_sheets'\)\s*\.update/, `${file} must not mutate the CPS document`)
    assert.doesNotMatch(
      source,
      /update\(\{[^}]*\b(sp|cp|image_url)\s*:/,
      `${file} must not write CPS commercial fields`,
    )
  }

  // Phase 1's CPS view actions legitimately own CPS status/archive, but must
  // never consume downstream edits.
  const phaseOneCpsActions = code('src/pages/view-cps-actions.ts')
  assert.doesNotMatch(
    phaseOneCpsActions,
    /syncToCps|applyDownstreamFeedback|feedbackToCps|updateCpsFrom(Invoice|Quotation)/i,
  )
  assert.doesNotMatch(phaseOneCpsActions, /from\('cps_rows'\)\s*\.update/)
  assert.doesNotMatch(phaseOneCpsActions, /\.update\(\{[^}]*\b(sp|description|image_url)\b/)

  // The only new write in the quotation → invoice conversion is the authority
  // handoff on the source quotation.
  const authorityWrites = code('src/pages/view-quotation-actions.ts').match(/persistChainAuthority\(/g) || []
  assert.equal(authorityWrites.length, 1)
})

test('the lineage writers own CPS row identity; presentation does not', () => {
  const presentation = read('src/components/cps/CpsActivityHistory.tsx')
  assert.doesNotMatch(presentation, /source_cps_row_id|source_cps_id/)
  assert.doesNotMatch(presentation, /buildInvoiceItemLineage|buildCpsRowLineage/)
})

test('migration adds uniform item lineage plus persisted authority without FKs or backfill', () => {
  const migration = read('supabase/migrations/20261005130000_cps_row_lineage_and_authority.sql')

  for (const column of ['source_cps_id', 'source_cps_row_id', 'source_quotation_id', 'source_quotation_item_id']) {
    assert.match(migration, new RegExp(column), `migration must add ${column}`)
  }
  assert.match(migration, /feedback_authority/)
  assert.match(migration, /feedback_authority_document_id/)
  assert.match(migration, /feedback_authority_updated_at/)
  assert.match(migration, /quotations_feedback_authority_check/)
  assert.match(migration, /tenant_master_template/)
  assert.match(migration, /entity\\_%/)

  // Provenance must survive source deletion, and legacy rows must not be
  // guessed at.
  assert.doesNotMatch(migration, /\breferences\b/i, 'provenance must survive source deletion')
  assert.doesNotMatch(migration, /\bforeign key\b/i)
  assert.doesNotMatch(migration, /update\s+\S+\s+set\s+source_cps/i)
  assert.doesNotMatch(migration, /create table/i)
})

test('save paths preserve lineage without a post-write stamp', () => {
  const invoiceSave = code('src/hooks/useInvoiceSave.ts')
  assert.match(invoiceSave, /itemsToSave/)
  // Phase 2.5: lineage commits inside the invoice save transaction, so no
  // compensating stamp may run on the success path.
  assert.doesNotMatch(invoiceSave, /repairInvoiceItemLineage\(/)
  assert.doesNotMatch(invoiceSave, /applyInvoiceItemLineage\(/)

  const invoiceFactories = read('src/domain/invoice/factories.ts')
  assert.match(invoiceFactories, /source_cps_id: normalizeLineageId/)

  const quotationActions = code('src/pages/view-quotation-actions.ts')
  assert.doesNotMatch(quotationActions, /repairInvoiceItemLineage\(/)
  assert.match(quotationActions, /toDbItem\(item, null, index\)/)

  // A quotation edit re-inserts its rows through the shared serializer, which
  // carries lineage columns verbatim.
  const quotationUtils = read('src/components/quotation/quotationFormUtils.ts')
  assert.match(quotationUtils, /toDbItem\(item, quotationId, sortOrder\)/)
})

test('duplicate flows strip lineage so a clone cannot claim ancestry', () => {
  assert.match(read('src/pages/view-quotation-actions.ts'), /withoutLineage/)
  assert.match(read('src/modules/invoices/services/invoiceLifecycleService.ts'), /withoutLineage/)
})

test('interactive row editing mutates rows by spreading, so lineage survives', () => {
  const editors = [
    'src/components/quotation/useQuotationLineItems.ts',
    'src/hooks/useInvoiceEditableState.ts',
  ]

  for (const file of editors) {
    const source = code(file)
    // Every row mutation must preserve unknown fields.
    assert.match(source, /\{\s*\.\.\.item,\s*\.\.\.patch\s*\}/, `${file} must spread the row on patch`)
    assert.match(source, /\{\s*\.\.\.item,\s*sort_order:/, `${file} must spread the row on reorder`)
    // Only genuinely new rows are created from an empty item.
    assert.match(source, /makeEmptyItem\(\)/, `${file} still needs the empty-row factory`)
    assert.doesNotMatch(source, /source_cps_row_id\s*:/, `${file} must not own lineage`)
  }
})

test('extra charges normalisation is untouched by lineage work', () => {
  assert.deepEqual(normalizeExtraCharges([{ id: 'c1', label: 'Install', value: 100, withTax: true }]).length, 1)
})
