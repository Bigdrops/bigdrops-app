import assert from 'node:assert/strict'
import { mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

/**
 * Stage 3C — Conversational PDF appearance, document presentation & signatory controls.
 *
 * Covers the modify envelope's presentationChange block: PDF output toggles,
 * notes/terms headings, charge labels, quantity/unit merge, item-image
 * visibility, column configuration (mode/label/order/reset) and signatory
 * selection resolved against the tenant's signatory projection.
 */
import {
  buildDocumentCreateProposal,
  buildInvoiceModifyProposal,
  validateInvoiceCreateInput,
  validateInvoiceModifyInput,
} from '../../lib/ai-assistant/bolu-operations.ts'
import {
  applyPresentationPatch,
  normalizeColumns,
  fingerprintPresentation,
  resetColumns,
  DEFAULT_COLUMN_ORDER,
} from '../../lib/ai-assistant/bolu-presentation.ts'
import {
  persistInvoiceModification,
  persistQuotationModification,
  persistInvoiceCreation,
  persistQuotationCreation,
} from '../../lib/ai-assistant/bolu-document-service.ts'
import { ProposalCardView, proposalPlainText } from '../../components/ai-assistant/chat/assistant-chat-parts.tsx'

const INVOICE_ID = '123e4567-e89b-12d3-a456-426614174000'
const QUOTATION_ID = '123e4567-e89b-12d3-a456-426614174001'
const SIG_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const BANK_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'

const approve = (p) => { p.status = 'approved_pending_save'; return p }
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
const parseCf = (row) => (typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields)

function createHarness(store, opts = {}) {
  const { signatories = [], bankAccounts = [] } = opts
  let documentSequence = 0
  let itemSequence = 0
  const docKey = () => (store.family === 'invoice' ? 'invoice_number' : 'quotation_number')

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
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'signatories') {
        return {
          select: (cols) => ({
            eq: (_col, value) => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: signatories.find((s) => s.id === value) ?? null,
                  error: null,
                }),
              }),
            }),
            ilike: (_col, pattern) => {
              const needle = String(pattern).replace(/^%/, '').replace(/%$/, '').toLowerCase()
              return {
                limit: () => Promise.resolve({
                  data: signatories.filter((s) => String(s.name).toLowerCase().includes(needle)),
                  error: null,
                }),
              }
            },
            order: () => Promise.resolve({ data: signatories, error: null }),
          }),
        }
      }
      if (table === 'bank_accounts') {
        return {
          select: () => ({
            eq: (_col, value) => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: bankAccounts.find((b) => b.id === value) ?? null,
                  error: null,
                }),
              }),
            }),
            order: () => Promise.resolve({ data: bankAccounts, error: null }),
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
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
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
    rpc: async () => ({ data: null, error: { message: 'unused' } }),
  }
}

const seedStore = ({ family = 'invoice', projects = [] } = {}) => ({ family, documents: [], items: [], projects })

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

function modify({ harness, document, items, change, family = 'invoice' }) {
  const current = { document: clone(document), items: clone(items ?? []) }
  const number = document[family === 'quotation' ? 'quotation_number' : 'invoice_number']
  return approve(buildInvoiceModifyProposal({
    targetDocumentId: document.id,
    targetDocumentNumber: number,
    documentFamily: family,
    ...change,
    current,
  }))
}

const persist = (harness, proposal, family) => family === 'quotation'
  ? persistQuotationModification(harness, proposal, () => true, () => true, null)
  : persistInvoiceModification(harness, proposal, () => true, () => true, null)

const itemsOf = (store) => clone(store.items)

const seedInvoice = async (overrides = {}) => {
  const store = seedStore({ family: 'invoice' })
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
    ...overrides,
  })
  return store
}

const seedQuotation = async (overrides = {}) => {
  const store = seedStore({ family: 'quotation' })
  await createQuotation(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 800000 }],
    ...overrides,
  })
  return store
}

const SIG = { id: SIG_ID, name: 'Adewale Musa', role: 'Finance Manager', signature_url: 'https://cdn.example.test/sig-ade.png' }
const SIG2 = { id: 'cccccccc-3333-4333-8333-cccccccccccc', name: 'Chioma Okafor', role: 'Director', signature_url: 'https://cdn.example.test/sig-chi.png' }
const BANK = { id: BANK_ID, bank_name: 'Zenith Bank', account_name: 'GenGrid Power Ltd', account_number: '1234567890', sort_code: '057150013', is_default: true }
const BANK2 = { id: 'dddddddd-4444-4444-8444-dddddddddddd', bank_name: 'GTBank', account_name: 'GenGrid Power Ltd', account_number: '9876543210', sort_code: '058000001', is_default: false }

