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

## Related Skills

These agent skills are directly relevant to implementing this PRD. Load them when working on mobile UI, component design, or animation.

> Primary UI/UX skill: **apple-design** — the designated skill for UI/UX work under this PRD.

| Skill | Use When | Path |
|-------|----------|------|
| **mobile-app-ui-design** | Designing or reviewing mobile screens, flows, onboarding, navigation, or any mobile-first UI work | `.agents/skills/mobile-app-ui-design/SKILL.md` |
| **appllama-app-design-skill** | Building native-feeling Expo/React Native screens with Apple HIG fidelity, semantic colors, Reanimated motion | `.agents/skills/appllama-app-design-skill/SKILL.md` |
| **redesign-existing-projects** | Upgrading existing screens to premium quality — audits current design, identifies generic patterns, applies high-end standards | `.agents/skills/redesign-existing-projects/SKILL.md` |
| **shadcn** | shadcn/ui component patterns — CLI, composition, forms, styling, registry management | `.agents/skills/shadcn/SKILL.md` |
| **tailwind-css-patterns** | Tailwind CSS utility-first styling — responsive design, flexbox/grid, dark mode, component extraction | `.agents/skills/tailwind-css-patterns/SKILL.md` |
| **animate** | Building web animations from scratch — easing, springs, interruptibility, reduced motion, performance | `.agents/skills/animate/SKILL.md` |
| **animate-expo** | React Native/Expo animations — Reanimated worklets, Gesture Handler, haptics, UI-thread-only motion | `.agents/skills/animate-expo/SKILL.md` |
| **apple-design** | Apple design philosophy — fluid interfaces, spring physics, velocity handoff, materials, typography, design principles | `.agents/skills/apple-design/SKILL.md` |
| **emil-design-eng** | Emil Kowalski's UI polish philosophy — component design, animation decisions, invisible details | `.agents/skills/emil-design-eng/SKILL.md` |
| **review-animations** | Reviewing animation code against a high craft bar — 10 non-negotiable standards, block/approve verdict | `.agents/skills/review-animations/SKILL.md` |
| **capacitor-best-practices** | Capacitor app development — project structure, plugin usage, performance, security, deployment | `.agents/skills/capacitor-best-practices/SKILL.md` |
| **capacitor-accessibility** | Accessibility in Capacitor apps — screen readers, semantic HTML, focus management, WCAG compliance | `.agents/skills/capacitor-accessibility/SKILL.md` |

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
| 04 | [Theme System](./04-theme-system.md) | Theme contract, color tokens, light/dark model — slate-navy locked | Current |
| 05 | [Navigation Shell](./05-navigation-shell.md) | Bottom nav (no blur), drawer, search, AI, sheets — tablet bottom nav locked | Current |
| 06 | [Component Patterns](./06-component-patterns.md) | KPI cards (shipped 4-currency model), activity, alerts, audit, FAB, sheets | Current |
| 07 | [Forms](./07-forms.md) | Invoice form, line items, field layout, validation | Current |
| 08 | [Tables and Data](./08-tables-and-data.md) | Data surfaces, columns, sorting, mobile tables | Current |
| 09 | [Documents](./09-documents.md) | Invoice, quotation, waybill, CSR view UX | Current |
| 10 | [Loading and Refresh](./10-loading-and-refresh.md) | Loading states, refresh behavior, progress indicators | Current |
| 11 | [Accessibility](./11-accessibility.md) | WCAG, touch targets, keyboard, screen readers | Current |
| 12 | [Capacitor Native](./12-capacitor-native.md) | Safe areas, status bar, keyboard, splash | Current |
| 13 | [AI Integration](./13-ai-integration.md) | Gateway, use cases, client setup, deployment — locked, deferred | Current |
| 14 | [Implementation Roadmap](./14-implementation-roadmap.md) | Phased plan, dependencies, milestones | Current |
| 15 | [Interaction Model](./15-interaction-model.md) | Platform-idiomatic Android patterns on shadcn+vaul, brand slate-navy (NOT Material 3) | Current |
| 16 | [Context Switchers](./16-context-switchers.md) | Company Switcher (drawer) & Workspace Switcher (Settings) — multi-tenant context selection UX | Current |
| 17 | [App Entry and Onboarding](./17-app-entry-and-onboarding.md) | App launch, authentication, sign-up, onboarding, workspace/company setup, dashboard arrival — UX specification | Current |
| — | [Design.md](./Design.md) | Authoritative visual design system & theme contract — tokens, components, theme power matrix, anti-patterns | Current |

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
| Final palette: slate-navy (light `#f0f4f8`/`#1e3a5f`, dark `#0f172a`/`#60a5fa`) | ✅ Locked — slate-navy confirmed over alternatives | 04-theme-system.md, Design-direction/dashboard/mobile-dashboard-v6.html |
| Tablet navigation: bottom nav (phone pattern, expanded spacing) — not side rail | ✅ Locked | 02-mobile-first-model.md, 05-navigation-shell.md |
| Bottom nav visual: solid/near-solid `var(--nav)` + `var(--shadow-float)`, no glassmorphism | ✅ Locked | 05-navigation-shell.md |
| Shipped KPI model: Total Invoiced / Collected This Month / Outstanding Receivables / Overdue Balance (all currency) | ✅ Locked | 06-component-patterns.md, `src/config/kpiCards.ts`, `src/hooks/useDashboardData.ts` |

## Pending Decisions

| Decision | Priority | Blocked By |
|----------|----------|------------|
| Desktop sidebar design | Medium | 02-mobile-first-model.md |
| Foldable posture behavior | Medium | 02-mobile-first-model.md |
| Table column priority system | Medium | 08-tables-and-data.md |
| Document view layout | Low | 09-documents.md |
| Breakpoint values | Medium | 02-mobile-first-model.md — proposal in 02 §Breakpoint Strategy, awaiting confirmation |

> Tablet navigation is no longer pending — locked to bottom nav per `02-mobile-first-model.md:02` rationale ("tablet is expanded mobile, not shrunk desktop"). Palette is no longer pending — locked to slate-navy.

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
