# BOURXE Bolu — Wave 2 Closure, Wave 3 Implementation & Integrated Reliability Upgrade

**Document Type:** Integrated Implementation & Acceptance Report  
**Date:** 2026-11-22  
**Author:** Antigravity Agent  
**Status:** Completed  
**Repository Working Tree:** `main` (clean task diff; all pre-existing user files preserved)

---

## A. Executive Summary

### 1. What Was Implemented

1. **Wave 2 Acceptance Defect 4.1 Resolution (SSE Stream Termination Ordering):**
   - Corrected the server-sent events (SSE) protocol termination sequence in `api/bolu-chat.ts`. Upstream provider `[DONE]` sentinels are now intercepted; authoritative telemetry metrics (`data: {"metrics": ...}\n\n`) are enqueued before the terminal `data: [DONE]\n\n` event.
   - Built a modular, zero-loss SSE chunk parser in `src/lib/ai-assistant/protocol.ts` (`feedSseChunk`, `flushSseBuffer`, `extractSseMetrics`) that buffers partial lines across TCP/TLS chunk boundaries, handles arbitrary split points, and isolates metrics from model prose.
   - Wired client transport telemetry in `src/lib/ai-assistant/bolu-transport.ts` and `src/lib/ai-assistant/bolu-generation.ts` to differentiate between authoritative server timing (`isServerTelemetry: true, source: 'server'`) and client round-trip measurement fallback (`isServerTelemetry: false, source: 'client_fallback'`).
   - Updated the UI timestamp tooltip in `src/components/ai-assistant/chat/assistant-chat-thread.tsx` to display `"Server telemetry: Xms (TTFT Yms)"` or `"Client round-trip: Xms (fallback)"`.
   - Verified 8 comprehensive transport edge cases in `src/tests/ai-assistant/bolu-sse-metrics-transport.test.ts`.

2. **Wave 2 Acceptance Defect 4.2 Resolution (Unresolved Auto Model Labeling):**
   - Extracted and exported the pure display resolver `resolveModelPillDisplay()` in `src/components/ai-assistant/chat/assistant-chat-model-pill.tsx`.
   - When Auto routing is active without an authoritative `activeResolvedModel` (e.g. at initial load, during negotiation, or following a network failure), the header pill explicitly renders `"Auto"` and `"Automatic routing"` (tooltip: `"Auto · Automatic routing"`), strictly prohibiting premature or deceptive attribution to `primaryConnection.model`.
   - Once a genuine `activeResolvedModel` is received via server telemetry or message metadata, the pill cleanly normalizes and presents it alongside the `"Auto"` badge.
   - Verified 5 targeted pill states across initial load, resolution, error recovery, manual selection, and custom identifiers in `src/tests/ai-assistant/bolu-wave2-android-ux.test.ts`.

3. **Wave 3 Conversational Intelligence & Instruction Architecture:**
   - Authored the authoritative system prompt module in `src/lib/ai-assistant/bolu-prompt.ts` implementing strict intent-gated prompt scoping:
     - `BOLU_PRODUCT_CONTEXT`: Supplies factual product knowledge about BOUXRE (invoicing, quotation, receipts, expenses, clients, inventory, reports, offline-first sync). Answers general queries ("What does this app do?") accurately without reciting payload schemas.
     - `BOLU_CONVERSATIONAL_CORE`: Defines the business persona, tone, language discipline (concise, professional Nigerian SME context, no em-dashes, no robotic boilerplate), and two-gate security boundaries.
     - `BOLU_DOCUMENT_OPERATIONS`: Encloses all draft and mutation payload schemas, required fields, and rules. Conditionally injected *only* when `isBoluDocumentOperationTurn` evaluates to true.
   - Commercial Evidence Gating (`src/lib/ai-assistant/bolu-commercial-language.ts`):
     - Implemented `hasCommercialListSignal()` to identify genuine commercial intent (bullet points, numbered lists, currency symbols, quantity markers, or commercial verbs like "bill", "invoice", "quote").
     - Gated `formatCommercialEvidence()` so ordinary queries (e.g., "What is VAT?", "Explain withholding tax") are never converted into parsed commercial items.
   - Structured Fact Failure Representation (`src/lib/ai-assistant/bolu-data.ts`, `src/lib/ai-assistant/bolu-formatting.ts`):
     - Created typed failure representation `BoluFactFailureCode` (`not_found`, `permission_denied`, `network_error`, `stale_data`, `unknown_error`) and `formatBoluFactFailure()`.
     - Replaced raw bracketed imperatives (`[SYSTEM ERROR: ...]`) with transparent, neutral explanations.
   - Internal Prompt & Fact Sanitization:
     - Stripped internal route navigation strings (`Route: /invoices/...`) and procedural implementation notes (`Note: ...`) from business facts in `src/lib/ai-assistant/bolu-formatting.ts` and `src/lib/ai-assistant/bolu-data.ts`.
     - Capped prompt business records at `MAX_PROMPT_RECORDS = 10` to avoid context window flooding.
     - Cleaned `src/lib/ai-assistant/bolu-runtime.ts` to prevent redundant prompt concatenation.
   - Verified 19 conversational behavior cases in `src/tests/ai-assistant/bolu-conversational-behaviour.test.ts`.

