# More Actions — Architecture Audit Report

This report was written by Buffy on 2026-09-01 via Freebuff.

---

## 1. Executive Summary

The More Actions control across BIGDROPS document View pages performs the **same fundamental function**: expose additional actions for the currently viewed document via a bottom-sheet (mobile) or side-sheet (desktop).

**Key finding:** Two implementation patterns exist side-by-side:

| Pattern | Used By | Approach |
|---------|---------|----------|
| **A: Data-driven** (`DocumentMoreSheet`) | Invoice, Quotation | Actions defined as `sections[]` config arrays |
| **B: Inline JSX** (manual `Action` component) | Waybill, CSR, BOQ, RFQ | Each file re-defines `SectionLabel`, `Divider`, `Action` inline |

Pattern B is **unnecessarily duplicated** — 4 files copy the same ~80-line `Action` component with identical styling. The underlying function is identical; only the action lists differ.

**Feasibility of ONE shared component: YES.** The data-driven `DocumentMoreSheet` already exists and can serve all 6 document types. The 4 inline-JSX files should be migrated to use it.

---

## 2. View-Page Inventory

| Document | View Page | More Actions Trigger | Action UI Component | Uses DocumentMoreSheet? | Actions Count | Responsive Behavior |
|----------|-----------|---------------------|---------------------|------------------------|---------------|---------------------|
| Invoice | `src/pages/ViewInvoice.tsx` | `onMore={() => ui.openSheet("more-actions")}` | `InvoiceMoreSheet` → `DocumentMoreSheet` | ✅ Yes | 11 actions | Bottom (mobile) / Right (desktop) via `DocumentSheet` |
| Quotation | `src/pages/ViewQuotation.tsx` | `onMore={() => ui.openSheet(SHEET_MORE)}` | `QuotationMoreSheet` → `DocumentMoreSheet` | ✅ Yes | 7 actions | Bottom (mobile) / Right (desktop) via `DocumentSheet` |
| Waybill | `src/pages/ViewWaybill.tsx` | `onMore={() => ui.openSheet(SHEET_MORE)}` | `WaybillMoreSheet` → `DocumentSheet` (inline JSX) | ❌ No | 8 actions | Bottom (mobile) / Right (desktop) via `DocumentSheet` |
| CSR | `src/pages/ViewCSR.tsx` | `onMore={() => ui.openSheet(SHEET_MORE)}` | `CsrMoreSheet` → `DocumentSheet` (inline JSX) | ❌ No | 8 actions | Bottom (mobile) / Right (desktop) via `DocumentSheet` |
| BOQ | `src/pages/ViewBoq.tsx` | `onMore={() => ui.openSheet(SHEET_MORE)}` | `BoqMoreSheet` → `DocumentSheet` (inline JSX) | ❌ No | 9 actions | Bottom (mobile) / Right (desktop) via `DocumentSheet` |
| RFQ | `src/pages/ViewRfq.tsx` | `onMore={() => ui.openSheet(SHEET_MORE)}` | `RfqMoreSheet` → `DocumentSheet` (inline JSX) | ❌ No | 8 actions | Bottom (mobile) / Right (desktop) via `DocumentSheet` |
| Letter | `src/pages/ViewLetter.tsx` | None | None | N/A | 0 | N/A |
| Receipt | `src/pages/ViewReceipt.tsx` | None | None | N/A | 0 | N/A |

---

## 3. Shared Components Already Existing

| Component | Path | Purpose |
|-----------|------|---------|
| `DocumentSheet` | `src/components/document-view/shared/DocumentSheet.tsx` | Base sheet — responsive bottom/right, close button, scrollable content |
| `DocumentMoreSheet` | `src/components/document-view/shared/DocumentMoreSheet.tsx` | Data-driven action sheet — accepts `sections[]` config, renders actions |
| `DocumentConfirmDialog` | `src/components/document-view/shared/DocumentConfirmDialog.tsx` | Shared confirmation dialog for destructive actions |
| `DocumentTopNav` | `src/components/document-view/shared/DocumentTopNav.tsx` | Shared top nav with `onMore` trigger (MoreHorizontal icon) |
| `DocumentModal` | `src/components/document-view/shared/DocumentModal.tsx` | Base modal for dialogs |

---

## 4. Duplication Analysis

### What Is Genuinely Document-Specific

Each document type has unique **lifecycle actions**:

| Document | Unique Lifecycle Actions |
|----------|------------------------|
| Invoice | Revert to Quotation, Generate Waybill, Record Payment, Advance Invoice, Qty+Unit merge toggle |
| Quotation | Convert to Invoice |
| Waybill | Mark as Dispatched, Confirm Delivery, Mark as Returned |
| CSR | Mark as In Progress, Mark as Completed, Reopen Record |
| BOQ | Mark as Issued/Shared, Create Revision, Generate Quotation |
| RFQ | Mark as Closed/Cancelled, Generate Quotation |

### What Is Unnecessarily Duplicated

**4 files** (`WaybillMoreSheet`, `CsrMoreSheet`, `BoqMoreSheet`, `RfqMoreSheet`) each independently define:

