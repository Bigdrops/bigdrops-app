# Implementation Roadmap

> Status: Draft
> Last updated: 2026-08-28

---

## Purpose

Define the phased implementation plan for the Adaptive Mobile-First UIUX Facelift. Identify dependencies between this PRD and the [UI/UX Consolidation PRD](../ui-ux-consolidation/00-index.md).

---

## Dependency: Two PRDs, One Sequence

```
┌──────────────────────────┐      ┌──────────────────────────┐
│  Consolidation PRD       │      │  Facelift PRD            │
│  (Code Cleanup)          │      │  (Design Direction)      │
│                          │      │                          │
│  Phase 0: Token cleanup  │ ←────│  Theme system defined    │
│  Phase 1: Quick wins     │      │  Design tokens chosen    │
│  Phase 2: Architecture   │      │  Component patterns set  │
│  Phase 3: Polish         │ ←────│  Responsive model set    │
│                          │      │  Accessibility spec set  │
└──────────────────────────┘      └──────────────────────────┘
```

**Key rule:** The Consolidation PRD is blocked on design token choices from this PRD. This PRD is NOT blocked — it can continue specification while consolidation completes non-design-dependent tasks.

---

## Phase 0: Design Decisions (Week 1–2)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 0.1 | Confirm v6 as canonical dashboard structure | Stakeholder | None |
| 0.2 | Select final light mode color palette | Stakeholder | None |
| 0.3 | Select final dark mode color palette | Stakeholder | 0.2 |
| 0.4 | Confirm theme model (color-only) | Design | None |
| 0.5 | Confirm token naming convention | Design | None |
| 0.6 | Confirm typography (Manrope + DM Mono) | Design | None |
| 0.7 | Confirm navigation model (5-tab bottom) | Design | None |

### Gate

No implementation begins until 0.1–0.7 are locked.

---

## Phase 1: Foundation / Tokens (Week 2–4)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 1.1 | Extract design tokens from v6 into CSS custom properties | Frontend | Phase 0 |
| 1.2 | Create theme token file (light + dark) | Frontend | 1.1 |
| 1.3 | Create structural token file (typography, spacing, radius) | Frontend | 1.1 |
| 1.4 | Replace shadcn HSL tokens with new tokens | Frontend | 1.2, Consolidation |
| 1.5 | Replace --bd-* tokens with new tokens | Frontend | 1.2, Consolidation |
| 1.6 | Update Tailwind config colors | Frontend | 1.2 |
| 1.7 | Remove unused tokens | Frontend | 1.4, 1.5 |

### Gate

All tokens are in place. No visual regressions.

---

## Phase 2: Mobile Shell (Week 4–6)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 2.1 | Implement bottom tab bar (phone) | Frontend | Phase 1 |
| 2.2 | Implement top bar with workspace identity | Frontend | Phase 1 |
| 2.3 | Implement drawer (side navigation) | Frontend | Phase 1 |
| 2.4 | Implement search overlay | Frontend | Phase 1 |
| 2.5 | Implement AI assistant sheet | Frontend | Phase 1, 13-ai-integration |
| 2.6 | Implement FAB | Frontend | Phase 1 |
| 2.7 | Implement toast notification system | Frontend | Phase 1 |
| 2.8 | Implement loading/refresh overlay | Frontend | Phase 1, 10-loading-and-refresh |

### Gate

Mobile shell works on phone. All navigation patterns function.

---

## Phase 3: Core Components (Week 6–8)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 3.1 | KPI metric card component | Frontend | Phase 2 |
| 3.2 | Activity row component | Frontend | Phase 2 |
| 3.3 | Alert card component | Frontend | Phase 2 |
| 3.4 | Audit row component | Frontend | Phase 2 |
| 3.5 | Reminder banner component | Frontend | Phase 2 |
| 3.6 | Section header component | Frontend | Phase 2 |
| 3.7 | Empty state component | Frontend | Phase 2 |
| 3.8 | Status badge component | Frontend | Phase 2 |
| 3.9 | Sheet action item component | Frontend | Phase 2 |

### Gate

All dashboard components render correctly with theme tokens.

---

## Phase 4: Responsive Adaptation (Week 8–10)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 4.1 | Foldable layout (expanded single column) | Frontend | Phase 3 |
| 4.2 | Tablet layout (multi-column) | Frontend | Phase 3 |
| 4.3 | Desktop sidebar navigation | Frontend | Phase 3 |
| 4.4 | Desktop content area (sidebar + content) | Frontend | 4.3 |
| 4.5 | Responsive breakpoints testing | QA | 4.1–4.4 |
| 4.6 | Orientation handling | Frontend | 4.1–4.4 |

### Gate

