import assert from 'node:assert/strict'

/**
 * Stage 3B — Custom document fields, grouped line items, item images.
 *
 * Covers the deterministic engine (bolu-document-ops), the modify contract,
 * and the persist path for custom header/additional-info fields, group_header
 * rows with groupMeta, and conversational item-image clearing. Items cannot
 * yet be given new images through the assistant (no tenant-scoped upload path
 * exists): non-null image_url values are rejected at the contract boundary.
 */
import {
  buildDocumentCreateProposal,
  buildInvoiceModifyProposal,
  validateInvoiceCreateInput,
  validateInvoiceModifyInput,
} from '../../lib/ai-assistant/bolu-operations.ts'
import {
  persistInvoiceModification,
  persistQuotationModification,
  persistInvoiceCreation,
  persistQuotationCreation,
} from '../../lib/ai-assistant/bolu-document-service.ts'
import { computeDocument } from '../../lib/Calculations.ts'

const INVOICE_ID = '123e4567-e89b-12d3-a456-426614174000'
const QUOTATION_ID = '123e4567-e89b-12d3-a456-426614174001'

const approve = (p) => { p.status = 'approved_pending_save'; return p }
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
const parseCf = (row) => (typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields)

let documentSequence = 0
let itemSequence = 0

function createHarness(store, opts = {}) {
  const { projectFails = false } = opts
  documentSequence = 0
  itemSequence = 0
  const docKey = () => (store.family === 'invoice' ? 'invoice_number' : 'quotation_number')
  const tableFamily = () => store.family

  const documentChain = () => ({
    then: (resolve) => resolve({ data: [], error: null }),
    eq: (col, value) => ({
      is: () => ({
        single: async () => ({
          data: clone(store.documents.find((d) => d.id === value)) ?? null,
          error: null,
        }),
        maybeSingle: async () => {
          const found = store.documents.find((d) =>
            col === 'operation_id' ? String(d.operation_id) === String(value) : String(d.id) === String(value),
          )
          return { data: clone(found ?? null), error: null }
        },
      }),
      limit: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    }),
    limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  })

  return {
    isReady: true,
    schemaName: `entity_${store.family}_test`,
    store,
    from: (table) => {
      if (table === 'settings') {
        return {
          select: () => ({ limit: () => ({ single: async () => ({ data: null, error: null }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      if (table === 'projects') {
        return {
          select: () => ({
            eq: (_col, value) => ({
              is: () => ({
                limit: () => ({
                  maybeSingle: async () => {
                    if (projectFails) return { data: null, error: { message: 'lookup failed' } }
                    const found = store.projects.find((p) => p.id === value && p.archived_at == null) ?? null
                    return { data: clone(found), error: null }
                  },
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'invoices' || table === 'quotations') {
        return {
          select: () => documentChain(),
          insert: (rows) => {
            const rowsToInsert = rows.map((row) => ({
              ...clone(row),
              id: row.id ?? `doc-${++documentSequence}-${Date.now().toString(36)}`,
            }))
            store.documents.push(...rowsToInsert)
            return {
              select: () => ({
                single: async () => ({ data: clone(rowsToInsert[0]), error: null }),
              }),
            }
          },
          update: (values) => ({
            eq: async (_col, value) => {
              const idx = store.documents.findIndex((d) => String(d.id) === String(value))
              if (idx === -1) return { error: { message: 'document not found' } }
              store.documents[idx] = { ...store.documents[idx], ...values }
              return { error: null }
            },
          }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      if (table === 'invoice_items' || table === 'quotation_items') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: clone(store.items), error: null }),
            }),
          }),
          insert: async (rows) => {
            store.items.push(...rows.map((r) => ({ ...clone(r), id: `item-${++itemSequence}` })))
            return { error: null }
          },
          delete: () => ({
            eq: async (col, value) => {
              store.items = store.items.filter((r) => String(r[col]) !== String(value))
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
    rpc: async (name, params) => {
      if (name === 'save_invoice_with_items_transaction') {
        return {
          data: [{
            invoice: {
              id: `doc-invoice-${Date.now().toString(36)}`,
              invoice_number: params?.p_invoice_payload?.invoice_number ?? 'INV-000001',
            },
          }],
          error: null,
        }
      }
      if (name === 'save_quotation_with_items_transaction') {
        return {
          data: [{
            quotation: {
              id: `doc-quotation-${Date.now().toString(36)}`,
              quotation_number: params?.p_quotation_payload?.quotation_number ?? 'QTN-000001',
            },
          }],
          error: null,
        }
      }
      return { data: null, error: null }
    },
  }
}

function seedStore({ family = 'invoice', projects = [] } = {}) {
  return { family, documents: [], items: [], projects }
}

async function createInvoice(store, payload) {
  const harness = createHarness(store)
  const validation = validateInvoiceCreateInput(payload)
  assert.equal(validation.valid, true, validation.errors.join(', '))
  const proposal = approve(buildDocumentCreateProposal('invoice', validation.data, 'INV-DRAFT'))
  const result = await persistInvoiceCreation(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  return result
}

async function createQuotation(store, payload) {
  const harness = createHarness(store)
  const validation = validateInvoiceCreateInput(payload)
  assert.equal(validation.valid, true, validation.errors.join(', '))
  const proposal = approve(buildDocumentCreateProposal('quotation', validation.data, 'QTN-DRAFT'))
  const result = await persistQuotationCreation(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  return result
}

function modifyProposal({ harness, document, items, change, family = 'invoice' }) {
  const current = { document: clone(document), items: clone(items ?? []) }
  const number = document[family === 'quotation' ? 'quotation_number' : 'invoice_number']
  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: document.id,
    targetDocumentNumber: number,
    documentFamily: family,
    ...change,
    current,
  }))
  return proposal
}

const itemsOf = (store, family = 'invoice') => clone(store.items)

/* -------- p) custom document fields -------- */

test('p1. header details rows can be added, updated and removed; untouched entries are preserved', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000 }],
  })
  const created = clone(store.documents[0])

  // Add two entries + one chip.
  const add = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: {
      customFieldsChange: {
        header: [
          { op: 'add', label: 'Delivery site', value: 'Lagos Mainland' },
          { op: 'add', label: 'Delivery note', value: 'DN-042' },
        ],
        additionalFields: [{ op: 'add', label: 'Access', value: '24/7' }],
      },
    },
  })
  const r1 = await persistInvoiceModification(createHarness(store), add, () => true, () => true, null)
  assert.equal(r1.success, true, r1.error)
  const after1 = parseCf(store.documents[0])
  assert.deepEqual(
    (after1.header ?? []).map((e) => [e.label, e.value]),
    [['Delivery site', 'Lagos Mainland'], ['Delivery note', 'DN-042']],
  )
  assert.deepEqual((after1.additionalFields ?? []).map((e) => [e.label, e.value]), [['Access', '24/7']])

  // Update the first row by label; add a new chip.
  const update = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: {
      customFieldsChange: {
        header: [{ op: 'update', match: { label: 'Delivery site' }, set: { value: 'Ikeja, Lagos' } }],
      },
    },
  })
  const r2 = await persistInvoiceModification(createHarness(store), update, () => true, () => true, null)
  assert.equal(r2.success, true, r2.error)
  const after2 = parseCf(store.documents[0])
  assert.deepEqual(
    (after2.header ?? []).map((e) => [e.label, e.value]),
    [['Delivery site', 'Ikeja, Lagos'], ['Delivery note', 'DN-042']],
  )
  assert.deepEqual((after2.additionalFields ?? []).map((e) => e.label), ['Access'])

  // Remove one entry; the other survives.
  const remove = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: {
      customFieldsChange: { header: [{ op: 'remove', match: { label: 'Delivery note' } }] },
    },
  })
  const r3 = await persistInvoiceModification(createHarness(store), remove, () => true, () => true, null)
  assert.equal(r3.success, true, r3.error)
  assert.deepEqual(
    (parseCf(store.documents[0]).header ?? []).map((e) => e.label),
    ['Delivery site'],
  )
})

test('p2. entries with empty label or value are rejected at validation; duplicates rejected', async () => {
  const bad = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    customFieldsChange: { header: [{ op: 'add', label: '  ', value: 'x' }] },
  })
  assert.equal(bad.valid, false)

  const dup = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    customFieldsChange: {
      header: [
        { op: 'add', label: 'Site', value: 'A' },
        { op: 'add', label: 'site', value: 'B' },
      ],
    },
  })
  assert.equal(dup.valid, false)
})

test('p3. chips added and removed on quotations; invoice and quotation use the same families', async () => {
  const store = seedStore({ family: 'quotation' })
  await createQuotation(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 800000 }],
  })
  const created = clone(store.documents[0])
  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store, 'quotation'),
    family: 'quotation',
    change: {
      customFieldsChange: {
        additionalFields: [
          { op: 'add', label: 'Payment ref', value: 'PR-991' },
          { op: 'add', label: 'Site access', value: 'Escorted only' },
        ],
      },
    },
  })
  const result = await persistQuotationModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.deepEqual(
    (parseCf(store.documents[0]).additionalFields ?? []).map((e) => e.label),
    ['Payment ref', 'Site access'],
  )
})

