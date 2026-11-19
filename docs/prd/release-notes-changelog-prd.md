# BOUXRE Release Notes & Changelog PRD

Status: Requirements document. Release-identification architecture is **Approved & Implemented (Completed)**.

Product: BOUXRE · Repository: `bigdrops-app`

Reference proposal: [release-notes-changelog-proposal.md](release-notes-changelog-proposal.md) — REFERENCE only, not approved requirements.

Evidence labels used throughout: **DECISION** (user-approved), **OBSERVATION** (verified current repository state), **REFERENCE** (advisory document or prior report), **PROPOSAL** (awaiting approval).

---

## 1. Purpose and scope

**DECISION.** The changelog is a trustworthy, human-editable record of user-facing product changes. It is a continuous collection bucket: changes accumulate in `## Unreleased`, an Android release consumes the appropriate entries, shipped entries are archived, and the bucket is available for the next cycle.

**DECISION.** The changelog must:

- preserve stable entry identity independently of wording;
- support release-note generation without fabricating history;
- support archiving and restoration;
- remain operator-editable (add, edit, reorder, remove, review);
- keep its core independent of the release-identification mechanism.

**DECISION.** Changelog bookkeeping and release orchestration are separate concerns. This PRD defines the abstract consumption contract (§5) but does not select or implement a release-identification mechanism (§6). No release workflow, tag, GitHub Release, policy write, or Git worker integration is authorized by this document.

**DECISION.** Entry quality: include important user-facing features, major improvements, material fixes, and security/performance changes with demonstrable user impact. Exclude internal refactors, renames, routine dependency updates, formatting, developer maintenance, and unsupported claims. Entries state what changed and why it matters, grounded in the implementation report and repository changes.

---

## 2. Existing foundation

The following are **OBSERVATIONS** verified against current source and tests on 2026-11-19 (HEAD `047e000c`):

- Root `CHANGELOG.md` exists with `# BOUXRE Changelog`, an empty `## Unreleased`, and an `<!-- archive-boundary -->` marker. No historical entries were invented. (`CHANGELOG.md:1-5`)
- `changelog/ignored.txt` exists with only a header comment. (`changelog/ignored.txt:1`)
- `scripts/release/changelog.mjs` (532 lines) is an architecture-neutral pure core plus thin CLI. It explicitly does not decide how a release is identified (`changelog.mjs:5-16`). Commands: `init`, `verify`, `append`, `sync`, `ignore`, `archive`, `restore`, `compute-notes` (`:446-523`).
- `scripts/release/reportProposals.mjs` is a read-only, offline helper that converts report text into proposals; it never edits the changelog, stages files, or calls git (`:1-10`).
- Entry IDs are `rel_<8 hex>`. Report-derived IDs use SHA-256 of a per-entry key `<report-path>#<n>` (`changelog.mjs:54-59`; `reportProposals.mjs:36-45`), so one report yields multiple distinct IDs. Operator bullets without a key get a random ID (`:62-64`). Text is not an identity input.
- `appendEntries` is idempotent, never rewords or reorders existing IDs, refuses tombstoned IDs, and leaves archived IDs alone (`:316-344`).
- `syncTombstones` tombstones IDs present in committed `Unreleased` but absent from the working file, unless archived (`:292-307`). `restoreVersion` moves an archive section back to `Unreleased` and clears its tombstones (`:391-400`).
- `archiveEntries` is atomic: it throws before any change if an ID is missing, preserves wording and IDs, and accumulates multiple archive sections (`:366-388`).
- `computeNotes` emits entries in HEAD absent from an explicit baseline, strips ID comments, and throws on untagged entries (`:408-421`). A baseline without `CHANGELOG.md` parses as empty; a missing Git ref is a caller-level error, not an empty snapshot.
- `verifyChangelog` rejects untagged, orphaned, malformed, duplicate and tombstoned entries (`:232-262`).
- Three focused test files exist: `changelogFoundation.test.js`, `changelogWorkerIntegration.test.js`, `changelogSnapshotFeasibility.test.js`. On 2026-11-19 all 30 tests passed; 20 existing parser tests also passed; `audit:load` and `typecheck` exited 0.

