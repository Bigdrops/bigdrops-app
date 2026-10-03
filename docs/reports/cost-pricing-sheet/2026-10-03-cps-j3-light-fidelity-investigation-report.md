# CPS J3 Light Fidelity Investigation Report

This report was written by Codex on 2026-10-03 via Codex desktop.

## Objective

Restore CPS J3 light-mode fidelity to the source HTML candidate.

Do not redesign J3.

Do not use dark mode as an acceptance target.

## Scope

Primary implementation file:

- `src/components/cps/CpsJ3Form.tsx`

Reference inspected:

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html`

Mount context inspected:

- `src/pages/CpsFormPage.tsx`
- `src/components/app/AppShell.tsx`
- `src/lib/themePresets.ts`
- `src/index.css`

## Files Changed

- `src/components/cps/CpsJ3Form.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-j3-light-fidelity-investigation-report.md`

## Skills Used

Skills used: frontend-design, karpathy, redesign-existing-projects, superpowers:systematic-debugging, tailwind-css-patterns

Documentation standard: ASD-STE100 Simplified Technical English

## Causes Found

- The source HTML defined generic prototype variables on `:root`.
- The J3 TSX also used generic variables such as `--bg`, `--card`, `--soft`, `--ink`, and `--accent`.
- BIGDROPS applies theme semantic tokens to `document.documentElement` with inline styles in `AppThemeManager`.
- Those inline semantic tokens include generic names such as `--bg`, `--surface`, `--ink`, and `--accent`.
- Inline root variables have higher priority than stylesheet `:root` variables.
- This let BIGDROPS theme tokens change the J3 prototype palette after mount.
- The J3 prototype also set `data-theme` on `document.documentElement`.
- That global mutation let the J3 theme state affect the host app theme environment.
- `src/index.css` also applies app-level background, placeholder, input, and ambient shell rules.
- The J3 copy used broad selectors such as `*`, `html,body`, `button`, `input`, and `svg`.
- Those broad selectors were suitable for a standalone HTML file, but not for a mounted React subtree.

## Source Differences

The canonical source HTML light mode uses:

- Page background: `#eef2f7`
- Card and field surface: `#ffffff`
- Soft surface: `#f6f9fc`
- Primary text: `#0f172a`
- Secondary text: `#475569`
- Muted text: `#8b9ab0`
- Accent: `#1e3a5f`
- Cost: `#b45309`
- Selling and positive value: `#15803d`
- Group spine: `#1e3a5f`

The active J3 file had previous compensation changes before this task.

Those changes included stronger local surfaces, extra tints, extra shadows, and added token names that do not exist in the source HTML.

The final light-mode token values now match the source values where applicable.

## Fixes

- Scoped source HTML variables from `:root` to `.cps-j3-root`.
- Scoped the dark token block to `.cps-j3-root[data-theme="dark"]`.
- Scoped the prototype reset from global selectors to `.cps-j3-root` descendants.
- Moved the prototype theme attribute from `document.documentElement` to the J3 root element.
- Scoped responsive gutter variables to `.cps-j3-root`.
- Kept the accepted J3 layout, order, spacing, controls, and prototype behavior.
- Did not change routes, persistence, calculations, import, Cloudinary, numbering, PDF behavior, or CPS View.

## Verification Result

Verification:

- `bun run typecheck`: passed
- `git diff --check`: passed
- `git status`: modified `src/components/cps/CpsJ3Form.tsx`; untracked CPS reports present
- `supabase db push`: not applicable
- `bun run audit:load`: skipped. No schema, query, or data-layer logic changed.
- `bun run build`: skipped due to hardware policy

## Supabase Push Status

Not applicable.

No SQL changed.

No schema changed.

No migration changed.

## Risks Or Limitations

- Dark mode is not an acceptance target for this task.
- The source HTML still uses generic class names inside the J3 subtree.
- The variables and reset are now scoped, but class names remain source-faithful.

## Deferred Work

- Dark-mode design remains deferred.
- Production CPS wiring remains deferred.
- Save, import, Cloudinary, ClientSelector, production calculations, and production row operations remain deferred.
