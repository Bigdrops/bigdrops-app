import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  isOperationIdConflict,
  persistInvoiceCreation,
  persistQuotationCreation,
} from '../../lib/ai-assistant/bolu-document-service.ts'
import { buildDocumentCreateProposal } from '../../lib/ai-assistant/bolu-operations.ts'

const root = process.cwd()
const MIGRATIONS_DIR = path.resolve(root, 'supabase/migrations')
const INSTALLER_MARKER =
  'CREATE OR REPLACE FUNCTION public._prov_install_tenant_rpcs(p_schema_name text)'

const PREV_INSTALLER_FILE = '20261106230000_tenant_rpc_purchase_order_transaction.sql'
const IDEMPOTENCY_FILE = '20261118120000_bolu_operation_idempotency.sql'
const NEW_INSTALLER_FILE = '20261118130000_bolu_tenant_rpc_installer.sql'
const PROVISIONING_FILE = '20261014100000_document_search_platform.sql'
const CLONE_FILE = '20260717000000_entity_provisioning_engine.sql'
const GENERATOR_FILE = 'scripts/gen-bolu-operation-id-tenant-rpcs.cjs'
const SERVICE_FILE = 'src/lib/ai-assistant/bolu-document-service.ts'
const REQUIRED_TENANT_RELATIONS = [
  'activity_events',
  'audit_logs',
  'cps_rows',
  'cps_sheets',
  'csrs',
  'invoice_items',
  'invoices',
  'letters',
  'payments',
  'projects',
  'purchase_order_items',
  'purchase_orders',
  'quotation_items',
  'quotations',
  'suppliers',
  'waybills',
]

const read = (relative) => fs.readFileSync(path.resolve(root, relative), 'utf8')
const normalize = (text) => text.replace(/\r\n/g, '\n')

function installerBlock(sql) {
  const start = sql.indexOf(INSTALLER_MARKER)
  assert.ok(start >= 0, 'SQL must define the canonical tenant RPC installer')
  const end = sql.indexOf('$install$;', start)
  assert.ok(end > start, 'installer body must be closed')
  return sql.slice(start, end + '$install$;'.length)
}

function replaceOnce(text, find, replacement, label) {
  const count = text.split(find).length - 1
  assert.equal(count, 1, `${label} must match exactly once (got ${count})`)
  return text.replace(find, replacement)
}

// The only changes permitted in the regenerated installer are these four
// surgical edits. This check is deliberately stricter than a loose
// "contains operation_id" assertion: it proves no unrelated RPC was touched.
function applyAuthorizedInstallerEdits(sql) {
  let out = sql

  out = replaceOnce(
    out,
    `                amount_in_words
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25
            )`,
    `                amount_in_words,
                operation_id
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25, $26
            )`,
    'invoice INSERT column list',
  )

  out = replaceOnce(
    out,
    `            p_invoice_payload->>'custom_fields',
            p_invoice_payload->>'work_duration',
            COALESCE((p_invoice_payload->>'subtotal')::numeric, 0),
            COALESCE((p_invoice_payload->>'install_rate_total')::numeric, 0),
            COALESCE((p_invoice_payload->>'total')::numeric, 0),
            p_invoice_payload->>'amount_in_words';`,
    `            p_invoice_payload->>'custom_fields',
            p_invoice_payload->>'work_duration',
            COALESCE((p_invoice_payload->>'subtotal')::numeric, 0),
            COALESCE((p_invoice_payload->>'install_rate_total')::numeric, 0),
            COALESCE((p_invoice_payload->>'total')::numeric, 0),
            p_invoice_payload->>'amount_in_words',
            NULLIF(p_invoice_payload->>'operation_id', '');`,
    'invoice USING tail',
  )

  out = replaceOnce(
    out,
    `                amount_in_words,
                custom_fields
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            )`,
    `                amount_in_words,
                custom_fields,
                operation_id
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
            )`,
    'quotation INSERT column list',
  )

  out = replaceOnce(
    out,
    `            p_quotation_payload->>'amount_in_words',
            -- quotations.custom_fields is jsonb and text has no assignment cast
            -- to jsonb, so the cast is explicit and lives on this expression.
            COALESCE(NULLIF(p_quotation_payload->>'custom_fields', ''), '{}')::jsonb;`,
    `            p_quotation_payload->>'amount_in_words',
            -- quotations.custom_fields is jsonb and text has no assignment cast
            -- to jsonb, so the cast is explicit and lives on this expression.
            COALESCE(NULLIF(p_quotation_payload->>'custom_fields', ''), '{}')::jsonb,
            NULLIF(p_quotation_payload->>'operation_id', '');`,
    'quotation USING tail',
  )

  return out
}