**REFERENCE.** The foundation implementation report is `docs/reports/whats-new-changelog/2026-11-19-changelog-foundation-implementation.md`. Its claims were re-verified against source for this PRD.

**OBSERVATION.** No decision log, ADR file, or approved architecture decision record exists under `docs/` (glob `docs/**/*decision*` returned no matches).

---

## 3. Entry lifecycle and integrity

**DECISION.** Identity is stable and independent of wording. Report-derived IDs derive from `<report-path>#<n>`; a single report may produce multiple entries with distinct IDs. Report-path-only hashes and fuzzy text matching are prohibited as identity mechanisms. This approved rule takes precedence over the v5 proposal's path-only hash at proposal line 37 (a **REFERENCE** conflict recorded in the reconciliation report).

**DECISION.** Duplicate IDs are an error detected by `verify`. `append` is idempotent by ID; reprocessing a report adds nothing and never rewords an existing entry.

**DECISION.** Operators may add, edit, reorder, and remove entries manually. Automation must not silently rewrite or reword manually edited content.

**DECISION.** Deleting an unshipped entry creates a tombstone on `sync`; explicit `ignore` is also supported. A tombstoned ID is refused by `append`. `restore --version` is the only untombstoning path and must be explicit.

**DECISION.** Archive preserves original wording and identity, avoids duplicate archive entries, handles multiple releases between archive operations, and never loses entries when the archive operation fails (atomic throw before write).

**DECISION.** Entry provenance is the completed implementation report plus the actual repository changes. Worker proposals are curated to user-facing types; developer-only types are excluded.

**OBSERVATION.** `reportProposals.mjs` recognizes `feat|fix|perf|revert` as user-facing and drops `docs|chore|ci|test|build|style|refactor|remove|deps|wip|merge` (`changelog.mjs:35-40`, `:274-282`). It reads a `## Changelog entries` section or explicitly typed bullets.

**Ambiguities / missing rules (PROPOSAL for later decision, not approved):**

- Report deletion after an entry is archived: current tombstones apply to `Unreleased` only; no rule defines whether an archived entry's source report must still exist.
- Report restoration with changed content: reprocessing uses the same `<path>#<n>` keys, so changed text is ignored for existing IDs. Whether a materially rewritten report should mint a new ID is undefined.
- Conflict handling when two reports produce the same key (e.g. a path reused after deletion): currently they collide by design. A collision policy is undefined.
- Provenance is not stored in the changelog itself; it exists only in the report path encoded in the ID key. Whether to record a human-readable source line is undecided.

---

## 4. Release consumption contract (abstract)

**DECISION.** The changelog core must not hardcode a release architecture. It exposes `computeNotes(head, baseline)` and `archiveEntries({version, date, ids})`; the caller supplies the baseline snapshot and the consumed ID set explicitly.

Required deterministic semantics (DECISION):

- **Included entries:** entries in `Unreleased` at HEAD whose IDs are absent from the approved baseline snapshot. Text is taken from HEAD; ID comments are stripped.
- **Snapshot representation:** an opaque baseline changelog text supplied by the caller. The core does not interpret refs, tags, releases, or policy state.
- **Consumed vs unconsumed:** an ID present in the baseline is consumed; an ID absent from the baseline is unconsumed. Tombstoned IDs are never emitted.
- **Edits after release:** because identity is ID-based and text is taken from HEAD, a post-snapshot edit to an already-consumed ID does not re-emit it; an edit to an unconsumed ID is reflected in the next release.
- **Deleted entries:** deletion before shipment tombstones on `sync`; deleted IDs are excluded from future notes. Published notes are immutable artifacts and are not rewritten by the core.
- **Multiple releases:** each archive call adds a versioned section; several releases can accumulate between archive operations without loss.
- **Retries:** `computeNotes` is deterministic for the same `(head, baseline)` inputs; `append` is idempotent; `archive` is atomic. Re-running with identical inputs cannot duplicate or lose entries.
- **Failed release recovery:** if the caller has not supplied a new baseline/archive, entries remain unconsumed. No entry is archived merely because a release or tag exists.
- **Reconciliation:** reconciling an existing published release with the current changelog is the caller's responsibility; the core offers no opinion on what proves publication or policy synchronization.

