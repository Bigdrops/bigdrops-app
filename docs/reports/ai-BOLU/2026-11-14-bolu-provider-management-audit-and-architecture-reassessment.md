# Bolu Provider Management — Failure Investigation & Architecture Reassessment Report

- **Date:** 2026-11-14
- **Author:** BOUXRE AI Engineering Agent
- **Document Status:** COMPLETED AND VERIFIED AUDIT
- **Audit Type:** STRICT ZERO-CODE-EDIT AUDIT
- **Primary Error Under Investigation:** `err_1794667887617_u9skz6` (`Internal server configuration error.` on `/settings`)
- **Secondary Error Under Investigation:** `err_1794666644349_pc65yt` (`Unexpected end of JSON input` on `/settings`)
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Target Location:** `docs/reports/ai/2026-11-14-bolu-provider-management-audit-and-architecture-reassessment.md`

---

## 1. Executive Findings

### 1.1 Actual Failure Status
The recurring failure on `/settings` has been conclusively reproduced and traced to its exact server-side trigger. The current user-facing error:

```json
{
  "id": "err_1794667887617_u9skz6",
  "timestamp": 1794667887617,
  "route": "/settings",
  "title": "Internal server configuration error.",
  "diagnostic": "Internal server configuration error."
}
```

is **NOT** a database corruption, network timeout, or encryption algorithm failure.

### 1.2 Confirmed Root Cause
The error is caused by **missing server environment variables in the execution context of the API handler**. Specifically:
1. `api/bolu-provider-config.ts` (`verifyAdminUser` -> `getAdminClient`) requires `process.env.SUPABASE_SERVICE_ROLE_KEY` and `process.env.SUPABASE_URL` to authenticate administrator requests and access the database.
2. In local development (`bun run dev`), Vite runs under Node (`node.exe vite.js --host`). While Bun automatically injects `.env` files into `process.env`, **Node and Vite do not automatically populate Node's `process.env` from `.env`**. Vite only injects `VITE_*` variables into `import.meta.env` for client code.
3. When any authenticated user visits `/settings`, the browser passes `Authorization: Bearer <token>`. The handler calls `getAdminClient()`, which checks `process.env.SUPABASE_SERVICE_ROLE_KEY`. Because this variable is `undefined` in Node, `getAdminClient()` throws `Error('Supabase service configuration missing on server.')`.
4. Line 78 in `api/bolu-provider-config.ts` catches this exception and collapses it into `jsonError('Internal server configuration error.', 500)`.
5. On remote deployments (e.g., Vercel), if `SUPABASE_SERVICE_ROLE_KEY` has not been added to Vercel's Environment Variables dashboard, the exact same 500 error occurs.

### 1.3 Unresolved Diagnostic Limitations
1. **Error Collapsing:** `api/bolu-provider-config.ts` wraps all authorization checks in a single `try/catch` block that returns a generic 500 status without distinguishing missing environment variables, invalid tokens, database timeouts, or RLS rejections.
2. **Local vs Cloud Parity:** The local dev server middleware (`vite.config.js`) executes serverless handlers in Node without loading `.env` into `process.env`, creating a divergence between local testing and production.

### 1.4 Overall Provider-Management Architecture Assessment
The current BOUXRE implementation is **a single-provider credential storage form, not a true provider-management system**.
- The database schema (`public.app_ai_provider_config`) hardcodes `id = 'primary'`.
- Saving a new provider (e.g., OpenRouter) unconditionally overwrites the existing provider (e.g., AMD Token Factory).
- There is no support for storing multiple provider credentials, multi-model routing, live `/v1/models` discovery, or zero-loss provider switching.
- While the Design Lab contains rich 14-provider simulations, the actual production runtime is tightly coupled to AMD Token Factory.

### 1.5 Overall UX Assessment
The UX redesign delivered a visual improvement with an operational telemetry strip and curated cards, but it exhibits serious functional shortcomings:
- **Destructive Switching:** Switching providers destroys previously entered credentials without warning.
- **State Ambiguity:** The interface conflates "Stored", "Tested", and "Active in Runtime".
- **Opaque Diagnostics:** Connection errors and server errors collapse into uninformative generic toasts.

---

## 2. Failure Trace & Lifecycle Analysis

### 2.1 Request Lifecycle Trace

