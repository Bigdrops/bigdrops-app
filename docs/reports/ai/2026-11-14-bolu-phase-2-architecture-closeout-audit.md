# Bolu AI Phase 2 Architecture Close-Out Verification Audit Report

- **Document Identifier:** AUDIT-BOLU-PHASE2-CLOSEOUT-2026-11-14
- **Date:** 14 November 2026
- **Auditor:** BOURXE Platform Architecture & Security Engineering
- **Audit Type:** Strict Zero-Code-Edit Investigation & Verification
- **Target Subsystem:** Bolu AI Routing Subsystem & Provider Management (Phase 2)
- **Specification Standard:** ASD-STE100 Simplified Technical English
- **Final Verdict:** **REJECTED — REMEDIATION REQUIRED**

---

## 1. Executive Verdict

Phase 2 aimed to normalize provider administration, database persistence, and chat runtime execution into one single multi-provider architecture.

The implementation contains substantial high-quality engineering:
- Persistent encrypted connection vault schema in `supabase/migrations/20261114170000_bolu_provider_connections.sql`.
- AES-256-GCM envelope encryption and secret masking in `connection-vault.ts` and `bolu-secret-vault.ts`.
- Serverless memory-isolated credential handling with client denial policies (`USING false WITH CHECK false`).
- Staged Hermes-style configuration sheet with instant inline testing and live model discovery.
- Currency-aware balance synchronization distinguishing nominal amounts from USD.
- 132 passing unit tests in `src/tests/ai-assistant/`.

However, the architecture does not satisfy the primary architectural invariant:
> *"One authoritative connection pool, one routing policy, and one runtime selection mechanism. Administrators must manage the same connection pool that Bolu actually uses. Do not maintain competing primary/fallback lists and priority-based routing systems."*

Three material defects prevent architectural acceptance:
1. **Unsafe Legacy Routing Fall-Through (`SEC-ROUT-01` — Critical):**
   In `api/bolu-chat.ts`, when `claimEligibleConnection` returns `null` (such as when all pool connections are cooling down or disabled), execution silently falls through into legacy primary/fallback routing (`resolveRuntimeConnections`), legacy singleton credentials (`loadInAppProviderConfig`), and server environment variables (`getBoluProviderConfig`). This allows disabled, quarantined, cooling down, or out-of-pool connections to receive live inference traffic, bypassing administrator pool controls.
2. **Catalogue Desynchronization & Model Routing Lockout (`ARCH-CAT-01` — High):**
   The Settings UI catalogue (`src/lib/ai-assistant/provider-catalog.ts`) exposes 15 verified providers. However, the runtime policy router (`src/lib/ai-assistant/routing/bolu-policy-router.ts`) and routing catalogue (`src/lib/ai-assistant/routing/bolu-provider-catalog.ts`) only approve 8 providers. Connections saved for the remaining 7 providers (Qwen, Together, Fireworks, Cerebras, xAI, Cohere, NVIDIA) are silently dropped by `resolveRoutingPolicy` and can never be claimed by the chat runtime.
3. **Optimistic Health Recovery at Claim Time (`SQL-CLAIM-01` — High):**
   In `supabase/migrations/20261114170000_bolu_provider_connections.sql`, `claim_eligible_ai_connection` automatically updates `health_status = 'healthy'` at the moment a row is claimed, before upstream inference is attempted or succeeds. If the server crashes or the provider fails, the connection can remain marked healthy in the database.

Therefore, Phase 2 is **REJECTED — REMEDIATION REQUIRED**. Targeted remediation must be applied before production deployment and migration activation.

---

## 2. Scope and Methodology

This investigation was conducted under strict zero-code-edit constraints. No application code, SQL migrations, test files, or existing roadmap documents were modified.