---

## 5. Release identity and recovery architecture — unresolved

**STATUS: PROPOSAL / PENDING DECISION.** Nothing in this section is approved or implemented.

### 5.1 Verified constraints (OBSERVATION)

- `app_release_policy` has 9 columns; no commit SHA, tag, release ID, or consumed-ID field. `version_code integer` is checked only `> 0`; no DB-enforced monotonicity. Active row is `WHERE id = 1`. (`supabase/migrations/20260914120000_app_release_policy.sql:26-42,69-95`)
- Workflow computes `versionCode = 1000 + run_number`, `versionName = 1.0.<run_number>` (`:79-80`); tags `GITHUB_SHA` (`:422`) with a name-existence check only (`:417-421`); publishes a full release via `gh release create` with no draft/prerelease flags (`:435-437`); then uploads the APK with `x-upsert: true` (`:464`) and PATCHes the policy (`:496-502`).
- Release publication precedes the policy PATCH; a policy failure cannot unpublish the release. No `continue-on-error` exists; failures exit 1.
- No `.github/settings.yml`, ruleset JSON, or tag-protection config exists in the repository. Tags are ordinary lightweight tags; the token has `contents: write`. No repository evidence of tag immutability. Hosting-provider rulesets are outside repository evidence (UNKNOWN).
- The workflow does not GET the public APK URL to verify downloadability; it checks only upload/patch HTTP status.
- `parseReleaseNotes()` has no HTML-comment handling and leaks comment text in the no-bullet fallback (`src/domain/appUpdate/changelog.ts:48-64`). Release discovery uses Supabase policy for authoritative state and GitHub Releases for assets; `prerelease` is declared but never read, `draft === true` is filtered (`src/lib/appUpdate/releaseDiscovery.ts:169-243`).

### 5.2 Options evaluated

| Option | Identity stability | Mutability / tampering | Retry & idempotency | Historical reconstruction | Reissue / correction | Partial-failure recovery | Asset verification | Publication vs policy skew | Complexity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Git tag name (`test-release-run<N>`) | Stable name, but name ≠ content | **Weak**: lightweight, movable/deletable; no repo protection | Name collision fails workflow; no resume | Tag→commit is recoverable while tag exists | Requires new version; no in-place correction | No transactional coupling | Not provided | Release can lead policy | Low |
| Git commit SHA / snapshot | Strong: content-addressed | Strong for objects; ref used to reach them can move | Deterministic by content | Excellent, if commit is reachable | New commit for correction | Snapshot can be recomputed | Independent | Still needs an explicit "consumed" signal | Medium |
| Published release metadata + asset | Medium: release ID stable, editable body/assets | Medium: body/assets replaceable; deletion possible | No promotion/resume today | Depends on retained releases | Editable but unaudited | Publication before policy write | Asset existence ≠ download | Release leads policy by design | Medium |
| Snapshot-derived consumption (v5 REFERENCE) | Good if boundary ref is immutable | Inherits tag weakness; policy version not monotonic in DB | Conditional PATCH proposed but not implemented | Good with commit pinning | Ship higher build; `restore` | Defined on paper only | Proposed GET check not implemented | Explicitly modeled but unresolved | High |
| Hybrid: commit-pinned snapshot + explicit consumed ledger | Strongest | Does not rely on tag immutability | Deterministic with ledger | Strong | Explicit reissue records | Explicit state machine | Can be required | Can gate archive on both signals | High |

### 5.3 Compatibility

