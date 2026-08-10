# Tenant Settings — Permanent Entity-Scoped Document Identity Fix (Implementation)

This report was written by Buffy on 2026-08-10 via Freebuff.

**Task:** Implement the architecture established by the read-only investigation
`docs/Reports/multi-tenancy/tenant-settings-document-identity-architecture.md`
(decision report). Active code + migration change. No production SQL was
executed by this agent; migration 20260810010000 is human-executed.

---

## A. Files Changed

| File | Purpose |
|---|---|
| `src/hooks/useSettings.js` | Write-path migration: `persistSettings()` / `saveSettings()` now require the schema-aware `tenantClient` and upsert into the **active entity's tenant settings** (`tenantClient.from('settings')`, id=1). No public-schema write remains. Added a fail-loud guard when the tenant client is not ready (no silent public fallback). |
| `src/pages/settings/CompanySettingsSection.tsx` | Passes `tenantClient` (via `useEntity()`) to `saveSettings`. |
| `src/pages/settings/BrandingSettingsSection.tsx` | Passes `tenantClient` to `saveSettings` (was already wired to `useEntity()`). |
| `src/pages/settings/AppThemeSettingsSection.tsx` | Passes `tenantClient` to all 4 `saveSettings` calls. |
| `src/pages/settings/DocumentPrefixesSettingsSection.tsx` | Passes `tenantClient` to all 3 `saveSettings` calls; `tenantClient` added to `useCallback` deps (`executeSoloReset`, `executeFullReset`, `executeSave`). |
| `src/pages/settings/DocumentsSettingsSection.tsx` | Passes `tenantClient` to `saveSettings`. |
| `supabase/migrations/20260810000000_tenant_settings_permission_seed.sql` | **NEW** — extends `_prov_seed_default_permissions` to include the `setting` resource (view/create/edit/delete) so newly provisioned entities can use the Settings UI. |
| `supabase/migrations/20260810010000_tenant_settings_identity_backfill.sql` | **NEW** — human-executed, one-time, guarded backfill of the existing production entity's tenant settings from legacy `public.settings`, plus a `setting`-permission grant to the workspace owner(s). |

**Pre-existing typecheck-error fixes (required to satisfy the "typecheck passes" gate):**
These two files failed `bun run typecheck` before this task (from the prior
Phase-3 commit `a0764f98`); the errors were unrelated to settings. They were
fixed minimally because the task's acceptance criteria require a passing
typecheck.

| File | Pre-existing error fixed |
|---|---|
| `src/pages/Reports.tsx` | `loadEnrichedCollections` / `loadReceivables` / `loadTaxInvoices` now accept `tenantClient` as the first parameter (Phase-3 signature change); the callers were not updated. Wired `useEntity()` → `tenantClient` and updated dep arrays. |
| `src/hooks/useInvoiceMutations.ts` | `attachExistingDocument` was called with a stale second `tenantClient` argument its signature never accepted; removed the extra argument. |

---

## B. Database / Migration Changes

### B1. `20260810000000_tenant_settings_permission_seed.sql` (function definition)

Redefines `public._prov_seed_default_permissions(p_entity_id, p_user_id)` to
grant resources `('invoice'), ('payment'), ('receipt'), ('setting')` × actions
`('view'), ('create'), ('edit'), ('delete')`, idempotent via
`ON CONFLICT DO NOTHING`. `provision_entity()` step 8.7 already calls this
helper with `auth.uid()`, so every **newly provisioned entity** automatically
receives tenant-settings permissions. No `provision_entity()` redefinition was
needed. Scope: function definition only — no table, RLS, or data changes.

### B2. `20260810010000_tenant_settings_identity_backfill.sql` (HUMAN-EXECUTED)

One-time data remediation for the existing entity schema
`entity_bigdrops-main_main` (operator must execute against production). It:

1. Resolves the entity id + workspace id from `public.entities` /
   `public.workspaces` by schema name (no hardcoded UUID).
2. Verifies both rows exist (`public.settings` id=1 and tenant settings id=1)
   and prints the full before-state of each.
3. Backfills the tenant settings row **field-by-field** from `public.settings`,
   **only where the tenant value is NULL/empty/default** (null-preserving):
   `company_tagline`, `company_address`, `company_city`, `company_phone`,
   `company_email`, `company_website`, `footer_text`, `company_logo_url`,
   `signature_url`, `custom_info` (TIN), `app_background_color`,
   `app_card_color`, `app_theme_preset_id`, `app_theme_tokens`,
   `document_prefixes`.
4. `company_name` is sourced from `public.entities.display_name` (trimmed),
   never from `public.settings.company_name` (trailing-space legacy), and only
   written when the tenant value is NULL/empty.
5. `document_prefixes` is restored from `public.settings` **only when the
   tenant value is still the cloned canonical default set** — a guarded,
   one-time restore of the entity's pre-migration configured prefixes. It is
   never re-copied afterwards.
6. **Legacy bank_*** columns (`bank_name`, `bank_account_name`,
   `bank_account_number`, `bank_sort_code`) are **never copied**; the tenant
   `bank_accounts` table is the bank-account authority.
7. Prints the after-state and validates that core document-identity fields
   (name/address/city/phone/email) are populated.
8. Grants `_prov_seed_default_permissions` (now including `setting`) to the
   **workspace owner(s)** of the entity's workspace, so the Settings UI write
   path is authorized. Emits a REMINDER with the exact operator SQL to grant
   to any additional production users.

