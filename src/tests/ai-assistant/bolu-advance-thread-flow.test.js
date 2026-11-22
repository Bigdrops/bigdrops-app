import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { createBoluRuntime } from '../../lib/ai-assistant/bolu-runtime.ts'
import { buildBoluPageContext } from '../../lib/ai-assistant/bolu-context.ts'
import {
  gateTwoExecutionMessage,
  executionWarnings,
} from '../../lib/ai-assistant/bolu-gate2-result.ts'
import { mapRowToMessage } from '../../lib/ai-assistant/hooks/types.ts'
import { MessageWarnings, readMessageWarnings } from '../../components/ai-assistant/chat/assistant-chat-warnings.tsx'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '../../..')
const readSource = (relative) => readFileSync(resolve(srcRoot, relative), 'utf8')

const asJson = (v) => JSON.parse(JSON.stringify(v))
const ENTITY_ID = '11111111-2222-3333-4444-555555555555'
const INVOICE_ID = '123e4567-e89b-12d3-a456-426614174000'
const CATALOG_ID = '44444444-5555-4555-8555-444444444444'
const PROJECT_ID = '33333333-4444-5555-6666-777777777777'

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
  extraCharges: [{ label: 'Installation fee', value: 50000, withTax: true }],
  chargeLabels: { workmanship: 'Rigging', transportation: 'Haulage', shipping: 'Freight' },
  calculationInputs: {
    vatPercent: 10,
    discountValue: 10,
    discountType: 'percent',
    discountTiming: 'before_tax',
    whtValue: 5,
    whtType: 'percent',
  },
  columnConfig: [{ key: 'description', visibilityMode: 'show' }],
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
  groupMeta: { g1: { name: 'Phase 1', showSubtotal: true } },
  conversionTrail: [{ from: 'QTN-000100', to: 'INV-000042' }],
  created_via: 'bolu_assistant',
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
]

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
  const { failCustomFieldsUpdateOnce = false } = opts
  let updateCount = 0
  const clone = (v) => asJson(v)
  const applyCustomFieldsUpdate = (customFields) => {
    updateCount += 1
    if (failCustomFieldsUpdateOnce && updateCount === 1) {
      return { error: { message: 'simulated custom_fields update failure' } }
    }
    const parsed = typeof customFields === 'string' ? JSON.parse(customFields) : customFields
    store.invoices[0].custom_fields = asJson(parsed)
    return { error: null }
  }
  return {
    isReady: true,
    schemaName: 'entity_test',
    store,
    updateCount: () => updateCount,
    from: (table) => {
      if (table === 'invoices') {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                single: async () => ({ data: clone(store.invoices[0]), error: null }),
                maybeSingle: async () => ({ data: clone(store.invoices[0]), error: null }),
              }),
            }),
          }),
          update: (values) => ({
            eq: async () => applyCustomFieldsUpdate(values.custom_fields),
          }),
        }
      }
      if (table === 'clients') {
        return {
          select: () => ({
            is: () => ({
              or: () => ({ limit: async () => ({ data: [], error: null }) }),
            }),
          }),
        }
      }
      if (table === 'invoice_items') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: clone(store.invoice_items), error: null }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
    rpc: async (name) => {
      if (name === 'search_documents') return { data: [], error: null }
      if (name === 'record_audit_log') return { data: null, error: null }
      return { data: null, error: null }
    },
  }
}

let nextProviderText = ''
const providerSend = async () => ({ text: nextProviderText })

function makeRuntime(harness, { provider = providerSend } = {}) {
  const runtime = createBoluRuntime({
    tenantClient: harness,
    entityId: ENTITY_ID,
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: provider,
  })
  runtime.open(buildBoluPageContext('/invoices', 'contextual'))
  return runtime
}

const envelope = (operation) =>
  `Preparing that for you.\n\n\`\`\`json\n${JSON.stringify({ bolu_operation: operation })}\n\`\`\``

const advanceOf = (store) => {
  const cf = store.invoices[0].custom_fields
  return cf?.advance_invoice ?? null
}

/* ---------- a) Configure conversational flow ---------- */

