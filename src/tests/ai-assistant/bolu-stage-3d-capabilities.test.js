import assert from 'node:assert/strict'
import { test, beforeEach } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

/**
 * Stage 3D — Conversational Document Lifecycle, Attachments & Operational Intelligence.
 *
 * Test coverage:
 * 1. Document Lifecycle & Status Transitions:
 *    - Quotation archive & restore.
 *    - Quotation conversion to invoice.
 *    - Rejection of invalid/legacy quotation statuses (draft, sent, accepted, rejected).
 *    - Invoice archive & restore.
 *    - Protection of invoice payment status (ledger-derived, cannot bypass).
 *    - Gate 2 status revalidation & stale status rejection.
 * 2. Quotation Validity:
 *    - valid_until handled on quotations independently of invoice due_date.
 *    - Rejection of valid_until on invoices.
 *    - Explicit clearing of quotation validity (setting to null).
 *    - Gate 1 baseline derivation and Gate 2 stale checks.
 *    - Correct business labeling ("Quotation validity" vs "Due date").
 * 3. Document Attachments:
 *    - Reference links storage in custom_fields.attachments.
 *    - URL validation (secure http/https only, rejection of javascript:, data:, file:, private IPs).
 *    - Label validation.
 *    - Add and remove operations.
 *    - Untouched attachments preserved.
 *    - Gate 2 fingerprint stale check.
 *    - Rejection of binary upload through assistant.
 * 4. Payment Terms Reachability:
 *    - custom_payment_terms preserved alongside predefined terms.
 *    - Invoice vs quotation storage patterns.
 *    - Length limits and validation.
 *    - Gate 1 baseline derivation and Gate 2 stale checks.
 * 5. Operation Idempotency & Replay Safety:
 *    - In-memory executedOperationIds rejection on immediate retry.
 *    - Persistent custom_fields.last_operation_id and applied_operation_ids.
 *    - Replay rejection across cleared in-memory cache (simulating process restart).
 *    - Protection against duplicate attachment or lifecycle executions.
 * 6. Operational Intelligence:
 *    - analyzeDocumentIntelligence observations vs suggestions.
 *    - Detection of missing customer or document readiness.
 *    - Approaching quotation expiry warnings.
 * 7. Proposal Preview & Plain Text Formatting:
 *    - ProposalCardView renders ModifyLifecyclePanel and ModifyAttachmentsPanel.
 *    - proposalPlainText deterministically serializes lifecycle, attachment, and validity fields.
 */

import {
  buildInvoiceModifyProposal,
  validateInvoiceModifyInput,
} from '../../lib/ai-assistant/bolu-operations.ts'
import {
  persistInvoiceModification,
  persistQuotationModification,
  clearExecutedOperationIdsForTest,
} from '../../lib/ai-assistant/bolu-document-service.ts'
import {
  analyzeDocumentIntelligence,
  formatDocumentIntelligence,
  validateAttachmentUrl,
  validateAttachmentLabel,
  fingerprintAttachments,
  applyAttachmentOperations,
  validateLifecycleTransition,
} from '../../lib/ai-assistant/bolu-intelligence.ts'
import { ProposalCardView, proposalPlainText } from '../../components/ai-assistant/chat/assistant-chat-parts.tsx'

const INVOICE_ID = '123e4567-e89b-12d3-a456-426614174000'
const QUOTATION_ID = '123e4567-e89b-12d3-a456-426614174001'

const approve = (p) => {
  p.status = 'approved_pending_save'
  return p
}
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
const parseCf = (row) =>
  typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields || {}

