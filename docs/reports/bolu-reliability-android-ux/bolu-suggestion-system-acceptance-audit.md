# BOURXE Bolu — Dynamic Suggestions Independent Acceptance Audit

**Report Date:** 2026-11-22  
**Auditor:** Antigravity (Independent Read-Only Reviewer)  
**Target:** Conversation starters and contextual follow-up suggestion system  
**Implementation Under Review:** [bolu-suggestion-system-implementation.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/bolu-reliability-android-ux/bolu-suggestion-system-implementation.md)  
**Authorization Mode:** Read-Only Audit (Zero code, test, configuration, database, or Git mutations)  
**Documentation Standard:** ASD-STE100 Simplified Technical English & BOURXE Repository Governance  

---

## 1. Executive Summary

This independent acceptance audit reviews the conversation starters and contextual follow-up suggestion system implemented for Bolu, BOURXE's AI business operations clerk. The audit evaluates whether Bolu genuinely understands ongoing conversation context to propose actionable, commercially sound next steps, or whether the system relies on static keyword heuristics that produce irrelevant, repeated, or unsupported suggestions.

### Acceptance Outcome: ACCEPTED WITH LIMITATIONS

The implementation delivers a functional, deterministic conversation starter architecture, integrates a dedicated suggestions tray below the composer across all four responsive viewports, preserves Two-Gate financial transaction safeguards, and safely handles message dispatch. However, the contextual follow-up engine has four material technical and commercial limitations that require remediation before broad commercial release:

