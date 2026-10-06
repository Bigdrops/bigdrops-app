import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  CPS_FEEDBACK_FIELDS,
  canonicalFeedbackImage,
  canonicalFeedbackPrice,
  canonicalFeedbackText,
  planCpsFeedback,
  resolveCpsFeedbackGate,
} from '@/domain/cps/feedback'
import {
  buildCpsFeedbackPayload,
  loadCpsFeedbackRows,
  prepareCpsFeedbackPayload,
  runCpsDownstreamFeedback,
} from '@/domain/cps/feedbackStore'
import { withoutLineage } from '@/domain/cps/lineage'
import {
  buildCpsAuditMeta,
  cpsAuditActionForEvent,
  CPS_AUDIT_SOURCE,
} from '@/domain/cps/auditDiff'
import { buildAuditTrailItems } from '@/domain/audit/auditFormatters'
import { CPS_AUDIT_META_KEY } from '@/domain/audit/auditTypes'

// ── Phase 3: controlled downstream item feedback ────────────────────────────
//
// Matrix A–K:
//   A  the quotation is the active authority
//   B  a non-authority save is refused
//   C  the invoice is the active authority
//   D  a revert returns authority to the quotation
//   E  lineage identity rules
//   F  image clear semantics
//   G  audit causality
//   H  idempotency
//   I  duplicates
//   J  tenant safety
//   K  one-way only (no forward sync, pure planner)

// ── Fixtures ───────────────────────────────────────────────────────────────

const CPS_ID = '11111111-1111-4111-8111-111111111111'
const CHAIN_ID = '99999999-9999-4999-8999-999999999999'
const OTHER_CHAIN_ID = '88888888-8888-4888-8888-888888888888'
const ROW_A = 'aaaaaaaa-1111-4111-8111-111111111111'
const ROW_B = 'bbbbbbbb-1111-4111-8111-111111111111'
const QUOTATION_ID = '22222222-2222-4222-8222-222222222222'
const INVOICE_ID = '33333333-3333-4333-8333-333333333333'
const ENTITY_ID = 'eeeeeeee-1111-4111-8111-111111111111'

const QUOTATION_AUTHORITY = { stage: 'quotation', documentId: QUOTATION_ID, chainId: CHAIN_ID }
const INVOICE_AUTHORITY = { stage: 'invoice', documentId: INVOICE_ID, chainId: CHAIN_ID }
const ACTOR = { id: null, label: 'amina@bigdrops.com' }

const RPC_MIGRATION =
  'supabase/migrations/20261005160000_tenant_rpc_cps_downstream_feedback.sql'

function itemRow(overrides = {}) {
  return {
    id: null,
    row_type: 'standard',
    description: 'Fuel Filter',
    unit_price: 22000,
    image_url: null,
    source_cps_id: CPS_ID,
    source_cps_row_id: ROW_A,
    ...overrides,
  }
}

function plan(overrides = {}) {
  return planCpsFeedback({
    sourceDocumentType: 'quotation',
    sourceDocumentId: QUOTATION_ID,
    sourceDocumentNumber: 'QTN-000432',
    chainId: CHAIN_ID,
    authority: QUOTATION_AUTHORITY,
    beforeRows: [itemRow()],
    afterRows: [itemRow()],
    ...overrides,
  })
}

/**
 * Minimal thenable PostgREST stand-in.
 *
 * Supports the read chain the chain-authority resolver and the item baseline
 * reader use, and records every call so an absence of work is provable.
 */
function createFakeTenantClient(options = {}) {
  const {
    items = [],
    authority = null,
    itemsError = null,
    rpcResult = { status: 'applied', applied: 1, skipped: 0 },
    rpcError = null,
  } = options
  const calls = []

  const client = {
    schemaName: 'entity_test',
    version: 'test',
    isReady: true,
    from(table) {
      const state = { table, filters: {}, notFilters: [], limit: null, order: null, select: null }
      calls.push(state)

      const resolve = () => {
        if (table === 'quotations') {
          const hasAuthority = Boolean(authority && authority.stage)
          return {
            data: hasAuthority
              ? [
                  {
                    feedback_authority: authority.stage,
                    feedback_authority_document_id: authority.documentId,
                  },
                ]
              : [],
            error: null,
          }
        }
        if (table === 'quotation_items' || table === 'invoice_items') {
          if (itemsError) return { data: null, error: itemsError }
          return { data: items, error: null }
        }
        return { data: [], error: null }
      }

      const builder = {
        eq(column, value) {
          state.filters[column] = value
          return builder
        },
        not(column, operator, value) {
          state.notFilters.push([column, operator, value])
          return builder
        },
        limit(value) {
          state.limit = value
          return builder
        },
        order(column) {
          state.order = column
          return builder
        },
        select(columns) {
          state.select = columns
          return builder
        },
        then(onFulfilled, onRejected) {
          return Promise.resolve().then(resolve).then(onFulfilled, onRejected)
        },
        catch(onRejected) {
          return Promise.resolve().then(resolve).catch(onRejected)
        },
      }
      return builder
    },
    rpc(fn, params) {
      calls.push({ rpc: fn, params })
      return Promise.resolve(rpcError ? { data: null, error: rpcError } : { data: [rpcResult], error: null })
    },
  }

  return { client, calls, rpcCalls: () => calls.filter((call) => call.rpc) }
}