test('p4. custom_fields siblings are preserved verbatim; creation metadata survives edits', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000 }],
  })
  const created = clone(store.documents[0])
  const cfBefore = parseCf(created)
  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { customFieldsChange: { header: [{ op: 'add', label: 'Location', value: 'Plant 2' }] } },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  const cfAfter = parseCf(store.documents[0])
  assert.equal(cfAfter.operation_id, cfBefore.operation_id)
  assert.equal(cfAfter.created_via, cfBefore.created_via)
  assert.deepEqual(cfAfter.extraCharges, cfBefore.extraCharges)
  assert.deepEqual(cfAfter.calculationInputs, cfBefore.calculationInputs)
  assert.deepEqual(cfAfter.groupMeta, cfBefore.groupMeta)
})

test('p5. a concurrent family edit is rejected as stale before any write', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000 }],
  })
  const created = clone(store.documents[0])

  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { customFieldsChange: { header: [{ op: 'add', label: 'Location', value: 'Plant 2' }] } },
  })

  // Someone else edits the family after the snapshot was taken.
  const idx = store.documents.findIndex((d) => d.id === created.id)
  const cf = parseCf(store.documents[idx])
  store.documents[idx].custom_fields = JSON.stringify({
    ...cf,
    header: [...(cf.header ?? []), { id: 'intruder', label: 'Sneaky row', value: 'nope' }],
  })

  const rejected = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(rejected.success, false)
  assert.match(rejected.error ?? '', /details changed/i)
})

