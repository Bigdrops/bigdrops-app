import assert from 'node:assert/strict'

/**
 * Stage 3A.1 — Core contract integrity and natural-language communication.
 *
 * Quotation create payment_terms persistence, quotation work_duration strip,
 * tenant project_id verification, rich-text normalization of notes/terms, and
 * a copy-audit guard that keeps internal module/identifiers out of
 * user-facing assistant prose.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import {
  buildDocumentCreateProposal,
  buildInvoiceModifyProposal,
} from '../../lib/ai-assistant/bolu-operations.ts'
import {
  persistInvoiceCreation,
  persistQuotationCreation,
  persistInvoiceModification,
  persistQuotationModification,
} from '../../lib/ai-assistant/bolu-document-service.ts'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '../../..')
const readSource = (relative) => readFileSync(resolve(srcRoot, relative), 'utf8')

const asJson = (v) => JSON.parse(JSON.stringify(v))
const INVOICE_ID = '123e4567-e89b-12d3-a456-426614174000'
const QUOTATION_ID = '123e4567-e89b-12d3-a456-426614174001'
const PROJECT_ID = '33333333-4444-5555-6666-777777777777'
const FOREIGN_PROJECT_ID = '44444444-5555-4555-8555-444444444444'

const approve = (p) => { p.status = 'approved_pending_save'; return p }

function createHarness(store, opts = {}) {
  const { projectFails = false } = opts
  const clone = (v) => v === undefined ? v : JSON.parse(JSON.stringify(v))
  let documentSequence = 0;
  let itemSequence = 0;
  const docKey = () => (store.family === 'invoice' ? 'invoice_number' : 'quotation_number')
  const itemsKey = () => (store.family === 'invoice' ? 'invoice_items' : 'quotation_items')

  const settingsChain = () => ({
    limit: () => ({ single: async () => ({ data: null, error: null }) }),
  })

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
        maybeSingle: async () => {
          const found = store.documents.find((d) =>
            col === 'operation_id' ? String(d.operation_id) === String(value) : String(d.id) === String(value),
          )
          return { data: clone(found ?? null), error: null }
        },
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
          select: () => settingsChain(),
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
                single: async () => ({
                  data: clone(rowsToInsert[0]),
                  error: null,
                }),
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
          delete: () => ({ eq: async () => ({ error: null }) }),
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

const callCreate = (harness, family, payload) => {
  const build = family === 'quotation'
    ? buildDocumentCreateProposal('quotation', payload, 'QTN-DRAFT')
    : buildDocumentCreateProposal('invoice', payload, 'INV-DRAFT')
  return approve(build)
}

const persist = (family) => family === 'quotation' ? persistQuotationCreation : persistInvoiceCreation
const persistModified = (family) => family === 'quotation' ? persistQuotationModification : persistInvoiceModification
const parseCf = (row) => (typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields)

/* -------- a) Quotation payment_terms persisted on create + stale-checked edit -------- */

