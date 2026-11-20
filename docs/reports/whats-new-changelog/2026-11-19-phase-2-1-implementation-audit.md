# Phase 2.1 — BOUXRE Release Architecture & Implementation Audit

Date: 2026-11-19
Type: Read-only implementation audit
Scope: Phase 2 release-notes implementation, audited before authorizing Phase 3
Authority: inspection, analysis and reporting only. No implementation, repair, workflow edit, Git write, release, deploy, or Supabase write was performed.

## 1. Executive verdict

**Phase 2 is not safe to build on.** The implementation adds real gate logic and its focused tests pass, but two critical defects undermine the approved model:

1. **The consumed-entry ledger never persists.** `changelog/consumed.json` is written in the runner workspace and uploaded as a 90-day workflow artifact, but CI never pushes commits and the Git worker prompt has no instruction to commit it. Every fresh run checks out a tree without the ledger, treats all entries as unconsumed, and can consume the same entries again. There is no authoritative durable source of consumed-entry state.
2. **The seeded policy row is rejected by the gate.** The migration seeds `version_code = NULL`. `evaluatePolicyState` maps a null code to `NaN` and returns `conflict`, so the first release against a fresh policy fails. Separately, the conditional PATCH predicate `version_code=lt.N` cannot match a NULL row in SQL, so the first release cannot synchronize policy even if the gate were bypassed.

Three high-severity gaps follow: the release body and GitHub asset are never verified on retry; no git snapshot is actually read (the build SHA is metadata only); and a restored entry has no mechanism to clear its consumed ID.

**Recommendation: Phase 3 must remain blocked pending architectural resolution.** The central unresolved question is where the authoritative consumed-entry state lives. That is an architecture decision, not a code correction, and it is the operator's call.

## 2. Evidence and inspected files

Evidence labels: **DECISION** (user-approved), **OBSERVATION** (verified repository state), **REFERENCE** (advisory document or prior report), **PROPOSAL** (unapproved alternative).

Mandatory instructions read: root `AGENTS.md`; `docs/prd/release-notes-changelog-prd.md`; `docs/prd/release-notes-changelog-proposal.md`. `Architect.md` was not used as governance.

Files inspected:

| File | Lines / scope | Purpose |
| --- | --- | --- |
| `.github/workflows/build-android-test-release.yml` | 1–635 (all) | Release execution order, gates, persistence |
| `scripts/release/releaseGate.mjs` | 1–398 (all) | Gate logic and CLI |
| `scripts/release/changelog.mjs` | Core functions (prior turn read) | Identity, append, archive, restore, notes |
| `scripts/release/reportProposals.mjs` | 1–74 (all) | Proposal curation |
| `CHANGELOG.md` | 1–5 | Current state |
| `changelog/ignored.txt` | 1 | Tombstone state |
| `src/tests/critical/releaseGate.test.js` | 1–206 (all) | Gate tests |
| `src/tests/critical/changelogSnapshotFeasibility.test.js` | 1–89 (all) | Snapshot tests |
| `supabase/migrations/20260914120000_app_release_policy.sql` | table, RPC, seed | Actual policy contract |
| `src/lib/appUpdate/releasePolicyClient.ts` | 1–39 | Policy read path |
| `src/lib/appUpdate/releaseDiscovery.ts` | 150–243 | GitHub release mapping |
| `docs/prompts/git-workflow-commit.md` | searched for `consumed.json\|changelog\|CHANGELOG` | Ledger commit path |
| Git tags | 25 `test-release-*` tags | Historical context |

**Evidence gap:** no Phase 2 implementation report exists under `docs/reports/whats-new-changelog/`. The folder contains six other reports, none titled for Phase 2. Findings below are derived from source and tests, not from a self-report.

**Evidence status of external systems:** all live claims are UNKNOWN. No GitHub API, Actions run, Supabase endpoint, or hosted database state was accessed. Tag immutability is OBSERVED absent in-repo (no `.github/settings.yml` or ruleset files); hosting-provider configuration is UNKNOWN.

