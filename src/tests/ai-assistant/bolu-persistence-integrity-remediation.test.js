import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { persistInvoiceCreation, isOperationIdConflict } from '../../lib/ai-assistant/bolu-document-service.ts'
import { buildInvoiceCreateProposal } from '../../lib/ai-assistant/bolu-operations.ts'
import { fetchDocumentPrefixesSafe } from '../../domain/documentNumbering.ts'
import { resolvePrefix, DEFAULT_PREFIXES } from '../../domain/prefixConstants.ts'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '../../..')
const readSource = (relative) => readFileSync(resolve(srcRoot, relative), 'utf8')

const ITEMS = [{ description: 'Salt', quantity: 1, unit_price: 15000 }]

function approvedProposal(overrides = {}) {
  const proposal = buildInvoiceCreateProposal({ client_name: 'Tunde', items: ITEMS, ...overrides })
  proposal.status = 'approved_pending_save'
  return proposal
}

// ─────────────────────────────────────────────────────────────────────────────
// D1 + D2: Idempotency — operation_id column and unique index
// ─────────────────────────────────────────────────────────────────────────────

test('D1: findPersistedOperation queries the dedicated operation_id column, not custom_fields', () => {
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  // The fix: use .eq('operation_id', opId) instead of .filter('custom_fields->>operation_id', 'eq', opId)
  // The old filter fails on invoices because custom_fields is text, not jsonb.
  assert.match(service, /\.eq\('operation_id', opId\)/)
  assert.doesNotMatch(service, /custom_fields->>operation_id/)
})

test('D2: operation_id is written to the dedicated column in the payload', () => {
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  // Both invoice and quotation payloads must include operation_id as a top-level field
  assert.match(service, /operation_id: proposal\.opId/)
})

