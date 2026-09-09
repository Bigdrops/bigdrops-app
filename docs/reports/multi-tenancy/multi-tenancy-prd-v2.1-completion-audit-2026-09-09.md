# Multi-Tenancy PRD v2.1 Completion Audit

This report was written by Muse Spark on 2026-09-09 via OpenCode.

- Objective: Audit PRD v2.1 against current implementation. Document remaining work.
- Scope: Full PRD v2.1 (all sections). Frontend, backend, lifecycle, docs.
- Files changed: NONE except this report. Zero implementation changes.
- Skills used: supabase, react-dev.
- Documentation standard: ASD-STE100 Simplified Technical English.
- Changes made: NONE.
- Verification result: PRD read in full (1242 lines). Implementation inspected file by file. Live read-only probes confirm DB state. `git status` before/after shows only this new report file.
- Risks or limitations: UI copy verified by code read, not by running the app. No production data touched.
- Deferred work: None. This audit is complete.

---

## 1. EXECUTIVE SUMMARY

**Overall status: PRD v2.1 is ~90% effectively complete.** Backend tenancy is done and live-verified. Frontend flows are done except preparation-UX polish. No critical tenancy-correctness gap remains.

- Major completed areas: tenancy hierarchy, action-based permissions, wildcard model, templates, invite lifecycle + RPCs, ownership transfer, core tables, operator model, zero-entity onboarding, provisioning engine + status contract, canonical seeder (v2 live), exposure automation + queue + probe + gate hold, RLS hard-delete policy, archive/restore RPCs + UI, audit table, Phase-0 cleanup (both legacy columns gone live).
- Major remaining areas: first-company preparation UX (new work, P2), purge countdown + notifications (P2), canonical-list write validation (P1), invite-expiry display job (P3), workspace purge automation (P2/deferred decision).
- Newly discovered frontend work: reassuring preparation experience, restart-resume messaging, ProjectLinkDialog raw-error copy.
- Critical tenancy gaps: NONE. All fail-closed paths verified.

---

## 2. PRD REQUIREMENT MATRIX

Status key: IMP = IMPLEMENTED · POL = IMPLEMENTED/NEEDS POLISH · PART = PARTIALLY IMPLEMENTED · NOT = NOT IMPLEMENTED · DEF = INTENTIONALLY DEFERRED · AMB = PRD AMBIGUITY.

