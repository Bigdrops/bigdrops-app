# Adaptive Mobile-First UIUX Facelift PRD — Reorganization Report

This report was written by Buffy on 2026-08-28 via Freebuff.

---

## Summary

Reorganized `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/` from 11 unstructured files into 15 specification documents + 9 reference files with a clean, navigable structure.

---

## Files Inspected

**11 files** before reorganization:

| File | Type |
|------|------|
| `ai-integration.md` | Markdown |
| `Design-direction/loading-state.md` | Markdown |
| `Design-direction/dashboard/mobile-dashboard-v6.html` | HTML |
| `Design-direction/dashboard/mobile-dashboard-v2.html` | HTML |
| `Design-direction/dashboard/mobile-dashboard-v3.html` | HTML |
| `Design-direction/dashboard/mobile-dashboard-v4.html` | HTML |
| `Design-direction/dashboard/mobile-dashboard-v5.html` | HTML |
| `Design-direction/dashboard/mobile-dashboard-v7.html` | HTML |
| `Design-direction/dashboard/form-dashboard.html` | HTML |
| `Design-direction/dashboard/liquid-onyx.html` | HTML |
| `Design-direction/form/invoice-form-2col.html` | HTML |

---

## Files Created (13 new)

| File | Purpose |
|------|---------|
| `00-index.md` | Master index — entry point for the entire PRD |
| `01-design-vision.md` | Product experience, brand feel, design principles |
| `02-mobile-first-model.md` | Platform tiers (phone/foldable/tablet/desktop), breakpoints, responsive behavior |
| `03-design-system.md` | Typography, spacing, radius, elevation, borders, controls, icons, layout primitives |
| `04-theme-system.md` | Theme contract (color-only), token naming, light/dark model, current defaults |
| `05-navigation-shell.md` | Bottom nav, top bar, drawer, search, AI sheet, FAB, adaptive navigation |
| `06-component-patterns.md` | KPI cards, activity rows, alerts, audit, reminders, sheets, empty states, status |
| `07-forms.md` | Invoice form layout, field grid, input styles, validation, line item management |
| `08-tables-and-data.md` | Mobile data presentation, column priority, responsive columns, sorting, filtering |
| `09-documents.md` | Document view UX for all 7 document types, lifecycle, actions, navigation |
| `11-accessibility.md` | WCAG 2.2 AA, touch targets, contrast, keyboard, screen readers, reduced motion |
| `12-capacitor-native.md` | Safe areas, status bar, keyboard, splash, haptics, back behavior, transitions |
| `14-implementation-roadmap.md` | 10-phase plan, dependencies, timeline, risks, non-goals |

---

## Files Moved (9 files)

| From | To | Reason |
|------|----|--------|
| `ai-integration.md` | `13-ai-integration.md` | Renumbered into canonical sequence |
| `Design-direction/loading-state.md` | `10-loading-and-refresh.md` | Renumbered + renamed to match scope |
| `Design-direction/dashboard/mobile-dashboard-v2.html` | `Design-direction/dashboard/themes/mobile-dashboard-v2.html` | Classified as theme variant |
| `Design-direction/dashboard/mobile-dashboard-v3.html` | `Design-direction/dashboard/themes/mobile-dashboard-v3.html` | Classified as theme variant |
| `Design-direction/dashboard/mobile-dashboard-v4.html` | `Design-direction/dashboard/themes/mobile-dashboard-v4.html` | Classified as theme variant |
| `Design-direction/dashboard/mobile-dashboard-v5.html` | `Design-direction/dashboard/themes/mobile-dashboard-v5.html` | Classified as theme variant |
| `Design-direction/dashboard/mobile-dashboard-v7.html` | `Design-direction/dashboard/themes/mobile-dashboard-v7.html` | Classified as theme variant |
| `Design-direction/dashboard/form-dashboard.html` | `Design-direction/reference/form-dashboard.html` | Classified as alternative exploration |
| `Design-direction/dashboard/liquid-onyx.html` | `Design-direction/reference/liquid-onyx.html` | Classified as alternative exploration |

---

## Files Renamed (2 files)

| Old Name | New Name |
|----------|----------|
| `ai-integration.md` | `13-ai-integration.md` |
| `Design-direction/loading-state.md` | `10-loading-and-refresh.md` |

---

## Files Archived (0 files)

No files were deleted or archived. All existing content was preserved in its new location.

---

## Canonical Design Decision

**`Design-direction/dashboard/mobile-dashboard-v6.html` is the only canonical dashboard structure.**

All other dashboard HTML files (v2, v3, v4, v5, v7) are structurally identical to v6 with only colour token values changed. They are classified as theme colour variants and stored in `themes/`.

`form-dashboard.html` and `liquid-onyx.html` are alternative design explorations, stored in `reference/`. Their useful ideas may inform future iterations but they do NOT define independent structural designs.

