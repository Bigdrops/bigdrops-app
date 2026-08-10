# Tenant Settings — Document Identity Architecture Decision

This report was written by Buffy on 2026-08-10 via Freebuff.

**Scope:** Read-only reconciliation of the tenant-settings investigation reports against the repository and production state, to decide the permanent architecture for company/document identity. No code, migration, or database changes were made. No build, typecheck, or lint was executed.

**Evidence base (existing reports):**
- `tenant-settings-live-db-investigation.md` (2026-08-10, CommandCodeBot)
- `tenant-settings-final-provisioning-verification.md` (2026-08-10, CommandCodeBot)
- `tenant-settings-complete-identity-investigation.md` (2026-08-10, CommandCodeBot)
- `tenant-settings-provisioning-root-cause.md` (2026-08-09, CommandCodeBot)
- `quotation-seller-identity-trace.md` (2026-08-09, CommandCodeBot)
- `provisioning-settings-seed.md` (2026-08-09, Buffy)
- `phase-2-scope-extraction-report-v2.md`, `phase-2-read-migration-implementation.md` (2026-08-09)
- `docs/prd/multi-tenancy/multi-tenancy-prd.md` (v1.0, 2026-07-12) — **primary architectural authority**
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` (2026-07-15)
- `docs/standard/prefix-engine-settings-standard.md`

Each conclusion below is classified PROVEN (verified in repository migrations/DDL/PRD), INFERRED (consistent with evidence but not directly stated), or UNKNOWN.

---

## EXECUTIVE CONCLUSION

The proven intended architecture is **Model A — Tenant Settings Authority**: `public.entities.display_name` is the entity identity registry, the per-entity `settings` row in the tenant schema (`entity_<workspace>_<entity>.settings`, id=1) is the authoritative store for company/document identity (name, address, contact, logo, TIN, theme, document prefixes), and documents read tenant settings. The `public.settings` table is **explicitly deprecated** by the original multi-tenancy PRD ("[DEPRECATED] Kept for backward compat") with the stated migration pattern "Clone + drop from `public` per entity". The current write-to-public / read-from-tenant split is an **incomplete phased migration** — Phase 2 intentionally moved reads to the tenant schema and explicitly deferred writes to Phase 3 ("requires tenant write permissions"). It is not an intentional final architecture. The permanent fix is therefore: (1) backfill the existing entity's tenant settings row from the legacy `public.settings` data (null-preserving, entity-aware, one-time), (2) migrate the settings write path (`persistSettings`) to `tenantClient`, and (3) keep provisioning's `_prov_seed_settings` contract (company_name from `public.entities.display_name`) while closing the tenant-schema `setting` permission gap so writes are actually possible.

---

## SOURCE-OF-TRUTH MATRIX

| Field | Authoritative Source | Evidence | Confidence |
|---|---|---|---|
| `company_name` | `public.entities.display_name` → `tenant.settings.company_name` (documents read the tenant row) | `_prov_seed_settings()` (`20260809000000`) inserts `(id, company_name)` from `entities.display_name`; PRD §3.1 "entities replaces the singleton settings as the tenant authority"; PRD §3.2 seeds `company_name` into the entity schema | PROVEN |
| `company_address`, `company_city` | `tenant.settings` (entity-level company config) | PRD §1.2 "Configuration isolation: Company name, logo, address, bank details, document prefixes, theme tokens **per entity**"; PRD §2.3 entity `settings` = "Company config, prefixes, theme (single row)"; documents read `settings.company_address/company_city` via `partyProjection.ts:46` | PROVEN |
| `company_phone`, `company_email`, `company_website` | `tenant.settings` | PRD §1.2 (per-entity config); `pdfDownloadHandler.ts:73-74` + `partyProjection.ts` read these from settings | PROVEN |
| `company_tagline`, `footer_text` | `tenant.settings` | Document PDF footer/tagline reads (`pdfDownloadHandler.ts`); `QuotationFormPage.tsx:211`, `useInvoiceReferenceData.ts:20` | PROVEN |
| `company_logo_url` (logo) | `tenant.settings` | `resolveCanonicalLogoUrl(settings)` in PDF pipeline; `BrandingSettingsSection` edits it | PROVEN |
| `custom_info` (TIN) | `tenant.settings` (TIN is stored here as `[{label:"Tin",...}]`) | `normalizeCompanyCustomInfo(settings.custom_info)`; production public.settings holds the TIN, tenant holds `[]` — gap | PROVEN |
| `bank_*` (bank_name/account_name/account_number/sort_code) on settings | **LEGACY — no longer authoritative.** Document bank rendering uses the entity's `bank_accounts` table (tenant schema) | `company-client-data-architecture-audit.md` (2026-06-26): "Legacy — now uses `bank_accounts` table"; `partyProjection.ts:17`, `snapshotBuilder.ts:129-131`, `QuotationFormPage.tsx:754` read `bank_accounts`; `bank_accounts` is in the provisioning template list | PROVEN |
| `signature_url` | `tenant.settings` + `signatories` table (tenant-cloned) | `signatories` in template list; PDF signature from `previewModel.signatory` | PROVEN |
| `document_prefixes` | `tenant.settings` (per-entity numbering) | PRD §4.3 + §7 **[LOCKED] Prefix engine**: "Each entity schema's `settings.document_prefixes` drives it independently"; `resolvePrefix(settings?.document_prefixes, key)` reads `useSettings()` → tenant settings | PROVEN |
| `app_theme_*` (theme/branding) | `tenant.settings` | PRD §1.2 "theme tokens per entity"; `AppThemeManager` renders inside `EntityProvider` and consumes `useSettings()` → tenant settings | PROVEN |
| `company_state`, `company_vat` | **Do not exist** in the `settings` table (phantom fields) | `company-client-data-architecture-audit.md` (2026-06-26); confirmed against `20260520090000_core_tables.sql` DDL — see Historical Intent / Root Cause | PROVEN |
| Workspace name (`workspaces.name`) | NOT a document-identity source | PRD v2.1: Workspace = access boundary ("Mr C's Agency"), Entity = company ("Sun & Shield Power Solutions"); no code reads workspace name for issuer identity | PROVEN |

**Key negative findings:**
- `public.settings` has **no `workspace_id`/`entity_id` column** and its RLS is a flat `authenticated` singleton policy (`settings_authenticated_select/update`, `settings_upsert` id=1). It cannot represent, separate, or route multiple entities or workspaces.
- No `workspace_settings` table or any other entity-specific settings store exists anywhere in the repository. `tenant.settings` is the **only** entity-scoped settings store.
- `public.entities` carries only `(id, workspace_id, slug, display_name, entity_type, is_active, created_at)` — no address/phone/bank/prefix columns. `display_name` is the only entity-level identity data outside tenant settings.

---

## WORKSPACE VS ENTITY MODEL

**Proven model (PRD v2.1 §2):**
- **Workspace** = who can access data (the security boundary). An agency container. Holds `workspace_members`, invitations, permission templates.
- **Entity** = which company data belongs to (the business boundary). "Entities (companies), each an isolated Postgres schema."
- **Schema** = where data is physically isolated (the storage boundary).

**Settings ownership:** "settings" is **entity-level** by design, not workspace-level:
1. The provisioning engine clones a `settings` table into **every** entity schema (template list: `clients, settings, signatories, bank_accounts, projects, quotations, invoices, payments, csrs, waybills, tax_settings, receipts, letters, boqs, rfqs` — `20260717000000`).
2. The PRD §2.3 schema layout shows entity schema `settings` = "Company config, prefixes, theme (single row)" while `public.settings` = "[DEPRECATED] Kept for backward compat".
3. PRD Appendix A migration table: `settings` → "Per entity schema — Clone + drop from `public` per entity".
4. All business-configuration neighbors (`clients`, `bank_accounts`, `signatories`, `tax_settings`) are per-entity clones — the established pattern is business data at entity level.
5. `document_prefixes` is documented as per-entity ([LOCKED] prefix engine) — document numbering is entity-scoped.

**Multi-entity behavior:** When a workspace has multiple entities, each company gets its own schema with its own settings row (its own name/address/logo/prefixes/theme). A global singleton `public.settings` cannot express this. The only entity-appropriate default that crosses entities is `entities.display_name`, which is precisely what the provisioning seed copies.

---

## SETTINGS WRITE PATH

All application writes to settings go through one site (PROVEN):

| File | Function | Client | Schema | Fields |
|---|---|---|---|---|
| `src/hooks/useSettings.js` | `persistSettings()` (called by `saveSettings()`) | `supabase` (global) | **public** | All editable fields: company identity, branding, theme, prefixes, custom_info |
| `src/hooks/useSettings.js` | `uploadFile()` (logo upload) | `supabase.storage` | storage (public bucket) | Logo file |

UI callers of `saveSettings()`: `CompanySettingsSection.tsx`, `BrandingSettingsSection.tsx`, `AppThemeSettingsSection.tsx`, `DocumentPrefixesSettingsSection.tsx`, `DocumentsSettingsSection.tsx`, `src/domain/pdf/customization/hooks.ts`.

**Why does it write to public? — Classification: INCOMPLETE MIGRATION (phased-migration artifact).**
- `phase-2-scope-extraction-report-v2.md`: PRD §15 places Settings and Clients in Phase 2 as a **read-only** migration; "Writes progress in a later phase."
- `phase-2-read-migration-implementation.md`: "All writes, deletes, and payment writes remain on the public Supabase client." Deferred work: "Migrating Settings writes and Clients insert/update/delete to the tenant schema (**Phase 3, requires tenant write permissions**)."
- The code comment "writes (persistSettings/saveSettings) intentionally stay on public supabase" is a **phase-scope** statement (what Phase 2 did not touch), not a final architectural decision. The PRD's stated end-state is the opposite: per-entity settings with `public.settings` dropped.

**Feasibility blocker for the write migration (PROVEN):** tenant-schema `settings` RLS requires `has_entity_permission(entity_id, uid, 'setting', 'create'/'edit')` (`_prov_install_rls`). The default permission seeder (`_prov_seed_default_permissions`, `20260809020000`) grants only `('invoice'), ('payment'), ('receipt')` × 4 actions — **it does not grant `'setting'` or `'client'`**. Whether the live production user holds `('setting','view')` (reads work today, so likely yes) and `('setting','edit')`/`('setting','create')` (needed for writes) is not verifiable from the repository. The write migration therefore requires granting `('setting', 'view'/'create'/'edit'/'delete')` (and `('client', …)` for the clients write migration) to the production user — the 20260809030000 data-migration already anticipates operator-granted permissions.

---

## SETTINGS READ PATH

All settings reads use the tenant client (PROVEN — Phase 2 completed):

| File | Line | Read |
|---|---|---|
| `src/hooks/useSettings.js` | 198 | `tenantClient.from('settings').select('*').eq('id', 1).single()` — the canonical read behind `useSettings()` |
| `src/pages/viewQuotationActions.ts` | 17 | `tenantClient.from('settings')` (quotation view) |
| `src/pages/QuotationFormPage.tsx` | 211 | `tenantClient.from('settings')` (tagline/footer) |
| `src/hooks/useInvoiceReferenceData.ts` | 20 | `tenantClient.from('settings')` |
| `src/hooks/useInvoiceDetailData.js` | 190 | `tenantClient.from('settings')` |
| `src/modules/invoices/services/paymentService.ts` | 145, 175, 325, 355 | `tenantClient.from('settings')` (receipt issuer + prefixes) |

Document consumers of `useSettings()` (→ tenant settings): Layout, BusinessSwitcher, QuotationList, WaybillFormPage, ViewWaybill, ViewRfq, ViewCSR, ViewBoq, Invoices, InvoiceFormPage, Dashboard, CSR/NewRfq/NewProject pages, LetterFormPage, ProjectDocumentView, AppShell theme, all settings sections.

**Normalization (`normalizeSettings`):** normalizes theme fields and applies a legacy `logo_url → company_logo_url` shim. **It does not merge or fall back to `public.settings`.** There is **no** tenant→public fallback anywhere. When tenant settings fields are `null`, documents render blank.

**PDF issuer model (`pdfDownloadHandler.ts:66-82`):** name/address/phone/email/taxId/website/customInfo all come from the `settings` object; bank details come from `previewModel.selectedPreviewBank` (built from `bank_accounts`); logo/footer/tagline/metaFooter from `settings`. Everything resolves to tenant settings.

**Conclusion — issuer identity is intentionally entity-specific (PROVEN):** the PRD required per-entity company identity, Phase 2 made all document reads tenant-scoped, and no code reads `public.settings` for document identity.

---

## PROVISIONING CONTRACT

**Current contract (PROVEN):**
- `provision_entity(p_entity_id)` creates `entity_<ws>_<entity>` schema, clones 15 template tables via `_prov_clone_table` (`CREATE TABLE … LIKE … INCLUDING ALL` — structure/defaults only, **no data**), installs RLS, re-adds FKs, then step 8.5 `PERFORM _prov_seed_settings(p_entity_id, v_schema_name)`.
- `_prov_seed_settings` (`20260809000000`, preserved through the five later `provision_entity` redefinitions): reads `public.entities.display_name` for the entity and executes:
  ```sql
  INSERT INTO {schema}.settings (id, company_name) VALUES (1, {display_name})
  ON CONFLICT (id) DO NOTHING
  ```
- Only `id` and `company_name` are supplied. `document_prefixes` falls to the cloned table's column default (`{"boq":"BOQ","invoice":"INV",…}`), `custom_info` to `'[]'`, everything else to `NULL`.
- Idempotent (`ON CONFLICT DO NOTHING`); preserves existing tenant settings on re-provision; skips early when status is `ready`.

**What provisioning promises (PROVEN vs PRD):** The PRD §3.2 originally intended the seed to include `document_prefixes`:
```sql
INSERT INTO {schema}.settings (id, company_name, document_prefixes)
SELECT 1, e.name, e.document_prefixes FROM public.entities e WHERE e.id = $1
```
The implemented `public.entities` table dropped the `settings jsonb` / `document_prefixes` columns the PRD imagined, so the implemented seed can only source `company_name`. **The seed's minimalism is an implementation simplification, not a statement that operational identity fields belong to `public.settings`.** The PRD's end-state is explicit: per-entity settings row, `public.settings` deprecated and cloned/dropped.

---

## HISTORICAL INTENT

**PROVEN:**
1. `public.settings` was created 2026-05-20 (`20260520090000_core_tables.sql`) as the **pre-multi-tenancy single-tenant singleton** — `id integer NOT NULL DEFAULT 1`, no tenant column.
2. The original multi-tenancy PRD (v1.0, 2026-07-12) states: "BIGDROPS currently operates as a hardcoded single-tenant application. The `settings` table is a singleton (`id=1`)… no mechanism to isolate data or configuration between distinct business entities." Requirement §1.2-1: "Configuration isolation: Company name, logo, address, bank details, document prefixes, theme tokens **per entity**."
3. PRD §2.3 explicitly marks `public.settings` as **"[DEPRECATED] Kept for backward compat"** and defines the entity-schema `settings` as "Company config, prefixes, theme (single row)".
4. PRD §3.1: "A new `public.entities` table **replaces the singleton `settings`** as the tenant authority."
5. PRD Appendix A: `settings` migration pattern = "Clone + drop from `public` per entity"; `clients`/`bank_accounts`/`signatories`/`tax_*` = "COPY TO entity schema".
6. PRD §7 **[LOCKED] Prefix engine**: "Each entity schema's `settings.document_prefixes` drives it independently."
7. Implementation history: `20260717000000` (provisioning engine, clones settings per entity), `20260809000000` (seed company_name), `20260809` chain (permissions/triggers/views/composite transactions), Phase 2 read migration `99645477` (2026-08-09) with writes explicitly deferred to Phase 3.
8. Production state (reports): all 40 migrations through `20260809070000` are applied; `entity_bigdrops-main_main.settings` has only `company_name` (now correctly "Sun & Shield Power Solutions") plus `document_prefixes` defaults and `custom_info='[]'`; `public.settings` holds the complete legacy identity data.

**INFERRED:**
1. The original `BIGDROPS` value in tenant settings was inserted by ad-hoc/manual SQL between provisioning (2026-08-06) and the seed migration (2026-08-09) — no repository mechanism explains it; no audit trail exists.
2. `public.settings` was historically the "active business" profile of the single tenant; its complete address/bank/TIN data is the grandfathered legacy of that single company.
3. The settings UI was never updated to write to the tenant schema, so the user's configured prefixes (`SASBOQ/SASINV/SASQUO`), theme (`glassline`), logo, and TIN all landed in the deprecated table — the values represent the user's real per-company intent stranded in the wrong store.

**UNKNOWN:**
1. Whether the live production user holds `('setting','view')` / `('setting','edit')` / `('setting','create')` permission rows on the entity (readability today suggests view at least; write permission is unverified). This is a live-DB check for the Phase 3 implementation.
2. Whether any explicit workspace-level settings store was ever designed (no PRD section or table found; if needed later, a `workspace_settings` table would be a new design).
3. Who wrote the original tenant `BIGDROPS` row and how.

**On `company_state` and `company_vat`:** PROVEN phantoms. They appear in `renderTypes.ts:93-94`, `partyProjection.ts:46`, `pdfDownloadHandler.ts:75`, `invoicePdfActions.ts:114`, `ViewWaybill.tsx:274,387` but have **never existed** as `settings` columns (audit of 2026-06-26 + live DDL). The Settings UI has a single `company_city` field labeled "City / State" (combined value), and TIN is represented via `custom_info`. Classification: **separate, independent rendering/type debt** — not part of the settings-ownership decision. Fix later by either adding the columns or deleting the phantom references and mapping TIN from `custom_info`.

---

## ROOT CAUSE OF CURRENT DOCUMENT IDENTITY GAP

The company name is correct today, but address/phone/email/logo/TIN/theme/prefixes do not render because of a **cascade of three proven facts**:

1. **Provisioning seeds only `company_name`** (`_prov_seed_settings`); every other identity column of the tenant settings row is `NULL`/default.
2. **Documents read tenant settings** (Phase 2), which has those nulls — there is no fallback to `public.settings`.
3. **The Settings UI writes to `public.settings`** (Phase 2 deliberately left writes on public; Phase 3 write migration never executed).

Net effect: the entity's real company data lives in the deprecated table; documents read an empty entity row. The previous company-name-only remediation fixed the symptom for one field and exposed the rest.

---

## RECOMMENDED ARCHITECTURE

**Model A — Tenant Settings Authority (proven intended design).**

- `public.entities` = identity registry (display_name only).
- `entity_*.settings` (id=1) = **authoritative company/document identity store**: name (from `entities.display_name`), address, city, phone, email, website, tagline, footer, logo, `custom_info` (TIN), theme, `document_prefixes`. Edited per entity by the Settings UI.
- Documents, PDFs, previews, numbering, theme: read tenant settings (already the case since Phase 2).
- `public.settings` = deprecated legacy singleton. Retained only as a grandfathering source during migration; decommissioned as an authority afterward. It is **not** workspace-level settings (no workspace linkage exists), so it should not be re-purposed.
- Bank details: keep using the entity's `bank_accounts` table (tenant schema); do not resurrect the legacy `settings.bank_*` columns.
- `document_prefixes` and theme stay entity-specific (tenant settings) — per the [LOCKED] prefix-engine contract and PRD §1.2.

**Do NOT adopt Model B (public.settings as document authority):** it cannot scale to multiple entities/workspaces (no tenant column, global singleton, deprecated by PRD) and would break the [LOCKED] per-entity prefix contract.

**Do NOT adopt a permanent public→tenant sync:** `public.settings` is a single row; syncing it to many entities would silently propagate one company's data to every company. Sync is acceptable only as a **one-time legacy backfill** for the grandfathered single entity, guarded and field-by-field.

---

## SMALLEST SAFE PERMANENT FIX

### 1. Immediate data remediation (one-time, entity-aware backfill)
For the confirmed entity (`entity_bigdrops-main_main`, id=1), backfill the tenant settings row **only where the tenant value is `NULL`/empty**, sourced from `public.settings`, **skipping nothing that is entity-appropriate**:
- Copy: `company_name` (re-normalize from `entities.display_name` to drop the trailing space), `company_tagline`, `company_address`, `company_city`, `company_phone`, `company_email`, `company_website`, `footer_text`, `company_logo_url`, `signature_url`, `custom_info`, `app_theme_*`, `document_prefixes`.
- `document_prefixes`: copy it too — the tenant row holds only table defaults; the `SAS*` values in public are the user's actual configured intent for this entity.
- Preserve: any non-null tenant values (intentional overrides). For this entity everything except `company_name` and defaults is null, so the merge is effectively a fill.
- Bank `bank_*` columns: do **not** copy (legacy; `bank_accounts` is the live mechanism — copy that table's rows instead if the tenant `bank_accounts` is empty).
- This is a human-executed SQL/UPSERT with `WHERE` guards, executed only after the pre/post checks below.

### 2. Application fix (Phase 3 — settings write migration)
- Point `persistSettings()`/`saveSettings()` at `tenantClient.from('settings')` (upsert id=1), so Settings UI writes land in the entity's settings row. Keep `uploadFile` on storage.
- **Precondition (live-DB verification):** confirm/grant `('setting','view')`, `('setting','create')`, `('setting','edit')` (and `('client', …)` for the parallel clients write migration) for the production user on the entity — via the existing `_prov_seed_default_permissions` helper or operator SQL. Extend `_prov_seed_default_permissions` to include the `'setting'` and `'client'` resources for future entities (migration).
- Keep the legacy retry/unsupported-column stripping logic; remove the "writes intentionally stay on public" comment once migrated.
- Consider a SECURITY DEFINER RPC for settings upsert as an alternative to direct tenant writes (consistent with the transactional-RPC pattern already used for invoices), which would avoid per-user permission rows. Either is acceptable; direct tenant writes match the existing `tenantClient` pattern.

### 3. Provisioning fix
- Keep `_prov_seed_settings` sourcing `company_name` from `entities.display_name` (correct, idempotent — do not regress).
- Optionally extend the seed to also copy `document_prefixes` and theme defaults from a canonical source for brand-new entities; if the intent is "new entities start from DEFAULT_PREFIXES + defaults until the owner edits settings," the current minimal seed is already correct and no change is needed.
- No change to table cloning, RLS, or `_prov_clone_table`.

### 4. Future architectural debt
- Decommission `public.settings` as an authority: stop writing to it (after the write-path migration), add a documented deprecation note, and schedule removal per PRD ("Clone + drop from `public` per entity").
- Resolve the `company_state` / `company_vat` phantom fields: either add the columns to `settings` and the Settings UI, or remove the references and render TIN exclusively from `custom_info`.
- Document settings ownership explicitly in `docs/standard/` (workspace = access, entity = company identity, tenant.settings = company config).
- When multi-entity workspaces arrive, verify each entity's settings row is seeded and the Settings UI writes to the active entity's schema (already implied by `tenantClient`).

---

## RISKS

1. **Permission gap blocks the write migration.** If the production user lacks `('setting','create'/'edit')` on the entity, pointing `persistSettings` at `tenantClient` will fail with RLS errors. Must be verified/granted before rollout. (Mitigation: grant via helper; or use a SECURITY DEFINER settings RPC.)
2. **One-time backfill could overwrite intentional overrides** if run as a blind `UPDATE … FROM public.settings`. Must be null-preserving (`WHERE tenant.value IS NULL`) and reviewed before execution.
3. **Copying `document_prefixes` is opinionated.** Recommended because the tenant holds only defaults; if any entity later changes its prefixes in the tenant row, the backfill must not run again over it (it is one-time).
4. **`public.settings` retains data after decommission** — a stale copy could confuse future work; schedule cleanup only after the write path is proven.
5. **Multi-entity divergence** if someone re-introduces a public→tenant sync later. Policy: no permanent sync.
6. **Phantom `company_state`/`company_vat`** keep rendering empty tax IDs and truncated city/state until resolved; independent of this architecture.
7. Read-only scope: nothing in this report was executed against production.

---

## VERIFICATION

- **Read-only execution confirmed:** No application code, SQL migration, configuration, or database data was modified by this investigation.
- **No production writes:** No INSERT/UPDATE/DELETE/UPSERT/ALTER executed; no migrations applied; no SQL executed against the live database.
- **No build/typecheck/lint/Docker executed** (per prompt589.md prohibitions).
- Evidence was reconciled against: repository migrations (`20260520090000`…`20260809070000`), `docs/prd/multi-tenancy/multi-tenancy-prd.md` (v1.0) and v2.1, `docs/standard/prefix-engine-settings-standard.md`, `live-public-schema.sql` (settings DDL + RLS), `src/hooks/useSettings.js`, `src/lib/tenantClient.ts`, `src/lib/tenant/contexts.tsx`, `src/domain/quotation/pdfDownloadHandler.ts`, `src/domain/invoice/projections/partyProjection.ts`, and the six prior investigation reports.

## GIT STATUS

**Before this investigation** (unchanged by prior work at session start — see conversation git state):
```
M  .commandcode/taste/taste.md
M  docs/Reports/GENERAL/delegation-log.md
A  docs/Reports/invoice-quote/frontend-invoice-aggregate-integration-audit.md
A  docs/Reports/multi-tenancy/tenant-settings-complete-identity-investigation.md
A  docs/Reports/multi-tenancy/tenant-settings-final-provisioning-verification.md
A  docs/Reports/multi-tenancy/tenant-settings-live-db-investigation.md
A  docs/tickets/Dashboard/deepseek.md
A  docs/tickets/Dashboard/milad.md
M  src/components/batch/BatchActionFooter.tsx
 M src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx
M  src/modules/invoices/services/paymentService.ts
M  src/pages/Invoices.tsx
M  supabase/migrations/20260809030000_invoice_aggregate_data_migration.sql
A  temp-investigation.sql
```

**After this investigation:** identical to the above, plus the two documentation files created/updated by this task (this report and the delegation log entry). **Zero application/source/migration/SQL changes were introduced.**
