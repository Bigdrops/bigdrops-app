# Bolu Wave 2 Implementation — Independent Acceptance Review

This report was written by Antigravity on 2026-11-22 via Local Runner.

Task classification: Read-only implementation review and acceptance audit  
Documentation standard: ASD-STE100 Simplified Technical English  

---

## 1. Overall Decision

**Decision: ACCEPTED WITH LIMITATIONS**

The Wave 2 implementation successfully addresses the core user experience limitations identified in the audit:
- The compact header model picker width restrictions are removed, and model identifiers are cleanly normalized without altering underlying technical IDs.
- Direct plain text conversation copying is implemented across desktop and mobile header menus with an enforced 250 KB Android Binder safeguard and automated Markdown file download fallback.
- User-aborted turns and interrupted streams are clearly distinguished in both presentation and persisted state, preserving clean partial Markdown prose and providing in-place retry capabilities.
- All 18 dedicated Wave 2 unit tests and 12 Wave 1 non-regression tests pass cleanly. `bun run audit:load` and `bun run typecheck` both exit with code 0 (zero errors).

However, **two material technical limitations** require explicit gating before Wave 3 or production deployment:
1. **SSE Server Metrics Stream Ordering Defect:** In `api/bolu-chat.ts`, the server `metrics` event is enqueued after `data: [DONE]`. Because `src/lib/ai-assistant/bolu-transport.ts` breaks immediately upon encountering `data: [DONE]`, the server-measured metrics are ignored on streams terminated with `[DONE]`. The client transparently operates on client-side fallback timing (`fallbackDurationMs`) rather than authoritative server metrics.
2. **Auto Mode Initial Model Indicator Ambiguity:** In `assistant-chat-model-pill.tsx`, when `isAuto` is active and `activeResolvedModel` is null (prior to the first request in a session), the UI falls back to displaying `activeProvider?.model` (e.g. `gemini-2.5-flash`), presenting an unverified model assumption before routing negotiation has occurred.
3. **Four-Viewport Verification Evidence Limitation:** Verification of the four viewport classes was conducted strictly via CSS structure and component code analysis. No visual rendering screenshots or Playwright/emulator image captures were recorded.

---

## 2. Review Findings by Stage

### Stage A: Header & Model Identity

**File Inspected:** `src/components/ai-assistant/chat/assistant-chat-model-pill.tsx`, `src/components/ai-assistant/chat/assistant-chat.css`

#### Verified Properties:
1. **Technical Identifier Preservation:** In `assistant-chat-model-pill.tsx`, `normalizeModelDisplayName()` (lines 53–93) is strictly a presentation-layer transform. When a user selects a model, `handleSelect` (lines 307–315) passes `model.id` (the unmodified technical ID, e.g. `anthropic/claude-3-5-sonnet` or `models/gemini-2.5-flash`) to `onSelectModel`. In `BoluChatWorkspace.tsx` (lines 294–295), `selectedModel.modelId` is passed directly to `useBoluThread` and `sendBoluProviderRequest`. The underlying API request and routing payloads remain unaltered.
2. **Distinct Model Disambiguation:** Normalization removes redundant prefixes while preserving model distinctions. The test suite confirms:
   - `models/gemini-2.5-flash` → `gemini-2.5-flash`
   - `models/gemini-2.5-pro` → `gemini-2.5-pro`
   - `anthropic/claude-3-5-sonnet` → `claude-3-5-sonnet`
   - `anthropic/claude-3-5-haiku` → `claude-3-5-haiku`
   Distinct variants never collide into generic vendor names.
3. **Custom OpenAI-Compatible Model Preservation:** Models without vendor slashes (e.g. `gpt-4o`, `mistral-large`) or custom self-hosted endpoints pass through the regex check unaltered and display their clean names.
4. **CSS Layout Flexibility:** In `src/components/ai-assistant/chat/assistant-chat.css`, the rigid `max-w-[70px]` clamp was removed from `.ac-model-provider` and `.ac-model-name`. The button trigger in `assistant-chat-model-pill.tsx` uses adaptive classes (`max-w-[190px] xs:max-w-[220px] sm:max-w-[280px] min-w-0 shrink`), with `text-overflow: ellipsis` preventing horizontal header blowout on narrow viewports (<360px).