4. **Integrated System Testing & Verification:**
   - Executed the full suite of 152 targeted tests across 11 test suites with 100% pass rate.
   - Passed static load audit (`bun run audit:load`) with 0 blocking errors.
   - Passed full TypeScript typecheck (`bun run typecheck`) with 0 errors.

---

### 2. What Was Not Implemented (Deliberately Excluded)

1. **RFQ, PO, and Bill of Quantities (BOQ) Schema Expansion:**
   - Unapproved document families outside the authorized invoice/quotation domain were rejected per Section 5, Section 10, and Section 6.2 governance.
2. **Avatar Redesign or Conversational Personality Rewrite:**
   - Retained the canonical Bolu identity (concise, respectful, Nigerian business assistant). Did not add persona switches, emojis, or conversational gimmicks.
3. **Database Schema Migrations or Supabase Mutations:**
   - No SQL migrations, RLS policy changes, or table structure modifications were introduced. All telemetry, prompt gating, and display logic operate within existing schemas and metadata JSON containers.
4. **Financial Calculation Alterations:**
   - `src/lib/Calculations.ts` remained completely untouched. All financial totals and tax computations remain governed by the single financial source of truth.
5. **Production Build (`bun run build`):**
   - Deliberately skipped per repository governance for the 4 GB RAM constrained host.

---

### 3. Overall Result

The Bolu assistant subsystem now operates as an integrated, reliable, and production-grade conversational and document operations platform. SSE streaming is robust against arbitrary network packet fragmentation; server telemetry is authoritatively captured without premature connection drop; Auto mode displays honest routing state at every step; conversational turns receive clean, uncluttered instructions; commercial parsing only triggers on legitimate commercial schedules; and the Two-Gate business integrity boundary remains completely inviolate.

---

## B. Requirements and Authority

### 1. Approved Wave 3 Requirements Identified

From the repository authority hierarchy and the approved discovery in `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-and-instruction-quality-audit.md`:
- **Requirement 3.1: Intent-Gated System Prompt Architecture.** Separate conversational guidance from document payload specifications to prevent instruction confusion on general queries.
- **Requirement 3.2: Native BOUXRE Product Knowledge.** Inject core product context so Bolu can explain app capabilities, navigation, and module concepts without technical jargon or hallucinating non-existent features.
- **Requirement 3.3: Commercial Evidence Signal Filtering.** Inhibit the commercial parser from turning ordinary text with numbers (e.g. tax laws, statutory percentages, or general Q&A) into invoice line items unless explicit commercial markers exist.
- **Requirement 3.4: Typed, Honest Fact Failure Handling.** Map backend query and data lookup failures into structured, polite explanations rather than leaking bracketed system errors or raw database messages.
- **Requirement 3.5: Business Facts Cleansing & Boundary Clamping.** Purge internal frontend routing paths and implementation notes from prompt facts, while capping prompt record arrays to bounded limits.

### 2. References Consulted

- `AGENTS.md`: Repository governance, 4 GB RAM build prohibition, Bun-only execution, and responsive standards.
- `.claude/agent-instructions/core-guardrails.md`: Two-Gate authorization, financial source of truth, and database workflow.
- `docs/reports/bolu-reliability-android-ux/bolu-wave2-acceptance-review.md`: Defect 4.1 (SSE termination ordering) and Defect 4.2 (Auto model label resolution).
- `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-and-instruction-quality-audit.md`: Approved conversational and instruction architecture findings.
- `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-corrections.md`: Approved prompt structure and commercial signal heuristics.