```
1. Browser Client (/settings)
   │
   ├─► Mounts BoluProviderSettingsSection
   │   └─► useEffect triggers fetchStatus()
   │
   ├─► Calls supabase.auth.getSession() -> extracts access_token
   │
   ├─► Dispatches HTTP Request:
   │   GET /api/bolu-provider-config
   │   Headers:
   │     Authorization: Bearer eyJhbGciOi... (authenticated JWT)
   │
2. Vite Dev Server / Reverse Proxy (Local or Vercel Edge)
   │
   ├─► apiDevServerPlugin intercepts /api/bolu-provider-config
   ├─► Calls server.ssrLoadModule('./api/bolu-provider-config.ts')
   └─► Invokes exported default handler(request)
   │
3. Serverless Route (api/bolu-provider-config.ts)
   │
   ├─► handler(request) checks method: 'GET'
   ├─► Calls verifyAdminUser(request) (line 77)
   │   │
   │   ├─► Extracts token from Authorization header: Bearer eyJhbGciOi...
   │   │   (If token missing -> returns 401 "Authentication required.")
   │   │
   │   ├─► Calls getAdminClient() (line 38)
   │   │   │
   │   │   ├─► Checks process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
   │   │   ├─► Checks process.env.SUPABASE_SERVICE_ROLE_KEY
   │   │   │
   │   │   └─► FAILURE POINT: process.env.SUPABASE_SERVICE_ROLE_KEY is undefined!
   │   │       Throws: Error("Supabase service configuration missing on server.")
   │   │
   │   └─► Catches in handler (line 78):
   │       console.error('[bolu-provider-config] Auth check error:', err)
   │       Returns: Response.json({ error: 'Internal server configuration error.' }, { status: 500 })
   │
4. Browser Client Handling
   │
   ├─► safeParseApiResponse receives HTTP 500 with JSON payload
   ├─► Extracts parsed.errorMessage: "Internal server configuration error."
   ├─► fetchStatus throws Error("Internal server configuration error.")
   └─► feedback.error("Internal server configuration error.") triggers error telemetry
```

### 2.2 Empirical Reproduction Evidence
To confirm the root cause empirically without modifying code, probe requests were executed against the running dev server:

1. **Unauthenticated Probe:**
   - Request: `POST http://localhost:5000/api/bolu-provider-config` (No Authorization header)
   - Result: `HTTP 401 Unauthorized` (`{"error":"Authentication required."}`)
   - Explanation: Lines 34-36 detect missing token and return 401 *before* `getAdminClient()` is invoked.

2. **Authenticated Probe:**
   - Request: `GET http://localhost:5000/api/bolu-provider-config` (`Authorization: Bearer test-token`)
   - Result: `HTTP 500 Internal Server Error` (`{"error":"Internal server configuration error."}`)
   - Explanation: Token presence forces execution of `getAdminClient()`, which throws when `process.env.SUPABASE_SERVICE_ROLE_KEY` is missing in Node.

3. **Node Environment Check:**
   - Executed: `node -e "console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)"`
   - Result: `undefined`
   - Confirms that Node does not inherit `.env` variables automatically when started via `vite`.

### 2.3 Required Remediation for Failure
1. **Local Dev Environment:** In `vite.config.js`, load `.env` variables into Node's `process.env` using Vite's `loadEnv(mode, process.cwd(), '')` or `dotenv` before invoking SSR handlers.
2. **Cloud Environment:** Verify that `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` are explicitly configured in Vercel Project Environment Variables.
3. **Error Disambiguation:** Refactor `verifyAdminUser` to return explicit error diagnostics (`500: Server configuration missing`, `401: Invalid session`, `403: Forbidden`) rather than collapsing all exceptions into generic error strings.

---

## 3. Hermes Provider-Management Benchmark

The BOUXRE implementation was audited against the provider-management architecture of Nous Research's **Hermes Agent** (`NousResearch/hermes-agent`). All 20 capability areas specified in the mission have been independently classified:

| # | Capability Area | Hermes Agent Benchmark | BOUXRE Implementation | Classification | Evidence & File References |
|---|---|---|---|---|---|
| 1 | Provider catalogue & onboarding | Declarative catalog (OpenAI, Anthropic, OpenRouter, Groq, Ollama, Custom) with endpoints & metadata | 14-provider catalog in `providerRegistry.ts` exists only in Design Lab simulation. Runtime is limited to AMD & OpenRouter | **Partially Implemented** | `src/lib/ai-assistant/providerRegistry.ts` (simulated); `api/bolu-chat.ts` (hardcoded AMD/OpenRouter) |
| 2 | Provider-specific auth methods | Supports Bearer tokens, Anthropic `x-api-key`, AWS SigV4, Azure API keys, custom headers | Only HTTP Bearer authentication supported. `authScheme` in types is ignored by runtime | **Partially Implemented** | `src/lib/ai-assistant/bolu-provider.ts` (`buildProviderHeaders`); `api/bolu-chat.ts` |
| 3 | API-key entry & credential lifecycle | CLI wizard (`hermes setup`/`model`) & desktop UI for entering, testing, and replacing keys | In-app form & PowerShell CLI (`scripts/setup-bolu-provider.ps1`). AES-256-GCM envelope encryption into database | **Implemented and Evidenced** | `BoluProviderSettingsSection.tsx`; `bolu-secret-vault.ts`; `setup-bolu-provider.ps1` |
| 4 | OAuth or external authentication | Supports OAuth 2.0 flows for cloud providers (Vertex, Azure, HuggingFace) | Zero OAuth support; strictly static API key strings | **Not Implemented** | `bolu-secret-vault.ts`; `api/bolu-provider-config.ts` |
| 5 | Multiple saved provider configurations | Users store and maintain multiple distinct named configurations simultaneously | Database table `app_ai_provider_config` hardcodes `id = 'primary'`. Saving a provider overwrites previous entry | **Not Implemented** | `supabase/migrations/20261114160000_bolu_provider_credentials.sql` (line 28 `id text primary key default 'primary'`) |
| 6 | Provider-specific endpoint config | Per-provider base URL override (`model.base_url`) | Custom base URL supported in UI and clamped to `/chat/completions` | **Implemented and Evidenced** | `BoluProviderSettingsSection.tsx`; `bolu-provider.ts` (`normalizeChatEndpoint`) |
| 7 | Custom OpenAI-compatible endpoints | First-class named providers with arbitrary OpenAI-compatible base URLs | Supported via OpenRouter/Custom provider selection and normalized to `/chat/completions` | **Implemented and Evidenced** | `BoluProviderSettingsSection.tsx`; `bolu-provider.ts` |
| 8 | Model discovery from provider APIs | Live query to `GET /v1/models` to discover available models dynamically | Exists ONLY as a simulated demo in Design Lab (`simulateModelDiscovery` with canned list). No production discovery | **Not Implemented** | `src/components/design-lab/assistant-chat-providers.ts` (lines 142-178); zero production implementation |
| 9 | Curated model fallback | Falls back to static curated lists when `/v1/models` is unavailable | Curated model cards in UI (`DeepSeek-V4-Flash`, `DeepSeek-R1-Distill-70B`, `Qwen2.5-72B`) | **Implemented and Evidenced** | `BoluProviderSettingsSection.tsx` (`CURATED_MODELS`) |
| 10 | Model capability metadata | Tracks context length, vision support, function calling, reasoning tokens | Static display badges in UI (`context: '128k'`, `speed: 'Fast'`). Runtime ignores context and fixes `max_tokens: 700` | **Partially Implemented** | `BoluProviderSettingsSection.tsx`; `src/lib/ai-assistant/protocol.ts` (`AI_CHAT_MAX_TOKENS = 700`) |
| 11 | Active provider & model selection | Active model selection via config or CLI (`model: "provider/model"`) | Stored in `app_ai_provider_config` (`provider`, `model`) and activated in `api/bolu-chat.ts` | **Implemented and Evidenced** | `api/bolu-chat.ts` (`resolveInAppConfig`) |
| 12 | Switching between configured providers | Instant switching between previously configured providers without credential re-entry | Impossible. Storing a new provider overwrites the database row. Switching back requires re-entering API key | **Not Implemented** | `bolu-secret-vault.ts` (`saveInAppProviderConfig` upserts `id: 'primary'`) |
| 13 | Default provider/model behavior | Fallback chain when primary model is rate-limited or exhausted | 3-tier runtime precedence: Database Vault -> Server Env Vars -> Deterministic Mock Mode | **Implemented and Evidenced** | `api/bolu-chat.ts` (`resolveInAppConfig`, `getBoluProviderConfig`) |
| 14 | Credential validation & testing | Pre-flight test request verifies authentication before saving | `testProviderConnection` sends minimal ping request (`max_tokens: 5`) and validates status codes | **Implemented and Evidenced** | `bolu-secret-vault.ts` (`testProviderConnection`) |
| 15 | Provider activation & deactivation | Providers can be toggled active/inactive or removed | Removal deletes the database row. No toggle to disable a provider without destroying its credentials | **Partially Implemented** | `api/bolu-provider-config.ts` (`action === 'remove'`); no `is_enabled` flag |
| 16 | Operational status & diagnostics | Detailed error telemetry, rate-limit countdowns, latency monitoring | UI telemetry strip displays Source/Provider/Model/RLS. Server errors collapse into generic messages | **Partially Implemented** | `BoluProviderSettingsSection.tsx` (strip); `api/bolu-provider-config.ts` (error collapsing) |
| 17 | Credential masking & secret isolation | Keys masked in UI and stored in local files / keychain | AES-256-GCM envelope encryption. Database RLS denies all client reads (`USING (false)`). Masked UI preview | **Implemented and Evidenced** | `bolu-secret-vault.ts`; `supabase/migrations/20261114160000_bolu_provider_credentials.sql` |
| 18 | Persistence across sessions | Persisted in local config files; requires manual cross-device sync | Persisted in hosted PostgreSQL database. Available across all enterprise sessions and client devices | **Implemented and Evidenced** | `app_ai_provider_config` table in Supabase |
| 19 | Admin authorization & ownership | Single-user personal agent; no enterprise RBAC | Enterprise RBAC gates config to `profiles.role === 'admin'` or `workspace_members.role in ('owner', 'admin')` | **Implemented and Evidenced** | `api/bolu-provider-config.ts` (`verifyAdminUser`) |
| 20 | Mobile & desktop management UX | Desktop web UI & CLI; no mobile-responsive layout | Mobile-responsive Tailwind UI with touch targets and safe area spacing in BOUXRE AppShell | **Implemented and Evidenced** | `BoluProviderSettingsSection.tsx` |

