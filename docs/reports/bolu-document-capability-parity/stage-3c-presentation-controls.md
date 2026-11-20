# Stage 3C — Conversational PDF Appearance, Document Presentation & Signatory Controls

**Date:** 2026-11-19 · **Status: Partially completed** · **Type:** Authorized implementation. Not Stage 3D.

## What was delivered

An extended `presentationChange` block on the conversational modify envelope, applied through the same Gate 1 proposal / Gate 2 persistence / fingerprint-then-compare machinery validated for stages 3A and 3B.

### PDF output & document presentation (`pdfOutput`)
- All eight form-backed PDF output settings: `showBankDetails`, `bankAccountId` (verified), `showFooter`, `showTagline`, `showBalanceDue`, `showAmountInWords`, `compact`, `landscapeLayout`.
- `showBankDetails` only takes effect with a resolvable bank account; the bank account reference is validated against the tenant `bank_accounts` projection at proposal build **and** at save time (both fail closed). `null` resets to the business-default bank (form semantics).
- Notes and Terms headings (`notesTitle` / `termsTitle`), empty string or `null` restores the default heading.

### Item economy
- `chargeLabels` (workmanship / transportation / shipping) as presentation labels; **charges keep amounts**, totals untouched.
- `mergeQtyUnit` (presentation merge of qty + unit; not a data edit).
- `showItemImages` (visibility only; never mutates `image_url` or produces images).

### Column configuration (`columns`)
- `setMode` (`show` / `hide_display` / `hide_full`), builtin keys only (description/quantity/unit_price hidden is rejected).
- `setLabel` renames a column; uniqueness enforced across the list.
- `order` reorders existing columns (case-insensitive resolution);
- `resetToDefaults: true` restores `BUILTIN_COLUMNS`/`getResetColumnConfigs()` shape and order.
- Unknown column keys are preserved verbatim on round trips (`custom_*` untouched); `columnConfig` union semantics mirror `resolveFinancialColumns` (every builtin always present).

### Signatory selection (`signatory`)
- `"signatory": "Name"` resolved against the tenant `signatories` projection: exact case-insensitive name match (unique-match required). Ambiguity → proposal rejected with a business-message listing members. Absent → proposal rejected. `null` → signatory removed.
- No silent UUID attachment; the proposal carries business-facing identity only.

### Presentation engine (`src/lib/ai-assistant/bolu-presentation.ts`)
- `applyPresentationPatch(persisted, patch, resolution)` produces: `subtree` (merged), `rows` (before→after preview lines), `summary`, and `errors`; pure function, shared by Gate 1 builder and Gate 2 executor.
- Fingerprinting (`fingerprintPresentation`) covers the entire presentation subtree; routine difference pinpoints exactly which settings drifted.
- `columnConfig` normalization: every builtin column is always present (mirror of `resolveFinancialColumns`); unknown keys preserved verbatim.

### Integration
- `bolu-operations.ts`: `BoluPdfOutputPatch`, `BoluChargeLabelsPatch`, `BoluColumnModeOp`, `BoluColumnLabelOp`, `BoluColumnsPatch`, `BoluPresentationChange`, payload + proposal fields, validation (`validateInvoiceModifyInput`), proposal synthesis.
- `bolu-document-service.ts`: executor section 2.4 (persisted subtree fingerprint, signatory/bank revalidation, merge into `custom_fields`, `showItemImages` preserved on unchanged items, `amount_in_words` recomputed on presentation-driven visibility change).
- `bolu-generation.ts` / `bolu-runtime.ts`: at the conversation boundary, resolve signatory and bank-account references against the tenant projection and refuse to build a proposal with an unresolvable reference (business message listing matches when ambiguous).
- `bolu-data.ts`: `resolveSignatoryForPresentation`, `resolveBankAccountForPresentation` (fail closed).
- `api/bolu-chat.ts`: presentation-specific prompt rules (items and charges vs presentation separation, signatory resolution contract, column hide semantics, images remain blocked, no presentation change for totals).
- UI: `ModifyPresentationPanel` on the proposal card renders before→after rows with business labels; `proposalPlainText` copies them.

## Verification (exact commands & outcomes)

