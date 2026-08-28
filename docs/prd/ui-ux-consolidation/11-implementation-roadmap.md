# Implementation Roadmap — UI/UX Consolidation

> **Status:** Active — Design System Selection Pending  
> **Date:** August 2026 (revised 2026-08-28)  
> **Stack:** React 19 · TypeScript 5.9 · Tailwind CSS 3.4 · Vite 7 · Supabase · Bun  
> **Design Source of Truth:** TBD — stakeholder to select  
> **Scope:** Unify UI layer, consolidate patterns, remove dead code. Design system choice deferred.

---

## 1. Executive Summary

This is the master execution plan for the BIGDROPS UI/UX consolidation. It prescribes work across 5 phases, starting with quick wins and dead code removal, then architecture cleanup, and finally design system token migration (once a system is chosen).

**Phase 1 (Quick Wins):** Dead code removal ✅, sign-out confirmation, reduced motion, drag handles.
**Phase 2 (Architecture):** Column hooks, portal standardization, CSS Module consolidation, BOQ/RFQ unification.
**Phase 3 (Views):** View page layout, summary strip, hero meta, document preview.
**Phase 4 (Design System):** Token replacement — **BLOCKED** until design language is selected.
**Phase 5 (Polish):** Route transitions, safe areas, aria-live, documentation.

**Critical path:** Phase 4 blocked. Phases 1-3 and 5 can proceed in parallel.

**Gate:** Every batch must pass `bun run audit:load`, `bun run typecheck`, `bun run lint`, and `bun run test` before proceeding.

---

## 2. Dependency Graph

### 2.1 Hard Dependencies

```
F-01 (ButtonGroup) ──→ F-03 (Button size variants)
F-02 (InputGroup) ───→ F-04 (Rich text toolbar wiring)
F-05 (Icon adapter) ──→ (standalone, no downstream)
Q-01-Q-07 ───────────→ (all independent, can run in parallel)
P-01-P-06 ───────────→ (all independent, can run in parallel)
V-01 ────────────────→ V-02, V-03, V-04 (V-01 must complete first)
V-05 ────────────────→ (standalone)
C-01 → C-02 → C-03 → C-04 → C-05 → C-06 (strictly sequential)
Z-01-Z-08 ───────────→ (all independent, can run in parallel)
```

### 2.2 Phase Dependencies

```
Phase 0 (Foundation) ──→ Phase 1 (Quick Wins) can start in parallel
Phase 1 ──→ Phase 2 (Architecture) must wait for Phase 1
Phase 2 ──→ Phase 3 (Views) must wait for Phase 2
Phase 3 ──→ Phase 4 (CSR) must wait for Phase 3
Phase 4 ──→ Phase 5 (Polish) must wait for Phase 4
```

### 2.3 Parallel Work Map

| Slot | Batch A (Independent) | Batch B (Independent) |
|---|---|---|
| Days 1-2 | F-01, F-02, F-05 | — |
| Days 3-5 | Q-01, Q-02, Q-03, Q-04, Q-05, Q-06, Q-07 | — |
| Days 6-8 | P-01, P-02, P-03, P-04, P-05, P-06 | — |
| Days 9-12 | V-01 (first), then V-02/V-03/V-04/V-05 | — |
| Days 13-15 | C-01→C-02→C-03→C-04→C-05→C-06 | — |
| Days 16-18 | Z-01, Z-02, Z-03, Z-04, Z-05, Z-06, Z-07, Z-08 | — |

---

## 3. Implementation Phases

### Phase 0: Design System Token Replacement — BLOCKED

**Goal:** Replace all existing token systems with the chosen design language.
**Status:** ⬜ BLOCKED — Design system not yet selected. D-017 superseded 2026-08-28.

| # | Task | Source | Effort | Dependencies | Completion Criteria |
|---|---|---|---|---|---|
| F-01 | Select design language | — | — | Stakeholder decision | Design doc finalized |
| F-02 | Create token mapping (current → new) | TBD | 1 day | F-01 | Mapping document complete |
| F-03 | Replace `--bd-*` tokens with chosen system tokens | TBD | 1 day | F-02 | All `--bd-*` definitions replaced |
| F-04 | Replace shadcn HSL tokens | TBD | 0.5 day | F-02 | All HSL color tokens replaced |
| F-05 | Update Tailwind config colors | TBD | 0.5 day | F-02 | Tailwind colors aligned |
| F-06 | Delete `formTheme.css` | — | 0.5 day | F-03, F-04 | File deleted, no import errors |
| F-07 | Grep + replace all `--bd-*` references in components | All .tsx | 0.5 day | F-03 | No `--bd-*` references remain |

