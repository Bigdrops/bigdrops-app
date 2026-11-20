# Handover — Next Agent (Phase 2.2.1 → Phase 3 readiness)

Date: 2026-11-19
Repository: `bigdrops-app` · Branch: `main` · HEAD: `ad97c741921a4f2e975f3fe81832663ad779ebf0`

## 1. Where the work stands

Phases 1, 2, 2.1, 2.2 and 2.2.1 are complete. Phase 3 is **not started and not authorized**.

| Phase | Status | Evidence |
| --- | --- | --- |
| 1 — PRD reconciliation / proposal recovery | Complete | `docs/prd/release-notes-changelog-prd.md`, `release-notes-changelog-proposal.md`, `2026-11-19-changelog-prd-reconciliation.md` |
| 2 — release workflow + consumed-ID gate | Complete | `2026-11-19-changelog-foundation-implementation.md`, workflow + `scripts/release/` |
| 2.1 — read-only audit | Complete | `2026-11-19-phase-2-1-implementation-audit.md` (2 critical, 3 high findings) |
| 2.2 — architecture corrections | Complete | `2026-11-19-phase-2-2-implementation.md` |
| 2.2.1 — closure corrections | Complete | `2026-11-19-phase-2-2-1-implementation.md` (this phase) |
| 3 — Git worker integration | **Not started / not authorized** | `docs/prompts/git-workflow-commit.md` untouched |

Read root `AGENTS.md` and the PRD before modifying anything. The PRD status line still says the release-identity architecture is an unresolved decision pending user approval. Do not change it without explicit authorization.

## 2. Architecture as implemented

- **Consumption boundary:** the exact build commit SHA (`git rev-parse HEAD`), not a tag name. Release notes come from `git show <BUILD_SHA>:CHANGELOG.md`.
- **Durable consumed state:** `consumed-ids.json` as a GitHub Release asset, schema v2. The 90-day Actions artifact is only a convenience copy. Missing, malformed or conflicting ledgers fail closed.
- **Tags and GitHub Releases:** publication artifacts only, never proof of consumption. A tag pointing at a different SHA is a hard stop; it is never moved.
- **Archive gate:** requires BOTH `assetVerified: true` and `policyVerified: true`, plus a matching consumed ID and no tombstone. Unshipped, mid-build and tombstoned entries stay in `Unreleased`.
- **Policy:** single row `id = 1`. NULL `version_code` with seeded metadata is an explicit first-release bootstrap (`advance`); NULL with unexpected metadata is a `conflict`. Conditional PATCH uses `id=eq.1&or=(version_code.is.null,version_code.lt.N)` with `Prefer: return=representation`; zero rows or an unexpected returned version fails.
- **Reissue:** `restoreVersion` is non-destructive. It keeps the archive and original consumed ID, mints `createReissueId(originalId, version)` into `Unreleased`, and writes `<!-- id: ...; reissueOf: ... -->`. Repeating a restore is a byte-identical no-op.
- **APK identity:** `APK_SHA256` is computed from the signed APK bytes and verified against both the Supabase-hosted APK and the GitHub Release APK. Missing or mismatched digests fail closed.

## 3. Key file map

| File | Role |
| --- | --- |
| `scripts/release/changelog.mjs` | Architecture-neutral core: IDs, parse/serialize, tombstones, append/sync/ignore/archive/restore/compute-notes, SHA snapshot reader. CLI `main()`. |
| `scripts/release/releaseGate.mjs` | Release gate helpers + CLI: ledger v2, reconciliation, policy evaluation, asset/digest verification, retry verification, gated archive. |
| `scripts/release/reportProposals.mjs` | Read-only offline report → proposal helper. No changes needed. |
| `.github/workflows/build-android-test-release.yml` | 34 steps. Serialized by `concurrency.group: android-release`, `cancel-in-progress: false`. Name: `Build Android Release APK`. |
| `src/tests/critical/changelog*.test.js`, `releaseGate.test.js` | Focused suites. `changelogPhase221.test.js` holds the newest regression tests. |
| `docs/reports/whats-new-changelog/` | Full phase history and reports. |

## 4. Open constraints and unresolved items

1. **apk_asset_prefix mismatch (needs a decision).** The migration defaults `apk_asset_prefix` to `BIGDROPS-test-release-` and `releaseDiscovery.ts` filters GitHub assets by that prefix. The renamed `Bouxre-release-...` asset will not match the GitHub fallback discovery path. Primary discovery is unaffected because it uses the direct Supabase Storage URL. Both files are protected and were not modified. Decide whether to update the policy prefix in a separately authorized change.
2. **PRD status is stale.** It describes the architecture as unresolved and the release integration as not authorized, while implementation has proceeded under later explicit user approvals. Do not edit unilaterally; ask for authorization.
3. **No live verification performed.** No tag, release, Supabase write or workflow run was executed. All claims are static repository evidence plus focused tests. Live behaviour (release asset upload, unauthenticated APK GET, policy PATCH) remains unverified.
4. **GitHub asset immutability.** Release assets cannot be replaced in place under the same name. The ledger is uploaded once and retained on verified retries rather than clobbered. Keep this constraint in mind for any future ledger extension.
5. **Concurrent work in the tree.** Bolu files, update-dialog files, `.perch/PERCH.md` and several deleted/existing PRDs are pre-existing changes owned by other work. Never stage, revert or overwrite them.

## 5. Verification commands (known-good)

From the repository root, using Bun only:

```powershell
git branch --show-current
git rev-parse HEAD
git status --porcelain=v1

node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/changelog*.test.js src/tests/critical/releaseGate.test.js
bun run audit:load
bun run typecheck

python -c "import yaml,io; d=yaml.safe_load(io.open('.github/workflows/build-android-test-release.yml',encoding='utf-8')); print(d['name'], len(d['jobs']['build-test-release-apk']['steps']))"
```

Expected at handover: 77 tests / 77 pass; `audit:load` exit 0; `typecheck` exit 0; YAML name `Build Android Release APK`, 34 steps.

Never run `bun run build` or `bun run lint` on this 4 GB host.

## 6. Phase 3 boundary

Phase 3 is not authorized by anything completed so far. Do **not**:

- edit `docs/prompts/git-workflow-commit.md`;
- add `.github/workflows/changelog-verify.yml`;
- change the PRD status to approved;
- stage, commit, push, tag, create releases, call live Supabase endpoints or deploy.

When the user authorizes Phase 3, start by re-reading root `AGENTS.md`, the PRD, this handover and the Phase 2.2.1 report, then capture `git status --porcelain=v1` before touching files. Preserve all pre-existing work.

## 7. Suggested first move for the next agent

Confirm the user's authorization scope for Phase 3, then resolve the `apk_asset_prefix` decision first: it is the only known functional gap between the implemented workflow and client-side APK discovery. Everything else is ready for a closure re-audit before any Git worker integration.
