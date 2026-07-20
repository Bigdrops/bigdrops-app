# UI/UX Consolidation — Implementation Roadmap (Detailed Planning Report)

> **Status:** READ-ONLY Planning  
> **Date:** June 2026  
> **Stack:** React 19 · TypeScript 5.9 · Tailwind CSS 3.4 · Vite 7 · Supabase · Bun  
> **Scope:** Full implementation roadmap for BIGDROPS UI/UX Consolidation PRD

---

## 1. Executive Summary

This report consolidates findings from 20+ PRD documents, governance validation, and source-level inspection into a single actionable implementation roadmap. The plan covers 3 phases across 6 months, targeting **3 new component adoptions**, **1 component evolution**, **2-3 days of migration work**, and **~1083 lines of CSS cleanup** — while preserving all 34 existing BIGDROPS UI primitives and respecting every accepted decision (D-001 through D-015).

**Key outcome:** No BIGDROPS component is removed. REUI is adoption source for 2 new components only. BIGDROPS remains the platform standard for all 34 existing families.

---

## 2. Documents Reviewed

| # | Document | Path | Focus |
|---|----------|------|-------|
| 1 | PRD Master Index | `docs/prd/ui-ux-consolidation/README.md` | Document inventory, methodology |
| 2 | Architecture Inspection | `docs/prd/ui-ux-consolidation/architecture-inspection.md` | Component architecture, dead code, bloat |
| 3 | Product Inspection | `docs/prd/ui-ux-consolidation/product-inspection.md` | UX feel assessment, navigation, forms |
| 4 | Component Inventory | `docs/prd/ui-ux-consolidation/component-inventory.md` | Full component catalog |
| 5 | Issue Tracker | `docs/prd/ui-ux-consolidation/issue-tracker.md` | 16 issues tracked |
| 6 | Design System Roadmap | `docs/prd/ui-ux-consolidation/design-system-roadmap.md` | Token system, CSS architecture |
| 7 | Migration Plan | `docs/prd/ui-ux-consolidation/migration-plan.md` | Phased migration strategy |
| 8 | Priority Matrix | `docs/prd/ui-ux-consolidation/priority-matrix.md` | Prioritized action items |
| 9 | Recommendations | `docs/prd/ui-ux-consolidation/02-recommendations.md` | R1-R9 consolidation recommendations |
| 10 | Target Architecture | `docs/prd/ui-ux-consolidation/04-architecture.md` | Post-consolidation architecture |
| 11 | Testing Checklist | `docs/prd/ui-ux-consolidation/07-testing-checklist.md` | Testing matrix |
| 12 | Decisions (ADRs) | `docs/prd/ui-ux-consolidation/08-decisions.md` | D-001 through D-015 |
| 13 | REUI Library Inspection | `docs/prd/UI-UX-Consolidation/reui-library-inspection.md` | REUI inventory (55 components) |
| 14 | REUI Adoption Matrix | `docs/prd/UI-UX-Consolidation/reui-adoption-matrix.md` | Cross-source scoring |
| 15 | REUI Migration Opportunities | `docs/prd/UI-UX-Consolidation/reui-migration-opportunities.md` | Migration paths |
| 16 | Platform Component Recommendations | `docs/prd/UI-UX-Consolidation/platform-component-recommendations.md` | Final winners per family |
| 17 | Governance Validation | `docs/Reports/reui-standard-validation.md` | 7-criteria governance check |
| 18 | AGENTS.md | `AGENTS.md` | Project hard rules, conventions |

---

## 3. Dependency Analysis

### 3.1 Critical Dependencies

| Dependency | Blocks | Resolution |
|---|---|---|
| ButtonGroup adoption (NEW) | Button evolution (size variants) | Adopt ButtonGroup first; evolve Button second |
| InputGroup adoption (NEW) | Rich text toolbar integration | Adopt InputGroup first; wire toolbar second |
| `bun run audit:load` clean | Any task execution | Run at start of every batch |
| `bun run typecheck` pass | Any task completion | Run at end of every batch |
| D-001 (switch standard) | Switch family changes | KEEP BIGDROPS switch; do not replace |
| D-002 (rich text toolbar) | Rich text toolbar integration | Already fixed; wire to InputGroup |
| D-005 (SharedDocumentForm) | CSR form unification | Prerequisite for CSR migration |
| D-013 (Sidebar standard) | Sidebar refactoring | Already implemented; preserve |

