import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import {
  buildInvoiceCreateProposal,
  mergeDocumentCreateProposal,
  validateInvoiceCreateInput,
} from '../../lib/ai-assistant/bolu-operations.ts'
import { persistInvoiceCreation } from '../../lib/ai-assistant/bolu-document-service.ts'
import {
  buildCommercialSuggestions,
  isCableShorthand,
  parseCommercialAmount,
  parseCommercialList,
  standardizeCommercialItems,
  standardizeDescription,
} from '../../lib/ai-assistant/bolu-commercial-language.ts'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '../../..')
const readSource = (relative) => readFileSync(resolve(srcRoot, relative), 'utf8')

/**
 * The exact reference input from the approved product illustration: four cable
 * shorthand lines, a separate price list, then two ordinary goods with their
 * own amounts.
 */
const REFERENCE_INPUT = [
  '1.5mm green 1',
  '2.5mm red 1',
  '2.5mm black 1',
  '1.5mm black 1',
  '32,000',
  '53,000',
  '53,000',
  '32,000',
  'Salt 15k',
  'Charcoal 7k',
].join('\n')

/** A tenant client that satisfies the persistence service without a database. */
function createPersistenceMock(settingsPrefixes = undefined) {
  const createQueryChain = (resultData = []) => {
    const chain = {
      select: () => chain,
      limit: () => chain,
      eq: () => chain,
      is: () => chain,
      order: () => chain,
      single: async () => ({
        data: Array.isArray(resultData) ? (resultData[0] ?? null) : resultData,
        error: null,
      }),
      maybeSingle: async () => ({
        data: Array.isArray(resultData) ? (resultData[0] ?? null) : resultData,
        error: null,
      }),
      then(settle) {
        return Promise.resolve({ data: resultData, error: null }).then(settle)
      },
    }
    return chain
  }

  return {
    schemaName: 'tenant_test',
    version: 'phase-1',
    isReady: true,
    from(table) {
      if (table === 'settings') {
        return createQueryChain(settingsPrefixes ? { document_prefixes: settingsPrefixes } : null)
      }
      return createQueryChain([])
    },
    rpc: async (_fn, params) => ({
      data: [
        {
          invoice: {
            id: 'inv-permission-test',
            invoice_number: params?.p_invoice_payload?.invoice_number ?? 'INV-000101',
          },
        },
      ],
      error: null,
    }),
  }
}

/** Mirrors public.has_entity_permission: exact resource/action match. */
function authorizationFrom(grants) {
  return (resource, action) =>
    grants.some(([grantedResource, grantedAction]) => grantedResource === resource && grantedAction === action)
}

