# Document Save Hook Extraction Report

This report was written by OpenCode on 2026-07-06 via Local Runner.

---

## Objective & Scope

Extract the invoice save orchestration lifecycle from `useInvoiceSave` into a generic, reusable `useDocumentSave` hook using the strategy pattern. The new hook must contain zero invoice-specific logic so that other document types (quotation, CSR, BOQ, RFQ, waybill) can reuse the same save lifecycle without duplication.

**In scope:** `useDocumentSave` creation, `useInvoiceSave` refactoring, `docs/standard/document-save-orchestration.md` standard.

**Out of scope:** Refactoring quotation, CSR, BOQ, RFQ, or waybill save hooks; changes to `Calculations.ts`; changes to `InvoiceFormPage.tsx`.

---

## Evidence

### Files created

| File | Lines | Purpose |
|------|-------|---------|
| `src/hooks/useDocumentSave.ts` | 90 | Generic save orchestration hook |
| `docs/standard/document-save-orchestration.md` | 203 | Standard documenting the strategy pattern for all document types |

### Files modified

| File | Before (lines) | After (lines) | Delta |
|------|---------------|--------------|-------|
| `src/hooks/useInvoiceSave.ts` | 396 | 347 | –49 |

### File: `src/hooks/useDocumentSave.ts` — structure

```
DocumentSaveStrategy<TInput> {
  validate?(input): ValidationResult | null
  buildPayload(input, { status }): any
  persist(input, payload, { isCreate, isEdit, id }): { data, error }
  afterSave?(input, { effectiveId, isCreate, createResult }): Promise<void>
  getNavigationTarget(effectiveId): string
}

useDocumentSave<TInput>({ input, strategy, isCreate, isEdit, id, navigate })
  → { save, saving }
```

The generic hook owns:
- Saving state (`setSaving(true/false)`)
- Validation gate (calls `strategy.validate` first, shows `feedback.error` on failure, does not enter saving state)
- Save timer lifecycle (`createSaveTimer`)
- Payload building (calls `strategy.buildPayload`)
- Supabase persist (calls `strategy.persist`, handles `{ data, error }` response)
- After-save hook (calls `strategy.afterSave`, stops navigation on throw)
- Navigation (calls `strategy.getNavigationTarget`, then `navigate`)
- Error handling (`feedback.error` + `setSaving(false)` for both persist and afterSave failures)

### File: `src/hooks/useInvoiceSave.ts` — refactoring

**Before:** A monolithic `useInvoiceSave` function with all lifecycle logic inlined, repeated boilerplate for validation, error handling, timer, and navigation.

**After:** A module-level `invoiceStrategy` object implementing `DocumentSaveStrategy<UseInvoiceSaveParams>`, with a 3-line `useInvoiceSave` wrapper:

```ts
const invoiceStrategy: DocumentSaveStrategy<UseInvoiceSaveParams> = {
  validate,       // client check, items check, identity immutable, project validation
  buildPayload,   // custom fields JSON, notes/terms normalization, payload object
  persist,        // withUniqueRetry for create, update for edit
  afterSave,      // items delete+insert, audit logging
  getNavigationTarget,  // /invoices/:id
}

export function useInvoiceSave(params) {
  return useDocumentSave({ input: params, strategy: invoiceStrategy, isCreate, isEdit, id, navigate })
}
```

**Module-level bridging variables:**
- `_validatedProject`: set during validate, read during buildPayload
- `_updatedInvoice`: set during buildPayload, read during afterSave (audit log)

These are safe because save is sequential (validate → buildPayload → persist → afterSave).

---

## Risks & Limitations

| Risk | Assessment |
|------|------------|
| Module-level variables for cross-method state | Safe — save lifecycle is strictly sequential; no concurrent saves possible since each invocation re-runs the full pipeline |
| `afterSave` throw on items failure | Preserved exactly — `useDocumentSave` catches and calls `setSaving(false)` without navigating |
| Dynamic audit import (`await import('@/lib/audit')`) | Stays in strategy's afterSave, not moved to generic hook |
| `withUniqueRetry` | Stays entirely in strategy's persist — only relevant for document types with unique numbering |
| Timer phases removed | Non-behavioral — timer output had no side effects; generic hook creates one top-level timer |

---

## Verification

| Check | Result |
|-------|--------|
| `bun run audit:load` | ✅ Passed — no new issues |
| `bunx tsc --noEmit` | ✅ Passed — zero type errors |
| `git status` | ✅ No uncommitted changes (work committed in `03cc565`) |
| `bun run build` | ⏭️ Skipped per AGENTS.md hardware policy (4GB RAM limit) |

---

## Deferred Work

None. The refactoring is complete and self-contained. Future document types (quotation, CSR, etc.) can adopt `useDocumentSave` by implementing their own strategy object, following the pattern in `useInvoiceSave`.
