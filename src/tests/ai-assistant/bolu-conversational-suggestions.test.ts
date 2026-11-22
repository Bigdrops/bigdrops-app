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

test('Example A — Unfamiliar RFQ: generates relevant material and market clarification follow-ups', () => {
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

  assert.ok(followUps.includes('Show me what this material might look like.'))
  assert.ok(followUps.includes('Find its common market names in Nigeria.'))
  assert.ok(followUps.includes('What questions should I ask to confirm the specification?'))
  assert.ok(followUps.includes('How is this material normally sold and priced?'))
})

test('Example B — Product Identification: generates technical identification follow-ups for unfamiliar components', () => {
  const messages = [
    createMessage('user', 'Help me identify this component: 2-inch bronze gate valve with non-rising stem class 150'),
    createMessage(
      'assistant',
      'This is an industrial bronze gate valve used in plumbing and low-pressure piping systems. The non-rising stem indicates it operates in confined vertical spaces. It is manufactured to ANSI Class 150 specifications.',
    ),
  ]

  const followUps = generateContextualFollowUps({ messages })
  assert.ok(followUps.length >= 2 && followUps.length <= 4)

  assert.ok(followUps.includes('Show me reference images of this component.'))
  assert.ok(followUps.includes('What alternative names do suppliers use?'))
  assert.ok(followUps.includes('What specifications should I confirm before buying?'))
  assert.ok(followUps.includes('How can I distinguish it from similar products?'))
})

test('Example C — Quotation Preparation: generates document review follow-ups for pending quotation proposal', () => {
  const mockProposal: BoluProposal = {
    operation_id: 'op-quote-123',
    documentType: 'quotation',
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
  }

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

test('Example E — Clarification Pending: offers options when Bolu asks a question in proposal or prose', () => {
  // Case E1: Clarification in proposal
  const mockClarificationProposal: BoluProposal = {
    operation_id: 'op-clarify-456',
    documentType: 'invoice',
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
  }

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
  assert.ok(followUps.some((s) => s.includes('Pre-cut Block') || s.includes('Standard Sheet') || s.includes('Why is this specification needed?')))
})

test('Invoice Preparation: generates tax, line item and payment terms review follow-ups', () => {
  const mockInvoiceProposal: BoluProposal = {
    operation_id: 'op-inv-789',
    documentType: 'invoice',
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
  }

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
  const mockProposal: BoluProposal = {
    operation_id: 'op-corr-001',
    documentType: 'invoice',
    operation: 'update',
    status: 'pending_approval',
    items: [],
  }

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
  const savedInvoiceProposal: BoluProposal = {
    operation_id: 'op-saved-inv',
    documentType: 'invoice',
    operation: 'create',
    status: 'saved',
    items: [],
  }

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
