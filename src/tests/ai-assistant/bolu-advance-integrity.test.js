import assert from 'node:assert/strict'

/**
 * Stage 1 - Bolu Advance Invoice configuration harness.
 *
 * Reuses the real operations/service modules (`bolu-operations`,
 * `bolu-document-service`) against a local `createHarness` that emulates the
 * tenant-persistence contract at the granularity the advance path uses:
 * a single-row read (`select(full).eq().is('archived_at', null).single()`) and
 * a single-row merge-write of `invoices.custom_fields`
 * (`update({custom_fields})`). No child invoice rows are part of this path;
 * items are never touched.
 *
 * The invoice fixture carries the full Stage 0 custom_fields surface
 * (calculationInputs, extraCharges, signatoryId, pdfOutput, columnConfig,
 * groupMeta, created_via, operation_id…) so every test double-checks that a
 * configure/update/remove preserves sibling keys verbatim, line items deep
 * equal, and header columns unchanged.
 */
import {
  validateBoluAdvanceConfigInput,
  buildBoluAdvanceConfigProposal,
} from '../../lib/ai-assistant/bolu-operations.ts'
import {
  persistAdvanceInvoiceConfig,
} from '../../lib/ai-assistant/bolu-document-service.ts'

const asJson = (v) => JSON.parse(JSON.stringify(v))
const semanticJsonEqual = (a, b) => assert.deepEqual(asJson(a), asJson(b))

const INVOICE_ID = '123e4567-e89b-12d3-a456-426614174000'
const PROJECT_ID = '33333333-4444-5555-6666-777777777777'
const CATALOG_ID = '44444444-5555-4555-8555-444444444444'

const ADVANCE_BLOCK = {
  enabled: true,
  amount: 240000,
  mode: 'percentage',
  value: 30,
  document_number: 'INV-000042-A',
  suffix: 'A',
  primary_label: 'Advance invoice due now',
  secondary_label: 'Balance upon completion',
  contract_value: 800000,
}
const CF = {
  operation_id: 'op-seed-1',
  advance_invoice: ADVANCE_BLOCK,
  header: [{ id: 'h1', label: 'Account No.', value: '0011223344' }],
  additionalFields: [{ id: 'a1', label: 'Site', value: 'Ikeja depot' }],
  extraCharges: [
    { label: 'Installation fee', value: 50000, withTax: true },
    { label: 'Mobilisation', value: 30000, withTax: false },
  ],
  chargeLabels: { workmanship: 'Rigging', transportation: 'Haulage', shipping: 'Freight' },
  calculationInputs: {
    vatPercent: 10,
    discountValue: 10,
    discountType: 'percent',
    discountTiming: 'before_tax',
    whtValue: 5,
    whtType: 'percent',
  },
  columnConfig: [
    { key: 'description', visibilityMode: 'show' },
    { key: 'quantity', visibilityMode: 'show' },
  ],
  notesTitle: 'Remarks',
  termsTitle: 'Contract terms',
  mergeQtyUnit: false,
  showItemImages: true,
  pdfOutput: {
    showBankDetails: false,
    bankAccountId: 'acct-9',
    showFooter: true,
    showTagline: false,
    showBalanceDue: true,
    showAmountInWords: true,
  },
  signatoryId: 'sig-0001',
  attachments: [{ label: 'Spec sheet', url: 'https://example.test/spec.pdf' }],
  groupMeta: { g1: { name: 'Phase 1', showSubtotal: true } },
  conversionTrail: [{ from: 'QTN-000100', to: 'INV-000042' }],
  created_via: 'cost_pricing_sheet',
}

