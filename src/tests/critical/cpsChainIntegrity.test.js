import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  authorityTransitionSummary,
  newConversionChainId,
  normalizeChainId,
  resolveActiveFeedbackAuthority,
} from '@/domain/cps/lineage'
import { mapCpsToQuotation } from '@/domain/cps/conversion'
import {
  buildCpsAuditMeta,
  cpsAuditActionForEvent,
  CPS_AUDIT_SOURCE,
} from '@/domain/cps/auditDiff'
import { buildAuditTrailItems, extractCpsAuditMeta } from '@/domain/audit/auditFormatters'
import { CPS_AUDIT_META_KEY } from '@/domain/audit/auditTypes'

const CPS_ID = '11111111-1111-4111-8111-111111111111'
const ROW_A = 'aaaaaaaa-1111-4111-8111-111111111111'
const QUOTATION_ID = '22222222-2222-4222-8222-222222222222'
const INVOICE_ID = '33333333-3333-4333-8333-333333333333'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function cpsSheet(overrides = {}) {
  return {
    id: CPS_ID,
    cps_number: 'CPS-000001',
    title: 'Sheet',
    client_name: 'Acme Ltd',
    project_name: '',
    issue_date: '2026-01-01',
    table_rows: [
      {
        id: ROW_A,
        row_type: 'item',
        sort_order: 0,
        description: 'Fuel Filter',
        specification: 'Perkins',
        quantity: 2,
        unit: 'pcs',
        make_brand: 'Perkins',
        cp: '20000',
        sp: '22000',
        image_url: null,
        group_id: null,
        custom_data: {},
      },
    ],
    table_columns: [],
    custom_fields: {},
    ...overrides,
  }
}

// ── Chain identity ─────────────────────────────────────────────────────────

test('CPS → Quotation creates a conversion chain id and exposes it to audit', () => {
  const { payload, lineage } = mapCpsToQuotation(cpsSheet(), 'QTN-000432')

  assert.match(payload.conversion_chain_id, UUID_PATTERN)
  assert.equal(lineage.chainId, payload.conversion_chain_id)
  assert.equal(normalizeChainId(payload.conversion_chain_id), payload.conversion_chain_id)
})

test('two conversions of one CPS receive different chain ids', () => {
  const first = mapCpsToQuotation(cpsSheet(), 'QTN-000432')
  const second = mapCpsToQuotation(cpsSheet(), 'QTN-000433')

  assert.notEqual(first.payload.conversion_chain_id, second.payload.conversion_chain_id)
  // Both still name the same CPS document: chain identity and document
  // provenance are separate.
  assert.equal(first.payload.source_cps_id, CPS_ID)
  assert.equal(second.payload.source_cps_id, CPS_ID)
})

test('the chain id is minted independently of the document number', () => {
  const { payload } = mapCpsToQuotation(cpsSheet(), 'QTN-000432')
  assert.doesNotMatch(payload.conversion_chain_id, /QTN/i)
  assert.ok(!payload.conversion_chain_id.includes('000432'))

  // A different number does not influence the chain value.
  const other = mapCpsToQuotation(cpsSheet(), 'QTN-999999').payload.conversion_chain_id
  assert.match(other, UUID_PATTERN)
  assert.notEqual(other, payload.conversion_chain_id)
})

test('newConversionChainId mints a fresh uuid every call', () => {
  const a = newConversionChainId()
  const b = newConversionChainId()
  assert.match(a, UUID_PATTERN)
  assert.match(b, UUID_PATTERN)
  assert.notEqual(a, b)
})

test('chain ids are validated, never guessed', () => {
  assert.equal(normalizeChainId('not-a-uuid'), null)
  assert.equal(normalizeChainId(''), null)
  assert.equal(normalizeChainId(null), null)
  assert.equal(normalizeChainId(` ${CPS_ID} `), CPS_ID)
})

test('a legacy quotation with no chain resolves to no authority', () => {
  assert.equal(resolveActiveFeedbackAuthority({ id: QUOTATION_ID, conversion_chain_id: null }), null)
})

// ── Audit metadata promotion ───────────────────────────────────────────────

function record(overrides = {}) {
  return {
    id: 'log-1',
    entity_type: 'cps_sheets',
    entity_id: CPS_ID,
    entity_label: 'CPS-000001',
    action: 'CONVERT',
    actor_label: 'amina@bigdrops.com',
    created_at: '2026-10-05T10:00:00Z',
    changes: [],
    metadata: null,
    ...overrides,
  }
}