## 3. Working-tree baseline and final state

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `047e000c6b99aa1fb9d8ddc68af47806ceedf686` |
| Upstream | `origin/main` |
| Baseline status | captured before inspection (below) |
| Final status | identical to baseline; this audit created only the required report |

Baseline and final `git status --porcelain=v1` were identical except for the audit report itself. Pre-existing changes preserved:

- Modified: `.github/workflows/build-android-test-release.yml`, `.perch/PERCH.md`, `api/bolu-save.ts`, four `conversational-document-assistant` docs, `src/components/app/UpdateModal.tsx`, `src/components/app/update/update-dialog-card.css`, `src/hooks/useAppUpdate.ts`, three `src/lib/ai-assistant/*` files, two Bolu tests, `src/tests/critical/productionUpdateDialog.test.js`.
- Deleted: four PRD files under `docs/prd/`.
- Untracked: `CHANGELOG.md`, `changelog/`, `scripts/release/`, both changelog PRD/proposal docs, six `docs/reports/*` paths, `src/lib/ai-assistant/bolu-proposal-engine.ts`, four changelog/gate test files.

**Concurrent work acknowledged:** Bolu files and update-dialog files changed during the prior Phase 2 turn and were present at audit start. No attribution is inferred from names or timestamps. Nothing was staged, unstaged, committed, pushed, reverted, or deleted.

**Generated artifacts:** this report only. Focused tests wrote no tracked files.

## 4. Consumed-record storage and durability

| Question | Finding | Evidence | Status | Severity |
| --- | --- | --- | --- | --- |
| Storage location | `changelog/consumed.json` in runner workspace; `consumed-ids-<version>` Actions artifact | workflow `:566-635` | verified | — |
| Artifact or release asset? | GitHub Actions workflow artifact (`actions/upload-artifact@v4`), not a release asset | workflow `:629-635` | verified | — |
| Retention | 90 days | workflow `:635` | verified | — |
| Later run retrieve independently? | **No.** No download step exists; the file is read only from the fresh checkout at `:132` | workflow `:132-140`, `:449-452` | verified | **critical** |
| Overwrite / delete / replace? | Artifact names are version-specific; re-upload of the same name would conflict or append depending on GitHub behavior (UNKNOWN). The in-repo file is rewritten each run by the merge script at `:592-603` | workflow `:592-603`, `:629-635` | inferred | medium |
| What identifies build SHA? | Full 40-hex `git rev-parse HEAD` at `:94-99`, stored as record `sha` | workflow `:94-99`, gate `:89` | verified | — |
| Android version association | `versionCode = 1000 + run_number`, `versionName = 1.0.<run_number>` at `:81-82`; both stored in the record | workflow `:81-82`, gate `:96-97` | verified | — |
| Entry ID validation | `ID_PATTERN` (`rel_[0-9a-f]{8}`), duplicate rejection, schema check | gate `:93-95`, `changelog.mjs:28` | verified | — |
| Prevents double consumption? | Within one run, yes (ledger read and IDs excluded). Across runs, **no** — ledger absent on fresh checkout | workflow `:132-144` | verified | **critical** |
| Unavailable / corrupted / expired record | Missing → treated as empty ledger (all entries eligible). Corrupt JSON → hard error at `:134-137`. Expired artifact → irrelevant because no download path exists | workflow `:132-140` | verified | high |

**Assessment:** a 90-day finite-retention workflow artifact is not permanent storage and is not an authoritative ledger. The workflow comment at `:626-628` says the artifact lets "the reviewed Git-worker change pick up the exact verified record," but `docs/prompts/git-workflow-commit.md` contains no reference to `consumed.json`, `CHANGELOG.md`, or `changelog` (grep: 0 matches). No code or prompt commits the ledger. The authoritative source of consumed-entry state **does not exist** in durable form.

Consequence chain: fresh run → `[ -f changelog/consumed.json ]` false → empty `CONSUMED_FILE` → `buildReleaseNotes` sees no consumed IDs → previously shipped entries are re-emitted and re-recorded. The `archive-gated` step then reads the ledger written minutes earlier in the same run, so it always opens for those IDs; it is a self-assertion, not independent verification.