---

## Theme Model Decision

**THEME = COLOUR ONLY.**

Locked in `04-theme-system.md`:
- A theme may change: background, surface, text, border, accent, semantic colours, gradients
- A theme must NOT change: layout, responsive behavior, component structure, navigation, spacing, typography, dimensions, interaction, motion

Structural tokens (`03-design-system.md`) are theme-invariant.
Colour tokens (`04-theme-system.md`) are theme-variant.

---

## Mobile Platform Model

Locked in `02-mobile-first-model.md`:

| Tier | Role |
|------|------|
| Phone | Primary design target |
| Foldable | Phone experience that adapts to unfolded state |
| Tablet | Expanded mobile experience with more content density |
| Desktop | Adaptive tier — not the source design |

Design starts at phone width and progressively unlocks space. Tablet and foldable are mobile, not desktop shrunk down.

---

## Remaining Design Decisions

| # | Decision | Priority | Status |
|---|----------|----------|--------|
| 1 | Final light mode colour palette | High | Pending stakeholder selection |
| 2 | Final dark mode colour palette | High | Pending stakeholder selection |
| 3 | Tablet navigation model (bottom bar vs side rail) | Medium | TBD in implementation |
| 4 | Desktop sidebar design | Medium | TBD in implementation |
| 5 | Foldable posture behavior | Medium | TBD in implementation |
| 6 | Table column priority system | Medium | Defined in 08, may need refinement |
| 7 | Document view layout (tablet/desktop) | Low | Defined in 09, may need refinement |

---

## Relationship to Consolidation PRD

| PRD | Scope | Status |
|-----|-------|--------|
| **Facelift PRD** (this one) | Product experience, visual direction, responsive behavior | Active — foundation established |
| **Consolidation PRD** | Code cleanup, token replacement, architecture | Active — ~30% complete, blocked on token choices |

The two PRDs remain separate. The Facelift PRD establishes design tokens and visual rules. The Consolidation PRD later consumes those tokens during code cleanup.

**Dependency:** Consolidation PRD Phase 0 (token replacement) is blocked on Facelift PRD Phase 0 (design decisions). This is documented in `14-implementation-roadmap.md`.

---

## Contradictions Discovered

| Issue | Resolution |
|-------|-----------|
| v2-v7 treated as separate designs | Resolved: classified as theme colour variants |
| liquid-onyx used different token naming | Resolved: `04-theme-system.md` locks v6 naming convention |
| form-dashboard had different card pattern | Resolved: classified as reference material, not canonical |
| No mobile-first model existed | Resolved: `02-mobile-first-model.md` created with 4-tier hierarchy |
| No theme contract existed | Resolved: `04-theme-system.md` explicitly locks colour-only model |

---

## Information Intentionally Left TBD

| Item | Reason |
|------|--------|
| Exact breakpoint pixel values | Need device testing during implementation |
| Tablet navigation model | Requires UX decision with real tablet testing |
| Desktop sidebar width | Depends on content density requirements |
| Foldable posture details | Requires real foldable device testing |
| Specific haptic feedback types | Requires Capacitor plugin testing |

---

## Final Git Status

```
A  docs/Reports/Ui-Ux/adaptive-mobile-first-facelift-prd-inventory-report.md
RM loading-state.md → 10-loading-and-refresh.md
R  ai-integration.md → 13-ai-integration.md
R  v2.html → themes/v2.html
R  v3.html → themes/v3.html
R  v4.html → themes/v4.html
R  v5.html → themes/v5.html
R  v7.html → themes/v7.html
R  form-dashboard.html → reference/form-dashboard.html
R  liquid-onyx.html → reference/liquid-onyx.html
?? 00-index.md (new)
?? 01-design-vision.md (new)
?? 02-mobile-first-model.md (new)
?? 03-design-system.md (new)
?? 04-theme-system.md (new)
?? 05-navigation-shell.md (new)
?? 06-component-patterns.md (new)
?? 07-forms.md (new)
?? 08-tables-and-data.md (new)
?? 09-documents.md (new)
?? 11-accessibility.md (new)
?? 12-capacitor-native.md (new)
?? 14-implementation-roadmap.md (new)
```

**Total: 0 files deleted, 2 files renamed, 9 files moved, 13 files created, 0 application code modified.**

---

## Confirmation

- [x] Complete existing PRD folder inspected
- [x] Every existing document accounted for
- [x] v6 is the only canonical dashboard structure
- [x] Colour variants classified as themes
- [x] No theme changes layout or component structure
- [x] Mobile includes phone, foldable, and tablet
- [x] Desktop is an adaptive tier
- [x] No contradictions with established design direction
- [x] Old Consolidation PRD remains separate
- [x] No application source code modified
- [x] `src/` directory untouched