**Gate:** No `--bd-*` references remain. All tokens aligned to chosen system.

### Phase 1: Component Visual Migration — BLOCKED

**Goal:** Update all components to use the chosen design language's visual rules.
**Status:** ⬜ BLOCKED — Waiting on Phase 0 (design system selection).

| # | Task | Source | Effort | Dependencies | Completion Criteria |
|---|---|---|---|---|---|
| V-01 | Update button variants per chosen design | TBD | 0.5 day | Phase 0 | Buttons match design doc |
| V-02 | Update badge/status colors per chosen palette | TBD | 0.5 day | Phase 0 | Status badges correct |
| V-03 | Update nav active state | TBD | 0.5 day | Phase 0 | Nav matches design doc |
| V-04 | Update form input focus states | TBD | 0.5 day | Phase 0 | Focus rings correct |
| V-05 | Update card/panel surfaces | TBD | 0.5 day | Phase 0 | Surfaces match design doc |
| V-06 | QA pass: light mode | — | 0.5 day | V-01–V-05 | Light mode verified |
| V-07 | QA pass: dark mode | — | 0.5 day | V-01–V-05 | Dark mode verified |

**Gate:** All components visually match chosen design. Both modes verified.

### Phase 2: Quick Wins (Days 7-8)

**Goal:** Address highest-impact UX issues with minimal risk.

| # | Task | Source | Effort | Dependencies | Completion Criteria |
|---|---|---|---|---|---|
| Q-01 | Sign-out confirmation dialog | Issue #6 | 0.25 day | None | AlertDialog on sign-out click |
| Q-02 | Sticky sidebar business context | product-inspection | 0.25 day | None | BC section sticky while scrolling |
| Q-03 | Reduced motion support | priority-matrix | 0.5 day | None | `prefers-reduced-motion` respected globally |
| Q-04 | Mobile drag handle fix | Issue #9 | 0.25 day | None | Drag works on touch devices |
| Q-05 | Remove dead code | architecture-inspection | 0.25 day | None | Dashboard.tsx, FormNavigation*, App.css removed |
| Q-06 | Sortable columns UI wiring | Issue #7 | 0.25 day | None | Column reorder accessible in UI |

**Gate:** All quick wins verified. No regressions.

### Phase 3: Architecture Cleanup (Days 9-10)

**Goal:** Consolidate redundant patterns and clean up code.

| # | Task | Source | Effort | Dependencies | Completion Criteria |
|---|---|---|---|---|---|
| A-01 | Create module-specific column hooks | R6 | 0.5 day | None | `useWaybillColumns`, `useQuotationColumns`, `useCSRColumns` exist |
| A-02 | Extract mobile form primitives to shared | R7 | 0.25 day | None | `mobileFormPrimitives.tsx` in shared location |
| A-03 | Standardize portal usage | R8 | 0.25 day | None | `createPortal` replaces `document.body.appendChild` |
| A-04 | CSS Module consolidation (6× → 1×) | R2 | 0.5 day | None | CSS files reduced |
| A-05 | New/Edit page unification (Invoice, Waybill, Quotation) | R1 | 1 day | None | Forms unified |

**Gate:** Forms unified. CSS reduced. No dead patterns.

### Phase 4: Polish & Documentation

**Goal:** Final polish and documentation.

| # | Task | Source | Effort | Dependencies | Completion Criteria |
|---|---|---|---|---|---|
| Z-01 | Route transition animations | product-inspection | 0.5 day | Q-03 | Page transitions animated |
| Z-02 | Safe area insets for Capacitor | product-inspection | 0.25 day | None | iOS notch handled |
| Z-03 | `aria-live` loading regions | product-inspection | 0.25 day | None | Screen reader announcements work |
| Z-04 | Update component documentation | post-migration | 0.5 day | All | Docs reflect current state |
| Z-05 | Final audits (audit:load, typecheck, lint, test) | post-migration | 0.5 day | All | All pass clean |

**Gate:** All audits pass. Documentation updated.