function approvedProposal(overrides = {}) {
  const proposal = buildInvoiceCreateProposal({
    client_name: 'Tunde',
    items: [{ description: 'Item', quantity: 1, unit_price: 1000 }],
    ...overrides,
  })
  proposal.status = 'approved_pending_save'
  return proposal
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. COMMERCIAL DESCRIPTION INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────────

test('Amount shorthand is parsed without changing the supplied value', () => {
  assert.equal(parseCommercialAmount('15k'), 15000)
  assert.equal(parseCommercialAmount('15 K'), 15000)
  assert.equal(parseCommercialAmount('₦32,000'), 32000)
  assert.equal(parseCommercialAmount('32,000.50'), 32000.5)
  assert.equal(parseCommercialAmount('1.5mm'), null)
  assert.equal(parseCommercialAmount('Salt'), null)
})

test('A unit is only made explicit when the words name the conductor', () => {
  // Explicit conductor context: the supplied size becomes a cross-section.
  assert.equal(standardizeDescription('1.5mm cable'), '1.5mm² cable')
  assert.equal(standardizeDescription('1.5mm wire'), '1.5mm² wire')
  assert.equal(standardizeDescription('1.5mm green cable'), '1.5mm² green cable')
  // A colour alone does not establish a conductor, so the wording is untouched.
  assert.equal(standardizeDescription('1.5mm green'), '1.5mm green')
  assert.equal(standardizeDescription('2.5mm black'), '2.5mm black')
  // An explicitly supplied squared unit is preserved.
  assert.equal(standardizeDescription('1.5mm2 red'), '1.5mm² red')
  assert.equal(standardizeDescription('1.5mm² red'), '1.5mm² red')
  assert.equal(isCableShorthand('2.5mm red'), true)
  assert.equal(isCableShorthand('Salt'), false)
})

test('Safe language normalization still corrects spelling and compound words', () => {
  assert.equal(standardizeDescription('2 inch elbo'), '2 inch elbow')
  assert.equal(standardizeDescription('3 elbos'), '3 elbows')
  assert.equal(standardizeDescription('change over switch 40A'), 'Changeover Switch 40A')
  assert.equal(standardizeDescription('change over switches'), 'Changeover Switches')
  assert.equal(standardizeDescription('salt'), 'Salt')
  assert.equal(standardizeDescription('cement 50kg'), 'Cement 50kg')
  assert.equal(standardizeDescription('  copper   pipe  '), 'Copper pipe')
  assert.equal(standardizeDescription('1.5 mm² 4 core cable'), '1.5 mm² 4 core cable')
})

test('Standardization never invents a product family, class or specification', () => {
  assert.equal(standardizeDescription('Salt'), 'Salt')
  assert.equal(standardizeDescription('charcoal'), 'Charcoal')

  // The previous defect: `1.5mm green` gained "Single-Core Cable".
  const cable = standardizeDescription('1.5mm green')
  assert.equal(cable, '1.5mm green', 'colour alone never makes the unit explicit')
  assert.doesNotMatch(cable, /single[- ]?core/i)
  assert.doesNotMatch(cable, /cable/i)

  for (const supplied of ['1.5mm green', '1.5mm green cable', 'armoured cable 50m']) {
    const description = standardizeDescription(supplied)
    assert.doesNotMatch(description, /brand|voltage|grade|model|packaging/i)
    // No core count is ever added to a description that did not carry one.
    assert.doesNotMatch(description, /\b\d+\s*(?:core|cores)\b/i)
  }

  // A supplied core count and size are preserved as written.
  assert.equal(standardizeDescription('1.5mm² 4 core cable'), '1.5mm² 4 core cable')

  // `armoured cable 50m` gains no conductor size, core count or rating.
  assert.equal(standardizeDescription('armoured cable 50m'), 'Armoured cable 50m')

  // An ambiguous `mm` is not reinterpreted as a cross-section.
  assert.equal(standardizeDescription('1.5mm'), '1.5mm')
  assert.equal(standardizeDescription('50mm bolt'), '50mm bolt')
  assert.equal(standardizeDescription('1.5mm pipe'), '1.5mm pipe')
  assert.equal(standardizeDescription('1.5mm 2 core'), '1.5mm 2 core')
})

test('WhatsApp-style input becomes six ordered entries with prices paired positionally', () => {
  const parsed = parseCommercialList(REFERENCE_INPUT)
  assert.equal(parsed.descriptions.length, 6)
  assert.equal(parsed.status, 'paired')

  const descriptions = parsed.descriptions.map((entry) => entry.description)
  assert.deepEqual(descriptions, [
    '1.5mm green',
    '2.5mm red',
    '2.5mm black',
    '1.5mm black',
    'Salt',
    'Charcoal',
  ])
  // The supplied wording is preserved alongside the presentation tidy-up.
  assert.deepEqual(
    parsed.descriptions.map((entry) => entry.rawDescription),
    ['1.5mm green', '2.5mm red', '2.5mm black', '1.5mm black', 'Salt', 'Charcoal'],
  )

  assert.deepEqual(
    parsed.descriptions.map((entry) => entry.amount),
    [32000, 53000, 53000, 32000, 15000, 7000],
  )
  assert.deepEqual(
    parsed.descriptions.map((entry) => entry.quantity),
    [1, 1, 1, 1, 1, 1],
  )
})

test('WhatsApp timestamps and list markers are stripped before parsing', () => {
  const parsed = parseCommercialList(
    ['[14/11, 12:13] Mujay:', '1. 1.5mm green 1', '2. 2.5mm red 1', '32,000', '53,000'].join('\n'),
  )
  assert.equal(parsed.descriptions.length, 2)
  assert.equal(parsed.descriptions[0].description, '1.5mm green')
  assert.deepEqual(parsed.descriptions.map((entry) => entry.amount), [32000, 53000])
})

test('A description/price count mismatch is reported, never guessed', () => {
  // Three descriptions without an amount, but only two standalone prices.
  const parsed = parseCommercialList(
    ['1.5mm green 1', '2.5mm red 1', 'Charcoal', '32,000', '53,000'].join('\n'),
  )
  assert.equal(parsed.status, 'mismatch')
  // No amount is attached to any description, and none is invented.
  assert.deepEqual(
    parsed.descriptions.map((entry) => entry.amount),
    [null, null, null],
  )
  assert.deepEqual(parsed.unpairedAmounts, [32000, 53000])
})

test('The standardisation helper produces the wording a recommendation would offer', () => {
  const [item] = standardizeCommercialItems([{ description: '1.5mm green cable', quantity: 1, unit_price: 32000 }])
  assert.equal(item.description, '1.5mm² green cable')
  assert.doesNotMatch(item.description, /single[- ]?core/i)
  assert.equal(item.quantity, 1)
  assert.equal(item.unit_price, 32000)
})

test('Suggestions are grounded and optional, and never block the proposal', () => {
  const suggestions = buildCommercialSuggestions({
    items: [{ description: '1.5mm2 blue', quantity: 1, unit_price: 0 }],
    payment_terms: null,
    title: null,
  })
  assert.ok(suggestions.some((entry) => /1\.5mm² blue/.test(entry)))
  assert.ok(!suggestions.some((entry) => /single[- ]?core/i.test(entry)))
  assert.ok(suggestions.some((entry) => /No amount was supplied/.test(entry)))
  assert.ok(suggestions.some((entry) => /Payment terms/.test(entry)))
  // A suggestion is prose for the user, not a change to the document.
  assert.equal(typeof suggestions[0], 'string')
})

test('The approved reference input produces a 192,000 subtotal with no invented lines', () => {
  const parsed = parseCommercialList(REFERENCE_INPUT)
  const items = parsed.descriptions.map((entry) => ({
    description: entry.description,
    quantity: entry.quantity,
    unit_price: entry.amount ?? 0,
  }))

  const validation = validateInvoiceCreateInput({ client_name: 'Tunde', items, global_vat_percent: 0 })
  assert.equal(validation.valid, true)

  const proposal = buildInvoiceCreateProposal({ ...validation.data, global_vat_percent: 0 })
  assert.equal(proposal.payload.items.length, 6)
  assert.equal(proposal.computedTotals.subtotal, 192000)
  assert.equal(proposal.computedTotals.total, 192000)
  assert.equal(proposal.computedTotals.vat, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. GATE 1 / GATE 2 LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

test('A correction updates the same operation and invalidates the previous approval', () => {
  const previous = approvedProposal({
    title: 'Roofing works',
    items: [{ description: '1.5mm² green', quantity: 1, unit_price: 32000 }],
  })

  const merged = mergeDocumentCreateProposal(previous, {
    client_name: 'Tunde',
    items: [
      { description: '1.5mm² green', quantity: 1, unit_price: 32000 },
      { description: 'Salt', quantity: 1, unit_price: 15000 },
      { description: 'Charcoal', quantity: 1, unit_price: 7000 },
    ],
    global_vat_percent: 0,
  })

  assert.equal(merged.opId, previous.opId, 'the correction is the same operation')
  assert.equal(merged.status, 'pending_approval', 'Gate 1 approval is cleared')
  assert.equal(merged.payload.title, 'Roofing works', 'unrelated fields are preserved')
  assert.equal(merged.payload.items.length, 3)
  assert.equal(merged.computedTotals.subtotal, 54000, 'totals are recalculated')
})

test('A correction keeps an existing client resolution it was not given', () => {
  const client = { id: 'client-1', name: 'Tunde' }
  const previous = buildInvoiceCreateProposal(
    { client_name: 'Tunde', items: [{ description: 'Salt', quantity: 1, unit_price: 15000 }] },
    'INV-DRAFT',
    'invoice',
    { status: 'resolved', client },
  )
  previous.status = 'approved_pending_save'

  const merged = mergeDocumentCreateProposal(previous, {
    client_name: 'Tunde',
    items: [{ description: 'Charcoal', quantity: 1, unit_price: 7000 }],
  })

  assert.deepEqual(merged.clientResolution, { status: 'resolved', client })
  assert.equal(merged.payload.items[0].description, 'Charcoal')
})

test('Gate 2 surfaces no client editor and reopening review is wired to the hooks', () => {
  const panel = readSource('src/components/ai-assistant/chat/assistant-chat-panel.tsx')
  const card = readSource('src/components/ai-assistant/chat/assistant-chat-parts.tsx')
  const hook = readSource('src/lib/ai-assistant/hooks/useBoluThread.ts')

  assert.match(panel, /isCreate && isPendingGate1 && \(onSearchClients \|\| proposal\.clientResolution\)/)
  assert.match(card, /isCreate && isPendingGate1 && \(onSearchClients \|\| proposal\.clientResolution\)/)
  assert.match(panel, /Back to review/)
  assert.match(card, /Back to review/)
  assert.match(hook, /const returnGate1ToReview[\s\S]{0,900}status: 'pending_approval'/)
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. MOBILE COMPOSER
// ─────────────────────────────────────────────────────────────────────────────

test('Enter never sends: the composer inserts a newline and the button sends', () => {
  const workspace = readSource('src/components/ai-assistant/chat/BoluChatWorkspace.tsx')
  const composer = readSource('src/components/ai-assistant/chat/assistant-chat-composer.tsx')

  assert.doesNotMatch(workspace, /e\.key === 'Enter'/)
  assert.doesNotMatch(workspace, /!e\.shiftKey/)
  assert.match(workspace, /Enter inserts a newline\. It never sends\./)
  assert.match(composer, /Use the send button to send/)
  assert.match(composer, /type="submit"/)
})

test('A pending proposal never auto-opens the blocking mobile sheet', () => {
  const workspace = readSource('src/components/ai-assistant/chat/BoluChatWorkspace.tsx')
  assert.match(workspace, /if \(actionable && viewport !== 'fold-closed'\) setPanelOpen\(true\)/)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. GATE 2 SAVE AUTHORIZATION
// ─────────────────────────────────────────────────────────────────────────────

test('Bolu requests the canonical has_entity_permission actions, not save/modify', () => {
  const data = readSource('src/lib/ai-assistant/bolu-data.ts')
  const service = readSource('src/lib/ai-assistant/bolu-document-service.ts')
  const operations = readSource('src/lib/ai-assistant/bolu-operations.ts')

  for (const source of [data, service, operations]) {
    assert.doesNotMatch(source, /canWrite\([^)]*'save'\)/)
    assert.doesNotMatch(source, /canRead\([^)]*'modify'\)/)
    assert.doesNotMatch(source, /action: 'save'/)
  }

  assert.match(operations, /requiredPermission: \{ resource: documentFamily, action: 'create' \}/)
  assert.match(operations, /requiredPermission: \{ resource: documentFamily, action: 'edit' \}/)
})

test('An authorized create/edit role can save an invoice through Gate 2', async () => {
  const grants = [
    ['invoice', 'view'],
    ['invoice', 'create'],
    ['invoice', 'edit'],
    ['quotation', 'view'],
  ]
  const canWrite = authorizationFrom(grants)
  const canRead = authorizationFrom(grants)

  // A role with create/edit but no wildcard must pass, exactly like the form.
  assert.equal(canWrite('invoice', 'create'), true)

  const result = await persistInvoiceCreation(
    createPersistenceMock(),
    approvedProposal(),
    canWrite,
    canRead,
    '11111111-2222-3333-4444-555555555555',
  )
  assert.equal(result.success, true)
})

test('A role without the canonical create action remains blocked', async () => {
  const grants = [
    ['invoice', 'view'],
    ['invoice', 'edit'],
  ]
  const canWrite = authorizationFrom(grants)
  const canRead = authorizationFrom(grants)

  await assert.rejects(
    () =>
      persistInvoiceCreation(
        createPersistenceMock(),
        approvedProposal(),
        canWrite,
        canRead,
        '11111111-2222-3333-4444-555555555555',
      ),
    /permission to create invoices/i,
  )
})

test('A quotation needs its own create grant; an invoice grant is not reused', async () => {
  const canWrite = authorizationFrom([
    ['invoice', 'create'],
    ['quotation', 'view'],
  ])
  const canRead = authorizationFrom([['quotation', 'view']])

  const quotation = buildInvoiceCreateProposal(
    { client_name: 'Tunde', items: [{ description: 'Salt', quantity: 1, unit_price: 15000 }] },
    'QTN-DRAFT',
    'quotation',
  )
  quotation.status = 'approved_pending_save'

  await assert.rejects(
    () =>
      persistInvoiceCreation(
        createPersistenceMock(),
        quotation,
        canWrite,
        canRead,
        '11111111-2222-3333-4444-555555555555',
      ),
    /permission to create quotations/i,
  )
})