test('D2: exact operation-id constraint identity is used to classify a 23505 replay', () => {
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  // The looser /operation_id/ substring test is no longer the contract.
  assert.doesNotMatch(service, /\/operation_id\/\.test/)
  // Distinct, exact constraint identities for each family.
  assert.match(service, /idx_invoices_operation_id_unique/)
  assert.match(service, /idx_quotations_operation_id_unique/)
  assert.match(service, /isOperationIdConflict\(/)
  // Replays are verified against the persisted operation_id and tenant.
  assert.match(service, /findVerifiedReplay\(/)
  assert.match(service, /operationId !== opId/)
})

test('D2: the in-memory Set is supplementary, not the guarantee', () => {
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  assert.match(service, /Supplementary in-process guard/)
  assert.match(service, /database-level unique index/)
})

// ─────────────────────────────────────────────────────────────────────────────
// Migration structural checks (SOURCE INSPECTION ONLY — not DB execution proof)
// ─────────────────────────────────────────────────────────────────────────────

test('MIGRATION-STATIC: invoice backfill uses per-row exception scope, not broad batch handler', () => {
  const migration = readSource('supabase/migrations/20261118120000_bolu_operation_idempotency.sql')
  // Per-row loop with a nested BEGIN/EXCEPTION scoped to the cast only.
  assert.match(migration, /FOR v_rec IN EXECUTE format/)
  assert.match(migration, /v_parsed := v_rec\.custom_fields::jsonb/)
  assert.match(migration, /EXCEPTION WHEN invalid_text_representation THEN/)
  // The old broad handler that skipped the entire batch must be gone.
  assert.doesNotMatch(migration, /EXCEPTION WHEN others THEN[\s\S]*Backfill skipped/)
  // Whitespace-only text is excluded via btrim().
  assert.match(migration, /btrim\(custom_fields\)/)
})

test('MIGRATION-STATIC: invoice backfill skips non-object JSON and empty/non-string operation IDs', () => {
  const migration = readSource('supabase/migrations/20261118120000_bolu_operation_idempotency.sql')
  assert.match(migration, /jsonb_typeof\(v_parsed\) IS DISTINCT FROM 'object'/)
  assert.match(migration, /jsonb_typeof\(v_parsed->'operation_id'\) IS DISTINCT FROM 'string'/)
  assert.match(migration, /NULLIF\(btrim\(v_parsed->>'operation_id'\), ''\)/)
  // Never overwrite an existing operation_id.
  assert.match(migration, /operation_id IS NULL.*You may|WHERE id = \$2 AND operation_id IS NULL/)
})

test('MIGRATION-STATIC: backfill counts and reports skipped records via RAISE NOTICE', () => {
  const migration = readSource('supabase/migrations/20261118120000_bolu_operation_idempotency.sql')
  assert.match(migration, /v_skipped_invalid := v_skipped_invalid \+ 1/)
  assert.match(migration, /v_skipped_shape := v_skipped_shape \+ 1/)
  assert.match(migration, /RAISE NOTICE 'Backfill .* skipped/)
})

test('MIGRATION-STATIC: duplicate pre-check identifies schema (not family silently resolved) and fails safely', () => {
  const migration = readSource('supabase/migrations/20261118120000_bolu_operation_idempotency.sql')
  // Two families, each with schema in the exception message.
  assert.match(migration, /Duplicate operation_id values found in % invoices/)
  assert.match(migration, /Duplicate operation_id values found in % quotations/)
  // No destructive duplicate resolution.
  assert.doesNotMatch(migration, /DELETE FROM.*operation_id/i)
})

test('INSTALLER-STATIC: canonical quotation RPC column/placeholder alignment', () => {
  const migration = readSource('supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql')
  // Extract the quotation INSERT column list and VALUES placeholders.
  const colBlock = migration.match(/INSERT INTO %I\.quotations \(([^)]+)\)/)
  assert.ok(colBlock, 'quotation INSERT column list must exist')
  const columns = colBlock[1].split(',').map((c) => c.trim()).filter(Boolean)
  assert.equal(columns.length, 23, 'quotation INSERT must have 23 columns')
  assert.equal(columns[columns.length - 1], 'operation_id', 'operation_id must be last column')

  const valuesBlock = migration.match(/INSERT INTO %I\.quotations \([\s\S]*?VALUES \(\s*([\s\S]*?)\)\s*RETURNING id/)
  assert.ok(valuesBlock, 'quotation VALUES clause must exist')
  const placeholders = valuesBlock[1].match(/\$\d+/g) || []
  assert.equal(placeholders.length, 23, 'quotation VALUES must have 23 placeholders')
  // Placeholders must be $1..$23 in order.
  placeholders.forEach((p, idx) => assert.equal(p, `$${idx + 1}`, `placeholder ${idx} must be $${idx + 1}`))
})

test('INSTALLER-STATIC: canonical invoice RPC column/placeholder alignment', () => {
  const migration = readSource('supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql')
  const colBlock = migration.match(/INSERT INTO %I\.invoices \(([^)]+)\)/)
  assert.ok(colBlock, 'invoice INSERT column list must exist')
  const columns = colBlock[1].split(',').map((c) => c.trim()).filter(Boolean)
  assert.equal(columns.length, 26, 'invoice INSERT must have 26 columns')
  assert.equal(columns[columns.length - 1], 'operation_id', 'operation_id must be last column')

  const valuesBlock = migration.match(/INSERT INTO %I\.invoices \([\s\S]*?VALUES \(\s*([\s\S]*?)\)\s*RETURNING id/)
  assert.ok(valuesBlock, 'invoice VALUES clause must exist')
  const placeholders = valuesBlock[1].match(/\$\d+/g) || []
  assert.equal(placeholders.length, 26, 'invoice VALUES must have 26 placeholders')
  placeholders.forEach((p, idx) => assert.equal(p, `$${idx + 1}`, `placeholder ${idx} must be $${idx + 1}`))
})

test('INSTALLER-STATIC: RPC operation_id extraction uses NULLIF on empty string for both families', () => {
  const migration = readSource('supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql')
  const nullifCount = (migration.match(/NULLIF\([^\n]*operation_id[^\n]*, ''\)/g) || []).length
  assert.ok(nullifCount >= 2, 'both RPCs must map empty operation_id to NULL, not empty string')
})

test('MIGRATION-STATIC: schema-cache notification is issued', () => {
  const migration = readSource('supabase/migrations/20261118120000_bolu_operation_idempotency.sql')
  assert.match(migration, /NOTIFY pgrst, 'reload schema'/)
})

test('D2: migration creates a partial unique index on operation_id', () => {
  const migration = readSource('supabase/migrations/20261118120000_bolu_operation_idempotency.sql')
  assert.match(migration, /ALTER TABLE.*invoices.*ADD COLUMN operation_id text/)
  assert.match(migration, /ALTER TABLE.*quotations.*ADD COLUMN operation_id text/)
  assert.match(migration, /idx_invoices_operation_id_unique/)
  assert.match(migration, /idx_quotations_operation_id_unique/)
  assert.match(migration, /WHERE operation_id IS NOT NULL/)
  // Template must be updated for future tenants
  assert.match(migration, /tenant_master_template\.invoices/)
  assert.match(migration, /tenant_master_template\.quotations/)
  // Backfill from custom_fields for existing records
  // Invoices (text column): per-row safe parsing via jsonb cast in a
  // PL/pgSQL loop with a per-row exception handler
  assert.match(migration, /custom_fields::jsonb/)
  assert.match(migration, /invalid_text_representation/)
  assert.match(migration, /jsonb_typeof/)
  // Quotations (jsonb column): direct ->> extraction
  assert.match(migration, /custom_fields->>.*operation_id/)
  // Duplicate pre-check must fail safely
  assert.match(migration, /HAVING count\(\*\) > 1/)
  assert.match(migration, /RAISE EXCEPTION.*Duplicate operation_id/)
})

test('D1+D2: a replayed invoice operation returns the existing document via the dedicated column', async () => {
  const calls = []
  const proposal = approvedProposal()
  const builder = {
    select: () => builder,
    eq: (col, val) => { calls.push(`eq:${col}=${val}`); return builder },
    limit: () => builder,
    maybeSingle: async () => ({
      data: { id: 'inv-existing', invoice_number: 'SASINV-000135', operation_id: proposal.opId },
      error: null,
    }),
  }
  const settingsBuilder = {
    select: () => settingsBuilder,
    limit: () => settingsBuilder,
    single: async () => ({ data: null, error: null }),
  }
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: (table) => {
      calls.push(`from:${table}`)
      if (table === 'settings') return settingsBuilder
      return builder
    },
    rpc: async (name) => { calls.push(`rpc:${name}`); return { data: null, error: null } },
  }

  const result = await persistInvoiceCreation(
    tenantClient,
    proposal,
    () => true,
    () => true,
    'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(result.success, true)
  assert.equal(result.documentId, 'inv-existing')
  assert.equal(result.documentNumber, 'SASINV-000135')
  // The lookup must use .eq('operation_id', ...) — not .filter('custom_fields->>operation_id', ...)
  assert.ok(calls.includes('eq:operation_id=' + proposal.opId), 'lookup must query the operation_id column')
  assert.ok(
    !calls.includes('rpc:save_invoice_with_items_transaction'),
    'an already persisted operation must not be written twice',
  )
})

test('D1+D2: a 23505 on operation_id during insert returns the existing document', async () => {
  const proposal = approvedProposal()
  let insertAttempted = false
  let lookupAfter23505 = false

  // First lookup returns nothing (no prior commit).
  // The insert raises 23505 on operation_id.
  // Second lookup (after 23505) returns the existing document.
  const builder = {
    select: () => builder,
    eq: () => builder,
    limit: () => builder,
    maybeSingle: async () => {
      if (!insertAttempted) {
        // Before the insert: no existing document
        return { data: null, error: null }
      }
      // After the 23505: the concurrent request committed first
      lookupAfter23505 = true
      return { data: { id: 'inv-concurrent', invoice_number: 'SASINV-000135', operation_id: proposal.opId }, error: null }
    },
  }

  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: (table) => builder,
    rpc: async (name, args) => {
      if (name === 'save_invoice_with_items_transaction') {
        insertAttempted = true
        return {
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "idx_invoices_operation_id_unique"',
          },
        }
      }
      return { data: null, error: null }
    },
  }

  // The prefix settings read must succeed for the test to reach the insert.
  // We mock the tenant client's .from('settings') to return prefixes.
  const originalFrom = tenantClient.from
  tenantClient.from = (table) => {
    if (table === 'settings') {
      return {
        select: () => ({
          limit: () => ({
            single: async () => ({
              data: { document_prefixes: { invoice: 'SASINV', quotation: 'SASQUO' } },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'invoices') return builder
    return originalFrom(table)
  }

  const result = await persistInvoiceCreation(
    tenantClient,
    proposal,
    () => true,
    () => true,
    'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(result.success, true)
  assert.equal(result.documentId, 'inv-concurrent')
  assert.ok(lookupAfter23505, 'must re-read the document after a 23505 on operation_id')
})

// ─────────────────────────────────────────────────────────────────────────────
// D4: Fail-safe tenant prefix resolution
// ─────────────────────────────────────────────────────────────────────────────

test('D4: fetchDocumentPrefixesSafe returns status:error on a settings read error', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: null,
            error: { message: 'permission denied', code: '42501' },
          }),
        }),
      }),
    }),
  }

  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'error')
  assert.ok(result.reason.includes('permission denied') || result.reason.includes('numbering settings'))
})