#### Identified Limitation:
- **Premature Model Label in Auto Mode:** In `assistant-chat-model-pill.tsx` (lines 297–299):
  ```typescript
  const rawModelName = isAuto
    ? (activeResolvedModel || activeProvider?.model || 'Best in Pool')
    : (selectedModel?.modelName || activeProvider?.model || 'Selected Model')
  ```
  Prior to submitting the first turn, `activeResolvedModel` is null. The component falls back to `activeProvider?.model`, which defaults to the primary connection's configured model (typically `gemini-2.5-flash`). This visually indicates to the user that `gemini-2.5-flash` has been chosen by Auto mode, even though the backend routing engine has not yet evaluated the prompt. Once a turn completes and headers return `resolvedModel`, the pill abruptly updates if a different provider was negotiated.

---

### Stage B: Response Timing & SSE Transport Protocol

**Files Inspected:** `api/bolu-chat.ts`, `src/lib/ai-assistant/bolu-transport.ts`, `src/lib/ai-assistant/bolu-generation.ts`, `src/components/ai-assistant/chat/assistant-chat-thread.tsx`

#### Verified Properties:
1. **Separation from Generated Prose:** `extractSseText()` in `src/lib/ai-assistant/protocol.ts` strictly requires a `choices` array (`(parsed as { choices?: unknown }).choices`). The metrics payload `{"metrics": {...}}` lacks a `choices` property. `extractSseText` returns `null`, ensuring server metrics are never injected into conversational prose or streaming buffers.
2. **Persistence and Reload Reconstruction:** In `bolu-generation.ts` (lines 319–356), `timingMetadata` (`completedAt`, `durationMs`, `ttftMs`) is stored in `bolu_messages.metadata`. `MESSAGE_COLUMNS` in `src/lib/ai-assistant/hooks/types.ts` explicitly includes `metadata`. On page reload, `mapRowToMessage()` reconstructs `message.metadata`, and `formatResponseTiming()` reproduces the `HH:mm · Xs` label.
3. **Incomplete Generation Guard:** In `assistant-chat-thread.tsx` (line 217):
   ```typescript
   const timingLabel = isCompleted ? formatResponseTiming(message.metadata) : null
   ```
   `timingLabel` is conditionally evaluated only when `message.status === 'completed'`. Stopped, failed, and interrupted turns never display completion timing labels.
4. **Historical Message Compatibility:** `formatResponseTiming(metadata)` returns `null` if `durationMs` or `completedAt` are absent or if the date string is invalid. Messages generated prior to Wave 2 render cleanly without runtime errors or blank placeholders.

#### Material Defect Identified:
- **Stream Termination Ordering Defect:**
  In `api/bolu-chat.ts` (lines 316–318):
  ```typescript
  if (text.includes('data: [DONE]') || text.includes('[DONE]')) {
    await finalizeStream(controller)
    break
  }
  ```
  The upstream chunk containing `data: [DONE]` is enqueued into the stream controller at line 313 *before* `finalizeStream()` enqueues the `data: {"metrics": ...}` payload at line 277.
  In `src/lib/ai-assistant/bolu-transport.ts` (lines 104–107):
  ```typescript
  if (trimmed === 'data: [DONE]' || trimmed === '[DONE]') {
    isDone = true
    break
  }
  ```
  When the client transport encounters `data: [DONE]`, it immediately breaks from the line iteration and sets `isDone = true`, which then breaks out of the `while (true)` stream reading loop (line 130).
  **Impact:** Any stream from an upstream provider that terminates with `data: [DONE]` (OpenAI, OpenRouter, Groq) terminates client reading before the `data: {"metrics": ...}` payload is processed. `serverMetrics` remains null, and the transport client silently executes the fallback:
  ```typescript
  const metrics: BoluTimingMetrics = serverMetrics ?? {
    completedAt: new Date().toISOString(),
    durationMs: fallbackDurationMs,
    ttftMs: null,
  }
  ```
  The user interface presents client-measured round-trip latency (`fallbackDurationMs`), while the authoritative server-measured metrics (`durationMs` and `ttftMs`) are discarded.

---

### Stage C: Conversation Copying & Android Binder Safety

**Files Inspected:** `src/lib/ai-assistant/bolu-export.ts`, `src/components/ai-assistant/chat/BoluChatWorkspace.tsx`, `src/components/ai-assistant/chat/assistant-chat-chrome.tsx`, `src/lib/clipboard.ts`

