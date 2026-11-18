# Stage 2 — Conversational Advance Invoice Wiring & `warnings[]` UI Surface

**Date:** 2026-11-18 · **Status: Partially completed** (one acceptance criterion outstanding: responsive viewport inspection — see "Limits") · **Type:** Scoped implementation + targeted verification for Bolu's Advance Invoice configuration capability and assistant warnings surfacing.

## What was delivered

### Conversational routing & Gate 1 / Gate 2
- `BoluProposal` widened to include `BoluAdvanceConfigProposal` (`operationType: 'advance-invoice-config'`, presentation locked to the invoice family; no quotations). Every union consumer was resolved — no unsafe casts or broad fallback branches were used to silence TypeScript:
  - `bolu-generation.ts` (live chat turn): parses the `advance-invoice-config` envelope, validates via `validateBoluAdvanceConfigInput`, reads the persisted parent through the new `readBoluInvoiceAdvanceConfig` (bolu-data.ts), and builds the proposal through `buildBoluAdvanceConfigProposal` with **all five `oldValues` populated from the persisted row**, never from model output.
  - `bolu-runtime.ts` (parallel runtime, test-covered): same branch added (prompt advertised operation, parser, `GATE2_START_SAVE` executor dispatch) — paths kept consistent.
  - `bolu-capabilities.ts`: `advance`/`configure` phrasings are no longer misrouted into the record-search capability (this was why "Set the advance … to 40%" never reached the model).
  - `useBoluThread.ts` (`confirmGate2Save`): `advance-invoice-config` routes to `persistAdvanceInvoiceConfig` (Stage 1 executor) via the authenticated tenant client **even when `VITE_API_URL` is configured** (server endpoint does not implement this operation in this stage; bypassing client-side is explicit and documented). The already-approved proposal is executed as-is — nothing is rebuilt after Gate 2 confirmation. `bolu-generation`/`bolu-runtime` executors preserve Stage 1's validation, family lock, tenant checks, stale/expiry checks, intent/state checks and persistence verbatim.
- Gate 1 never persists; Gate 2 remains the explicit confirmation. Reject/cancel flows verified in tests.

### Proposal preview card (all decision surfaces)
- `AdvanceConfigPreview` (new, in `assistant-chat-parts.tsx`): action label (`Configure/Update/Remove Advance Invoice`), target parent invoice number, before → after for changed fields only, computed advance amount and contract value, removal styling, and an explicit fixed-mode clamp notice (requested vs. effective amount, with contract value) when the request exceeds the contract value. Unchanged fields are omitted; a no-op update renders a "no field changes" notice.
- Surfaces wired: `ProposalCardView` (thread), `InvoicePanel` (artifact panel), legacy `AssistantSheet` (dead but typechecked), and `proposalPlainText` for copy-to-clipboard. `bolu-export.ts` YAML export skips `computedTotals` for the advance family.

### `warnings[]` propagation and UI
- `executionWarnings`/`gateTwoExecutionMessage` (new, `bolu-gate2-result.ts`): normalize warnings (strings only, verbatim, order preserved, whitespace-only entries dropped) and build the persisted assistant execution message for both success and failure outcomes; `useBoluThread` now persists an execution message on **both** paths carrying `metadata.warnings` verbatim whenever warnings are non-empty.
- `readMessageWarnings` + `MessageWarnings` (new, `assistant-chat-warnings.tsx`): thread renders a visible `role="status"` banner on the assistant execution message listing every warning verbatim; dismissal is presentation-only (component-local state), warnings cannot be merged or reworded, and the banner never renders for an empty list (it returns null).

## Verification (exact commands & results)

