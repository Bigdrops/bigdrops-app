import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  savePurchaseOrder,
  archivePurchaseOrder,
  restorePurchaseOrder,
} from '../../modules/purchase-order/purchaseOrderService.ts'
import { transitionPurchaseOrderStatus } from '../../modules/purchase-order/purchaseOrderTransitions.ts'
import { createEmptyPurchaseOrder, createEmptyPurchaseOrderItem } from '../../domain/purchase-order/types.ts'
import { isPurchaseOrderContentEditable } from '../../domain/purchase-order/status.ts'

/* ------------------------------------------------------------------ */
/* Silence the best-effort audit path                                 */
/* ------------------------------------------------------------------ */
/* The service fires audit writes through a dynamic `@/lib/audit`
 * import whose actor lookup needs a live Supabase session. Under plain
 * `node --test` that lookup cannot succeed, and the service catches the
 * failure by design (a lost audit row never fails a mutation). Collect
 * the noise so the suite output stays readable; service behaviour is
 * asserted on return values and recorded RPC calls. */

const silencedErrors = []
const originalConsoleError = console.error
console.error = (...args) => {
  silencedErrors.push(args)
}

test.after(() => {
  console.error = originalConsoleError
})

/* ------------------------------------------------------------------ */
/* A minimal tenant-client double                                     */
/* ------------------------------------------------------------------ */
/* Speaks only the query surface the PO service uses. Mirrors the
 * double in purchaseOrderPersistence.test.js, extended with the
 * lifecycle version columns (archived_at, updated_at). */

function matchesFilters(row, filters) {
  return filters.every((filter) => {
    const value = row[filter.column]
    if (filter.kind === 'is') {
      return filter.value === null ? value === null || value === undefined : value === filter.value
    }
    return value === filter.value
  })
}

function createFakeTenantClient({ purchaseOrders = [], rpc } = {}) {
  const calls = { rpc: [], from: [], updates: [] }
  const store = { purchaseOrders }

  function makeBuilder(table) {
    const state = { table, op: 'select', filters: [], payload: null, mode: null }

    const run = async () => {
      if (table === 'purchase_orders') {
        if (state.op === 'update') {
          const row = store.purchaseOrders.find((entry) => matchesFilters(entry, state.filters))
          if (!row) return { data: null, error: { message: 'purchase order not found' } }
          Object.assign(row, state.payload)
          return { data: state.mode ? row : [row], error: null }
        }
        const rows = store.purchaseOrders.filter((entry) => matchesFilters(entry, state.filters))
        if (state.mode === 'single') {
          return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } }
        }
        if (state.mode === 'maybeSingle') {
          return { data: rows[0] ?? null, error: null }
        }
        return { data: rows, error: null }
      }
      return { data: null, error: null }
    }

    const builder = {
      select() {
        return builder
      },
      order() {
        return builder
      },
      is(column, value) {
        state.filters.push({ column, value, kind: 'is' })
        return builder
      },
      eq(column, value) {
        state.filters.push({ column, value, kind: 'eq' })
        return builder
      },
      update(payload) {
        state.op = 'update'
        state.payload = payload
        calls.updates.push({ table, payload })
        return builder
      },
      single() {
        state.mode = 'single'
        return run()
      },
      maybeSingle() {
        state.mode = 'maybeSingle'
        return run()
      },
      then(resolve, reject) {
        return run().then(resolve, reject)
      },
      catch(reject) {
        return run().catch(reject)
      },
    }

    return builder
  }

  return {
    calls,
    store,
    from(table) {
      calls.from.push(table)
      return makeBuilder(table)
    },
    rpc(name, args) {
      calls.rpc.push({ name, args })
      if (typeof rpc === 'function') return Promise.resolve(rpc(name, args, store))
      return Promise.resolve({ data: null, error: null })
    },
  }
}

const SAVE_RPC = 'save_purchase_order_with_items_transaction'
const TRANSITION_RPC = 'transition_purchase_order_status'

function storedPo(overrides = {}) {
  return {
    id: 'po-1',
    po_number: 'PO-000001',
    po_date: '2026-10-15',
    supplier_id: 'supplier-1',
    supplier_name: 'Frozen Name Ltd',
    status: 'draft',
    currency: 'NGN',
    subtotal: 100000,
    discount: 0,
    vat: 0,
    total: 100000,
    extra_charges: [],
    calculation_inputs: {},
    notes: null,
    terms: null,
    archived_at: null,
    updated_at: '2026-10-15T10:00:00.000Z',
    ...overrides,
  }
}

