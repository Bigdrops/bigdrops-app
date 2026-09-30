# Document Form Consolidation Standard Audit Report

This report was written by OpenCode on 2026-09-29 via Local Runner.

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Executive Finding

**The standard is CURRENT with respect to Invoice. The audit premise is refuted.**

The task premise stated that Invoice "may have eliminated the separate NewInvoice/EditInvoice page/delegator architecture and merged create/edit into a single entry point." Repository evidence shows the opposite:

- `src/pages/NewInvoice.tsx` exists and is a 5-line delegator: `<InvoiceFormPage mode="create" />`.
- `src/pages/EditInvoice.tsx` exists and is a 5-line delegator: `<InvoiceFormPage mode="edit" />`.
- `src/pages/InvoiceFormPage.tsx` exists (567 lines) with a `mode: 'create' | 'edit'` prop and holds all orchestration.
- Routes `/invoices/new` and `/invoices/edit/:id` exist with independent lazy imports in `src/components/app/AppShell.tsx`.

Invoice did not drift away from the standard. Invoice is the **originator** of the pattern. Git commit `c432e520` (2026-07-02, "refactor(invoice): consolidate invoice forms into shared InvoiceFormPage orchestrator") performed the Invoice consolidation first. The standard was then written (2026-07-12, per `docs/reports/general/document-form-consolidation-report.md`) to codify Invoice's pattern for the remaining modules.

The standard has **two real conformance gaps**, both outside Invoice:

1. **RFQ** does not conform. `NewRfq.tsx` and `EditRfq.tsx` contain full inline orchestration. No `RfqFormPage.tsx` exists.
2. **BOQ** does not conform. `NewBoq.tsx` and `EditBoq.tsx` are placeholder stubs during an active rebuild (uncommitted changes from another agent were present at audit time).

Verdict: the standard is **partially stale** — not because Invoice changed, but because RFQ never conformed and BOQ is mid-rebuild, while the standard's conformance section (Section 5) claims all modules MUST conform.

---

## 2. Current Invoice Architecture

### 2.1 Files Involved

| File | Role | Lines |
|---|---|---|
| `src/pages/NewInvoice.tsx` | Thin delegator, `mode="create"` | 5 |
| `src/pages/EditInvoice.tsx` | Thin delegator, `mode="edit"` | 5 |
| `src/pages/InvoiceFormPage.tsx` | Single form page, all orchestration | 567 |
| `src/components/document/SharedDocumentForm.tsx` | Shared form UI (rendered by InvoiceFormPage) | — |
| `src/hooks/useInvoiceEditableState.ts` | Form state container | — |
| `src/hooks/useInvoiceHydration.ts` | Edit-mode DB load | — |
| `src/hooks/useInvoiceSave.ts` → `src/hooks/useDocumentSave.ts` | Save/update orchestration | — |
| `src/hooks/useInvoiceReferenceData.ts` | Signatories, bank accounts, settings | — |
| `src/components/useInvoiceColumns.ts` | Column manager state | — |
| `src/components/app/AppShell.tsx` | Lazy imports + route registration | — |

### 2.2 Route Structure

`src/components/app/AppShell.tsx`:

- Line 38: `const NewInvoice = lazy(() => import('@/pages/NewInvoice'))`
- Line 40: `const EditInvoice = lazy(() => import('@/pages/EditInvoice'))`
- Line 280: `<Route path="/invoices/new" element={withBoundary(<NewInvoice />)} />`
- Line 281: `<Route path="/invoices/edit/:id" element={withBoundary(<EditInvoice />)} />`
- Line 282: `<Route path="/invoices/:id" element={withBoundary(<ViewInvoice />)} />`

New and Edit are lazy-loaded independently. No router changes have occurred since consolidation.

### 2.3 Create vs Edit Determination

Mode is an **explicit prop**, not route-derived. `InvoiceFormPage.tsx:81-83`:

```tsx
interface InvoiceFormPageProps {
  mode: 'create' | 'edit'
}
```

The delegators pass the prop. The component derives `isCreate`/`isEdit` booleans at lines 92-93. This matches the standard exactly and matches the design decision recorded in `docs/reports/general/document-form-consolidation-report.md` ("`mode` prop over route-deduced logic").

### 2.4 Where Orchestration Lives

All orchestration lives in `InvoiceFormPage.tsx` and the hooks it calls:

