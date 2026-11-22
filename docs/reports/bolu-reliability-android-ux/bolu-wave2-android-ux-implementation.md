# Bolu Wave 2 Android UX Implementation Report

This report was written by Antigravity on 2026-11-22 via Local Runner.

Skills used: NONE  
Documentation standard: ASD-STE100 Simplified Technical English  

---

## 1. Executive Summary

This report documents the implementation and verification of Wave 2 of the Bolu Assistant reliability and Android UX improvements.

Wave 1 established payload budgets (32,000 characters per message, 64,000 characters total conversation history, 32,000 characters context facts), deterministic turn pruning, typed validation codes, draft persistence safety, safe in-place turn retry, idempotency, and citation artifact cleanup.

Wave 2 delivers the user interface polish and operational telemetry required for production deployment on Android devices and modern web viewports:

1. **Stage A — Compact Chat Header and Model Picker:** Removed hardcoded 70px width restrictions and normalized model identifiers (removing redundant `models/`, `google/`, `anthropic/`, and vendor namespaces while preserving distinct model identities). The header maintains a clean single horizontal row across all four required viewport classes without overflowing or clipping controls.
2. **Stage B — Assistant Response Timing and Telemetry:** Extended the server-sent events (SSE) transport protocol to deliver authoritative server-side generation metrics (`completedAt`, `durationMs`, `ttftMs`). Stored response timing directly in `bolu_messages.metadata`. Rendered a subtle local timestamp and duration label (e.g. `20:48 · 2.4s`) adjacent to the copy action on completed assistant turns.
3. **Stage C — Direct Conversation Copying with Android Binder Protection:** Implemented plain text conversation formatting and copy-to-clipboard functionality across mobile and desktop headers. Strictly enforced a 250 KB (`ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT`) size threshold to protect Android IPC buffers from `android.os.TransactionTooLargeException`. Provided automatic fallback to unclipped Markdown file export when transcripts exceed 250 KB or clipboard writes fail.
4. **Stage D — Accurate Stopped and Interrupted Response Presentation:** Separated user-stopped generation from transport failures. User-aborted responses display a clear amber indicator badge (`⏹ Generation stopped by user`). Interrupted network streams render all partial generated tokens as readable Markdown prose accompanied by an in-place Retry action card, keeping error notices cleanly isolated from conversational text.

All Wave 1 and Wave 2 test suites passed completely (30 tests across 2 suites), and the project passed full verification (`bun run audit:load` and `bun run typecheck`).

---

## 2. Scope Boundaries and Authority

All work followed the rules defined in root `AGENTS.md`:

- **Runtime & Package Management:** Executed commands with Bun only. No `npm`, `yarn`, or `pnpm` was used.
- **Build Constraints:** `bun run build` was never executed on the host.
- **Git State:** All pre-existing work and branch states were preserved without staging, committing, or stashing.
- **Architectural Scope:** Changes were strictly restricted to the Bolu assistant interface, transport, export, generation, and dedicated test files. No database migrations, procurement RFQ implementations, or financial calculation logic were modified.

---

## 3. Implementation Details by Stage

### Stage A: Compact Header & Model Picker Normalization

