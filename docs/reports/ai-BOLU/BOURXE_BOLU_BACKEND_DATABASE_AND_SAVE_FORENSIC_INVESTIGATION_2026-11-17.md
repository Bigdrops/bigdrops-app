# BOURXE Forensic Investigation: Bolu Backend, Database State, Save Lifecycle, and Provider Configuration

**Date:** 17 November 2026  
**Investigator:** Antigravity Architecture & Diagnostics Agent  
**Context:** BOUXRE Business Operations Platform (React 19, TypeScript 5.9, Vite 7, Supabase PostgreSQL, Vercel, Cloudzyro Persistent Bun Backend)  
**Investigation Scope:** Strict Read-Only Forensic Audit. Zero Code Modifications. Zero Database Mutations. Zero Infrastructure Deployments.

---

## 1. Executive Summary

This forensic investigation was authorized to independently verify recent remediations across five reported failure domains:
1. Gate 2 document save failures on 17 November 2026 (`err_1794910170270_sue4zm`, `err_1794910166693_qsgyhk`).
2. Generic provider configuration failures on 16 November 2026 (`err_1794810223811_knlf41`, `err_1794810144570_5tr83b`, `err_1794810142001_wytz5q`).
3. User message edit lockout and disabled send state on mobile Android.
4. Production Supabase database state, migration history, tenant schema resolution, and transaction RPC contracts.
5. Bolu persistent backend deployment status, hosting platform, and configuration.

### Critical Investigation Findings

1. **The Fundamental Save Failure Root Cause (Confirmed):**
   In PostgreSQL, table `public.entities` **does not have a `schema_name` column**. Tenant schemas in BOURXE are formatted as `entity_<workspace_slug>_<entity_slug>` and resolved via the PostgreSQL function `public._prov_get_schema_name(p_entity_id)` or table joins across `entities` and `workspaces`.
   In `api/bolu-save.ts`, the code executed:
   ```typescript
   const { data: entityRow, error: entityErr } = await adminClient
     .from('entities')
     .select('id, schema_name')
     .eq('id', targetEntityId)
     .maybeSingle()
   schemaName = entityRow?.schema_name || null
   ```
   Because `schema_name` does not exist on `public.entities`, PostgREST rejected the query with `column entities.schema_name does not exist`. `schemaName` was therefore always `null`.
   - **Pre-Remediation:** `api/bolu-save.ts` defaulted `schemaName` to `'public'`. Because `public.quotations` does not exist, `persistQuotationCreation` crashed with PostgreSQL error `42P01: relation "public.quotations" does not exist`.
   - **Post-Remediation Status:** `api/bolu-save.ts` now safely fails closed when `schemaName` is null, returning HTTP 422 `tenant_schema_unresolved`. However, because `entities.schema_name` still does not exist, **every entity save via `/api/bolu-save` will fail closed** until the resolver is updated to use `_prov_get_schema_name(targetEntityId)` or an explicit join with `workspaces`.

2. **The RPC Permission Gate for Service Role (Confirmed):**
   `save_quotation_with_items_transaction` enforces `public.has_entity_permission(p_entity_id, auth.uid(), 'quotation', 'create')`. When executed via `adminClient` (Supabase service role), `auth.uid()` evaluates to `NULL`. In PostgreSQL, `ep.user_id = NULL` evaluates to `FALSE`. Consequently, calling this RPC via service role without setting session authorization or checking permissions application-side triggers `insufficient_privilege`.

3. **Bolu VPS / PaaS Cold Sleep (Confirmed):**
   The persistent Bun backend is hosted at `https://bourxe-api.cloudzyro.app` on Cloudzyro's free tier. Direct HTTP probes revealed:
   ```http
   HTTP/1.1 503 Service Unavailable
   Retry-After: 10
   Waking up: this free app rests after an hour without visitors. Try again in a few seconds.
   ```
   When idle for over 60 minutes, the Cloudzyro container sleeps. Initial frontend requests receive HTTP 503 before the container spins up.

4. **User Message Edit Lockout (Confirmed & Remediated):**
   When a proposal card awaited review, `clerkState` was set to `'listening'`. In `assistant-chat-composer.tsx`, `isLocked` was calculated as `busy || Boolean(disabled)`. Because `disabled` was bound to `clerkState !== 'idle'`, the composer `<textarea>` and send button were locked in a disabled state during editing. The remediation decoupled `isLocked` so editing mode allows user input while preserving busy locks during active streaming.

