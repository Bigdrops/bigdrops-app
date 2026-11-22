# BOURXE Bolu — Dynamic Conversation Starters & Intelligent Follow-up Suggestions

**Document Type:** Implementation & Acceptance Report  
**Date:** 2026-11-22  
**Author:** Antigravity Agent  
**Status:** Completed  
**Repository Working Tree:** `main` (all pre-existing files and user changes strictly preserved)

---

## 1. Executive Summary

### 1.1 What Was Implemented

1. **Approved 12-Candidate Conversation Starter Pool:**
   - Established the authoritative 12-candidate starter pool in `src/lib/ai-assistant/bolu-suggestions.ts` (`CONVERSATION_STARTER_POOL`), completely replacing the former three hardcoded suggestions.
   - Built a deterministic starter selection and rotation engine (`getConversationStarters`) that:
     - Selects 3–4 starters per session.
     - Derives a stable selection from conversation identity / seed so suggestions vary between different conversations while remaining stable within the same session.
     - Prioritizes module-relevant candidates (e.g. invoice creation when opening from Invoices, quotation preparation when opening from Quotations).
     - Groups starters across diverse categories (transactions, RFQs/requirements, technical materials/specs, business review) to guarantee variety.
   - Rendered starters in the empty welcome thread card (`assistant-chat-thread.tsx`) and in the suggestion tray below the composer (`BoluChatWorkspace.tsx`).

2. **Intelligent, Context-Aware Follow-up Suggestions:**
   - Created the contextual suggestion engine (`generateContextualFollowUps`) in `src/lib/ai-assistant/bolu-suggestions.ts`.
   - Generates 2–4 targeted, relevant suggestions based on actual conversation state, including:
     - **Example A (Unfamiliar RFQ / Materials):** When an RFQ or inconsistent dimensions (e.g. Nylon Extruded Sheet 50mm) are discussed, suggests reference visualization, common Nigerian market trade names (e.g. Ertalon / engineering plastic), specification confirmation questions, and commercial pricing methods.
     - **Example B (Product Identification):** When Bolu identifies an industrial component or technical material, suggests reference imagery, supplier alternate names, pre-purchase checklist questions, and differentiation from similar products.
     - **Example C (Quotation Preparation):** When customer details or item descriptions are supplied, suggests description clarity review, quantity/unit checks, confirmation of missing details, and pre-save quotation review.
     - **Example D (Product Description Correction):** When Bolu detects description defects, shorthand, or ambiguity, suggests accurate wording, explanation of the defect, and checking whether product identity changes.
     - **Example E (Clarification Pending):** When Bolu or the pending proposal asks a question, suggests structured answers, "Why is this specification needed?", or assuming standard commercial terms.
     - **Invoice Preparation & Review:** Offers tax TIN verification, line item calculation review, payment terms confirmation, and pre-save invoice checks.
     - **User Corrections:** Prompts verification of updated subtotals, tax recalculations, and revised document previews.
     - **Completed Tasks (Pruning & Negative Guardrails):** Once a document is saved (`persisted`), suppresses document creation suggestions and surfaces natural post-completion steps (e.g. customer outstanding balance, payment tracking, drafting invoice from quotation).
     - **No Meaningful Next Action:** When conversation concludes (e.g. "thank you", "all good"), returns `[]` (hides suggestions without empty containers).

3. **Placement, Interaction, and Two-Gate Safety:**
   - Integrated the suggestions bar in `src/components/ai-assistant/chat/BoluChatWorkspace.tsx` directly below the conversation composer across all four responsive viewports.
   - Preserved `assistant-chat-composer.tsx` input bar cleanliness (no inline chip clutter inside the textarea form).
   - Selecting any suggestion invokes `handleSend(suggestion)`, flowing naturally through standard message persistence, validation, streaming inference, and Gate 1 / Gate 2 human verification.
   - Never writes to the database directly and never bypasses human approval.