### 3.2 Parallel Work Opportunities

| Batch A (Independent) | Batch B (Independent) | Batch C (After A+B) |
|---|---|---|
| ButtonGroup adoption | Sign-out confirmation | Button size variants |
| InputGroup adoption | Sticky sidebar BC | Rich text toolbar wiring |
| Button evolution | Reduced motion support | CSS cleanup |
| | Mobile drag handles | |

### 3.3 Blocking Chains

```
ButtonGroup (adopt) → Button (evolve size variants)
InputGroup (adopt) → Rich text toolbar (wire)
CSR migration → SharedDocumentForm (already exists) → CSR form components
CSS cleanup → Token audit → formTheme.css elimination
```

---

## 4. Phase Breakdown

### Phase 0: Foundation (Days 1-2) — Component Adoptions

**Goal:** Adopt 2 new REUI components + evolve Button size variants.

| # | Task | Source | Effort | Dependencies | Verification |
|---|---|---|---|---|---|
| F-01 | Adopt ButtonGroup from REUI | REUI `button-group.tsx` (83L) | 0.5 day | None | `bun run typecheck` pass; import test in 1 file |
| F-02 | Adopt InputGroup from REUI | REUI `input-group.tsx` (169L) | 0.5 day | None | `bun run typecheck` pass; import test in 1 file |
| F-03 | Evolve Button size variants | REUI `button.tsx` size system | 0.5 day | F-01 | Keep BIGDROPS loading state; add xs/icon-xs/icon-sm/icon-lg |
| F-04 | Wire InputGroup to RichText toolbar | D-002 | 0.25 day | F-02 | Toolbar renders in SharedDocumentForm |
| F-05 | Create icon adapter (Lucide→Hugeicons) | REUI icons mapping | 0.25 day | None | Adapter exports compile |

**Completion criteria:**
- `bun run typecheck` passes
- `bun run lint` passes
- ButtonGroup importable from `@/components/ui/button-group`
- InputGroup importable from `@/components/ui/input-group`
- Button has size variants: xs, sm, default, lg, icon, icon-xs, icon-sm, icon-lg
- Button retains loading state (Spinner component)
- Icon adapter maps 20+ Lucide→Hugeicons

### Phase 1: Quick Wins (Days 3-5) — UX Fixes

**Goal:** Address highest-impact UX issues with minimal risk.

| # | Task | Source | Effort | Dependencies | Verification |
|---|---|---|---|---|---|
| Q-01 | Sign-out confirmation dialog | Issue #6, product-inspection | 0.25 day | None | AlertDialog appears on sign-out click |
| Q-02 | Sticky sidebar business context | product-inspection | 0.25 day | None | BC section visible while scrolling |
| Q-03 | Reduced motion support | product-inspection, priority-matrix | 0.5 day | None | `prefers-reduced-motion` respected globally |
| Q-04 | Mobile drag handle fix | Issue #9 | 0.25 day | None | Drag works on touch devices |
| Q-05 | Remove dead code | architecture-inspection | 0.25 day | None | `bun run audit:load` clean |
| Q-06 | Remove App.css | R4 | 0.1 day | None | No import errors |
| Q-07 | Sortable columns UI wiring | Issue #7 | 0.25 day | None | Column reorder accessible in UI |

**Completion criteria:**
- Sign-out triggers AlertDialog confirmation on desktop + mobile
- Business context section sticky on desktop sidebar
- `prefers-reduced-motion` disables animations app-wide
- Drag handles work on mobile touch
- Dead code files removed (Dashboard.tsx, App.css, FormNavigationItem.tsx, FormNavigation.tsx)
- Column sort UI accessible

### Phase 2: Shared Patterns (Days 6-8) — Architecture

**Goal:** Standardize shared patterns across document modules.

