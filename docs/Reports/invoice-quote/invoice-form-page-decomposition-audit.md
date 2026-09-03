# InvoiceFormPage Decomposition Audit

This report was written by OpenCode on 2026-07-06 via Local Runner.

## Objective

Perform a read-only architectural decomposition audit of `src/pages/InvoiceFormPage.tsx` (837 lines) to inventory its responsibilities, map ownership boundaries, and identify extraction candidates for future refactoring. No production code changes were made.

## Executive Summary

`InvoiceFormPage.tsx` is a **shared orchestration layer** — the consolidation of `NewInvoice.tsx` and `EditInvoice.tsx` into a single page component (confirmed complete in commit `cffbc33`). At 837 lines it triggers the BLoAT auditor (threshold 600). The page is structurally healthier than comparable pages in the codebase (e.g., `CsrFormScreen.tsx` at 862 lines, `QuotationFormPage.tsx` at 868 lines) because several responsibilities have already been extracted into dedicated hooks. However, the remaining inline logic — particularly the `handleSave` function (~120 lines), calculation pipeline orchestration, and tax regime transformation — are clear extraction candidates.

The audit:load command passed with only the known BLoAT warning for this file. No ❌ or 🚨 findings were raised for InvoiceFormPage.

---

## 1. Responsibility Inventory

| # | Responsibility | Approx Lines | Location | Coupling | Future Owner |
|---|---|---|---|---|---|
| R1 | Mode detection & conditional rendering | 15 | Inline top-level | Low — `mode` prop only | Stay in page (orchestration) |
| R2 | Identity lock detection + dialog rendering | 10 | Inline | Low — reads `formFields.identityLock` | Stay or extract to guard component |
| R3 | Column state management (CRUD, reset) | Extracted | `src/components/useInvoiceColumns.tsx` (~120 lines) | Low — exposes `columns`, `addColumn`, etc. | Already extracted ✓ |
| R4 | Editable form state (items, groups, charges, header fields, pdfOutput) | Extracted | `src/hooks/useInvoiceEditableState.ts` (~430 lines) | High — 15+ state slices, passed as props downstream | **Prime extraction target** — see §7 |
| R5 | Edit-mode hydration (load from Supabase) | Extracted | `src/hooks/useInvoiceHydration.ts` (~140 lines) | Medium — calls setState from useInvoiceEditableState | Already extracted ✓ |
| R6 | Reference data loading (signatories, bank accounts, settings) | Extracted | `src/hooks/useInvoiceReferenceData.ts` (35 lines) | Low — three Supabase queries | Already extracted ✓ |
| R7 | Calculation pipeline (buildCalculationInputs → computeDocument) | 10 (call site) | Inline in return statement | Medium — imports via domain/invoice + Calculations.ts | **Extraction candidate** — domain calculation service |
| R8 | Tax regime transformation (vat → sales_tax mapping) | 8 | Inline in return statement | Medium — depends on `formFields` | **Extraction candidate** — domain transformer |
| R9 | Save/submit (handleSave) | ~120 | Inline | **High** — touches Supabase, audit, timing, number generation, feedback, validation | **Highest-priority extraction** (see §7.1) |
| R10 | Import orchestration (JSON import apply) | 15 | Inline JSX handler | Medium — uses invoiceImportAdapter | Extract with R4 |
| R11 | SharedDocumentForm prop assembly | ~60 props | Inline JSX | High — ~60 props from 6+ sources | **Extraction candidate** — assembled object/hook |
| R12 | Ad-hoc formatting utilities (numberToWords, etc.) | 5 | Import from `.js` file | Low | Already in `useInvoiceForm.js` |
| R13 | PdfOutputSettings component + sheet state | 15 | Inline JSX | Low | Extract with R4 |

---

## 2. State Ownership Map

