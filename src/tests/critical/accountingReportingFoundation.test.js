import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))

const migrationPath = path.join(here, '../../../supabase/migrations/20260908100000_accounting_reporting_foundation.sql')
const servicePath = path.join(here, '../../modules/accounting/reportingService.ts')
const domainPath = path.join(here, '../../domain/accounting/reporting.ts')
const indexPath = path.join(here, '../../domain/accounting/index.ts')

const migrationSql = readFileSync(migrationPath, 'utf8')
const serviceSource = readFileSync(servicePath, 'utf8')
const domainSource = readFileSync(domainPath, 'utf8')
const indexSource = readFileSync(indexPath, 'utf8')

// Comments are stripped so documentation wording cannot trip the scans.
// A whitespace-normalized variant keeps assertions independent of the
// migration's aligned formatting.
const sqlNoComments = migrationSql.replace(/^\s*--.*$/gm, '')
const sqlNormalized = sqlNoComments.replace(/\s+/g, ' ')

// ── Safety: the derivation never mutates accounting state ──

test('reporting migration is read-only: no INSERT, UPDATE, or DELETE statements', () => {
  assert.ok(!/\bINSERT\s+INTO\b/i.test(sqlNoComments), 'migration must not contain INSERT INTO')
  assert.ok(!/\bUPDATE\b/i.test(sqlNoComments), 'migration must not contain UPDATE')
  assert.ok(!/\bDELETE\s+FROM\b/i.test(sqlNoComments), 'migration must not contain DELETE FROM')
})

test('reporting migration persists nothing: no table, index, or materialized view is created', () => {
  assert.ok(!/CREATE\s+TABLE/i.test(sqlNoComments), 'no new table is added')
  assert.ok(!/CREATE\s+INDEX/i.test(sqlNoComments), 'no new index is added')
  assert.ok(!/MATERIALIZED/i.test(sqlNoComments), 'no cached/materialized aggregate is introduced')
  assert.ok(!/\bALTER\s+TABLE\b/i.test(sqlNoComments), 'no column is added to any existing table')
})

test('reporting never calls the posting kernel or the source boundary lifecycle', () => {
  for (const forbidden of [
    'post_accounting_entry',
    'post_from_source_transaction',
    'ingest_source_transaction',
    'confirm_source_transaction',
    'record_payment_transaction',
    'remediate_accounting_gap',
  ]) {
    assert.ok(!sqlNoComments.includes(forbidden), `must not call ${forbidden}`)
  }
})

test('reporting stays inside the accounting domain: no operational or tax tables are read', () => {
  for (const table of ['invoices', 'invoice_items', 'payments', 'tax_input_entries', 'source_transactions']) {
    assert.ok(!new RegExp(`\\b${table}\\b`).test(sqlNoComments), `must not reference ${table}`)
  }
})

// ── Entity isolation and permission gating ──

test('derivation resolves the entity schema and gates on journal/view', () => {
  assert.ok(migrationSql.includes('_prov_get_schema_name(p_entity_id)'))
  assert.ok(migrationSql.includes("has_entity_permission(p_entity_id, auth.uid(), 'journal', 'view')"))
})

test('every table reference is schema-qualified; no bare table access', () => {
  for (const table of ['journal_lines', 'journal_entries', 'accounting_periods', 'accounting_accounts']) {
    assert.ok(migrationSql.includes(`%I.${table}`), `${table} must be schema-qualified via %I`)
    assert.ok(
      !new RegExp(`\\bFROM\\s+${table}\\b`).test(sqlNoComments),
      `${table} must never be referenced without the entity schema`,
    )
  }
})

// ── Scope selection: posted only, active entries only (spec 9.1, 9.6) ──

test('posted-only rule is literal: draft entries contribute nothing', () => {
  assert.ok(migrationSql.includes("je.status = 'posted'"))
  // Exactly one draft gate exists: the surfaced residue check.
  const draftGates = sqlNoComments.match(/je\.status\s*=\s*'draft'/g) ?? []
  assert.equal(draftGates.length, 1, 'draft may appear only in the residue count')
})

test('active-entry rule: every active set excludes entries reversed by a posted reversal', () => {
  // The probe direction is the v1.1 rule: the ORIGINAL (je) is excluded
  // when a posted reversal (r) points at it. The reversal itself stays
  // active unless subsequently reversed.
  const probes = sqlNoComments.match(/r\.reversal_of_entry_id\s*=\s*je\.id/g) ?? []
  assert.ok(probes.length >= 5, 'the reversal probe must guard every active set')
  assert.ok(!sqlNoComments.includes('je.reversal_of_entry_id = r.id'), 'exclusion must never target the reversal entry')
  const postedReversals = sqlNoComments.match(/r\.status\s*=\s*'posted'/g) ?? []
  assert.ok(postedReversals.length >= 5, 'only a posted reversal excludes an original')
})

test('no partial-reversal behavior is invented', () => {
  assert.ok(!/partial/i.test(sqlNoComments.replace(/no partial reversal/gi, '')))
})

// ── Sign convention and exactness (spec 9.2, 9.7) ──

test('debit and credit totals come from side-filtered NUMERIC sums; net = debit - credit', () => {
  assert.ok(sqlNoComments.includes("SUM(l.amount) FILTER (WHERE l.side = 'debit')"))
  assert.ok(sqlNoComments.includes("SUM(l.amount) FILTER (WHERE l.side = 'credit')"))
  assert.ok(sqlNoComments.includes('(debits - credits)::text'))
})

test('all monetary values cross the boundary as exact text', () => {
  for (const cast of [
    'debits::text',
    'credits::text',
    'opening_net::text',
    'grand_debits::text',
    'grand_credits::text',
  ]) {
    assert.ok(migrationSql.includes(cast), `${cast} must exist`)
  }
})

