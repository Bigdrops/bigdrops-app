# Post-Remediation Security and Database Integration Audit: Bolu Gate 2 Document Save Pipeline

**Audit Date:** 17 November 2026  
**Auditor:** OpenCode Autonomous Agent (DeepMind Antigravity)  
**Report Status:** COMPLETED  
**Classification:** Read-Only Security Review, Integration Audit, and Static Database Verification  

---

## 1. Executive Summary

This report provides an independent post-remediation security and integration audit of the Bolu Gate 2 document save pipeline in the BOUXRE platform. 

The audit inspected the latest changes in `api/bolu-save.ts`, `src/lib/ai-assistant/bolu-document-service.ts`, `src/lib/ai-assistant/hooks/useBoluThread.ts`, `src/lib/tenantClient.ts`, and `src/domain/tenant/tenantGate.ts`. The audit also evaluated live PostgreSQL catalog metadata on linked Supabase project `xqlpekpkbszpdgtuwybh`.

### Key Findings
1. **Canonical Schema Resolution:** Confirmed resolved. The pipeline no longer queries the nonexistent column `entities.schema_name`. It calls the canonical database function `public._prov_get_schema_name(p_entity_id uuid)` and validates the result with regex `/^entity_[a-z0-9-]+_[a-z0-9-]+$/i`. It fails closed with HTTP 422 `tenant_schema_unresolved` when invalid or null.
2. **Authenticated User Client & Transaction Authorization:** Confirmed resolved. The pipeline resolves the calling user with `supabase.auth.getUser(token)` and builds a user-scoped client with `Authorization: Bearer <token>`. PostgREST forwards the JWT so PostgreSQL sets `auth.uid() = user.id`. The tenant transaction RPCs (`save_quotation_with_items_transaction` and `save_invoice_with_items_transaction`) evaluate `public.has_entity_permission(p_entity_id, auth.uid(), ...)` successfully without failing on `auth.uid() = NULL`.
3. **Dual-Gate Authorization Consistency:** Confirmed resolved. A server-side pre-flight authorization check verifies permissions with `adminClient.rpc('has_entity_permission', ...)` before opening the tenant transaction. The transaction RPC then repeats the authorization check inside the database engine.
4. **PostgREST Schema Exposure:** Confirmed resolved. All provisioned tenant schemas have `processed: true` in `public._pending_postgrest_schemas`. The `authenticated` role possesses `USAGE` privileges on the tenant schemas and `SELECT`/`INSERT` privileges on tenant tables.
5. **Client Fallback & Duplicate-Write Protection:** Confirmed resolved. Client fallback in `useBoluThread.ts` is restricted to HTTP 404 (unmounted endpoint) and `server_config_missing` (pre-database abort). Database errors (HTTP 500), schema resolution failures (HTTP 422), permission rejections (HTTP 403), and network interruptions are treated as terminal to prevent duplicate persistence writes.

---

## 2. Audit Scope and Authorization

- **Task Scope:** Strict read-only audit of the Bolu Gate 2 document save path, authentication context, schema resolution, and tenant isolation.
- **Authorization Boundary:** Read-only access. Zero application code modifications, zero database mutations, zero migration deployments, and zero changes to infrastructure or environment secrets.
- **Runtime Environment:** Bun runtime on Windows host. `bun run build` strictly prohibited.

---

## 3. Evidence Sources and Investigation Date

**Investigation Date:** 17 November 2026.

### Repository Files Inspected
- `api/bolu-save.ts`
- `src/lib/ai-assistant/bolu-document-service.ts`
- `src/lib/ai-assistant/bolu-operations.ts`
- `src/lib/ai-assistant/hooks/useBoluThread.ts`
- `src/lib/tenantClient.ts`
- `src/domain/tenant/tenantGate.ts`
- `src/lib/ai-assistant/bolu-auth.ts`
- `src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts`
- `docs/reports/general/postgrest-schema-exposure-forensic-audit.md`
- `docs/prd/conversational-document-assistant/functional-req.md` (FR-58)
- `docs/prd/conversational-document-assistant/Waterfall-roadmap.md` (§32)

### Database Evidence (Linked Project: `xqlpekpkbszpdgtuwybh`)
- `pg_proc` definition and privileges for `public._prov_get_schema_name(p_entity_id uuid)`.
- `pg_proc` definitions and privileges for `entity_bigdrops-main_main.save_quotation_with_items_transaction` and `entity_bigdrops-main_main.save_invoice_with_items_transaction`.
- `information_schema.routine_privileges` for `public.has_entity_permission`.
- `pg_namespace` listing of all provisioned `entity_%` tenant schemas.
- `has_schema_privilege` verification for role `authenticated` on tenant schemas.
- `has_table_privilege` verification for role `authenticated` on `invoices` and `quotations`.
- `public._pending_postgrest_schemas` queue status.