test('D4: fetchDocumentPrefixesSafe returns status:ok with undefined prefixes when settings row is absent', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  }

  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'ok')
  assert.equal(result.prefixes, undefined)
  assert.equal(resolvePrefix(result.prefixes, 'invoice'), DEFAULT_PREFIXES.invoice)
})

test('D4: fetchDocumentPrefixesSafe returns status:ok with prefixes when settings are configured', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: { invoice: 'SASINV', quotation: 'SASQUO' } },
            error: null,
          }),
        }),
      }),
    }),
  }

  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'ok')
  assert.equal(result.prefixes?.invoice, 'SASINV')
  assert.equal(resolvePrefix(result.prefixes, 'invoice'), 'SASINV')
})

test('D4: fetchDocumentPrefixesSafe returns status:error when tenant context is not ready', async () => {
  const tenantClient = { isReady: false, schemaName: null }
  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'error')
  assert.ok(result.reason.includes('Tenant context'))
})

test('D4: fetchDocumentPrefixesSafe returns status:error on malformed settings data (string value)', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: 'not-an-object' },
            error: null,
          }),
        }),
      }),
    }),
  }

  // A string value for document_prefixes is malformed. Per the corrected
  // implementation, this must return an error and abort document creation —
  // it must NOT be treated as confirmed absence.
  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'error')
  assert.ok(result.reason.includes('malformed'), 'error must explain the data is malformed')
})

