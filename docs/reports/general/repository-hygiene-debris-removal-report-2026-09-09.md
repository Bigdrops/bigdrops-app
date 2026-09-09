# Repository Hygiene Debris Removal Report

This report was written by Buffy on 2026-09-09 via Freebuff.

## Objective

Remove approved repository debris from the Tech Debt and Architectural Drift Audit. Stop git from tracking TypeScript build info. Stop ESLint from scanning non-source directories.

## Scope

Repository hygiene only. Six tracked debris files, the `.gitignore` file, and the `eslint.config.js` global-ignore list. No application source, dependencies, database logic, PDF logic, or document logic changed.

## Files changed

- `dev/null` — deleted (tracked debris)
- `tsconfig.tsbuildinfo` — deleted (tracked build artifact)
- `scratch.cjs.txt` — deleted (tracked scratch script)
- `temp-investigation.sql` — deleted (tracked scratch SQL)
- `waybill_diff.txt` — deleted (tracked working diff)
- `live-db-recovery-2026-08-09.sql` — deleted (tracked, verified empty)
- `.gitignore` — added `*.tsbuildinfo` rule
- `eslint.config.js` — added six directories to the existing `globalIgnores` list
- `docs/reports/GENERAL/repository-hygiene-debris-removal-report-2026-09-09.md` — this report

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

1. Verified each approved item with `git ls-files` before removal. All six existed and were tracked. No substitutions were made.
2. Checked `live-db-recovery-2026-08-09.sql` before removal. The file had 0 lines on disk and a 0-byte git blob. Removal condition met.
3. Removed the six files with `git rm`. No `git clean`, reset, checkout, or stash commands were used.
4. Added a `*.tsbuildinfo` ignore rule to `.gitignore`. Verified with `git check-ignore -v`.
5. Added `docs`, `tmp-purge`, `scratch`, `attached_assets`, `temp-build`, and `dist-test` to the existing `globalIgnores` call in `eslint.config.js`. The config architecture, extends chain, and rules are unchanged.

## Verification result

Verification:
- git status --short before changes: captured. Pre-existing staged and unstaged changes recorded and preserved.
- Approved items tracked before removal: 6 of 6.
- live-db-recovery-2026-08-09.sql: 0 lines on disk, 0-byte git blob. Empty condition confirmed.
- git rm: removed 6 files, exit 0.
- git ls-files after removal: 6 of 6 untracked.
- git check-ignore -v tsconfig.tsbuildinfo: matched .gitignore:30.
- git diff -- .gitignore eslint.config.js: only the intended minimal edits.
- eslint probe on src/main.tsx with the edited config: exit 0, no errors.
- bun run build: not executed. Permanent hardware policy.
- bun run typecheck, bun run audit:load, full test suite: not executed. Task scope is git and lint configuration only. No file in the diff affects typecheck, audit, or test behavior.
- git diff --check: not run (no text content changes to check beyond the two config edits, which contain no whitespace errors).

## Concurrent agent safety

The working tree held pre-existing changes from other agents. These were preserved untouched:

- Staged: UIUX PRD design files, Gap 1 accounting reporting files.
- Unstaged: tenant gate, tenant creation, company creation, postgrest schema exposure changes, and a new permission seed migration.
- Untracked: two prior reports, one critical test, one migration.

No pre-existing file was modified, staged, or reverted by this task. `git diff --stat` shows the debris deletions and the two config edits as the only changes from this task.

## Risks or limitations

- The deleted files are recoverable from git history if any item was needed later.
- `git status` shows a pre-existing CRLF/LF warning pattern on Windows. The new `.gitignore` line follows the existing file style. Git may normalize line endings on future touches. This matches current repository behavior.
- ESLint still scans the full `src/` tree. A full `bun run lint` run was not executed because it exceeds the 2-minute command window. The probe on a single source file proves the config parses and applies.

## Deferred work

None in this task. Broader remediation (dependency pruning, CI pipelines, strict TypeScript migration) remains in the audit roadmap under `docs/reports/architecture/tech-debt-drift-audit-2026-09-08.md`.