**Not** a synchronization mechanism: one-time only. No trigger, job, or
function keeps `public.settings` in sync with tenant settings.

---

## C. Settings Ownership After Fix

| Field | Authoritative Source |
|---|---|
| `company_name` | `public.entities.display_name` → tenant `settings.company_name` (seeded at provisioning; preserved by backfill) |
| `company_address` | tenant `settings.company_address` |
| `company_city` (combined city/state) | tenant `settings.company_city` |
| `company_phone` / `company_email` / `company_website` | tenant `settings` |
| TIN / custom registration fields | tenant `settings.custom_info` (TIN represented via `custom_info`) |
| logo | tenant `settings.company_logo_url` (file uploads stay in storage; URL in tenant settings) |
| bank accounts | tenant `bank_accounts` table (NOT legacy `settings.bank_*`) |
| `document_prefixes` | tenant `settings.document_prefixes` (per-entity, [LOCKED] prefix engine) |
| theme / branding | tenant `settings` (`app_theme_preset_id`, `app_background_color`, `app_card_color`, `app_theme_tokens`) |

`public.settings` is **not** an authority anymore: it is no longer written by
the application settings path and is retained only as deprecated legacy data.

---

## D. Write Path After Fix

```
Settings UI section (Company/Branding/Theme/Prefixes/Documents)
  → useEntity() → tenantClient (schema-aware: entity_<ws>_<entity>)
  → saveSettings(updates, tenantClient)
  → persistSettings(updates, tenantClient)
  → tenantClient.from('settings').upsert({ id: 1, ...updates }, { onConflict: 'id' })
  → tenant schema settings row (id=1)
```

No application code writes company settings to `public.settings`. The write is
guarded by a fail-loud check when the tenant client is not ready.

## E. Read Path After Fix (unchanged)

```
EntityProvider / tenant context
  → tenantClient
  → tenant.settings (id=1)
  → normalizeSettings()
  → document projection (partyProjection, previewModel, pdfDownloadHandler)
  → preview / PDF
```

No document read path was changed; no public-settings fallback was added.

## F. Multi-Tenant Safety

- The write path resolves through `useEntity()` → `tenantClient`, which is
  bound to the **active entity's schema** (`entity_<workspace>_<entity>`).
  When a workspace has multiple entities, each Settings UI save targets the
  active entity's settings row only.
- Permissions are **per-entity** (`entity_permissions` rows keyed by
  `entity_id`), and the tenant-schema RLS policies bind to the specific
  entity id captured at provisioning. One entity's user can never read/write
  another entity's settings without an explicit permission row.
- The backfill is scoped to the single resolved production entity
  (`entity_bigdrops-main_main`) and is guarded, null-preserving, one-time.
- No permanent public→tenant synchronization exists, so `public.settings`
  cannot leak one company's data into another entity.
- Document prefixes and theme remain per-entity (tenant settings), satisfying
  the [LOCKED] prefix-engine contract.

## G. Verification

| Gate | Result |
|---|---|
| `bun run audit:load` | PASS (exit 0). Reported warnings are pre-existing in unmodified files; none relate to the changed files or new migrations. |
| `bun run typecheck` | PASS (exit 0, zero errors) — after also fixing the 4 pre-existing Phase-3 typecheck errors in `Reports.tsx` / `useInvoiceMutations.ts` (see A). |
| `bun run test` | PASS — 120/120 critical tests. |
| `git status` | Only intended files changed (6 settings/useSettings files + 2 pre-existing-error fix files + 2 new migrations + docs). No unrelated modifications. |
| `bun run build` | NOT run (prohibited by AGENTS.md host-resource policy). |
| Production SQL | NOT executed by this agent. Migration 20260810010000 must be run by the human operator. |
| Runtime/PDF verification | NOT performed (requires human/operator execution of the migration + UI smoke test). |

**Required operator rollout steps (not automated):**
1. Apply `20260810000000` (function redefinition) via the normal migration flow.
2. Execute `20260810010000` against production (human-executed backfill).
3. Grant `('setting', view/create/edit/delete)` to any production users beyond
   the workspace owner:
   `SELECT public._prov_seed_default_permissions('<entity_id>', '<user_id>');`
4. Smoke-test the Settings UI (Company, Branding, Theme, Prefixes) and a
   quotation/invoice PDF to confirm issuer identity renders from tenant settings.

## H. Remaining Technical Debt

- `company_state` / `company_vat` remain **phantom fields** — they are
  referenced in rendering code (`partyProjection.ts:46`, `pdfDownloadHandler.ts:75`,
  `renderTypes.ts:93-94`) but never existed as `settings` columns. They are
  unchanged (out of scope). TIN continues to render via `custom_info`; city/state
  is the combined `company_city` value. Resolution is a separate task (either
  add the columns + UI fields or remove the phantom references).
- `public.settings` is retained as deprecated legacy data; no cleanup/schedule
  was executed. Removal should be considered only after the write path is
  proven in production.
- `DocumentsSettingsSection` writes `document_fillable_settings`, which is not
  a column in the live `settings` schema; this is pre-existing behavior
  preserved as-is (the persistence layer strips/retries unsupported columns).
- The legacy `logo_url → company_logo_url` shim and column-strip retry logic
  remain in `useSettings.js` (unchanged) as compatibility debt.
- Tenant `bank_accounts` was not verified in this task; if the production
  entity's bank accounts are missing from the tenant `bank_accounts` table,
  that must be remediated separately (report separately, per task §7).
