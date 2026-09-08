# Client Detail Redesign Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Redesign the Client Detail page for hierarchy, surface consistency, contrast, and mobile ergonomics. Preserve all data, routing, and business logic.

## Scope

- `src/pages/ClientDetail.tsx` (shell, tabs, error states)
- `src/components/client/workspace/ClientActionHeader.tsx`
- `src/components/client/workspace/ClientOverviewTab.tsx`
- `src/components/client/workspace/ClientDocumentsTab.tsx`
- `src/components/client/workspace/ClientProjectsTab.tsx`
- No data, query, permission, routing, or business-logic changes.

## Files changed

See Scope list plus this report.

## Skills used: mobile-app-ui-design, mobile-android-design, shadcn, tailwind-capacitor, material-3

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Surface correction (cement-white root cause)

- The page missed the dashboard `bg-background` content treatment, and components used raw shadcn `bg-card` plus hardcoded `text-zinc-*` values that ignore the BIGDROPS theme.
- The page shell now uses `bg-background` like the dashboard. All cards use `bg-bd-surface` with `border-bd-border`. All zinc and slate text and icon colors now use theme tokens.

### Hierarchy and scanning

- Metric cards now share one surface. Meaning comes from the value color (success or danger token) instead of full tinted fills. Values use tabular numerals.
- Recent Streams rows use a larger status chip, clearer title and date line, and a 44px chevron target with an accessible label.
- The contact card uses the page surface with muted icon chips.
- The overdue block keeps danger identity through tokens that work in dark mode.
- Projects use two columns on tablet and stay single column on phones.

### Contrast and theme

- Active tab underline uses the theme primary token instead of hardcoded black.
- All error boxes use danger tokens instead of light-only red shades.
- Document and project status pills use canonical status tokens with light and dark variants.
- Document-type chips keep solid fills for type identity. They already pass contrast in both themes.

### Touch ergonomics

- Back, edit, quick-action pills, row chevrons, and overdue View buttons now meet the 44px minimum target.
- The edit button gained an accessible label. Row chevrons gained accessible labels.

## Verification result

Verification:

- `bun run typecheck`: passed
- `bun run audit:load`: skipped (no schema, query, or data-layer logic touched)
- `bun run build`: not run (hardware ban)
- Hardcoded zinc, slate, soft-red, and soft-blue search in the touched files: only semantic shadcn tokens and intentional solid chips remain
- `git status`: working-tree changes limited to the five Scope files
- Runtime or device test: not performed (no claim made)

## Risks or limitations

- No on-device Android check was performed. Touch targets and drawer behavior follow proven app patterns but need device confirmation.
- Another agent committed prior session work and staged two ticket files plus a subset of this task's `ClientDetail.tsx` edits. The staged content matches this task. The index was left intact. Confirm with the team before any commit or unstage action.

## Deferred work

- Device validation on Android phone, foldable, tablet, and desktop.
- Empty-state guidance with actions (for example, create-first-document links).
- Consolidation of document-type chip colors into theme tokens during a dedicated design-token pass.