| State | Owner Hook | Consumers | Mutation Points |
|---|---|---|---|
| `formFields` (title, po_number, notes, terms, invoice_date, due_date, etc.) | `useInvoiceEditableState` | SharedDocumentForm, calculation pipeline, handleSave | `setFormField` (drilled to SharedDocumentForm) |
| `items` | `useInvoiceEditableState` | SharedDocumentForm, calculation pipeline, handleSave | `setItems`, `syncGroupsFromItems` |
| `groups` | `useInvoiceEditableState` | SharedDocumentForm | `setGroups` |
| `extraCharges` | `useInvoiceEditableState` | SharedDocumentForm, calculation pipeline | `setExtraCharges` |
| `additionalFields` | `useInvoiceEditableState` | SharedDocumentForm | `setAdditionalFields` |
| `pdfOutput` | `useInvoiceEditableState` | SharedDocumentForm | `setPdfOutput` |
| `pdfOutputSettingsOpen`, `jsonImportOpen` | `useInvoiceEditableState` | Inline JSX | Direct toggles |
| `saving` | `useInvoiceEditableState` | handleSave, Submit button | `setSaving` |
| `validationDialogOpen` | `useInvoiceEditableState` | handleSave, Dialog | `setValidationDialogOpen` |
| `columns` | `useInvoiceColumns` | SharedDocumentForm | `addColumn`, `removeColumn`, `reorderColumns`, `resetColumns` |
| `loading`, `error` | `useInvoiceHydration` | Loading/Error UI in return | Hook internal |
| `signatories` | `useInvoiceReferenceData` | SharedDocumentForm (signatory selector) | Loaded once |
| `bankAccounts` | `useInvoiceReferenceData` | PdfOutputSettings | Loaded once |
| `settings` | `useInvoiceReferenceData` | Inline (number prefix) | Loaded once |

---

## 3. Hook Analysis

### 3.1 useInvoiceEditableState.ts (~430 lines)

**Role:** Central form state management hook.

**Notable characteristics:**
- Contains 15+ useState declarations for various invoice form slices
- Exposes field-level onChange handlers (e.g., `setFormField`, `updateItem`, etc.)
- Contains significant inline business logic (not just state declarations)
- Parses custom fields via `parseCustomFields`
- Manages both UI state (`saving`, dialog open states) and domain state

**Assessment:** This is the largest hook and the most natural extraction target. Its 430 lines suggest it could be split into smaller specialized hooks (form state vs. UI state vs. extra charges).

### 3.2 useInvoiceHydration.ts (~140 lines)

**Role:** Loads existing invoice data from Supabase for edit mode.

**Flow:**
1. Reads `invoiceId` from URL via `useParams`
2. Queries Supabase for invoice + items + groups + customFields + pdfOutput
3. Calls `setFormFields`, `setItems`, `setGroups`, `setAdditionalFields`, `setPdfOutput`, `setExtraCharges`
4. Records the original invoice number for change detection
5. `normalizeInvoiceCustomFields` from `@/domain/invoice/normalize`

**Assessment:** Well-scoped. Depends on setState from useInvoiceEditableState — this coupling is inherent to hydration.

### 3.3 useInvoiceColumns.tsx (~120 lines)

**Role:** Column CRUD hook. Re-exports `buildCalculationInputs` and `toDbItem` from `@/domain/invoice`.

**Assessment:** Correctly scoped. The re-export of domain utilities is a minor indirection that could be eliminated by importing directly from `@/domain/invoice`.

### 3.4 useInvoiceReferenceData.ts (35 lines)

**Role:** Three parallel Supabase queries for signatories, bank accounts, and settings.

**Assessment:** Minimal and correctly scoped. No extraction needed.

---

## 4. Orchestration Flow

