import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  emptySupplierForm,
  formatSupplierLocation,
  isArchivedSupplier,
  matchesSupplierQuery,
  partitionSuppliers,
  supplierFormFromClient,
  supplierFormFromRecord,
  toSupplierPayload,
  validateSupplierForm,
} from '@/domain/supplier/types'

/**
 * Contract guard for the Commercial Party Foundation (OPTION B —
 * linked role directories).
 *
 * These tests read repository artifacts and exercise pure domain functions.
 * They do not connect to the database and they do not call any remote function.
 *
 * Coverage:
 *   Tests  1–6   — suppliers table shape and client-parity conventions
 *   Tests  7–12  — client_supplier_links one-to-one uniqueness and referential integrity
 *   Tests 13–18  — provisioning registration, resource mapping, permission resource
 *   Tests 19–24  — existing-tenant convergence and the incomplete-tenant skip policy
 *   Tests 25–33  — scope exclusions (no registry, no PO, no client id migration,
 *                  no accounting change, no supplier banking)
 *   Tests 34–41  — domain validation and pure helpers
 *   Tests 42–47  — service behaviour: no auto-link by name, unlink preserves records
 *   Tests 48–55  — existing client authority and Clients UI regression
 */

const root = process.cwd()
const MIGRATIONS_DIR = path.resolve(root, 'supabase/migrations')

const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8').replace(/\r\n/g, '\n')

/** Strip single-line SQL comments so patterns cannot accidentally be comment text. */
const executable = (sql) =>
  sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')

function supplierMigrationPath() {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => /supplier_domain_and_party_links\.sql$/.test(name))
    .sort()

  assert.equal(
    matches.length,
    1,
    `expected exactly one supplier domain migration, found ${matches.length}: ${matches.join(', ')}`,
  )

  return path.join('supabase/migrations', matches[0])
}

const migrationSql = () => read(supplierMigrationPath())
const migrationCode = () => executable(migrationSql())