const SEED_INVOICE = {
  id: INVOICE_ID,
  invoice_number: 'INV-000042',
  invoice_title: 'Reactor maintenance - Q3',
  po_number: 'PO-7788',
  client_id: '99999999-8888-7777-6666-555555555555',
  client_name: 'Sasol Nigeria Ltd',
  project_id: PROJECT_ID,
  issue_date: '2026-10-01',
  due_date: '2026-11-30',
  status: 'paid',
  document_type: 'invoice',
  payment_terms: 'Net 14',
  notes: 'Handle with crane',
  terms: 'Winch access required. Original contract terms.',
  workmanship: 60000,
  transportation: 20000,
  shipping: 10000,
  discount: 10,
  vat: 75000,
  wht: 5000,
  work_duration: '3 weeks',
  subtotal: 1250000,
  install_rate_total: 50000,
  total: 800000,
  amount_in_words: 'Eight hundred thousand naira only',
  custom_fields: asJson(CF),
  archived_at: null,
}
const SEED_ITEMS = [
  {
    id: 'item-1', invoice_id: INVOICE_ID, sort_order: 0,
    description: 'Reactor vessel body', quantity: 2, unit_price: 650000, unit: 'unit',
    row_type: 'standard', item_id: CATALOG_ID, sub_description: 'Grade 316L, 12 m3',
    make: 'SasolFab', vat_rate: 15, discount_rate: 5, install_rate: 25000,
    install_rate_taxable: true, install_rate_override: true,
    custom_data: asJson({ partNo: 'RV-12-316L', condition: 'refurbished' }),
  },
  {
    id: 'item-2', invoice_id: INVOICE_ID, sort_order: 1,
    description: 'Mounting rig', quantity: 2, unit_price: 40000, unit: 'set',
    row_type: 'group_header', group_id: 'g1', group_name: 'Phase 1', custom_data: asJson({}),
  },
  {
    id: 'item-3', invoice_id: INVOICE_ID, sort_order: 2,
    description: 'Lifting lugs', quantity: 4, unit_price: 15000, unit: 'pcs',
    row_type: 'standard', custom_data: asJson({}),
  },
]

// Default: parent carries a fully populated advance_invoice block (like the
// Stage 0 seed). Pass { withAdvance: false } to model an unconfigured parent.
function seedStore({ withAdvance = true } = {}) {
  const invoice = asJson(SEED_INVOICE)
  if (!withAdvance) {
    const cf = { ...invoice.custom_fields }
    delete cf.advance_invoice
    invoice.custom_fields = cf
  }
  return {
    invoices: [invoice],
    invoice_items: asJson(SEED_ITEMS),
  }
}

function createHarness(store, opts = {}) {
  const { failCustomFieldsUpdateOnce = false, failAuditOnce = false } = opts
  let updateCount = 0
  let auditCount = 0

  const applyCustomFieldsUpdate = (customFields) => {
    updateCount += 1
    if (failCustomFieldsUpdateOnce && updateCount === 1) {
      return { error: { message: 'simulated custom_fields update failure' } }
    }
    // The real path stores a JSON string; emulate the round-trip.
    const parsed = typeof customFields === 'string' ? JSON.parse(customFields) : customFields
    store.invoices[0].custom_fields = asJson(parsed)
    return { error: null }
  }

  return {
    isReady: true,
    schemaName: 'entity_test',
    store,
    updateCount: () => updateCount,
    auditCount: () => auditCount,
    from: (table) => {
      if (table === 'invoices') {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                single: async () => ({ data: asJson(store.invoices[0]), error: null }),
              }),
            }),
          }),
          update: (values) => ({
            eq: () => Promise.resolve(applyCustomFieldsUpdate(values.custom_fields)),
          }),
        }
      }
      if (table === 'invoice_items') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: asJson(store.invoice_items), error: null }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
    rpc: async (name) => {
      if (name === 'record_audit_log') {
        auditCount += 1
        if (failAuditOnce && auditCount === 1) {
          return { data: null, error: { message: 'simulated audit failure' } }
        }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    },
  }
}

const canWrite = () => true
const canRead = () => true

const approve = (p) => { p.status = 'approved_pending_save'; return p }

// Persisted full-row snapshot before the proposing user saw it (Gate 1 grounds).
const currentSnapshot = (store, { present } = {}) => {
  const row = store.invoices[0]
  const cf = typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields
  const advance = present === undefined ? Boolean(cf?.advance_invoice) : present
  const v = cf?.advance_invoice ?? {}
  return {
    present: advance,
    suffix: advance ? v.suffix ?? null : null,
    mode: advance ? v.mode ?? null : null,
    value: advance ? v.value ?? null : null,
    primary_label: advance ? v.primary_label ?? null : null,
    secondary_label: advance ? v.secondary_label ?? null : null,
    contractValue: advance ? Number(v.contract_value ?? row.total) : undefined,
    documentNumber: advance ? v.document_number ?? null : null,
    amount: advance ? Number(v.amount) : null,
  }
}