await test('a1. configure on an unconfigured parent: Gate 1 preview, explicit Gate 2 confirmation persists', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)
  const beforeCf = asJson(store.invoices[0].custom_fields)
  const beforeItems = asJson(store.invoice_items)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: {
      targetDocumentId: INVOICE_ID,
      intent: 'configure',
      newValues: { mode: 'percentage', value: 40 },
    },
  })
  await runtime.submit('Set the advance invoice on this invoice to 40 percent')

  const gate1 = runtime.getState()
  assert.equal(gate1.status, 'awaiting_approval')
  assert.equal(gate1.activeProposal?.operationType, 'advance-invoice-config')
  assert.equal(gate1.activeProposal?.intent, 'configure')
  assert.equal(gate1.activeProposal?.preview.advance_present_before, false)
  assert.deepEqual(gate1.activeProposal?.oldValues, {
    suffix: null, mode: null, value: null, primary_label: null, secondary_label: null,
  })
  assert.equal(gate1.activeProposal?.preview.fields.value.before, null)
  assert.equal(gate1.activeProposal?.preview.fields.value.after, 40)
  assert.equal(gate1.activeProposal?.preview.amount, 320000)
  assert.equal(gate1.activeProposal?.preview.contractValue, 800000)
  // Gate 1 never persists
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  assert.equal(harness.updateCount(), 0)

  runtime.approveProposal(gate1.activeProposal.opId)
  assert.equal(runtime.getState().status, 'awaiting_save')
  // Gate 2 still persists only on explicit confirmation
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  assert.equal(harness.updateCount(), 0)

  await runtime.confirmSave(gate1.activeProposal.opId)

  const adv = advanceOf(store)
  assert.equal(adv.value, 40)
  assert.equal(adv.amount, 320000)
  assert.equal(adv.mode, 'percentage')
  assert.equal(adv.suffix, 'A')
  assert.equal(adv.document_number, 'INV-000042-A')
  assert.deepEqual(store.invoice_items, beforeItems)
  assert.equal(store.invoices[0].total, 800000)
  assert.equal(store.invoices[0].terms, 'Winch access required. Original contract terms.')
  assert.deepEqual(stripAdvance(store.invoices[0].custom_fields), stripAdvance(beforeCf))
  assert.equal(harness.updateCount(), 1)
  assert.equal(runtime.getState().status, 'idle')
})

await test('a2. configure on an unconfigured parent strips nothing and shows before=after=null bases', async () => {
  const store = seedStore({ withAdvance: false })
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: INVOICE_ID, intent: 'configure', newValues: { value: 25 } },
  })
  await runtime.submit('Add an advance invoice at 25 percent')

  const proposal = runtime.getState().activeProposal
  assert.equal(proposal?.operationType, 'advance-invoice-config')
  assert.equal(proposal?.preview.advance_present_before, false)
  assert.equal(proposal?.preview.advance_present_after, true)
  assert.equal(proposal?.preview.fields.value.before, null)
  assert.equal(proposal?.preview.fields.value.after, 25)
  assert.deepEqual(proposal?.oldValues, {
    suffix: null, mode: null, value: null, primary_label: null, secondary_label: null,
  })
})

await test('a3. configure on a parent that already has an advance block fails closed; nothing persists', async () => {
  const store = seedStore() // advance block present
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)
  const beforeCf = asJson(store.invoices[0].custom_fields)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: INVOICE_ID, intent: 'configure', newValues: { value: 40 } },
  })
  await runtime.submit('Add an advance invoice at 40 percent')
  const proposal = runtime.getState().activeProposal
  assert.equal(proposal?.intent, 'configure')

  runtime.approveProposal(proposal.opId)
  await runtime.confirmSave(proposal.opId)
  assert.equal(advanceOf(store).value, 30, 'the persisted configuration must survive untouched')
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  assert.equal(runtime.getState().status, 'awaiting_save')
  const failures = runtime.getState().messages.filter((m) => /Failed to save document/i.test(m.content))
  assert.equal(failures.length, 1)
  assert.match(failures[0].content, /already configured/)
})

/* ---------- b) Update flows ---------- */
await test('b1. update partial: only the supplied field changes, previews are exact, persisted state guards', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: INVOICE_ID, intent: 'update', newValues: { value: 55 } },
  })
  await runtime.submit('Change the advance to 55 percent')

  const proposal = runtime.getState().activeProposal
  assert.equal(proposal?.intent, 'update')
  assert.equal(proposal?.preview.fields.value.before, 30)
  assert.equal(proposal?.preview.fields.value.after, 55)
  assert.equal(proposal?.preview.fields.primary_label.before, 'Advance invoice due now')
  assert.equal(proposal?.preview.fields.primary_label.after, 'Advance invoice due now')
  assert.equal(proposal?.preview.fields.suffix.after, 'A')
  assert.equal(proposal?.preview.fields.mode.after, 'percentage')

  runtime.approveProposal(proposal?.opId)
  await runtime.confirmSave(proposal?.opId)
  const adv = advanceOf(store)
  assert.equal(adv.value, 55)
  assert.equal(adv.amount, 440000) // 800000 * 0.55
  assert.equal(adv.primary_label, 'Advance invoice due now')    // untouched
  assert.equal(adv.secondary_label, 'Balance upon completion')   // untouched
  assert.equal(store.invoices[0].po_number, 'PO-7788')
})