4. **Testing and Verification:**
   - Authored 17 targeted unit tests in `src/tests/ai-assistant/bolu-conversational-suggestions.test.ts`.
   - Verified 175 passing tests across all 13 Bolu test suites (0 failures).
   - Confirmed static load audit (`bun run audit:load`) with 0 blocking errors.
   - Confirmed TypeScript typecheck (`bun run typecheck`) with 0 errors.

---

## 2. Conversation Starters Pool & Rotation Mechanics

### 2.1 The 12 Approved Candidates

The starter pool in `CONVERSATION_STARTER_POOL` strictly encodes the 12 approved candidate entry points:

| # | Title | Prompt Text | Category | Preferred Module |
|---|---|---|---|---|
| 1 | Understand an unfamiliar RFQ | *"I've received an RFQ containing items I don't recognise. Help me understand what they are."* | `rfq` | Dashboard, Other |
| 2 | Prepare a quotation | *"Help me prepare a quotation for a customer."* | `quotation` | Quotation, Dashboard |
| 3 | Create an invoice | *"I need help preparing an invoice for a transaction."* | `invoice` | Invoice, Receivables |
| 4 | Understand a customer's requirements | *"Help me understand what this customer is requesting before I respond."* | `requirements` | Dashboard, Other |
| 5 | Identify unfamiliar products | *"I have product descriptions I don't understand. Help me identify them."* | `products` | Quotation, Invoice |
| 6 | Improve product descriptions | *"Help me write clear and professional descriptions for these products."* | `descriptions` | Quotation, Invoice |
| 7 | Organise a materials list | *"Help me organise this list of materials into proper commercial line items."* | `materials` | Quotation, Invoice |
| 8 | Understand product specifications | *"Help me understand these technical specifications and what they mean."* | `specifications` | Dashboard, Other |
| 9 | Work through order pricing | *"Help me work through the pricing information for an order."* | `pricing` | Invoice, Quotation |
| 10 | Review a business document | *"Help me review this commercial document for errors or unclear information."* | `review` | Report, Invoice |
| 11 | Respond to a business enquiry | *"Help me prepare a professional response to this business enquiry."* | `enquiry` | Dashboard, Other |
| 12 | Get help with a business task | *"I have a business task I need help thinking through."* | `general` | Dashboard, Other |

### 2.2 Rotation & Selection Engine

Function: `getConversationStarters(options)`
- **Determinism:** Hashes the `conversationId` into a stable numeric seed. Starters remain consistent on re-renders within the same thread.
- **Rotation:** Across different conversations, the seed shifts group offsets, guaranteeing that fresh conversations see varied combinations rather than the same static three.
- **Module Relevance:** If `options.module` is provided (e.g. `'invoice'` or `'quotation'`), the engine guarantees the primary document candidate for that module is prioritized in the first slot.
- **Category Balancing:** The remaining slots are filled from distinct category buckets (`[RFQ, Requirements, Enquiries]`, `[Quotations, Invoices, Pricing]`, `[Products, Descriptions, Materials, Specs]`, `[Review, General]`), preventing clustering of identical task types.
- **Boundary Clamping:** Returns exactly 3 to 4 suggestions (configurable via `limit`).

---

## 3. Intelligent Contextual Follow-up Generation

### 3.1 Architecture & Decision Flow

Rather than making costly, ungrounded external LLM calls to guess follow-ups, `generateContextualFollowUps` implements a deterministic, multi-tiered contextual analyzer:

