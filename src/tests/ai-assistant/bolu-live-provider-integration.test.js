import test from 'node:test'
import assert from 'node:assert/strict'

import { createBoluRuntime } from '../../lib/ai-assistant/bolu-runtime.ts'
import {
  buildInvoiceCreateProposal,
  validateInvoiceCreateInput,
  validateInvoiceModifyInput,
  computeAuthoritativeTotals,
  parseStructuredOperationEnvelope,
} from '../../lib/ai-assistant/bolu-operations.ts'
import {
  persistInvoiceCreation,
  persistInvoiceModification,
} from '../../lib/ai-assistant/bolu-document-service.ts'
import { buildBoluPageContext } from '../../lib/ai-assistant/bolu-context.ts'

// Mock tenant client
function createMockTenantClient() {
  const invoices = new Map()
  const items = new Map()

  return {
    isReady: true,
    schemaName: 'tenant_test',
    from(table) {
      return {
        select(fields) {
          return {
            limit() {
              return {
                single: async () => ({ data: null, error: null }),
                maybeSingle: async () => ({ data: null, error: null }),
                async then(r) { r({ data: [], error: null }) },
              }
            },
            eq(col, val) {
              return {
                async single() {
                  if (table === 'invoices' && invoices.has(val)) {
                    return { data: invoices.get(val), error: null }
                  }
                  return { data: null, error: { message: 'Not found' } }
                },
              }
            },
            order() {
              return {
                limit() {
                  return Promise.resolve({ data: [], error: null })
                },
              }
            },
          }
        },
        insert(data) {
          return {
            select() {
              return {
                async single() {
                  const id = data.id || 'inv-' + Math.random().toString(36).slice(2, 9)
                  const record = { ...data, id }
                  if (table === 'invoices') invoices.set(id, record)
                  return { data: record, error: null }
                },
              }
            },
            async then(resolve) {
              const rows = Array.isArray(data) ? data : [data]
              rows.forEach((r) => items.set(r.id || Math.random().toString(36), r))
              return resolve({ data: rows, error: null })
            },
          }
        },
      }
    },
    async rpc(func, args) {
      if (func === 'save_invoice_with_items_transaction') {
        const invId = 'inv-tx-' + Date.now()
        const invNum = args?.p_invoice_payload?.invoice_number || 'INV-000101'
        return {
          data: {
            id: invId,
            invoice_number: invNum,
          },
          error: null,
        }
      }
      return { data: null, error: null }
    },
  }
}

test('Successful Live Provider Inference converts structured output to proposal and executes two-gate lifecycle', async () => {
  const tenantClient = createMockTenantClient()
  const liveModelResponse = `I have drafted an invoice for Flour Mills of Nigeria Plc.

\`\`\`json
{
  "bolu_operation": {
    "operationType": "create-document",
    "documentFamily": "invoice",
    "payload": {
      "client_name": "Flour Mills of Nigeria Plc",
      "items": [
        {
          "description": "Golden Penny Flour 50kg",
          "quantity": 50,
          "unit_price": 42000
        }
      ],
      "issue_date": "2026-11-14",
      "due_date": "2026-12-14",
      "notes": "Direct factory delivery"
    }
  }
}
\`\`\`

Please review the proposed invoice line items and approve to continue.`

  const runtime = createBoluRuntime({
    tenantClient,
    entityId: 'ent-123',
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: async () => ({ text: liveModelResponse }),
  })

  runtime.open(buildBoluPageContext('/dashboard/invoices/new', 'contextual'))
  await runtime.submit('Create an invoice for Flour Mills of Nigeria, 50 bags of Golden Penny Flour at 42,000')

  const state = runtime.getState()
  assert.equal(state.status, 'awaiting_approval')
  assert.ok(state.activeProposal)
  assert.equal(state.activeProposal.operationType, 'create-document')
  assert.equal(state.activeProposal.payload.client_name, 'Flour Mills of Nigeria Plc')
  assert.equal(state.activeProposal.computedTotals.subtotal, 50 * 42000)

  // Gate 1: User explicitly approves proposal
  runtime.approveProposal()
  const gate1State = runtime.getState()
  assert.equal(gate1State.status, 'awaiting_save')
  assert.equal(gate1State.activeProposal.status, 'approved_pending_save')

  // Gate 2: User explicitly confirms save
  await runtime.confirmSave()
  const gate2State = runtime.getState()
  if (gate2State.error) {
    console.log('GATE 2 ERROR:', gate2State.error)
  }
  assert.equal(gate2State.status, 'idle')
  assert.equal(gate2State.activeProposal, null)
})

