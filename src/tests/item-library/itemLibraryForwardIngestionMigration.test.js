import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const migrationsDir = join(repoRoot, 'supabase', 'migrations')

function loadForwardIngestionMigration() {
  const migration = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('_item_library_forward_ingestion.sql'))
    .sort()
    .at(-1)

  assert.ok(migration, 'expected an item library forward ingestion migration')

  const migrationPath = join(migrationsDir, migration)
  assert.ok(existsSync(migrationPath), `expected migration at ${migrationPath}`)

  return readFileSync(migrationPath, 'utf8')
}

test('item library forward ingestion migration installs invoice and quotation insert triggers', () => {
  const sql = loadForwardIngestionMigration()

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.learn_item_catalog_for_line_item\(\)/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\._install_item_library_learning_triggers\(/)
  assert.match(sql, /CREATE TRIGGER trg_learn_item_catalog_invoice_items\s+BEFORE INSERT ON %I\.invoice_items/)
  assert.match(sql, /CREATE TRIGGER trg_learn_item_catalog_quotation_items\s+BEFORE INSERT ON %I\.quotation_items/)
})

test('item library forward ingestion migration preserves explicit item ids and excludes group rows', () => {
  const sql = loadForwardIngestionMigration()

  assert.match(sql, /IF NEW\.item_id IS NOT NULL THEN\s+RETURN NEW;\s+END IF;/)
  assert.match(sql, /coalesce\(NEW\.row_type, 'standard'\) <> 'standard'/)
  assert.match(sql, /IF v_normalized_name = '' THEN\s+RETURN NEW;\s+END IF;/)
})

test('item library forward ingestion migration uses exact deterministic catalog identity', () => {
  const sql = loadForwardIngestionMigration()

  assert.match(sql, /WHERE normalized_name = \$1\s+AND is_active = true/)
  assert.match(sql, /WHERE ia\.normalized_alias_text = \$1\s+AND ia\.is_active = true\s+AND ia\.is_retired = false\s+AND ic\.is_active = true/)
  assert.match(sql, /ON CONFLICT \(normalized_name\) DO NOTHING\s+RETURNING id/)
  assert.doesNotMatch(sql, /\b(similarity|levenshtein|soundex|pg_trgm|fuzzy)\b/i)
})

test('item library forward ingestion migration is forward-only and provisioning-safe', () => {
  const sql = loadForwardIngestionMigration()

  assert.doesNotMatch(sql, /UPDATE\s+%I\.(invoice_items|quotation_items)[\s\S]*item_id\s+IS\s+NULL/i)
  assert.match(sql, /p\.proname IN \([\s\S]*'learn_item_catalog_for_line_item'/)
  assert.match(sql, /PERFORM public\._install_item_library_learning_triggers\('tenant_master_template'\)/)
  assert.match(sql, /PERFORM public\._install_item_library_learning_triggers\(v_schema_name\)/)
})
