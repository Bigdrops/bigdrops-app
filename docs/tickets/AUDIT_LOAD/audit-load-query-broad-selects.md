# Audit Load — Broad Selects on List Queries

This report was written by GLM on 2026-08-26 via OpenCode.

---

## Objective

Track all `bun run audit:load` [QUERY] warnings. The audit flags `select('*')` on list queries. These warnings are severity `❌`. The audit instructs teams to fix them to prevent regressions. Broad selects fetch unused columns and can bypass column pruning as schemas grow.

Source scan: `bun run audit:load`, 787 files scanned, 2026-08-26.

## Files

| # | Path | Severity |
|---|------|----------|
| 1 | `src/components/csr/CsrFormScreen.tsx` | ❌ |
| 2 | `src/config/moduleAdapters.ts` | ❌ |
| 3 | `src/domain/rfq/rfqService.ts` | ❌ |
| 4 | `src/modules/item-library/repositories/itemLibraryRepository.ts` | ❌ |
| 5 | `src/modules/reports/repositories/reportRepository.ts` | ❌ |
| 6 | `src/pages/ComplianceHub.tsx` | ❌ |

## Fix Pattern

1. Replace `select('*')` with an explicit column list.
2. Keep the list in one place per module, next to the module's row type.
3. Verify no consumer reads a dropped column before removal.

One file (#3) is a domain service and two files (#4, #5) are repositories. Those are the correct homes for query shaping. Files #1, #2, and #6 violate the project rule that components must not fetch directly; move those queries to hooks or repositories while fixing the select.

## Notes

- Per AGENTS.md, this fix also closes the [ARCH] violation risk for #1 and #6.
- Do not change business behavior. Column lists must match what each consumer renders.

## Priority

Repositories first: #4, #5. Then services: #3. Then component-level fetches: #1, #2, #6.
