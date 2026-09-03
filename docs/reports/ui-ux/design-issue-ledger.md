# BIGDROPS Design Issue Ledger

> Created by Buffy on 2026-08-28 via Freebuff
> Status: Record only — no issues authorized for fix in this pass

---

## Purpose

This ledger records known design and UX issues in the BIGDROPS application. Each issue is documented for future approval and individually scoped work. No issues in this ledger are authorized for fix during the theme foundation pass.

---

## Issue Register

### DI-001: Column Manager UX

| Field | Value |
|-------|-------|
| **ID** | DI-001 |
| **Area** | Document Forms — Line Item Table Configuration |
| **Problem** | The Column Manager presents a complex sheet with drag-and-drop reordering, visibility toggles, custom column creation, and per-row overrides. On mobile, this density creates a cramped interaction surface. The grip handles and reorder buttons are small (14×14px and 18×14px respectively), below the 44px touch target minimum. |
| **Evidence** | `src/components/ColumnManager.tsx` — `GripHandle` uses 14×14px targets, `ReorderButtons` uses 18×14px targets. Sheet layout at `max-h-[var(--bd-overlay-sheet-max-height)]` with dense row items. |
| **Impact** | Users on mobile devices struggle to reorder columns precisely. The small touch targets lead to missed taps. The dual reorder mechanism (drag + arrow buttons) creates cognitive overhead. |
| **Severity** | Medium — interaction issue |
| **Recommended future phase** | Phase 4 (Forms and Data Surfaces) or dedicated Column Manager redesign pass |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-002: Three Competing Token Systems

| Field | Value |
|-------|-------|
| **ID** | DI-002 |
| **Area** | Design System — Theme Architecture |
| **Problem** | Three token systems coexist: (1) shadcn HSL tokens in `src/index.css`, (2) `--bd-*` bridge tokens in `src/styles/formTheme.css`, and (3) theme presets in `src/lib/themePresets.ts`. Theme changes require touching multiple files. Some components use shadcn tokens directly, others use `--bd-*` tokens, and some use hardcoded `dark:` Tailwind classes. |
| **Evidence** | `src/index.css` defines `--background`, `--foreground`, etc. `src/styles/formTheme.css` defines `--bd-surface`, `--bd-text`, etc. `src/lib/themePresets.ts` applies overrides at runtime. `tailwind.config.js` maps both sets to utilities. |
| **Impact** | Theme changes are fragile. Adding a new theme requires updating three layers. Components break when one layer is changed without the others. |
| **Severity** | High — implementation issue (partially addressed in this pass) |
| **Recommended future phase** | Phase 1 (Foundation / Tokens) — full consolidation |
| **Status** | Recorded — Partially addressed (dark mode bridge tokens added) |

---

### DI-003: CSS Module Duplication (6×)

| Field | Value |
|-------|-------|
| **ID** | DI-003 |
| **Area** | Document Views — Styling |
| **Problem** | CSS Module files are duplicated across 6 document view modules (invoice, quotation, waybill, CSR, BOQ, RFQ). Files like `DocumentHero`, `DocumentPreview`, `DocumentSummaryStrip`, and `DocumentDocumentPreview` exist in near-identical form in each module's directory. |
| **Evidence** | 20+ `.module.css` files under `src/components/document-view/*/` — `BoqDocumentPreview.module.css`, `CsrDocumentPreview.module.css`, `RfqDocumentPreview.module.css`, etc. |
| **Impact** | Visual changes must be replicated across 6 locations. Inconsistencies develop over time. Maintenance burden is 6× what it should be. |
| **Severity** | High — design system issue |
| **Recommended future phase** | Phase 5 (Document Views) |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-004: framer-motion in Production