- **Data loading (edit):** `useInvoiceHydration({ id, isEdit }, ...)` — loads invoice, items, groups, custom fields, columns by `:id` param. Redirects to `/invoices` on load failure (line 211).
- **Number allocation (create):** `InvoiceFormPage.tsx:272-290` — `getNextInvoiceNumber` + `fetchAutoCursor` with prefix resolution. Skipped when a prefill exists or the user already typed a number (`autoNumberRef` guard, line 287).
- **Route-state prefills (create):** `InvoiceFormPage.tsx:95-104` — reads `location.state` for `prefill`, `prefillItems`, `projectId`, `clientId`, `clientName`. Applied at lines 214-266.
- **Save/update:** `useInvoiceSave` hook (line 387) wrapping `useDocumentSave` strategy. Save button wired at line 429: `onSaveUnpaid = save('unpaid')`.
- **Duplication (edit):** `handleDuplicateFromEditable` (lines 324-347) — clones current editable state, strips identity fields, navigates to `/invoices/new` with prefill state.
- **Identity lock (edit):** `guardedUpdateInvoice` (lines 300-307) intercepts changes to `client_id`, `client_name`, `invoice_number`, `document_type` and opens `IdentityLockDialog` instead of applying the change.
- **Navigation:** `handleCancel` (line 431) → `/invoices` (create) or `/invoices/:id` (edit).

### 2.5 Offline/Draft Behavior

Invoice has **no offline-draft path**. `useInvoiceSave.ts` contains no offline/localDraft logic (verified by search). All Invoice saves persist directly as `status: 'unpaid'`. This differs from Quotation, which has an offline-draft path in `useQuotationSave.ts:227-243`. The standard's motivation section mentions offline drafts as a concern of the old architecture; for Invoice this concern no longer applies.

---

## 3. Standard-vs-Current Comparison Matrix

### 3.1 Section 2 — Pattern

| # | Standard claim | Classification | Current Invoice evidence | File/path | Explanation |
|---|---|---|---|---|---|
| a | Every document module MUST have exactly one `*FormPage.tsx` with a `mode` prop | **CURRENT** | `InvoiceFormPage.tsx` exists with `mode: 'create' \| 'edit'` | `src/pages/InvoiceFormPage.tsx:81-83` | Exact match. |
| b | `NewInvoice.tsx` and `EditInvoice.tsx` as mandatory delegators | **CURRENT** | Both exist as 5-line delegators | `src/pages/NewInvoice.tsx`, `src/pages/EditInvoice.tsx` | Exact match. |
| c | Delegators: "exactly one import, one component call, no logic" | **CURRENT** | Each delegator: 1 import, 1 component call, 0 logic | same files | 5 lines total (import + export + return). Conforms in substance. |
| d | Independent NewInvoice/EditInvoice lazy loading | **CURRENT** | Two separate `lazy()` imports | `src/components/app/AppShell.tsx:38,40` | Exact match. |
| e | Existing `/new` and `/edit/:id` routes remain | **CURRENT** | Both routes registered | `src/components/app/AppShell.tsx:280-281` | Exact match. |
| f | `mode: 'create' \| 'edit'` component interface | **CURRENT** | Interface declared and used | `src/pages/InvoiceFormPage.tsx:81-83` | Exact match. |

### 3.2 Section 2.4 — Mode Responsibilities Table

| Concern | Standard says | Classification | Current Invoice evidence | File/path | Explanation |
|---|---|---|---|---|---|
| Document number generation | create only | **CURRENT** | `getNextInvoiceNumber` effect gated on `isCreate` | `src/pages/InvoiceFormPage.tsx:272-290` | Exact match. |
| Route state prefills (project, client, import) | create only | **CURRENT** | `routeState` read gated on `isCreate` | `src/pages/InvoiceFormPage.tsx:95-104` | Exact match. Import prefill via `invoiceImportAdapter` also create-only. |
| Data loading | edit only | **CURRENT** | `useInvoiceHydration({ id, isEdit })` | `src/pages/InvoiceFormPage.tsx:189-212` | Exact match. |
| Identity lock on client/number fields | edit only | **CURRENT** | `guardedUpdateInvoice` gated on `isEdit` | `src/pages/InvoiceFormPage.tsx:300-307` | Exact match. |
| Duplicate from editable | edit only | **CURRENT** | `handleDuplicateFromEditable` rendered only when `isEdit` | `src/pages/InvoiceFormPage.tsx:324-347, 557-563` | Exact match. |

