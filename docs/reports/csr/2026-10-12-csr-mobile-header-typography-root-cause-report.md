# CSR Mobile Header Typography Root-Cause Report

This report was written by Codex on 2026-10-12 via Local Runner.

Objective

Correct the actual style authority for the Customer Service Report mobile and fold header title.

Scope

- Mobile and fold CSR header foreground only.
- No desktop or tablet presentation changes.
- No CSR state, persistence, or document rule changes.

Files changed

- `src/components/csr/CsrFormPresentations.tsx`
- `docs/reports/csr/2026-10-12-csr-mobile-header-typography-root-cause-report.md`

Skills used: systematic-debugging, redesign-existing-projects, mobile-app-ui-design, tailwind-css-patterns, typescript-advanced-types, accessibility, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

Changes made

The mobile title is an `h1` in `CsrMobileFoldPresentation`.

The former Tailwind class, `text-[8.5px]`, did not control the title. `src/styles/formTheme.css` applies `font-size: var(--bd-font-h1-size) !important` to all `h1` elements. The default token value is `2.25rem`, or 36 CSS pixels.

The title now uses `!text-[20px]`. This is the scoped Tailwind override required to win against the confirmed global important declaration. The title has a 24-pixel line height. The header uses two content rows: title, then CSR number with theme and options actions.

The header top padding, separator spacing, and title-to-metadata gap are reduced. The action targets remain 40 by 40 CSS pixels.

The CSR decorative artwork in `src/pages/CsrFormPage.tsx` was not changed.

Verification result

- Static source trace: passed. The mobile/fold title is rendered by `CsrMobileFoldPresentation`.
- CSS precedence review: passed. `!text-[20px]` overrides the global `h1` font-size declaration.
- Desktop/tablet presentation review: unchanged.
- Decorative artwork review: unchanged.
- `bun run audit:load`: completed. It reported existing repository warnings and broad-query findings. This change did not add a data query.
- `bun run typecheck`: passed.
- `git diff --check`: passed.
- Supabase push: not applicable. No database work occurred.
- `bun run build`: not run. Hardware policy prohibits it.

Risks or limitations

No browser session is available to inspect the live computed style. The supplied screenshot may have been served by an outdated local bundle. User screenshot review is still required for visual acceptance.

Deferred work

None.