Dashboard works across phone, foldable, tablet, and desktop.

---

## Phase 5: Forms and Data Surfaces (Week 10–12)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 5.1 | Invoice form — 2-column field layout | Frontend | Phase 3 |
| 5.2 | Line item management (add, remove, reorder) | Frontend | 5.1 |
| 5.3 | Row total prominent bar | Frontend | 5.1 |
| 5.4 | Form validation and error states | Frontend | 5.1 |
| 5.5 | Document list — card layout (phone) | Frontend | Phase 3 |
| 5.6 | Document list — table layout (tablet/desktop) | Frontend | 5.5 |
| 5.7 | Document view — phone layout | Frontend | Phase 3 |
| 5.8 | Document view — tablet/desktop layout | Frontend | 5.7 |

### Gate

Invoice form and document views work across all platforms.

---

## Phase 6: Documents (Week 12–14)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 6.1 | Invoice view UX | Frontend | Phase 5 |
| 6.2 | Quotation view UX | Frontend | Phase 5 |
| 6.3 | Waybill view UX | Frontend | Phase 5 |
| 6.4 | CSR view UX | Frontend | Phase 5 |
| 6.5 | BOQ view UX | Frontend | Phase 5 |
| 6.6 | RFQ view UX | Frontend | Phase 5 |
| 6.7 | Letter view UX | Frontend | Phase 5 |
| 6.8 | Document action sheets | Frontend | 6.1–6.7 |
| 6.9 | PDF download and preview | Frontend | 6.1–6.7 |

### Gate

All document types have consistent UX across platforms.

---

## Phase 7: Desktop Adaptation (Week 14–16)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 7.1 | Desktop sidebar component | Frontend | Phase 4 |
| 7.2 | Full data tables with all columns | Frontend | Phase 5 |
| 7.3 | Column resize and reorder | Frontend | 7.2 |
| 7.4 | Keyboard shortcuts | Frontend | Phase 4 |
| 7.5 | Hover states | Frontend | Phase 4 |
| 7.6 | Multi-panel layouts | Frontend | Phase 4 |

### Gate

Desktop experience is complete and polished.

---

## Phase 8: Accessibility / Native Polish (Week 16–18)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 8.1 | ARIA labels on all interactive elements | Frontend | Phase 3 |
| 8.2 | Focus management and trapping | Frontend | Phase 2 |
| 8.3 | Screen reader testing | QA | 8.1, 8.2 |
| 8.4 | Reduced motion compliance | Frontend | Phase 3 |
| 8.5 | Touch target audit | QA | All phases |
| 8.6 | Contrast audit | QA | Phase 1 |
| 8.7 | Capacitor safe area testing | QA | Phase 2 |
| 8.8 | Keyboard navigation audit | QA | 8.2 |

### Gate

Application meets WCAG 2.2 AA baseline.

---

## Phase 9: Final Visual Refinement (Week 18–20)

### Tasks

| # | Task | Owner | Depends On |
|---|------|-------|------------|
| 9.1 | Theme switching testing (all themes) | QA | Phase 1 |
| 9.2 | Cross-platform visual audit | QA | All phases |
| 9.3 | Performance audit (animation, paint) | Frontend | All phases |
| 9.4 | Edge case handling | Frontend | All phases |
| 9.5 | Documentation update | Design | All phases |

### Gate

Application is ready for release.

---

## Summary Timeline

| Phase | Weeks | Focus |
|-------|-------|-------|
| 0 | 1–2 | Design decisions |
| 1 | 2–4 | Foundation / tokens |
| 2 | 4–6 | Mobile shell |
| 3 | 6–8 | Core components |
| 4 | 8–10 | Responsive adaptation |
| 5 | 10–12 | Forms and data |
| 6 | 12–14 | Documents |
| 7 | 14–16 | Desktop adaptation |
| 8 | 16–18 | Accessibility / native |
| 9 | 18–20 | Final polish |

**Total estimated duration: 20 weeks** (5 months)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Design decisions delayed | Blocks Phase 1+ | Use current defaults (v6 + Slate Navy) |
| Token migration breaks components | Visual regression | Phase-by-phase rollout, visual testing |
| Responsive breakpoints need device testing | Rework | Test early with real devices |
| Capacitor plugins behave differently than web | Native bugs | Test on real devices early |
| AI integration timeline unknown | Phase 2 dependency | AI is additive, not blocking |

---

## What This Roadmap Does NOT Cover

This roadmap covers the Facelift PRD scope only. It does NOT duplicate:
- Consolidation PRD tasks (code cleanup, dead code removal)
- Consolidation PRD roadmap (consolidation has its own phased plan)
- Database changes
- PDF rendering changes
- Financial calculation changes