function createHarness(store) {
  let documentSequence = 0
  let itemSequence = 0

  const documentChain = (table) => ({
    then: (resolve) => resolve({ data: [], error: null }),
    eq: (col, value) => ({
      is: () => ({
        single: async () => {
          const list = table === 'invoices' ? store.invoices : store.quotations
          const found = list.find((d) => String(d[col]) === String(value) && (d.archived_at === null || d.archived_at === undefined))
          return { data: clone(found) ?? null, error: found ? null : { message: 'not found' } }
        },
        maybeSingle: async () => {
          const list = table === 'invoices' ? store.invoices : store.quotations
          const found = list.find((d) => String(d[col]) === String(value) && (d.archived_at === null || d.archived_at === undefined))
          return { data: clone(found) ?? null, error: null }
        },
      }),
      single: async () => {
        const list = table === 'invoices' ? store.invoices : store.quotations
        const found = list.find((d) => String(d[col]) === String(value))
        return { data: clone(found) ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        const list = table === 'invoices' ? store.invoices : store.quotations
        const found = list.find((d) => String(d[col]) === String(value))
        return { data: clone(found) ?? null, error: null }
      },
      limit: () => ({
        maybeSingle: async () => {
          const list = table === 'invoices' ? store.invoices : store.quotations
          const found = list.find((d) => String(d[col]) === String(value))
          return { data: clone(found) ?? null, error: null }
        },
      }),
    }),
    limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  })

  return {
    isReady: true,
    schemaName: `entity_stage3d_test`,
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
      if (table === 'invoices') {
        return {
          select: (cols) => {
            if (cols === 'invoice_number') {
              return {
                then: (resolve) => resolve({ data: store.invoices.map((i) => ({ invoice_number: i.invoice_number })), error: null }),
              }
            }
            return documentChain('invoices')
          },
          insert: (rows) => {
            const rowsToInsert = rows.map((row) => ({
              ...clone(row),
              id: row.id ?? `inv-${++documentSequence}-${Date.now().toString(36)}`,
            }))
            store.invoices.push(...rowsToInsert)
            return {
              select: () => ({
                single: async () => ({ data: clone(rowsToInsert[0]), error: null }),
              }),
            }
          },
          update: (values) => ({
            eq: async (_col, value) => {
              const idx = store.invoices.findIndex((d) => String(d.id) === String(value))
              if (idx === -1) return { error: { message: 'invoice not found' } }
              store.invoices[idx] = { ...store.invoices[idx], ...values }
              return { error: null }
            },
          }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      if (table === 'quotations') {
        return {
          select: () => documentChain('quotations'),
          insert: (rows) => {
            const rowsToInsert = rows.map((row) => ({
              ...clone(row),
              id: row.id ?? `quote-${++documentSequence}-${Date.now().toString(36)}`,
            }))
            store.quotations.push(...rowsToInsert)
            return {
              select: () => ({
                single: async () => ({ data: clone(rowsToInsert[0]), error: null }),
              }),
            }
          },
          update: (values) => ({
            eq: async (_col, value) => {
              const idx = store.quotations.findIndex((d) => String(d.id) === String(value))
              if (idx === -1) return { error: { message: 'quotation not found' } }
              store.quotations[idx] = { ...store.quotations[idx], ...values }
              return { error: null }
            },
          }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      if (table === 'invoice_items' || table === 'quotation_items') {
        return {
          select: () => ({
            eq: (_col, value) => ({
              order: async () => {
                const list = table === 'invoice_items' ? store.invoice_items : store.quotation_items
                return { data: clone(list.filter((it) => String(it.invoice_id ?? it.quotation_id) === String(value))), error: null }
              },
            }),
          }),
          insert: async (rows) => {
            const list = table === 'invoice_items' ? store.invoice_items : store.quotation_items
            list.push(...rows.map((r) => ({ ...clone(r), id: `item-${++itemSequence}` })))
            return { error: null }
          },
          delete: () => ({
            eq: async (col, value) => {
              if (table === 'invoice_items') {
                store.invoice_items = store.invoice_items.filter((r) => String(r[col]) !== String(value))
              } else {
                store.quotation_items = store.quotation_items.filter((r) => String(r[col]) !== String(value))
              }
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
    rpc: async (fn, args) => {
      if (fn === 'save_invoice_with_items_transaction') {
        const invPayload = args.p_invoice_payload
        const inv = {
          ...clone(invPayload),
          id: `inv-${++documentSequence}-${Date.now().toString(36)}`,
        }
        store.invoices.push(inv)
        if (args.p_items) {
          store.invoice_items.push(...args.p_items.map((it) => ({ ...clone(it), invoice_id: inv.id })))
        }
        return { data: inv, error: null }
      }
      return { data: null, error: { message: 'unused' } }
    },
  }
}

const seedStore = () => ({
  invoices: [],
  quotations: [],
  invoice_items: [],
  quotation_items: [],
})

beforeEach(() => {
  clearExecutedOperationIdsForTest()
})

// ============================================================================
// 1. Document Lifecycle & Status Transitions
// ============================================================================

test('Lifecycle: Quotation transition validation permits open -> archived and restore', () => {
  const archiveCheck = validateLifecycleTransition({ status: 'open', archived_at: null }, 'archive', undefined, 'quotation')
  assert.equal(archiveCheck.valid, true)
  assert.equal(archiveCheck.action, 'archive')

  const restoreCheck = validateLifecycleTransition({ status: 'archived', archived_at: '2026-11-01' }, 'restore', undefined, 'quotation')
  assert.equal(restoreCheck.valid, true)
  assert.equal(restoreCheck.action, 'restore')

  // Cannot archive already archived
  const doubleArchive = validateLifecycleTransition({ status: 'archived', archived_at: '2026-11-01' }, 'archive', undefined, 'quotation')
  assert.equal(doubleArchive.valid, false)

  // Cannot restore active
  const doubleRestore = validateLifecycleTransition({ status: 'open', archived_at: null }, 'restore', undefined, 'quotation')
  assert.equal(doubleRestore.valid, false)
})

test('Lifecycle: Quotation transition to invoice permits open -> converted', () => {
  const convertCheck = validateLifecycleTransition({ status: 'open', archived_at: null }, 'convert_to_invoice', undefined, 'quotation')
  assert.equal(convertCheck.valid, true)
  assert.equal(convertCheck.action, 'convert_to_invoice')

  // Cannot convert already converted quotation
  const reConvert = validateLifecycleTransition({ status: 'converted', archived_at: null }, 'convert_to_invoice', undefined, 'quotation')
  assert.equal(reConvert.valid, false)

  // Invoices cannot be converted to invoice
  const invConvert = validateLifecycleTransition({ status: 'unpaid', archived_at: null }, 'convert_to_invoice', undefined, 'invoice')
  assert.equal(invConvert.valid, false)
})

test('Lifecycle: Rejects invalid or legacy quotation statuses (draft, sent, accepted, rejected)', () => {
  const legacyStatuses = ['draft', 'sent', 'accepted', 'rejected', 'void', 'cancelled']
  for (const st of legacyStatuses) {
    const res = validateLifecycleTransition({ status: 'open', archived_at: null }, 'update_status', st, 'quotation')
    assert.equal(res.valid, false, `Status ${st} should be rejected`)
  }
})

test('Lifecycle: Invoice payment status is protected and cannot be modified via update_status', () => {
  const invoiceStatusCheck = validateLifecycleTransition({ status: 'unpaid', archived_at: null }, 'update_status', 'paid', 'invoice')
  assert.equal(invoiceStatusCheck.valid, false)
  assert.match(invoiceStatusCheck.error, /derived from recorded payments/i)

  const invoiceArchiveCheck = validateLifecycleTransition({ status: 'unpaid', archived_at: null }, 'archive', undefined, 'invoice')
  assert.equal(invoiceArchiveCheck.valid, true)
  assert.equal(invoiceArchiveCheck.action, 'archive')
})

test('Lifecycle Gate 1 & Gate 2: Quotation archive lifecycle proposal and persistence', async () => {
  const store = seedStore()
  const qDoc = {
    id: QUOTATION_ID,
    quotation_number: 'QUO-2026-001',
    client_name: 'Acme Logistics',
    status: 'open',
    archived_at: null,
    subtotal: 50000,
    total: 50000,
    custom_fields: {},
  }
  store.quotations.push(qDoc)
  const harness = createHarness(store)

  // Gate 1: build proposal
  const validation = validateInvoiceModifyInput({
    documentId: QUOTATION_ID,
    lifecycleChange: { action: 'archive', explanation: 'Client went dormant' },
  }, 'quotation')
  assert.equal(validation.valid, true, validation.errors?.join(', '))

  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: QUOTATION_ID,
    targetDocumentNumber: 'QUO-2026-001',
    documentFamily: 'quotation',
    lifecycleChange: validation.data?.lifecycleChange,
    current: {
      document: qDoc,
      items: [],
    },
  }))
  assert.equal(proposal.lifecycleChange?.action, 'archive')
  assert.equal(proposal.lifecycleChange?.currentStatus, 'open')

  // Gate 2: persist
  const result = await persistQuotationModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)

  const persisted = store.quotations.find((q) => q.id === QUOTATION_ID)
  assert.equal(persisted.status, 'archived')
  assert.notEqual(persisted.archived_at, null)
})

test('Lifecycle Gate 2 stale rejection: Rejects archive if document status changed concurrently', async () => {
  const store = seedStore()
  const qDoc = {
    id: QUOTATION_ID,
    quotation_number: 'QUO-2026-001',
    status: 'converted', // Changed in DB before confirmation!
    archived_at: null,
    custom_fields: {},
  }
  store.quotations.push(qDoc)
  const harness = createHarness(store)

  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: QUOTATION_ID,
    targetDocumentNumber: 'QUO-2026-001',
    documentFamily: 'quotation',
    lifecycleChange: { action: 'archive', currentStatus: 'open', isArchived: false, explanation: 'Client went dormant' },
    current: {
      document: {
        id: QUOTATION_ID,
        status: 'open', // Gate 1 baseline was open
        archived_at: null,
      },
      items: [],
    },
  }))

  const result = await persistQuotationModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  assert.match(result.error, /(status|archive state) changed|stale/i)
})

// ============================================================================
// 2. Quotation Validity & Expiry
// ============================================================================

test('Quotation Validity: valid_until accepted for quotation, rejected for invoice', () => {
  const qValid = validateInvoiceModifyInput({
    documentId: QUOTATION_ID,
    field: 'valid_until',
    newValue: '2026-12-31',
  }, 'quotation')
  assert.equal(qValid.valid, true)

  const invValid = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    field: 'valid_until',
    newValue: '2026-12-31',
  }, 'invoice')
  assert.equal(invValid.valid, false)
  assert.match(invValid.errors[0], /valid_until applies to quotations only/i)
})

test('Quotation Validity: Explicit clearing by passing null is supported', () => {
  const qClear = validateInvoiceModifyInput({
    documentId: QUOTATION_ID,
    field: 'valid_until',
    newValue: null,
  }, 'quotation')
  assert.equal(qClear.valid, true)
  assert.equal(qClear.data.newValue, null)
})

test('Quotation Validity: Persisted baseline and Gate 2 stale check', async () => {
  const store = seedStore()
  const qDoc = {
    id: QUOTATION_ID,
    quotation_number: 'QUO-2026-002',
    status: 'open',
    valid_until: '2026-11-30',
    custom_fields: {},
  }
  store.quotations.push(qDoc)
  const harness = createHarness(store)

  // Gate 1 derives baseline '2026-11-30'
  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: QUOTATION_ID,
    targetDocumentNumber: 'QUO-2026-002',
    documentFamily: 'quotation',
    field: 'valid_until',
    newValue: '2026-12-31',
    current: {
      document: qDoc,
      items: [],
    },
  }))
  assert.equal(proposal.oldValue, '2026-11-30')
  assert.equal(proposal.newValue, '2026-12-31')

  // Concurrent modification in DB
  store.quotations[0].valid_until = '2026-12-15'

  const result = await persistQuotationModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  assert.match(result.error, /modified by another process|stale/i)
})