## 5. Publication and policy recovery state table

Execution order (verified from workflow): build (`:292-329`) → tag reconcile (`:367-387`) → release publish (`:392-404`) → policy GET + evaluate (`:407-467`) → Supabase upload (`:469-493`) → public asset GET (`:495-513`) → conditional PATCH (`:515-564`) → record write (`:566-605`) → archive (`:607-623`) → artifact upload (`:625-635`).

| Scenario | Actual code path | Result | Test | Severity |
| --- | --- | --- | --- | --- |
| Primary failure sequence: build, tag, release, upload, asset GET ok, PATCH fails, rerun | Rerun reconciles tag (`:373-379`), skips existing release (`:397-398`), re-reads policy (`:430-438`), re-uploads asset, re-verifies, retries PATCH | Policy retry is safe **if** policy row has a non-null code. Ledger still not durable, so consumed IDs are recomputed from scratch | No workflow-level test | high |
| Recognizes existing tag | `git ls-remote` at `:373` | Yes | No direct test | — |
| Confirms tag points to expected SHA | `:374-379` compares to `BUILD_SHA`, exits on mismatch | Yes | Helper-level SHA test only (`releaseGate.test.js:189-197`) | — |
| Verifies existing release metadata and notes | `gh release view "$TAG"` at `:397` — existence only | **No.** Body, title, and notes are never compared | None | **high** |
| Verifies actual APK asset | Supabase public URL GET at `:505-513`; GitHub release asset never checked | Partial — Supabase asset only | `verifyAssetDownload` helper test (`:107-112`) | high |
| Avoids moving/replacing tag | `:374-387` never deletes or force-pushes | Yes | No direct test | — |
| Avoids duplicate release | `:397-404` skips when `gh release view` succeeds | Yes | No direct test | — |
| Retries policy sync safely | Conditional PATCH `:547-564` | Yes for non-null policy; **fails for seeded NULL row** (§6) | Policy state helper tests only | **critical** |
| Correct consumed record | `:582-603` | Correctly formed but not durable (§4) | Record validation helper tests | **critical** |
| Archives only after gates | `:607-623` | Same-run gate only; no durable verification | Archive gating helper tests | medium |
| Tag exists, release missing | Tag reconciled, then `gh release create` at `:400-402` | Safe recovery (creates release) | None | low |
| Release exists, asset missing (GitHub) | `gh release view` succeeds; workflow proceeds | **No detection** | None | high |
| Asset exists but invalid | `verifyAssetDownload` rejects non-200, HTML, empty | Yes for Supabase URL; floor is 1 byte | Helper test `:107-112` | medium |
| Release body differs from expected notes | No comparison anywhere | **Not detected** | None | high |
| Tag points to different SHA | `:375-378` exits | Yes, never reused | No direct test | — |
| Policy points to release whose asset is missing | Policy PATCH happens only after Supabase asset GET succeeds, but on a rerun with `policy_action=noop` the asset GET still runs at `:495-513` | Mostly protected; a policy set by a prior run whose asset later disappears is not re-checked against the release asset | None | medium |
| Release published, policy update fails | Rerun path above | Recoverable for non-null policy; duplicate publication avoided | None | high |
| Rerun after successful completion | Tag/release skipped; policy evaluates to `noop` via ledger or metadata fallback; record rewritten; archive re-run | Idempotent in-run, but ledger absence means notes recompute from all entries | No workflow-level test | high |

## 6. Supabase policy consistency

**OBSERVATION:** `supabase/migrations/20260914120000_app_release_policy.sql` still defines `version_code integer` with only `CHECK (version_code IS NULL OR version_code > 0)`. No monotonicity constraint, SHA, tag, release ID, or consumed-ID column exists. The seed at the end of the migration inserts `(1, NULL, NULL, false, NULL)`. Confirmed: the earlier audit's finding remains true.

