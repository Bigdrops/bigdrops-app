# Implementation Roadmap — UI/UX Consolidation PRD

**Total estimated effort:** 8-10 engineering days  
**Design Source of Truth:** `docs/TEMPLATES/Designsdotmds/Divine-blood.md`  
**Date:** August 2026 (revised)

---

## Phase 1: Divine Blood Token Replacement (Days 1-3)

**Goal:** Replace all existing token systems with Divine Blood. Delete all other themes.

| Task | Effort | Owner |
|---|---|---|
| Replace `--bd-*` tokens with Divine Blood `--db-*` in index.css | 1 day | Frontend |
| Replace shadcn HSL tokens with Divine Blood hex tokens | 0.5 day | Frontend |
| Update Tailwind config colors to Divine Blood palette | 0.5 day | Frontend |
| Delete `formTheme.css` (merge surviving rules into index.css) | 0.5 day | Frontend |
| Grep + replace all `--bd-*` references in component files | 0.5 day | Frontend |

**Gate:** No `--bd-*` references remain. All tokens are Divine Blood `--db-*`.  
**Reference:** D-017, D-018, `design-system-roadmap.md`

---

## Phase 2: Component Visual Migration (Days 4-6)

**Goal:** Update all components to use Divine Blood visual language.

| Task | Effort | Owner |
|---|---|---|
| Update button variants (primary = ink surface, gold accent) | 0.5 day | Frontend |
| Update badge/status colors to Divine Blood palette | 0.5 day | Frontend |
| Update nav active state (surface-soft + gold indicator) | 0.5 day | Frontend |
| Update form input focus states to gold | 0.5 day | Frontend |
| Update card/panel surfaces to Divine Blood tokens | 0.5 day | Frontend |
| QA pass: light mode visual consistency | 0.5 day | QA |
| QA pass: dark mode visual consistency | 0.5 day | QA |

**Gate:** All components visually match Divine Blood design doc. Light = white+gold+crimson. Dark = black+crimson+gold.

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
Phase 1 (Divine Blood tokens) ─── no deps (FIRST PRIORITY)
Phase 2 (Component visual)     ─── depends on Phase 1
Phase 3 (Quick wins)           ─── no deps (can parallel with Phase 2)
Phase 4 (Architecture)         ─── depends on Phase 2
Phase 5 (Polish)               ─── depends on all above
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

## Divine Blood Design Rules (Quick Reference)

| Rule | Detail |
|------|--------|
| Light canvas | `#FFFFFF` (pure white, not cream) |
| Light surface-soft | `#F5F5F5` (neutral gray, not beige) |
| Light border | `#E5E5E5` (clean gray, not brown) |
| Gold accent | `#F59E0B` (vibrant amber, not dusty) |
| Crimson | `#A52A2A` / `#8B0000` (deep blood, not bright red) |
| Dark canvas | `#0A0A0A` (deep black) |
| Nav active | surface-soft + 2px gold left rail (not gold background) |
| Primary button | Dark ink surface in light, warm white in dark |
| Living material | Atmospheric only, not in data tables or forms |