function feedbackSave(overrides = {}) {
  return {
    entityId: ENTITY_ID,
    documentType: 'quotation',
    documentId: QUOTATION_ID,
    documentNumber: 'QTN-000432',
    chainId: CHAIN_ID,
    beforeRows: [itemRow()],
    afterRows: [itemRow()],
    actor: ACTOR,
    ...overrides,
  }
}

const root = process.cwd()
const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8')
const code = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

// ── A: the quotation is the active authority ───────────────────────────────

test('A1–A4: with the quotation active, exactly the approved fields feed back', () => {
  const result = plan({
    afterRows: [
      itemRow({
        description: 'Fuel Filter XL',
        unit_price: 25000,
        image_url: 'https://cdn.example/big.png',
      }),
    ],
  })

  assert.equal(result.ok, true)
  assert.equal(result.mutations.length, 1)

  const [mutation] = result.mutations
  assert.equal(mutation.sourceCpsId, CPS_ID)
  assert.equal(mutation.sourceCpsRowId, ROW_A)
  assert.equal(mutation.chainId, CHAIN_ID)
  assert.equal(mutation.sourceDocumentType, 'quotation')
  assert.equal(mutation.rowLabel, 'Fuel Filter XL')

  assert.deepEqual(
    mutation.changes.map((change) => change.cpsField),
    ['sp', 'description', 'image_url'],
  )
  assert.deepEqual(
    mutation.changes.map((change) => change.downstreamField),
    ['unit_price', 'description', 'image_url'],
  )

  assert.equal(mutation.changes[0].cpsNewValue, 25000)
  assert.equal(mutation.changes[0].label, 'Selling price')
  assert.equal(mutation.changes[0].kind, 'money')
  assert.equal(mutation.changes[1].kind, 'default')
  assert.equal(mutation.changes[2].kind, 'image')
  assert.equal(mutation.changes[2].cpsNewValue, 'https://cdn.example/big.png')

  // The contract is exactly three fields.
  assert.deepEqual([...CPS_FEEDBACK_FIELDS], ['sp', 'description', 'image_url'])
})

test('A5–A10: no other downstream field can move a CPS row', () => {
  const untouched = [
    { quantity: 7 },
    { unit: 'pcs' },
    { sub_description: 'Perkins' },
    { make: 'Perkins' },
    { make_brand: 'Perkins' },
    { specification: 'Perkins' },
    { cp: 1 },
    { cost_price: 1 },
    { notes: 'internal note' },
    { group_id: 'grp-1' },
    { group_name: 'Group 1' },
    { vat_rate: 7.5 },
    { discount_rate: 5 },
    { install_rate: 10 },
    {
      subtotal: 1,
      vat: 1,
      wht: 1,
      discount: 1,
      total: 1,
    },
  ]

  for (const patch of untouched) {
    const result = plan({ afterRows: [itemRow(patch)] })
    assert.equal(result.ok, true)
    assert.equal(
      result.mutations.length,
      0,
      `${JSON.stringify(patch)} must never feed back to CPS`,
    )
  }
})

test('A11: an equal value is not a change', () => {
  const result = plan({
    beforeRows: [itemRow({ unit_price: 22000, description: 'Fuel Filter ' })],
    afterRows: [itemRow({ unit_price: '22000.00', description: 'Fuel Filter' })],
  })
  assert.equal(result.mutations.length, 0)

  assert.equal(canonicalFeedbackPrice(''), canonicalFeedbackPrice(0))
  assert.equal(canonicalFeedbackPrice('25000.00'), 25000)
  assert.equal(canonicalFeedbackText('  x  '), 'x')
  assert.equal(canonicalFeedbackImage('   '), null)
})