| Case | Actual behavior | Evidence | Status | Severity |
| --- | --- | --- | --- | --- |
| Null existing `version_code` | `normalizePolicyRow` maps null to `undefined`; `Number(undefined)` → `NaN`; gate returns `conflict` → workflow exits at `:461-464`. Also `version_code=lt.N` cannot match NULL in SQL | gate `:168-171`, `:247-255`; workflow `:548` | verified | **critical** |
| Existing lower than candidate | `advance`; PATCH predicate matches | gate `:179-181` | verified | — |
| Existing equal, same build identity | `noop` via ledger SHA+tag, or metadata fallback | gate `:183-205` | verified | — |
| Existing greater | `reject`, workflow exits | gate `:176-178` | verified | — |
| Zero-row conditional PATCH | `jq length == 0` → error and exit | workflow `:554-558` | verified | — |
| Multiple competing attempts | Global concurrency `android-release` serializes this workflow; conditional PATCH adds DB-level guard | workflow `:21-23`, `:547-553` | verified (static) | — |
| Successful PATCH, missing/unverifiable response | HTTP 2xx with non-array/empty body → `jq length` fails or returns 0 → error | workflow `:554-558` | verified | — |
| Network timeout after server accepted PATCH | curl yields no 2xx → step exits. Rerun reads policy at N and uses metadata fallback → `noop`. Indeterminate state is resolved by re-read, not by an explicit state | workflow `:547-564`, gate `:197-205` | inferred | medium |
| Rerun after ambiguous outcome | Metadata fallback requires matching `version_name` and `web_release_url`; both are derived deterministically from run number and URL, so a same-run retry matches | gate `:200-205` | verified | — |

**What the conditional PATCH guarantees:** the row is updated only if `id = 1` and its current `version_code` is strictly less than the candidate. A zero-row response means the predicate did not match. Combined with `return=representation`, the workflow can detect that no row changed.

**What it does not guarantee:** it cannot match a NULL `version_code`; it does not detect that the release asset is downloadable (that is a separate step); it does not make the policy write atomic with the release publication or the ledger write; it does not prevent a manual policy edit outside this workflow; and it does not establish an "indeterminate" state — the gate classifies only advance/noop/reject/conflict. Full concurrency safety across all actors is **not** established.

## 7. Snapshot and archive correctness

**Central observation:** the implemented architecture does **not** read a git snapshot. `buildReleaseNotes` (gate `:49-62`) parses `CHANGELOG.md` from the checked-out HEAD and subtracts IDs from the ledger file. It never calls `git show <sha>:CHANGELOG.md`. The pinned `BUILD_SHA` is stored as record metadata but is not used to read changelog content. The "snapshot-derived consumption" described in the PRD recommendation is therefore not implemented as described.

| Scenario | Actual behavior | Evidence | Status | Severity |
| --- | --- | --- | --- | --- |
| Entry exists before build snapshot | Included unless its ID is in the ledger | gate `:53-61` | verified | — |
| Entry added after build snapshot | No snapshot exists; entry is included in the current run's notes. If the ledger persisted, it would stay pending for the next run — but it does not | gate `:53-61`, workflow `:132-144` | verified | **critical** |
| Entry manually edited after snapshot | ID-based, text from HEAD; edit is reflected | gate `:53-61` | verified | — |
| Entry reordered | ID-based; order follows HEAD | gate `:53-61` | verified | — |
| Entry deleted before shipment | Tombstone logic in `changelog.mjs` unchanged and tested | `changelog.mjs:292-307` | verified | — |
| Entry already consumed | Excluded only if ledger is present on checkout | workflow `:132-144` | verified | **critical** |
| Multiple builds before archive | No snapshot boundary; each run recomputes from HEAD and its own ledger | workflow `:132-144`, `:566-623` | verified | high |
| Archive retried | `archiveEntries` is atomic; second run finds no matching Unreleased IDs and throws if asked for the same IDs. The workflow does not catch that throw | `changelog.mjs:366-388`, workflow `:616-623` | inferred | medium |
| Archive fails partway | Pure function throws before write; workflow writes only after success at `:623` | `changelog.mjs:366-388`, workflow `:616-623` | verified | — |
| Previously shipped entry restored | `restoreVersion` returns it to Unreleased with the same ID and clears its tombstone | `changelog.mjs:391-400` | verified | — |
| Restored entry shipped again | **No mechanism clears its consumed ID from the ledger.** If the ledger persisted, the restored ID would be excluded forever. The `changelogSnapshotFeasibility` test at `:76-89` uses an empty baseline and does not exercise the ledger path | gate `:53-61`; test `:76-89` | verified | high |

