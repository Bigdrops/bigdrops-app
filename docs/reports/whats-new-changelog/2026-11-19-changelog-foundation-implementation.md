# BOUXRE Changelog Foundation — Implementation Report

Date: 2026-11-19
Scope: PRD "Release Notes & Changelog Management" — initial foundation (Phases 0–3 feasibility)
Branch: `main`

## 1. Verified observations (fresh Phase 0)

- Root `AGENTS.md` read. Bun only; no `bun run build`; preserve all pre-existing work; no clean tree required.
- **Reference proposal missing.** `release-notes-changelog-proposal.md` does not exist anywhere in the repository or in the chat history. The only related design document is `docs/prd/assssss/azj.txt` ("BOUXRE Release-Notes v5"), an untracked file owned by concurrent activity. It was read as REFERENCE only, not renamed or modified.
- **Working tree changed during the audit.** Bolu Stage 3D work was committed by concurrent activity (`047e000c`), four PRD documents were deleted, and other files changed. All pre-existing changes were preserved; none were staged, committed, reverted or cleaned.
- Existing parser (`src/domain/appUpdate/changelog.ts`) has no HTML-comment handling and leaks comment text in the no-bullet fallback. It was left unchanged; the new changelog format strips IDs before notes reach it.
- Release workflow publishes a full GitHub Release before the Supabase policy PATCH; no prerelease/promotion path; tag `test-release-run<N>` is a mutable lightweight tag with no repo-level protection. No workflow, tag, release or Supabase state was touched.
- Git worker is a prompt document (`docs/prompts/git-workflow-commit.md`), not executable code. `.opencode/`, `.githooks/` and `commit-docs.ps1` layers described in `docs/standard/docs-commit-workflow-standard.md` were not verified as present in this turn; enforcement location remains UNKNOWN.
- 25 `test-release-*` tags exist; the earliest predate `CHANGELOG.md`. `git show <tag>:CHANGELOG.md` fails on those tags, which the foundation treats as an empty snapshot (a missing ref remains an error).

## 2. Implemented behavior

### Files created
- `CHANGELOG.md` — root changelog with `# BOUXRE Changelog`, empty `## Unreleased`, and an archive boundary. No historical entries invented.
- `changelog/ignored.txt` — tombstone file, one ID per line.
- `scripts/release/changelog.mjs` — pure core plus thin CLI. Commands: `init`, `verify`, `append`, `sync`, `ignore`, `archive`, `restore`, `compute-notes`.
- `scripts/release/reportProposals.mjs` — read-only report-to-proposal helper for the Git worker.
- Tests: `src/tests/critical/changelogFoundation.test.js`, `changelogWorkerIntegration.test.js`, `changelogSnapshotFeasibility.test.js`.

### Identity
- ID format `rel_<8 hex>`.
- Report-derived IDs are SHA-256 of a per-entry key `<report-path>#<n>`, so one report yields multiple distinct IDs. Text is not an input: manual edits never change identity.
- Operator bullets without a key get a random 8-hex ID on first append.
- Duplicate IDs, untagged bullets, malformed IDs and tombstoned IDs are rejected by `verify`.

### Human editability
- Visible format is `- Title: Detail`. ID comments sit on the line above and are stripped from release notes.
- `append` never rewords or reorders existing IDs; reprocessing is idempotent.
- Deleting an unshipped entry from the working file and running `sync` tombstones it. `restore --version` is the only untombstoning path.

### Archiving
- `archive --version --date --ids` moves entries into `## [version] - YYYY-MM-DD`, preserving text and IDs. Atomic: missing ID aborts with no change. Multiple releases accumulate archives without loss.

### Architecture neutrality
- The core has no concept of "shipped". `compute-notes(head, baseline)` takes an explicit baseline snapshot; callers decide whether that snapshot comes from a tag, a release asset, or anything else. No Supabase, GitHub, network or CI code was added. No schema, frontend, workflow or Git worker files were changed.

## 3. Tests actually executed

- `bun test` on the three new files: **30 pass, 0 fail**.
- Existing parser tests (`releaseDiscoveryState.test.js`, `productionUpdateDialog.test.js`): **20 pass, 0 fail**.
- `bun run audit:load`: exit 0 (pre-existing warnings reported; none from new files).
- `bun run typecheck`: exit 0.
- `bun run build`, `bun run lint`: not run, per repository constraints and scope.

## 4. Failed or unavailable checks

- One feasibility test initially failed because "invalid object name" was misclassified as an empty snapshot. Fixed; the final suite distinguishes missing file from missing ref and all tests pass.
- CLI entry-point guard failed twice under Bun on Windows due to path/URL escaping; fixed and verified (`bun scripts/release/changelog.mjs verify` → `changelog OK`).
- Live policy row, GitHub rulesets, re-run `run_number` behavior and empty-notes acceptance remain unverified (read-only scope).

## 5. Unresolved architectural questions

- Neither candidate is approved. The foundation supports both but decides neither.
- **Snapshot-derived**: tag immutability is unproven; policy `version_code` is not DB-enforced monotonic; a published release can be ahead of the policy.
- **Release-asset ledger**: no `consumed-ids.json` exists; full-release status does not currently prove policy synchronization.
- The reference proposal is missing, so Phase 1's required rename could not be performed. This needs the user's decision.
- Worker enforcement location is unknown; the prompt was not modified because no verified implementation was found.

## 6. Recommended next phase

1. Supply or authorize recovery of `release-notes-changelog-proposal.md`, or confirm `docs/prd/assssss/azj.txt` is the intended reference.
2. Decide the release-identification mechanism before any workflow change.
3. Only then extend `compute-notes`/`archive` callers with explicit, verified release-state handling and add the `changelog verify` required check.

## 7. Scope confirmation

No commits, pushes, tags, releases, deployments, Supabase writes, `.env*`/`.secrets/` reads, or unrelated file changes. Pre-existing working-tree changes were preserved. No architecture was selected or implementation readiness claimed.