function rpcFunctionBody(installerSql, name) {
  const block = installerBlock(installerSql)
  const start = block.indexOf(`CREATE OR REPLACE FUNCTION __SCHEMA__.${name}`)
  assert.ok(start >= 0, `${name} must be installed by the canonical installer`)
  const open = block.indexOf('$function$', start)
  assert.ok(open > start, `${name} must open a dollar-quoted body`)
  const close = block.indexOf('$function$', open + '$function$'.length)
  assert.ok(close > open, `${name} must close its dollar-quoted body`)
  return block.slice(start, close)
}

function parseInsert(body, table) {
  const match = body.match(
    new RegExp(`INSERT INTO %I\\.${table} \\(([\\s\\S]*?)\\)\\s*VALUES \\(([\\s\\S]*?)\\)\\s*RETURNING id`),
  )
  assert.ok(match, `${table} create INSERT must exist`)
  const columns = match[1].split(',').map((part) => part.trim()).filter(Boolean)
  const placeholders = match[2].match(/\$\d+/g) || []
  return { columns, placeholders }
}

function parseUsingArguments(body, variable) {
  const match = body.match(new RegExp(`INTO v_${variable}_id\\s+USING\\s+([\\s\\S]*?);`))
  assert.ok(match, `${variable} USING clause must exist`)
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('--'))
}

function provisionEntityBody(sql) {
  const marker = 'CREATE OR REPLACE FUNCTION public.provision_entity(p_entity_id uuid)'
  const start = sql.indexOf(marker)
  assert.ok(start >= 0, 'latest provisioning migration must define provision_entity')
  const open = sql.indexOf('$function$', start)
  const close = sql.indexOf('$function$', open + '$function$'.length)
  assert.ok(close > open, 'provision_entity body must be closed')
  return sql.slice(start, close)
}

const ITEMS = [{ description: 'Salt', quantity: 1, unit_price: 15000 }]

function approvedProposal(family, draftNumber) {
  const proposal = buildDocumentCreateProposal(
    family,
    { client_name: 'Tunde', items: ITEMS },
    draftNumber,
  )
  proposal.status = 'approved_pending_save'
  return proposal
}

function tenantClientFor(rpc) {
  return {
    isReady: true,
    schemaName: 'entity_test',
    from(table) {
      if (table === 'settings') {
        return {
          select: () => ({
            limit: () => ({
              single: async () => ({
                data: { document_prefixes: { invoice: 'SASINV', quotation: 'SASQUO' } },
                error: null,
              }),
            }),
          }),
        }
      }

      const builder = {
        select: () => builder,
        eq: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({ data: null, error: null }),
      }
      return builder
    },
    rpc,
  }
}

// ── Installer source-of-truth contract ────────────────────────────────────

test('INSTALLER: the new migration is the last canonical installer definition', () => {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  const definitions = files.filter((name) =>
    fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8').includes(INSTALLER_MARKER),
  )

  assert.ok(
    definitions.includes(PREV_INSTALLER_FILE),
    'the prior authoritative installer must be present in history',
  )
  assert.equal(
    definitions.at(-1),
    NEW_INSTALLER_FILE,
    'no later migration may leave a competing installer definition',
  )
  assert.ok(
    definitions.indexOf(PREV_INSTALLER_FILE) < definitions.indexOf(NEW_INSTALLER_FILE),
    'the correction must apply after the prior authoritative installer',
  )
})

test('INSTALLER: regenerated body differs from the prior installer only by the four authorized edits', () => {
  const prior = normalize(installerBlock(read(`supabase/migrations/${PREV_INSTALLER_FILE}`)))
  const generated = normalize(installerBlock(read(`supabase/migrations/${NEW_INSTALLER_FILE}`)))

  assert.equal(generated, applyAuthorizedInstallerEdits(prior))
})