#### Problem
On mobile Android viewports (< 400px), CSS rules clamped the model pill trigger to an artificial width (`max-w-[70px]`), truncating model names into illegible strings such as `Auto · models/gemi...`. Raw API prefixes (e.g. Google's `models/` path prefix or OpenRouter vendor namespaces like `anthropic/` or `deepseek/`) cluttered the compact header.

#### Solution
- **Model Display Normalization (`normalizeModelDisplayName`):**
  Added and exported `normalizeModelDisplayName(modelId, modelLabel, providerName)` in `src/components/ai-assistant/chat/assistant-chat-model-pill.tsx`.
  - Automatically strips Google API `models/` prefix (e.g. `models/gemini-2.5-flash` → `gemini-2.5-flash`).
  - Strips vendor prefixes when redundant or identified by provider context (e.g. `google/gemini-2.5-flash` → `gemini-2.5-flash`, `anthropic/claude-3-5-sonnet` → `claude-3-5-sonnet`, `deepseek/deepseek-chat` → `deepseek-chat`).
  - Preserves distinct model variants without collision (e.g. `gemini-2.5-flash` vs `gemini-2.5-pro` vs `gemini-1.5-pro`).
  - Uses curated human-friendly labels when available (e.g. `Llama 3.3 70B Instruct`).
- **Flexible CSS Layout:**
  Updated `src/components/ai-assistant/chat/assistant-chat.css`:
  - Removed `.max-w-[70px]` clamp from `.ac-model-provider` and `.ac-model-name`.
  - Configured `.ac-model-text` with `min-width: 0; overflow: hidden; display: flex; flex-direction: column`.
  - Configured labels with `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
  - Widened button trigger to `max-w-[190px] xs:max-w-[220px] sm:max-w-[280px]` with flex `min-w-0 w-full`.
- **Auto Mode Resolution Display:**
  When in Auto mode (`selectedModel === null`), the model pill displays `Auto · <Active Resolved Model>` once the backend resolves the routing target.

---

### Stage B: Response Timing & Server Telemetry

#### Problem
The serverless endpoint `api/bolu-chat.ts` measured time-to-first-token (TTFT) and total generation time, but discarded these metrics at stream completion. The client had no insight into model response timing, and message bubbles displayed no telemetry.

#### Solution
- **Authoritative Server Metric Transport:**
  In `api/bolu-chat.ts`, updated `finalizeStream()` to enqueue a final SSE data payload immediately before controller close:
  ```typescript
  controller.enqueue(
    encoder.encode(
      `data: ${JSON.stringify({
        metrics: {
          completedAt: new Date().toISOString(),
          durationMs: metrics.generationMs,
          ttftMs: metrics.ttftMs,
        },
      })}\n\n`,
    ),
  )
  ```
- **Client Transport Parsing:**
  In `src/lib/ai-assistant/bolu-transport.ts`:
  - Defined `BoluTimingMetrics` (`completedAt: string`, `durationMs: number`, `ttftMs?: number`).
  - Captured start timestamp via `performance.now()`.
  - Extracted SSE `data: {"metrics": ...}` lines during stream decoding.
  - Returned authoritative server metrics with client-side fallback if server telemetry is omitted.
- **Metadata Persistence:**
  In `src/lib/ai-assistant/bolu-generation.ts`, updated `persistAssistantTurnStatus()` to accept `extraMetadata?: Record<string, unknown>`. Upon turn completion, `timingMetadata` is merged into `bolu_messages.metadata`.
- **Subordinate Display in Chat Thread:**
  In `src/components/ai-assistant/chat/assistant-chat-thread.tsx`:
  - Implemented `formatResponseTiming(metadata)` returning local formatted string (e.g. `20:48 · 2.4s`).
  - Rendered `timingLabel` in the message action row adjacent to `CopyButton` on completed assistant turns.
  - Returned `null` for historical messages or turns missing duration metrics.

---

### Stage C: Direct Conversation Copying & 250 KB Android Binder Limit

#### Problem
Users could only extract conversation records by downloading `.md` or `.json` files. Mobile users often need to copy transcripts directly into WhatsApp, Slack, or email. Furthermore, pushing arbitrarily large payloads to the Android clipboard can trigger `android.os.TransactionTooLargeException` because the Android Linux kernel `/dev/binder` IPC driver shares a 1 MB buffer across the entire process.

#### Solution
- **Clean Plain Text Formatting (`formatConversationAsPlainText`):**
  Added to `src/lib/ai-assistant/bolu-export.ts`:
  - Formats dialogue turns into readable plain text with title, export timestamp, and speaker prefixes (`User (HH:mm):` / `Bolu (HH:mm):`).
  - Omits system messages, internal tools, and raw JSON envelopes.
  - Translates document proposals into readable summaries (e.g. `[Draft invoice · pending_approval (Total: ₦107,500)]`).
- **Android Binder Safeguard (`ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT`):**
  - Set constant `ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT = 250 * 1024` (250 KB).
  - In `copyConversationToClipboard()`:
    - Calculates UTF-8 byte length via `new TextEncoder().encode(plainText).length`.
    - If payload exceeds 250 KB, halts clipboard transmission and flags `fallbackToExport: true` with a clear user notice.
    - If clipboard write fails or permissions are denied, flags `fallbackToExport: true`.
- **UI Integration in Header Menus:**
  - Added `onCopyConversation?: () => void` to `AssistantHeader` in `src/components/ai-assistant/chat/assistant-chat-chrome.tsx`.
  - Surfaced "Copy conversation" item in both desktop overflow menu and mobile action sheet.
  - In `src/components/ai-assistant/chat/BoluChatWorkspace.tsx`, connected `handleCopyConversation`:
    - Shows success toast on clean clipboard write.
    - Automatically triggers `exportChatAsMarkdown()` if payload exceeds 250 KB or clipboard fails.

---

### Stage D: Accurate Stopped & Interrupted Response Presentation

#### Problem
Aborted or failed generations previously displayed an unformatted red error banner, and partial tokens were either discarded or concatenated with ugly bracketed error strings like `[Generation interrupted: ...]`. Users could not distinguish between intentional stops and network resets, and could not easily copy partial generated answers.

#### Solution
- **Clean Message Prose Isolation:**
  In `src/lib/ai-assistant/bolu-generation.ts`:
  - Preserved partial tokens as pure Markdown prose in `message.content = partial`.
  - Stored error details and state flags in `metadata` (`isInterrupted: true`, `error: errorMsg`) instead of polluting markdown text.
- **Amber Stopped Indicator Badge:**
  When a user clicks "Stop" (`isStopped: true`), the thread displays an amber status badge:
  ```tsx
  <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md w-fit">
    <Square className="w-3 h-3 fill-current" />
    <span>Generation stopped by user</span>
  </div>
  ```
- **Interrupted Stream Presentation with In-Place Retry:**
  In `src/components/ai-assistant/chat/assistant-chat-thread.tsx`:
  - Interrupted turns display all generated tokens as readable prose.
  - Directly beneath the prose, a compact rose-tinted banner informs the user that generation was interrupted and provides an immediate "Retry" button.
  - Zero-token failures retain the standard error alert card.
  - The copy action (`canCopy`) remains enabled on interrupted and stopped turns, allowing users to salvage partial output.

---

## 4. Responsive Viewport Verification Matrix

Following project governance standards, the interface changes were verified across all four required viewport classes:

| Viewport Class | Breakpoint Criteria | Layout Behavior & Verification Result |
| :--- | :--- | :--- |
| **Mobile / Fold Closed** | `< 768px` (Phone) | Single-column layout. Compact header places Bolu identity on left, Model Pill in center, and action icons on right. Overflow menu exposes "Copy conversation", "Export Markdown", "Export JSON", and "Clear Chat". Model pill expands up to 190px–220px without pushing action buttons offscreen. Verified. |
| **Fold Open** | `768px – 1023px` (Foldable) | Expanded horizontal header. Model pill expands up to 280px. Slide-out history rail drawer and side context panel available on demand. Timing metadata displays cleanly next to copy button. Verified. |
| **Tablets** | `1024px – 1279px` (Tablet) | Split layout with collapsible left history rail. Header action row presents desktop-style buttons with icon tooltips and overflow dropdown. Verified. |
| **Desktop** | `≥ 1280px` (Workstation) | Full dual-pane workspace. Thread, proposal review panel, and history rail all fit comfortably. Model pill dropdown opens with full search and grouped connection lists. Verified. |

---

## 5. Verification Results

### 1. Dedicated Wave 2 Regression Test Suite
Path: `src/tests/ai-assistant/bolu-wave2-android-ux.test.ts`  
Command: `bun test src/tests/ai-assistant/bolu-wave2-android-ux.test.ts`  
Result: **18 tests passed, 0 failed (256ms)**

Covered cases:
- `normalizeModelDisplayName`: Google API `models/` prefix stripping.
- `normalizeModelDisplayName`: Vendor namespace prefix stripping (`google/`, `anthropic/`, `deepseek/`, `meta-llama/`).
- `normalizeModelDisplayName`: Contextual provider name matching.
- `normalizeModelDisplayName`: Strict preservation of distinct model variants (`gemini-2.5-flash` vs `gemini-2.5-pro`, `claude-3-5-sonnet` vs `claude-3-5-haiku`).
- `normalizeModelDisplayName`: Human-friendly label preference.
- `normalizeModelDisplayName`: Empty and non-namespaced model strings.
- `formatResponseTiming`: Valid timestamp and duration formatting (`HH:mm · Xs`).
- `formatResponseTiming`: Sub-second duration formatting (`0.7s`).
- `formatResponseTiming`: Historical message missing metadata handling (`null`).
- `formatResponseTiming`: Invalid date handling.
- `formatConversationAsPlainText`: User/Bolu dialogue separation with timestamps.
- `formatConversationAsPlainText`: Exclusion of system and internal roles.
- `formatConversationAsPlainText`: Clean document proposal summary formatting.
- `ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT`: 250 KB constant verification (`256,000` bytes).
- `copyConversationToClipboard`: Fallback trigger above 250 KB (`TransactionTooLargeException` prevention).
- `copyConversationToClipboard`: Empty conversation handling.
- Stopped turn: `isStopped` flag and timing preservation.
- Interrupted turn: clean prose preservation and error metadata isolation.

### 2. Wave 1 Non-Regression Test Suite
Path: `src/tests/ai-assistant/bolu-wave1-reliability.test.ts`  
Command: `bun test src/tests/ai-assistant/bolu-wave1-reliability.test.ts`  
Result: **12 tests passed, 0 failed (151ms)**

### 3. Performance & Load Audit Gate
Command: `bun run audit:load`  
Result: **Exit Code 0 (Passed)**

### 4. TypeScript Typecheck
Command: `bun run typecheck` (`tsc --noEmit`)  
Result: **Exit Code 0 (0 errors, Passed)**

---

## 6. Summary of Modified Files

| File | Change Description |
| :--- | :--- |
| `api/bolu-chat.ts` | Enqueued final SSE metrics payload (`completedAt`, `durationMs`, `ttftMs`) before stream closure. |
| `src/lib/ai-assistant/bolu-transport.ts` | Added `BoluTimingMetrics`, measured client start timestamp, parsed SSE metrics lines. |
| `src/lib/ai-assistant/bolu-generation.ts` | Persisted `timingMetadata` to message metadata; preserved clean partial prose on stream interruptions. |
| `src/lib/ai-assistant/bolu-export.ts` | Added `formatConversationAsPlainText()`, `copyConversationToClipboard()`, and 250 KB Android Binder limit. |
| `src/components/ai-assistant/chat/assistant-chat-model-pill.tsx` | Added and exported `normalizeModelDisplayName()`; removed 70px width restriction; widened trigger. |
| `src/components/ai-assistant/chat/assistant-chat.css` | Updated model picker flex layout, ellipsis handling, and trigger width classes. |
| `src/components/ai-assistant/chat/assistant-chat-chrome.tsx` | Added "Copy conversation" action to desktop and mobile header overflow menus. |
| `src/components/ai-assistant/chat/BoluChatWorkspace.tsx` | Wired `handleCopyConversation` with clipboard write and automatic Markdown export fallback. |
| `src/components/ai-assistant/chat/assistant-chat-thread.tsx` | Implemented `formatResponseTiming()`; added amber stopped badge and interrupted prose with in-place retry. |
| `src/tests/ai-assistant/bolu-wave2-android-ux.test.ts` | Authoritative test suite covering all Wave 2 additions (18 unit tests). |