### 3.3 Section 3 — Rules

| # | Rule | Classification | Current Invoice evidence | File/path | Explanation |
|---|---|---|---|---|---|
| 1 | Orchestration lives in `*FormPage.tsx`, not in delegators | **CURRENT** | All logic in InvoiceFormPage + hooks; delegators contain zero logic | `src/pages/InvoiceFormPage.tsx`, `src/pages/NewInvoice.tsx` | Exact match. |
| 2 | `NewX.tsx`/`EditX.tsx` MUST be thin delegators | **CURRENT** | 5-line delegators | `src/pages/NewInvoice.tsx`, `src/pages/EditInvoice.tsx` | Exact match. |
| 3 | Form UI is shared via `SharedDocumentForm`; Letter exception noted | **CURRENT** (with caveat) | Invoice renders `SharedDocumentForm` | `src/pages/InvoiceFormPage.tsx:450` | Conforms. Caveat: the rule's wording "Form UI is already shared" is only true for Invoice/Quotation. CSR uses `CsrFormScreen` (`src/pages/CsrFormPage.tsx:8`), Waybill uses `WaybillForm` (`src/pages/WaybillFormPage.tsx:4`). The standard only carves out Letter. See Section 7. |
| 4 | No CSS file changes | **CURRENT** | Consolidation was structural | — | No visual change detected. |
| 5 | No route changes | **CURRENT** | Routes unchanged since consolidation | `src/components/app/AppShell.tsx:280-281` | Exact match. |

### 3.4 Section 4 — Adding a New Document Module

| Claim | Classification | Evidence | Explanation |
|---|---|---|---|
| Future modules create `NewX` + `EditX` + `XFormPage` | **PARTIALLY CURRENT** | Quotation, CSR, Letter, Waybill conform. RFQ does not. BOQ is a stub. | 5 of 7 modules follow the pattern. RFQ retains pre-consolidation inline orchestration. BOQ is mid-rebuild. |

### 3.5 Section 5 — Conformance

| Claim | Classification | Evidence | Explanation |
|---|---|---|---|
| "All existing document form pages MUST conform" | **PARTIALLY CURRENT** | Invoice, Quotation, CSR, Letter, Waybill conform. RFQ and BOQ do not. | The normative claim is aspirational for RFQ/BOQ. No evidence of enforcement action against RFQ. |

---

## 4. Historical Residue

The following items reference the pre-consolidation Invoice architecture. None were modified.

### 4.1 Stale Line References in Active Standards

| File | Reference | Problem |
|---|---|---|
| `docs/standard/prefix-engine-settings-standard.md:186` | `src/pages/NewInvoice.tsx:596` for invoice number generation | `NewInvoice.tsx` is now 5 lines. The logic moved to `src/pages/InvoiceFormPage.tsx:272-290`. |
| `docs/standard/prefix-engine-settings-standard.md:508` | `src/pages/NewInvoice.tsx` for insert with `withUniqueRetry` | Stale. Save logic now in `useInvoiceSave` / `useDocumentSave`. |
| `docs/standard/document-column-standard.md:123` | `src/pages/EditInvoice.tsx:168` for column init on load | Stale. Now in `useInvoiceHydration` via `InvoiceFormPage.tsx:189-212`. |
| `docs/standard/document-column-standard.md:135` | `src/pages/NewInvoice.tsx:203-205` for prefill column init | Stale. Now `src/pages/InvoiceFormPage.tsx:232-237`. |

### 4.2 Stale Test Assertions

| File | Assertion | Problem |
|---|---|---|
| `src/tests/status/statusModelSweep.test.js:15` | `assert.match(newInvoiceSource, /status:\s*'unpaid'/)` | `NewInvoice.tsx` no longer contains this string. The save call moved to `InvoiceFormPage.tsx:429`. |
| `src/tests/status/statusModelSweep.test.js:16` | `assert.match(editInvoiceSource, /handleSave\('unpaid'\)/` | `EditInvoice.tsx` no longer contains this string. |
| `src/tests/document/sharedDocumentFormRegression.test.js:20-23` | Asserts `NewInvoice.tsx`/`EditInvoice.tsx` import and render `SharedDocumentForm` | Delegators now import `InvoiceFormPage`, not `SharedDocumentForm`. |