test('p6. a field update on a non-existent label fails with a business message', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000 }],
  })
  const created = clone(store.documents[0])
  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: {
      customFieldsChange: {
        header: [{ op: 'update', match: { label: 'No such row' }, set: { value: 'X' } }],
      },
    },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /No details row named "No such row" exists/i)
})

test('p7. a duplicated label family cannot be resolved silently', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000 }],
  })
  const created = clone(store.documents[0])
  const cf = parseCf(created)
  store.documents[0].custom_fields = JSON.stringify({
    ...cf,
    header: [
      { id: 'h1', label: 'Site', value: 'A' },
      { id: 'h2', label: 'Site', value: 'B' },
    ],
  })

  const proposal = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: {
      customFieldsChange: { header: [{ op: 'update', match: { label: 'Site' }, set: { value: 'C' } }] },
    },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /More than one details row is named "Site"/i)
})

/* -------- g) grouped line items -------- */

test('g1. creating a group mints stable group ids and members; headers contribute zero', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [
      { description: 'Cable 1.5mm', quantity: 10, unit_price: 700 },
      { description: 'Switch socket', quantity: 5, unit_price: 1200 },
      { description: 'Pump overhaul', quantity: 1, unit_price: 950000 },
    ],
  })
  const created = clone(store.documents[0])
  const baseline = Number(created.total)

  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: {
      groupsChange: [
        { op: 'create-group', name: 'Electrical Works' },
        { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm', 'Switch socket'] },
      ],
    },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)

  const after = store.items
  const header = after.find((row) => row.row_type === 'group_header')
  assert.ok(header, 'expected a group_header row')
  assert.ok(String(header.group_id).startsWith('grp_'))
  assert.equal(String(header.group_name ?? '').trim(), 'Electrical Works')
  assert.equal(Number(header.quantity), 0)
  assert.equal(Number(header.unit_price), 0)
  const members = after.filter((row) => row.group_id === header.group_id && row.row_type !== 'group_header')
  assert.equal(members.length, 2)
  assert.ok(after.indexOf(header) < Math.min(...members.map((m) => after.indexOf(m))))

  const cf = parseCf(store.documents[0])
  assert.equal(cf.groupMeta[header.group_id].name, 'Electrical Works')

  // Grouping must not change commercial math.
  const itemsForCalc = clone(store.items)
  const calc = computeDocument({
    items: itemsForCalc,
    document: { ...store.documents[0], workmanship: 0, transportation: 0, shipping: 0 },
    cf,
    columns: [],
  })
  assert.equal(Number(store.documents[0].total), baseline)
  assert.equal(calc.totalPayable, baseline)
})