---

## 4. Baseline Git Status

At the start of the audit, the repository worktree contained pre-existing uncommitted modifications and untracked files across release notifications, Sentry observability, and Bolu UI remediation passes. All pre-existing changes were preserved untouched during this audit.

---

## 5. Exact Implementation Reviewed

The remediation in `api/bolu-save.ts` introduced four major structural improvements:
1. **`resolveUser(request: Request): Promise<{ user: any; token: string } | null>`:** Extracts Bearer token and authenticates via `client.auth.getUser(token)`.
2. **`getUserClient(token: string): SupabaseClient | null`:** Creates a user-scoped client carrying the authenticated caller's JWT in `Authorization: Bearer <token>`.
3. **Canonical Tenant Schema Resolution:** Invokes `adminClient.rpc('_prov_get_schema_name', { p_entity_id: targetEntityId })`, trims the response, and validates it against `/^entity_[a-z0-9-]+_[a-z0-9-]+$/i`. Rejects null, empty, malformed, or `'public'` values with HTTP 422 `tenant_schema_unresolved`.
4. **Pre-Flight Authorization Gate:** Calls `adminClient.rpc('has_entity_permission', { p_entity_id, p_user_id, p_resource, p_action })` before opening the tenant transaction. Rejection returns HTTP 403 `forbidden`.
5. **User-Scoped Tenant Client:** Calls `createTenantClient(userClient, schemaName)` instead of `createTenantClient(adminClient, schemaName)`. This ensures `auth.uid()` in PostgreSQL evaluates to `user.id`.

---

## 6. Canonical Resolver Findings (Audit 1)

### OBSERVATION
The function `public._prov_get_schema_name(p_entity_id uuid)` was verified in the live PostgreSQL catalog:
- **Existence:** Confirmed in schema `public`.
- **Signature:** `public._prov_get_schema_name(p_entity_id uuid)`.
- **Return Type:** `text`.
- **Owner:** `postgres`.
- **Security:** `STABLE SECURITY DEFINER`.
- **Search Path:** Explicitly set to `'public'`.
- **Grants:** `EXECUTE` granted to `PUBLIC`, `authenticated`, `anon`, `service_role`, `postgres`.
- **SQL Body:**
  ```sql
  SELECT 'entity_' || w.slug || '_' || e.slug
  FROM public.entities e
  JOIN public.workspaces w ON w.id = e.workspace_id
  WHERE e.id = p_entity_id;
  ```

### Live Query Verification
1. **Valid Entity:** Tested known entity `eca34515-0b30-482c-b12e-3963df164322` (`slug: main`, `workspace_id: eb30b64b-7f95-464f-be1a-805cf2c0fedc`). Returned `"entity_bigdrops-main_main"`.
2. **Missing Entity:** Tested non-existent UUID `00000000-0000-0000-0000-000000000000`. Returned `NULL`.
3. **Validation Regex Analysis:**
   - Evaluated regex: `/^entity_[a-z0-9-]+_[a-z0-9-]+$/i`.
   - Workspace and entity slugs are normalized by `slugify()` in `src/domain/tenant/tenantGate.ts` to `[a-z0-9-]+`.
   - The regex accepts all verified tenant schemas (`entity_bigdrops-main_main`, `entity_bigdrops-main_agbado`, `entity_bigdrops-main_agam`).
   - The regex rejects SQL injection attempts (e.g., `entity_ws_ent; DROP TABLE users;--`), missing components (`entity_`), and reserved names (`public`).
4. **Fail-Closed Behavior:** `api/bolu-save.ts` tests for truthiness, disallows `'public'`, tests regex conformity, and immediately returns HTTP 422 if invalid. It never guesses or falls back to `public`.

---

## 7. Authentication and Token Verification Findings (Audit 2)