// ── B: a non-authority save is refused ────────────────────────────────────

test('B12–B15: a save is refused unless it is the active authority of the chain', () => {
  // The invoice owns authority, so a quotation edit cannot feed back.
  assert.deepEqual(
    resolveCpsFeedbackGate({
      sourceDocumentType: 'quotation',
      sourceDocumentId: QUOTATION_ID,
      chainId: CHAIN_ID,
      authority: INVOICE_AUTHORITY,
    }),
    { allowed: false, reason: 'authority-mismatch' },
  )

  // Same stage, different document.
  assert.equal(
    plan({ authority: { ...QUOTATION_AUTHORITY, documentId: INVOICE_ID } }).reason,
    'authority-mismatch',
  )

  // No persisted authority at all.
  assert.equal(plan({ authority: null }).reason, 'authority-mismatch')

  // No conversion chain.
  assert.equal(plan({ chainId: null }).reason, 'no-chain')

  // No persisted document id.
  assert.equal(plan({ sourceDocumentId: null }).reason, 'invalid-source-document')

  // A different chain can never borrow this chain's authority.
  assert.equal(
    plan({ authority: { ...QUOTATION_AUTHORITY, chainId: OTHER_CHAIN_ID } }).reason,
    'authority-mismatch',
  )

  // A refused gate yields no mutation however the rows look.
  const refused = plan({ authority: INVOICE_AUTHORITY, afterRows: [itemRow({ unit_price: 99999 })] })
  assert.equal(refused.ok, false)
  assert.equal(refused.mutations.length, 0)
  assert.equal(refused.sourceCpsId, null)
})

// ── C: the invoice is the active authority ────────────────────────────────

test('C16–C20: with the invoice active, the same approved fields feed back from the invoice', () => {
  const result = plan({
    sourceDocumentType: 'invoice',
    sourceDocumentId: INVOICE_ID,
    sourceDocumentNumber: 'INV-000201',
    authority: INVOICE_AUTHORITY,
    beforeRows: [itemRow({ unit_price: 22000 })],
    afterRows: [itemRow({ unit_price: 26000, description: 'Fuel Filter (rev B)' })],
  })

  assert.equal(result.ok, true)
  assert.equal(result.mutations.length, 1)
  assert.equal(result.mutations[0].sourceDocumentType, 'invoice')
  assert.equal(result.mutations[0].sourceDocumentNumber, 'INV-000201')
  assert.equal(result.mutations[0].sourceDocumentId, INVOICE_ID)
  assert.equal(result.mutations[0].sourceCpsId, CPS_ID)
  assert.deepEqual(
    result.mutations[0].changes.map((change) => change.cpsField),
    ['sp', 'description'],
  )

  // The invoice never feeds back while the quotation still owns authority.
  assert.equal(
    plan({
      sourceDocumentType: 'invoice',
      sourceDocumentId: INVOICE_ID,
      authority: QUOTATION_AUTHORITY,
      afterRows: [itemRow({ unit_price: 1 })],
    }).ok,
    false,
  )
})

// ── D: a revert returns authority to the quotation ────────────────────────

test('D21–D22: after a revert the quotation feeds back again and the invoice stops', () => {
  const reverted = { stage: 'quotation', documentId: QUOTATION_ID, chainId: CHAIN_ID }

  const afterRevert = plan({ authority: reverted, afterRows: [itemRow({ unit_price: 30000 })] })
  assert.equal(afterRevert.ok, true)
  assert.equal(afterRevert.mutations.length, 1)
  assert.equal(afterRevert.mutations[0].changes[0].cpsNewValue, 30000)

  const invoiceAfterRevert = plan({
    sourceDocumentType: 'invoice',
    sourceDocumentId: INVOICE_ID,
    authority: reverted,
    afterRows: [itemRow({ unit_price: 30000 })],
  })
  assert.equal(invoiceAfterRevert.ok, false)
  assert.equal(invoiceAfterRevert.reason, 'authority-mismatch')
  assert.equal(invoiceAfterRevert.mutations.length, 0)
})

// ── E: lineage identity rules ─────────────────────────────────────────────

test('E23: a row added downstream never creates or retargets a CPS row', () => {
  const result = plan({
    beforeRows: [itemRow()],
    afterRows: [
      itemRow(),
      itemRow({ source_cps_row_id: ROW_B, description: 'Added in the quotation' }),
    ],
  })

  assert.equal(result.mutations.length, 0)
  assert.ok(
    result.skipped.some(
      (skip) => skip.reason === 'row-not-in-baseline' && skip.sourceCpsRowId === ROW_B,
    ),
    'a downstream-only row must be reported as outside the baseline',
  )
})

