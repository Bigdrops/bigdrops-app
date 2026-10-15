import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  savePurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  listOccupiedPurchaseOrderNumbers,
  peekNextPurchaseOrderNumber,
  archivePurchaseOrder,
} from '../../modules/purchase-order/purchaseOrderService.ts'
import { createEmptyPurchaseOrder, createEmptyPurchaseOrderItem } from '../../domain/purchase-order/types.ts'

/* ------------------------------------------------------------------ */
/* A minimal tenant-client double                                     */
/* ------------------------------------------------------------------ */
/* Speaks only the query surface this service uses. Every chain the
 * service builds is recorded, so a test can assert not just the result
 * but which tables and RPCs the service actually touched.            */

function matchesFilters(row, filters) {
  return filters.every((filter) => {
    const value = row[filter.column]
    if (filter.kind === 'is') {
      return filter.value === null ? value === null || value === undefined : value === filter.value
    }
    return value === filter.value
  })
}

function createFakeTenantClient({ purchaseOrders = [], items = [], settings = [], rpc } = {}) {
  const calls = { rpc: [], from: [], updates: [] }
  const store = { purchaseOrders, items, settings }

  function makeBuilder(table) {
    const state = {
      table,
      op: 'select',
      columns: '*',
      filters: [],
      order: null,
      limit: null,
      payload: null,
      mode: null,
    }

    const run = async () => {
      if (table === 'settings') {
        if (state.op === 'update') {
          const row = store.settings.find((entry) => matchesFilters(entry, state.filters))
          if (!row) return { data: null, error: { message: 'settings row not found' } }
          Object.assign(row, state.payload)
          return { data: state.mode ? row : [row], error: null }
        }
        const rows = store.settings.filter((entry) => matchesFilters(entry, state.filters))
        if (state.mode === 'single') {
          return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } }
        }
        return { data: rows, error: null }
      }

      if (table === 'purchase_orders') {
        if (state.op === 'update') {
          const row = store.purchaseOrders.find((entry) => matchesFilters(entry, state.filters))
          if (!row) return { data: null, error: { message: 'purchase order not found' } }
          Object.assign(row, state.payload)
          return { data: state.mode ? row : [row], error: null }
        }

        const rows = store.purchaseOrders
          .filter((entry) => matchesFilters(entry, state.filters))
          .map((entry) =>
            state.columns === 'po_number' ? { po_number: entry.po_number } : { ...entry },
          )

        if (state.mode === 'single') {
          return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } }
        }
        if (state.mode === 'maybeSingle') {
          return { data: rows[0] ?? null, error: null }
        }
        return { data: rows, error: null }
      }

      if (table === 'purchase_order_items') {
        let rows = store.items.filter((entry) => matchesFilters(entry, state.filters))
        if (state.order?.column === 'sort_order') {
          rows = [...rows].sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
        }
        return { data: rows, error: null }
      }

      return { data: null, error: null }
    }

    const builder = {
      select(columns) {
        if (state.op === 'select') state.columns = columns
        return builder
      },
      order(column, options) {
        state.order = { column, options }
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
      limit(count) {
        state.limit = count
        return builder
      },
      update(payload) {
        state.op = 'update'
        state.payload = payload
        calls.updates.push({ table, payload })
        return builder
      },
      insert(payload) {
        state.op = 'insert'
        state.payload = payload
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

const RPC_NAME = 'save_purchase_order_with_items_transaction'

/** A PostgREST-shaped success, echoing back what the RPC was handed. */
function successRpc(id = 'po-created') {
  return (name, args, store) => {
    const payload = args.p_purchase_order_payload
    store.purchaseOrders.push({
      id,
      po_number: payload.po_number,
      status: payload.status,
      archived_at: null,
    })
    return {
      data: [
        {
          purchase_order: { id, po_number: payload.po_number },
          items_saved: (args.p_items ?? []).length,
        },
      ],
      error: null,
    }
  }
}

function draftFor({ items, inputs = {}, manualNumber, status = 'draft' } = {}) {
  const po = createEmptyPurchaseOrder({ supplier_id: 'supplier-1', status })
  po.items = (items ?? [{ description: 'Cement', quantity: 20, unit_cost: 5000 }]).map(
    (item, index) => ({ ...createEmptyPurchaseOrderItem(index), ...item }),
  )
  po.calculation_inputs = {
    vatPercent: 0,
    discountType: 'percent',
    discountTiming: 'before_tax',
    discountValue: 0,
    ...inputs,
  }
  return { purchaseOrder: po, mode: 'create', manualNumber }
}

/* ------------------------------------------------------------------ */
/* Create                                                             */
/* ------------------------------------------------------------------ */

test('po save: create writes the header and items in one transactional call', async () => {
  const client = createFakeTenantClient({ rpc: successRpc() })

  const result = await savePurchaseOrder(client, 'entity-1', {
    ...draftFor({
      items: [
        { description: 'Cement 50kg', quantity: 20, unit_cost: 5000 },
        { description: 'Sand', quantity: 2, unit: 'trip', unit_cost: 25000 },
      ],
    }),
  })

  assert.equal(result.error, null)
  assert.equal(result.data.po_number, 'PO-000001')
  assert.equal(result.data.id, 'po-created')

  // Exactly one write authority, and it is the PO transaction.
  assert.equal(client.calls.rpc.length, 1)
  assert.equal(client.calls.rpc[0].name, RPC_NAME)
  assert.equal(client.calls.rpc[0].args.p_mode, 'create')
  assert.equal(client.calls.rpc[0].args.p_entity_id, 'entity-1')

  const payload = client.calls.rpc[0].args.p_purchase_order_payload
  assert.equal(payload.po_number, 'PO-000001')
  assert.equal(payload.supplier_id, 'supplier-1')
  assert.equal(payload.status, 'draft')
  assert.equal(payload.subtotal, 150000)
  assert.equal(payload.total, 150000)

  // The supplier snapshot is resolved server-side, never claimed by the caller.
  assert.equal('supplier_name' in payload, false)

  const savedItems = client.calls.rpc[0].args.p_items
  assert.deepEqual(savedItems.map((item) => item.sort_order), [0, 1])
  assert.deepEqual(savedItems.map((item) => item.description), ['Cement 50kg', 'Sand'])
  assert.equal(savedItems[1].unit, 'trip')
})

test('po save: an automatic number advances the automatic cursor', async () => {
  const client = createFakeTenantClient({
    settings: [{ id: 'settings-1', document_prefixes: {} }],
    rpc: successRpc(),
  })

  const result = await savePurchaseOrder(client, 'entity-1', draftFor())

  assert.equal(result.error, null)

  const cursorWrite = client.calls.updates.find((entry) => entry.table === 'settings')
  assert.ok(cursorWrite, 'the automatic cursor must be advanced after a system-generated number')
  assert.equal(cursorWrite.payload.document_prefixes.__auto_seq['PO-'], 2)
})

test('po save: a manual number is authoritative and never moves the automatic cursor', async () => {
  const client = createFakeTenantClient({
    settings: [{ id: 'settings-1', document_prefixes: {} }],
    rpc: successRpc(),
  })

  const result = await savePurchaseOrder(client, 'entity-1', draftFor({ manualNumber: 'MANUAL-7' }))

  assert.equal(result.error, null)
  assert.equal(client.calls.rpc[0].args.p_purchase_order_payload.po_number, 'MANUAL-7')

  // A manual number must not advance the automatic sequence.
  assert.equal(
    client.calls.updates.filter((entry) => entry.table === 'settings').length,
    0,
    'a manual number must not touch the automatic cursor',
  )
})

test('po save: an automatic collision retries a fresh candidate', async () => {
  let attempt = 0
  const client = createFakeTenantClient({
    rpc: (name, args, store) => {
      attempt += 1
      if (attempt === 1) {
        // Another save won the race and committed this number.
        store.purchaseOrders.push({ id: 'winner', po_number: args.p_purchase_order_payload.po_number })
        return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "purchase_orders_po_number_key"' } }
      }
      return {
        data: [{ purchase_order: { id: 'po-2', po_number: args.p_purchase_order_payload.po_number } }],
        error: null,
      }
    },
  })

  const result = await savePurchaseOrder(client, 'entity-1', draftFor())

  assert.equal(result.error, null)
  assert.equal(client.calls.rpc.length, 2, 'the loser must retry')

  const first = client.calls.rpc[0].args.p_purchase_order_payload.po_number
  const second = client.calls.rpc[1].args.p_purchase_order_payload.po_number
  assert.notEqual(first, second, 'the retry must use a fresh candidate')
  assert.equal(result.data.po_number, second)
})

test('po save: a manual collision is surfaced, never silently replaced', async () => {
  const client = createFakeTenantClient({
    rpc: () => ({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    }),
  })

  const result = await savePurchaseOrder(client, 'entity-1', draftFor({ manualNumber: 'PO-000001' }))

  assert.equal(result.data, null)
  assert.match(result.error, /already used/)
  assert.equal(client.calls.rpc.length, 1, 'a manual number must not be replaced by an automatic one')
})

test('po save: prepared totals come from the canonical engine, not from the caller', async () => {
  const client = createFakeTenantClient({ rpc: successRpc() })
  const params = draftFor({ items: [{ description: 'Cement', quantity: 20, unit_cost: 5000 }] })

  // Deliberately wrong stored totals on the incoming header.
  params.purchaseOrder.subtotal = 999999
  params.purchaseOrder.vat = 888888
  params.purchaseOrder.total = 777777

  const result = await savePurchaseOrder(client, 'entity-1', params)

  assert.equal(result.error, null)
  const payload = client.calls.rpc[0].args.p_purchase_order_payload
  assert.equal(payload.subtotal, 100000)
  assert.equal(payload.vat, 0)
  assert.equal(payload.total, 100000)
})

test('po save: validation refuses the save before any database work', async () => {
  const client = createFakeTenantClient({ rpc: successRpc() })
  const params = draftFor()
  params.purchaseOrder.supplier_id = ''

  const result = await savePurchaseOrder(client, 'entity-1', params)

  assert.equal(result.data, null)
  assert.match(result.error, /Choose the supplier/)
  assert.equal(client.calls.rpc.length, 0)
  assert.equal(client.calls.from.length, 0)
})

test('po save: a missing business context is refused', async () => {
  const client = createFakeTenantClient({ rpc: successRpc() })

  const result = await savePurchaseOrder(client, null, draftFor())

  assert.equal(result.data, null)
  assert.match(result.error, /Missing business context/)
  assert.equal(client.calls.rpc.length, 0)
})

/* ------------------------------------------------------------------ */
/* Update                                                             */
/* ------------------------------------------------------------------ */

test('po save: update refuses an illegal transition before touching the database', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [{ id: 'po-1', po_number: 'PO-000001', status: 'draft', archived_at: null }],
    rpc: successRpc(),
  })

  const params = draftFor({ status: 'closed' })
  params.mode = 'update'
  params.purchaseOrder.id = 'po-1'

  const result = await savePurchaseOrder(client, 'entity-1', params)

  assert.equal(result.data, null)
  assert.match(result.error, /cannot move from draft to closed/)
  assert.equal(client.calls.rpc.length, 0)
})

