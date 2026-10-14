import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { searchDocuments } from '@/modules/search/documentSearchService'

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

  assert.equal(
    joins,
    4,
    'quotation header, quotation items, invoice header and invoice items must all cross join the needle',
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