function updateFor(id, status = 'draft') {
  const po = createEmptyPurchaseOrder({ supplier_id: 'supplier-1', status })
  po.id = id
  po.items = [{ ...createEmptyPurchaseOrderItem(0), description: 'Cement', quantity: 20, unit_cost: 5000 }]
  return { purchaseOrder: po, mode: 'update' }
}

/* ------------------------------------------------------------------ */
/* Domain: content editability                                        */
/* ------------------------------------------------------------------ */

test('po lifecycle: content is editable on a draft only', () => {
  assert.equal(isPurchaseOrderContentEditable('draft'), true)
  assert.equal(isPurchaseOrderContentEditable('issued'), false)
  assert.equal(isPurchaseOrderContentEditable('cancelled'), false)
  assert.equal(isPurchaseOrderContentEditable('closed'), false)
})

/* ------------------------------------------------------------------ */
/* Service: content updates                                           */
/* ------------------------------------------------------------------ */

test('po lifecycle: a content update on an issued PO is rejected before any write', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ status: 'issued' })],
    rpc: () => {
      throw new Error('no RPC may run for a forbidden content update')
    },
  })

  const result = await savePurchaseOrder(client, 'entity-1', updateFor('po-1', 'issued'))

  assert.equal(result.data, null)
  assert.match(result.error, /cannot change after it leaves draft/)
  assert.equal(client.calls.rpc.length, 0)
})

test('po lifecycle: a content update on a cancelled or closed PO is rejected', async () => {
  for (const status of ['cancelled', 'closed']) {
    const client = createFakeTenantClient({ purchaseOrders: [storedPo({ status })] })
    const result = await savePurchaseOrder(client, 'entity-1', updateFor('po-1', status))
    assert.equal(result.data, null, `${status} must reject content updates`)
    assert.match(result.error, /cannot change after it leaves draft/)
    assert.equal(client.calls.rpc.length, 0)
  }
})

test('po lifecycle: a content update on an archived PO is rejected until restored', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ archived_at: '2026-10-16T00:00:00.000Z' })],
  })

  const result = await savePurchaseOrder(client, 'entity-1', updateFor('po-1', 'draft'))

  assert.equal(result.data, null)
  assert.match(result.error, /archived/)
  assert.equal(client.calls.rpc.length, 0)
})

test('po lifecycle: a draft content update carries the loaded write stamp', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ status: 'draft' })],
    rpc: () => ({ data: [{ purchase_order: { id: 'po-1', po_number: 'PO-000001' } }], error: null }),
  })

  const result = await savePurchaseOrder(client, 'entity-1', updateFor('po-1', 'draft'))

  assert.equal(result.error, null)
  assert.equal(client.calls.rpc.length, 1)
  assert.equal(
    client.calls.rpc[0].args.p_expected_updated_at,
    '2026-10-15T10:00:00.000Z',
    'the save must prove it loaded current state',
  )
})

test('po lifecycle: a stale draft update surfaces the reload message', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ status: 'draft' })],
    rpc: () => ({
      data: null,
      error: { message: 'Purchase order changed since you loaded it; reload and retry' },
    }),
  })

  const result = await savePurchaseOrder(client, 'entity-1', updateFor('po-1', 'draft'))

  assert.equal(result.data, null)
  assert.match(result.error, /Reload and try again/)
})

/* ------------------------------------------------------------------ */
/* Service: status-only transitions                                   */
/* ------------------------------------------------------------------ */

test('po lifecycle: a legal status-only transition uses the dedicated operation', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ status: 'issued' })],
    rpc: (name) => {
      assert.equal(name, TRANSITION_RPC)
      return {
        data: [{ id: 'po-1', po_number: 'PO-000001', old_status: 'issued', new_status: 'closed' }],
        error: null,
      }
    },
  })

  const result = await transitionPurchaseOrderStatus(client, 'entity-1', {
    purchaseOrderId: 'po-1',
    toStatus: 'closed',
  })

  assert.equal(result.error, null)
  assert.deepEqual(result.data, { id: 'po-1', po_number: 'PO-000001', status: 'closed' })

  const call = client.calls.rpc.find((entry) => entry.name === TRANSITION_RPC)
  assert.ok(call, 'the transition must go through the status-only RPC')
  assert.equal(call.args.p_to_status, 'closed')
  assert.equal(call.args.p_expected_updated_at, '2026-10-15T10:00:00.000Z')
  assert.equal(
    'p_purchase_order_payload' in call.args,
    false,
    'a transition carries no content payload',
  )
  assert.equal('p_items' in call.args, false, 'a transition carries no item rows')
})

