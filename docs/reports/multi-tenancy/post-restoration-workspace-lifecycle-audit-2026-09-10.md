# Post-Restoration Workspace Lifecycle Audit

This report was written by Muse Spark on 2026-09-10 via OpenCode.

## 1. Executive Finding

Restoration verified complete and correct. Automatic workspace creation is gone: mount performs zero writes and the Create/Join choice renders first. Invitation precedence over pending workspace is implemented in gate order plus pinned tests. Company provisioning, exposure, readiness, isolation, and recovery chains are untouched. One residual edge remains (pending workspace still outranks multi-workspace selection), plus two intentionally deferred items. No correctness-blocking defect exists.

## 2. Current Workspace Lifecycle

Account creation → gate evaluation → one of: invitation screen (valid invite), pending screen (pending row only), selection screen (2+ active, no invite, no pending), choice screen (clean slate). Choice → manual Create (user name → `pending_approval` row) or Join (informational → invite on next sign-in). Approval (external) → owner membership → company flow. No step writes without explicit user action except approval-driven membership.

## 3. Scenario Matrix

| Scenario | Gate decision | Screen | Proceed / recover | PRD match |
|---|---|---|---|---|
| A. Clean slate | `create-workspace` | Create/Join choice | Yes, either branch | Yes (v1.4 choice) |
| B. Valid invite only | `pending-invitation` | Invitation accept/pass | Yes; pass → choice screen | Yes (§8, §12.3) |
| C. Pending + invite | `pending-invitation` (NEW) | Invitation first | Yes; accept → membership → app; pass → pending screen | Yes, now compliant |
| D. Pending only | `pending-approval` | Waiting + 5s poll + Sign Out | Recovers automatically on approval | Yes |
| E. Active + new invite | Normal app (invite nulled) | No invite surface | Cannot discover invite in-app | Known gap, deferred by scope |
| F. Multi-active + invite + pending | `pending-invitation` | Invitation first | Yes | Yes |

## 4. Workspace Creation Findings

Mount writes nothing: auto effect, `autoRunning` state, `autoAttemptedRef`, and the auto wait card are removed (`WorkspaceCreation.tsx` diff). Remaining creation paths: manual submit with user-typed name (`WorkspaceCreation.tsx:51-62`), and `ensureInitialWorkspace`, which survives with zero app callers. Choice UI (Create/Join toggle, join guidance) intact. Duplicate protection preserved (unique slug plus idempotent bootstrap). `pending_approval` semantics unchanged. Errors recoverable via inline message plus retry.

## 5. Invitation Lifecycle Findings

Precedence implemented and tested: non-dismissed invite outranks pending (`tenantGate.ts:189-190`; tests at `tenantGate.test.js:41-70` covering invite-wins, dismiss-yields-to-pending, invite-alone, pending-alone). Accept/pass/RPC paths untouched. Dismissal stays session-only. Expiry and already-member behavior untouched. Known unchanged gap: active members never load invites (`contexts.tsx` invite query gated on zero active memberships) and no invitee inbox exists — intentionally out of scope, still open.

## 6. Workspace Naming / Rename Findings

Names originate from user input at creation; generated `'s Workspace` names occur only inside the now-uncalled `ensureInitialWorkspace` path. No rename service or UI exists in `src` (grep clean). Database permits updates (plain `name` column; owner UPDATE policy); tenant schema identity derives from slugs at provisioning time, so display-name edits are side-effect free. PRDs specify naming only via the Create branch ("submits the workspace details"); rename behavior is unspecified. Classification: UNSPECIFIED product decision, not a defect.

## 7. Workspace → Company Findings

Chain intact and unmodified: approval → owner membership → `create-company` → `ensureInitialCompany` → `provisionEntity` → status poll → `waitForTenantExposure` → gate release. Restart recovery intact: DB-persisted pending plus membership re-resolve; provider remount re-probes exposure; queue plus cron cover the clientless case. No stranding vector introduced or removed by the restoration.

## 8. Tenant Isolation Findings

No onboarding-relevant isolation issue found. `tenantClient` binds only to confirmed schema; creation flows touch only public-schema inserts plus RPCs; no tenant-table writes precede context establishment. Entity identity derives per selected entity with no fallback. Files unmodified since prior verified audits.

## 9. Provisioning / Exposure Findings

Legitimate `c18cf6f3` bootstrap chain fully preserved: `ensureInitialCompany`, provisioning RPC usage, 90s/4s exposure waiter, gate hold, edge verify-after-PATCH, probe Gates 1/2. None of these files appear in the restoration diff. Verify-vs-serve remains a monitored residual risk, unchanged.

## 10. Historical Comparison

`b963ed4a` (choice UI) → `c18cf6f3` (auto effect layered on top, form kept as fallback) → restoration (auto effect removed, form restored as primary). Net effect returns the screen to its `b963ed4a` contract plus intervening polish (friendly errors, a11y semantics, 44px targets). `ensureInitialWorkspace` survives as dead-but-tested code — intentional per task orders, flagged as optional future cleanup, not a defect. No PRD-flow behavior from `b963ed4a` was lost that has not been restored.