test('g2. rename preserves membership and updates groupMeta', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Cable 1.5mm', quantity: 10, unit_price: 700 }],
  })
  const created = clone(store.documents[0])

  const create = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'create-group', name: 'Electric' }, { op: 'add-items', group: 'Electric', items: ['Cable 1.5mm'] }] },
  })
  await persistInvoiceModification(createHarness(store), create, () => true, () => true, null)

  const rename = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'rename-group', group: 'Electric', set: { name: 'Electrical Works' } }] },
  })
  const result = await persistInvoiceModification(createHarness(store), rename, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  const after = store.items
  const header = after.find((row) => row.row_type === 'group_header')
  assert.equal(header.group_name, 'Electrical Works')
  assert.equal(after.find((row) => row.row_type !== 'group_header').group_name, 'Electrical Works')
  assert.equal(parseCf(store.documents[0]).groupMeta[header.group_id].name, 'Electrical Works')
})

test('g3. moving an item between groups reassigns membership; unassigning returns it to ungrouped', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [
      { description: 'Cable 1.5mm', quantity: 10, unit_price: 700 },
      { description: 'Switch socket', quantity: 5, unit_price: 1200 },
      { description: 'Meter', quantity: 1, unit_price: 55000 },
    ],
  })
  const created = clone(store.documents[0])
  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: {
      groupsChange: [
        { op: 'create-group', name: 'Electrical Works' },
        { op: 'create-group', name: 'Equipment' },
        { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm', 'Switch socket'] },
        { op: 'add-items', group: 'Equipment', items: ['Meter'] },
      ],
    },
  })
  await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)

  const move = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'add-items', group: 'Equipment', items: ['Cable 1.5mm'] }] },
  })
  const after1 = await persistInvoiceModification(createHarness(store), move, () => true, () => true, null)
  assert.equal(after1.success, true, after1.error)
  const cable = store.items.find((row) => row.description === 'Cable 1.5mm')
  const equipment = store.items.find((row) => row.row_type === 'group_header' && row.group_name === 'Equipment')
  assert.equal(cable.group_id, equipment.group_id)

  const unassign = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'add-items', group: null, items: ['Cable 1.5mm'] }] },
  })
  const after2 = await persistInvoiceModification(createHarness(store), unassign, () => true, () => true, null)
  assert.equal(after2.success, true, after2.error)
  assert.equal(store.items.find((row) => row.description === 'Cable 1.5mm').group_id ?? null, null)
})

