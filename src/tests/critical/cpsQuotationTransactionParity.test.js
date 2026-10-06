import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { planCpsFeedback, CPS_FEEDBACK_FIELDS } from '@/domain/cps/feedback'
import {
  buildCpsFeedbackPayload,
  loadCpsFeedbackRows,
  prepareCpsFeedbackPayload,
  runCpsDownstreamFeedback,
} from '@/domain/cps/feedbackStore'
import { withoutLineage } from '@/domain/cps/lineage'

// ── Phase 3.5: transactional Quotation feedback parity ─────────────────────
//
// Matrix:
//   A  the composite transaction            (1–5)
//   B  approved feedback                    (6–12)
//   C  authority                            (13–15)
//   D  lineage                              (16–20)
//   E  audit causality                      (21–25)
//   F  idempotency                          (26–27)
//   G  normal Quotation                     (28–30)
//   H  tenant installer                     (31–33)
//   I  no regression                        (34–37)

const CPS_ID = '11111111-1111-4111-8111-111111111111'
const CHAIN_ID = '99999999-9999-4999-8999-999999999999'
const ROW_A = 'aaaaaaaa-1111-4111-8111-111111111111'
const ROW_B = 'bbbbbbbb-1111-4111-8111-111111111111'
const QUOTATION_ID = '22222222-2222-4222-8222-222222222222'
const INVOICE_ID = '33333333-3333-4333-8333-333333333333'
const ENTITY_ID = 'eeeeeeee-1111-4111-8111-111111111111'

const PHASE3_MIGRATION =
  'supabase/migrations/20261005160000_tenant_rpc_cps_downstream_feedback.sql'
const PHASE35_MIGRATION =
  'supabase/migrations/20261006120000_tenant_rpc_cps_quotation_transaction.sql'

const QUOTATION_AUTHORITY = { stage: 'quotation', documentId: QUOTATION_ID, chainId: CHAIN_ID }
const INVOICE_AUTHORITY = { stage: 'invoice', documentId: INVOICE_ID, chainId: CHAIN_ID }
const ACTOR = { id: null, label: 'amina@bigdrops.com' }

const HOOK = 'src/hooks/useQuotationSave.ts'
const TX = 'src/domain/quotation/quotationSaveTransaction.ts'

const root = process.cwd()
const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8')
const code = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

/**
 * Extract one installed RPC body from a migration.
 *
 * The dollar-quote tag appears twice per function: as the opener on the
 * `AS $function$` line and as the terminator after `END;`. The body is what
 * sits between them.
 */
const FUNCTION_TAG = '$function$'