await test('b2. update full: mode switch to fixed recomputes via domain helper', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: INVOICE_ID, intent: 'update', newValues: { mode: 'fixed', value: 200000, primary_label: 'Mobilisation advance' } },
  })
  await runtime.submit('Make the advance a fixed two hundred thousand and rename the label')

  const proposal = runtime.getState().activeProposal
  assert.equal(proposal?.preview.fields.mode.after, 'fixed')
  assert.equal(proposal?.preview.fields.value.after, 200000)
  assert.equal(proposal?.preview.fields.primary_label.after, 'Mobilisation advance')
  assert.equal(proposal?.preview.fields.value.before, 30)

  runtime.approveProposal(proposal?.opId)
  await runtime.confirmSave(proposal?.opId)
  const adv = advanceOf(store)
  assert.equal(adv.mode, 'fixed')
  assert.equal(adv.value, 200000)
  assert.equal(adv.amount, 200000)
  assert.equal(adv.primary_label, 'Mobilisation advance')
})

/* ---------- c) Remove conversational flow ---------- */

await test('c1. remove: unambiguous removal preview, five-field gate persisted, siblings preserved', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)
  const beforeItems = asJson(store.invoice_items)
  const beforeOtherKeys = stripAdvance(store.invoices[0].custom_fields)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: INVOICE_ID, intent: 'remove' },
  })
  await runtime.submit('Remove the advance invoice from this invoice')

  const proposal = runtime.getState().activeProposal
  assert.equal(proposal?.intent, 'remove')
  assert.deepEqual(Object.keys(proposal?.oldValues ?? {}).sort(),
    ['mode', 'primary_label', 'secondary_label', 'suffix', 'value'])
  assert.equal(proposal?.preview.advance_present_before, true)
  assert.equal(proposal?.preview.advance_present_after, false)
  assert.equal(proposal?.preview.fields.value.before, 30)

  runtime.approveProposal(proposal?.opId)
  await runtime.confirmSave(proposal?.opId)
  assert.equal(advanceOf(store), null)
  assert.deepEqual(store.invoice_items, beforeItems)
  assert.deepEqual(stripAdvance(store.invoices[0].custom_fields), beforeOtherKeys)
  assert.equal(store.invoices[0].status, 'paid')
})

/* ---------- d) Stale proposal rejected through the flow ---------- */

await test('d1. persisted value changes after proposal creation -> save is rejected, no write lands', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: INVOICE_ID, intent: 'update', newValues: { value: 55 } },
  })
  await runtime.submit('Change the advance to 55 percent')
  const proposal = runtime.getState().activeProposal

  // Simulate a concurrent edit that slipped past Gate 1.
  store.invoices[0].custom_fields = {
    ...store.invoices[0].custom_fields,
    advance_invoice: { ...ADVANCE_BLOCK, value: 25, amount: 200000 },
  }

  runtime.approveProposal(proposal.opId)
  await runtime.confirmSave(proposal.opId)

  const adv = advanceOf(store)
  assert.equal(adv.value, 25, 'stale value must survive untouched')
  const failureMessages = runtime.getState().messages.filter((m) => /Failed to save document/i.test(m.content))
  assert.equal(failureMessages.length, 1)
  assert.match(failureMessages[0].content, /modified by another process/)
  assert.equal(runtime.getState().status, 'awaiting_save')
})

/* ---------- e) Negative and ambiguous paths ---------- */

await test('e1. ambiguous/invalid invoice UUID is rejected before any proposal is built', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: 'not-a-uuid', intent: 'update', newValues: { value: 10 } },
  })
  await runtime.submit('Set the advance to 10 percent')

  assert.equal(runtime.getState().activeProposal, null)
  assert.equal(harness.updateCount(), 0)
  const last = runtime.getState().messages.at(-1)
  assert.match(last.content, /could not (prepare|locate)|invalid/i)
})