test('Invalid structured output from provider is rejected and produces no proposal', async () => {
  const tenantClient = createMockTenantClient()
  const malformedModelResponse = `\`\`\`json
{
  "bolu_operation": {
    "operationType": "create-document",
    "documentFamily": "invoice",
    "payload": {
      "client_name": "A",
      "items": [
        {
          "description": "",
          "quantity": -10,
          "unit_price": -500
        }
      ]
    }
  }
}
\`\`\``

  const runtime = createBoluRuntime({
    tenantClient,
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: async () => ({ text: malformedModelResponse }),
  })

  runtime.open(buildBoluPageContext('/dashboard/invoices/new', 'contextual'))
  await runtime.submit('Create invoice with negative numbers')

  const state = runtime.getState()
  assert.equal(state.status, 'idle')
  assert.equal(state.activeProposal, null)
  const lastMsg = state.messages[state.messages.length - 1].content
  assert.match(lastMsg, /invalid or missing/)
  assert.match(lastMsg, /Customer name is required/)
})

test('Malformed JSON syntax in provider output is handled safely', async () => {
  const tenantClient = createMockTenantClient()
  const brokenJsonResponse = `\`\`\`json
{
  "bolu_operation": {
    "operationType": "create-document",
    "documentFamily": "invoice",
    "payload": {
      "client_name": "Broken Co"
      "items": [ // missing comma
    }
}
\`\`\``

  const runtime = createBoluRuntime({
    tenantClient,
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: async () => ({ text: brokenJsonResponse }),
  })

  runtime.open(buildBoluPageContext('/dashboard/invoices/new', 'contextual'))
  await runtime.submit('Trigger malformed json')

  const state = runtime.getState()
  assert.equal(state.status, 'idle')
  assert.equal(state.activeProposal, null)
  const lastMsg = state.messages[state.messages.length - 1].content
  assert.match(lastMsg, /payload was malformed/)
})

test('Provider authentication failure (401/403) reports error without exposing keys or mutating state', async () => {
  const tenantClient = createMockTenantClient()
  const runtime = createBoluRuntime({
    tenantClient,
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: async () => {
      throw new Error('Bolu provider authentication failed. Check your server API key configuration.')
    },
  })

  runtime.open(buildBoluPageContext('/dashboard/invoices/new', 'contextual'))
  await runtime.submit('Hello Bolu')

  const state = runtime.getState()
  assert.equal(state.status, 'idle')
  assert.equal(state.activeProposal, null)
  assert.equal(state.error, 'Bolu provider authentication failed. Check your server API key configuration.')
})

test('Provider timeout aborts cleanly and leaves document state unchanged', async () => {
  const tenantClient = createMockTenantClient()
  const runtime = createBoluRuntime({
    tenantClient,
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: async () => {
      const err = new Error('The AI provider request timed out. Please try again.')
      err.name = 'TimeoutError'
      throw err
    },
  })

  runtime.open(buildBoluPageContext('/dashboard/invoices/new', 'contextual'))
  await runtime.submit('Long request')

  const state = runtime.getState()
  assert.equal(state.status, 'idle')
  assert.equal(state.activeProposal, null)
  assert.equal(state.error, 'The AI provider request timed out. Please try again.')
})

test('Provider rate limiting (429) dispatches clear error and creates no proposal', async () => {
  const tenantClient = createMockTenantClient()
  const runtime = createBoluRuntime({
    tenantClient,
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: async () => {
      throw new Error('Bolu is currently rate-limited by the AI provider. Please wait a moment and try again.')
    },
  })

  runtime.open(buildBoluPageContext('/dashboard/invoices/new', 'contextual'))
  await runtime.submit('Make invoice')

  const state = runtime.getState()
  assert.equal(state.status, 'idle')
  assert.equal(state.activeProposal, null)
  assert.equal(state.error, 'Bolu is currently rate-limited by the AI provider. Please wait a moment and try again.')
})