test('E24–E25: rows without a complete persisted lineage pair are never indexed', () => {
  const incomplete = [
    { source_cps_id: null },
    { source_cps_row_id: null },
    { source_cps_id: undefined, source_cps_row_id: undefined },
    { source_cps_id: 'not-a-uuid', source_cps_row_id: 'nope' },
    { source_cps_id: '', source_cps_row_id: '' },
    { source_cps_id: 'item_library_1', source_cps_row_id: 'row_1' },
  ]

  for (const patch of incomplete) {
    const result = plan({ beforeRows: [], afterRows: [itemRow(patch)] })
    assert.equal(result.mutations.length, 0, `${JSON.stringify(patch)} must not participate`)
    assert.equal(result.skipped.length, 0, `${JSON.stringify(patch)} must not even be indexed`)
    assert.equal(result.sourceCpsId, null)
  }

  // A row that DOES carry a full persisted pair is indexed, so it is reported.
  const indexed = plan({ beforeRows: [], afterRows: [itemRow({ source_cps_row_id: ROW_B })] })
  assert.equal(indexed.skipped.length, 1)
  assert.equal(indexed.skipped[0].reason, 'row-not-in-baseline')
})

test('E26: ambiguous lineage is refused, never guessed', () => {
  const changed = { unit_price: 25000 }

  const duplicatedAfter = plan({
    beforeRows: [itemRow({ id: 'a' })],
    afterRows: [itemRow({ id: 'a', ...changed }), itemRow({ id: 'b', ...changed })],
  })
  assert.equal(duplicatedAfter.mutations.length, 0)
  assert.equal(
    duplicatedAfter.skipped.filter((skip) => skip.reason === 'ambiguous-lineage').length,
    1,
  )

  const duplicatedBefore = plan({
    beforeRows: [itemRow({ id: 'a' }), itemRow({ id: 'b' })],
    afterRows: [itemRow({ id: 'a', ...changed })],
  })
  assert.equal(duplicatedBefore.mutations.length, 0)
  assert.equal(
    duplicatedBefore.skipped.filter((skip) => skip.reason === 'ambiguous-lineage').length,
    1,
  )
})

test('E27: section and group rows never participate', () => {
  for (const rowType of ['section', 'group_header']) {
    const result = plan({
      beforeRows: [itemRow({ row_type: rowType })],
      afterRows: [itemRow({ row_type: rowType, unit_price: 99999 })],
    })
    assert.equal(result.mutations.length, 0)
    assert.equal(result.skipped.length, 0)
  }

  // A standard row with the same lineage still does.
  assert.equal(plan({ afterRows: [itemRow({ unit_price: 23000 })] }).mutations.length, 1)
})

test('E28: each changed CPS row is targeted by its own persisted lineage', () => {
  const result = plan({
    beforeRows: [
      itemRow({ source_cps_row_id: ROW_A, unit_price: 1 }),
      itemRow({ source_cps_row_id: ROW_B, unit_price: 1 }),
    ],
    afterRows: [
      // Deliberately reordered: order and position are never identity.
      itemRow({ source_cps_row_id: ROW_B, unit_price: 2 }),
      itemRow({ source_cps_row_id: ROW_A, unit_price: 3 }),
    ],
  })

  assert.equal(result.mutations.length, 2)
  const byRow = Object.fromEntries(
    result.mutations.map((mutation) => [
      mutation.sourceCpsRowId,
      mutation.changes[0].cpsNewValue,
    ]),
  )
  assert.deepEqual(byRow, { [ROW_A]: 3, [ROW_B]: 2 })
})

// ── F: image clear semantics ──────────────────────────────────────────────

test('F29–F30: only an explicit image value can clear a CPS image', () => {
  const cleared = plan({
    beforeRows: [itemRow({ image_url: 'https://cdn.example/x.png' })],
    afterRows: [itemRow({ image_url: null })],
  })
  assert.equal(cleared.mutations.length, 1)
  assert.equal(cleared.mutations[0].changes[0].cpsField, 'image_url')
  assert.equal(cleared.mutations[0].changes[0].cpsNewValue, null)

  // Omitting the field is NOT a deletion: a payload that serializes nothing
  // must never wipe a CPS image.
  const omitted = { ...itemRow() }
  delete omitted.image_url
  const result = plan({
    beforeRows: [itemRow({ image_url: 'https://cdn.example/x.png' })],
    afterRows: [omitted],
  })
  assert.equal(result.mutations.length, 0)

  // Whitespace is not an image, so it is a clear.
  const blank = plan({
    beforeRows: [itemRow({ image_url: 'https://cdn.example/x.png' })],
    afterRows: [itemRow({ image_url: '   ' })],
  })
  assert.equal(blank.mutations.length, 1)
  assert.equal(blank.mutations[0].changes[0].cpsNewValue, null)
})