function rpcBody(migration, name) {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION __SCHEMA__.${name}`)
  assert.ok(start > 0, `${name} must be installed`)
  const opener = migration.indexOf(FUNCTION_TAG, start)
  assert.ok(opener > start, `${name} must have an opener`)
  const end = migration.indexOf(FUNCTION_TAG, opener + FUNCTION_TAG.length)
  assert.ok(end > opener, `${name} must have a terminator`)
  return migration.slice(start, end)
}

/** The Phase 3.5 composite Quotation RPC body. */
function quotationRpc() {
  return rpcBody(read(PHASE35_MIGRATION), 'save_quotation_with_items_transaction')
}

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

function createFakeTenantClient(options = {}) {
  const { items = [], authority = null, itemsError = null } = options
  const calls = []
  const client = {
    schemaName: 'entity_test',
    version: 'test',
    isReady: true,
    from(table) {
      const state = { table, filters: {}, notFilters: [], limit: null }
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
        order() {
          return builder
        },
        select() {
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
    rpc() {
      throw new Error('this test client must not be used for writes')
    },
  }
  return { client, calls }
}

function feedbackInput(overrides = {}) {
  return {
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

// ── A: the composite transaction ──────────────────────────────────────────

test('A1–A2: one RPC persists the Quotation parent, its items and the feedback', () => {
  const hook = code(HOOK)
  const transaction = code(TX)

  // The hook delegates the whole save to the domain transaction module.
  assert.match(hook, /persistQuotationTransaction\(\{/)
  // Create and update both go through the one composite RPC.
  assert.equal(transaction.split("rpc('save_quotation_with_items_transaction'").length - 1, 2)
  assert.match(transaction, /p_quotation_payload: input\.payload/)
  assert.match(transaction, /p_items: items/)

  const body = quotationRpc()
  // The parent statement precedes the item loop, which precedes the feedback.
  const createInsert = body.indexOf('INSERT INTO %I.quotations')
  const updateStatement = body.indexOf('UPDATE %I.quotations')
  const itemLoop = body.indexOf('FOR v_item IN')
  const itemsInsert = body.indexOf('INSERT INTO %I.quotation_items')
  const feedback = body.indexOf('PERFORM __SCHEMA__.apply_cps_item_feedback_transaction(')
  const returnStatement = body.indexOf('RETURN jsonb_build_object(')

  assert.ok(createInsert > 0 && updateStatement > createInsert, 'the parent is persisted')
  assert.ok(itemLoop > updateStatement && itemsInsert > itemLoop, 'the items are persisted')
  assert.ok(feedback > itemsInsert, 'feedback runs after the items exist')
  assert.ok(returnStatement > feedback, 'the result is returned last')
})

test('A3–A4: a failure in any step rolls the whole Quotation save back', () => {
  const body = quotationRpc()
  // An unhandled exception inside a single function call aborts the transaction,
  // so there is deliberately no EXCEPTION handler that could swallow it.
  assert.doesNotMatch(body, /EXCEPTION\s+WHEN/)
  assert.doesNotMatch(body, /BEGIN\s+[\s\S]{0,80}?EXCEPTION/)
  // The feedback call is not guarded by a status check: a failure must raise.
  const feedback = body.indexOf('PERFORM __SCHEMA__.apply_cps_item_feedback_transaction(')
  const guard = body.slice(feedback - 200, feedback)
  assert.match(guard, /IF p_cps_feedback IS NOT NULL THEN/)
  assert.doesNotMatch(guard, /EXCEPTION|raise notice/i)
})

test('A5: the hook does not run a second feedback call after a composite save', () => {
  const hook = code('src/hooks/useQuotationSave.ts')
  // afterSave writes items and feedback only on the compatibility branch.
  assert.match(hook, /const compositePersisted = _quotationPersistMode === 'rpc'/)
  assert.match(hook, /if \(!compositePersisted\) \{/)
  assert.match(hook, /if \(!compositePersisted\) \{[\s\S]{0,2600}?runCpsDownstreamFeedback/)
  // Exactly one call site exists in the whole hook, and it is not reachable
  // when the composite transaction persisted the save.
  assert.equal(hook.split('runCpsDownstreamFeedback(tenantClient').length - 1, 1)
  const branch = hook.indexOf('if (!compositePersisted) {')
  const call = hook.indexOf('runCpsDownstreamFeedback(tenantClient')
  assert.ok(branch > 0 && call > branch, 'the only feedback call sits inside the fallback')
})

test('A1: feedback is planned before the transaction and passed inside it', () => {
  const transaction = code(TX)
  const plan = transaction.indexOf('const p_cps_feedback = await planQuotationFeedback(input, items)')
  const updateCall = transaction.indexOf("p_mode: 'update'")
  assert.ok(plan > 0, 'the update path plans the feedback')
  assert.ok(updateCall > plan, 'the plan is computed before the transaction opens')
  assert.match(transaction, /p_quotation_payload: input\.payload/)
  assert.match(transaction, /p_items: items/)
  assert.match(transaction, /p_mode: 'create'/)
  assert.match(transaction, /p_mode: 'update'/)
  // The plan is serialized before the RPC, never inside the SQL.
  assert.ok(
    transaction.indexOf('await planQuotationFeedback') <
      transaction.indexOf("p_mode: 'update'"),
  )
})

// ── B: approved feedback ──────────────────────────────────────────────────

test('B6–B8: the composite path carries the same three approved fields', () => {
  const result = planCpsFeedback({
    sourceDocumentType: 'quotation',
    sourceDocumentId: QUOTATION_ID,
    chainId: CHAIN_ID,
    authority: QUOTATION_AUTHORITY,
    beforeRows: [itemRow()],
    afterRows: [
      itemRow({
        unit_price: 25000,
        description: 'Fuel Filter XL',
        image_url: 'https://cdn.example/x.png',
      }),
    ],
  })

  assert.equal(result.ok, true)
  assert.deepEqual(
    result.mutations[0].changes.map((change) => change.cpsField),
    ['sp', 'description', 'image_url'],
  )
  // Feedback is planned for the Quotation document type.
  assert.equal(result.mutations[0].sourceDocumentType, 'quotation')
  assert.equal(result.mutations[0].sourceDocumentId, QUOTATION_ID)
})

test('B9–B12: cp, quantity, unit and make still cannot feed back', () => {
  for (const patch of [{ cp: 1 }, { quantity: 7 }, { unit: 'pcs' }, { make: 'Perkins' }]) {
    const result = planCpsFeedback({
      sourceDocumentType: 'quotation',
      sourceDocumentId: QUOTATION_ID,
      chainId: CHAIN_ID,
      authority: QUOTATION_AUTHORITY,
      beforeRows: [itemRow()],
      afterRows: [itemRow(patch)],
    })
    assert.equal(result.mutations.length, 0, `${JSON.stringify(patch)} must not feed back`)
  }

  const body = quotationRpc()
  // The composite RPC adds no new CPS field of its own.
  assert.doesNotMatch(body, /'cp'/)
  assert.doesNotMatch(body, /UPDATE %I.cps_rows/)
  assert.deepEqual([...CPS_FEEDBACK_FIELDS], ['sp', 'description', 'image_url'])
})

test('B6–B8: the composite RPC reuses the shared feedback helper, not a copy', () => {
  const body = quotationRpc()
  assert.match(body, /PERFORM __SCHEMA__\.apply_cps_item_feedback_transaction\(p_entity_id, p_cps_feedback\)/)

  const migration = read(PHASE35_MIGRATION)
  const helper = rpcBody(migration, 'apply_cps_item_feedback_transaction')
  // The approved-field contract lives in exactly one implementation.
  assert.equal(migration.split("IF v_field NOT IN ('sp', 'description', 'image_url') THEN").length - 1, 1)
  assert.match(helper, /UPDATE __SCHEMA__\.cps_rows/)
  assert.match(helper, /SET description = v_new_description,/)
})

// ── C: authority ──────────────────────────────────────────────────────────

test('C13–C15: the active authority decides whether feedback is sent at all', async () => {
  // 13 — the active Quotation produces a plan.
  const active = createFakeTenantClient({ items: [itemRow()], authority: QUOTATION_AUTHORITY })
  const activePlan = await prepareCpsFeedbackPayload(
    active.client,
    feedbackInput({ beforeRows: [itemRow({ unit_price: 1 })], afterRows: [itemRow({ unit_price: 2 })] }),
  )
  assert.equal(activePlan.allowed, true)
  assert.ok(activePlan.payload, 'an active Quotation sends a plan')

  // 14 — after the Invoice handoff the save still succeeds but sends nothing.
  const inactive = createFakeTenantClient({ items: [itemRow()], authority: INVOICE_AUTHORITY })
  const inactivePlan = await prepareCpsFeedbackPayload(
    inactive.client,
    feedbackInput({ beforeRows: [itemRow({ unit_price: 1 })], afterRows: [itemRow({ unit_price: 2 })] }),
  )
  assert.equal(inactivePlan.allowed, false)
  assert.equal(inactivePlan.payload, null)

  // 15 — a reverted Quotation owns authority again.
  const reverted = createFakeTenantClient({ items: [itemRow()], authority: QUOTATION_AUTHORITY })
  const revertedPlan = await prepareCpsFeedbackPayload(
    reverted.client,
    feedbackInput({ beforeRows: [itemRow({ unit_price: 1 })], afterRows: [itemRow({ unit_price: 9 })] }),
  )
  assert.equal(revertedPlan.allowed, true)
  assert.equal(revertedPlan.payload.mutations.length, 1)
})

test('C14: an inactive Quotation save omits the feedback argument entirely', () => {
  // The plan is only spread in when it exists, so an inactive or non-CPS
  // Quotation calls the RPC with no feedback argument at all.
  assert.match(code(TX), /\.\.\.\(p_cps_feedback \? \{ p_cps_feedback \} : \{\}\)/)
})

// ── D: lineage ────────────────────────────────────────────────────────────

test('D16: the SQL lineage gate requires the exact persisted pair', () => {
  // Comments describe what is NOT used, so compare against the statement text.
  const helperSql = rpcBody(read(PHASE35_MIGRATION), 'apply_cps_item_feedback_transaction')
    .replace(/--[^\n]*/g, '')

  assert.match(helperSql, /it\.quotation_id = v_source_doc_id/)
  assert.match(helperSql, /it\.source_cps_id = v_cps_id/)
  assert.match(helperSql, /it\.source_cps_row_id = v_cps_row_id/)

  // No heuristic fallback, ever: the lineage lookup reads no other item column
  // and no fuzzy comparison exists.
  assert.doesNotMatch(
    helperSql,
    /it\.(description|sub_description|make|item_id|sort_order|unit_price|quantity|unit|image_url|group_id|group_name|amount|vat_rate|discount_rate)/,
  )
  assert.doesNotMatch(helperSql, /similarity|ILIKE|LIKE\s*'/i)
})

test('D17–D19: lineage-null, added and ambiguous rows never feed back', () => {
  const plan = (beforeRows, afterRows) =>
    planCpsFeedback({
      sourceDocumentType: 'quotation',
      sourceDocumentId: QUOTATION_ID,
      chainId: CHAIN_ID,
      authority: QUOTATION_AUTHORITY,
      beforeRows,
      afterRows,
    })

  // 17 — a row with no lineage is not even indexed.
  assert.equal(plan([], [itemRow({ source_cps_id: null, unit_price: 9 })]).mutations.length, 0)

  // 18 — a row added downstream never creates a CPS row.
  const added = plan([itemRow()], [itemRow(), itemRow({ source_cps_row_id: ROW_B, unit_price: 9 })])
  assert.equal(added.mutations.length, 0)
  assert.ok(added.skipped.some((skip) => skip.reason === 'row-not-in-baseline'))

  // 19 — ambiguous lineage is refused, never guessed.
  const ambiguous = plan(
    [itemRow({ id: 'a' })],
    [itemRow({ id: 'a', unit_price: 9 }), itemRow({ id: 'b', unit_price: 9 })],
  )
  assert.equal(ambiguous.mutations.length, 0)
  assert.ok(ambiguous.skipped.some((skip) => skip.reason === 'ambiguous-lineage'))
})

test('D20: a missing origin is auditable and never recreated', () => {
  const helper = rpcBody(read(PHASE35_MIGRATION), 'apply_cps_item_feedback_transaction')
  assert.match(helper, /Originating CPS row unavailable for/)
  assert.match(helper, /'event', 'FEEDBACK_SKIPPED'/)
  // The helper only ever updates an existing row.
  assert.doesNotMatch(helper, /INSERT INTO __SCHEMA__\.cps_rows/)
  assert.doesNotMatch(helper, /DELETE FROM __SCHEMA__\.cps_rows/)
})

// ── E: audit causality ────────────────────────────────────────────────────

test('E21–E24: the causal pair is written inside the same transaction', () => {
  const body = quotationRpc()
  // The helper is invoked inside the composite transaction, so both events
  // commit with the Quotation.
  assert.match(body, /PERFORM __SCHEMA__\.apply_cps_item_feedback_transaction\(p_entity_id, p_cps_feedback\)/)

  const helper = rpcBody(read(PHASE35_MIGRATION), 'apply_cps_item_feedback_transaction')
  const parent = helper.indexOf("'event', 'DOWNSTREAM_ITEM_UPDATED'")
  const child = helper.indexOf("'event', 'CPS_FEEDBACK_APPLIED'")
  assert.ok(parent > 0 && child > parent, 'the parent event is written first')
  assert.match(helper, /RETURNING id INTO v_parent_id/)
  assert.match(helper, /'parentEventId', to_jsonb\(v_parent_id\)/)
  assert.match(helper, /'chainId', v_chain_id/)
  assert.match(helper, /'actorType', 'automated-feedback'/)
})

test('E25: FEEDBACK_SKIPPED remains supported inside the transaction', () => {
  const helper = rpcBody(read(PHASE35_MIGRATION), 'apply_cps_item_feedback_transaction')
  assert.match(helper, /'event', 'FEEDBACK_SKIPPED'/)
  assert.match(helper, /array_to_string\(v_diagnostics, ' '\)/)
})

test('E11: the causal audit is not duplicated after the save', () => {
  const hook = code('src/hooks/useQuotationSave.ts')
  // Only the pre-existing document audit runs in afterSave. No CPS feedback
  // event is written outside the transaction.
  assert.doesNotMatch(hook, /recordCpsAuditEvent/)
  assert.doesNotMatch(hook, /DOWNSTREAM_ITEM_UPDATED|CPS_FEEDBACK_APPLIED/)
  assert.match(hook, /recordAuditLog/)
})

// ── F: idempotency ────────────────────────────────────────────────────────

test('F26: an unchanged save sends no feedback payload', async () => {
  const { client } = createFakeTenantClient({ items: [itemRow()], authority: QUOTATION_AUTHORITY })
  const prepared = await prepareCpsFeedbackPayload(client, feedbackInput())
  assert.equal(prepared.allowed, true)
  assert.equal(prepared.payload, null)
  assert.equal(buildCpsFeedbackPayload(
    planCpsFeedback({
      sourceDocumentType: 'quotation',
      sourceDocumentId: QUOTATION_ID,
      chainId: CHAIN_ID,
      authority: QUOTATION_AUTHORITY,
      beforeRows: [itemRow()],
      afterRows: [itemRow()],
    }),
    ACTOR,
  ), null)
})

test('F27: a repeated identical save writes no new CPS event', () => {
  const helper = rpcBody(read(PHASE35_MIGRATION), 'apply_cps_item_feedback_transaction')
  assert.match(helper, /Field-diff idempotency/)
  assert.match(helper, /IF v_mutation_applied = 0 THEN/)
  const body = quotationRpc()
  // The composite RPC performs no field comparison of its own; the helper owns it.
  assert.equal(body.split('v_cur_value = v_new_value').length - 1, 0)
})

// ── G: normal Quotation ───────────────────────────────────────────────────

test('G28–G30: a Quotation with no chain does no CPS work at all', async () => {
  const { client, calls } = createFakeTenantClient({})
  const prepared = await prepareCpsFeedbackPayload(client, feedbackInput({ chainId: null }))
  assert.equal(prepared.allowed, false)
  assert.equal(prepared.payload, null)
  assert.equal(calls.length, 0, 'no chain means no read at all')

  const transaction = code(TX)
  // The planner short-circuits before any baseline read.
  assert.match(
    transaction,
    /const chainId = normalizeChainId\(input\.initialQuotationSnapshot\?\.conversion_chain_id\)/,
  )
  assert.match(transaction, /if \(!chainId\) return null/)
  assert.ok(
    transaction.indexOf('if (!chainId) return null') <
      transaction.indexOf('loadCpsFeedbackRows('),
    'the chain check precedes the baseline read',
  )
})

test('G29: a duplicated Quotation carries no lineage and never feeds back', () => {
  const duplicated = withoutLineage({ ...itemRow({ unit_price: 25000 }) })
  const result = planCpsFeedback({
    sourceDocumentType: 'quotation',
    sourceDocumentId: QUOTATION_ID,
    chainId: CHAIN_ID,
    authority: QUOTATION_AUTHORITY,
    beforeRows: [duplicated],
    afterRows: [{ ...duplicated, unit_price: 99000 }],
  })
  assert.equal(result.mutations.length, 0)
  assert.match(code('src/pages/view-quotation-actions.ts'), /withoutLineage\(/)
})

test('G28: the composite RPC still persists an ordinary Quotation', () => {
  const body = quotationRpc()
  assert.match(body, /INSERT INTO %I.quotations/)
  assert.match(body, /UPDATE %I.quotations/)
  assert.match(body, /'items_saved', v_count/)
  assert.match(body, /'quotation', v_row/)
  // The feedback argument is optional, so an ordinary Quotation keeps working.
  assert.match(body, /p_cps_feedback jsonb DEFAULT NULL::jsonb/)
})

test('G28: a non-CPS Quotation needs no special case in the save path', () => {
  const transaction = code(TX)
  // Create and update each have exactly one RPC call site, and neither is
  // branched on CPS ancestry.
  assert.equal(transaction.split("rpc('save_quotation_with_items_transaction'").length - 1, 2)
  assert.doesNotMatch(transaction, /isCpsDerived|isCpsQuotation|sourceChainExists/)
  // The only ancestry test is the chain check inside the feedback planner.
  assert.equal(transaction.split('conversion_chain_id').length - 1, 1)
})

// ── H: tenant installer ───────────────────────────────────────────────────

test('H31: the installer ships the composite Quotation RPC to future tenants', () => {
  const migration = read(PHASE35_MIGRATION)
  const installerStart = migration.indexOf(
    'CREATE OR REPLACE FUNCTION public._prov_install_tenant_rpcs(p_schema_name text)',
  )
  const installerEnd = migration.indexOf('$install$;', installerStart)
  assert.ok(installerStart > 0 && installerEnd > installerStart)

  const installer = migration.slice(installerStart, installerEnd)
  assert.match(installer, /__SCHEMA__\.save_quotation_with_items_transaction/)
  assert.match(installer, /__SCHEMA__\.save_invoice_with_items_transaction/)
  assert.match(installer, /__SCHEMA__\.apply_cps_item_feedback_transaction/)
  // The generator guards stay wired.
  assert.match(read('scripts/gen-cps-phase35-tenant-rpcs.cjs'), /ANCHOR MISSING/)
  assert.match(read('scripts/gen-cps-phase35-tenant-rpcs.cjs'), /ANCHOR NOT UNIQUE/)
})

test('H32–H33: the backfill targets provisioned schemas only', () => {
  const migration = read(PHASE35_MIGRATION)
  const backfill = migration.slice(migration.indexOf('DO $do$', migration.indexOf('BACKFILL')))
  for (const table of [
    'activity_events',
    'audit_logs',
    'invoices',
    'invoice_items',
    'quotations',
    'quotation_items',
    'cps_sheets',
    'cps_rows',
  ]) {
    assert.match(backfill, new RegExp(`to_regclass\\(format\\('%I\\.${table}'`))
  }
  assert.match(backfill, /PERFORM public\._prov_install_tenant_rpcs\(v_schema\.schemaname\)/)
  assert.match(migration, /NOTIFY pgrst, 'reload schema';/)
})

// ── I: no regression ──────────────────────────────────────────────────────

test('I34: the Invoice RPC and the feedback helper are byte-identical to Phase 3', () => {
  const phase3 = read(PHASE3_MIGRATION)
  const phase35 = read(PHASE35_MIGRATION)

  for (const name of ['save_invoice_with_items_transaction', 'apply_cps_item_feedback_transaction']) {
    assert.equal(
      rpcBody(phase35, name),
      rpcBody(phase3, name),
      `${name} must be unchanged by Phase 3.5`,
    )
  }
  // The invoice RPC still applies feedback in its own transaction.
  assert.match(
    rpcBody(phase35, 'save_invoice_with_items_transaction'),
    /PERFORM __SCHEMA__\.apply_cps_item_feedback_transaction\(p_entity_id, p_cps_feedback\)/,
  )
})

test('I34: the invoice hook is untouched by Phase 3.5', () => {
  const hook = code('src/hooks/useInvoiceSave.ts')
  assert.match(hook, /p_mode: 'update'/)
  assert.match(hook, /\.\.\.\(p_cps_feedback \? \{ p_cps_feedback \} : \{\}\)/)
  assert.doesNotMatch(hook, /save_quotation_with_items_transaction/)
})

test('I29: the composite RPC computes nothing, it persists computed values', () => {
  const body = quotationRpc()
  // Commercial values arrive already computed by the domain layer.
  assert.match(body, /\(v_item->>'amount'\)::numeric/)
  assert.match(body, /\(v_item->>'unit_price'\)::numeric/)
  // No calculation is re-implemented in SQL.
  assert.doesNotMatch(body, /quantity\)::numeric\s*\*\s*/)
  assert.doesNotMatch(body, /unit_price\)::numeric\s*\*\s*/)
  assert.doesNotMatch(body, /vat_rate\)::numeric\s*\*\s*/)
})

test('I36–I37: conversion stays one-way and the CPS side never writes downstream', () => {
  // The conversion still creates documents itself and never routes a user edit
  // through the new composite Quotation RPC.
  for (const file of [
    'src/pages/view-quotation-actions.ts',
    'src/modules/invoices/services/invoiceConversionService.ts',
    'src/pages/view-cps-actions.ts',
  ]) {
    assert.doesNotMatch(code(file), /save_quotation_with_items_transaction/)
  }

  // The composite Quotation RPC is called from exactly one place.
  assert.equal(read(HOOK).split('save_quotation_with_items_transaction').length - 1, 0)
  assert.equal(read(TX).split('save_quotation_with_items_transaction').length - 1, 2)

  // The Quotation -> Invoice conversion is unchanged: it still uses the invoice
  // RPC and the revert RPC exactly as Phase 3 left them.
  assert.match(
    code('src/pages/view-quotation-actions.ts'),
    /rpc\('save_invoice_with_items_transaction'/,
  )
  assert.match(
    code('src/modules/invoices/services/invoiceConversionService.ts'),
    /rpc\('revert_invoice_to_quotation_transaction'/,
  )

  // Nothing on the CPS side writes a downstream item row.
  for (const file of [
    'src/domain/cps/feedback.ts',
    'src/domain/cps/feedbackStore.ts',
    'src/hooks/useQuotationSave.ts',
  ]) {
    assert.doesNotMatch(
      code(file),
      /cps_rows'\)[\s\S]{0,80}?\.update\(|cps_rows'\)[\s\S]{0,80}?\.insert\(/,
    )
  }
})

test('the compatibility fallback is isolated and only used without a tenant entity id', () => {
  const hook = code('src/hooks/useQuotationSave.ts')
  // The fallback is labelled at both of its entry points.
  assert.equal(
    read('src/hooks/useQuotationSave.ts').split('COMPATIBILITY FALLBACK ONLY').length - 1,
    2,
  )
  // It is entered only when there is no entity id to scope the RPC.
  assert.match(hook, /if \(entityId\) \{/)
  assert.match(hook, /if \(entityId\) \{[\s\S]{0,200}?await persistQuotationTransaction\(\{/)
  assert.match(hook, /_quotationPersistMode = 'legacy'/)
  // The legacy item writes and the legacy feedback call live inside the fallback.
  const fallback = hook.slice(hook.indexOf('if (!compositePersisted)'))
  assert.match(fallback, /from\('quotation_items'\)\.delete\(\)/)
  assert.match(fallback, /from\('quotation_items'\)\.insert\(/)
  assert.match(fallback, /runCpsDownstreamFeedback\(tenantClient/)
})

test('a failed baseline read fails the save instead of sending an unverified diff', async () => {
  const { client } = createFakeTenantClient({
    itemsError: { message: 'permission denied for table' },
  })
  await assert.rejects(
    () => loadCpsFeedbackRows(client, 'quotation', QUOTATION_ID),
    /permission denied/,
  )

  const transaction = code(TX)
  // The transaction converts that failure into a save failure, not into
  // "no feedback".
  assert.match(transaction, /baseline read failed/)
  assert.match(transaction, /throw new Error\(/)
  // It must not swallow the failure and continue without a plan.
  const plan = transaction.slice(
    transaction.indexOf('async function planQuotationFeedback'),
    transaction.indexOf('function quotationSaveError'),
  )
  assert.match(plan, /catch \(baselineErr\) \{[\s\S]{0,260}?throw new Error\(/)
  assert.doesNotMatch(plan, /catch \(baselineErr\) \{[\s\S]{0,260}?return null/)
})

test('an RPC error never silently falls back to the weaker path', () => {
  const transaction = code(TX)
  // Every RPC outcome is returned to the caller as an error. Nothing retries
  // through the legacy sequential path.
  assert.equal(
    transaction.split('if (error) return { data: null, error: quotationSaveError(error) }').length - 1,
    2,
    'both create and update map the RPC error through quotationSaveError',
  )
  assert.doesNotMatch(transaction, /from\('quotations'\)[\s\S]{0,60}?\.(insert|update)\(/)
  assert.doesNotMatch(transaction, /_quotationPersistMode/)
  // The fallback marker exists only in the hook.
  assert.doesNotMatch(transaction, /COMPATIBILITY FALLBACK/)
})

test('the composite RPC is tenant-scoped and permission gated', () => {
  const body = quotationRpc()
  assert.match(body, /v_schema := '__SCHEMA_TEXT__'/)
  assert.match(body, /has_entity_permission\([\s\S]{0,120}?'quotation',[\s\S]{0,40}?'create'/)
  assert.match(body, /has_entity_permission\([\s\S]{0,120}?'quotation',[\s\S]{0,40}?'edit'/)
  assert.match(body, /SECURITY DEFINER/)
  assert.match(body, /SET search_path TO 'public'/)
})

test('the composite RPC returns the saved row, not a nested wrapper', () => {
  const body = quotationRpc()
  // v_row must be jsonb: a record variable nests the row under {"to_jsonb": ...}
  // and makes result.quotation.quotation_number unreadable to the caller.
  assert.match(body, /v_row jsonb;/)
  assert.doesNotMatch(body, /v_row record;/)
  assert.match(body, /INTO v_row;/)
  assert.match(body, /'quotation', v_row/)
})

test('jsonb and date columns are cast explicitly, because text has no assignment cast', () => {
  const body = quotationRpc()
  // quotations.custom_fields is jsonb.
  assert.match(body, /COALESCE\(NULLIF\(p_quotation_payload->>'custom_fields', ''\), '\{\}'\)::jsonb/)
  // quotations.valid_until and issue_date are date.
  assert.match(body, /\(p_quotation_payload->>'valid_until'\)::date/)
  assert.match(body, /\(p_quotation_payload->>'issue_date'\)::date/)
  assert.match(body, /valid_until = \(\$7\)::date/)
  // quotation_items.custom_data is jsonb.
  assert.match(body, /\(v_item->>'custom_data'\)::jsonb/)
})

test('the Phase 3 suite was updated to describe the fallback, not the primary path', () => {
  const phase3 = read('src/tests/critical/cpsDownstreamFeedback.test.js')
  assert.match(
    phase3,
    /the Quotation compatibility fallback applies feedback after its rows persist and reports failure/,
  )
  // The ordering contract still holds inside that isolated branch.
  const hook = code('src/hooks/useQuotationSave.ts')
  const inserts = hook.indexOf("from('quotation_items').insert(")
  const applies = hook.indexOf('await runCpsDownstreamFeedback(')
  assert.ok(inserts > 0 && applies > inserts)
})