test('po save: update refuses to reactivate a terminal purchase order', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [{ id: 'po-1', po_number: 'PO-000001', status: 'cancelled', archived_at: null }],
    rpc: successRpc(),
  })

  const params = draftFor({ status: 'issued' })
  params.mode = 'update'
  params.purchaseOrder.id = 'po-1'

  const result = await savePurchaseOrder(client, 'entity-1', params)

  assert.equal(result.data, null)
  // C1.1 precedence: a content update on a non-draft PO is refused as a
  // content rewrite before the transition table is consulted. The terminal
  // refusal itself still applies on the status-only transition path
  // (purchaseOrderLifecycle.test.js) and in the save RPC.
  assert.match(result.error, /cannot change after it leaves draft/)
  assert.equal(client.calls.rpc.length, 0)
})

test('po save: update allows a legal transition and sends no identity fields', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [{ id: 'po-1', po_number: 'PO-000001', status: 'draft', archived_at: null }],
    rpc: () => ({ data: [{ purchase_order: { id: 'po-1', po_number: 'PO-000001' } }], error: null }),
  })

  const params = draftFor({ status: 'issued' })
  params.mode = 'update'
  params.purchaseOrder.id = 'po-1'

  const result = await savePurchaseOrder(client, 'entity-1', params)

  assert.equal(result.error, null)
  assert.equal(client.calls.rpc.length, 1)
  assert.equal(client.calls.rpc[0].args.p_mode, 'update')
  assert.equal(client.calls.rpc[0].args.p_purchase_order_payload.id, 'po-1')

  // The stored number is the authoritative one and is reported back.
  assert.equal(result.data.id, 'po-1')
  assert.equal(result.data.po_number, 'PO-000001')
  assert.equal(client.calls.rpc[0].args.p_purchase_order_payload.status, 'issued')
  assert.equal('supplier_name' in client.calls.rpc[0].args.p_purchase_order_payload, false)

  // The number is immutable identity, so a manual number is ignored on update
  // and the automatic cursor is never touched.
  assert.equal(client.calls.updates.filter((entry) => entry.table === 'settings').length, 0)
})