```
NewInvoice.tsx / EditInvoice.tsx
  └─ InvoiceFormPage.tsx
       ├─ useInvoiceEditableState()       → formFields, items, groups, extraCharges, ...
       ├─ useInvoiceColumns()              → columns, column mutations
       ├─ useInvoiceHydration(...)         → loading, error (edit mode only)
       ├─ useInvoiceReferenceData()        → signatories, bankAccounts, settings
       ├─ useLayoutMode()                  → sidebarMinimized
       │
       ├─ Calculation Pipeline (inline)
       │    ├─ buildCalculationInputs(formFields, items, groups, extraCharges)
       │    └─ computeDocument(inputs)     → lineItems, summary, taxTotals, ...
       │
       ├─ Tax regime transform (inline)
       │    └─ vat → sales_tax mapping
       │
       ├─ handleSave() (inline ~120 lines)
       │    ├─ Validation (saving guard, required fields)
       │    ├─ generateWaybillSequenceNumber()
       │    ├─ toDbItem() for each item
       │    ├─ resolvePrefix() + invoice_number generation
       │    ├─ withUniqueRetry() for insert
       │    ├─ createSaveTimer() for performance
       │    ├─ logChange() for audit trail
       │    └─ userFacingMutationErrors() for error display
       │
       └─ SharedDocumentForm (JSX)
            └─ Receives ~60 props assembled from all hooks + calculations
```

---

## 5. Dependency Map

### Direct imports in InvoiceFormPage.tsx:

| Import | Classification | Risk |
|---|---|---|
| `@/supabase/client` | Infrastructure | Low — single client singleton |
| `@/hooks/useInvoiceEditableState` | Orchestration hook | Low |
| `@/hooks/useInvoiceHydration` | Orchestration hook | Low |
| `@/hooks/useInvoiceReferenceData` | Orchestration hook | Low |
| `@/hooks/useInvoiceForm` (numberToWords) | Utility | Low — plain .js file |
| `@/components/useInvoiceColumns` | Orchestration hook | Low — minor indirection in re-exports |
| `@/hooks/use-layout-mode` | UI hook | Low |
| `@/lib/Calculations` (computeDocument) | Domain | Low — canonical source of truth |
| `@/lib/saveTiming` (createSaveTimer) | Infrastructure utility | Low |
| `@/lib/audit` (logChange) | Infrastructure | Low |
| `@/lib/withUniqueRetry` | Infrastructure utility | Low |
| `@/lib/feedback` | Infrastructure utility | Low |
| `@/lib/userFacingMutationErrors` | Infrastructure utility | Low |
| `@/lib/json/safeParseJson` | Utility | Low |
| `@/components/document/SharedDocumentForm` | Rendering | Low |
| `@/components/document/IdentityLockDialog` | Rendering | Low |
| `@/domain/invoice` (types) | Domain | Low |
| `@/domain/invoice/importAdapter` | Domain adapter | Low |
| `@/domain/invoice/normalize` | Domain | Low |
| `@/domain/financial/resolveFinancialColumns` | Domain | Low |
| `@/domain/prefixConstants` | Domain | Low |
| `@/config/routing` | Config | Low |
| Supabase queries inline (in handleSave) | Infrastructure | **Medium** — mixing query logic in page |

---

## 6. Decomposition Candidates

### 6.1 HIGH PRIORITY: Extract `handleSave` → `useInvoiceSave`

**Current state:** ~120 lines inline in InvoiceFormPage.tsx. Contains validation, number generation, timing, audit, Supabase call, error handling.

**Extraction interface:**
```typescript
function useInvoiceSave(invoiceData: SaveInvoiceData): {
  save: () => Promise<void>
  saving: boolean
  validationDialogOpen: boolean
  setValidationDialogOpen: (open: boolean) => void
}
```

**Benefits:**
- Reduces page size by ~120 lines (14%)
- Isolates save logic for testing
- Makes save behavior reusable by other document forms
- Separates Supabase query code from orchestration

**Risk:** Low. The save function is self-contained with clear inputs and outputs.

### 6.2 MEDIUM PRIORITY: Extract calculation pipeline

**Current state:** `calcTotals(result)` called inline, tax regime transform inline.

**Extraction:** A `useInvoiceCalculations` hook or domain service that takes `formFields`, `items`, `extraCharges`, `columns` and returns `calculationResult` + transformed tax values.

**Benefits:**
- Consolidates calculation-related data flow
- Removes 15 lines of inline transformations
- Makes the tax regime mapping testable independently