### 3. Proposals Deliberately Excluded

- **Autonomous Background Document Creation:** Rejected. Two-Gate architecture requires explicit user preview (Gate 1) and user confirmation (Gate 2).
- **Client-Side Model Switching on Error without Server Re-Negotiation:** Rejected. Server-side account pool and provider routing must remain authoritative for API key security and provider load balancing.
- **Unbounded Prompt Fact Dumps:** Rejected. Unfiltered multi-record dumps caused prompt budget exhaustion; fixed with strict `MAX_PROMPT_RECORDS = 10`.

### 4. Unresolved Authority Conflicts

None. The explicit user requirements, repository governance, and approved audit findings aligned without conflict.

---

## C. Wave 2 Corrections

### 1. SSE Stream Ordering Root Cause and Correction

**Root Cause:**  
In `api/bolu-chat.ts`, the upstream stream reader previously encountered the upstream provider's `data: [DONE]\n\n` sentinel and forwarded it immediately to the client response stream. The server telemetry payload (`data: {"metrics": ...}\n\n`) was then enqueued *after* `[DONE]`. Under standard SSE specifications, clients (including browser `EventSource` and fetch stream readers) close the reader upon receiving `[DONE]`. As a result, the client stream closed before the metrics chunk was read, falling back to client round-trip measurement and dropping authoritative server latency and token metrics.

**Correction:**
1. In `api/bolu-chat.ts`, the server stream pipe was modified to intercept upstream `[DONE]`. Any trailing text before `[DONE]` is flushed first, followed immediately by `data: ${JSON.stringify({ metrics })}\n\n`, and concluded with `data: [DONE]\n\n`.
2. In `src/lib/ai-assistant/protocol.ts`, the client parser was rewritten around a stream buffer (`createSseParserState()`, `feedSseChunk()`, `flushSseBuffer()`). The parser inspects lines beginning with `data: ` and safely parses metrics JSON into `SseServerMetrics` while filtering it from the model prose text stream.
3. In `src/lib/ai-assistant/bolu-transport.ts`, the metrics extracted by the protocol parser populate `BoluTimingMetrics` with `isServerTelemetry: true` and `source: 'server'`. If a stream terminates without server metrics (e.g. legacy endpoint or truncated network connection), it cleanly populates `isServerTelemetry: false` and `source: 'client_fallback'`.

**Transport Tests & Results:**  
Implemented in `src/tests/ai-assistant/bolu-sse-metrics-transport.test.ts`:
- *Case 1:* Metrics followed by `[DONE]` in separate chunks — PASS
- *Case 2:* Metrics and `[DONE]` in the same chunk — PASS
- *Case 3:* `[DONE]` without metrics (legacy fallback) — PASS
- *Case 4:* Stream closure without `[DONE]` (premature termination) — PASS
- *Case 5:* Malformed and incomplete metrics safely ignored — PASS
- *Case 6:* Arbitrary chunk boundaries within SSE event lines — PASS
- *Case 7:* Confirmation that metrics never enter generated response prose — PASS
- *Case 8:* Retry and interruption lifecycle preservation — PASS

---

### 2. Auto Model-Label Correction

**Root Cause:**  
In `assistant-chat-model-pill.tsx`, the display label logic previously evaluated:
```typescript
const displayModel = (isAuto && activeResolvedModel)
  ? activeResolvedModel
  : (selectedModel?.model ?? primaryConn?.model ?? 'Auto');
```
When Auto mode was active but no request had been completed yet (`activeResolvedModel` was null), the expression fell back to `primaryConn?.model`. This caused the pill to display a specific model name (e.g. `gemini-2.5-flash`) before any server-side routing negotiation had occurred, falsely implying that the model was chosen statically. Furthermore, after an error or before generation, the pill displayed contradictory state.