test('D4: Bolu invoice creation aborts when prefix settings read fails', async () => {
  const proposal = approvedProposal()

  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: null,
            error: { message: 'network error', code: 'PGRST116' },
          }),
        }),
      }),
    }),
    rpc: async () => ({ data: null, error: null }),
  }

  const result = await persistInvoiceCreation(
    tenantClient,
    proposal,
    () => true,
    () => true,
    'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(result.success, false)
  assert.ok(result.error, 'must return a user-facing error')
  assert.ok(
    result.error.includes('numbering settings') || result.error.includes('network error'),
    'error must explain the prefix settings failure',
  )
})

test('D4: Bolu invoice creation succeeds with legitimate default when settings row is absent', async () => {
  const proposal = approvedProposal()
  let rpcCalled = false

  // First: findPersistedOperation returns nothing.
  // Settings read returns status:'ok' with undefined prefixes (confirmed absence).
  // The insert succeeds with the default INV prefix.
  const invoiceBuilder = {
    select: () => invoiceBuilder,
    eq: () => invoiceBuilder,
    limit: () => invoiceBuilder,
    maybeSingle: async () => ({ data: null, error: null }),
  }

  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: (table) => {
      if (table === 'settings') {
        return {
          select: () => ({
            limit: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }
      }
      return invoiceBuilder
    },
    rpc: async (name, args) => {
      if (name === 'save_invoice_with_items_transaction') {
        rpcCalled = true
        return {
          data: [{ invoice: { id: 'inv-new', invoice_number: 'INV-000001' } }],
          error: null,
        }
      }
      if (name === 'record_audit_log' || name === 'record_invoice_created') {
        return { data: null, error: null }
      }
      return { data: null, error: null }
    },
  }

  const result = await persistInvoiceCreation(
    tenantClient,
    proposal,
    () => true,
    () => true,
    'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(result.success, true)
  assert.ok(rpcCalled, 'the save RPC must be called when prefix settings are confirmed absent')
  assert.equal(result.documentId, 'inv-new')
})

// ─────────────────────────────────────────────────────────────────────────────
// D4 Correction: Malformed settings data must not reach number allocation
// ─────────────────────────────────────────────────────────────────────────────

test('D4-corrected: fetchDocumentPrefixesSafe returns status:error on array document_prefixes', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: ['INV', 'QTN'] },
            error: null,
          }),
        }),
      }),
    }),
  }

  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'error')
  assert.ok(result.reason.includes('malformed'), 'must classify array as malformed')
})

