import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import {
  buildInvoiceCreateProposal,
  computeAuthoritativeTotals,
  validateInvoiceCreateInput,
} from '../../lib/ai-assistant/bolu-operations.ts'
import { persistInvoiceCreation } from '../../lib/ai-assistant/bolu-document-service.ts'
import { isBoluCreatedDocument } from '../../lib/ai-assistant/bolu-audit.ts'
import { getNextInvoiceNumber } from '../../domain/documentConversion.ts'
import { resolvePrefix } from '../../domain/prefixConstants.ts'
import { matchBoluWriteContext } from '../../lib/ai-assistant/bolu-capabilities.ts'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '../../..')
const readSource = (relative) => readFileSync(resolve(srcRoot, relative), 'utf8')

const ITEMS = [{ description: 'Salt', quantity: 1, unit_price: 15000 }]

function approvedProposal(overrides = {}) {
  const proposal = buildInvoiceCreateProposal({ client_name: 'Tunde', items: ITEMS, ...overrides })
  proposal.status = 'approved_pending_save'
  return proposal
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CANONICAL NUMBERING
// ─────────────────────────────────────────────────────────────────────────────

test('the tenant prefix is authoritative; an absent map silently means INV', () => {
  // This is the reported defect class: the tenant runs SASINV, so an unresolved
  // prefix map allocates from a different family (INV) and yields INV-000001.
  assert.equal(resolvePrefix({ invoice: 'SASINV' }, 'invoice'), 'SASINV')
  assert.equal(resolvePrefix(undefined, 'invoice'), 'INV')
  assert.equal(resolvePrefix({ quotation: 'SASQUO' }, 'quotation'), 'SASQUO')
})

test('the canonical generator continues the tenant family and skips legacy numbers', () => {
  const rows = [
    { invoice_number: 'SASINV-000134' },
    { invoice_number: 'SASINV134' },
    { invoice_number: 'INV-000001' },
  ]
  assert.equal(getNextInvoiceNumber(rows, 'SASINV'), 'SASINV-000135')
  assert.equal(getNextInvoiceNumber(rows, 'INV'), 'INV-000002')
})

test('a persisted automatic cursor advances the tenant family', () => {
  const rows = [{ invoice_number: 'SASINV-000134' }]
  assert.equal(getNextInvoiceNumber(rows, 'SASINV', 200), 'SASINV-000200')
  // An occupied cursor position is skipped, never reused.
  assert.equal(getNextInvoiceNumber([{ invoice_number: 'SASINV-000200' }], 'SASINV', 200), 'SASINV-000201')
})

test('Bolu resolves the tenant prefix map before allocating a number', () => {
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')

  assert.doesNotMatch(service, /resolvePrefix\(undefined,/, 'Bolu must never fall back to the global default prefix')
  assert.match(service, /fetchDocumentPrefixes\(tenantClient\)/)
  assert.match(service, /resolvePrefix\(documentPrefixes, 'invoice'\)/)
  assert.match(service, /resolvePrefix\(documentPrefixes, 'quotation'\)/)
  assert.match(service, /withUniqueRetry\(/)
})

test('a replayed Gate 2 confirmation returns the persisted document and writes nothing', async () => {
  const calls = []
  const builder = {
    select: () => builder,
    filter: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({ data: { id: 'inv-existing', invoice_number: 'SASINV-000134' }, error: null }),
  }
  const tenantClient = {
    isReady: true,
    schemaName: 'entity_test',
    from: (table) => {
      calls.push(`from:${table}`)
      return builder
    },
    rpc: async (name) => {
      calls.push(`rpc:${name}`)
      return { data: null, error: null }
    },
  }

  const result = await persistInvoiceCreation(
    tenantClient,
    approvedProposal(),
    () => true,
    () => true,
    'entity-test',
    { id: 'user-1', label: 'owner@example.com' },
  )

  assert.equal(result.success, true)
  assert.equal(result.documentId, 'inv-existing')
  assert.equal(result.documentNumber, 'SASINV-000134')
  assert.ok(
    !calls.includes('rpc:save_invoice_with_items_transaction'),
    'an already persisted operation must not be written twice',
  )
})

test('the durable idempotency key is the document operation id', () => {
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  assert.match(service, /custom_fields->>operation_id/)
  assert.match(service, /findPersistedOperation\(tenantClient, 'invoice', proposal\.opId\)/)
  assert.match(service, /findPersistedOperation\(tenantClient, 'quotation', proposal\.opId\)/)
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUDIT ATTRIBUTION
// ─────────────────────────────────────────────────────────────────────────────

test('co-creation provenance is read only from the persisted marker', () => {
  assert.equal(isBoluCreatedDocument({ created_via: 'bolu_assistant' }), true)
  assert.equal(isBoluCreatedDocument('{"created_via":"bolu_assistant"}'), true)
  assert.equal(isBoluCreatedDocument({ created_via: 'web' }), false)
  assert.equal(isBoluCreatedDocument({ created_via: 'BOLU_ASSISTANT' }), false)
  assert.equal(isBoluCreatedDocument({}), false)
  assert.equal(isBoluCreatedDocument('not json'), false)
  assert.equal(isBoluCreatedDocument(null), false)
})

test('Bolu writes the canonical CREATE audit event with the authenticated actor', () => {
  const audit = readSource('src/lib/ai-assistant/bolu-audit.ts')
  const save = readSource('api/bolu-save.ts')

  assert.match(audit, /record_audit_log/)
  assert.match(audit, /p_action: 'CREATE'/)
  assert.match(audit, /p_source: BOLU_AUDIT_SOURCE/)
  assert.match(audit, /record_invoice_created/)
  assert.match(audit, /record_quotation_created/)
  assert.match(audit, /input\.actor\?\.id/)
  // The actor is the verified token subject, never a client-supplied id.
  assert.match(save, /const auditActor = \{ id: user\.id, label: user\.email \?\? 'user' \}/)
  assert.doesNotMatch(save, /body\.userId|proposal\.userId/)
})

test('the persisted document carries the co-creation marker', () => {
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  assert.match(service, /created_via: 'bolu_assistant'/)
  assert.match(service, /operation_id: proposal\.opId/)
})

test('the view pages show attribution from saved fields, not chat state', () => {
  const invoice = readSource('src/pages/ViewInvoice.tsx')
  const quotation = readSource('src/pages/ViewQuotation.tsx')

  assert.match(invoice, /isBoluCreatedDocument\(invoice\?\.custom_fields/)
  assert.match(invoice, /coCreatedWithBolu=\{coCreatedWithBolu\}/)
  assert.match(quotation, /isBoluCreatedDocument\(quotation\.custom_fields\)/)
  assert.match(readSource('src/components/document-view/invoice/InvoiceWorkspace.tsx'), /Co-created with Bolu/)
})

test('a save writes exactly one confirmation message', () => {
  const save = readSource('api/bolu-save.ts')
  // The client thread writes the confirmation row after a successful save.
  assert.doesNotMatch(save, /successContent/)
  // The proposal update is tenant-scoped.
  assert.match(save, /\.eq\('tenant_id', targetEntityId\)/)
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. BUSINESS CONTEXT DISCOVERY
// ─────────────────────────────────────────────────────────────────────────────

test('write-intent discovery extracts client, supplier and document hints', () => {
  const clientContext = matchBoluWriteContext('create an invoice for Solwood Ventures with 2 pumps')
  assert.equal(clientContext.targetFamily, 'invoice')
  assert.equal(clientContext.clientHint, 'Solwood Ventures')

  const supplierContext = matchBoluWriteContext('draft a quotation for repairs supplied by supplier Delta Metals')
  assert.equal(supplierContext.targetFamily, 'quotation')
  assert.equal(supplierContext.supplierHint, 'Delta Metals')
})

test('context discovery covers clients, catalog, suppliers and client documents', () => {
  const data = readSource('src/lib/ai-assistant/bolu-data.ts')

  assert.match(data, /export async function searchBoluClients/)
  assert.match(data, /export async function searchBoluCatalog/)
  assert.match(data, /export async function searchBoluSuppliers/)
  assert.match(data, /export async function readRecentClientDocuments/)
  assert.match(data, /\.is\('archived_at', null\)/)
  // Discovery must stay read-only.
  assert.doesNotMatch(data, /from\('invoices'\)[\s\S]{0,200}\.insert\(/)
})

test('ambiguity preserves the proposal rather than inventing a client', () => {
  const data = readSource('src/lib/ai-assistant/bolu-data.ts')
  const generation = readSource('src/lib/ai-assistant/bolu-generation.ts')
  assert.match(data, /return \{ status: 'ambiguous', matches, query: clean \}/)
  assert.match(generation, /clarificationForClientResolution\(resolution\)/)
  assert.match(generation, /mergedFromMessageId = options\.previousProposalMessageId/)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. FIELD PARITY
// ─────────────────────────────────────────────────────────────────────────────

test('item and document fields survive validation into the proposal', () => {
  const validation = validateInvoiceCreateInput({
    client_name: 'Tunde',
    title: 'Generator service',
    po_number: 'PO-77',
    terms: 'Payment within 14 days. Parts warranted for 90 days.',
    payment_terms: '50% on order',
    notes: 'Access via the rear gate.',
    work_duration: '3 days',
    items: [
      {
        description: 'Pump assembly',
        sub_description: 'Sealed OEM unit',
        quantity: 2,
        unit: 'pcs',
        unit_price: 45000,
        make: 'Grundfos',
        part_number: 'CR-10',
        condition: 'new',
        install_rate: 5000,
        install_rate_taxable: true,
        vat_rate: 7.5,
        discount_rate: 2,
      },
    ],
  })

  assert.equal(validation.valid, true)
  const payload = validation.data
  assert.equal(payload.terms, 'Payment within 14 days. Parts warranted for 90 days.')
  assert.equal(payload.payment_terms, '50% on order')
  assert.equal(payload.title, 'Generator service')
  assert.equal(payload.po_number, 'PO-77')

  const item = payload.items[0]
  assert.equal(item.sub_description, 'Sealed OEM unit')
  assert.equal(item.make, 'Grundfos')
  assert.equal(item.part_number, 'CR-10')
  assert.equal(item.condition, 'new')
  assert.equal(item.unit, 'pcs')
  assert.equal(item.install_rate, 5000)
  assert.equal(item.install_rate_taxable, true)
  assert.equal(item.vat_rate, 7.5)
  assert.equal(item.discount_rate, 2)
})

test('extension item fields persist through custom_data, never as unknown columns', () => {
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  assert.match(service, /customData\.partNo = item\.part_number/)
  assert.match(service, /customData\.condition = item\.condition/)
  assert.match(service, /custom_data: customData/)
})

test('terms persist separately from payment terms', () => {
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  assert.match(service, /terms: proposal\.payload\.terms \|\| proposal\.payload\.payment_terms \|\| ''/)
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. FINANCIAL INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

test('a taxable charge enters the VAT base and a non-taxable one does not', () => {
  const base = computeAuthoritativeTotals(
    [{ description: 'Service', quantity: 1, unit_price: 1000 }],
    { globalVatPercent: 7.5 },
  )
  const nonTaxable = computeAuthoritativeTotals(
    [{ description: 'Service', quantity: 1, unit_price: 1000 }],
    { globalVatPercent: 7.5, extraCharges: [{ label: 'Delivery', value: 100, vatApplicable: false }] },
  )
  const taxable = computeAuthoritativeTotals(
    [{ description: 'Service', quantity: 1, unit_price: 1000 }],
    { globalVatPercent: 7.5, extraCharges: [{ label: 'Delivery', value: 100, vatApplicable: true }] },
  )

  assert.equal(nonTaxable.vat, base.vat, 'a non-taxable charge must not change VAT')
  assert.ok(taxable.vat > nonTaxable.vat, 'a taxable charge must add VAT')
  assert.equal(nonTaxable.subtotal, taxable.subtotal, 'the charge is not a line item')
})

test('fixed commercial charges stay distinct from custom charges', () => {
  const fixed = computeAuthoritativeTotals(
    [{ description: 'Service', quantity: 1, unit_price: 1000 }],
    { globalVatPercent: 0, fixedCharges: { transportation: 250 } },
  )
  assert.equal(fixed.extraChargesTotal, 250)
  assert.equal(fixed.subtotal, 1000)
  assert.equal(fixed.totalPayable, 1250)
})

test('the preview shows authoritative amounts and never fabricates a total', () => {
  const card = readSource('src/components/ai-assistant/chat/assistant-chat-parts.tsx')
  assert.match(card, /proposal\.computedTotals\?\.total/)
  assert.match(card, /AUTHORITATIVE_DOCUMENT_NUMBER/)
  assert.match(card, /BOURXE calculates the authoritative totals when this document is saved\./)
  assert.match(card, /formatNaira\(item\.unit_price\)/)
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. GATE INTERACTION
// ─────────────────────────────────────────────────────────────────────────────

test('a proposal leaves the composer usable at Gate 1 and Gate 2', () => {
  const generation = readSource('src/lib/ai-assistant/bolu-generation.ts')
  const hook = readSource('src/lib/ai-assistant/hooks/useBoluThread.ts')

  // Creating a proposal must not put the clerk into a non-idle lock state.
  assert.match(
    generation,
    /if \(parsedProposal\) \{[\s\S]{0,400}state\.setClerkState\('idle'\)/,
  )
  assert.doesNotMatch(generation, /setActiveProposalMessageId\(finalMsg\.id\)\s*\n\s*state\.setClerkState\('listening'\)/)

  // Gate 1 approval opens Gate 2 without locking chat.
  assert.match(hook, /Changes approved \(Gate 1\)/)
  assert.doesNotMatch(hook, /setClerkState\('listening'\)/)
})

test('Make Changes reopens Gate 1 with an editable composer', () => {
  const hook = readSource('src/lib/ai-assistant/hooks/useBoluThread.ts')
  const composer = readSource('src/components/ai-assistant/chat/assistant-chat-composer.tsx')

  assert.match(hook, /status: 'pending_approval'/)
  assert.match(hook, /Back to review/)
  assert.match(composer, /const isLocked = busy \|\| \(Boolean\(disabled\) && !editing\)/)
})

test('the composer still locks during genuine in-flight work', () => {
  const composer = readSource('src/components/ai-assistant/chat/assistant-chat-composer.tsx')
  assert.match(composer, /busy \?/)
  assert.match(composer, /Stop response generation/)
  assert.match(composer, /disabled=\{!value\.trim\(\) \|\| isLocked\}/)
})

test('Gate 2 cannot save an unapproved or stale proposal', () => {
  const hook = readSource('src/lib/ai-assistant/hooks/useBoluThread.ts')
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  const save = readSource('api/bolu-save.ts')

  assert.match(hook, /effectiveProposal\.status !== 'approved_pending_save'/)
  assert.match(service, /isProposalStale\(proposal\)/)
  assert.match(save, /proposal\.status !== 'approved_pending_save'/)
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. PREVIEW RENDERING
// ─────────────────────────────────────────────────────────────────────────────

test('document operations render a card and raw envelopes stay hidden', () => {
  const thread = readSource('src/components/ai-assistant/chat/assistant-chat-thread.tsx')
  assert.match(thread, /<ProposalCardView/)
  assert.match(thread, /cleanAssistantProse\(message\.content\)/)
  assert.match(thread, /"bolu_operation"/)
})

test('a draft placeholder is never presented as the document number', () => {
  const card = readSource('src/components/ai-assistant/chat/assistant-chat-parts.tsx')
  assert.match(card, /The document number is assigned on save from your business prefix\./)
  assert.match(card, /const AUTHORITATIVE_DOCUMENT_NUMBER = \/\^\[A-Z0-9\]\{2,6\}-\\d\{3,\}\$\//)
})

test('the card labels quotations and invoices distinctly', () => {
  const card = readSource('src/components/ai-assistant/chat/assistant-chat-parts.tsx')
  assert.match(card, /const isQuotation = proposal\.documentFamily === 'quotation'/)
  assert.match(card, /isQuotation \? 'Valid until' : 'Due date'/)
})