| Command | Result |
|---|---|
| `bun test src/tests/ai-assistant/bolu-advance-integrity.test.js` | **39 pass / 0 fail** (Stage 1; one invalid-payload expectation moved to executor-gate enforcement) |
| `bun test src/tests/ai-assistant/bolu-modify-integrity.test.js` | **34 pass / 0 fail** (Stage 0/0.1/0.2 regression) |
| `bun test src/tests/ai-assistant/bolu-advance-thread-flow.test.js` | **22 pass / 0 fail** — a1–a3 configure (incl. Gate 2 explicit confirmation), b1–b2 update (partial & full, fixed-mode), c1 remove, d1 stale-guard end-to-end, e1–e4 ambiguous UUID/invalid mode/Gate 1 cancellation/persistence failure, w1–w7 warnings helpers/round-trip/render, s1–s4 wiring assertions |
| `bun test src/tests/ai-assistant/` (full directory) | **534 pass / 1 fail / 535 tests** |
| `bun run audit:load` | **1125 files scanned; 57 oversized / 8 broad selects / 1 component fetch / 4 heavy limits** — all pre-existing classes; no new ❌/🚨. (`assistant-chat-parts.tsx` grew 1081 → 1257 lines and remains in the oversized list as before.) |
| `bun run typecheck` (`tsc --noEmit`) | **exit 0** |
| Full ai-assistant suite pre-existing failure | `src/tests/ai-assistant/bolu-commercial-and-gate-lifecycle.test.js` — "An authorized create/edit role can save an invoice through Gate 2". **Pre-existing, unrelated to Stage 2**: `src/lib/ai-assistant/bolu-document-service.ts` is byte-identical to HEAD (`git diff HEAD` empty for it); `fetchDocumentPrefixesSafe` calls `.limit(1)` but the test's `createPersistenceMock().from()` only implements `select().then(...)` without `.limit`, so the settings read throws and creation aborts. The failure is reproduced by inspection at HEAD. Not fixed (out of authorized file scope); repair = add `limit` to that mock — needs separate authorization. |
| `bun run build` | Not run (prohibited on this host) |

## Git state at reporting time
`git status --porcelain=v1` (work started 2026-11-18 from clean tree, HEAD `1d7d6d75`; **this task created no commits, pushes, stashes, resets or cleans**):

```
 M api/bolu-chat.ts
 M docs/prd/conversational-document-assistant/Readme.md
 M docs/prd/conversational-document-assistant/Waterfall-roadmap.md
 M docs/prd/conversational-document-assistant/decision-log.md
 M src/components/ai-assistant/AssistantSheet.tsx
 M src/components/ai-assistant/chat/assistant-chat-panel.tsx
 M src/components/ai-assistant/chat/assistant-chat-parts.tsx
 M src/components/ai-assistant/chat/assistant-chat-thread.tsx
 M src/components/ai-assistant/chat/assistant-chat.css
 M src/lib/ai-assistant/bolu-capabilities.ts
 M src/lib/ai-assistant/bolu-data.ts
 M src/lib/ai-assistant/bolu-export.ts
 M src/lib/ai-assistant/bolu-generation.ts
 M src/lib/ai-assistant/bolu-operations.ts
 M src/lib/ai-assistant/bolu-reducer.ts
 M src/lib/ai-assistant/bolu-runtime.ts
 M src/lib/ai-assistant/hooks/useBoluThread.ts
 M src/tests/ai-assistant/bolu-advance-integrity.test.js
?? docs/reports/bolu-document-capability-parity/stage-2-advance-invoice-wiring.md
?? src/components/ai-assistant/chat/assistant-chat-warnings.tsx
?? src/lib/ai-assistant/bolu-gate2-result.ts
?? src/tests/ai-assistant/bolu-advance-thread-flow.test.js
```
`git --no-pager diff --stat` (untracked files excluded): 18 files changed, 803 insertions(+), 81 deletions(-). (LF→CRLF conversion warnings were emitted by Git for a few files; no content change beyond that.)