## 11. PRD / Implementation Matrix

| Area | PRD requirement | Implementation | Status | Evidence |
|---|---|---|---|---|
| Create/Join choice | v1.4 choice for clean slate | Choice renders first, zero writes | COMPLETE | `WorkspaceCreation.tsx:110-125` + diff |
| User-selected name | Create branch submits details | Manual form, user name → slug | COMPLETE | `:51-62` |
| Invitation precedence | Invite before creation; never shadowed | Gate order + tests | COMPLETE | `tenantGate.ts:189-190`, tests `:41-70` |
| Pending approval | Intentional wait state | Dedicated screen, 5s poll | COMPLETE | Unchanged file |
| Workspace approval | External Platform Office | No in-app approve path | COMPLETE | Grep clean |
| Company creation | Async provision + exposure confirm | Untouched chain | COMPLETE | Diff absent |
| Tenant provisioning | Engine + queue + edge | Untouched | COMPLETE | Diff absent |
| Readiness | Ready + probe-true release | Untouched | COMPLETE | `tenantGate.ts:203-207` |
| Invitation discovery (no-membership users) | Auto-detect at startup | Provider query + gate | COMPLETE | Unchanged |
| Invitation discovery (active members) | Implied by lifecycle | Nulled; no inbox surface | DEFECT (known, deferred) | `contexts.tsx` zero-active gate |
| Workspace rename | Unspecified | No service/UI | UNSPECIFIED | Grep clean |
| Workspace switching | Session pick, active-only | Untouched | COMPLETE | Unchanged file |
| Restart recovery | Rehydration | DB re-resolve + re-probe | COMPLETE | Unchanged files |
| Failure recovery | Retry + idempotency | Inline errors + unique-slug converge | COMPLETE | Unchanged logic |

## 12. Waterfall Roadmap Cross-Check

M5 ("auto workspace + auto company", 100%, 2026-09-05) is now STALE in its workspace half: auto workspace removed while auto company remains. M6 (manual creation + switching) accurate and now the primary path again. M8 Step 2 (tenantGate multi-entity test fix) status unverified here — still listed PENDING; the gate test file changed since, so the item needs re-check, not assumption. No roadmap file edited per instructions.

## 13. Confirmed Defects

1. Active-member invitation invisibility (scenario E): provider nulls invites for users with active memberships and no inbox surface exists. Evidence: `contexts.tsx` invite-load condition; exhaustive surface grep. Known before, intentionally deferred, still present.
2. Pending outranks multi-workspace selection: a user with two usable memberships plus a stale pending row (and no session pick) lands on the waiting screen instead of selection. Evidence: gate order `tenantGate.ts:189-193`. Pre-existing, low frequency, residual.

## 14. Missing Features / Product Decisions

Invitee inbox or indicator for active members; workspace rename UI; approval notifications; rejected/suspended workspace surfaces; M5 roadmap wording update. All UNSPECIFIED or deferred, none correctness-blocking.

## 15. Completed Work

Auto-create removal verified by diff (effect, state, wait UI, import all gone). Choice-first rendering verified. Invitation precedence verified in code plus four pinned test assertions. Dismissal fallback verified. Company/provisioning/exposure/isolation/recovery chains verified untouched by diff absence. Prior audit reports were not modified.

## 16. Remaining Work

Evidence-backed only: active-member invitation discovery (defect, needs design); pending-vs-selection ordering decision (residual); roadmap M5/M8 wording refresh (docs); optional `ensureInitialWorkspace` dead-code removal (cleanup, needs test updates); rename and notifications (product decisions). No priority assigned beyond existing PRD severity.

## 17. Files Inspected

`src/pages/WorkspaceCreation.tsx`, `src/domain/tenant/tenantGate.ts`, `src/tests/critical/tenantGate.test.js`, `src/domain/tenant/tenantCreation.ts` (grep), `src/lib/tenant/contexts.tsx` (prior verified reads), `src/pages/WorkspaceInvitation.tsx`, `src/pages/WorkspacePendingApproval.tsx`, `src/components/layout/WorkspaceSelectionSheet.tsx`, `src/components/app/TenantGate.tsx`, `src/pages/CompanyCreation.tsx`, `src/components/layout/CreateCompanySheet.tsx`, `src/lib/tenantClient.ts`, `src/pages/ProvisioningProgress.tsx`, `src/App.tsx`, `supabase/functions/postgrest-schema-exposure/index.ts`, provision plus probe migrations, `docs/prd/multi-tenancy/Waterfall-roadmap.md`, `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md`, `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`, loading plus engagement PRDs (prior reads), `AGENTS.md`, skill index.

## 18. Files Created

`docs/reports/multi-tenancy/post-restoration-workspace-lifecycle-audit-2026-09-10.md` (this report). Nothing else.

## 19. Git Scope

Before: 1 modified onboarding HTML plus 5 untracked files, all other agents' work. After: identical plus this report. `git diff --stat` shows only the pre-existing onboarding HTML change. Zero application-code, migration, config, test, or documentation modifications. No validation commands run per task constraints.