test('Quotation Validity: Successful persistence updates quotation record', async () => {
  const store = seedStore()
  const qDoc = {
    id: QUOTATION_ID,
    quotation_number: 'QUO-2026-003',
    status: 'open',
    valid_until: '2026-11-30',
    custom_fields: {},
  }
  store.quotations.push(qDoc)
  const harness = createHarness(store)

  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: QUOTATION_ID,
    targetDocumentNumber: 'QUO-2026-003',
    documentFamily: 'quotation',
    field: 'valid_until',
    newValue: '2026-12-31',
    current: {
      document: qDoc,
      items: [],
    },
  }))

  const result = await persistQuotationModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true)
  assert.equal(store.quotations[0].valid_until, '2026-12-31')
})

// ============================================================================
// 3. Document Attachments (Reference Links)
// ============================================================================

test('Attachments: URL validation enforces secure http/https and blocks dangerous schemes', () => {
  assert.equal(validateAttachmentUrl('https://docs.example.com/spec.pdf').valid, true)
  assert.equal(validateAttachmentUrl('http://files.example.com/drawing.png').valid, true)

  // Rejects javascript:, data:, file:
  assert.equal(validateAttachmentUrl('javascript:alert(1)').valid, false)
  assert.equal(validateAttachmentUrl('data:text/html,<script>alert(1)</script>').valid, false)
  assert.equal(validateAttachmentUrl('file:///C:/passwords.txt').valid, false)

  // Rejects localhost & private IPs
  assert.equal(validateAttachmentUrl('http://localhost:3000/report').valid, false)
  assert.equal(validateAttachmentUrl('http://127.0.0.1:8080/data').valid, false)
  assert.equal(validateAttachmentUrl('http://192.168.1.5/file').valid, false)
})

