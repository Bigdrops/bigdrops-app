import assert from 'node:assert/strict'

/**
 * Stage 3A.2 — Existing-document field & commercial charge modifications.
 *
 * Scalar-field edits round-trip through the Bolu modify executors with the
 * persisted proposal baseline enforced; fixed commercial charges, named
 * extra charges and calculation inputs all flow through the same canonical
 * engine the document form uses; clearing a charge to zero is an explicit
 * write; and the proposal preview shows exactly what will change.
 */
import {
  buildDocumentCreateProposal,
  buildInvoiceModifyProposal,
  validateInvoiceCreateInput,
  validateInvoiceModifyInput,
} from '../../lib/ai-assistant/bolu-operations.ts'
import { proposalPlainText, ProposalCardView } from '../../components/ai-assistant/chat/assistant-chat-parts.tsx'
import { cleanAssistantProse } from '../../components/ai-assistant/chat/assistant-chat-thread.tsx'
import {
  persistInvoiceModification,
  persistQuotationModification,
  persistInvoiceCreation,
  persistQuotationCreation,
} from '../../lib/ai-assistant/bolu-document-service.ts'
import { mock, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { computeDocument } from '../../lib/Calculations.ts'
import { readBoluModifySnapshot } from '../../lib/ai-assistant/bolu-data.ts'

const INVOICE_ID = '123e4567-e89b-12d3-a456-426614174000'
const QUOTATION_ID = '123e4567-e89b-12d3-a456-426614174001'
const PROJECT_ID = '33333333-4444-5555-6666-777777777777'
const FOREIGN_PROJECT_ID = '44444444-5555-4555-8555-444444444444'

const approve = (p) => { p.status = 'approved_pending_save'; return p }

function clone(v) {
  return v === undefined ? v : JSON.parse(JSON.stringify(v))
}

function createHarness(store, opts = {}) {
  const { projectFails = false, updateError = null, rpcError = null, itemsFetchError = null } = opts
  let documentSequence = 0
  let itemSequence = 0

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
    limit: () => ({
      maybeSingle: async () => ({ data: null, error: null }),
    }),
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
                    if (projectFails) return { data: null, error: { message: 'simulated project lookup failure' } }
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
        const nextNumber = () => `${table === 'invoices' ? 'INV' : 'QTN'}-${String(++documentSequence).padStart(6, '0')}`
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
              if (updateError) return { error: { message: updateError } }
              const idx = store.documents.findIndex((d) => String(d.id) === String(value))
              if (idx === -1) return { error: { message: 'document not found' } }
              store.documents[idx] = { ...store.documents[idx], ...values }
              return { error: null }
            },
          }),
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }
      if (table === 'invoice_items' || table === 'quotation_items') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => (itemsFetchError
                ? { data: null, error: { message: itemsFetchError } }
                : { data: clone(store.items), error: null }),
            }),
          }),
          insert: async (rows) => {
            store.items.push(...rows.map((r) => ({ ...clone(r), id: `item-${++itemSequence}` })))
            return { error: null }
          },
          delete: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
    rpc: async (name, params) => {
      if (rpcError) {
        return { data: null, error: { message: rpcError } }
      }
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

const parseCf = (row) => (typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields)

async function createInvoice(harness, store, payload) {
  // Mirror the application flow: validation first, then the proposal builds
  // from the validated payload (the model never reaches persistence raw).
  const validation = validateInvoiceCreateInput(payload)
  assert.equal(validation.valid, true, validation.errors.join(', '))
  const create = buildDocumentCreateProposal('invoice', validation.data, 'INV-DRAFT')
  const result = await persistInvoiceCreation(harness, approve(create), () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  return result
}

async function createQuotation(harness, store, payload) {
  const validation = validateInvoiceCreateInput(payload)
  assert.equal(validation.valid, true, validation.errors.join(', '))
  const create = buildDocumentCreateProposal('quotation', validation.data, 'QTN-DRAFT')
  const result = await persistQuotationCreation(harness, approve(create), () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  return result
}

const modifyProposal = (target, documentFamily, change, snapshotItems) => {
  const current = {
    document: clone(target.document),
    items: clone(snapshotItems ?? target.items ?? []),
  }
  const docNumber = current.document[documentFamily === 'quotation' ? 'quotation_number' : 'invoice_number']
  const build = () => buildInvoiceModifyProposal({
    targetDocumentId: current.document.id,
    targetDocumentNumber: docNumber ?? 'INV-TARGET',
    documentFamily,
    ...change,
    current,
  })
  return { proposal: approve(build()), current }
}

/* -------- a) Scalar field edits & round-trip -------- */

test('a1. invoice: title, po_number and work_duration round-trip through the modify executor', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  const created = await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000 }],
    work_duration: '2 weeks',
    po_number: 'PO-100',
  })
  const createdRow = clone(store.documents[0])

  const { proposal } = modifyProposal({ document: createdRow, items: store.items }, 'invoice', {
    field: 'po_number',
    newValue: 'PO-200',
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)
  assert.equal(store.documents[0].po_number, 'PO-200')

  const stale = approve(buildInvoiceModifyProposal({
    targetDocumentId: createdRow.id,
    targetDocumentNumber: createdRow.invoice_number,
    documentFamily: 'invoice',
    field: 'po_number',
    newValue: 'PO-300',
    current: { document: createdRow, items: store.items },
  }))
  const rejected = await persistInvoiceModification(harness, stale, () => true, () => true, null)
  assert.equal(rejected.success, false)
  assert.match(rejected.error ?? '', /modified by another process/)
  assert.equal(store.documents[0].po_number, 'PO-200')
})

