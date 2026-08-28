# Adaptive Mobile-First UIUX Facelift PRD

> Status: Active — Foundation Established
> Date: 2026-08-28
> Author: Design Council

---

## Purpose

This PRD defines the product experience, visual direction, and responsive behavior for BIGDROPS across all platform tiers. It establishes the design system, theme architecture, component patterns, and interaction model that will guide the UI facelift.

This PRD answers: **What should BIGDROPS look and feel like, and how should it behave across mobile-sized platforms and desktop?**

It does NOT answer: How should the codebase be cleaned up to get there? That is the scope of the [UI/UX Consolidation PRD](../ui-ux-consolidation/00-index.md).

---

## Mobile-First Philosophy

BIGDROPS is mobile-first by design. "Mobile" includes:

- **Phone** — primary design target
- **Foldable** — phone experience that adapts to unfolded state
- **Tablet** — expanded mobile experience with more content density

Desktop is an adaptive larger-screen tier. It is NOT the source design. All design decisions start at phone width and progressively unlock additional space and capability.

---

## Platform Hierarchy

| Tier | Role | Design Approach |
|------|------|----------------|
| Phone | Primary | Full design source. Bottom navigation. Single-column content. |
| Foldable | Mobile extension | Phone layout expanded. Side-by-side panels when unfolded. |
| Tablet | Expanded mobile | Multi-column content. Persistent navigation. Higher density. |
| Desktop | Adaptive | Sidebar navigation. Full data tables. Maximum information density. |

---

## Canonical Design Reference

**`Design-direction/dashboard/mobile-dashboard-v6.html`** is the canonical structural reference for the dashboard.

This file defines:
- App shell structure (topbar, scroll area, bottom nav, FAB)
- Component hierarchy (KPI cards, activity rows, alerts, audit trail)
- Interaction patterns (drawer, search, AI assistant, theme customizer)
- Responsive wrapper behavior (430px phone frame on larger screens)

All other dashboard HTML files are classified as theme color variations or reference material. They do NOT define independent structural designs.

---

## Theme Architecture

**Themes change color only.**

A theme may change:
- Background colors
- Surface colors
- Text colors
- Border colors
- Accent colors
- Semantic colors
- Gradients (where purely color treatment)

A theme MUST NOT change:
- Layout
- Responsive behavior
- Component structure
- Navigation model
- Spacing
- Typography
- Component dimensions
- Interaction behavior
- Motion behavior

See [04-theme-system.md](./04-theme-system.md) for the complete theme contract.

---

## Document Map

| # | Document | Scope | Status |
|---|----------|-------|--------|
| 00 | [Index](./00-index.md) | This file — master entry point | Current |
| 01 | [Design Vision](./01-design-vision.md) | Product experience, brand feel, design principles | Current |
| 02 | [Mobile-First Model](./02-mobile-first-model.md) | Platform tiers, breakpoints, responsive behavior | Current |
| 03 | [Design System](./03-design-system.md) | Typography, spacing, radius, elevation, controls | Current |
| 04 | [Theme System](./04-theme-system.md) | Theme contract, color tokens, light/dark model | Current |
| 05 | [Navigation Shell](./05-navigation-shell.md) | Bottom nav, drawer, search, AI, sheets | Current |
| 06 | [Component Patterns](./06-component-patterns.md) | KPI cards, activity, alerts, audit, FAB, sheets | Current |
| 07 | [Forms](./07-forms.md) | Invoice form, line items, field layout, validation | Current |
| 08 | [Tables and Data](./08-tables-and-data.md) | Data surfaces, columns, sorting, mobile tables | Current |
| 09 | [Documents](./09-documents.md) | Invoice, quotation, waybill, CSR view UX | Current |
| 10 | [Loading and Refresh](./10-loading-and-refresh.md) | Loading states, refresh behavior, progress indicators | Current |
| 11 | [Accessibility](./11-accessibility.md) | WCAG, touch targets, keyboard, screen readers | Current |
| 12 | [Capacitor Native](./12-capacitor-native.md) | Safe areas, status bar, keyboard, splash | Current |
| 13 | [AI Integration](./13-ai-integration.md) | Gateway, use cases, client setup, deployment | Current |
| 14 | [Implementation Roadmap](./14-implementation-roadmap.md) | Phased plan, dependencies, milestones | Current |

---

## Design Direction Reference

### Canonical Structure

| File | Role |
|------|------|
| `Design-direction/dashboard/mobile-dashboard-v6.html` | Canonical dashboard structure |
| `Design-direction/form/invoice-form-2col.html` | Invoice form with 2-column layout |

### Theme Color Variants

All structurally identical to v6. Color-only differences.

| File | Palette |
|------|---------|
| `Design-direction/dashboard/themes/mobile-dashboard-v2.html` | Amber Terracotta |
| `Design-direction/dashboard/themes/mobile-dashboard-v3.html` | Ocean Teal |
| `Design-direction/dashboard/themes/mobile-dashboard-v4.html` | Rose Gold |
| `Design-direction/dashboard/themes/mobile-dashboard-v5.html` | Forest Green |
| `Design-direction/dashboard/themes/mobile-dashboard-v7.html` | Warm Cocoa |

### Reference Material

Alternative design explorations. Not canonical. Useful ideas may inform future iterations.

| File | Notes |
|------|-------|
| `Design-direction/reference/form-dashboard.html` | Exposed card pattern, section headers, amber palette |
| `Design-direction/reference/liquid-onyx.html` | Dark-only, chrome silver, extractable token system |

---

## Locked Decisions

| Decision | Status | Reference |
|----------|--------|-----------|
| BIGDROPS is mobile-first | ✅ Locked | This document |
| Phone/foldable/tablet = mobile | ✅ Locked | This document |
| Desktop = adaptive tier | ✅ Locked | This document |
| v6 = canonical dashboard structure | ✅ Locked | This document |
| Themes = color only | ✅ Locked | 04-theme-system.md |
| Bottom nav on phone | ✅ Locked | 05-navigation-shell.md |
| 5-tab navigation model | ✅ Locked | 05-navigation-shell.md |
| Manrope + DM Mono typography | ✅ Locked | 03-design-system.md |
| 2-column KPI grid | ✅ Locked | 06-component-patterns.md |
| Free-LLM gateway for AI | ✅ Locked | 13-ai-integration.md |

## Pending Decisions

| Decision | Priority | Blocked By |
|----------|----------|------------|
| Final light mode color palette | High | Stakeholder selection |
| Final dark mode color palette | High | Stakeholder selection |
| Tablet navigation model | Medium | 02-mobile-first-model.md |
| Desktop sidebar design | Medium | 02-mobile-first-model.md |
| Foldable posture behavior | Medium | 02-mobile-first-model.md |
| Table column priority system | Medium | 08-tables-and-data.md |
| Document view layout | Low | 09-documents.md |

---

## Relationship to Consolidation PRD

| PRD | Answers |
|-----|---------|
| **Facelift PRD** (this one) | What should BIGDROPS look and feel like? |
| **Consolidation PRD** | How do we clean up the code to get there? |

The consolidation PRD is blocked on design direction choices from this PRD (token replacement, theme system). This PRD is not blocked — it can continue specification while the consolidation PRD completes non-design-dependent tasks.

Do NOT merge the two PRDs.

---

## Non-Goals

This PRD does NOT cover:
- PDF rendering changes
- Calculations.ts modifications
- Financial rule changes
- Tenant architecture changes
- Database schema changes
- Unrelated code refactoring
- Theme-specific layouts
- Theme-specific typography
- Theme-specific spacing
- Separate mobile/tablet/desktop design languages
