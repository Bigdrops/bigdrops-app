import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { searchDocuments } from '@/modules/search/documentSearchService'
import { searchResultSummary } from '@/domain/search/summary'

/**
 * Contract guard for the Document Search Platform (Phase 1 FEAT-001/002 + Phase 2 convergence).
 *
 * These tests read repository artifacts and exercise the service module.
 * They do not connect to the database and they do not call any remote function.
 *
 * Coverage:
 *   Tests  1–9   — original migration file structure (extension, index names, GIN keyword)
 *   Tests 10–18  — search_documents RPC contract, checked against the EFFECTIVE definition
 *   Tests 19–24  — provisioning, adapter changes, NOTIFY pgrst
 *   Tests 25–37  — convergence guards (normalisation, escaping, empty term, indexing,
 *                  dedup determinism, match_source completeness, installer hardening)
 *   Tests 38–44  — documentSearchService behaviour (has_more, short terms, filters, errors)
 *   Tests 45–62  — Phase 3 extension (rfq, cps, csr, waybill, receipt): additive migration,
 *                  per-type field coverage, JSONB and envelope extraction, clientless
 *                  scoping, routes, ranking bands, no AI/vector/item-library drift
 *   Tests 63–72  — Phase 3 UI contract: type and match-source unions, badges, the
 *                  search-active header summary, empty-state suppression, and
 *                  client-scoped search wired to the server
 *
 * The effective definition matters: 20261014100000 shipped the first draft and
 * 20261014120000 replaced it.  Asserting the RPC contract against the first draft
 * would pass while the deployed function behaved differently.
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

/**
 * The last migration that (re)defines the tenant search_documents RPC.
 * Whatever it contains is what running tenants actually execute.
 */
function latestRpcMigrationPath() {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .filter((name) =>
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+__SCHEMA__\.search_documents\s*\(/i.test(
        fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'),
      ),
    )

  assert.ok(matches.length >= 1, 'no migration defines __SCHEMA__.search_documents')

  return path.join('supabase/migrations', matches[matches.length - 1])
}

const effectiveRpcSql = () => read(latestRpcMigrationPath())

/** The effective $fn$ body of search_documents. */
function effectiveFnBody() {
  const match = effectiveRpcSql().match(/\$fn\$([\s\S]*?)\$fn\$/)
  assert.ok(match, 'could not locate $fn$ function body in the effective migration')
  return match[1]
}

/** The effective $b1$ block — the SQL that the installer writes into each tenant schema. */
function effectiveRpcBlock() {
  const match = effectiveRpcSql().match(/\$b1\$([\s\S]*?)\$b1\$/)
  assert.ok(match, 'could not locate $b1$ block in the effective migration')
  return match[1]
}

function adapterPath() {
  return 'src/config/moduleAdapters.ts'
}

// ─── Tests 1–9: original migration file structure ─────────────────────────────

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

// ─── Tests 10–18: search_documents RPC contract (effective definition) ────────

test('10: search_documents item queries do not reference item_id in WHERE clauses', () => {
  // Strip comments so the explanatory "-- item_id is intentionally absent" note
  // cannot satisfy or trip the guard.
  const fnBody = effectiveFnBody()
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')

  assert.ok(
    !/WHERE\b[^;]*\bitem_id\b/i.test(fnBody),
    'item_id must not appear in any WHERE clause inside search_documents — description is item_id-independent',
  )
})

test('11: search_documents supports client_id scoping via p_client_id parameter', () => {
  const fnBody = effectiveFnBody()

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
  const fnBody = effectiveFnBody()

  assert.match(
    fnBody,
    /DISTINCT\s+ON\s*\(\s*document_type\s*,\s*document_id\s*\)/i,
    'DISTINCT ON (document_type, document_id) must be used for deduplication',
  )
})

test('13: search_documents applies a LIMIT clause with p_limit parameter', () => {
  const fnBody = effectiveFnBody()

  assert.match(fnBody, /LIMIT\s+/i, 'search_documents must apply a LIMIT clause')
  assert.ok(fnBody.includes('p_limit'), 'LIMIT must reference p_limit parameter')
})

test('14: search_documents is declared LANGUAGE sql STABLE (not SECURITY DEFINER)', () => {
  const sql = executable(effectiveRpcSql())

  assert.match(
    sql,
    /LANGUAGE\s+sql\s+STABLE/i,
    'search_documents must be LANGUAGE sql STABLE',
  )
})

test('15: search_documents RPC does not use SECURITY DEFINER', () => {
  const fnDef = effectiveRpcBlock()

  assert.ok(
    !/SECURITY\s+DEFINER/i.test(fnDef),
    'search_documents must not use SECURITY DEFINER — caller-rights RLS applies',
  )
})

test('16: search_documents supports p_document_types filtering via ANY()', () => {
  const fnBody = effectiveFnBody()

  assert.match(
    fnBody,
    /p_document_types\s+IS\s+NULL\s+OR\s+document_type\s*=\s*ANY\s*\(\s*p_document_types\s*\)/i,
    'p_document_types filter must use IS NULL OR document_type = ANY(p_document_types)',
  )
})

test('17: search_documents ranks exact document number match at 1000', () => {
  const fnBody = effectiveFnBody()

  assert.match(
    fnBody,
    /[a-z]\.\w+_number\s+ILIKE\s+nd\.n\s+THEN\s+1000/i,
    'exact document number match must produce rank 1000',
  )
})

test('18: search_documents ranks item description substring match at 300', () => {
  const fnBody = effectiveFnBody()

  assert.match(
    fnBody,
    /coalesce\(\s*[a-z]+\s*\.\s*description\s*,\s*''\s*\)\s+ILIKE\s+'%'\s*\|\|\s*nd\.n\s*\|\|\s*'%'\s+THEN\s+300/i,
    'item description ILIKE match must produce rank 300 in the CASE expression',
  )
})

// ─── Tests 19–24: provisioning, adapters, NOTIFY ──────────────────────────────

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
  const sql = executable(effectiveRpcSql())
  assert.match(
    sql,
    /NOTIFY\s+pgrst,\s*'reload schema'/,
    "migration must end with NOTIFY pgrst, 'reload schema'",
  )
})

