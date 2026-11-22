import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BOLU_CONVERSATIONAL_CORE,
  BOLU_DOCUMENT_OPERATIONS,
  BOLU_PRODUCT_CONTEXT,
  buildBoluContextFacts,
  buildBoluSystemPrompt,
  isBoluDocumentOperationTurn,
} from '@/lib/ai-assistant/bolu-prompt'
import {
  classifyBoluFactFailure,
  factsAsPrompt,
  formatBoluFactFailure,
  formatFactAnswer,
  MAX_PROMPT_RECORDS,
} from '@/lib/ai-assistant/bolu-formatting'
import {
  formatCommercialEvidence,
  hasCommercialListSignal,
  parseCommercialList,
} from '@/lib/ai-assistant/bolu-commercial-language'

/** The exact conversational inputs from the audit. None is a commercial list. */
const CONVERSATIONAL_INPUTS = [
  'Tell me about the app',
  'What can you do?',
  'Show outstanding invoices',
  'What is VAT?',
  "I don't understand this transaction",
]

function record(index: number) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    kind: 'invoice' as const,
    number: `INV-${String(index).padStart(4, '0')}`,
    title: null,
    clientName: 'Tecno Power Solutions',
    date: '2026-11-01',
    status: 'unpaid',
    total: 100000,
    balanceDue: 100000,
    route: `/invoices/00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  }
}

// ============================================================================
// 1. COMMERCIAL EVIDENCE GATING
// ============================================================================

test('Ordinary conversation never receives a parsed commercial line item', () => {
  for (const text of CONVERSATIONAL_INPUTS) {
    assert.equal(
      buildBoluContextFacts({ facts: null, userText: text, history: [] }),
      '',
      `unexpected context for: ${text}`,
    )
  }
})

test('A read question with numbers stays a read turn, not a line item', () => {
  assert.equal(
    buildBoluContextFacts({
      facts: null,
      userText: 'Show me invoice INV-0001 for 1.5mm green',
      history: [],
    }),
    '',
  )
})

test('A document request supplies evidence and keeps an incomplete item', () => {
  const context = buildBoluContextFacts({
    facts: null,
    userText: 'Create a quotation for:\nCopper pipe\nSalt',
    history: [],
  })

  assert.match(context, /PARSED COMMERCIAL EVIDENCE/)
  assert.match(context, /Copper pipe/)
  assert.match(context, /Salt/)
  assert.match(context, /amount: not supplied/)
  // The request sentence itself is not presented as a line item.
  assert.doesNotMatch(context, /supplied: "Create a quotation/)
})

test('Multi-turn authoring keeps the earlier request and the later line items', () => {
  const context = buildBoluContextFacts({
    facts: null,
    userText: '10 bags of cement\n8500',
    history: [
      { role: 'user', content: 'Create an invoice for Tecno Power' },
      { role: 'assistant', content: 'What are you supplying?' },
    ],
  })

  assert.match(context, /cement/i)
  assert.match(context, /8500/)
})

test('An open draft keeps authoring context for a correction', () => {
  const context = buildBoluContextFacts({
    facts: null,
    userText: 'make it 20',
    history: [
      { role: 'user', content: 'Copper pipe 2' },
      { role: 'assistant', content: 'I have prepared a quotation proposal.' },
    ],
    hasActiveDraft: true,
  })

  assert.match(context, /PARSED COMMERCIAL EVIDENCE/)
  assert.match(context, /Copper pipe/)

  // A bare correction still produces no phantom item of its own.
  assert.equal(
    buildBoluContextFacts({ facts: null, userText: 'make it 20', history: [], hasActiveDraft: true }),
    '',
  )
})

test('Commercial signal detection ignores conversational prose', () => {
  assert.equal(hasCommercialListSignal('What is VAT?'), false)
  assert.equal(hasCommercialListSignal("I don't understand this transaction"), false)
  assert.equal(hasCommercialListSignal('1.5mm green 1'), true)
  assert.equal(hasCommercialListSignal('Salt 15k'), true)
  assert.equal(hasCommercialListSignal('1.5mm green 1\n2.5mm red 1\n32,000\n53,000'), true)
})

test('Legitimate multi-line evidence still pairs supplied amounts', () => {
  const evidence = formatCommercialEvidence(
    parseCommercialList(['1.5mm green 1', '2.5mm red 1', '32,000', '53,000'].join('\n')),
  )
  assert.match(evidence, /supplied: "1\.5mm green"/)
  assert.match(evidence, /presentation-only wording: "1\.5mm² green"/)
  assert.doesNotMatch(evidence, /single[- ]?core/i)
  assert.doesNotMatch(evidence, /standard description/)
  assert.match(evidence, /32000/)
  assert.match(evidence, /supplied amounts were matched/)
})

// ============================================================================
// 2. PROMPT SCOPING AND INTERNAL DETAIL
// ============================================================================

const chatPrompt = buildBoluSystemPrompt({ contextFacts: '', documentOperation: false })
const operationPrompt = buildBoluSystemPrompt({ contextFacts: '', documentOperation: true })

test('The always-on prompt describes the product and the conversational contract', () => {
  assert.match(chatPrompt, /BOURXE/)
  assert.match(chatPrompt, /invoices and quotations/)
  assert.match(BOLU_PRODUCT_CONTEXT, /Bolu is the conversational assistant/)
  assert.match(BOLU_CONVERSATIONAL_CORE, /Answer the question the user actually asked/)
  assert.match(chatPrompt, /Do not volunteer a capability or limitation inventory/)
})

test('The product description does not claim capabilities Bolu lacks', () => {
  assert.doesNotMatch(BOLU_PRODUCT_CONTEXT, /Bolu (can|also) (create|prepare|manage) (purchase orders|waybills|payments)/i)
  assert.match(BOLU_PRODUCT_CONTEXT, /only documents Bolu can prepare or change are invoices and quotations/)
})

test('A conversational turn does not receive the document payload contract', () => {
  assert.doesNotMatch(chatPrompt, /"bolu_operation"/)
  assert.doesNotMatch(chatPrompt, /Document operation instructions:/)
  assert.ok(chatPrompt.length < 6000, `chat prompt is ${chatPrompt.length} chars`)
})

test('A document operation receives the full contract and its safeguards', () => {
  assert.match(operationPrompt, /"bolu_operation"/)
  assert.match(operationPrompt, /Document operation instructions:/)
  assert.match(operationPrompt, /Gate 1/)
  assert.match(operationPrompt, /Gate 2/)
  assert.match(operationPrompt, /NEVER compute or output calculated financial totals/)
  assert.match(operationPrompt, /Never claim an operation was saved or filed without explicit user confirmation/)
  assert.ok(operationPrompt.length > chatPrompt.length)
})

test('No prompt scope leaks the internal cable example, routes or system errors', () => {
  for (const prompt of [chatPrompt, operationPrompt]) {
    assert.doesNotMatch(prompt, /1\.5mm green/)
    assert.doesNotMatch(prompt, /Single-Core Cable/)
    assert.doesNotMatch(prompt, /Route:/)
    assert.doesNotMatch(prompt, /\[SYSTEM ERROR/)
  }
})

test('Document-turn classification separates reads and greetings from operations', () => {
  assert.equal(isBoluDocumentOperationTurn([{ role: 'user', content: 'Tell me about the app' }]), false)
  assert.equal(isBoluDocumentOperationTurn([{ role: 'user', content: 'What can you do?' }]), false)
  assert.equal(isBoluDocumentOperationTurn([{ role: 'user', content: 'Show outstanding invoices' }]), false)
  assert.equal(isBoluDocumentOperationTurn([{ role: 'user', content: 'What is VAT?' }]), false)
  assert.equal(isBoluDocumentOperationTurn([{ role: 'user', content: 'Can you prepare a quotation?' }]), true)
  assert.equal(isBoluDocumentOperationTurn([{ role: 'user', content: 'Change the invoice date' }]), true)
  assert.equal(
    isBoluDocumentOperationTurn([
      { role: 'user', content: 'Create an invoice for Tecno' },
      { role: 'assistant', content: '```json\n{"bolu_operation":{"operationType":"create-document"}}\n```' },
      { role: 'user', content: 'Tecno Power Solutions' },
    ]),
    true,
  )
})

// ============================================================================
// 3. STRUCTURED FAILURES
// ============================================================================

test('A failure is brief, honest and free of imperatives', () => {
  for (const code of ['lookup_failed', 'not_authorized', 'tenant_unavailable'] as const) {
    const text = formatBoluFactFailure(code)
    assert.ok(text.length <= 120, `${code} is too long: ${text}`)
    assert.doesNotMatch(text, /outstanding|balance|nothing was changed|manual|\[|SYSTEM ERROR/i)
  }
  assert.equal(
    factsAsPrompt({ kind: 'failure', code: 'lookup_failed' }),
    'The requested records could not be retrieved.',
  )
  assert.equal(
    formatFactAnswer({ kind: 'failure', code: 'not_authorized' }, 'Show outstanding invoices'),
    'You do not have access to those records.',
  )
})

test('A failed lookup is distinct from an empty successful result', () => {
  const empty = factsAsPrompt({ kind: 'records', records: [], hasMore: false })
  assert.match(empty, /No matching records were found/)
  assert.notEqual(empty, factsAsPrompt({ kind: 'failure', code: 'lookup_failed' }))
})

test('Failure categories come only from evidence the data layer provides', () => {
  assert.equal(classifyBoluFactFailure(new Error('You do not have permission to view invoices.')), 'not_authorized')
  assert.equal(classifyBoluFactFailure(new Error('Business records are not ready yet.')), 'tenant_unavailable')
  assert.equal(classifyBoluFactFailure(new Error('socket hang up')), 'lookup_failed')
  assert.equal(classifyBoluFactFailure(undefined), 'lookup_failed')
})

// ============================================================================
// 4. FACT RELEVANCE
// ============================================================================

test('Business facts stay focused: no routes, a bounded record count', () => {
  const records = Array.from({ length: 12 }, (_, index) => record(index))
  const prompt = factsAsPrompt({ kind: 'records', records, hasMore: false })

  assert.doesNotMatch(prompt, /Route:/)
  assert.equal((prompt.match(/Number:/g) ?? []).length, MAX_PROMPT_RECORDS)
  assert.match(prompt, /More matching records exist than are shown here/)
  assert.match(prompt, /Tecno Power Solutions/)
})

test('Deterministic read answers do not print internal navigation paths', () => {
  const answer = formatFactAnswer(
    { kind: 'records', records: [record(1)], hasMore: false },
    'Show outstanding invoices',
  )
  assert.doesNotMatch(answer, /\/invoices\//)
  assert.match(answer, /INV-0001/)
})

test('An empty facts channel is explicit and does not resemble a record', () => {
  const prompt = buildBoluSystemPrompt({ contextFacts: '', documentOperation: false })
  assert.match(prompt, /No business records were retrieved for this turn\./)
})
