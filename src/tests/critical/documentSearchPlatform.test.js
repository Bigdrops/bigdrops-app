import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Contract guard for the Document Search Platform (Phase 1 / FEAT-001 + FEAT-002).
 *
 * These tests read repository artifacts only.
 * They do not connect to the database and they do not call any function.
 *
 * Coverage:
 *   Tests  1–9   — migration file structure (extension, index names, GIN keyword)
 *   Tests 10–16  — search_documents RPC contract (item_id absence, client_id scoping,
 *                  DISTINCT ON dedup, LIMIT, no SECURITY DEFINER, LANGUAGE sql STABLE)
 *   Tests 17–24  — ranking values, provisioning, adapter changes, NOTIFY pgrst
 */

const root = process.cwd()
const MIGRATIONS_DIR = path.resolve(root, 'supabase/migrations')

// ─── Helpers ──────────────────────────────────────────────────────────────────

const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8').replace(/\r\n/g, '\n')

/** Strip single-line SQL comments so patterns cannot accidentally be comment-text. */
const executable = (sql) =>
  sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')

function searchMigrationPath() {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /document_search_platform\.sql$/.test(name))
    .sort()

  assert.equal(
    matches.length,
    1,
    `expected exactly one document_search_platform migration, found ${matches.length}: ${matches.join(', ')}`,
  )

  return path.join('supabase/migrations', matches[0])
}

function adapterPath() {
  return 'src/config/moduleAdapters.ts'
}

// ─── Tests 1–9: Migration file structure ──────────────────────────────────────

test('1: document_search_platform migration is a .sql file with a valid timestamp prefix', () => {
  const name = path.basename(searchMigrationPath())
  assert.match(name, /^\d{14}_document_search_platform\.sql$/, `unexpected filename: ${name}`)
})

test('2: migration timestamp sorts after the prior migration', () => {
  const name = path.basename(searchMigrationPath())
  // Must sort after 20261006150000_remove_orphan_public_diagnostic_functions.sql
  assert.ok(
    name > '20261006150000_remove_orphan_public_diagnostic_functions.sql',
    `migration must sort after the prior cleanup: ${name}`,
  )
})

test('3: migration enables pg_trgm extension', () => {
  const sql = executable(read(searchMigrationPath()))
  assert.match(
    sql,
    /CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+pg_trgm/i,
    'migration must contain CREATE EXTENSION IF NOT EXISTS pg_trgm',
  )
})

test('4: migration declares all six expected GIN index names', () => {
  const sql = read(searchMigrationPath())

  const expectedIndexNames = [
    'idx_quotations_quotation_title_trgm',
    'idx_quotation_items_description_trgm',
    'idx_quotation_items_make_trgm',
    'idx_invoices_invoice_title_trgm',
    'idx_invoice_items_description_trgm',
    'idx_invoice_items_make_trgm',
  ]

  for (const name of expectedIndexNames) {
    assert.ok(sql.includes(name), `migration is missing GIN index: ${name}`)
  }
})

test('5: migration uses GIN keyword for every trigram index', () => {
  const sql = read(searchMigrationPath())
  // All six target columns must appear with USING GIN
  assert.match(sql, /USING\s+GIN/i, 'migration must create at least one GIN index')
  // Count occurrences — at least 6 expected
  const ginCount = (sql.match(/USING\s+GIN/gi) ?? []).length
  assert.ok(ginCount >= 6, `expected at least 6 USING GIN clauses, found ${ginCount}`)
})

test('6: migration does not use CREATE INDEX CONCURRENTLY', () => {
  const sql = executable(read(searchMigrationPath()))
  assert.ok(
    !/CREATE\s+INDEX\s+CONCURRENTLY/i.test(sql),
    'CONCURRENTLY is unsafe inside supabase db push transactions — must not be used',
  )
})

test('7: migration creates the _prov_install_search helper function', () => {
  const sql = executable(read(searchMigrationPath()))
  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\._prov_install_search\s*\(/i,
    'migration must define public._prov_install_search()',
  )
})

test('8: migration installs search into tenant_master_template with an existence guard', () => {
  const sql = executable(read(searchMigrationPath()))
  assert.ok(
    sql.includes('tenant_master_template'),
    'migration must reference tenant_master_template',
  )
  assert.match(
    sql,
    /_prov_install_search\s*\(\s*'tenant_master_template'\s*\)/,
    'migration must call _prov_install_search for tenant_master_template',
  )
})