test('po save: update refuses an unknown purchase order', async () => {
  const client = createFakeTenantClient({ rpc: successRpc() })
  const params = draftFor()
  params.mode = 'update'
  params.purchaseOrder.id = 'missing'

  const result = await savePurchaseOrder(client, 'entity-1', params)

  assert.equal(result.data, null)
  assert.match(result.error, /no longer exists/)
  assert.equal(client.calls.rpc.length, 0)
})

/* ------------------------------------------------------------------ */
/* Reads                                                             */
/* ------------------------------------------------------------------ */

test('po read: a purchase order loads with its items in line order', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [
      {
        id: 'po-1',
        po_number: 'PO-000001',
        po_date: '2026-10-15',
        supplier_id: 'supplier-1',
        supplier_name: 'Frozen Name Ltd',
        status: 'issued',
        currency: 'NGN',
        subtotal: 150000,
        discount: 0,
        vat: 0,
        total: 150000,
        extra_charges: [],
        calculation_inputs: {},
        notes: null,
        terms: null,
        archived_at: null,
      },
    ],
    items: [
      { id: 'i2', purchase_order_id: 'po-1', description: 'Sand', quantity: 1, unit_cost: 1, line_total: 1, sort_order: 5 },
      { id: 'i1', purchase_order_id: 'po-1', description: 'Cement', quantity: 2, unit_cost: 3, line_total: 6, sort_order: 0 },
    ],
  })

  const result = await getPurchaseOrder(client, 'po-1')

  assert.equal(result.error, null)
  assert.equal(result.data.po_number, 'PO-000001')
  assert.equal(result.data.supplier_name, 'Frozen Name Ltd')
  assert.deepEqual(result.data.items.map((item) => item.description), ['Cement', 'Sand'])
})