test('D4-corrected: fetchDocumentPrefixesSafe returns status:error on number document_prefixes', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: 42 },
            error: null,
          }),
        }),
      }),
    }),
  }

  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'error')
  assert.ok(result.reason.includes('malformed'), 'must classify number as malformed')
})

test('D4-corrected: fetchDocumentPrefixesSafe returns status:error on invalid prefix value (lowercase)', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: { invoice: 'inv' } },
            error: null,
          }),
        }),
      }),
    }),
  }

  // 'inv' is lowercase and does not match /^[A-Z0-9]{2,6}$/ — malformed.
  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'error')
  assert.ok(result.reason.includes('malformed'), 'must classify invalid prefix as malformed')
  assert.ok(result.reason.includes('invoice'), 'error must name the offending prefix key')
})

test('D4-corrected: fetchDocumentPrefixesSafe returns status:error on invalid prefix value (too long)', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: { invoice: 'VERYLONGPREFIX' } },
            error: null,
          }),
        }),
      }),
    }),
  }

  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'error')
  assert.ok(result.reason.includes('malformed'), 'must classify oversized prefix as malformed')
})

test('D4-corrected: fetchDocumentPrefixesSafe returns status:error on non-string prefix value', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: { invoice: 123 } },
            error: null,
          }),
        }),
      }),
    }),
  }

  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'error')
  assert.ok(result.reason.includes('malformed'), 'must classify non-string prefix value as malformed')
})

test('D4-corrected: fetchDocumentPrefixesSafe returns status:ok with null document_prefixes (confirmed absence)', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: null },
            error: null,
          }),
        }),
      }),
    }),
  }

  // null document_prefixes means the settings row exists but the column
  // was not set. This is a legitimate absence, not malformed data.
  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'ok')
  assert.equal(result.prefixes, undefined)
  assert.equal(resolvePrefix(result.prefixes, 'invoice'), DEFAULT_PREFIXES.invoice)
})

test('D4-corrected: fetchDocumentPrefixesSafe returns status:ok with empty object (valid, no configured prefix)', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: {} },
            error: null,
          }),
        }),
      }),
    }),
  }

  // An empty object is valid — the tenant has settings but no configured
  // prefix keys. resolvePrefix will apply the default for each family.
  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'ok')
  assert.ok(result.prefixes !== undefined, 'prefixes should be the object, not undefined')
  assert.equal(resolvePrefix(result.prefixes, 'invoice'), DEFAULT_PREFIXES.invoice)
})

test('D4-corrected: fetchDocumentPrefixesSafe returns status:ok with partial prefixes (some configured, others default)', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: { invoice: 'SASINV' } },
            error: null,
          }),
        }),
      }),
    }),
  }

  // Only invoice is configured; quotation is absent and will default.
  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'ok')
  assert.equal(result.prefixes?.invoice, 'SASINV')
  assert.equal(resolvePrefix(result.prefixes, 'invoice'), 'SASINV')
  assert.equal(resolvePrefix(result.prefixes, 'quotation'), DEFAULT_PREFIXES.quotation)
})

