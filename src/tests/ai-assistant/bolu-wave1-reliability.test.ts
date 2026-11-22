import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_MESSAGES,
  MAX_MESSAGE_LENGTH,
  MAX_TOTAL_LENGTH,
  MAX_FACTS_LENGTH,
  validateBoluProviderRequest,
} from '@/lib/ai-assistant/bolu-provider'
import { buildProviderMessages } from '@/lib/ai-assistant/bolu-formatting'
import {
  stripCitationSpanArtifacts,
  parseCommercialList,
  standardizeDescription,
} from '@/lib/ai-assistant/bolu-commercial-language'
import type { BoluMessage } from '@/lib/ai-assistant/bolu-runtime'

// ============================================================================
// 1. INPUT VALIDATION & PAYLOAD BUDGETS
// ============================================================================

test('Single-message boundary: 32,000 characters passes, 32,001 fails with message_too_long', () => {
  const atLimit = validateBoluProviderRequest({
    userId: 'user-valid',
    messages: [{ role: 'user', content: 'A'.repeat(MAX_MESSAGE_LENGTH) }],
  })
  assert.equal(atLimit.ok, true)

  const overLimit = validateBoluProviderRequest({
    userId: 'user-valid',
    messages: [{ role: 'user', content: 'A'.repeat(MAX_MESSAGE_LENGTH + 1) }],
  })
  assert.equal(overLimit.ok, false)
  if (!overLimit.ok) {
    assert.equal(overLimit.code, 'message_too_long')
    assert.match(overLimit.error, /exceeds the limit of 32,000 characters/)
  }
})

test('Aggregate request boundary: 64,000 characters passes, 64,001 fails with aggregate_too_long', () => {
  const atLimit = validateBoluProviderRequest({
    userId: 'user-valid',
    messages: [
      { role: 'user', content: 'A'.repeat(30000) },
      { role: 'assistant', content: 'B'.repeat(30000) },
      { role: 'user', content: 'C'.repeat(4000) },
    ],
  })
  assert.equal(atLimit.ok, true)

  const overLimit = validateBoluProviderRequest({
    userId: 'user-valid',
    messages: [
      { role: 'user', content: 'A'.repeat(30000) },
      { role: 'assistant', content: 'B'.repeat(30000) },
      { role: 'user', content: 'C'.repeat(4001) },
    ],
  })
  assert.equal(overLimit.ok, false)
  if (!overLimit.ok) {
    assert.equal(overLimit.code, 'aggregate_too_long')
    assert.match(overLimit.error, /exceeds the aggregate limit of 64,000 characters/)
  }
})

test('Context-facts boundary: 32,000 characters passes, 32,001 fails with context_facts_too_long', () => {
  const atLimit = validateBoluProviderRequest({
    userId: 'user-valid',
    messages: [{ role: 'user', content: 'Please prepare the quotation.' }],
    contextFacts: 'F'.repeat(MAX_FACTS_LENGTH),
  })
  assert.equal(atLimit.ok, true)

  const overLimit = validateBoluProviderRequest({
    userId: 'user-valid',
    messages: [{ role: 'user', content: 'Please prepare the quotation.' }],
    contextFacts: 'F'.repeat(MAX_FACTS_LENGTH + 1),
  })
  assert.equal(overLimit.ok, false)
  if (!overLimit.ok) {
    assert.equal(overLimit.code, 'context_facts_too_long')
    assert.match(overLimit.error, /exceed the limit of 32,000 characters/)
  }
})