The investigation examined:
- Routing control flow in `api/bolu-chat.ts`.
- Administrative mutations in `api/bolu-provider-config.ts` and `src/lib/ai-assistant/connection-vault.ts`.
- Policy resolution in `src/lib/ai-assistant/routing/bolu-policy-router.ts`.
- Account pool claiming in `src/lib/ai-assistant/routing/bolu-account-pool.ts`.
- Error classification in `src/lib/ai-assistant/routing/bolu-error-classifier.ts`.
- Balance synchronization in `src/lib/ai-assistant/routing/bolu-balance-sync.ts`.
- Provider catalogues in `src/lib/ai-assistant/provider-catalog.ts` and `src/lib/ai-assistant/routing/bolu-provider-catalog.ts`.
- Database migrations `20261114160000_bolu_provider_credentials.sql` and `20261114170000_bolu_provider_connections.sql`.
- User interface components in `src/pages/settings/BoluProviderSettingsSection.tsx` and `src/pages/settings/bolu-provider/`.

---

## 3. Worktree Status and Pre-Existing Changes

Git status was captured immediately prior to investigation. All pre-existing modifications and untracked files are preserved:

```text
Tracked Modifications:
 M api/bolu-chat.ts
 M api/bolu-provider-config.ts
 M docs/prd/conversational-document-assistant/Waterfall-roadmap.md
 M docs/prd/conversational-document-assistant/roadmap.html
 M src/components/settings/settings.css
 M src/lib/ai-assistant/bolu-provider.ts
 M src/lib/ai-assistant/connection-vault.ts
 M src/lib/ai-assistant/provider-catalog.ts
 M src/pages/settings/BoluProviderSettingsSection.tsx
 M src/pages/settings/bolu-provider/ConnectionCard.tsx
 M src/pages/settings/bolu-provider/ConnectionDialog.tsx
 M src/pages/settings/bolu-provider/api.ts
 M src/tests/ai-assistant/connection-vault.test.js
 M src/tests/ai-assistant/provider-catalog.test.js
 M supabase/migrations/20261114170000_bolu_provider_connections.sql

Untracked Worktree Files:
 ?? docs/reports/ai/2026-11-14-bolu-phase-1-defect-remediation-report.md
 ?? docs/reports/ai/2026-11-14-bolu-phase-1-routing-verification-and-closeout.md
 ?? docs/reports/ai/2026-11-14-bolu-phase-2-provider-management-implementation-report.md
 ?? docs/reports/ai/2026-11-14-bolu-provider-management-phase-2-pre-design-audit.md
 ?? docs/reports/android/app-update-async-refactor-plan-2026-11-14.md
 ?? src/components/app/update/
 ?? src/components/ui/progress.tsx
 ?? src/domain/appUpdate/changelog.ts
 ?? src/lib/ai-assistant/routing/
 ?? src/tests/ai-assistant/bolu-routing-engine.test.js
 ?? video-json-tutorial/
```

---

## 4. Architectural Routing-Path Matrix

Every executable provider-selection path from incoming chat request (`POST /api/bolu-chat`) to upstream adapter was traced at source level:

