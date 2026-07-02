# Invoice Form Architecture Audit

**Date:** 2025-07-02
**Status:** READ-ONLY AUDIT — No code changes were made
**Files examined:** `NewInvoice.tsx`, `EditInvoice.tsx`, `SharedDocumentForm.tsx`, `useInvoiceColumns.tsx`, `useLayoutMode.ts`, `useSettings.js`, `domain/invoice/*`, `lib/withUniqueRetry.ts`, `lib/Calculations.ts`, `domain/financial/resolveFinancialColumns.ts`

---

## 1. Executive Summary

`NewInvoice.tsx` (~1076 lines) and `EditInvoice.tsx` (~972 lines) share an enormous amount of duplicated orchestration logic. A well-extracted `SharedDocumentForm.tsx` already serves as the rendering composition layer, but it is typed with `any` props. The domain layer (`src/domain/invoice/`) is well-structured with clean separation of concerns. The target architecture — a single `InvoiceFormPage.tsx` with a `useInvoiceForm` hook — is clearly achievable and well-scoped.

**Key finding:** ~60-65% of both files are identical logic. The remaining ~35-40% is mode-specific initialization (prefill for new, DB load for edit).

---

## 2. SharedDocumentForm.tsx — The Existing Composition Layer

`SharedDocumentForm` already extracts the rendering concerns shared between New and Edit. It receives a massive props bag (currently typed as `any`) and delegates all UI rendering.

**SharedDocumentForm props (inferred from usage in both pages):**

```
title, setTitle, invoice, setInvoice,
items, setItems, groups, setGroups,
columns, isVisible, getColumn, toggleVisible, toggleDisabled,
updateColumn, addCustomColumn, removeCustomColumn, resetColumns, moveColumn, customColumns,
calculationInputs, documentTotals, format,
isLocked, isReadonly, isQuotationConversion, isCSRConversion,
handleSave, handleCancel, isSaving,
canEdit, canExport, canDelete,
additionalFields, setAdditionalFields,
notes, setNotes, terms, setTerms,
attachments, handleFileDrop, handleRemoveAttachment,
signatoryId, setSignatoryId,
showVat, setShowVat, showDiscount, setShowDiscount, showWht, setShowWht,
advance, setAdvance,
extraCharges, setExtraCharges,
showExtraCharges, setShowExtraCharges,
mergeQtyUnit, setMergeQtyUnit,
handleDismissInvalidRow, handleDismissConflict,
invalidStandardRowCount, conflicts, setConflicts,
handleImport,
onNavigateToClient, onNavigateToProjects,
pdfOutput, setPdfOutput,
```

**Assessment:** The props interface needs proper TypeScript typing. The rendering layer is well-structured. The problem is in the pages above it.

---

## 3. Responsibility Map — Section-by-Section

### 3.1 State Declarations

| Concern | NewInvoice | EditInvoice | Identical? |
|---|---|---|---|
| `id` param from `useParams` | `undefined` | `id` | No — mode-specific |
| `title` / `setTitle` | `useState('New Invoice')` | `useState('Invoice')` | No — different defaults |
| `isSaving` | `useState(false)` | `useState(false)` | Yes |
| `isLocked` | derived | derived | Yes |
| `signatoryId` / `setSignatoryId` | `useState(null)` | `useState(null)` | Yes |
| `Notes` / `setNotes` | `useState('')` | `useState('')` | Yes |
| `Terms` / `setTerms` | `useState('')` | `useState('')` | Yes |
| `AdditionalFields` / `setAdditionalFields` | `useState([])` | `useState([])` | Yes |
| `attachments` / `handleFileDrop` / `handleRemoveAttachment` | `useState([])` + handlers | `useState([])` + handler | Yes |
| `mergeQtyUnit` / `setMergeQtyUnit` | `useState(false)` | `useState(false)` | Yes |
| `showVat` / `setShowVat` | `useState(false)` | `useState(false)` | Yes |
| `showDiscount` / `setShowDiscount` | `useState(false)` | `useState(false)` | Yes |
| `showWht` / `setShowWht` | `useState(false)` | `useState(false)` | Yes |
| `advance` / `setAdvance` | `useState({ show: false, type: 'none', ... })` | Same | Yes |
| `extraCharges` / `setExtraCharges` | `useState([])` | `useState([])` | Yes |
| `showExtraCharges` / `setShowExtraCharges` | `useState(false)` | `useState(false)` | Yes |
| `pdfOutput` / `setPdfOutput` | `useState(null)` | `useState(null)` | Yes |
| `invoice` / `setInvoice` | `useState({})` | `useState({})` | Yes |
| `items` / `setItems` | `useState([])` | `useState([])` | Yes |
| `groups` / `setGroups` | `useState([])` | `useState([])` | Yes |
| `conflicts` / `setConflicts` | `useState([])` | `useState([])` | Yes |

