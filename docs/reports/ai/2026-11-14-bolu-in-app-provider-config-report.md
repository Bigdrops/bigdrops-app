# Bolu In-App Provider Configuration & Secure Secret Management Report

- **Date:** 2026-11-14
- **Product:** BOURXE — Bolu Conversational Business Operations Assistant
- **Standard:** ASD-STE100 Simplified Technical English
- **Status:** COMPLETED & VERIFIED

---

## 1. Executive Summary

This report documents the implementation and verification of the in-app administrator provider configuration experience for Bolu's AI inference pipeline.

Previously, configuring Bolu's shared AMD Token Factory API key required manual editing of cloud deployment environment variables in the Vercel Dashboard or running the guided setup CLI (`scripts/setup-bolu-provider.ps1`). This milestone introduces a protected in-app configuration experience in Settings, allowing platform administrators to configure, test, rotate, and remove the application's shared inference credential without accessing external cloud dashboards.

Credentials are protected at rest using **AES-256-GCM envelope encryption** with a server-isolated master key outside the database. Database Row-Level Security (RLS) explicitly denies all client-side PostgREST reads and writes (`USING (false)`), guaranteeing zero client exposure. In-memory decryption occurs exclusively in server-side execution.

---

## 2. Core Decisions & Governance

- **DEC-37 (In-App Administrator Provider Secret Management & Envelope Encryption):**
  Established a single application-level shared credential (not per-employee BYOK) managed by authorized administrators via in-app Settings.
- **FR-42 (In-App Administrator Secret Management & Protected Storage):**
  Defines requirements for in-app configuration, AES-256-GCM envelope encryption, zero client exposure via RLS, pre-flight connection testing, and runtime precedence resolution.
- **RISK-41 (In-App Secret Exposure & Database Credential Compromise):**
  Mitigated through client-deny RLS policies, AES-256-GCM authenticated encryption, server-side memory decryption, masked administrative responses (`rc-••••••••••••7766`), and strict admin RBAC verification.

---

## 3. Delivered Components

### 3.1 Database Migration ([`supabase/migrations/20261114160000_bolu_provider_credentials.sql`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/migrations/20261114160000_bolu_provider_credentials.sql))

Created the protected table `public.app_ai_provider_config`:
- **Primary Row:** `id text PRIMARY KEY DEFAULT 'primary'`
- **Provider & Model:** `provider text`, `base_url text`, `model text`, `timeout_ms integer`
- **Encrypted Payload:** `encrypted_key text`, `key_nonce text` (12-byte base64), `key_tag text` (16-byte base64), `key_version integer`
- **Masked Display:** `masked_key text` (e.g. `rc-••••••••••••7766`)
- **Metadata:** `status text`, `created_at`, `updated_at`, `updated_by`
- **Row-Level Security:**
  ```sql
  ALTER TABLE public.app_ai_provider_config ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Deny public client access to app_ai_provider_config"
      ON public.app_ai_provider_config
      FOR ALL
      TO authenticated, anon
      USING (false)
      WITH CHECK (false);
  ```
  Ensures client queries from browsers return HTTP 403 / empty sets. Only serverless functions using `SUPABASE_SERVICE_ROLE_KEY` bypass RLS.

### 3.2 Secret Vault Module ([`src/lib/ai-assistant/bolu-secret-vault.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-secret-vault.ts))

Implements authenticated AES-256-GCM envelope encryption and decryption:
- `deriveMasterKey(env)`: Derives a 32-byte master encryption key from `process.env.BOLU_ENCRYPTION_KEY` or derives deterministically from `process.env.SUPABASE_SERVICE_ROLE_KEY` via HMAC-SHA256 with domain salt (`bourxe-bolu-vault-v1`).
- `encryptSecret(plainText, masterKey)`: Generates an unpredictable 12-byte nonce, encrypts via `aes-256-gcm`, and captures 16-byte authentication tag.
- `decryptSecret(payload, masterKey)`: Validates authentication tag; fails closed if ciphertext, nonce, or tag was tampered with.
- `maskApiKey(apiKey)`: Safely masks keys for UI display (`rc-••••••••••••7766`).
- `loadInAppProviderConfig(client, masterKey)`: Loads and decrypts the active configuration in server memory.
- `saveInAppProviderConfig(client, input, masterKey, userId)`: Encrypts and upserts provider configuration.
- `deleteInAppProviderConfig(client)`: Cleans up configuration.
- `testProviderConnection(config)`: Dispatches a minimal 1-token pre-flight request to verify provider endpoint reachability, authentication (401/403 detection), and rate limits (429).