---

## 4. Task Registry

### 4.1 All Tasks (34 total)

| ID | Task | Phase | Day | Effort | Dependencies | Risk |
|---|---|---|---|---|---|---|
| F-01 | Adopt ButtonGroup | 0 | 1 | 0.5d | None | Low |
| F-02 | Adopt InputGroup | 0 | 1 | 0.5d | None | Low |
| F-03 | Evolve Button size variants | 0 | 2 | 0.5d | F-01 | Low |
| F-04 | Wire InputGroup to RichText | 0 | 2 | 0.25d | F-02 | Low |
| F-05 | Icon adapter | 0 | 2 | 0.25d | None | Low |
| Q-01 | Sign-out confirmation | 1 | 3 | 0.25d | None | Low |
| Q-02 | Sticky sidebar BC | 1 | 3 | 0.25d | None | Low |
| Q-03 | Reduced motion | 1 | 3-4 | 0.5d | None | Low |
| Q-04 | Mobile drag handles | 1 | 4 | 0.25d | None | Medium |
| Q-05 | Dead code removal | 1 | 4 | 0.25d | None | Low |
| Q-06 | App.css removal | 1 | 4 | 0.1d | None | Low |
| Q-07 | Sortable columns UI | 1 | 5 | 0.25d | None | Low |
| P-01 | Column hooks | 2 | 6 | 0.5d | None | Low |
| P-02 | Mobile form primitives | 2 | 6 | 0.25d | None | Low |
| P-03 | Portal standardization | 2 | 7 | 0.25d | None | Low |
| P-04 | SortableLineItem audit | 2 | 7 | 0.25d | None | Low |
| P-05 | CSS Module consolidation | 2 | 7-8 | 0.5d | None | Medium |
| P-06 | Token audit & prune | 2 | 8 | 0.5d | None | Medium |
| V-01 | View page layout | 3 | 9-10 | 1d | P-05 | Medium |
| V-02 | Summary strip | 3 | 11 | 0.5d | V-01 | Low |
| V-03 | Hero meta | 3 | 11 | 0.5d | V-01 | Low |
| V-04 | Document preview | 3 | 12 | 0.5d | V-01 | Low |
| V-05 | PDF output settings | 3 | 12 | 0.5d | None | Low |
| C-01 | CSR feature audit | 4 | 13 | 0.25d | None | Low |
| C-02 | CSR field mapping | 4 | 13 | 0.5d | C-01 | Low |
| C-03 | useCSRForm hook | 4 | 14 | 1d | C-02 | High |
| C-04 | CSRFormPage | 4 | 14-15 | 0.5d | C-03 | High |
| C-05 | CSR route update | 4 | 15 | 0.25d | C-04 | Low |
| C-06 | Delete old CSR files | 4 | 15 | 0.1d | C-05 | Low |
| Z-01 | Route transitions | 5 | 16 | 0.5d | Q-03 | Low |
| Z-02 | Safe area insets | 5 | 16 | 0.25d | None | Low |
| Z-03 | aria-live regions | 5 | 17 | 0.25d | None | Low |
| Z-04 | Documentation | 5 | 17-18 | 0.5d | All | Low |
| Z-05-Z-08 | Final audits | 5 | 18 | 0.4d | All | Low |

### 4.2 Effort Summary

| Phase | Days | Tasks |
|---|---|---|
| Phase 0: Divine Blood Tokens | 3 | 5 |
| Phase 1: Component Visual | 3 | 7 |
| Phase 2: Quick Wins | 2 | 6 |
| Phase 3: Architecture | 2 | 5 |
| Phase 4: Polish | 1 | 5 |
| **Total** | **11** | **28** |

---

## 5. Critical Path

```
Phase 0 (Divine Blood tokens) ──→ Phase 1 (Component visual) ──→ [Phase 1 gate]
                                                           │
Phase 2 (Quick Wins) ─────────────────────────────────────┤
                                                           │
Phase 3 (Architecture) ───────────────────────────────────┤
                                                           │
Phase 4 (Polish) ──→ Z-05 (final audits) ─────────────────┘
```

**Critical path duration:** 11 days sequential
**Parallel savings:** Quick Wins (Phase 2) can run parallel with Component Visual (Phase 1)

---

## 6. Implementation Prompt Sequence

