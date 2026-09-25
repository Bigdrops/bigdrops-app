import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const migrationsDir = join(repoRoot, 'supabase', 'migrations')

function loadBackfillMigration() {
  const migration = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('_item_library_historical_backfill.sql'))
    .sort()
    .at(-1)

  assert.ok(migration, 'expected an item library historical backfill migration')

  const migrationPath = join(migrationsDir, migration)
  assert.ok(existsSync(migrationPath), `expected migration at ${migrationPath}`)

  return readFileSync(migrationPath, 'utf8')
}

test('historical backfill migration creates durable audit and batch tables', () => {
  const sql = loadBackfillMigration()

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.item_library_backfill_batches/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.item_library_backfill_audit/)
  assert.match(sql, /ALTER TABLE public\.item_library_backfill_batches ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /ALTER TABLE public\.item_library_backfill_audit ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /previous_item_id uuid/)
  assert.match(sql, /new_item_id uuid NOT NULL/)
  assert.match(sql, /canonical_source text NOT NULL/)
})

test('historical backfill migration skips incomplete tenants and classifies all safe tiers', () => {
  const sql = loadBackfillMigration()

  assert.match(sql, /entity_bigdrops-main_agam/)
  assert.match(sql, /entity_bigdrops-main_issa-certified/)
  assert.match(sql, /entity_bigdrops-main_ororo/)
  assert.match(sql, /tier_a_existing/)
  assert.match(sql, /tier_b_new/)
  assert.match(sql, /tier_c_review/)
  assert.match(sql, /tier_d_excluded/)
})

test('historical backfill migration protects unsafe rows from mutation', () => {
  const sql = loadBackfillMigration()

  assert.match(sql, /coalesce\(row_type, 'standard'\) <> 'standard'/)
  assert.match(sql, /normalized_description = ''/)
  assert.match(sql, /classification_summary\.tier_c_occurrences = v_after_tier_c/)
  assert.match(sql, /classification_summary\.tier_d_occurrences = v_after_tier_d/)
  assert.match(sql, /RAISE EXCEPTION 'Item library backfill aborted/)
})

test('historical backfill migration creates Tier B catalog rows idempotently', () => {
  const sql = loadBackfillMigration()

  assert.match(sql, /INSERT INTO %I\.item_catalog/)
  assert.match(sql, /ON CONFLICT \(normalized_name\) DO NOTHING/)
  assert.match(sql, /historical_backfill/)
  assert.match(sql, /created_by_batch_id/)
})

test('historical backfill migration updates only item_id on invoice and quotation rows', () => {
  const sql = loadBackfillMigration()

  assert.match(sql, /UPDATE %I\.invoice_items\s+SET item_id =/)
  assert.match(sql, /UPDATE %I\.quotation_items\s+SET item_id =/)
  assert.doesNotMatch(sql, /SET\s+description\s*=/i)
  assert.doesNotMatch(sql, /SET\s+quantity\s*=/i)
  assert.doesNotMatch(sql, /SET\s+unit_price\s*=/i)
  assert.doesNotMatch(sql, /SET\s+vat/i)
  assert.doesNotMatch(sql, /SET\s+total/i)
})

test('historical backfill migration preserves row timestamps while linking rows', () => {
  const sql = loadBackfillMigration()

  assert.match(sql, /DISABLE TRIGGER trg_invoice_items_set_updated_at/)
  assert.match(sql, /ENABLE TRIGGER trg_invoice_items_set_updated_at/)
  assert.match(sql, /DISABLE TRIGGER trg_quotation_items_set_updated_at/)
  assert.match(sql, /ENABLE TRIGGER trg_quotation_items_set_updated_at/)
})