// ─── Tests 25–37: convergence guards ─────────────────────────────────────────

test('25: effective RPC normalises the term once with trim and lower', () => {
  const fnBody = effectiveFnBody()
  assert.match(
    fnBody,
    /lower\(\s*btrim\(\s*coalesce\(\s*p_term\s*,\s*''\s*\)\s*\)\s*\)/i,
    'a single normalised needle (lower + btrim + coalesce) must be computed from p_term',
  )
})

test('26: effective RPC never uses raw p_term in a predicate', () => {
  const fnBody = effectiveFnBody()
  const withoutComments = fnBody
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')

  assert.ok(
    !/'%'\s*\|\|\s*p_term\s*\|\|\s*'%'/.test(withoutComments),
    'substring predicates must use the normalised needle, not raw p_term',
  )
  assert.ok(
    !/p_term\s*\|\|\s*'%'/.test(withoutComments),
    'prefix predicates must use the normalised needle, not raw p_term',
  )
  assert.ok(
    !/ILIKES*[^\n]*p_term/i.test(withoutComments.replace(/coalesce\(\s*p_term\s*,\s*''\s*\)/gi, '')),
    'no ILIKE predicate may compare against raw p_term',
  )
})

test('27: effective RPC escapes LIKE metacharacters in user input', () => {
  const fnBody = effectiveFnBody()
  assert.match(
    fnBody,
    /replace\(\s*[a-z]+,\s*chr\(92\),\s*chr\(92\)\s*\|\|\s*chr\(92\)\s*\)/i,
    'backslash must be escaped first',
  )
  assert.match(
    fnBody,
    /chr\(92\)\s*\|\|\s*'%'/,
    'percent must be backslash-escaped',
  )
  assert.match(
    fnBody,
    /chr\(92\)\s*\|\|\s*'_'/,
    'underscore must be backslash-escaped',
  )
})

test('28: effective RPC produces no needle row for a blank term', () => {
  const fnBody = effectiveFnBody()
  assert.match(
    fnBody,
    /WHERE\s+raw\s*<>\s*''/i,
    'the needle relation must be empty when the term is blank',
  )
})