| Path ID | Path Name | Trigger Condition | Credential Source | Respects `is_enabled` | Respects `in_pool` | Respects `priority` | Respects Cooldown | Respects Paid Tier Policy | Classification |
|---|---|---|---|---|---|---|---|---|---|
| **PATH-01** | Atomic Pool Selection | `policyDecision.ok` AND `claim_eligible_ai_connection` returns row | `app_ai_provider_connections` (AES-256-GCM decrypted via service_role) | **YES** (`c.is_enabled = true`) | **YES** (`c.in_pool = true`) | **YES** (`ORDER BY priority ASC`) | **YES** (`cooldown <= now()`) | **YES** (`p_allow_paid OR NOT is_paid`) | **Authoritative Native Engine** |
| **PATH-02** | Legacy Primary / Fallback Routing | `claimEligibleConnection` returns `null` AND `app_ai_provider_routing` has `primary_connection_id` | `app_ai_provider_connections` loaded via `resolveRuntimeConnections` | **YES** (`is_enabled`) | **NO** (Ignored) | **NO** (Uses legacy array order) | **NO** (Ignored) | **NO** (Ignored) | **Unsafe Routing Bypass** |
| **PATH-03** | Legacy Singleton Table | `runtimeResolution.candidates` empty AND `app_ai_provider_config` has `primary` row | `app_ai_provider_config` loaded via `loadInAppProviderConfig` | **NO** (Table has no enabled flag) | **NO** (Table has no pool flag) | **NO** (Singleton) | **NO** (No cooldown support) | **NO** (No paid policy support) | **Unsafe Routing Bypass** |
| **PATH-04** | Server Environment Variables | No database connection resolved AND `process.env.BOLU_PROVIDER_API_KEY` or `BOLU_AMD_API_KEY` set | Process environment variables | **NO** (Static env) | **NO** (Static env) | **NO** (Static env) | **NO** (No cooldown support) | **NO** (No paid policy support) | **Emergency Compatibility Path** |
| **PATH-05** | Deterministic Mock Mode | `BOLU_PROVIDER_MODE === 'mock'` AND no preceding path produced response | Static in-memory mock fixtures | N/A | N/A | N/A | N/A | N/A | **Test/Development Path** |

### Explicit Investigation Answers:
- **Does an empty eligible database pool permit execution through legacy credentials?**
  **YES.** In `api/bolu-chat.ts` lines 420–462, if `claimEligibleConnection` returns `null`, execution drops directly into `resolveRuntimeConnections` and `loadInAppProviderConfig`.
- **Can disabled or out-of-pool connections still receive inference requests?**
  **YES.** If an administrator unchecks `in_pool` for a connection, but that connection is still referenced in `app_ai_provider_routing.primary_connection_id` or `fallback_connection_ids`, PATH-02 will claim and execute that connection.
- **Can legacy fallback bypass cooldown, quarantine, priority, or paid-tier restrictions?**
  **YES.** `resolveRuntimeConnections` in `src/lib/ai-assistant/connection-vault.ts` only checks `record.is_enabled` and `config.model`. It completely ignores `health_status`, `account_cooldown_until`, `model_cooldowns`, `priority`, and `is_paid_tier`.
- **Can environment credentials silently become production inference providers?**
  **YES.** If database tables are empty or all database connections fail, PATH-04 silently executes using Vercel environment variables without administrator notification.
- **Is mock mode impossible in production?**
  Mock mode is disabled by default unless `BOLU_PROVIDER_MODE=mock` is explicitly set in server environment variables (`src/lib/ai-assistant/bolu-provider.ts` line 87).

---

## 5. SQL Claim and Health-State Recovery Analysis

**Target Migration:** `supabase/migrations/20261114170000_bolu_provider_connections.sql`
**Function:** `public.claim_eligible_ai_connection`

### 5.1 Eligibility Predicate Audit
```sql
WHERE c.is_enabled = true
  AND c.in_pool = true
  AND c.health_status <> 'quarantined'
  AND c.provider_id = ANY(p_allowed_providers)
  AND (p_allow_paid = true OR c.is_paid_tier = false)
  AND (array_length(v_excluded, 1) IS NULL OR NOT (c.id = ANY(v_excluded)))
  AND (c.model = p_target_model OR p_target_model = ANY(c.allowed_models))
  AND (c.account_cooldown_until IS NULL OR c.account_cooldown_until <= v_now)
  AND (
    c.model_cooldowns IS NULL
    OR NOT (c.model_cooldowns ? p_target_model)
    OR (c.model_cooldowns->>p_target_model)::timestamptz <= v_now
  )
```