test('g4. remove-group keeps members as ordinary line items by disposition', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [
      { description: 'Cable 1.5mm', quantity: 10, unit_price: 700 },
      { description: 'Switch socket', quantity: 5, unit_price: 1200 },
    ],
  })
  const created = clone(store.documents[0])
  const create = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'create-group', name: 'Electrical Works' }, { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm', 'Switch socket'] }] },
  })
  await persistInvoiceModification(createHarness(store), create, () => true, () => true, null)

  const remove = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'remove-group', group: 'Electrical Works', disposition: 'ungroup-items' }] },
  })
  const result = await persistInvoiceModification(createHarness(store), remove, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.equal(store.items.filter((row) => row.row_type === 'group_header').length, 0)
  assert.equal(store.items.filter((row) => row.group_id).length, 0)
  assert.equal(store.items.length, 2)
  assert.equal(parseCf(store.documents[0]).groupMeta['missing'], undefined)
})

test('g5. remove-group with delete-items deletes only that group\'s rows', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [
      { description: 'Cable 1.5mm', quantity: 10, unit_price: 700 },
      { description: 'Switch socket', quantity: 5, unit_price: 1200 },
      { description: 'Pump overhaul', quantity: 1, unit_price: 950000 },
    ],
  })
  const created = clone(store.documents[0])
  const create = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'create-group', name: 'Electrical Works' }, { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm', 'Switch socket'] }] },
  })
  await persistInvoiceModification(createHarness(store), create, () => true, () => true, null)

  const remove = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'remove-group', group: 'Electrical Works', disposition: 'delete-items' }] },
  })
  const result = await persistInvoiceModification(createHarness(store), remove, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.equal(store.items.length, 1)
  assert.equal(store.items[0].description, 'Pump overhaul')
  assert.equal(store.items[0].group_id, null)
})

test('g6. set-subtotal toggles groupMeta.showSubtotal on the correct group', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Cable 1.5mm', quantity: 10, unit_price: 700 }],
  })
  const created = clone(store.documents[0])
  const create = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'create-group', name: 'Electrical Works' }, { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm'] }] },
  })
  await persistInvoiceModification(createHarness(store), create, () => true, () => true, null)

  const on = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'set-subtotal', group: 'Electrical Works', showSubtotal: true }] },
  })
  const r1 = await persistInvoiceModification(createHarness(store), on, () => true, () => true, null)
  assert.equal(r1.success, true, r1.error)
  const header = store.items.find((row) => row.row_type === 'group_header')
  assert.equal(parseCf(store.documents[0]).groupMeta[header.group_id].showSubtotal, true)
})

test('g7. reorder-groups rewrites the order of group blocks, members stay with their header', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [
      { description: 'Cable 1.5mm', quantity: 10, unit_price: 700 },
      { description: 'Switch socket', quantity: 5, unit_price: 1200 },
    ],
  })
  const created = clone(store.documents[0])
  const create = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: {
      groupsChange: [
        { op: 'create-group', name: 'Equipment' },
        { op: 'create-group', name: 'Electrical Works' },
        { op: 'add-items', group: 'Equipment', items: ['Cable 1.5mm'] },
        { op: 'add-items', group: 'Electrical Works', items: ['Switch socket'] },
      ],
    },
  })
  await persistInvoiceModification(createHarness(store), create, () => true, () => true, null)

  const reorder = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'reorder-groups', order: ['Electrical Works', 'Equipment'] }] },
  })
  const result = await persistInvoiceModification(createHarness(store), reorder, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  const headers = store.items.filter((row) => row.row_type === 'group_header').map((row) => row.group_name)
  assert.deepEqual(headers, ['Electrical Works', 'Equipment'])
})