// ── G: audit causality ────────────────────────────────────────────────────

test('G31–G32: the audit labels and value kinds stay human-readable', () => {
  const result = plan({
    afterRows: [itemRow({ unit_price: 25000, description: 'Fuel Filter XL', image_url: 'i' })],
  })
  assert.deepEqual(
    result.mutations[0].changes.map((change) => [change.label, change.kind]),
    [
      ['Selling price', 'money'],
      ['Description', 'default'],
      ['Image', 'image'],
    ],
  )
})

test('G33–G34: the feedback events exist and map to an UPDATE action', () => {
  for (const event of ['DOWNSTREAM_ITEM_UPDATED', 'CPS_FEEDBACK_APPLIED', 'FEEDBACK_SKIPPED']) {
    assert.equal(cpsAuditActionForEvent(event), 'UPDATE')
  }
  assert.equal(CPS_AUDIT_SOURCE.downstreamFeedback, 'downstream_feedback')
})

test('G35: the Activity History shows a causal automatic feedback event', () => {
  const parent = buildCpsAuditMeta({
    event: 'DOWNSTREAM_ITEM_UPDATED',
    rootId: CPS_ID,
    chainId: CHAIN_ID,
    sourceContext: CPS_AUDIT_SOURCE.downstreamFeedback,
    related: { type: 'quotation', id: QUOTATION_ID, number: 'QTN-000432' },
    summary: 'Quotation item updated',
    detail: 'amina@bigdrops.com changed 1 approved field on 1 CPS-linked item.',
    changes: [
      {
        rowId: ROW_A,
        rowLabel: 'Fuel Filter',
        scope: 'row',
        field: 'sp',
        label: 'Selling price',
        old: 22000,
        new: 25000,
        kind: 'money',
      },
    ],
  })
  const feedback = buildCpsAuditMeta({
    event: 'CPS_FEEDBACK_APPLIED',
    actorType: 'automated-feedback',
    rootId: CPS_ID,
    chainId: CHAIN_ID,
    parentEventId: 'log-parent',
    sourceContext: CPS_AUDIT_SOURCE.downstreamFeedback,
    related: { type: 'quotation', id: QUOTATION_ID, number: 'QTN-000432' },
    summary: 'CPS updated automatically',
    detail: 'From Quotation QTN-000432 · amina@bigdrops.com',
    changes: [
      {
        rowId: ROW_A,
        rowLabel: 'Fuel Filter',
        scope: 'row',
        field: 'sp',
        label: 'Selling price',
        old: 22000,
        new: 25000,
        kind: 'money',
      },
    ],
  })

  // The parent event is the user's downstream edit and has no parent itself.
  assert.equal(parent.event, 'DOWNSTREAM_ITEM_UPDATED')
  assert.equal(parent.parentEventId, null)
  assert.equal(parent.summary, 'Quotation item updated')

  const [entry] = buildAuditTrailItems([
    {
      id: 'log-feedback',
      entity_type: 'cps_sheets',
      entity_id: CPS_ID,
      entity_label: 'CPS-000001',
      action: 'UPDATE',
      actor_label: 'Automated feedback',
      created_at: '2026-10-05T10:00:00Z',
      changes: [{ field: CPS_AUDIT_META_KEY, old: null, new: feedback }],
    },
  ])

  assert.equal(entry.eventType, 'CPS_FEEDBACK_APPLIED')
  assert.equal(entry.actorType, 'automated-feedback')
  assert.equal(entry.actorLabel, 'Automated feedback')
  assert.equal(entry.parentEventId, 'log-parent')
  assert.equal(entry.relatedDocument.number, 'QTN-000432')
  assert.equal(entry.detail, 'From Quotation QTN-000432 · amina@bigdrops.com')
})

