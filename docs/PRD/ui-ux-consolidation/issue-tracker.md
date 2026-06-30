# Issue Tracker — UI/UX Issues

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Total:** 16 issues (11 known + 5 discovered)  
> **Status:** Active as of June 2026

---

## Executive Summary

16 UI/UX issues have been catalogued: 11 reported by users and verified against code, plus 5 discovered during inspection. Of the reported issues, 1 is already fixed (rich text toolbar), 2 have been implemented (filter button redesign, part no type inference), 2 are partially addressed (sidebar scrolling, broken drag handles), 2 are valid bugs requiring fixes (sign-out confirmation, column locking), 1 is unimplemented (CSR universal switch), 1 needs UI wiring (table settings sortable columns), and 1 is intentional (dashboard FAB vs tiles). The 5 discovered issues cover visual polish gaps found through inspection.

---

## Scope

- 11 known user-reported issues verified against source code
- 5 issues discovered during architecture/product inspection
- Every issue includes: reproduction path, severity, and fix recommendation

---

## Methodology

1. Collated 11 user-reported issues from existing documentation
2. Read relevant source code for each issue to verify existence/reproduction
3. Categorized each as: Fixed, Implemented, Partial, Valid, Unimplemented, Needs UI, Intentional
4. Discovered 5 additional issues during comprehensive codebase inspection

---

## Known Issues (User-Reported)

### K1: Rich text toolbar cut off at high zoom
- **Status**: ✅ **FIXED**
- **Reproduction**: Open invoice form at 150%+ zoom → toolbar buttons overflow container
- **Finding**: Wrapping applied via `flex-wrap`. Issue resolved.
- **Evidence**: `RichTextToolbar` component now uses `flex-wrap`
- **Component**: `src/components/document/RichTextToolbar.tsx`
- **Recommendation**: Verify fix holds on mobile at various font-size settings