### OBSERVATION
1. **Extraction:** `getRequestHeader(request, 'authorization')` uses case-insensitive lookup supporting both standard Web API `Headers` objects and Node.js dictionary objects.
2. **Bearer Token Parsing:** Extracted via regex `/^Bearer\s+(.+)$/i`.
3. **Cryptographic Validation:** Passed to `client.auth.getUser(token)`. This invokes Supabase Auth (GoTrue), which verifies cryptographic JWT signatures against the platform secret and validates `exp` timestamps.
4. **User Derivation:** `user.id` is derived strictly from the GoTrue response (`data.user`). Client-supplied user IDs or parameters are ignored.
5. **Credential Safety:** The raw JWT is passed to `getUserClient(token)` headers and is never output to `console.log` or error responses.
6. **Failure States:** Missing, expired, malformed, or untrusted tokens result in `resolveUser` returning `null`, triggering HTTP 401 `unauthorized`.

---

## 8. PostgREST Schema Exposure Findings (Audit 3)

### OBSERVATION
1. **Client Schema Profile:** `createTenantClient(userClient, schemaName)` invokes `userClient.schema(schemaName)`. Under `@supabase/supabase-js`, this emits `Accept-Profile: <schemaName>` (for reads) and `Content-Profile: <schemaName>` (for mutations/RPCs).
2. **Schema Exposure State:** In the linked database, `public._pending_postgrest_schemas` was queried. Zero schemas remain pending (`count = 0`). All provisioned schemas (`entity_bigdrops-main_main`, `entity_bigdrops-main_agbado`, etc.) have `processed = true`.
3. **Database Grants:**
   - `has_schema_privilege('authenticated', 'entity_bigdrops-main_main', 'USAGE')` returned `true`.
   - `has_table_privilege('authenticated', 'entity_bigdrops-main_main.invoices', 'SELECT')` returned `true`.
   - `has_table_privilege('authenticated', 'entity_bigdrops-main_main.invoices', 'INSERT')` returned `true`.
   - `has_function_privilege('authenticated', 'entity_bigdrops-main_main.save_quotation_with_items_transaction(...)', 'EXECUTE')` returned `true`.
   - `has_function_privilege('authenticated', 'entity_bigdrops-main_main.save_invoice_with_items_transaction(...)', 'EXECUTE')` returned `true`.
4. **Client Reuse Safety:** `getUserClient(token)` creates a new client instance per incoming HTTP request. Clients are not cached globally or shared across requests, eliminating cross-tenant header bleed.

---

## 9. Authorization Consistency Findings (Audit 4)

### OBSERVATION
1. **Pre-Flight Authorization:**
   - Evaluates: `adminClient.rpc('has_entity_permission', { p_entity_id, p_user_id, p_resource, p_action })`.
   - `public.has_entity_permission` is defined as:
     ```sql
     CREATE OR REPLACE FUNCTION public.has_entity_permission(
         p_entity_id uuid,
         p_user_id uuid,
         p_resource text,
         p_action text
     ) RETURNS boolean
     ```
   - Matches required signature exactly.
2. **In-Transaction Authorization:**
   - `entity_bigdrops-main_main.save_quotation_with_items_transaction` enforces:
     ```sql
     IF p_mode = 'create' THEN
         IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'quotation', 'create') THEN
             RAISE EXCEPTION 'Insufficient permissions: quotation/create required'
                 USING ERRCODE = 'insufficient_privilege';
         END IF;
     ...
     ```
   - Because `userClient` carries `Authorization: Bearer <token>`, PostgREST initializes the session with `auth.uid() = user.id`.
   - Both the pre-flight check and the transaction check query the same table (`public.entity_permissions`) for the same user and entity.
3. **Race Condition Protection:** If a user's permissions are revoked between the pre-flight check and transaction execution, the transaction-level check acts as an authoritative hard stop, aborting the transaction and returning error code `42501`. `api/bolu-save.ts` maps this to HTTP 403 `forbidden`.

---

## 10. Role Grants and RLS Findings (Audit 5)

### OBSERVATION
1. **Public vs. Tenant RPC Parity:**
   - Database catalog query revealed that `save_invoice_with_items_transaction` exists **only** in tenant schemas (`entity_%`), not in `public`.
   - `save_quotation_with_items_transaction` exists in tenant schemas (and a legacy instance exists in `public`).
   - Falling back to `public` was an invalid path that would immediately crash invoice saves with undefined function errors.
2. **Tenant RLS Protection:** Tenant tables have Row-Level Security enabled and forced (`ALTER TABLE ... FORCE ROW LEVEL SECURITY`). Policies call `has_entity_permission(entity_id, auth.uid(), resource, action)`.
3. **Execution Grants:** The `authenticated` role holds explicit `EXECUTE` privileges on tenant transaction RPCs and `USAGE` privileges on tenant schemas.