#### Verified Properties:
1. **Sanitization of Exported Content:** `formatConversationAsPlainText()` (lines 121–164) filters for `role === 'user'` and `role === 'assistant'`. System instructions, context facts, internal tool calls, and raw JSON envelopes are excluded. Document proposals are formatted as safe business summaries (e.g. `[Draft invoice · pending_approval (Total: ₦107,500)]`), preventing leakage of internal database keys or entity IDs.
2. **Accurate UTF-8 Byte Measurement:** `byteLength` is measured via `new TextEncoder().encode(plainText).length`, accurately accounting for multi-byte Unicode characters (e.g. Naira `₦` symbol, emojis) rather than relying on UTF-16 `.length`.
3. **Android Binder 250 KB Ceiling:** The threshold constant `ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT` is set to `250 * 1024` (256,000 bytes). If a transcript exceeds this threshold, `copyConversationToClipboard()` terminates before invoking clipboard APIs and returns `{ success: false, fallbackToExport: true }`. This prevents Android IPC buffer overflow (`android.os.TransactionTooLargeException`).
4. **Automated Markdown Export Fallback:** In `BoluChatWorkspace.tsx` (lines 475–492), when `fallbackToExport` is true, the workspace displays an informational toast (`Downloading transcript file...`) and immediately executes `exportChatAsMarkdown()`, saving the complete, untruncated conversation to the device via the native MediaStore download bridge.
5. **Menu Integration:** "Copy conversation" is wired into both the desktop overflow dropdown and the mobile bottom sheet in `assistant-chat-chrome.tsx` with proper ARIA attributes (`role="menuitem"`) and idempotent click handlers.
6. **Empty Conversation Safety:** When zero dialogue turns exist, `formatConversationAsPlainText` returns `''`, and `copyConversationToClipboard` safely returns `{ success: false, byteLength: 0 }` with an informational notice, avoiding empty clipboard writes.

---

### Stage D: Stopped & Interrupted Response Lifecycle

**Files Inspected:** `src/lib/ai-assistant/bolu-generation.ts`, `src/components/ai-assistant/chat/assistant-chat-thread.tsx`, `src/lib/ai-assistant/bolu-thread-actions.ts`

#### Verified Properties:
1. **Distinguishable Persistence State:**
   - User Stop: Handled in `bolu-generation.ts` (lines 422–430) on `AbortError`. Persists `status: 'stopped'` with clean partial content and empty error metadata.
   - Interruption: Handled in `bolu-generation.ts` (lines 432–455) on non-abort errors. Persists `status: 'failed'`, partial content in `content`, and `{ isInterrupted: true, error: errorMsg }` in `metadata`.
   - In PostgreSQL, stopped turns have `status = 'stopped'`, while interrupted turns have `status = 'failed'` with `metadata->>'isInterrupted' = 'true'`.
2. **Prose Isolation:** Partial tokens are saved to `message.content` as pure Markdown. Error descriptions reside exclusively in `message.metadata.error`. The UI renders partial prose via `AssistantMarkdown`, followed by a separate rose-tinted warning card (`Generation Interrupted`). Raw error strings are never prepended or appended to the prose.
3. **Copy Availability:** In `assistant-chat-thread.tsx` (line 218), `canCopy = (isCompleted || isStopped || isInterrupted) && prose.trim().length > 0`. Users can copy partial output from stopped or interrupted turns.
4. **Safe In-Place Retry:** Clicking "Retry" invokes `onRegenerateMessage(message)`, which routes through `regenerateBoluResponse()` in `src/lib/ai-assistant/bolu-thread-actions.ts`.
   - Locates the preceding user turn without creating duplicate user messages.
   - Marks downstream messages as superseded.
   - Passes `replaceAssistantId` to `runGeneration()`, updating the existing assistant row in place (`.eq('id', replaceAssistantId)`).
   - Re-evaluates context facts and generates a fresh response with new timing metadata, completely replacing previous error metadata.
5. **Business Operation Idempotency:** An interrupted turn by definition never reached Gate 1 approval or Gate 2 save confirmation. If a turn is retried, Wave 1 idempotency guarantees (`opId` binding) prevent duplicate entity creation.

---

## 3. Four-Viewport Responsive Evidence Status

The four viewport classes specified in `AGENTS.md` were evaluated against repository code:

| Viewport Class | Breakpoint Criteria | Structural Code Verification | Visual Inspection Status |
| :--- | :--- | :--- | :--- |
| **Mobile / Fold Closed** | `< 768px` | Single-column flex layout; header action overflow menu; pill width clamped to `max-w-[190px]`; drawer slide-out for history; full-screen sheet for context panel. | **Code-verified only.** No visual screenshot or rendered DOM capture in repository. |
| **Fold Open** | `768px – 1023px` | Header flex row unclamps pill to `max-w-[220px]`; responsive drawer triggers intact; timing label displays inline in action row. | **Code-verified only.** No visual screenshot in repository. |
| **Tablets** | `1024px – 1279px` | Dual-pane split layout; persistent left rail; top header actions displayed with direct icon buttons. | **Code-verified only.** No visual screenshot in repository. |
| **Desktop** | `≥ 1280px` | Full multi-column canvas; model pill trigger expands up to `max-w-[280px]`; dropdown search dialog centers with collision-aware margins. | **Code-verified only.** No visual screenshot in repository. |

**Evidence Classification:** Structural CSS and component logic are verified. Visual rendering claims remain agent-reported.

---

## 4. Test Suite Quality and Independent Verification

### Test Suite Execution
Independent execution of test suites confirmed:
- `bun test src/tests/ai-assistant/bolu-wave2-android-ux.test.ts` → **18 passed, 0 failed (256ms)**
- `bun test src/tests/ai-assistant/bolu-wave1-reliability.test.ts` → **12 passed, 0 failed (151ms)**
- `bun run audit:load` → **Exit code 0 (Pass)**
- `bun run typecheck` (`tsc --noEmit`) → **Exit code 0 (0 errors, Pass)**

### Test Quality Assessment
1. **Strengths:**
   - Real function executions are tested for model normalization, response timing formatting, plain text conversation generation, and boundary enforcement.
   - Boundary tests confirm that 250 KB transitions cleanly into `fallbackToExport: true`.
   - Tests assert that proposal summaries omit raw JSON envelopes and that interrupted turn metadata isolates error text from prose.
2. **Identified Test Gap:**
   - The test suite contains no integration test simulating an SSE stream reader with `data: [DONE]` and `data: {"metrics": ...}`.
   - Because `sendBoluProviderRequest` was not tested against a multi-chunk mock stream terminating in `[DONE]`, the stream termination ordering defect described in Stage B was not caught by the unit tests.

---

## 5. Scope and Governance Compliance

- **Authorized Scope:** Changes were confined to 9 files across UI, transport, generation, export, and CSS.
- **Excluded Areas Preserved:** No changes were made to RFQ/procurement logic, financial calculations (`Calculations.ts`), database migrations, or server deployment scripts.
- **Git State:** All pre-existing modified and untracked files (`.perch/mcp.json.bak`, `docs/reports/ai-BOLU/...`, `src/lib/ai-assistant/bolu-prompt.ts`) remain untouched.
- **Tooling Constraints:** Bun was used exclusively. `bun run build` was not executed.

---

## 6. Closure and Progression Assessment

### Can Wave 2 Be Closed?
**Yes, with accepted limitations.** The Wave 2 deliverables are functional, non-destructive, and substantially improve Android and web usability. The two identified limitations do not cause runtime crashes, data loss, or visual breakage:
- The SSE ordering defect gracefully falls back to client-measured round-trip latency (`fallbackDurationMs`), so the user still sees responsive timing (`20:48 · 2.4s`).
- The Auto mode model pill fallback displays a valid provider model, which updates to the true resolved model once the first turn completes.

### Conditions for Wave 3 Progression
Before commencing Wave 3 (or as an early patch in Wave 3):
1. **Fix SSE Metrics Termination Order:** In `api/bolu-chat.ts`, emit the `metrics` event *before* emitting `data: [DONE]`, or in `src/lib/ai-assistant/bolu-transport.ts`, ensure any trailing lines in the final buffer containing `metrics` are parsed before breaking on `[DONE]`.
2. **Neutralize Auto Mode Label Before Resolution:** In `assistant-chat-model-pill.tsx`, display `Auto` / `Automatic Routing` when `isAuto` is true and `activeResolvedModel` is null, rather than prematurely displaying `primaryConn.model`.

---

## 7. Review Summary

- **Task Status:** Completed
- **Overall Decision:** Accepted with limitations
- **Files Inspected:** 9 modified files + 2 test suites
- **Verification Gates Passed:** `bun test` (30/30 passed), `audit:load` (pass), `typecheck` (pass, 0 errors)
- **Defects Identified:** 1 transport stream ordering defect (telemetry fallback active), 1 UI label ambiguity in Auto mode