These tests would fail if run against current source. They are residue from the pre-consolidation architecture. (Not run per task constraints; mismatch established by source reading only.)

### 4.3 Historical Reports and Session Logs

- `docs/reports/waybill/sequence-generator-audit.md` and `docs/reports/waybill/prefix-engine-*.md` — describe `NewInvoice.tsx` with inline `SASINV-B` number logic. True before commit `c432e520`; now historical.
- `docs/prd/ui-ux-consolidation/*` — describe `NewInvoice.tsx` at 872 lines and `EditInvoice.tsx` at 849 lines. Pre-consolidation state; now historical.
- `session-tenancy.md` — large session log containing old `NewInvoice.tsx`/`EditInvoice.tsx` content. Historical snapshot.
- `docs/reports/ui-ux/prd-progress-audit-2026-08-28.md:75` — "Stubs redirect to `InvoiceFormPage.tsx` (17,980 bytes)". Confirms the consolidation timeline.

---

## 5. Architectural Evolution

Git evidence supports this chronology:

1. **Pre-consolidation (before 2026-07-02):** `NewInvoice.tsx` (~872 lines) and `EditInvoice.tsx` (~849 lines) contained full inline orchestration, including duplicated invoice-number logic with hardcoded `SASINV-B` (documented in `docs/reports/waybill/sequence-generator-audit.md`).
2. **2026-07-02, commit `c432e520`:** "refactor(invoice): consolidate invoice forms into shared InvoiceFormPage orchestrator." Invoice became the first module with the unified FormPage + thin delegator pattern.
3. **2026-07-12:** CSR + Letter consolidation report written. The standard `docs/standard/document-form-consolidation-standard.md` created to codify the Invoice pattern. Report states: "following the InvoiceFormPage single-mode-prop pattern."
4. **After 2026-07-12:** Quotation and Waybill consolidated into the pattern (`QuotationFormPage.tsx`, `WaybillFormPage.tsx` both exist with `mode` props and thin delegators).
5. **RFQ never consolidated.** `NewRfq.tsx` and `EditRfq.tsx` retain inline orchestration (load, save, navigate, number generation). No `RfqFormPage.tsx` exists.
6. **BOQ mid-rebuild.** Commit `a1e387ce` (2026-09-26, "BOQ v9 form architecture") and uncommitted changes from another agent at audit time. `NewBoq.tsx`/`EditBoq.tsx` are placeholder stubs.

The evolution is: **New/Edit pages with duplicated orchestration → thin delegators + unified FormPage (Invoice first) → standard codifies the pattern → other modules follow.** Invoice is the pattern's originator, not a departurer.

---

## 6. Scope Impact

Lightweight cross-document check of all modules named in the standard:

| Module | FormPage exists? | Thin delegators? | Conforms? | Evidence |
|---|---|---|---|---|
| Invoice | Yes | Yes | **Yes** | `InvoiceFormPage.tsx`, 5-line delegators |
| Quotation | Yes | Yes | **Yes** | `QuotationFormPage.tsx:58` (`mode` prop), 5-line delegators |
| CSR | Yes | Yes | **Yes** | `CsrFormPage.tsx:55` (`mode` prop), 5-line delegators; uses `CsrFormScreen` not `SharedDocumentForm` |
| Letter | Yes | Yes | **Yes** | `LetterFormPage.tsx:27` (`mode` prop), 5-line delegators; inline form UI (standard exception) |
| Waybill | Yes | Yes | **Yes** | `WaybillFormPage.tsx:20` (`mode` prop), 5-line delegators; uses `WaybillForm` not `SharedDocumentForm` |
| RFQ | **No** | **No** | **No** | `NewRfq.tsx` (~110 lines) and `EditRfq.tsx` (~100 lines) contain full inline orchestration |
| BOQ | **No** | Stubs | **No** | `NewBoq.tsx`/`EditBoq.tsx` are placeholder stubs during active rebuild |

**Conclusion:** The drift is **not** Invoice-only — but it is also not a drift away from the standard. Five of seven modules conform. RFQ is a genuine non-conformity (pre-consolidation architecture retained). BOQ is a temporary state during a rebuild owned by another agent.

---

