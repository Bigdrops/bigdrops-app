# Target Architecture — UI/UX Consolidation PRD

_Aspirational architecture after all consolidations are applied._

---

## Page Layer (After R1)

```
src/pages/
├── InvoiceFormPage.tsx        ← unified New/Edit
├── InvoiceViewPage.tsx        ← already unified
├── Invoices.tsx               ← list (unchanged)
├── WaybillFormPage.tsx        ← unified New/Edit
├── WaybillViewPage.tsx        ← already unified
├── Waybills.tsx               ← list (unchanged)
├── QuotationFormPage.tsx      ← unified New/Edit
├── QuotationViewPage.tsx      ← already unified
├── Quotations.tsx             ← list (unchanged)
├── CSRFormPage.tsx            ← unified New/Edit
├── CSRViewPage.tsx            ← already unified
├── CSRs.tsx                   ← list (unchanged)
├── BOQFormPage.tsx            ← unified New/Edit
├── BOQViewPage.tsx            ← already unified
├── BOQs.tsx                   ← list (unchanged)
├── RFQFormPage.tsx            ← unified New/Edit
├── RFQViewPage.tsx            ← already unified
└── RFQs.tsx                   ← list (unchanged)
```

**Predicted line-count reduction per module: ~400-500 lines** (from ~1700 to ~1200 for each New+Edit pair).

---

## Styling Architecture (After R2 + R3 + R4)

```
src/
├── index.css                   ← single global entry (tailwind + shadcn tokens)
├── styles/
│   └── form-theme.css          ← moved from invoice/mobile/ (bd-* tokens, pruned)
├── components/
│   └── document-view/
│       └── shared/
│           ├── viewPageLayout.module.css    ← single source of layout rules
│           ├── summaryStrip.module.css      ← single source of summary rules
│           ├── heroMeta.module.css           ← single source of meta rules
│           └── documentPreview.module.css    ← single source of preview rules
```

No more `App.css`. No more 6× identical `{Type}ViewPage.module.css` files.

---

## Layout Architecture (After R5)

```
Layout.tsx (orchestrator)
├── Sidebar (ui/sidebar.tsx)   ← using the shadcn primitive
├── MobileBottomNav
├── MobilePageHeader
└── main → <Outlet />
```

DesktopSidebar.tsx, MobileSidebar.tsx, MobileMoreSheet.tsx, MobileSalesSheet.tsx either consolidated into the shadcn sidebar or kept with clear boundaries.

---

## Form Pattern (After R1 + R7)

```
{Type}FormPage.tsx
├── Layout (wrapper)
├── use{Type}Form() hook
│   ├── Save handlers
│   ├── Item/group CRUD
│   ├── Validation
│   └── Navigation
├── SharedDocumentForm
│   ├── FormHeader
│   ├── FormLineItems
│   │   └── SortableLineItem (shared or moved to invoice)
│   ├── FormCommercialTerms
│   ├── FormTotals
│   ├── FormNotesTerms
│   │   └── RichTextEditor
│   └── FormFooter
└── PdfOutputSettings (conditional)
```

---

## Data Flow (After All Consolidations)

```
User action → Route → {Type}FormPage
                         │
                         ├── use{Type}Form() ── orchestrates state + side effects
                         │                        │
                         │                        ├── SharedDocumentForm (controlled)
                         │                        ├── API calls (create/update)
                         │                        └── Navigation (on success)
                         │
                         └── SharedDocumentForm (pure display, props-driven)
                              │
                              └── src/lib/Calculations.ts (single source of truth)
```

The form page owns **orchestration**. `SharedDocumentForm` owns **presentation**. No business logic leaks into the presentation layer.

---

## CSS Module Dependency (After R2)

```
Before:  6× {type}/ViewPage.module.css (independent copies)
After:   1× shared/viewPageLayout.module.css (single source)
         Each {type}/ re-exports or null-imports the shared module
         Module-specific overrides stay in {type}/ if needed
```

---

## Verification Checklist

After implementation:
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes (critical path tests)
- [ ] All 6 document modules can create + edit records
- [ ] Mobile form flows unchanged (scroll, keyboard, sheet behavior)
- [ ] No regressions in dark mode
- [ ] No console errors related to missing CSS variables