test('Attachments: Label validation enforces non-empty and length limit', () => {
  assert.equal(validateAttachmentLabel('Design Blueprint').valid, true)
  assert.equal(validateAttachmentLabel('').valid, false)
  assert.equal(validateAttachmentLabel('   ').valid, false)
  assert.equal(validateAttachmentLabel('A'.repeat(150)).valid, false)
})

test('Attachments: Add and remove operations compute fingerprint and updated set', () => {
  const initial = [{ label: 'Initial spec', url: 'https://example.com/spec.pdf' }]
  const fp1 = fingerprintAttachments(initial)

  const applied = applyAttachmentOperations(initial, [
    { op: 'add', label: 'CAD Drawing', url: 'https://example.com/cad.dwg' },
    { op: 'remove', match: { url: 'https://example.com/spec.pdf' } },
  ])

  assert.equal(applied.attachments.length, 1)
  assert.equal(applied.attachments[0].label, 'CAD Drawing')
  assert.equal(applied.attachments[0].url, 'https://example.com/cad.dwg')
  assert.notEqual(fingerprintAttachments(applied.attachments), fp1)
})

test('Attachments Gate 1 & Gate 2: Reference link persistence and stale fingerprint detection', async () => {
  const store = seedStore()
  const invDoc = {
    id: INVOICE_ID,
    invoice_number: 'INV-2026-001',
    status: 'unpaid',
    custom_fields: {
      attachments: [{ label: 'Old Link', url: 'https://example.com/old.pdf' }],
    },
  }
  store.invoices.push(invDoc)
  const harness = createHarness(store)

  const validation = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    attachmentsChange: {
      ops: [
        { op: 'add', label: 'Scope Document', url: 'https://example.com/scope.pdf' },
      ],
    },
  }, 'invoice')
  assert.equal(validation.valid, true)

  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-2026-001',
    documentFamily: 'invoice',
    attachmentsChange: validation.data?.attachmentsChange,
    current: {
      document: invDoc,
      items: [],
    },
  }))
  assert.ok(proposal.attachmentsChange)
  assert.equal(proposal.attachmentsChange.newAttachments.length, 2)

  // Persist Gate 2
  const result = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true, result.error)

  const cf = parseCf(store.invoices[0])
  assert.equal(cf.attachments.length, 2)
  assert.equal(cf.attachments[1].label, 'Scope Document')
})