test('9: migration backfills entity_* schemas with a LIKE filter on pg_namespace', () => {
  const sql = executable(read(searchMigrationPath()))
  assert.match(
    sql,
    /nspname\s+LIKE\s+'entity\\_%'/,
    "backfill DO block must iterate pg_namespace WHERE nspname LIKE 'entity\\_%'",
  )
  assert.match(
    sql,
    /_prov_install_search\s*\(\s*v_schema\s*\)/,
    'backfill DO block must call _prov_install_search(v_schema)',
  )
})

// ─── Tests 10–16: search_documents RPC contract ───────────────────────────────

test('10: search_documents item queries do not reference item_id in WHERE clauses', () => {
  const sql = read(searchMigrationPath())

  // Extract the search_documents function body — everything between $fn$ delimiters
  const fnBodyMatch = sql.match(/\$fn\$([\s\S]*?)\$fn\$/)
  assert.ok(fnBodyMatch, 'could not locate $fn$ function body in migration')

  // Strip single-line SQL comments from the extracted body before checking,
  // so that comment-only references to item_id (e.g. "-- item_id intentionally...") don't trip this guard.
  const fnBody = fnBodyMatch[1]
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')

  // item_id must not appear in any WHERE clause within the executable function body.
  // We split on WHERE keywords and check each clause fragment — item_id must not
  // appear as an executable expression (not in a comment) in any WHERE clause.
  assert.ok(
    !/WHERE\b[^;]*\bitem_id\b/i.test(fnBody),
    'item_id must not appear in any WHERE clause inside search_documents — description is item_id-independent',
  )
})

test('11: search_documents supports client_id scoping via p_client_id parameter', () => {
  const sql = read(searchMigrationPath())
  const fnBodyMatch = sql.match(/\$fn\$([\s\S]*?)\$fn\$/)
  assert.ok(fnBodyMatch, 'could not locate $fn$ function body')
  const fnBody = fnBodyMatch[1]

  assert.ok(
    fnBody.includes('p_client_id'),
    'search_documents must accept and apply a p_client_id parameter',
  )
  assert.match(
    fnBody,
    /p_client_id\s+IS\s+NULL\s+OR/i,
    'p_client_id filter must use IS NULL OR pattern to allow unrestricted search',
  )
})

test('12: search_documents uses DISTINCT ON for deduplication', () => {
  const sql = read(searchMigrationPath())
  const fnBodyMatch = sql.match(/\$fn\$([\s\S]*?)\$fn\$/)
  assert.ok(fnBodyMatch, 'could not locate $fn$ function body')
  const fnBody = fnBodyMatch[1]

  assert.match(
    fnBody,
    /DISTINCT\s+ON\s*\(\s*document_type\s*,\s*document_id\s*\)/i,
    'DISTINCT ON (document_type, document_id) must be used for deduplication',
  )
})

test('13: search_documents applies a LIMIT clause with p_limit parameter', () => {
  const sql = read(searchMigrationPath())
  const fnBodyMatch = sql.match(/\$fn\$([\s\S]*?)\$fn\$/)
  assert.ok(fnBodyMatch, 'could not locate $fn$ function body')
  const fnBody = fnBodyMatch[1]

  assert.match(
    fnBody,
    /LIMIT\s+/i,
    'search_documents must apply a LIMIT clause',
  )
  assert.ok(
    fnBody.includes('p_limit'),
    'LIMIT must reference p_limit parameter',
  )
})

test('14: search_documents is declared LANGUAGE sql STABLE (not SECURITY DEFINER)', () => {
  const sql = executable(read(searchMigrationPath()))

  // The search_documents body contains LANGUAGE sql STABLE
  assert.match(
    sql,
    /LANGUAGE\s+sql\s+STABLE/i,
    'search_documents must be LANGUAGE sql STABLE',
  )
})

test('15: search_documents RPC does not use SECURITY DEFINER', () => {
  const sql = read(searchMigrationPath())

  // Extract only the search_documents function definition (inside $b1$ ... $b1$)
  const fnDefMatch = sql.match(/\$b1\$([\s\S]*?)\$b1\$/)
  assert.ok(fnDefMatch, 'could not locate $b1$ function body block in migration')
  const fnDef = fnDefMatch[1]

  assert.ok(
    !/SECURITY\s+DEFINER/i.test(fnDef),
    'search_documents must not use SECURITY DEFINER — caller-rights RLS applies',
  )
})