const CONVERSION_META = buildCpsAuditMeta({
  event: 'CONVERTED_TO_QUOTATION',
  rootId: CPS_ID,
  chainId: '99999999-9999-4999-8999-999999999999',
  sourceContext: CPS_AUDIT_SOURCE.view,
  related: { type: 'quotation', id: QUOTATION_ID, number: 'QTN-000432' },
  summary: 'Converted to QTN-000432',
  detail: 'Row ancestry established for 2 CPS items. Conversion chain created.',
})

test('new CPS events read their payload from audit_logs.metadata', () => {
  const extracted = extractCpsAuditMeta(record({ metadata: CONVERSION_META }))
  assert.ok(extracted)
  assert.equal(extracted.event, 'CONVERTED_TO_QUOTATION')
  assert.equal(extracted.rootId, CPS_ID, 'CPS document provenance stays identifiable')
  assert.equal(extracted.chainId, '99999999-9999-4999-8999-999999999999')
  assert.equal(extracted.parentEventId, null)

  const [entry] = buildAuditTrailItems([record({ metadata: CONVERSION_META })])
  assert.equal(entry.actionLabel, 'Converted to QTN-000432')
  assert.equal(entry.chainId, '99999999-9999-4999-8999-999999999999')
  assert.equal(entry.relatedDocument.number, 'QTN-000432')
  assert.match(entry.detail, /Conversion chain created/)
})

test('legacy _cps entries inside changes still render', () => {
  const legacy = buildCpsAuditMeta({
    event: 'CONVERTED_TO_QUOTATION',
    rootId: CPS_ID,
    sourceContext: CPS_AUDIT_SOURCE.view,
    related: { type: 'quotation', id: QUOTATION_ID, number: 'QTN-000111' },
    summary: 'Converted to QTN-000111',
  })

  const row = record({
    metadata: null,
    changes: [{ field: CPS_AUDIT_META_KEY, old: null, new: legacy }],
  })

  const extracted = extractCpsAuditMeta(row)
  assert.ok(extracted)
  assert.equal(extracted.event, 'CONVERTED_TO_QUOTATION')
  assert.equal(extracted.chainId, null, 'legacy rows report no chain')

  const [entry] = buildAuditTrailItems([row])
  assert.equal(entry.actionLabel, 'Converted to QTN-000111')
  assert.equal(entry.relatedDocument.number, 'QTN-000111')
})

test('metadata wins when both locations are present, and an unreadable one falls back', () => {
  const legacy = buildCpsAuditMeta({
    event: 'CREATED',
    rootId: CPS_ID,
    sourceContext: CPS_AUDIT_SOURCE.form,
    summary: 'Created CPS',
  })

  const preferred = extractCpsAuditMeta(
    record({
      metadata: CONVERSION_META,
      changes: [{ field: CPS_AUDIT_META_KEY, old: null, new: legacy }],
    }),
  )
  assert.equal(preferred.event, 'CONVERTED_TO_QUOTATION')

  const fallback = extractCpsAuditMeta(
    record({
      metadata: { something: 'else' },
      changes: [{ field: CPS_AUDIT_META_KEY, old: null, new: legacy }],
    }),
  )
  assert.equal(fallback.event, 'CREATED')
})

test('parentEventId is operational, not merely typed', () => {
  const meta = buildCpsAuditMeta({
    event: 'LINEAGE_WARNING',
    rootId: CPS_ID,
    chainId: '99999999-9999-4999-8999-999999999999',
    parentEventId: 'aaaa1111-2222-4333-8444-555566667777',
    sourceContext: CPS_AUDIT_SOURCE.view,
    summary: 'Row ancestry could not be carried for 1 item',
    actorType: 'system',
  })

  const extracted = extractCpsAuditMeta(record({ metadata: meta }))
  assert.equal(extracted.parentEventId, 'aaaa1111-2222-4333-8444-555566667777')
  assert.equal(extracted.chainId, '99999999-9999-4999-8999-999999999999')
  assert.equal(extracted.actorType, 'system')

  const [entry] = buildAuditTrailItems([record({ metadata: meta })])
  assert.equal(entry.parentEventId, 'aaaa1111-2222-4333-8444-555566667777')
  assert.equal(entry.chainId, '99999999-9999-4999-8999-999999999999')
})

