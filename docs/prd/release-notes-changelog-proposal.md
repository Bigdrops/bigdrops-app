# BOUXRE Release-Notes v5: Spec and Implementation Prompt

Status: Reference proposal — not approved requirements.

Original status line: "Design locked on paper. Not yet implemented. Replaces v3 and v4 (all versions)."

> Reference note: This document is preserved as Claude's v5 proposal. Its recommendations are advisory only and are not approved requirements. Where it conflicts with an approved PRD or verified implementation, the approved requirement governs. No recommendation has been rewritten.

## 1. Decision

**Snapshot-derived consumption, with stable entry IDs and Git tombstones. No new Supabase column.**

- The active policy (`version_code`) says which release is live. That release's tag points at the exact commit that was built.
- `CHANGELOG.md` at that tag (`git show <tag>:CHANGELOG.md`) is the consumed snapshot.
- Entry IDs give identity across edits and reordering. Tombstones stop deleted entries from coming back. The tag only fixes the boundary, so there is one consumption mechanism, not two ledgers.

## 2. Evidence this rests on (from the read-only audit)

- The policy row has no SHA, tag, or ID history. `version_code` is only checked as `> 0` and is not monotonic in the database.
- `version_code = 1000 + run_number`, `version_name = 1.0.<run_number>`, tag is `test-release-run<N>`.
- The workflow publishes a full release before the policy update. A failed policy update leaves a public release and a retry collides on the tag check.
- The tag is created at `GITHUB_SHA` while checkout may use `inputs.ref`. They can differ on a custom-ref dispatch.
- `parseReleaseNotes()` drops comment lines when bullets exist, but with no bullets it joins every line into one entry and leaks the comment.
- The Git worker is a prompt document, not code. No `CHANGELOG.md`, IDs, or tombstones exist yet.
- Discovery is policy-driven, ignores `prerelease`, and filters drafts.

## 3. Definitions

| Term | Meaning |
| --- | --- |
| Shipped | The active policy's `version_code` maps to a tag, and the entry's ID is present in `Unreleased` at that tag. A public GitHub release alone is not shipped. |
| Pending | In `## Unreleased` at HEAD, not shipped, not tombstoned. |
| Archived | Moved under `## [versionName] - YYYY-MM-DD` after being shipped. |
| Tombstoned | Deleted by the operator before shipping. Listed in `changelog/ignored.txt`. Never re-added. |

## 4. Rules

### 4.1 Entry IDs

- Each bullet has its ID in an HTML comment on the line directly above it: `<!-- id: rel_8f31a2c4 -->`.
- Report-derived IDs are deterministic: `rel_` plus the first 8 hex characters of SHA-256 of the report's repo-relative path. The agent cannot mint a different ID for the same report.
- Operator-written bullets get a random 8-hex ID the first time the script sees them. Existing IDs are never regenerated or changed.
- Duplicate IDs are an error. Editing text or reordering never touches IDs.
- Visible lines stay `- Title: User-facing detail`. No fuzzy or topic matching anywhere.
- ID comment lines are stripped before anything is written to the release body or Supabase.

### 4.2 Tombstones

- `changelog/ignored.txt`: one ID per line, committed to Git.
- On `sync`, any ID present in `Unreleased` at `HEAD` (committed) but missing from the working file, and not under an archived section, is appended to the tombstone file.
- `changelog ignore <id>` adds one explicitly. `append` refuses tombstoned IDs.
- `restore` is the only way to remove a tombstone, and it is explicit.

### 4.3 The script: `scripts/release/changelog.*`

The script is the only thing that edits `CHANGELOG.md`. The Git worker never parses or rewrites it. Commands:

- `append`: offline. Takes proposed bullets from the worker, derives IDs, inserts a bullet only if its ID is absent, never changes text of an existing ID, refuses tombstoned IDs, registers untagged operator bullets, runs `sync` first. Does not archive.
- `archive`: needs network. Reads the policy's `version_code` through the existing anonymous client path (no service role on the laptop). Maps it to the tag, verifies the tag exists and is an ancestor of HEAD, and moves IDs found in `Unreleased@tag` into `## [versionName] - YYYY-MM-DD` using the Africa/Lagos date. If any step fails, exit non-zero and do not touch the file. Entries shipped in earlier unarchived builds are grouped under the latest shipped version (accepted simplification).
- `compute-notes` (used by CI): `Unreleased@HEAD` minus `Unreleased@<tag of current policy>`, by ID, text taken from HEAD, ID comments stripped. Fails if any bullet lacks an ID or an ID is duplicated.
- `verify`: used as a required status check. Fails on untagged bullets, duplicate IDs, or an ID that vanished from `Unreleased` without a tombstone or archive entry.
- `restore --version <v>`: moves a yanked release's archived entries back to `Unreleased` and removes any tombstone for them.

Mechanical rules: normalize CRLF and whitespace, create the archive section if missing, handle empty `Unreleased`, never reword.

### 4.4 Version states (CI)

Let P be the policy's `version_code` and N be this run's `1000 + run_number`.

- **P greater than N:** stop. The policy never moves backwards.
- **P equals N:** compare `version_name` and stripped notes. Identical means no-op success. Different means conflict: stop.
- **P less than N:** proceed. If the tag already exists at the same SHA as HEAD and a release with a verified asset exists, resume (skip rebuild, verify, sync policy). If the tag exists at a different SHA, stop. If no release exists, build and publish.
- **Policy write is conditional:** PATCH with `version_code=lt.N` and `Prefer: return=representation`. Zero rows returned means the policy moved; re-read and re-evaluate from the top.