```
[Conversation Thread State]
       │
       ├─► Is Streaming active? ──► YES ──► Return [] (suppress during generation)
       │
       ├─► Messages empty? ──────► YES ──► Return [] (starters handle empty state)
       │
       ├─► Proposal status == 'persisted'?
       │         └──► YES ──► Offer post-save actions (balances, tracking, invoice from quote)
       │
       ├─► Clarification pending in proposal or prose?
       │         └──► YES ──► Offer clarification options or specification justification
       │
       ├─► Unfamiliar RFQ / Inconsistent dimensions detected?
       │         └──► YES ──► Offer reference imagery, Nigerian market names, spec questions, pricing
       │
       ├─► Component / Product identification in progress?
       │         └──► YES ──► Offer reference images, alternative names, spec checklist
       │
       ├─► Description defect / shorthand detected?
       │         └──► YES ──► Offer accurate wording, defect explanation, identity verification
       │
       ├─► User performed correction/edit on active draft?
       │         └──► YES ──► Offer tax recalculation check, remaining line item check, preview review
       │
       ├─► Active quotation proposal pending?
       │         └──► YES ──► Offer description clarity check, quantity/unit review, pre-save check
       │
       ├─► Active invoice proposal pending?
       │         └──► YES ──► Offer customer tax/TIN check, calculation review, payment terms confirmation
       │
       ├─► Casual acknowledgment / Task concluded?
       │         └──► YES ──► Return [] (zero suggestions, clean interface)
       │
       └─► General business query?
                 └──► Return bounded commercial next steps (document drafting, missing detail check)
```

### 3.2 Deduplication and Completed Task Pruning

1. **Suppression of Already-Asked Turns:**
   The function compares candidate suggestions against the user's recent turns using normalized character matching. If the user already asked "Find its common market names in Nigeria", that suggestion is eliminated from the returned follow-ups.
2. **Completed Task Suppression:**
   Once a proposal moves to `'persisted'` (Gate 2 save completed), the system forbids proposing "Help me create an invoice" or "Help me review the quotation before saving". It transitions to post-transaction ledger inquiries.

---

## 4. Bolu Capability Constraints and Security Boundaries

Suggestions are strictly constrained to Bolu's actual capabilities as an operations assistant:

1. **No Autonomous Database Writes:**
   Suggestions are plain prompt strings submitted as user turns. Clicking a suggestion chip executes `handleSend(text)`, triggering the standard agent pipeline. It never writes directly to PostgreSQL.
2. **Strict Two-Gate Preservation:**
   Proposals resulting from suggestions (e.g. clicking "Help me prepare an invoice") enter Gate 1 (`pending_approval`). Explicit user confirmation (Gate 2) is always required before database insertion.
3. **Financial Source of Truth:**
   Suggestions never calculate or alter invoice totals. Financial computation remains governed exclusively by `Calculations.ts`.
4. **No Unsupported Integrations:**
   The system never suggests automated email delivery, banking API transfers, WhatsApp broadcasts, or direct supplier procurement, as Bolu does not possess those external integrations.

---

## 5. UI Placement and Responsive 4-Viewport Verification

### 5.1 Placement Hierarchy

Suggestions are placed in `src/components/ai-assistant/chat/BoluChatWorkspace.tsx` directly below the conversation composer:
```
[Header: Assistant title, Model Pill, Action Menu]
[Thread: Message history or Empty Welcome Card]
[Negotiation: Model fallback negotiation banner]
[Composer: Textarea, Auto-resize, Send/Stop controls]
[Suggestions Tray: Dynamic Chips (Starters or Follow-ups)]
```

### 5.2 Four Viewport Adaptation

1. **Mobile / Fold Closed (< 640px):**
   - The tray renders with `-webkit-overflow-scrolling: touch` and `overflow-x: auto no-scrollbar`.
   - Suggestion chips have a max-width of 280px with clean text truncation, preventing layout disruption.
   - Touch targets are 36px height with generous padding (12px horizontal) and active scale feedback (`active:scale-95`).
2. **Fold Open (640px – 768px):**
   - Chips expand to `sm:max-w-[340px]`.
   - Tray remains thumb-accessible at the base of the conversation pane.
3. **Tablet (768px – 1024px):**
   - Renders cleanly below the composer within the center conversation pane, side-by-side with the collapsible history rail.
4. **Desktop (> 1024px):**
   - Displays with crisp hover states (`hover:border-[var(--ac-accent)] hover:bg-[var(--ac-accent-soft)]`).
   - Accessible tooltips (`title={sug}`) display full prompt text for truncated strings.

---