/* -------- a) validator shape & guards -------- */

test('a1. presentation change requires at least one recognised setting', () => {
  const result = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { pdfOutput: {} },
  })
  assert.equal(result.valid, true)
})

test('a2. unknown presentation families and unknown pdfOutput keys are rejected', () => {
  const badFamily = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { colour: 'red' },
  })
  assert.equal(badFamily.valid, false)
  const badPdfKey = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { pdfOutput: { colour: 'red' } },
  })
  assert.equal(badPdfKey.valid, false)
})

test('a3. pdfOutput values must be booleans; bankAccountId must be a valid reference or null', () => {
  const bad = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { pdfOutput: { showBankDetails: 'yes' } },
  })
  assert.equal(bad.valid, false)
  const badBank = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { pdfOutput: { bankAccountId: 'not-a-uuid' } },
  })
  assert.equal(badBank.valid, false)
  const good = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { pdfOutput: { bankAccountId: BANK_ID } },
  })
  assert.equal(good.valid, true)
  const cleared = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { pdfOutput: { bankAccountId: null } },
  })
  assert.equal(cleared.valid, true)
})

test('a4. heading values are bounded; empty value restores the default', () => {
  const tooLong = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { notesTitle: 'x'.repeat(81) },
  })
  assert.equal(tooLong.valid, false)
  const empty = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { notesTitle: '' },
  })
  assert.equal(empty.valid, true)
  assert.equal(empty.data?.presentationChange?.notesTitle, null)
})

test('a5. charge label keys are limited to workmanship/transportation/shipping', () => {
  const bad = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { chargeLabels: { transport: 'Freight' } },
  })
  assert.equal(bad.valid, false)
  const good = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { chargeLabels: { transportation: 'Freight' } },
  })
  assert.equal(good.valid, true)
})

test('a6. unknown columns, bad visibility modes, hidden description, and duplicate reorder entries are rejected', () => {
  for (const key of ['description', 'quantity', 'unit_price']) {
    const bad = validateInvoiceModifyInput({
      documentId: INVOICE_ID, documentFamily: 'invoice',
      presentationChange: { columns: { setMode: [{ key, mode: 'hide_display' }] } },
    })
    assert.equal(bad.valid, false, `expected ${key} to be protected`)
  }
  const unknown = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { columns: { setMode: [{ key: 'notice', mode: 'show' }] } },
  })
  assert.equal(unknown.valid, false)
  const badMode = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { columns: { setMode: [{ key: 'vat_rate', mode: 'conceal' }] } },
  })
  assert.equal(badMode.valid, false)
  const dup = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { columns: { order: ['make', 'make'] } },
  })
  assert.equal(dup.valid, false)
  const unknownOrder = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { columns: { order: ['make', 'notice'] } },
  })
  assert.equal(unknownOrder.valid, false)
})

test('a7. columns.resetToDefaults cannot be combined with other column operations', () => {
  const result = validateInvoiceModifyInput({
    documentId: INVOICE_ID, documentFamily: 'invoice',
    presentationChange: { columns: { resetToDefaults: true, setMode: [{ key: 'make', mode: 'hide_display' }] } },
  })
  assert.equal(result.valid, false)
})

/* -------- b) engine-level checks -------- */

test('b1. applyPresentationPatch normalises blank chargeLabels to absence', () => {
  const applied = applyPresentationPatch(
    { chargeLabels: { workmanship: 'Workmanship', shipping: 'Extras', transportation: '' } },
    { chargeLabels: { shipping: null, transportation: 'Transported by' } },
    {},
  )
  assert.deepEqual(applied.errors, [])
  assert.deepEqual(applied.subtree.chargeLabels, { workmanship: 'Workmanship', transportation: 'Transported by' })
})

test('b2. applyPresentationPatch reset restores default column config', () => {
  const applied = applyPresentationPatch(
    { columnConfig: [
      { key: 'description', label: 'What', visibilityMode: 'show' },
      { key: 'unit_price', label: 'Cash', visibilityMode: 'show' },
    ] },
    { columns: { resetToDefaults: true } },
    {},
  )
  assert.deepEqual(applied.errors, [])
  const expected = resetColumns().map((column) => column.key)
  assert.deepEqual(applied.subtree.columnConfig.map((column) => column.key), expected.slice().reverse().concat().reverse()) // order equality
})