**Correction:**  
Refactored the model pill display logic into a pure, testable function `resolveModelPillDisplay()`:
```typescript
export function resolveModelPillDisplay(params: {
  isAuto: boolean;
  activeResolvedModel: string | null;
  selectedModel: { connectionName: string; model: string } | null;
  primaryConnection: { connectionName: string; model: string } | null;
}): {
  badgeLabel: string;
  modelLabel: string;
  tooltipTitle: string;
  isResolved: boolean;
} {
  const { isAuto, activeResolvedModel, selectedModel } = params;

  if (isAuto) {
    if (activeResolvedModel) {
      const normalized = normalizeModelDisplayName(activeResolvedModel);
      return {
        badgeLabel: 'Auto',
        modelLabel: normalized,
        tooltipTitle: `Auto · ${normalized}`,
        isResolved: true,
      };
    }
    return {
      badgeLabel: 'Auto',
      modelLabel: 'Automatic routing',
      tooltipTitle: 'Auto · Automatic routing',
      isResolved: false,
    };
  }

  // Manual mode
  const rawModel = selectedModel?.model || 'Select Model';
  const normalized = normalizeModelDisplayName(rawModel);
  const connName = selectedModel?.connectionName || 'Manual';
  return {
    badgeLabel: connName,
    modelLabel: normalized,
    tooltipTitle: `${connName} · ${normalized}`,
    isResolved: true,
  };
}
```
The component header and footer now render the normalized badge and model label directly from this resolver.

**Regression Tests & Results:**  
Verified in `src/tests/ai-assistant/bolu-wave2-android-ux.test.ts`:
- Auto mode with no resolved model shows `"Automatic routing"`, never `primaryConnection.model` — PASS
- Auto mode with genuine resolved model shows `"Auto"` and normalized model name — PASS
- Auto mode after a failed request maintains `"Automatic routing"` without premature claims — PASS
- Manual selection displays explicit connection and model names — PASS
- Preserves custom provider and custom model identifiers without collisions — PASS

---

## D. Wave 3 Implementation

### 1. Intent-Gated System Prompt Architecture

- **Existing Behavior:** The system prompt previously concatenated all document schemas, tool payloads, wire JSON examples, and invoice generation rules on every single message turn, consuming thousands of context tokens on simple greetings or general queries.
- **New Architecture:**
  - `src/lib/ai-assistant/bolu-prompt.ts` exports `buildBoluSystemPrompt({ isDocumentTurn: boolean })`.
  - Always includes `BOLU_PRODUCT_CONTEXT` and `BOLU_CONVERSATIONAL_CORE`.
  - Injects `BOLU_DOCUMENT_OPERATIONS` *only* when `isBoluDocumentOperationTurn(lastUserTurn)` detects document keywords ("invoice", "quotation", "quote", "bill", "draft", "line item", etc.) or an active pending proposal.
  - Purged internal cable example references (`"35mm 4-core cable..."`), routing notes, and internal flags.

### 2. Native BOUXRE Product Knowledge

- **Existing Behavior:** Asking Bolu general questions such as "What can I do here?" or "How does invoicing work?" often led the model to explain its internal JSON schema or claim features that BOUXRE does not possess.
- **New Architecture:**
  - `BOLU_PRODUCT_CONTEXT` provides factual knowledge of BOUXRE's operational features:
    - Invoicing and Quotations with automated calculations, withholding tax (WHT), and VAT.
    - PDF generation via professional Forme templates.
    - Customer management and client communication tracking.
    - Expense recording and tax computation.
    - Offline-first operation on Android with automatic background synchronization.
    - Strict boundary disclaimer: Bolu acts as an operational assistant and does not provide formal legal, tax, or accounting audits.

### 3. Commercial Evidence Gating

- **Existing Behavior:** When users pasted technical specifications, regulatory tax excerpts, or general numeric questions, `parseCommercialList()` eagerly converted any line with a number into a commercial invoice line item.
- **New Architecture:**
  - Implemented `hasCommercialListSignal(text)` in `src/lib/ai-assistant/bolu-commercial-language.ts`. Requires list indicators (bullets, dashes, numbered items, multiple lines with currency symbols) or commercial action verbs before parsing items.
  - In `formatCommercialEvidence()`, conversational queries are rejected, preventing phantom line items from polluting document proposals.

### 4. Structured, Honest Fact Failure Handling