test('a2. invoice: workmanship 0 -> 250000 persists and recomputes the authoritative total', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  const beforeCreate = await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 10, unit_price: 95000 }],
  })
  const baseline = clone(store.documents[0])
  const baselineTotal = Number(baseline.total)

  const { proposal } = modifyProposal({ document: clone(baseline), items: store.items }, 'invoice', {
    field: 'workmanship',
    newValue: 250000,
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)

  const after = store.documents[0]
  assert.equal(Number(after.workmanship), 250000)
  assert.equal(Number(after.total) > baselineTotal, true)

  const cf = parseCf(after)
  const expected = computeDocument({
    items: store.items,
    document: { ...baseline, workmanship: 250000 },
    cf,
    columns: Array.isArray(cf.columnConfig) ? cf.columnConfig : [],
  })
  assert.equal(Number(after.total), expected.totalPayable)
  assert.equal(Number(after.vat), expected.vat)
})

test('a3. invoice: clearing workmanship to 0 writes 0 and recomputes totals down', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
    workmanship: 40000,
  })
  const withCharge = clone(store.documents[0])
  assert.equal(Number(withCharge.workmanship), 40000)

  const { proposal } = modifyProposal({ document: clone(withCharge), items: store.items }, 'invoice', {
    field: 'workmanship',
    newValue: 0,
  })
  const cleared = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(cleared.success, true, cleared.error)

  const after = store.documents[0]
  assert.equal(Number(after.workmanship), 0)

  const cf = parseCf(after)
  const expected = computeDocument({
    items: store.items,
    document: { ...withCharge, workmanship: 0 },
    cf,
    columns: [],
  })
  assert.equal(Number(after.total), expected.totalPayable)
})

test('a4. quotation: title and valid_until (via due_date) round-trip; work_duration is executor-rejected', async () => {
  const store = seedStore({ family: 'quotation' })
  const harness = createHarness(store)

  const created = await createQuotation(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 800000 }],
    title: 'Site visit',
  })
  const quotation = clone(store.documents[0])

  const modifyTitle = modifyProposal({ document: quotation, items: store.items }, 'quotation', {
    field: 'title',
    newValue: 'Site visit v2',
  })
  const updated = await persistQuotationModification(harness, modifyTitle.proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)
  assert.equal(store.documents[0].quotation_title, 'Site visit v2')

  const modifying = modifyProposal({ document: clone(store.documents[0]), items: store.items }, 'quotation', {
    field: 'due_date',
    newValue: '2026-12-31',
  })
  const updated2 = await persistQuotationModification(harness, modifying.proposal, () => true, () => true, null)
  assert.equal(updated2.success, true, updated2.error)
  assert.equal(store.documents[0].valid_until, '2026-12-31')

  const workDurationProposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: quotation.id,
    targetDocumentNumber: quotation.quotation_number,
    documentFamily: 'quotation',
    field: 'work_duration',
    oldValue: null,
    newValue: '3 weeks',
    current: { document: quotation, items: store.items },
  }))
  const rejected = await persistQuotationModification(harness, workDurationProposal, () => true, () => true, null)
  assert.equal(rejected.success, false)
  assert.match(rejected.error ?? '', /invoices only/)
})

test('a5. quotation: work_duration modify payload fails validation for quotations', async () => {
  const result = validateInvoiceModifyInput(
    { documentId: QUOTATION_ID, documentFamily: 'quotation', field: 'work_duration', newValue: '3 weeks' },
    { documentFamily: 'quotation' },
  )
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => /invoices only/.test(e)))
})

/* -------- b) Project reference verification -------- */

test('b1. a project that exists and is active in the tenant is attached', async () => {
  const store = seedStore({
    family: 'invoice',
    projects: [{ id: PROJECT_ID, name: 'Sasol Q3 shutdown', archived_at: null }],
  })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const { proposal } = modifyProposal({ document: clone(store.documents[0]), items: store.items }, 'invoice', {
    field: 'project_id',
    newValue: PROJECT_ID,
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)
  assert.equal(store.documents[0].project_id, PROJECT_ID)
})

test('b2. a project that is not in this tenant (or is archived) is discarded with a warning', async () => {
  const store = seedStore({
    family: 'invoice',
    // The lookup only ever sees this tenant's active projects; an unknown or
    // archived id must come back as "not available".
    projects: [{ id: '55555555-6666-7777-8888-999999999999', name: 'Archived project', archived_at: '2026-01-01T00:00:00Z' }],
  })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const { proposal } = modifyProposal({ document: clone(store.documents[0]), items: store.items }, 'invoice', {
    field: 'project_id',
    newValue: FOREIGN_PROJECT_ID,
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true)
  assert.equal(store.documents[0].project_id, null)
  assert.ok((updated.warnings ?? []).some((w) => /not active or not available/i.test(w)))
})

test('b3. clearing the project reference persists null without a project lookup', async () => {
  const store = seedStore({
    family: 'invoice',
    projects: [{ id: PROJECT_ID, name: 'Sasol Q3 shutdown', archived_at: null }],
  })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    project_id: PROJECT_ID,
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const { proposal } = modifyProposal({ document: clone(store.documents[0]), items: store.items }, 'invoice', {
    field: 'project_id',
    newValue: null,
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)
  assert.equal(store.documents[0].project_id, null)
})

test('b4. a project lookup that errors fails closed to null with a warning, never throws', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store, { projectFails: true })

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const { proposal } = modifyProposal({ document: clone(store.documents[0]), items: store.items }, 'invoice', {
    field: 'project_id',
    newValue: PROJECT_ID,
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true)
  assert.equal(store.documents[0].project_id, null)
  assert.ok((updated.warnings ?? []).some((w) => /not active or not available|could not be verified/i.test(w)))
})

/* -------- c) Extra charges & calculation inputs -------- */

test('c1. adding a named charge through Bolu persists it and recomputes totals', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 10, unit_price: 50000 }],
    extra_charges: [{ name: 'Transport', amount: 2000, withTax: false }],
  })
  const baseline = clone(store.documents[0])
  assert.equal(Number(baseline.total) > 0, true)

  const { proposal } = modifyProposal({ document: clone(baseline), items: store.items }, 'invoice', {
    extraChargesChange: [
      { label: 'Transport', value: 2000, withTax: false },
      { label: 'Handling', value: 1000, withTax: true },
    ],
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)

  const cf = parseCf(store.documents[0])
  assert.deepEqual(
    cf.extraCharges.map((c) => [c.label, c.value, c.withTax]),
    [['Transport', 2000, false], ['Handling', 1000, true]],
  )
  assert.equal(Number(store.documents[0].total) > Number(baseline.total), true)
})