| Field | Value |
|-------|-------|
| **ID** | DI-004 |
| **Area** | Component Library — Banned Dependency |
| **Problem** | `framer-motion` (and its successor `motion/react`) is used in production components despite being banned by AGENTS.md. Affected files: `src/components/ui/circuit-board.tsx` (imports `motion` from `framer-motion`), `src/components/unlumen-ui/sidebar-toggle-icon.tsx` (imports `motion` from `motion/react`). |
| **Evidence** | `grep -r "framer-motion" src/` returns `circuit-board.tsx`. `sidebar-toggle-icon.tsx` line 3: `import { motion } from "motion/react"`. |
| **Impact** | Bundle size increase. Violates project constraint. The sidebar toggle icon is used on DashboardOverview, MobilePageHeader, PageIntro, and SettingsShell — high-traffic component. |
| **Severity** | High — constraint violation |
| **Recommended future phase** | Phase 1 (Foundation) — replace with CSS transitions |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-005: Duplicate Toast Systems

| Field | Value |
|-------|-------|
| **ID** | DI-005 |
| **Area** | Feedback — Notification System |
| **Problem** | Two toast/notification systems are active: `GoeyToaster` (custom toast component) and `NativeFeedbackRenderer` (Capacitor-native feedback). Both are initialized in `src/App.tsx`. Components use different systems inconsistently. |
| **Evidence** | `src/App.tsx` renders both `GoeyToaster` and `NativeFeedbackRenderer`. `src/lib/native-feedback-renderer.tsx` wraps Capacitor Toast plugin. `src/components/ui/toaster.tsx` wraps GoeyToaster. |
| **Impact** | Users may see duplicate notifications. Inconsistent toast styling. Confusion about which system to use when building new features. |
| **Severity** | Medium — implementation issue |
| **Recommended future phase** | Phase 1 (Foundation) |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-006: Dashboard Audit Trail is Skeleton-Only

| Field | Value |
|-------|-------|
| **ID** | DI-006 |
| **Area** | Dashboard — Audit Trail Section |
| **Problem** | The dashboard's "Audit trail" section renders `AuditTrailSkeleton` — a placeholder with animated bars. No actual audit data is loaded or displayed. The section exists in the UI but shows no real information. |
| **Evidence** | `src/components/dashboard/DashboardOverview.tsx` renders `<AuditTrailSkeleton />`. `src/components/dashboard/AuditTrailSkeleton.tsx` renders placeholder divs. |
| **Impact** | Users see an empty section that looks like it should contain data. Creates expectation of functionality that doesn't exist. |
| **Severity** | Medium — missing functionality |
| **Recommended future phase** | Phase 2 (Dashboard) |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-007: Hardcoded Colors Bypass Theme System

| Field | Value |
|-------|-------|
| **ID** | DI-007 |
| **Area** | Component Library — Styling Consistency |
| **Problem** | Many components use hardcoded Tailwind color classes (e.g., `bg-slate-900`, `text-amber-400`, `border-slate-200`) with `dark:` overrides instead of semantic theme tokens. This means theme changes don't affect these components. |
| **Evidence** | `src/components/ui/card.tsx` uses `border-slate-200 dark:border-slate-800`. `src/components/layout/GlobalSearch.tsx` uses `bg-slate-100 dark:bg-slate-800`. `src/components/list/StatusChip.tsx` uses `bg-blue-50 dark:bg-blue-950/50`. 90+ matches across `src/`. |
| **Impact** | Theme presets cannot override these colors. The BMW and Modern Minimalist themes only affect token-based components. Hardcoded components remain visually inconsistent with the theme. |
| **Severity** | Medium — design system issue |
| **Recommended future phase** | Phase 1 (Foundation) — incremental token migration |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-008: No Pull-to-Refresh on Dashboard

| Field | Value |
|-------|-------|
| **ID** | DI-008 |
| **Area** | Dashboard — Interaction |
| **Problem** | The dashboard loads data once on mount. There is no pull-to-refresh gesture. Users must navigate away and back to refresh data. |
| **Evidence** | `src/components/dashboard/DashboardOverview.tsx` — no gesture handler. `src/hooks/useDashboardData.ts` — data fetched on mount only. |
| **Impact** | Users cannot quickly refresh dashboard data after recording a payment or creating a document. Force-reload is the only option. |
| **Severity** | Medium — interaction issue |
| **Recommended future phase** | Phase 2 (Dashboard) |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-009: Settings is a Flat List on Mobile