await test('e2. invalid mode is rejected before any proposal is built', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: INVOICE_ID, intent: 'update', newValues: { mode: 'sliding' } },
  })
  await runtime.submit('Use a sliding mode for the advance')

  assert.equal(runtime.getState().activeProposal, null)
  assert.equal(harness.updateCount(), 0)
  const last = runtime.getState().messages.at(-1)
  assert.match(last.content, /mode must be one of/i)
})

await test('e3. user cancellation at Gate 1 persists nothing', async () => {
  const store = seedStore()
  const harness = createHarness(store)
  const runtime = makeRuntime(harness)
  const beforeCf = asJson(store.invoices[0].custom_fields)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: INVOICE_ID, intent: 'remove' },
  })
  await runtime.submit('Remove the advance invoice')
  const proposal = runtime.getState().activeProposal

  runtime.rejectProposal(proposal.opId)
  assert.equal(runtime.getState().activeProposal, null)
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  assert.equal(harness.updateCount(), 0)
})

await test('e4. persistence failure rolls the configuration back to the persisted state', async () => {
  const store = seedStore({ withAdvance: true })
  const harness = createHarness(store, { failCustomFieldsUpdateOnce: true })
  const runtime = makeRuntime(harness)
  const beforeCf = asJson(store.invoices[0].custom_fields)

  nextProviderText = envelope({
    operationType: 'advance-invoice-config',
    documentFamily: 'invoice',
    payload: { targetDocumentId: INVOICE_ID, intent: 'update', newValues: { value: 65 } },
  })
  await runtime.submit('Set the advance to 65 percent')
  const proposal = runtime.getState().activeProposal

  runtime.approveProposal(proposal.opId)
  await runtime.confirmSave(proposal.opId)
  assert.deepEqual(store.invoices[0].custom_fields, beforeCf)
  const messages = runtime.getState().messages
  const failureMessages = messages.filter((m) => /Failed to save document/i.test(m.content))
  assert.equal(failureMessages.length, 1)
})

/* ---------- warnings: execution result -> execution message ---------- */

await test('w1. success result with warnings produces execution message carrying them verbatim', () => {
  const result = {
    success: true,
    documentId: 'id-1',
    documentNumber: 'INV-000042',
    warnings: ['Item 2: supplied catalog identity "dddd4444-dddd-4444-8444-dddd44444444" is not an active item_catalog record in this business entity; it was discarded.'],
  }
  const msg = gateTwoExecutionMessage({ result, advanceInvoice: null })
  assert.equal(msg.status, 'completed')
  assert.deepEqual(msg.warnings, result.warnings)
  assert.match(msg.content, /INV-000042/)
})

await test('w2. advance configure/update/remove produce factual execution messages', () => {
  const docNum = 'INV-000042'
  const mk = (intent) => gateTwoExecutionMessage({ result: { success: true, documentNumber: docNum, documentId: 'id' }, advanceInvoice: { intent } })
  assert.match(mk('configure').content, /configured on INV-000042/)
  assert.match(mk('update').content, /updated on INV-000042/)
  assert.match(mk('remove').content, /removed from INV-000042/)
  for (const intent of ['configure', 'update', 'remove']) {
    assert.equal(mk(intent).status, 'completed')
  }
})

await test('w3. failed save with warnings carries them; whitespace-only entries are dropped', () => {
  const result = {
    success: false,
    error: 'Transactional update failed: boom',
    warnings: ['  ', 'real warning A', 'real warning B', ''],
  }
  const msg = gateTwoExecutionMessage({ result })
  assert.equal(msg.status, 'failed')
  assert.deepEqual(msg.warnings, ['real warning A', 'real warning B'])
  assert.match(msg.content, /^Save failed: /)
})

await test('w4. multiple warnings survive without merging or loss, in order', () => {
  const warnings = ['warn one', 'warn two', 'warn three']
  const result = { success: true, documentId: 'x', documentNumber: 'INV-1', warnings }
  assert.deepEqual(executionWarnings(result), warnings)
  assert.deepEqual(executionWarnings({ warnings }), warnings)
  assert.deepEqual(executionWarnings({}), [])
  assert.deepEqual(executionWarnings(null), [])
  assert.deepEqual(executionWarnings({ warnings: 'nope' }), [])
})

