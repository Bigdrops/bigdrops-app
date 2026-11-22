import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CONVERSATION_STARTER_POOL,
  getConversationStarters,
  generateContextualFollowUps,
} from '@/lib/ai-assistant/bolu-suggestions'
import type { ProductionBoluMessage } from '@/lib/ai-assistant/hooks/types'
import type { BoluProposal } from '@/lib/ai-assistant/bolu-operations'
import type { BoluPageContext } from '@/lib/ai-assistant/bolu-context'

// Helper to create mock messages
function createMessage(
  role: 'user' | 'assistant',
  content: string,
  overrides: Partial<ProductionBoluMessage> = {},
): ProductionBoluMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 9)}`,
    conversationId: 'test-convo-id',
    tenantId: 'test-tenant-id',
    role,
    content,
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ── PART 1: Conversation Starters ───────────────────────────────────────────

test('Starter Pool: contains exactly all 12 approved candidate starters', () => {
  assert.equal(CONVERSATION_STARTER_POOL.length, 12)

  const expectedPrompts = [
    "I've received an RFQ containing items I don't recognise. Help me understand what they are.",
    'Help me prepare a quotation for a customer.',
    'I need help preparing an invoice for a transaction.',
    'Help me understand what this customer is requesting before I respond.',
    "I have product descriptions I don't understand. Help me identify them.",
    'Help me write clear and professional descriptions for these products.',
    'Help me organise this list of materials into proper commercial line items.',
    'Help me understand these technical specifications and what they mean.',
    'Help me work through the pricing information for an order.',
    'Help me review this commercial document for errors or unclear information.',
    'Help me prepare a professional response to this business enquiry.',
    'I have a business task I need help thinking through.',
  ]

  for (const expected of expectedPrompts) {
    const found = CONVERSATION_STARTER_POOL.some((candidate) => candidate.prompt === expected)
    assert.ok(found, `Expected starter prompt not found: "${expected}"`)
  }
})

test('Starter Pool: all 12 candidates are valid conversational entry points without autonomous execution claims', () => {
  for (const candidate of CONVERSATION_STARTER_POOL) {
    assert.ok(candidate.id && candidate.id.length > 0)
    assert.ok(candidate.title && candidate.title.length > 0)
    assert.ok(candidate.prompt && candidate.prompt.length > 0)
    assert.ok(candidate.category && candidate.category.length > 0)

    // Starters must be requests for conversational help ("Help me...", "I need help...", "I've received...")
    // and must never claim autonomous write execution or bypassing human authorization
    assert.ok(!candidate.prompt.includes('Automatically execute'))
    assert.ok(!candidate.prompt.includes('Directly charge'))
    assert.ok(!candidate.prompt.includes('Bypass review'))
  }
})

test('Starter Selection: returns between 3 and 4 suggestions for empty conversation', () => {
  const starters = getConversationStarters()
  assert.ok(starters.length >= 3 && starters.length <= 4)

  // Every returned starter belongs to the pool
  const poolPrompts = new Set(CONVERSATION_STARTER_POOL.map((p) => p.prompt))
  for (const s of starters) {
    assert.ok(poolPrompts.has(s), `Unknown starter returned: "${s}"`)
  }

  // No duplicate starters in the returned set
  const unique = new Set(starters)
  assert.equal(unique.size, starters.length)
})

test('Starter Rotation: rotates across different conversations and avoids permanently presenting the same three', () => {
  const sample1 = getConversationStarters({ conversationId: 'conversation-alpha-001' })
  const sample2 = getConversationStarters({ conversationId: 'conversation-beta-002' })
  const sample3 = getConversationStarters({ conversationId: 'conversation-gamma-003' })

  // Assert determinism within the exact same conversation
  const sample1Repeat = getConversationStarters({ conversationId: 'conversation-alpha-001' })
  assert.deepEqual(sample1, sample1Repeat)

  // Verify that not all conversations receive identical sets
  const areAllIdentical =
    JSON.stringify(sample1) === JSON.stringify(sample2) &&
    JSON.stringify(sample2) === JSON.stringify(sample3)
  assert.ok(!areAllIdentical, 'Starters should vary between different conversations')
})

test('Starter Context Prioritization: prioritizes module-relevant candidates', () => {
  const invoiceStarters = getConversationStarters({ module: 'invoice', limit: 4 })
  const quotationStarters = getConversationStarters({ module: 'quotation', limit: 4 })

  assert.ok(
    invoiceStarters.includes('I need help preparing an invoice for a transaction.'),
    'Invoice module should include invoice starter',
  )
  assert.ok(
    quotationStarters.includes('Help me prepare a quotation for a customer.'),
    'Quotation module should include quotation starter',
  )
})

// ── PART 2: Contextual Follow-up Suggestions ────────────────────────────────

test('Contextual Follow-ups: empty conversation returns zero follow-ups (starters handle empty state)', () => {
  const followUps = generateContextualFollowUps({
    messages: [],
    activeProposal: null,
  })
  assert.deepEqual(followUps, [], 'Empty thread must not produce follow-ups')
})

test('Contextual Follow-ups: active streaming suppresses suggestion generation to avoid token thrashing', () => {
  const messages = [
    createMessage('user', 'I received an RFQ for nylon sheet 50mm'),
    createMessage('assistant', 'Let me analyze the specifications...', { status: 'streaming' }),
  ]
  const followUps = generateContextualFollowUps({
    messages,
    isStreaming: true,
  })
  assert.deepEqual(followUps, [], 'Must return empty array during active streaming')
})

test('Example A — Unfamiliar RFQ: generates relevant material and market clarification follow-ups without visual claims', () => {
  const messages = [
    createMessage(
      'user',
      'I have received an RFQ containing: Nylon Extruded Sheet 50mm — Length 190mm, Width 90mm, Height 50mm. I do not recognise this item and cannot picture what is being requested.',
    ),
    createMessage(
      'assistant',
      'Nylon extruded sheet is an engineering thermoplastic known for high mechanical strength and wear resistance. However, the stated dimensions (Length 190mm, Width 90mm, Height 50mm) describe a block rather than a standard commercial plate. You should verify whether the customer requires a cut block or standard sheet.',
    ),
  ]

  const followUps = generateContextualFollowUps({ messages })
  assert.ok(followUps.length >= 2 && followUps.length <= 4)

  assert.ok(followUps.includes('Describe its physical appearance and distinguishing features.'))
  assert.ok(followUps.includes('Find its common market names in Nigeria.'))
  assert.ok(followUps.includes('What questions should I ask to confirm the specification?'))
  assert.ok(followUps.includes('How is this material normally sold and priced?'))

  // Commercial safety: zero image hallucinations
  assert.ok(!followUps.some((s) => s.toLowerCase().includes('image') || s.toLowerCase().includes('look like')))
})

test('Example B — Product Identification: generates technical identification follow-ups for unfamiliar components without image claims', () => {
  const messages = [
    createMessage('user', 'Help me identify this component: 2-inch bronze gate valve with non-rising stem class 150'),
    createMessage(
      'assistant',
      'This is an industrial bronze gate valve used in plumbing and low-pressure piping systems. The non-rising stem indicates it operates in confined vertical spaces. It is manufactured to ANSI Class 150 specifications.',
    ),
  ]

  const followUps = generateContextualFollowUps({ messages })
  assert.ok(followUps.length >= 2 && followUps.length <= 4)

  assert.ok(followUps.includes('Describe how to physically inspect and identify this component.'))
  assert.ok(followUps.includes('What alternative names do suppliers use?'))
  assert.ok(followUps.includes('What specifications should I confirm before buying?'))
  assert.ok(followUps.includes('How can I distinguish it from similar products?'))

  // Commercial safety: zero image hallucinations
  assert.ok(!followUps.some((s) => s.toLowerCase().includes('image')))
})

test('Example C — Quotation Preparation: generates document review follow-ups for pending quotation proposal', () => {
  const mockProposal = {
    opId: 'op-quote-123',
    documentFamily: 'quotation',
    operation: 'create',
    status: 'pending_approval',
    client: { status: 'resolved', client: { id: 'c-1', name: 'Dangote Industries' } },
    items: [
      {
        description: '25mm Armoured Cable 4-Core Copper',
        quantity: 100,
        unit_price: 4500,
        total_amount: 450000,
        unit: 'meters',
        row_type: 'item',
      },
    ],
  } as unknown as BoluProposal

  const messages = [
    createMessage('user', 'Prepare a quotation for Dangote Industries for 100m of 25mm 4-core cable at 4500/m'),
    createMessage(
      'assistant',
      'I have prepared a draft quotation for Dangote Industries with 1 item totalling ₦450,000. Please review the details below.',
      { proposal: mockProposal },
    ),
  ]

  const followUps = generateContextualFollowUps({
    messages,
    activeProposal: mockProposal,
  })

  assert.ok(followUps.length >= 2 && followUps.length <= 4)
  assert.ok(followUps.includes('Check whether the descriptions are sufficiently clear.'))
  assert.ok(followUps.includes('Review the quantities and units.'))
  assert.ok(followUps.includes('Identify information that still needs confirmation.'))
  assert.ok(followUps.includes('Help me review the quotation before saving it.'))
})

test('Example D — Product Description Correction: generates follow-ups when Bolu identifies a description defect', () => {
  const messages = [
    createMessage('user', 'Review this item description: 50mm sheet 190x90x50'),
    createMessage(
      'assistant',
      'The original description is ambiguous and inconsistent: specifying a 50mm sheet with a height of 50mm creates confusion about whether this is a pre-cut block or standard plate material.',
    ),
  ]

  const followUps = generateContextualFollowUps({ messages })
  assert.ok(followUps.length >= 2 && followUps.length <= 4)

  assert.ok(followUps.includes('Suggest a more accurate description.'))
  assert.ok(followUps.includes('Explain why the original description was problematic.'))
  assert.ok(followUps.includes('Does this change the identity of the product?'))
})

test('Example E — Clarification Pending: offers options without instructing to assume commercial terms', () => {
  // Case E1: Clarification in proposal
  const mockClarificationProposal = {
    opId: 'op-clarify-456',
    documentFamily: 'invoice',
    operation: 'create',
    status: 'pending_approval',
    clarification: {
      id: 'clarify-1',
      reason: 'Material dimension ambiguity',
      questions: [
        {
          id: 'q1',
          prompt: 'Is this material a pre-cut block or a standard sheet?',
          options: [
            { id: 'opt-block', label: 'Pre-cut Block (190x90x50mm)' },
            { id: 'opt-sheet', label: 'Standard Sheet (50mm thick)' },
          ],
        },
      ],
    },
    items: [],
  } as unknown as BoluProposal

  const messages = [
    createMessage('user', 'Create an invoice for 5 pieces of nylon 50mm'),
    createMessage('assistant', 'Before I can create the invoice, could you clarify whether this is block or sheet?', {
      proposal: mockClarificationProposal,
    }),
  ]

  const followUps = generateContextualFollowUps({
    messages,
    activeProposal: mockClarificationProposal,
  })

  assert.ok(followUps.length >= 2)
  assert.ok(followUps.some((s) => s.includes('Pre-cut Block') || s.includes('Standard Sheet') || s.includes('What details should I confirm with the client?')))

  // Commercial clerk integrity: never instruct to assume commercial terms or specs
  assert.ok(!followUps.some((s) => s.toLowerCase().includes('assume standard')))

  // Case E2: Clarification in prose
  const proseMessages = [
    createMessage('user', 'Draft an invoice for the electrical supplies'),
    createMessage('assistant', 'Could you clarify which customer this invoice is for and what payment terms apply?'),
  ]

  const proseFollowUps = generateContextualFollowUps({ messages: proseMessages })
  assert.ok(proseFollowUps.length >= 2)
  assert.ok(proseFollowUps.includes('What details should I confirm with the client?'))
  assert.ok(proseFollowUps.includes('Explain the available options and their differences.'))
  assert.ok(proseFollowUps.includes('What are the commercial risks if terms are not specified?'))
  assert.ok(!proseFollowUps.some((s) => s.toLowerCase().includes('assume standard')))
})

test('Invoice Preparation: generates tax, line item and payment terms review follow-ups', () => {
  const mockInvoiceProposal = {
    opId: 'op-inv-789',
    documentFamily: 'invoice',
    operation: 'create',
    status: 'pending_approval',
    items: [
      {
        description: 'Facility maintenance service',
        quantity: 1,
        unit_price: 250000,
        total_amount: 250000,
        row_type: 'item',
      },
    ],
  } as unknown as BoluProposal

  const messages = [
    createMessage('user', 'Draft an invoice for facility maintenance service ₦250,000 for Apex Towers'),
    createMessage('assistant', 'Here is the draft invoice for Apex Towers for ₦250,000.', {
      proposal: mockInvoiceProposal,
    }),
  ]

  const followUps = generateContextualFollowUps({
    messages,
    activeProposal: mockInvoiceProposal,
  })

  assert.ok(followUps.length >= 2 && followUps.length <= 4)
  assert.ok(followUps.includes('Check whether customer tax details or TIN are needed.'))
  assert.ok(followUps.includes('Review the line items and calculation before saving.'))
  assert.ok(followUps.includes('Confirm payment terms and due date.'))
})

test('User Corrections: generates verification follow-ups after user corrects an item', () => {
  const mockProposal = {
    opId: 'op-corr-001',
    documentFamily: 'invoice',
    operation: 'update',
    status: 'pending_approval',
    items: [],
  } as unknown as BoluProposal

  const messages = [
    createMessage('user', 'Change the quantity of item 1 from 10 to 15'),
    createMessage('assistant', 'I have updated the quantity of item 1 to 15. The subtotal is now recalculated.', {
      proposal: mockProposal,
    }),
  ]

  const followUps = generateContextualFollowUps({
    messages,
    activeProposal: mockProposal,
  })

  assert.ok(followUps.length >= 2)
  assert.ok(followUps.includes('Verify the updated subtotal and tax calculation.'))
  assert.ok(followUps.includes('Check if any other line items need updating.'))
})

test('Completed Tasks: prunes completed actions and never suggests creating the same document again', () => {
  // Test saved invoice
  const savedInvoiceProposal = {
    opId: 'op-saved-inv',
    documentFamily: 'invoice',
    operation: 'create',
    status: 'persisted',
    items: [],
  } as unknown as BoluProposal

  const messages = [
    createMessage('user', 'Confirm and save'),
    createMessage('assistant', 'Invoice #INV-2026-0042 has been created successfully and saved to your records.', {
      proposal: savedInvoiceProposal,
    }),
  ]

  const followUps = generateContextualFollowUps({
    messages,
    activeProposal: savedInvoiceProposal,
  })

  assert.ok(followUps.length >= 2)
  // Must NOT suggest creating or preparing the invoice again!
  assert.ok(!followUps.some((s) => s.toLowerCase().includes('help me prepare an invoice')))
  assert.ok(!followUps.some((s) => s.toLowerCase().includes('review the quotation before saving')))

  // Must suggest natural post-completion steps
  assert.ok(followUps.includes("Check the customer's outstanding balance."))
  assert.ok(followUps.includes('Explain payment tracking for this invoice.'))
})

test('No Meaningful Next Action: casual acknowledgment or concluded task returns zero suggestions', () => {
  const messages = [
    createMessage('assistant', 'Invoice #1044 is recorded. Let me know if you need anything else.'),
    createMessage('user', 'thank you'),
    createMessage('assistant', 'You are welcome! Have a productive business day.'),
  ]

  const followUps = generateContextualFollowUps({ messages })
  assert.deepEqual(followUps, [], 'Casual or concluded conversation must not force suggestions')
})

test('Deduplication: suppresses suggestions that repeat what the user already asked in recent turns', () => {
  const messages = [
    createMessage('user', 'Find its common market names in Nigeria.'),
    createMessage(
      'assistant',
      'In Nigeria, Nylon extruded sheet is commonly called "Nylon plate", "Ertalon", or "Engineering plastic sheet" among industrial traders in Ladipo and Alaba markets.',
    ),
  ]

  const followUps = generateContextualFollowUps({ messages })
  // The suggestion "Find its common market names in Nigeria." must be suppressed because the user just asked it!
  assert.ok(!followUps.includes('Find its common market names in Nigeria.'))
})

// ── PART 3: Multi-Turn Progression, Topic Shifts, and Integrity Guardrails ──

test('Mandatory Progression: 6-turn RFQ dialogue evolves from initial identification to specification to market sourcing', () => {
  // --- Turn 1 & 2: Initial discovery / dimension conflict ---
  const turn1User = createMessage(
    'user',
    'I have received an RFQ containing Nylon Extruded Sheet 50mm, Length 190mm, Width 90mm, Height 50mm. I do not recognise this item and cannot picture what is being requested.',
  )
  const turn2Bolu = createMessage(
    'assistant',
    'Nylon extruded material is an engineering thermoplastic. However, dimensions of 190mm length, 90mm width, and 50mm height appear more consistent with a pre-cut block than a conventional sheet. I recommend confirming whether the customer requires a cut block or standard plate.',
  )

  const turn2Suggestions = generateContextualFollowUps({
    messages: [turn1User, turn2Bolu],
  })

  // Stage 1: Initial Discovery / Physical Features / Clarification
  assert.ok(turn2Suggestions.includes('Describe its physical appearance and distinguishing features.'))
  assert.ok(turn2Suggestions.includes('Find its common market names in Nigeria.'))
  assert.ok(turn2Suggestions.includes('What questions should I ask to confirm the specification?'))
  assert.ok(turn2Suggestions.includes('How is this material normally sold and priced?'))
  assert.ok(!turn2Suggestions.some((s) => s.toLowerCase().includes('image') || s.toLowerCase().includes('look like')))

  // --- Turn 3 & 4: User correction (it is a block for machining a bushing) & Bolu acknowledgment ---
  const turn3User = createMessage(
    'user',
    "It's not a sheet. The client confirmed it's a pre-cut engineering nylon block for machining a prototype bushing.",
  )
  const turn4Bolu = createMessage(
    'assistant',
    'Understood. For a machining block of 190x90x50mm in engineering nylon (PA6), it will typically be cut from stock slab or plate. We should also verify whether they need natural (white) or black (MoS2-filled) nylon, as the black grade offers improved self-lubrication for bushings.',
  )

  const turn4Suggestions = generateContextualFollowUps({
    messages: [turn1User, turn2Bolu, turn3User, turn4Bolu],
  })

  // Stage 2: Specification Refinement & Clarification Acknowledged
  // The sheet vs block ambiguity is resolved and MUST NOT be repeated!
  assert.ok(!turn4Suggestions.includes('What questions should I ask to confirm the specification?'))
  assert.ok(!turn4Suggestions.includes('Describe its physical appearance and distinguishing features.'))
  assert.ok(!turn4Suggestions.includes('Find its common market names in Nigeria.'))

  // It must present the new technical uncertainties raised in Turn 4:
  assert.ok(turn4Suggestions.includes('Explain the difference between natural and black nylon.'))
  assert.ok(turn4Suggestions.includes('What material grade should I confirm before pricing?'))
  assert.ok(turn4Suggestions.includes('How is this type of block normally supplied?'))
  assert.ok(turn4Suggestions.includes('What details should I obtain before requesting supplier prices?'))

  // --- Turn 5 & 6: User asks how it is sold in Nigeria and if locally available ---
  const turn5User = createMessage(
    'user',
    'How is this material normally sold in Nigeria and is it locally available?',
  )
  const turn6Bolu = createMessage(
    'assistant',
    'In Nigeria, engineering plastics like Nylon 6 are stocked by industrial polymer stockists in major commercial markets such as Ladipo and Odunade in Lagos. They are typically sold either by weight (per kilogram) or as full standard slabs/rods, with cutting charges added for specific pre-cut block dimensions.',
  )

  const turn6Suggestions = generateContextualFollowUps({
    messages: [turn1User, turn2Bolu, turn3User, turn4Bolu, turn5User, turn6Bolu],
  })

  // Stage 3: Market Sourcing & Commercial Enquiry Preparation
  // Must advance towards quotation and procurement, NOT repeat Stage 1 or Stage 2!
  assert.ok(!turn6Suggestions.includes('Explain the difference between natural and black nylon.'))
  assert.ok(!turn6Suggestions.includes('Find its common market names in Nigeria.'))
  assert.ok(turn6Suggestions.includes('Help me prepare a supplier enquiry for this material.'))
  assert.ok(turn6Suggestions.includes('What details should I include when requesting supplier prices?'))
  assert.ok(turn6Suggestions.includes('How should I compare prices quoted by weight and by cut size?'))
  assert.ok(turn6Suggestions.includes('Help me prepare a quotation for this item.'))
})

test('Topic Shift: moving from an earlier RFQ discussion to Freight immediately clears RFQ follow-ups', () => {
  const messages = [
    // Previous RFQ turns
    createMessage('user', 'I received an RFQ for nylon sheet 190x90x50mm'),
    createMessage('assistant', 'Nylon block dimensions clarified and sourcing discussed.'),
    // Topic Shift to Freight
    createMessage('user', 'What are our standard freight costs from Lagos to Abuja?'),
    createMessage(
      'assistant',
      'Freight costs from Lagos to Abuja vary by vehicle capacity: a 5-ton truck typically ranges from ₦350,000 to ₦450,000, while dedicated haulage or courier parcel rates depend on gross weight.',
    ),
  ]

  const followUps = generateContextualFollowUps({ messages })

  // Must NOT contain RFQ follow-ups!
  assert.ok(!followUps.some((s) => s.toLowerCase().includes('nylon')))
  assert.ok(!followUps.some((s) => s.toLowerCase().includes('supplier enquiry for this material')))

  // Must present logistics / freight actions:
  assert.ok(followUps.includes('Calculate freight per unit for this shipment.'))
  assert.ok(followUps.includes('Check if freight should be billed separately on the invoice.'))
  assert.ok(followUps.includes('Help me prepare a delivery waybill.'))
})

test('Topic Shift: moving from an earlier RFQ discussion to Operating Expense yields expense follow-ups', () => {
  const messages = [
    createMessage('user', 'I received an RFQ for nylon sheet'),
    createMessage('assistant', 'Nylon discussed.'),
    // Topic Shift to Generator Diesel
    createMessage('user', 'I need to record our monthly generator diesel expense of ₦180,000'),
    createMessage(
      'assistant',
      'I can help record this ₦180,000 generator diesel expense under facility operating costs.',
    ),
  ]

  const followUps = generateContextualFollowUps({ messages })

  assert.ok(!followUps.some((s) => s.toLowerCase().includes('nylon')))
  assert.ok(followUps.includes('Record this as an operating expense.'))
  assert.ok(followUps.includes('Check which account or project should be charged.'))
  assert.ok(followUps.includes('Review monthly expense totals.'))
})

test('Topic Shift: moving to customer receivables yields account statement and balance follow-ups', () => {
  const messages = [
    createMessage('user', 'What is the outstanding balance for Dangote Industries?'),
    createMessage(
      'assistant',
      'Dangote Industries currently has an outstanding balance of ₦1,250,000 across two overdue invoices.',
    ),
  ]

  const followUps = generateContextualFollowUps({ messages })

  assert.ok(followUps.includes("Check the customer's outstanding balance."))
  assert.ok(followUps.includes('Generate a customer statement of account.'))
  assert.ok(followUps.includes('Review overdue invoice payment dates.'))
})

test('User Correction: correcting a specification or quantity triggers immediate verification suggestions', () => {
  const mockProposal = {
    opId: 'op-corr-999',
    documentFamily: 'quotation',
    operation: 'update',
    status: 'pending_approval',
    items: [],
  } as unknown as BoluProposal

  const messages = [
    createMessage('user', 'Change the quantity of item 1 from 10 to 25 and update unit price to ₦5,200'),
    createMessage(
      'assistant',
      'I have updated item 1 to 25 units at ₦5,200 each. The subtotal is now recalculated.',
      { proposal: mockProposal },
    ),
  ]

  const followUps = generateContextualFollowUps({
    messages,
    activeProposal: mockProposal,
  })

  assert.ok(followUps.includes('Verify the updated subtotal and tax calculation.'))
  assert.ok(followUps.includes('Check if any other line items need updating.'))
  assert.ok(followUps.includes('Review the revised document preview.'))
})

test('Commercial Integrity: suggestions never instruct Bolu or user to assume commercial terms or specs', () => {
  const testScenarios = [
    // Scenario 1: Prose question from assistant
    [
      createMessage('user', 'I need an invoice'),
      createMessage('assistant', 'Could you clarify the payment terms and customer details?'),
    ],
    // Scenario 2: RFQ initial inquiry
    [
      createMessage('user', 'I received an RFQ for unknown parts'),
      createMessage('assistant', 'The parts appear to be industrial valves.'),
    ],
    // Scenario 3: Tax query
    [
      createMessage('user', 'What tax applies to this equipment installation?'),
      createMessage('assistant', 'Installation services are subject to 5% WHT and 7.5% VAT.'),
    ],
  ]

  for (const msgs of testScenarios) {
    const suggestions = generateContextualFollowUps({ messages: msgs })
    for (const s of suggestions) {
      assert.ok(
        !s.toLowerCase().includes('assume standard'),
        `Found prohibited assumption prompt: "${s}"`,
      )
      assert.ok(
        !s.toLowerCase().includes('assume commercial'),
        `Found prohibited commercial assumption prompt: "${s}"`,
      )
    }
  }
})

test('Visual Safety: zero branches ever produce suggestions promising images or visual previews', () => {
  const testScenarios = [
    [
      createMessage('user', 'I received an RFQ for nylon sheet 50mm'),
      createMessage('assistant', 'Nylon extruded sheet is an engineering plastic...'),
    ],
    [
      createMessage('user', 'Identify this bronze valve'),
      createMessage('assistant', 'This is a bronze gate valve...'),
    ],
    [
      createMessage('user', 'What is this component?'),
      createMessage('assistant', 'It is an armoured copper cable...'),
    ],
  ]

  for (const msgs of testScenarios) {
    const suggestions = generateContextualFollowUps({ messages: msgs })
    for (const s of suggestions) {
      assert.ok(
        !s.toLowerCase().includes('image'),
        `Found prohibited image prompt: "${s}"`,
      )
      assert.ok(
        !s.toLowerCase().includes('look like'),
        `Found prohibited visual preview prompt: "${s}"`,
      )
    }
  }
})

test('UI Architecture: empty thread suppresses bottom suggestions tray to avoid duplicate starters', () => {
  // Empty thread simulation
  const emptyMessages: ProductionBoluMessage[] = []
  const isStarterEmpty = emptyMessages.length === 0
  const starterSuggestions = isStarterEmpty
    ? getConversationStarters({ conversationId: 'thread-empty-001' })
    : generateContextualFollowUps({ messages: emptyMessages })

  // When isStarter is true, bottom tray must be suppressed:
  const shouldRenderBottomTrayEmpty = !isStarterEmpty && starterSuggestions && starterSuggestions.length > 0
  assert.equal(shouldRenderBottomTrayEmpty, false, 'Bottom suggestions tray must NOT render on empty threads')

  // Active thread simulation
  const activeMessages = [
    createMessage('user', 'I received an RFQ for nylon sheet 50mm'),
    createMessage('assistant', 'Nylon extruded material explained.'),
  ]
  const isStarterActive = activeMessages.length === 0
  const activeFollowUps = isStarterActive
    ? getConversationStarters({ conversationId: 'thread-active-002' })
    : generateContextualFollowUps({ messages: activeMessages })

  const shouldRenderBottomTrayActive = !isStarterActive && activeFollowUps && activeFollowUps.length > 0
  assert.equal(shouldRenderBottomTrayActive, true, 'Bottom suggestions tray MUST render on active threads with follow-ups')
})