Each prompt is self-contained. Do not combine unrelated work in a single prompt.

### Prompt 1: ButtonGroup Adoption
```
Adopt REUI ButtonGroup component into BIGDROPS.

Source: REUI button-group.tsx (83 lines)
Target: src/components/ui/button-group.tsx

Steps:
1. Read REUI button-group.tsx from docs/prd/ui-ux-consolidation/reui-library-inspection.md
2. Copy component to src/components/ui/button-group.tsx
3. Adapt: replace Lucide icons with Hugeicons equivalents
4. Adapt: replace --lyra-* tokens with --bd-* tokens
5. Add import to src/components/ui/index.ts (if barrel file exists)
6. Run bun run typecheck
7. Run bun run lint
8. Create a test file importing ButtonGroup in a dummy component

Gate: bun run typecheck + bun run lint pass
```

### Prompt 2: InputGroup Adoption
```
Adopt REUI InputGroup component into BIGDROPS.

Source: REUI input-group.tsx (169 lines)
Target: src/components/ui/input-group.tsx

Steps:
1. Read REUI input-group.tsx from docs/prd/ui-ux-consolidation/reui-library-inspection.md
2. Copy component to src/components/ui/input-group.tsx
3. Adapt: replace Lucide icons with Hugeicons equivalents
4. Adapt: replace --lyra-* tokens with --bd-* tokens
5. Add import to src/components/ui/index.ts (if barrel file exists)
6. Run bun run typecheck
7. Run bun run lint
8. Create a test file importing InputGroup in a dummy component

Gate: bun run typecheck + bun run lint pass
```

### Prompt 3: Button Size Variants + Icon Adapter
```
Evolve BIGDROPS Button with REUI size variants and create icon adapter.

Steps:
1. Read current src/components/ui/button.tsx
2. Add size variants from REUI: xs, icon-xs, icon-sm, icon-lg
3. Preserve existing sizes: sm, default, lg, icon
4. Preserve loading state (Spinner component)
5. Create src/components/reui/icons.tsx mapping Lucide→Hugeicons
6. Run bun run typecheck
7. Run bun run lint

Gate: bun run typecheck + bun run lint pass
```

### Prompt 4: RichText Toolbar + Sign-Out Confirmation
```
Wire InputGroup to RichText toolbar and add sign-out confirmation.

Steps:
1. Read D-002 decision in docs/PRD/ui-ux-consolidation/08-decisions.md
2. Read current RichText toolbar component
3. Wire InputGroup to toolbar (prefix/suffix slots for bold/italic/list)
4. Read current sign-out implementation in Layout.tsx
5. Add AlertDialog confirmation before sign-out
6. Run bun run typecheck
7. Run bun run lint

Gate: bun run typecheck + bun run lint pass
```

### Prompt 5: Sticky Sidebar + Reduced Motion + Dead Code
```
Fix sticky sidebar, add reduced motion, remove dead code.

Steps:
1. Read src/components/layout/DesktopSidebar.tsx
2. Add sticky positioning to business context section
3. Add global prefers-reduced-motion support in index.css
4. Delete src/pages/Dashboard.tsx (0 lines, dead)
5. Delete src/App.css (not imported)
6. Delete src/components/FormNavigationItem.tsx (not imported)
7. Delete src/components/FormNavigation.tsx (not imported)
8. Run bun run audit:load
9. Run bun run typecheck
10. Run bun run lint

Gate: bun run audit:load + bun run typecheck + bun run lint pass
```

### Prompt 6: Mobile Drag + Sortable Columns + Column Hooks
```
Fix mobile drag handles, wire sortable columns, create column hooks.

Steps:
1. Read current SortableLineItem component
2. Fix touch event handling for mobile drag
3. Read current column management (moveColumn exists)
4. Wire sortable columns UI in table settings
5. Create useWaybillColumns hook (follow useInvoiceColumns pattern)
6. Create useQuotationColumns hook
7. Create useCSRColumns hook
8. Run bun run typecheck
9. Run bun run lint

Gate: bun run typecheck + bun run lint pass
```