test('g8. an ambiguous item description in a group op is refused with guidance', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [
      { description: 'Cable 1.5mm', quantity: 10, unit_price: 700 },
      { description: 'Cable 1.5mm', quantity: 5, unit_price: 750 },
    ],
  })
  const created = clone(store.documents[0])
  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'create-group', name: 'Electrical Works' }, { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm'] }] },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /More than one line item matches "Cable 1.5mm"/i)
})

test('g9. a concurrent item change rejects the group proposal at Gate 2', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Cable 1.5mm', quantity: 10, unit_price: 700 }],
  })
  const created = clone(store.documents[0])
  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'create-group', name: 'Electrical Works' }, { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm'] }] },
  })

  const idx = store.items.findIndex((row) => row.description === 'Cable 1.5mm')
  store.items[idx] = { ...store.items[idx], unit_price: 800 }

  const rejected = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(rejected.success, false)
  assert.match(rejected.error ?? '', /items changed after this proposal was prepared/i)
})

test('g10. reorder with a partial group list is refused', async () => {
  const result = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    documentFamily: 'invoice',
    groupsChange: [{ op: 'reorder-groups', order: ['One'] }],
  })
  assert.equal(result.valid, true) // structure ok; semantics enforced against the snapshot
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [
      { description: 'Cable 1.5mm', quantity: 10, unit_price: 700 },
      { description: 'Switch socket', quantity: 5, unit_price: 1200 },
    ],
  })
  const created = clone(store.documents[0])
  const create = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: {
      groupsChange: [
        { op: 'create-group', name: 'Equipment' },
        { op: 'create-group', name: 'Electrical Works' },
        { op: 'add-items', group: 'Equipment', items: ['Cable 1.5mm'] },
        { op: 'add-items', group: 'Electrical Works', items: ['Switch socket'] },
      ],
    },
  })
  await persistInvoiceModification(createHarness(store), create, () => true, () => true, null)

  const partial = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'reorder-groups', order: ['Equipment'] }] },
  })
  const result2 = await persistInvoiceModification(createHarness(store), partial, () => true, () => true, null)
  assert.equal(result2.success, false)
  assert.match(result2.error ?? '', /must list every group/i)
})

test('g11. itemsChange and groupsChange cannot be combined in one proposal', () => {
  const result = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    documentFamily: 'invoice',
    items: [{ description: 'Cable 1.5mm', quantity: 10, unit_price: 700 }],
    groupsChange: [{ op: 'create-group', name: 'Electrical Works' }],
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => /one/i.test(e)))
})

/* -------- m) item images -------- */

test('m1. an existing item photo is preserved across an unrelated item edit', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Cable 1.5mm', quantity: 10, unit_price: 700 }],
  })
  store.items[0] = { ...store.items[0], image_url: 'https://cdn.example.test/cable.jpg' }
  store.documents[0].custom_fields = JSON.stringify({ ...parseCf(store.documents[0]), showItemImages: true })

  const created = clone(store.documents[0])
  const oldItem = clone(store.items[0])
  const itemInput = {
    description: 'Cable 1.5mm',
    quantity: 12,
    unit_price: 650,
    unit: 'roll',
  }
  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: created.id,
    targetDocumentNumber: created.invoice_number,
    documentFamily: 'invoice',
    itemsChange: {
      oldItems: [{ ...itemInput, install_rate: null, vat_rate: null, discount_rate: null, install_rate_taxable: false, group_id: null, group_name: null, item_id: null, sub_description: null, make: null }],
      newItems: [{ ...itemInput, install_rate: null, vat_rate: null, discount_rate: null, install_rate_taxable: false, group_id: null, group_name: null, item_id: null, sub_description: null, make: null }],
    },
    current: { document: created, items: itemsOf(store) },
  }))
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.equal(store.items[0].image_url, 'https://cdn.example.test/cable.jpg')
  assert.equal(store.items[0].quantity, 12)
  assert.equal(store.items[0].unit_price, 650)
})

