# Design System Roadmap

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Goal:** Replace all existing theme systems with a single design language  
> **Status:** Design system selection pending — D-017 (Divine Blood) superseded 2026-08-28  
> **Source of Truth:** TBD — stakeholder to select

---

## Executive Summary

BIGDROPS currently has a **hybrid design system**: a shadcn CSS-variable layer (`index.css`), a BigDrops custom token layer (`formTheme.css` with 196 `--bd-*` definitions), Radix theme overrides, and scattered inline custom properties. **A single design language will eventually replace all of these.** The specific system is yet to be chosen by the stakeholder.

---

## Current State

### Existing Token Systems

| System | Location | Definitions |
|--------|----------|-------------|
| shadcn HSL tokens | `index.css :root` | ~30 color tokens |
| BigDrops `--bd-*` tokens | `styles/formTheme.css` | 196 definitions |
| Tailwind config colors | `tailwind.config.cjs` | Extends default palette |
| Radix theme overrides | `index.css .dark` | Dark mode tokens |

### Active Visual Modes

- Light mode (default)
- Dark mode (`.dark` class)

### Typography

| Role | Font | Weights |
|------|------|---------|
| UI | Inter (system default) | 400, 500, 600, 700, 800 |
| Monospace | System monospace | Default |

### Next Steps

1. Stakeholder selects a design language
2. Create token mapping from current `--bd-*` / shadcn to new system
3. Execute phased migration per this roadmap

---

## Migration Plan (Pending Design Choice)

| Old System | Location | Action |
|------------|----------|--------|
| shadcn HSL tokens | `index.css :root` | Replace with chosen system |
| BigDrops `--bd-*` tokens | `styles/formTheme.css` | Replace with chosen system |
| Tailwind config colors | `tailwind.config.cjs` | Align to chosen palette |
| Radix theme overrides | `index.css .dark` | Replace with chosen dark tokens |
| Form-specific theme | `styles/formTheme.css` | Delete after migration |

**Critical:** `formTheme.css` still exists and is imported in `main.tsx`. It contains 196 `--bd-*` definitions that are actively used across the codebase.

---

## Phase 1: Token Replacement (Week 1-2)

### Goals
1. Replace all `--bd-*` tokens with `--db-*` Divine Blood tokens
2. Replace shadcn HSL color tokens with Divine Blood hex tokens
3. Delete `formTheme.css` (merge surviving rules into `index.css`)
4. Update Tailwind config to use Divine Blood palette

### Actions

| Action | File | Effort |
|--------|------|--------|
| Replace `--bd-*` token definitions with `--db-*` | `index.css`, `formTheme.css` | 1 day |
| Replace shadcn HSL tokens with Divine Blood hex | `index.css :root` | 1 day |
| Merge surviving formTheme.css rules into index.css | Both | 0.5 day |
| Delete `formTheme.css` | `src/styles/formTheme.css` | 5 min |
| Update Tailwind config colors to Divine Blood | `tailwind.config.cjs` | 0.5 day |
| Grep all source files for raw `--bd-*` references | All `.tsx` files | 0.5 day |
| Replace `--bd-*` references with `--db-*` | Component files | 1 day |

### Deliverable
- Single CSS variable layer: Divine Blood `--db-*` tokens in `index.css`
- `formTheme.css` deleted
- Tailwind config aligned to Divine Blood
- No `--bd-*` references remain in source

---

## Phase 2: Component Token Migration (Week 2-3)

### Goals
1. Update all component CSS to use `--db-*` tokens
2. Remove old shadcn `--primary`, `--muted`, `--destructive` references
3. Align button, badge, status, and nav styles to Divine Blood
4. Ensure dark mode uses Divine Blood dark tokens

### Actions

| Action | Effort |
|--------|--------|
| Update button variants to Divine Blood (primary = ink surface, gold accent) | 1 day |
| Update badge/status colors to Divine Blood palette | 0.5 day |
| Update nav active state to Divine Blood (surface-soft + gold indicator) | 0.5 day |
| Update form input focus states to gold | 0.5 day |
| Update card/panel surfaces to Divine Blood tokens | 0.5 day |
| QA pass: light mode visual consistency | 1 day |
| QA pass: dark mode visual consistency | 1 day |

### Deliverable
- All components use Divine Blood tokens
- Light and dark modes visually consistent
- No legacy token references

---

## Phase 3: Cleanup & Polish (Week 3-4)

### Goals
1. Remove all dead CSS (old token references, unused animations)
2. Add Divine Blood living material where appropriate
3. Ensure WCAG 2.2 AA contrast compliance
4. Document the design system

### Actions

| Action | Effort |
|--------|--------|
| Remove dead CSS tokens and unused @keyframes | 0.5 day |
| Add `prefers-reduced-motion` support globally | 0.5 day |
| Audit contrast ratios against Divine Blood verified table | 0.5 day |
| Update component documentation | 1 day |
| Final `bun run audit:load` + `bun run typecheck` | 0.5 day |

### Deliverable
- Clean CSS with no dead code
- WCAG 2.2 AA compliant
- Documented design system

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Token rename breaks component styles | High | Find-and-replace with visual diff per component |
| Dark mode regression | Medium | Dedicated dark mode QA pass after Phase 1 |
| Living material conflicts with existing animations | Low | Remove old animations, add Divine Blood living material per §20-21 |
| Berkeley Mono licensing | Medium | Use fallback monospace until license confirmed |

---

## Verification Gate

After each phase:
```bash
bun run audit:load
bun run typecheck
bun run lint
bun run test
```

Visual verification:
- Light mode: all surfaces white, gold accents vibrant, crimson restrained
- Dark mode: all surfaces dark, crimson prominent, gold restrained
- No cream/beige/brown tones anywhere
- No blue as brand color