await test('w5. message metadata round-trip preserves warnings verbatim (mapRowToMessage)', () => {
  const warnings = ['Item 3: catalog identity is not an active item_catalog record in this business entity; it was discarded.']
  const row = {
    id: 'm1', conversation_id: 'c1', tenant_id: 't1', sender_id: null,
    role: 'assistant', content: 'saved', status: 'completed',
    proposal_payload: null, records_payload: null,
    metadata: { warnings },
    created_at: '2026-11-18T00:00:00Z', updated_at: '2026-11-18T00:00:00Z',
  }
  const msg = mapRowToMessage(row)
  assert.deepEqual(msg.metadata?.warnings, warnings)
})

/* ---------- warnings: UI render contract ---------- */

await test('w6. readMessageWarnings only accepts non-empty string arrays', () => {
  assert.deepEqual(readMessageWarnings({ warnings: ['a', 'b'] }), ['a', 'b'])
  assert.deepEqual(readMessageWarnings({ warnings: ['a', 1, null, '  ', 'b'] }), ['a', 'b'])
  assert.deepEqual(readMessageWarnings({ warnings: 'not-an-array' }), [])
  assert.deepEqual(readMessageWarnings({}), [])
  assert.deepEqual(readMessageWarnings(null), [])
  assert.deepEqual(readMessageWarnings({ warnings: [] }), [])
})

await test('w7. MessageWarnings renders every warning verbatim; empty input renders nothing', () => {
  const markup = renderToStaticMarkup(
    createElement(MessageWarnings, { warnings: ['dup item discarded', 'inactive catalog id discarded'] }),
  )
  assert.match(markup, /role="status"/)
  assert.match(markup, /dup item discarded/)
  assert.match(markup, /inactive catalog id discarded/)
  assert.match(markup, /aria-label="Dismiss warnings"/)
  const empty = renderToStaticMarkup(createElement(MessageWarnings, { warnings: [] }))
  assert.equal(empty, '')
})

/* ---------- Stage 2 wiring: structural assertions ---------- */

await test('s1. useBoluThread routes advance-invoice-config through persistAdvanceInvoiceConfig and attaches warnings', () => {
  const hook = readSource('src/lib/ai-assistant/hooks/useBoluThread.ts')
  assert.match(hook, /persistAdvanceInvoiceConfig/)
  assert.match(hook, /advance-invoice-config/)
  assert.match(hook, /persistExecutionMessage/)
  assert.match(hook, /metadata: \{ warnings:/)
  assert.match(hook, /gateTwoExecutionMessage/)
})

await test('s2. server-side Gate 2 endpoint is bypassed client-side for advance-invoice-config', () => {
  const hook = readSource('src/lib/ai-assistant/hooks/useBoluThread.ts')
  assert.match(hook, /apiUrl && !advanceProposal/)
})

await test('s3. advance envelope is advertised and wired in runtime, server prompt and executor', () => {
  // The proposal contract moved to the single-owner prompt module; the route
  // must import it rather than duplicating instruction text.
  const apiPrompt = readSource('src/lib/ai-assistant/bolu-prompt.ts')
  const apiRoute = readSource('api/bolu-chat.ts')
  assert.match(apiRoute, /buildBoluSystemPrompt/)
  const runtime = readSource('src/lib/ai-assistant/bolu-runtime.ts')
  const generation = readSource('src/lib/ai-assistant/bolu-generation.ts')
  assert.match(apiPrompt, /advance-invoice-config/)
  assert.match(runtime, /advance-invoice-config/)
  assert.match(runtime, /persistAdvanceInvoiceConfig/)
  assert.match(runtime, /buildBoluAdvanceConfigProposal/)
  assert.match(generation, /advance-invoice-config/)
  assert.match(generation, /readBoluInvoiceAdvanceConfig/)
})

await test('s4. proposal card, artifact panel and sheet render the advance preview explicitly', () => {
  const parts = readSource('src/components/ai-assistant/chat/assistant-chat-parts.tsx')
  const panel = readSource('src/components/ai-assistant/chat/assistant-chat-panel.tsx')
  const thread = readSource('src/components/ai-assistant/chat/assistant-chat-thread.tsx')
  assert.match(parts, /AdvanceConfigPreview/)
  assert.match(parts, /advance-invoice-config/)
  assert.match(parts, /kindLabel/)
  assert.match(panel, /AdvanceConfigPreview/)
  assert.match(panel, /advance-invoice-config/)
  assert.match(thread, /MessageWarnings/)
  assert.match(thread, /readMessageWarnings/)
})

function stripAdvance(cf) {
  const copy = asJson(cf) ?? {}
  delete copy.advance_invoice
  return copy
}