test('c2. removing a named charge through Bolu deletes only that entry', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 10, unit_price: 50000 }],
    extra_charges: [
      { name: 'Transport', amount: 2000, withTax: false },
      { name: 'Handling', amount: 1000, withTax: true },
    ],
  })

  const { proposal } = modifyProposal({ document: clone(store.documents[0]), items: store.items }, 'invoice', {
    extraChargesChange: [{ label: 'Transport', value: 2000, withTax: false }],
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)

  const cf = parseCf(store.documents[0])
  assert.deepEqual(cf.extraCharges.map((c) => c.label), ['Transport'])
})

test('c3. a stale extra-charges baseline rejects the save before any write', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
    extra_charges: [{ name: 'Transport', amount: 2000, withTax: false }],
  })
  const snapshotAtProposal = clone(store.documents[0])

  const { proposal } = modifyProposal({ document: snapshotAtProposal, items: store.items }, 'invoice', {
    extraChargesChange: [{ label: 'Transport', value: 3500, withTax: false }],
  })

  // Someone edits the document's charges after the proposal was prepared.
  const idx = store.documents.findIndex((d) => d.id === snapshotAtProposal.id)
  const cf = parseCf(store.documents[idx])
  store.documents[idx].custom_fields = JSON.stringify({
    ...cf,
    extraCharges: [{ label: 'Transport', value: 9999, withTax: false }],
  })

  const rejected = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(rejected.success, false)
  assert.match(rejected.error ?? '', /Extra charges changed after this proposal/)
})

test('c4. calculationInputsChange persists into custom_fields and recomputes VAT and total', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 10, unit_price: 100000 }],
  })
  const baseline = clone(store.documents[0])
  const snapshotItems = clone(store.items)

  const { proposal } = modifyProposal({ document: clone(baseline), items: snapshotItems }, 'invoice', {
    calculationInputsChange: { vatPercent: 10 },
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)

  const cf = parseCf(store.documents[0])
  assert.equal(Number(cf.calculationInputs.vatPercent), 10)

  const expected = computeDocument({
    items: snapshotItems,
    document: { ...baseline },
    cf,
    columns: Array.isArray(cf.columnConfig) ? cf.columnConfig : [],
  })
  assert.equal(Number(store.documents[0].vat), expected.vat)
  assert.equal(Number(store.documents[0].total), expected.totalPayable)
  assert.equal(Number(store.documents[0].total) > Number(baseline.total), true)
})

test('c5. a stale calculation-input baseline rejects the save before any write', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const snapshotAtProposal = clone(store.documents[0])

  const { proposal } = modifyProposal({ document: snapshotAtProposal, items: clone(store.items) }, 'invoice', {
    calculationInputsChange: { whtType: 'fixed' },
  })

  // Concurrent change to the very key this proposal wants to write.
  const idx = store.documents.findIndex((d) => d.id === snapshotAtProposal.id)
  const cf = parseCf(store.documents[idx])
  store.documents[idx].custom_fields = JSON.stringify({
    ...cf,
    calculationInputs: { ...cf.calculationInputs, whtType: 'fixed', vatPercent: 99 },
  })

  const rejected = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(rejected.success, false)
  assert.match(rejected.error ?? '', /WHT type changed after this proposal/)
})

test('c6. unknown calculation input keys are rejected at the validator', async () => {
  const result = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    documentFamily: 'invoice',
    calculationInputs: { vatPercent: 7.5, paymentTerms: 'Net 30' },
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => /not supported/i.test(e) && !/paymentTerms/.test(e)))
})

/* -------- d) Stale integrity & fail-closed baselines -------- */

test('d1. a scalar proposal without the persisted baseline fails closed at the executor', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const created = store.documents[0]

  const proposal = approve({
    opId: 'op-missing-baseline',
    operationType: 'modify-document',
    documentFamily: 'invoice',
    schemaVersion: '1.0',
    requiredPermission: { resource: 'invoice', action: 'edit' },
    sideEffect: 'draft-mutation',
    gate1Required: true,
    gate2Required: true,
    status: 'approved_pending_save',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    targetDocumentId: created.id,
    targetDocumentNumber: created.invoice_number,
    field: 'title',
    newValue: 'No baseline proposal',
  })
  const result = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /could not verify the current title/i)
  assert.equal(store.documents[0].invoice_title ?? null, created.invoice_title ?? null)
})

test('d2. a rich-text terms modification round-trips; a stale baseline is rejected without writing', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    terms: 'Original terms.',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const baseline = clone(store.documents[0])

  const { proposal } = modifyProposal({ document: clone(baseline), items: store.items }, 'invoice', {
    field: 'terms',
    newValue: 'Revised terms: Net 45 from acceptance.',
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)
  assert.match(store.documents[0].terms, /Revised terms/)

  const staleBaselineProposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: baseline.id,
    targetDocumentNumber: baseline.invoice_number,
    documentFamily: 'invoice',
    field: 'terms',
    newValue: 'Another edit',
    current: { document: baseline, items: store.items },
  }))
  const rejected = await persistInvoiceModification(harness, staleBaselineProposal, () => true, () => true, null)
  assert.equal(rejected.success, false)
  assert.match(rejected.error ?? '', /modified by another process/)
})