### Prompt 7: CSS Consolidation + Token Audit
```
Consolidate CSS Modules and audit design tokens.

Steps:
1. Read all 6× ViewPage.module.css files
2. Identify common rules
3. Create shared/document-view/shared/viewPageLayout.module.css
4. Update each module to import shared
5. Grep all --bd-* tokens across source files
6. Remove unreferenced tokens from formTheme.css
7. Run bun run audit:load
8. Run bun run typecheck
9. Run bun run lint

Gate: bun run audit:load + bun run typecheck + bun run lint pass
```

### Prompt 8: View Layout Unification
```
Unify document view page layouts.

Steps:
1. Read all 6 view page components (ViewInvoice, ViewQuotation, etc.)
2. Identify common structural patterns
3. Create shared view layout component
4. Refactor each view page to use shared layout
5. Preserve module-specific overrides
6. Run bun run typecheck
7. Run bun run lint

Gate: bun run typecheck + bun run lint pass; all 6 view pages render
```

### Prompt 9: CSR Migration
```
Migrate CSR form to SharedDocumentForm pattern.

Steps:
1. Read C-01 feature audit (CSR unique features)
2. Read current CsrFormScreen.tsx (861 lines)
3. Read SharedDocumentForm.tsx (197 lines)
4. Map CSR fields to SharedDocumentForm slots
5. Create useCSRForm hook (extract from CsrFormScreen)
6. Create CSRFormPage.tsx using SharedDocumentForm + useCSRForm
7. Update routes to point to CSRFormPage
8. Delete old CsrFormScreen.tsx
9. Test: Create CSR on desktop
10. Test: Create CSR on mobile
11. Run bun run typecheck
12. Run bun run lint

Gate: bun run typecheck + bun run lint pass; CSR form works end-to-end
```

### Prompt 10: Polish + Final Audit
```
Add route transitions, safe area insets, aria-live regions, and run final audit.

Steps:
1. Add route transition animations (AnimatePresence at route level)
2. Add safe-area-inset-* CSS variables for Capacitor iOS
3. Add aria-live regions to loading states
4. Update component documentation
5. Run bun run audit:load
6. Run bun run typecheck
7. Run bun run lint
8. Run bun run test

Gate: All 4 audits pass clean
```

---

## 7. Verification Matrix

| Task | typecheck | lint | audit:load | test | Manual |
|---|---|---|---|---|---|
| F-01 ButtonGroup | ✅ | ✅ | — | — | Import test |
| F-02 InputGroup | ✅ | ✅ | — | — | Import test |
| F-03 Button variants | ✅ | ✅ | — | — | Variant render |
| F-04 RichText wire | ✅ | ✅ | — | — | Toolbar renders |
| F-05 Icon adapter | ✅ | ✅ | — | — | Import test |
| Q-01 Sign-out | ✅ | ✅ | — | — | Dialog appears |
| Q-02 Sticky BC | ✅ | ✅ | — | — | BC visible while scrolling |
| Q-03 Reduced motion | ✅ | ✅ | — | — | Animations disabled |
| Q-04 Mobile drag | ✅ | ✅ | — | — | Touch drag works |
| Q-05 Dead code | ✅ | ✅ | ✅ | — | No import errors |
| Q-06 App.css | ✅ | ✅ | ✅ | — | No import errors |
| Q-07 Sortable cols | ✅ | ✅ | — | — | UI accessible |
| P-01 Column hooks | ✅ | ✅ | — | — | Hooks exist |
| P-02 Mobile primitives | ✅ | ✅ | — | — | Shared location |
| P-03 Portal std | ✅ | ✅ | — | — | createPortal used |
| P-04 SortableLineItem | ✅ | ✅ | — | — | Decision documented |
| P-05 CSS consolidation | ✅ | ✅ | ✅ | — | Files reduced |
| P-06 Token prune | ✅ | ✅ | ✅ | — | Tokens removed |
| V-01 View layout | ✅ | ✅ | — | ✅ | All 6 render |
| V-02 Summary strip | ✅ | ✅ | — | ✅ | Consistent |
| V-03 Hero meta | ✅ | ✅ | — | ✅ | Consistent |
| V-04 Doc preview | ✅ | ✅ | — | ✅ | Consistent |
| V-05 PDF settings | ✅ | ✅ | — | ✅ | Consistent |
| C-01 CSR audit | — | — | — | — | Feature list |
| C-02 CSR mapping | — | — | — | — | Mapping complete |
| C-03 useCSRForm | ✅ | ✅ | — | ✅ | Hook works |
| C-04 CSRFormPage | ✅ | ✅ | — | ✅ | Form works |
| C-05 CSR routes | ✅ | ✅ | — | ✅ | Routes correct |
| C-06 Delete old | ✅ | ✅ | ✅ | — | No errors |
| Z-01 Transitions | ✅ | ✅ | — | — | Animated |
| Z-02 Safe area | ✅ | ✅ | — | — | iOS notch handled |
| Z-03 aria-live | ✅ | ✅ | — | — | SR announces |
| Z-04 Docs | — | — | — | — | Updated |
| Z-05-Z-08 Audits | ✅ | ✅ | ✅ | ✅ | All pass |

