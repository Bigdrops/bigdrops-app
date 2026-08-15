# UI/UX Consolidation PRD

**Project:** BIGDROPS UI/UX Architecture Consolidation  
**Status:** Draft  
**Date:** 2026-06-30  
**Author:** AI Codebase Analysis

---

## Purpose

Adopt **Divine Blood** as the single design language for BIGDROPS. Replace all existing theme systems (shadcn HSL tokens, BigDrops `--bd-*` tokens, Tailwind config colors) with the Divine Blood token set defined in `docs/TEMPLATES/Designsdotmds/Divine-blood.md`. Reduce to exactly **two visual modes** (Light and Dark). Delete all other themes.

Divine Blood is the source of truth for:
- Color tokens (light + dark)
- Typography (Instrument Sans + Berkeley Mono)
- Spacing, radius, shadows
- Component states (buttons, badges, status, nav)
- Living material rules
- Accessibility contrast requirements

## Success Criteria

- [ ] All `--bd-*` tokens replaced with Divine Blood `--db-*` tokens
- [ ] shadcn HSL color tokens replaced with Divine Blood hex tokens
- [ ] Tailwind config colors aligned to Divine Blood palette
- [ ] Exactly 2 visual modes: Light (white + gold + crimson) and Dark (black + crimson + gold)
- [ ] All other themes deleted
- [ ] CSS Module pattern files reduced from 6× identical copies to 1 shared source
- [ ] Dead CSS tokens removed
- [ ] Unused `App.css` removed
- [ ] New/Edit page pairs unified into single components per module
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