test('po read: archived purchase orders are excluded by default', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [
      { id: 'po-1', po_number: 'PO-000001', status: 'draft', archived_at: null },
      { id: 'po-2', po_number: 'PO-000002', status: 'draft', archived_at: '2026-10-01T00:00:00Z' },
    ],
  })

  const active = await listPurchaseOrders(client)
  assert.deepEqual(active.data.map((po) => po.po_number), ['PO-000001'])

  const all = await listPurchaseOrders(client, { includeArchived: true })
  assert.equal(all.data.length, 2)
})

test('po read: occupied numbers and the automatic preview follow the numbering rules', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [
      { id: 'po-1', po_number: 'PO-000001', status: 'draft', archived_at: null },
      { id: 'po-2', po_number: 'PO-000002', status: 'draft', archived_at: null },
      { id: 'po-3', po_number: '', status: 'draft', archived_at: null },
    ],
    settings: [{ id: 'settings-1', document_prefixes: { purchase_order: 'XPOR' } }],
  })

  assert.deepEqual(await listOccupiedPurchaseOrderNumbers(client), ['PO-000001', 'PO-000002'])
  assert.equal(await peekNextPurchaseOrderNumber(client, { purchase_order: 'XPOR' }), 'XPOR-000001')
  assert.equal(await peekNextPurchaseOrderNumber(client, null), 'PO-000003')
})

