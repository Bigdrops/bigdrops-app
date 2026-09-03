# Document Form Consolidation Report (CSR + Letter)

This report was written by OpenCode on 2026-07-12 via Local Runner.

## Objective & Scope

Consolidate NewCSR/EditCSR → CsrFormPage and NewLetter/EditLetter → LetterFormPage, following the InvoiceFormPage single-mode-prop pattern. Scope includes:
- CSR: orchestration extraction (number generation, prefills, offline drafts, identity lock, duplicate) into CsrFormPage
- Letter: orchestration extraction (settings prefill, DB load, field lock, save) into LetterFormPage
- Thin delegator preservation in NewCSR/EditCSR/NewLetter/EditLetter
- Normative standard document at docs/standard/document-form-consolidation-standard.md

Explicitly excluded: QuotationFormPage consolidation (already exists but not part of this task), BOQ/RFQ/Waybill form pages (future work).

## Files Created

- `src/pages/CsrFormPage.tsx` — 200 lines. Create mode: CSR number generation, invoice/project/blank-download prefills, offline+Sentry+uniqueRetry save. Edit mode: load by ID, field unlock for draft, identity lock for non-draft, guarded save. Delegates form rendering to existing CsrFormScreen.
- `src/pages/LetterFormPage.tsx` — 230 lines. Create mode: prefill sender from settings. Edit mode: load from letterRepository, lock fields if not draft. Form UI inline (no shared form component exists for Letter).
- `docs/standard/document-form-consolidation-standard.md` — normative standard mandating the single *FormPage pattern for all document modules. Covers file layout, component interface, route registration, mode responsibilities, and conformance rules.

## Files Modified

- `src/pages/NewCSR.tsx` — replaced with `<CsrFormPage mode="create" />`
- `src/pages/EditCSR.tsx` — replaced with `<CsrFormPage mode="edit" />`
- `src/pages/NewLetter.tsx` — replaced with `<LetterFormPage mode="create" />`
- `src/pages/EditLetter.tsx` — replaced with `<LetterFormPage mode="edit" />`

## Architecture Decisions

1. **Letter form UI stays inline** in LetterFormPage. Unlike CSR (which had CsrFormScreen), there is no shared form component for Letter documents. Extracting one would be premature given the simple form structure (6 fields, no item table, no dynamic rows).

2. **CsrFormPage reuses existing CsrFormScreen** without changes. All mode-dependent behavior (visibility of identity lock, save with retry vs save) is handled at the orchestration layer, not in the form component.

3. **`mode` prop over route-deduced logic**. Introduced in InvoiceFormPage and now standardized: a `mode: 'create' | 'edit'` prop is simpler and more testable than inferring mode from router params inside the component.

## Risks & Limitations

1. CsrFormScreen is still oversized (922 lines, flagged by audit) and contains direct Supabase calls — these are pre-existing issues outside this task's scope.

2. Letter's inline form UI means any future Letter field changes must be made directly in LetterFormPage. If Letter grows significantly, extracting a shared LetterFormScreen would be warranted.

3. NewLetter.tsx/EditLetter.tsx are still the registered route targets — AppShell.tsx lazy-loads them unchanged, so no router modifications were needed.

## Verification

- `bun run typecheck` — passed (no errors)
- `bun run audit:load` — passed (no new issues introduced)
- `git status` — confirms only the expected 6 page files + 1 standard document were changed/created

## Deferred Work

- BOQ, RFQ, and Waybill form consolidation (follow same pattern in future)
- CsrFormScreen refactoring (split oversized component, extract Supabase calls) — separate task
- LetterFormScreen extraction (only if Letter fields grow significantly)