## Limits / honest qualifications
- **Responsive viewport inspection (375 / 768 / 1280 / 1440 and the four required view classes) was NOT performed.** No available tool can emulate viewports: the paired Chrome extension is offline ("paired-offline"), the desktop browser has no viewport-resize control, and the Vite dev server I attempted exited with SIGTERM before inspection (its last boot also failed with `504 Outdated Optimize Dep`). Authenticated production-linked env cannot be used for local inspection either. Responsive behavior of the new surfaces is supported only by: (a) the new CSS blocks using two-column grids with a `max-width: 420px` collapse and `min-width: 768px` expansion, (b) the warning banner being a stacked flex column with `overflow-wrap: anywhere`, and (c) SSR markup checks (`w7`). **This acceptance criterion is unmet; do not cite viewport verification.**
- `useBoluThread`'s `confirmGate2Save` **warning persistence on the failure path** and the success-path execution message were both verified only structurally (`s1`/`s2` source assertions) plus SSR-level helper/component tests — the hook itself is not unit-renderable in this suite and no live session was run.
- The `bolu-runtime.ts` parallel path's reducer message was aligned (`GATE2_SAVE_SUCCESS` carries `operationType`); this path remains inert in the live UI.
- **Finding F1 retained:** deployed tenant `invoice_items` / `quotation_items` lack the `item_id → item_catalog(id)` FK (observed on the disposable project); the application layer's `is_active` catalog verification is the effective guard. Optional future restoration of the tenant FKs requires independent review of schema, lifecycle, orphan rows and installer paths, and separate authorization. Production schema state has not been verified.
- `executedOperationIds` remains an in-process replay guard (no durable operation_id for the metadata-only advance path); cross-instance replay protection is not implied.
- The 23/23 live disposable checks from Stage 0.3 are not re-run here and do not imply exhaustive persistence coverage.
- Stage 3+ (broader business context, CPS/quotation parity, optional tenant item_id FK restoration) remains **PROPOSAL only**, not approved scope.

## Artifacts
- `src/lib/ai-assistant/bolu-operations.ts` — widened `BoluProposal`; advance validator relaxed (remove gate enforced by executor); (`BoluAdvanceConfigProposal` from Stage 1 unchanged).
- `src/lib/ai-assistant/bolu-gate2-result.ts` — new; execution-result → execution-message helpers.
- `src/lib/ai-assistant/bolu-data.ts` — new `readBoluInvoiceAdvanceConfig`.
- `src/lib/ai-assistant/bolu-generation.ts` — `advance-invoice-config` envelope branch.
- `src/lib/ai-assistant/bolu-runtime.ts` — parallel runtime wiring + prompt.
- `src/lib/ai-assistant/bolu-capabilities.ts` — advance phrasing recognised as write intent.
- `src/lib/ai-assistant/bolu-reducer.ts` — advance-aware success message.
- `src/lib/ai-assistant/bolu-export.ts` — advance-aware YAML export.
- `src/lib/ai-assistant/hooks/useBoluThread.ts` — executor routing, execution-message persistence with warnings, advance-aware wording.
- `src/components/ai-assistant/chat/assistant-chat-parts.tsx` — `AdvanceConfigPreview`, advance-aware `ProposalCardView` + `proposalPlainText`.
- `src/components/ai-assistant/chat/assistant-chat-panel.tsx` — advance artifact panel.
- `src/components/ai-assistant/chat/assistant-chat-warnings.tsx` — new warnings banner + `readMessageWarnings`.
- `src/components/ai-assistant/chat/assistant-chat-thread.tsx` — banner rendering.
- `src/components/ai-assistant/chat/assistant-chat.css` — `.ac-warnings-*` and `.ac-advance-*` blocks.
- `src/components/ai-assistant/AssistantSheet.tsx` — advance branch (dead code, typechecked).
- `api/bolu-chat.ts` — server system prompt advertises `advance-invoice-config`.
- Tests: `src/tests/ai-assistant/bolu-advance-thread-flow.test.js` (new, 22 tests), `bolu-advance-integrity.test.js` (one invalid-payload case removed to executor-gate).
- Docs: `Readme.md`, `Waterfall-roadmap.md` §36, `decision-log.md` (DEC-40), this report.
