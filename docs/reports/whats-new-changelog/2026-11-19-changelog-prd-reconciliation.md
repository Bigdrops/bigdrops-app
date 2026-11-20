# Changelog PRD Reconciliation — 2026-11-19

Scope: proposal recovery, PRD creation, architecture analysis. No implementation, workflow, tag, release, policy or Git-worker changes.

## 1. Proposal rename result

- Source `docs/prd/assssss/azj.txt` was read in full (153 lines) and hashed: SHA-256 `0BED2402F6CDC30EA434B38CF425A8100EB40C9EE83828540016A8A434C381C5`.
- It was copied to `docs/prd/release-notes-changelog-proposal.md`; the copy hashed identically, confirming no loss before the source was touched.
- Only the header was reframed: the exact original status line is preserved verbatim, and a reference-only note was added. The remaining 150 body lines were compared byte-for-byte against the source and are identical.
- The source was removed only after that verification. The rename is recorded here; no proposal recommendation was rewritten or promoted.
- The destination states: **Status: Reference proposal — not approved requirements.**

**Conflict recorded, not resolved silently:** proposal line 37 specifies report-derived IDs as SHA-256 of the report's repo-relative path only. The approved PRD requirement says one report can produce multiple entries with distinct IDs. The implemented foundation uses `<report-path>#<n>` keys (`scripts/release/reportProposals.mjs:36-45`), which satisfies the approved requirement. The proposal's conflicting line remains unchanged in the recovered document.

## 2. PRD creation result

Created `docs/prd/release-notes-changelog-prd.md` as a standalone requirements document. It separates DECISION / OBSERVATION / REFERENCE / PROPOSAL, defines the abstract release-consumption contract, evaluates five identity options, models eleven failure scenarios, and records the pending architecture decision. No release architecture is approved in it.

## 3. Evidence inspected

- Root `AGENTS.md` (governance, Bun-only, safe-work, no build).
- `docs/PROJECTSKILLINDEX.md` (skill discovery; no applicable web/research skill for this local documentation task).
- Recovered proposal `docs/prd/assssss/azj.txt` and destination proposal.
- `docs/reports/whats-new-changelog/2026-11-19-changelog-foundation-implementation.md`.
- `CHANGELOG.md`, `changelog/ignored.txt`.
- `scripts/release/changelog.mjs` (all 532 lines), `scripts/release/reportProposals.mjs` (all 74 lines).
- All three changelog foundation test files.
- `.github/workflows/build-android-test-release.yml` (key lines re-verified: 79-85, 417-437, 456-510).
- `supabase/migrations/20260914120000_app_release_policy.sql` (verified in the earlier audit; not re-read this turn, cited as prior OBSERVATION).
- `docs/prompts/git-workflow-commit.md` and `docs/standard/docs-commit-workflow-standard.md` (prior turn; worker is prompt-level).
- Git state: branch `main`, HEAD `047e000c6b99aa1fb9d8ddc68af47806ceedf686`, upstream `origin/main`.

**Earlier audit report:** the read-only evidence audit was delivered in chat and explicitly did not create a repository report. No standalone audit file exists; its findings are treated as prior-turn OBSERVATIONs and the decision-critical ones were re-verified against current workflow source this turn.

**Decision log:** no `docs/**/*decision*` file exists. No approved architecture decision record was found or created.

## 4. Verified foundation behavior

All claims below were checked against current source and tests:

- Empty `CHANGELOG.md` with `## Unreleased` and an archive boundary; no invented history.
- Tombstone file with header only.
- Pure core plus CLI; explicitly architecture-neutral (`changelog.mjs:5-16`).
- Stable per-entry IDs from `<report-path>#<n>`; text-independent; one report → multiple IDs.
- Idempotent `append`; manual edits and ordering preserved; tombstoned IDs refused.
- `sync` tombstones deleted unshipped entries; `restore` is the only untombstoning path.
- Atomic `archive` preserving wording and IDs; multiple releases accumulate.
- `computeNotes` strips ID comments, throws on untagged entries, treats a missing changelog file as an empty baseline; missing refs remain caller-level errors.
- `verify` rejects untagged, orphaned, malformed, duplicate and tombstoned entries.
- Worker helper is read-only/offline and curates user-facing types.

