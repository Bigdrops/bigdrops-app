import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Contract guard for the public.remediate_accounting_gap overload repair.
 *
 * Two overloads exposed the same application argument-name set:
 *   (uuid, text, text)  — the canonical implementation
 *   (uuid, text, uuid)  — a conflicting stub
 *
 * PostgREST selects an overload by argument name. It cannot select
 * between two overloads that share an argument-name set, so the
 * application call failed with HTTP 300 PGRST203.
 *
 * These tests read repository artifacts only. They do not connect to
 * the database and they do not call accounting code.
 */

const root = process.cwd()
const MIGRATIONS_DIR = path.resolve(root, 'supabase/migrations')

const CANONICAL_MIGRATION = '20260906140000_accounting_remediation.sql'
const SERVICE = 'src/modules/accounting/remediationService.ts'

const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8').replace(/\r\n/g, '\n')

const CONFLICTING_IDENTITY = 'remediate_accounting_gap(uuid, text, uuid)'
const CANONICAL_IDENTITY = 'remediate_accounting_gap(uuid, text, text)'

function repairMigrationPath() {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /remediate_accounting_gap_overload_repair\.sql$/.test(name))
    .sort()

  assert.equal(
    matches.length,
    1,
    `expected exactly one remediate_accounting_gap overload repair migration, found ${matches.length}`,
  )

  return path.join('supabase/migrations', matches[0])
}

function code(sql) {
  // Strip line comments so assertions test executable SQL only.
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
}

test('the repair is a forward migration and the canonical migration is unchanged', () => {
  const repair = path.basename(repairMigrationPath())

  assert.ok(
    repair > CANONICAL_MIGRATION,
    `the repair must sort after the canonical migration: ${repair}`,
  )

  const canonical = read(path.join('supabase/migrations', CANONICAL_MIGRATION))

  assert.match(
    canonical,
    /CREATE OR REPLACE FUNCTION public\.remediate_accounting_gap\(\s*p_entity_id uuid,\s*p_source_type text,\s*p_source_id text\s*\)/,
    'the canonical migration must still declare the text-bearing implementation',
  )
  assert.ok(
    !canonical.includes('p_source_id uuid'),
    'the canonical migration must never have declared a uuid-bearing implementation',
  )
})

test('the repair drops the exact conflicting identity by complete argument-type list', () => {
  const sql = code(read(repairMigrationPath()))

  assert.ok(
    sql.includes(`DROP FUNCTION IF EXISTS public.${CONFLICTING_IDENTITY};`),
    'the repair must drop public.remediate_accounting_gap(uuid, text, uuid)',
  )
})

test('the repair cannot target the canonical identity', () => {
  const sql = code(read(repairMigrationPath()))

  const drops = sql.match(/DROP\s+FUNCTION\s+IF\s+EXISTS\s+[^;]+;/gi) ?? []
  assert.equal(drops.length, 1, `expected exactly one DROP FUNCTION, found ${drops.length}`)
  assert.ok(
    !drops.some((statement) => statement.includes(CANONICAL_IDENTITY)),
    'the canonical identity must never be dropped',
  )
})

test('the repair does not use CASCADE', () => {
  const sql = code(read(repairMigrationPath()))

  assert.ok(!/\bCASCADE\b/i.test(sql), 'the repair must not drop dependent objects')
})

test('the repair never creates or replaces any function', () => {
  const sql = code(read(repairMigrationPath()))

  assert.ok(
    !/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(sql),
    'the repair must not define or redefine any function',
  )
})

test('the repair does not reintroduce a uuid-bearing overload or a shim', () => {
  const sql = code(read(repairMigrationPath()))

  assert.ok(!/p_source_id\s+uuid/i.test(sql), 'no uuid-bearing overload may be created')

  const occurrences = sql.split(CONFLICTING_IDENTITY).length - 1
  assert.equal(
    occurrences,
    2,
    `the conflicting identity must appear only in the DROP and the guard (found ${occurrences})`,
  )

  for (const line of sql.split('\n')) {
    if (!line.includes(CONFLICTING_IDENTITY)) continue
    assert.ok(
      /DROP\s+FUNCTION|to_regprocedure/.test(line),
      `the conflicting identity must not be redefined: ${line.trim()}`,
    )
  }
})

test('the repair verifies its own post-condition', () => {
  const sql = code(read(repairMigrationPath()))

  assert.ok(
    sql.includes(`to_regprocedure('public.${CANONICAL_IDENTITY}') IS NULL`),
    'the repair must assert the canonical implementation still exists',
  )
  assert.ok(
    sql.includes(`to_regprocedure('public.${CONFLICTING_IDENTITY}') IS NOT NULL`),
    'the repair must assert the conflicting overload is gone',
  )
  assert.match(
    sql,
    /p\.proname = 'remediate_accounting_gap'[\s\S]*v_variants <> 1/,
    'the repair must assert exactly one remediate_accounting_gap remains',
  )
  assert.match(sql, /RAISE\s+EXCEPTION/i, 'the guard must fail loudly')
})

test('the repair reloads the PostgREST schema cache', () => {
  const sql = code(read(repairMigrationPath()))

  assert.match(
    sql,
    /NOTIFY\s+pgrst,\s*'reload schema'/,
    'the removed overload must be evicted from the PostgREST cache',
  )
})

test('the repair touches no notification RPC and no CPS RPC', () => {
  const sql = code(read(repairMigrationPath()))

  for (const untouched of [
    'resolve_notification',
    'upsert_notification',
    'save_invoice_with_items_transaction',
    'save_quotation_with_items_transaction',
    'apply_cps_item_feedback_transaction',
  ]) {
    assert.ok(!sql.includes(untouched), `the repair must not reference ${untouched}`)
  }
})

test('the application service still targets the canonical argument-name set', () => {
  const service = read(SERVICE)

  assert.match(
    service,
    /rpc\('remediate_accounting_gap',\s*\{[\s\S]*p_entity_id[\s\S]*p_source_type[\s\S]*p_source_id[\s\S]*\}\)/,
    'remediationService must call the canonical RPC with the three argument names',
  )
  assert.ok(
    !/p_source_id\s*:\s*[A-Za-z_$][\w$]*\s*as\s+/.test(service),
    'the service must not cast p_source_id to work around the database defect',
  )
})
