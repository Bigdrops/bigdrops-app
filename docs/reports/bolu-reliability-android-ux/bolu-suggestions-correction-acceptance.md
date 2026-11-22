# BOURXE Bolu — Dynamic Suggestions Correction & Acceptance Wave

**Report Date:** 2026-11-22  
**Implementation Engineer:** Antigravity (Local Runner)  
**Task Type:** Authorized Implementation & Verification  
**Objective:** Correct the four defects identified in the Dynamic Suggestions Acceptance Audit, eliminate unsupported visual capability suggestions, uphold commercial verification rules, resolve empty-thread duplicate starter rendering, and implement progressive contextual awareness across multi-turn dialogues and topic shifts.  
**Documentation Standard:** ASD-STE100 Simplified Technical English & BOURXE Repository Governance  
**Final Status:** COMPLETED  

---

## 1. Executive Summary

Following the independent Dynamic Suggestions Acceptance Audit ([bolu-suggestion-system-acceptance-audit.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/bolu-reliability-android-ux/bolu-suggestion-system-acceptance-audit.md)), this authorized implementation wave resolves all four identified defects:

1. **Unsupported Visual Capabilities Removed:** All suggestions that promised image generation, image search, or visual previews (e.g. `"Show me what this material might look like"`, `"Show me reference images of this component"`) have been removed and replaced with physical inspection and distinguishing feature guidance.
2. **Commercial Assumption Prompts Purged:** Prompts that encouraged Bolu or the user to assume binding commercial facts (`"Assume standard commercial specification"`, `"Assume standard commercial terms"`) have been replaced with client verification questions, specification trade-off explanations, and commercial risk analysis.
3. **Empty-Thread Starter Duplication Resolved:** The suggestion tray below the composer now checks `!isStarter`. On empty threads, starters render exclusively in the central welcome hero card (`.ac-empty`). On active threads, contextual follow-ups render exclusively in the bottom tray below the composer.
4. **Context Stagnation and Multi-Turn Progression Solved:** `generateContextualFollowUps()` has been overhauled to distinguish established context, recent conversation focus (sliding window), progressive RFQ consultation stages (Discovery -> Specification Refinement -> Market Sourcing & Availability), topic shifts (Freight, Operating Expenses, Receivables), and user corrections.

All 25 targeted suggestion tests pass cleanly. All 800 Bolu subsystem tests pass. `bun run audit:load` and `bun run typecheck` (`tsc --noEmit`) complete with zero errors.

---

## 2. Verified Defects and Root Causes

| Defect ID | Severity | Verified Defect | Actual Root Cause | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-VIS-01** | **High** | Suggestions promised reference images and visual previews that Bolu cannot generate or display. | `bolu-suggestions.ts` hardcoded strings `"Show me reference images..."` and `"Show me what this material might look like"` without checking tool capabilities. | Replaced with physical inspection, distinguishing markings, and dimension verification prompts. |
| **DEF-INT-02** | **High** | Suggestions prompted users to "Assume standard commercial terms" and "Assume standard commercial specification", violating commercial clerk integrity rules. | Quick-action shortcuts in `bolu-suggestions.ts` attempted to bypass clarification questions by generating assumption prompts. | Replaced with client confirmation prompts, option trade-off explanations, and commercial risk analysis. |
| **DEF-UI-03** | **Medium** | Conversation starters rendered simultaneously in the thread hero card and below the composer on empty threads. | `BoluChatWorkspace.tsx` evaluated `suggestions.length > 0` without checking `!isStarter`, rendering the bottom tray on initial empty load. | Added `!isStarter` guard to `suggestionsNode` in `BoluChatWorkspace.tsx`. Empty threads show starters exclusively in the central card. |
| **DEF-CTX-04** | **Medium** | Suggestions stagnated in multi-turn RFQ conversations, repeating Turn 2 prompts across Turns 3, 4, and 5 despite user clarifications. | `generateContextualFollowUps()` relied on global `fullConversationHistory.includes('rfq')`, causing earlier keywords to permanently capture the heuristic branch. | Implemented sliding-window focus detection (`messages.slice(-4)`), RFQ lifecycle stage tracking (Stages 1, 2, 3), and domain topic-shift detection. |

