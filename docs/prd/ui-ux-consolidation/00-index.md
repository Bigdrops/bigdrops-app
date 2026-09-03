# UI/UX Consolidation PRD

**Project:** BIGDROPS UI/UX Architecture Consolidation  
**Status:** Active — Design System Selection Pending  
**Date:** 2026-06-30 (revised 2026-08-28)  
**Author:** AI Codebase Analysis

---

## Purpose

Unify and clean up BIGDROPS's fragmented UI layer. Consolidate redundant patterns, remove dead code, standardize component architecture, and establish a single design token system. **The specific design language (e.g. Divine Blood, or another system) is yet to be selected.** D-017 and D-018 are superseded until a design choice is made.

The chosen design system will replace all existing theme layers:
- shadcn HSL color tokens (`index.css`)
- BigDrops `--bd-*` tokens (`formTheme.css`)
- Tailwind config colors

## Success Criteria

- [ ] Design system selected and documented
- [ ] All `--bd-*` tokens replaced with chosen system's tokens
- [ ] shadcn HSL color tokens replaced with chosen system's tokens
- [ ] Tailwind config colors aligned to chosen palette
- [ ] Exactly 2 visual modes: Light and Dark
- [ ] All other themes deleted
- [ ] CSS Module pattern files reduced from 6× identical copies to 1 shared source
- [ ] Dead CSS tokens removed
- [x] ~~Unused `App.css` removed~~ (completed)
- [x] ~~New/Edit page pairs unified into single components per module~~ (Invoice, Waybill, Quotation, CSR — completed)
- [ ] No visual regressions — existing tests pass

## Stakeholder Impact

| Role | Impact |
|---|---|
| Frontend engineers | Less code to maintain, single source of truth for patterns |
| QA | Fewer surfaces for regressions |
| Product | Faster iteration on form/view changes |
| New hires | Shorter onboarding — fewer patterns to learn |

## Non-Goals

- No changes to `src/lib/Calculations.ts`
- No changes to PDF rendering pipeline
- No removal of existing functionality
- No new CSS frameworks or libraries

## Superseded Decisions

| ID | Decision | Reason | Date Superseded |
|----|----------|--------|------------------|
| D-017 | Divine Blood Is the Design Language | Design system not yet chosen by stakeholder | 2026-08-28 |
| D-018 | Delete All Themes Except Light/Dark | Dependent on D-017 which is superseded | 2026-08-28 |
