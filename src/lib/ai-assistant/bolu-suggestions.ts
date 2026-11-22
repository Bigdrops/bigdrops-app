/**
 * bolu-suggestions.ts — Dynamic Conversation Starters & Intelligent Follow-up Suggestions
 *
 * Implements:
 * 1. Approved 12-candidate Conversation Starter Pool with deterministic, module-aware rotation.
 * 2. Intelligent, context-aware follow-up suggestion engine reflecting Bolu's capabilities
 *    as a commercial clerk (RFQ analysis, product identification, description refinement,
 *    quotation & invoice drafting, clarification handling, completed task pruning).
 * 3. Strict Two-Gate & capability guardrails (never autonomous execution, zero hallucinations).
 */

import type { ProductionBoluMessage } from './hooks/types'
import type { BoluProposal } from './bolu-operations'
import type { BoluPageContext, BoluModule } from './bolu-context'

// ── Approved Starter Candidates ─────────────────────────────────────────────

export interface ConversationStarter {
  id: string
  title: string
  prompt: string
  category: 'rfq' | 'quotation' | 'invoice' | 'requirements' | 'products' | 'descriptions' | 'materials' | 'specifications' | 'pricing' | 'review' | 'enquiry' | 'general'
  preferredModules?: BoluModule[]
}

/**
 * Authoritative 12-candidate starter pool established in specification.
 */
export const CONVERSATION_STARTER_POOL: readonly ConversationStarter[] = [
  {
    id: 'unfamiliar-rfq',
    title: 'Understand an unfamiliar RFQ',
    prompt: "I've received an RFQ containing items I don't recognise. Help me understand what they are.",
    category: 'rfq',
    preferredModules: ['dashboard', 'other'],
  },
  {
    id: 'prepare-quotation',
    title: 'Prepare a quotation',
    prompt: 'Help me prepare a quotation for a customer.',
    category: 'quotation',
    preferredModules: ['quotation', 'dashboard'],
  },
  {
    id: 'create-invoice',
    title: 'Create an invoice',
    prompt: 'I need help preparing an invoice for a transaction.',
    category: 'invoice',
    preferredModules: ['invoice', 'receivables', 'dashboard'],
  },
  {
    id: 'customer-requirements',
    title: "Understand a customer's requirements",
    prompt: 'Help me understand what this customer is requesting before I respond.',
    category: 'requirements',
    preferredModules: ['dashboard', 'other'],
  },
  {
    id: 'unfamiliar-products',
    title: 'Identify unfamiliar products',
    prompt: "I have product descriptions I don't understand. Help me identify them.",
    category: 'products',
    preferredModules: ['quotation', 'invoice', 'dashboard'],
  },
  {
    id: 'improve-descriptions',
    title: 'Improve product descriptions',
    prompt: 'Help me write clear and professional descriptions for these products.',
    category: 'descriptions',
    preferredModules: ['quotation', 'invoice'],
  },
  {
    id: 'organise-materials',
    title: 'Organise a materials list',
    prompt: 'Help me organise this list of materials into proper commercial line items.',
    category: 'materials',
    preferredModules: ['quotation', 'invoice', 'dashboard'],
  },
  {
    id: 'product-specifications',
    title: 'Understand product specifications',
    prompt: 'Help me understand these technical specifications and what they mean.',
    category: 'specifications',
    preferredModules: ['dashboard', 'other'],
  },
  {
    id: 'order-pricing',
    title: 'Work through order pricing',
    prompt: 'Help me work through the pricing information for an order.',
    category: 'pricing',
    preferredModules: ['invoice', 'quotation', 'receivables'],
  },
  {
    id: 'review-document',
    title: 'Review a business document',
    prompt: 'Help me review this commercial document for errors or unclear information.',
    category: 'review',
    preferredModules: ['report', 'invoice', 'quotation'],
  },
  {
    id: 'business-enquiry',
    title: 'Respond to a business enquiry',
    prompt: 'Help me prepare a professional response to this business enquiry.',
    category: 'enquiry',
    preferredModules: ['dashboard', 'other'],
  },
  {
    id: 'business-task',
    title: 'Get help with a business task',
    prompt: 'I have a business task I need help thinking through.',
    category: 'general',
    preferredModules: ['dashboard', 'other'],
  },
] as const

// ── Starter Rotation & Selection ────────────────────────────────────────────

export interface GetConversationStartersOptions {
  conversationId?: string | null
  module?: BoluModule | string | null
  limit?: number
  seed?: number | string
}