const parentSnapshot = (store) => {
  const row = store.invoices[0]
  return {
    invoice_number: row.invoice_number,
    issue_date: row.issue_date,
    due_date: row.due_date,
    total: row.total,
  }
}

function buildProposal(store, { intent, newValues, oldValues } = {}) {
  const current = currentSnapshot(store)
  return approve(buildBoluAdvanceConfigProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: store.invoices[0].invoice_number,
    intent,
    newValues,
    oldValues,
    current,
    parent: parentSnapshot(store),
  }))
}

const stripAdvance = (cf) => {
  const copy = asJson(cf)
  delete copy.advance_invoice
  return copy
}
const advanceOf = (row) => {
  const cf = typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields
  return cf?.advance_invoice ?? null
}

/* ---------------- a) Percentage mode configure & update ---------------- */

test('a1. Percentage configure on an unconfigured parent persists merged metadata, siblings intact', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)
  const beforeCf = asJson(store.invoices[0].custom_fields)
  const beforeItems = asJson(store.invoice_items)

  const proposal = buildProposal(store, { intent: 'configure', newValues: { mode: 'percentage', value: 40 } })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)

  assert.equal(result.success, true, result.error)
  const advance = advanceOf(store.invoices[0])
  assert.equal(advance.enabled, true)
  assert.equal(advance.mode, 'percentage')
  assert.equal(advance.value, 40)
  assert.equal(advance.amount, 320000) // 800000 * 0.40
  assert.equal(advance.contract_value, 800000)
  assert.equal(advance.document_number, 'INV-000042-A')
  assert.equal(advance.primary_label, 'Advance invoice due now')
  assert.equal(advance.secondary_label, 'Balance upon completion')
  // sibling custom_fields keys preserved verbatim
  semanticJsonEqual(stripAdvance(store.invoices[0].custom_fields), stripAdvance(beforeCf))
  // header + items untouched
  assert.equal(store.invoices[0].total, 800000)
  assert.equal(store.invoices[0].terms, 'Winch access required. Original contract terms.')
  assert.deepEqual(store.invoice_items, beforeItems)
  assert.equal(harness.auditCount(), 1)
})

test('a2. Percentage update changes value and labels; amount recomputed; siblings and preview consistent', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const beforeCf = asJson(store.invoices[0].custom_fields)

  const proposal = buildProposal(store, {
    intent: 'update',
    newValues: { value: 50, primary_label: 'Mobilisation advance', secondary_label: 'Balance on completion' },
    oldValues: { suffix: 'A', mode: 'percentage', value: 30, primary_label: 'Advance invoice due now', secondary_label: 'Balance upon completion' },
  })

  assert.equal(proposal.preview.advance_present_before, true)
  assert.equal(proposal.preview.advance_present_after, true)
  assert.equal(proposal.preview.fields.value.before, 30)
  assert.equal(proposal.preview.fields.value.after, 50)
  assert.equal(proposal.preview.fields.primary_label.after, 'Mobilisation advance')
  assert.equal(proposal.preview.amount, 400000) // Gate 1 derived preview
  assert.equal(proposal.preview.documentNumber, 'INV-000042-A')

  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, true, result.error)

  const advance = advanceOf(store.invoices[0])
  assert.equal(advance.value, 50)
  assert.equal(advance.amount, 400000)
  assert.equal(advance.mode, 'percentage')
  assert.equal(advance.primary_label, 'Mobilisation advance')
  assert.equal(advance.secondary_label, 'Balance on completion')
  assert.equal(advance.document_number, 'INV-000042-A') // suffix untouched
  assert.equal(advance.contract_value, 800000)
  assert.equal(advance.legacy_child_invoice_id, undefined)

  semanticJsonEqual(stripAdvance(store.invoices[0].custom_fields), stripAdvance(beforeCf))
  assert.deepEqual(store.invoice_items, SEED_ITEMS)
})

test('a3. Configure when one is already configured fails closed and writes nothing', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const beforeCf = asJson(store.invoices[0].custom_fields)

  const proposal = buildProposal(store, { intent: 'configure', newValues: { value: 10 } })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)

  assert.equal(result.success, false)
  assert.match(result.error ?? '', /already configured/)
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  assert.equal(harness.updateCount(), 0)
})

