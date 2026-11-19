# Stage 3A.2 — Remediation of Acceptance Findings

**Date:** 2026-11-19 · **Status: Completed (bounded remediation); the two standing acceptance gates remain open** · **Type:** Bounded remediation of the Stage 3A.2 independent-audit findings + regression verification. Not Stage 3B.

Authority for this change: explicit user authorization (this task) and the 2026-11-19 independent acceptance audit (`stage-3a2-independent-acceptance-audit.md`), which conditionally accepted Stage 3A.2. Stage 3A.2 itself was previously committed as `97341863` (prior task, separate authorization). **This remediation created no commits, no push, no staging, no stashing, and no database access.**

## 1. Findings addressed

### F-01 — Absent values vs explicit clears (fixed)
- `validateInvoiceModifyInput` rejects an absent `newValue` for every scalar edit (fail-closed message, no coercion). (In place from the prior change; retained and extended.)
- **Issue dates are not clearable.** `issue_date` with `null`/empty is rejected with "The issue date is required. Set a new date instead of clearing it." Derived from the domain: the create flow defaults an absent issue date to today and reporting depends on the anchor (see `InvoiceFormPage`/`useInvoiceSave`/`ComplianceOverview` behavior). Executor double-guard added (`bolu-document-service.ts:1364`) refusing a null/empty `issue_date` before any write.
- **Clearability preserved where the form permits empty:** `notes`, `terms`, `title`, `po_number`, `payment_terms`, `due_date` (→ `valid_until` on quotation), `work_duration` (invoice only), `project_id`. Explicit `null` remains the clear signal; explicit `''` on rich-text fields behaves as an empty field where supported. Regression tests: h1, h2, h2b, h2c, d-series preserved, b3 (project clear) retained.
- The audit's named fail-closed cases are now impossible: absent value → validation error; executor refuses any proposal missing a baseline (verified: d1).

### F-02 — Fixed-charge strict input validation (fixed)
- Validator and executor both accept only a finite `number` or a **non-empty numeric string ≥ 0**. Booleans, arrays, objects, blanks, NaN, infinities and negatives are refused. (`bolu-operations.ts` charge branch; `bolu-document-service.ts` charge branch throws the parsed number, never the raw value.) Named extra charges received the same strict parsing (`amount`/`value: true` can no longer become `₦1`). Tests: h3 (validator), k2 (executor boundary, no write), k3 (named charges).

### F-03 — Plain-text artifact includes Discount and WHT (fixed)
- `proposalPlainText` prints `Discount: -…` and `WHT: -…` whenever either is `> 0`, mirroring the card, using the proposal's app-computed `computedTotals` (never recomputed in the presentation layer). Asserted by exact values in h4 (`Discount: -₦10,000`, `WHT: -₦500`, `VAT: ₦7,500`, `Authoritative total: ₦107,500`).

### F-04 — Charge cleared to zero is explicit in the artifact (fixed)
- The artifact now appends ` (cleared)` on a charge change of `> 0 → 0` (h4 asserts the marker). The card's "Cleared" badge and explanatory note are unchanged.

