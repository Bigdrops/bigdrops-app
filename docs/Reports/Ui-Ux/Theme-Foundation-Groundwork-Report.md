# BIGDROPS Theme Foundation Groundwork Report

This report was written by Buffy on 2026-08-28 via Freebuff.

---

## Objective

Establish the canonical BIGDROPS theme foundation and create a structured ledger of known design/UX issues for later, individually approved work.

---

## Scope

- Theme architecture audit
- Dark mode bridge token establishment
- Design issue ledger creation
- No dashboard, navigation, forms, document views, or other product areas redesigned

---

## Files Changed

| File | Change | Purpose |
|------|--------|---------|
| `src/styles/formTheme.css` | Modified — added `.dark` block with ~80 token overrides | Dark mode bridge tokens for `--bd-*` semantic layer |
| `docs/Reports/design-issue-ledger.md` | Created | 12 design/UX issues recorded for future approval |

---

## Skills Used

- NONE (audit and foundation task — no specific skill loaded)

---

## Documentation Standard

ADS-STE100 Simplified Technical English

---

## Theme Foundation

### What Was Changed

Added a comprehensive `.dark` class override block to `src/styles/formTheme.css`. This block maps every `--bd-*` bridge token to its dark mode equivalent using the existing shadcn HSL base tokens.

### Canonical Token Source

`src/styles/formTheme.css` is now the canonical bridge layer for semantic theme tokens. The token hierarchy:

```
Theme presets (themePresets.ts)
    ↓ override
CSS variables on :root (inline styles via themeTokens.ts)
    ↓ read by
--bd-* bridge tokens (formTheme.css)
    ↓ default to
shadcn HSL tokens (index.css)
    ↓ mapped by
Tailwind utilities (tailwind.config.js)
```

### Existing Systems Retained

| System | Status | Reason |
|--------|--------|--------|
| shadcn HSL tokens (`index.css`) | Retained | Foundation layer — all `--bd-*` tokens default to these |
| `--bd-*` bridge tokens (`formTheme.css`) | **Enhanced** | Now has dark mode overrides — canonical semantic layer |
| Theme presets (`themePresets.ts`) | Retained | Runtime override mechanism — 2 presets (bmw, modern-minimalist) |
| Theme token bundle (`themeTokens.ts`) | Retained | Applies/clears overrides on `:root` |
| Tailwind config (`tailwind.config.js`) | Retained | Maps CSS variables to utility classes |

### Light/Dark Behavior

**Light mode:** `--bd-*` tokens resolve to their `:root` defaults (bridged from shadcn HSL tokens).

**Dark mode:** `.dark` class on `<html>` triggers:
1. `index.css` `.dark` block changes shadcn HSL base tokens
2. `formTheme.css` `.dark` block overrides `--bd-*` bridge tokens to match dark surfaces
3. Tailwind `dark:` utilities activate for hardcoded color classes

All three layers now have dark mode support. Components using `bg-bd-surface`, `text-bd-text`, `border-bd-border`, etc. will now properly adapt to dark mode.

### Token Categories Covered in Dark Mode