test('a4. Update when none is configured fails closed and writes nothing', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)
  const beforeCf = asJson(store.invoices[0].custom_fields)

  const proposal = buildProposal(store, { intent: 'update', newValues: { value: 10 } })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)

  assert.equal(result.success, false)
  assert.match(result.error ?? '', /No Advance Invoice is configured/)
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  assert.equal(harness.updateCount(), 0)
})

/* ---------------- b) Fixed-amount mode configure & update ---------------- */

test('b1. Fixed-amount configure persists amount = value (capped at contract) and percentage math is unaffected', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)

  const proposal = buildProposal(store, {
    intent: 'configure',
    newValues: { mode: 'fixed', value: 240000, suffix: 'ADV' },
  })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)

  assert.equal(result.success, true, result.error)
  const advance = advanceOf(store.invoices[0])
  assert.equal(advance.mode, 'fixed')
  assert.equal(advance.value, 240000)
  assert.equal(advance.amount, 240000)
  assert.equal(advance.suffix, 'ADV')
  assert.equal(advance.document_number, 'INV-000042-ADV')
})

test('b2. Fixed-amount update exceeding contract value clamps like the domain helper (in-bounds only)', async () => {
  const store = seedStore()
  const harness = createHarness(store)

  const proposal = buildProposal(store, {
    intent: 'update',
    newValues: { mode: 'fixed', value: 900000 }, // exceeds 800000 contract
    oldValues: { mode: 'percentage', value: 30 },
  })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, true, result.error)
  const advance = advanceOf(store.invoices[0])
  assert.equal(advance.mode, 'fixed')
  assert.equal(advance.value, 800000) // clamped to contract value by domain helper
  assert.equal(advance.amount, 800000)
})

test('b3. Fixed-amount update within contract value persists exactly', async () => {
  const store = seedStore()
  const harness = createHarness(store)

  const proposal = buildProposal(store, {
    intent: 'update',
    newValues: { mode: 'fixed', value: 150000 },
    oldValues: { mode: 'percentage', value: 30 },
  })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, true, result.error)
  const advance = advanceOf(store.invoices[0])
  assert.equal(advance.mode, 'fixed')
  assert.equal(advance.value, 150000)
  assert.equal(advance.amount, 150000)
})

/* --------------- c) Invalid values rejected at validation ---------------- */

const invalidPayloads = [
  ['bad mode', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: { mode: 'sliding' } }],
  ['non-finite value', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: { value: Number.NaN } }],
  ['negative value', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: { value: -5 } }],
  ['percentage value > 100', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: { mode: 'percentage', value: 150 } }],
  ['suffix must be string', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: { suffix: 42 } }],
  ['primary_label must be string', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: { primary_label: {} } }],
  ['secondary_label must be string', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: { secondary_label: true } }],
  ['quotation family rejected', { targetDocumentId: INVOICE_ID, documentFamily: 'quotation', intent: 'update', newValues: { value: 10 } }],
  ['bogus intent', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'reconfigure', newValues: { value: 10 } }],
  ['update with no fields', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: {} }],
  ['invalid uuid', { targetDocumentId: 'not-a-uuid', documentFamily: 'invoice', intent: 'update', newValues: { value: 10 } }],
  ['unknown newValues key', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: { discount: 5 } }],
  ['remove with newValues', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'remove', newValues: { value: 10 }, oldValues: { suffix: 'A', mode: 'percentage', value: 30, primary_label: 'Advance invoice due now', secondary_label: 'Balance upon completion' } }],
  ['oldValues wrong type', { targetDocumentId: INVOICE_ID, documentFamily: 'invoice', intent: 'update', newValues: { value: 10 }, oldValues: { value: { nested: 1 } } }],
]
for (const [name, payload] of invalidPayloads) {
  test(`c. invalid payload rejected at validation: ${name}`, () => {
    const result = validateBoluAdvanceConfigInput(payload)
    assert.equal(result.valid, false)
    assert.ok(result.errors.length > 0)
  })
}

test('c2. executor defense-in-depth rejects out-of-range value without validation', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const beforeCf = asJson(store.invoices[0].custom_fields)

  const proposal = approve(buildBoluAdvanceConfigProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-000042',
    intent: 'update',
    newValues: { mode: 'percentage', value: 999 }, // never validated
  }))
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, false)
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  assert.equal(harness.updateCount(), 0)
})