### 3.3 Serverless Management Endpoints ([`api/bolu-provider-config.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-provider-config.ts))

- **RBAC Authorization:** Authenticates incoming session token via `adminClient.auth.getUser(token)`. Verifies administrative privileges:
  1. `profiles.role === 'admin'` OR
  2. `workspace_members.role in ('owner', 'admin')`
  Non-admin users receive HTTP 403 Forbidden.
- **GET:** Returns sanitized public status (`configured`, `provider`, `model`, `baseUrl`, `timeoutMs`, `maskedKey`, `status`, `updatedAt`, `activeSource`). Plaintext keys, ciphertexts, and nonces are never returned.
- **POST:** Supports actions:
  - `action: 'test'`: Tests provided credentials or active configured credentials against provider endpoint.
  - `action: 'save'`: Encrypts and persists credentials in `app_ai_provider_config`.
  - `action: 'remove'`: Deletes in-app credential record.

### 3.4 Runtime Inference Precedence ([`api/bolu-chat.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-chat.ts))

Updated inference handler to resolve provider configuration with strict precedence:
1. **Level 1 (In-App Database):** Checks `app_ai_provider_config` via `loadInAppProviderConfig`. If an active encrypted record exists, decrypts it in serverless memory.
2. **Level 2 (Server Environment Variables):** If database config is absent, checks `BOLU_PROVIDER_*` or `BOLU_AMD_API_KEY`.
3. **Level 3 (Deterministic Mock Mode):** If no provider key is available or `BOLU_PROVIDER_MODE=mock` is set, falls back safely to deterministic mock mode.

### 3.5 In-App Administrator Settings UI ([`src/pages/settings/BoluProviderSettingsSection.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/settings/BoluProviderSettingsSection.tsx))

- **Control Center Identity:** Mounted in [`src/pages/Settings.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/Settings.tsx) with explicit `detailTitle="Bolu AI Infrastructure"` and custom `Cpu` icon in [`src/pages/settings/settings-config.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/settings/settings-config.ts).
- **Operational Telemetry Strip:** 4 compact telemetry tiles displaying:
  1. *Runtime Source* (Database Vault / Environment Variable / Deterministic Mock)
  2. *Active Provider* (AMD Token Factory / OpenAI-Compatible)
  3. *Inference Model* (`DeepSeek-V4-Flash` 1M Context / Custom Profile)
  4. *Security Boundary* (PostgREST Denied via RLS)
- **Guided 3-Step Configuration Workspace:**
  - *Step 1 (Inference Provider):* Segmented interactive cards comparing AMD Token Factory (ROCm Instinct Native) and Universal Gateway (OpenRouter).
  - *Step 2 (Authentication & Key Custody):* Stored key card showing masked preview (`rc-••••••••••••7766`), update timestamp, replace toggle, and safe deletion confirmation. Password input with show/hide toggle.
  - *Step 3 (Model & Workload Profile):* Vercel-inspired curated model cards highlighting context windows, low latency, and reasoning profiles (`DeepSeek-V4-Flash`, `DeepSeek-R1-Distill-70B`, `Qwen2.5-72B`, custom).
- **Advanced Network Parameters:** Collapsible panel for Base URL and Timeout clamping.
- **Dedicated Action & Verification Bar:** Clean separation between live pre-flight connection verification (with live timestamped feedback) and credential persistence.
- **Enterprise Guardrails Footnote:** Authoritative summary of shared enterprise credential custody, zero-client RLS policy, and application calculation locking.

---

## 4. Verification Evidence

### 4.1 Automated Test Execution

Executed full automated test suite using `bun test src/tests/ai-assistant/`:

```
bun test v1.3.14 (0d9b296a)

src\tests\ai-assistant\bolu-capabilities.test.js: (5 pass)
src\tests\ai-assistant\bolu-context.test.js: (4 pass)
src\tests\ai-assistant\bolu-data.test.js: (3 pass)
src\tests\ai-assistant\bolu-lifecycle.test.js: (4 pass)
src\tests\ai-assistant\bolu-live-provider-integration.test.js: (10 pass)
src\tests\ai-assistant\bolu-operations.test.js: (21 pass)
src\tests\ai-assistant\bolu-provider-setup.test.js: (5 pass)
src\tests\ai-assistant\bolu-provider.test.js: (5 pass)
src\tests\ai-assistant\bolu-secret-vault.test.js: (7 pass)
src\tests\ai-assistant\protocol.test.js: (10 pass)

 74 pass
 0 fail
 56 expect() calls
Ran 74 tests across 10 files. [351.00ms]
```