| # | Task | Source | Effort | Dependencies | Verification |
|---|---|---|---|---|---|
| P-01 | Create module-specific column hooks | R6 | 0.5 day | None | `useWaybillColumns`, `useQuotationColumns`, `useCSRColumns` exist |
| P-02 | Extract mobile form primitives to shared | R7 | 0.25 day | None | `mobileFormPrimitives.tsx` in shared location |
| P-03 | Standardize portal usage | R8 | 0.25 day | None | `createPortal` replaces `document.body.appendChild` |
| P-04 | Audit SortableLineItem | R9 | 0.25 day | None | Truly shared or document-specific decision made |
| P-05 | CSS Module consolidation | R2 | 0.5 day | None | 6× identical CSS files → 1× shared |
| P-06 | Design token audit & prune | R3 | 0.5 day | None | Unused `--bd-*` tokens removed from formTheme.css |

**Completion criteria:**
- Column hooks exist for all 6 document types
- Mobile form primitives in shared location
- No `document.body.appendChild` in view components
- SortableLineItem decision documented
- CSS Module files reduced from 6× to 1× shared
- Unused tokens pruned from formTheme.css

### Phase 3: Document Views (Days 9-12) — View Layer

**Goal:** Standardize document view patterns.

| # | Task | Source | Effort | Dependencies | Verification |
|---|---|---|---|---|---|
| V-01 | Unify view page layout | architecture-inspection | 1 day | P-05 | All 6 view pages use shared layout |
| V-02 | Unify summary strip | architecture-inspection | 0.5 day | V-01 | Summary strip consistent across modules |
| V-03 | Unify hero meta | architecture-inspection | 0.5 day | V-01 | Hero meta consistent across modules |
| V-04 | Unify document preview | architecture-inspection | 0.5 day | V-01 | Preview consistent across modules |
| V-05 | Standardize PDF output settings | architecture-inspection | 0.5 day | None | PDF settings pattern consistent |

**Completion criteria:**
- All 6 document view pages use shared layout components
- Summary strip, hero meta, document preview consistent
- PDF output settings standardized
- No visual regressions in dark mode

### Phase 4: CSR Migration (Days 13-15) — Largest Risk

**Goal:** Migrate CSR form to SharedDocumentForm pattern.

| # | Task | Source | Effort | Dependencies | Verification |
|---|---|---|---|---|---|
| C-01 | Audit CSR unique features | product-inspection | 0.25 day | None | Feature list documented |
| C-02 | Map CSR fields to SharedDocumentForm slots | D-005 | 0.5 day | C-01 | Field mapping complete |
| C-03 | Create useCSRForm hook | R1 | 1 day | C-02 | Hook orchestrates CSR state |
| C-04 | Create CSRFormPage.tsx | R1 | 0.5 day | C-03 | Unified form page works |
| C-05 | Update CSR routes | R1 | 0.25 day | C-04 | Routes point to unified page |
| C-06 | Delete old CSR form files | R1 | 0.1 day | C-05 | No import errors |

**Completion criteria:**
- CSR form uses SharedDocumentForm pattern
- All CSR-specific fields preserved (3-column grid, 42-line items, 10+ toggles)
- Mobile CSR form works
- No visual regressions
- Old CSR form files deleted

### Phase 5: Polish (Days 16-18) — Final Cleanup

**Goal:** Final polish and documentation.

| # | Task | Source | Effort | Dependencies | Verification |
|---|---|---|---|---|---|
| Z-01 | Route transition animations | product-inspection | 0.5 day | Q-03 | Page transitions animated |
| Z-02 | Safe area insets for Capacitor | product-inspection | 0.25 day | None | iOS notch handled |
| Z-03 | `aria-live` loading regions | product-inspection | 0.25 day | None | Screen reader announcements work |
| Z-04 | Update component documentation | post-migration | 0.5 day | All | docs reflect new components |
| Z-05 | Final audit: `bun run audit:load` | post-migration | 0.1 day | All | Clean pass |
| Z-06 | Final audit: `bun run typecheck` | post-migration | 0.1 day | All | Clean pass |
| Z-07 | Final audit: `bun run lint` | post-migration | 0.1 day | All | Clean pass |
| Z-08 | Final audit: `bun run test` | post-migration | 0.1 day | All | Critical path tests pass |

**Completion criteria:**
- Route transitions animated
- Safe area insets applied
- `aria-live` regions present in loading states
- Documentation updated
- All audits pass clean