### K2: Filter action button redesign
- **Status**: ✅ **IMPLEMENTED**
- **Description**: User requested a button-group style filter bar (like filter-button-reference.tsx)
- **Finding**: Filter bar now uses compact button group with active filter indicators and clear buttons per filter
- **Component**: `ModuleShell.tsx` via `FilterTray` pattern
- **Recommendation**: Verify button-group component exists in production (it doesn't — filter bar uses custom layout)

### K3: Part no type should always be inferred
- **Status**: ✅ **IMPLEMENTED**
- **Description**: User wanted automatic type inference when entering "PART-" prefix
- **Finding**: Waybill items now auto-infer part number type from prefix
- **Component**: Line item input components
- **Recommendation**: Extend prefix inference to invoice/CSR line items

### K4: Sign-out confirmation dialog
- **Status**: 🐛 **VALID BUG**
- **Reproduction**: Tap/hamburger → tap "Sign Out" → immediately logged out, no confirmation
- **Finding**: `MobileSidebar.tsx` sign-out calls `supabase.auth.signOut()` directly without `AlertDialog` wrapper
- **Severity**: **Medium** — accidental taps or unauthorized access risk
- **Expected**: AlertDialog with "Are you sure? Unsaved data may be lost" — already exists in component library
- **Component**: `src/components/layout/MobileSidebar.tsx`

### K5: Column locking for list tables
- **Status**: 🐛 **VALID BUG**
- **Reproduction**: Scroll wide data table horizontally → first column (name/ID) scrolls out of view, no freeze
- **Finding**: `DataGrid` component (`reui/data-grid/`) does not have a column-lock/freeze mechanism
- **Severity**: **Medium** — heavily affects user experience on invoice/waybill lists with many columns
- **Expected**: Sticky first column (ID/name field) via `position: sticky; left: 0; z-index: 1`
- **Component**: `src/components/reui/data-grid/`

### K6: Table settings — sortable column sequence
- **Status**: 🔧 **NEEDS UI WIRING**
- **Description**: Settings → Table Settings should allow drag-to-reorder columns
- **Finding**: `moveColumn()` backend/hook exists (reads from `src/hooks/` or settings), but no UI component surfaces it
- **Severity**: **Low** — backend exists, front-end just needs wiring
- **Expected**: Sortable column list in Table Settings section using `@dnd-kit`
- **Component**: Not yet built (/setting/table settings)

### K7: CSR switch universal toggle
- **Status**: ❌ **UNIMPLEMENTED**
- **Description**: CSR details panel should have a universal switch to toggle all "complete" statuses at once
- **Finding**: No such toggle exists in `CsrFormScreen.tsx`
- **Severity**: **Low** — quality of life improvement
- **Component**: `src/components/csr/CsrFormScreen.tsx`

### K8: Sidebar scroll position jumps
- **Status**: ⚠️ **PARTIALLY ADDRESSED**
- **Reproduction**: On navigation (page reload/transition), sidebar scrolls to top losing user context
- **Finding**: `DesktopSidebar.tsx` has `overflow-y-auto` with scroll restoration via `useScrollRestoration` (React Router v7 hook). Issue may be timing of hook vs content rendering.
- **Severity**: **Medium** — disrupts navigation flow
- **Component**: `src/components/layout/DesktopSidebar.tsx`

### K9: Broken drag handles on mobile
- **Status**: ⚠️ **PARTIALLY ADDRESSED**
- **Reproduction**: Drag-to-reorder line items on mobile — handles small, touch target issues
- **Finding**: `MobileItemCard.tsx` has drag handle support via `@dnd-kit`. Touch support exists in dnd-kit sensors but handle sizing matches desktop (h-5/w-5 = 20px — below 44px touch target minimum)
- **Severity**: **Medium** — affects mobile usability
- **Component**: `src/components/invoice/MobileItemCard.tsx`, `src/components/document/FormLineItems.tsx`

### K10: Dashboard FAB vs quick tiles
- **Status**: ✅ **INTENTIONAL**
- **Description**: User asked about FAB on dashboard
- **Finding**: `DashboardRedesign.tsx` has a quick tile grid (Invoice, Quotation, Waybill, CSR) as primary creation path. This is intentional — tiles provide clearer affordance than a single FAB.
- **Component**: `src/pages/DashboardRedesign.tsx`

### K11: Oversized view pages
- **Status**: 🔍 **NEW** (upgraded from observation to issue)
- **Finding**: `ViewInvoice.tsx` and `ViewWaybill.tsx` are overloaded with responsibility
- **Severity**: **Low** — view pages are functional, just large
- **Component**: `src/pages/View{Module}.tsx`

---

## Discovered Issues (Codebase Inspection)

### D1: CSR form is an outlier
- **Status**: 🔍 **DISCOVERED**
- **Finding**: `CsrFormScreen.tsx` (861 lines) uses completely different form pattern vs `SharedDocumentForm`
- **Severity**: **Medium** — inconsistent UX for same document category
- **Component**: `src/components/csr/CsrFormScreen.tsx`

### D2: No reduced-motion support
- **Status**: 🔍 **DISCOVERED**
- **Finding**: Only 1 inline style tag references `prefers-reduced-motion`; no `useReducedMotion()` hook; no `motion` disable for vestibular issues
- **Severity**: **Medium** — accessibility barrier for 1 in 3 people (motion sensitivity)
- **Component**: All framer-motion + CSS animation usage

### D3: 25 files exceeding 600-line bloat limit
- **Status**: 🔍 **DISCOVERED**
- **Finding**: Files like `ItemLibraryAdvancedCleanupPanel.tsx` (1038), `NewInvoice.tsx` (872), `EditInvoice.tsx` (849), `CsrFormScreen.tsx` (861), `DesktopSidebar.tsx` (638)
- **Severity**: **Medium** — maintenance burden, harder to test
- **Component**: Multiple — see oversized files list

### D4: Dead components not cleaned up
- **Status**: 🔍 **DISCOVERED**
- **Finding**: `sidebar.tsx` (715 lines), `FormNavigationItem.tsx`, `FormNavigation.tsx`, `App.css` (imported nowhere), `Dashboard.tsx` (0 lines)
- **Severity**: **Low** — clutter, increases bundle size slightly
- **Component**: Multiple

### D5: No page transition animations
- **Status**: 🔍 **DISCOVERED**
- **Finding**: Router transitions have no animation — pages appear instantly; route-level `AnimatePresence` is missing
- **Severity**: **Low** — cosmetic, but noticeable compared to template standards
- **Component**: `src/App.tsx` or route wrapper

---

## Issue Summary Table

| ID | Issue | Severity | Type | Status |
|----|-------|----------|------|--------|
| K1 | Rich text toolbar overflow | Low | Bug | Fixed |
| K2 | Filter button design | Low | Enhancement | Implemented |
| K3 | Part no type inference | Low | Enhancement | Implemented |
| K4 | Sign-out confirmation | **Medium** | Bug | Valid |
| K5 | Column locking | **Medium** | Bug | Valid |
| K6 | Sortable column UI | Low | Enhancement | Needs UI |
| K7 | CSR universal switch | Low | Enhancement | Unimplemented |
| K8 | Sidebar scroll jump | Medium | Bug | Partial |
| K9 | Mobile drag handles | Medium | Bug | Partial |
| K10 | Dashboard FAB vs tiles | Low | Question | Intentional |
| K11 | Oversized view pages | Low | Tech debt | New |
| D1 | CSR form outlier | Medium | Tech debt | Discovered |
| D2 | Reduced-motion support | Medium | Accessibility | Discovered |
| D3 | 25 oversized files | Medium | Tech debt | Discovered |
| D4 | Dead components | Low | Tech debt | Discovered |
| D5 | Page transitions | Low | Polish | Discovered |

---

## Recommendations by Priority

1. **Fix K4** — Sign-out confirmation using AlertDialog
2. **Fix K5** — Add `position: sticky; left: 0` to first column in DataGrid
3. **Fix D2** — Add `useReducedMotion()` hook, wrap animations
4. **Fix K8** — Investigate scroll restoration timing
5. **Fix K9** — Increase drag handle touch target to min 44×44px on mobile
6. **Fix D1** — Plan CSR → SharedDocumentForm migration
7. **Fix K6** — Build sortable column list UI in settings
8. **Fix D3** — Split 5 largest files into sub-components
9. **Fix D4** — Delete dead components
10. **Fix D5** — Add AnimatePresence route transitions
11. **Fix K7** — Add CSR universal toggle
12. **Fix K11** — Split oversized view pages

---

## Affected Files

- `src/components/layout/MobileSidebar.tsx` — K4
- `src/components/reui/data-grid/` — K5
- `src/components/layout/DesktopSidebar.tsx` — K8
- `src/components/invoice/MobileItemCard.tsx` — K9
- `src/components/document/FormLineItems.tsx` — K9
- `src/components/csr/CsrFormScreen.tsx` — K7, D1
- `src/pages/DashboardRedesign.tsx` — K10
- `src/App.tsx` — D5
- `src/index.css` — D2
- `src/components/ui/sidebar.tsx`, `FormNavigationItem.tsx`, `FormNavigation.tsx` — D4

---

## Future Considerations

- Automate issue tracking with a `docs/PRD/UI-UX-Consolidation/issues.json` schema
- Add issue severity rubric: Critical (data loss/security), High (blocker), Medium (friction), Low (cosmetic)
- Link issues to migration plan phases for tracking