test('d3. other scalar fields round-trip: client_name, issue_date, due_date', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })

  for (const [field, newValue] of [
    ['client_name', 'Verdant Holdings Ltd'],
    ['issue_date', '2026-11-01'],
    ['due_date', '2026-12-31'],
  ]) {
    const { proposal } = modifyProposal(
      { document: clone(store.documents[0]), items: store.items },
      'invoice',
      { field, newValue },
    )
    const result = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
    assert.equal(result.success, true, `${field}: ${result.error}`)
    assert.equal(String(store.documents[0][field]), String(newValue))
  }
})

/* -------- e) Preservation -------- */

test('e1. a charge edit preserves notes, terms, items, and unrelated custom_fields keys', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    notes: 'Deliver before noon.',
    terms: 'Site access required.',
    extra_charges: [{ name: 'Transport', amount: 2000, withTax: false }],
    items: [{ description: 'Pump overhaul', quantity: 2, unit_price: 300000 }],
  })
  const baseline = clone(store.documents[0])
  const baselineCf = parseCf(baseline)
  const baselineItems = clone(store.items)

  const { proposal } = modifyProposal({ document: clone(baseline), items: clone(baselineItems) }, 'invoice', {
    field: 'workmanship',
    newValue: 15000,
  })
  const updated = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)

  const after = store.documents[0]
  assert.equal(after.notes, baseline.notes)
  assert.equal(after.terms, baseline.terms)
  const afterCf = parseCf(after)
  assert.equal(afterCf.chargeLabels && typeof afterCf.chargeLabels === 'object', true)
  assert.equal(afterCf.created_via, baselineCf.created_via)
  assert.equal(afterCf.extraCharges[0].label, 'Transport')
  assert.deepEqual(
    store.items.map((i) => [i.description, i.quantity, i.unit_price]),
    baselineItems.map((i) => [i.description, i.quantity, i.unit_price]),
  )
})

test('e2. quotation payment_terms persisted in custom_fields can be edited through the cf baseline', async () => {
  const store = seedStore({ family: 'quotation' })
  const harness = createHarness(store)

  await createQuotation(harness, store, {
    client_name: 'Verdant Ltd',
    payment_terms: 'Net 14',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 800000 }],
  })
  const baseline = clone(store.documents[0])

  const { proposal } = modifyProposal({ document: clone(baseline), items: store.items }, 'quotation', {
    field: 'payment_terms',
    newValue: 'Net 30',
  })
  // Baseline must resolve from the persisted cf block, not from a (nonexistent) column.
  assert.equal(proposal.oldValue, 'Net 14')

  const updated = await persistQuotationModification(harness, proposal, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)
  assert.equal(parseCf(store.documents[0]).payment_terms, 'Net 30')
})

/* -------- g) Generation wiring: the modify snapshot reader -------- */

test('g1. readBoluModifySnapshot returns the persisted row and its items; missing documents fail closed to null', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    po_number: 'PO-SNAPSHOT',
    items: [{ description: 'Pump overhaul', quantity: 3, unit_price: 40000 }],
  })
  const created = store.documents[0]

  const snapshot = await readBoluModifySnapshot(harness, 'invoice', created.id, () => true)
  assert.ok(snapshot)
  assert.equal(snapshot.documentNumber, created.invoice_number)
  assert.equal(snapshot.document.po_number, 'PO-SNAPSHOT')
  assert.equal(snapshot.items.length, 1)
  assert.equal(Number(snapshot.items[0].unit_price), 40000)

  const missing = await readBoluModifySnapshot(harness, 'invoice', '99999999-8888-7777-6666-555555555555', () => true)
  assert.equal(missing, null)
})

/* -------- f) Preview & communication -------- */

test('f1. the proposal replaces model-claimed oldValues with the persisted snapshot', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    po_number: 'PO-ORIGINAL',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const baseline = clone(store.documents[0])

  // The model claims the old value was something else entirely; the builder
  // must ignore that claim and use the persisted snapshot.
  const proposal = buildInvoiceModifyProposal({
    targetDocumentId: baseline.id,
    targetDocumentNumber: baseline.invoice_number,
    documentFamily: 'invoice',
    field: 'po_number',
    oldValue: 'PO-MODEL-CLAIM',
    newValue: 'PO-NEW',
    current: { document: baseline, items: store.items },
  })
  assert.equal(proposal.oldValue, 'PO-ORIGINAL')
})

test('f2. a charge change carries a recomputed computedTotals block for the card and artifact', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 2, unit_price: 100000 }],
  })
  const baseline = clone(store.documents[0])

  const proposal = buildInvoiceModifyProposal({
    targetDocumentId: baseline.id,
    targetDocumentNumber: baseline.invoice_number,
    documentFamily: 'invoice',
    field: 'transportation',
    newValue: 20000,
    current: { document: baseline, items: store.items },
  })
  assert.ok(proposal.computedTotals)
  assert.equal(typeof proposal.computedTotals.total, 'number')
  assert.equal(typeof proposal.computedTotals.extraChargesTotal, 'number')
  assert.equal(proposal.chargesSnapshot.transportation, 20000)
})