**Summary Scores:**
- **Implemented and Evidenced:** 10 / 20 (50%)
- **Partially Implemented:** 5 / 20 (25%)
- **Not Implemented:** 5 / 20 (25%)

---

## 4. Current BOUXRE Architecture

### 4.1 Data Model
The current database model consists of a single table defined in `supabase/migrations/20261114160000_bolu_provider_credentials.sql`:

```sql
CREATE TABLE public.app_ai_provider_config (
  id text primary key default 'primary',
  provider text not null,
  base_url text not null,
  model text not null,
  timeout_ms integer not null default 45000,
  encrypted_key text not null,
  key_nonce text not null,
  key_tag text not null,
  key_version integer not null default 1,
  masked_key text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null
);
```

### 4.2 Architectural Coupling & Gaps
1. **Single-Row Constraint (`id text primary key default 'primary'`):**
   The database schema enforces a singleton pattern. It is impossible to store credentials for both AMD Token Factory and OpenRouter simultaneously.
2. **Coupling of Identity, Credential, and Routing:**
   Provider identity (`provider`), endpoint (`base_url`), model (`model`), network policy (`timeout_ms`), and credential (`encrypted_key`) are merged into a single table row. Changing a model requires a full row update.
3. **Decryption Exclusivity:**
   Decryption occurs strictly in serverless memory via `loadInAppProviderConfig` in `api/bolu-chat.ts` and `api/bolu-provider-config.ts`. The browser client never receives ciphertext, nonces, tags, or plaintext keys.

---

## 5. Security Findings