1. **Cooldown Expiry Enforcement:** Correctly enforced. `c.account_cooldown_until <= v_now` prevents claiming an account before its cooldown expires.
2. **Exhaustion Recovery:** When an account is marked `'exhausted'`, `record_ai_connection_failure` sets `account_cooldown_until = v_now + interval` (default 3600 seconds). The connection cannot be claimed until that cooldown timestamp expires.
3. **Quarantine Isolation:** Confirmed. `c.health_status <> 'quarantined'` strictly prevents claiming quarantined credentials (such as HTTP 401 invalid credentials).
4. **Tie-Breaking Determinism:** **Defective.** `ORDER BY c.priority ASC, c.last_selected_at ASC NULLS FIRST, c.consecutive_failures ASC` lacks a deterministic tie-breaker column like `c.id ASC`.
5. **Premature Health Recovery:** **Defective.** The update on claim (lines 287–292):
   ```sql
   health_status = CASE WHEN health_status IN ('cooling_down', 'exhausted', 'unknown') THEN 'healthy' ELSE health_status END
   ```
   promotes the row to `'healthy'` prior to upstream request success.

### 5.2 Tenancy and Concurrency Audit
- **Tenant Isolation:** `app_ai_provider_connections` has **no `tenant_id` column**. Bolu provider connections are application-wide administrative resources, not tenant-scoped BYOK rows. The table is locked by RLS (`USING false WITH CHECK false`) and accessible only via service-role credentials.
- **Concurrency & Row Locking:** `FOR UPDATE OF c SKIP LOCKED LIMIT 1` guarantees that concurrent requests do not claim the same row simultaneously within the duration of the RPC transaction. Because PostgREST commits immediately after the RPC finishes, `last_selected_at` is updated, ensuring fair rotation for subsequent requests.

---

## 6. Failover Semantics and Streaming Safety Analysis

### 6.1 First-Token Boundary Contract
The contract requires:
1. Failover must be limited to pre-first-token errors.
2. Once content tokens are transmitted to the client, the connection locks in. Later errors must not replay requests to a second provider.

**Source Inspection of `api/bolu-chat.ts`:**
- `streamAdapterChat` handles HTTP handshakes and initial response generation.
- If upstream returns a non-200 HTTP response, `streamAdapterChat` returns `{ diagnostics: ProviderDiagnostics }`. This occurs strictly **before** any response headers or stream chunks are sent.
- When `result` contains `response`, `api/bolu-chat.ts` wraps the body stream using `wrapStreamForFirstTokenBoundary` and immediately returns `new Response(bodyStream, { status: 200, headers })`.
- Once `Response` is returned to the HTTP runtime, loop iteration terminates. A mid-stream disconnection or network drop causes `controller.error(err)` on the active stream; it cannot and does not trigger secondary failover.
- Post-first-token lock-in is **VERIFIED ENFORCED**.

### 6.2 Attempt Bounding and Exclusion Tracking
- `maxAttempts` is explicitly bounded: `const maxAttempts = Math.min(policyDecision.maxAttempts || 4, 4)`.
- On every pre-first-token failure, `excludedConnectionIds.push(claimed.connectionId)` ensures the failed connection cannot be selected again within the current chat request.
- Attempt bounding is **VERIFIED ENFORCED**.

### 6.3 Provider Outage Scope vs Account Scope
- When `classifyProviderError` encounters an HTTP 502/503 or network failure, it sets `scope: 'provider'`.
- However, `api/bolu-chat.ts` only records `claimed.connectionId` in `excludedConnectionIds`.
- If an organization has multiple connections configured for the same failing provider, the router will iterate through all of them before failing over to a different provider.
- This represents an inefficiency identified in `FAILOVER-SCOPE-01` (Medium).

---

## 7. Provider Catalogue Evidence Matrix

The 15 providers in `src/lib/ai-assistant/provider-catalog.ts` were independently audited against repository contracts and routing definitions:

| Provider ID | Display Name | Protocol | Auth Scheme | Documented Base URL | Discovery Supported | Default Curated Model | In UI Catalogue | In Routing Policy | Approved for Routing |
|---|---|---|---|---|---|---|---|---|---|
| `openrouter` | OpenRouter | `openai` | `bearer` | `https://openrouter.ai/api/v1` | Yes | `openrouter/free` | Yes | Yes | **YES** |
| `openai` | OpenAI | `openai` | `bearer` | `https://api.openai.com/v1` | Yes | `gpt-4o-mini` | Yes | Yes | **YES** |
| `anthropic` | Anthropic | `anthropic` | `x-api-key` | `https://api.anthropic.com/v1` | Yes | `claude-sonnet-4-5` | Yes | Yes | **YES** |
| `gemini` | Google Gemini | `openai` | `bearer` | `https://generativelanguage.googleapis.com/v1beta/openai` | Yes | `gemini-2.5-flash` | Yes | Yes | **YES** |
| `groq` | Groq | `openai` | `bearer` | `https://api.groq.com/openai/v1` | Yes | `llama-3.3-70b-versatile` | Yes | Yes | **YES** |
| `deepseek` | DeepSeek | `openai` | `bearer` | `https://api.deepseek.com/v1` | Yes | `deepseek-chat` | Yes | Yes | **YES** |
| `mistral` | Mistral | `openai` | `bearer` | `https://api.mistral.ai/v1` | Yes | `mistral-small-latest` | Yes | Yes | **YES** |
| `amd` | AMD Token Factory | `openai` | `bearer` | `https://developer.amd.com.cn/radeon/api/v1` | Yes | `DeepSeek-V4-Flash` | Yes | Yes | **YES** |
| `qwen` | Qwen / Alibaba Cloud | `openai` | `bearer` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Yes | `qwen-plus` | Yes | **NO** | **BLOCKED (Not in Policy)** |
| `together` | Together AI | `openai` | `bearer` | `https://api.together.xyz/v1` | Yes | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | Yes | **NO** | **BLOCKED (Not in Policy)** |
| `fireworks` | Fireworks AI | `openai` | `bearer` | `https://api.fireworks.ai/inference/v1` | Yes | `accounts/fireworks/models/llama-v3p3-70b-instruct` | Yes | **NO** | **BLOCKED (Not in Policy)** |
| `cerebras` | Cerebras | `openai` | `bearer` | `https://api.cerebras.ai/v1` | Yes | `llama-3.3-70b` | Yes | **NO** | **BLOCKED (Not in Policy)** |
| `xai` | xAI Grok | `openai` | `bearer` | `https://api.x.ai/v1` | Yes | `grok-3-mini` | Yes | **NO** | **BLOCKED (Not in Policy)** |
| `cohere` | Cohere | `openai` | `bearer` | `https://api.cohere.ai/compatibility/v1` | Yes | `command-r-plus` | Yes | **NO** | **BLOCKED (Not in Policy)** |
| `nvidia` | NVIDIA NIM | `openai` | `bearer` | `https://integrate.api.nvidia.com/v1` | Yes | `meta/llama-3.3-70b-instruct` | Yes | **NO** | **BLOCKED (Not in Policy)** |

### Classification Findings:
1. **Tier Discrepancy Resolved:** The "Tier 1" global foundation providers in the codebase are exactly 7: OpenRouter, OpenAI, Anthropic, Gemini, Groq, DeepSeek, and Mistral (plus AMD as the foundational trial provider). Together they form the 8 routing-approved providers.
2. **Provider #15 is NVIDIA NIM, not Perplexity:** The 15th curated provider in `src/lib/ai-assistant/provider-catalog.ts` is `nvidia` (NVIDIA NIM), resolving previous documentation ambiguity.
3. **Severe Catalogue Desynchronization:** 7 providers are offered to the administrator in the UI, but blocked from runtime execution by `DEFAULT_APPROVED_PROVIDERS`.

---

## 8. Credential Security and Management API Contract Findings