**PRD promise vs implementation:** §4 of the PRD requires an opaque baseline supplied by the caller; the implementation supplies a ledger-derived ID set instead. §5.4 recommends a commit-pinned snapshot plus explicit ledger; only the ledger half exists, and it is not durable. Duplicate IDs are still rejected by `verifyChangelog`, and archive failure still leaves recoverable state — those promises hold.

## 8. GitHub workflow integrity

| Requirement | Finding | Evidence | Status |
| --- | --- | --- | --- |
| Global concurrency | `group: android-release`, `cancel-in-progress: false` | `:21-23` | verified |
| Exact checked-out SHA | `git rev-parse HEAD`; full 40-hex validated | `:94-99` | verified |
| SHA used by build and tag | Same `BUILD_SHA` used at tag reconcile; APK name uses short SHA from `GITHUB_SHA` (`:74`, `:322`) — cosmetic mismatch on custom-ref dispatch | `:322`, `:372-386` | verified |
| Version derivation | `1000 + run_number`, `1.0.<run_number>` preserved | `:81-82` | verified |
| Tag reconciliation | `ls-remote`, same-SHA resume, different-SHA stop, never moves | `:367-387` | verified |
| Release reconciliation | Existence check only; no metadata/body verification | `:392-404` | verified |
| APK asset upload | `x-upsert: true` to Supabase Storage; GitHub release gets APK only at first publish | `:400-402`, `:481-486` | verified |
| Public unauthenticated asset verification | `curl -sL` with no auth header, HTTP 200, non-HTML, non-empty | `:495-513` | verified |
| Policy ordering | Policy GET/evaluate precedes upload and PATCH; release publication still precedes policy sync | `:392-467` | verified |
| Consumed-record persistence | Runner file + 90-day artifact; never committed | `:566-635` | verified |
| Archive gating | Same-run gate on freshly written record | `:607-623` | verified |
| Failure propagation | No `continue-on-error`; steps exit 1 on failure | throughout | verified |
| Permissions | `contents: write` only | `:30-32` | verified |
| CI Git write or push | **Yes**: `git push origin "$TAG"` at `:385`. The comment at `:626-628` says CI does not push commits — accurate for commits, but a tag push does occur | `:385` | verified |
| Android signing preserved | Keystore from secrets, removed with `if: always()` | `:282-309` | verified |
| `VITE_API_URL` preserved | Injected before `bun run build` and `npx cap sync android` | `:230`, `:246`, `:263` | verified |
| No real release executed | Static inspection only | — | verified |

## 9. Test results and coverage gaps

Exact command run: `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/changelog*.test.js src/tests/critical/releaseGate.test.js`

Result: **49 tests, 49 pass, 0 fail**, duration ~810 ms, exit 0. No failing test names. No build, lint, typecheck, or full suite was run for this read-only audit.

**Test quality:** the 49 tests exercise pure helper functions with in-memory fixtures. They verify real helper behavior (comment stripping, ID validation, asset classification, policy classification, archive selection), not merely smoke calls. They do **not** exercise the workflow shell, the CLI end-to-end, or any external interaction.

Important untested branches:

- Null `version_code` policy row (the seeded state) — would fail immediately.
- Ledger absence on a fresh checkout after a prior successful release (the central durability defect).
- Conditional PATCH zero-row response and network-timeout ambiguity at the workflow level.
- Tag reconciliation shell logic (same SHA, different SHA, missing tag).
- Release existence with body/notes mismatch; GitHub release asset missing.
- Archive retry after a successful archive in the same or a later run.
- Restored-entry reissue through the ledger path.
- `archive-gated` CLI with a ledger-shaped file (only pure `selectArchivableIds` is tested).
- Empty notes behavior: `buildReleaseNotes` emits empty notes; the v5 proposal required `allow_empty` gating (REFERENCE, not approved), and no such input exists.

## 10. PRD consistency assessment

| PRD statement | Implementation reality | Classification |
| --- | --- | --- |
| Status: architecture "unresolved decision pending user approval" (`:3`, `:96-98`, `:184-186`) | Phase 2 implemented a specific model after user authorization in chat; PRD was not updated | Contradiction — status claim overstates pending state relative to code, but PRD itself is internally consistent |
| Phases table: release integration "Not started / not authorized" (`:170`) | Workflow and scripts were changed | Contradiction |
| Non-goals: "No release identification implementation" (`:180`) | Release gate implemented | Contradiction |
| §5.4 recommendation: exact record location requires approval (`:125-127`) | Implementation chose in-repo file + Actions artifact without a recorded approval of that specific location | Decision gap |
| §4 abstract baseline contract (`:80-92`) | Ledger-derived ID set replaces opaque baseline; no git snapshot read | Divergence |
| §3 stable IDs, tombstones, atomic archive (`:55-64`) | Implemented and tested | Verified |
| §7 no Supabase dependency for bookkeeping (`:158`) | Core remains Supabase-free; workflow uses Supabase for policy/asset, which is release orchestration, not bookkeeping | Consistent |
| Proposal line 37 path-only hash | Superseded by per-entry key scheme in `changelog.mjs`; conflict already recorded in PRD §3 | Correctly handled |

No requirement was found where an unapproved proposal was silently promoted into the PRD. The reverse problem exists: the PRD understates what has been built. That is a documentation defect, not a requirements violation, and this audit did not edit it.

## 11. Unresolved risks and unknowns

1. **Authoritative consumed state: unresolved (critical).** Where should the ledger live so a later run can read it? Options include a committed file, a release asset with a download step, or a durable external store. This is the operator's architecture decision.
2. **Null policy bootstrap: unresolved (critical).** The seeded row cannot be advanced by the current gate or PATCH predicate. A decision is needed on whether to treat NULL as version 0, seed a numeric baseline, or change the predicate.
3. **Release/asset verification scope: unresolved (high).** Whether to verify the GitHub release body and asset in addition to the Supabase URL.
4. **Snapshot semantics: unresolved (high).** Whether consumption should be snapshot-derived via `git show <sha>:CHANGELOG.md` or ledger-derived only. The current code is ledger-derived and the ledger is not durable.
5. **Restore/reissue semantics: unresolved (high).** How a restored entry regains eligibility after its ID was consumed.
6. **Live state: UNKNOWN.** No GitHub Actions run history, release metadata, tag protection ruleset, Supabase row values, or asset availability was inspected. All such claims are static-inference only.
7. **Artifact overwrite behavior: UNKNOWN.** Re-uploading a same-named artifact across reruns was not verified against live GitHub behavior.
8. **Concurrent work: present.** Bolu and update-dialog changes remain in the working tree and were not touched.

## 12. Final status and recommendation

**Status: Completed.** The audit report was produced, all required files were inspected, the exact focused test command was run, and the working tree was preserved apart from this report. Material inspection was limited to static repository evidence by design; live external state was not available and is reported as UNKNOWN rather than inferred.

**Recommendation: Phase 3 must remain blocked pending architectural resolution.**

The blocking issues are architectural, not cosmetic. Before Phase 3 is considered, the operator must decide:

1. the durable authoritative source of consumed-entry state;
2. how a NULL `version_code` policy row bootstraps to the first release;
3. whether release-body and GitHub-asset verification are required on retry;
4. whether consumption is snapshot-derived or ledger-derived, and how restored entries are reissued.

No corrections were implemented. The operator retains authority over the next phase.