test('a1. quotation create persists payload.payment_terms into custom_fields.payment_terms', async () => {
  const store = seedStore({ family: 'quotation' })
  const harness = createHarness(store)

  const proposal = callCreate(harness, 'quotation', {
    client_name: 'Verdant Ltd',
    payment_terms: 'Net 14',
    terms: 'Original contract terms.',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const result = await persist('quotation')(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)

  const quotation = store.documents[0]
  const cf = parseCf(quotation)
  assert.equal(cf.payment_terms, 'Net 14')
  assert.equal(quotation.terms, '<p>Original contract terms.</p>')
})

test('a2. after create, a stale-checked modification of payment_terms round-trips; stale gate rejects outdated oldValue', async () => {
  const store = seedStore({ family: 'quotation' })
  const harness = createHarness(store)

  const createProposal = callCreate(harness, 'quotation', {
    client_name: 'Verdant Ltd',
    payment_terms: 'Net 14',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const created = await persist('quotation')(harness, createProposal, () => true, () => true, null)
  assert.equal(created.success, true, created.error)
  const quotationId = created.documentId
  const quotationNumber = created.documentNumber

  const update = approve(buildInvoiceModifyProposal({
    targetDocumentId: quotationId,
    targetDocumentNumber: quotationNumber,
    documentFamily: 'quotation',
    field: 'payment_terms',
    oldValue: 'Net 14',
    newValue: 'Net 30',
  }))
  const updated = await persistModified('quotation')(harness, update, () => true, () => true, null)
  assert.equal(updated.success, true, updated.error)
  assert.equal(parseCf(store.documents[0]).payment_terms, 'Net 30')

  const stale = approve(buildInvoiceModifyProposal({
    targetDocumentId: quotationId,
    targetDocumentNumber: quotationNumber,
    documentFamily: 'quotation',
    field: 'payment_terms',
    oldValue: 'Net 14',
    newValue: 'Net 45',
  }))
  const rejected = await persistModified('quotation')(harness, stale, () => true, () => true, null)
  assert.equal(rejected.success, false)
  assert.match(rejected.error ?? '', /modified by another process/)
  assert.equal(parseCf(store.documents[0]).payment_terms, 'Net 30')
})

/* -------- b) Quotation work_duration is rejected/omitted with a warning -------- */

test('b1. quotation create with work_duration omits it and warns; the field never reaches the payload result', async () => {
  const store = seedStore({ family: 'quotation' })
  const harness = createHarness(store)

  const proposal = callCreate(harness, 'quotation', {
    client_name: 'Verdant Ltd',
    work_duration: '4 weeks',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const result = await persist('quotation')(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.ok((result.warnings ?? []).some((w) => /work_duration/.test(w)), 'expected work_duration warning')
  const quotation = store.documents[0]
  assert.equal(quotation.work_duration, undefined)
})

test('b2. invoice create with work_duration persists it unchanged (no warning)', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  const proposal = callCreate(harness, 'invoice', {
    client_name: 'Verdant Ltd',
    work_duration: '2 weeks',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const result = await persist('invoice')(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.equal((result.warnings ?? []).length, 0)
  assert.equal(store.documents[0].work_duration, '2 weeks')
})

/* -------- c) project_id verified against the tenant's projects -------- */

test('c1. valid same-tenant project_id is kept', async () => {
  const store = seedStore({
    family: 'invoice',
    projects: [{ id: PROJECT_ID, name: 'Sasol Q3 shutdown', archived_at: null }],
  })
  const harness = createHarness(store)

  const proposal = callCreate(harness, 'invoice', {
    client_name: 'Verdant Ltd',
    project_id: PROJECT_ID,
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const result = await persist('invoice')(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.equal(store.documents[0].project_id, PROJECT_ID)
  assert.equal((result.warnings ?? []).length, 0)
})

test('c2. unknown project_id is discarded with a warning; write proceeds with null', async () => {
  const store = seedStore({ family: 'invoice', projects: [] })
  const harness = createHarness(store)

  const proposal = callCreate(harness, 'invoice', {
    client_name: 'Verdant Ltd',
    project_id: FOREIGN_PROJECT_ID,
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const result = await persist('invoice')(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.equal(store.documents[0].project_id, null)
  assert.ok((result.warnings ?? []).some((w) => /project_id/.test(w)), 'expected project_id warning')
})

test('c3. archived project_id is discarded with a warning; cross-tenant is indistinguishable from absent', async () => {
  const store = seedStore({
    family: 'invoice',
    projects: [{ id: PROJECT_ID, name: 'Old project', archived_at: '2026-01-01T00:00:00Z' }],
  })
  const harness = createHarness(store)

  const proposal = callCreate(harness, 'invoice', {
    client_name: 'Verdant Ltd',
    project_id: PROJECT_ID,
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const result = await persist('invoice')(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  assert.equal(store.documents[0].project_id, null)
  assert.ok((result.warnings ?? []).some((w) => /project_id/.test(w)))
})

/* -------- d) rich-text normalization of notes/terms -------- */

test('d1. create with arbitrary unsafe HTML in notes/terms persists safe-normalized output', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  const proposal = callCreate(harness, 'invoice', {
    client_name: 'Verdant Ltd',
    notes: '<script>alert("xss")</script><p>Keep clear of switchyard</p>',
    terms: '<a href="javascript:alert(1)">Click here</a><ol><li><strong>Winch access</strong></li><li><em>Original</em> <u>terms</u></li></ol>',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const result = await persist('invoice')(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)

  const invoice = store.documents[0]
  assert.ok(!/<script/i.test(invoice.notes ?? ''), 'script tag must not persist')
  assert.ok(!/<a href/i.test(invoice.terms ?? '') || !/javascript:/i.test(invoice.terms ?? ''), 'link must not persist verbatim')
  assert.match(invoice.notes ?? '', /<p>/)
  assert.match(invoice.terms ?? '', /<ol>/)
  assert.match(invoice.terms ?? '', /<strong>/)
  assert.match(invoice.terms ?? '', /<em>/)
  assert.match(invoice.terms ?? '', /<u>/)
})

test('d2. structured CommercialRichTextBlock[] input persists as normalized blocks', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  const blocks = [
    { type: 'paragraph', children: [{ text: 'Mobilisation notes' }] },
    { type: 'unordered_list', items: [
      [{ text: 'Winch access required' }],
      [{ text: 'Paint specification', bold: true }],
    ] },
    { type: 'heading', text: 'Contract notes', level: 2 },
  ]
  const proposal = callCreate(harness, 'invoice', {
    client_name: 'Verdant Ltd',
    notes: blocks,
    terms: blocks,
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const result = await persist('invoice')(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)

  const invoice = store.documents[0]
  assert.match(invoice.notes ?? '', /<ul>/)
  assert.match(invoice.notes ?? '', /<li>/)
  assert.match(invoice.notes ?? '', /<strong>Paint specification<\/strong>/)
  assert.match(invoice.notes ?? '', /<h2>Contract notes<\/h2>/)
  assert.match(invoice.terms ?? '', /<ul>/)
})

test('d3. modification of notes normalizes raw text into the safe subset', async () => {
  const store = seedStore({ family: 'invoice' })
  const harness = createHarness(store)

  const createProposal = callCreate(harness, 'invoice', {
    client_name: 'Verdant Ltd',
    items: [{ description: 'Pump overhaul', quantity: 1, unit_price: 950000, unit: 'unit' }],
  })
  const created = await persist('invoice')(harness, createProposal, () => true, () => true, null)
  const invoiceId = created.documentId
  const invoiceNumber = created.documentNumber
  assert.equal(created.success, true)

  const update = approve(buildInvoiceModifyProposal({
    targetDocumentId: invoiceId,
    targetDocumentNumber: invoiceNumber,
    documentFamily: 'invoice',
    field: 'notes',
    oldValue: '',
    newValue: 'First line\n\nSecond paragraph with <em>emphasis</em>',
  }))
  const result = await persistModified('invoice')(harness, update, () => true, () => true, null)
  assert.equal(result.success, true, result.error)
  const invoice = store.documents[0]
  // Mixed markup with supported tags is kept inside one paragraph; emphasis survives.
  assert.match(invoice.notes ?? '', /<em>emphasis<\/em>/)
  assert.ok(!/<script/i.test(invoice.notes ?? ''))

  const clean = approve(buildInvoiceModifyProposal({
    targetDocumentId: invoiceId,
    targetDocumentNumber: invoiceNumber,
    documentFamily: 'invoice',
    field: 'notes',
    oldValue: invoice.notes,
    newValue: 'First note line\n\nSecond note line',
  }))
  const cleanResult = await persistModified('invoice')(harness, clean, () => true, () => true, null)
  assert.equal(cleanResult.success, true, cleanResult.error)
  assert.match(store.documents[0].notes ?? '', /<p>First note line<\/p>/)
})

/* -------- e) natural-language copy: no internal module references -------- */

const FORBIDDEN_PROSE = [
  /calculation\.ts/i,
  /bolu-operations/i,
  /bolu-document-service/i,
  /save_invoice_with_items_transaction/i,
  /save_quotation_with_items_transaction/i,
  /custom_fields/i,
  /operation_id/i,
  /has_entity_permission/i,
]

function proseLiteralsOf(source) {
  // Single-quoted literals only (double-quoted literals also checked), excluding import/path-likes
  const literals = []
  const pattern = /(['"])((?:\\.|(?!\1)[^\n]){0,600})\1/g
  for (const m of source.matchAll(pattern)) {
    const value = m[2]
    if (/^[.@/]/.test(value)) continue        // import paths
    if (/\.(ts|tsx|js|mjs|cjs)$/.test(value)) continue
    literals.push(value)
  }
  return literals
}

test('e1. assistant copy never leaks internal module or mechanism identifiers', () => {
  for (const rel of [
    'api/bolu-chat.ts',
    'src/lib/ai-assistant/bolu-prompt.ts',
    'src/lib/ai-assistant/bolu-generation.ts',
    'src/lib/ai-assistant/bolu-runtime.ts',
    'src/lib/ai-assistant/bolu-reducer.ts',
    'src/lib/ai-assistant/hooks/useBoluThread.ts',
  ]) {
    const source = readSource(rel)
    for (const literal of proseLiteralsOf(source)) {
      for (const banned of FORBIDDEN_PROSE) {
        assert.ok(!banned.test(literal), `${rel} leaks internal identifier in prose literal: ${literal.slice(0, 120)}`)
      }
    }
  }
})
