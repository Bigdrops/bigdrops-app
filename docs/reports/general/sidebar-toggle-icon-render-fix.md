# Sidebar Toggle Icon — Render Fix Report

**Date:** 2026-06-24
**Status:** Fixed
**Change:** 1 line in 1 file (+1 line in template)

---

## Root Cause

The design token `--background` is defined in `src/index.css:15` as a bare HSL triplet:

```css
--background: 210 40% 98%;
```

The component consumed it directly without the project-standard `hsl()` wrapper:

```tsx
style={{ fill: "var(--background)" }}  /* resolves to fill: 210 40% 98% — INVALID */
```

All other consumers in the project wrap `var(--background)` in `hsl()` (31/32 references across `index.css`, `formTheme.css`, `tailwind.config.js`, components). This was the only bare usage.

## Effect

1. `fill: 210 40% 98%` is not a valid CSS `<color>`, so the browser rejects it.
2. The SVG `<svg fill="none">` default is inherited → inner panel becomes invisible.
3. Only the outer `<path fill="currentColor">` renders — producing a solid square appearance.

## Fix Applied

**`src/components/unlumen-ui/sidebar-toggle-icon.tsx:54`**

```diff
-        style={{ fill: "var(--background)" }}
+        style={{ fill: "hsl(var(--background))" }}
```

This is the identical pattern used by every other consumer in the project: `tailwind.config.js`, `index.css` backgrounds, `formTheme.css` color mixing, and `NotificationDrawer.tsx` fallback.

## Bonus Fix

**`docs/templates/React-temps/sidebaricon.tsx:54`** — Same bug, same fix. Prevents propagation to new components built from this template.

## Verification

| Check | Result |
|---|---|
| `eslint src/.../sidebar-toggle-icon.tsx` | No errors |
| `tsc --noEmit` (scoped, full project timeout) | Only spurious `--jsx` flag errors from running without `tsconfig.json` |

## Files Changed

| File | Change |
|---|---|
| `src/components/unlumen-ui/sidebar-toggle-icon.tsx:54` | `"var(--background)"` → `"hsl(var(--background))"` |
| `docs/templates/React-temps/sidebaricon.tsx:54` | Same |