1. **Unsupported Capability Hallucinations (High Severity):** The suggestion engine generates prompts asking Bolu to display reference images ("Show me reference images of this component", "Show me what this material might look like"). Bolu possesses neither an image generation tool, an external image search tool, nor an image rendering UI in chat.
2. **Commercial Clerk Integrity Risk (High Severity):** In clarification flows, the engine generates suggestions stating "Assume standard commercial specification" ([bolu-suggestions.ts#L321](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L321)) and "Assume standard commercial terms" ([bolu-suggestions.ts#L454](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L454)). In Nigerian SME trade, commercial terms (withholding tax rates, advance payments, delivery terms, material grades) must be verified, never assumed.
3. **Multi-Turn RFQ Contextual Stagnation (Medium Severity):** The contextual engine evaluates substring presence across the cumulative conversation history rather than tracking topic progression or resolution. In multi-turn RFQ conversations, Turn 2 suggestions persist across Turns 3, 4, and 5 even when the user clarifies product identity (e.g. from sheet to machining block) or shifts focus to pricing and local market availability.
4. **Empty Thread Dual-Rendering (Medium Severity):** When a conversation has no messages, conversation starters are rendered simultaneously in the thread welcome card (`.ac-empty`) and in the bottom tray below the composer (`.ac-suggestions-bar`), producing redundant visual clutter on initial load.

All 17 dedicated unit tests pass, and all 175 Bolu subsystem tests pass. `bun run audit:load` and `bun run typecheck` run cleanly with zero errors. The core starter and proposal review follow-up systems operate reliably and safely.

---

## 2. Audit Scope and Evidence

### 2.1 Inspection Scope
The audit inspected the actual working tree implementation without altering any files:
- Suggestion engine: [src/lib/ai-assistant/bolu-suggestions.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts)
- Main chat container: [src/components/ai-assistant/chat/BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx)
- Thread and empty state: [src/components/ai-assistant/chat/assistant-chat-thread.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-thread.tsx)
- Composer integration: [src/components/ai-assistant/chat/assistant-chat-composer.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-composer.tsx)
- Styling: [src/components/ai-assistant/chat/assistant-chat.css](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat.css) and [src/components/ai-assistant/chat/assistant-chat-premium-dark.css](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-premium-dark.css)
- Unit tests: [src/tests/ai-assistant/bolu-conversational-suggestions.test.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-conversational-suggestions.test.ts)
- Integration surfaces: [src/lib/ai-assistant/bolu-operations.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-operations.ts), [src/lib/ai-assistant/bolu-data.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-data.ts), [src/lib/ai-assistant/bolu-context.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-context.ts), [src/lib/Calculations.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/Calculations.ts).

### 2.2 Classification of Statements
To ensure analytical rigor, all statements in this report use the following taxonomy:
- **[DECISION]**: Approved requirements established by project governance or product specification.
- **[OBSERVATION]**: Verified implementation behaviour observed directly in code or test execution.
- **[REFERENCE]**: Prior audit findings, documentation, or implementation claims.
- **[PROPOSAL]**: Recommended engineering corrections for subsequent implementation waves.

---

## 3. Approved Requirements

| Category | Requirement ID | Requirement Description | Status |
| :--- | :--- | :--- | :--- |
| **Starters** | `REQ-START-01` | Replace former 3 hardcoded suggestions with a pool of at least 12 starters | **VERIFIED** |
| **Starters** | `REQ-START-02` | Display 3–4 starters at a time on empty threads | **VERIFIED** |
| **Starters** | `REQ-START-03` | Vary suggestions across fresh conversations via deterministic rotation | **VERIFIED** |
| **Starters** | `REQ-START-04` | Prioritize starters matching user's current module context | **VERIFIED** |
| **Starters** | `REQ-START-05` | Selecting a starter submits an ordinary conversational message | **VERIFIED** |
| **Follow-ups** | `REQ-FOLW-01` | Generate suggestions dynamically from ongoing conversation context | **PARTIAL** |
| **Follow-ups** | `REQ-FOLW-02` | Display 2–4 targeted suggestions when actionable next steps exist | **VERIFIED** |
| **Follow-ups** | `REQ-FOLW-03` | Suppress suggestions when no meaningful next action exists (e.g. casual closing) | **VERIFIED** |
| **Follow-ups** | `REQ-FOLW-04` | Suppress suggestions during active streaming to prevent token thrashing | **VERIFIED** |
| **Follow-ups** | `REQ-FOLW-05` | Account for user corrections and invalidate stale interpretations | **DEFECTIVE** |
| **Follow-ups** | `REQ-FOLW-06` | Never suggest unsupported capabilities (e.g. image generation/search) | **DEFECTIVE** |
| **Integrity** | `REQ-INTG-01` | Zero direct business database writes; preserve Two-Gate proposal lifecycle | **VERIFIED** |
| **Integrity** | `REQ-INTG-02` | Preserve financial calculations within `Calculations.ts` | **VERIFIED** |
| **Integrity** | `REQ-INTG-03` | Never prompt the user or assistant to invent or assume commercial terms | **DEFECTIVE** |
| **UI** | `REQ-UI-01` | Place suggestions tray below the conversation composer across all 4 viewports | **VERIFIED** |
| **UI** | `REQ-UI-02` | Eliminate duplicate suggestion containers on initial empty state | **DEFECTIVE** |

---

## 4. Verified Starter Pool Behaviour

### 4.1 Pool Inventory and Quality
[OBSERVATION] The starter pool is defined in [src/lib/ai-assistant/bolu-suggestions.ts#L45-L162](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L45-L162) as `CONVERSATION_STARTER_POOL`. It contains exactly 12 candidate records:

1. `starter-rfq-unfamiliar`: "I've received an RFQ containing items I don't recognise. Help me understand what they are." (RFQ / Procurement)
2. `starter-quotation-prepare`: "Help me prepare a quotation for a customer." (Sales / Quotation)
3. `starter-invoice-prepare`: "I need help preparing an invoice for a transaction." (Invoicing / Finance)
4. `starter-customer-request`: "Help me understand what this customer is requesting before I respond." (Customer Communication)
5. `starter-product-id`: "I have product descriptions I don't understand. Help me identify them." (Product Identification)
6. `starter-description-refine`: "Help me write clear and professional descriptions for these products." (Catalog / Description)
7. `starter-materials-organize`: "Help me organise this list of materials into proper commercial line items." (Materials / BOQ)
8. `starter-specs-interpret`: "Help me understand these technical specifications and what they mean." (Technical Specifications)
9. `starter-pricing-clarify`: "Help me work through the pricing information for an order." (Pricing / Costing)
10. `starter-doc-review`: "Help me review this commercial document for errors or unclear information." (Document Review)
11. `starter-general-enquiry`: "Help me prepare a professional response to this business enquiry." (Commercial Communication)
12. `starter-commercial-thinking`: "I have a business task I need help thinking through." (General SME Thinking Partner)

[OBSERVATION] Every starter is phrased as a conversational request for clerk assistance ("Help me...", "I need help..."). None claim autonomous write execution, direct database modification, or bypassing human approval.

### 4.2 Deterministic Selection and Rotation
[OBSERVATION] The selection function `getConversationStarters()` ([bolu-suggestions.ts#L173-L218](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L173-L218)) accepts `{ conversationId?: string; module?: string; limit?: number }`:
- Determinism: A hash of `conversationId` generates a numeric offset (`numericSeed`). For a given conversation, the exact same starters are returned on every re-render.
- Variation: Different conversation IDs produce different starter sets, preventing the user from seeing the identical three starters in perpetuity.
- Module Prioritization: When `module` is supplied (e.g. `invoice` or `quotation`), candidates matching `candidate.modules.includes(module)` are prepended to the selection before general candidates.
- Limit: Defaults to 4 candidates, fulfilling `REQ-START-02`.

### 4.3 Empty Thread Duplicate Rendering Defect
[OBSERVATION] Inspection of [BoluChatWorkspace.tsx#L424-L445](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L424-L445) and [assistant-chat-thread.tsx#L182-L208](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-thread.tsx#L182-L208) reveals a UI duplication bug:
1. When `messages.length === 0`, `isStarter` is true. `BoluChatWorkspace` computes `suggestions` via `getConversationStarters()`.
2. `BoluChatWorkspace` passes `suggestions` to `<AssistantThread defaultSuggestions={suggestions} />`. Inside `AssistantThread`, the `.ac-empty` card renders the 4 starter buttons in the center of the screen.
3. Simultaneously, `BoluChatWorkspace` renders `suggestionsNode` right below `<AssistantComposer />` containing the identical 4 starter chips in `.ac-suggestions-bar`.
4. The user sees the same 4 conversation starters displayed twice on the initial empty view: once in the middle hero card, and once in the bottom tray.

---

## 5. Contextual Follow-up Intelligence Assessment

### 5.1 Architecture: Heuristics vs Conversational Semantics
[OBSERVATION] `generateContextualFollowUps()` in [src/lib/ai-assistant/bolu-suggestions.ts#L250-L536](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L250-L536) is an entirely deterministic, rule-based heuristic function. It does **not** invoke an LLM, vector similarity model, or semantic parser to evaluate the conversation.

The function operates through the following sequence:
1. **Streaming Guard:** If `isStreaming` is true or `messages` is empty, returns `[]`.
2. **Text Normalization:** Extracts `lastAssistantContent = lastAssistant.content.toLowerCase()`, `lastUserContent = lastUser.content.toLowerCase()`, and `fullConversationHistory = messages.map(m => m.content.toLowerCase()).join(' ')`.
3. **Cascading `if/else` Heuristic Blocks:**
   - Saved Document Operations (`status === 'persisted'` or text matches).
   - Proposal Clarification Questions (`hasPendingProposalClarification`).
   - Unfamiliar RFQ / Inconsistent Specs (`isRfqContext`).
   - Product Identification (`isProductIdentification`).
   - Product Description Correction (`isDescriptionCorrection`).
   - User Corrections & Edits (`isUserCorrection && activeProposal`).
   - Quotation Review & Save (`isQuotationMode && activeProposal`).
   - Invoice Review & Save (`isInvoiceMode && activeProposal`).
   - Assistant Prose Questions (`assistantAskedQuestion`).
   - General Tax Discussion (`fullConversationHistory.includes('tax' | 'vat' | 'withholding')`).
   - Materials List (`materials` | `line items`).
   - Casual / Concluded Task (`thank you`, `that's all`, etc. -> returns `[]`).
   - Default Fallback (returns 2 general document preparation prompts).

### 5.2 Failure Modes of the Heuristic Approach
While pure heuristics avoid asynchronous latency and token costs, the implementation exhibits specific failure modes:
1. **Cumulative History Pollution:** Variables like `isRfqContext`, `isProductIdentification`, and `isQuotationMode` inspect `fullConversationHistory.includes(...)`. Once an RFQ term (e.g. "rfq", "nylon", "sheet") appears anywhere in the thread, `isRfqContext` remains true for the entire life of the conversation.
2. **Topic Shift Blindness:** If a user finishes an RFQ consultation and begins discussing facility rent or freight logistics, the RFQ branch can continue capturing the conversation if the assistant mentions "dimension" or "sheet".
3. **No Resolution Tracking:** The engine cannot tell whether an inconsistency identified in Turn 2 was resolved in Turn 3. It continues suggesting the same initial questions.

---

## 6. Multi-turn RFQ Scenario Results

To address the core acceptance question regarding the unfamiliar-RFQ workflow, the audit traced the 5-turn sequence specified in the governing requirements against `generateContextualFollowUps()`.

### Turn 1 — User
- **User Input:** *"I have received an RFQ containing: Nylon Extruded Sheet 50mm (Length 190mm, Width 90mm, Height 50mm). I do not recognise this item and cannot picture what is being requested."*
- **Assistant State:** Assistant has not yet replied.
- **Engine Execution:** `messages.filter(m => m.role === 'assistant')` is empty. Line 266 triggers: `if (!lastAssistant) return []`.
- **Suggestions Produced:** `[]`. Correct: No suggestions before Bolu responds.

### Turn 2 — Bolu
- **Assistant Output:** *"Nylon extruded sheet is an engineering thermoplastic known for high mechanical strength and wear resistance. However, the stated dimensions (Length 190mm, Width 90mm, Height 50mm) describe a block rather than a standard commercial plate or sheet. You should verify whether the customer requires a cut block or standard sheet."*
- **Engine Execution:**
  - `fullConversationHistory` contains "rfq", "nylon", "extruded sheet", "dimension".
  - `lastAssistantContent` contains "nylon", "sheet", "dimension".
  - `isRfqContext` evaluates to `true`.
- **Suggestions Produced:**
  1. *"Show me what this material might look like."*
  2. *"Find its common market names in Nigeria."*
  3. *"What questions should I ask to confirm the specification?"*
  4. *"How is this material normally sold and priced?"*
- **Audit Assessment:** Relevant to the initial query, but Suggestion 1 advertises an unsupported visual capability (see Section 7).

### Turn 3 — User
- **User Input:** *"It's not a sheet. The client confirmed it's a pre-cut engineering nylon block for machining a prototype bushing."*
- **Assistant State:** User has submitted; assistant is about to respond.
- **Engine Execution during user drafting:** While the user types, suggestions from Turn 2 remain static until Bolu replies.

### Turn 4 — Bolu
- **Assistant Output:** *"Understood. For a machining block of 190mm x 90mm x 50mm (Nylon 6 / PA6), it will typically be cut from cast or extruded stock. We still need to confirm whether they need natural (white) or black (MoS2-filled) nylon, as this affects self-lubrication and pricing."*
- **Engine Execution:**
  - `fullConversationHistory` STILL contains "rfq", "nylon", "sheet", "extruded sheet".
  - `lastAssistantContent` contains "nylon", "block", "pricing".
  - `isRfqContext` evaluates to `true`!
  - `lastAssistantContent.includes('nylon')` is `true`.
  - Suggestions candidate list: `['Show me what this material might look like.', 'Find its common market names in Nigeria.', 'What questions should I ask to confirm the specification?', 'How is this material normally sold and priced?']`.
  - User text in Turn 3 ("It's not a sheet...") does not match `isSimilarToRecentUserMessage` for any of the 4 suggestions.
- **Suggestions Produced:**
  1. *"Show me what this material might look like."*
  2. *"Find its common market names in Nigeria."*
  3. *"What questions should I ask to confirm the specification?"*
  4. *"How is this material normally sold and priced?"*
- **Audit Assessment: STAGNANT.** The engine returned the exact same four suggestions as Turn 2. It failed to adapt to the fact that the "sheet vs block" ambiguity was already resolved. It did not generate follow-ups about nylon grade (Natural vs MoS2 black) or machining tolerances.

### Turn 5 — User
- **User Input:** *"How is this material normally sold in Nigeria and is it locally available?"*
- **Bolu Output (Turn 6):** *"In Nigeria, nylon engineering plastics are stocked by specialized industrial polymer suppliers in markets like Ladipo and Odunade in Lagos. They are typically sold either by weight (per kilogram) or as whole standard slabs/rods, with cutting charges applied for specific block cuts."*
- **Engine Execution:**
  - `isRfqContext` is STILL `true`.
  - `recentUserTexts` includes "How is this material normally sold in Nigeria and is it locally available?".
  - `isSimilarToRecentUserMessage("How is this material normally sold and priced?", recentUserTexts)` matches and filters out Suggestion 4.
  - The remaining 3 suggestions are returned:
- **Suggestions Produced:**
  1. *"Show me what this material might look like."*
  2. *"Find its common market names in Nigeria."*
  3. *"What questions should I ask to confirm the specification?"*
- **Audit Assessment: DEFECTIVE.** After 5 turns where the material is identified, clarified as a machining block, and its Nigerian market availability discussed, the engine STILL suggests:
  - "Show me what this material might look like" (unsupported visual capability).
  - "Find its common market names in Nigeria" (already discussed).
  - "What questions should I ask to confirm the specification?" (repeating Turn 2 prompt).
  It fails to suggest realistic commercial next steps, such as drafting a request for supplier quotes, pricing by weight, or creating a quotation draft.

---

## 7. Capability Accuracy Matrix

[DECISION] Suggestions must only propose operations that Bolu can legitimately perform. Suggesting non-existent capabilities erodes user trust and violates commercial software standards.

| Suggested Capability / Action | Implementation Evidence | Actual Support Level | Safe to Suggest? | Audit Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **"Show me reference images of this component."** ([bolu-suggestions.ts#L353](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L353)) | None. Bolu has no image generation or image search tool. | **UNSUPPORTED** | **NO** | **DEFECT (High)**: Hallucinates visual generation/search capability. |
| **"Show me what this material might look like."** ([bolu-suggestions.ts#L329](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L329)) | None. Bolu is a text-only assistant without image tools. | **UNSUPPORTED** | **NO** | **DEFECT (High)**: Hallucinates visual preview capability. |
| **"Find its common market names in Nigeria."** ([bolu-suggestions.ts#L330](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L330)) | LLM general parametric knowledge (e.g. Ertalon, Ladipo market). | **CONVERSATIONAL REASONING** | **YES** | **SUPPORTED**: Conversational explanation only. Does not claim live API. |
| **"What alternative names do suppliers use?"** ([bolu-suggestions.ts#L354](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L354)) | LLM general parametric knowledge of trade nomenclature. | **CONVERSATIONAL REASONING** | **YES** | **SUPPORTED**: Safe conversational prompt. |
| **"Check the customer's outstanding balance."** ([bolu-suggestions.ts#L286](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L286)) | Backed by `bolu-data.ts` read-receivables query on client ledger. | **RECORD RETRIEVAL** | **YES** | **SUPPORTED**: Integrated with BOURXE customer financial ledger. |
| **"Explain payment tracking for this invoice."** ([bolu-suggestions.ts#L287](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L287)) | Explains BOURXE invoice payment status and ledger recording. | **CONVERSATIONAL REASONING** | **YES** | **SUPPORTED**: Legitimate procedural guidance. |
| **"Draft an invoice from this quotation."** ([bolu-suggestions.ts#L294](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L294)) | Backed by conversational proposal formulation (`bolu-operations.ts`). | **CONVERSATIONAL PROPOSAL** | **YES** | **SUPPORTED**: Generates proposal for Gate 1 review. |
| **"Check whether customer tax details or TIN are needed."** ([bolu-suggestions.ts#L432](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L432)) | Checks client record fields and explains statutory FIRS rules. | **RECORD RETRIEVAL + REASONING** | **YES** | **SUPPORTED**: Local record check. Does not claim live FIRS portal validation. |
| **"Verify the updated subtotal and tax calculation."** ([bolu-suggestions.ts#L384](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L384)) | Backed by `Calculations.ts` subtotal/VAT/WHT calculation pipeline. | **FULL APPLICATION INTEGRATION** | **YES** | **SUPPORTED**: Strict financial boundary adherence. |
| **"Assume standard commercial specification."** ([bolu-suggestions.ts#L321](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L321)) | Invites invention of missing technical specifications. | **UNSAFE ACTION** | **NO** | **DEFECT (High)**: Violates commercial clerk verification rules. |
| **"Assume standard commercial terms."** ([bolu-suggestions.ts#L454](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L454)) | Invites invention of missing payment, delivery, or tax terms. | **UNSAFE ACTION** | **NO** | **DEFECT (High)**: Violates financial accuracy guardrails. |

---

## 8. Clarification and Commercial Integrity Findings

### 8.1 The Risk of "Assuming Standard Commercial Terms"
[OBSERVATION] In [src/lib/ai-assistant/bolu-suggestions.ts#L321](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L321) and [line 454](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L454), the suggestion engine generates:
- When a clarification proposal is pending: `"Assume standard commercial specification."`
- When Bolu asks a question in prose: `"Assume standard commercial terms."`

### 8.2 Conflict with BOURXE Commercial Clerk Standards
[DECISION] BOURXE Core Guardrails (`.claude/agent-instructions/core-guardrails.md`) and commercial clerk specifications dictate:
1. *Commercial facts must be confirmed, never assumed.*
2. Commercial transactions in Nigeria lack a single "standard" term:
   - Payment terms vary drastically (100% advance, 50/50 milestone, Net 30, payment upon delivery).
   - Withholding Tax (WHT) rates depend on entity type and contract nature (5% for goods, 10% for consultancy/contracts).
   - Delivery conditions (Ex-works, freight-to-site) significantly impact transaction cost.
   - Material specifications (Nylon 6 vs Nylon 66 vs Cast PA6G) have major pricing and performance differences.
3. Offering a one-click button that tells Bolu to "Assume standard commercial terms" directly encourages the user and the LLM to invent binding commercial conditions without verification.
4. **Expected Behaviour:** Suggestions in clarification states must help the user resolve the missing information (e.g. *"What are the common options for this specification?"*, *"Explain what payment terms are standard for this trade"*, *"Ask customer to specify delivery terms"*), rather than authorizing silent assumptions.

---

## 9. Suggestion Lifecycle and Stale State

### 9.1 Streaming Lifecycle
[OBSERVATION] [bolu-suggestions.ts#L254-L256](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L254-L256):
```ts
if (isStreaming || !messages || messages.length === 0) {
  return []
}
```
In [BoluChatWorkspace.tsx#L383-L397](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L383-L397), `suggestions` is memoized with `isStreaming` in its dependency array. During active streaming, the tray completely clears or hides. Suggestions only evaluate once the stream closes. This cleanly satisfies `REQ-FOLW-04` and prevents UI flicker or token thrashing.

### 9.2 Concurrency and Asynchronous State
[OBSERVATION] Both `getConversationStarters` and `generateContextualFollowUps` are 100% synchronous, pure TypeScript functions executed inside React's `useMemo` hook. There are no asynchronous API calls, promises, or background fetches involved in generating suggestions.
- **Race conditions:** Impossibility of network-induced out-of-order suggestion overwrites.
- **Dispatch integrity:** Clicking a suggestion triggers `handleSend(sug)` ([BoluChatWorkspace.tsx#L399-L422](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L399-L422)), which immediately dispatches the clean text string into `submitMessage(clean)`. The dispatched message is always the exact text rendered on the chip.

### 9.3 Interrupted and Regenerated Turns
- **Interrupted turns:** When a stream is stopped by the user via `stopStreaming()`, `isStreaming` transitions to `false`. The engine evaluates the partial assistant message. If the partial content contains keywords, matching suggestions render; otherwise, the engine falls back to default document actions.
- **Regenerated turns:** When an assistant message is regenerated or a previous user message is edited, `messages` updates. The `useMemo` hook immediately re-evaluates suggestions based on the newly active transcript state.
- **Conversation switching:** When the user switches threads, `activeConversationId` and `messages` update synchronously, causing `useMemo` to invalidate and compute suggestions for the newly selected thread.

---

## 10. UI and Four-Viewport Findings

### 10.1 Architectural Placement
[OBSERVATION] Inspection of [BoluChatWorkspace.tsx#L704](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L704), [L723](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L723), [L781](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L781), and [L795](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L795) confirms that in all four viewports, `suggestionsNode` is placed directly below `composerNode`:

```tsx
{headerNode}
{threadNode}
{negotiationNode}
{composerNode}
{suggestionsNode}
```

This adheres to `REQ-UI-01`, ensuring the composer input area remains in a fixed, predictable position above the suggestions bar.

### 10.2 Four Viewport Analysis

1. **Mobile / Fold Closed (`< 768px`):**
   - Single-column layout.
   - The tray renders with `px-3 py-1.5` and horizontal overflow scrolling (`overflow-x-auto no-scrollbar`).
   - Chips have `shrink-0`, `max-w-[280px]`, `px-3 py-1.5`, and font size `text-xs` (12px).
   - Chip height is approximately 32px, with `gap-1.5`. Touch target is comfortable horizontally, but vertical padding is compact to minimize vertical space consumption on mobile screens.
   - Total vertical footprint of the tray is ~42px, preserving maximum screen real estate for the message thread.
2. **Fold Open (`768px – 1023px`):**
   - Dual-pane layout when the document panel is open.
   - Suggestions tray remains inside the chat column below the composer. Chip `max-w` expands to `sm:max-w-[340px]`.
3. **Tablets (`1024px – 1279px`):**
   - Left collapsible rail + central chat column + right document sheet.
   - Chat column maintains clean vertical flow; horizontal scrolling allows quick flicking through the 3–4 suggestions.
4. **Desktop (`>= 1280px`):**
   - 3-column enterprise workspace layout.
   - At desktop resolutions, 3 to 4 suggestions fit comfortably across the width of the central chat column, typically eliminating the need for horizontal scrolling while retaining hover transitions (`hover:border-[var(--ac-accent)] hover:bg-[var(--ac-accent-soft)]`).

### 10.3 Styling and Dark Mode
[OBSERVATION] Styling in [assistant-chat.css](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat.css) and [assistant-chat-premium-dark.css](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-premium-dark.css) utilizes design tokens:
- Background: `bg-[var(--ac-muted-surface)]`
- Border: `border-[var(--ac-line)]`
- Ink: `text-[var(--ac-ink)]`
- Accent: `text-[var(--ac-accent)]` with `Sparkles` icon
Both light and dark themes render consistent borders, surfaces, and typography without contrast degradation.

---

## 11. Test Quality and Regression Results

### 11.1 Test Suite Evaluation
[OBSERVATION] The test suite in [src/tests/ai-assistant/bolu-conversational-suggestions.test.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-conversational-suggestions.test.ts) contains 17 automated tests written for Node/Bun's native test runner (`node:test`).

All 17 tests pass:
```bash
$ bun test src/tests/ai-assistant/bolu-conversational-suggestions.test.ts
(pass) Starter Pool: contains exactly all 12 approved candidate starters
(pass) Starter Pool: all 12 candidates are valid conversational entry points
(pass) Starter Selection: returns between 3 and 4 suggestions for empty conversation
(pass) Starter Rotation: rotates across different conversations
(pass) Starter Context Prioritization: prioritizes module-relevant candidates
(pass) Contextual Follow-ups: empty conversation returns zero follow-ups
(pass) Contextual Follow-ups: active streaming suppresses suggestion generation
(pass) Example A — Unfamiliar RFQ: generates relevant material and market clarification follow-ups
(pass) Example B — Product Identification: generates technical identification follow-ups
(pass) Example C — Quotation Preparation: generates document review follow-ups
(pass) Example D — Product Description Correction: generates follow-ups
(pass) Example E — Clarification Pending: offers options when Bolu asks a question
(pass) Invoice Preparation: generates tax, line item and payment terms review follow-ups
(pass) User Corrections: generates verification follow-ups after user corrects an item
(pass) Completed Tasks: prunes completed actions and never suggests creating the same document again
(pass) No Meaningful Next Action: casual acknowledgment returns zero suggestions
(pass) Deduplication: suppresses suggestions that repeat what the user already asked
17 pass, 0 fail
```

### 11.2 Test Quality Critique: What is Tested vs What is Missing
While the 17 unit tests execute cleanly and verify string matching logic, the audit notes significant testing gaps:
- **Tautological Assertions:** The tests construct synthetic 2-message dialogues specifically engineered to trigger a single `if` statement, and then assert the presence of the exact hardcoded string array defined in that block.
- **Omission of Multi-Turn Progression:** Zero tests evaluate multi-turn conversation progression (Turns 1 through 5). None test how suggestions evolve after a user clarifies or corrects Bolu.
- **Omission of Capability Boundaries:** Zero tests verify whether suggested operations (such as reference images) correspond to available tools.
- **Omission of UI Duplication:** No test inspects the dual-rendering of starters between `assistant-chat-thread.tsx` and `BoluChatWorkspace.tsx`.
- **Omission of Topic Shift:** Zero tests verify whether stale RFQ or quotation suggestions are cleared when the conversation shifts to an unrelated topic.

### 11.3 System Non-Regression Verification
The audit ran full verification commands across the repository:
- All 13 Bolu AI assistant test suites (175 tests): **175 passed, 0 failed**.
- `bun run audit:load`: **Passed with exit code 0** (no dependency or load errors).
- `bun run typecheck` (`tsc --noEmit`): **Passed with exit code 0** (zero TypeScript compilation errors).
- `bun run build`: **Intentionally omitted** in strict adherence to the 4 GB RAM host constraint defined in `AGENTS.md`.

---

## 12. Git and Scope Integrity

### 12.1 Working Tree Inspection
[OBSERVATION] Git status check reveals:
```text
 M docs/prd/conversational-document-assistant/commercial-clerk-behaviour-prd.md
 M docs/prd/conversational-document-assistant/functional-req.md
 M src/lib/ai-assistant/bolu-commercial-language.ts
 M src/lib/ai-assistant/bolu-suggestions.ts
 M src/tests/ai-assistant/bolu-commercial-and-gate-lifecycle.test.js
 M src/tests/ai-assistant/bolu-conversational-behaviour.test.ts
 M src/tests/ai-assistant/bolu-conversational-suggestions.test.ts
?? .perch/mcp.json.bak
?? docs/reports/bolu-reliability-android-ux/bolu-suggestion-system-implementation.md
```

### 12.2 Preservation of Pre-Existing Work
- **Tracked files:** Modifications are strictly confined to PRDs, commercial language guardrails, suggestion logic, and test files.
- **Unmodified core boundaries:** No modifications were made to `src/lib/Calculations.ts`, Supabase migrations, server APIs (`api/`), or native Android files (`android/`).
- **Audit hygiene:** This audit has created no staged changes, reset no commits, and modified no existing files. The only output is this report.

---

## 13. Findings Ranked by Severity

### Finding 1: Hallucinated Visual Preview Capabilities
- **Severity:** HIGH
- **Requirement Affected:** `REQ-FOLW-06` (Do not suggest unsupported capabilities)
- **Evidence:** [src/lib/ai-assistant/bolu-suggestions.ts#L329](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L329) and [L353](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L353):
  - `'Show me what this material might look like.'`
  - `'Show me reference images of this component.'`
- **Reproduction Scenario:**
  1. User mentions an unfamiliar component or RFQ item.
  2. Bolu responds with an explanation.
  3. The suggestion bar displays "Show me reference images of this component".
  4. User clicks the chip.
- **Actual Behaviour:** Bolu receives the user prompt and must apologize: *"I cannot display or generate images, as I am a text-based assistant..."*
- **Expected Behaviour:** Suggestions must only offer capabilities Bolu can fulfill (e.g. *"Describe the physical appearance and distinguishing features of this component"* or *"What markings or stamps should I look for?"*).
- **Recommended Correction:** Replace image-related suggestions with descriptive physical inspection prompts.

---

### Finding 2: Commercial Clerk Integrity Breach via "Assume Terms" Suggestions
- **Severity:** HIGH
- **Requirement Affected:** `REQ-INTG-03` (Never prompt the user or assistant to invent or assume commercial terms)
- **Evidence:** [src/lib/ai-assistant/bolu-suggestions.ts#L321](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L321) and [L454](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L454):
  - `'Assume standard commercial specification.'`
  - `'Assume standard commercial terms.'`
- **Reproduction Scenario:**
  1. Bolu creates a proposal with pending clarification or asks a question in prose regarding customer terms.
  2. The suggestion bar presents "Assume standard commercial terms".
  3. User clicks the chip.
- **Actual Behaviour:** Bolu is instructed to proceed by assuming payment, tax, or material specifications, bypassing explicit verification.
- **Expected Behaviour:** Bolu must guide the user to clarify missing terms with their client or explain the commercial consequences of each option.
- **Recommended Correction:** Remove all "Assume standard..." prompts. Replace with:
  - *"Help me formulate questions for the client."*
  - *"Explain common commercial terms for this trade."*
  - *"What are the risks of proceeding without this specification?"*

---

### Finding 3: Stale Context Stagnation in Multi-Turn Dialogues
- **Severity:** MEDIUM
- **Requirement Affected:** `REQ-FOLW-01`, `REQ-FOLW-05` (Account for user corrections and invalidate stale interpretations)
- **Evidence:** [src/lib/ai-assistant/bolu-suggestions.ts#L324-L336](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts#L324-L336) relies on `fullConversationHistory.includes('rfq')` and `lastAssistantContent.includes('nylon')`.
- **Reproduction Scenario:**
  1. Turn 1: User submits RFQ with Nylon Extruded Sheet 50mm.
  2. Turn 2: Bolu explains nylon and highlights sheet/block dimension conflict. Suggestions: [Images, Market names, Questions to ask, How sold/priced].
  3. Turn 3: User clarifies it is a pre-cut block for machining.
  4. Turn 4: Bolu acknowledges machining block and asks about natural vs black nylon.
- **Actual Behaviour:** The suggestion engine returns the identical four suggestions from Turn 2.
- **Expected Behaviour:** The engine should recognize that the dimension conflict is resolved, and suggest next-stage actions: *"What is the difference between natural and black nylon?"*, *"Prepare a quotation draft for this machining block"*, or *"How is cutting charged?"*.
- **Recommended Correction:** Restructure contextual heuristics to prioritize recent turns (`messages.slice(-2)`) and detect topic progression states (Unidentified -> Identified -> Specification Clarified -> Pricing/Quoting).

---

### Finding 4: Empty Thread Dual-Rendering of Starters
- **Severity:** MEDIUM
- **Requirement Affected:** `REQ-UI-02` (Eliminate duplicate suggestion containers)
- **Evidence:** [BoluChatWorkspace.tsx#L424](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L424) renders `suggestionsNode` unconditionally when `suggestions.length > 0`, while [assistant-chat-thread.tsx#L198](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-thread.tsx#L198) also renders `defaultSuggestions` inside `.ac-empty`.
- **Reproduction Scenario:**
  1. User starts a new conversation (`messages.length === 0`).
  2. Inspect the screen.
- **Actual Behaviour:** The 4 conversation starters appear twice: once in the central welcome hero card and once in the tray below the composer.
- **Expected Behaviour:** On an empty thread, starters should render in exactly one place (either in the hero card or in the bottom tray, but not both).
- **Recommended Correction:** Update `suggestionsNode` condition in `BoluChatWorkspace.tsx` to hide the bottom tray when `isStarter` is true (`!isStarter && suggestions && suggestions.length > 0`), letting the central empty hero card own starter presentation; OR suppress starters from `AssistantThread` and let the bottom tray own all suggestions uniformly.

---

### Finding 5: Tautological Unit Testing Scope
- **Severity:** LOW
- **Requirement Affected:** Comprehensive test verification
- **Evidence:** [src/tests/ai-assistant/bolu-conversational-suggestions.test.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-conversational-suggestions.test.ts)
- **Actual Behaviour:** Unit tests only evaluate static 2-message pairs matching explicit `if` statement keywords. No tests assert multi-turn state transitions, corrections, or capability safety.
- **Recommended Correction:** Add multi-turn scenario tests (including the 5-turn RFQ flow and topic shift tests) to prevent regression.

---

## 14. Recommended Corrections

To achieve full commercial readiness, the following targeted refinements are recommended for the next implementation task:

1. **Purge Visual Capability Hallucinations:**
   - In `bolu-suggestions.ts`, replace `'Show me reference images of this component.'` with `'Describe how to physically inspect and identify this component.'`.
   - Replace `'Show me what this material might look like.'` with `'Describe its physical appearance and common surface finishes.'`.
2. **Enforce Commercial Clerk Verification Integrity:**
   - In `bolu-suggestions.ts`, replace `'Assume standard commercial specification.'` with `'What details are needed from the client to confirm this spec?'`.
   - Replace `'Assume standard commercial terms.'` with `'Explain typical commercial terms for this category.'`.
3. **Resolve Empty Thread Starter Duplication:**
   - In `BoluChatWorkspace.tsx`, update `suggestionsNode`:
     ```tsx
     // Render bottom suggestions tray only for active contextual follow-ups,
     // avoiding duplication with the thread's central welcome card
     const suggestionsNode = !isStarter && suggestions && suggestions.length > 0 && !editingMessageId ? (
       ...
     ) : null
     ```
4. **Implement Recency Windowing for Context Heuristics:**
   - Shift the primary heuristic detection from `fullConversationHistory` to a sliding window of the last 2–3 turns (`recentHistory = messages.slice(-3)`).
   - Only check `fullConversationHistory` for global document modes (e.g. an active quotation proposal), not for ephemeral discussion keywords like "sheet" or "nylon".

---

## 15. Acceptance Decision

### Final Outcome: ACCEPTED WITH LIMITATIONS

**Justification:**
- **What is Accepted:** The conversation starter subsystem is robust, well-architected, and fully aligned with requirements. The 12-candidate starter pool is varied, deterministic, and module-aware. UI tray placement below the composer is cleanly implemented across all four responsive viewports. Two-Gate transaction safety, authorization boundaries, and `Calculations.ts` financial integrity are completely intact. Streaming suppression and deduplication work as designed. All 17 unit tests, 175 Bolu subsystem tests, load audit, and typechecks pass with zero errors.
- **Governing Limitations:** Broad release of the contextual follow-up feature should be conditioned on patching the four identified findings: removing image hallucination chips, eliminating "assume commercial terms" prompts, resolving empty-thread visual duplication, and scoping heuristic matching to recent turns to prevent multi-turn RFQ stagnation.