### 8.1 Plaintext Secret Isolation
- `PUBLIC_COLUMNS` in `src/lib/ai-assistant/connection-vault.ts` explicitly omits `encrypted_key`, `key_nonce`, `key_tag`, and `key_version`.
- `toPublicConnection` maps only `masked_key` (e.g. `sk-••••••••••••1234`).
- Plaintext API keys never leave serverless execution memory. They are decrypted exclusively inside `loadConnectionSecret` or `claimEligibleConnection`.
- Zero plaintext API keys are returned in browser responses, logs, or routing events.

### 8.2 Client Mutation Safeguards
- In `api/bolu-provider-config.ts` (`handleUpdate`), input fields are strictly whitelisted: `name`, `model`, `protocol`, `authScheme`, `baseUrl`, `timeoutMs`, `isEnabled`, `priority`, `inPool`, `allowedModels`, `isPaidTier`, `apiKey`.
- Runtime-owned telemetry fields (`health_status`, `total_requests_started`, `total_tokens`, `consecutive_failures`, `account_cooldown_until`) cannot be modified by the client.

### 8.3 SSRF and Custom Endpoint Security
- Custom endpoints are validated via `endpointGuard`:
  - `validateEndpointSyntax`: Enforces `https://`, rejects userinfo credentials, and rejects raw IP addresses.
  - `assertEndpointResolvesSafe`: Resolves DNS and blocks loopback (`127.0.0.0/8`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local, and cloud metadata endpoints (`169.254.169.254`).
  - Standard providers use hardcoded immutable endpoints immune to SSRF manipulation.

---

## 9. Currency and Balance Integrity Findings

1. **Storage Separation:** Confirmed. Schema stores `known_balance_amount numeric(12,4)` for raw values, `known_balance_currency text NOT NULL DEFAULT 'USD'`, and `known_balance_usd numeric(12,4)`.
2. **Currency Guard in `bolu-balance-sync.ts`:**
   When DeepSeek returns a CNY balance:
   ```ts
   if (currency !== 'USD') {
     return {
       supported: true,
       balanceAmount: validTotal,
       balanceUsd: null,
       currency,
       source: 'unsupported',
       updatedAt: now,
       error: `DeepSeek returned a ${currency} balance; USD normalization is not configured.`,
     }
   }
   ```
   `known_balance_usd` is set to `null` to prevent nominal CNY values from corrupting USD aggregates.
3. **UI Rendering:** In `ConnectionCard.tsx`, if balance is present, it explicitly prints `{connection.knownBalanceAmount} {connection.knownBalanceCurrency}`. A missing balance renders nothing; it is never coerced to `$0.00`.

---

## 10. Database Migration and Compatibility Findings

1. **Hosted Migration Status:** **UNAPPLIED (CONFIRMED PENDING)**.
   The mobile console displays `schemaReady: false` ("Vault not ready. Apply migration 20261114170000_bolu_provider_connections.sql"). Live hosted Supabase has not executed this migration.
2. **Idempotency:** The migration uses `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`, and `ON CONFLICT` guards. It is safe to execute repeatedly.
3. **Unique Constraint Scope:**
   The constraint is `CONSTRAINT uq_app_ai_provider_connections_name UNIQUE (name)`. It is an application-wide unique name constraint.
4. **Retired Schema Dependencies:**
   `app_ai_provider_config` (legacy singleton) and `app_ai_provider_routing` remain active in `api/bolu-chat.ts` as fallback paths. They have not been cleanly severed.

---

## 11. Provider Management UI and API Consistency Findings

1. **Decoupled Testing and Discovery:** Confirmed. In `ConnectionDialog.tsx`, inline credential testing and model discovery execute via server memory and succeed even when `schemaReady: false`.
2. **Hermes UI Staging:** Confirmed. The setup sheet clearly separates provider selection, key entry, connection testing, model discovery, naming, and pool configuration.
3. **Semantic Tokens:** Confirmed. Zero `dark:` overrides or hardcoded palettes in `BoluProviderSettingsSection.tsx` and `ConnectionCard.tsx`. Compliant with `settingsThemeTokens.test.js`.

---

## 12. Test Coverage and Verification Evidence

Existing test suite: **132 passed across 16 files in `src/tests/ai-assistant/`**.

### Test Quality Classification:
- `bolu-live-provider-integration.test.js`: **Mocked Provider Tests**. Does not test live upstream APIs; tests adapter error mapping and proposal lifecycles using mock HTTP responses.
- `connection-vault.test.js`: **Mocked Client Unit Tests**. Validates encryption and column selection against mock Supabase objects.
- `bolu-routing-engine.test.js`: **Pure Function Unit Tests**. Validates error classification, policy rules, and catalogue syntax.

### Missing Critical Tests:
1. No test verifies that an empty pool halts execution rather than executing un-pooled legacy credentials (`SEC-ROUT-01`).
2. No test checks catalogue parity between `PROVIDER_CATALOGUE` (15) and `ROUTING_PROVIDER_CATALOGUE` (8).
3. No test verifies that `claim_eligible_ai_connection` avoids premature `'healthy'` promotion upon claim failure.

---

## 13. Comprehensive Findings Log

### [CRITICAL] SEC-ROUT-01: Unsafe Legacy Fallback Bypass of Connection Pool
- **Severity:** Critical (Blocks Acceptance)
- **Location:** [`api/bolu-chat.ts#L420-L499`](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-chat.ts#L420-L499)
- **Observed Behavior:** When `claimEligibleConnection` returns `null`, the chat handler does not terminate. It executes legacy `resolveRuntimeConnections`, legacy singleton `loadInAppProviderConfig`, and server environment variables.
- **Why It Matters:** Bypasses administrator pool participation, priority, cooldowns, and disabled states. A connection removed from the pool or in quarantine can still receive traffic via legacy fallback.
- **Required Remediation:** If database pool routing is active and authoritative, an empty pool claim must immediately return HTTP 503 ("Bolu provider pool is currently unavailable or cooling down"). Legacy fallbacks must be severed or gated under an explicit emergency server configuration flag.

---

### [HIGH] ARCH-CAT-01: Catalogue Desynchronization Disables 7 Providers at Runtime
- **Severity:** High (Blocks Acceptance)
- **Location:** [`src/lib/ai-assistant/routing/bolu-policy-router.ts#L38-L47`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/routing/bolu-policy-router.ts#L38-L47) vs [`src/lib/ai-assistant/provider-catalog.ts#L43-L277`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/provider-catalog.ts#L43-L277)
- **Observed Behavior:** UI allows saving connections for 15 providers. `DEFAULT_APPROVED_PROVIDERS` and `ROUTING_PROVIDER_CATALOGUE` contain only 8 providers (`amd`, `openrouter`, `deepseek`, `openai`, `anthropic`, `groq`, `gemini`, `mistral`).
- **Why It Matters:** Connections saved for Qwen, Together, Fireworks, Cerebras, xAI, Cohere, or NVIDIA NIM are rejected by `resolveRoutingPolicy` and can never be claimed by Bolu chat.
- **Required Remediation:** Add the 7 missing providers with verified endpoints and capabilities to `ROUTING_PROVIDER_CATALOGUE` and `DEFAULT_APPROVED_PROVIDERS`.

---

### [HIGH] SQL-CLAIM-01: Optimistic Health State Transition in Stored Procedure
- **Severity:** High (Blocks Acceptance)
- **Location:** [`supabase/migrations/20261114170000_bolu_provider_connections.sql#L287-L293`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/migrations/20261114170000_bolu_provider_connections.sql#L287-L293)
- **Observed Behavior:** `claim_eligible_ai_connection` sets `health_status = 'healthy'` unconditionally at row claim time.
- **Why It Matters:** Promotes untested (`'unknown'`) or expired cooling down connections to healthy before the request succeeds. If the server fails before calling `record_ai_connection_failure`, the connection falsely remains `'healthy'`.
- **Required Remediation:** Remove `health_status` mutation from `claim_eligible_ai_connection`. Update health to `'healthy'` exclusively in `record_ai_connection_success`.

---

### [MEDIUM] SQL-CLAIM-02: Non-Deterministic Tie-Breaking in Connection Selection
- **Severity:** Medium
- **Location:** [`supabase/migrations/20261114170000_bolu_provider_connections.sql#L276-L280`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/migrations/20261114170000_bolu_provider_connections.sql#L276-L280)
- **Observed Behavior:** `ORDER BY c.priority ASC, c.last_selected_at ASC NULLS FIRST, c.consecutive_failures ASC` lacks a primary key tie-breaker.
- **Why It Matters:** Two connections with identical priority, failure count, and `last_selected_at` sort non-deterministically.
- **Required Remediation:** Append `c.id ASC` to the `ORDER BY` clause.

---

### [MEDIUM] FAILOVER-SCOPE-01: Provider-Scoped Failures Do Not Exclude Sibling Accounts
- **Severity:** Medium
- **Location:** [`api/bolu-chat.ts#L392`](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-chat.ts#L392)
- **Observed Behavior:** Pre-first-token errors push only `claimed.connectionId` to `excludedConnectionIds`.
- **Why It Matters:** A 502/network outage on Provider X will trigger failover to another account on Provider X before trying an alternate provider.
- **Required Remediation:** If `classified.scope === 'provider'`, exclude all connection IDs belonging to that `providerId` for subsequent attempts.

---

### [LOW] DOC-TENANT-01: Inaccurate Multi-Tenancy Claims in Prior Reports
- **Severity:** Low
- **Location:** `docs/reports/ai/2026-11-14-bolu-phase-2-provider-management-implementation-report.md`
- **Observed Behavior:** Documented `UNIQUE (tenant_id, name)` and tenant scoping, but table actually uses `UNIQUE (name)` without a `tenant_id` column.
- **Why It Matters:** Obscures that Bolu connections are platform-level administrative infrastructure.
- **Required Remediation:** Clarify in platform documentation that Bolu AI infrastructure is an internal administrative singleton pool, not multi-tenant BYOK.

---

## 14. Acceptance Decision

### Decision: **REJECTED — REMEDIATION REQUIRED**

Phase 2 cannot be accepted in its current state because:
1. `SEC-ROUT-01` violates the primary architectural invariant by maintaining competing legacy routing paths that bypass pool eligibility, cooldowns, and disabled states.
2. `ARCH-CAT-01` creates a functional contradiction where 7 of 15 providers in the administrative UI cannot be used at runtime.
3. `SQL-CLAIM-01` prematurely transitions connection health before verifying inference success.

### Required Actions Prior to Re-Audit:
1. In `api/bolu-chat.ts`, terminate with HTTP 503 when pool selection yields no eligible connections; sever silent fall-through to `resolveRuntimeConnections` and `loadInAppProviderConfig`.
2. Synchronize `src/lib/ai-assistant/routing/bolu-provider-catalog.ts` and `bolu-policy-router.ts` with all 15 curated providers.
3. In `supabase/migrations/20261114170000_bolu_provider_connections.sql`, remove premature `'healthy'` updates from `claim_eligible_ai_connection` and append `c.id ASC` tie-breaking.
4. Add automated regression tests covering empty-pool termination, catalogue parity, and post-claim failure states.

---

## 15. Final Worktree Scope

Capture of `git status --short` immediately following report generation confirms that **only this single audit report was created**. Zero application code, migrations, tests, or documentation were modified:

```text
Untracked Report Created:
 ?? docs/reports/ai/2026-11-14-bolu-phase-2-architecture-closeout-audit.md
```
