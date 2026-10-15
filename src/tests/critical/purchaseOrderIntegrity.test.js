import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/* ------------------------------------------------------------------ */
/* Phase C1.2 — direct-write integrity guard contracts                */
/* ------------------------------------------------------------------ */
/* The guards apply to every writer (RPC or direct) with no bypass, so
 * they are pinned as migration source contracts: transition truth
 * table, refusal wording parity with the service error mapping,
 * trigger wiring, installer extension, convergence scope, and the
 * absence of destructive operations, privilege changes, and
 * accounting or inventory writes. */

const MIGRATION_PATH = path.resolve(
  import.meta.dirname,
  '../../../supabase/migrations/20261016130000_purchase_order_integrity_guards.sql',
)

/** Executable SQL with `--` comment lines removed, so documentation
 * mentions of constrained names cannot read as violations. */
function executableSql() {
  return fs
    .readFileSync(MIGRATION_PATH, 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
}

/* ------------------------------------------------------------------ */
/* Transition predicate                                               */
/* ------------------------------------------------------------------ */

test('po integrity: one shared predicate carries the C1 transition graph', () => {
  const sql = executableSql()

  assert.match(sql, /FUNCTION public\._po_transition_is_legal\(p_from text, p_to text\)/)
  assert.match(sql, /WHEN 'draft' THEN p_to IN \('draft', 'issued', 'cancelled'\)/)
  assert.match(sql, /WHEN 'issued' THEN p_to IN \('issued', 'cancelled', 'closed'\)/)
  assert.match(sql, /WHEN 'cancelled' THEN p_to = 'cancelled'/)
  assert.match(sql, /WHEN 'closed' THEN p_to = 'closed'/)
})

/* ------------------------------------------------------------------ */
/* Header guard                                                       */
/* ------------------------------------------------------------------ */

test('po integrity: deletes are rejected and inserts pass through vetted constraints', () => {
  const sql = executableSql()
  const guard = sql.slice(sql.indexOf('FUNCTION public._po_guard_purchase_orders()'))

  assert.match(guard, /IF TG_OP = 'DELETE' THEN/)
  assert.match(guard, /cannot be deleted; archive them instead/)
  assert.match(guard, /IF TG_OP = 'INSERT' THEN[\s\S]{0,200}?RETURN NEW;/)
})

test('po integrity: identity is immutable on every status', () => {
  const sql = executableSql()
  const guard = sql.slice(sql.indexOf('FUNCTION public._po_guard_purchase_orders()'))

  assert.match(guard, /NEW\.po_number IS DISTINCT FROM OLD\.po_number/)
  assert.match(guard, /NEW\.supplier_id IS DISTINCT FROM OLD\.supplier_id/)
  assert.match(guard, /NEW\.supplier_name IS DISTINCT FROM OLD\.supplier_name/)
  assert.match(guard, /identity \(number, supplier\) is immutable/)
})

test('po integrity: archived rows accept only the lone archive-flag change', () => {
  const sql = executableSql()
  const guard = sql.slice(sql.indexOf('FUNCTION public._po_guard_purchase_orders()'))

  assert.match(guard, /Archived purchase order is read-only; restore it first/)
  assert.match(guard, /Restore preserves the purchase order unchanged; only the archive flag is cleared/)
  assert.match(guard, /Archiving preserves the purchase order unchanged; only the archive flag is set/)
})

test('po integrity: status movement and content follow the C1 rules with RPC-parity wording', () => {
  const sql = executableSql()
  const guard = sql.slice(sql.indexOf('FUNCTION public._po_guard_purchase_orders()'))

  // Terminal documents name their own refusal, exactly as the RPC does,
  // so the service error mapping applies to direct writes too.
  assert.match(guard, /A % purchase order is terminal and cannot transition to %/)
  assert.match(guard, /Illegal purchase order transition: % -> %/)
  assert.match(guard, /_po_transition_is_legal\(OLD\.status, NEW\.status\)/)
  assert.match(
    guard,
    /Purchase order content is immutable once issued; use transition_purchase_order_status for status changes/,
  )
  // The content rule fires only off-draft: draft edits stay legal.
  assert.match(guard, /v_new_content IS DISTINCT FROM v_old_content AND OLD\.status <> 'draft'/)
})

/* ------------------------------------------------------------------ */
/* Item guard                                                         */
/* ------------------------------------------------------------------ */

test('po integrity: item writes qualify a locked parent and never race issuance', () => {
  const sql = executableSql()
  const guard = sql.slice(sql.indexOf('FUNCTION public._po_guard_purchase_order_items()'))

  // One definition protects every tenant via the firing schema.
  assert.match(guard, /TG_TABLE_SCHEMA/)
  // The parent row is locked, so item writes serialise with issuance.
  assert.match(guard, /FOR UPDATE/)
  // The atomic create path: items that commit with a parent born in the
  // same transaction are the authorized save-RPC shape.
  assert.match(guard, /pg_current_xact_id\(\)/)
  assert.match(guard, /Archived purchase order items are read-only/)
  assert.match(guard, /items are immutable once the order is issued/)
  // Re-pointing an item qualifies both the old and the new parent.
  assert.match(guard, /ARRAY\[OLD\.purchase_order_id, NEW\.purchase_order_id\]/)
})

/* ------------------------------------------------------------------ */
/* Trigger functions run without new privileges                       */
/* ------------------------------------------------------------------ */

test('po integrity: guard functions add no privilege surface', () => {
  const sql = executableSql()

  for (const name of ['_po_guard_purchase_orders', '_po_guard_purchase_order_items', '_po_transition_is_legal']) {
    const body = sql.slice(
      sql.indexOf(`FUNCTION public.${name}(`),
      sql.indexOf('$function$;', sql.indexOf(`FUNCTION public.${name}(`)),
    )
    assert.ok(body.length > 0, `${name} must be defined`)
    assert.equal(/SECURITY DEFINER/.test(body), false, `${name} must not bypass RLS`)
  }

  // No grants, no policies, no RLS reinstall anywhere in this migration.
  assert.equal(/GRANT /.test(sql), false)
  assert.equal(/CREATE POLICY/.test(sql), false)
  assert.equal(/_prov_install_rls/.test(sql), false)
})

/* ------------------------------------------------------------------ */
/* Provisioning                                                       */
/* ------------------------------------------------------------------ */

test('po integrity: the canonical installer gains only the PO guard branch', () => {
  const sql = executableSql()

  assert.match(sql, /FUNCTION public\._prov_install_canonical_triggers/)
  // The pre-existing canonical triggers are reproduced unchanged.
  assert.match(sql, /trg_%s_set_updated_at/)
  assert.match(sql, /trg_%s_stamp_ownership/)
  assert.match(sql, /EXECUTE FUNCTION public\.set_row_updated_at\(\)/)
  assert.match(sql, /EXECUTE FUNCTION public\.stamp_row_ownership\(\)/)
  // Guards install on the PO tables only, idempotently.
  assert.match(sql, /IF p_table_name = 'purchase_orders' THEN/)
  assert.match(sql, /IF p_table_name = 'purchase_order_items' THEN/)
  assert.match(sql, /DROP TRIGGER IF EXISTS trg_%s_lifecycle_guard/)
  assert.match(sql, /BEFORE INSERT OR UPDATE OR DELETE ON %I\.%I/)
  assert.match(sql, /EXECUTE FUNCTION public\._po_guard_purchase_orders\(\)/)
  assert.match(sql, /EXECUTE FUNCTION public\._po_guard_purchase_order_items\(\)/)
})

test('po integrity: convergence covers template and tenants, skips the rest, writes no rows', () => {
  const sql = executableSql()

  assert.match(sql, /tenant_master_template/)
  assert.match(sql, /LIKE 'entity\\_%'/)
  assert.match(sql, /has no purchase order tables/)
  assert.match(sql, /NOTIFY pgrst, 'reload schema'/)

  // No dynamic DML on business tables: this migration installs guards,
  // it moves no data.
  assert.equal(/INSERT INTO %I/.test(sql), false)
  assert.equal(/UPDATE %I\./.test(sql), false)
  assert.equal(/DELETE FROM %I/.test(sql), false)
})

/* ------------------------------------------------------------------ */
/* Non-destructive and isolated                                       */
/* ------------------------------------------------------------------ */

test('po integrity: no destructive operation and no foreign domain writes', () => {
  const sql = executableSql()

  assert.equal(/DROP TABLE/.test(sql), false)
  assert.equal(/TRUNCATE/.test(sql), false)
  for (const forbidden of [
    'source_transactions',
    'journal_entries',
    'journal_lines',
    'expenses',
    'payments',
    'receipts',
    'invoices',
    'stock',
    'activity_events',
    'audit_logs',
  ]) {
    assert.equal(
      new RegExp(`(INSERT INTO|UPDATE|DELETE FROM)[^;]*${forbidden}`).test(sql),
      false,
      `the integrity migration must not write ${forbidden}`,
    )
  }
  assert.equal(/client_id\s+(uuid|text|numeric)/.test(sql), false)
})