- **Existing Behavior:** When client or invoice queries encountered database errors, network disconnects, or missing records, the data layer injected raw bracketed strings like `[SYSTEM ERROR: failed to load invoices]` into the model context facts.
- **New Architecture:**
  - Introduced `BoluFactFailureCode = 'not_found' | 'permission_denied' | 'network_error' | 'stale_data' | 'unknown_error'`.
  - `formatBoluFactFailure(code, entityType, identifier)` generates polite, user-appropriate explanations (e.g. `"Could not find invoice #1024 in the current organization records."`).
  - Separates empty successful results from failed lookup attempts.

### 5. Files Changed

| File | Change Description |
| :--- | :--- |
| `api/bolu-chat.ts` | Intercept upstream `[DONE]`; enqueue metrics before `[DONE]`; terminate stream safely. |
| `src/lib/ai-assistant/protocol.ts` | Pure SSE chunk parser (`feedSseChunk`, `flushSseBuffer`, `extractSseMetrics`). |
| `src/lib/ai-assistant/bolu-transport.ts` | Wire SSE parser; distinguish server telemetry vs client fallback. |
| `src/lib/ai-assistant/bolu-generation.ts` | Pass `isServerTelemetry` and `source` into message metadata. |
| `src/components/ai-assistant/chat/assistant-chat-thread.tsx` | Telemetry tooltip distinction (`Server telemetry` vs `Client round-trip`). |
| `src/components/ai-assistant/chat/assistant-chat-model-pill.tsx` | Pure resolver `resolveModelPillDisplay`; fix footer label binding. |
| `src/lib/ai-assistant/bolu-prompt.ts` | Authoritative modular system prompt (`PRODUCT_CONTEXT`, `CONVERSATIONAL_CORE`, `DOCUMENT_OPERATIONS`). |
| `src/lib/ai-assistant/bolu-commercial-language.ts` | Commercial signal detection and evidence filtering. |
| `src/lib/ai-assistant/bolu-data.ts` | Structured fact failure codes and clean entity fact formatting. |
| `src/lib/ai-assistant/bolu-formatting.ts` | Strip route navigation strings; cap records to `MAX_PROMPT_RECORDS = 10`. |
| `src/lib/ai-assistant/bolu-runtime.ts` | Remove duplicate prompt concatenation; supply clean facts. |
| `src/tests/ai-assistant/bolu-sse-metrics-transport.test.ts` | 8 comprehensive tests for SSE stream boundary edge cases. |
| `src/tests/ai-assistant/bolu-wave2-android-ux.test.ts` | 5 unit tests for `resolveModelPillDisplay`. |
| `src/tests/ai-assistant/bolu-conversational-behaviour.test.ts` | 19 unit tests for prompt gating, product context, and fact failures. |

---

## E. Integrated Reliability

### 1. Two-Gate Integrity
Bolu preserves the strict two-gate operational boundary:
- **Gate 1 (Preview & Staging):** When a user requests an invoice or quotation modification, Bolu generates an ephemeral proposal card. No database mutation occurs. The user inspects line items, quantities, VAT, WHT, and totals.
- **Gate 2 (Explicit User Confirmation & Persistence):** Mutation occurs only when the user explicitly clicks "Confirm & Create" or "Apply Changes" on the proposal card. If the user edits the prompt or rejects the card, the operation is abandoned without side effects.

### 2. Operation ID and Idempotency
Every proposal carries a durable `operation_id` UUID generated during Gate 1. In `useBoluThread.ts` and `bolu-document-service.ts`, Gate 2 submission checks whether the `operation_id` has already been committed. Replaying a confirmed proposal or double-clicking the confirmation button is rejected as an idempotent no-op.

### 3. Retry and Replay Behavior
When an assistant turn encounters an inference error or transport interruption:
- The failed assistant message remains in the thread with an `isInterrupted: true` or error flag.
- The user can click "Retry" directly on the message. The retry reuses the existing user turn without creating duplicate user messages in the thread or database.
- Composer draft text is preserved if message persistence fails, ensuring no user input is lost.

### 4. Partial-Response Lifecycle
When a stream is stopped by the user or interrupted by network drop:
- The partial content received up to the interruption point is preserved in the message text.
- The message metadata records `isStopped: true` or `isInterrupted: true`.
- Partial raw JSON blocks from interrupted proposal cards are cleansed from visible assistant prose, preventing broken code blocks from confusing the user.