**Conclusion:** ~90% of state declarations are identical. Only `id`, `title` default, and `invoice` initial shape differ.

---

### 3.2 State Update Functions

| Function | NewInvoice | EditInvoice | Identical? |
|---|---|---|---|
| `updateInvoice` | `setInvoice(prev => ({ ...prev, ...changes }))` | Same pattern | Yes |
| `updateItem` | by id, merges changes | Same | Yes |
| `setItems` (wrapper) | No-op if empty array passed | Same | Yes |
| `handleDismissInvalidRow` | `setInvalidStandardRowIds(prev => prev.filter(i => i !== id))` | Same | Yes |
| `handleDismissConflict` | `setConflicts(prev => prev.filter(c => c.itemId !== itemId))` | Same | Yes |
| `handleSignatoryChange` | `setSignatoryId(id)` | Same | Yes |

**Conclusion:** All state update functions are identical.

---

### 3.3 Derivations (useMemo / derived state)

| Derivation | NewInvoice | EditInvoice | Identical? |
|---|---|---|---|
| `calculationInputs` | `buildCalculationInputs(invoice, items)` | Same | Yes |
| `documentTotals` | `computeDocument(calculationInputs)` | Same | Yes |
| `isLocked` | `invoice.status === 'paid' \|\| invoice.status === 'voided'` | Same | Yes |
| `clientData` / `clientObj` | Extracted from `invoice.client_id` | Same | Yes |
| `isQuotationConversion` / `isCSRConversion` | URL param check | Same | Yes |
| `customFields` | `parseCustomFields(invoice)` | Same | Yes |
| `additionalFieldsNormalized` | `normalizeAdditionalFieldEntries(...)` | Same | Yes |

**Conclusion:** All derivations are identical.

---

### 3.4 Columns

| Aspect | NewInvoice | EditInvoice | Identical? |
|---|---|---|---|
| Column hook | `useInvoiceColumns(...)` | `useInvoiceColumns(...)` | Yes |
| Columns passed to form | `columns, isVisible, getColumn, ...` | Same | Yes |

**Conclusion:** Column management is identical.

---

### 3.5 Validation

| Concern | NewInvoice | EditInvoice | Identical? |
|---|---|---|---|
| `client_id` check | `if (!invoice.client_id)` → toast | Same | Yes |
| `standardItems` filter | `items.filter(i => i.row_type === 'standard' \|\| !i.row_type)` | Same | Yes |
| `invalidStandardRowCount` | Check for missing qty/description | Same | Yes |

**Conclusion:** Validation logic is identical.

---

### 3.6 handleSave Function

This is the largest single function in both files.

**NewInvoice `handleSave`:**
1. Validate `client_id` present
2. Filter `standardItems` from `items`
3. Check `invalidStandardRowCount` (missing qty/description)
4. Guard against saving with validation errors
5. Compute `calculationInputs` via `buildCalculationInputs`
6. Compute `documentTotals` via `computeDocument`
7. Generate `invoiceNumber` via `getNextInvoiceNumber`
8. Build `invoiceData` object with all fields
9. Build `customFieldsData` object
10. Insert into Supabase `invoices` table
11. Handle signatories
12. Show success toast
13. Navigate to new invoice view