test('f3. proposalPlainText lists the scalar change, calc inputs and named charges without internal keys', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
    extra_charges: [{ name: 'Transport', amount: 2000, withTax: false }],
  })
  const baseline = clone(store.documents[0])

  const proposal = buildInvoiceModifyProposal({
    targetDocumentId: baseline.id,
    targetDocumentNumber: baseline.invoice_number,
    documentFamily: 'invoice',
    field: 'workmanship',
    newValue: 15000,
    calculationInputsChange: { vatPercent: 10 },
    extraChargesChange: [
      { label: 'Transport', value: 2500, withTax: true },
      { label: 'Handling', value: 500, withTax: false },
    ],
    current: { document: baseline, items: store.items },
  })
  const text = proposalPlainText(proposal)
  assert.match(text, /Workmanship: .* -> /)
  assert.match(text, /VAT rate/)
  assert.match(text, /Transport/)
  assert.match(text, /Handling/)
  assert.equal(text.includes('calculation_inputs'), false)
  assert.equal(text.includes('custom_fields'), false)
  assert.equal(text.includes('extra_charges change') , false)
})

test('f4. calculationInputsChange preview old-values default sensibly on documents without persisted inputs', async () => {
  const proposal = buildInvoiceModifyProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-000100',
    documentFamily: 'invoice',
    calculationInputsChange: { vatPercent: 10 },
    current: {
      document: {
        id: INVOICE_ID,
        invoice_number: 'INV-000100',
        custom_fields: JSON.stringify({}),
      },
      items: [{ description: 'Item', quantity: 1, unit_price: 1000 }],
    },
  })
  // Document has no persisted calculationInputs: baseline falls back to the form default 7.5.
  assert.equal(proposal.calculationInputsChange?.old.vatPercent, 7.5)
  assert.equal(proposal.calculationInputsChange?.new.vatPercent, 10)
})

/* -------- h) Input hardening: F-01 and F-02 -------- */

test('h1. a field edit without newValue is rejected, never silently cleared', () => {
  for (const field of ['notes', 'terms', 'title', 'po_number', 'payment_terms', 'issue_date', 'due_date', 'workmanship']) {
    const result = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', field })
    assert.equal(result.valid, false, `expected ${field} to require an explicit value`)
    assert.ok(
      result.errors.some((e) => /Provide a value for/.test(e)),
      `expected missing-value error for ${field}, got: ${result.errors.join(' | ')}`,
    )
  }
})

test('h2. an explicit null clears an optional text field', () => {
  const result = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', field: 'notes', newValue: null })
  assert.equal(result.valid, true)
  assert.equal(result.data?.newValue, null)
})

test('h2b. explicit nulls clear every field whose domain semantics permit clearing; an empty rich text is accepted where supported', () => {
  for (const field of ['notes', 'terms', 'title', 'po_number', 'payment_terms', 'due_date', 'work_duration']) {
    const result = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', field, newValue: null })
    assert.equal(result.valid, true, `expected ${field} to accept explicit null as a clear`)
    assert.equal(result.data?.newValue, null)
  }
  // Explicit empty string rich text behaves as an empty document field.
  const emptyNotes = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', field: 'notes', newValue: '' })
  assert.equal(emptyNotes.valid, true)
  assert.equal(emptyNotes.data?.newValue, '')
  // Quotation payment terms (custom_fields-backed) remain clearable.
  const quotationTerms = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    documentFamily: 'quotation',
    field: 'payment_terms',
    newValue: null,
  })
  assert.equal(quotationTerms.valid, true)
})

test('h2c. explicit null does NOT clear an issue date; an empty issue date cannot be persisted', () => {
  const result = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', field: 'issue_date', newValue: null })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => /issue date/i.test(e) && /required/i.test(e)))
  const empty = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', field: 'issue_date', newValue: '' })
  assert.equal(empty.valid, false)
})

test('h3. charge fields reject booleans, objects, arrays, blanks, nulls and negatives; finite numbers and numeric strings >= 0 pass', () => {
  const bad = [true, false, { value: 10 }, [10], null, '', '   ', -5000, '-1', 'abc', '12,500']
  for (const newValue of bad) {
    const result = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', field: 'workmanship', newValue })
    assert.equal(result.valid, false, `expected rejection for newValue=${JSON.stringify(newValue)}`)
  }
  for (const newValue of [15000, 0, '0', '15000', ' 2500 ']) {
    const result = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', field: 'workmanship', newValue })
    assert.equal(result.valid, true, `expected acceptance for newValue=${JSON.stringify(newValue)}`)
  }
})

test('h4. the plain-text artifact marks a charge cleared to zero', () => {
  const proposal = {
    opId: 'op-h4',
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
    field: 'workmanship',
    oldValue: 250000,
    newValue: 0,
    computedTotals: { subtotal: 100000, vat: 7500, total: 107500, discount: 10000, wht: 500, installRateTotal: 0, extraChargesTotal: 0 },
    chargesSnapshot: { workmanship: 0, transportation: 0, shipping: 0 },
  }
  const text = proposalPlainText(proposal)
  assert.match(text, /Workmanship: .* -> .*\(cleared\)/)
  assert.match(text, /Discount: -₦10,000/)
  assert.match(text, /WHT: -₦500/)
  assert.match(text, /VAT: ₦7,500/)
  assert.match(text, /Authoritative total: ₦107,500/)
})

/* -------- i) Generation wiring: the live turn builds from the persisted snapshot (F-09) -------- */

const MOD_UUID = '123e4567-e89b-12d3-a456-426614174010'

let assistantText = ''

function makeGenerationState() {
  const state = {
    messages: [],
    activeProposal: null,
    setMessages(fn) {
      state.messages = typeof fn === 'function' ? fn(state.messages) : fn
    },
    setStreamingContent() {},
    setClerkState() {},
    setActiveProposal(p) {
      state.activeProposal = p
    },
    setActiveProposalMessageId() {},
    setError() {},
    setIsStreaming() {},
  }
  return state
}

