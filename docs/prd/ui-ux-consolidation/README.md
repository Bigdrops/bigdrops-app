# BIGDROPS — UI/UX Consolidation PRD

> **Status:** Active — Divine Blood Design Language Adoption  
> **Stack:** React 19 · TypeScript 5.9 · Tailwind CSS 3.4 · Vite 7 · Supabase · Bun  
> **Date:** August 2026  
> **Design Source of Truth:** `docs/TEMPLATES/Designsdotmds/Divine-blood.md`  
> **Scope:** Replace all theme systems with Divine Blood. Reduce to 2 modes (Light + Dark).

---

## Executive Summary

BIGDROPS serves Nigerian SMEs with **invoices**, **quotations**, **CSRs**, **waybills**, **BOQs**, **RFQs**, **projects**, **clients**, **compliance**, and **reports** — 10+ document modules across **48 pages** and **~690 source files**. The application has grown rapidly, resulting in **4 distinct form architectures**, **3 separate column management systems**, **inconsistent mobile support**, and **minimal motion/transition design**. This PRD documents the full inspection and provides a roadmap toward a unified, polished UX.

---

## Document Inventory

| # | Document | Focus |
|---|----------|-------|
| 1 | `README.md` | This document |
| 2 | `architecture-inspection.md` | Component architecture, data flow, dead code, bloat |
| 3 | `product-inspection.md` | UX feel assessment — navigation, forms, lists, views |
| 4 | `component-inventory.md` | Full component catalog — 30+ UI components, 49 pages |
| 5 | `issue-tracker.md` | All discovered issues — 11 known + new findings |
| 6 | `design-system-roadmap.md` | Design token system, CSS architecture, component unification |
| 7 | `migration-plan.md` | Phased migration from current state to target |
| 8 | `priority-matrix.md` | Prioritized action items by impact and effort |
| 9 | `assets/screenshots.md` | Visual reference screenshots (placeholder) |

---

## Key Findings Summary

### Design System (Updated August 2026)
- **Divine Blood** is now the sole design language (Decision D-017)
- All `--bd-*` tokens to be replaced with Divine Blood `--db-*` tokens
- shadcn HSL tokens to be replaced with Divine Blood hex tokens
- Exactly 2 visual modes: Light (white+gold+crimson) and Dark (black+crimson+gold)
- All other themes deleted (Decision D-018)

### Architecture
- **4 form architectures**: `SharedDocumentForm` (invoice/quotation), custom inline (CSR), tabbed editor (BOQ/RFQ), overlay (waybill)
- **3 column systems**: `ColumnConfig` (invoice), `TableDocumentColumn` (BOQ/RFQ), waybill-specific
- **25 oversized files** (600+ lines) — chief among them `NewInvoice.tsx` (872), `EditInvoice.tsx` (849), `ItemLibraryAdvancedCleanupPanel.tsx` (1038)
- **Dead code**: `Dashboard.tsx` (0 lines), `App.css` (not imported), `ui/sidebar.tsx` (715 lines, unused), `FormNavigationItem.tsx` (not imported)
- **Mixed JS/TSX**: `CSRPreviewContent.js` is the only plain JS file

### UX Feel
- **Navigation**: Desktop sidebar lacks sign-out button; mobile sidebar lacks sign-out confirmation; no sticky business context
- **Forms**: 4 different patterns confuse users moving between modules; template picker duplication (CSR vs universal)
- **Lists**: Inconsistent filter patterns; column lock/freeze absent; drag handles on grouped items broken
- **Views**: No consistent document-relationship UI; PDF preview patterns vary by module
- **Dashboard**: Uses quick-tile grid (not FAB) — intentional but can be slow for frequent actions

### Motion & Accessibility
- **Framer Motion**: Only 3 production components use it (sheet, circuit-board, OpenInAIDropdown)
- **CSS animations**: Present in `index.css` (sheet reveal, halos, progress bars, ambient waves) and `formTheme.css` (toast spin, invalid pulse)
- **Reduced motion**: Only 1 location (`PendingApproval.tsx`) — no global `prefers-reduced-motion`
- **ARIA**: Radix primitives handle correctly; no `sr-only` class used; no `aria-live` regions; no skip navigation
- **Loading states**: Skeleton patterns exist but inconsistent — some modules use spinners, others use pulse

### Responsive
- Desktop breakpoint at `md:` (768px) — mobile-first approach
- Dual sidebar: desktop `DesktopSidebar` (persistent, overflow-y-auto) + mobile `MobileSidebar` (drawer)
- Bottom tab bar on mobile (`MobileBottomNav`)
- Mobile form variants exist only for invoice and waybill

---

## Reference Standards

Template references in `docs/templates/React-temps/` define target interaction patterns:

| Template | Pattern | Gap from current |
|----------|---------|------------------|
| `sidebar.tsx` | Animated sidebar with hover highlight, resize handle, spring physics | Current sidebar is static CSS-only |
| `richtextform.tsx` | `InputGroup`-based rich text toolbar | `@/components/ui/input-group` not used anywhere |
| `filter-button-reference.tsx` | `ButtonGroup`-composed filter/sort actions | `@/components/ui/button-group` not used anywhere |
| `multi-filter.tsx` | Async filter system with `Filters` + `DataGrid` | Current `reui/filters` exists but not used consistently |
| `sortable.tsx` | `reui/sortable` wrapper around dnd-kit | Current codebase uses raw `@dnd-kit/sortable` |
| `floating-disclosure-base.tsx` | Animated FAB with staggered items | No equivalent exists |
| `draw-signature-base.tsx` | Canvas signature pad with MotionConfig | Current signature uses `signature_pad` lib |
| `dropdown-disclosure-base.tsx` | Animated model selector with shared layout animations | No equivalent exists |
| `quick-paste-base.tsx` | Inline paste UI with LayoutGroup transitions | No equivalent exists |

---

## Known User-Reported Issues

Tracked in detail in `issue-tracker.md`. Summary:

| # | Issue | Status |
|---|-------|--------|
| 1 | Rich text toolbar | Already fixed |
| 2 | Sidebar scrolling/interaction | Partially addressed |
| 3 | CSR template picker → universal | Valid — CSR has its own picker |
| 4 | CSR switch → universal | Not implemented |
| 5 | Filter button redesign | Already implemented |
| 6 | Sign-out confirmation | Valid bug — missing |
| 7 | Table settings sortable columns | `moveColumn` exists, UI may be missing |
| 8 | Custom column locking | Not implemented |
| 9 | Broken drag handles | Implemented but limited |
| 10 | "Part No" type inference | Implemented with naming inconsistency |
| 11 | Floating dashboard action redesign | Dashboard uses tiles (intentional) |

---

## Methodology

This inspection was performed through:
1. **Automated audit** (`bun run audit:load`) — 690 files scanned
2. **5 parallel task agents** inspecting pages, components, CSS, navigation, and dashboards
3. **Manual codebase search** for motion, accessibility, and responsive patterns
4. **Template reference comparison** against 9 interaction pattern templates
5. **Known issue verification** — all 11 user-reported issues investigated in code

All findings are based on existing source code — no speculative or invented modules.