test('non-CPS records are untouched by the metadata promotion', () => {
  const [entry] = buildAuditTrailItems([
    record({
      entity_type: 'invoice',
      entity_id: INVOICE_ID,
      action: 'UPDATE',
      metadata: { note: 'unrelated' },
      changes: [{ field: 'total', old: 1, new: 2 }],
    }),
  ])
  assert.equal(entry.actionLabel, 'updated this invoice')
  assert.equal(entry.chainId, undefined)
})

test('the new lifecycle event kinds are readable and map to audit actions', () => {
  assert.equal(cpsAuditActionForEvent('CONVERSION_RETRY'), 'CONVERT')
  assert.equal(cpsAuditActionForEvent('REVERTED_TO_QUOTATION'), 'CONVERT')
  assert.equal(cpsAuditActionForEvent('CONVERTED_TO_INVOICE'), 'CONVERT')
  assert.equal(cpsAuditActionForEvent('LINEAGE_WARNING'), 'UPDATE')

  const meta = buildCpsAuditMeta({
    event: 'REVERTED_TO_QUOTATION',
    rootId: CPS_ID,
    chainId: '99999999-9999-4999-8999-999999999999',
    sourceContext: CPS_AUDIT_SOURCE.view,
    related: { type: 'quotation', id: QUOTATION_ID, number: 'QTN-000499' },
    summary: 'Invoice reverted to Quotation',
    detail: `${authorityTransitionSummary('INV-000201', 'QTN-000499')} Feedback authority returned to the Quotation stage.`,
  })

  const [entry] = buildAuditTrailItems([record({ metadata: meta })])
  assert.equal(entry.eventType, 'REVERTED_TO_QUOTATION')
  assert.equal(entry.relatedDocument.number, 'QTN-000499')
  assert.match(entry.detail, /Feedback authority returned to the Quotation stage/)
})

// ── Source inspection: migrations and wiring ───────────────────────────────

const root = process.cwd()
const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8')
const code = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

const SCHEMA_MIGRATION = 'supabase/migrations/20261005140000_cps_chain_and_audit_metadata.sql'
const RPC_MIGRATION = 'supabase/migrations/20261005150000_tenant_rpc_cps_lineage_metadata.sql'

test('schema migration adds metadata, chain identity, and the idempotency guard', () => {
  const migration = read(SCHEMA_MIGRATION)

  assert.match(migration, /audit_logs ADD COLUMN metadata jsonb/)
  assert.match(migration, /quotations ADD COLUMN conversion_chain_id uuid/)
  assert.match(migration, /invoices ADD COLUMN conversion_chain_id uuid/)
  assert.match(migration, /invoices ADD COLUMN source_quotation_id uuid/)
  assert.match(migration, /CREATE UNIQUE INDEX invoices_source_quotation_uniq/)
  assert.match(migration, /WHERE source_quotation_id IS NOT NULL/)
  assert.match(migration, /tenant_master_template/)

  // Legacy rows must stay usable: no heuristic backfill, no FK that could
  // erase ancestry.
  assert.doesNotMatch(migration, /set\s+conversion_chain_id\s*=/i)
  assert.doesNotMatch(migration, /set\s+source_quotation_id\s*=/i)
  assert.doesNotMatch(migration, /\breferences\b/i)
  assert.doesNotMatch(migration, /create table/i)
})

test('the tenant RPC installer writes lineage inside the invoice save transaction', () => {
  const migration = read(RPC_MIGRATION)

  for (const column of [
    'source_cps_id',
    'source_cps_row_id',
    'source_quotation_id',
    'source_quotation_item_id',
  ]) {
    assert.match(migration, new RegExp(column), `installer must persist ${column}`)
  }

  // The four lineage expressions must sit in the same USING list as the rest
  // of the invoice_items insert, not in a second statement.
  assert.match(migration, /NULLIF\(v_item->>'item_id', ''\)::uuid,/)
  assert.match(
    migration,
    /NULLIF\(v_item->>'source_quotation_item_id', ''\)::uuid;/,
    'lineage is the tail of the same insert',
  )
  assert.match(migration, /source_quotation_item_id\r?\n\s*\)\r?\n\s*VALUES \(/)
})

