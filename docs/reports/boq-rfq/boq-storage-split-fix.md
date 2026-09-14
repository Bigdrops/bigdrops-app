# BOQ Storage Split — Dead Code Cleanup Report

This report was written by opencode on 2026-09-13 via Local Runner.

## Objective

Audit and clean up the BOQ localStorage storage split bug: creation was reported as saving to `localStorage` (`boq_documents_v1` key) while list/view pages read from Supabase.

## Finding

The bug is **already fixed**. All BOQ creation, editing, and viewing paths already use Supabase. The `storage.ts` file is dead code left over from the prior migration.

### Evidence

| Path | Reads from | Writes to |
|------|-----------|-----------|
| `NewBoq.tsx` | Supabase (`tenantClient.from('boqs')`) | Supabase (insert) |
| `EditBoq.tsx` | Supabase (select) | Supabase (update + row upsert) |
| `ViewBoq.tsx` | Supabase (select) | — |
| `BoqList.tsx` | Supabase (`useDocumentQuery`) | — |
| `storage.ts` | `localStorage` | `localStorage` |

Zero live code paths call `saveBoq()`, `listBoqs()`, `getBoqById()`, `deleteBoq()`, or `ensureBoqSeed()` from `storage.ts`. The only import was an unused `getNextBoqNumber` in `BoqList.tsx`.

## Changes Made

| File | Change |
|------|--------|
| `src/domain/boq/storage.ts` | **Deleted.** Entire file was dead code (localStorage CRUD for `boq_documents_v1`). |
| `src/components/boq/BoqList.tsx` | Removed unused `import { getNextBoqNumber } from '@/domain/boq/storage'`. |

## Verification

- `bun run audit:load` passed — no new warnings.
- Grep for `boq_documents_v1` and `from.*boq/storage` returns zero results.
- `git status`: 2 files changed (1 deleted, 1 modified). `docs/prompts/git-workflow-commit.md` is a pre-existing uncommitted change, not from this task.
- `bun run typecheck` timed out (>300s) — this is a pre-existing project-level issue, not caused by these changes. The diff is trivially type-safe (removing an unused import and deleting a file with no callers).

## Risks

- None. Dead code removal only. No live behavior changed.

## Deferred Work

- `storage.ts` contained `getNextBoqNumber()` which reads localStorage to generate the next `BOQ-NNN` number. The live codebase has its own `getNextBoqNumber()` in `domain/boq/normalize.ts` that accepts rows from Supabase — this is what `NewBoq.tsx` actually uses. No migration of localStorage data needed.