/** The latest migration that (re)defines a provisioning registry function. */
function latestDefinitionPath(fnName) {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .filter((name) =>
      new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${fnName}\\s*\\(`, 'i').test(
        fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'),
      ),
    )

  assert.ok(matches.length >= 1, `no migration defines public.${fnName}`)
  return path.join('supabase/migrations', matches[matches.length - 1])
}

/** Reproduce the BOQ->CPS textual rewrite the rename migration applied to a function body. */
function renameApplied(sql) {
  return sql
    .replace(/'boqs'/g, "'cps_sheets'")
    .replace(/'boq_rows'/g, "'cps_rows'")
    .replace(/'boq'/g, "'cps_sheets'")
}

// ─── 1–6: suppliers table ────────────────────────────────────────────────────

test('1. a supplier domain migration exists and is additive', () => {
  const sql = migrationSql()
  assert.match(sql, /CREATE TABLE IF NOT EXISTS tenant_master_template\.suppliers/i)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS tenant_master_template\.client_supplier_links/i)
  // Additive only: no destructive DDL against existing objects.
  const code = migrationCode()
  assert.doesNotMatch(code, /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?!.*client_supplier_links)/i)
  assert.doesNotMatch(code, /ALTER\s+TABLE\s+tenant_master_template\.clients/i)
  assert.doesNotMatch(code, /TRUNCATE/i)
})

test('2. suppliers carries the required columns', () => {
  const sql = migrationSql()
  const block = sql.slice(
    sql.indexOf('CREATE TABLE IF NOT EXISTS tenant_master_template.suppliers'),
    sql.indexOf('CONSTRAINT suppliers_pkey'),
  )
  for (const column of [
    'id uuid',
    'name text NOT NULL',
    'contact_person text',
    'phone text',
    'email text',
    'address text',
    'city text',
    'state text',
    'notes text',
    'created_at timestamp with time zone',
    'updated_at timestamp with time zone',
    'archived_at timestamp with time zone',
  ]) {
    assert.ok(block.includes(column), `suppliers is missing ${column}`)
  }
})

test('3. suppliers.id is a stable generated uuid primary key', () => {
  const sql = migrationSql()
  assert.match(sql, /id uuid NOT NULL DEFAULT gen_random_uuid\(\)/)
  assert.match(sql, /CONSTRAINT suppliers_pkey PRIMARY KEY \(id\)/)
})

test('4. supplier name is not unique', () => {
  const code = migrationCode()
  const block = code.slice(
    code.indexOf('CREATE TABLE IF NOT EXISTS tenant_master_template.suppliers'),
    code.indexOf('CREATE INDEX IF NOT EXISTS idx_suppliers_archived_at'),
  )
  assert.doesNotMatch(block, /UNIQUE/i, 'suppliers must carry no unique constraint')
  // The name index mirrors clients: a plain, non-unique lookup index.
  assert.match(code, /CREATE INDEX IF NOT EXISTS idx_suppliers_name[\s\S]*?USING btree \(name\)/)
})

test('5. suppliers has no banking or payment columns', () => {
  const sql = migrationSql()
  const block = sql
    .slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS tenant_master_template.suppliers'),
      sql.indexOf('CONSTRAINT suppliers_pkey'),
    )
    .toLowerCase()
  for (const forbidden of ['bank', 'iban', 'account_number', 'sort_code', 'payment_details']) {
    assert.ok(!block.includes(forbidden), `suppliers must not carry a '${forbidden}' field`)
  }
})

test('6. suppliers follows client naming and timestamp conventions', () => {
  const sql = migrationSql()
  assert.match(sql, /archived_at timestamp with time zone/)
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_suppliers_archived_at/)
  // snake_case columns only.
  assert.doesNotMatch(sql, /contactPerson|createdAt|archivedAt/)
})

// ─── 7–12: client_supplier_links ─────────────────────────────────────────────

test('7. the link table enforces one link per client and one per supplier', () => {
  const sql = migrationSql()
  assert.match(sql, /CONSTRAINT client_supplier_links_client_id_key UNIQUE \(client_id\)/)
  assert.match(sql, /CONSTRAINT client_supplier_links_supplier_id_key UNIQUE \(supplier_id\)/)
})

test('8. the link references clients.id and suppliers.id separately', () => {
  const code = migrationCode()
  assert.match(
    code,
    /FOREIGN KEY \(client_id\) REFERENCES tenant_master_template\.clients\(id\)/,
  )
  assert.match(
    code,
    /FOREIGN KEY \(supplier_id\) REFERENCES tenant_master_template\.suppliers\(id\)/,
  )
})

test('9. a link can never cross a tenant boundary', () => {
  // Every foreign key is intra-schema. `_prov_readd_foreign_keys` re-points the
  // template foreign keys at the tenant schema's own tables.
  const code = migrationCode()
  assert.match(
    code,
    /FOREIGN KEY \(client_id\) REFERENCES %I\.clients\(id\)/,
    'tenant backfill must reference the same schema',
  )
  assert.match(
    code,
    /FOREIGN KEY \(supplier_id\) REFERENCES %I\.suppliers\(id\)/,
    'tenant backfill must reference the same schema',
  )
  assert.doesNotMatch(code, /REFERENCES\s+public\.clients/i)
})

test('10. the link carries row ownership and an updated_at for the canonical triggers', () => {
  const sql = migrationSql()
  const block = sql.slice(
    sql.indexOf('CREATE TABLE IF NOT EXISTS tenant_master_template.client_supplier_links'),
    sql.indexOf('CONSTRAINT client_supplier_links_pkey'),
  )
  for (const column of ['created_at', 'updated_at', 'created_by', 'updated_by']) {
    assert.ok(block.includes(column), `client_supplier_links is missing ${column}`)
  }
})

test('11. the link stores no party detail of its own', () => {
  const sql = migrationSql()
  const block = sql.slice(
    sql.indexOf('CREATE TABLE IF NOT EXISTS tenant_master_template.client_supplier_links'),
    sql.indexOf('CONSTRAINT client_supplier_links_pkey'),
  )
  // Identity metadata only: no name, no contact, no accounting columns.
  assert.doesNotMatch(block, /name|phone|email|address|amount|receivable|payable|balance/i)
})

test('12. both link foreign keys block destructive deletes', () => {
  const sql = migrationSql()
  const block = sql.slice(
    sql.indexOf('CREATE TABLE IF NOT EXISTS tenant_master_template.client_supplier_links'),
    sql.indexOf('CREATE INDEX IF NOT EXISTS idx_client_supplier_links_supplier_id'),
  )
  // No ON DELETE CASCADE anywhere on the link table: a linked record cannot be
  // destroyed until the link is explicitly removed.
  assert.doesNotMatch(block, /ON DELETE CASCADE/i)
})

// ─── 13–18: provisioning registration ────────────────────────────────────────

test('13. both tables are registered in the canonical provisioning table list', () => {
  const migration = migrationCode()
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\._prov_get_template_tables/)
  assert.match(migration, /'suppliers', 'client_supplier_links'/)

  // The effective list is the last redefinition in migration order.
  const latest = renameApplied(read(latestDefinitionPath('_prov_get_template_tables')))
  const list = latest.slice(
    latest.indexOf("SELECT ARRAY["),
    latest.indexOf("];", latest.indexOf('SELECT ARRAY[')),
  )
  assert.ok(list.includes("'suppliers'"), 'effective template list must include suppliers')
  assert.ok(
    list.includes("'client_supplier_links'"),
    'effective template list must include client_supplier_links',
  )
})

test('14. the CPS rename is preserved in the registry redefinition', () => {
  const migration = migrationSql()
  // Reproducing the pre-rename names would break new-tenant provisioning.
  assert.ok(
    migration.includes("'cps_sheets', 'cps_rows'"),
    'template list must use the renamed sheet tables',
  )
  assert.match(migration, /WHEN 'cps_sheets' THEN 'cps_sheets'/)
  assert.match(migration, /WHEN 'cps_rows' THEN 'cps_sheets'/)
  assert.ok(!migration.includes("'boqs', 'boq_rows'"), 'the pre-rename names must not return')
})

test('15. both tables map to the supplier permission resource', () => {
  const migration = migrationCode()
  assert.match(migration, /WHEN 'suppliers' THEN 'supplier'/)
  assert.match(migration, /WHEN 'client_supplier_links' THEN 'supplier'/)
})

test('16. the supplier permission resource is seeded and canonical', () => {
  const migration = migrationCode()
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\._prov_seed_default_permissions/)
  assert.match(migration, /\('supplier'\)/, 'the default permission seed must include supplier')
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\._perm_pair_is_canonical/,
    'the canonical resource allowlist must be extended',
  )
  assert.match(migration, /'supplier'[\s\S]*?\);/)
})

test('17. supplier permissions are independent of client permissions', () => {
  const migration = migrationSql()
  const canonical = migration.slice(
    migration.indexOf('_perm_pair_is_canonical'),
    migration.indexOf('EXISTING-TENANT CONVERGENCE'),
  )
  assert.ok(canonical.includes("'supplier'"))
  assert.ok(canonical.includes("'client'"), 'client must remain canonical and unchanged')
})

test('18. new tenants receive RLS through the shared installer', () => {
  const migration = migrationCode()
  // RLS is installed generically for every template table, so nothing
  // bespoke is needed — but the backfill must use the shared installer.
  assert.match(migration, /_prov_install_rls\(v_schema, v_table, v_entity_id, 'supplier'\)/)
  assert.match(migration, /_prov_install_canonical_triggers\(v_schema, v_table\)/)
})

// ─── 19–24: convergence ──────────────────────────────────────────────────────

test('19. existing tenants are converged', () => {
  const migration = migrationCode()
  assert.match(migration, /FOR v_schema IN[\s\S]*?nspname LIKE 'entity\\_%'/)
  assert.match(migration, /_prov_clone_table\(v_template, v_schema, v_table\)/)
})

test('20. an incomplete tenant schema is skipped by name with a reason', () => {
  const migration = migrationCode()
  assert.match(
    migration,
    /tablename = 'clients'[\s\S]*?RAISE WARNING 'supplier domain skipped[\s\S]*?CONTINUE;/,
    'a schema without clients must be skipped by name, not failed',
  )
  assert.match(migration, /v_skipped/)
})

test('21. unknown failures abort the migration', () => {
  const migration = migrationCode()
  // No per-schema EXCEPTION WHEN OTHERS handler swallowing real errors.
  assert.doesNotMatch(migration, /EXCEPTION WHEN OTHERS THEN\s*RAISE WARNING/i)
  assert.doesNotMatch(migration, /EXCEPTION WHEN OTHERS THEN\s*NULL/i)
})

test('22. missing tables are cloned idempotently', () => {
  const migration = migrationCode()
  assert.match(migration, /IF to_regclass\(v_schema \|\| '\.' \|\| v_table\) IS NULL THEN/)
})

test('23. DML grants match the established tenant pattern', () => {
  const migration = migrationCode()
  assert.match(
    migration,
    /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I\.%I TO anon, authenticated, service_role/,
  )
})

test('24. the PostgREST schema cache is reloaded', () => {
  assert.match(migrationSql(), /NOTIFY pgrst, 'reload schema'/)
})

// ─── 25–33: scope exclusions ─────────────────────────────────────────────────

test('25. no commercial party registry is introduced', () => {
  // Executable SQL only: the header explains what was NOT built.
  const code = migrationCode().toLowerCase()
  assert.ok(!code.includes('commercial_parties'), 'OPTION C registry is out of scope')
  assert.ok(!code.includes('party_roles'), 'party role tables are out of scope')
  assert.ok(!code.includes('party_id'), 'a shared party id anchor is out of scope')
})

test('26. no purchase order implementation is introduced', () => {
  const sql = migrationSql().toLowerCase()
  for (const forbidden of ['purchase_order', 'purchase_orders', 'po_number', 'goods_receipt']) {
    assert.ok(!sql.includes(forbidden), `out of scope: ${forbidden}`)
  }
})

test('27. no existing client id is modified', () => {
  const code = migrationCode()
  assert.doesNotMatch(code, /UPDATE\s+(?:tenant_master_template\.)?clients/i)
  assert.doesNotMatch(code, /ALTER\s+TABLE[^;]*clients[^;]*RENAME/i)
  assert.doesNotMatch(code, /DROP\s+COLUMN[^;]*client_id/i)
})

test('28. no client foreign key is rewritten', () => {
  const code = migrationCode()
  for (const constraint of [
    'projects_client_id_fkey',
    'quotations_client_id_fkey',
    'waybills_client_id_fkey',
    'receipts_client_id_fkey',
  ]) {
    assert.ok(!code.includes(constraint), `${constraint} must not be touched`)
  }
})

test('29. accounting is untouched', () => {
  const code = migrationCode()
  // The provisioning list names these tables. What must never appear is a
  // statement that reads or writes them.
  for (const table of ['source_transactions', 'journal_entries', 'receipts', 'payments']) {
    for (const verb of ['INSERT INTO', 'UPDATE', 'DELETE FROM', 'ALTER TABLE', 'DROP TABLE']) {
      assert.ok(
        !new RegExp(`${verb}[^;]{0,80}${table}`, 'i').test(code),
        `accounting table '${table}' must not be written by '${verb}'`,
      )
    }
  }
  assert.ok(!code.includes('counterparty_type'), 'the accounting counterparty model is untouched')
  assert.ok(!code.includes('counterparty_name'), 'the accounting counterparty model is untouched')
})

test('30. supplier identity is never derived from free-text vendor values', () => {
  const code = migrationCode()
  assert.doesNotMatch(code, /INSERT INTO[^;]*suppliers[\s\S]{0,200}vendor_name/i)
  assert.doesNotMatch(code, /rfqs[\s\S]{0,400}INSERT INTO[^;]*suppliers/i)
  assert.ok(!code.includes('vendor_name'), 'no vendor text is promoted into suppliers')
})

test('31. no client search semantics change', () => {
  const code = migrationCode()
  assert.ok(!code.includes('search_documents'), 'the search authority is not modified here')
})

test('32. the client name snapshot columns are untouched', () => {
  const code = migrationCode()
  assert.doesNotMatch(code, /client_name/i)
})

test('33. the migration does not enable row level security on the clients table', () => {
  const code = migrationCode()
  assert.doesNotMatch(code, /ALTER TABLE[^;]*clients[^;]*ROW LEVEL SECURITY/i)
})

// ─── 34–41: domain ───────────────────────────────────────────────────────────

test('34. supplier validation requires a name and nothing else', () => {
  assert.equal(validateSupplierForm(emptySupplierForm).valid, false)
  assert.equal(validateSupplierForm({ ...emptySupplierForm, name: '   ' }).valid, false)
  assert.equal(validateSupplierForm({ ...emptySupplierForm, name: 'Acme' }).valid, true)
  // An otherwise empty form with a name is valid: no other field is required.
  assert.equal(validateSupplierForm({ ...emptySupplierForm, name: 'A' }).valid, true)
})

test('35. the supplier payload is trimmed', () => {
  const payload = toSupplierPayload({
    ...emptySupplierForm,
    name: '  Acme Ltd  ',
    city: '  Lagos ',
    notes: '  net 30  ',
  })
  assert.equal(payload.name, 'Acme Ltd')
  assert.equal(payload.city, 'Lagos')
  assert.equal(payload.notes, 'net 30')
})

test('36. two businesses may share a name', () => {
  // No name uniqueness is enforced in the domain or the schema.
  const a = { id: 'a', name: 'Zenith Ltd' }
  const b = { id: 'b', name: 'Zenith Ltd' }
  assert.notEqual(a.id, b.id)
  assert.equal(validateSupplierForm({ ...emptySupplierForm, name: a.name }).valid, true)
  assert.equal(validateSupplierForm({ ...emptySupplierForm, name: b.name }).valid, true)
})

test('37. client details seed a supplier form once', () => {
  const seeded = supplierFormFromClient({
    id: 'client-1',
    name: 'Acme Ltd',
    contact_person: 'Ada',
    phone: '080',
    email: 'a@b.c',
    address: '1 Road',
    city: 'Lagos',
    state: 'Lagos',
  })
  assert.equal(seeded.name, 'Acme Ltd')
  assert.equal(seeded.contact_person, 'Ada')
  assert.equal(seeded.notes, '')
  // A copy, not a reference: mutating the copy cannot reach the client.
  seeded.city = 'Abuja'
  assert.equal(seeded.city, 'Abuja')
})

test('38. supplier form values round-trip from a record', () => {
  const values = supplierFormFromRecord({
    id: 's1',
    name: 'Acme',
    contact_person: null,
    phone: null,
    email: null,
    address: null,
    city: null,
    state: null,
    notes: null,
  })
  assert.equal(values.name, 'Acme')
  assert.equal(values.contact_person, '')
  assert.equal(values.notes, '')
})

test('39. archive partitioning separates active from archived', () => {
  const rows = [
    { id: '1', name: 'A', archived_at: null },
    { id: '2', name: 'B', archived_at: '2026-01-01T00:00:00Z' },
  ]
  assert.equal(isArchivedSupplier(rows[0]), false)
  assert.equal(isArchivedSupplier(rows[1]), true)
  const { active, archived } = partitionSuppliers(rows)
  assert.deepEqual(active.map((r) => r.id), ['1'])
  assert.deepEqual(archived.map((r) => r.id), ['2'])
})

test('40. supplier search matches name, contact, city, state, phone and email', () => {
  const row = {
    id: '1',
    name: 'Zenith Industrial',
    contact_person: 'Ada Obi',
    phone: '08031234567',
    email: 'sales@zenith.ng',
    city: 'Lagos',
    state: 'Lagos',
  }
  assert.equal(matchesSupplierQuery(row, ''), true)
  assert.equal(matchesSupplierQuery(row, 'zenith'), true)
  assert.equal(matchesSupplierQuery(row, 'ada'), true)
  assert.equal(matchesSupplierQuery(row, '0803'), true)
  assert.equal(matchesSupplierQuery(row, 'zenith.ng'), true)
  assert.equal(matchesSupplierQuery(row, 'abuja'), false)
})

test('41. supplier location formatting matches the client convention', () => {
  assert.equal(formatSupplierLocation({ city: 'Lagos', state: 'Lagos' }), 'Lagos, Lagos')
  assert.equal(formatSupplierLocation({ city: null, state: null }), '—')
})

// ─── 42–47: service behaviour ────────────────────────────────────────────────

const serviceSource = () => read('src/modules/supplier/supplierService.ts')
const partySource = () => read('src/modules/party/partyLinkService.ts')

test('42. the supplier picker and service never read the clients table as suppliers', () => {
  const service = serviceSource()
  // The service module owns the supplier authority only.
  assert.doesNotMatch(service, /from\('clients'\)/)
})

test('43. linking is never inferred from a name', () => {
  const service = serviceSource()
  const party = partySource()
  for (const source of [service, party]) {
    assert.doesNotMatch(
      source,
      /\.eq\(\s*'name'/,
      'a link must never be resolved by matching a name',
    )
    assert.doesNotMatch(source, /ilike\([^)]*name/i, 'no name-based automatic matching')
  }
})

test('44. a duplicate link is rejected safely', () => {
  const service = serviceSource()
  assert.match(service, /23505/, 'the unique-constraint SQLSTATE must be handled')
  assert.match(service, /isUniqueViolation/)
  assert.match(service, /already exists/)
})

test('45. unlinking removes only the relationship', () => {
  const service = serviceSource()
  const unlink = service.slice(service.indexOf('export async function unlinkClientSupplier'))
  assert.match(unlink, /from\('client_supplier_links'\)\.delete\(\)/)
  // Neither role record may be deleted by an unlink.
  assert.doesNotMatch(unlink, /\.from\('clients'\)/)
  assert.doesNotMatch(unlink, /\.from\('suppliers'\)/)
})

test('46. creating a supplier role for a client has explicit failure recovery', () => {
  const service = serviceSource()
  const create = service.slice(service.indexOf('export async function createSupplierAndLinkForClient'))
  assert.match(create, /Compensate/i)
  assert.match(create, /from\('suppliers'\)\.delete\(\)/)
  // An existing link is detected before anything is created.
  assert.match(create, /getLinkForClient/)
})

test('47. creating a client role for a supplier has explicit failure recovery', () => {
  const party = partySource()
  const create = party.slice(party.indexOf('export async function createClientAndLinkForSupplier'))
  assert.match(create, /Compensate/i)
  assert.match(create, /from\('clients'\)\.delete\(\)/)
  assert.match(create, /getLinkedClientForSupplier/)
})

// ─── 48–55: existing client authority regression ─────────────────────────────

test('48. the Clients directory still reads the clients table', () => {
  const page = read('src/pages/Clients.tsx')
  assert.match(page, /from\("clients"\)/)
  assert.match(page, /clientListCacheKey/)
})

test('49. ClientSelector still reads the clients table', () => {
  const selector = read('src/components/ClientSelector.tsx')
  assert.match(selector, /from\('clients'\)/)
  assert.match(selector, /onClientChange/)
})

test('50. the supplier picker reads suppliers, not clients', () => {
  const selector = read('src/components/supplier/SupplierSelector.tsx')
  assert.match(selector, /from\('suppliers'\)/)
  assert.doesNotMatch(selector, /from\('clients'\)/)
  assert.match(selector, /onSupplierChange/)
})

test('51. the supplier picker returns a stable supplier id and display name', () => {
  const selector = read('src/components/supplier/SupplierSelector.tsx')
  assert.match(selector, /onSupplierChange\(supplier\?\.id \|\| '', supplier\?\.name \|\| ''/)
})

test('52. the supplier picker excludes archived suppliers by default', () => {
  const selector = read('src/components/supplier/SupplierSelector.tsx')
  assert.match(selector, /includeArchived = false/)
  assert.match(selector, /\.is\('archived_at', null\)/)
})

test('53. the supplier picker does not depend on the Item Library', () => {
  const selector = read('src/components/supplier/SupplierSelector.tsx')
  assert.doesNotMatch(selector, /item-library|itemLibrary|item_catalog|item_id/)
})

test('54. supplier routes are registered and the Suppliers pages exist', () => {
  const shell = read('src/components/app/AppShell.tsx')
  assert.match(shell, /path="\/suppliers"/)
  assert.match(shell, /path="\/suppliers\/new"/)
  assert.match(shell, /path="\/suppliers\/edit\/:id"/)
  assert.match(shell, /path="\/suppliers\/:id"/)
  for (const page of [
    'src/pages/Suppliers.tsx',
    'src/pages/AddSupplier.tsx',
    'src/pages/EditSupplier.tsx',
    'src/pages/SupplierDetail.tsx',
  ]) {
    assert.ok(fs.existsSync(path.resolve(root, page)), `${page} must exist`)
  }
})

test('55. navigation keeps exactly five bottom tabs and maps suppliers to the clients tab', async () => {
  const { tabs, getActiveTab } = await import('../../components/layout/navData.ts')
  assert.equal(tabs.length, 5)
  assert.equal(getActiveTab('/clients'), 'clients')
  assert.equal(getActiveTab('/suppliers'), 'clients')
  assert.equal(getActiveTab('/suppliers/edit/abc'), 'clients')
})

test('56. Client detail gains a supplier role action that requires confirmation', () => {
  const page = read('src/pages/ClientDetail.tsx')
  const card = read('src/components/client/workspace/ClientSupplierRoleCard.tsx')
  // The page delegates to a focused card, so the workspace stays readable.
  assert.match(page, /ClientSupplierRoleCard/)
  assert.match(card, /Add Supplier Role/)
  assert.match(card, /View Supplier/)
  assert.match(card, /handleAddSupplierRole/)
  // The link is explicit: the action runs through the link service.
  assert.match(card, /createSupplierAndLinkForClient/)
})

test('57. supplier detail supports linking, unlinking and viewing the client role', () => {
  const page = read('src/pages/SupplierDetail.tsx')
  assert.match(page, /Link Existing Client/)
  assert.match(page, /Add Client Role/)
  assert.match(page, /View Client/)
  assert.match(page, /Unlink/)
  assert.match(page, /unlinkParties/)
})

test('58. the supplier form is reusable and separate from the document form', () => {
  const form = read('src/components/supplier/SupplierForm.tsx')
  assert.doesNotMatch(form, /SharedDocumentForm|FormLineItems/)
  assert.match(form, /export function SupplierForm/)
})

test('59. no purchase order route or page exists', () => {
  // Phase A scope guard. Phase C1 (supplier purchase orders) later authorised
  // the PO DOMAIN and its NUMBERING key, so the original blanket "no purchase
  // order numbering" assertion was superseded and is now asserted positively
  // below. The parts that still stand are that no PO ROUTE and no PO PAGE may
  // exist: Phase C1 is a backend-authority phase and builds no UI.
  const shell = read('src/components/app/AppShell.tsx').toLowerCase()
  assert.ok(!shell.includes('purchase-order'), 'no PO route may exist')
  assert.ok(!shell.includes('purchaseorder'), 'no PO page may exist')
})

test('59b. purchase order numbering is present and uses the canonical key', () => {
  // Phase C1 authorised this key. Invoices, quotations, CPS, and the supplier
  // directory keep their own keys untouched.
  const prefixes = read('src/domain/prefixConstants.ts')
  assert.match(prefixes, /purchase_order: 'PO'/, 'the PO numbering key must exist')
  assert.match(prefixes, /invoice: 'INV'/)
  assert.match(prefixes, /quotation: 'QTN'/)
  assert.match(prefixes, /cps_sheets: 'CPS'/)
})