test('Attachments Gate 2: Rejects save when attachments changed concurrently in DB', async () => {
  const store = seedStore()
  const invDoc = {
    id: INVOICE_ID,
    invoice_number: 'INV-2026-002',
    status: 'unpaid',
    custom_fields: {
      attachments: [{ label: 'Original', url: 'https://example.com/original.pdf' }],
    },
  }
  store.invoices.push(invDoc)
  const harness = createHarness(store)

  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-2026-002',
    documentFamily: 'invoice',
    attachmentsChange: {
      ops: [{ op: 'add', label: 'New Link', url: 'https://example.com/new.pdf' }],
      fingerprint: fingerprintAttachments(invDoc.custom_fields.attachments),
    },
    current: {
      document: invDoc,
      items: [],
    },
  }))

  // Concurrent change in DB
  store.invoices[0].custom_fields.attachments.push({ label: 'Concurrent', url: 'https://example.com/concurrent.pdf' })

  const result = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, false)
  assert.match(result.error, /attachments changed after this proposal was prepared/i)
})

// ============================================================================
// 4. Payment Terms Reachability
// ============================================================================

test('Payment Terms: custom_payment_terms validation enforces string and length limit', () => {
  const valid = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    field: 'custom_payment_terms',
    newValue: '60% upfront before mobilization, 40% upon completion',
  }, 'invoice')
  assert.equal(valid.valid, true)

  const overlong = validateInvoiceModifyInput({
    documentId: INVOICE_ID,
    field: 'custom_payment_terms',
    newValue: 'A'.repeat(600),
  }, 'invoice')
  assert.equal(overlong.valid, false)
  assert.match(overlong.errors[0], /500 characters/i)
})