---

## 5. Risks

### 5.1 High Risk

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| CSR form migration breaks unique features | Module unusable | Audit CSR features first; preserve all 3-column grid, 42-line items, 10+ toggles | Implementation |
| ButtonGroup/InputGroup adoption introduces bundle bloat | Performance degradation | Tree-shake; verify bundle size before/after | Verification |
| `bun run audit:load` fails after changes | Blocking | Run audit at start of every batch; fix before proceeding | Every batch |

### 5.2 Medium Risk

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| CSS cleanup removes tokens still in use | Visual regression | Grep each token before removal; test all modules | Phase 2 |
| Mobile drag handle fix breaks desktop | Desktop regression | Test both breakpoints; conditional logic | Phase 1 |
| Column hook extraction duplicates logic | Maintenance burden | Share base hook; module-specific overrides only | Phase 2 |

### 5.3 Low Risk

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Route transition animations cause motion sickness | Accessibility | Gated by `prefers-reduced-motion` from Q-03 | Phase 5 |
| Safe area insets break Android layout | Android regression | Test on Android device; conditional CSS | Phase 5 |

---

## 6. Critical Path

```
Phase 0 (Days 1-2)
  F-01 ButtonGroup ──────────────────────────┐
  F-02 InputGroup ──────────────────────────┤
  F-03 Button evolution (depends on F-01) ──┤
  F-04 Rich text toolbar (depends on F-02) ─┤
  F-05 Icon adapter ────────────────────────┘
       │
Phase 1 (Days 3-5) ── Can run in parallel with Phase 0 tail
  Q-01 Sign-out confirmation ───────────────┐
  Q-02 Sticky sidebar BC ──────────────────┤
  Q-03 Reduced motion ─────────────────────┤
  Q-04 Mobile drag handles ────────────────┤
  Q-05 Dead code removal ──────────────────┤
  Q-06 App.css removal ────────────────────┤
  Q-07 Sortable columns UI ────────────────┘
       │
Phase 2 (Days 6-8) ── Depends on Phase 1 completion
  P-01 Column hooks ────────────────────────┐
  P-02 Mobile form primitives ─────────────┤
  P-03 Portal standardization ─────────────┤
  P-04 SortableLineItem audit ─────────────┤
  P-05 CSS Module consolidation ───────────┤
  P-06 Token audit & prune ────────────────┘
       │
Phase 3 (Days 9-12) ── Depends on Phase 2 completion
  V-01 View layout ─────────────────────────┐
  V-02 Summary strip (depends on V-01) ────┤
  V-03 Hero meta (depends on V-01) ────────┤
  V-04 Document preview (depends on V-01) ─┤
  V-05 PDF output settings ────────────────┘
       │
Phase 4 (Days 13-15) ── Depends on Phase 3 completion
  C-01 CSR audit ──────────────────────────┐
  C-02 Field mapping (depends on C-01) ────┤
  C-03 useCSRForm hook (depends on C-02) ──┤
  C-04 CSRFormPage (depends on C-03) ──────┤
  C-05 Route update (depends on C-04) ─────┤
  C-06 Delete old files (depends on C-05) ─┘
       │
Phase 5 (Days 16-18) ── Depends on Phase 4 completion
  Z-01 Route transitions ──────────────────┐
  Z-02 Safe area insets ──────────────────┤
  Z-03 aria-live regions ─────────────────┤
  Z-04 Documentation ─────────────────────┤
  Z-05-Z-08 Final audits ─────────────────┘
```

**Total estimated effort:** 18 days (3.6 weeks)  
**Critical path duration:** 18 days (sequential)  
**Parallel reduction:** ~4 days saved via Batch A/B parallelism = **14 days effective**

---

## 7. Parallel Work Opportunities

### Batch A: Component Foundation (Days 1-2)
- F-01: ButtonGroup adoption
- F-02: InputGroup adoption
- F-05: Icon adapter
- **Can run in parallel** — no interdependencies

### Batch B: Quick Wins (Days 3-5)
- Q-01: Sign-out confirmation
- Q-02: Sticky sidebar BC
- Q-03: Reduced motion
- Q-04: Mobile drag handles
- Q-05: Dead code removal
- **Can run in parallel** — no interdependencies