### 4.5 Workflow

- Global `concurrency: { group: android-release, cancel-in-progress: false }`.
- Tag `git rev-parse HEAD` of the checked-out tree, not `GITHUB_SHA`.
- Never recreate, move, or delete an existing tag.
- Asset check before the policy write: unauthenticated GET with `curl -L`, no Authorization header, require HTTP 200, reject `text/html`, reject bodies under a small size floor. GitHub metadata saying the asset exists is not a download.
- Notes: run `compute-notes`. If empty, fail unless an explicit `allow_empty` input is set; then send empty notes. No fabricated prose. Check that the column and app accept empty notes before relying on this.
- Permissions stay `contents: write` only for release and asset upload. CI never pushes commits.
- A policy sync failure after the release is public means the entries are not consumed. A re-run resumes the same release.

### 4.6 Rollback

The policy never moves down. To withdraw a bad release, ship a higher build. If its bullets should return, run `restore --version <v>`.

### 4.7 Enforcement

- Make `changelog verify` a required status check so enforcement is server-side, not only a client hook.
- The existing CLI rejection and the flag on direct GitHub edits are detection layers. The audit found no executable Git worker in the repo, so confirm where that enforcement lives before relying on it.
- Operator action, outside code: add a tag ruleset on `test-release-*` that blocks updates and deletions.

### 4.8 Git worker (prompt document only)

`docs/prompts/git-workflow-commit.md` changes to: read completed reports, drop internal-only work, hand proposed bullets to `append`, run `archive` when online, review the resulting diff, stage only authorized task groups plus `CHANGELOG.md` and `changelog/ignored.txt`, make one push. Keep every existing safety rule: no force-push, no rebase, stop and report on rejection. Never stage unrelated working-tree changes.

### 4.9 Out of scope

- No Supabase schema change. No frontend edits. No prerelease or draft stage.
- No `[web]` marker. The audit shows it does not exist today. Decide separately whether to add it.

## 5. Test requirements

- Parser: bullets present, no bullets, CRLF, and ID comment lines. Confirm release notes contain no comments after stripping.
- Script: duplicate IDs, untagged bullet, operator-edited bullet keeps its ID, reorder, deletion becomes tombstone, tombstoned ID refused on append, empty `Unreleased`, mid-build addition stays pending, two builds between local archives, archive failure leaves the file byte-identical.
- CI logic: every version state in 4.4, same-SHA resume, different-SHA stop, conditional PATCH race, asset check failures, `allow_empty`.

## 6. Open checks before coding (read-only)

- Does `run_number` stay the same on a GitHub re-run? Expected yes, with `run_attempt` incrementing. This shapes the retry tests.
- Does the live policy row match the latest release, or is a release currently ahead?
- Does `release_notes` accept empty or null, and how does the app render it?
- Is the tag ruleset in place?

## 7. Implementation prompt (hand to the coding agent)

Copy everything below into the agent. Run it as phases, one at a time, with a review between phases.

---

Task: implement the BOUXRE release-notes v5 design (the design doc above) in phases. Read AGENTS.md first. Use skills: pick the closest ones for CI workflow changes, TypeScript or Node scripting, and test writing from docs/SKILLINDEX.md.

Hard constraints:

- Do not touch or stage any unrelated working-tree change, including the untracked Bolu test file and the other modified Bolu and update-dialog files. Stage only files this task creates or edits.
- Do not edit src/components/, src/hooks/, src/domain/appUpdate/ (except tests), releaseDiscovery.ts, or any Supabase schema or migration.
- No pushes, no tag creation, no release creation, no calls to write endpoints during development. Tests use fixtures and mocks.

Phase 0, read-only verification. Report findings only, no edits:

1. Whether `release_notes` accepts empty or null, and how the app renders an empty value.
2. How `run_number` behaves on re-runs, from GitHub documentation.
3. Exact quoting of the existing parse behavior for comment-only and no-bullet input.
4. Where the Git worker rejection actually lives, if anywhere.

Phase 1, the script:

- Create scripts/release/changelog.\* with the commands append, archive, compute-notes, verify, restore, ignore, sync as specified in section 4.3.
- Create CHANGELOG.md with an empty `## Unreleased` and changelog/ignored.txt.
- Add fixture-based unit tests for every case in section 5 (script list). The script must be testable without network.

Phase 2, the workflow (.github/workflows/build-android-test-release.yml):

- Implement section 4.4 and 4.5: global concurrency, tag at checkout HEAD, same-SHA resume, different-SHA stop, asset GET check, conditional policy write, `compute-notes`, `allow_empty` input.
- Keep signing, `VITE_API_URL` preservation before `npx cap sync android`, and the existing version derivation.
- Move release notes and policy logic into the script where possible so it is testable. Add tests for the version-state table.

Phase 3, the Git worker doc and required check:

- Update docs/prompts/git-workflow-commit.md per section 4.8.
- Add a workflow job that runs `changelog verify` so it can be made a required check.

After each phase, run the relevant tests, report results and any deviation from the spec, and stop for review. Do not start the next phase without approval.

---