test('INSTALLER: generator retains its unique-anchor and no-CASCADE guards', () => {
  const generator = read(GENERATOR_FILE)
  assert.match(generator, /MISSING\/NOT UNIQUE/)
  assert.match(generator, /block\.split\(find\)\.length - 1/)
  assert.match(generator, /mustAppearOnce/)
  assert.match(generator, /probe FAILED: CASCADE must not appear/)
  assert.doesNotMatch(
    read(`supabase/migrations/${NEW_INSTALLER_FILE}`),
    /\bCASCADE\b/i,
    'the generated migration must not drop dependants',
  )
  assert.ok(generator.includes(PREV_INSTALLER_FILE))
  assert.ok(generator.includes(NEW_INSTALLER_FILE))
})

// ── Migration responsibility contract ─────────────────────────────────────

test('MIGRATION A: operation-id migration is schema/data only and installs no save RPC', () => {
  const sql = read(`supabase/migrations/${IDEMPOTENCY_FILE}`)

  assert.doesNotMatch(sql, /\$rpc_update\$/)
  assert.doesNotMatch(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION/i)
  assert.doesNotMatch(sql, /save_invoice_with_items_transaction/)
  assert.doesNotMatch(sql, /save_quotation_with_items_transaction/)

  assert.match(sql, /ADD COLUMN operation_id text/)
  assert.match(sql, /idx_invoices_operation_id_unique/)
  assert.match(sql, /idx_quotations_operation_id_unique/)
  assert.match(sql, /WHERE operation_id IS NOT NULL/)
  assert.match(sql, /per-row safe JSON parsing/i)
  assert.match(sql, /Duplicate operation_id values found/)
  assert.match(sql, /NOTIFY pgrst, 'reload schema'/)
})

test('MIGRATION A cannot leave a simplified save RPC as the final intended state', () => {
  const idempotency = read(`supabase/migrations/${IDEMPOTENCY_FILE}`)
  const installer = read(`supabase/migrations/${NEW_INSTALLER_FILE}`)

  assert.doesNotMatch(idempotency, /CREATE\s+OR\s+REPLACE\s+FUNCTION/i)
  assert.match(
    installer,
    /CREATE OR REPLACE FUNCTION __SCHEMA__\.save_invoice_with_items_transaction/,
  )
  assert.match(
    installer,
    /CREATE OR REPLACE FUNCTION __SCHEMA__\.save_quotation_with_items_transaction/,
  )
})

// ── Canonical document behaviour contract ─────────────────────────────────

test('CANONICAL: invoice and quotation save RPCs retain signatures and full document behaviour', () => {
  const sql = read(`supabase/migrations/${NEW_INSTALLER_FILE}`)
  const families = [
    {
      name: 'save_invoice_with_items_transaction',
      payload: 'p_invoice_payload',
      resource: 'invoice',
      responseKey: 'invoice',
    },
    {
      name: 'save_quotation_with_items_transaction',
      payload: 'p_quotation_payload',
      resource: 'quotation',
      responseKey: 'quotation',
    },
  ]

  for (const family of families) {
    const body = rpcFunctionBody(sql, family.name)

    assert.match(
      body,
      new RegExp(
        `p_entity_id uuid, ${family.payload} jsonb, p_items jsonb DEFAULT '\\[\\]'::jsonb, ` +
          `p_mode text DEFAULT 'create'::text, p_cps_feedback jsonb DEFAULT NULL::jsonb`,
      ),
      `${family.name} must retain its five-argument signature`,
    )
    assert.match(body, /IF p_mode = 'create' THEN/, `${family.name} must retain create mode`)
    assert.match(body, /ELSE/, `${family.name} must retain update mode`)
    assert.match(body, new RegExp(`'${family.resource}',\\s*'create'`))
    assert.match(body, new RegExp(`'${family.resource}',\\s*'edit'`))

    for (const field of [
      'workmanship',
      'transportation',
      'shipping',
      'discount',
      'vat',
      'wht',
      'subtotal',
      'install_rate_total',
      'total',
      'amount_in_words',
    ]) {
      assert.match(body, new RegExp(field), `${family.name} must retain ${field}`)
    }

    assert.match(
      body,
      /PERFORM __SCHEMA__\.apply_cps_item_feedback_transaction\(p_entity_id, p_cps_feedback\)/,
      `${family.name} must retain CPS feedback processing`,
    )
    assert.match(body, /source_cps_id/, `${family.name} must retain CPS item lineage`)
    assert.match(body, /source_cps_row_id/, `${family.name} must retain CPS row lineage`)
    assert.match(body, new RegExp(`'${family.responseKey}', v_row`))
    assert.match(body, /'items_saved', v_count/)
    assert.match(body, /SECURITY DEFINER/)
    assert.match(body, /SET search_path TO 'public'/)
  }
})

