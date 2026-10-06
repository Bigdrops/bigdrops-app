import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Contract guard for the removal of orphan public diagnostic functions.
 *
 * A catalog audit found 8 functions in `public` with no repository
 * provenance and no dependency. The critical one, public._push_migration(text),
 * is SECURITY DEFINER, anon-executable, and runs caller-supplied SQL.
 *
 * These tests read repository artifacts only. They do not connect to the
 * database and they do not call any function.
 */

const root = process.cwd()
const MIGRATIONS_DIR = path.resolve(root, 'supabase/migrations')

const ORPHANS = [
  '_push_migration',
  '_remediation_exists_probe',
  '_test_catalog_update',
  '_test_owner_check',
  '_test_privs',
  '_test_setauth',
  '_test_super_owner',
  '_test_whoami',
]

const EXACT_IDENTITIES = [
  'DROP FUNCTION IF EXISTS public._push_migration(text);',
  'DROP FUNCTION IF EXISTS public._remediation_exists_probe();',
  'DROP FUNCTION IF EXISTS public._test_catalog_update();',
  'DROP FUNCTION IF EXISTS public._test_owner_check();',
  'DROP FUNCTION IF EXISTS public._test_privs();',
  'DROP FUNCTION IF EXISTS public._test_setauth();',
  'DROP FUNCTION IF EXISTS public._test_super_owner();',
  'DROP FUNCTION IF EXISTS public._test_whoami();',
]

/** RPCs that this migration must never drop, create, alter, or grant on. */
const PROTECTED_RPCS = [
  'remediate_accounting_gap',
  'resolve_notification',
  'upsert_notification',
  'save_invoice_with_items_transaction',
  'save_quotation_with_items_transaction',
  'apply_cps_item_feedback_transaction',
]

const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8').replace(/\r\n/g, '\n')

/** Executable SQL only. Line comments are removed. */
const executable = (sql) =>
  sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')

function cleanupMigrationPath() {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /remove_orphan_public_diagnostic_functions\.sql$/.test(name))
    .sort()

  assert.equal(
    matches.length,
    1,
    `expected exactly one orphan-cleanup migration, found ${matches.length}`,
  )

  return path.join('supabase/migrations', matches[0])
}

test('the cleanup is a single forward migration', () => {
  const name = path.basename(cleanupMigrationPath())

  assert.ok(
    name > '20261006140000_remediate_accounting_gap_overload_repair.sql',
    `the cleanup must sort after the prior repair: ${name}`,
  )
})

test('it drops all eight orphan identities by exact signature', () => {
  const sql = executable(read(cleanupMigrationPath()))

  for (const statement of EXACT_IDENTITIES) {
    assert.ok(sql.includes(statement), `missing exact drop: ${statement}`)
  }
})

test('every DROP is schema-qualified and signature-qualified, and none uses CASCADE', () => {
  const sql = executable(read(cleanupMigrationPath()))

  const drops = sql.match(/DROP\s+FUNCTION[^;]*;/gi) ?? []
  assert.equal(drops.length, ORPHANS.length, `expected ${ORPHANS.length} DROP FUNCTION statements`)

  for (const statement of drops) {
    assert.match(statement, /DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\./, `unqualified drop: ${statement}`)
    assert.ok(!/\bCASCADE\b/i.test(statement), `CASCADE is forbidden: ${statement}`)
  }

  assert.ok(!/\bCASCADE\b/i.test(sql), 'no executable CASCADE may appear')
})

test('it never creates, replaces, wraps, or renames any function', () => {
  const sql = executable(read(cleanupMigrationPath()))

  assert.ok(
    !/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(sql),
    'the cleanup must not define or redefine a function',
  )
})

test('it does not drop, create, alter, or re-grant on any protected RPC', () => {
  const sql = executable(read(cleanupMigrationPath()))
  const statements = sql.match(/^\s*(DROP|CREATE|ALTER|GRANT|REVOKE)\b[^;]*;/gim) ?? []

  for (const statement of statements) {
    for (const rpc of PROTECTED_RPCS) {
      assert.ok(
        !statement.includes(rpc),
        `protected RPC must not be changed by a ${statement.split(/\s+/)[0]} statement: ${rpc}`,
      )
    }
  }
})

test('its post-condition still asserts the protected RPCs exist', () => {
  const sql = executable(read(cleanupMigrationPath()))

  assert.ok(
    sql.includes("to_regprocedure('public.remediate_accounting_gap(uuid, text, text)') IS NULL"),
    'the guard must assert remediate_accounting_gap survives',
  )
  assert.ok(
    sql.includes("to_regprocedure('public.resolve_notification(uuid, text)') IS NULL"),
    'the guard must assert resolve_notification survives',
  )
  assert.ok(
    sql.includes("to_regprocedure('public.upsert_notification(uuid, text, text, text, text, text, text, text, text, text, text, jsonb)') IS NULL"),
    'the guard must assert the 12-argument upsert_notification survives',
  )
})

test('it refuses to run when a dependent object exists', () => {
  const sql = executable(read(cleanupMigrationPath()))

  assert.match(sql, /refclassid = 'pg_proc'::regclass/, 'the pre-condition must inspect pg_depend')
  assert.match(sql, /v_dependents > 0/, 'the pre-condition must test for dependents')
  assert.match(sql, /RAISE\s+EXCEPTION/i, 'the guard must fail loudly')
})

test('its post-condition asserts all eight identities are gone', () => {
  const sql = executable(read(cleanupMigrationPath()))

  assert.match(
    sql,
    /v_remaining IS NOT NULL/,
    'the guard must fail when a target survives',
  )
  for (const name of ORPHANS) {
    assert.ok(sql.includes(`'${name}'`), `the guard must list ${name}`)
  }
})

test('it reloads the PostgREST schema cache', () => {
  const sql = executable(read(cleanupMigrationPath()))

  assert.match(sql, /NOTIFY\s+pgrst,\s*'reload schema'/, 'the removed functions must leave the cache')
})

test('it does not modify pgrst.schemas or tenant exposure', () => {
  const sql = executable(read(cleanupMigrationPath()))

  assert.ok(!/pgrst\.schemas/i.test(sql), 'pgrst.schemas must not be modified')
  assert.ok(!/ALTER\s+ROLE/i.test(sql), 'no role may be altered')
  assert.ok(!/pg_db_role_setting/i.test(sql), 'role settings must not be modified')
  assert.ok(!/entity_bigdrops/i.test(sql), 'no tenant schema may be touched')
})
