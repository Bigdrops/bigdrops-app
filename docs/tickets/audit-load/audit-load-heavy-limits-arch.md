# Audit Load — Heavy Limits and Direct Supabase Calls

This report was written by GLM on 2026-08-26 via OpenCode.

---

## Objective

Track the remaining `bun run audit:load` warnings that are not covered by the bloat and broad-select tickets: [HEAVY] limits and the [ARCH] violation. [HEAVY] is severity `🚨`. The audit instructs teams to fix these to prevent regressions. Large fetch limits on mobile or slow networks cause memory pressure and long queries.

Source scan: `bun run audit:load`, 787 files scanned, 2026-08-26.

## HEAVY — Unusually High Query Limits

| # | Path | Limit | Severity |
|---|------|-------|----------|
| 1 | `src/domain/waybill/waybillMutations.ts` | 1000 | 🚨 |
| 2 | `src/modules/item-library/repositories/itemLibraryRepository.ts` | 5000 | 🚨 |
| 3 | `src/pages/WaybillFormPage.tsx` | 1000 | 🚨 |

Fix pattern: confirm each limit against real row counts, then paginate or lower the limit to a measured ceiling. Keep audit-trail behavior intact when touching waybill mutations (#1).

## ARCH — Direct Supabase Call in a Component

| # | Path | Severity |
|---|------|----------|
| 4 | `src/components/app/SetPasswordModal.tsx` | 🟠 |

Description: the component contains direct Supabase calls. Project architecture requires components to go through hooks or repositories. Move the call into a hook under the established Supabase layer.

## Related Tickets

- Broad selects share files with #1–#3: see `audit-load-query-broad-selects.md`.
- File-size violations across the codebase: see `audit-load-bloat-oversized-files.md`.

## Priority

1. `itemLibraryRepository.ts` (limit 5000, also has a broad select)
2. `waybillMutations.ts`
3. `WaybillFormPage.tsx`
4. `SetPasswordModal.tsx`