| Field | Value |
|-------|-------|
| **ID** | DI-009 |
| **Area** | Settings — Navigation |
| **Problem** | Settings presents 13 sections in a single flat scrollable list. No visual grouping on mobile. Users must scroll through all sections to find the one they need. |
| **Evidence** | `src/pages/Settings.tsx` — renders all sections sequentially. `src/pages/settings/settings-config.ts` — 13 section definitions. |
| **Impact** | Discovery is slow. Mobile users scroll past unrelated sections. No way to jump to a specific section. |
| **Severity** | Low — navigation issue |
| **Recommended future phase** | Phase 3 (Navigation & Shell) |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-010: Search Missing Module Coverage

| Field | Value |
|-------|-------|
| **ID** | DI-010 |
| **Area** | Global Search — Discovery |
| **Problem** | Global search queries 6 tables (clients, projects, invoices, quotations, CSRs, waybills) but misses RFQs, BOQs, Letters, and Receipts. |
| **Evidence** | `src/hooks/useGlobalSearch.ts` — search queries only 6 Supabase tables. |
| **Impact** | Users cannot find RFQs, BOQs, letters, or receipts through global search. Must navigate to the specific module list page. |
| **Severity** | Low — discovery issue |
| **Recommended future phase** | Phase 6 (Reports & Discovery) |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-011: No Skeleton Loading for Document Lists

| Field | Value |
|-------|-------|
| **ID** | DI-011 |
| **Area** | Document Lists — Loading States |
| **Problem** | Document list pages (Invoices, Quotations, etc.) show a generic spinner during data loading instead of content-shaped skeleton placeholders. Only the dashboard has `AuditTrailSkeleton`. |
| **Evidence** | Document list pages use generic loading indicators. No skeleton components exist for list views. |
| **Impact** | Users see a layout shift when data loads. No preview of content structure during loading. Perceived performance is lower. |
| **Severity** | Low — polish issue |
| **Recommended future phase** | Phase 2 (Dashboard) or Phase 5 (Document Views) |
| **Status** | Recorded — Not Authorized for Fix |

---

### DI-012: Ambient Background Animations

| Field | Value |
|-------|-------|
| **ID** | DI-012 |
| **Area** | App Shell — Visual Effects |
| **Problem** | `src/index.css` defines `.app-ambient::before` and `.app-ambient::after` with continuous CSS animations (`app-wave-float-1` at 24s, `app-wave-sweep` at 20s). These use `filter: blur(56px)` and `blur(72px)` which are GPU-intensive. The PRD explicitly advises against ambient orb animations. |
| **Evidence** | `src/index.css` lines ~170-220: `.app-ambient::before` with `animation: app-wave-float-1 24s`, `.app-ambient::after` with `animation: app-wave-sweep 20s`. |
| **Impact** | Battery drain on mobile devices. Jank on low-end Android devices. Conflicts with the PRD's "restrained, purposeful motion" principle. |
| **Severity** | Low — performance/visual issue |
| **Recommended future phase** | Phase 2 (Dashboard) or Phase 9 (Final Polish) |
| **Status** | Recorded — Not Authorized for Fix |

---

## Summary

| ID | Area | Severity | Type | Status |
|----|------|----------|------|--------|
| DI-001 | Column Manager | Medium | Interaction | Recorded |
| DI-002 | Token Architecture | High | Implementation | Partially addressed |
| DI-003 | CSS Module Duplication | High | Design System | Recorded |
| DI-004 | framer-motion Usage | High | Constraint Violation | Recorded |
| DI-005 | Duplicate Toast Systems | Medium | Implementation | Recorded |
| DI-006 | Dashboard Audit Trail | Medium | Missing Functionality | Recorded |
| DI-007 | Hardcoded Colors | Medium | Design System | Recorded |
| DI-008 | No Pull-to-Refresh | Medium | Interaction | Recorded |
| DI-009 | Settings Flat List | Low | Navigation | Recorded |
| DI-010 | Search Coverage | Low | Discovery | Recorded |
| DI-011 | No List Skeletons | Low | Polish | Recorded |
| DI-012 | Ambient Animations | Low | Performance | Recorded |

---

*This ledger is documentation only. No issues are authorized for fix during the theme foundation pass.*