function makeGenerationRefs() {
  return {
    streamingBuffer: { current: '' },
    flushTimer: { current: null },
    abortController: { current: null },
  }
}

const insertedRows = []

function registerGenerationMocks() {
  mock.module('@/lib/ai-assistant/bolu-transport', () => ({
    sendBoluProviderRequest: async () => ({ text: assistantText }),
  }))
  mock.module('@/supabase', () => ({
    supabase: {
      from: (table) => {
        if (table === 'bolu_messages') {
          return {
            insert: (row) => ({
              select: () => ({
                single: async () => {
                  insertedRows.push(row)
                  return {
                    data: {
                      id: `msg-${insertedRows.length}`,
                      conversation_id: row.conversation_id,
                      tenant_id: row.tenant_id,
                      sender_id: null,
                      role: 'assistant',
                      content: row.content,
                      status: 'completed',
                      proposal_payload: row.proposal_payload ?? null,
                      records_payload: row.records_payload ?? null,
                      metadata: {},
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    error: null,
                  }
                },
              }),
            }),
            update: () => ({ eq: () => ({ error: null }) }),
          }
        }
        if (table === 'bolu_conversations') {
          return { update: () => ({ eq: () => ({ error: null }) }) }
        }
        throw new Error(`unexpected table ${table}`)
      },
    },
  }))
}

function modifyEnvelope(documentFamily, payload) {
  return [
    'I can make that change.',
    '```json',
    JSON.stringify({ bolu_operation: { operationType: 'modify-document', documentFamily, payload } }),
    '```',
  ].join('\n')
}

test('i1. the generation turn builds a modify proposal from the persisted snapshot', async () => {
  registerGenerationMocks()
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    po_number: 'PO-SNAP',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  // Point the seeded document and its items at a UUID (the modify contract requires one).
  const created = store.documents[0]
  created.id = MOD_UUID
  store.items = store.items.map((item) => ({ ...item, invoice_id: MOD_UUID }))
  insertedRows.length = 0

  assistantText = modifyEnvelope('invoice', {
    documentId: created.id,
    field: 'po_number',
    newValue: 'PO-NEW',
  })

  const { runBoluGeneration } = await import('../../lib/ai-assistant/bolu-generation.ts')
  const state = makeGenerationState()

  const ok = await runBoluGeneration({
    targetConversationId: 'conv-generation-1',
    tenantId: 'tenant-generation',
    history: [{ id: 'h1', role: 'user', content: 'Change the purchase order to PO-NEW' }],
    userText: 'Change the purchase order to PO-NEW',
    facts: null,
    tenantClient: harness,
    canRead: () => true,
    state,
    refs: makeGenerationRefs(),
  })

  assert.equal(ok, true)
  assert.equal(state.activeProposal?.operationType, 'modify-document')
  assert.equal(state.activeProposal?.targetDocumentId, created.id)
  assert.equal(state.activeProposal?.field, 'po_number')
  assert.equal(state.activeProposal?.oldValue, 'PO-SNAP', 'persisted snapshot must supply the baseline, not the model')
  assert.equal(state.activeProposal?.newValue, 'PO-NEW')
  assert.equal(insertedRows.length, 1)
  assert.equal(insertedRows[0].proposal_payload?.field, 'po_number')
})

test('i2. a missing document fails closed in the generation turn; no proposal is prepared', async () => {
  registerGenerationMocks()
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)
  insertedRows.length = 0

  assistantText = modifyEnvelope('invoice', {
    documentId: MOD_UUID,
    field: 'po_number',
    newValue: 'PO-NEW',
  })

  const { runBoluGeneration } = await import('../../lib/ai-assistant/bolu-generation.ts')
  const state = makeGenerationState()

  await runBoluGeneration({
    targetConversationId: 'conv-generation-2',
    tenantId: 'tenant-generation',
    history: [{ id: 'h1', role: 'user', content: 'Change the purchase order to PO-NEW' }],
    userText: 'Change the purchase order to PO-NEW',
    facts: null,
    tenantClient: harness,
    canRead: () => true,
    state,
    refs: makeGenerationRefs(),
  })

  assert.equal(state.activeProposal, null)
  assert.equal(insertedRows.length, 1)
  assert.match(insertedRows[0].content, /could not load the current invoice/i)
})

test('i3. a quotation work_duration modification is refused in the generation turn', async () => {
  registerGenerationMocks()
  const store = seedStore({ family: 'quotation' })
  const harness = createHarness(store)

  await createQuotation(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 800000 }],
  })
  const created = store.documents[0]
  created.id = MOD_UUID
  store.items = store.items.map((item) => ({ ...item, quotation_id: MOD_UUID }))
  insertedRows.length = 0

  assistantText = modifyEnvelope('quotation', {
    documentId: created.id,
    field: 'work_duration',
    newValue: '3 weeks',
  })

  const { runBoluGeneration } = await import('../../lib/ai-assistant/bolu-generation.ts')
  const state = makeGenerationState()

  await runBoluGeneration({
    targetConversationId: 'conv-generation-3',
    tenantId: 'tenant-generation',
    history: [{ id: 'h1', role: 'user', content: 'Set the work duration to 3 weeks on this quotation' }],
    userText: 'Set the work duration to 3 weeks on this quotation',
    facts: null,
    tenantClient: harness,
    canRead: () => true,
    state,
    refs: makeGenerationRefs(),
  })

  assert.equal(state.activeProposal, null)
  assert.equal(insertedRows.length, 1)
  assert.match(insertedRows[0].content, /work_duration applies to invoices only/i)
})
/* -------- k) Boundary tests: F-01 issue date guard, F-02 executor, F-05/F-06 language -------- */

