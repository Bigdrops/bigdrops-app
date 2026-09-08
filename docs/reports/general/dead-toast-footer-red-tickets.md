# Dead Toast Cleanup and Footer Red Fix Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Close two tickets: remove dead toast infrastructure, and replace the
BatchActionFooter hardcoded red with the canonical destructive treatment.

## Scope

- Deleted 4 dead files. No other deletions.
- One class change in `BatchActionFooter.tsx`.
- Canonical toast path untouched. No visual or behavior change beyond the
  footer inheriting the canonical destructive color.

## Files changed

- Deleted: `src/hooks/use-toast.ts`
- Deleted: `src/components/ui/toast.tsx`
- Deleted: `src/components/document-view/hooks/useToastStack.ts`
- Deleted: `src/components/document-view/shared/DocumentToastViewport.tsx`
- Modified: `src/components/batch/BatchActionFooter.tsx`
- `docs/reports/GENERAL/dead-toast-footer-red-tickets.md` (this report)

## Skills used: NONE

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Dead toast infrastructure

- Verified zero imports of all four files across `src`, including tests,
  before deletion.
- `src/hooks/use-toast.ts` (Radix shim): no consumers. Deleted.
- `src/components/ui/toast.tsx` (Radix component): no consumers. Deleted.
- `useToastStack.ts` plus `DocumentToastViewport.tsx` (deprecated shims):
  only referenced each other. Deleted together.
- Kept `src/components/ui/toast/ExpandableErrorDetails.tsx`. The canonical
  `feedback.error` path imports it.

### BatchActionFooter red

- Replaced `bg-red-600 text-white hover:bg-red-500 disabled:bg-red-800`
  with `bg-destructive text-destructive-foreground hover:bg-destructive/90
  disabled:opacity-50`.
- The footer now inherits the canonical destructive treatment, including
  the recent solid-variant correction. Layout, actions, loading,
  and responsive behavior unchanged. No new token introduced.

## Verification result

Verification:

- `bun run typecheck`: passed
- `bun run audit:load`: not run (no data-layer contact)
- `bun run build`: not run (per ticket and hardware ban)
- Post-change reference search: zero imports of removed files, zero
  hardcoded red in `BatchActionFooter.tsx`
- `git status`: changes limited to the 4 deletions plus the footer edit
  (plus pre-existing staged plan docs and another agent's untracked vendor
  directory, both left intact)

## Risks or limitations

- Other files still carry hardcoded red status treatments (Periods,
  Receipts, Letters, auth pages). They are outside these tickets.

## Deferred work

- Tokenize remaining hardcoded red and green status treatments in a
  dedicated cleanup pass.