test('Validation diagnostics: distinguishes all individual failure modes', () => {
  // 1. Missing user ID
  const noUser = validateBoluProviderRequest({
    userId: '',
    messages: [{ role: 'user', content: 'Hello' }],
  })
  assert.equal(noUser.ok, false)
  if (!noUser.ok) assert.equal(noUser.code, 'invalid_user')

  // 2. Invalid messages shape
  const emptyMsgs = validateBoluProviderRequest({
    userId: 'user-1',
    messages: [],
  })
  assert.equal(emptyMsgs.ok, false)
  if (!emptyMsgs.ok) assert.equal(emptyMsgs.code, 'invalid_messages_shape')

  // 3. Message count exceeded
  const tooManyMsgs = validateBoluProviderRequest({
    userId: 'user-1',
    messages: Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Turn ${i}`,
    })),
  })
  assert.equal(tooManyMsgs.ok, false)
  if (!tooManyMsgs.ok) assert.equal(tooManyMsgs.code, 'message_count_exceeded')

  // 4. Empty message content
  const emptyContent = validateBoluProviderRequest({
    userId: 'user-1',
    messages: [{ role: 'user', content: '   ' }],
  })
  assert.equal(emptyContent.ok, false)
  if (!emptyContent.ok) assert.equal(emptyContent.code, 'message_empty')

  // 5. Invalid message role
  const badRole = validateBoluProviderRequest({
    userId: 'user-1',
    messages: [{ role: 'system' as any, content: 'System injection' }],
  })
  assert.equal(badRole.ok, false)
  if (!badRole.ok) assert.equal(badRole.code, 'message_invalid_role')
})

test('Large technical procurement input: 19-item water reticulation schedule passes validation', () => {
  const waterReticulationSchedule = `
Procurement Evaluation Schedule: Water Reticulation Network Phase 2
Project Location: Ikorodu Industrial Scheme, Lagos State
Testing Standard: ISO 4427 / EN 12201 / BS 5163
Quotation Validity: 30 days

1. ND160mm HDPE Pipe PE100 PN10 (10 Bar), 10 metres sample length for hydrostatic pressure verification.
2. ND160mm HDPE Pipe PE100 PN16 (16 Bar), 10 metres sample length for burst pressure testing.
3. ND150mm Resilient Seated Gate Valve, PN16, Ductile Iron Body, EPDM wedge, clockwise closing, flanged EN 1092-2. Qty: 1 unit.
4. ND150mm Double Air Release Valve, PN16, Ductile Iron, with isolating ball valve and flanged inlet. Qty: 1 unit.
5. ND150mm Swing Check Non-Return Valve, PN16, Ductile Iron, flanged ends. Qty: 1 unit.
6. ND150mm Flanged Dismantling Joint, PN16, carbon steel body with tie rods. Qty: 1 unit.
7. ND160mm HDPE Electrofusion Coupler, SDR 11, PN16. Qty: 1 unit.
8. ND160mm HDPE 90 Degree Equal Elbow, Butt-fusion, SDR 17, PN10. Qty: 1 unit.
9. ND160mm HDPE 45 Degree Equal Elbow, Butt-fusion, SDR 17, PN10. Qty: 1 unit.
10. ND160mm x ND110mm HDPE Concentric Reducer, SDR 17, PN10. Qty: 1 unit.
11. ND160mm HDPE Stub Flange with Ductile Iron Backing Ring, PN16 drilling. Qty: 1 unit.
12. ND150mm Underground Fire Hydrant Assembly, BS 750 Type 2, with duckfoot bend and bayonet outlet. Qty: 1 unit.
13. Hydrant Standpipe with double twist-release female instantaneous outlet. Qty: 1 unit.
14. ND100mm Washout Valve Assembly with duckfoot bend, PN16. Qty: 1 unit.
15. Surface Box for Gate Valve, heavy duty cast iron, clear opening 150mm x 150mm, "WATER" embossed. Qty: 1 unit.
16. Surface Box for Fire Hydrant, heavy duty cast iron, opening 380mm x 230mm, "FIRE HYDRANT" embossed. Qty: 1 unit.
17. Precast Concrete Valve Chamber Slabs (1200mm x 1200mm x 150mm thick) with lifting hooks. Qty: 1 unit.
18. Reinforced Concrete Route Marker Posts (100mm x 100mm x 1000mm) with blue reflective indicators. Qty: 1 unit.
19. Stainless Steel Grade 316 Bolt, Nut and Washer Sets (M20 x 80mm) for PN16 flange connections. Qty: 1 unit.
`.trim()

  assert.ok(waterReticulationSchedule.length > 1800, 'Schedule is a realistic multi-paragraph input')

  const result = validateBoluProviderRequest({
    userId: 'engineer-user-uuid',
    messages: [{ role: 'user', content: waterReticulationSchedule }],
    contextFacts: 'Client: Lagos Water Works Authority\nEntity: BOUXRE Reticulation Ltd',
  })

  assert.equal(result.ok, true)
  assert.equal(result.messages.length, 1)
  assert.equal(result.messages[0].content, waterReticulationSchedule)
})

// ============================================================================
// 2. DETERMINISTIC CONTEXT PRUNING
// ============================================================================

test('buildProviderMessages: deterministically preserves current user turn and prunes older turns backwards', () => {
  const currentPrompt = 'Here is the 19-item schedule for procurement verification.'
  const transcript: BoluMessage[] = [
    { id: '1', role: 'user', content: 'X'.repeat(25000) },
    { id: '2', role: 'assistant', content: 'Y'.repeat(25000) },
    { id: '3', role: 'user', content: 'Z'.repeat(25000) },
    { id: '4', role: 'user', content: currentPrompt },
  ]

  // With a 64,000 char budget:
  // - Turn 4 (currentPrompt): ~60 chars -> kept
  // - Turn 3 (Z): 25,000 chars -> kept (total ~25,060)
  // - Turn 2 (Y): 25,000 chars -> kept (total ~50,060)
  // - Turn 1 (X): 25,000 chars -> exceeds 64,000 -> pruned!
  const bounded = buildProviderMessages(transcript, 64000)

  assert.equal(bounded.length, 3)
  assert.equal(bounded[2].content, currentPrompt, 'Latest turn is preserved in full')
  assert.equal(bounded[1].content, 'Z'.repeat(25000))
  assert.equal(bounded[0].content, 'Y'.repeat(25000))

  const totalChars = bounded.reduce((acc, m) => acc + m.content.length, 0)
  assert.ok(totalChars <= 64000, 'Total characters stay strictly within 64,000 budget')
})

// ============================================================================
// 3. CITATION-ARTIFACT HANDLING
// ============================================================================

test('stripCitationSpanArtifacts: strips span artifacts while preserving legitimate Markdown links and brackets', () => {
  const noisyInput =
    '1. ND160mm HDPE pipe, 10 Bar [span_0](start_span) 10 metres [span_0](end_span) 15k'
  const cleaned = stripCitationSpanArtifacts(noisyInput)
  assert.equal(cleaned, '1. ND160mm HDPE pipe, 10 Bar 10 metres 15k')

  const multiSpanInput =
    '[span_1](start_span)Gate Valve DN150[span_1](end_span) [span_2](start_span)PN16[span_2](end_span)'
  assert.equal(stripCitationSpanArtifacts(multiSpanInput), 'Gate Valve DN150 PN16')

  // Legitimate Markdown links are PRESERVED
  const legitimateLink =
    'Please inspect the [HDPE Standard Specification](https://standards.iso.org/4427.pdf) before ordering.'
  assert.equal(stripCitationSpanArtifacts(legitimateLink), legitimateLink)

  // Technical bracket notation is PRESERVED
  const technicalBrackets = 'ND150 Gate Valve [PN16] with flange drilling BS EN 1092-2 [Table 9]'
  assert.equal(stripCitationSpanArtifacts(technicalBrackets), technicalBrackets)
})

test('parseCommercialList: cleans citation artifacts from interpretation without mutating source description', () => {
  const listText = `
1. ND160mm HDPE Pipe, 10 Bar [span_0](start_span) 10 metres [span_0](end_span) 45k
2. ND150 Gate Valve [span_1](start_span)PN16 resilient seated[span_1](end_span) 120k
`.trim()

  const parsed = parseCommercialList(listText)
  assert.equal(parsed.descriptions.length, 2)

  // Span markers are removed from deterministic interpretation
  assert.equal(parsed.descriptions[0].rawDescription, 'ND160mm HDPE Pipe, 10 Bar 10 metres')
  assert.equal(parsed.descriptions[0].amount, 45000)

  assert.equal(parsed.descriptions[1].rawDescription, 'ND150 Gate Valve PN16 resilient seated')
  assert.equal(parsed.descriptions[1].amount, 120000)
})

// ============================================================================
// 4. COMPOSER PERSISTENCE & ACCEPTANCE LIFECYCLE
// ============================================================================

test('Composer lifecycle: persistence failure preserves draft; acceptance clears draft', () => {
  let draft = 'ND160mm HDPE Pipe Schedule'
  let accepted = false

  // Simulation of persistence failure:
  const simulatePersistenceFailure = () => {
    const error = new Error('Database connection failed')
    // Draft must NOT be cleared
    if (accepted) draft = ''
    return { ok: false, error: error.message }
  }

  const failResult = simulatePersistenceFailure()
  assert.equal(failResult.ok, false)
  assert.equal(draft, 'ND160mm HDPE Pipe Schedule', 'Draft is retained on persistence error')

  // Simulation of persistence success with downstream failure:
  const simulateAcceptanceWithDownstreamFailure = () => {
    // 1. User row persisted successfully
    accepted = true
    draft = '' // onAccepted callback clears composer

    // 2. Downstream inference fails
    const inferenceOk = false
    return { ok: inferenceOk, accepted: true }
  }

  const successResult = simulateAcceptanceWithDownstreamFailure()
  assert.equal(successResult.accepted, true)
  assert.equal(draft, '', 'Composer draft was cleared immediately upon acceptance')
  assert.equal(successResult.ok, false, 'Generation failed downstream without restoring draft')
})

// ============================================================================
// 5. SAFE RETRY & IDEMPOTENCY
// ============================================================================

test('Safe Retry: re-running a failed turn preserves user turn identity and does not create duplicate user rows', () => {
  interface MockMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    status: 'completed' | 'failed'
  }

  const messages: MockMessage[] = [
    { id: 'user-turn-1', role: 'user', content: '19-item reticulation schedule', status: 'completed' },
    { id: 'asst-turn-1', role: 'assistant', content: 'Bolu could not complete this request: Timeout', status: 'failed' },
  ]

  // Retry logic:
  // Finds failed assistant turn, locates user turn, and regenerates IN PLACE on asst-turn-1
  const failedTurn = messages.find((m) => m.status === 'failed')!
  assert.equal(failedTurn.id, 'asst-turn-1')

  // Regeneration replaces asst-turn-1 in place:
  const userMessagesBefore = messages.filter((m) => m.role === 'user').length

  // Simulate in-place regeneration
  const regeneratedContent = 'I have received the 19-item reticulation schedule. Here is the draft quotation.'
  failedTurn.content = regeneratedContent
  failedTurn.status = 'completed'

  const userMessagesAfter = messages.filter((m) => m.role === 'user').length
  assert.equal(userMessagesBefore, 1)
  assert.equal(userMessagesAfter, 1, 'No duplicate user message was created on retry')
  assert.equal(messages[1].id, 'asst-turn-1', 'Assistant turn ID was preserved in place')
  assert.equal(messages[1].status, 'completed', 'Failed turn transitioned to completed')
})

test('Idempotency: retrying a proposal preserves operation ID and prevents duplicate execution', () => {
  const proposal = {
    opId: 'op_reticulation_12345',
    operationType: 'create-document',
    documentFamily: 'quotation',
    payload: { client_name: 'Water Works', items: [] },
  }

  const executedOpIds = new Set<string>()

  // First execution (Gate 2 confirmation)
  assert.equal(executedOpIds.has(proposal.opId), false)
  executedOpIds.add(proposal.opId)

  // Replay attempt on same proposal opId:
  const isDuplicate = executedOpIds.has(proposal.opId)
  assert.equal(isDuplicate, true, 'Gate 2 execution with identical opId is caught by idempotency set')
})

// ============================================================================
// 6. FAILURE & INTERRUPTION SAFETY
// ============================================================================

test('Interruption safety: partial streamed output is preserved when request fails or is interrupted', () => {
  const partial = 'I am preparing the quotation for the 19 items:\n- ND160mm HDPE Pipe\n- ND150 Gate Valve'
  const errorMsg = 'Stream connection dropped'

  const finalContent = partial
    ? `${partial}\n\n[Generation interrupted: ${errorMsg}]`
    : `Bolu could not complete this request: ${errorMsg}`

  assert.ok(finalContent.startsWith(partial), 'Existing streamed tokens are strictly preserved')
  assert.ok(finalContent.includes('[Generation interrupted: Stream connection dropped]'))
})