/* --------- d) Stale oldValue concurrency mismatch, five fields + remove --------- */

for (const [name, oldValues] of [
  ['suffix mismatch', { suffix: 'ADV' }, null, 'suffix'],
  ['mode mismatch', { mode: 'fixed' }, null, 'mode'],
  ['value mismatch', { value: 25 }, null, 'value'],
  ['primary_label mismatch', { primary_label: 'something else entirely' }, null, 'primary_label'],
  ['secondary_label mismatch', { secondary_label: 'Different label' }, null, 'secondary_label'],
]) {
  test(`d. stale guard rejects before write: ${name}`, async () => {
    const store = seedStore()
    const harness = createHarness(store)
    const beforeCf = asJson(store.invoices[0].custom_fields)

    const proposal = approve(buildBoluAdvanceConfigProposal({
      targetDocumentId: INVOICE_ID,
      targetDocumentNumber: 'INV-000042',
      intent: 'update',
      newValues: { value: 55 },
      oldValues,
    }))
    const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
    assert.equal(result.success, false)
    assert.match(result.error ?? '', /modified by another process/)
    assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
    assert.equal(harness.updateCount(), 0)
  })
}

test('d. removal with one stale field is rejected before any write and the block survives', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const beforeCf = asJson(store.invoices[0].custom_fields)

  const proposal = approve(buildBoluAdvanceConfigProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-000042',
    intent: 'remove',
    oldValues: { suffix: 'WRONG', mode: 'percentage', value: 30, primary_label: 'Advance invoice due now', secondary_label: 'Balance upon completion' },
  }))
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /modified by another process/)
  assert.ok(advanceOf(store.invoices[0]))
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  assert.equal(harness.updateCount(), 0)
})

test('d. removal missing one gate field is rejected before any write', async () => {
  const store = seedStore()
  const harness = createHarness(store)

  const proposal = approve(buildBoluAdvanceConfigProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-000042',
    intent: 'remove',
    oldValues: { suffix: 'A', mode: 'percentage', value: 30, primary_label: 'Advance invoice due now' }, // missing secondary_label
  }))
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /full five-field gate/)
  assert.equal(harness.updateCount(), 0)
})

/* --------- e) Removal preserves siblings, header, items --------- */

test('e. removal deletes advance_invoice cleanly; siblings, header and items preserved verbatim', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const beforeCf = asJson(store.invoices[0].custom_fields)
  const beforeItems = asJson(store.invoice_items)

  const proposal = buildProposal(store, {
    intent: 'remove',
    oldValues: { suffix: 'A', mode: 'percentage', value: 30, primary_label: 'Advance invoice due now', secondary_label: 'Balance upon completion' },
  })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)

  assert.equal(result.success, true, result.error)
  const cf = store.invoices[0].custom_fields
  assert.equal(advanceOf(store.invoices[0]), null)
  semanticJsonEqual(cf.calculationInputs, CF.calculationInputs)
  semanticJsonEqual(cf.extraCharges, CF.extraCharges)
  semanticJsonEqual(cf.signatoryId, CF.signatoryId)
  semanticJsonEqual(cf.pdfOutput, CF.pdfOutput)
  semanticJsonEqual(cf.groupMeta, CF.groupMeta)
  semanticJsonEqual(cf.conversionTrail, CF.conversionTrail)
  semanticJsonEqual(cf.chargeLabels, CF.chargeLabels)
  semanticJsonEqual(cf.operation_id, CF.operation_id)
  assert.deepEqual(store.invoice_items, beforeItems)
  assert.equal(store.invoices[0].po_number, 'PO-7788')
  assert.equal(store.invoices[0].total, 800000)
  assert.equal(store.invoices[0].terms, 'Winch access required. Original contract terms.')
  semanticJsonEqual(stripAdvance(cf), stripAdvance(beforeCf))
  assert.equal(harness.auditCount(), 1)
})

test('e2. removal when none is configured fails closed with zero writes', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)

  const proposal = approve(buildBoluAdvanceConfigProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-000042',
    intent: 'remove',
    oldValues: { suffix: null, mode: null, value: null, primary_label: null, secondary_label: null },
  }))
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /nothing was removed/)
  assert.equal(harness.updateCount(), 0)
})