---

## 11. Transaction Atomicity Findings (Audit 6)

### OBSERVATION
1. **Atomic Transaction Scope:** `save_quotation_with_items_transaction` and `save_invoice_with_items_transaction` are PL/pgSQL functions. In PostgreSQL, all function statements run inside an implicit transaction.
2. **Rollback Behavior:** If item validation fails, a constraint is violated, or downstream CPS feedback errors out, the transaction rolls back completely. No orphaned invoice or quotation rows remain.
3. **Numbering & Collision Retry:** Numbering generation is coordinated by `withUniqueRetry` in `bolu-document-service.ts`, trapping code `23505` (`unique_violation`) and advancing `fetchAutoCursor` before re-attempting persistence.

---

## 12. Client Fallback and Duplicate-Write Risk (Audit 7)

### OBSERVATION
The client-side execution in `src/lib/ai-assistant/hooks/useBoluThread.ts` was audited:
1. **Fallback Boundaries:**
   - `resp.status === 404`: Handled as unmounted route (prior to transaction initiation). Local client persistence executes.
   - `errData?.code === 'server_config_missing'`: Handled as pre-database configuration abort. Local client persistence executes.
2. **Terminal Non-Fallback States:**
   - HTTP 400 (Bad request / validation error): No fallback.
   - HTTP 401 (Unauthorized): No fallback.
   - HTTP 403 (Forbidden): No fallback.
   - HTTP 422 (Unresolved tenant schema): No fallback.
   - HTTP 500 (Database transaction failure): No fallback.
   - Network fetch interruption (`fetchErr`): Trapped and returns:
     `"Connection interrupted while saving. Please refresh your document list to check status before retrying."`
     No client-side second write is initiated.

---

## 13. Financial and Document Contract Preservation (Audit 8)

### OBSERVATION
1. **Calculation Authority:** `computeAuthoritativeTotals` in `bolu-operations.ts` recalculates all totals, VAT (7.5%), and net amounts from line items. AI-generated totals are disregarded.
2. **`extra_charges` Integrity:** Proposal validation explicitly rejects unstructured `extra_charges` objects injected by AI models. Users and models are instructed to represent fees (such as transport) as standard line items with quantity 1 and unit price.
3. **Calculations Engine:** No modifications were made to `src/lib/Calculations.ts`.

---

## 14. Test Coverage Assessment (Audit 9)

### OBSERVATION
The test file `src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts` was executed using `bun test`:
- **Result:** 12 passed, 0 failed across 1 file (duration: 1.48s).
- **Scope of Coverage:**
  1. Diagnostic preservation in `errorRegistry` without stripping descriptions.
  2. Redaction of Bearer tokens, API keys, JWTs, and database credentials.
  3. Storage bloat capping at 4,000 characters.
  4. Proposal validation rejecting `extra_charges` with actionable guidance.
  5. Proposal modification rejecting `extra_charges`.
  6. Line-item transport charges validated and accepted.
  7. Canonical tenant schema regex pattern testing (`TENANT_SCHEMA_PATTERN`).
  8. Request rejection with HTTP 401 `unauthorized` when Bearer token is absent.
  9. Request rejection with HTTP 400/422 when tenant/entity ID is missing.
  10. Composer edit lockout disabled during active message edit mode.
  11. Composer edit lockout active during response streaming.
  12. Composer edit lockout active when idle-disabled and not editing.

---

## 15. Production Incident Classification (Audit 10)

| Issue | Classification | Details |
| :--- | :--- | :--- |
| **1. Invalid `entities.schema_name` lookup** | **CONFIRMED RESOLVED** | Verified: `entities.schema_name` removed; canonical `_prov_get_schema_name` invoked. |
| **2. Tenant schema resolution** | **CONFIRMED RESOLVED** | Verified: Live database tests confirm deterministic schema resolution and regex validation. |
| **3. Service-role `auth.uid()` context** | **CONFIRMED RESOLVED** | Verified: Scoped `userClient` forwards caller JWT; `auth.uid()` evaluates to user ID. |
| **4. PostgREST schema exposure** | **CONFIRMED RESOLVED** | Verified: `_pending_postgrest_schemas` queue processed; `authenticated` role has `USAGE` grants. |
| **5. Permission pre-flight consistency** | **CONFIRMED RESOLVED** | Verified: Server checks `adminClient.rpc('has_entity_permission', ...)` before transaction. |
| **6. Transaction authorization** | **CONFIRMED RESOLVED** | Verified: Database RPC enforces `has_entity_permission(..., auth.uid(), ...)`; 42501 mapped to 403. |
| **7. Provider configuration errors** | **CONFIRMED RESOLVED** | Verified: Structured error codes (401, 403, 500, 502) returned without leaking secrets. |
| **8. Cloudzyro cold-sleep behaviour** | **HISTORICAL / PROPERTY** | Live probe returned HTTP 503 during cold sleep. Expected external host tier characteristic. |
| **9. Client fallback duplicate writes** | **CONFIRMED RESOLVED** | Verified: Ambiguous responses and database errors are terminal; duplicate writes prevented. |
| **10. Financial `extra_charges` handling** | **CONFIRMED RESOLVED** | Verified: Unstructured fees rejected; standard line items enforced; math locked. |