test('m2. an item photo is cleared conversationally via image_url null; siblings survive', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Switch socket', quantity: 5, unit_price: 1200 }],
  })
  store.items[0] = { ...store.items[0], image_url: 'https://cdn.example.test/socket.jpg' }
  store.documents[0].custom_fields = JSON.stringify({ ...parseCf(store.documents[0]), showItemImages: true })

  const created = clone(store.documents[0])
  const itemInput = {
    description: 'Switch socket',
    quantity: 5,
    unit_price: 1200,
    image_url: null,
  }
  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: created.id,
    targetDocumentNumber: created.invoice_number,
    documentFamily: 'invoice',
    itemsChange: {
      oldItems: [{ ...itemInput, image_url: 'https://cdn.example.test/socket.jpg', install_rate: null, vat_rate: null, discount_rate: null, install_rate_taxable: false, group_id: null, group_name: null, item_id: null, sub_description: null, make: null }],
      newItems: [{ ...itemInput, install_rate: null, vat_rate: null, discount_rate: null, install_rate_taxable: false, group_id: null, group_name: null, item_id: null, sub_description: null, make: null }],
    },
    current: { document: created, items: itemsOf(store) },
  }))
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.equal(store.items[0].image_url, null)
  const cf = parseCf(store.documents[0])
  assert.equal(cf.showItemImages, false)
})

test('m3. adding or replacing a photo through the assistant is rejected honestly', async () => {
  const result = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    documentFamily: 'invoice',
    items: [{ description: 'Cable 1.5mm', quantity: 10, unit_price: 700, image_url: 'https://evil.example.test/photo.jpg' }],
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => /photo/i.test(e) && /document form/i.test(e)))
})

test('m4. a blob: URL cannot be smuggled through the items contract', () => {
  const result = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    documentFamily: 'invoice',
    items: [{ description: 'Cable 1.5mm', quantity: 10, unit_price: 700, image_url: 'blob:http://localhost/abc' }],
  })
  assert.equal(result.valid, false)
})

test('m5. image_url null is accepted as the removal request only', () => {
  const result = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    documentFamily: 'invoice',
    items: [{ description: 'Cable 1.5mm', quantity: 10, unit_price: 700, image_url: null }],
  })
  assert.equal(result.valid, true)
})

/* -------- n) document ops engine units -------- */

test('n1. group removal deletes groupMeta entry so group ids never orphan', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [
      { description: 'Cable 1.5mm', quantity: 10, unit_price: 700 },
      { description: 'Switch socket', quantity: 5, unit_price: 1200 },
    ],
  })
  const created = clone(store.documents[0])
  const create = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'create-group', name: 'Electrical Works' }, { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm', 'Switch socket'] }] },
  })
  await persistInvoiceModification(createHarness(store), create, () => true, () => true, null)
  const groupId = store.items.find((row) => row.row_type === 'group_header').group_id
  assert.ok(parseCf(store.documents[0]).groupMeta[groupId])

  const remove = modifyProposal({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'remove-group', group: 'Electrical Works', disposition: 'ungroup-items' }] },
  })
  await persistInvoiceModification(createHarness(store), remove, () => true, () => true, null)
  assert.equal(parseCf(store.documents[0]).groupMeta[groupId], undefined)
})

test('n2. group headers never carry quantity or price into totals', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Cable 1.5mm', quantity: 10, unit_price: 700 }],
  })
  const created = clone(store.documents[0])
  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'create-group', name: 'Electrical Works' }, { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm'] }] },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  const header = store.items.find((row) => row.row_type === 'group_header')
  assert.equal(Number(header.quantity), 0)
  assert.equal(Number(header.unit_price), 0)
  assert.equal(Number(header.vat_rate ?? 0), 0)
})

/* -------- o) preview rendering (SSR markup) -------- */

