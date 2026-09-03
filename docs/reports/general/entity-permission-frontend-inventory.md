# Entity Permission Frontend Inventory — Read-Only Investigation Report

This report was written by OpenCode on 2026-08-09 via Local Runner.

## Objective and Scope

Investigate which entity-level permission resources and actions the frontend references, per `docs/prompts/prompt003.md`. The goal is a decision input for production permission seeding: whether any entity permission is required by functionally shipped Phase-1 code.

**In scope:** static inspection of `src/` — authorization implementation, permission constants/types, executable checks, and look-alike gates.

**Excluded:** No live SQL, no DB inspection, no migration/code changes, no full build. All conclusions come from static reads and greps. Working tree was untouched during the investigation.

## Conclusion

> No current frontend permission dependency identified.

The only executable `hasAuthorization()` check in the frontend is a diagnostic probe on the platform-operator-only `/debug/tenant` page. No business module reads `entity_permissions` or calls a permission RPC. Seeding production permissions today is not justified by any shipped consumer.

## Evidence

### A. Executable resource/action pairs

Exactly one, in one file:

| Resource/Action | Location | Classification |
| --- | --- | --- |
| `('invoice','read')` | `src/pages/debug/TenantDebug.tsx:192` | **Placeholder probe** — feeds a diagnostic display row; no downstream consumer reads it. Route `/debug/tenant` is operator-gated (`is_platform_operator`, TenantDebug.tsx:63–111; fail-closed redirect :120–134) and mounted only at `AppShell.tsx:225`. |

### B. Implementation and references

- `src/lib/tenant/contexts.tsx` — the only file implementing entity-permission logic:
  - SELECT on `.from('entity_permissions')` filtered by `entity_id` + `user_id` (:333–337), locally matches resource/action (:359–367, exact and wildcard), exposes `permissionCount` + `hasAuthorization` (:342, :370–374).
  - `useAuthorization()` (:377–381). Sole consumer: `TenantDebug.tsx:55`.
  - Provider mounted globally in `AppShell.tsx:176`, wrapping all routes.
- `src/lib/tenantClient.ts` — no permission logic; not executed by any business module.
- `src/lib/database.types.ts` — generated types do not include `entity_permissions` or `has_entity_permission` (only `record_audit_log`). The contexts query sidesteps typing via casts.

### C. Business module dependency on `entity_permissions`

**None.** Invoice, Quotation, CSR, Waybill, RFQ, BOQ, Receipt, Letter, Item Library, Client, Project, Compliance, Reports all operate without an entity-permission gate. `contexts.tsx:334` is the only `.from('entity_permissions')` in `src/`. `live-public-schema.sql` (RLS :190–211, function :1100–1121) is server-side scope, not frontend.

### D. `hasAuthorization()` production call sites

**None.** Definition at `contexts.tsx:359–370`. Single call site is the probe at `TenantDebug.tsx:192` inside `/debug/tenant`.

### E. Look-alike gates — excluded with reason

| Match | Location | Reason excluded |
| --- | --- | --- |
| `canWriteInvoiceCache()` | `src/hooks/useInvoiceDetailData.ts:25` | IndexedDB write guard, not RBAC |
| `canDeleteInvoice()` | `src/modules/invoices/domain/invoiceStatusTransitions.ts:42` | Document-status rule (settled/archive) |
| `canEdit`/`canDelete`/`canCreateAdvance` | `src/modules/invoices/domain/invoiceActionAvailability.ts:25–30` | Document-state rules (`isArchived/isPaid/hasPayments`) |
| `is_platform_operator` | `TenantDebug.tsx:69,84`; `src/pages/Settings.tsx:46` | Platform role RPC, unrelated to `entity_permissions` |
| `CREATE`/`UPDATE`/`LINK` labels | audit/CSR/waybill modules | Audit-trail event labels, not permission actions |
| `getUserFacingMutationMessage({action})` | pages | Error-message context key |
| `.role` readings (signatory etc.) | waybill/CSR/PDF | Business/financial document fields |

### Permission constants or types

**None defined.** `**/*permission*` has no matches in `src/`. The only types are inline `AuthorizationContextValue` (contexts.tsx:299–304) and `{resource, action}` rows.

## Conclusion versus decision

- Fact: no shipped business module consumes permissions.
- Fact: the read path is live — `AuthorizationProvider` runs on every route and queries a 0-row table; `/debug/tenant` displays the count.
- Therefore: "permissions will not be needed" is not supported. "No dependency exists today" is. Phase 2/3 consumers (deferred workspace/entity selectors at contexts.tsx:101–104, :189–191, schema-level RLS policies) will exercise it.
- **Decision logic:** seeding is a provisioning decision for Phase 2, not a Phase-1 contract requirement. Recommended path: defer seeding until an executable consumer exists. The infrastructure will surface seeds without code change.

## Risks and Limitations

1. `grep` for `action:`/`resource:` in `src/` exceeded the 100-match tool cap once; results reviewed were business domain objects (queries, save effects), and a targeted re-check on permission combinations found nothing. Residual risk of a missed conditional gate is low but non-zero.
2. RLS behavior on production schemas was not executed or asserted; the evidence is the SQL definitions only.
3. `git status` was clean before investigation, so no repo evidence of pending permission wiring exists outside these files.

## Verification

- Static inspection only; no code modified, no migration, no DB access.
- `git status --short` clean after investigation.
- `bun run typecheck` / `audit:load` not run — investigation touched only reads; no code changed.

## Deferred Work

- Architecture-council review of the seeding decision (per `docs/prompts/prompt003.md`).
- Delegation-log line for this task is recorded here and appended to `docs/reports/GENERAL/delegation-log.md`.

## Delegation

```
[DELEGATION] task="read-only entity authorization inventory for phase-2 seeding decision" | domain="auth" | subagent=NONE | justification="No SUBAGENTS.md persona matches a read-only frontend permission inventory audit" | harness="opencode local"
```