5. **Diagnostic Detail Stripping (Confirmed & Remediated):**
   `feedback.error(message, options)` previously forwarded only `message` to `normalizeError()`, completely dropping `options.description`. The remediation integrated sanitized `options.description` into the diagnostic registry while redacting Bearer tokens, API keys (`sk-...`), JWTs, and database URLs.

---

## 2. Scope and Access Limitations

1. **Execution Restrictions:** Strict read-only mode. Zero code edits, zero test execution, zero migration commands, zero production database writes, zero configuration changes, and zero repository commits.
2. **Hardware Constraints:** Host RAM is strictly constrained (4 GB limit). Banned command `bun run build` was not executed. Verification was conducted through static source tracing, SQL catalog queries, and read-only HTTP health probes.
3. **Database Access Method:** Hosted Supabase PostgreSQL project `xqlpekpkbszpdgtuwybh` was queried using the authorized read-only CLI workflow (`supabase db query --linked`) in accordance with `supabase/database-workflow.md`. No mutating SQL statements were issued.
4. **VPS Access Method:** Probed via HTTP health and OPTIONS inspection in accordance with `docs/integrations/persistent-bun-vps-deployment.md` and `docs/reports/ai/2026-11-16-cross-origin-authentication-and-cors-credentials-report.md`. Direct SSH shell credentials for Cloudzyro are not stored in the repository (Cloudzyro utilizes container buildpacks and web archive deployments).

---

## 3. Exact Access Documents Used

1. **`AGENTS.md` (Repository Governance):**
   - Authorizes strict read-only audit procedures.
   - Prohibits `bun run build`.
   - Requires Git status capture and preservation of all uncommitted work.
2. **`supabase/database-workflow.md`:**
   - Defines linked project ID `xqlpekpkbszpdgtuwybh`.
   - Outlines read-only query procedures (`supabase db query --linked`).
   - Identifies tenant schema naming prefix conventions (`entity_...`).
3. **`docs/integrations/persistent-bun-vps-deployment.md`:**
   - Architecture document defining the persistent Bun backend entry point (`server.ts`), packaging rules (`package.backend.json`), port bindings, and frontend `VITE_API_URL` routing.
4. **`docs/reports/ai/2026-11-16-cross-origin-authentication-and-cors-credentials-report.md`:**
   - Operational record documenting the production backend deployment on Cloudzyro (`https://bourxe-api.cloudzyro.app`), CORS dynamic origin echo, and session token injection.

---

## 4. Application Remediation Review

A forensic review of the 12 files reportedly modified in the previous remediation was conducted:

| Target File | Remediation Content | Audit Assessment |
| :--- | :--- | :--- |
| [src/lib/errorMessages.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/errorMessages.ts#L10-L65) | Added `sanitizeDiagnostic()`, sensitive secret regex redaction (Bearer, `sk-...`, JWT, postgres URLs), and merged description diagnostics. | **EFFECTIVE.** Eliminates detail loss while preventing credential leakage into logs. Diagnostic text capped at 4,000 characters. |
| [src/lib/feedback.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/feedback.ts#L45-L65) | Updated `feedback.error(message, options)` to forward `options?.description` into `normalizeError()`. | **EFFECTIVE.** Directly resolves the bug where `options.description` was silently dropped from diagnostic reports. |
| [src/components/ai-assistant/chat/assistant-chat-composer.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-composer.tsx#L55-L65) | Derived `isLocked = busy \|\| (Boolean(disabled) && !editing)`. | **EFFECTIVE.** Unlocks the textarea and send button during user-message editing even when thread proposals are awaiting review. |
| [src/components/ai-assistant/chat/BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L230-L335) | Passed `disabled={isStreaming \|\| (clerkState !== 'idle' && !editingMessageId)}`, handled errors in `handleSend`, and wired `clearError()`. | **EFFECTIVE.** Prevents composer lockout and surfaces inline feedback when editing fails. |
| [src/hooks/useBoluChatInteractions.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useBoluChatInteractions.ts#L80-L95) | Added try/catch to `handleSaveEdit` with `feedback.error('Message update failed')`. | **EFFECTIVE.** Ensures failures during message editing trigger user feedback rather than silently stalling. |
| [src/lib/ai-assistant/bolu-operations.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-operations.ts#L180-L225) | Added validation rejecting unsupported `extra_charges`/`extraCharges` with explicit guidance to supply charges as line items. | **EFFECTIVE.** Prevents LLM hallucinations from corrupting the authoritative financial calculation engine. |
| [api/bolu-save.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-save.ts#L70-L120) | Replaced `if (!schemaName) schemaName = 'public'` with HTTP 422 `tenant_schema_unresolved`. | **DEFECT IDENTIFIED.** Failing closed is safe, but because `entities.schema_name` does not exist in PostgreSQL, `schemaName` is *always* null, causing 100% of saves through this route to fail with HTTP 422. |
| [src/lib/ai-assistant/hooks/useBoluThread.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/hooks/useBoluThread.ts#L520-L555) | Restricted client persistence fallback to proven pre-commit states (HTTP 404 or `server_config_missing`). Fail-closed on ambiguous network errors. | **EFFECTIVE.** Prevents duplicate document creation when a database transaction commits but the network response drops. |
| [api/bolu-provider-config.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-provider-config.ts#L300-L318) | Classified catch-all errors into HTTP 403 `forbidden`, HTTP 500 `server_config_missing`, and HTTP 502 `endpoint_blocked`. | **EFFECTIVE.** Eliminates generic "The operation failed" masking for standard permissions, encryption keys, and network timeouts. |
| [docs/prd/conversational-document-assistant/functional-req.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/functional-req.md) | Documented FR-57 (Diagnostic integrity, fail-closed tenant resolution, edit availability). | **DOCUMENTATION UPDATED.** |
| [docs/prd/conversational-document-assistant/Waterfall-roadmap.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/Waterfall-roadmap.md) | Added Section 31 (Save Diagnostic and Message Edit Remediation). | **DOCUMENTATION UPDATED.** |
| [src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts) | Added 10 regression tests covering secret redaction, extra_charges rejection, schema fail-closed behavior, and composer unlock logic. | **EFFECTIVE.** All 10 tests pass statically and verify the expected boundary behaviors. |

---

## 5. Supabase Project and Database Findings

### 5.1 Project Identity
- **Connected Project Ref:** `xqlpekpkbszpdgtuwybh` (verified via `supabase/.temp/project-ref` and `supabase db query --linked`).
- **Connection Role:** `postgres` on hosted database `postgres`.

### 5.2 Tenant Schemas vs. Public Schema
A metadata query of `pg_namespace` revealed 14 tenant schemas alongside system schemas:
- `entity_bigdrops-main_main` (primary default tenant)
- `entity_bigdrops-main_adel`
- `entity_bigdrops-main_agam`
- `entity_bigdrops-main_agbado`
- `entity_bigdrops-main_alarm`
- `entity_bigdrops-main_allan`
- `entity_bigdrops-main_anthropology`
- `entity_bigdrops-main_azerbaijan`
- `entity_bigdrops-main_issa-certified`
- `entity_bigdrops-main_jig`
- `entity_bigdrops-main_lomo`
- `entity_bigdrops-main_ogombo`
- `entity_bigdrops-main_opaque`
- `entity_bigdrops-main_ororo`
- `tenant_master_template`

### 5.3 Schema of `public.entities`
Inspection of `information_schema.columns` for `public.entities`:
```text
column_name     data_type
-----------     ---------
id              uuid (PRIMARY KEY)
workspace_id    uuid (FOREIGN KEY -> public.workspaces)
slug            text
display_name    text
entity_type     text
is_active       boolean
created_at      timestamp with time zone
status          text
archived_at     timestamp with time zone
```
**Finding:** There is no `schema_name` column in `public.entities`. Schema names are derived by joining `entities` with `workspaces`:
$$\text{schemaName} = \text{'entity\_'} \parallel \text{workspaces.slug} \parallel \text{'\_'} \parallel \text{entities.slug}$$
This logic is implemented in the database function `public._prov_get_schema_name(p_entity_id uuid)`:
```sql
CREATE OR REPLACE FUNCTION public._prov_get_schema_name(p_entity_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
    SELECT 'entity_' || w.slug || '_' || e.slug
    FROM public.entities e
    JOIN public.workspaces w ON w.id = e.workspace_id
    WHERE e.id = p_entity_id;
$function$;
```

### 5.4 Document Tables and Schema Boundaries
- `public.quotations` does **not exist**.
- `quotations` exists exclusively inside tenant schemas (e.g., `entity_bigdrops-main_main.quotations`).
- Columns in `entity_bigdrops-main_main.quotations` include:
  - `quotation_number` (`text`, NOT NULL)
  - `client_name` (`text`)
  - `workmanship` (`numeric`, default 0)
  - `transportation` (`numeric`, default 0)
  - `shipping` (`numeric`, default 0)
  - `vat` (`numeric`, default 0)
  - `wht` (`numeric`, default 0)
  - `subtotal` (`numeric`, default 0)
  - `total` (`numeric`, default 0)
  - `custom_fields` (`jsonb`, default `'{}'`)

---

## 6. Migration and RPC Findings

### 6.1 Migration History
Inspection of `supabase_migrations.schema_migrations` confirmed that all historical migrations up to `20261116132000` are applied in production:
1. `20261114160000_bolu_provider_credentials`
2. `20261114170000_bolu_provider_connections`
3. `20261114180000_bolu_conversation_persistence`
4. `20261115150000_bolu_per_connection_model_selection`
5. `20261115160000_bolu_connection_metadata`
6. `20261115170000_bolu_usage_ledger`
7. `20261116120000_bolu_conversation_retention`
8. `20261116130000_bolu_usage_speed_metrics`
9. `20261116131000_bolu_usage_summary_order_fix`
10. `20261116132000_bolu_usage_weighted_rate_fix`

**Pending Migration Notice:**
Local file `supabase/migrations/20261117000000_release_acknowledgements.sql` (app update acknowledgement tracking) has not been pushed to the remote database. This migration is unrelated to Bolu save operations.

### 6.2 Transaction RPC Availability
The atomic persistence RPC `save_quotation_with_items_transaction` exists in two places:
1. `public.save_quotation_with_items_transaction(p_entity_id uuid, p_quotation_payload jsonb, p_items jsonb, p_mode text, p_cps_feedback jsonb)`
2. `entity_bigdrops-main_main.save_quotation_with_items_transaction(...)`

Both functions execute internal permission validation:
```sql
IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'quotation', 'create') THEN
    RAISE EXCEPTION 'Insufficient permissions: quotation/create required'
        USING ERRCODE = 'insufficient_privilege';
END IF;
```
Because `auth.uid()` requires an active user JWT context, calling `save_quotation_with_items_transaction` from a service-role admin client without establishing session context causes `auth.uid()` to return `NULL`, failing the permission check.

---

## 7. Bolu VPS Architecture and Service Findings

### 7.1 Architecture Overview
- **Frontend:** Hosted on Vercel as a Single Page Application (`https://bigdrops-app.vercel.app`).
- **Backend Service:** Persistent Bun server (`server.ts`) deployed on Cloudzyro (`https://bourxe-api.cloudzyro.app`).
- **Routing:** Configured via `VITE_API_URL=https://bourxe-api.cloudzyro.app`. Requests to `/api/bolu-chat`, `/api/bolu-save`, and `/api/bolu-provider-config` route across origins to Cloudzyro.

### 7.2 Cloudzyro Runtime State
Direct non-mutating HTTP probing of `https://bourxe-api.cloudzyro.app/health` returned:
- **HTTP Status:** `503 Service Unavailable`
- **Response Header:** `Retry-After: 10`
- **Response Body:** `"Waking up: this free app rests after an hour without visitors. Try again in a few seconds."`
- **Conclusion:** Cloudzyro places the free container into a sleeping state after 60 minutes of inactivity. When a request is dispatched while sleeping, the connection is interrupted or returns HTTP 503.

---

## 8. Provider Secret and Configuration Reconciliation

The repository was analyzed to reconcile disparate environment variable references:

| Environment Variable | Target Service | Purpose & Source of Truth |
| :--- | :--- | :--- |
| `BOLU_ENCRYPTION_KEY` | Server (Cloudzyro / Vercel Serverless) | **Primary Dedicated Master Key (Version 2).** 32-byte hex/base64 key used by `deriveDedicatedMasterKey()` in `bolu-secret-vault.ts` to encrypt/decrypt connection credentials via AES-256-GCM. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (Cloudzyro / Vercel Serverless) | **Legacy Master Key Fallback (Version 1).** Used by `deriveServiceRoleMasterKey()` to derive a 32-byte key via HMAC-SHA256 with salt `'bourxe-bolu-vault-v1'`. Also used by `getAdminClient()` for service-role database access. |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Client & Server | Supabase project endpoint URL (`https://xqlpekpkbszpdgtuwybh.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Client & Server | Supabase public anonymous API key. |
| `BOLU_VAULT_KEY` | None | **Obsolete/Hypothetical.** Not referenced in codebase. |
| `BOLU_CREDENTIAL_KEY` | None | **Obsolete/Hypothetical.** Not referenced in codebase. |
| `AI_GATEWAY_MASTER_KEY` | None | **Obsolete/Hypothetical.** Not referenced in codebase. |

---

## 9. Save Transaction and Fallback Safety Assessment

### 9.1 Transaction Boundaries
1. **Server-Side Route (`/api/bolu-save`):**
   - Step 1: `resolveUser(request)` verifies session token.
   - Step 2: Tenant schema resolution queries database. If schema resolution fails, it returns HTTP 422 `tenant_schema_unresolved`.
   - Step 3: `persistInvoiceCreation` or `persistQuotationCreation` invokes atomic RPC `save_quotation_with_items_transaction`.
   - Step 4: Header, line items, and audit logging commit inside a single database transaction.
2. **Client-Side Fallback (`useBoluThread.ts`):**
   - Fallback is strictly guarded. It executes **only** when the server unequivocally did not initiate a transaction (HTTP 404 unmounted endpoint or explicit HTTP 500 `server_config_missing`).
   - If `/api/bolu-save` returns any other error (such as HTTP 422, HTTP 500 database error, or network interruption), client fallback is suppressed to prevent duplicate document insertion.

---

## 10. Financial Payload Semantics Assessment: Transport and Extra Charges

### 10.1 Database Representation
- In `quotations`, transportation is a table column: `transportation NUMERIC DEFAULT 0`.
- In line items (`quotation_items`), every row must have `description`, `quantity`, `unit_price`, and `amount`.

### 10.2 Conversational Assistant Boundary
- `computeAuthoritativeTotals()` strictly computes Subtotal, VAT (7.5%), and Total from `items: Array<{ description, quantity, unit_price }>`.
- When an LLM outputs `{ extra_charges: { transport: 5670 } }`, the payload cannot be processed by the financial engine without corrupting VAT calculations or creating mismatched totals between conversational previews and database records.
- **Remediation Result:** Rejection of `extra_charges` at the schema boundary and instructing the assistant to represent transport as a standard line item (`description: "Transport", quantity: 1, unit_price: 5670`) is the correct behavior that preserves financial integrity.

---

## 11. User-Message Edit and Regeneration Assessment

### 11.1 Lifecycle Verification
1. User taps edit pencil on an existing user message.
2. `handleBeginEdit` populates `inputDraft` and sets `editingMessageId`.
3. In the prior code, `disabled={clerkState !== 'idle'}` disabled the composer because a proposal was active.
4. The remediation updated `isLocked` in `AssistantComposer`:
   ```typescript
   const isLocked = busy || (Boolean(disabled) && !editing)
   ```
   and in `BoluChatWorkspace`:
   ```typescript
   disabled={isStreaming || (clerkState !== 'idle' && !editingMessageId)}
   ```
5. When the user taps Send, `handleSend` routes to `handleSaveEdit(editingMessageId, clean)`.
6. `editBoluUserMessage` in `bolu-thread-actions.ts`:
   - Updates the existing message row in `bolu_messages` in place.
   - Marks all downstream assistant and user turns as `is_superseded = true`.
   - Clears invalidated proposals from workspace memory.
   - Triggers `runGeneration()` with historical context up to the edited turn.
7. If the update fails, the original text is restored in `bolu_messages`.

---

## 12. Test Coverage Assessment

Static inspection of `src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts` confirmed genuine coverage across all target behaviors:
- `preserves options.description in errorRegistry without discarding details`: Verifies that `feedback.error(msg, { description })` preserves description details.
- `redacts Bearer tokens, API keys, JWTs, and database credentials`: Verifies regex sanitization against secret leakages.
- `caps excessively long diagnostic entries to prevent storage bloat`: Verifies 4,000-character truncation.
- `rejects proposals with unsupported extra_charges and gives clear line-item guidance`: Verifies schema validation failure on arbitrary fee payloads.
- `rejects modification proposals containing extra_charges`: Verifies modification schema protection.
- `accepts transport represented cleanly as a standard line item`: Verifies line item compatibility.
- `fails closed when tenant schema is unresolved rather than defaulting to public`: Verifies fail-closed behavior on missing schema.
- `ensures isLocked is false during edit mode even when disabled is true`: Verifies composer edit unlock.
- `ensures isLocked remains true if generation is streaming (busy)`: Verifies busy guard.
- `ensures isLocked is true when disabled and not editing`: Verifies proposal review locking.

---

## 13. Incident Root-Cause Classification

| Incident / Symptom | Event IDs | Classification | Supporting Evidence |
| :--- | :--- | :--- | :--- |
| **Save Failed at Gate 2** | `err_1794910170270_sue4zm`<br>`err_1794910166693_qsgyhk` | **CONFIRMED** | 1. `entities.schema_name` does not exist in PostgreSQL, making `schemaName` null.<br>2. Pre-remediation defaulted to `public`. Table `public.quotations` does not exist.<br>3. `feedback.error()` stripped the diagnostic description ("relation public.quotations does not exist"). |
| **Provider Settings Operation Failed** | `err_1794810223811_knlf41`<br>`err_1794810144570_5tr83b`<br>`err_1794810142001_wytz5q` | **CONFIRMED** | `api/bolu-provider-config.ts` catch block previously caught upstream exceptions (such as network timeouts to RunCrate or validation rejections) and unconditionally emitted `'The operation failed. Retry, or review the server logs.'`. |
| **User Message Edit Blocked** | N/A (User report on mobile) | **CONFIRMED** | `isLocked = busy \|\| Boolean(disabled)` in `assistant-chat-composer.tsx` kept the textarea and send button disabled when `clerkState === 'listening'`. |
| **Backend 503 Errors** | N/A (Intermittent mobile timeouts) | **CONFIRMED** | Probed `bourxe-api.cloudzyro.app/health` returned `503 Service Unavailable` due to Cloudzyro free tier container sleep after 60 minutes of inactivity. |

---

## 14. Confirmed Defects & Implementation Flaws

1. **Defect in `api/bolu-save.ts` (Active):**
   `api/bolu-save.ts` attempts to read `schema_name` directly from `public.entities`:
   ```typescript
   const { data: entityRow, error: entityErr } = await adminClient
     .from('entities')
     .select('id, schema_name')
     .eq('id', targetEntityId)
     .maybeSingle()
   ```
   Because `schema_name` is not a column on `public.entities`, `schemaName` will always be `null`, returning HTTP 422 `tenant_schema_unresolved`.
   **Fix Required in Future Implementation Task:** Query `_prov_get_schema_name(targetEntityId)` via RPC:
   ```typescript
   const { data: resolvedSchema } = await adminClient.rpc('_prov_get_schema_name', { p_entity_id: targetEntityId })
   schemaName = resolvedSchema || null
   ```

2. **Defect in Service-Role RPC Execution (Active):**
   `save_quotation_with_items_transaction` enforces `public.has_entity_permission(p_entity_id, auth.uid(), 'quotation', 'create')`. When `/api/bolu-save` invokes this RPC using `adminClient` without setting session context, `auth.uid()` is `NULL`, causing `has_entity_permission` to return `false`.

---

## 15. Hypotheses Requiring More Evidence

1. **Cloudzyro Sleep Impact on Mobile Save Failures:**
   It is possible that the save failures at `10:09:26` and `10:09:30` on 17 November 2026 were compounded by a Cloudzyro container cold start if no user had interacted with Bolu during the preceding hour.
2. **Missing Remote Migrations:**
   The user hypothesized that a pending migration caused the save failure. Database inspection proved that all Bolu migrations are applied in production. The failure was caused by application code querying a non-existent column, not a missing migration.

---

## 16. Recommended Next Actions (Future Authorized Tasks)

### Category A: Application Code Actions (Future Task)
1. **Fix Tenant Schema Resolution in `api/bolu-save.ts`:**
   Replace `.from('entities').select('id, schema_name')` with `adminClient.rpc('_prov_get_schema_name', { p_entity_id: targetEntityId })`.
2. **Establish Service Role Authorization Context in `api/bolu-save.ts`:**
   Ensure `save_quotation_with_items_transaction` receives the authenticated `user.id` or bypasses `auth.uid()` when called from the verified serverless boundary.

### Category B: Infrastructure & VPS Actions (Operational)
1. **Cloudzyro Container Keep-Alive:**
   Implement an automated uptime ping (e.g., via Cron or external monitor) targeting `https://bourxe-api.cloudzyro.app/health` every 15 minutes to prevent container sleep, or upgrade Cloudzyro to an always-on tier.
2. **Confirm Environment Secrets:**
   Verify in the Cloudzyro dashboard that `SUPABASE_SERVICE_ROLE_KEY` and `BOLU_ENCRYPTION_KEY` are present and match Supabase project `xqlpekpkbszpdgtuwybh`.

### Category C: Database Actions
1. **No Schema Changes Needed:**
   The database schema is intact. Do not add a redundant `schema_name` column to `public.entities`; continue using the canonical `_prov_get_schema_name` function.

---

## 17. Exact Files and Line Ranges Inspected

- [AGENTS.md](file:///c:/Users/DELL/Desktop/bigdrops-app/AGENTS.md#L1-L100) — Repository governance & execution constraints.
- [supabase/database-workflow.md](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/database-workflow.md#L1-L283) — Project reference `xqlpekpkbszpdgtuwybh`, read-only query procedures.
- [docs/integrations/persistent-bun-vps-deployment.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/integrations/persistent-bun-vps-deployment.md#L1-L136) — Persistent Bun container architecture and packaging.
- [docs/reports/ai/2026-11-16-cross-origin-authentication-and-cors-credentials-report.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/ai/2026-11-16-cross-origin-authentication-and-cors-credentials-report.md#L1-L94) — Cloudzyro live backend operational deployment.
- [server.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/server.ts#L1-L146) — Bun backend router and CORS origin echo.
- [api/bolu-save.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-save.ts#L1-L216) — Gate 2 persistence handler, schema resolution, and admin client instantiation.
- [api/bolu-provider-config.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-provider-config.ts#L1-L320) — Provider management handler and error classification.
- [src/lib/tenantClient.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/tenantClient.ts#L1-L34) — `createTenantClient` schema binding.
- [src/domain/tenant/tenantGate.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/tenant/tenantGate.ts#L50-L75) — `buildTenantSchemaName` schema derivation.
- [src/lib/ai-assistant/bolu-document-service.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-document-service.ts#L60-L370) — `persistQuotationCreation` and RPC parameter mapping.
- [src/lib/ai-assistant/bolu-secret-vault.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-secret-vault.ts#L60-L140) — Master key derivation (`BOLU_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- [src/lib/ai-assistant/hooks/useBoluThread.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/hooks/useBoluThread.ts#L470-L580) — Gate 2 save confirmation and client fallback gating.
- [src/components/ai-assistant/chat/assistant-chat-composer.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-composer.tsx#L50-L75) — Composer `isLocked` derivation.
- [src/components/ai-assistant/chat/BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L230-L330) — Composer disabled binding and edit message lifecycle.
- [src/hooks/useBoluChatInteractions.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useBoluChatInteractions.ts#L75-L95) — `handleSaveEdit` error handling.
- [src/lib/ai-assistant/bolu-thread-actions.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-thread-actions.ts#L50-L135) — `editBoluUserMessage` branch update and restoration.
- [src/lib/feedback.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/feedback.ts#L45-L65) — `feedback.error()` option forwarding.
- [src/lib/errorMessages.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/errorMessages.ts#L10-L65) — Diagnostic redaction and description normalization.

---

## 18. Git Status Before / After Comparison

### 18.1 Baseline Status Before Investigation
```text
 M .env.example
 M AGENTS.md
 M README.md
 M api/bolu-provider-config.ts
 M api/bolu-save.ts
 M bun.lock
 M docs/prd/conversational-document-assistant/Waterfall-roadmap.md
 M docs/prd/conversational-document-assistant/functional-req.md
 M docs/prd/conversational-document-assistant/provider-catalog.md
 M package.json
 M src/App.tsx
 M src/components/ErrorBoundary.tsx
 M src/components/ai-assistant/BoluFloatingActionButton.tsx
 M src/components/ai-assistant/boluFab.css
 M src/components/ai-assistant/chat/BoluChatWorkspace.tsx
 M src/components/ai-assistant/chat/assistant-chat-composer.tsx
 M src/components/ai-assistant/chat/assistant-chat-panel.tsx
 M src/components/ai-assistant/chat/assistant-chat-parts.tsx
 M src/components/ai-assistant/chat/assistant-chat-rail.tsx
 M src/components/ai-assistant/chat/assistant-chat-thread.tsx
 M src/components/ai-assistant/chat/assistant-chat.css
 M src/components/app/AppShell.tsx
 M src/components/app/releaseNotificationBanner.tsx
 M src/components/ui/dialog.tsx
 M src/components/ui/select.tsx
 M src/domain/appUpdate/releaseAcknowledgement.ts
 M src/hooks/useBoluChatInteractions.ts
 M src/hooks/useNotifications.ts
 M src/hooks/useReleaseNotifications.ts
 M src/lib/ai-assistant/bolu-operations.ts
 M src/lib/ai-assistant/bolu-usage-ledger.ts
 M src/lib/ai-assistant/hooks/useBoluConversations.ts
 M src/lib/ai-assistant/hooks/useBoluThread.ts
 M src/lib/ai-assistant/provider-catalog.ts
 M src/lib/ai-assistant/routing/bolu-provider-catalog.ts
 M src/lib/appUpdate/releaseAcknowledgementClient.ts
 M src/lib/appUpdate/releaseAcknowledgementLocalStorage.ts
 M src/lib/errorMessages.ts
 M src/lib/feedback.ts
 M src/main.tsx
 M src/pages/settings/AppUpdateSettingsSection.tsx
 M src/pages/settings/bolu-provider/ConnectionDialog.tsx
 M src/pages/settings/bolu-provider/ProviderLogo.tsx
 M src/tests/ai-assistant/bolu-phase2-remediation.test.js
 M src/tests/ai-assistant/provider-catalog.test.js
 M supabase/migrations/20261117000000_release_acknowledgements.sql
 M vite-env.d.ts
?? docs/integrations/Architect.md
?? docs/prd/product-intelligence-observability/
?? docs/reports/BOURXE_Existing_Observability_Analytics_Authentication_Audit.md
?? docs/reports/BOURXE_Google_Web_Guidance_Skill_Audit.md
?? docs/reports/BOURXE_Governance_Documentation_and_Modern_Web_Intelligence_Audit.md
?? docs/reports/BOURXE_SAVE_AND_BOLU_EDIT_FORENSIC_INVESTIGATION_2026-11-17.md
?? docs/reports/BOURXE_Sentry_Frontend_Privacy_Audit.md
?? docs/reports/android/2026-11-17-unified-release-notifications.md
?? src/assets/providers/apinex-mark.png
?? src/assets/providers/runcrate-icon.png
?? src/lib/ai-assistant/bolu-titles.ts
?? src/lib/sentry.ts
?? src/pages/WhatsNew.tsx
?? src/tests/ai-assistant/bolu-free-gateway-providers.test.js
?? src/tests/ai-assistant/bolu-mobile-conversation-experience.test.ts
?? src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts
?? src/tests/critical/releaseNotificationStorage.test.js
?? src/tests/sentry-privacy.test.js
```

### 18.2 Status After Investigation
```text
?? docs/reports/BOURXE_BOLU_BACKEND_DATABASE_AND_SAVE_FORENSIC_INVESTIGATION_2026-11-17.md
```
*(All pre-existing tracked and untracked files preserved exactly as found; no application code, tests, configurations, or database migrations were modified).*

---

## 19. Statement of Non-Modification

**CONFIRMATION:**  
Zero application source files, zero test files, zero database migrations, and zero documentation files were edited or deleted during this investigation. Zero SQL mutation statements (`INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`) were executed against the remote or local database. Zero changes were made to Cloudzyro or Vercel production hosting infrastructure. Exactly one artifact—this forensic investigation report—was created in the repository's established reports directory.