## 6. Files Changed

| File | Change Description |
| :--- | :--- |
| `src/lib/ai-assistant/bolu-suggestions.ts` | Authoritative 12-candidate starter pool, deterministic rotation, and intelligent context-aware follow-up suggestion engine. |
| `src/components/ai-assistant/chat/BoluChatWorkspace.tsx` | Wire dynamic suggestions (starters when empty, follow-ups when active) into dedicated tray below composer in all 4 viewports. |
| `src/components/ai-assistant/chat/assistant-chat-thread.tsx` | Update empty welcome card (`ac-empty`) to render starters from the approved pool instead of hardcoded 4 strings. |
| `src/components/ai-assistant/chat/assistant-chat.css` | Add styling for `.ac-suggestions-bar`, `.ac-suggestions-tray`, and `.ac-suggest-chip`. |
| `src/components/ai-assistant/chat/assistant-chat-premium-dark.css` | Dark mode styling for `.dark .ac-suggest-chip`. |
| `src/lib/ai-assistant/bolu-commercial-language.ts` | Ensure presentation-only explanatory header is conditionally included only when presentation changes exist. |
| `src/tests/ai-assistant/bolu-conversational-suggestions.test.ts` | 17 comprehensive unit tests for starters pool, rotation, module weighting, and all 5 contextual follow-up examples. |

---

## 7. Test and Verification Evidence

### 7.1 Test Suites Executed

```bash
# 1. New Conversational Suggestions Test Suite
bun test src/tests/ai-assistant/bolu-conversational-suggestions.test.ts
# Result: 17 pass, 0 fail (203ms)

# 2. Comprehensive Bolu Test Suite (13 test files)
bun test src/tests/ai-assistant/bolu-wave1-reliability.test.ts \
         src/tests/ai-assistant/bolu-wave2-android-ux.test.ts \
         src/tests/ai-assistant/bolu-sse-metrics-transport.test.ts \
         src/tests/ai-assistant/bolu-conversational-behaviour.test.ts \
         src/tests/ai-assistant/bolu-conversational-suggestions.test.ts \
         src/tests/ai-assistant/bolu-context.test.js \
         src/tests/ai-assistant/bolu-provider.test.js \
         src/tests/ai-assistant/bolu-commercial-and-gate-lifecycle.test.js \
         src/tests/ai-assistant/bolu-chat-interaction-enhancement.test.ts \
         src/tests/ai-assistant/bolu-model-manager-and-picker.test.ts \
         src/tests/ai-assistant/bolu-advance-thread-flow.test.js \
         src/tests/ai-assistant/bolu-operational-remediation.test.ts \
         src/tests/ai-assistant/bolu-stage-3a1-integrity.test.js
# Result: 175 pass, 0 fail (1052ms)
```

### 7.2 Performance & Load Audit

```bash
bun run audit:load
# Result: Exit code 0. Scanned 1,155 files. Zero blocking errors.
```

### 7.3 TypeScript Typecheck

```bash
bun run typecheck (tsc --noEmit)
# Result: Exit code 0. Zero diagnostic errors.
```

### 7.4 Production Build Prohibition
In accordance with repository governance, `bun run build` was deliberately not executed on the 4 GB RAM constrained host.

---

## 8. Remaining Limitations & Future Considerations

1. **Physical Device Touch Testing:**
   While horizontal scrolling and touch target sizes (36px–44px) meet Android and Material Design standards in code and responsive DOM tests, manual verification on physical Android 14/15 handsets is recommended during final staging.
2. **Multi-Item Ambiguity Disambiguation:**
   When an RFQ contains 20+ distinct unfamiliar items simultaneously, the follow-up suggestions currently address the primary or first ambiguous material. Future enhancements could allow users to cycle suggestions per line item.

---

## 9. Final Status

**Completed**

All authorized requirements for the 12-candidate starter pool, rotation, and intelligent contextual follow-up generation have been delivered and verified with 175 passing tests, zero load-risk regressions, and zero TypeScript errors.