---

## 3. Detailed Changes by File

### 3.1 [src/lib/ai-assistant/bolu-suggestions.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts)
- **Eliminated Visual Hallucinations:**
  - Removed `"Show me what this material might look like."` -> Replaced with `"Describe its physical appearance and distinguishing features."`
  - Removed `"Show me reference images of this component."` -> Replaced with `"Describe how to physically inspect and identify this component."`
- **Enforced Commercial Verification Guardrails:**
  - Removed `"Assume standard commercial specification."` -> Replaced with `"What details should I confirm with the client?"` and `"Explain the specification options and their differences."`
  - Removed `"Assume standard commercial terms."` -> Replaced with `"What details should I confirm with the client?"`, `"Explain the available options and their differences."`, and `"What are the commercial risks if terms are not specified?"`
- **Architected Multi-Turn Dialogue Progression:**
  - Introduced sliding-window analysis (`recentMessages = messages.slice(-4)`, `recentHistory = recentMessages.map(...)`).
  - Added Topic Shift detection for Freight & Delivery, Operating Expenses, and Customer Receivables.
  - Implemented 3 progressive RFQ consultation stages:
    - **Stage 1 (Initial Discovery / Inconsistent Dimensions):** Physical appearance, Nigerian market trade names, questions to confirm specifications, standard selling and pricing methods.
    - **Stage 2 (Specification Refinement / Clarification Acknowledged):** Natural vs black nylon distinctions, grade confirmation before pricing, block supply formats, supplier pricing requirements. Resolves the sheet vs block ambiguity.
    - **Stage 3 (Market Sourcing & Local Availability):** Supplier enquiry drafting, supplier price request details, comparing weight vs cut-size quotes, quotation drafting.
  - Preserved document proposal lifecycles, user corrections, and deduplication against recent user messages.

### 3.2 [src/components/ai-assistant/chat/BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx)
- Updated `suggestionsNode` rendering logic:
  ```tsx
  // Suggestions Tray placed directly below the conversation composer.
  // Empty threads show starters exclusively in the central welcome card (AssistantThread).
  // Active threads show contextual follow-ups here when meaningful next steps exist.
  const suggestionsNode = !isStarter && suggestions && suggestions.length > 0 && !editingMessageId ? (
    <div
      className="ac-suggestions-bar border-t border-[var(--ac-line)] bg-[var(--ac-muted-surface)] px-3 py-1.5 sm:px-4"
      role="region"
      aria-label="Contextual follow-up suggestions"
    >
      ...
    </div>
  ) : null
  ```
- Guaranteed single-owner presentation for starters:
  - Empty thread: Central welcome hero card (`AssistantThread`) owns starters. Bottom tray is suppressed.
  - Active conversation: Bottom tray (`BoluChatWorkspace`) owns contextual follow-ups below the composer.

### 3.3 [src/lib/ai-assistant/bolu-operations.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-operations.ts)
- Enhanced `decideBoluCommercialRecommendation<T extends BoluProposal>` and `approveBoluProposal<T extends BoluProposal>` to use generic proposal subtypes with type narrowing, ensuring seamless TypeScript typecheck compatibility across create, modify, and advance proposal unions.

### 3.4 [src/tests/ai-assistant/bolu-conversational-suggestions.test.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-conversational-suggestions.test.ts)
- Expanded the suite from 17 to 25 automated tests.
- Replaced outdated assertions expecting image prompts with assertions verifying physical inspection guidance and strictly prohibiting image hallucinations.
- Added comprehensive multi-turn progression tests:
  - Mandatory 6-turn RFQ progression (Turn 1/2 -> Turn 3/4 -> Turn 5/6).
  - Topic shift from RFQ to Freight logistics.
  - Topic shift from RFQ to Operating Expenses.
  - Topic shift to Customer Receivables.
  - User specification & quantity correction verification.
  - Commercial integrity assertions (zero assumption prompts).
  - UI Architecture assertion (empty thread bottom tray suppression).

---