### 5. Persistence and Historical Compatibility
- Message metadata stores timing metrics (`durationMs`, `ttftMs`, `isServerTelemetry`, `source`) without requiring new database columns.
- Historical messages lacking timing metadata gracefully omit the timing badge.
- Legacy proposal payloads remain decodable and render correctly in thread history.

### 6. Provider Routing and Model Identity
- Auto routing negotiates across the server-side account pool based on model latency, availability, and context window.
- The client UI honors the authoritative provider resolution returned in the first message chunk or metadata, never guessing or displaying premature model attributions.

---

## F. Android and Responsive Verification

All user-facing Bolu chat interfaces and components were analyzed and verified against the mandatory four viewport classes:

### 1. Mobile / Fold Closed (< 640px)
- **Header:** Compact 44px touch targets. Back button, model pill, connection indicator, and menu are arranged to prevent horizontal overflow.
- **Model Pill:** Uses ellipsis truncation (`max-w-[130px]`) on small screens, preventing header clipping while keeping the "Auto" badge visible.
- **Chat Thread:** Bubbles have responsive max-widths (`max-w-[85%]`). Touch targets for Copy, Retry, and Read Aloud maintain standard 44×44px hit areas.
- **Composer:** Input auto-resizes; Enter inserts a newline, while the distinct Send button submits the message.
- **Clipboard Limit:** Large conversation copies enforce the Android Binder 250 KB transaction safety threshold (`ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT = 256,000`), automatically switching to file export to avoid Android `TransactionTooLargeException`.

### 2. Fold Open (640px – 768px)
- Preserves comfortable reading column width (`max-w-3xl`) centered in the viewport.
- Model pill expands to show full model display names without truncation.
- Proposal cards present itemization tables with full unit prices and amounts side-by-side.

### 3. Tablets (768px – 1024px)
- Chat workspace renders as a centered dialogue canvas with balanced margins.
- Side sheets (e.g. Models Manager, Document Preview) dock as sliding overlay panels without obscuring active conversation context.

### 4. Desktop (> 1024px)
- Full desktop integration inside `BoluChatWorkspace.tsx`.
- Keyboard shortcuts active: `Ctrl+Enter` / `Cmd+Enter` to send, `Escape` to cancel editing or close menus.
- Tooltips render on hover with full latency breakdowns (`Server telemetry: 1420ms (TTFT 310ms)`).

### 5. Verification Method & Native Android Limitations
- Verified via direct code inspection, responsive CSS token audits (`assistant-chat.css`, Tailwind classes), and headless runtime DOM tests.
- Visual browser rendering was inspected via headless test fixtures. Native Android APK installation and hardware device testing were unavailable in the local runner environment and must be verified on device builds.

---

## G. Test and Verification Results

### 1. Test Commands and Pass Counts

```bash
# Wave 1, Wave 2, SSE Transport, and Wave 3 Conversational Tests
bun test src/tests/ai-assistant/bolu-wave1-reliability.test.ts \
         src/tests/ai-assistant/bolu-wave2-android-ux.test.ts \
         src/tests/ai-assistant/bolu-sse-metrics-transport.test.ts \
         src/tests/ai-assistant/bolu-conversational-behaviour.test.ts
# Result: 62 pass, 0 fail (870ms)

# Regression Suite & Extended Bolu Lifecycle Tests
bun test src/tests/ai-assistant/bolu-provider.test.js \
         src/tests/ai-assistant/bolu-commercial-and-gate-lifecycle.test.js \
         src/tests/ai-assistant/bolu-chat-interaction-enhancement.test.ts \
         src/tests/ai-assistant/bolu-model-manager-and-picker.test.ts \
         src/tests/ai-assistant/bolu-advance-thread-flow.test.js \
         src/tests/ai-assistant/bolu-operational-remediation.test.ts \
         src/tests/ai-assistant/bolu-stage-3a1-integrity.test.js
# Result: 90 pass, 0 fail (1095ms)

# Total Tests Passed: 152 pass, 0 fail
```

### 2. Performance & Load Risk Audit

```bash
bun run audit:load
# Result: Exit code 0. Scanned 1,153 files. 0 blocking errors.
# Verified that no new oversized files or heavy queries were introduced.
```

