import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildInvoiceCreateProposal,
  buildInvoiceModifyProposal,
  computeAuthoritativeTotals,
  generateOperationId,
  isProposalStale,
  parseStructuredOperationEnvelope,
  validateInvoiceCreateInput,
  validateInvoiceModifyInput,
} from '../../lib/ai-assistant/bolu-operations.ts'
import {
  createDeterministicMockProvider,
  DETERMINISTIC_FIXTURES,
} from '../../lib/ai-assistant/bolu-mock-provider.ts'
import {
  persistInvoiceCreation,
  persistInvoiceModification,
} from '../../lib/ai-assistant/bolu-document-service.ts'
import {
  createBoluConversationState,
  boluConversationReducer,
  createBoluRuntime,
} from '../../lib/ai-assistant/bolu-runtime.ts'
import { buildBoluPageContext } from '../../lib/ai-assistant/bolu-context.ts'

// Mock TenantClient for tests
function createMockTenantClient(overrides = {}) {
  const store = {
    invoices: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        invoice_number: 'INV-000100',
        client_name: 'Existing Customer Ltd',
        issue_date: '2026-11-01',
        due_date: '2026-12-01',
        notes: 'Initial notes',
        terms: 'Net 30',
        subtotal: 100000,
        vat: 7500,
        total: 107500,
        archived_at: null,
      },
    ],
    invoice_items: [],
  }

  return {
    schemaName: 'tenant_test',
    version: 'phase-1',
    isReady: true,
    store,
    from(table) {
      if (table === 'invoices') {
        return {
          select(fields = '*') {
            return {
              eq(col, val) {
                return {
                  is(col2, val2) {
                    return {
                      single: async () => {
                        const item = store.invoices.find((i) => i[col] === val && i[col2] === val2)
                        return { data: item || null, error: item ? null : { message: 'Not found' } }
                      },
                      maybeSingle: async () => {
                        const item = store.invoices.find((i) => i[col] === val && i[col2] === val2)
                        return { data: item || null, error: null }
                      },
                    }
                  },
                }
              },
              is(_col, _val) {
                return {
                  maybeSingle: async () => ({ data: store.invoices[0] || null, error: null }),
                }
              },
              then(resolve) {
                resolve({ data: store.invoices.map((i) => ({ invoice_number: i.invoice_number })), error: null })
              },
            }
          },
          insert(rows) {
            return {
              select() {
                return {
                  single: async () => {
                    const row = { id: `inv-${Date.now()}`, ...rows[0] }
                    store.invoices.push(row)
                    return { data: row, error: null }
                  },
                }
              },
            }
          },
          delete() {
            return {
              eq(col, val) {
                const idx = store.invoices.findIndex((i) => i[col] === val)
                if (idx !== -1) store.invoices.splice(idx, 1)
                return Promise.resolve({ error: null })
              },
            }
          },
          update(updates) {
            return {
              eq(col, val) {
                const idx = store.invoices.findIndex((i) => i[col] === val)
                if (idx !== -1) {
                  store.invoices[idx] = { ...store.invoices[idx], ...updates }
                  return Promise.resolve({ data: store.invoices[idx], error: null })
                }
                return Promise.resolve({ data: null, error: { message: 'Not found' } })
              },
            }
          },
        }
      }
      if (table === 'invoice_items') {
        return {
          delete() {
            return {
              eq: async () => ({ error: null }),
            }
          },
          insert: async (rows) => {
            store.invoice_items.push(...rows)
            return { data: rows, error: null }
          },
        }
      }
      if (table === 'settings') {
        return {
          select() {
            return {
              limit() {
                return {
                  single: async () => ({
                    data: { id: 'settings-1', document_prefixes: {} },
                    error: null,
                  }),
                }
              },
            }
          },
          update() {
            return {
              eq: async () => ({ error: null }),
            }
          },
        }
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }
    },
    rpc: async (fn, params) => {
      if (fn === 'save_invoice_with_items_transaction') {
        const payload = params.p_invoice_payload
        const items = params.p_items || []
        const row = { id: payload.id || `inv-${Date.now()}`, ...payload }
        if (params.p_mode === 'create') {
          store.invoices.push(row)
          store.invoice_items.push(...items.map((it) => ({ ...it, invoice_id: row.id })))
        } else {
          const idx = store.invoices.findIndex((i) => i.id === row.id)
          if (idx !== -1) store.invoices[idx] = { ...store.invoices[idx], ...row }
        }
        return { data: { id: row.id, invoice_number: row.invoice_number }, error: null }
      }
      return { data: null, error: null }
    },
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OPERATION CONTRACT & INPUT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test('validateInvoiceCreateInput rejects invalid customer names', () => {
  assert.equal(validateInvoiceCreateInput(null).valid, false)
  assert.equal(validateInvoiceCreateInput({ client_name: '', items: [] }).valid, false)
  assert.equal(validateInvoiceCreateInput({ client_name: 'A', items: [{ description: 'Test', quantity: 1, unit_price: 100 }] }).valid, false)
})

test('validateInvoiceCreateInput rejects invalid items (negative quantity, negative price, empty description)', () => {
  const result = validateInvoiceCreateInput({
    client_name: 'Dangote Ltd',
    items: [
      { description: '', quantity: 10, unit_price: 100 },
      { description: 'Cement', quantity: -5, unit_price: 100 },
      { description: 'Transport', quantity: 1, unit_price: -50 },
    ],
  })
  assert.equal(result.valid, false)
  assert.equal(result.errors.length >= 3, true)
})

test('validateInvoiceCreateInput accepts valid input with default dates', () => {
  const result = validateInvoiceCreateInput({
    client_name: 'Dangote Industries Ltd',
    items: [{ description: 'Cement 50kg', quantity: 50, unit_price: 8500 }],
  })
  assert.equal(result.valid, true)
  assert.equal(result.data?.client_name, 'Dangote Industries Ltd')
  assert.equal(result.data?.items.length, 1)
  assert.match(result.data?.issue_date ?? '', /^\d{4}-\d{2}-\d{2}$/)
  assert.match(result.data?.due_date ?? '', /^\d{4}-\d{2}-\d{2}$/)
})

test('validateInvoiceModifyInput rejects computed fields or invalid document UUIDs', () => {
  // Invalid UUID
  assert.equal(validateInvoiceModifyInput({ documentId: 'invalid-id', field: 'notes' }).valid, false)

  // Disallowed computed fields
  const forbidden = validateInvoiceModifyInput({
    documentId: '123e4567-e89b-12d3-a456-426614174000',
    field: 'total',
    newValue: 999999,
  })
  assert.equal(forbidden.valid, false)
  assert.match(forbidden.errors[0], /computed fields/i)
})

test('validateInvoiceModifyInput accepts valid non-computed field changes', () => {
  const result = validateInvoiceModifyInput({
    documentId: '123e4567-e89b-12d3-a456-426614174000',
    field: 'notes',
    oldValue: 'Old notes',
    newValue: 'Updated notes',
  })
  assert.equal(result.valid, true)
  assert.equal(result.data?.field, 'notes')
  assert.equal(result.data?.newValue, 'Updated notes')
})

test('computeAuthoritativeTotals calculates subtotal and VAT strictly application-side', () => {
  // 100 items at ₦1,000 each = ₦100,000 subtotal. VAT @ 7.5% = ₦7,500. Total = ₦107,500.
  const calc = computeAuthoritativeTotals([{ description: 'Item 1', quantity: 100, unit_price: 1000 }])
  assert.equal(calc.subtotal, 100000)
  assert.equal(calc.vat, 7500)
  assert.equal(calc.totalPayable, 107500)
})

test('isProposalStale detects expired proposals after 15 minutes', () => {
  const proposal = buildInvoiceCreateProposal({
    client_name: 'Test Customer',
    items: [{ description: 'Test', quantity: 1, unit_price: 100 }],
  })
  assert.equal(isProposalStale(proposal), false)

  // Expired proposal
  const expiredProposal = {
    ...proposal,
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  }
  assert.equal(isProposalStale(expiredProposal), true)
})

test('parseStructuredOperationEnvelope correctly extracts json operation block', () => {
  const responseWithCodeBlock = `
Here is the proposal:
\`\`\`json
{
  "bolu_operation": {
    "operationType": "create-document",
    "documentFamily": "invoice",
    "payload": {
      "client_name": "Dangote Cement",
      "items": [{ "description": "Cement", "quantity": 10, "unit_price": 5000 }]
    }
  }
}
\`\`\`
`
  const result = parseStructuredOperationEnvelope(responseWithCodeBlock)
  assert.equal(result.hasOperation, true)
  assert.equal(result.rawOperation?.operationType, 'create-document')

  // Plain prose without JSON
  assert.equal(parseStructuredOperationEnvelope('Just normal text').hasOperation, false)
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. TWO DISTINCT APPROVAL GATES
// ─────────────────────────────────────────────────────────────────────────────

test('Gate 1 approval transitions state from pending_approval to approved_pending_save', () => {
  const proposal = buildInvoiceCreateProposal({
    client_name: 'Dangote Ltd',
    items: [{ description: 'Item', quantity: 1, unit_price: 1000 }],
  })
  const initial = createBoluConversationState(buildBoluPageContext('/', 'dashboard'))
  const stateWithProposal = boluConversationReducer(initial, { type: 'SET_PROPOSAL', proposal })

  assert.equal(stateWithProposal.status, 'awaiting_approval')
  assert.equal(stateWithProposal.activeProposal?.status, 'pending_approval')

  // User Approves Gate 1
  const approvedState = boluConversationReducer(stateWithProposal, { type: 'GATE1_APPROVE' })
  assert.equal(approvedState.status, 'awaiting_save')
  assert.equal(approvedState.activeProposal?.status, 'approved_pending_save')
})

test('Gate 1 rejection leaves document state unchanged and clears proposal', () => {
  const proposal = buildInvoiceCreateProposal({
    client_name: 'Dangote Ltd',
    items: [{ description: 'Item', quantity: 1, unit_price: 1000 }],
  })
  const initial = createBoluConversationState(buildBoluPageContext('/', 'dashboard'))
  const stateWithProposal = boluConversationReducer(initial, { type: 'SET_PROPOSAL', proposal })

  // User Rejects Gate 1
  const rejectedState = boluConversationReducer(stateWithProposal, { type: 'GATE1_REJECT' })
  assert.equal(rejectedState.status, 'idle')
  assert.equal(rejectedState.activeProposal, null)
  assert.match(rejectedState.messages.at(-1)?.content ?? '', /rejected/i)
})

test('Gate 2 confirmation triggers persistence and updates to persisted', () => {
  const proposal = buildInvoiceCreateProposal({
    client_name: 'Dangote Ltd',
    items: [{ description: 'Item', quantity: 1, unit_price: 1000 }],
  })
  const initial = createBoluConversationState(buildBoluPageContext('/', 'dashboard'))
  let state = boluConversationReducer(initial, { type: 'SET_PROPOSAL', proposal })
  state = boluConversationReducer(state, { type: 'GATE1_APPROVE' })

  // Start Gate 2 Save
  state = boluConversationReducer(state, { type: 'GATE2_START_SAVE' })
  assert.equal(state.status, 'saving')

  // Save Success
  state = boluConversationReducer(state, {
    type: 'GATE2_SAVE_SUCCESS',
    result: { success: true, documentNumber: 'INV-000101', documentId: 'inv-123' },
  })
  assert.equal(state.status, 'idle')
  assert.equal(state.activeProposal, null)
  assert.match(state.messages.at(-1)?.content ?? '', /INV-000101/)
})

test('Gate 2 cancellation clears proposal and leaves database uncommitted', () => {
  const proposal = buildInvoiceCreateProposal({
    client_name: 'Dangote Ltd',
    items: [{ description: 'Item', quantity: 1, unit_price: 1000 }],
  })
  const initial = createBoluConversationState(buildBoluPageContext('/', 'dashboard'))
  let state = boluConversationReducer(initial, { type: 'SET_PROPOSAL', proposal })
  state = boluConversationReducer(state, { type: 'GATE1_APPROVE' })

  // User cancels Gate 2
  state = boluConversationReducer(state, { type: 'GATE2_CANCEL_SAVE' })
  assert.equal(state.status, 'idle')
  assert.equal(state.activeProposal, null)
  assert.match(state.messages.at(-1)?.content ?? '', /cancelled/i)
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. END-TO-END INVOICE CREATION WORKFLOW WITH PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

test('End-to-End Invoice Creation reaches application persistence service', async () => {
  const tenantClient = createMockTenantClient()
  const canRead = () => true
  const canWrite = () => true

  const proposal = buildInvoiceCreateProposal({
    client_name: 'Dangote Cement Plc',
    items: [
      { description: 'Grade 42.5 Cement (50kg)', quantity: 200, unit_price: 8500 },
      { description: 'Logistics', quantity: 1, unit_price: 30000 },
    ],
    notes: 'Site delivery to Lekki Phase 1',
  })

  // Proposal must be approved (Gate 1)
  proposal.status = 'approved_pending_save'

  const result = await persistInvoiceCreation(tenantClient, proposal, canWrite, canRead)

  assert.equal(result.success, true)
  assert.ok(result.documentId)
  assert.ok(result.documentNumber)

  // Verify invoice in mock tenant store
  const saved = tenantClient.store.invoices.find((i) => i.id === result.documentId)
  assert.ok(saved)
  assert.equal(saved.client_name, 'Dangote Cement Plc')
  assert.equal(saved.subtotal, 1730000) // (200 * 8500) + 30000
  assert.equal(saved.vat, 129750)       // 7.5% of 1,730,000
  assert.equal(saved.total, 1859750)     // 1,730,000 + 129,750
  assert.match(saved.amount_in_words, /million/i)
})

test('Invoice Creation with entityId uses atomic save_invoice_with_items_transaction RPC', async () => {
  const tenantClient = createMockTenantClient()
  const canRead = () => true
  const canWrite = () => true
  const entityId = '11111111-2222-3333-4444-555555555555'

  const proposal = buildInvoiceCreateProposal({
    client_name: 'Atomic Tenant Client',
    items: [{ description: 'Solar Inverter 5kVA', quantity: 2, unit_price: 650000 }],
  })
  proposal.status = 'approved_pending_save'

  const result = await persistInvoiceCreation(tenantClient, proposal, canWrite, canRead, entityId)
  assert.equal(result.success, true)
  assert.ok(result.documentId)
  assert.ok(result.documentNumber)

  // Verify item rows were persisted via RPC
  const savedItems = tenantClient.store.invoice_items.filter((it) => it.invoice_id === result.documentId)
  assert.equal(savedItems.length, 1)
  assert.equal(savedItems[0].description, 'Solar Inverter 5kVA')
})

test('Invoice Creation in fallback mode rolls back header if item insertion fails', async () => {
  const failingItemsClient = createMockTenantClient({
    from(table) {
      if (table === 'invoice_items') {
        return {
          insert: async () => ({ data: null, error: { message: 'Database connection lost during items save' } }),
        }
      }
      return createMockTenantClient().from(table)
    },
  })
  const canRead = () => true
  const canWrite = () => true

  const proposal = buildInvoiceCreateProposal({
    client_name: 'Rollback Customer',
    items: [{ description: 'Generator', quantity: 1, unit_price: 500000 }],
  })
  proposal.status = 'approved_pending_save'

  const result = await persistInvoiceCreation(failingItemsClient, proposal, canWrite, canRead, null)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /rolled back/i)

  // Verify header was deleted and not left orphaned in store
  assert.equal(failingItemsClient.store.invoices.some((i) => i.client_name === 'Rollback Customer'), false)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. END-TO-END INVOICE MODIFICATION WORKFLOW WITH PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

test('End-to-End Invoice Modification updates existing document and respects current state', async () => {
  const tenantClient = createMockTenantClient()
  const canRead = () => true
  const canWrite = () => true

  const proposal = buildInvoiceModifyProposal({
    targetDocumentId: '123e4567-e89b-12d3-a456-426614174000',
    targetDocumentNumber: 'INV-000100',
    field: 'notes',
    oldValue: 'Initial notes',
    newValue: 'Urgent site delivery requested.',
  })

  // Approve Gate 1
  proposal.status = 'approved_pending_save'

  const result = await persistInvoiceModification(tenantClient, proposal, canWrite, canRead)
  assert.equal(result.success, true)
  assert.equal(result.documentNumber, 'INV-000100')

  // Verify updated in store (notes are normalized through the application
  // rich-text subset, so the stored value is a safe paragraph block)
  const doc = tenantClient.store.invoices.find((i) => i.id === '123e4567-e89b-12d3-a456-426614174000')
  assert.equal(doc.notes, '<p>Urgent site delivery requested.</p>')
})

test('Invoice Modification rejects stale proposals where field changed in database', async () => {
  const tenantClient = createMockTenantClient()
  const canRead = () => true
  const canWrite = () => true

  const proposal = buildInvoiceModifyProposal({
    targetDocumentId: '123e4567-e89b-12d3-a456-426614174000',
    targetDocumentNumber: 'INV-000100',
    field: 'notes',
    oldValue: 'Mismatched old notes', // Current is 'Initial notes'
    newValue: 'New notes',
  })
  proposal.status = 'approved_pending_save'

  const result = await persistInvoiceModification(tenantClient, proposal, canWrite, canRead)
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /stale/i)
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. SECURITY & AUTHORIZATION SAFEGUARDS
// ─────────────────────────────────────────────────────────────────────────────

test('persistInvoiceCreation fails closed when write authorization is missing', async () => {
  const tenantClient = createMockTenantClient()
  const canRead = () => true
  const canWrite = () => false // Unauthorized!

  const proposal = buildInvoiceCreateProposal({
    client_name: 'Dangote Ltd',
    items: [{ description: 'Cement', quantity: 10, unit_price: 5000 }],
  })
  proposal.status = 'approved_pending_save'

  await assert.rejects(
    async () => {
      await persistInvoiceCreation(tenantClient, proposal, canWrite, canRead)
    },
    // The refusal names the canonical action the tenant RPC actually enforces.
    /permission to create/i,
  )
})

test('persistInvoiceCreation rejects duplicate submission of the same opId', async () => {
  const tenantClient = createMockTenantClient()
  const canRead = () => true
  const canWrite = () => true

  const proposal = buildInvoiceCreateProposal({
    client_name: 'Customer Once',
    items: [{ description: 'Item', quantity: 1, unit_price: 500 }],
  })
  proposal.status = 'approved_pending_save'

  const first = await persistInvoiceCreation(tenantClient, proposal, canWrite, canRead)
  assert.equal(first.success, true)

  // Re-submitting the same proposal opId
  const duplicate = await persistInvoiceCreation(tenantClient, proposal, canWrite, canRead)
  assert.equal(duplicate.success, false)
  assert.match(duplicate.error ?? '', /already been submitted/i)
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. DETERMINISTIC MOCK PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

test('Deterministic mock provider produces valid creation fixture without live API', async () => {
  const mockSend = createDeterministicMockProvider({ scenario: 'valid-creation-proposal' })
  const response = await mockSend({
    messages: [{ role: 'user', content: 'Create an invoice for Dangote' }],
  })

  assert.ok(response.text)
  const envelope = parseStructuredOperationEnvelope(response.text)
  assert.equal(envelope.hasOperation, true)
  assert.equal(envelope.rawOperation?.operationType, 'create-document')
  assert.equal(envelope.rawOperation?.payload?.client_name, 'Dangote Industries Ltd')
})

test('Deterministic mock provider produces valid modification fixture without live API', async () => {
  const mockSend = createDeterministicMockProvider({ scenario: 'valid-modification-proposal' })
  const response = await mockSend({
    messages: [{ role: 'user', content: 'Change notes on invoice' }],
  })

  assert.ok(response.text)
  const envelope = parseStructuredOperationEnvelope(response.text)
  assert.equal(envelope.hasOperation, true)
  assert.equal(envelope.rawOperation?.operationType, 'modify-document')
})

test('Bolu Runtime integrates end-to-end with deterministic mock provider and two gates', async () => {
  const tenantClient = createMockTenantClient()
  const canRead = () => true
  const canWrite = () => true
  const mockSend = createDeterministicMockProvider({ scenario: 'valid-creation-proposal' })

  const runtime = createBoluRuntime({
    tenantClient,
    canRead,
    canWrite,
    providerAvailable: true,
    providerSend: mockSend,
  })

  runtime.open(buildBoluPageContext('/', 'dashboard'))

  // Submit creation request
  await runtime.submit('Create an invoice for Dangote')

  const state1 = runtime.getState()
  assert.equal(state1?.status, 'awaiting_approval')
  assert.ok(state1?.activeProposal)
  assert.equal(state1?.activeProposal?.operationType, 'create-document')
  assert.equal(state1?.activeProposal?.status, 'pending_approval')

  // Gate 1: Approve
  runtime.approveProposal(state1.activeProposal.opId)

  const state2 = runtime.getState()
  assert.equal(state2?.status, 'awaiting_save')
  assert.equal(state2?.activeProposal?.status, 'approved_pending_save')

  // Gate 2: Confirm save
  await runtime.confirmSave(state2?.activeProposal?.opId)

  const state3 = runtime.getState()
  assert.equal(state3?.status, 'idle')
  assert.equal(state3?.activeProposal, null)
  assert.match(state3?.messages.at(-1)?.content ?? '', /Successfully saved/i)
})