test('the installer adds the dedicated CPS audit writer and leaves record_audit_log alone', () => {
  const migration = read(RPC_MIGRATION)

  assert.match(migration, /CREATE OR REPLACE FUNCTION __SCHEMA__\.record_cps_audit_event/)
  assert.match(migration, /changes, metadata/)
  assert.match(migration, /'\[\]'::jsonb, p_metadata/)
  assert.match(migration, /audit_logs\.metadata/)

  // record_audit_log keeps its exact 11-argument signature: several tenant
  // functions depend on it, so adding a parameter would either be rejected
  // (DROP ... would fail on the dependents) or make those calls ambiguous
  // (an extra defaulted overload). Scope the check to its own declaration
  // line, because unrelated pre-existing RPCs (e.g. record_project_updated)
  // legitimately end in p_reason text DEFAULT NULL::text, p_metadata.
  const auditLogDecl = migration.slice(
    migration.indexOf('CREATE OR REPLACE FUNCTION __SCHEMA__.record_audit_log'),
  )
  const auditLogSignature = auditLogDecl.slice(0, auditLogDecl.indexOf('\n'))
  assert.doesNotMatch(auditLogSignature, /p_metadata/)
  assert.match(
    auditLogSignature,
    /record_audit_log\(p_entity_type text, p_entity_id uuid, p_entity_label text, p_action text, p_old_data jsonb, p_new_data jsonb, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_scope_type text DEFAULT 'app'::text, p_reason text DEFAULT NULL::text\)/,
  )
})

test('the installer carries lineage and the chain through a revert', () => {
  const migration = read(RPC_MIGRATION)
  const revert = migration.slice(migration.indexOf('revert_invoice_to_quotation_transaction'))

  assert.match(revert, /source_cps_id, conversion_chain_id/)
  assert.match(revert, /NULLIF\(p_quotation_payload->>'source_cps_id', ''\)::UUID/)
  assert.match(revert, /NULLIF\(p_quotation_payload->>'conversion_chain_id', ''\)::UUID/)
  assert.match(revert, /NULLIF\(v_item->>'source_cps_row_id', ''\)::UUID/)
})

test('future tenants inherit the new RPCs and existing tenants are backfilled', () => {
  const migration = read(RPC_MIGRATION)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\._prov_install_tenant_rpcs/)
  assert.match(migration, /PERFORM public\._prov_install_tenant_rpcs\(v_schema\.schemaname\)/)
  assert.match(migration, /to_regclass\(format\('%I\.activity_events', n\.nspname\)\) IS NOT NULL/)
  assert.match(migration, /NOTIFY pgrst, 'reload schema'/)
})

