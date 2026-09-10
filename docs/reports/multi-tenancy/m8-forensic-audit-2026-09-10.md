# M8 Forensic Audit

This report was written by Muse Spark on 2026-09-10 via OpenCode.

## Executive Summary

M8 Step 2 ("multi-entity test fix") is COMPLETE: the stale assertion was removed the same day M8 was written, and current gate coverage exceeds it. M8 Step 3 ("safe-env provisioning test") is PENDING: no harness, sandbox, or safe environment exists anywhere in the repository, and historical reports explicitly defer it. M8 as a whole cannot be marked complete.

## Audit Scope

Roadmap M8 wording (`Waterfall-roadmap.md` lines 37, 73–76); roadmap git history (origin commit plus test-file history); `src/tests/critical/` inventory; `package.json` scripts; repository-wide searches for sandbox, safe-env, disposable-tenant, and provisioning-harness concepts; related 2026-09-05 bootstrap reports; prior reconciliation audit (used as lead, re-verified). No code executed; no tests run; no database touched.

## M8 Step 2 — Multi-Entity Test Fix

- Roadmap wording: "Fix pre-existing `tenantGate` `multi-entity` test expectation." Status PENDING, no other detail.
- Historical origin: authored 2026-09-05 14:36 in `b59becb9` as part of filling the roadmap template. Same-day bootstrap reports (`first-company-bootstrap-2026-09-05.md`, `first-workspace-bootstrap-2026-09-05.md`) document the concrete failure: `tenantGate.test.js` asserted a `multi-entity` phase the gate never produced (161 pass / 1 fail and 149 pass / 1 fail respectively). A 2026-08-26 assessment confirms the phase never existed (§16 non-goal; switcher was placeholder).
- Relevant commits: `b59becb9` (item written); `c0c13e8b` (2026-09-05 20:22, "cache isolation, notification scope, readiness") deleted the single stale line `assert.equal(resolveGatePhase({ ...base, entityCount: 2 }), 'multi-entity')` from `tenantGate.test.js`.
- Historical/current test paths: same file throughout; never renamed or moved (`git log --follow` shows only content edits). No other test file ever referenced `multi-entity` (history-wide `-S` search clean).
- Rename/move/delete findings: no rename; one-line deletion of the stale assertion; no separate fix commit needed beyond it.
- Underlying defect/fix status: the "defect" was test-only — an expectation of a non-existent phase. No production behavior was wrong. Removed ~6 hours after M8 was written.
- Current regression coverage: `tenantGate.test.js` now covers loading, errors, creation, pending-approval, invitation precedence, multi-workspace selection, entity counts, provisioning statuses, exposure gating, schema naming, and slug rules. `invitationVisibility.test.js` adds helper plus no-force cases. The multi-workspace selection test is the legitimate successor concept.
- Final classification: COMPLETE.
- Evidence: `git show c0c13e8b -- tenantGate.test.js` (single-line deletion); current test file (no `multi-entity` string); roadmap untouched since `b59becb9`.
- Confidence level: high (exact diff plus absence proofs).
- Remaining blocker: none. Only the roadmap text is stale.

## M8 Step 3 — Safe-Environment Provisioning Test

- Roadmap wording: "Run live provisioning test in a safe non-production environment." Status PENDING, no owner, no date, no environment named.
- Historical origin: same `b59becb9` authoring; no elaboration anywhere since. The 2026-09-05 bootstrap reports both end with "Live provisioning test needs a safe non-production environment" — i.e., the item was born deferred.
- Relevant commits: none implement it (history-wide search for safe-env, sandbox-as-environment, disposable-tenant harness, and provisioning smoke tests returns only agent-tooling docs, template copy, and unrelated payment-gateway references).
- Historical/current test paths: `package.json` exposes exactly one script, `test`, running `src/tests/critical/*.test.js` (unit tests only). Provisioning-adjacent files (`firstCompanyBootstrap`, `firstWorkspaceBootstrap`, `workspaceBootstrapDecision`, `tenantGate`) test pure logic and naming, never live provisioning.
- Rename/move/delete findings: nothing to rename — no harness ever existed under any name found.
- Sandbox/environment evidence: none. An accounting report states the inverse as fact: "No scratch or sandbox entity exists. All 8 entity schemas belong to real tenancy." Historical live verification used disposable production tenants instead (flagged unsafe in the same reports).
- Provisioning-test evidence: none beyond unit tests.
- Final classification: PENDING.
- Evidence: empty searches above; `package.json:9`; bootstrap report deferral lines; accounting report no-sandbox statement.
- Confidence level: high for "never implemented"; the item itself is clear, so this is PENDING rather than UNVERIFIABLE.
- Remaining blocker: availability of a non-production Supabase project plus explicit authorization to provision test tenants in it. This is an infrastructure/policy decision, not a code task.

## M8 Overall Status

M8 cannot be marked complete: Step 2 is done but unrecorded, Step 3 is genuinely outstanding. Step-ordering note: the roadmap declares step order binding, but Step 3 has no dependency on Step 2 beyond document order; neither blocks any other milestone. Retiring Step 2's wording (done, needs recording) does not retire Step 3.

## Current Repository Evidence

- `docs/prd/multi-tenancy/Waterfall-roadmap.md:37,73-76` (M8 wording, unchanged since `b59becb9`).
- `src/tests/critical/tenantGate.test.js` (no multi-entity reference; selection plus precedence coverage).
- `src/tests/critical/invitationVisibility.test.js` (helper plus no-force coverage).
- `src/tests/critical/firstCompanyBootstrap.test.js`, `firstWorkspaceBootstrap.test.js`, `workspaceBootstrapDecision.test.js` (unit-level bootstrap coverage).
- `package.json:9` (single unit-test script).
- `docs/Reports/general/first-company-bootstrap-2026-09-05.md:58`, `first-workspace-bootstrap-2026-09-05.md:57` (safe-env deferral).
- `docs/Reports/taxation-made-easy/accounting-foundation-increment-2-positive-path-verification-2026-09-05.md:54` (no-sandbox fact).

## Git History Evidence

- `b59becb9` (2026-09-05 14:36): roadmap template filled; M8 plus both steps authored with zero elaboration.
- `c0c13e8b` (2026-09-05 20:22): removed the stale `multi-entity` assertion — the entire substance of Step 2.
- `71ae40bd` ("fix multi-company blocking"): matched only by loose `-S "multi-entity"` substring on "multi-company"; unrelated on inspection.
- `3e622a4d` / `f0fa7692` (docs folder remove/restore): matched substring only; unrelated.
- No commit references a sandbox, safe environment, or provisioning smoke test for tenancy.

## Working Tree Safety

Before: 1 modified onboarding HTML plus 8 untracked files (3 prior audit reports, 5 other-agent files), all pre-existing. After: identical plus this report. `git diff --stat` shows only the pre-existing onboarding HTML change. No source, test, migration, config, PRD, or report file modified, staged, committed, stashed, reset, or cleaned. No untracked files deleted.

## Verification Limitations

No tests, typecheck, lint, audit, build, Docker, local Supabase, deployment, or live provisioning were executed per task constraints. Live database state was not probed in this turn; the Step 3 conclusion does not require it (the question is harness existence, settled by repository search). Test outcomes cited (161/1, 149/1) come from historical reports, not fresh runs.

## Recommended Roadmap Action

Do not apply during this task. A later roadmap-update task should: mark Step 2 complete citing `c0c13e8b` (or reword it to the selection coverage that replaced it); keep Step 3 pending with an explicit owner plus sandbox-availability precondition; then recompute M8 percentage and the 80% master bar, which currently undercounts shipped hardening across the program.