test('po lifecycle: an illegal transition is rejected before any write', async () => {
  const client = createFakeTenantClient({ purchaseOrders: [storedPo({ status: 'draft' })] })

  const result = await transitionPurchaseOrderStatus(client, 'entity-1', {
    purchaseOrderId: 'po-1',
    toStatus: 'closed',
  })

  assert.equal(result.data, null)
  assert.match(result.error, /cannot move from draft to closed/)
  assert.equal(client.calls.rpc.length, 0)
})

test('po lifecycle: a terminal PO cannot transition', async () => {
  const client = createFakeTenantClient({ purchaseOrders: [storedPo({ status: 'cancelled' })] })

  const result = await transitionPurchaseOrderStatus(client, 'entity-1', {
    purchaseOrderId: 'po-1',
    toStatus: 'issued',
  })

  assert.equal(result.data, null)
  assert.match(result.error, /final and cannot be changed/)
  assert.equal(client.calls.rpc.length, 0)
})

test('po lifecycle: an archived PO cannot transition until restored', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ status: 'issued', archived_at: '2026-10-16T00:00:00.000Z' })],
  })

  const result = await transitionPurchaseOrderStatus(client, 'entity-1', {
    purchaseOrderId: 'po-1',
    toStatus: 'closed',
  })

  assert.equal(result.data, null)
  assert.match(result.error, /archived/)
  assert.equal(client.calls.rpc.length, 0)
})

test('po lifecycle: a caller-supplied write stamp reaches the transition RPC', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ status: 'issued' })],
    rpc: () => ({
      data: [{ id: 'po-1', po_number: 'PO-000001', old_status: 'issued', new_status: 'cancelled' }],
      error: null,
    }),
  })

  const result = await transitionPurchaseOrderStatus(client, 'entity-1', {
    purchaseOrderId: 'po-1',
    toStatus: 'cancelled',
    expectedUpdatedAt: '2026-10-14T00:00:00.000Z',
  })

  assert.equal(result.error, null)
  assert.equal(client.calls.rpc[0].args.p_expected_updated_at, '2026-10-14T00:00:00.000Z')
})

test('po lifecycle: a database stale refusal maps to the reload message', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ status: 'issued' })],
    rpc: () => ({
      data: null,
      error: { message: 'Purchase order changed since you loaded it; reload and retry' },
    }),
  })

  const result = await transitionPurchaseOrderStatus(client, 'entity-1', {
    purchaseOrderId: 'po-1',
    toStatus: 'closed',
  })

  assert.equal(result.data, null)
  assert.match(result.error, /Reload and try again/)
})

/* ------------------------------------------------------------------ */
/* Service: archive and restore                                       */
/* ------------------------------------------------------------------ */

test('po lifecycle: restore preserves the original lifecycle status', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ status: 'closed', archived_at: '2026-10-16T00:00:00.000Z' })],
  })

  const result = await restorePurchaseOrder(client, 'po-1')

  assert.equal(result.error, null)
  // A closed PO stays closed after restore: it is not reactivated.
  assert.equal(result.data.status, 'closed')
  assert.equal(result.data.archived_at, null)

  const update = client.calls.updates.find((entry) => entry.table === 'purchase_orders')
  assert.deepEqual(Object.keys(update.payload), ['archived_at'])
})

test('po lifecycle: archive writes the archive flag only', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [storedPo({ status: 'issued' })],
  })

  const result = await archivePurchaseOrder(client, 'po-1')

  assert.equal(result.error, null)
  const update = client.calls.updates.find((entry) => entry.table === 'purchase_orders')
  assert.deepEqual(Object.keys(update.payload), ['archived_at'])
  assert.ok(update.payload.archived_at)
})

/* ------------------------------------------------------------------ */
/* Audit mapping contracts (source inspection)                        */
/* ------------------------------------------------------------------ */
/* The audit helpers need a live Supabase session for actor lookup, so
 * they cannot run under plain node. These tests pin their mapping
 * onto the canonical vocabulary instead, following the CPS audit
 * precedent of source-contract tests. */