test('INSTALLER: generator footer stays aligned with the corrected migration guard', () => {
  const generator = read(GENERATOR_FILE)
  const installer = read(`supabase/migrations/${NEW_INSTALLER_FILE}`)

  for (const fragment of [
    'COALESCE(eps.status, \'ready\') = \'ready\'',
    '\'activity_events\', \'audit_logs\', \'cps_rows\', \'cps_sheets\'',
    '\'column invoices.operation_id\'',
    '\'column quotations.operation_id\'',
    'RAISE EXCEPTION \'Cannot install canonical tenant RPCs',
    'PERFORM public._prov_install_tenant_rpcs(v_schema.schemaname);',
    'Canonical save RPC verification failed in schema %',
  ]) {
    assert.ok(generator.includes(fragment), `generator must emit ${fragment}`)
    assert.ok(installer.includes(fragment), `migration must contain ${fragment}`)
  }
})

test('INSTALLER: invoice create INSERT is aligned at 26 columns / 26 placeholders / 26 arguments', () => {
  const body = rpcFunctionBody(read(`supabase/migrations/${NEW_INSTALLER_FILE}`), 'save_invoice_with_items_transaction')
  const { columns, placeholders } = parseInsert(body, 'invoices')
  const args = parseUsingArguments(body, 'invoice')

  assert.equal(columns.length, 26)
  assert.equal(placeholders.length, 26)
  assert.equal(args.length, 26)
  assert.equal(columns.at(-1), 'operation_id')
  assert.equal(placeholders.at(-1), '$26')
  assert.equal(args.at(-1), "NULLIF(p_invoice_payload->>'operation_id', '')")
  placeholders.forEach((placeholder, index) => {
    assert.equal(placeholder, `$${index + 1}`)
  })
})

test('INSTALLER: quotation create INSERT is aligned at 23 columns / 23 placeholders / 23 arguments', () => {
  const body = rpcFunctionBody(read(`supabase/migrations/${NEW_INSTALLER_FILE}`), 'save_quotation_with_items_transaction')
  const { columns, placeholders } = parseInsert(body, 'quotations')
  const args = parseUsingArguments(body, 'quotation')

  assert.equal(columns.length, 23)
  assert.equal(placeholders.length, 23)
  assert.equal(args.length, 23)
  assert.equal(columns.at(-1), 'operation_id')
  assert.equal(placeholders.at(-1), '$23')
  assert.equal(args.at(-1), "NULLIF(p_quotation_payload->>'operation_id', '')")
  placeholders.forEach((placeholder, index) => {
    assert.equal(placeholder, `$${index + 1}`)
  })
})

test('INSTALLER: update mode never reassigns the operation_id idempotency key', () => {
  const sql = read(`supabase/migrations/${NEW_INSTALLER_FILE}`)
  for (const [name, table] of [
    ['save_invoice_with_items_transaction', 'invoices'],
    ['save_quotation_with_items_transaction', 'quotations'],
  ]) {
    const body = rpcFunctionBody(sql, name)
    const update = body.slice(body.indexOf(`UPDATE %I.${table}`))
    assert.doesNotMatch(update, /operation_id\s*=/, `${name} must preserve operation_id on update`)
  }
})

// ── Tenant lifecycle contract ─────────────────────────────────────────────