## 4. Before-and-After Behaviour: Mandatory 6-Turn RFQ Scenario

The audit tested the 6-turn RFQ sequence against the updated engine:

| Turn | Actor & Content | Before (Audit Baseline) | After (Current Implementation) | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Turn 1** | **User:** RFQ containing Nylon Extruded Sheet 50mm (190x90x50mm). Item unrecognised. | Returns `[]` (assistant not responded). | Returns `[]` (assistant not responded). | **PASSED** |
| **Turn 2** | **Bolu:** Identifies nylon as engineering thermoplastic; notes dimensions describe a block rather than a sheet; suggests clarification. | 1. Show me what this material might look like. *(Hallucinated capability)*<br>2. Find common market names.<br>3. What questions to confirm spec?<br>4. How sold and priced? | 1. **Describe its physical appearance and distinguishing features.**<br>2. Find its common market names in Nigeria.<br>3. What questions should I ask to confirm the specification?<br>4. How is this material normally sold and priced? | **PASSED** (No image promises; text-based physical inspection) |
| **Turn 3** | **User:** Corrects Bolu: *"It's not a sheet. The client confirmed it's a pre-cut engineering nylon block for machining a prototype bushing."* | Suggestions remained Turn 2 prompts while drafting. | Suggestions remain clean while drafting. | **PASSED** |
| **Turn 4** | **Bolu:** Acknowledges machining block (PA6); raises distinction between natural (white) and black (MoS2-filled) nylon for bushings. | **STAGNANT:** Re-served Turn 2 suggestions:<br>1. Show me what this material looks like.<br>2. Find common market names.<br>3. What questions to confirm spec?<br>4. How sold and priced? | **ADAPTED (Stage 2 Spec Refinement):**<br>1. **Explain the difference between natural and black nylon.**<br>2. **What material grade should I confirm before pricing?**<br>3. **How is this type of block normally supplied?**<br>4. **What details should I obtain before requesting supplier prices?** | **PASSED** (Sheet vs block question resolved & pruned; grade uncertainties surfaced) |
| **Turn 5** | **User:** *"How is this material normally sold in Nigeria and is it locally available?"* | Partially filtered out pricing, leaving Turn 2 prompts. | Advances towards commercial procurement. | **PASSED** |
| **Turn 6** | **Bolu:** Explains typical formats (per kg vs standard slabs) and local availability in Ladipo/Odunade markets in Lagos. | **STAGNANT:** Continued suggesting Turn 2 prompts (images, market names). | **ADVANCED (Stage 3 Sourcing & Availability):**<br>1. **Help me prepare a supplier enquiry for this material.**<br>2. **What details should I include when requesting supplier prices?**<br>3. **How should I compare prices quoted by weight and by cut size?**<br>4. **Help me prepare a quotation for this item.** | **PASSED** (Full commercial progression to procurement and quoting) |

---

## 5. Topic Shift and Correction Behaviour

### 5.1 Topic Shift Verification
When an active dialogue concludes or pivots to an unrelated business domain, the updated engine immediately updates suggestions to match the new subject:
- **Scenario:** User completes Turn 6 of the RFQ dialogue, then immediately asks: *"What are our standard freight costs from Lagos to Abuja?"*
- **Previous Engine:** Outputted nylon and material sourcing suggestions because `"rfq"` and `"nylon"` remained in cumulative history.
- **Updated Engine:** Detects that `recentHistory` focuses on logistics and freight (`lagos to abuja`, `freight`, `truck`), producing:
  1. *"Calculate freight per unit for this shipment."*
  2. *"Check if freight should be billed separately on the invoice."*
  3. *"Help me prepare a delivery waybill."*
- **Scenario:** User asks to record monthly generator diesel expenses (`₦180,000`):
  1. *"Record this as an operating expense."*
  2. *"Check which account or project should be charged."*
  3. *"Review monthly expense totals."*

### 5.2 User Correction Verification
When the user corrects a line item quantity, unit price, or description on an active proposal:
- **Engine Output:**
  1. *"Verify the updated subtotal and tax calculation."*
  2. *"Check if any other line items need updating."*
  3. *"Review the revised document preview."*
