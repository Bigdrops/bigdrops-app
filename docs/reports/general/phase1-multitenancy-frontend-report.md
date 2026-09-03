# Phase 1 Multi-Tenant Frontend Infrastructure — Final Report

This report was written by OpenCode on 2026-08-08 via Local Runner.

---

## 1. Objective and Scope

This report covers Phase 1 of the frontend migration to full conformity with
PRD v1.1 (`docs/PRD/multi-tenancy/erp-frontend-prd-v1.1.md`).

Scope: infrastructure only. This report covers the tenant context layer, the
tenant client abstraction, the provider wiring, and the diagnostic page.

Business modules are out of scope and were not migrated.

---

## 2. Existing Components — Status

All Phase 1 components exist and conform to the PRD contract.

| Component | File | Status |
| --- | --- | --- |
| Workspace Provider | `src/lib/tenant/contexts.tsx` | Conforms |
| Entity Provider | `src/lib/tenant/contexts.tsx` | Conforms |
| Authorization Provider | `src/lib/tenant/contexts.tsx` | Conforms |
| Tenant Client | `src/lib/tenantClient.ts` | Conforms |
| Diagnostic Page | `src/pages/debug/TenantDebug.tsx` | Conforms |
| Provider wiring and route | `src/components/app/AppShell.tsx` | Conforms |

### 2.1 Provider Hierarchy

The hierarchy is `Authentication → WorkspaceProvider → EntityProvider →
AuthorizationProvider`. `AppShell.tsx` mounts this order and registers the
lazy diagnostic route at `/debug/tenant`.

### 2.2 Workspace Contract

- `WorkspaceProvider` loads `workspace_members` joined to `workspaces`.
- 0 active workspaces → `workspace = null` (empty).
- 1 active workspace → auto-select.
- More than 1 → `workspace = null` (deferred). No arbitrary selection.
- No hardcoded `bigdrops-main` anywhere in provider code.

### 2.3 Entity Contract

- `EntityProvider` loads active `entities` for the resolved workspace.
- 0 entities → `entity = null`.
- 1 entity → auto-select.
- More than 1 → `entity = null` (deferred).
- Schema name is derived only from provider state:
  `entity_${workspace.slug}_${entity.slug}`. This is the sole owner of the
  resolved schema name.

### 2.4 Provisioning Contract

- Provisioning is read exclusively through the member-scoped RPC
  `get_entity_provisioning_status(p_entity_id)`.
- The six-state union is enforced at runtime by `isProvisioningStatus()`.
- Unknown backend status → `setProvisioningStatus(null)` plus error
  `Invalid backend provisioning status: ${status}`. Unknown is never mapped
  to `failed`.
- `schemaName` resolves only when status is `ready`.
- No polling. No realtime. Recheck is manual only (`recheckProvisioning`).

### 2.5 Authorization Contract

- Direct SELECT on `entity_permissions` is permitted by the RLS policy
  `entity_permissions_select_self` (member can read own rows).
- No replacement auth system. No business-table queries. No
  billing/subscription/plan logic.
- Effective Permission Count on the diagnostic page uses
  `authorization.permissionCount` (the provider permission set).

### 2.6 Tenant Client

- `createTenantClient(client, schemaName)` returns a routing abstraction.
- Null schema → not-ready client whose `from`/`rpc` throw.
- Resolved schema → `client.schema(schemaName).from/rpc`.
- It does not authenticate, authorize, discover, infer, or provision.
- `src/supabase.ts` is unmodified.

### 2.7 Diagnostic Page Access

- `is_platform_operator` RPC is reused. No second access-control mechanism.
- Non-operator → `Navigate` to `/`.
- Probe pending → fail-closed message. No diagnostic data before operator
  confirmation.

---

## 3. Missing or Incomplete Components — Changes Made

Two gaps were found and corrected this session.

### 3.1 Schema Resolution Source — now provider state

The diagnostic page hardcoded `'Startup'` as the Schema Resolution Source.
The PRD requires the source to be one of Startup / Cache / Refresh / Workspace
Change / Entity Change. The value now comes from provider state.

Changes in `src/lib/tenant/contexts.tsx`:

- Added exported type `SchemaResolutionSource` with the five allowed values
  (`startup`, `cache`, `refresh`, `workspace-change`, `entity-change`).
- Added `schemaSource` state to `EntityContextValue`.
- The source is recorded as `startup` on the first schema resolution. Phase 1
  resolves the schema exactly once at provider start, so `startup` is the only
  reachable value. Later phases (cache, refresh re-checks, workspace/entity
  switching) will record their own source values through the same field.

Changes in `src/pages/debug/TenantDebug.tsx`:

- Removed the hardcoded `'Startup'` display.
- Added a `SOURCE_DISPLAY` map for the five values.
- The row renders `entity.schemaSource` from provider state.

### 3.2 Provisioning status runtime guard — carried forward

The runtime type guard (`VALID_PROVISIONING_STATES`, `isProvisioningStatus`,
safe status parsing) from the prior correction session is present in the
current file and verified intact. See
`docs/Reports/GENERAL/phase1-multitenancy-review.md` for that session's detail.

---

## 4. Exact Files Modified

| File | Modification |
| --- | --- |
| `src/lib/tenant/contexts.tsx` | Added `SchemaResolutionSource` type, `schemaSource` state, source recording effect, context value wiring |
| `src/pages/debug/TenantDebug.tsx` | Replaced hardcoded source display with `entity.schemaSource` via `SOURCE_DISPLAY` map; added type import |
| `docs/Reports/GENERAL/delegation-log.md` | Delegation log entry appended |

No business module was modified. `src/supabase.ts` was not modified.
`src/lib/tenantClient.ts` and `src/components/app/AppShell.tsx` required no
changes this session.

The CRLF/LF warning on Windows git is a config artefact, not a code change.

---

## 5. Verification

### 5.1 `bun run typecheck`

```
$ tsc --noEmit
(no errors)
```

**Passed.** Zero TypeScript errors.

### 5.2 `bun run audit:load`

```
--- AUDIT SUMMARY ---
Files Scanned:    767
Oversized Files:  24
Broad Selects:    6
Component Fetches: 7
Heavy Limits:     3
```

**Passed.** No warning references any Phase 1 file. All warnings are
pre-existing in unrelated business modules.

Build skipped per AGENTS.md hardware policy (never `bun run build`).

---

## 6. Diagnostic Verification — Human Blocked

Live verification of `/debug/tenant` requires a human operator with an
authenticated production session. Code inspection confirms the page renders
provider state only, but the live check cannot be executed by an automated
agent.

Expected values on a healthy production account:

| Field | Expected |
| --- | --- |
| Workspace | `bigdrops-main` |
| Entity | `main` / BIGDROPS |
| Schema Name | `entity_bigdrops-main_main` |
| Provisioning Status | `ready` |
| Schema Resolution Source | `Startup` |

**Remaining human blocker:** a platform operator must open `/debug/tenant` in
an authenticated production session and confirm the values above.

---

## 7. Deferred Work

- Schema Resolution Source values beyond `startup` (cache, refresh, workspace
  change, entity change). These become reachable in later phases when caching
  and workspace/entity switching are introduced. The field is already wired
  for them.
- Workspace and entity selection UI for the multi-result case.
- Business-module migration to the tenant client. Out of Phase 1 scope.

---

## Delegation Log

```
[DELEGATION] task="Phase 1 multi-tenant frontend infrastructure completion and report" | domain="auth" | subagent="NONE" | justification="Infrastructure-only tenant context layer work; routing table has no dedicated multi-tenancy persona and frontend-developer is UI-scoped" | harness="Local Runner"
```