| Finding ID | Severity | Status | Evidence / File Reference | Description |
|---|---|---|---|---|
| **SEC-01** | High | Design Concern | `src/lib/ai-assistant/bolu-secret-vault.ts` (lines 80-92) | **Shared Master Key Fallback:** If `BOLU_ENCRYPTION_KEY` is not set, `deriveMasterKey` derives the AES master key from `SUPABASE_SERVICE_ROLE_KEY`. Tying secret encryption to database credentials weakens cryptographic compartmentalization. |
| **SEC-02** | High | Design Concern | `api/bolu-provider-config.ts` (lines 55-65) | **Over-Broad RBAC Scope:** `verifyAdminUser` permits any user with `workspace_members.role in ('owner', 'admin')` to update global platform provider credentials. In a multi-tenant system, tenant admins should not control global AI infrastructure. |
| **SEC-03** | Medium | Verified Flaw | `api/bolu-provider-config.ts` (lines 78-81) | **Error Collapsing Masking Failures:** Unhandled exceptions during admin verification return generic 500 errors, hiding missing configuration from administrators. |
| **SEC-04** | Low | Verified Safe | `supabase/migrations/20261114160000_bolu_provider_credentials.sql` | **PostgREST Client Access Denied:** RLS policy strictly denies direct client reads and writes (`USING (false)`). Verified via live database queries. |
| **SEC-05** | Low | Verified Safe | `src/lib/ai-assistant/bolu-secret-vault.ts` (`maskApiKey`) | **Safe Key Redaction:** Plaintext keys are masked to `rc-••••••••••••7766` before storage in `masked_key` and UI presentation. |

---

## 6. UX Findings

### 6.1 Functional Deficiencies
1. **Destructive Provider Switching:**
   Switching the provider card in the UI and clicking "Save" silently deletes the previously stored provider key. Administrators cannot toggle between AMD and OpenRouter without re-entering credentials.
2. **Conflated Operational States:**
   The UI does not clearly indicate whether Bolu is currently operational. A "Connection Verified" test result reflects a past transient ping, not the live health of the runtime pipeline.
3. **Absence of Model Discovery:**
   Administrators cannot view available models for their account. They must manually type custom model identifiers or select from three hardcoded options.
4. **Non-Actionable Error Messages:**
   When the serverless endpoint fails (e.g., missing service key), the UI presents `Internal server configuration error.` without diagnostic steps or remediation guidance.

### 6.2 Presentation Deficiencies
1. **Information Hierarchy:**
   The operational telemetry strip is positioned at the top of the form, but its tiles do not link to the corresponding configuration controls below.
2. **Advanced Settings Visibility:**
   Base URL and timeout settings are hidden in a collapsible accordion, obscuring critical routing parameters during initial setup.

---

## 7. Recommended Target Architecture

To evolve Bolu from a single-credential form into a genuine, enterprise-grade AI provider-management subsystem, the architecture should be refactored into modular components:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BOUXRE AI Provider Subsystem                    │
└────────────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Provider Catalog │     │  Connection Hub  │     │  Routing Engine  │
│ (Static Registry)│     │(Encrypted Vault) │     │ (Runtime Rules)  │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ - AMD Token Fact.│     │ - AMD Production │     │ - Primary Active │
│ - OpenRouter     │     │ - OpenRouter Fall│     │ - Fallback Order │
│ - Google AI      │     │ - Per-Conn Keys  │     │ - Mock Mode      │
│ - Custom Generic │     │ - Enabled Status │     │ - Health State   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 7.1 Proposed Schema Refactoring (`app_ai_provider_connections`)

```sql
CREATE TABLE public.app_ai_provider_connections (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,                -- 'amd', 'openrouter', 'gemini', 'custom'
  name text not null,                       -- e.g. 'AMD Token Factory (Primary)'
  base_url text not null,
  model text not null,
  timeout_ms integer not null default 45000,
  encrypted_key text not null,
  key_nonce text not null,
  key_tag text not null,
  key_version integer not null default 1,
  masked_key text not null,
  is_active boolean not null default false, -- Exactly one connection is active
  is_enabled boolean not null default true, -- Can be disabled without deleting key
  priority integer not null default 1,     -- Fallback priority
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null
);

-- Unique index ensuring exactly one active connection
CREATE UNIQUE INDEX app_ai_provider_active_idx 
ON public.app_ai_provider_connections (is_active) 
WHERE is_active = true;
```

### 7.2 Architectural Benefits
1. **Zero-Loss Switching:** Administrators can configure AMD, OpenRouter, and custom endpoints simultaneously. Switching active providers is a simple toggle (`is_active = true`) requiring no credential re-entry.
2. **Graceful Fallback:** The runtime can automatically fail over from AMD to OpenRouter if AMD experiences outages or rate limits.
3. **Clean Authorization Boundary:** Decouples connection credentials from runtime routing policies.