test('o1. the modify card renders group headings and chip changes distinctly', async () => {
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { ProposalCardView } = await import('../../components/ai-assistant/chat/assistant-chat-parts.tsx')

  const proposal = {
    opId: 'op-o1',
    operationType: 'modify-document',
    documentFamily: 'invoice',
    schemaVersion: '1.0',
    requiredPermission: { resource: 'invoice', action: 'edit' },
    sideEffect: 'draft-mutation',
    gate1Required: true,
    gate2Required: true,
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-0007',
    customFieldsChange: {
      oldHeader: [],
      newHeader: [{ label: 'Delivery site', value: 'Lagos Mainland' }],
      oldAdditionalFields: [],
      newAdditionalFields: [{ label: 'Access', value: '24/7' }],
      summary: ['Added details row "Delivery site": Lagos Mainland.', 'Added chip "Access": 24/7.'],
      errors: [],
      fingerprintHeader: 'x',
      fingerprintAdditionalFields: 'y',
    },
    groupsApplication: {
      summary: ['Created group "Electrical Works".'],
      errors: [],
      after: [{ name: 'Electrical Works', members: 2, showSubtotal: true }],
      previewRows: [
        { type: 'group', text: 'Electrical Works', showSubtotal: true },
        { type: 'item', text: 'Cable 1.5mm' },
        { type: 'item', text: 'Switch socket' },
      ],
    },
  }
  const html = renderToStaticMarkup(createElement(ProposalCardView, { proposal }))
  assert.ok(html.includes('Document details'), 'details rows section renders')
  assert.ok(html.includes('Delivery site'), 'details row label renders')
  assert.ok(html.includes('Access'), 'chip label renders')
  assert.ok(html.includes('Document groups'), 'groups section renders')
  assert.ok(html.includes('Electrical Works'), 'group heading renders')
  assert.ok(html.includes('Cable 1.5mm'), 'member item renders')
  assert.ok(html.includes('Subtotal shown'), 'subtotal indicator renders')
})

test('o2. the copied artifact carries groups and details', async () => {
  const { proposalPlainText } = await import('../../components/ai-assistant/chat/assistant-chat-parts.tsx')
  const proposal = {
    opId: 'op-o2',
    operationType: 'modify-document',
    documentFamily: 'invoice',
    schemaVersion: '1.0',
    requiredPermission: { resource: 'invoice', action: 'edit' },
    sideEffect: 'draft-mutation',
    gate1Required: true,
    gate2Required: true,
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-0008',
    customFieldsChange: {
      oldHeader: [{ id: 'h1', label: 'Delivery site', value: 'Equi' }],
      newHeader: [],
      oldAdditionalFields: [],
      newAdditionalFields: [],
      summary: ['Removed details row "Delivery site".'],
      errors: [],
      fingerprintHeader: 'x',
      fingerprintAdditionalFields: 'y',
    },
    groupsApplication: {
      summary: [],
      errors: [],
      after: [{ name: 'Electrical Works', members: 1, showSubtotal: false }],
      previewRows: [
        { type: 'group', text: 'Electrical Works', showSubtotal: false },
        { type: 'item', text: 'Cable 1.5mm' },
      ],
    },
  }
  const text = proposalPlainText(proposal)
  assert.ok(text.includes('Document details:'))
  assert.ok(text.includes('Delivery site'))
  assert.ok(text.includes('Document groups:'))
  assert.ok(text.includes('Electrical Works'))
})
test('g11b. the atomic RPC path accepts a grouped item set including group headers', async () => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [
      { description: 'Cable 1.5mm', quantity: 10, unit_price: 700 },
      { description: 'Switch socket', quantity: 5, unit_price: 1200 },
    ],
  })
  const created = clone(store.documents[0])
  const proposal = modifyProposal({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { groupsChange: [{ op: 'create-group', name: 'Electrical Works' }, { op: 'add-items', group: 'Electrical Works', items: ['Cable 1.5mm', 'Switch socket'] }] },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, 'entity-x', null)
  assert.equal(result.success, true, result.error)
})