test('LIFECYCLE: template tables are cloned with indexes, then the canonical installer runs before ready', () => {
  const cloneSql = read(`supabase/migrations/${CLONE_FILE}`)
  assert.match(cloneSql, /CREATE TABLE %I\.%I \(LIKE %I\.%I INCLUDING ALL\)/)

  const provisionBody = provisionEntityBody(read(`supabase/migrations/${PROVISIONING_FILE}`))
  const cloneAt = provisionBody.indexOf('_prov_clone_table')
  const installAt = provisionBody.indexOf('_prov_install_tenant_rpcs')
  const readyAt = provisionBody.indexOf("_prov_update_status(p_entity_id, 'ready')")

  assert.ok(cloneAt > 0, 'provisioning must clone template tables')
  assert.ok(installAt > cloneAt, 'RPC installation must follow table cloning')
  assert.ok(readyAt > installAt, 'schema must not be marked ready before RPC installation')
  assert.match(
    provisionBody,
    /EXCEPTION WHEN OTHERS THEN[\s\S]*_prov_update_status\(p_entity_id, 'failed', SQLERRM\)/,
    'a failed installation must leave the tenant failed, not ready',
  )
})

test('LIFECYCLE: existing-tenant backfill uses one entity-derived rule and verifies installer dependencies', () => {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
  assert.ok(
    files.indexOf(IDEMPOTENCY_FILE) < files.indexOf(NEW_INSTALLER_FILE),
    'operation_id columns/indexes must exist before installer reinstall',
  )

  const idempotency = read(`supabase/migrations/${IDEMPOTENCY_FILE}`)
  const sql = read(`supabase/migrations/${NEW_INSTALLER_FILE}`)
  const backfill = sql.slice(sql.indexOf('BACKFILL - reinstall canonical tenant RPCs'))

  for (const [label, source] of [
    ['operation-id migration', idempotency],
    ['installer backfill', backfill],
  ]) {
    assert.match(source, /FROM public\.entities e/, `${label} must derive schemas from public.entities`)
    assert.match(
      source,
      /public\._prov_get_schema_name\(e\.id\) LIKE 'entity\\_%'/,
      `${label} must escape the underscore in the tenant prefix`,
    )
    assert.match(source, /COALESCE\(eps\.status, 'ready'\) = 'ready'/)
    assert.doesNotMatch(source, /pg_namespace n/, `${label} must not scan arbitrary schemas`)
  }

  for (const table of REQUIRED_TENANT_RELATIONS) {
    assert.ok(
      backfill.includes(`'${table}'`),
      `installer dependency check must include ${table}`,
    )
  }
  assert.match(backfill, /'column invoices\.operation_id'/)
  assert.match(backfill, /'column quotations\.operation_id'/)
  for (const fn of [
    'public.has_entity_permission(uuid, uuid, text, text)',
    'public.compute_jsonb_diff(jsonb, jsonb)',
    'public._audit_resolve_invoice_schema(uuid, uuid)',
  ]) {
    assert.ok(backfill.includes(fn), `installer dependency check must include ${fn}`)
  }

  assert.match(backfill, /Skipping tenant RPC installation for schema %/)
  assert.match(backfill, /RAISE EXCEPTION 'Cannot install canonical tenant RPCs/)
  assert.match(backfill, /PERFORM public\._prov_install_tenant_rpcs\(v_schema\.schemaname\)/)
  assert.match(backfill, /Canonical save RPC verification failed/)
  assert.doesNotMatch(
    backfill,
    /EXCEPTION WHEN OTHERS THEN[\s\S]*PERFORM public\._prov_install_tenant_rpcs/,
    'an installation failure must abort, not be swallowed',
  )
  assert.match(sql, /NOTIFY pgrst, 'reload schema'/)
})

// ── Negative contracts ────────────────────────────────────────────────────

test('NEGATIVE: unrelated and cross-family 23505 errors are not operation replays', () => {
  assert.equal(
    isOperationIdConflict(
      {
        code: '23505',
        message: 'duplicate key value violates unique constraint "idx_invoices_invoice_number_unique"',
        details: 'Key (invoice_number)=(SASINV-000001) already exists.',
      },
      'invoice',
    ),
    false,
  )
  assert.equal(
    isOperationIdConflict(
      {
        code: '23505',
        message: 'duplicate key value violates unique constraint "idx_invoices_operation_id_unique"',
        details: 'Key (operation_id)=(op-1) already exists.',
      },
      'quotation',
    ),
    false,
    'an invoice constraint must never be treated as a quotation replay',
  )
  assert.equal(
    isOperationIdConflict(
      {
        code: '23505',
        message: 'duplicate key value violates unique constraint "settings_pkey"',
      },
      'invoice',
    ),
    false,
  )
})

test('NEGATIVE: absent operation_id remains NULL and is outside the unique index (STATIC contract)', () => {
  const installer = read(`supabase/migrations/${NEW_INSTALLER_FILE}`)
  const idempotency = read(`supabase/migrations/${IDEMPOTENCY_FILE}`)

  assert.match(installer, /NULLIF\(p_invoice_payload->>'operation_id', ''\)/)
  assert.match(installer, /NULLIF\(p_quotation_payload->>'operation_id', ''\)/)
  assert.match(idempotency, /idx_invoices_operation_id_unique/)
  assert.match(idempotency, /idx_quotations_operation_id_unique/)
  assert.match(idempotency, /WHERE operation_id IS NOT NULL/)
  // This is a source-level uniqueness contract. A real duplicate-insert test
  // requires a database and is explicitly not claimed here.
})

test('NEGATIVE: failed prefix reads still abort before the corrected RPC can be called', async () => {
  const proposal = approvedProposal('invoice', 'INV-DRAFT')
  let saveCalled = false
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({ data: null, error: { code: '42501', message: 'permission denied' } }),
        }),
      }),
    }),
    rpc: async (name) => {
      if (name === 'save_invoice_with_items_transaction') saveCalled = true
      return { data: null, error: null }
    },
  }

  const result = await persistInvoiceCreation(
    tenantClient,
    proposal,
    () => true,
    () => true,
    'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(result.success, false)
  assert.equal(saveCalled, false)
})

