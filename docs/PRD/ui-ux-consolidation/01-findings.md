# Findings — UI/UX Consolidation PRD

_Reference: Full inspection report at `docs/Task/reports/ui-ux-consolidation-inspection.md`_

---

## Finding 1: New/Edit Page Duplication

**Severity:** High  
**Scope:** Invoice, Waybill, Quotation, CSR, BOQ, RFQ

Each document module has a `New{Type}.tsx` and `Edit{Type}.tsx` pair in `src/pages/`. Inspecting `NewInvoice.tsx` (871 lines) vs `EditInvoice.tsx` (848 lines) reveals identical business logic across ~800 lines with only ~50 lines of difference (loading state, initialization).

**Root cause:** The `SharedDocumentForm` abstracts the form UI but not the page-level orchestration (save handlers, item/group CRUD, validation, navigation). Each page independently implements this orchestration.

**Impact:** Any bug fix or feature addition to the form flow must be applied in N×2 locations. Estimated wasted code: ~4000 lines across all modules.

---

## Finding 2: CSS Module Pattern File Duplication

**Severity:** Medium  
**Scope:** document-view/{invoice, quotation, waybill, csr, boq, rfq}/

Each module under `document-view/` has identical CSS Module files:
- `{Type}ViewPage.module.css`
- `{Type}SummaryStrip.module.css`
- `{Type}HeroMeta.module.css`
- `{Type}DocumentPreview.module.css`

These files contain near-identical layout rules (grids, spacing, typography) differentiated only by module name prefixes.

**Impact:** 6× the maintenance surface for shared styling rules. A layout change to the summary strip requires editing 6 files.

---

## Finding 3: Token Sprawl in formTheme.css

**Severity:** Medium  
**Scope:** `src/components/invoice/mobile/formTheme.css`

The `formTheme.css` defines ~150 CSS variables. A grep of the codebase shows `--bd-shadow-*`, `--bd-spacing-*`, `--bd-opacity-*`, and several `--bd-surface-*` tokens are never referenced in component code.

**Impact:** Cognitive overhead for engineers — unclear which tokens are safe to use vs. legacy. ~30% of tokens may be removable.

---

## Finding 4: App.css — Stale Boilerplate

**Severity:** Low  
**Scope:** `src/App.css`

Contains Vite logo-spin animation, `.App-header`, `.App-link`, `.card` classes. These are remnants from the `create-vite` template and are not referenced by any production component.

---

## Finding 5: Two Sidebar Systems

**Severity:** Medium  
**Scope:** `src/components/ui/sidebar.tsx` vs `src/components/layout/DesktopSidebar.tsx`

A 235-line shadcn `sidebar.tsx` primitive exists in the UI library but is **not used** by the app's actual layout (`Layout.tsx`). The layout components use their own dedicated sidebar implementation.

**Impact:** 1 dead component file confusing the architecture. Risk of future engineer adopting the wrong sidebar.

---

## Finding 6: No Module-Specific Column Hooks

**Severity:** Low  
**Scope:** Invoice column management

`useInvoiceColumns` hook exists but no equivalent hooks exist for Waybill, Quotation, or CSR modules. These modules may have inline column logic or use generic column management.

---

## Finding 7: SortableLineItem Usage Scope

**Severity:** Low  
**Scope:** `FormLineItems.tsx` → `SortableLineItem.tsx`

The `SortableLineItem.tsx` component uses `@dnd-kit` for drag-and-drop reordering. Despite being part of the shared `SharedDocumentForm` pipeline, it appears tailored to invoice columns (unit price, VAT, discount). Other document types may not render these monetary columns.

---

## Finding 8: Overlay Mounting Pattern

**Severity:** Low  
**Scope:** View overlay components (`InvoiceOverlayContent.tsx`, etc.)

View overlays are mounted outside the form scope using `document.body.appendChild` in some cases, which deviates from React-idiomatic portal usage via `createPortal`.

---

## Finding 9: Mobile Form Primitives Location

**Severity:** Low  
**Scope:** `src/components/invoice/mobile/mobileFormPrimitives.tsx`

The form theme CSS and mobile form primitives live under `invoice/` despite being consumed by `SharedDocumentForm` (cross-module). This creates a dependency where all modules transitively depend on the invoice module's files.