1. **`SectionLabel` component** — identical inline styled div (10px, 700 weight, uppercase, letter-spacing)
2. **`Divider` component** — identical inline styled hr
3. **`Action` component** — identical inline styled button (38×38 icon container, 14px gap, label + description layout)

These three inline components are **character-for-character identical** across all 4 files. The only differences are the action items passed to them.

### What Is Already Shared

- **Common actions** appear in every document: Link to Project, Duplicate, Copy Number, Export, Archive, Delete
- **Section structure** is consistent: Lifecycle → Links → Document → Danger
- **Confirmation dialogs** use `DocumentConfirmDialog` consistently
- **Sheet infrastructure** uses `DocumentSheet` consistently
- **Trigger** uses `DocumentTopNav.onMore` consistently

---

## 5. Shared Component Feasibility

### Answer: **YES**

All 6 View pages can use ONE shared More Actions component.

**The shared component already exists:** `DocumentMoreSheet` at `src/components/document-view/shared/DocumentMoreSheet.tsx`.

It accepts a `sections[]` config:
```typescript
type DocumentMoreSheetSection = {
  title: string
  items: DocumentMoreSheetItem[]
}

type DocumentMoreSheetItem = {
  id: string
  icon: ReactNode
  label: string
  description?: string
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
  closeOnClick?: boolean
  selected?: boolean
  statusLabel?: string
}
```

**What needs to happen:**

1. **Migrate 4 inline-JSX files** (`WaybillMoreSheet`, `CsrMoreSheet`, `BoqMoreSheet`, `RfqMoreSheet`) to use `DocumentMoreSheet` with `sections[]` config — same as `InvoiceMoreSheet` and `QuotationMoreSheet` already do.

2. **Extract shared actions** into a helper:
   ```typescript
   // src/components/document-view/shared/commonActions.ts
   function getCommonActions(handlers: {
     onLinkProject: () => void
     onDuplicate: () => void
     onCopyNumber: () => void
     onExport: () => void
     onArchive: () => void
     onDelete: () => void
     documentLabel: string
   }): DocumentMoreSheetSection
   ```

3. **Each document** provides only its lifecycle-specific section + calls `getCommonActions()`.

---

## 6. Action Configuration Model

Proposed architecture (no implementation yet):

```
Document View Page
  ↓
<SomeMoreSheet
  sections={[
    ...getLifecycleActions(docType),     // document-specific
    ...getCommonActions(handlers),       // shared across all
  ]}
/>
```

**Shared action registry:**

| Action | Label | Appears In |
|--------|-------|-----------|
| Link to Project | "Link to Project" | All 6 |
| Duplicate | "Duplicate" | All 6 |
| Copy Number | "Copy {Type} Number" | All 6 |
| Export | "Export as CSV" / "Export Document" | All 6 |
| Archive | "Archive {Type}" | All 6 |
| Delete | "Delete {Type}" | All 6 (destructive) |

**Document-specific lifecycle actions:**

| Document | Actions |
|----------|---------|
| Invoice | Revert to Quotation, Generate Waybill, Record Payment, Advance Invoice, Qty+Unit merge |
| Quotation | Convert to Invoice |
| Waybill | Mark as Dispatched, Confirm Delivery, Mark as Returned |
| CSR | Mark as In Progress, Mark as Completed, Reopen Record |
| BOQ | Mark as Issued/Shared, Create Revision, Generate Quotation |
| RFQ | Mark as Closed/Cancelled, Generate Quotation |

---

## 7. Android-First UX Audit

### Current Behavior

All More Actions controls use `DocumentSheet`, which renders:
- **Mobile** (`< 768px`): Bottom sheet with `max-h-[var(--bd-overlay-sheet-max-height)]`
- **Desktop** (`≥ 768px`): Right side sheet, `max-w-xl`

### Strengths

- ✅ Bottom sheet on mobile is Android-idiomatic
- ✅ Safe area inset padding (`pb-[calc(1.25rem+env(safe-area-inset-bottom))]`)
- ✅ Close button accessible
- ✅ Scrollable content for long action lists
- ✅ Consistent across all document types

### Problems

| Issue | Severity | Details |
|-------|----------|---------|
| **Touch targets** | Medium | Action buttons have `12px 8px` padding. The icon container is 38×38px. Meets 44dp minimum only if the full button area is considered, but the button itself has no explicit min-height. |
| **Action spacing** | Low | Actions are tightly packed — no explicit gap between action rows beyond padding. |
| **No haptic feedback** | Low | Destructive actions (Archive, Delete) don't trigger haptic feedback on Android. |
| **No action grouping visual separation** | Low | Section dividers are thin 1px lines. On mobile, visual grouping could be stronger. |
| **Foldable/tablet** | Medium | At ≥ 768px, switches to right side sheet. On a foldable in portrait, this may feel disconnected from the bottom-trigger. On tablet, right side sheet is appropriate. |
| **Long action lists** | Low | Invoice has 11 actions across 4 sections. Scrollable but dense. |
| **No confirmation for lifecycle actions** | Medium | Status changes (Mark as Dispatched, Mark as Completed) execute immediately without confirmation. Only Archive and Delete use `DocumentConfirmDialog`. |
| **Danger zone separation** | Good | Archive and Delete are in a separate "Danger Zone" section with visual distinction. |