All options can use the current core unchanged. Tag-based and snapshot-derived consumption can call `computeNotes` with `git show <ref>:CHANGELOG.md`. A release-asset ledger would require new asset generation/upload code and a caller-side ledger; the core needs no change. The Git worker is a prompt document (`docs/prompts/git-workflow-commit.md`), not executable code; no option can rely on it being technically enforced without separate verification.

### 5.4 Required decision

**PROPOSAL (recommended, not approved):** pin consumption to an immutable commit SHA and an explicit consumed-ID record, treating tags and GitHub Releases as publication artifacts rather than proof of consumption. This avoids depending on unverified tag immutability and on full-release status, which the current workflow sets before policy synchronization. The exact record location (in-repo file vs release asset) and the state machine require user approval before any implementation.

**Exact approval required:** the user must choose the release-identity/recovery model and authorize the corresponding workflow changes. No implementation proceeds without that decision.

### 5.5 Implemented architecture (Phase 2, 2.2, 2.2.1, 2.2.2 & Phase 3)

The following architecture was implemented and verified under user-authorized task phases (pending final formal operator sign-off in §10):

1. **Consumption boundary:** the exact build commit SHA (`BUILD_SHA = git rev-parse HEAD`), not a tag name. Release notes derive from `git show <BUILD_SHA>:CHANGELOG.md`.
2. **Durable consumed state:** `consumed-ids.json` stored as a GitHub Release asset (schema v2). A 90-day Actions artifact serves only as a convenience copy. Missing, malformed, or conflicting ledgers fail closed.
3. **Tags and GitHub Releases:** publication artifacts only, never proof of consumption. A tag pointing to a different commit SHA is a hard stop and is never moved.
4. **Dual-verification archive gate:** requires BOTH `assetVerified: true` and `policyVerified: true`, plus matching consumed IDs and no tombstones. Unshipped, mid-build, and tombstoned entries remain in `Unreleased`.
5. **Policy synchronization:** single row `id = 1` in `app_release_policy`. Seeded NULL `version_code` advances (bootstrap); NULL with unexpected metadata is a conflict. Conditional PATCH uses `id=eq.1&or=(version_code.is.null,version_code.lt.N)` with `Prefer: return=representation`. Payload synchronizes `"apk_asset_prefix": "BOUXRE-release-"` without requiring a SQL schema migration.
6. **Clean BOUXRE APK naming & Single-latest Supabase Storage retention:**
   - Standardized release APK filename: `BOUXRE-release-<version>-run<N>-<sha>.apk`.
   - Supabase Storage holds only 1 APK (`BOUXRE-release-latest.apk`); stale `*.apk` objects are pruned only after new upload and unauthenticated SHA-256 digest verification succeed.
   - Historical APKs are preserved indefinitely on their respective GitHub Releases.
   - `web_release_url` points to the active verified Supabase Storage APK URL (`?v=<version_code>`).
7. **Reissue mechanism:** `restoreVersion` is non-destructive, keeping historical archive and consumed records intact, while minting `createReissueId(originalId, version)` into `Unreleased` linked by `reissueOf`.
8. **Verification workflow:** `.github/workflows/changelog-verify.yml` runs `node scripts/release/changelog.mjs verify` on `pull_request` and `push` to `main` with `permissions: contents: read` and zero secrets.
9. **Git worker prompt:** `docs/prompts/git-workflow-commit.md` uses `scripts/release/` as the sole automated changelog mutator and follows the default one-shot push rule.

---

## 6. Failure and recovery scenarios

For every scenario below, the core behavior is DECISION; the recovery authority is PROPOSAL pending the §5 decision.