| Category | Tokens | Count |
|----------|--------|-------|
| Base surfaces | `bd-app-bg`, `bd-surface`, `bd-surface-muted`, `bd-card-bg` | 4 |
| Text hierarchy | `bd-text`, `bd-text-muted`, `bd-text-soft` | 3 |
| Borders | `bd-border`, `bd-border-strong` | 2 |
| Inputs | `bd-input-bg`, `bd-input-border`, `bd-input-focus`, `bd-input-error` | 4 |
| Buttons | `bd-button-primary-bg`, `bd-button-primary-text` | 2 |
| Navigation | `bd-nav-active-bg`, `bd-nav-active-text`, `bd-nav-active-icon`, `bd-nav-hover-bg` | 4 |
| Overlays | `bd-overlay-bg`, `bd-overlay-text`, `bd-overlay-muted`, `bd-overlay-border`, `bd-overlay-scrim`, etc. | 12 |
| Action surfaces | `bd-surface-action`, `bd-surface-action-hover`, `bd-surface-action-border`, etc. | 6 |
| Status | `bd-status-{success,warning,danger,info,neutral}-{bg,text,border}` | 15 |
| Feedback | `bd-feedback-{success,error,warning,info}-{bg,text,border}` | 12 |
| Brand/Accent | `bd-brand`, `bd-brand-foreground`, `bd-accent`, `bd-accent-foreground` | 4 |
| Legacy shorthand | `bd-bg2`, `bd-bg3`, `bd-border-color`, `bd-text-color`, `bd-text2/3/4` | 7 |
| Hardcoded tones | `bd-amber`, `bd-indigo`, `bd-emerald`, `bd-rose`, `bd-violet` (+ bg/dark variants) | 15 |
| **Total** | | **~90 tokens** |

---

## Issue Ledger

### Ledger Path

`docs/Reports/design-issue-ledger.md`

### Number of Issues Recorded

**12 issues** (DI-001 through DI-012)

### Column Manager Entry

**DI-001** — Column Manager UX. The Column Manager sheet has small touch targets (14×14px grip handles, 18×14px reorder buttons) below the 44px minimum. Dual reorder mechanism (drag + arrows) creates cognitive overhead. Recorded for Phase 4 (Forms and Data Surfaces).

### Issue Severity Distribution

| Severity | Count | Issues |
|----------|-------|--------|
| High | 3 | DI-002 (tokens), DI-003 (CSS duplication), DI-004 (framer-motion) |
| Medium | 5 | DI-001 (Column Manager), DI-005 (toasts), DI-006 (audit trail), DI-007 (hardcoded colors), DI-008 (pull-to-refresh) |
| Low | 4 | DI-009 (settings), DI-010 (search), DI-011 (skeletons), DI-012 (ambient animations) |

---

## Verification

- `bun run typecheck`: passed
- `bun run audit:load`: not required (UI/theme-only change, no schema/query/data-layer logic touched)
- `bun run build`: **NOT executed** (hardware policy — 4GB RAM constraint)
- `git status`: 2 files changed (1 modified, 1 created)

---

## Risks and Limitations

- **Dark mode bridge tokens use HSL format.** The `--bd-*` tokens in dark mode use HSL triplet format (e.g., `142 71% 55%`) which is consistent with shadcn convention. Components must continue using `hsl(var(--bd-*))` for proper resolution.
- **Hardcoded `dark:` Tailwind classes are not addressed.** ~90 components use `dark:bg-slate-900` style classes that bypass the token system. These are recorded as DI-007 and require incremental migration.
- **Theme presets still override at runtime.** The BMW and Modern Minimalist presets set inline styles on `:root` via `applyThemeTokenBundle()`. The dark mode bridge tokens in `formTheme.css` provide defaults that the presets can override. This is by design.
- **Ambient background animations remain.** The `.app-ambient` animations in `index.css` are recorded as DI-012 but not removed in this pass.

---

## Deferred Work

The following areas remain unimplemented and require separate approval:

- Dashboard redesign (Phase 2)
- Navigation & shell refinement (Phase 3)
- Document form improvements (Phase 4)
- Document view consolidation (Phase 5)
- Reports & discovery (Phase 6)
- Desktop adaptation (Phase 7)
- Accessibility polish (Phase 8)
- Final visual refinement (Phase 9)
- Column Manager redesign (DI-001)
- framer-motion removal (DI-004)
- Toast system consolidation (DI-005)
- CSS Module deduplication (DI-003)
- Token system full consolidation (DI-002)
- Hardcoded color migration (DI-007)

**STOP after this task. Do not continue into the next facelift phase automatically.**

---

*Report written by Buffy on 2026-08-28 via Freebuff.*