test('D4-corrected: fetchDocumentPrefixesSafe preserves __auto_seq cursor alongside valid prefixes', async () => {
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: { document_prefixes: { invoice: 'SASINV', __auto_seq: { 'SASINV-': 5 } } },
            error: null,
          }),
        }),
      }),
    }),
  }

  // The __auto_seq key holds a nested cursor object, not a prefix string.
  // It must not trigger a malformed-data error.
  const result = await fetchDocumentPrefixesSafe(tenantClient)
  assert.equal(result.status, 'ok')
  assert.equal(result.prefixes?.invoice, 'SASINV')
})

test('D4-corrected: Bolu invoice creation aborts when settings contain malformed prefix data', async () => {
  const proposal = approvedProposal()
  let rpcCalled = false

  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: (table) => {
      if (table === 'settings') {
        return {
          select: () => ({
            limit: () => ({
              single: async () => ({
                // Malformed: document_prefixes is a string, not an object
                data: { document_prefixes: 'broken' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }
    },
    rpc: async (name) => {
      if (name === 'save_invoice_with_items_transaction') {
        rpcCalled = true
      }
      return { data: null, error: null }
    },
  }

  const result = await persistInvoiceCreation(
    tenantClient,
    proposal,
    () => true,
    () => true,
    'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  // The malformed settings must abort creation — the RPC must never be called.
  assert.equal(result.success, false)
  assert.ok(result.error, 'must return a user-facing error')
  assert.ok(result.error.includes('malformed'), 'error must explain the data is malformed')
  assert.equal(rpcCalled, false, 'must not reach number allocation or document insertion')
})

// ─────────────────────────────────────────────────────────────────────────────
// D2 Strengthened: exact 23505 constraint identification
// ─────────────────────────────────────────────────────────────────────────────

test('D2-23505: exact invoice operation-ID constraint violation is classified as an invoice replay', () => {
  const error = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "idx_invoices_operation_id_unique"',
    details: 'Key (operation_id)=(op-123) already exists.',
  }
  assert.equal(isOperationIdConflict(error, 'invoice'), true)
  assert.equal(isOperationIdConflict(error, 'quotation'), false, 'must not classify as quotation replay')
})

test('D2-23505: exact quotation operation-ID constraint violation is classified as a quotation replay', () => {
  const error = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "idx_quotations_operation_id_unique"',
    details: 'Key (operation_id)=(op-456) already exists.',
  }
  assert.equal(isOperationIdConflict(error, 'quotation'), true)
  assert.equal(isOperationIdConflict(error, 'invoice'), false, 'must not classify as invoice replay')
})

test('D2-23505: invoice-number uniqueness violation is NOT an operation replay', () => {
  const error = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "idx_invoices_invoice_number_unique"',
    details: 'Key (invoice_number)=(INV-000001) already exists.',
  }
  assert.equal(isOperationIdConflict(error, 'invoice'), false)
  assert.equal(isOperationIdConflict(error, 'quotation'), false)
})

test('D2-23505: quotation-number uniqueness violation is NOT an operation replay', () => {
  const error = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "idx_quotations_quotation_number_unique"',
    details: 'Key (quotation_number)=(QTN-000001) already exists.',
  }
  assert.equal(isOperationIdConflict(error, 'quotation'), false)
  assert.equal(isOperationIdConflict(error, 'invoice'), false)
})

test('D2-23505: unrelated 23505 errors are NOT operation replays', () => {
  const unrelated = [
    { code: '23505', message: 'duplicate key value violates unique constraint "clients_email_key"', details: 'Key (email)=(a@b.com) already exists.' },
    { code: '23505', message: 'duplicate key value violates unique constraint "settings_pkey"', details: 'Key (id)=(1) already exists.' },
    { code: '23505', message: 'duplicate key value violates unique constraint "some_operation_id_audit_idx"', details: '' },
  ]
  for (const error of unrelated) {
    assert.equal(isOperationIdConflict(error, 'invoice'), false, `must not replay: ${error.message}`)
    assert.equal(isOperationIdConflict(error, 'quotation'), false, `must not replay: ${error.message}`)
  }
})

test('D2-23505: a loose operation_id substring in an unknown constraint is NOT a replay', () => {
  // Guards against reverting to the old /operation_id/.test(message) contract.
  const error = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "custom_fields_operation_id_legacy_idx"',
    details: '',
  }
  assert.equal(isOperationIdConflict(error, 'invoice'), false)
  assert.equal(isOperationIdConflict(error, 'quotation'), false)
})

test('D2-23505: non-23505 errors are NOT operation replays', () => {
  assert.equal(isOperationIdConflict({ code: '42501', message: 'permission denied' }, 'invoice'), false)
  assert.equal(isOperationIdConflict(null, 'invoice'), false)
  assert.equal(isOperationIdConflict(undefined, 'quotation'), false)
})

test('D2-23505: narrow fallback accepts explicit Key (operation_id) detail when no constraint name is exposed', () => {
  const error = {
    code: '23505',
    message: 'duplicate key value violates a unique constraint',
    details: 'Key (operation_id)=(op-789) already exists.',
  }
  assert.equal(isOperationIdConflict(error, 'invoice'), true)
  assert.equal(isOperationIdConflict(error, 'quotation'), true)
})

test('D2-23505: operation-ID conflict where no existing document is found returns failure (no false replay)', async () => {
  const proposal = approvedProposal()
  let insertAttempted = false

  const builder = {
    select: () => builder,
    eq: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({ data: null, error: null }), // never finds a document
  }

  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: (table) => {
      if (table === 'settings') {
        return {
          select: () => ({ limit: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }
      }
      return builder
    },
    rpc: async (name) => {
      if (name === 'save_invoice_with_items_transaction') {
        insertAttempted = true
        return {
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "idx_invoices_operation_id_unique"',
            details: 'Key (operation_id)=(x) already exists.',
          },
        }
      }
      return { data: null, error: null }
    },
  }

  const result = await persistInvoiceCreation(
    tenantClient, proposal, () => true, () => true, 'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(insertAttempted, true)
  assert.equal(result.success, false, 'must not report a false successful replay')
  assert.ok(result.error.includes('could not be verified'))
})

test('D2-23505: retrieved document with mismatched operation ID is rejected', async () => {
  const proposal = approvedProposal()
  let insertAttempted = false

  const builder = {
    select: () => builder,
    eq: () => builder,
    limit: () => builder,
    maybeSingle: async () => {
      if (!insertAttempted) return { data: null, error: null }
      // A row was found but its operation_id does not match the proposal.
      return {
        data: { id: 'inv-wrong', invoice_number: 'INV-000999', operation_id: 'a-different-operation' },
        error: null,
      }
    },
  }

  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: (table) => {
      if (table === 'settings') {
        return {
          select: () => ({ limit: () => ({ single: async () => ({ data: null, error: null }) }) }),
        }
      }
      return builder
    },
    rpc: async (name) => {
      if (name === 'save_invoice_with_items_transaction') {
        insertAttempted = true
        return {
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "idx_invoices_operation_id_unique"',
            details: 'Key (operation_id)=(x) already exists.',
          },
        }
      }
      return { data: null, error: null }
    },
  }

  const result = await persistInvoiceCreation(
    tenantClient, proposal, () => true, () => true, 'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(result.success, false, 'mismatched operation_id must not be accepted as a replay')
  assert.ok(result.error.includes('could not be verified'))
})

test('D2-23505: unavailable tenant context cannot produce a verified replay', async () => {
  const proposal = approvedProposal()
  // isOperationIdConflict is pure; the tenant check lives in findVerifiedReplay.
  // With isReady false, assertTenantAuthorization rejects before any insert,
  // so no replay can be reported. Verify the guard is present in source.
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  assert.match(service, /if \(!tenantClient \|\| !tenantClient\.isReady \|\| !tenantClient\.schemaName\) return null/)
})
