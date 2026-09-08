# Client Detail Structural Implementation Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Implement the approved structural proposal
(`docs/reports/GENERAL/client-detail-structural-proposal.md`). Replace the
6-tab model with a prioritized single-page workspace. Preserve data,
queries, permissions, routes, and prefill behavior.

## Scope

- Rewrote `src/pages/ClientDetail.tsx` composition only. All loaders,
  request guards, and query semantics unchanged.
- Added 6 workspace components. Deleted 4 obsolete tab components.
- No schema, RLS, permission, or business-logic changes. No Danger Zone:
  no delete or archive capability exists, per proposal deferral.

## Files changed

- `src/pages/ClientDetail.tsx`
- Added: `ClientIdentityBar`, `MoneyPositionStrip`, `NeedsAttentionGroup`,
  `ClientCreateFab`, `ClientContactSection`, `GroupedHistory`
- Deleted: `ClientActionHeader`, `ClientOverviewTab`, `ClientProjectsTab`,
  `ClientDocumentsTab`
- `docs/reports/GENERAL/client-detail-structural-implementation.md`

## Skills used: mobile-app-ui-design, mobile-android-design, shadcn, tailwind-capacitor, material-3

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Removed the 6-tab bar and mixed Recent Streams chronology. No record
  appears twice on screen.
- Sticky identity bar: back, client name, live status line (overdue count,
  outstanding, or settled), overflow menu with Edit. Identity persists
  while scrolling.
- Money position replaces 4 equal cards: hero outstanding figure with
  settled state, plus invoiced and collected as secondary figures with
  tabular numerals.
- Needs Attention shows overdue invoices only (reliably derived from
  existing invoice data) and renders nothing when empty.
- Quick Create follows the FAB standard: shared `MobileFab` Plus control
  at standard placement opening a bottom sheet with the 5 destinations.
  Client prefill navigation state preserved exactly.
- Contact actions (call, email, directions) render only for available
  data. Full details sit in a disclosure, not a desktop aside.
- Grouped history per record type with counts, 3-row preview, inline
  expansion, and lazy full-list loading through the existing loaders.
  Section errors retry inline without disabling other groups.
- Responsive: single column on phones, 2-column main plus contact on
  tablet and desktop. Danger Zone omitted (no approved capability).

## Verification result

Verification:

- `bun run typecheck`: passed
- `bun run audit:load`: skipped (no schema, query, or data-layer changes;
  query semantics preserved)
- `bun run build`: not run (hardware ban)
- Remnant search for tabs and old components: zero matches
- `git status`: changes limited to Client Detail files plus this report
- Runtime or device test: not performed (no claim made)

## Risks or limitations

- Tab removal changes existing user habits. All destinations remain
  reachable, and deep routes are untouched.
- No on-device validation performed.
- Staged files from another agent were observed and left intact.

## Deferred work

- Delete or archive capability needs product, permission, and audit
  decisions before any Danger Zone build.
- Device pass on small phone, foldable, tablet, and desktop.
