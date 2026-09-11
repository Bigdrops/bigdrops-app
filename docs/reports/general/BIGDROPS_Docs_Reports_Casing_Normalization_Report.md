# Docs Reports Casing Normalization Report

This report was written by Buffy on 2026-09-11 via Freebuff.

## Objective

Normalize stray `docs/Reports` casing references to the canonical `docs/reports` path. The repository tracks only the lowercase form. Windows stores folder names without case, so both spellings resolved to one physical folder. This caused confusing status output and non-portable path references.

## Scope

- Text references in tracked files: `docs/Reports` → `docs/reports`.
- Physical folder name on disk: `docs/Reports` → `docs/reports`.
- No code behavior changes. One source file (`src/lib/tipContent.ts`) changed one string constant that holds a docs path.

## Files changed

126 tracked files. Full list captured during execution via `git grep -lE "docs/Reports"`. Highlights:

- `README.md`
- `src/lib/tipContent.ts` (one string path)
- 5 files under `docs/Session-memories/`
- 4 files under `docs/prd/`
- 2 files under `docs/prompts/`
- 100+ files under `docs/reports/`, `docs/tickets/`

Also renamed on disk: `docs/Reports/` → `docs/reports/`. No git-visible path change. The index already used the canonical casing.

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

1. Confirmed with `git ls-files` that no tracked path uses `docs/Reports`. The canonical form is `docs/reports/<domain>/`.
2. Found 126 tracked files with `docs/Reports` text references via `git grep`.
3. Checked the subfolder convention. Existing tracked reports use lowercase `general/`, so all references now use fully lowercase paths.
4. Replaced `docs/Reports` with `docs/reports` in all 126 files. 250 line changes.
5. Renamed the physical folder with a two-step `mv` through a temp name. First two attempts failed with `Permission denied` because other processes held folder handles. The user closed them. The rename then passed.
6. Verified the folder name and all references.

## Verification result

Verification:
- `git grep "docs/Reports"`: no matches. All references normalized.
- `find docs -iname "Reports"`: no wrong-casing folders left. Only `docs/reports`.
- `git status`: 126 modified files, no deletions, no lost files.
- `bun run audit:load`: passed. Audit complete.
- `bun run typecheck`: passed. `tsc --noEmit` returned no errors.
- `bun run build`: skipped. Forbidden by hardware policy.

The verification gate ran clean even with the concurrent accounting work in the working tree.

## Notes

- Windows `mv` and `ren` cannot rename a folder while a process holds a handle on it. Errors were `Permission denied` and `Access is denied`. Processes observed: `opencode.exe`, `rendernode.exe`, `node.exe`.
- Concurrent agent work appeared during this task: `src/domain/accounting/index.ts` (modified), `src/domain/accounting/reversal.ts` (untracked), `supabase/migrations/20260909100000_gap2_reversal_boundary.sql` (untracked). These files were not touched, staged, or reverted. Per concurrent agent safety rules, they belong to another agent.

## Risks or limitations

- macOS or Linux checkouts will materialize the folder as `docs/reports` after this change. Windows checkouts keep their on-disk name until the local rename is done. This machine is done.
- None known for this change set. The full gate passed.

## Deferred work

- Optional: add a CI or lint rule that fails on `docs/Reports` to stop regressions.
- Optional: document the canonical `docs/reports/<domain>/` path rule in the docs contribution guide.