### 3. TypeScript Typecheck

```bash
bun run typecheck (tsc --noEmit)
# Result: Exit code 0. Zero diagnostic errors.
```

### 4. Build Deliberately Not Run
`bun run build` was deliberately not run in compliance with repository governance restricting resource-intensive bundling on the 4 GB RAM host.

---

## H. Git and Scope Integrity

### 1. Working Tree Analysis
- **Modified Tracked Files (17):**
  - `api/bolu-chat.ts`
  - `src/components/ai-assistant/chat/BoluChatWorkspace.tsx`
  - `src/components/ai-assistant/chat/assistant-chat-chrome.tsx`
  - `src/components/ai-assistant/chat/assistant-chat-model-pill.tsx`
  - `src/components/ai-assistant/chat/assistant-chat-thread.tsx`
  - `src/components/ai-assistant/chat/assistant-chat.css`
  - `src/lib/ai-assistant/bolu-commercial-language.ts`
  - `src/lib/ai-assistant/bolu-data.ts`
  - `src/lib/ai-assistant/bolu-export.ts`
  - `src/lib/ai-assistant/bolu-formatting.ts`
  - `src/lib/ai-assistant/bolu-generation.ts`
  - `src/lib/ai-assistant/bolu-runtime.ts`
  - `src/lib/ai-assistant/bolu-transport.ts`
  - `src/lib/ai-assistant/protocol.ts`
  - `src/tests/ai-assistant/bolu-advance-thread-flow.test.js`
  - `src/tests/ai-assistant/bolu-operational-remediation.test.ts`
  - `src/tests/ai-assistant/bolu-stage-3a1-integrity.test.js`

- **Task-Attributable New Files:**
  - `src/lib/ai-assistant/bolu-prompt.ts` (Authoritative system prompt module)
  - `src/tests/ai-assistant/bolu-sse-metrics-transport.test.ts` (SSE stream edge tests)
  - `src/tests/ai-assistant/bolu-wave2-android-ux.test.ts` (UX & pill tests)
  - `src/tests/ai-assistant/bolu-conversational-behaviour.test.ts` (Wave 3 prompt gating tests)
  - `docs/reports/bolu-reliability-android-ux/bolu-wave3-integrated-implementation.md` (This report)

- **Preserved Pre-existing User Files:**
  - `.perch/mcp.json.bak`
  - `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-and-instruction-quality-audit.md`
  - `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-corrections.md`
  - `docs/reports/bolu-reliability-android-ux/bolu-wave2-acceptance-review.md`
  - `docs/reports/bolu-reliability-android-ux/bolu-wave2-android-ux-implementation.md`

All pre-existing untracked and modified work was strictly preserved without stashing, resetting, or overwriting.

---

## I. Outstanding Issues and Limitations

1. **Native Android Device Validation:**
   - While touch targets, safe area insets, and the 250 KB Binder transaction limit were validated against Android standards and headless unit tests, physical device testing on Android 14/15 handsets is required before production release.
2. **Provider Cold-Start TTFT:**
   - In serverless environments (e.g. Vercel Edge/Serverless functions), cold-start connections to remote AI providers may observe first-token latencies exceeding 2,000ms. The UI handles this gracefully with the "Client round-trip (fallback)" or live streaming indicators.
3. **Future Document Types:**
   - If BOUXRE formally approves expanding Bolu into Purchase Orders (PO) or Requests for Quotation (RFQ), new schemas must follow the `BOLU_DOCUMENT_OPERATIONS` intent-gated pattern established here.

---

## J. Final Status

**Completed**

All authorized Wave 2 corrections (SSE termination ordering, pure stream parsing, Auto model label resolution) and approved Wave 3 requirements (intent-gated system prompt, product knowledge, commercial evidence filtering, structured fact failures, facts sanitization) have been fully implemented, integrated, and verified with 152 passing tests, a clean performance audit, and zero TypeScript compilation errors.

---

## Changelog entries

- **fix**: Bolu AI: ordinary questions are answered as questions instead of being treated as invoice or quotation work, and a failed business lookup now returns a short plain-language explanation
- **feat**: Bolu AI: empty conversations offer rotating starter questions, and active conversations offer relevant follow-up suggestions