### Batch C: Architecture (Days 6-8)
- P-01: Column hooks
- P-02: Mobile form primitives
- P-03: Portal standardization
- **Can run in parallel** — no interdependencies

### Batch D: View Layer (Days 9-12)
- V-01 must complete before V-02, V-03, V-04
- V-05 is independent
- **Partial parallelism** — V-01 first, then V-02/V-03/V-04/V-05 in parallel

---

## 8. Milestones

| Milestone | Target Day | Gate Criteria |
|---|---|---|
| M0: Foundation Complete | Day 2 | ButtonGroup + InputGroup adopted; Button evolved; icon adapter created |
| M1: Quick Wins Complete | Day 5 | Sign-out confirmed; sidebar sticky; reduced motion; dead code removed |
| M2: Architecture Standardized | Day 8 | Column hooks exist; mobile primitives shared; CSS consolidated |
| M3: View Layer Unified | Day 12 | All 6 view pages use shared layout; summary/preview standardized |
| M4: CSR Migrated | Day 15 | CSR form uses SharedDocumentForm; all features preserved |
| M5: Polish Complete | Day 18 | Transitions animated; a11y complete; documentation updated; all audits pass |

---

## 9. Verification Strategy

### 9.1 Per-Batch Verification

Every batch must pass:
1. `bun run audit:load` — clean pass (no new warnings)
2. `bun run typecheck` — zero errors
3. `bun run lint` — zero errors
4. `bun run test` — critical path tests pass

### 9.2 Per-Phase Verification

| Phase | Additional Verification |
|---|---|
| Phase 0 | ButtonGroup importable; InputGroup importable; Button has all size variants |
| Phase 1 | Sign-out dialog appears; sidebar BC sticky; reduced motion respected; drag works on mobile |
| Phase 2 | Column hooks exist for all 6 types; CSS Module files reduced; tokens pruned |
| Phase 3 | All 6 view pages render; no visual regressions; dark mode works |
| Phase 4 | CSR form works end-to-end; CSR mobile form works; old files deleted |
| Phase 5 | Route transitions animated; safe area insets applied; a11y regions present |

### 9.3 Final Verification

After all phases:
1. `bun run audit:load` — clean pass
2. `bun run typecheck` — zero errors
3. `bun run lint` — zero errors
4. `bun run test` — critical path tests pass
5. Manual testing: Create invoice, quotation, waybill, CSR, BOQ, RFQ on desktop + mobile
6. Manual testing: Verify sign-out confirmation on desktop + mobile
7. Manual testing: Verify reduced motion on macOS/Windows
8. Manual testing: Verify sidebar sticky on desktop
9. Manual testing: Verify CSR form matches SharedDocumentForm pattern
10. Bundle size comparison: before vs after (target: ≤5% increase)

---

## 10. Readiness Assessment

### 10.1 Prerequisites Met
- [x] All 3 source libraries fully inspected (BIGDROPS 34, REUI 55, React-temps 16)
- [x] Governance validation complete (0 of 22 REUI replacements pass; 2 new adoptions approved)
- [x] All PRD documents produced and reviewed
- [x] All ADRs validated (D-001 through D-015 accepted/implemented)
- [x] `bun run audit:load` passes clean (only pre-existing warnings)
- [x] AGENTS.md read — project hard rules, conventions documented
- [x] Critical path identified (14 days effective)
- [x] Parallel work opportunities mapped

### 10.2 Open Items
- [ ] `09-progress.md` is binary/corrupt — cannot read (low impact; progress tracking is external)
- [ ] CSR unique features audit (C-01) must complete before migration begins
- [ ] Bundle size baseline measurement needed before Phase 0

### 10.3 Go/No-Go Criteria

**GO** if:
1. `bun run audit:load` passes clean
2. All ADRs validated
3. CSR feature audit complete
4. Bundle size baseline measured

**NO-GO** if:
1. `bun run audit:load` fails with new errors
2. Any ADR is rejected
3. CSR features cannot be mapped to SharedDocumentForm

---

*Report generated: 2026-06-30*  
*Sources: 18 PRD documents, AGENTS.md, source-level inspection of 8 UI components*