| Command | Result |
|---|---|
| `bun test src/tests/ai-assistant/bolu-stage-3c-presentation-controls.test.js` | **26 pass / 0 fail / 26 tests** (a validator, b engine, c executor, d signatories, e generation-wiring incl. fail-closed unknown, f SSR + artifact) |
| `bun test src/tests/ai-assistant/` (full directory) | **646 pass / 1 fail / 647 tests** — the single failure is the documented pre-existing `bolu-commercial-and-gate-lifecycle` (mock lacks `.limit(1)` for `fetchDocumentPrefixesSafe`); unchanged by this stage, confirmed failing in isolation and alongside the new suite |
| `bun run audit:load` | **1135 files scanned; 8 broad selects, 1 component fetch, 4 heavy limits** — identical to the concurrent-session baseline; no new ❌/🚨 in any file touched by this stage; `bolu-presentation.ts` not flagged |
| `bun run typecheck` | **exit 0** (re-run after a transient `tsc` native crash — first attempt exited 134; no source error was reported; re-run produced a clean list of TS errors = none) |
| `bun run build` | Not run (prohibited on this host) |

`bun run audit:load` was run before `bun run typecheck`.

## Verification — not performed

- **Four-viewport visual inspection** (Mobile / Fold Closed, Fold Open, Tablet, Desktop): **not inspected** — the app cannot boot in this sandbox (Vite `504 Outdated Optimize Dep`; paired Chrome offline; no viewport emulation tools). SSR markup tests exist for the presentation panel but are not viewport verification.
- **PDF raster verification**: not exercised. The PDF pipeline was validated indirectly (settings persisted on `custom_fields`; column visibility subject to the same engine semantics as the form; no totals from model).
- **Live disposable-tenant verification**: no database access for this stage; every check ran against the isolated mock harness.
- **Invoice-vs-quotation presentation round-trips**: quotation-side smoke check added; a full quotation executor round-trip for every presentation family was not written (quoted cost: doubling the suite without a correspondingly different code path).

## Git state

Initial: HEAD `184ad258` (`✨ feat(update): Android production update dialog and download speed` — prior authorized session); branch `main` ahead of `origin/main` by 9 commits. The working tree contains the concurrent BOUXRE rebrand and the update-dialog session (dozens of tracked/modified and untracked files, including `docs/prd/WhatsNew…`, `src/components/app/UpdateModal.tsx`, `update-dialog-card.css`, `productionUpdateDialog.test.js`, `src/lib/native/apkUpdate.ts`, `src/domain/appUpdate/downloadSpeed.ts`) — none attributable to this task. `.perch/PERCH.md` modified pre-existing (not attributable).

Final (preserved, nothing staged/committed/pushed/stashed/reset by this task):

Task-attributable files (all uncommitted):
- New: `src/lib/ai-assistant/bolu-presentation.ts`, `src/tests/ai-assistant/bolu-stage-3c-presentation-controls.test.js`, this report.
- Modified: `api/bolu-chat.ts`, `src/components/ai-assistant/chat/assistant-chat-parts.tsx`, `src/lib/ai-assistant/bolu-data.ts`, `src/lib/ai-assistant/bolu-document-service.ts`, `src/lib/ai-assistant/bolu-generation.ts`, `src/lib/ai-assistant/bolu-operations.ts`, `src/lib/ai-assistant/bolu-runtime.ts`.
- Docs updated by this task: `Readme.md`, `Waterfall-roadmap.md` §37.5, `decision-log.md` (appended `## DEC-43`).
- Unrelated concurrent work preserved byte-untouched; the two preserved untracked Stage 2/3 audit reports untouched as well.

## Known limitations

1. **Signatories ambiguous/absent**: resolution is unique-exact-match only; inactive-flag is not modeled (the table has no `active` column; the form shows all signatories).
2. **Bank accounts**: resolution is id-required; the "is this the business's default account" branch is not exposed conversationally (the form does that via `bankAccountId ?? defaultBank?.id`; Bolu surfaces it only as `null` → business default, matching the form).
3. **Fingerprint granularity**: any presentation change invalidates every concurrent presentation proposal (whole-subtree fingerprint). This is consistent with the 3A/3B pattern for sibling blocks.
4. **No live PDF verification**; no four-viewport inspection; no live database verification.
5. The single pre-existing `bolu-commercial-and-gate-lifecycle` failure remains (mock lacks `.limit(1)`); unchanged and unrelated.