### 4.2 TypeScript & Performance Audit

- `bun run audit:load`: Scanned 1,067 files. Zero bloat or query warnings on any new or modified files.
- `bun run typecheck`: Verified zero TypeScript errors in all newly added and modified files (`bolu-secret-vault.ts`, `api/bolu-provider-config.ts`, `api/bolu-chat.ts`, `BoluProviderSettingsSection.tsx`, `settings-config.ts`, `Settings.tsx`).
- Hardware gate respected: Zero build (`bun run build`) executed.

### 4.3 Database Migration Application & Verification

- **Command Executed:** `supabase db push --yes`
- **Target Project:** Hosted Supabase project `xqlpekpkbszpdgtuwybh` (`bigdrops-app`).
- **Migration Status:** Applied `20261114160000_bolu_provider_credentials.sql`.
- **Migration History Verification:** Query against `supabase_migrations.schema_migrations` confirmed row:
  - `version: "20261114160000"`, `name: "bolu_provider_credentials"`.
- **Schema & Column Verification:** Query against `information_schema.columns` confirmed `public.app_ai_provider_config` with all 14 columns present (`id`, `provider`, `base_url`, `model`, `timeout_ms`, `encrypted_key`, `key_nonce`, `key_tag`, `key_version`, `masked_key`, `status`, `created_at`, `updated_at`, `updated_by`).
- **RLS & Security Policy Verification:**
  - `pg_tables` confirmed `rowsecurity: true`.
  - `pg_policies` confirmed policy `Deny public client access to app_ai_provider_config` (`cmd: ALL`, `roles: {anon,authenticated}`, `qual: false`, `with_check: false`).
  - Active penetration test verified: queries under `SET ROLE anon;` and `SET ROLE authenticated;` return 0 rows. Inserts trigger Postgres error `42501: new row violates row-level security policy`.
  - Service-role queries (`SET ROLE service_role;`) operate with full administrative access.
- **Cache Reload:** Executed `NOTIFY pgrst, 'reload schema';` to refresh PostgREST schema cache.

---

## 5. Traceability Matrix

| Artifact / Document | Location | Status |
|---|---|---|
| Supabase Migration | [`supabase/migrations/20261114160000_bolu_provider_credentials.sql`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/migrations/20261114160000_bolu_provider_credentials.sql) | DELIVERED |
| Secret Vault Utility | [`src/lib/ai-assistant/bolu-secret-vault.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-secret-vault.ts) | DELIVERED |
| Admin Config API | [`api/bolu-provider-config.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-provider-config.ts) | DELIVERED |
| Chat Inference Route | [`api/bolu-chat.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-chat.ts) | UPDATED |
| Settings UI Component | [`src/pages/settings/BoluProviderSettingsSection.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/settings/BoluProviderSettingsSection.tsx) | DELIVERED |
| Settings Navigation | [`src/pages/settings/settings-config.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/settings/settings-config.ts) | UPDATED |
| Settings Shell Page | [`src/pages/Settings.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/Settings.tsx) | UPDATED |
| Automated Vault Tests | [`src/tests/ai-assistant/bolu-secret-vault.test.js`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-secret-vault.test.js) | DELIVERED (7 PASS) |
| Waterfall Roadmap | [`docs/prd/conversational-document-assistant/Waterfall-roadmap.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/Waterfall-roadmap.md) | UPDATED (§25) |
| Roadmap HTML Mirror | [`docs/prd/conversational-document-assistant/roadmap.html`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/roadmap.html) | UPDATED |
| Decision Log | [`docs/prd/conversational-document-assistant/decision-log.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/decision-log.md) | UPDATED (DEC-37) |
| Risk Register | [`docs/prd/conversational-document-assistant/risk-register.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/risk-register.md) | UPDATED (RISK-41) |
| Architecture Doc | [`docs/prd/conversational-document-assistant/architecture.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/architecture.md) | UPDATED (§13) |
| Functional Requirements | [`docs/prd/conversational-document-assistant/functional-req.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/functional-req.md) | UPDATED (FR-42) |
| Test Plan | [`docs/prd/conversational-document-assistant/test-plan.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/test-plan.md) | UPDATED (74 tests) |
| PRD Overview | [`docs/prd/conversational-document-assistant/Readme.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/Readme.md) | UPDATED |