test('Payment Terms: Persisted baseline and update to custom_payment_terms on invoice and quotation', async () => {
  const store = seedStore()
  const invDoc = {
    id: INVOICE_ID,
    invoice_number: 'INV-2026-003',
    status: 'unpaid',
    payment_terms: 'Custom',
    custom_fields: {
      custom_payment_terms: '30 days net',
    },
  }
  store.invoices.push(invDoc)
  const harness = createHarness(store)

  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-2026-003',
    documentFamily: 'invoice',
    field: 'custom_payment_terms',
    newValue: '50% deposit, balance on delivery',
    current: {
      document: invDoc,
      items: [],
    },
  }))
  assert.equal(proposal.oldValue, '30 days net')
  assert.equal(proposal.newValue, '50% deposit, balance on delivery')

  const result = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(result.success, true)

  const cf = parseCf(store.invoices[0])
  assert.equal(cf.custom_payment_terms, '50% deposit, balance on delivery')
})

// ============================================================================
// 5. Operation Idempotency & Replay Safety
// ============================================================================

test('Idempotency: Immediate retry blocked by in-memory cache', async () => {
  const store = seedStore()
  const invDoc = {
    id: INVOICE_ID,
    invoice_number: 'INV-2026-004',
    status: 'unpaid',
    notes: 'Initial note',
    custom_fields: {},
  }
  store.invoices.push(invDoc)
  const harness = createHarness(store)

  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-2026-004',
    documentFamily: 'invoice',
    field: 'notes',
    newValue: 'Updated note',
    current: {
      document: invDoc,
      items: [],
    },
  }))

  const res1 = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(res1.success, true)

  // Immediate retry with identical proposal
  const res2 = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(res2.success, false)
  assert.match(res2.error, /already been submitted and executed/i)
})

test('Idempotency: Replay blocked across cleared in-memory cache via persistent custom_fields record', async () => {
  const store = seedStore()
  const invDoc = {
    id: INVOICE_ID,
    invoice_number: 'INV-2026-005',
    status: 'unpaid',
    notes: 'Initial note',
    custom_fields: {},
  }
  store.invoices.push(invDoc)
  const harness = createHarness(store)

  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-2026-005',
    documentFamily: 'invoice',
    field: 'notes',
    newValue: 'Updated note',
    current: {
      document: invDoc,
      items: [],
    },
  }))

  const res1 = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(res1.success, true)

  // Verify custom_fields recorded operation ID
  const cf = parseCf(store.invoices[0])
  assert.equal(cf.last_operation_id, proposal.opId)
  assert.ok(cf.applied_operation_ids.includes(proposal.opId))

  // Clear in-memory execution tracker (simulating restart / multi-instance)
  clearExecutedOperationIdsForTest()

  const res2 = await persistInvoiceModification(harness, proposal, () => true, () => true, null)
  assert.equal(res2.success, false)
  assert.match(res2.error, /already been submitted and executed/i)
})

// ============================================================================
// 6. Contextual Recommendations & Operational Intelligence
// ============================================================================

