import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const MIGRATIONS_DIR = path.resolve(root, 'supabase/migrations')
const GENERATOR = 'scripts/gen-cps-phase36-invoice-rpc-overload-hotfix.cjs'
const PHASE35_MIGRATION =
  'supabase/migrations/20261006120000_tenant_rpc_cps_quotation_transaction.sql'

const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8')

function hotfixMigrationPath() {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /invoice_rpc_overload_hotfix\.sql$/.test(name))
    .sort()

  assert.equal(
    matches.length,
    1,
    `expected exactly one invoice RPC overload hotfix migration, found ${matches.length}`,
  )

  return path.join('supabase/migrations', matches[0])
}

function installerBody(sql) {
  const start = sql.indexOf(
    'CREATE OR REPLACE FUNCTION public._prov_install_tenant_rpcs(p_schema_name text)',
  )
  assert.ok(start >= 0, 'hotfix must regenerate the tenant RPC installer')
  const end = sql.indexOf('$install$;', start)
  assert.ok(end > start, 'installer body must be present')
  return sql.slice(start, end)
}

function functionBody(sql, name) {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION __SCHEMA__.${name}`)
  assert.ok(start >= 0, `${name} must be present`)
  const opener = sql.indexOf('$function$', start)
  assert.ok(opener > start, `${name} must open a dollar-quoted body`)
  const end = sql.indexOf('$function$', opener + '$function$'.length)
  assert.ok(end > opener, `${name} must close a dollar-quoted body`)
  return sql.slice(start, end)
}

test('hotfix migration removes only the obsolete four-argument Invoice RPC identity', () => {
  const migration = read(hotfixMigrationPath())
  const installer = installerBody(migration)

  const drop =
    'DROP FUNCTION IF EXISTS __SCHEMA__.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text);'
  const create =
    'CREATE OR REPLACE FUNCTION __SCHEMA__.save_invoice_with_items_transaction(p_entity_id uuid, p_invoice_payload jsonb, p_items jsonb DEFAULT'

  assert.match(installer, /DROP FUNCTION IF EXISTS __SCHEMA__\.save_invoice_with_items_transaction\(uuid, jsonb, jsonb, text\);/)
  assert.ok(installer.indexOf(drop) < installer.indexOf(create), 'drop must run before create')
  assert.doesNotMatch(migration, /\bCASCADE\b/i, 'the obsolete overload must not be dropped with CASCADE')
  assert.doesNotMatch(
    migration,
    /DROP FUNCTION IF EXISTS __SCHEMA__\.save_invoice_with_items_transaction\(uuid, jsonb, jsonb, text, jsonb\)/,
    'the authoritative five-argument Invoice RPC must not be dropped',
  )
})

test('hotfix preserves the current Phase 3 Invoice and Phase 3.5 Quotation RPCs', () => {
  const phase35 = read(PHASE35_MIGRATION)
  const migration = read(hotfixMigrationPath())

  assert.equal(
    functionBody(migration, 'save_invoice_with_items_transaction'),
    functionBody(phase35, 'save_invoice_with_items_transaction'),
    'the five-argument Invoice implementation must remain byte-identical to Phase 3.5',
  )
  assert.equal(
    functionBody(migration, 'apply_cps_item_feedback_transaction'),
    functionBody(phase35, 'apply_cps_item_feedback_transaction'),
    'the Phase 3 feedback helper must remain byte-identical to Phase 3.5',
  )
  assert.equal(
    functionBody(migration, 'save_quotation_with_items_transaction'),
    functionBody(phase35, 'save_quotation_with_items_transaction'),
    'the Phase 3.5 Quotation transaction must remain byte-identical',
  )
})

test('installer backfill and PostgREST reload remain present', () => {
  const migration = read(hotfixMigrationPath())
  const backfill = migration.slice(migration.indexOf('DO $do$'))

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

test('generator cannot recreate the overloaded Invoice RPC state', () => {
  const generator = read(GENERATOR)

  assert.match(generator, /ANCHOR MISSING/)
  assert.match(generator, /ANCHOR NOT UNIQUE/)
  assert.match(generator, /DROP FUNCTION IF EXISTS __SCHEMA__\.save_invoice_with_items_transaction\(uuid, jsonb, jsonb, text\);/)
  assert.match(generator, /save_quotation_with_items_transaction/)
  assert.match(generator, /apply_cps_item_feedback_transaction/)
  assert.match(generator, /record_cps_audit_event/)
})