### Recommended Patterns for Redesign

1. **Keep bottom sheet on phones** — this is correct for Android
2. **Consider action grouping** — use stronger visual sections (background cards per group) instead of thin dividers
3. **Add confirmation for status changes** — lifecycle actions that change document state should confirm before executing
4. **Touch targets** — ensure 48dp minimum per action row
5. **Foldable** — detect posture; in portrait, use bottom sheet; in landscape/unfolded, consider side sheet
6. **Tablet** — right side sheet is appropriate
7. **Desktop** — right side sheet or dropdown is appropriate

---

## 8. Redesign Recommendation

### Phase 1: Consolidate (Immediate)

1. Convert `WaybillMoreSheet`, `CsrMoreSheet`, `BoqMoreSheet`, `RfqMoreSheet` from inline JSX to `DocumentMoreSheet` data-driven config
2. Extract `getCommonActions()` helper
3. Result: all 6 document types use `DocumentMoreSheet`

### Phase 2: Enhance Presentation (Next)

1. Strengthen section grouping with background cards
2. Improve touch targets to 48dp
3. Add haptic feedback for destructive actions on Android
4. Add confirmation for lifecycle status changes
5. Optimize foldable posture detection

### Phase 3: Adaptive Presentation (Future)

1. Detect device type (phone/foldable/tablet/desktop)
2. Adjust sheet presentation accordingly
3. Consider action prioritization (primary actions at top, secondary below fold)

### Relevant Skills for Redesign

| Skill | Use When |
|-------|----------|
| `mobile-app-ui-design` | Designing the Android-first action sheet UX |
| `appllama-app-design-skill` | Native-feeling sheet presentation |
| `apple-design` | Fluid interaction patterns, haptics |
| `emil-design-eng` | UI polish, invisible details |
| `review-animations` | Reviewing sheet enter/exit animations |
| `capacitor-accessibility` | Touch targets, screen reader labels |
| `shadcn` | Sheet component customization |

---

## 9. File/Component Recommendation

### Files Worth Reusing (Do Not Change)

| File | Why |
|------|-----|
| `src/components/document-view/shared/DocumentSheet.tsx` | Base sheet — responsive, safe-area-aware. Keep as-is. |
| `src/components/document-view/shared/DocumentMoreSheet.tsx` | Data-driven action sheet. **This is the target architecture.** Keep and extend if needed. |
| `src/components/document-view/shared/DocumentConfirmDialog.tsx` | Shared confirmation dialog. Keep as-is. |
| `src/components/document-view/shared/DocumentTopNav.tsx` | Shared top nav with `onMore` trigger. Keep as-is. |

### Files That Should Be Consolidated

| File | Current State | Target State |
|------|--------------|-------------|
| `src/components/document-view/waybill/WaybillMoreSheet.tsx` | Inline JSX (80+ lines of duplicated `Action` component) | Convert to `DocumentMoreSheet` with `sections[]` config (~30 lines) |
| `src/components/document-view/csr/CsrMoreSheet.tsx` | Inline JSX (80+ lines of duplicated `Action` component) | Convert to `DocumentMoreSheet` with `sections[]` config (~30 lines) |
| `src/components/document-view/boq/BoqMoreSheet.tsx` | Inline JSX (80+ lines of duplicated `Action` component) | Convert to `DocumentMoreSheet` with `sections[]` config (~30 lines) |
| `src/components/document-view/rfq/RfqMoreSheet.tsx` | Inline JSX (80+ lines of duplicated `Action` component) | Convert to `DocumentMoreSheet` with `sections[]` config (~30 lines) |

### New File to Create

| File | Purpose |
|------|---------|
| `src/components/document-view/shared/commonActions.ts` | Shared action definitions (Link, Duplicate, Copy, Export, Archive, Delete) with handler parameterization |

### Files That Should NOT Be Changed

| File | Why |
|------|-----|
| `src/components/document-view/invoice/InvoiceMoreSheet.tsx` | Already uses `DocumentMoreSheet` correctly |
| `src/components/document-view/quotation/QuotationMoreSheet.tsx` | Already uses `DocumentMoreSheet` correctly |
| `src/components/document-view/shared/DocumentSheet.tsx` | Base infrastructure — working correctly |
| `src/components/document-view/shared/DocumentMoreSheet.tsx` | Target architecture — working correctly |
| `src/pages/ViewLetter.tsx` | No More Actions (letter documents don't need it) |
| `src/pages/ViewReceipt.tsx` | No More Actions (receipt documents don't need it) |

---

## 10. Verification

- **Git status before:** baseline recorded
- **Git status after:** zero application source files modified (audit only)
- **Files read:** 20+ component/page files inspected
- **No code changes made**
- **No build/typecheck/lint run** (audit-only task)