**EditInvoice `handleSave`:**
1. Validate `client_id` present
2. Filter `standardItems` from `items`
3. Check `invalidStandardRowCount` (missing qty/description)
4. Guard against saving with validation errors
5. Compute `calculationInputs` via `buildCalculationInputs`
6. Compute `documentTotals` via `computeDocument`
7. Build `invoiceData` object with all fields
8. Build `customFieldsData` object
9. **Update** (not insert) Supabase `invoices` table by `id`
10. Handle signatories
11. Show success toast
12. Navigate to edit invoice view

**Differences:**
- NewInvoice generates `invoiceNumber`; EditInvoice does not (it's already set)
- NewInvoice **inserts**; EditInvoice **updates**
- Navigation target differs (new invoice id vs current id)
- NewInvoice uses `withUniqueRetry`; EditInvoice does not

**Conclusion:** The validation + computation block (steps 1-6) is identical. Only the persistence strategy differs (insert vs update).

---

### 3.7 handleImport

| Concern | NewInvoice | EditInvoice | Identical? |
|---|---|---|---|
| `handleImport` | `invoiceImportAdapter(...)` delegation | Same | Yes |

**Conclusion:** Identical.

---

### 3.8 Effects (useEffect)

| Effect | NewInvoice | EditInvoice | Identical? |
|---|---|---|---|
| Load from DB | None | Yes — loads invoice by `id`, calls `mapDbInvoiceItem`, `inferLegacyCalculationState` | No — mode-specific |
| Prefill from URL params | Yes — `prefillItems`, `projectPrefill`, `prefill` query param | None | No — mode-specific |
| Save timing (useSaveTimer) | Yes | Yes | Yes |
| Feedback listener (useFeedbackListener) | Yes | Yes | Yes |

**Conclusion:** Effects are mode-specific and cannot be directly shared. This is expected.

---

### 3.9 Loading State

| Concern | NewInvoice | EditInvoice | Identical? |
|---|---|---|---|
| Loading check | `if (!id \|\| loading)` or similar | `if (!id \|\| loading)` | Near-identical |
| Loading JSX | Spinner + "Loading invoice..." | Spinner + "Loading invoice..." | Near-identical |

**Conclusion:** Loading states are nearly identical with minor wording differences.

---

### 3.10 SharedDocumentForm Props Assembly

Both pages assemble the same massive prop object and pass it to `SharedDocumentForm`. The prop object shape is identical:

```tsx
<SharedDocumentForm
  title={title}
  setTitle={setTitle}
  invoice={invoice}
  setInvoice={setInvoice}
  items={items}
  setItems={setItems}
  groups={groups}
  setGroups={setGroups}
  columns={columns}
  isVisible={isVisible}
  getColumn={getColumn}
  // ... all other props
  handleSave={handleSave}
  handleCancel={() => navigate(-1)}
  isSaving={isSaving}
  // ...
/>
```

**Conclusion:** Prop assembly is identical.

---

## 4. Domain Layer Architecture

The domain layer is well-structured with clean separation of concerns.

### 4.1 Domain Files

| File | Responsibility |
|---|---|
| `domain/invoice/types.ts` | All domain types: `InvoiceItem`, `InvoiceGroup`, `ColumnConfig`, `AdvanceConfig`, `InvoiceCustomFields`, `ExtraCharge`, `FieldEntry`, etc. |
| `domain/invoice/calculations.ts` | `buildCalculationInputs`, `extractCalculationInputs`, `resolveExtraCharges` — bridges domain state to `lib/Calculations.ts` |
| `domain/invoice/factories.ts` | `makeEmptyItem`, `makeEmptyGroup`, `makeFieldEntry`, `makeExtraCharge`, `ensureUiKey`, `normalizeFieldEntries`, `normalizeExtraCharges` |
| `domain/invoice/normalize.ts` | `syncGroupsFromItems`, `mapDbInvoiceItem`, `parseCustomFields`, `normalizeAdditionalFieldEntries`, `getInvoicePdfOutput`, `getInvoiceSignatoryId` |
| `domain/invoice/columns.ts` | `BUILTIN_COLUMNS`, `DEFAULT_COLUMN_ORDER`, `getResetColumnConfigs`, `normalizeColumnConfig`, `normalizeVisibilityMode`, `resolveColumnBehavior` |
| `domain/invoice/importAdapter.ts` | `invoiceImportAdapter` — bridges domain to import system |
| `domain/invoice/additionalFields.ts` | `normalizeAdditionalFieldEntries`, `getAdditionalFields`, `filterPopulatedAdditionalFields` |
| `domain/invoice/financialState.ts` | `calculateInvoiceFinancialState` |
| `domain/invoice/advanceConfig.ts` | Advance payment configuration |
| `domain/invoice/index.ts` | Barrel re-export from all domain modules |

### 4.2 Lib Layer

| File | Responsibility |
|---|---|
| `lib/Calculations.ts` | **Single source of truth** for all financial math (v3). 720 lines. Uses `decimal.js`. |
| `lib/withUniqueRetry.ts` | Supabase insert retry on 23505 unique constraint violations (used only in NewInvoice) |

### 4.3 Frozen Systems

| System | Status | Impact |
|---|---|---|
| `lib/Calculations.ts` | **FROZEN** — do not modify | All financial math flows through here |
| `domain/financial/resolveFinancialColumns.ts` | **FROZEN** — do not modify | Column ordering/resolution |
| Column resolver system | **FROZEN** — do not modify | Column state management |

---

## 5. useInvoiceColumns Hook

`useInvoiceColumns.tsx` is a well-structured hook that:
1. Re-exports domain functions from `domain/invoice/columns`
2. Manages column state via React state
3. Provides: `columns`, `isVisible`, `getColumn`, `toggleVisible`, `toggleDisabled`, `updateColumn`, `addCustomColumn`, `removeCustomColumn`, `resetColumns`, `moveColumn`, `customColumns`

Both pages use it identically.

---

## 6. useLayoutMode and useSettings

### useLayoutMode.ts
Thin wrapper around `useFoldAwareness`:
- Returns: `isMobile`, `isTablet`, `isDesktop`, `isMobileOrTablet`
- Used by both pages identically

### useSettings.js
Vanilla JavaScript file (not TypeScript):
- Module-level `cachedSettings` singleton
- Supabase realtime subscription for settings changes
- Theme normalization
- Both pages consume it identically

---

## 7. SharedDocumentForm Props — Missing TypeScript Interface

The props interface for `SharedDocumentForm` is currently typed as `any`. A proper interface should be extracted:

```typescript
interface SharedDocumentFormProps {
  // Document identity
  title: string
  setTitle: (title: string) => void
  invoice: Invoice
  setInvoice: (updater: (prev: Invoice) => Invoice) => void

  // Line items
  items: InvoiceItem[]
  setItems: (updater: (prev: InvoiceItem[]) => InvoiceItem[]) => void
  groups: InvoiceGroup[]
  setGroups: (updater: (prev: InvoiceGroup[]) => InvoiceGroup[]) => void

  // Columns
  columns: ColumnConfig[]
  isVisible: (key: string) => boolean
  getColumn: (key: string) => ColumnConfig | undefined
  toggleVisible: (key: string) => void
  toggleDisabled: (key: string) => void
  updateColumn: (key: string, patch: Partial<ColumnConfig>) => void
  addCustomColumn: (label: string) => void
  removeCustomColumn: (key: string) => void
  resetColumns: () => void
  moveColumn: (key: string, direction: 'left' | 'right') => void
  customColumns: ColumnConfig[]

  // Financial
  calculationInputs: CalculationInputs
  documentTotals: DocumentTotals
  format: (value: number) => string

  // Document state
  isLocked: boolean
  isReadonly: boolean
  isQuotationConversion: boolean
  isCSRConversion: boolean

  // Save
  handleSave: () => void
  handleCancel: () => void
  isSaving: boolean

  // Permissions
  canEdit: boolean
  canExport: boolean
  canDelete: boolean

  // Commercial terms
  showVat: boolean
  setShowVat: (show: boolean) => void
  showDiscount: boolean
  setShowDiscount: (show: boolean) => void
  showWht: boolean
  setShowWht: (show: boolean) => void
  advance: AdvanceConfig
  setAdvance: (config: AdvanceConfig) => void
  extraCharges: ExtraCharge[]
  setExtraCharges: (charges: ExtraCharge[]) => void
  showExtraCharges: boolean
  setShowExtraCharges: (show: boolean) => void

  // Notes/terms
  notes: string
  setNotes: (notes: string) => void
  terms: string
  setTerms: (terms: string) => void

  // Additional fields
  additionalFields: FieldEntry[]
  setAdditionalFields: (fields: FieldEntry[]) => void

  // Merge
  mergeQtyUnit: boolean
  setMergeQtyUnit: (merge: boolean) => void

  // Validation
  handleDismissInvalidRow: (id: string) => void
  handleDismissConflict: (itemId: string) => void
  invalidStandardRowCount: number
  conflicts: Conflict[]
  setConflicts: (conflicts: Conflict[]) => void

  // Import
  handleImport: (data: ImportData) => void

  // Navigation
  onNavigateToClient: () => void
  onNavigateToProjects: () => void

  // PDF
  pdfOutput: PdfOutputConfig | null
  setPdfOutput: (config: PdfOutputConfig | null) => void

  // Attachments
  attachments: Attachment[]
  handleFileDrop: (files: File[]) => void
  handleRemoveAttachment: (index: number) => void

  // Signatory
  signatoryId: string | null
  setSignatoryId: (id: string | null) => void
}
```

---

## 8. Target Architecture

Based on the PRD (`docs/PRD/ui-ux-consolidation/`) and this audit:

```
InvoiceFormPage.tsx
├── Layout (wrapper)
├── useInvoiceForm() hook
│   ├── Invoice state (items, groups, invoice, commercial terms)
│   ├── Column state (via useInvoiceColumns)
│   ├── Save handlers (create + update via mode)
│   ├── Validation (client_id, standardItems, invalid rows)
│   ├── Import (via invoiceImportAdapter)
│   ├── Navigation (on success)
│   └── Signatory management
├── SharedDocumentForm (controlled, typed props)
│   ├── FormHeader
│   ├── FormLineItems
│   │   └── SortableLineItem
│   ├── FormCommercialTerms
│   ├── FormTotals
│   ├── FormNotesTerms
│   │   └── RichTextEditor
│   └── FormFooter
└── PdfOutputSettings (conditional)
```

**Mode resolution:**
- URL param `id` present → edit mode
- URL param `id` absent → create mode
- Prefill logic (clone, project, quotation conversion) runs only in create mode
- DB load runs only in edit mode

---

## 9. Duplicated Logic — Extraction Candidates

### 9.1 Extract to `useInvoiceForm` hook

| Logic | Lines (est.) | Complexity |
|---|---|---|
| State declarations (all useState) | ~80 | Low |
| State update functions (updateInvoice, updateItem, etc.) | ~30 | Low |
| Derivations (calculationInputs, documentTotals, isLocked) | ~30 | Low |
| Validation (client_id, standardItems, invalidStandardRowCount) | ~20 | Low |
| handleSave (validation + computation block) | ~40 | Medium |
| handleImport | ~5 | Low |
| handleFileDrop / handleRemoveAttachment | ~15 | Low |
| handleDismissInvalidRow / handleDismissConflict | ~10 | Low |
| handleSignatoryChange | ~5 | Low |
| **Total extractable** | **~235 lines** | |

### 9.2 Mode-specific (stays in page or injected)

| Logic | NewInvoice | EditInvoice |
|---|---|---|
| DB load effect | — | ~40 lines |
| Prefill effects | ~60 lines | — |
| Invoice number generation | ~15 lines | — |
| `withUniqueRetry` for insert | ~5 lines | — |
| Persistence strategy (insert vs update) | ~10 lines | ~10 lines |
| Navigation target | new id | current id |

---

## 10. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| `SharedDocumentForm` props typed as `any` | Medium | Extract proper TypeScript interface before unification |
| `useSettings.js` is vanilla JS (not TS) | Low | Consider converting to `.ts` during unification |
| `lib/Calculations.ts` is frozen | N/A | No changes needed — both pages already use it correctly |
| Column resolver system is frozen | N/A | No changes needed — both pages already use `useInvoiceColumns` correctly |
| `withUniqueRetry` only used in NewInvoice | Low | Keep in create-mode path; edit mode doesn't need retry (update, not insert) |
| State update functions are identical but scattered | Low | Extract to hook — no behavioral change |

---

## 11. Implementation Recommendations

### Step 1: Extract `useInvoiceForm` hook

Create `src/hooks/useInvoiceForm.ts`:
- Accept `mode: 'create' | 'edit'` and optional `id: string`
- Return all shared state, handlers, derivations
- Accept injected persistence function (insert vs update)

### Step 2: Create `InvoiceFormPage.tsx`

- Resolve mode from URL params
- Call `useInvoiceForm({ mode, id })`
- Render `SharedDocumentForm` with typed props
- Keep mode-specific initialization (prefill / DB load) in the page, not the hook

### Step 3: Type `SharedDocumentForm` props

- Extract `SharedDocumentFormProps` interface from `domain/invoice/types.ts`
- Replace `any` with the new interface

### Step 4: Update routes

- Point both `/invoices/new` and `/invoices/:id/edit` to `InvoiceFormPage`
- Remove `NewInvoice.tsx` and `EditInvoice.tsx`

### Step 5: Verify

- `bun run typecheck` passes
- `bun run lint` passes
- `bun run test` passes
- Create + edit invoice flows work correctly
- Prefill flows (clone, project, quotation conversion) work
- Dark mode unchanged
- Mobile form flows unchanged

---

## 12. Files Examined (Complete List)

| File | Lines | Role |
|---|---|---|
| `src/pages/NewInvoice.tsx` | ~1076 | New invoice creation page |
| `src/pages/EditInvoice.tsx` | ~972 | Invoice editing page |
| `src/components/document/SharedDocumentForm.tsx` | ~400+ | Shared rendering composition layer |
| `src/components/useInvoiceColumns.tsx` | ~200 | Column state management hook |
| `src/hooks/useLayoutMode.ts` | ~15 | Layout mode detection |
| `src/hooks/useSettings.js` | ~100 | Cached settings with Supabase subscription |
| `src/domain/invoice/types.ts` | ~200 | Domain type definitions |
| `src/domain/invoice/calculations.ts` | ~50 | Calculation bridge functions |
| `src/domain/invoice/factories.ts` | ~80 | Factory functions |
| `src/domain/invoice/normalize.ts` | ~150 | Normalization functions |
| `src/domain/invoice/columns.ts` | ~200 | Column definitions and helpers |
| `src/domain/invoice/importAdapter.ts` | ~30 | Import adapter |
| `src/domain/invoice/additionalFields.ts` | ~50 | Additional field helpers |
| `src/domain/invoice/financialState.ts` | ~30 | Financial state calculator |
| `src/domain/invoice/index.ts` | ~20 | Barrel re-export |
| `src/lib/Calculations.ts` | ~720 | Single source of truth for financial math |
| `src/lib/withUniqueRetry.ts` | ~30 | Supabase insert retry |
| `src/domain/financial/resolveFinancialColumns.ts` | ~100 | Column resolution (frozen) |

---

## 13. Verification

- [x] All files read successfully
- [x] Section-by-section comparison completed
- [x] Domain layer architecture documented
- [x] Target architecture defined
- [x] Extraction candidates identified with line estimates
- [x] Risk assessment completed
- [x] Implementation recommendations provided
- [ ] `bun run typecheck` — pending (no code changes made)
- [ ] `bun run lint` — pending (no code changes made)

---

**Report generated by opencode**
**Audit status: READ-ONLY — no production code was modified**