| PRD Section | Requirement | Current Implementation | Status | Evidence | Remaining Work |
|---|---|---|---|---|---|
| §0–§2 | Hierarchy, boundaries, design principle | Live: 11 entities isolated, workspace→entity→schema | IMP | Live probe 11/11; `tenantGate.ts:180` | None |
| §3.1 | Two permission layers | Workspace toggles + entity rows enforced in RPCs/RLS | IMP | `archive_entity` toggle checks; `has_entity_permission` live | None |
| §3.2 | owner/member + toggles | Tables + checks live | IMP | Migration `20260714000000`; RPC usage | None |
| §3.3–§3.5 | Action model, wildcard, resolution | `has_entity_permission` live, RLS uses it | IMP | Live fn present; `20260717000000:329-350` | None |
| §3.4.1 | App-layer canonical-list validation on writes | No UI/RPC path validates; seeder uses canonical set | PART | `AdminSettingsSection:396-439` writes unchecked; `usePermissionTemplates:73-74` display-only | P1 backlog #1 |
| §3.6 | Templates convenience-only, reapply explicit | Tables + `apply_permission_template` live; UI grant/remove via RPCs | IMP | Live fn present; `AdminSettingsSection:251-271` | None (edit-semantics deferred per §12) |
| §3.7 | Invite grants mirror + copy | Table + accept-time copy + cross-ws guard live | IMP | `20260829000000:66-72,197-202` | None |
| §3.8, §6, §11.3 | Operator scope, single power, hierarchy | Table + hierarchy fn + `approve_workspace` live | IMP | All 3 fns live; `20260905010000:128-177` | None |
| §3.9 | Permission audit trail | Absent (lifecycle audit exists, permission audit does not) | DEF | No table found | Keep deferred |
| §3.10 | Accept invite (JWT email, expiry, guard) | Live with all three checks | IMP | `20260818000001:168-208` | None |
| §3.11 | Roles model, preloads, assignment rules | Seeded roles + guarded assign RPC + company scope live | IMP | All live; `20260819000000:184-253` | None (edit semantics DEF) |
| §4 | Lobby, invite visibility, lifecycle | Visibility policy + UI + enforcement live | POL | `contexts.tsx:161-188`; `WorkspaceInvitation:74-100` | Display-expiry job missing (P3 #2) |
| §4.1 | Create/revoke invitation RPCs | Live + UI send/revoke/expiry display | IMP | `AdminSettingsSection:207-218,299-336,491-494` | None |
| §5 | Core tables, no owner_id, pending index | Live verified: `owner_id`=0 cols, single-owner + pending indexes in migrations | IMP | Live probe 0/0; `20260714000000:125-129` | None |
| §7 | Ownership transfer atomic | RPC + type-email-confirm UI | IMP | `AdminSettingsSection:87-139` | None |
| §8 | Workspace soft-delete + purge | Archive semantics unclear in code; NO purge automation | PART | No ws-purge cron; `cron.job` has only notification + business-row jobs | P2 #3 (decision + job) |
| §8A.1–8A.4, 8A.6, 8A.7 | Entity states, archive/restore/purge, interactions | All RPCs + audit + RLS policy live; 30-day gate live | IMP | `20260905020000:74-276`; live fns + `entities_delete_purged` only | None |
| §8A.5 | Hard-delete only when purged | Only `entities_delete_purged` policy live | IMP | Live `pg_policies` = 1 row | None |
| §8A.8 | Archived schemas stay listed, RLS denies | Exposure adds only; RLS denies archived | IMP | Queue-only `_prov_expose` + RLS | None |
| §8A.9 | Lifecycle audit | Table + getter RPC live; archive rows recorded | IMP | Live audit rows for 6 archived entities | None |
| §8A.10 | Archive/restore confirms | Confirm dialogs with 30-day copy live; View Archived toggle live | IMP | `CompanyManageSection:167-183,250-271` | None |
| §8A.10 | Purge countdown + notifications | No countdown, no purge emails/in-app notices | NOT | Grep: none in `src` | P2 #4 |
| §8A.11 | Open questions | Undecided (restore authority, limits, configurability, purge runner, audit phase, View Archived phase) | DEF | PRD text | Product decisions needed |
| §9 | Zero-entity → create-first-company | Gate `create-company` → auto `ensureInitialCompany` | IMP | `TenantGate:104-105`; `CompanyCreation:73-150` | None |
| §9.1–9.2 | Provisioning status contract | Table + transitions live; external-read-only pattern kept | IMP | Live table; `20260906103000:582,590-592` | None |
| §9.3 | Creator auto-grant | Canonical seeder v2 live; Adel 58/4 = Anthropology | IMP | Live `prosrc` has wildcard + 13 resources | None |
| §10 | Phase 0 grandfathering | Legacy columns gone live; ownership via members | IMP | Live probe 0/0 | Historical; none |
| §11 | Future health/incidents/roles | Not built, by design | DEF | PRD text | Keep deferred |
| §12 | Supavisor per-query | Code uses `client.schema()` per call (no search_path set) | IMP | `tenantClient.ts:30-33` | None |
| §12 | Exposure registration confirm | Built: queue + edge + probe + gate (exceeds the open item) | IMP | Pipeline files + live 0-pending | None; close item |
| §12 | dblink/FDW, service accounts, extra operator roles, rate limits | Untouched, as specified | DEF | No code found | Keep deferred |
| §12 | Drop `is_platform_admin` | Done live | IMP | Live probe 0 | None; close item |
| §12 | Advisory locking | In provisioner | IMP | `20260906103000` lock call | None |
| §13 | Success criteria | All verifiable items hold live (wildcard, reapply, uniqueness, archive, cross-ws, operators, auto-grant, expiry, role scope, lifecycle) | IMP | Live probes + code | Canonical-validation criterion inherits P1 #1 |

Matrix count: IMP 30 · POL 1 · PART 3 (§3.4.1, §4 display job, §8) · NOT 1 (§8A.10 notices) · DEF 7.

---

## 3. FRONTEND GAP ANALYSIS

| Area | PRD requirement | Implementation | Verdict |
|---|---|---|---|
| First-company creation | §9 route to create flow | Auto-bootstrap + fallback form; success held until exposure confirmed | Done; copy is technical |
| Provisioning UX | None specific (only route + status table) | `ProvisioningProgress`: "Setting Up Your Company… refreshes automatically", 3s poll, sign-out with background-continues dialog | Done / needs polish |
| Preparation/loading state | NOT specified (gap) | Technical copy ("Setting up schema…"); no reassuring first-use messaging | NEW WORK (P2-A) |
| Readiness transition | Implied by gate | Gate holds on provisioning screen; no false success | Done |
| App restart during provisioning | NOT specified (gap) | Works technically (remount resolve + trigger + 10s re-probe); no resume messaging | NEW WORK (P2-B) |
| Retry/recovery | Implied | `Try Again` = recheck; EntityProvider retry; queue + cron backstop | Done |
| Company switching | Session entity pick | `CompanySelectionSheet` + `selectEntity`, session-only | Done |
| Workspace switching | One-active-per-session constraint | `WorkspaceSelection` + session-only pick | Done |
| Lifecycle UI | §8A.10 confirms + View Archived | Both live with 30-day copy | Done |
| Purge UI | None (purge is privileged op) | RPC only, no button/countdown/notices | Intended; countdown+notices = P2 #4 |
| Invitations | Accept/pass/revoke/expiry display | All live; auto-detect only, no manual check button | Done |
| Permissions/members | Role grant/remove, transfer, remove member | All live with type-to-confirm | Done; canonical validation = P1 #1 |
| Settings/management | Company + admin sections | Live; tenant-scoped caches | Done |
| Tenant context | Correct schema per entity, no stale state | Session refs, memo client, schema-keyed caches | Done |
| Cache isolation | Implied by isolation | settings/list/dashboard caches schema-keyed + fail-closed; docs/notifications uncached-but-scoped | Done |
| Mobile UX | Capacitor shell parity | Shell + offline libs exist; no UX audit evidence | P2 (existing mobile track) |
| Desktop UX | Standard flows | Complete flows | Done |
| Raw-error leak | Must never show internals (new requirement) | Gate makes it unreachable except `ProjectLinkDialog:78-80` which renders the exact string on `!isReady` | NEW WORK (P2-C) |

---

## 4. NEW WORK ITEM — FIRST COMPANY PREPARATION EXPERIENCE

**Status: NOT in PRD. Newly discovered through real-world testing.**

Observed sequence: company created → provisioning starts → exposure pending → user acts → tenant not ready. Technical behavior is now correct (fail-closed hold). User experience is not: either technical copy or, in one dialog, the raw internal error.

Required product behavior (no implementation prescribed):

- First company: creation → provisioning → exposure preparation → user-facing preparation state → automatic readiness detection → normal application.
- Messaging direction (example): "Preparing your company…" / "We're setting things up for your first use. This usually takes a little while."
- Rules: progress/state indication; automatic polling and recovery; never the raw readiness error; never false success; no tenant-dependent screens before readiness.
- Restart case: app closed during preparation → reopened → incomplete preparation detected → preparation resumes → waits for actual readiness → continues normally. (Technical resume works today; the messaging layer does not exist.)
- PRD placement: new subsection under §9 (onboarding UX) or §8A.10-style product expectations for provisioning. Needs product sign-off on copy, timeout messaging, and failure escalation.

## 5. EXISTING DEFERRED WORK (re-verified, still deferred)

- §3.9 permission audit trail: still absent. Keep deferred.
- §11 health aggregation, incidents, extra operator roles: absent. Keep deferred.
- §12 dblink/FDW, service accounts, invite rate limits, role edit semantics: absent. Keep deferred.
- §8A.11 six open questions: unanswered. Need product decisions before purge automation.
- Closed (do not carry forward): PostgREST registration confirm (built), `is_platform_admin` drop (done live), advisory locking (in provisioner).

## 6. PRD CONTRADICTIONS / AMBIGUITIES

1. **Status line vs authority.** PRD header says Status: Draft (`:3`); directory index treats v2.1 as authoritative single source of truth. Implementation follows the body text. Decision needed: mark v2.1 Approved/Superseded explicitly.
2. **§8A amendment note vs §8A.5/§13.** Note says implementation is "a separate future task" (`:105`); §8A.5 calls the delete-policy fix a migration requirement; §13 lists lifecycle criteria as v2.1 additions. Implementation resolved toward must-now (all live). Decision: update the note to reflect built status.
3. **§8A.10 SHOULD notifications.** Normative SHOULD with zero implementation. Decision: schedule (P2 #4) or downgrade to MAY.
4. **§4 daily expiry job.** Referenced as existing; no cron evidence. Enforcement intact via RPC check. Decision: document as display-only job or remove reference.
5. **Role-editor semantics.** Deferred per §12, but a role editor UI exists. Unverified whether its copy presents snapshot semantics. Decision: UX copy check (P3).

## 7. RECOMMENDED WORK BACKLOG

### P0 — critical tenancy correctness
None. No P0 tenancy item remains. (Non-tenancy P0s like migration-push blockage live in other tracks.)

### P1 — required PRD functionality
1. **Canonical-list write validation.** Ref: §3.4.1, §13. Problem: any UI/RPC path can insert typo'd resource/action that silently denies. Outcome: shared validator + enforcement in `apply_permission_template`, invite-grant paths, role editor. Verify: test inserts `viwe` → explicit error. Area: backend RPC + frontend.
2. **Workspace purge path decision.** Ref: §8. Problem: archive-then-purge for workspaces has no automation or UI. Outcome: product decision + (if yes) scheduled purge mirroring §8A.4. Verify: archived test workspace purges post-retention. Depends: §8A.11 purge-runner decision.

### P2 — frontend/UX completion
- **A. Preparation experience.** Ref: new (§9). Outcome: reassuring copy, progress indication, no raw errors. Verify: fresh-company walkthrough shows only approved copy.
- **B. Restart-resume messaging.** Ref: new (§9). Outcome: reopening mid-provisioning shows preparation state, resumes automatically. Verify: kill-and-reopen test.
- **C. ProjectLinkDialog error copy.** Ref: new. Problem: renders raw readiness string (`ProjectLinkDialog.tsx:78-80`). Outcome: friendly waiting state. Verify: dialog during exposure shows approved copy.
- **#4. Purge countdown + notifications.** Ref: §8A.10. Outcome: owner-visible countdown + purge warnings. Depends: §8A.11 decisions.

### P3 — polish/documentation
- **#2. Invite-expiry display job.** Ref: §4. Outcome: pending→expired flip or documented removal. Verify: expired invite displays correctly.
- **Role-editor copy check.** Ref: §12. Outcome: snapshot semantics stated in UI. Verify: copy review.
- **PRD status + §8A note update.** Ref: §6 items 1–2. Outcome: PRD text matches built reality.

## 8. COMPLETED WORK THAT SHOULD NOT BE REOPENED

Hierarchy + isolation; action/wildcard permissions; templates; invite lifecycle + RPCs; ownership transfer; core tables + indexes; operator model; zero-entity onboarding; provisioning engine + status contract; canonical seeder v2 (live); exposure queue + edge + probe + gate hold; fail-closed client; archive/restore RPCs + UI + audit; hard-delete RLS policy; Phase-0 cleanup; cache isolation (settings, lists, dashboard, notifications, documents); restart recovery mechanics; workspace/company selection.

## 9. FINAL COMPLETION ASSESSMENT

- **Effective completion: ~90%.** Backend correctness ~100% of specified behavior. Frontend flows ~85% (missing only preparation-UX layer).
- **Genuinely left:** P1 canonical validation + workspace-purge decision; P2 preparation experience (A/B/C) + purge notices; P3 display job + copy checks + PRD text updates.
- **Frontend-only:** P2-A, P2-B, P2-C, role copy check.
- **Backend/database:** P1 canonical validation (RPC), P2 workspace purge automation (if decided).
- **Deferred (unchanged):** §3.9, §11, §12 rate limits/service accounts/FDW/role semantics, §8A.11 questions.
- **Newly discovered:** preparation experience requirement (P2-A/B/C).
- **Implement next:** P2-A preparation experience (highest user-visible value, smallest scope), then P1 canonical validation.
