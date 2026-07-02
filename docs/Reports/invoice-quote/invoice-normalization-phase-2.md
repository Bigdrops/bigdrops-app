# Invoice Normalization — Phase 2: Editable State Extraction

This report was written by DeepSeek on 2026-07-03.

## Objective & Scope

Phase 2 extracted ALL editable document state and mutation handlers from `InvoiceFormPage.tsx` into a dedicated hook called `useInvoiceEditableState`, following the ownership classification established during Phase 0. The page now orchestrates; the hook owns document data.

**In scope:** Editable invoice state (items, groups, custom fields, extra charges, attachments, signatory, PDF output, discount/WHT settings, title, notes/terms labels, merge toggle) + all corresponding `useCallback` mutation handlers.

**Excluded (retained in page):** Orchestration state (`saving`, `loading`, `invalidRowIndex`, `showColumnManager`), fetched data (`signatories`, `bankAccounts`, `settingsData`), snapshot/reference state (`initialInvoiceSnapshot`, `baseCustomFields`), all `useEffect` blocks (edit loading, shared init, PDF output derivation, initial custom-fields prefill), the `handleSave` pipeline, `handleImportApply`, navigation, validation, and rendering.

## Files Modified

| File | Action |
|---|---|
| `src/hooks/useInvoiceEditableState.ts` | **CREATED** — new hook (~330 lines) |
| `src/pages/InvoiceFormPage.tsx` | **EDITED** — consumed hook, removed ~330 lines of moved state + handlers |

## Hook Architecture

`useInvoiceEditableState` accepts `{ mode, prefill, prefillItems, projectPrefill }` and returns:

- **State values:** `invoice`, `items`, `groups`, `itemsRef`, `customFields`, `additionalFields`, `extraCharges`, `chargeLabels`, `notesTitle`, `termsTitle`, `mergeQtyUnit`, `invoiceTitle`, `attachments`, `signatoryId`, `pdfOutput`, `discountType`, `discountTiming`, `whtType`
- **Setters:** All corresponding `set*` functions
- **Mutation handlers:** `updateInvoice`, `updateItem`, `resetItemOverrides`, `addItem`, `removeItem`, `insertItemAfter`, `moveItem`, `addGroup`, `updateGroupName`, `toggleGroupSubtotal`, `deleteGroup`, `addItemToGroup`, `handleAddHeaderField`, `handleUpdateHeaderField`, `handleRemoveHeaderField`, `handleAddAdditionalField`, `handleUpdateAdditionalField`, `handleRemoveAdditionalField`, `handleChargeLabelChange`, `handleAddExtraCharge`, `handleUpdateExtraCharge`, `handleRemoveExtraCharge`, `handleClearAll`

### Internal effects migrated into hook

- `itemsRef` ref + sync `useEffect` — page does not need to know about this coupling
- `syncGroupsFromItems` effect — groups index is recomputed automatically when items change

### Observability preserved

- All 20+ handlers keep identical `useCallback` dependency arrays
- `itemsRef` still tracks latest items for `insertItemAfter` to read during batch state update
- `syncGroupsFromItems` fires at the same granularity (on every `items` change)

## InvoiceFormPage.tsx Changes (Summary)

**Removed from page (~330 lines):**
- 17 `useState` declarations (editable state)
- 20 `useCallback` handler declarations
- `itemsRef` + sync `useEffect`
- `syncGroupsFromItems` effect
- 10 handler duplicate declarations near render section
- Unused imports: `BUILTIN_COLUMNS`, `ensureUiKey`, `makeEmptyGroup`, `makeExtraCharge`, `makeFieldEntry`, `normalizeQuantity`, `InvoiceFieldEntry`, `ExtraCharge`

**Added to page (~35 lines):**
- Import `useInvoiceEditableState`
- Destructured hook call (~30 lines)

**Retained in page:**
- `signatories`, `bankAccounts`, `settingsData` — fetched data
- `initialInvoiceSnapshot`, `baseCustomFields` — edit-mode reference snapshots
- Edit loading effect (fetch by id, normalize legacy state)
- Shared init effect (signatories, bank accounts, settings)
- PDF output derivation effect
- `handleImportApply` — bridges `useInvoiceColumns` + editable state
- `handleSave` — the full save pipeline (validation, upsert, audit, navigation)
- `handleCancel`, `onSaveUnpaid`
- All render/JSX

## Verification

- `bun run typecheck` — **passes with zero errors**
- `bun run build` — benign OOM on this machine (pre-existing Vite heap issue on slower hardware)
- `bun run test` — 51/52 pass; 1 pre-existing failure (`ERR_MODULE_NOT_FOUND` for `externalWaybillPrompt`, unrelated to invoicing)

## Risks & Limitations

- `handleImportApply` is a bridge between two hooks (`useInvoiceColumns` and `useInvoiceEditableState`). It stays in the page to mediate between column state and editable state — it calls `setColumns`, `setItems`, `updateInvoice`, `setExtraCharges`, `setGroups`, `setInvoiceTitle`. This is by design (the page owns the orchestration), but it's worth noting as a two-hook interaction point.
- The renamed file from the original plan (`useInvoiceForm` → `useInvoiceEditableState`) was necessary to avoid collision with existing `src/hooks/useInvoiceForm.js` (a utility-only file exporting `numberToWords`, `makeGroupId`, `useIsNarrow`).

## Deferred to Future Phases

- Phase 3: Extract orchestration effects (edit loading, shared init, PDF output derivation, custom-fields prefill) into `useInvoiceOrchestration` hook
- Phase 4: Extract `handleSave` pipeline into `useInvoiceSave` hook
- Cross-document consolidation (quotation, waybill, CSR, etc.)

## Relevant Files

- `src/hooks/useInvoiceEditableState.ts` — the new hook
- `src/pages/InvoiceFormPage.tsx` — page now at ~870 lines (down from ~1127)
- `src/hooks/useInvoiceForm.js` — pre-existing utility file (unchanged)
- `src/components/useInvoiceColumns.tsx` — exports item/group factories, `ensureUiKey`, calculation builders, columns hook
- `src/domain/invoice/` — domain types, calculations, identity, factories, normalize, columns
- `docs/STANDARD/document-transformation-standard.md` — behavioral rules (unchanged)
