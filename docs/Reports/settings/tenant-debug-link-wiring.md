# Tenant Debug Link from Settings

This report was written by OpenCode on 2026-08-08 via Local Runner.

## Objective and Scope

The `/debug/tenant` page (TenantDebug) existed and was gated by the
`is_platform_operator` RPC, but no in-app link reached it. This task
surfaced the page from Settings > System for genuine platform operators by
reusing the exact existing `is_platform_operator` RPC check. No new
authorization logic was created. The machine check was not duplicated.

Excluded: changes to the existing email allowlist admin gate, the
TenantDebug page internals, and route registration.

## Evidence and Changes

Current working tree diff across two files:

- `src/pages/settings/settings-config.ts`
- `src/pages/Settings.tsx`

| File | Change |
| --- | --- |
| `settings-config.ts` | Added `Terminal` icon import. Widened `ActiveSectionId` union with `'tenant-debug'`. Added `operatorOnly?: boolean` flag. Added a `tenant-debug` SettingsItem to `SYSTEM_GROUP`. `buildGroups` now takes `(isAdmin, isOperator)` and gates `operatorOnly` items on the operator flag before `adminOnly`. |
| `Settings.tsx` | On mount, probes `is_platform_operator` RPC with `p_user_id` (the exact call TenantDebug.tsx uses), setting `isOperator` only on strict `true` (fail closed). Passes `isOperator` into `buildGroups`. Added `handleSelectSection`, which navigates to `/debug/tenant` for the debug item instead of selecting a section. |

Other candidate surfaces reviewed and rejected as non-reusable:

- `SettingsShell.tsx` renders settings nav items as triggers of a section
  switch; it has no external-link notion. Ading a nav-item that is not a
  section required either a new prop or a new route-aware item type. The
  chosen approach reuses the existing `onSelect` slot with one interception
  branch.

## Verification

- `bun run typecheck` — passed (exit 0) on both passes.
- `bun run audit:load` — passed with only pre-existing findings.
- `git status` — only the two intended files modified.

## Risks and Limitations

- The nav item renders only after the operator RPC, resolves. Standard
  operators see the link mount momentarily after page load.
- The settings page and TenantDebug each call the same RPC once; no
  concurrency hazard, but duplicate network round trip per page visit. A
  shared operator hook could remove the duplication if another surface
  needs the flag.

## Delegation

`frontend-developer` reviewed the change (gating, regression, type safety)
and returned PASS. One nit adopted: the operator probe now fails closed on
RPC errors via a try/catch wrapper, matching the TenantDebug.

[DELEGATION] task="Review Tenant Debug settings link change (gating, regression, types)" | domain="settings-ui / code-review" | subagent="frontend-developer" | source=".opencode/agents/frontend-developer.md" | harness="opencode local"