Tests: 30 focused tests passed in the prior turn; 20 existing parser tests passed; `audit:load` and `typecheck` exited 0. No implementation code was changed this turn, so those results were not re-run.

## 5. Decisions versus unresolved proposals

**DECISION (user-approved, carried into PRD):** changelog as collection bucket; human editability; stable identity independent of wording; no report-path-only hashes; no fuzzy matching; multiple entries per report; tombstones; archive/restore; no schema/Supabase dependency; core independent of release identification; no implementation authorization in this task.

**REFERENCE, not approved:** the v5 proposal's snapshot-derived design, CI version-state table, conditional PATCH, asset GET check, required status check, and Git-worker rewrite. These are evaluated options only.

**PROPOSAL, pending:** the recommended commit-pinned snapshot plus explicit consumed-ID record; exact record location and state machine; collision policy; report-deletion/restoration rules; provenance display.

## 6. Architecture options and trade-offs

| Option | Strength | Blocking weakness |
| --- | --- | --- |
| Tag name identity | Simple; maps to run number | Lightweight mutable tags; no repo protection; name collision fails retry |
| Commit SHA / snapshot | Content-addressed; strong history | Needs a reachable commit and explicit consumed signal |
| Release metadata / asset | Native publication artifact | Body/assets editable; publication precedes policy write; no download verification today |
| Snapshot-derived (v5) | One boundary mechanism; no schema change | Depends on tag immutability and monotonic policy version, both unverified/unenforced |
| Hybrid commit + ledger | Removes tag/policy-skew dependency | Highest operational complexity; needs approval and new code |

Verified constraints driving the analysis: no tag protection in repo; `version_code` only checked `> 0`; full release published before policy PATCH; no public-asset GET; `prerelease` ignored by discovery. Publication alone is not consumption.

## 7. Recommended design (NOT approved)

Pin the release boundary to a verified commit SHA and record consumed entry IDs explicitly, treating tags and GitHub Releases as publication artifacts only. Gate archiving on both a verified artifact and a verified policy state, and make retries resume from that verified state rather than allocating a new version. This avoids the two verified failure modes: mutable tags and release-leading-policy. It is a recommendation only. The record location (in-repo ledger vs release asset), state machine, and workflow changes require explicit user approval.

## 8. Outstanding user approvals

1. Choose the release-identity/recovery model (§7 recommendation or an alternative).
2. Authorize the corresponding workflow changes, including any required tag protection, asset verification, and policy-write ordering.
3. Decide whether the Git worker prompt may later be changed to call the helper.
4. Decide the collision/provenance rules in PRD §3.

No implementation proceeds without approval 1 and 2.

## 9. Tests / checks performed

- Verified proposal copy by SHA-256 and byte-for-byte body comparison before deleting the source.
- Verified destination paths and absence of prior deliverables before creation.
- Re-verified workflow key lines and absence of tag-protection files with read-only commands.
- No build, lint, full test suite, typecheck, commit, push, tag, release, asset, or Supabase operation this turn.

## 10. Git state preservation

Initial: branch `main`, HEAD `047e000c6b99aa1fb9d8ddc68af47806ceedf686`, upstream `origin/main`, with pre-existing modified/deleted/untracked files including the changelog foundation.

Task-attributable changes: added `docs/prd/release-notes-changelog-proposal.md`, `docs/prd/release-notes-changelog-prd.md`, and this report; removed the untracked source `docs/prd/assssss/azj.txt` after verified recovery. No pre-existing change was staged, reverted, or modified. Final `git status --porcelain=v1` is recorded in the final response.

## 11. Completion status

Completed: proposal safely renamed, PRD reconciled, evidence checked, remaining decisions clearly presented.