## 7. Recommendation for the Standard

### 7.1 Principles That Remain Sound (keep normative)

- Single `*FormPage.tsx` per document module with a `mode: 'create' | 'edit'` prop.
- `NewX.tsx`/`EditX.tsx` as thin delegators with zero orchestration.
- Independent lazy loading of New/Edit routes.
- Existing `/new` and `/edit/:id` route paths preserved.
- Mode responsibilities table (number generation, prefills, loading, identity lock, duplication).
- Orchestration confined to the FormPage and its hooks.

### 7.2 Requirements That Need Rewriting

1. **Rule 3 ("Form UI is already shared"):** Only Invoice and Quotation share `SharedDocumentForm`. CSR uses `CsrFormScreen`, Waybill uses `WaybillForm`, Letter renders inline. The standard should state: "Form UI is shared where the domain model fits `SharedDocumentForm` (Invoice, Quotation). Structurally incompatible modules (CSR, Waybill, Letter) use their own form components. New modules must evaluate fit before choosing."

2. **Section 5 (Conformance):** Should distinguish conforming modules (Invoice, Quotation, CSR, Letter, Waybill) from non-conforming (RFQ) and in-flux (BOQ). The blanket "MUST conform" claim is currently unenforced for RFQ.

3. **Section 4 (Adding a New Document Module):** Should add a step: "Evaluate whether the module's domain model fits `SharedDocumentForm`. If not, use a dedicated form component inside the FormPage."

### 7.3 Requirements Contradicted by Current Invoice

None. Every normative claim in Sections 2-5 is either CURRENT or PARTIALLY CURRENT with respect to Invoice. No requirement is actively contradicted by Invoice.

### 7.4 Requirements That Cannot Be Verified

- Whether RFQ consolidation is scheduled (no ticket found in scope of this audit).
- Whether BOQ's rebuild will produce a `BoqFormPage` (another agent's uncommitted work; out of scope).

### 7.5 Proposed Replacement Pattern (if the standard is rewritten)

No replacement pattern is needed for Invoice. The current Invoice architecture **is** the pattern the standard describes. A rewrite should only:
- Add the domain-model-fit rule for form UI sharing.
- Update the conformance section to list RFQ as non-conforming and BOQ as in-flux.
- Repoint stale line references in `prefix-engine-settings-standard.md` and `document-column-standard.md` at `InvoiceFormPage.tsx`.

---

## 8. Proposed Next Action

**Option (a): Update the standard — but narrowly. Do not change Invoice.**

Rationale:

- Invoice fully conforms. Changing Invoice to "restore conformance" (option b) would mean breaking working code to match a standard it already matches. Behavior-preservation risk: high, benefit: zero.
- A broader audit (option c) is unnecessary for the standard's core claims — this audit already established the full cross-module picture.
- The standard's real defects are: (1) rule 3 overstates form-UI sharing; (2) Section 5 ignores RFQ/BOQ non-conformance; (3) two other standards contain stale line references to the pre-consolidation Invoice files; (4) two test files assert patterns that no longer exist in the delegators.

Concrete next tasks (separate from this audit):

1. Rewrite rule 3 and Section 5 of `document-form-consolidation-standard.md`.
2. Repoint stale references in `prefix-engine-settings-standard.md` and `document-column-standard.md`.
3. Update `src/tests/status/statusModelSweep.test.js` and `src/tests/document/sharedDocumentFormRegression.test.js` to assert against `InvoiceFormPage.tsx` instead of the delegators.
4. Track RFQ consolidation as future work (create `RfqFormPage.tsx`, reduce `NewRfq.tsx`/`EditRfq.tsx` to delegators).

---

## Verification

- `git status` (before): pre-existing modifications to BOQ files, `src/pages/EditBoq.tsx`, `src/pages/NewBoq.tsx`, `src/pages/ViewBoq.tsx`, `src/tests/critical/documentNumbering.test.js`, `src/tests/document/dateField.test.js`, and untracked BOQ report/HTML files. All belong to another agent. Not touched.
- `git status` (after): unchanged. Only this report file added.
- No application source, standard, configuration, migration, test, or other repository file was modified.
- `bun run build`: skipped due to hardware policy.
- `bun run typecheck`, `bun run lint`, `bun run audit:load`, tests: not run (documentation-only investigation; prohibited by task constraints).
