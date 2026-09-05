# Ticket UX-002 — Dashboard identity shows hardcoded workspace line and fallback chain

Status: OPEN (UX presentation defect — not data leakage)
Source investigation: tenant-isolation provenance pass, 2026-09-05
Related PRD: Adaptive Mobile-First UIUX Facelift PRD

## Provenance (established, not assumed)

- `src/components/dashboard/DashboardOverview.tsx` renders a hardcoded
  eyebrow: `BIGDROPS WORKSPACE`.
- Line two renders `userName || businessName || 'Bigdrops'`, where
  `businessName = settings?.company_name || 'Bigdrops Workspace'`
  (`src/pages/DashboardRedesign.tsx`) and `userName` is the auth
  metadata first name or empty.
- Neither line shows the actual workspace slug, and the fallback chain
  can display generic product text that reads as company identity.

## Defect

- The header cannot answer "which workspace / which company am I in".
- Desired direction (not finalized, do not implement here): line 1 =
  workspace slug; line 2 = company/user with greeting. Two lines only.

## Acceptance

- Header always reflects the active workspace and company/user.
- No hardcoded product text in the identity position.
- Loading state does not flash a wrong identity.

## Out of scope

- Changing EntityProvider or tenant resolution.
- Any database change.