test('po archive: archiving never changes the status or deletes anything', async () => {
  const client = createFakeTenantClient({
    purchaseOrders: [{ id: 'po-1', po_number: 'PO-000001', status: 'issued', archived_at: null }],
  })

  const result = await archivePurchaseOrder(client, 'po-1')

  assert.equal(result.error, null)
  const update = client.calls.updates.find((entry) => entry.table === 'purchase_orders')
  assert.ok(update.payload.archived_at)
  assert.equal('status' in update.payload, false)
})

/* ------------------------------------------------------------------ */
/* Accounting and inventory isolation                                 */
/* ------------------------------------------------------------------ */

const FORBIDDEN_TABLES = [
  'source_transactions',
  'journal_entries',
  'journal_lines',
  'accounting_accounts',
  'accounting_periods',
  'expenses',
  'payments',
  'invoices',
  'invoice_items',
  'item_catalog',
]

test('po isolation: the save path never writes an accounting or inventory row', async () => {
  const client = createFakeTenantClient({
    settings: [{ id: 'settings-1', document_prefixes: {} }],
    rpc: successRpc(),
  })

  await savePurchaseOrder(client, 'entity-1', draftFor())

  for (const table of client.calls.from) {
    assert.equal(FORBIDDEN_TABLES.includes(table), false, `unexpected table access: ${table}`)
  }
  for (const call of client.calls.rpc) {
    assert.equal(call.name, RPC_NAME, `unexpected rpc: ${call.name}`)
  }
  for (const update of client.calls.updates) {
    assert.notEqual(update.table, 'purchase_orders')
    assert.equal(update.table, 'settings')
  }
})

test('po isolation: the service source names no accounting or inventory authority', () => {
  const source = fs.readFileSync(
    path.resolve(import.meta.dirname, '../../modules/purchase-order/purchaseOrderService.ts'),
    'utf8',
  )

  for (const table of FORBIDDEN_TABLES) {
    assert.equal(
      source.includes(`from('${table}')`),
      false,
      `the PO service must not read or write ${table}`,
    )
  }

  // A PO posts nothing. The invoice save path dispatches an accounting event;
  // this path must not.
  assert.equal(/syncInvoiceAccountingEvent|postJournal|sourceTransactionService/.test(source), false)
})

/* ------------------------------------------------------------------ */
/* Migration schema contract                                          */
/* ------------------------------------------------------------------ */

const MIGRATION_PATH = path.resolve(
  import.meta.dirname,
  '../../../supabase/migrations/20261016090000_purchase_order_domain_and_persistence.sql',
)

/**
 * The migration's executable SQL, with `--` comment lines removed.
 *
 * Necessary because the file DOCUMENTS its own boundaries: the comments name
 * `client_supplier_links` and `client_id` precisely to record that neither is
 * used. A raw substring search would read that documentation as a violation.
 */