test('G36–G37: the RPC writes the causal parent before the automatic consequence', () => {
  const migration = read(RPC_MIGRATION)

  const parentIndex = migration.indexOf("'event', 'DOWNSTREAM_ITEM_UPDATED'")
  const childIndex = migration.indexOf("'event', 'CPS_FEEDBACK_APPLIED'")
  assert.ok(parentIndex > 0, 'the parent event must be written')
  assert.ok(childIndex > parentIndex, 'the automatic event must be written after its parent')
  assert.match(migration, /RETURNING id INTO v_parent_id/)
  assert.match(migration, /'parentEventId', to_jsonb\(v_parent_id\)/)

  // The automatic event is a system event. The human actor is never falsified.
  assert.match(migration, /NULL, 'Automated feedback', 'web', 'app'/)
  assert.match(migration, /'actorType', 'automated-feedback'/)

  // A refused row is auditable instead of silent.
  assert.match(migration, /'event', 'FEEDBACK_SKIPPED'/)
  assert.match(migration, /array_to_string\(v_diagnostics, ' '\)/)
})

test('G38: the automatic event names the downstream document, not a raw id', () => {
  const migration = read(RPC_MIGRATION)
  assert.match(
    migration,
    /v_doc_label := CASE WHEN v_source_type = 'invoice' THEN 'Invoice' ELSE 'Quotation' END/,
  )
  assert.match(migration, /'From ' \|\| v_doc_label/)

  // The disclosure labels the context; a bare uuid is never the label.
  const component = code('src/components/cps/CpsActivityHistory.tsx')
  assert.match(component, /entry\.parentEventId/)
  assert.match(component, /data-actor=\{entry\.actorType \|\| 'user'\}/)
  assert.doesNotMatch(component, />\s*\{entry\.chainId\}\s*</)
  assert.doesNotMatch(component, />\s*\{entry\.parentEventId\}\s*</)
  assert.match(component, /title=\{entry\.parentEventId\}/)
})

// ── H: idempotency ────────────────────────────────────────────────────────

test('H39: an unchanged save opens no feedback transaction', async () => {
  const { client, rpcCalls } = createFakeTenantClient({
    items: [itemRow()],
    authority: QUOTATION_AUTHORITY,
  })

  const outcome = await runCpsDownstreamFeedback(client, feedbackSave())

  assert.equal(outcome.status, 'no-change')
  assert.equal(outcome.applied, 0)
  assert.equal(rpcCalls().length, 0, 'an unchanged save must not open a transaction')
})

test('H40: the payload builder refuses a plan with nothing to apply', () => {
  const empty = {
    ok: true,
    reason: null,
    chainId: CHAIN_ID,
    sourceDocumentType: 'quotation',
    sourceDocumentId: QUOTATION_ID,
    sourceDocumentNumber: null,
    sourceCpsId: CPS_ID,
    mutations: [],
    skipped: [],
  }
  assert.equal(buildCpsFeedbackPayload(empty, ACTOR), null)

  // A refused plan serializes to nothing, whatever it contains.
  assert.equal(buildCpsFeedbackPayload(plan({ authority: INVOICE_AUTHORITY }), ACTOR), null)
})

test('H41: the RPC is field-diff idempotent, so a repeat writes nothing twice', () => {
  const migration = read(RPC_MIGRATION)
  assert.match(migration, /Field-diff idempotency/)
  assert.match(migration, /IF v_mutation_applied = 0 THEN/)
  assert.match(migration, /v_cur_value = v_new_value THEN/)
  assert.match(migration, /UPDATE __SCHEMA__\.cps_rows/)
})

// ── I: duplicates ─────────────────────────────────────────────────────────

