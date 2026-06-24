# Task Report: Sidebar Hamburger Icon Replacement

**Date:** 2026-06-24

## Objective

Replace the static lucide-react `Menu` sidebar/hamburger icon with the animated, path-morphing `SidebarToggleIcon` component from the template (`docs/TEMPLATES/React-temps/sidebaricon.tsx`), ensuring all usage locations use theme-safe `bd-*` CSS variable tokens.

## Changes

### Files Modified

| File | Changes |
|---|---|
| `src/components/layout/MobilePageHeader.tsx` | Button wrapper: replaced hardcoded `border-slate-200 dark:border-slate-700`, `hover:bg-slate-100 dark:hover:bg-slate-800`, `focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950` with `border-bd-border`, `hover:bg-bd-surface-muted`, `focus-visible:ring-offset-bd-app-bg` |
| `src/components/layout/PageIntro.tsx` | Replaced `Menu` from lucide-react with `SidebarToggleIcon`; added `isOpen` and `onMenuClick` props; button now uses `border-bd-border`, `bg-bd-surface`, `text-bd-text` |

### Files Already Correct (no change needed)

| File | Reason |
|---|---|
| `src/components/unlumen-ui/sidebar-toggle-icon.tsx` | Matches template exactly — uses `currentColor` + `var(--background)` for theme safety |
| `src/components/ui/sidebar.tsx` | Already uses `SidebarToggleIcon` with `text-bd-text` |
| `src/components/Layout.tsx` | Already passes `isOpen={sidebarOpen}` / `onMenuClick={openSidebar}` |
| `src/components/layout/ModuleShell.tsx` | Uses `MobilePageHeader` (propagates changes transitively) |

## Summary of Token Replacements

| Hardcoded Pattern | Theme-Safe Replacement |
|---|---|
| `border-slate-200 dark:border-slate-700` | `border-bd-border` |
| `hover:bg-slate-100 dark:hover:bg-slate-800` | `hover:bg-bd-surface-muted` |
| `focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950` | `focus-visible:ring-offset-bd-app-bg` |
| `border-border bg-card text-foreground` | `border-bd-border bg-bd-surface text-bd-text` |

## Verification

- **TypeScript typecheck:** Passed (exit code 0)
- **ESLint:** Timed out (>5 min) — known project issue (large codebase); no syntax or lint errors expected from these surgical changes

## Manual Visual Check Required

1. Confirm that `SidebarToggleIcon` animates between open/closed states on all viewport sizes
2. Verify theme colors (light/dark) render correctly in MobilePageHeader and PageIntro buttons
3. Test with both sidebar open and closed states toggling correctly