test('the client writes CPS audit events through the metadata RPC', () => {
  const cpsAudit = code('src/domain/cps/audit.ts')
  assert.match(cpsAudit, /rpc\('record_cps_audit_event'/)
  assert.match(cpsAudit, /p_metadata: meta/)
  assert.match(cpsAudit, /resolveAuditActor\(\)/)
  assert.match(cpsAudit, /actorType: 'system'/)
  // The transitional '_cps' bridge is no longer written.
  assert.doesNotMatch(cpsAudit, /CPS_AUDIT_META_KEY/)
  assert.doesNotMatch(cpsAudit, /newData:/)
})

test('the audit reader selects metadata and keeps the legacy fallback', () => {
  const hook = read('src/hooks/useAuditTrail.ts')
  assert.match(hook, /created_at, changes, metadata, reason/)

  const formatter = read('src/domain/audit/auditFormatters.ts')
  assert.match(formatter, /const fromMetadata = row\.metadata/)
  assert.match(formatter, /change\.field === CPS_AUDIT_META_KEY/)
})

test('the quotation → invoice conversion is retry-safe and chain-aware', () => {
  const actions = code('src/pages/view-quotation-actions.ts')

  // A persisted guard runs before any numbering or write work.
  assert.match(actions, /resolveConvertedInvoice\(tenantClient, id, latestQuotation/)
  assert.match(actions, /source_quotation_id: id/)
  assert.match(actions, /conversion_chain_id: chainId/)
  assert.match(actions, /event: 'CONVERSION_RETRY'/)
  assert.match(actions, /event: 'CONVERTED_TO_INVOICE'/)
  assert.match(actions, /persistChainAuthority\(/)
  // No competing write: the success path never stamps lineage afterwards.
  assert.doesNotMatch(actions, /repairInvoiceItemLineage/)
  // Authority is never derived from recency.
  assert.doesNotMatch(actions, /updated_at.*authority|authority.*updated_at/i)

  // The unique index is the database-level backstop for the same rule.
  const migration = read(SCHEMA_MIGRATION)
  assert.match(migration, /CREATE UNIQUE INDEX invoices_source_quotation_uniq/)
})

test('the resolve helper consults stored links only', () => {
  const actions = read('src/pages/view-quotation-actions.ts')
  const resolver = actions.slice(actions.indexOf('async function resolveConvertedInvoice'))
  const body = resolver.slice(0, resolver.indexOf('async function recordConversionRetry'))

  assert.match(body, /resolveActiveFeedbackAuthority/)
  assert.match(body, /eq\('source_quotation_id', quotationId\)/)
  // No description/position/number matching anywhere in the resolution.
  assert.doesNotMatch(body, /description|sort_order|invoice_number.*===|like\(/i)
})

test('the invoice editor never stamps lineage after the save', () => {
  const invoiceSave = code('src/hooks/useInvoiceSave.ts')
  assert.doesNotMatch(invoiceSave, /repairInvoiceItemLineage|applyInvoiceItemLineage/)
  assert.doesNotMatch(invoiceSave, /invoice_items'\)\s*\n?\s*\.update/)
})

test('a revert keeps CPS ancestry, the chain, and hands authority back', () => {
  const service = code('src/modules/invoices/services/invoiceConversionService.ts')

  assert.match(service, /select\('custom_fields, invoice_number, source_quotation_id, conversion_chain_id'\)/)
  assert.match(service, /source_cps_id: sourceCpsId/)
  assert.match(service, /conversion_chain_id: chainId/)
  assert.match(service, /persistChainAuthority\(/)
  assert.match(service, /authorityRowId/)
  assert.match(service, /event: 'REVERTED_TO_QUOTATION'/)
  // quotation_items must not claim quotation ancestry.
  assert.match(service, /row\.source_quotation_id = null/)
  assert.match(service, /row\.source_quotation_item_id = null/)
  // The stored link is read before the invoice is removed, and nothing is
  // reconstructed heuristically.
  assert.doesNotMatch(service, /description\s*===|sort_order\s*===|similarity/i)
})

test('a duplicated invoice cannot inherit a conversion chain', () => {
  const service = code('src/modules/invoices/services/invoiceLifecycleService.ts')
  assert.match(service, /source_quotation_id: null/)
  assert.match(service, /conversion_chain_id: null/)
})

test('no Phase 3 feedback is implemented by any Phase 2.5 file', () => {
  const files = [
    'src/domain/cps/lineage.ts',
    'src/domain/cps/lineageStore.ts',
    'src/domain/cps/conversion.ts',
    'src/domain/cps/audit.ts',
    'src/pages/view-cps-actions.ts',
    'src/pages/view-quotation-actions.ts',
    'src/modules/invoices/services/invoiceConversionService.ts',
    'src/hooks/useInvoiceSave.ts',
  ]

  for (const file of files) {
    const source = code(file)
    assert.doesNotMatch(
      source,
      /syncToCps|applyDownstreamFeedback|pushToCps|feedbackToCps|updateCpsFrom(Invoice|Quotation)/i,
      `${file} must not implement feedback`,
    )
    // cps_rows are only ever removed (Phase 1 delete cleanup); no Phase 2.5
    // file rewrites them from downstream values.
    assert.doesNotMatch(
      source,
      /from\('cps_rows'\)[\s\S]{0,120}?\.update\(/,
      `${file} must not rewrite CPS rows`,
    )
    // cps_sheets keeps only the pre-existing Phase 1 archive/status updates;
    // no Phase 2.5 file writes CPS commercial fields into the document.
    assert.doesNotMatch(
      source,
      /from\('cps_sheets'\)[\s\S]{0,120}?\.update\(\{[^}]*\b(sp|cp|image_url|specification|description)\s*:/,
      `${file} must not write CPS commercial fields`,
    )
  }
})

test('the one-off RPC generator stays reproducible and guarded', () => {
  const generator = read('scripts/gen-cps-phase25-tenant-rpcs.cjs')
  assert.match(generator, /ANCHOR MISSING/)
  assert.match(generator, /ANCHOR NOT UNIQUE/)
  assert.match(generator, /20260902120000_provisioning_engine_repair\.sql/)
  assert.match(generator, /20261005150000_tenant_rpc_cps_lineage_metadata\.sql/)
})