const handBuiltModifyProposal = (overrides = {}, family = 'invoice') => approve({
  opId: `op-${Math.random().toString(36).slice(2)}`,
  operationType: 'modify-document',
  documentFamily: family,
  schemaVersion: '1.0',
  requiredPermission: { resource: family, action: 'edit' },
  sideEffect: 'draft-mutation',
  gate1Required: true,
  gate2Required: true,
  status: 'approved_pending_save',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  targetDocumentId: INVOICE_ID,
  targetDocumentNumber: family === 'quotation' ? 'QTN-0001' : 'INV-0001',
  ...overrides,
})

const leakFree = (message) => {
  for (const leak of ['entity_', 'fkey', 'violates', 'foreign key', 'relation ', 'duplicate key', 'insert into', 'update "', 'p_invoice_payload', 'p_quotation_payload']) {
    assert.equal((message ?? '').toLowerCase().includes(leak.toLowerCase()), false, `leaked backend fragment: ${leak}`)
  }
}

test('k1. an explicit null issue date is refused at the executor without writing', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const created = store.documents[0]

  const proposal = handBuiltModifyProposal({
    targetDocumentId: created.id,
    targetDocumentNumber: created.invoice_number,
    field: 'issue_date',
    oldValue: created.issue_date,
    newValue: null,
  })
  const result = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /issue date/i)
  assert.equal(String(store.documents[0].issue_date), String(created.issue_date))
})

test('k2. the executor refuses invalid fixed-charge values without coercing them', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const created = store.documents[0]

  const badValues = [true, false, { v: 1 }, [10], '  ', -1, Number.NaN, Number.POSITIVE_INFINITY]
  for (const newValue of badValues) {
    const proposal = handBuiltModifyProposal({
      targetDocumentId: created.id,
      targetDocumentNumber: created.invoice_number,
      field: 'workmanship',
      oldValue: 0,
      newValue,
    })
    const result = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
    assert.equal(result.success, false, `expected refusal for ${String(newValue)}`)
    assert.equal(Number(store.documents[0].workmanship ?? 0), 0)
  }
})

test('k3. named extra charges reject boolean amounts at the validator', () => {
  const result = validateInvoiceCreateInput({
    client_name: 'Verdant Ltd',
    items: [{ description: 'Cable', quantity: 1, unit_price: 1000 }],
    extra_charges: [{ name: 'Handling', amount: true, withTax: false }],
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => /finite non-negative amount/i.test(e)))
})

test('k4. calculation-input failures speak in business language', () => {
  // Wrong shape
  const notObject = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', calculationInputs: [] })
  assert.equal(notObject.valid, false)
  assert.equal(notObject.errors[0].includes('calculationInputs'), false)

  // Out-of-domain values
  const badVat = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', calculationInputs: { vatPercent: 120 } })
  assert.ok(badVat.errors.some((e) => /VAT rate/i.test(e) && !/vatPercent/.test(e)))

  // Empty patch
  const emptyPatch = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', calculationInputs: {} })
  assert.ok(emptyPatch.errors.some((e) => /at least one calculation setting/i.test(e)))

  // Unknown field string never echoes envelope vocabulary
  const bogus = validateInvoiceModifyInput({ documentId: INVOICE_ID, documentFamily: 'invoice', field: 'discountTiming', newValue: 'x' })
  assert.ok(bogus.errors.some((e) => /not a supported change/i.test(e) && !/discountTiming/.test(e)))
})

test('k5. stale refusals name business labels, never payload keys', async () => {
  const cases = [
    [{ vatPercent: 10 }, { vatPercent: 12.5 }, /VAT rate changed/, 'vatPercent'],
    [{ discountValue: 3500 }, { discountValue: 9999 }, /Discount changed/, 'discountValue'],
    [{ discountType: 'fixed' }, { discountType: 'fixed' }, /Discount type changed/, 'discountType'],
    [{ discountTiming: 'after_tax' }, { discountTiming: 'after_tax' }, /Discount timing changed/, 'discountTiming'],
    [{ whtValue: 1500 }, { whtValue: 777 }, /WHT changed/, 'whtValue'],
    [{ whtType: 'fixed' }, { whtType: 'fixed' }, /WHT type changed/, 'whtType'],
  ]

  for (const [patch, corrupt, pattern, rawKey] of cases) {
    const store = seedStore({ family: 'invoice' })
    const harness = createHarness(store)
    await createInvoice(harness, store, {
      client_name: 'Verdant Ltd',
      items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
    })
    const baseline = clone(store.documents[0])
    const { proposal } = modifyProposal({ document: baseline, items: clone(store.items) }, 'invoice', {
      calculationInputsChange: patch,
    })
    // Someone else edits the very key this proposal changes after the snapshot was taken.
    const idx = store.documents.findIndex((d) => d.id === baseline.id)
    const cf = parseCf(store.documents[idx])
    store.documents[idx].custom_fields = JSON.stringify({
      ...cf,
      calculationInputs: { ...cf.calculationInputs, ...corrupt },
    })
    const rejected = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
    assert.equal(rejected.success, false, `expected stale refusal for patch ${JSON.stringify(patch)}`)
    assert.match(rejected.error ?? '', pattern)
    assert.equal((rejected.error ?? '').includes(rawKey), false, `leaked payload key ${rawKey}`)
  }
})

test('f6a. a backend failure on the header write never leaks fragments to the user-facing message', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store, {
    updateError: 'insert into "entity_ab12cd34".invoices (project_id) values ($1) violates foreign key constraint "invoices_project_id_fkey"',
  })
  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const { proposal } = modifyProposal({ document: clone(store.documents[0]), items: store.items }, 'invoice', {
    field: 'title',
    newValue: 'Renamed',
  })
  const result = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  leakFree(result.error)
  assert.match(result.error ?? '', /could not be saved just now/i)
})