/**
 * Deterministic hash of string to positive 32-bit integer.
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Selects 3–4 conversation starters from the 12-candidate pool.
 * Rotates across conversations based on conversationId / seed,
 * prioritizes relevant module candidates, and guarantees variety across categories.
 */
export function getConversationStarters(options: GetConversationStartersOptions = {}): string[] {
  const limit = Math.max(2, Math.min(options.limit ?? 4, 4))
  const pool = [...CONVERSATION_STARTER_POOL]
  const targetModule = options.module as BoluModule | undefined

  // Derive stable seed
  const rawSeed = options.seed ?? options.conversationId ?? 'bouxre-default-seed'
  const numericSeed = typeof rawSeed === 'number' ? Math.abs(rawSeed) : hashString(String(rawSeed))

  // 1. Identify module-preferred candidate (if any)
  const selectedPrompts: string[] = []
  const usedIndices = new Set<number>()

  if (targetModule) {
    // Primary category match (e.g. 'invoice' -> 'create-invoice', 'quotation' -> 'prepare-quotation')
    const primaryIndex = pool.findIndex((item) => item.category === targetModule)
    if (primaryIndex !== -1) {
      selectedPrompts.push(pool[primaryIndex].prompt)
      usedIndices.add(primaryIndex)
    } else {
      const preferredIndices: number[] = []
      pool.forEach((item, index) => {
        if (item.preferredModules?.includes(targetModule)) {
          preferredIndices.push(index)
        }
      })
      if (preferredIndices.length > 0) {
        const pick = preferredIndices[numericSeed % preferredIndices.length]
        selectedPrompts.push(pool[pick].prompt)
        usedIndices.add(pick)
      }
    }
  }

  // 2. Group pool by 4 broad categories to guarantee diversity
  const groups: number[][] = [
    [0, 3, 10], // RFQ, Requirements, Enquiries
    [1, 2, 8],  // Quotations, Invoices, Pricing
    [4, 5, 6, 7], // Products, Descriptions, Materials, Specs
    [9, 11],    // Review, General Task
  ]

  // Reorder groups based on seed so different conversations start from different categories
  const groupOffset = numericSeed % groups.length
  for (let g = 0; g < groups.length && selectedPrompts.length < limit; g++) {
    const groupIdx = (groupOffset + g) % groups.length
    const candidateIndices = groups[groupIdx]
    // Within this group, pick with seed offset
    const itemOffset = Math.floor(numericSeed / (g + 1))
    for (let c = 0; c < candidateIndices.length; c++) {
      const idx = candidateIndices[(itemOffset + c) % candidateIndices.length]
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx)
        selectedPrompts.push(pool[idx].prompt)
        break
      }
    }
  }

  // Fallback if limit not reached
  if (selectedPrompts.length < limit) {
    for (let i = 0; i < pool.length && selectedPrompts.length < limit; i++) {
      const idx = (numericSeed + i) % pool.length
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx)
        selectedPrompts.push(pool[idx].prompt)
      }
    }
  }

  return selectedPrompts
}

// ── Contextual Follow-up Suggestions ────────────────────────────────────────

export interface ContextualSuggestionInput {
  messages: ProductionBoluMessage[]
  activeProposal?: BoluProposal | null
  pageContext?: BoluPageContext | null
  isStreaming?: boolean
}

/**
 * Checks whether user message text already covers or asks for a given suggestion.
 */
function isSimilarToRecentUserMessage(suggestion: string, recentUserTexts: string[]): boolean {
  const normS = suggestion.toLowerCase().replace(/[^a-z0-9]/g, '')
  return recentUserTexts.some((uText) => {
    const normU = uText.toLowerCase().replace(/[^a-z0-9]/g, '')
    return normU.includes(normS) || normS.includes(normU)
  })
}

/**
 * Intelligent context-aware follow-up suggestion generator.
 * Analyzes:
 * - Active document operations (proposals in pending_approval, approved_pending_save, persisted).
 * - Recent conversation focus (sliding window of latest 3-4 turns).
 * - Progression stages in RFQ / material discussions (Discovery -> Spec Refinement -> Market Sourcing).
 * - Topic shifts (detects transitions to freight, operating expenses, customer receivables).
 * - User corrections (triggers calculation verification and review).
 * - Clarification states (guides client confirmation without assuming commercial terms).
 * - Completed operations (prunes already-persisted actions).
 * - Concluded dialogues (suppresses suggestions on casual closing).
 *
 * Safety & Integrity:
 * - Strictly text-based; never hallucinates image search, generation, or preview capabilities.
 * - Commercial integrity: Never advises assuming commercial terms or specifications.
 * - Pure synchronous pure function: zero async race conditions or token thrashing.
 *
 * Returns 2–4 targeted suggestions, or [] if no meaningful next step exists.
 */