/* --------- f) Idempotency / replay --------- */

test('f. replaying the same operation_id is rejected; no duplicate side effects', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)

  const proposal = buildProposal(store, { intent: 'configure', newValues: { value: 40 } })
  const first = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(first.success, true, first.error)
  const afterFirst = asJson(store.invoices[0].custom_fields)
  const auditAfterFirst = harness.auditCount()

  const second = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(second.success, false)
  assert.match(second.error ?? '', /already been submitted/)
  assert.deepEqual(store.invoices[0].custom_fields, afterFirst) // unchanged
  assert.equal(harness.auditCount(), auditAfterFirst)          // no second audit
  assert.equal(harness.updateCount(), 1)                       // exactly one write
})

test('f2. expired proposal is rejected before any write', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)

  const proposal = buildProposal(store, { intent: 'configure', newValues: { value: 40 } })
  proposal.expiresAt = new Date(Date.now() - 60_000).toISOString()
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /expired/)
  assert.equal(harness.updateCount(), 0)
})

/* --------- g) Persistence failure -> atomic zero partial state --------- */

test('g. custom_fields update failure leaves the parent row and items untouched', async () => {
  const store = seedStore()
  const harness = createHarness(store, { failCustomFieldsUpdateOnce: true })
  const beforeCf = asJson(store.invoices[0].custom_fields)
  const beforeItems = asJson(store.invoice_items)

  const proposal = buildProposal(store, {
    intent: 'update',
    newValues: { value: 60 },
    oldValues: { suffix: 'A', mode: 'percentage', value: 30, primary_label: 'Advance invoice due now', secondary_label: 'Balance upon completion' },
  })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)

  assert.equal(result.success, false)
  assert.match(result.error ?? '', /could not be saved/)
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  assert.deepEqual(store.invoice_items, beforeItems)
  assert.equal(harness.updateCount(), 1) // one failed attempt, no retry loop, no partial merge
})

test('g2. audit failure does not roll back a persisted configuration (audit is best-effort)', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store, { failAuditOnce: true })

  const proposal = buildProposal(store, { intent: 'configure', newValues: { value: 25 } })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, true, result.error)
  assert.equal(advanceOf(store.invoices[0]).value, 25)
})

/* --------- gate & family enforcement --------- */

test('h1. non-approved proposal is rejected before any write', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)

  const proposal = buildProposal(store, { intent: 'configure', newValues: { value: 25 } })
  proposal.status = 'pending_approval'
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /Gate 1/)
  assert.equal(harness.updateCount(), 0)
})

test('h2. executor rejects quotation-family proposals', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)

  const proposal = buildProposal(store, { intent: 'configure', newValues: { value: 25 } })
  proposal.documentFamily = 'quotation'
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /invoice family only/)
  assert.equal(harness.updateCount(), 0)
})

test('h3. empty-string suffix strips the document-number dash (domain semantics)', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)

  const proposal = buildProposal(store, { intent: 'configure', newValues: { suffix: '', value: 30 } })
  const result = await persistAdvanceInvoiceConfig(harness, proposal, canWrite, canRead)
  assert.equal(result.success, true, result.error)
  const advance = advanceOf(store.invoices[0])
  assert.equal(advance.suffix, '')
  assert.equal(advance.document_number, 'INV-000042')
})

test('h4. preview shows exact after-values for an unconfigured parent (configure Gate 1)', async () => {
  const store = seedStore({ withAdvance: false })
  const proposal = buildProposal(store, { intent: 'configure', newValues: { mode: 'percentage', value: 40, primary_label: 'Mobilisation' } })
  assert.equal(proposal.preview.advance_present_before, false)
  assert.equal(proposal.preview.advance_present_after, true)
  assert.equal(proposal.preview.fields.value.after, 40)
  assert.equal(proposal.preview.fields.primary_label.after, 'Mobilisation')
  assert.equal(proposal.preview.fields.suffix.after, 'A')
  assert.equal(proposal.preview.fields.mode.after, 'percentage')
  assert.equal(proposal.preview.documentNumber, 'INV-000042-A')
  assert.equal(proposal.preview.amount, 320000)
  assert.equal(proposal.preview.contractValue, 800000)
})