// ── Period totals, opening and closing chains (spec 9.4) ──

test('opening and closing chains run over the full period x account grid in verified period order', () => {
  assert.ok(migrationSql.includes('ORDER BY ap.start_date, ap.period_code'))
  assert.ok(migrationSql.includes('UNBOUNDED PRECEDING AND 1 PRECEDING'))
  assert.ok(migrationSql.includes('CROSS JOIN %I.accounting_accounts'))
  assert.ok(sqlNoComments.includes('opening_net + debits - credits'))
})

test('the verified ordering key is (start_date, code): deterministic total order', () => {
  assert.ok(migrationSql.includes('ORDER BY t.start_date, t.period_code, t.account_code'))
  assert.ok(migrationSql.includes('ORDER BY p.start_date, p.code'))
})

test('the optional period bound is inclusive and caps the derivation', () => {
  assert.ok(migrationSql.includes('(p.start_date, p.code) <= (%L::date, %L)'))
  assert.ok(migrationSql.includes('p_period_id'))
  const boundUses = sqlNoComments.match(/v_bound_filter/g) ?? []
  assert.ok(boundUses.length >= 7, 'the bound must cap every derivation block')
  assert.ok(migrationSql.includes('unknown accounting period'))
})

// ── Trial balance assertion (spec 9.5) ──

test('trial balance asserts grand debit = grand credit and surfaces mismatch as data', () => {
  assert.ok(sqlNoComments.includes('(SUM(debits) = SUM(credits))'))
  assert.ok(sqlNormalized.includes("'grand_debits', g.grand_debits::text"))
  assert.ok(sqlNormalized.includes("'grand_credits', g.grand_credits::text"))
  assert.ok(sqlNormalized.includes("'is_equal', g.is_equal"))
  assert.ok(!sqlNoComments.includes('is_balanced'), 'no per-account equality assertion exists')
})

// ── Traceability (spec 11) ──

test('every derived figure keeps journal provenance: the trace carries entry, period, source, and reversal links', () => {
  for (const key of [
    'AS entry_id',
    'AS period_id',
    'AS period_code',
    'AS transaction_date',
    // source_type / source_id are bare column references: the journal
    // column names carry into the jsonb keys unchanged.
    'je.source_type',
    'je.source_id',
    'AS reversal_of_entry_id',
  ]) {
    assert.ok(sqlNormalized.includes(key), `trace key ${key} missing`)
  }
})

// ── Draft residue discrepancy check (spec 9.6, open item 1) ──

test('draft residue is surfaced as data and contributes nothing', () => {
  assert.ok(sqlNormalized.includes("'draft_residue', jsonb_build_object("))
  assert.ok(sqlNormalized.includes("'count', v_draft_count"))
  assert.ok(sqlNormalized.includes("'contributes', false"))
})

// ── Scope metadata pins the canonical rules ──

test('the report pins the canonical v1.1 scope rules at runtime', () => {
  assert.ok(sqlNormalized.includes("'posted_only', true"))
  assert.ok(sqlNormalized.includes("'active_entries_only', true"))
  assert.ok(sqlNormalized.includes("'period_ordering', 'start_date, code (codes are UNIQUE; deterministic total order)'"))
})

test('the migration reloads the PostgREST schema cache', () => {
  assert.ok(migrationSql.includes("NOTIFY pgrst, 'reload schema'"))
})

// ── Service wrapper contract ──

test('reporting service only calls the read-only RPC and writes nothing', () => {
  assert.ok(serviceSource.includes("rpc('derive_accounting_reporting'"))
  assert.ok(!/\.from\(/.test(serviceSource), 'service must not touch tables directly')
  assert.ok(!/\.insert\(|\.update\(|\.delete\(/.test(serviceSource), 'service must not mutate anything')
})

test('reporting service validates the report shape and rejects non-canonical scope', () => {
  for (const required of ['balances', 'periods', 'trial_balance', 'source_trace', 'draft_residue']) {
    assert.ok(serviceSource.includes(required), `service must validate ${required}`)
  }
  assert.ok(serviceSource.includes('posted_only !== true'))
  assert.ok(serviceSource.includes('active_entries_only !== true'))
  assert.ok(serviceSource.includes('p_period_id: periodId'))
})

// ── Domain contract: exact-string money, no numeric money fields ──

test('domain reporting types carry exact-string money contracts', () => {
  for (const field of ['debit_total: string', 'credit_total: string', 'net: string', 'opening_net: string', 'closing_net: string', 'grand_debits: string', 'grand_credits: string']) {
    assert.ok(domainSource.includes(field), `${field} missing`)
  }
  assert.ok(!/\b(debit_total|credit_total|net|opening_net|closing_net|grand_debits|grand_credits)\s*:\s*number\b/.test(domainSource))
  assert.ok(domainSource.includes('is_equal: boolean'))
})

test('domain reporting types import types only and stay side-effect free', () => {
  assert.ok(domainSource.includes("import type { AccountType, NormalBalance, PeriodState } from './types'"))
  assert.ok(!/from 'decimal\.js'/.test(domainSource), 'derivation arithmetic lives in Postgres, not the client')
})

test('the reporting domain module is exported from the accounting barrel', () => {
  assert.ok(indexSource.includes("export * from './reporting'"))
})

// ── Surface registration ──

test('the derivation surface is the single documented RPC', () => {
  assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION public.derive_accounting_reporting('))
  assert.equal((sqlNoComments.match(/CREATE OR REPLACE FUNCTION/g) ?? []).length, 1, 'exactly one function is defined')
})