test('29: effective RPC never wraps a searched column in lower()', () => {
  const fnBody = executable(effectiveFnBody())
  assert.ok(
    !/lower\(\s*coalesce\(/i.test(fnBody),
    'lower() around a column makes the GIN trigram indexes unusable — ILIKE is already case-insensitive',
  )
  assert.ok(
    !/lower\(\s*[a-z]+\.\w+\s*\)/i.test(fnBody),
    'searched columns must be read directly so the trigram indexes apply',
  )
})

test('30: effective RPC cross joins the needle into every source CTE', () => {
  const fnBody = executable(effectiveFnBody())
  const joins = (fnBody.match(/CROSS\s+JOIN\s+needle\s+nd/gi) ?? []).length

  // Phase 3 extended the platform from 4 source CTEs to 12:
  //   quotation header, quotation items, invoice header, invoice items,
  //   rfq header, rfq items, cps header, cps rows, csr,
  //   waybill header, waybill JSONB items, receipt.
  // Every branch must consume the same normalised needle — a branch that
  // compares against raw p_term would reintroduce the phase-2 escaping bug.
  assert.equal(
    joins,
    12,
    'all twelve source CTEs must cross join the normalised needle',
  )
  assert.match(
    fnBody,
    /from\s+__SCHEMA__\.quotations\s+q\s*\n\s*CROSS\s+JOIN\s+needle\s+nd/i,
    'the quotation header CTE must join the needle before scanning quotations',
  )
})

test('31: effective RPC dedup has deterministic tie-breakers', () => {
  const fnBody = executable(effectiveFnBody())
  assert.match(
    fnBody,
    /ORDER\s+BY\s+document_type,\s*document_id,\s*match_rank\s+DESC,\s*match_source,\s*matched_text/i,
    'DISTINCT ON ordering must tie-break deterministically so the winning match is stable',
  )
})

test('32: effective RPC final ordering is deterministic', () => {
  const fnBody = executable(effectiveFnBody())
  assert.match(
    fnBody,
    /ORDER\s+BY\s+match_rank\s+DESC,\s*document_date\s+DESC\s+NULLS\s+LAST,\s*document_number,\s*document_id/i,
    'the result order must be fully deterministic',
  )
})

test('33: effective RPC header match_source mirrors the ranking precedence', () => {
  const fnBody = executable(effectiveFnBody())

  // match_source must resolve number, then title, then client — the same
  // precedence as match_rank — so the reported source of a document that
  // matches on both a title and a client name is the winning match.
  const sourceCase = fnBody.match(
    /CASE\s*\n\s*WHEN[^]*?THEN\s+'number'\s*\n\s*WHEN[^]*?THEN\s+'title'\s*\n\s*WHEN[^]*?THEN\s+'client'\s*\n\s*END\s+AS\s+match_source/i,
  )
  assert.ok(
    sourceCase,
    'match_source must be computed number → title → client, matching match_rank precedence',
  )

  // Within every match_source CASE, the present sources must appear in
  // precedence order.  Checking per CASE block keeps the comparison from
  // spanning unrelated CTEs.
  const precedence = ['number', 'title', 'client']
  const blocks = fnBody.match(/CASE[^]*?END\s+AS\s+match_source/gi) ?? []
  assert.ok(blocks.length >= 3, `expected several match_source CASE blocks, found ${blocks.length}`)

  for (const block of blocks) {
    const positions = precedence
      .map((source) => block.indexOf(`THEN '${source}'`))
      .filter((position) => position !== -1)

    assert.deepEqual(
      positions,
      [...positions].sort((a, b) => a - b),
      `match_source precedence must be number → title → client in block: ${block.slice(0, 120)}`,
    )
  }
})

test('34: effective installer refuses arbitrary schema names', () => {
  const sql = executable(effectiveRpcSql())
  assert.match(
    sql,
    /left\(\s*p_schema_name\s*,\s*7\s*\)\s*<>\s*'entity_'/i,
    'the installer must reject any schema that is not entity_* or tenant_master_template',
  )
  assert.match(
    sql,
    /RAISE\s+EXCEPTION[^;]*Refusing\s+to\s+install/i,
    'naming a disallowed schema must raise, not silently continue',
  )
})

test('35: effective installer revokes execute from api roles', () => {
  const sql = executable(effectiveRpcSql())
  for (const role of ['PUBLIC', 'anon', 'authenticated']) {
    assert.match(
      sql,
      new RegExp(
        `REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+public\\._prov_install_search\\s*\\(\\s*text\\s*\\)\\s+FROM\\s+${role}`,
        'i',
      ),
      `execute on the SECURITY DEFINER installer must be revoked from ${role}`,
    )
  }
})

test('36: effective installation never swallows tenant failures', () => {
  const sql = executable(effectiveRpcSql())

  assert.ok(
    !/EXCEPTION\s+WHEN\s+OTHERS/i.test(sql),
    'the backfill must not swallow arbitrary installation errors',
  )
  assert.match(
    sql,
    /FROM\s*\(VALUES\s*\(\s*'quotations'\s*\)/i,
    'incomplete tenant schemas must be classified by the tables they are missing',
  )
  assert.match(
    sql,
    /RAISE\s+WARNING\s+'document search skipped: schema %/i,
    'every skipped schema must be reported by name',
  )
})

test('37: effective installer indexes every searched column with a GIN trigram index', () => {
  const sql = read(latestRpcMigrationPath())

  const expected = [
    'idx_quotations_quotation_number_trgm',
    'idx_quotations_client_name_trgm',
    'idx_quotations_quotation_title_trgm',
    'idx_quotation_items_description_trgm',
    'idx_quotation_items_make_trgm',
    'idx_quotation_items_sub_description_trgm',
    'idx_invoices_invoice_number_trgm',
    'idx_invoices_client_name_trgm',
    'idx_invoices_invoice_title_trgm',
    'idx_invoice_items_description_trgm',
    'idx_invoice_items_make_trgm',
    'idx_invoice_items_sub_description_trgm',
  ]

  for (const name of expected) {
    assert.ok(sql.includes(name), `effective installer is missing GIN index: ${name}`)
  }
  assert.ok(
    (sql.match(/USING\s+GIN/gi) ?? []).length >= 12,
    'every searched column needs a GIN trigram index so each OR branch is indexable',
  )
})

// ─── Tests 38–44: documentSearchService behaviour ────────────────────────────

function resultRow(n) {
  return {
    document_type: 'quotation',
    document_id: `id-${n}`,
    document_number: `SASQUO-${n}`,
    title: null,
    client_id: null,
    client_name: 'Rex Forestry Ltd',
    document_date: '2026-01-01',
    match_source: 'client',
    matched_text: 'Rex Forestry Ltd',
    match_rank: 500,
    route: `/quotations/id-${n}`,
  }
}

/** Minimal TenantClient stub that records every rpc call. */
function stubClient(rows, { error = null } = {}) {
  const calls = []
  return {
    calls,
    client: {
      schemaName: 'entity_test',
      version: 'test',
      isReady: true,
      from: () => {
        throw new Error('the search service must not query tables directly')
      },
      rpc: (fn, params) => {
        calls.push({ fn, params })
        return Promise.resolve({ data: error ? null : rows, error })
      },
    },
  }
}

test('38: reports no further results when fewer rows than the limit arrive', async () => {
  const { client } = stubClient([resultRow(1), resultRow(2)])
  const response = await searchDocuments(client, { term: 'rex', limit: 50 })

  assert.equal(response.results.length, 2)
  assert.equal(response.has_more, false)
})

test('39: reports further results when the extra probe row arrives, and trims it', async () => {
  const rows = [resultRow(1), resultRow(2), resultRow(3)]
  const { client, calls } = stubClient(rows)
  const response = await searchDocuments(client, { term: 'rex', limit: 2 })

  assert.equal(calls[0].params.p_limit, 3, 'the service must request limit + 1 rows')
  assert.equal(response.results.length, 2, 'the probe row must not be returned to the caller')
  assert.equal(response.has_more, true)
})

test('40: exactly limit matches must not claim more results', async () => {
  const { client } = stubClient([resultRow(1), resultRow(2)])
  const response = await searchDocuments(client, { term: 'rex', limit: 2 })

  assert.equal(response.results.length, 2)
  assert.equal(
    response.has_more,
    false,
    'a full page is not proof that more rows exist — has_more must come from the extra probe row',
  )
})

test('41: defaults to a limit of 50 and probes for 51', async () => {
  const { client, calls } = stubClient([])
  await searchDocuments(client, { term: 'rex' })

  assert.equal(calls[0].fn, 'search_documents')
  assert.equal(calls[0].params.p_limit, 51)
})

test('42: a term shorter than two characters never reaches the RPC', async () => {
  const { client, calls } = stubClient([resultRow(1)])

  for (const term of ['', '   ', 'a', ' a ']) {
    const response = await searchDocuments(client, { term })
    assert.deepEqual(response, { results: [], has_more: false })
  }

  assert.equal(calls.length, 0, 'blank and single-character terms must short-circuit')
})

test('43: sends the trimmed term and forwards the filters', async () => {
  const { client, calls } = stubClient([])
  await searchDocuments(client, {
    term: '  Rex Forestry  ',
    document_types: ['quotation'],
    client_id: 'a59169a5-9017-447a-8c71-2233a6437188',
  })

  assert.equal(calls[0].params.p_term, 'Rex Forestry')
  assert.deepEqual(calls[0].params.p_document_types, ['quotation'])
  assert.equal(calls[0].params.p_client_id, 'a59169a5-9017-447a-8c71-2233a6437188')
})

test('44: sends null filters when none are supplied and surfaces RPC errors', async () => {
  const { client, calls } = stubClient([])
  await searchDocuments(client, { term: 'rex' })

  assert.equal(calls[0].params.p_document_types, null)
  assert.equal(calls[0].params.p_client_id, null)

  const failing = stubClient([], { error: { message: 'permission denied' } })
  await assert.rejects(
    () => searchDocuments(failing.client, { term: 'rex' }),
    /Search failed: permission denied/,
  )
})

// ─── Tests 45–62: Phase 3 — new document types ────────────────────────────────

function convergenceMigrationPath() {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /document_search_convergence\.sql$/.test(name))
    .sort()

  assert.equal(matches.length, 1, `expected one convergence migration, found ${matches.length}`)
  return path.join('supabase/migrations', matches[0])
}

function phase3MigrationPath() {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /document_search_phase3\.sql$/.test(name))
    .sort()

  assert.equal(
    matches.length,
    1,
    `expected exactly one phase 3 migration, found ${matches.length}: ${matches.join(', ')}`,
  )
  return path.join('supabase/migrations', matches[0])
}

const phase3Sql = () => read(phase3MigrationPath())

/**
 * The complete match_source vocabulary the extended RPC can report.
 * Derived from the effective function body; test 63 checks both directions.
 */
const PHASE3_MATCH_SOURCES = [
  'number',
  'reference_number',
  'client',
  'vendor',
  'title',
  'notes',
  'location',
  'equipment_type',
  'equipment',
  'item_description',
  'item_make',
  'item_sub_description',
  'item_notes',
  'specification',
  'section_title',
  'problem_reported',
  'service_rendered',
  'materials_used',
  'defects_found',
  'engineer_remarks',
]

test('45: phase 3 is a new additive migration and the phase 2 files are untouched', () => {
  const name = path.basename(phase3MigrationPath())
  assert.match(name, /^\d{14}_document_search_phase3\.sql$/, `unexpected filename: ${name}`)
  assert.ok(
    name > path.basename(searchMigrationPath()),
    'phase 3 must sort after the platform migration',
  )
  assert.ok(
    name > path.basename(convergenceMigrationPath()),
    'phase 3 must sort after the convergence repair',
  )

  // The already-applied migrations must not have been edited to carry the
  // extension — the change has to be additive to stay replayable.
  for (const migration of [searchMigrationPath(), convergenceMigrationPath()]) {
    const sql = executable(read(migration))
    for (const table of ['rfqs', 'rfq_items', 'cps_sheets', 'cps_rows', 'csrs', 'waybills', 'receipts']) {
      assert.ok(
        !sql.includes(table),
        `${path.basename(migration)} must not reference ${table} — phase 3 must be additive`,
      )
    }
  }
})

test('46: phase 3 indexes the high-value identifier columns only', () => {
  const sql = phase3Sql()

  const expected = [
    'idx_rfqs_rfq_number_trgm',
    'idx_rfqs_title_trgm',
    'idx_rfqs_vendor_name_trgm',
    'idx_cps_sheets_cps_number_trgm',
    'idx_cps_sheets_title_trgm',
    'idx_csrs_csr_number_trgm',
    'idx_waybills_waybill_number_trgm',
    'idx_receipts_receipt_number_trgm',
    'idx_receipts_invoice_number_trgm',
  ]

  for (const name of expected) {
    assert.ok(sql.includes(name), `phase 3 must create ${name}`)
  }

  // Free-text content columns of the new types are deliberately unindexed, and
  // the JSONB items column must not carry an unvalidated GIN index.
  assert.ok(
    !/idx_\w*service_rendered\w*trgm/.test(sql),
    'CSR free-text columns must not be given speculative trigram indexes',
  )
  assert.ok(
    !/USING\s+GIN\s*\(\s*items\b/i.test(sql),
    'the waybill JSONB column must not carry an unvalidated GIN index',
  )
})

test('47: phase 3 searches the real RFQ and CPS columns', () => {
  const fnBody = effectiveFnBody()

  for (const column of [
    'r.rfq_number',
    'r.title',
    'r.vendor_name',
    'r.client_name',
    'ri.description',
    'ri.specification',
    'ri.notes',
  ]) {
    assert.ok(fnBody.includes(column), `RFQ search must cover ${column}`)
  }

  for (const column of [
    's.cps_number',
    's.title',
    's.client_name',
    's.notes',
    'cr.description',
    "cr.cells->>'make_brand'",
    "cr.cells->>'specification'",
    'cr.section_title',
    'cr.notes',
  ]) {
    assert.ok(fnBody.includes(column), `CPS search must cover ${column}`)
  }
})

test('48: CPS pricing cells are never searched', () => {
  const fnBody = executable(effectiveFnBody())

  assert.ok(!/cells\s*->>\s*'cp'/.test(fnBody), 'cp is a pricing value and must not be searched')
  assert.ok(!/cells\s*->>\s*'sp'/.test(fnBody), 'sp is a pricing value and must not be searched')
  assert.ok(!/'cp'|'sp'/.test(fnBody), 'no pricing cell key may appear in the search predicates')
})

test('49: waybill item text is read from the JSONB description key, array-safe', () => {
  const fnBody = effectiveFnBody()

  assert.match(
    fnBody,
    /jsonb_array_elements\s*\(\s*CASE\s+WHEN\s+jsonb_typeof\s*\(\s*w\.items\s*\)\s*=\s*'array'/i,
    'items must be guarded so a non-array value cannot abort the whole search',
  )
  assert.match(
    fnBody,
    /item\s*->>\s*'description'/,
    'waybill item descriptions must be extracted explicitly, not by casting the whole object',
  )
})

test('50: waybill item metadata is never searched', () => {
  const fnBody = executable(effectiveFnBody())

  for (const key of ['qty', 'unit', 'condition']) {
    assert.ok(
      !new RegExp(`item\\s*->>\\s*'${key}'`).test(fnBody),
      `waybill item ${key} is metadata and must not be searched`,
    )
  }
})

test('51: CSR materials are searched through the extraction helper, never raw', () => {
  const fnBody = effectiveFnBody()

  assert.ok(
    fnBody.includes('_search_csr_materials'),
    'materials_used must be read through the envelope-aware helper',
  )

  const withoutComments = fnBody
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')

  assert.ok(
    !/coalesce\(\s*c\.materials_used\s*,/.test(withoutComments),
    'the raw materials_used column must never be matched or displayed',
  )
})

test('52: the CSR materials helper strips the envelope and cannot leak it', () => {
  const sql = phase3Sql()
  const match = sql.match(/\$mat\$([\s\S]*?)\$mat\$/)
  assert.ok(match, 'phase 3 must install the CSR materials helper')

  const helper = executable(match[1])

  assert.ok(helper.includes('__CSR_META_V1__'), 'the helper must recognise the envelope prefix')
  assert.ok(helper.includes('materialsText'), 'the rendered list is the preferred text')
  assert.ok(helper.includes('materialsRows'), 'the item names are the fallback text')
  assert.ok(
    !helper.includes('showOperationalReadings'),
    'the meta settings block must never be returned as searchable text',
  )
  assert.match(
    helper,
    /EXCEPTION\s+WHEN\s+invalid_text_representation/i,
    'a malformed envelope must be skipped (22P02), not raise and abort every search',
  )
  assert.ok(
    !/EXCEPTION\s+WHEN\s+others/i.test(sql),
    'no part of the migration may swallow arbitrary errors',
  )
})

test('53: a receipt reports its linked invoice number as reference_number', () => {
  const fnBody = effectiveFnBody()

  assert.match(
    fnBody,
    /coalesce\(\s*rc\.invoice_number\s*,\s*''\s*\)\s+ILIKE\s+'%'\s*\|\|\s*nd\.n\s*\|\|\s*'%'\s+THEN\s+'reference_number'/i,
    'the receipt branch must explain a linked invoice hit as reference_number',
  )
})

test('54: every new document type builds its real application route', () => {
  const fnBody = effectiveFnBody()

  for (const route of ["'/rfqs/'", "'/cost-pricing-sheets/'", "'/csr/'", "'/waybills/'", "'/receipts/'"]) {
    assert.ok(fnBody.includes(`${route} ||`), `search_documents must build the ${route} route`)
  }
})

test('55: the application declares a view route for every searchable type', () => {
  const shell = read('src/components/app/AppShell.tsx')

  for (const route of [
    '/quotations/:id',
    '/invoices/:id',
    '/rfqs/:id',
    '/cost-pricing-sheets/:id',
    '/csr/:id',
    '/waybills/:id',
    '/receipts/:id',
  ]) {
    assert.ok(shell.includes(`path="${route}"`), `AppShell must declare ${route}`)
  }
})

test('56: rfq and cps are skipped entirely under a client scope', () => {
  const fnBody = effectiveFnBody()

  // rfqs and cps_sheets declare no client_id column.  Matching a client by
  // comparing a name would invent a relationship the schema does not declare.
  const scoped = (fnBody.match(/p_client_id\s+IS\s+NULL\s+OR/gi) ?? []).length
  const clientless = (fnBody.match(/AND\s+p_client_id\s+IS\s+NULL/gi) ?? []).length

  assert.equal(scoped, 8, 'every client_id-bearing branch must filter on client_id')
  assert.equal(clientless, 4, 'the four rfq/cps branches must be excluded when a client is given')

  for (const cte of ['rfq_header AS (', 'rfq_items AS (', 'cps_header AS (', 'cps_rows AS (']) {
    const start = fnBody.indexOf(cte)
    assert.ok(start !== -1, `could not locate ${cte}`)
    const block = fnBody.slice(start, fnBody.indexOf('\n),\n', start))
    assert.ok(
      block.includes('AND p_client_id IS NULL'),
      `${cte.trim()} has no client_id and must be skipped when scoped`,
    )
  }
})

test('57: csr, waybill and receipt scope to client_id on the server', () => {
  const fnBody = effectiveFnBody()

  for (const alias of ['c', 'w', 'rc']) {
    assert.ok(
      new RegExp(`p_client_id\\s+IS\\s+NULL\\s+OR\\s+${alias}\\.client_id\\s*=\\s*p_client_id`).test(
        fnBody,
      ),
      `${alias}.client_id must be filtered server-side`,
    )
  }
})

test('58: the new types reuse the shared ranking bands', () => {
  const fnBody = effectiveFnBody()

  for (const band of [1000, 900, 800, 750, 650, 500, 400, 300, 250, 200]) {
    assert.ok(new RegExp(`THEN\\s+${band}\\b`).test(fnBody), `rank band ${band} must still be in use`)
  }

  const rfq = fnBody.slice(fnBody.indexOf('rfq_header AS ('), fnBody.indexOf('rfq_items AS ('))
  assert.ok(rfq.includes('750') && rfq.includes('650'), 'the rfq header must use the title bands')
})

test('59: no AI, vector or external search infrastructure is introduced', () => {
  const sql = executable(phase3Sql()).toLowerCase()

  for (const forbidden of [
    'pgvector',
    'embedding',
    'elasticsearch',
    'meilisearch',
    'typesense',
    'algolia',
    'redis',
  ]) {
    assert.ok(!sql.includes(forbidden), `phase 3 must not introduce ${forbidden}`)
  }
})

test('60: the new branches introduce no item library dependency', () => {
  const fnBody = executable(effectiveFnBody())

  assert.ok(
    !/WHERE\b[^;]*\bitem_id\b/i.test(fnBody),
    'item_id must not appear in any WHERE clause — search reads original source data',
  )
})

test('61: incomplete schemas are still skipped and named, now against the wider table set', () => {
  const sql = executable(phase3Sql())

  for (const table of [
    "('rfqs')",
    "('rfq_items')",
    "('cps_sheets')",
    "('cps_rows')",
    "('csrs')",
    "('waybills')",
    "('receipts')",
  ]) {
    assert.ok(sql.includes(table), `the eligibility check must require ${table}`)
  }

  assert.match(
    sql,
    /RAISE\s+WARNING\s+'document search skipped: schema %/i,
    'every skipped schema must still be reported by name',
  )
  assert.ok(
    !/EXCEPTION\s+WHEN\s+OTHERS/i.test(sql),
    'a valid tenant must never be skipped silently',
  )
})

test('62: the extension reaches future tenants through the provisioning path', () => {
  const sql = executable(phase3Sql())

  assert.match(
    sql,
    /_prov_install_search\(\s*'tenant_master_template'\s*\)/,
    'phase 3 must reinstall into tenant_master_template so future tenants inherit it',
  )

  const block = effectiveRpcBlock()
  assert.ok(
    block.includes('_search_csr_materials'),
    'the CSR materials helper must be part of the installed tenant body',
  )
  assert.match(
    sql,
    /to_regprocedure\(/,
    'the installer must verify that the function it just created exists',
  )
  assert.match(
    sql,
    /RAISE\s+EXCEPTION\s+'search_documents was not created in schema %'/i,
    'a missing function must fail loudly rather than leave a tenant without search',
  )
})

// ─── Tests 63–72: Phase 3 UI contract ────────────────────────────────────────

test('63: the DocumentType union covers all seven searchable types', () => {
  const src = read('src/domain/search/types.ts')

  for (const type of ['quotation', 'invoice', 'rfq', 'cps', 'csr', 'waybill', 'receipt']) {
    assert.ok(
      new RegExp(`\\|\\s*'${type}'`).test(src),
      `DocumentType must include '${type}'`,
    )
  }
})

test('64: every match_source the RPC emits exists in the MatchSource union', () => {
  const fnBody = effectiveFnBody()
  const src = read('src/domain/search/types.ts')

  for (const source of PHASE3_MATCH_SOURCES) {
    assert.ok(
      new RegExp(`THEN\\s+'${source}'`).test(fnBody),
      `the extended RPC must be able to emit match_source '${source}'`,
    )
    assert.ok(
      src.includes(`'${source}'`),
      `MatchSource must include '${source}' so a result can explain its match`,
    )
  }
})

test('65: every match source and document type has a display label', () => {
  const src = read('src/components/search/DocumentSearchResults.tsx')

  assert.match(
    src,
    /Record<MatchSource,\s*string>/,
    'the label map must be typed over MatchSource so a new source cannot go unlabelled',
  )
  assert.match(
    src,
    /Record<DocumentType,\s*string>/,
    'the badge map must be typed over DocumentType so a new type cannot go unlabelled',
  )

  for (const source of PHASE3_MATCH_SOURCES) {
    assert.ok(
      new RegExp(`^\\s*${source}:`, 'm').test(src),
      `MATCH_SOURCE_LABELS must label '${source}'`,
    )
  }

  for (const type of ['quotation', 'invoice', 'rfq', 'cps', 'csr', 'waybill', 'receipt']) {
    assert.ok(
      new RegExp(`^\\s*${type}:\\s*'`, 'm').test(src),
      `DOC_TYPE_LABELS must label '${type}'`,
    )
  }
})

test('66: the search-active header summary never reports a stale list total', () => {
  assert.equal(searchResultSummary(0, false, true), 'Searching...')
  assert.equal(searchResultSummary(0, false, false), 'No results')
  assert.equal(searchResultSummary(1, false, false), '1 result')
  assert.equal(searchResultSummary(3, false, false), '3 results')
  assert.equal(searchResultSummary(3, true, false), '3+ results')
  assert.ok(
    !/quotations total|invoices?\b/.test(searchResultSummary(12, false, false)),
    'the summary must describe the search results, never the normal list',
  )
})

test('67: ModuleShell hides the empty state when one is explicitly suppressed', () => {
  const src = read('src/components/layout/ModuleShell.tsx')

  assert.match(
    src,
    /emptyState\s*===\s*undefined\s*\?/,
    'an explicit null must be distinguished from an absent emptyState',
  )
  assert.ok(
    !/emptyState\s*\|\|\s*\(/.test(src),
    'the || fallback let a null emptyState render the default "No X found" under search results',
  )
})

test('68: both list screens describe the search results while a search is active', () => {
  for (const file of [
    'src/components/quotation/QuotationList.tsx',
    'src/pages/Invoices.tsx',
  ]) {
    const src = read(file)
    assert.match(
      src,
      /isSearchActive\s*\n\s*\?\s*searchResultSummary\(/,
      `${file} must show the search result count, not the list total, while searching`,
    )
  }
})

test('69: both list screens suppress the normal list and its empty state during search', () => {
  for (const file of [
    'src/components/quotation/QuotationList.tsx',
    'src/pages/Invoices.tsx',
  ]) {
    const src = read(file)
    assert.match(
      src,
      /records=\{isSearchActive\s*\?\s*\[\]\s*:/,
      `${file} must not render the normal list under search results`,
    )
    assert.match(
      src,
      /emptyState=\{isSearchActive\s*\?\s*null\s*:/,
      `${file} must suppress the normal empty state during search`,
    )
  }
})

test('70: the client workspace passes client_id to the server-side search', () => {
  const component = read('src/components/client/workspace/ClientDocumentSearch.tsx')

  assert.match(
    component,
    /useDocumentSearch\(\{\s*client_id:\s*clientId\s*\}\)/,
    'the client scope must be handed to the shared search authority',
  )
  assert.ok(
    component.includes('DocumentSearchResults'),
    'client results must render through the shared results component',
  )
  assert.ok(
    !/\.from\(/.test(component),
    'client search must not query tables directly and filter in React',
  )
  assert.ok(
    !/\.filter\(/.test(component),
    'results must not be filtered in the browser',
  )

  const page = read('src/pages/ClientDetail.tsx')
  assert.ok(page.includes('<ClientDocumentSearch'), 'the workspace must render the scoped search')
  assert.match(page, /clientId=\{id \?\? null\}/, 'the client id must come from the route')
})

test('71: client-scoped results navigate to the original document route', () => {
  const component = read('src/components/client/workspace/ClientDocumentSearch.tsx')

  assert.match(
    component,
    /onNavigate=\{\(result\)\s*=>\s*onNavigate\(result\.route\)\}/,
    'a result must open the document the server said it is',
  )

  const page = read('src/pages/ClientDetail.tsx')
  assert.match(
    page,
    /onNavigate=\{\(route\)\s*=>\s*navigate\(route\)\}/,
    'the workspace must navigate to the route the search authority built',
  )
})

test('72: the workspace content is hidden, not duplicated, while searching', () => {
  const component = read('src/components/client/workspace/ClientDocumentSearch.tsx')

  const activeStart = component.indexOf('{active ? (')
  assert.notEqual(activeStart, -1, 'the component must branch on whether a search is active')

  const elseStart = component.indexOf(') : (', activeStart)
  assert.notEqual(elseStart, -1, 'the workspace content must be the inactive branch')

  const activeBranch = component.slice(activeStart, elseStart)
  const inactiveBranch = component.slice(elseStart)

  assert.ok(
    activeBranch.includes('<DocumentSearchResults'),
    'the active branch must render the shared search results',
  )
  assert.ok(
    !activeBranch.includes('children') && !inactiveBranch.includes('<DocumentSearchResults'),
    'the workspace history must never render beside the search results',
  )
  assert.ok(
    inactiveBranch.includes('children'),
    'the workspace history must render only when no search is active',
  )
})