test('f6b. an items-read failure on the recompute path reports no change and leaks nothing', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store, {
    itemsFetchError: 'relation "entity_ab12cd34.invoice_items" does not exist',
  })
  await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const { proposal } = modifyProposal({ document: clone(store.documents[0]), items: store.items }, 'invoice', {
    field: 'workmanship',
    newValue: 15000,
  })
  const result = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  leakFree(result.error)
  assert.match(result.error ?? '', /no changes were made/i)
})

test('f6c. an RPC failure on the combined items+charges path reports failure and leaks nothing', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store, {
    rpcError: 'duplicate key value violates unique constraint "invoice_items_pkey"',
  })
  const created = await createInvoice(harness, store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const oldItems = clone(store.items).map((item) => ({
    description: String(item.description ?? ''),
    quantity: Number(item.quantity ?? 1),
    unit_price: Number(item.unit_price ?? 0),
    unit: typeof item.unit === 'string' ? item.unit : undefined,
    row_type: 'standard',
    group_id: null,
    group_name: null,
    item_id: null,
    install_rate: null,
    install_rate_taxable: false,
    vat_rate: null,
    discount_rate: null,
  }))
  const { proposal } = modifyProposal({ document: clone(store.documents[0]), items: store.items }, 'invoice', {
    itemsChange: { oldItems, newItems: [{ ...oldItems[0], description: 'Pump overhaul - revised' }] },
  })
  const result = await persistInvoiceModification(harness, proposal, () => true, () => true, 'entity-x', null)
  assert.equal(result.success, false)
  leakFree(result.error)
  assert.match(result.error ?? '', /could not be saved just now/i)
})

/* -------- l) F-11 non-financial proposal copy -------- */

const notesOnlyProposal = {
  opId: 'op-f11',
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
  field: 'notes',
  oldValue: '<p>Deliver before noon.</p>',
  newValue: '<p>Deliver before 11:00.</p>',
}

test('l1. a notes-only modify proposal never implies a financial recalculation', () => {
  const html = renderToStaticMarkup(createElement(ProposalCardView, { proposal: notesOnlyProposal }))
  assert.equal(html.includes('authoritative totals when this document is saved'), false)
  assert.ok(html.includes('No amounts change in this proposal.'))
})

test('l2. a financial modify proposal still renders the authoritative totals block', () => {
  const financial = {
    ...notesOnlyProposal,
    opId: 'op-f11b',
    field: 'workmanship',
    oldValue: 15000,
    newValue: 25000,
    computedTotals: { subtotal: 100000, vat: 7500, total: 107500, discount: 0, wht: 0, installRateTotal: 0, extraChargesTotal: 0 },
    chargesSnapshot: { workmanship: 25000, transportation: 0, shipping: 0 },
  }
  const html = renderToStaticMarkup(createElement(ProposalCardView, { proposal: financial }))
  assert.ok(html.includes('Subtotal'))
  assert.ok(html.includes('Total due'))
})
test('i4. a quotation title edit maps to quotation_title from the persisted snapshot', async () => {
  registerGenerationMocks()
  const store = seedStore({ family: 'quotation' })
  const harness = createHarness(store)

  await createQuotation(harness, store, {
    client_name: 'Verdant Ltd',
    title: 'Site visit',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 800000 }],
  })
  const created = store.documents[0]
  created.id = MOD_UUID
  store.items = store.items.map((item) => ({ ...item, quotation_id: MOD_UUID }))
  insertedRows.length = 0

  assistantText = modifyEnvelope('quotation', {
    documentId: created.id,
    field: 'title',
    newValue: 'Site visit v2',
  })

  const { runBoluGeneration } = await import('../../lib/ai-assistant/bolu-generation.ts')
  const state = makeGenerationState()

  await runBoluGeneration({
    targetConversationId: 'conv-generation-4',
    tenantId: 'tenant-generation',
    history: [{ id: 'h1', role: 'user', content: 'Rename the quotation to Site visit v2' }],
    userText: 'Rename the quotation to Site visit v2',
    facts: null,
    tenantClient: harness,
    canRead: () => true,
    state,
    refs: makeGenerationRefs(),
  })

  assert.equal(state.activeProposal?.documentFamily, 'quotation')
  assert.equal(state.activeProposal?.field, 'title')
  assert.equal(state.activeProposal?.oldValue, 'Site visit', 'persisted quotation_title must supply the baseline')
  assert.equal(state.activeProposal?.newValue, 'Site visit v2')
})

test('i5. an unsupported modification envelope is refused without echoing internal payload keys', async () => {
  registerGenerationMocks()
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)
  insertedRows.length = 0

  assistantText = modifyEnvelope('invoice', {
    documentId: MOD_UUID,
    field: 'discountTiming',
    newValue: 'before_tax',
  })

  const { runBoluGeneration } = await import('../../lib/ai-assistant/bolu-generation.ts')
  const state = makeGenerationState()

  await runBoluGeneration({
    targetConversationId: 'conv-generation-5',
    tenantId: 'tenant-generation',
    history: [{ id: 'h1', role: 'user', content: 'Set the discount timing to before tax' }],
    userText: 'Set the discount timing to before tax',
    facts: null,
    tenantClient: harness,
    canRead: () => true,
    state,
    refs: makeGenerationRefs(),
  })

  assert.equal(state.activeProposal, null)
  assert.equal(insertedRows.length, 1)
  // The chat thread strips the raw envelope before rendering; the text the
  // user actually sees must not carry the model's envelope vocabulary.
  const userVisible = cleanAssistantProse(insertedRows[0].content)
  assert.match(userVisible, /not a supported change/i)
  assert.equal(userVisible.includes('discountTiming'), false)
})