---

## 16. Security Risks and Unresolved Blockers

1. **Residual Cold-Sleep Latency (Cloudzyro VPS):** The external Cloudzyro backend sleeps after inactivity, responding with HTTP 503 ("Waking up: this free app rests after an hour without visitors") on initial requests. While the client handles this cleanly without duplicate writes, initial user requests may experience a 30–60s delay until the container wakes.
2. **No Application Blockers:** Zero security vulnerabilities, privilege escalation vectors, or cross-tenant data leaks were identified in the reviewed code and database configuration.

---

## 17. Recommended Next Actions

1. **PROPOSAL:** Maintain Cloudzyro keep-alive pings during business hours if instant response times are required for the external AI container.
2. **PROPOSAL:** Add end-to-end integration tests in CI using test database containers to simulate authenticated PostgREST RPC executions.

---

## 18. Final Git Status and Attribution

### Command Output: `git status --short`
```
 M .env.example
 M AGENTS.md
 M README.md
 M api/bolu-provider-config.ts
 M api/bolu-save.ts
 M bun.lock
 M docs/prd/conversational-document-assistant/Readme.md
 M docs/prd/conversational-document-assistant/Waterfall-roadmap.md
 M docs/prd/conversational-document-assistant/decision-log.md
 M docs/prd/conversational-document-assistant/functional-req.md
 M docs/prd/conversational-document-assistant/provider-catalog.md
 D docs/reports/2026-11-14-dynamic-model-routing-reconciliation.md
 D docs/reports/2026-11-14-hermes-provider-architecture-audit.md
 D docs/reports/BOUXRE_WEB_ANDROID_CHANGELOG_IMPLEMENTATION_AUDIT.md
 M docs/reports/ai/2026-11-14-bolu-application-document-intelligence-reconciliation.md
 D docs/reports/bolu-design-lab-reconciliation-2026-11-14.md
 D docs/reports/bolu-phase-a-audit-2026-11-14.md
 D docs/reports/bolu-ui-artifact-audit-2026-11-15.md
 D docs/reports/bolu-ui-state-desync-audit-2026-11-15.md
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
 M src/components/app/update/ChangelogTimeline.tsx
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
?? docs/reports/ai/2026-11-14-dynamic-model-routing-reconciliation.md
?? docs/reports/ai/2026-11-14-hermes-provider-architecture-audit.md
?? docs/reports/ai/2026-11-17-bolu-post-remediation-security-integration-audit.md
?? docs/reports/ai/BOUXRE_BOLU_BACKEND_DATABASE_AND_SAVE_FORENSIC_INVESTIGATION_2026-11-17.md
?? docs/reports/ai/BOUXRE_SAVE_AND_BOLU_EDIT_FORENSIC_INVESTIGATION_2026-11-17.md
?? docs/reports/ai/bolu-design-lab-reconciliation-2026-11-14.md
?? docs/reports/ai/bolu-phase-a-audit-2026-11-14.md
?? docs/reports/ai/bolu-ui-artifact-audit-2026-11-15.md
?? docs/reports/ai/bolu-ui-state-desync-audit-2026-11-15.md
?? docs/reports/android/2026-11-17-unified-release-notifications.md
?? docs/reports/android/BOUXRE_WEB_ANDROID_CHANGELOG_IMPLEMENTATION_AUDIT.md
?? docs/reports/governance/
?? docs/reports/observability/
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

---

## 19. Statement of Non-Modification

**CONFIRMATION:** No application source code, configuration files, environment variables, database definitions, database migrations, or remote infrastructure were modified during this audit. The only file added to the repository by this task is this audit document:
`docs/reports/ai/2026-11-17-bolu-post-remediation-security-integration-audit.md`.