test('16: search_documents supports p_document_types filtering via ANY()', () => {
  const sql = read(searchMigrationPath())
  const fnBodyMatch = sql.match(/\$fn\$([\s\S]*?)\$fn\$/)
  assert.ok(fnBodyMatch, 'could not locate $fn$ function body')
  const fnBody = fnBodyMatch[1]

  assert.match(
    fnBody,
    /p_document_types\s+IS\s+NULL\s+OR\s+document_type\s*=\s*ANY\s*\(\s*p_document_types\s*\)/i,
    'p_document_types filter must use IS NULL OR document_type = ANY(p_document_types)',
  )
})

// ─── Tests 17–24: Ranking, provisioning, adapter changes, NOTIFY ─────────────

test('17: search_documents ranks exact document number match at 1000', () => {
  const sql = read(searchMigrationPath())
  const fnBodyMatch = sql.match(/\$fn\$([\s\S]*?)\$fn\$/)
  assert.ok(fnBodyMatch, 'could not locate $fn$ function body')
  const fnBody = fnBodyMatch[1]

  // Should have THEN 1000 for the exact number match case
  assert.match(
    fnBody,
    /lower\s*\(\s*[qi]\.\w+_number\s*\)\s*=\s*\(SELECT n FROM needle\)\s*THEN\s*1000/i,
    'exact document number match must produce rank 1000',
  )
})

test('18: search_documents ranks item description substring match at 300', () => {
  const sql = read(searchMigrationPath())
  const fnBodyMatch = sql.match(/\$fn\$([\s\S]*?)\$fn\$/)
  assert.ok(fnBodyMatch, 'could not locate $fn$ function body')
  const fnBody = fnBodyMatch[1]

  // The q_items/i_items CASE expression must assign rank 300 to an ILIKE match on description.
  // Actual pattern: lower(coalesce(qi.description,'')) ILIKE ... THEN 300
  // Uses [\s\S]{1,120} to allow whitespace / p_term between ILIKE and THEN.
  assert.match(
    fnBody,
    /description[^)]*\)\)\s+ILIKE[\s\S]{1,120}THEN\s+300/i,
    "item description ILIKE match must produce rank 300 in the CASE expression",
  )
})

test('19: provision_entity body calls _prov_install_search', () => {
  const sql = executable(read(searchMigrationPath()))
  assert.match(
    sql,
    /_prov_install_search\s*\(\s*v_schema_name\s*\)/,
    'provision_entity must call _prov_install_search(v_schema_name)',
  )
})

test('20: provision_entity is redefined as CREATE OR REPLACE FUNCTION in the migration', () => {
  const sql = executable(read(searchMigrationPath()))
  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.provision_entity\s*\(/i,
    'migration must redefine public.provision_entity',
  )
})

test('21: quotationsAdapter selects quotation_title in its SELECT string', () => {
  const src = read(adapterPath())
  // Confirm quotation_title appears in the .select() call within the quotations fetcher
  assert.ok(
    src.includes('quotation_title'),
    'quotationsAdapter must select quotation_title',
  )
})

test('22: quotationsAdapter includes quotation_title in the ILIKE OR filter', () => {
  const src = read(adapterPath())
  assert.match(
    src,
    /quotation_title\.ilike\.\%\$\{term\}\%/,
    'quotationsAdapter OR filter must include quotation_title.ilike.%${term}%',
  )
})

test('23: invoicesAdapter includes invoice_title in the ILIKE OR filter', () => {
  const src = read(adapterPath())
  assert.match(
    src,
    /invoice_title\.ilike\.\%\$\{term\}\%/,
    'invoicesAdapter OR filter must include invoice_title.ilike.%${term}%',
  )
})

test('24: migration reloads the PostgREST schema cache via NOTIFY pgrst', () => {
  const sql = executable(read(searchMigrationPath()))
  assert.match(
    sql,
    /NOTIFY\s+pgrst,\s*'reload schema'/,
    "migration must end with NOTIFY pgrst, 'reload schema'",
  )
})