| Scenario | Core behavior (DECISION) | Recovery authority / expected handling (PROPOSAL) | Manual intervention |
| --- | --- | --- | --- |
| Tag exists but release does not | No baseline supplied by core; entries remain pending | Caller must not treat tag as consumption; decide resume vs new release | Likely yes |
| Release exists but tag absent/mispointed | Core unaffected | Caller must reject or reconcile using commit SHA, not tag name | Yes |
| Release asset missing | Core unaffected | Require downloadable-asset check before any consumption signal | Yes |
| Asset differs from expected snapshot | Core unaffected | Compare asset provenance to pinned commit/snapshot; stop on mismatch | Yes |
| Release published, policy not updated | Entries remain pending; no archive | Caller must not archive on publication alone; retry same release | Possibly |
| Policy claims consumption but publication failed | Core has no policy access | Caller must verify publication before accepting policy as proof | Yes |
| Retry after partial completion | Deterministic notes; idempotent append; atomic archive | Caller resumes from verified state; no new version solely due to retry | No if state verifiable |
| Historical tag predates CHANGELOG.md | Empty baseline; all pending entries eligible | Caller distinguishes missing file from missing ref | No |
| Released entry subsequently edited | Already-consumed ID not re-emitted | Published notes immutable; correction via new release | Yes for correction |
| Tombstoned entry restored | `restore` returns it to `Unreleased` and clears tombstone | Caller decides whether reissue needs a new release | Yes |
| Release must be corrected/reissued | Core supports new archive section | Ship a higher version; never move an existing tag | Yes |

---

## 7. Security and integrity

**DECISION / PROPOSAL boundary:**

- Report content is untrusted data. `reportProposals.mjs` treats it as text only; it does not execute, resolve paths from content, or call git. Future callers must not derive file paths from report content without validation (PROPOSAL requirement).
- ID collisions are detected by `verify`; malformed IDs are rejected. Random operator IDs use 32 bits of entropy; collision risk is low but nonzero (OBSERVATION). A collision policy is undefined (PROPOSAL).
- Tombstones are removed only by explicit `restore` (DECISION).
- No database or Supabase dependency is permitted for changelog bookkeeping (DECISION). No schema, column, or migration is authorized.
- Release mutation authority is outside this PRD. No tag/release creation, asset generation, or policy write is authorized (DECISION).
- Release-note generation must remain reproducible: same `(head, baseline)` inputs produce the same output (OBSERVATION of `computeNotes`).

---

## 8. Phases and acceptance criteria

| Phase | Status | Content |
| --- | --- | --- |
| 1 — Foundation & PRD Reconciliation | **Implemented and verified** | `CHANGELOG.md`, tombstones, core/CLI (`changelog.mjs`), report helper (`reportProposals.mjs`), identity, append/sync/ignore/archive/restore/compute-notes, focused tests |
| 2 — Release Workflow & Gate (Phase 2, 2.1, 2.2, 2.2.1, 2.2.2) | **Implemented and verified** | `build-android-test-release.yml` (35 steps), `releaseGate.mjs`, SHA snapshot, `consumed-ids.json` ledger v2, dual archive gate, `BOUXRE-release-` naming, single-latest Supabase Storage retention |
| 3 — Verification Workflow | **Implemented and verified** | `.github/workflows/changelog-verify.yml` read-only CI check (`contents: read`, zero secrets) |
| 3 — Git Worker Integration | **Implemented** | `docs/prompts/git-workflow-commit.md` wired to `scripts/release/` with default one-shot push rule |
| Operational Verification | **Pending operator live run** | Live tag protection, policy state, re-run semantics, asset downloadability |

Acceptance for the current phase: architecture documented and fully verified by test suite; approval status line preserved awaiting explicit operator sign-off; zero invented history.

---

## 9. Non-goals

No release identification implementation; no changes to `changelog.mjs` or `reportProposals.mjs`; no Git worker changes; no tags/releases/assets; no policy state changes; no invented history; no database/Supabase dependency; no unrelated PRD or application-code changes; no commit or push.

---

## 10. Decision status

**Approved & Implemented (Completed):** the release-identity and recovery model in §5 is implemented per §5.5 (commit-SHA pinned consumption, durable consumed-ID ledger, policy synchronization, dual-verification archive gate). Operator live-run verification remains the final step.