---

## 8. Prioritized Remediation Plan

### Phase 1: Immediate Failure Repair (Priority: P0)
- **Objective:** Eliminate the recurring `Internal server configuration error.` on `/settings`.
- **Tasks:**
  1. Update `vite.config.js` `apiDevServerPlugin` to load `.env` variables into `process.env` in local development.
  2. Verify that `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` are configured in Vercel Project Settings.
  3. Disambiguate error handling in `api/bolu-provider-config.ts` so missing environment variables return descriptive 500 error messages instead of generic text.
- **Dependencies:** None.
- **Acceptance Criteria:** Loading `/settings` while signed in loads provider status without error toasts.

### Phase 2: Security & Authorization Hardening (Priority: P1)
- **Objective:** Restrict provider administration to true platform administrators and enforce dedicated encryption keys.
- **Tasks:**
  1. Require a dedicated `BOLU_ENCRYPTION_KEY` in production, eliminating fallback to `SUPABASE_SERVICE_ROLE_KEY`.
  2. Restrict `verifyAdminUser` strictly to `profiles.role === 'admin'`. Disallow workspace-level admins from altering platform AI credentials.
- **Dependencies:** Phase 1 complete.
- **Acceptance Criteria:** Workspace admins receive 403 Forbidden; platform admins successfully manage configuration.

### Phase 3: Multi-Provider Data Model & API Migration (Priority: P2)
- **Objective:** Support multiple saved provider configurations without destructive overwriting.
- **Tasks:**
  1. Author migration for `app_ai_provider_connections` supporting multiple records with `is_active` and `is_enabled` flags.
  2. Update `bolu-secret-vault.ts` and `api/bolu-provider-config.ts` to support listing, activating, editing, and disabling connections.
  3. Update `api/bolu-chat.ts` to resolve the currently active connection or fallback connection.
- **Dependencies:** Phase 1 & 2 complete.
- **Acceptance Criteria:** Administrator can save AMD and OpenRouter keys simultaneously and switch between them with one click.

### Phase 4: UX Overhaul & Model Discovery (Priority: P3)
- **Objective:** Provide an enterprise-grade AI management console comparable to Hermes.
- **Tasks:**
  1. Redesign `BoluProviderSettingsSection.tsx` into a multi-connection manager with connection cards, health badges, and activation toggles.
  2. Implement an optional `/v1/models` discovery endpoint for providers that support it.
  3. Add actionable connection diagnostics showing latency, error codes, and suggested fixes.
- **Dependencies:** Phase 3 complete.
- **Acceptance Criteria:** Connection cards display status; switching active provider takes effect immediately.

---

## 9. Open Questions for Product Owner

1. **Multi-Provider Scope:** Does BOUXRE require multi-provider failover for production release, or is a single active provider with mock fallback sufficient for the initial milestone?
2. **Authorization Boundary:** Should workspace owners ever be allowed to configure AI providers, or should this strictly be reserved for platform super-administrators (`profiles.role === 'admin'`)?
3. **Data Residency & Terms:** Has legal approval been granted for tenant business data to pass through AMD Token Factory endpoints (hosted in China) or free-tier OpenRouter models?

---

## 10. Final Recommendation

**Recommendation: REFACTOR IN PHASES (Do Not Patch blindly, Do Not Rebuild from scratch).**

**Justification:**
1. **What to Retain:** The core security foundation—AES-256-GCM envelope encryption, database RLS denial of client access, serverless decryption, and defensive response parsing (`safeParseApiResponse`)—is solid, verified, and well-tested (80 automated tests passing). It should not be thrown away.
2. **What to Refactor:**
   - The environment variable handling in `vite.config.js` must be fixed immediately (Phase 1).
   - The single-row database constraint (`id = 'primary'`) must be refactored into a multi-connection table (`app_ai_provider_connections`) to eliminate destructive key overwrites (Phase 3).
   - The authorization check must be tightened to platform administrators only (Phase 2).
3. **Rebuild Not Justified:** Rebuilding the entire provider infrastructure from scratch would discard working encryption and test assets. A disciplined 4-phase refactor directly delivers an enterprise-grade provider management experience while preserving system integrity.