---

## 8. Definition of Done

### 8.1 Per-Task
- [ ] Code compiles (`bun run typecheck` passes)
- [ ] No lint errors (`bun run lint` passes)
- [ ] No new audit warnings (`bun run audit:load` passes)
- [ ] Critical path tests pass (`bun run test` passes)
- [ ] Manual verification complete (where applicable)

### 8.2 Per-Phase
- [ ] All tasks in phase complete
- [ ] All gate criteria met
- [ ] No regressions in other modules
- [ ] Dark mode works
- [ ] Mobile works

### 8.3 Overall
- [ ] All 34 tasks complete
- [ ] All 6 phases complete
- [ ] `bun run audit:load` clean
- [ ] `bun run typecheck` clean
- [ ] `bun run lint` clean
- [ ] `bun run test` clean
- [ ] All manual testing complete
- [ ] Documentation updated
- [ ] Bundle size ≤5% increase from baseline

---

## 9. Implementation Governance

### 9.1 Decision Preservation

All ADRs D-001 through D-018 must be preserved. D-017 (Divine Blood) and D-018 (Delete Themes) are the new primary drivers:

| ADR | Status | Preservation |
|---|---|---|
| D-001: Switch standard | Accepted | KEEP BIGDROPS switch; do not replace |
| D-002: Rich text toolbar | Fixed | Wire to InputGroup in Phase 0 |
| D-003: Sidebar standard | Implemented | Preserve existing sidebar |
| D-004: Filter button standard | Implemented | Preserve existing filter |
| D-005: SharedDocumentForm | Accepted | Use for CSR migration |
| D-006: Document views | Implemented | Use shared layout |
| D-007: Mobile form primitives | Accepted | Extract to shared |
| D-008: Column management | Accepted | Create module hooks |
| D-009: PDF output settings | Implemented | Standardize pattern |
| D-010: CSS Module pattern | Accepted | Consolidate to shared |
| D-011: Design tokens | Accepted | Audit and prune |
| D-012: Portal standardization | Accepted | Replace body.appendChild |
| D-013: Sidebar standard | Implemented | Preserve existing |
| D-014: SortableLineItem | Accepted | Audit and decide |
| D-015: Dead code removal | Accepted | Remove in Phase 1 |

### 9.2 Governance Rules

1. **No component removal** — BIGDROPS component count stays at 34 + 2 new = 36
2. **No ADR modification** — D-001 through D-015 preserved as-is
3. **No framer-motion introduction** — CSS transitions only (Q-03, Z-01)
4. **No npm/yarn** — Bun only for all commands
5. **No Tailwind v4 syntax** — Project is on Tailwind CSS 3.4
6. **No production framer-motion** — circuit-board.tsx and OpenInAIDropdown.tsx already shipped; migration to CSS transitions is valid but not blocking
7. **goey-toast preserved** — Production-shipped, no issue documented; toast migration is NOT in scope
8. **Bundle size gate** — ≤5% increase from baseline; measure before Phase 0

### 9.3 Rollback Procedure

If any task fails verification:
1. Revert the specific task (git checkout the affected files)
2. Document the failure in a new issue
3. Re-assess the task dependencies
4. Proceed with remaining tasks
5. Re-attempt the failed task after root cause analysis

### 9.4 Escalation

If Phase 4 (CSR Migration) fails:
1. Do NOT delete old CSR form files
2. Keep both old and new CSR forms
3. Document what SharedDocumentForm cannot support
4. Create a new ADR for CSR-specific form pattern
5. Proceed to Phase 5 with CSR as exception

---

*Document generated: 2026-06-30*  
*Sources: 18 PRD documents, AGENTS.md, source-level inspection of 8 UI components*