test('I42–I43: a duplicate strips lineage and can never feed back', () => {
  const duplicated = withoutLineage({ ...itemRow({ unit_price: 25000 }) })
  assert.equal('source_cps_id' in duplicated, false)

  const result = planCpsFeedback({
    sourceDocumentType: 'quotation',
    sourceDocumentId: QUOTATION_ID,
    chainId: CHAIN_ID,
    authority: QUOTATION_AUTHORITY,
    beforeRows: [duplicated],
    afterRows: [{ ...duplicated, unit_price: 99000 }],
  })
  assert.equal(result.mutations.length, 0)

  // Both duplicate entry points strip ancestry at the source.
  assert.match(code('src/pages/view-quotation-actions.ts'), /withoutLineage\(/)
  const lifecycle = code('src/modules/invoices/services/invoiceLifecycleService.ts')
  assert.match(lifecycle, /source_quotation_id: null/)
  assert.match(lifecycle, /conversion_chain_id: null/)
})

// ── J: tenant safety ──────────────────────────────────────────────────────

test('J44: feedback cannot cross a tenant or a document boundary', async () => {
  const migration = read(RPC_MIGRATION)

  // Every table is reached through the caller's own schema.
  assert.match(
    migration,
    /public\.has_entity_permission\(p_entity_id, auth\.uid\(\), v_source_type, 'edit'\)/,
  )
  for (const table of ['quotations', 'invoice_items', 'quotation_items', 'cps_rows', 'cps_sheets', 'invoices']) {
    assert.match(migration, new RegExp(`__SCHEMA__\\.${table}`))
  }

  // The CPS root is re-derived from the chain owner.
  assert.match(migration, /IF v_chain_cps_id IS NOT NULL THEN[\s\S]{0,40}?v_cps_id := v_chain_cps_id/)

  // A non-authority save calls no RPC at all.
  const blocked = createFakeTenantClient({ items: [itemRow()], authority: INVOICE_AUTHORITY })
  await runCpsDownstreamFeedback(blocked.client, feedbackSave())
  assert.equal(blocked.rpcCalls().length, 0)

  // The active save calls the tenant RPC with the caller's entity id and the
  // full plan, and nothing but the approved fields.
  const allowed = createFakeTenantClient({ items: [itemRow()], authority: QUOTATION_AUTHORITY })
  const outcome = await runCpsDownstreamFeedback(
    allowed.client,
    feedbackSave({
      beforeRows: [itemRow({ unit_price: 1 })],
      afterRows: [itemRow({ unit_price: 2 })],
    }),
  )

  assert.equal(outcome.status, 'applied')
  assert.equal(allowed.rpcCalls().length, 1)
  const [call] = allowed.rpcCalls()
  assert.equal(call.rpc, 'apply_cps_item_feedback_transaction')
  assert.equal(call.params.p_entity_id, ENTITY_ID)
  assert.equal(call.params.p_feedback.chainId, CHAIN_ID)
  assert.equal(call.params.p_feedback.sourceDocumentId, QUOTATION_ID)
  assert.equal(call.params.p_feedback.sourceCpsId, CPS_ID)
  assert.deepEqual(
    call.params.p_feedback.mutations[0].changes.map((change) => change.field),
    ['sp'],
  )
  assert.ok(!JSON.stringify(call.params.p_feedback).includes('"cp"'))
})

// ── K: one-way only ───────────────────────────────────────────────────────

test('K45: the planner is pure and never writes', () => {
  const planner = read('src/domain/cps/feedback.ts')
  assert.doesNotMatch(planner, /from '@\/lib\/tenantClient'|from '@\/supabase'/)
  assert.doesNotMatch(planner, /Math\.random|Date\.now|new Date\(/)
  assert.doesNotMatch(planner, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/)

  const store = code('src/domain/cps/feedbackStore.ts')
  assert.doesNotMatch(store, /\.insert\(|\.update\(|\.delete\(/)
  assert.match(store, /'apply_cps_item_feedback_transaction'/)
  // The audit module (and the browser client it reaches) loads lazily.
  assert.doesNotMatch(store, /import \{ resolveAuditActor \}/)
  assert.match(store, /await import\('@\/lib\/audit'\)/)
})

test('K46: nothing on the CPS side writes a downstream item row', () => {
  for (const file of [
    'src/domain/cps/feedback.ts',
    'src/domain/cps/feedbackStore.ts',
    'src/hooks/useInvoiceSave.ts',
    'src/hooks/useQuotationSave.ts',
  ]) {
    assert.doesNotMatch(
      code(file),
      /invoice_items'\)[\s\S]{0,80}?\.update\(|quotation_items'\)[\s\S]{0,80}?\.update\(/,
      `${file} must not rewrite downstream rows`,
    )
  }

  // The approved field list never names a cost price.
  assert.doesNotMatch(read(RPC_MIGRATION), /'cp'/)
})

// ── Failure reporting and wiring ──────────────────────────────────────────

test('a failed baseline read is loud, never an empty baseline', async () => {
  const { client } = createFakeTenantClient({ itemsError: { message: 'permission denied for table' } })
  await assert.rejects(
    () => loadCpsFeedbackRows(client, 'quotation', QUOTATION_ID),
    /permission denied/,
  )
})

test('a failed feedback transaction is reported, never as success', async () => {
  const { client } = createFakeTenantClient({
    items: [itemRow()],
    authority: QUOTATION_AUTHORITY,
    rpcError: { message: 'deadlock detected' },
  })

  const outcome = await runCpsDownstreamFeedback(
    client,
    feedbackSave({ beforeRows: [itemRow({ unit_price: 1 })], afterRows: [itemRow({ unit_price: 2 })] }),
  )

  assert.equal(outcome.status, 'failed')
  assert.equal(outcome.applied, 0)
  assert.match(outcome.error, /deadlock detected/)
})

test('an unexpected RPC status is a failure, not a silent success', async () => {
  const { client } = createFakeTenantClient({
    items: [itemRow()],
    authority: QUOTATION_AUTHORITY,
    rpcResult: { status: 'something-new' },
  })

  const outcome = await runCpsDownstreamFeedback(
    client,
    feedbackSave({ beforeRows: [itemRow({ unit_price: 1 })], afterRows: [itemRow({ unit_price: 2 })] }),
  )

  assert.equal(outcome.status, 'failed')
  assert.equal(outcome.applied, 0)
})

test('a document with no chain performs no read and no RPC', async () => {
  const { client, calls } = createFakeTenantClient({})

  const outcome = await runCpsDownstreamFeedback(
    client,
    feedbackSave({ chainId: null, beforeRows: [itemRow()], afterRows: [itemRow({ unit_price: 9 })] }),
  )

  assert.equal(outcome.status, 'not-applicable')
  assert.equal(calls.length, 0)
})

test('the Invoice path applies feedback inside the invoice save transaction', () => {
  const source = code('src/hooks/useInvoiceSave.ts')
  assert.match(source, /prepareCpsFeedbackPayload/)
  assert.match(source, /normalizeChainId\(input\.initialInvoiceSnapshot\?\.conversion_chain_id\)/)
  assert.match(source, /if \(!chainId\) return null/)
  assert.match(
    source,
    /rpc\('save_invoice_with_items_transaction'[\s\S]{0,400}?p_cps_feedback/,
  )

  const migration = read(RPC_MIGRATION)
  // The extra argument is defaulted, so every existing caller keeps working.
  assert.match(migration, /p_cps_feedback jsonb DEFAULT NULL::jsonb/)
  assert.match(
    migration,
    /IF p_cps_feedback IS NOT NULL THEN[\s\S]{0,120}?PERFORM __SCHEMA__\.apply_cps_item_feedback_transaction\(p_entity_id, p_cps_feedback\)/,
  )
  // The feedback runs before the saved invoice is read back and returned.
  assert.ok(
    migration.indexOf('apply_cps_item_feedback_transaction(p_entity_id, p_cps_feedback)') <
      migration.indexOf('-- Return saved invoice'),
    'feedback must commit inside the save transaction',
  )
})

// Phase 3.5 made the composite Quotation RPC the authoritative save path, so
// this now describes the ISOLATED COMPATIBILITY FALLBACK (no tenant entity id),
// not the normal path. The Phase 3.5 suite owns the composite transaction.
test('the Quotation compatibility fallback applies feedback after its rows persist and reports failure', () => {
  const source = code('src/hooks/useQuotationSave.ts')

  const baseline = source.indexOf("loadCpsFeedbackRows(tenantClient, 'quotation', effectiveId)")
  const deletes = source.indexOf("from('quotation_items').delete()")
  const inserts = source.indexOf("from('quotation_items').insert(")
  // The call site, not the import at the top of the module.
  const applies = source.indexOf('await runCpsDownstreamFeedback(')

  assert.ok(baseline > 0, 'the quotation path reads a baseline')
  assert.ok(deletes > baseline, 'the baseline is read before the rows are replaced')
  assert.ok(inserts > deletes, 'the rows are replaced')
  assert.ok(applies > inserts, 'feedback runs after the rows persist')

  // A failure is surfaced, never silent.
  assert.match(source, /status === 'failed'/)
  assert.match(source, /feedback\.warning\(/)
  // A quotation with no chain does no extra work.
  assert.match(source, /if \(isEdit && feedbackChainId\)/)
  assert.match(source, /entityId: entity\?\.id \?\? null/)
})

test('both paths plan from persisted state, not from editor state', () => {
  const store = code('src/domain/cps/feedbackStore.ts')
  // The baseline is a database read scoped to the document.
  assert.match(store, /\.eq\(documentColumnFor\(documentType\), id\)/)
  assert.match(store, /\.order\('sort_order'\)/)
  // Authority is resolved from persisted state only.
  assert.match(store, /readChainAuthority\(/)
  assert.doesNotMatch(store, /updated_at|created_at|sort_order\s*===|description\s*===/)
})
