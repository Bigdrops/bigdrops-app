# Design System Roadmap

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Goal:** Converge on a single, consistent design system from the current hybrid of shadcn tokens + BigDrops custom theme + inline styles

---

## Executive Summary

BIGDROPS currently has a **hybrid design system**: a shadcn CSS-variable layer (`index.css`), a BigDrops custom token layer (`formTheme.css`), Radix theme overrides, and scattered inline custom properties. The two CSS files (1083 combined lines) mix concerns — shadcn tokens are duplicated in Radix-compatible and Tailwind-compatible formats, and formTheme.css carries ~30% potentially unused tokens. The design system roadmap proposes a 3-phase convergence: clean → consolidate → componentize.

---

## Current State

### CSS Architecture

```
index.css (567 lines)
├── @tailwind base/components/utilities
├── :root — shadcn CSS variables (hsl format) — 32 color tokens
├── dark/light .dark theme blocks
├── @layer base — default styles (h1-h6, p, etc.)
├── .rdp-* — React DayPicker overrides
├── @keyframes animations (fade-in, zoom-in, slide-in, etc.)
├── .dark theme overrides for Radix select/dropdown
└── ambient background animation keyframes

formTheme.css (516 lines)
├── :root — BigDrops brand tokens (--bd-*) — 32 tokens
├── BigDrops ambient animations (@keyframes + .bd-* classes)
├── BigDrops form component styles (.bd-form-*)
├── BigDrops sheet animation styles
└── Dark theme overrides (partial)
```

### Token Inventory

| Token Set | Count | Source | Format |
|-----------|-------|--------|--------|
| shadcn HSL | 32 | index.css :root | `--primary: 222.2 47.4% 11.2%` |
| BigDrops brand | 32 | formTheme.css :root | `--bd-primary: #003049` |
| Tailwind theme | ~30 | tailwind.config.cjs → extend | colors, fonts, spacing |

### Overlap

- `--bd-primary: #003049` has no equivalent in shadcn's `--primary: hsl(222.2 47.4% 11.2%)` — they serve different purposes
- `--bd-surface-muted: #EBE9E7` approximates `--muted: hsl(210 40% 96.1%)` but is not intentionally synchronized
- `--bd-success`, `--bd-warning`, `--bd-error` overlap with shadcn's `--success`, `--warning`, `--destructive` but use hex values vs hsl

---

## Phase 1: Clean (Current + 1 Month)

### Goals
1. Remove dead CSS from formTheme.css (~30% assumed unused)
2. Deduplicate overlapping animation classes
3. Remove any Tailwind v4 syntax if present (project is on v3.4)
4. Ensure `App.css` is deleted (it's not imported)

### Actions

| Action | File | Effort |
|--------|------|--------|
| Audit formTheme.css — remove unused tokens | formTheme.css | 1 day |
| Delete App.css | src/styles/App.css | 5 min |
| Deduplicate @keyframes between index.css and formTheme.css | Both | 1 day |
| Standardize duration/timing-function for all animation utilities | index.css | 0.5 day |
| Verify no Tailwind v4 `@theme inline` directives | index.css | 5 min |

### Deliverable
- Single CSS variable layer (merged into index.css)
- Clean formTheme.css with only used tokens
- Removed dead styles

---

## Phase 2: Consolidate (1-3 Months)

### Goals
1. Merge BigDrops tokens into shadcn-compatible hsl format where possible
2. Create Tailwind v3-compatible `extend` theme that uses CSS variables
3. Standardize on single color naming convention (`--primary`, `--muted`, etc.)
4. Add missing semantic tokens (`--safe-area-top`, `--safe-area-bottom`)

### Actions

| Action | Effort |
|--------|--------|
| Convert bd-primary/bd-surface-muted etc. to hsl and merge into shadcn layer | 2 days |
| Create `tailwind.presets.ts` for cross-project sharing | 1 day |
| Add semantic border-radius scale (`--radius-sm`, `--radius-md`, `--radius-lg`) | 0.5 day |
| Add spacing scale as CSS variables (`--space-1` through `--space-12`) | 0.5 day |
| Add safe-area CSS variables for Capacitor | 0.5 day |
| Audit all components for inline `className` usage vs token reference | 2 days |

### Deliverable
- Single source of truth: `index.css` + `tailwind.config.cjs`
- Semantic tokens used in components, not raw values
- Capacitor safe area support

---

## Phase 3: Componentize (3-6 Months)

### Goals
1. Build missing UI primitives (input-group, button-group, drawer)
2. Enforce token usage via lint rule or ESLint plugin
3. Create `@/components/ui/` as canonical reference for all primitives
4. Optional: extract BigDrops UI Kit as npm package

### Actions

| Action | Effort |
|--------|--------|
| Build `input-group.tsx` from template reference | 1 day |
| Build `button-group.tsx` from template reference | 1 day |
| Adopt `reui/sortable` across all drag-to-reorder components | 2 days |
| Create ESLint rule to prefer semantic tokens over raw colors | 1 day |
| Convert CSR form to use shared UI primitives | 5 days |
| Remove dead components (sidebar, FormNavigation*) | 0.5 day |
| Document components with Storybook or JSDoc | 5 days |

### Deliverable
- Full UI component library with documentation
- No raw color/spacing values in component files
- All forms use shared layout primitives

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Token rename breaks component styles | High | Use find-and-replace with visual diff per component |
| Dead token removal removes used CSS | Medium | Use CSS coverage tool (Puppeteer coverage) before deleting |
| Merging CSS breaks dark mode | Medium | Dark mode QA pass after merge |
| Input-group/button-group not adopted | Low | Build as drop-in replacement, keep old APIs working during transition |

---

## Affected Files

- `src/styles/index.css` — token merge target
- `src/styles/formTheme.css` — audit + slim
- `tailwind.config.cjs` — add extend tokens
- `src/components/ui/input-group.tsx` — create
- `src/components/ui/button-group.tsx` — create
- `src/components/reui/sortable/` — adopt

---

## Future Considerations

- Design token sharing via `@bigdrops/tokens` npm package for future mobile app
- Component playground with Storybook 8
- Automated visual regression testing (Chromatic or Percy)
- Theme-builder UI in settings for brand color customization