test('Provider failure (500/502) cannot trigger approval or persistence', async () => {
  const tenantClient = createMockTenantClient()
  let persistenceCalled = false

  const runtime = createBoluRuntime({
    tenantClient,
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: async () => {
      throw new Error('The AI provider is temporarily unavailable. Please try again.')
    },
  })

  runtime.open(buildBoluPageContext('/dashboard/invoices/new', 'contextual'))
  await runtime.submit('Create invoice')

  const state = runtime.getState()
  assert.equal(state.status, 'idle')
  assert.equal(state.activeProposal, null)

  // Attempting to approve proposal when none exists does nothing
  runtime.approveProposal()
  assert.equal(runtime.getState().activeProposal, null)
  assert.equal(runtime.getState().status, 'idle')

  // Calling persistence directly with empty proposal fails closed
  await assert.rejects(
    async () => {
      await persistInvoiceCreation(
        tenantClient,
        null,
        () => true,
        () => true,
      )
    },
    /Valid proposal is required for persistence/,
  )
})

test('Quotation document family is supported and produces a proposal', async () => {
  const tenantClient = createMockTenantClient()
  const quotationResponse = `\`\`\`json
{
  "bolu_operation": {
    "operationType": "create-document",
    "documentFamily": "quotation",
    "payload": {
      "client_name": "Acme Corp",
      "items": [{ "description": "Consulting", "quantity": 1, "unit_price": 50000 }]
    }
  }
}
\`\`\``

  const runtime = createBoluRuntime({
    tenantClient,
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: async () => ({ text: quotationResponse }),
  })

  runtime.open(buildBoluPageContext('/dashboard/quotations', 'contextual'))
  await runtime.submit('Make a quotation for Acme Corp')

  const state = runtime.getState()
  // The reducer's designed state for an open proposal is `awaiting_approval`
  // (bolu-reducer.ts), which is what the UI renders the gate cards from.
  assert.equal(state.status, 'awaiting_approval')
  assert.equal(state.activeProposal?.documentFamily, 'quotation')
  assert.equal(state.activeProposal?.operationType, 'create-document')
})

test('Unsupported operation types (e.g. delete-document, pay-invoice) are rejected', async () => {
  const tenantClient = createMockTenantClient()
  const deleteOpResponse = `\`\`\`json
{
  "bolu_operation": {
    "operationType": "delete-document",
    "documentFamily": "invoice",
    "payload": { "documentId": "123e4567-e89b-12d3-a456-426614174000" }
  }
}
\`\`\``

  const runtime = createBoluRuntime({
    tenantClient,
    canRead: () => true,
    canWrite: () => true,
    providerAvailable: true,
    providerSend: async () => ({ text: deleteOpResponse }),
  })

  runtime.open(buildBoluPageContext('/dashboard/invoices', 'contextual'))
  await runtime.submit('Delete invoice 100')

  const state = runtime.getState()
  assert.equal(state.status, 'idle')
  assert.equal(state.activeProposal, null)
  const lastMsg = state.messages[state.messages.length - 1].content
  assert.match(lastMsg, /Unsupported operation type "delete-document"/)
})

test('Model-generated financial totals CANNOT override application calculations', () => {
  // Model attempts to hallucinate its own calculations in payload
  const modelOutputWithInventedMath = {
    client_name: 'Total Manipulation Ltd',
    items: [
      { description: 'Widget A', quantity: 10, unit_price: 5000 },
      { description: 'Widget B', quantity: 2, unit_price: 25000 },
    ],
    // Hallucinated values that model might claim:
    subtotal: 1000000,
    vat: 0,
    total: 1000000,
  }

  const proposal = buildInvoiceCreateProposal(modelOutputWithInventedMath)

  // 10 * 5000 + 2 * 25000 = 50000 + 50000 = 100000
  // 7.5% VAT = 7500
  // Total payable = 107500
  assert.equal(proposal.computedTotals.subtotal, 100000)
  assert.equal(proposal.computedTotals.vat, 7500)
  assert.equal(proposal.computedTotals.total, 107500)

  // Assert model values did NOT leak into authoritative totals
  assert.notEqual(proposal.computedTotals.subtotal, 1000000)
  assert.notEqual(proposal.computedTotals.total, 1000000)
})