function executableSql() {
  return fs
    .readFileSync(MIGRATION_PATH, 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
}

test('po schema: the canonical tables, keys and constraints exist', () => {
  const sql = executableSql()

  assert.match(sql, /CREATE TABLE IF NOT EXISTS tenant_master_template\.purchase_orders/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS tenant_master_template\.purchase_order_items/)

  // Number uniqueness is database-enforced, so concurrent saves cannot collide.
  assert.match(sql, /CONSTRAINT purchase_orders_po_number_key UNIQUE \(po_number\)/)

  // Supplier referential integrity, with the FK protection pattern.
  assert.match(
    sql,
    /CONSTRAINT purchase_orders_supplier_id_fkey\s+FOREIGN KEY \(supplier_id\) REFERENCES tenant_master_template\.suppliers\(id\)/,
  )
  assert.match(
    sql,
    /REFERENCES tenant_master_template\.purchase_orders\(id\)/,
  )

  // The independent lifecycle vocabulary.
  assert.match(sql, /status IN \('draft', 'issued', 'cancelled', 'closed'\)/)
  for (const forbidden of ['partially_received', 'received', 'partially_paid', 'paid']) {
    assert.equal(sql.includes(`'${forbidden}'`), false, `${forbidden} must not appear as a PO status`)
  }

  // A procurement cost is its own column, never a sales price.
  assert.match(sql, /unit_cost numeric NOT NULL DEFAULT 0/)
  assert.match(sql, /line_total numeric NOT NULL DEFAULT 0/)
})

test('po schema: the purchase order never references a client', () => {
  const sql = executableSql()

  // No client identity column on either PO table, and no foreign key into the
  // client directory. A PO is issued to a supplier and to nothing else.
  assert.equal(
    /client_id\s+(uuid|text|numeric)/.test(sql),
    false,
    'neither PO table may carry a client_id column',
  )
  assert.equal(
    /REFERENCES[^;]*\bclients\b/.test(sql),
    false,
    'no PO foreign key may reference the clients table',
  )

  // The party-link table is never read while persisting a PO, so a dual-role
  // business stays a supplier in the PO context. It does appear in the
  // provisioning registry, which must clone every tenant table; only the save
  // authority is constrained here.
  const rpcBody = sql.slice(
    sql.indexOf('FUNCTION public.save_purchase_order_with_items_transaction'),
    sql.indexOf('$function$;', sql.indexOf('FUNCTION public.save_purchase_order_with_items_transaction')),
  )
  assert.ok(rpcBody.length > 0, 'the save authority must be present')
  assert.equal(/client_supplier_links/.test(rpcBody), false)
  assert.equal(/client_id/.test(rpcBody), false)
})

test('po schema: provisioning, resource mapping and permissions include the domain', () => {
  const sql = executableSql()

  assert.match(sql, /'purchase_orders', 'purchase_order_items'/)
  assert.match(sql, /WHEN 'purchase_orders' THEN 'purchase_order'/)
  assert.match(sql, /WHEN 'purchase_order_items' THEN 'purchase_order'/)
  assert.match(sql, /\('supplier'\), \('purchase_order'\)/)
  assert.match(sql, /'supplier', 'purchase_order'/)

  // The prefix engine gains exactly one new key.
  assert.match(sql, /document_prefixes ->> 'purchase_order'\) ~ '\^\[A-Z0-9\]\{2,6\}\$'/)
  assert.match(sql, /jsonb_build_object\('purchase_order', 'PO'\)/)

  // Existing tenants converge, and incomplete ones are skipped by name.
  assert.match(sql, /purchase order domain skipped/)
  assert.match(sql, /_prov_clone_table/)
  assert.match(sql, /_prov_install_rls\(\s*v_schema, v_table, v_entity_id, 'purchase_order'\s*\)/)
})

test('po schema: the transaction authority preserves identity and history', () => {
  const sql = executableSql()

  assert.match(sql, /FUNCTION public\.save_purchase_order_with_items_transaction/)

  // A dedicated authority: the invoice and quotation save RPCs are not reused.
  assert.equal(
    /FUNCTION public\.save_invoice_with_items_transaction/.test(sql),
    false,
    'the PO migration must not touch the invoice save RPC',
  )

  // The update branch must not rewrite identity or the frozen snapshot.
  const updateBranch = sql.slice(sql.indexOf('UPDATE %I.purchase_orders'))
  const setClause = updateBranch.slice(0, updateBranch.indexOf('WHERE id = $1'))
  assert.equal(/po_number\s*=/.test(setClause), false, 'an update must not rewrite po_number')
  assert.equal(/supplier_id\s*=/.test(setClause), false, 'an update must not rewrite supplier_id')
  assert.equal(/supplier_name\s*=/.test(setClause), false, 'an update must not rewrite supplier_name')

  // Terminal transitions are refused server-side too.
  assert.match(sql, /terminal and cannot transition/)
  assert.match(sql, /Illegal purchase order transition/)
})

test('po schema: no accounting, inventory, PDF or UI authority is introduced', () => {
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
      `the PO migration must not write ${forbidden}`,
    )
  }

  // No PDF renderer is touched and no UI is added in this phase.
  assert.equal(/@react-pdf|formePdf|FormePDF/.test(sql), false)
})
