# Ticket UX-001 — Recent Activity shows unscoped local BOQs with dead navigation

Status: OPEN (UX presentation defect — not data leakage)
Source investigation: tenant-isolation provenance pass, 2026-09-05
Related PRD: Adaptive Mobile-First UIUX Facelift PRD

## Provenance (established, not assumed)

- Dashboard Recent Activity BOQ rows come from `listBoqs()` in
  `src/domain/boq/storage.ts`, which reads the browser-local
  `localStorage` key `boq_documents_v1`.
- That store has no workspace/entity key. The same rows render in every
  tenant on the same browser.
- `useDashboardData.buildRecentDocs` tags them `status: 'Local'`
  (the LOCAL badge). Clicking navigates to `/boqs/:id`, which resolves
  against the tenant database, so locally-only rows land nowhere.
- Tenant `boqs` tables are empty in the investigated tenants. No
  cross-tenant database records exist.

## Defect

- A new/empty tenant lists another session's local BOQs as its own
  recent activity, with a LOCAL badge the user cannot interpret, and
  entries that do nothing when tapped.

## Acceptance

- Empty tenant shows a true empty state (no foreign rows).
- Every listed entry navigates to a real record.
- If local BOQs remain supported, they are labeled by origin and scoped
  or migrated explicitly — never silently mixed with tenant rows.

## Out of scope

- Changing BOQ persistence architecture (separate decision).
- Any database migration.