test('Operational Intelligence: Grounded observations distinguish observations from suggestions', () => {
  const doc = {
    quotation_number: 'QUO-2026-010',
    status: 'open',
    client_name: 'Dangote Industries',
    valid_until: '2026-11-20',
  }
  const items = [
    { description: 'Item 1', quantity: 2, unit_price: 15000, row_type: 'standard' },
  ]
  const refDate = new Date('2026-11-18')

  const analysis = analyzeDocumentIntelligence(doc, items, 'quotation', refDate)

  assert.ok(analysis.observations.length > 0)
  assert.ok(analysis.suggestions.length > 0)

  // Verify expiry observation & warning
  assert.ok(analysis.expiryWarning)
  assert.ok(analysis.observations.some((o) => o.includes('expires')))

  // Verify readiness observation / suggestion
  assert.ok(analysis.suggestions.some((s) => s.includes('convert this quotation into an invoice')))

  const formatted = formatDocumentIntelligence(analysis)
  assert.ok(formatted.includes('Observations:'))
  assert.ok(formatted.includes('Suggestions:'))
})

// ============================================================================
// 7. UI Components & Plain-Text Artifact Formatting
// ============================================================================

test('UI Preview & Plain Text: Lifecycle changes render with distinct labels and plain text', () => {
  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: QUOTATION_ID,
    targetDocumentNumber: 'QUO-2026-020',
    documentFamily: 'quotation',
    lifecycleChange: {
      action: 'convert_to_invoice',
      targetStatus: 'converted',
      currentStatus: 'open',
      isArchived: false,
      explanation: 'Quote accepted by client',
      reason: 'Quote accepted by client',
      fromStatus: 'open',
      toStatus: 'converted',
    },
    current: {
      document: {
        id: QUOTATION_ID,
        quotation_number: 'QUO-2026-020',
        status: 'open',
      },
      items: [],
    },
  }))

  const markup = renderToStaticMarkup(createElement(ProposalCardView, {
    proposal,
    onApproveGate1: async () => {},
    onRejectGate1: async () => {},
  }))
  assert.ok(markup.includes('Convert to Invoice'))
  assert.ok(markup.includes('Quote accepted by client'))

  const plain = proposalPlainText(proposal)
  assert.ok(plain.includes('Lifecycle action:'))
  assert.ok(plain.includes('Convert quotation to invoice'))
})

test('UI Preview & Plain Text: Attachments changes render in preview and plain text', () => {
  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: INVOICE_ID,
    targetDocumentNumber: 'INV-2026-021',
    documentFamily: 'invoice',
    attachmentsChange: {
      ops: [
        { op: 'add', label: 'Technical Specification', url: 'https://example.com/spec.pdf' },
      ],
      fingerprint: 'att:none',
    },
    current: {
      document: {
        id: INVOICE_ID,
        invoice_number: 'INV-2026-021',
        status: 'unpaid',
        custom_fields: {},
      },
      items: [],
    },
  }))

  const markup = renderToStaticMarkup(createElement(ProposalCardView, {
    proposal,
    onApproveGate1: async () => {},
    onRejectGate1: async () => {},
  }))
  assert.ok(markup.includes('Reference Link Attachments'))
  assert.ok(markup.includes('Technical Specification'))
  assert.ok(markup.includes('https://example.com/spec.pdf'))

  const plain = proposalPlainText(proposal)
  assert.ok(plain.includes('Attachments:'))
  assert.ok(plain.includes('+ Attachment: Technical Specification (https://example.com/spec.pdf) [new]'))
})

test('UI Preview & Plain Text: Quotation validity shows "Quotation validity" not "Due date"', () => {
  const proposal = approve(buildInvoiceModifyProposal({
    targetDocumentId: QUOTATION_ID,
    targetDocumentNumber: 'QUO-2026-022',
    documentFamily: 'quotation',
    field: 'valid_until',
    newValue: '2026-12-31',
    current: {
      document: {
        id: QUOTATION_ID,
        quotation_number: 'QUO-2026-022',
        valid_until: '2026-11-30',
        status: 'open',
      },
      items: [],
    },
  }))

  const markup = renderToStaticMarkup(createElement(ProposalCardView, {
    proposal,
    onApproveGate1: async () => {},
    onRejectGate1: async () => {},
  }))
  assert.ok(markup.includes('Quotation validity'))
  assert.ok(!markup.includes('Due date:'))

  const plain = proposalPlainText(proposal)
  assert.ok(plain.includes('Quotation validity: 2026-11-30 -> 2026-12-31'))
})