### F-05 — Business-language validation and stale refusals (fixed)
- All calculation-input messages rewritten to business labels (`VAT rate`, `Discount`, `Discount type`, `Discount timing`, `WHT`, `WHT type`); the unknown-setting message no longer echoes envelope keys (`That calculation setting is not supported…`); `calculationInputs must be an object` → `The calculation settings must be given as a set of specific changes…`; `calculationInputs must contain at least one supported key` → `Provide at least one calculation setting to change.`; unknown `field` values are refused without echoing the envelope key (`That is not a supported change for this document.`); named-charge messages use business phrasing; `BOURXE assistant copy` keeps no snake_case tokens; the executor baseline refusal (`Proposal is missing the persisted baseline for ${field}; the stale-check cannot run.`) was rewritten (`I could not verify the current ${field} for this change. Reopen the document and try again.`); the executor stale-guard messages already carried business labels (`VAT rate`/`Discount`/…" ).
- `bolu-generation`/`bolu-runtime` invalid-envelope copy now carries only business-phrased errors (asserted: i5 checks the rendered user-visible text via `cleanAssistantProse`).
- Tests: k4 (representative validator failures, no key echo), k5 (all six stale labels, asserts absence of raw keys), c6 updated, i5 updated, h3/h2c/h1 unaffected.

### F-06 — No backend fragments in user-facing persistence failures (fixed)
- All modification-flow failure interpolations (`${err.message}` into user copy) replaced by bounded copy + `console.warn` diagnostics: `modificationReadFailure` (items read; message states no changes were made), `modificationPersistFailure` (RPC/header write; "The {family} could not be saved just now. Please try again."), `modificationItemsFailure` (items restore; preserves the accurate fact that the previous items were restored). Raw fragments retained in server logs only.
- Tests: `bolu-modify-integrity.test.js` #7 updated to the new concise message (was pinned to the leaked `Transactional update failed` fragment — updated as F-06 requires); new tests f6a (header-write failure incl. `fkey` fragment), f6b (items-read failure), f6c (RPC failure with items+charges combined) assert **no leak** and failure-reported, never success, messages; the `[bolu-modification]` console.warn lines visible in test output confirm diagnostics are retained.

### F-09 — Generation-level modify tests (fixed)
- Dedicated tests now drive `runBoluGeneration` for the live modify path with mocked provider (`@/lib/ai-assistant/bolu-transport`) and mocked `@/supabase` (message persistence), reused tenant harness, and a crafted modify envelope:
  - **i1** — builds a proposal from the persisted snapshot; `oldValue` comes from the snapshot (`PO-SNAP`), not the model; the proposal lands in the active proposal slot and in the inserted message payload.
  - **i2** — missing document (empty snapshot) fails closed: no proposal, plain message, no persistence of an untrusted baseline.
  - **i3** — quotation `work_duration` envelope refused with a business explanation; no proposal.
  - **i4** — quotation `title` edit maps through `quotation_title` from the persisted snapshot (family-specific success mapping).
  - **i5** — unsupported envelope field refused; user-visible text (after `cleanAssistantProse` strips the raw envelope) contains no envelope vocabulary (`discountTiming` absent).
- Mocked tests prove wiring only; they are **not** live database verification.

### F-11 — Misleading totals fallback for non-financial modifies (fixed)
- The modify path now shows "No amounts change in this proposal." for proposals without computed totals; the create-path fallback is unchanged. Tests l1 (non-financial: no recompute claim, accurate copy present) and l2 (financial: totals block still renders) via `renderToStaticMarkup`.

### Deferred (not in scope / explicitly deferred)
- **F-13** (cosmetic re-case of named-charge labels on the card) — unchanged, deferred per instruction. **F-14** (`.ac-modify-diff` unstyled) — unchanged, deferred per instruction. **Four-viewport inspection** and **live disposable-tenant verification** remain **outstanding** (see §5). **F-10** (live verification) outstanding. The pre-existing `bolu-commercial-and-gate-lifecycle` failure (missing `.limit(1)` in `createPersistenceMock()` at its line 45-73) remains untouched and unclassified-as-new; it still fails identically, verified alone and alongside the remediation suite.

## 2. Files changed (task-attributable, uncommitted; HEAD remains `97341863`)

- `src/lib/ai-assistant/bolu-operations.ts` — F-01 (issue-date non-clearable; uniform absent-value rejection retained), F-02 (strict charge & named-charge parsing), F-05 (validator business-language rewrite; unknown-`field` and unknown calc-input messages no longer echo envelope keys).
- `src/lib/ai-assistant/bolu-document-service.ts` — F-02 executor strict charge parsing (parsed number written, never raw coercion); F-01 executor issue-date non-clearable guard; F-05 baseline refusal reworded; F-06 `modificationReadFailure` / `modificationPersistFailure` / `modificationItemsFailure` (bounded user copy, raw detail to `console.warn`); the items-fetch branches now pass `warnings` through on failure.
- `src/components/ai-assistant/chat/assistant-chat-parts.tsx` — F-03 (Discount and WHT lines in `proposalPlainText`), F-04 (`(cleared)` marker in the artifact), F-11 (non-financial modifies suppress the recompute fallback).
- `src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js` — h-series F-01/F-02/F-03/F-04 assertions (exact naira), i-series generation wiring (i1-i5), k-series executor/validator boundary and stale-label tests, f6a-f6c backend-error leak tests, l-series F-11 SSR assertions, plus the harness failure-injection opts. **46 tests.**
- `src/tests/ai-assistant/bolu-modify-integrity.test.js` — stale assertion updated to the F-06 user-facing copy (was pinned to the leaked fragment).
- `src/tests/ai-assistant/bolu-operations.test.js` — message regex updated (`/directly is not allowed/i` → `/not a supported change/i`) for the F-05 message rewrite.
- `src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.js` — message regex updated (`extra_charges` → `/named extra charges?/i`) for the F-05 message rewrite.

**Not modified by this task (pre-existing/concurrent work in the tree):** `.github/workflows/build-android-test-release.yml`, `.perch/PERCH.md`, the entire "What's New"/`releaseDiscovery` surface (`ChangelogTimeline.tsx`, `useReleaseNotifications.ts`, `WhatsNew.tsx`, `designLabPreviews.ts`, `AppShell.tsx`, `design-lab/android-update/*`, `releaseDiscovery.ts`, `androidUpdatePreview.test.js`, `docs/reports/whats-new-changelog/`, `android-update-verify.html`, `src/__verify/`), and a concurrent **"BOUXRE" rebrand session** editing hundreds of docs/files. Notably, the rebrand session's uncommitted edits also sit inside files this task edited: `api/bolu-chat.ts` (4 lines: internal prompt wording, brand token), `src/lib/ai-assistant/bolu-runtime.ts` (2 lines: assistant-context brand token), and one line in `assistant-chat-parts.tsx` (brand token in the preserved fallback copy). The audit report `stage-3a2-independent-acceptance-audit.md` is untracked and was not modified. The two preserved untracked reports and `.tmp-reference-update-dialog.png` are not attributable to this task and were not touched.

## 3. Verification (Bun only; no database; no build)

| Command | Result |
|---|---|
| `bun test src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js` | **46 pass / 0 fail / 46 tests** |
| `bun test src/tests/ai-assistant/bolu-stage-3a1-integrity.test.js src/tests/ai-assistant/bolu-modify-integrity.test.js src/tests/ai-assistant/bolu-advance-integrity.test.js src/tests/ai-assistant/bolu-advance-thread-flow.test.js` | **106 pass / 0 fail / 106 tests** |
| `bun test src/tests/ai-assistant/` (full directory) | **592 pass / 1 fail / 593 tests** — single failure = the documented pre-existing `bolu-commercial-and-gate-lifecycle` "An authorized create/edit role can save an invoice through Gate 2" (`createPersistenceMock()` lacks `.limit(1)`). Verified unchanged in isolation and alongside the remediation suite. One transient full-suite run earlier in the session reported "591 pass / 2 fail"; 8+ subsequent runs all report exactly this single pre-existing failure; the transient second failure was not reproduced or identified. |
| `bun run audit:load` | **1125 files scanned; 8 broad selects, 1 component fetch, 4 heavy limits — all in unrelated files, unchanged.** Oversized: 59 (58 at the audit baseline; the +1 is the concurrent session's new `android-update-preview.tsx`, not this task). The Stage 3A.2/bolu surfaces remain in the pre-existing oversized class; no new ❌/🚨 in this task's files. |
| `bun run typecheck` (`tsc --noEmit`) | **exit 0** |
| `bun run build` | Not run (prohibited). |
| Database contact | **None** (no production/disposable Supabase; all persistence exercised through the in-memory harness only). |

`bun run audit:load` was run before `bun run typecheck`, as required.

## 4. Responsive (four viewport classes) — UNAVAILABLE

The application remains unable to boot safely in this environment (Vite `504 Outdated Optimize Dep`; paired Chrome reports `paired-offline` with no connected browsers; the desktop browser exposes no viewport/resize emulation; fixing the boot would require cache deletion or Vite changes, which are out of bounds). SSR markup and the suite are not viewport verification, and none is claimed. **The four-viewport acceptance requirement remains open: Mobile / Fold Closed, Fold Open, Tablet, Desktop — all Not verified.**

## 5. Remaining limitations and gates

- **Four-viewport inspection: not performed** (§4).
- **Live disposable-tenant verification: not performed.** Executor and wiring evidence is in-memory harness + SSR markup + mocked generation only. Do not represent persistence as live-verified.
- **Non-atomic stale checks** — the stale/expiry guards are not database-transactional; concurrency is mitigated only for touched keys and only within the read→write window.
- **Cross-instance replay protection** remains the in-process `executedOperationIds` plus the durable `operation_id` unique index where present.
- **Pre-existing failing test** unchanged (see §3); not classified as this task's regression; repair unauthorized.
- The remediation does not advance the Stage 3A.2 completion status past the audit's conditions except by clearing the named findings; Stage 3A.2 is **not** marked fully accepted. **Stage 3B was not started.**

## 6. Git state

Initial (this task's start): HEAD `97341863` ("feat(assistant): stage 3a2 existing-document field and charge modifications", prior stage, authorized), working tree containing the concurrent work listed in §2 (unattributed), two pre-existing unrelated modifications, the preserved untracked Stage 2/3 audit reports, and `.tmp-reference-update-dialog.png` (not attributable).

Final: HEAD unchanged (`97341863`). Task-attributable modifications are: `src/lib/ai-assistant/bolu-operations.ts`, `src/lib/ai-assistant/bolu-document-service.ts`, `src/components/ai-assistant/chat/assistant-chat-parts.tsx`, `src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js`, `src/tests/ai-assistant/bolu-modify-integrity.test.js`, `src/tests/ai-assistant/bolu-operations.test.js`, `src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts`, and this report (new, untracked). Everything else in the tree is unchanged, unattributed, or concurrently authored. **Nothing was staged, committed, pushed, stashed, reset, checked out or cleaned.** The two preserved untracked reports were not read-modified, deleted, moved, staged or committed.

Status summary: **Completed** for the bounded remediation scope; all acceptance gates named in the audit that were authorized for this session are closed (F-01, F-02, F-03, F-04, F-05, F-06, F-09, F-11). The acceptance decision of the stage as a whole remains conditional on the four-viewport and live-database gates; this report does not amend it.
