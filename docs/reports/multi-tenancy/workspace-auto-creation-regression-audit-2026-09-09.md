# Workspace Auto-Creation Regression Audit

This report was written by Muse Spark on 2026-09-09 via OpenCode.

- Objective: Date and explain the shift from choice-based to automatic workspace creation.
- Scope: Git history, PRD/design sources, current implementation, naming lifecycle, invitation relationship.
- Files changed: NONE except this report. Zero implementation changes.
- Skills used: supabase, react-dev.
- Documentation standard: ASD-STE100 Simplified Technical English.
- Changes made: NONE. Read-only history and file inspection.
- Verification result: Every claim cites commit hash or file plus line.
- Risks or limitations: Intent inferred only from committed artifacts (message, comments, tests, roadmap). No PR record exists locally.
- Deferred work: Implementation belongs to a future coding task.

---

## CURRENT BEHAVIOR

A new account with no membership and no visible invitation lands on `WorkspaceCreation`, whose mount effect calls `ensureInitialWorkspace()` unconditionally (`src/pages/WorkspaceCreation.tsx:57-80`). That function inserts a workspace named `<email-prefix>'s Workspace` (`buildInitialWorkspaceInput`, `tenantGate.ts:50-60`). The row lands in `pending_approval`. The manual name form survives only as fallback. The user is never asked.

## PRD / DESIGN INTENDED BEHAVIOR

Three independent sources require user choice, all current:

- `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md:15` (v1.4 resolved decision, 2026-08-16): a user with no membership and no pending invitation **chooses between Create a Workspace and Join a Workspace**.
- Same file `:51, :283-284, :626, :1212`, plus `:54`: a user who chooses Create **submits the workspace details** (user-supplied naming).
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md:61`: identical choice language.
- `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html:376`: identical choice language in the visual reference.
- No illustration, PRD passage, or design file mentions automatic workspace creation. No workspace-specific PRD file exists at all.

## ILLUSTRATION.HTML / DESIGN EVIDENCE

`three-prd-tenancy-illustration.html:376` states the fresh-user choice verbatim. The file contains no auto-create flow, no generated name, and no approval-bypass. The user's recollection is correct: the design gives a choice, including naming via the Create branch.

## FIRST INTRODUCTION OF AUTOMATIC WORKSPACE CREATION

| Field | Evidence |
|---|---|
| Commit | `c18cf6f39f99021605b31d5b1ac414e6057610d1` |
| Date | 2026-09-05 13:54 +0100 |
| Author | Bigdrops <jaiyewisdom@gmail.com> |
| Message | `feat(tenant): first company and workspace bootstrap` (one line, no body) |
| Files | `tenantCreation.ts` (+342), `tenantGate.ts` (+37), `CompanyCreation.tsx` (+102), `WorkspaceCreation.tsx` (+57), 2 new test files |
| Diff core | Mount effect calling `ensureInitialWorkspace()` plus auto wait card; manual form retained as fallback (`WorkspaceCreation.tsx` diff hunk `@@ -18,44`) |
| Naming origin | Same commit: `buildInitialWorkspaceInput` first appears here (`git log -S`); `"'s Workspace"` has no earlier occurrence |

The only later touch is `a8f645a2` (2026-09-09, friendly-error polish), which kept auto behavior unchanged.

## HISTORICAL COMPARISON

Before `c18cf6f3`, `WorkspaceCreation.tsx` was a manual form: name input plus submit (`const [name, setName]`, `handleSubmit`), built by `b963ed4a` (2026-08-17, "pass-for-now, create/join, selection") to implement the v1.4 decision, with Create/Join mode choice and invitation-first routing. The 2026-09-05 commit kept the form but made it unreachable on first paint by auto-creating on mount. Net effect: the v1.4 choice was removed in practice 19 days after it was resolved, with no corresponding product decision or PRD update.

## WHY IT CHANGED (EVIDENCE ONLY)

- For intent: in-code comments describe deliberate simplification ("automatically ensure the initial workspace instead of requiring a manual form submit"); dedicated tests shipped (`firstWorkspaceBootstrap.test.js`); roadmap M5 records "auto workspace + auto company ... idempotent, approval-preserving" (`Waterfall-roadmap.md:34,63-65,90`).
- Against product authorization: bare one-line commit message, no body, no PR record locally, no PRD amendment, and direct contradiction of the still-current v1.4 "chooses between" language in v1.5 plus illustration.
- Verdict among options: not A (no product record, contradicts resolved decision). Consistent with C (onboarding simplification) executed as F (undocumented behavior change). B, D, E have no supporting evidence.

## NAMING LIFECYCLE HISTORY

- Generated `"'s Workspace"` names debuted with auto-bootstrap (`c18cf6f3`); no earlier occurrence exists.
- Previously users typed the name into the manual form.
- No rename UI or service exists today (grep finds zero workspace-rename paths).
- Names are mutable by database design (plain `name text` column; owner UPDATE policy exists). Display-name changes cannot affect identity: tenant schemas embed the workspace **slug** once at entity provisioning, and no UI edits slugs.
- Correction: schema derivation uses slugs captured at provisioning time, so a future display-name edit is side-effect free. Slug editing must remain unavailable.

## INVITATION RELATIONSHIP

Auto-creation manufactures the exact coexistence the gate mishandles: after Pass-for-now (or an invite arriving post-signup), the user holds a pending auto-workspace plus a pending invitation, and gate order shadows the invitation permanently (prior audit). Removing auto-creation restores the PRD flow end to end: no pending row exists, the invite screen is reachable, and Pass-for-now re-offers on later sign-in as specified (`erp-frontend-prd-v1.5.md:616-619`). Eliminating auto-creation prevents the reported scenario at its source. It does not fix the separate active-member inbox gap, which needs its own surface.

## CLASSIFICATION

CONFIRMED PRODUCT REGRESSION. The PRD and design required user choice with user-supplied naming; a later implementation removed that choice without a corresponding product decision or PRD update. Not downgraded: current code treating it as normal does not authorize it.

## EXACT FILES INSPECTED

`src/pages/WorkspaceCreation.tsx` (current plus `git show c18cf6f3` diff), `src/domain/tenant/tenantCreation.ts`, `src/domain/tenant/tenantGate.ts`, `src/tests/critical/firstWorkspaceBootstrap.test.js` (existence), `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md`, `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`, `docs/prd/multi-tenancy/three-prd-tenancy-illustration.html`, `docs/prd/multi-tenancy/Waterfall-roadmap.md`, `AGENTS.md`, `docs/PROJECTSKILLINDEX.md` (index only).

## EXACT FILES CHANGED

Report only: `docs/Reports/multi-tenancy/workspace-auto-creation-regression-audit-2026-09-09.md` (this file).

## GIT STATUS BEFORE / AFTER

- Before: 1 modified onboarding HTML plus 3 untracked files from other agents; 2 untracked prior audit reports. All pre-existing, untouched.
- After: identical plus this one new report file. `git diff --stat` shows no source changes.

## FINAL VERDICT

CONFIRMED PRODUCT REGRESSION
