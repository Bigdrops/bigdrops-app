# Implementation Roadmap — UI/UX Consolidation PRD

**Total estimated effort:** 8-10 engineering days (excluding design system migration)  
**Design Source of Truth:** TBD — stakeholder to select  
**Date:** August 2026 (revised 2026-08-28)

---

## Phase 1: Design System Token Replacement — BLOCKED

**Goal:** Replace all existing token systems with the chosen design language.
**Status:** ⬜ BLOCKED — Design system not yet selected (D-017 superseded 2026-08-28).

| Task | Effort | Owner |
|---|---|---|
| Select design language | — | Stakeholder |
| Create token mapping document | 1 day | Frontend |
| Replace `--bd-*` tokens with chosen system tokens | 1 day | Frontend |
| Replace shadcn HSL tokens | 0.5 day | Frontend |
| Update Tailwind config colors | 0.5 day | Frontend |
| Delete `formTheme.css` (merge surviving rules) | 0.5 day | Frontend |
| Grep + replace all `--bd-*` references in components | 0.5 day | Frontend |

**Gate:** No `--bd-*` references remain. All tokens aligned to chosen system.

---

## Phase 2: Component Visual Migration — BLOCKED

**Goal:** Update all components to use the chosen design language.
**Status:** ⬜ BLOCKED — Waiting on Phase 1.

| Task | Effort | Owner |
|---|---|---|
| Update button variants per chosen design | 0.5 day | Frontend |
| Update badge/status colors per chosen palette | 0.5 day | Frontend |
| Update nav active state | 0.5 day | Frontend |
| Update form input focus states | 0.5 day | Frontend |
| Update card/panel surfaces | 0.5 day | Frontend |
| QA pass: light mode visual consistency | 0.5 day | QA |
| QA pass: dark mode visual consistency | 0.5 day | QA |

**Gate:** All components visually match chosen design. Both modes verified.

---

## Phase 3: Quick Wins (Days 7-8)

**Goal:** Address highest-impact UX issues with minimal risk.

| Task | Effort | Owner |
|---|---|---|
| Sign-out confirmation dialog | 0.25 day | Frontend |
| Sticky sidebar business context | 0.25 day | Frontend |
| Reduced motion support (global `prefers-reduced-motion`) | 0.5 day | Frontend |
| Mobile drag handle fix | 0.25 day | Frontend |
| Dead code removal (Dashboard.tsx, FormNavigation*, App.css) | 0.25 day | Frontend |
| Sortable columns UI wiring | 0.25 day | Frontend |

**Gate:** All quick wins verified. No regressions.

---

## Phase 4: Architecture Cleanup (Days 9-10)

**Goal:** Consolidate redundant patterns and clean up code.

| Task | Effort | Owner |
|---|---|---|
| Create module-specific column hooks | 0.5 day | Frontend |
| Extract mobile form primitives to shared | 0.25 day | Frontend |
| Standardize portal usage | 0.25 day | Frontend |
| CSS Module consolidation (6× → 1× shared) | 0.5 day | Frontend |
| New/Edit page unification (Invoice, Waybill, Quotation) | 1 day | Senior Frontend |

**Gate:** Forms unified. CSS reduced. No dead patterns.

---

## Phase 5: Polish & Documentation (Day 11)

**Goal:** Final polish and documentation.

| Task | Effort | Owner |
|---|---|---|
| Route transition animations | 0.5 day | Frontend |
| Safe area insets for Capacitor | 0.25 day | Frontend |
| `aria-live` loading regions | 0.25 day | Frontend |
| Update component documentation | 0.5 day | Frontend |
| Final audits (audit:load, typecheck, lint, test) | 0.5 day | All |

**Gate:** All audits pass. Documentation updated.

---

## Dependency Graph

```
Phase 1 (Design system tokens) ─── BLOCKED (awaiting stakeholder decision)
Phase 2 (Component visual)     ─── depends on Phase 1
Phase 3 (Quick wins)           ─── no deps (CAN PROCEED NOW)
Phase 4 (Architecture)         ─── no deps (CAN PROCEED NOW)
Phase 5 (Polish)               ─── depends on Phase 3 + 4
```

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Token rename breaks component styles | Find-and-replace with visual diff per component |
| Dark mode regression | Dedicated dark mode QA pass after Phase 1 |
| Living material conflicts | Remove old animations, add per Divine-blood.md §20-21 |
| Berkeley Mono licensing | Use fallback monospace until license confirmed |

---

## Current Design State

| Aspect | Current | Target |
|--------|---------|--------|
| Primary color | Blue-600 (HSL 225 75% 48%) | TBD |
| Typography | Inter (system) | TBD |
| Visual modes | Light + Dark | Light + Dark (2 modes max) |
| Token system | shadcn HSL + `--bd-*` CSS vars | Single unified system |
| `formTheme.css` | 196 definitions, still active | To be replaced/deleted |