const root = process.cwd()
const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8')

test('po audit: the entity vocabulary includes purchase_order', () => {
  const libAudit = read('src/lib/audit.ts')
  assert.match(libAudit, /\| 'purchase_order'/)
})

test('po audit: tracked fields carry identity and status, never items or personal details', () => {
  const libAudit = read('src/lib/audit.ts')
  const fieldsBlock = libAudit.slice(
    libAudit.indexOf('PURCHASE_ORDER_TRACKED_FIELDS'),
    libAudit.indexOf('PURCHASE_ORDER_TRACKED_FIELDS') + 600,
  )
  for (const field of ['po_number', 'supplier_id', 'supplier_name', 'status', 'subtotal', 'total']) {
    assert.match(fieldsBlock, new RegExp(`'${field}'`), `${field} must be tracked`)
  }
  for (const forbidden of ['items', 'extra_charges', 'calculation_inputs', 'phone', 'email', 'address']) {
    assert.equal(fieldsBlock.includes(`'${forbidden}'`), false, `${forbidden} must not be tracked`)
  }
})

test('po audit: lifecycle events map onto the canonical action vocabulary', () => {
  const libAudit = read('src/lib/audit.ts')
  const poSection = libAudit.slice(libAudit.indexOf('PURCHASE_ORDER_TRACKED_FIELDS'))
  const pairs = [
    ['recordPurchaseOrderCreated', "'CREATE'"],
    ['recordPurchaseOrderUpdated', "'UPDATE'"],
    ['recordPurchaseOrderStatusChanged', "'STATUS_CHANGE'"],
    ['recordPurchaseOrderArchived', "'ARCHIVE'"],
    ['recordPurchaseOrderRestored', "'UNARCHIVE'"],
  ]
  for (const [helper, action] of pairs) {
    assert.match(poSection, new RegExp(`function ${helper}`), `${helper} must exist`)
  }
  // No new action name is introduced: every PO helper delegates to the
  // canonical recordAuditLog authority with purchase_order as the entity.
  const helperBodies = poSection.slice(0, poSection.indexOf('export async function recordExpenseRecorded'))
  assert.ok((helperBodies.match(/recordAuditLog\(/g) || []).length >= 5)
  assert.ok((helperBodies.match(/entityType: 'purchase_order'/g) || []).length >= 5)
  for (const [, action] of pairs) {
    assert.match(helperBodies, new RegExp(`action: ${action}`), `${action} must be used`)
  }
})

test('po audit: lifecycle mutations fire best-effort audit writes', () => {
  // The save/archive paths live in the service; the status-only path lives
  // in the transitions module. Together they must cover every PO event.
  const source =
    read('src/modules/purchase-order/purchaseOrderService.ts') +
    read('src/modules/purchase-order/purchaseOrderTransitions.ts')
  for (const helper of [
    'recordPurchaseOrderCreated',
    'recordPurchaseOrderUpdated',
    'recordPurchaseOrderStatusChanged',
    'recordPurchaseOrderArchived',
    'recordPurchaseOrderRestored',
  ]) {
    assert.match(source, new RegExp(helper), `${helper} must be wired into the module`)
  }
  // A lost audit row never fails the mutation (invoice convention).
  assert.match(source, /auditPurchaseOrder/)
  assert.match(source, /never fails/)
})

test('po isolation: the transition path names no accounting or inventory authority', () => {
  const source = read('src/modules/purchase-order/purchaseOrderTransitions.ts')
  for (const table of [
    'source_transactions',
    'journal_entries',
    'journal_lines',
    'expenses',
    'payments',
    'invoices',
    'invoice_items',
  ]) {
    assert.equal(source.includes(`from('${table}')`), false)
    assert.equal(source.includes(table), false, `the transition module must not touch ${table}`)
  }
  assert.equal(/syncInvoiceAccountingEvent|postJournal|sourceTransactionService/.test(source), false)
})

/* ------------------------------------------------------------------ */
/* Migration contracts                                                */
/* ------------------------------------------------------------------ */

const MIGRATION_PATH = path.resolve(
  import.meta.dirname,
  '../../../supabase/migrations/20261016120000_purchase_order_lifecycle_hardening.sql',
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

test('po migration: audit_logs admits purchase_order and keeps every existing member', () => {
  const sql = executableSql()
  for (const member of [
    'invoice',
    'quotation',
    'project',
    'receipt',
    'waybill',
    'csr',
    'rfq',
    'letter',
    'cps_sheets',
    'purchase_order',
  ]) {
    assert.match(sql, new RegExp(`'${member}'::text`), `audit entity set must include ${member}`)
  }
  for (const action of ['CREATE', 'UPDATE', 'STATUS_CHANGE', 'ARCHIVE', 'UNARCHIVE']) {
    assert.match(sql, new RegExp(`'${action}'::text`), `audit action set must include ${action}`)
  }
  // The loop converges public, the template, and every tenant schema, and
  // skips schemas without an audit table.
  assert.match(sql, /tenant_master_template/)
  assert.match(sql, /LIKE 'entity\\_%'/)
  assert.match(sql, /NOTIFY pgrst, 'reload schema'/)
})

test('po migration: the save authority replaces its signature and locks the row', () => {
  const sql = executableSql()
  assert.match(
    sql,
    /DROP FUNCTION IF EXISTS public\.save_purchase_order_with_items_transaction\(uuid, jsonb, jsonb, text\)/,
  )
  assert.match(sql, /p_expected_updated_at timestamptz DEFAULT NULL/)
  assert.match(sql, /SELECT status, archived_at, updated_at FROM %I\.purchase_orders WHERE id = %L FOR UPDATE/)
})

test('po migration: the save authority rejects archived, stale and non-draft updates', () => {
  const sql = executableSql()
  assert.match(sql, /Archived purchase order % cannot be updated; restore it first/)
  assert.match(sql, /changed since you loaded it; reload and retry/)
  assert.match(sql, /content is immutable once issued; use transition_purchase_order_status/)

  // Identity and the frozen snapshot stay out of the update SET clause.
  const updateBranch = sql.slice(sql.indexOf('UPDATE %I.purchase_orders'))
  const setClause = updateBranch.slice(0, updateBranch.indexOf('WHERE id = $1'))
  assert.equal(/po_number\s*=/.test(setClause), false)
  assert.equal(/supplier_id\s*=/.test(setClause), false)
  assert.equal(/supplier_name\s*=/.test(setClause), false)
})

test('po migration: the transition authority is status-only and atomic', () => {
  const sql = executableSql()
  assert.match(sql, /FUNCTION public\.transition_purchase_order_status/)
  assert.match(sql, /purchase_order', 'edit'/)
  assert.match(sql, /Archived purchase order % cannot transition; restore it first/)
  assert.match(sql, /terminal and cannot transition/)
  assert.match(sql, /Illegal purchase order transition/)

  // The single write touches the status column only: no content column
  // may appear between its SET and WHERE.
  const transitionBody = sql.slice(sql.indexOf('FUNCTION public.transition_purchase_order_status'))
  const statusWrite = transitionBody.slice(transitionBody.indexOf('UPDATE %I.purchase_orders SET status'))
  const writeClause = statusWrite.slice(0, statusWrite.indexOf('WHERE id'))
  assert.match(writeClause, /SET status = %L/)
  for (const forbidden of ['po_number', 'supplier_id', 'supplier_name', 'subtotal', 'total', 'notes', 'terms']) {
    assert.equal(new RegExp(`${forbidden}\\s*=`).test(writeClause), false, `${forbidden} must not be writable by a transition`)
  }

  // A same-status call is a proven no-op: no write runs at all.
  assert.match(sql, /'noop', true/)
})

test('po migration: no accounting, inventory, client or activity-events writes', () => {
  const sql = executableSql()
  for (const forbidden of [
    'source_transactions',
    'journal_entries',
    'journal_lines',
    'expenses',
    'payments',
    'receipts',
    'stock',
  ]) {
    assert.equal(
      new RegExp(`(INSERT INTO|UPDATE|DELETE FROM)[^;]*${forbidden}`).test(sql),
      false,
      `the hardening migration must not write ${forbidden}`,
    )
  }
  // The PO stays supplier-scoped: no client column and no client foreign key.
  assert.equal(/client_id\s+(uuid|text|numeric)/.test(sql), false)
  assert.equal(/REFERENCES[^;]*\bclients\b/.test(sql), false)
  // PO lifecycle audit lives in audit_logs through recordAuditLog. The
  // migration must not write the discrete-event table directly.
  assert.equal(/activity_events/.test(sql), false)
})