export function generateContextualFollowUps(input: ContextualSuggestionInput): string[] {
  const { messages, activeProposal, isStreaming } = input

  // Never generate suggestions during active streaming or on empty threads
  if (isStreaming || !messages || messages.length === 0) {
    return []
  }

  // Collect user messages and last assistant message
  const userMessages = messages.filter((m) => m.role === 'user')
  const assistantMessages = messages.filter((m) => m.role === 'assistant')
  const lastAssistant = assistantMessages[assistantMessages.length - 1]
  const lastUser = userMessages[userMessages.length - 1]

  if (!lastAssistant) {
    return []
  }

  const lastAssistantContent = (lastAssistant.content || '').toLowerCase()
  const lastUserContent = (lastUser?.content || '').toLowerCase()
  const fullConversationHistory = messages.map((m) => m.content.toLowerCase()).join(' ')
  const recentMessages = messages.slice(-4)
  const recentHistory = recentMessages.map((m) => m.content.toLowerCase()).join(' ')
  const recentUserTexts = userMessages.slice(-3).map((m) => m.content)

  // ── Priority 1: Casual conversation or concluded task ──
  const isCasualOrConcluded =
    lastUserContent === 'thank you' ||
    lastUserContent === 'thanks' ||
    lastUserContent === 'ok' ||
    lastUserContent === 'okay' ||
    lastUserContent === 'all good' ||
    lastUserContent === 'that is all' ||
    lastUserContent === "that's all" ||
    lastUserContent === 'no, that is all' ||
    lastUserContent === "no, that's all"

  if (isCasualOrConcluded) {
    // No meaningful next action: display none!
    return []
  }

  // ── Priority 2: Completed Document Operations ──
  const isProposalSaved =
    activeProposal?.status === 'persisted' ||
    lastAssistantContent.includes('saved successfully') ||
    lastAssistantContent.includes('created successfully') ||
    (lastAssistantContent.includes('invoice #') && lastAssistantContent.includes('saved')) ||
    (lastAssistantContent.includes('quotation #') && lastAssistantContent.includes('saved'))

  if (isProposalSaved) {
    // If an invoice or quotation was just saved, offer natural post-completion steps
    const isInvoice = activeProposal?.documentFamily === 'invoice' || lastAssistantContent.includes('invoice')
    if (isInvoice) {
      return [
        "Check the customer's outstanding balance.",
        'Explain payment tracking for this invoice.',
        'Show me the invoice summary.',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
    }
    // Quotation post-save
    return [
      'Draft an invoice from this quotation.',
      'Check customer contact details.',
      'Review quotation validity and payment terms.',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
  }

  // ── Priority 3: Clarification Pending from Bolu ──
  const clarification = activeProposal && 'clarification' in activeProposal ? activeProposal.clarification : undefined
  const hasPendingProposalClarification = Boolean(
    activeProposal?.status === 'pending_approval' &&
    clarification?.questions &&
    clarification.questions.length > 0,
  )

  if (hasPendingProposalClarification && clarification) {
    const q = clarification.questions[0]
    const suggestions: string[] = []
    if (q.options && q.options.length > 0) {
      q.options.slice(0, 3).forEach((opt) => {
        suggestions.push(`Use ${opt.label}`)
      })
    }
    suggestions.push('What details should I confirm with the client?')
    suggestions.push('Explain the specification options and their differences.')
    return suggestions.filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 4)
  }

  // ── Priority 4: User Corrections with Active Proposal ──
  const isUserCorrection =
    lastUserContent.includes('change') ||
    lastUserContent.includes('update') ||
    lastUserContent.includes('correct') ||
    lastUserContent.includes('remove') ||
    lastUserContent.includes('instead of') ||
    lastUserContent.includes("it's not") ||
    lastUserContent.includes('it is not')

  if (isUserCorrection && activeProposal) {
    return [
      'Verify the updated subtotal and tax calculation.',
      'Check if any other line items need updating.',
      'Review the revised document preview.',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
  }

  // ── Priority 5: Active Proposal in Review / Save Mode ──
  if (activeProposal?.documentFamily === 'quotation') {
    if (activeProposal.status === 'pending_approval') {
      const suggestions = [
        'Check whether the descriptions are sufficiently clear.',
        'Review the quantities and units.',
        'Identify information that still needs confirmation.',
        'Help me review the quotation before saving it.',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts))
      return suggestions.slice(0, 4)
    }

    if (activeProposal.status === 'approved_pending_save') {
      return [
        'Confirm and save this quotation.',
        'Make one final check on pricing before saving.',
        'Return to review to modify line items.',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
    }
  }

  if (activeProposal?.documentFamily === 'invoice') {
    if (activeProposal.status === 'pending_approval') {
      const suggestions = [
        'Check whether customer tax details or TIN are needed.',
        'Review the line items and calculation before saving.',
        'Confirm payment terms and due date.',
        'Help me review the invoice before saving it.',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts))
      return suggestions.slice(0, 4)
    }

    if (activeProposal.status === 'approved_pending_save') {
      return [
        'Confirm and save this invoice.',
        'Check invoice due date before saving.',
        'Return to review to change line items.',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
    }
  }

  // ── Priority 6: Topic Shift away from earlier material/RFQ topics ──
  // If no active proposal binds the conversation to earlier topics, check if the recent turns
  // have shifted to an entirely different business domain (Freight, Operating Expenses, Receivables).
  if (!activeProposal) {
    const isFreightTopic =
      recentHistory.includes('freight') ||
      recentHistory.includes('haulage') ||
      recentHistory.includes('waybill') ||
      recentHistory.includes('lagos to abuja') ||
      (recentHistory.includes('shipping') && !recentHistory.includes('nylon')) ||
      (recentHistory.includes('transport') && !recentHistory.includes('nylon')) ||
      recentHistory.includes('delivery cost')

    if (isFreightTopic) {
      return [
        'Calculate freight per unit for this shipment.',
        'Check if freight should be billed separately on the invoice.',
        'Help me prepare a delivery waybill.',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
    }

    const isExpenseTopic =
      recentHistory.includes('diesel') ||
      recentHistory.includes('generator') ||
      recentHistory.includes('utility') ||
      recentHistory.includes('electricity') ||
      recentHistory.includes('office expense') ||
      recentHistory.includes('operating expense')

    if (isExpenseTopic) {
      return [
        'Record this as an operating expense.',
        'Check which account or project should be charged.',
        'Review monthly expense totals.',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
    }

    const isCustomerBalanceTopic =
      recentHistory.includes('outstanding balance') ||
      recentHistory.includes('statement of account') ||
      recentHistory.includes('how much does') ||
      recentHistory.includes('receivable') ||
      recentHistory.includes('debtor')

    if (isCustomerBalanceTopic) {
      return [
        "Check the customer's outstanding balance.",
        'Generate a customer statement of account.',
        'Review overdue invoice payment dates.',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
    }
  }

  // ── Priority 7: Material / RFQ Consultation Progression ──
  const isMaterialOrRfqFocus =
    recentHistory.includes('nylon') ||
    recentHistory.includes('rfq') ||
    recentHistory.includes('extruded') ||
    recentHistory.includes('engineering plastic') ||
    recentHistory.includes('machining') ||
    recentHistory.includes('bushing') ||
    (fullConversationHistory.includes('rfq') &&
      (lastAssistantContent.includes('material') ||
       lastAssistantContent.includes('dimension') ||
       lastAssistantContent.includes('supplier') ||
       lastAssistantContent.includes('stockist') ||
       lastAssistantContent.includes('cut') ||
       lastAssistantContent.includes('pricing') ||
       lastUserContent.includes('material') ||
       lastUserContent.includes('locally available')))

  if (isMaterialOrRfqFocus && !activeProposal) {
    // Stage 3: Market Sourcing, Availability, and Supplier Enquiry
    const isSourcingStage =
      recentHistory.includes('sold in nigeria') ||
      recentHistory.includes('locally available') ||
      recentHistory.includes('local availability') ||
      recentHistory.includes('ladipo') ||
      recentHistory.includes('odunade') ||
      recentHistory.includes('stockist') ||
      recentHistory.includes('sold by weight') ||
      recentHistory.includes('per kg') ||
      recentHistory.includes('selling format') ||
      lastUserContent.includes('available') ||
      lastAssistantContent.includes('stockist') ||
      lastAssistantContent.includes('ladipo')

    if (isSourcingStage) {
      return [
        'Help me prepare a supplier enquiry for this material.',
        'What details should I include when requesting supplier prices?',
        'How should I compare prices quoted by weight and by cut size?',
        'Help me prepare a quotation for this item.',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 4)
    }

    // Stage 2: Specification Refinement & Clarification Acknowledged
    const isSpecClarifiedStage =
      (recentHistory.includes('block') || recentHistory.includes('machining') || recentHistory.includes('bushing')) &&
      (recentHistory.includes('natural') || recentHistory.includes('black') || recentHistory.includes('mos2') ||
       recentHistory.includes('grade') || recentHistory.includes('pa6') || recentHistory.includes('cut from') ||
       lastUserContent.includes('not a sheet') || lastUserContent.includes('confirmed it') ||
       lastAssistantContent.includes('machining block'))

    if (isSpecClarifiedStage) {
      return [
        'Explain the difference between natural and black nylon.',
        'What material grade should I confirm before pricing?',
        'How is this type of block normally supplied?',
        'What details should I obtain before requesting supplier prices?',
      ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 4)
    }

    // Stage 1: Initial Discovery / Unfamiliar RFQ / Dimension Inconsistency
    return [
      'Describe its physical appearance and distinguishing features.',
      'Find its common market names in Nigeria.',
      'What questions should I ask to confirm the specification?',
      'How is this material normally sold and priced?',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 4)
  }

  // ── Priority 8: General Product Identification (Other Industrial Components) ──
  const isProductIdentification =
    (recentHistory.includes('identify') || recentHistory.includes('what is') || recentHistory.includes('component') || recentHistory.includes('valve') || recentHistory.includes('specification')) &&
    (lastAssistantContent.includes('component') || lastAssistantContent.includes('material') || lastAssistantContent.includes('manufactured') || lastAssistantContent.includes('used for') || lastAssistantContent.includes('valve'))

  if (isProductIdentification && !activeProposal) {
    return [
      'Describe how to physically inspect and identify this component.',
      'What alternative names do suppliers use?',
      'What specifications should I confirm before buying?',
      'How can I distinguish it from similar products?',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 4)
  }

  // ── Priority 9: Product Description Correction ──
  const isDescriptionCorrection =
    lastAssistantContent.includes('description') &&
    (lastAssistantContent.includes('ambiguous') ||
     lastAssistantContent.includes('problem') ||
     lastAssistantContent.includes('standardize') ||
     lastAssistantContent.includes('inconsistent') ||
     lastAssistantContent.includes('unclear') ||
     lastAssistantContent.includes('shorthand') ||
     lastUserContent.includes('description'))

  if (isDescriptionCorrection) {
    return [
      'Suggest a more accurate description.',
      'Explain why the original description was problematic.',
      'Does this change the identity of the product?',
      'Check whether other items have similar description issues.',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 4)
  }

  // ── Priority 10: Assistant Asked a Question in Prose ──
  const assistantAskedQuestion =
    lastAssistant.content.includes('?') &&
    (lastAssistantContent.includes('could you clarify') ||
     lastAssistantContent.includes('please confirm') ||
     lastAssistantContent.includes('would you like') ||
     lastAssistantContent.includes('do you want') ||
     lastAssistantContent.includes('is this') ||
     lastAssistantContent.includes('which customer') ||
     lastAssistantContent.includes('please provide'))

  if (assistantAskedQuestion && !activeProposal) {
    return [
      'What details should I confirm with the client?',
      'Explain the available options and their differences.',
      'What are the commercial risks if terms are not specified?',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
  }

  // ── Priority 11: General Tax Discussion (VAT / WHT) ──
  if (recentHistory.includes('vat') || recentHistory.includes('withholding') || recentHistory.includes('tax')) {
    return [
      'Explain the statutory withholding rate for this service.',
      'Check if VAT applies to these items.',
      'Draft a quotation with standard tax rates.',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
  }

  // ── Priority 12: Materials List Organization ──
  if (recentHistory.includes('materials') || lastUserContent.includes('list') || lastAssistantContent.includes('line items')) {
    return [
      'Pair unit prices with each line item.',
      'Group related items by commercial category.',
      'Check if any material specifications are incomplete.',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
  }

  // ── Priority 13: General Quotation or Invoice Discussion (Without Active Proposal) ──
  if (recentHistory.includes('quotation') || recentHistory.includes('quote')) {
    return [
      'Help me prepare a quotation for a customer.',
      'Review the pricing structure for this quote.',
      'Check what payment terms should be proposed.',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
  }

  if (recentHistory.includes('invoice') || recentHistory.includes('bill')) {
    return [
      'Help me prepare an invoice for this transaction.',
      'Check customer tax details and payment terms.',
      'Review the line items before drafting.',
    ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts)).slice(0, 3)
  }

  // ── Default Fallback: General Business Enquiry ──
  return [
    'Help me prepare a document from this discussion.',
    'Check if any key commercial details are missing.',
  ].filter((s) => !isSimilarToRecentUserMessage(s, recentUserTexts))
}