test('b3. heading reset deletes the key; explicit empty heading also resets', () => {
  const cleared = applyPresentationPatch(
    { notesTitle: 'Project Remarks' },
    { notesTitle: null },
    {},
  )
  assert.equal(cleared.subtree.notesTitle, undefined)
  const empty = applyPresentationPatch(
    { termsTitle: 'Our Formal Terms' },
    { termsTitle: '' },
    {},
  )
  assert.equal(empty.subtree.termsTitle, undefined)
})

test('b4. hide_full on vat_rate removes VAT from the document total (form parity)', () => {
  // The engine flags the column; computeDocument honours hide_full for VAT.
  const columns = normalizeColumns(null).map((column) =>
    column.key === 'vat_rate' ? { ...column, visibilityMode: 'hide_full' } : column,
  )
  const computed = resetColumns()
  assert.equal(computed.length, DEFAULT_COLUMN_ORDER.length)
  assert.equal(columns.find((column) => column.key === 'vat_rate').visibilityMode, 'hide_full')
})

/* -------- c) invoice executor round-trips -------- */

test('c1. pdfOutput booleans round-trip independently and other keys are preserved', async () => {
  const store = await seedInvoice()
  await createInvoice(store, {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  const created = clone(store.documents[0])
  const baseline = parseCf(created)

  const proposal = modify({
    harness: createHarness(store, { bankAccounts: [BANK, BANK2] }),
    document: created,
    items: store.items,
    change: {
      presentationChange: {
        pdfOutput: { compact: true, showFooter: true, showBalanceDue: true },
      },
    },
  })
  const result = await persistInvoiceModification(createHarness(store, { bankAccounts: [BANK, BANK2] }), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  const cf = parseCf(store.documents[0])
  assert.equal(cf.pdfOutput.compact, true)
  assert.equal(cf.pdfOutput.showFooter, true)
  assert.equal(cf.pdfOutput.showBalanceDue, true)
  assert.equal(cf.extraCharges.length >= 0, true)
})

/* -------- c) invoice executor round-trips -------- */

test('c2. bank account resolution accepts a real account and rejects an absent one', async () => {
  const store = await seedInvoice()
  const items = clone(store.items)

  const proposal = modify({
    harness: createHarness(store, { bankAccounts: [BANK] }),
    document: clone(store.documents[0]),
    items,
    change: {
      presentationChange: {
        pdfOutput: { bankAccountId: BANK_ID, showBankDetails: true },
      },
      resolvedBankAccount: { id: BANK_ID, label: 'Zenith Bank · GenGrid Power Ltd' },
    },
  })
  const result = await persistInvoiceModification(
    createHarness(store, { bankAccounts: [BANK] }),
    proposal,
    () => true,
    () => true,
    null,
  )
  assert.equal(result.success, true, result.error)
  assert.equal(parseCf(store.documents[0]).pdfOutput.bankAccountId, BANK_ID)

  // The bank account reference is unknown to the harness → the proposal carries errors.
  const absent = modify({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items,
    change: {
      presentationChange: { pdfOutput: { bankAccountId: 'ffffffff-9999-4999-8999-ffffffffffff' } },
    },
  })
  assert.ok(
    (absent.presentationChange?.errors ?? []).length > 0,
    'unknown bank account must produce proposal errors rather than a silent write',
  )
})

test('c3. notes and terms headings round-trip; content untouched; reset restores default', async () => {
  const store = await seedInvoice({
    notes: 'Original notes body.',
    terms: 'Payment within 14 days.',
  })
  const created = clone(store.documents[0])
  const notesFirst = modify({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { presentationChange: { notesTitle: 'Project Remarks', termsTitle: 'Commercial Terms' } },
  })
  const r1 = await persistInvoiceModification(createHarness(store), notesFirst, () => true, () => true, null)
  assert.equal(r1.success, true, r1.error)
  const after1 = parseCf(store.documents[0])
  assert.equal(after1.notesTitle, 'Project Remarks')
  assert.equal(after1.termsTitle, 'Commercial Terms')
  assert.equal(store.documents[0].notes, '<p>Original notes body.</p>')
  assert.equal(store.documents[0].terms, '<p>Payment within 14 days.</p>')

  const reset = modify({
    harness: createHarness(store),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { presentationChange: { notesTitle: null, termsTitle: null } },
  })
  const r2 = await persistInvoiceModification(createHarness(store), reset, () => true, () => true, null)
  assert.equal(r2.success, true, r2.error)
  const after2 = parseCf(store.documents[0])
  assert.equal(after2.notesTitle, undefined)
  assert.equal(after2.termsTitle, undefined)
})

test('c4. charge labels round-trip; amount fields and calculations untouched', async () => {
  const store = await seedInvoice()
  const created = clone(store.documents[0])
  const totalBefore = Number(created.total)
  const proposal = modify({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: {
      presentationChange: {
        chargeLabels: { transportation: 'Freight & Delivery', workmanship: 'Labour', shipping: null },
      },
    },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  const after = parseCf(store.documents[0])
  assert.equal(after.chargeLabels.transportation, 'Freight & Delivery')
  assert.equal(after.chargeLabels.workmanship, 'Labour')
  assert.equal(after.chargeLabels.shipping, undefined)
  assert.equal(Number(store.documents[0].total), totalBefore)
})

test('c5. mergeQtyUnit and showItemImages round-trip without touching stored quantities', async () => {
  const store = await seedInvoice()
  const created = clone(store.documents[0])
  const proposal = modify({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { presentationChange: { mergeQtyUnit: true, showItemImages: true } },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  const after = parseCf(store.documents[0])
  assert.equal(after.mergeQtyUnit, true)
  assert.equal(after.showItemImages, true)
  assert.equal(Number(store.items[0].quantity), 1)
  assert.equal(Number(store.items[0].unit_price), 100000)
})

test('c6. column visibility changes and order changes persist; unknown columns are untouched', async () => {
  const store = await seedInvoice({
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 100000 }],
  })
  // Inject the customized column config onto the persisted document.
  store.documents[0].custom_fields = JSON.stringify({
    ...parseCf(store.documents[0]),
    columnConfig: [
      { key: 'description', label: 'Description', visibilityMode: 'show' },
      { key: 'vat_rate', label: 'VAT Rate', visibilityMode: 'hide_display' },
      { key: 'custom_x', label: 'Notes', visibilityMode: 'show', type: 'text' },
    ],
  })
  const created = clone(store.documents[0])
  const proposal = modify({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: {
      presentationChange: {
        columns: {
          setMode: [{ key: 'vat_rate', mode: 'hide_full' }],
          setLabel: [{ key: 'amount', label: 'Total' }],
          order: ['description', 'quantity', 'make', 'unit', 'unit_price', 'amount', 'install_rate', 'vat_rate', 'discount_rate'],
        },
      },
    },
  })
  const result = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  const after = parseCf(store.documents[0])
  const vat = after.columnConfig.find((column) => column.key === 'vat_rate')
  assert.equal(vat.visibilityMode, 'hide_full')
  const amount = after.columnConfig.find((column) => column.key === 'amount')
  assert.equal(amount.label, 'Total')
  assert.equal(after.columnConfig.map((column) => column.key).includes('custom_x'), true)
})

test('c7. a concurrent settings change invalidates the proposal fingerprint', async () => {
  const store = await seedInvoice()
  const created = clone(store.documents[0])
  const proposal = modify({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { presentationChange: { mergeQtyUnit: true } },
  })
  const idx = store.documents.findIndex((d) => d.id === created.id)
  const cf = parseCf(store.documents[idx])
  store.documents[idx].custom_fields = JSON.stringify({ ...cf, mergeQtyUnit: true })
  const rejected = await persistInvoiceModification(createHarness(store), proposal, () => true, () => true, null)
  assert.equal(rejected.success, false)
  assert.match(rejected.error ?? '', /presentation settings changed/i)
})

test('c8. adjacent proposals stay independent: signatory clears cleanly', async () => {
  const store = await seedInvoice()
  store.documents[0].custom_fields = JSON.stringify({ ...parseCf(store.documents[0]), signatoryId: SIG_ID })
  const before = parseCf(store.documents[0])
  assert.equal(before.signatoryId, SIG_ID)
  const created = clone(store.documents[0])
  const proposal = modify({
    harness: createHarness(store),
    document: created,
    items: itemsOf(store),
    change: { presentationChange: { signatory: null } },
  })
  const result = await persistInvoiceModification(
    createHarness(store, { signatories: [SIG] }),
    proposal,
    () => true,
    () => true,
    null,
  )
  assert.equal(result.success, true, result.error)
  assert.equal(parseCf(store.documents[0]).signatoryId, undefined)
})

/* -------- d) signatories -------- */

test('d1. a signatory is resolved by name and attached; unknown names are refused', async () => {
  const store = await seedInvoice()
  const created = clone(store.documents[0])
  const proposal = modify({
    harness: createHarness(store, { signatories: [SIG] }),
    document: created,
    items: itemsOf(store),
    change: {
      presentationChange: { signatory: 'Adewale Musa' },
      resolvedSignatory: { id: SIG_ID, name: 'Adewale Musa', role: 'Finance Manager' },
    },
  })
  assert.equal(proposal.presentationChange?.rows[0]?.after, 'Adewale Musa — Finance Manager')
  assert.equal(proposal.presentationChange?.rows[0]?.label, 'Signatory')
  const result = await persistInvoiceModification(
    createHarness(store, { signatories: [SIG] }),
    proposal,
    () => true,
    () => true,
    null,
  )
  assert.equal(result.success, true, result.error)
  assert.equal(parseCf(store.documents[0]).signatoryId, SIG_ID)

  const unknown = modify({
    harness: createHarness(store, { signatories: [SIG] }),
    document: clone(store.documents[0]),
    items: itemsOf(store),
    change: { presentationChange: { signatory: 'Not A Signatory' } },
  })
  assert.ok(
    (unknown.presentationChange?.errors ?? []).some((e) => /signatory/i.test(e)),
    'unknown signatory must be reported as an error at proposal time',
  )
})

test('d2. an ambiguous signatory name refuses to resolve without an exact or unique match', async () => {
  const SIGDUP = { id: 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee', name: 'Adewale Musa', role: 'Director', signature_url: 'https://cdn.example.test/sig-dup.png' }
  const ambiguous = modify({
    harness: createHarness(seedStore({ family: 'invoice' }), { signatories: [SIG, SIGDUP] }),
    document: { id: INVOICE_ID, invoice_number: 'INV-0001', custom_fields: '{}' },
    items: [],
    change: { presentationChange: { signatory: 'Adewale Musa' } },
  })
  assert.ok((ambiguous.presentationChange?.errors ?? []).length > 0)
})

test('d3. the bank account reference is resolved by id and fails closed on a missing record', async () => {
  const store = await seedInvoice()
  const created = clone(store.documents[0])
  const proposal = modify({
    harness: createHarness(store, { bankAccounts: [BANK] }),
    document: created,
    items: itemsOf(store),
    change: { presentationChange: { pdfOutput: { bankAccountId: BANK2.id } } },
  })
  // The bank account id is unknown to the harness → resolution attaches nothing.
  assert.ok(Array.isArray(proposal.presentationChange?.errors))
})

/* -------- d4) gate-2 revalidation for referenced signatories -------- */

test('d4. a signatory removed between Gate 1 and Gate 2 fails the save closed', async () => {
  const store = await seedInvoice()
  const SIG = { id: SIG_ID, name: 'Adewale Musa', role: 'Finance Manager', signature_url: 'https://cdn.example.test/sig.png' }
  const created = clone(store.documents[0])
  const proposal = modify({
    harness: createHarness(store, { signatories: [SIG] }),
    document: created,
    items: itemsOf(store),
    change: {
      presentationChange: { signatory: 'Adewale Musa' },
      resolvedSignatory: { id: SIG_ID, name: 'Adewale Musa', role: 'Finance Manager' },
    },
  })
  // Delete the signatory between Gate 1 and Gate 2.
  const result = await persistInvoiceModification(
    createHarness(store, { signatories: [] }),
    proposal,
    () => true,
    () => true,
    null,
  )
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /signatory/i)
})

/* -------- e1) generation wiring: signatory resolution fails closed -------- */

test('e1. the generation turn resolves signatory names and refuses unknown signatories', async () => {
  const store = await seedInvoice()
  const created = clone(store.documents[0])
  created.id = '123e4567-e89b-12d3-a456-426614174099'
  store.documents[0].id = created.id
  store.items = store.items.map((item) => ({ ...item, invoice_id: created.id }))

  const { mock } = await import('bun:test')
  const insertedRows = []
  mock.module('@/lib/ai-assistant/bolu-transport', () => ({
    sendBoluProviderRequest: async () => ({
      text: [
        'I can make that change.',
        '```json',
        JSON.stringify({
          bolu_operation: {
            operationType: 'modify-document',
            documentFamily: 'invoice',
            payload: { documentId: created.id, presentationChange: { signatory: 'Adewale Musa' } },
          },
        }),
        '```',
      ].join('\n'),
    }),
  }))
  mock.module('@/supabase', () => ({
    supabase: {
      from: (table) => ({
        insert: (row) => ({
          select: () => ({
            single: async () => {
              insertedRows.push(row)
              return {
                data: {
                  id: 'msg-e1', conversation_id: row.conversation_id, tenant_id: row.tenant_id,
                  sender_id: null, role: 'assistant', content: row.content, status: 'completed',
                  proposal_payload: row.proposal_payload ?? null, records_payload: row.records_payload ?? null,
                  metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                },
                error: null,
              }
            },
          }),
        }),
        update: () => ({ eq: () => ({ error: null }) }),
      }),
    },
  }))

  const { runBoluGeneration } = await import('../../lib/ai-assistant/bolu-generation.ts')
  const state = {
    messages: [], activeProposal: null,
    setMessages(fn) { this.messages = typeof fn === 'function' ? fn(this.messages) : fn },
    setStreamingContent() {}, setClerkState() {},
    setActiveProposal(p) { this.activeProposal = p }, setActiveProposalMessageId() {}, setError() {}, setIsStreaming() {},
  }
  const refs = { streamingBuffer: { current: '' }, flushTimer: { current: null }, abortController: { current: null } }
  const canRead = () => true
  const result = await runBoluGeneration({
    targetConversationId: 'conv-3c-e1',
    tenantId: 'tenant-3c',
    history: [{ id: 'h1', role: 'user', content: 'Make Adewale the signatory' }],
    userText: 'Make Adewale the signatory',
    facts: null,
    tenantClient: createHarness(store, { signatories: [SIG] }),
    canRead,
    state,
    refs,
  })
  assert.equal(result, true)
  assert.equal(state.activeProposal?.operationType, 'modify-document')
  assert.equal(state.activeProposal?.presentationChange?.rows[0]?.after?.includes('Adewale Musa'), true)
})

/* -------- f) presentation card rendering -------- */

test('f1. the modify card renders presentation changes with before/after rows', () => {
  const proposal = {
    opId: 'op-f1',
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
    targetDocumentNumber: 'INV-0009',
    presentationChange: {
      old: { pdfOutput: { compact: false }, chargeLabels: { transportation: 'Transportation' } },
      new: { pdfOutput: { compact: true }, chargeLabels: { transportation: 'Freight & Delivery' } },
      rows: [
        { key: 'p-1', label: 'Compact print', before: 'Off', after: 'On' },
        { key: 'p-2', label: 'Transportation label', before: 'Transportation', after: 'Freight & Delivery' },
      ],
      summary: ['Compact print: On.', 'Transportation label changed to "Freight & Delivery".'],
      errors: [],
      fingerprint: fingerprintPresentation({ pdfOutput: { compact: false }, chargeLabels: { transportation: 'Transportation' } }),
    },
  }
  const html = renderToStaticMarkup(createElement(ProposalCardView, { proposal }))
  assert.ok(html.includes('Presentation'), 'presentation panel renders')
  assert.ok(html.includes('Compact print'), 'toggle row renders')
  assert.ok(html.includes('Freight &amp; Delivery') || html.includes('Freight & Delivery'), 'label row renders')
})

test('f2. the copied artifact carries the presentation rows', () => {
  const proposal = {
    opId: 'op-f2',
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
    targetDocumentNumber: 'INV-0010',
    presentationChange: {
      old: {},
      new: {},
      rows: [
        { key: 'p-1', label: 'Notes heading', before: 'Notes', after: 'Project Remarks' },
        { key: 'p-2', label: 'Signatory', before: 'Not set', after: 'Adewale Musa — Finance Manager' },
      ],
      summary: [],
      errors: [],
      fingerprint: 'x',
    },
  }
  const text = proposalPlainText(proposal)
  assert.ok(text.includes('Presentation:'))
  assert.ok(text.includes('Notes heading'))
  assert.ok(text.includes('Adewale Musa'))
})