### 6.3 LOW PRIORITY: Split `useInvoiceEditableState`

**Current state:** 430 lines combining domain state, UI state, and business logic.

**Extraction:** Split into:
- `useInvoiceFormState` — items, groups, extraCharges, additionalFields (domain state)
- `useInvoiceUiState` — saving, dialog open states (UI state)
- `useInvoicePdfOutput` — pdfOutput state (feature-specific)

**Risk:** Medium — this is the central state hook and many consumers depend on it. Better to do after handleSave extraction to reduce scope.

### 6.4 LOW PRIORITY: Eliminate re-export indirection in `useInvoiceColumns`

**Current state:** `useInvoiceColumns` re-exports `buildCalculationInputs` and `toDbItem` from domain.

**Fix:** Import these directly from `@/domain/invoice` in InvoiceFormPage.tsx.

**Benefits:** Removes unnecessary indirection. Very low risk.

---

## 7. What Should NOT Move

The following responsibilities belong in the orchestration layer and should remain in InvoiceFormPage:

1. **Mode detection** (`mode === "edit"` checks, conditional rendering) — this is page-level orchestration
2. **Hook coordination** — calling all hooks and assembling their outputs
3. **SharedDocumentForm prop assembly** — though this could be extracted to a helper function, the concern belongs at this layer
4. **Identity lock rendering** — conditional dialog rendering is page-level
5. **Import sheet open/close state** — tightly bound to the JSX structure

---

## 8. Technical Debt

| Issue | Location | Impact |
|---|---|---|
| `handleSave` is ~120 inline lines | `src/pages/InvoiceFormPage.tsx` | Hardest function to read in the file |
| `useInvoiceEditableState` at 430 lines combines domain + UI state | `src/hooks/useInvoiceEditableState.ts` | Large surface area, mixed concerns |
| `buildCalculationInputs` and `toDbItem` re-exported through hook | `src/components/useInvoiceColumns.tsx` | Creates unnecessary import indirection |
| `numberToWords` imported from `.js` file (no types inferred) | `src/hooks/useInvoiceForm.js` | Trivial — plain JS export |
| Tax regime transformation (`vat` ↔ `sales_tax`) inline in return | `src/pages/InvoiceFormPage.tsx` | Untested transformation |
| No explicit typing for the ~60 props assembled | `src/pages/InvoiceFormPage.tsx` | Prop assembly is hard to validate without a defined interface |
| QuotationFormPage (`src/pages/QuotationFormPage.tsx`, 868 lines) appears to share the same pattern | Parallel file | Architecture pattern should be replicated for consistency |

---

## 9. Migration Roadmap (Rollback-Safe)

Each step is independent and can be reverted without affecting others.

**Phase 1 (safe, high-value):**
1. Extract `handleSave` → `useInvoiceSave` hook
2. Import `buildCalculationInputs`/`toDbItem` directly from domain, remove re-exports

**Phase 2 (medium effort):**
3. Extract calculation pipeline + tax regime transform → `useInvoiceCalculations` or domain service

**Phase 3 (larger refactor):**
4. Split `useInvoiceEditableState` into domain/UI/feature-specific hooks
5. Extract SharedDocumentForm prop assembly into typed helper

---

## 10. Verification

- **file inspected:** `src/pages/InvoiceFormPage.tsx` (837 lines)
- **hooks inspected:** `useInvoiceEditableState.ts`, `useInvoiceHydration.ts`, `useInvoiceReferenceData.ts`, `useInvoiceColumns.tsx`
- **domain inspected:** `domain/invoice/index.ts`, `normalize.ts`, `additionalFields.ts`, `importAdapter.ts`
- **consumers inspected:** `NewInvoice.tsx`, `EditInvoice.tsx` (both confirmed 5-line thin wrappers)
- **dependencies inspected:** `Calculations.ts`, `audit.ts`, `saveTiming.ts`, `withUniqueRetry.ts`
- **audit:load:** Passed (known BLoAT warning for this file, no QUERY or ARCH risks)
- **git status:** Only this report file was created; no production files modified