// ── Application payload behaviour ─────────────────────────────────────────

test('BEHAVIOURAL: invoice persistence sends operation_id to the corrected RPC', async () => {
  const proposal = approvedProposal('invoice', 'INV-DRAFT')
  let captured = null

  const tenantClient = tenantClientFor(async (name, args) => {
    if (name === 'save_invoice_with_items_transaction') {
      captured = args
      return {
        data: [{ invoice: { id: 'inv-new', invoice_number: 'SASINV-000001' } }],
        error: null,
      }
    }
    return { data: null, error: null }
  })

  const result = await persistInvoiceCreation(
    tenantClient,
    proposal,
    () => true,
    () => true,
    'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(result.success, true)
  assert.ok(captured, 'the canonical invoice RPC must be called')
  assert.equal(captured.p_invoice_payload.operation_id, proposal.opId)
})

test('BEHAVIOURAL: quotation persistence sends operation_id to the corrected RPC', async () => {
  const proposal = approvedProposal('quotation', 'QTN-DRAFT')
  let captured = null

  const tenantClient = tenantClientFor(async (name, args) => {
    if (name === 'save_quotation_with_items_transaction') {
      captured = args
      return {
        data: [{ quotation: { id: 'quo-new', quotation_number: 'SASQUO-000001' } }],
        error: null,
      }
    }
    return { data: null, error: null }
  })

  const result = await persistQuotationCreation(
    tenantClient,
    proposal,
    () => true,
    () => true,
    'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(result.success, true)
  assert.ok(captured, 'the canonical quotation RPC must be called')
  assert.equal(captured.p_quotation_payload.operation_id, proposal.opId)
})

test('BEHAVIOURAL: the application verifies replayed rows carry the expected operation_id', () => {
  const service = read(SERVICE_FILE)
  assert.match(service, /\.eq\('operation_id', opId\)/)
  assert.match(service, /operationId !== opId/)
  assert.match(service, /isOperationIdConflict\(error as any, 'invoice'\)/)
  assert.match(service, /isOperationIdConflict\(error as any, 'quotation'\)/)
})
