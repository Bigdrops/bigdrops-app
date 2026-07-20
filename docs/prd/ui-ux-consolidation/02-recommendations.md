# Recommendations — UI/UX Consolidation PRD

Sorted by **impact** (high → low), then **effort** (small → large).

---

## R1: Unify New/Edit Pages into Single Form Page Components

**Effort:** Large | **Impact:** Very High | **Priority:** P0

**Problem:** Each document module has duplicate New/Edit page pairs (~800 lines each) with identical business logic.

**Recommendation:** Create a single `{Type}FormPage.tsx` per module that handles both create and edit modes via a `mode` prop or URL param check. Extract the duplicated orchestration logic into a `use{Type}Form` hook.

**Pattern:**
```
pages/
├── InvoiceFormPage.tsx    ← replaces NewInvoice.tsx + EditInvoice.tsx
├── WaybillFormPage.tsx    ← replaces NewWaybill.tsx + EditWaybill.tsx
├── QuotationFormPage.tsx  ← replaces NewQuotation.tsx + EditQuotation.tsx
└── ...
```

**Implementation steps:**
1. Create `useInvoiceForm` hook extracting: save handlers, item CRUD, group management, validation, navigation
2. Create `InvoiceFormPage.tsx` that uses the hook + `SharedDocumentForm`
3. Update routes to point to the unified page
4. Delete `NewInvoice.tsx` and `EditInvoice.tsx`
5. Repeat for Waybill, Quotation, CSR, BOQ, RFQ

---

## R2: Consolidate CSS Module Pattern Files

**Effort:** Medium | **Impact:** Medium | **Priority:** P1

**Problem:** 6 identical CSS Module files per pattern across document types.

**Recommendation:** Create shared CSS Modules in `document-view/shared/` and have each module re-export or import from there.

**Pattern:**
```
document-view/
├── shared/
│   ├── viewPageLayout.module.css
│   ├── summaryStrip.module.css
│   ├── heroMeta.module.css
│   └── documentPreview.module.css
├── invoice/       ← imports or re-exports shared modules
├── quotation/     ← imports or re-exports shared modules
└── ...
```

**Alternative:** Use Tailwind utility classes instead of CSS Modules for these patterns, which would eliminate the files entirely.

---

## R3: Audit & Prune Unused Design Tokens

**Effort:** Small | **Impact:** Medium | **Priority:** P1

**Problem:** ~30% of `bd-*` tokens in `formTheme.css` are unused.

**Recommendation:** 
1. Run a grep for each `--bd-*` variable across all source files
2. Remove unreferenced tokens
3. Add JSDoc comments on remaining tokens explaining their usage

---

## R4: Remove App.css

**Effort:** Trivial | **Impact:** Low | **Priority:** P2

**Recommendation:** Delete `src/App.css` and remove its import from the app entry point.

---

## R5: Resolve Sidebar Ambiguity

**Effort:** Medium | **Impact:** Medium | **Priority:** P1

**Recommendation:** Choose one path:
- **Option A (Recommended):** Refactor `Layout.tsx` to use `ui/sidebar.tsx` primitive, then remove `DesktopSidebar.tsx` and `MobileSidebar.tsx`
- **Option B:** Delete `ui/sidebar.tsx` if it's truly unused and will never be adopted

Option A is preferred as it aligns with the shadcn pattern the project already follows.

---

## R6: Create Module-Specific Column Hooks

**Effort:** Small | **Impact:** Low | **Priority:** P2

**Recommendation:** Create `useWaybillColumns`, `useQuotationColumns`, `useCSRColumns` hooks following the `useInvoiceColumns` pattern. This ensures consistent column management across all document types.

---

## R7: Extract Mobile Form Primitives from Invoice Module

**Effort:** Small | **Impact:** Low | **Priority:** P2

**Recommendation:** Move `mobileFormPrimitives.tsx` and `formTheme.css` from `src/components/invoice/mobile/` to a shared location like `src/components/form/` or `src/styles/`, since they are consumed by `SharedDocumentForm` which is cross-module.

---

## R8: Standardize Portal Usage for Overlays

**Effort:** Small | **Impact:** Low | **Priority:** P3

**Recommendation:** Replace `document.body.appendChild` in view overlay components with React's `createPortal`.

---

## R9: Audit SortableLineItem — Make Truly Shared or Document-Specific

**Effort:** Small | **Impact:** Low | **Priority:** P3

**Recommendation:** Verify whether non-invoice document types use monetary columns in SortableLineItem. If not, either:
- Generalize SortableLineItem to support all column types, or
- Move it to the invoice module and create a shared `SortableLineItemBase` for non-monetary types