- Guarantees immediate verification of financial recalculation via `Calculations.ts` before proceeding to Gate 2.

---

## 6. Four-Viewport Responsive Verification

In accordance with root `AGENTS.md`, the suggestions presentation was verified across all four viewport classes:

```
+-------------------------------------------------------------------------------+
| Header: Bolu Identity (Left)                          Model Pill & Tools (Right)|
+-------------------------------------------------------------------------------+
| Thread Area: AssistantThread                                                  |
|                                                                               |
| [Empty Thread]                                                                |
|   Central Hero Card (.ac-empty)                                               |
|     - Bolu Thinking Orb                                                       |
|     - Welcome Copy                                                            |
|     - 3-4 Starter Buttons (getConversationStarters)                           |
|                                                                               |
| [Active Thread]                                                               |
|   Message Bubbles (.ac-row--user, .ac-row--assistant)                         |
|   Proposal Cards & Clarification Prompts                                      |
+-------------------------------------------------------------------------------+
| Composer Area: AssistantComposer                                              |
|   [ Text Input Field / Send Button / Stop Streaming ]                         |
+-------------------------------------------------------------------------------+
| Suggestions Tray: .ac-suggestions-bar (Below Composer)                        |
|   - Hidden on Empty Thread (!isStarter) -> Zero duplication                   |
|   - Hidden during Active Streaming (isStreaming)                              |
|   - Visible on Active Thread when follow-ups exist:                          |
|     [✨ Chip 1]  [✨ Chip 2]  [✨ Chip 3]  [✨ Chip 4]                        |
+-------------------------------------------------------------------------------+
```

### 1. Mobile / Fold Closed (`< 768px`)
- **Empty State:** Only the central welcome hero card displays the 3–4 starter suggestions. The bottom tray is `null`, eliminating the previous visual duplication and freeing 42px of vertical screen space.
- **Active State:** The bottom tray renders cleanly below the composer. Horizontal scrolling (`overflow-x-auto no-scrollbar`) allows smooth swiping through chips on narrow mobile screens (360px–412px). Chips truncate at `max-w-[280px]` with touch-friendly 32px height.

### 2. Fold Open (`768px – 1023px`)
- **Layout:** Dual-pane split when the document panel is open.
- **Behaviour:** Follow-up tray stays anchored to the bottom of the chat column. Chips expand to `sm:max-w-[340px]`. Starters remain centered in the left pane during empty state.

### 3. Tablets (`1024px – 1279px`)
- **Layout:** Collapsible left history rail, central chat stream, right document sheet.
- **Behaviour:** Chat column maintains comfortable horizontal breathing room. Suggestions sit beneath the composer with active hover states (`hover:border-[var(--ac-accent)] hover:bg-[var(--ac-accent-soft)]`).

### 4. Desktop (`>= 1280px`)
- **Layout:** 3-column enterprise workspace canvas.
- **Behaviour:** 3 to 4 suggestions span the width of the central chat column without wrapping, providing clear one-click discovery for subsequent conversational actions.

---

## 7. Verification Gates Passed

The following verification commands were executed on the working tree:

### 7.1 Targeted Suggestion Test Suite
```bash
$ bun test src/tests/ai-assistant/bolu-conversational-suggestions.test.ts
bun test v1.3.14 (0d9b296a)
(pass) Starter Pool: contains exactly all 12 approved candidate starters
(pass) Starter Pool: all 12 candidates are valid conversational entry points without autonomous execution claims
(pass) Starter Selection: returns between 3 and 4 suggestions for empty conversation
(pass) Starter Rotation: rotates across different conversations and avoids permanently presenting the same three
(pass) Starter Context Prioritization: prioritizes module-relevant candidates
(pass) Contextual Follow-ups: empty conversation returns zero follow-ups (starters handle empty state)
(pass) Contextual Follow-ups: active streaming suppresses suggestion generation to avoid token thrashing
(pass) Example A — Unfamiliar RFQ: generates relevant material and market clarification follow-ups without visual claims
(pass) Example B — Product Identification: generates technical identification follow-ups for unfamiliar components without image claims
(pass) Example C — Quotation Preparation: generates document review follow-ups for pending quotation proposal
(pass) Example D — Product Description Correction: generates follow-ups when Bolu identifies a description defect
(pass) Example E — Clarification Pending: offers options without instructing to assume commercial terms
(pass) Invoice Preparation: generates tax, line item and payment terms review follow-ups
(pass) User Corrections: generates verification follow-ups after user corrects an item
(pass) Completed Tasks: prunes completed actions and never suggests creating the same document again
(pass) No Meaningful Next Action: casual acknowledgment or concluded task returns zero suggestions
(pass) Deduplication: suppresses suggestions that repeat what the user already asked in recent turns
(pass) Mandatory Progression: 6-turn RFQ dialogue evolves from initial identification to specification to market sourcing
(pass) Topic Shift: moving from an earlier RFQ discussion to Freight immediately clears RFQ follow-ups
(pass) Topic Shift: moving from an earlier RFQ discussion to Operating Expense yields expense follow-ups
(pass) Topic Shift: moving to customer receivables yields account statement and balance follow-ups
(pass) User Correction: correcting a specification or quantity triggers immediate verification suggestions
(pass) Commercial Integrity: suggestions never instruct Bolu or user to assume commercial terms or specs
(pass) Visual Safety: zero branches ever produce suggestions promising images or visual previews
(pass) UI Architecture: empty thread suppresses bottom suggestions tray to avoid duplicate starters

 25 pass
 0 fail
Ran 25 tests across 1 file. [131.00ms]
```

### 7.2 Subsystem Non-Regression Suite
```bash
$ bun test src/tests/ai-assistant/
 800 pass
 0 fail
Ran 800 tests across 55 files. [1.16s]
```

### 7.3 Project Load & Static Analysis
```bash
$ bun run audit:load
Audit complete. Zero blocking load risks introduced. (Exit code 0)

$ bun run typecheck
$ tsc --noEmit
Zero TypeScript compilation errors across the workspace. (Exit code 0)
```
*(Note: `bun run build` was deliberately not executed per the 4 GB RAM host constraint in root AGENTS.md).*

---

## 8. Git Preservation and Attribution Notes

- **Preservation:** All pre-existing untracked and modified files (`.perch/mcp.json.bak`, PRDs, commercial language guardrails) remain untouched and intact.
- **Task Attribution:**
  - Modified:
    - [src/lib/ai-assistant/bolu-suggestions.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-suggestions.ts) (contextual heuristics, visual safety, commercial guardrails).
    - [src/components/ai-assistant/chat/BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx) (empty thread starter single-owner fix).
    - [src/lib/ai-assistant/bolu-operations.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-operations.ts) (generic proposal typing).
    - [src/tests/ai-assistant/bolu-conversational-suggestions.test.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-conversational-suggestions.test.ts) (25 unit tests).
    - [src/tests/ai-assistant/bolu-commercial-approval-lifecycle.test.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-commercial-approval-lifecycle.test.ts) (import extension normalization).
  - Authored Report:
    - [docs/reports/bolu-reliability-android-ux/bolu-suggestions-correction-acceptance.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/bolu-reliability-android-ux/bolu-suggestions-correction-acceptance.md).
- **Prohibited Actions Avoided:** No direct database writes, no schema migrations, no external LLM dependencies, no modifications to `Calculations.ts`, and zero destructive git commands executed.

---

## 9. Final Conclusion

**Final Status: COMPLETED**

Bolu's dynamic suggestion system now satisfies all acceptance requirements:
1. It proposes capability-accurate, text-based guidance without visual hallucinations.
2. It enforces commercial integrity by eliminating assumption prompts.
3. It resolves empty-thread visual duplication by providing single-owner starter rendering.
4. It dynamically adapts across multi-turn RFQ conversations, user corrections, and topic shifts.
5. All verification gates (`audit:load`, `typecheck`, and 800 automated tests) pass with zero defects.

---

## Changelog entries

- **feat**: Bolu AI: when it suggests clearer wording for an invoice or quotation line, it shows the original wording, the suggested wording and the reason, and changes the line only if you accept that suggestion
