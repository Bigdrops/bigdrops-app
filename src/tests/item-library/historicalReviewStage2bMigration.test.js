import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const migrationsDir = join(repoRoot, 'supabase', 'migrations')

function loadStage2bMigration() {
  const migration = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('_item_library_tier_c_stage2b_reconciliation.sql'))
    .sort()
    .at(-1)

  assert.ok(migration, 'expected an Item Library Tier C Stage 2B migration')

  const migrationPath = join(migrationsDir, migration)
  assert.ok(existsSync(migrationPath), `expected migration at ${migrationPath}`)

  return readFileSync(migrationPath, 'utf8')
}

test('Stage 2B migration creates durable canonical and historical Keep Separate tables', () => {
  const sql = loadStage2bMigration()

  assert.match(sql, /CREATE TABLE IF NOT EXISTS __SCHEMA__\.item_reviewed_separate_pairs/)
  assert.match(sql, /CONSTRAINT item_reviewed_separate_pairs_order_check CHECK \(item_a_id::text < item_b_id::text\)/)
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_item_reviewed_separate_pairs_active_pair/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS __SCHEMA__\.historical_review_candidate_rejections/)
  assert.match(sql, /case_membership_hash text NOT NULL/)
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_historical_review_candidate_rejections_active/)
})

test('Stage 2B historical link and create RPCs update identity only', () => {
  const sql = loadStage2bMigration()

  assert.match(sql, /CREATE OR REPLACE FUNCTION __SCHEMA__\.link_historical_review_case_to_item/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION __SCHEMA__\.create_item_from_historical_review_case/)
  assert.match(sql, /UPDATE __SCHEMA__\.invoice_items\s+SET item_id = p_target_item_id/)
  assert.match(sql, /UPDATE __SCHEMA__\.quotation_items\s+SET item_id = p_target_item_id/)
  assert.match(sql, /UPDATE __SCHEMA__\.invoice_items\s+SET item_id = v_new_item_id/)
  assert.match(sql, /UPDATE __SCHEMA__\.quotation_items\s+SET item_id = v_new_item_id/)
  assert.doesNotMatch(sql, /SET\s+(description|quantity|unit_price|tax|vat|discount|subtotal|grand_total)\s*=/i)
})

test('Stage 2B migration rejects stale cases and reviewed-separate merge conflicts', () => {
  const sql = loadStage2bMigration()

  assert.match(sql, /compute_historical_review_case_hash/)
  assert.match(sql, /case_membership_changed/)
  assert.match(sql, /case_candidate_marked_separate/)
  assert.match(sql, /Cannot merge items that were reviewed and marked separate/)
  assert.match(sql, /item_a_id = ANY\(v_merge_scope\)/)
  assert.match(sql, /item_b_id = ANY\(v_merge_scope\)/)
})

test('Stage 2B migration installs tenant provisioning, RLS, grants, and template table mappings', () => {
  const sql = loadStage2bMigration()

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\._prov_install_item_library_reconciliation/)
  assert.match(sql, /PERFORM public\._prov_install_rls\(p_schema_name, v_body, p_entity_id, 'item'\)/)
  assert.match(sql, /PERFORM public\._prov_install_item_library_reconciliation\(v_schema, v_entity\.id\)/)
  assert.match(sql, /PERFORM public\._prov_install_item_library_reconciliation\(v_schema_name, p_entity_id\)/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION %I\.link_historical_review_case_to_item/)
  assert.match(sql, /WHEN 'item_reviewed_separate_pairs' THEN 'item'/)
  assert.match(sql, /WHEN 'historical_review_candidate_rejections' THEN 'item'/)
})
