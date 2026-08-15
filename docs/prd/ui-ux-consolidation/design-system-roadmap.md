# Design System Roadmap

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Goal:** Replace all existing theme systems with Divine Blood as the single design language  
> **Source of Truth:** `docs/TEMPLATES/Designsdotmds/Divine-blood.md`

---

## Executive Summary

BIGDROPS previously had a **hybrid design system**: a shadcn CSS-variable layer (`index.css`), a BigDrops custom token layer (`formTheme.css`), Radix theme overrides, and scattered inline custom properties. **Divine Blood replaces all of these.** The system reduces to exactly two visual modes (Light and Dark) with a unified token set.

---

## Divine Blood Design Language

### Core Equation

```
LIGHT:  White + Gold + Crimson
DARK:   Black + Crimson + Gold
```

### Token Set

All tokens are defined in `docs/TEMPLATES/Designsdotmds/Divine-blood.md` Section 4.

**Light Tokens:**
```
--db-canvas:         #FFFFFF    (pure white)
--db-surface:        #FFFFFF
--db-surface-raised: #FFFFFF
--db-surface-soft:   #F5F5F5    (neutral gray, not beige)
--db-border:         #E5E5E5    (clean gray)
--db-border-strong:  #D4D4D4
--db-ink:            #171614
--db-ink-secondary:  #525252
--db-ink-muted:      #737373
--db-ink-faint:      #A3A3A3
--db-gold-500:       #F59E0B    (vibrant amber)
--db-crimson-500:    #A52A2A    (deep blood crimson)
```

**Dark Tokens:**
```
--db-canvas:         #0A0A0A    (deep black)
--db-surface:        #141010
--db-surface-raised: #1C1414
--db-surface-soft:   #261A1A
--db-border:         #3D2222    (crimson-tinted)
--db-gold-400:       #FBBF24    (bright gold)
--db-crimson-400:    #C43E3E
```

### Typography

| Role | Font | Weights |
|------|------|---------|
| UI (human interaction) | Instrument Sans | 400, 500, 600, 700 |
| Data (financial figures, IDs) | Berkeley Mono | 400, 500, 600, 700 |

### Design Rules

- Light mode: white surfaces dominate, gold is primary accent, crimson is secondary
- Dark mode: black surfaces dominate, crimson is primary accent, gold is secondary
- No blue as brand color
- No more than 2 visual modes
- Hairline borders (1px) — no thick borders as default
- Living material is atmospheric, not functional

---

## Migration: What Gets Replaced

| Old System | Location | Replacement |
|------------|----------|-------------|
| shadcn HSL tokens | `index.css :root` | Divine Blood `--db-*` tokens |
| BigDrops `--bd-*` tokens | `formTheme.css` | Divine Blood `--db-*` tokens |
| Tailwind config colors | `tailwind.config.cjs` | Divine Blood palette values |
| Radix theme overrides | `index.css .dark` | Divine Blood dark tokens |
| Ambient wave animations | `formTheme.css` | Living material per Divine-blood.md §20-21 |
| Form-specific theme | `formTheme.css` | Delete (merged into global tokens) |

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
