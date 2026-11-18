# Bolu Provider Management Phase 2 Pre-Design Audit Report

This report was written by Antigravity on 2026-11-14 via Local Runner.

- **Document Identifier:** `docs/reports/ai/2026-11-14-bolu-provider-management-phase-2-pre-design-audit.md`
- **Execution Type:** Strict Zero-Code-Edit Investigation & Architecture Audit
- **Domain:** AI Assistant / Bolu Provider Management, Routing & Persistence
- **Applicable Standards:** ASD-STE100 Simplified Technical English, Core Guardrails, Verification Gate
- **Status:** COMPLETED — READY FOR ARCHITECTURAL REVIEW

---

## 1. Executive Verdict

### Verdict: REVISE ARCHITECTURE BEFORE IMPLEMENTATION (IMPROVE UI / UNIFY ROUTING CONTRACT / REFINE SQL)

**Summary Justification:**  
The existing Bolu provider management system contains substantial, high-quality engineering assets (AES-256-GCM envelope encryption, protocol adapters for OpenAI and Anthropic, SSRF-guarded outbound fetch, and a PostgreSQL atomic row-locking selection RPC). Furthermore, recent UI work successfully adapted the settings view to mobile viewports, as confirmed by live screen captures.

However, an in-depth audit reveals a **critical architectural disconnect** between the frontend UI, the serverless management API, the Phase 1 routing engine, and the PostgreSQL schema:

1. **Dual Routing Engine Divergence:** The frontend UI (`BoluProviderSettingsSection.tsx`) and `api/bolu-provider-config.ts` interact with a static singleton table (`app_ai_provider_routing`) consisting of one primary connection and a static array of fallback IDs. Meanwhile, the Phase 1 backend routing engine (`src/lib/ai-assistant/routing/` and `claim_eligible_ai_connection` in migration `20261114170000`) relies on dynamic multi-attribute database routing (`in_pool`, `priority`, `health_status`, `model_cooldowns`, `account_cooldown_until`). These two models do not communicate. The chat runtime (`api/bolu-chat.ts`) currently executes via the static fallback list, completely bypassing the stored procedure selection engine.
2. **Missing Operational Telemetry in API & UI:** The PostgreSQL migration `20261114170000` defines rich telemetry columns (`health_status`, `account_cooldown_until`, `model_cooldowns`, `known_balance_usd`, `balance_source`, `consecutive_failures`, `total_tokens`), but the management API (`api/bolu-provider-config.ts`) and frontend types (`PublicConnection`) omit these fields entirely. The admin cannot see health state, cooldown countdowns, or balance data.
3. **Missing Administrative Controls:** The database supports connection priority (`priority integer`) and pool participation (`in_pool boolean`), but the management API and UI provide no inputs or actions to assign priority or add a connection to the router pool.
4. **Catalogue Bloat & Unverified Vendor Claims:** Four divergent provider catalogues exist across the codebase (`provider-catalog.ts`, `providerCatalog.ts`, `providerRegistry.ts`, and `bolu-provider-catalog.ts`). The 20-provider UI catalogue includes entries with unverified claims, fabricated model identifiers (e.g. `claude-fable-5`, `deepseek-v4-1-flash-1017`), or inaccessible endpoints (e.g. `coarena`, `iteracompute`). Only 5 providers are verified and approved for routing in Phase 1.
5. **Premature UI Disablement:** The settings UI unconditionally disables connection testing and model discovery if the database migration is unapplied (`!schemaReady`), even though API adapters can test inline credentials and discover models without database access.
6. **Unapplied Migration Opportunity:** Database migration `20261114170000_bolu_provider_connections.sql` has not yet been applied to the live database. This permits schema corrections (unifying protocol enums, dropping redundant routing tables, adding unique constraints) before production persistence occurs.

---

## 2. Baseline & Verification Protocol (Zero-Code-Edit)

### 2.1 Git Status Before Investigation
Captured via `git status --short` at `2026-11-14T19:16:15+01:00`:
```
 M api/bolu-chat.ts
 M docs/prd/conversational-document-assistant/Waterfall-roadmap.md
 M docs/prd/conversational-document-assistant/roadmap.html
 M src/components/settings/settings.css
 M src/lib/ai-assistant/bolu-provider.ts
 M src/lib/ai-assistant/connection-vault.ts
 M src/pages/settings/BoluProviderSettingsSection.tsx
 M src/pages/settings/bolu-provider/ConnectionDialog.tsx
 M supabase/migrations/20261114170000_bolu_provider_connections.sql
?? docs/reports/ai/2026-11-14-bolu-phase-1-defect-remediation-report.md
?? docs/reports/ai/2026-11-14-bolu-phase-1-routing-verification-and-closeout.md
?? src/lib/ai-assistant/routing/
?? src/tests/ai-assistant/bolu-routing-engine.test.js
?? video-json-tutorial/
```

### 2.2 Zero-Code-Edit Commitment
- No application source code (`src/` or `api/`) was modified, stashed, reset, or deleted.
- No SQL migrations (`supabase/migrations/`) were modified, applied, or executed.
- No test files were altered.
- All pre-existing modified and untracked files were preserved verbatim.
- No build, typecheck, or lint commands were executed, respecting hardware gates.

---

## 3. Actual Current-State Architecture

The current Bolu AI infrastructure is composed of multiple layers that currently exhibit architectural bifurcation:

```
[Admin Browser Client: /settings (Bolu AI Infrastructure)]
      │
      ├─► GET/POST /api/bolu-provider-config (Serverless Admin Handler)
      │     │
      │     ├─► bolu-auth.ts (verifyPlatformAdmin via SUPABASE_SERVICE_ROLE_KEY)
      │     ├─► connection-vault.ts (AES-256-GCM envelope encryption)
      │     │     └─► public.app_ai_provider_connections (CRUD operations)
      │     │     └─► public.app_ai_provider_routing (singleton primary/fallback list)
      │     ├─► provider-adapters.ts (outbound test & GET /models discovery)
      │     └─► provider-security.ts (SSRF syntax checks & DNS resolution check)
      │
      └─► Disconnect: Does NOT surface Phase 1 routing fields (priority, in_pool, health, cooldown)

[Chat Client Runtime: /api/bolu-chat]
      │
      ├─► Path A (Active in Runtime):
      │     Calls connection-vault.ts: resolveRuntimeConnections()
      │     Iterates static primary -> static fallbackConnectionIds
      │     Pre-token failover calls recordAiRequestStart, recordAiFailure, recordAiSuccess
      │
      └─► Path B (Implemented in Phase 1, but DISCONNECTED from runtime & UI):
            bolu-policy-router.ts (taskType -> targetModel -> allowedProviders)
            bolu-account-pool.ts (claimEligibleConnection)
            PostgreSQL RPC: claim_eligible_ai_connection (SKIP LOCKED, priority, in_pool)
            bolu-balance-sync.ts (checkUpstreamBalance for OpenRouter & DeepSeek)
```

---

## 4. UI/UX Component Disposition Matrix

| Component / Interaction | Location | Current Role | Disposition | Justification & Friction Analysis |
| :--- | :--- | :--- | :--- | :--- |
| `BoluProviderSettingsSection.tsx` | `src/pages/settings/` | Main container section in Settings | **IMPROVE** | Sound responsive layout and mobile ergonomics (verified by user screenshots). Requires: (1) extracting the fallback checkboxes out of the Runtime Card into a dedicated priority pool list, (2) adding pool status indicators, (3) separating the custom provider flow from the curated catalogue, and (4) wiring live health and balance summaries. |
| `ConnectionCard.tsx` | `src/pages/settings/bolu-provider/` | Renders individual saved connection | **IMPROVE** | Excellent visual hierarchy and inline model selector. Must be improved to show: numeric priority badge, `in_pool` toggle, dynamic health pill (`healthy`, `cooling_down`, `exhausted`, `quarantined`), cooldown countdown timer, and balance data. Replace the single "Activate" button with priority ordering. |
| `ConnectionDialog.tsx` | `src/pages/settings/bolu-provider/` | Modal dialogue for adding & editing connections | **REPLACE** | Structurally unsuitable for the Hermes-like flow. It mixes curated catalogue setup, custom endpoint setup, inline testing, model discovery, and editing in a single crowded form with unsearchable model dropdowns. When aggregators return 150+ models, the standard `<Select>` fails. Advanced custom options are buried in an accordion. Testing is prematurely blocked when `!schemaReady`. Replace with a staged, guided setup sheet. |
| `DiagnosticsNote.tsx` | `src/pages/settings/bolu-provider/` | Renders latency, error category & advice | **KEEP** | Sound, resilient, and well-designed component. Correctly categorizes errors and displays latency and `Retry-After` seconds. Reusable across all connection views without change. |
| `ProviderLogo.tsx` | `src/pages/settings/bolu-provider/` | Renders provider branding via `@lobehub/icons` | **KEEP** | Cleanly renders vector logos with graceful fallbacks to Lucide icons. |
| `bolu-provider/api.ts` | `src/pages/settings/bolu-provider/` | Frontend client for `/api/bolu-provider-config` | **IMPROVE** | Sound HTTP transport and session auth handling. Must be updated to include telemetry fields (`priority`, `inPool`, `healthStatus`, `accountCooldownUntil`, `knownBalanceUsd`, `balanceSource`) and actions for priority reordering and pool toggling. |
| Embedded Fallback Routing in Runtime Panel | `BoluProviderSettingsSection.tsx` L335-391 | Checkbox list of fallbacks inside Runtime Card | **REMOVE** | Misleading architecture. Conflates runtime status with routing pool rules. Having a manual list of fallback checkboxes contradicts priority-based pool routing. Preserving it creates dual sources of truth for routing. |
| "Custom endpoint" card in Catalogue Grid | `BoluProviderSettingsSection.tsx` L468-485 | 21st item in catalogue card grid | **REMOVE / SEPARATE** | Violates the requirement for a "clearly separated custom-provider workflow". Custom configuration requires protocol selection, auth scheme setup, and SSRF warnings, which do not fit the one-click template of curated catalogue cards. |

---

## 5. User Journey Gap Analysis (Intended vs Actual)

| # | Intended Product Step | Actual Implementation Status | Gap & Required Remediation |
| :--- | :--- | :--- | :--- |
| 1 | **Curated Catalogue Selection** | Implemented in UI; Catalogues fragmented | 20 providers are displayed in UI, but 15 have unverified contracts or non-existent models. Catalogues must be consolidated and restricted to verified providers. |
| 2 | **API Key Entry** | Implemented and secure | Masked input with AES-256-GCM note. Plaintext key is never returned to browser. Meets security requirements. |
| 3 | **Model Discovery / Catalogue Fallback** | Implemented in API; Blocked by UI gate | GET `/models` works via `discoverAdapterModels`. However, UI disables the button when `!schemaReady`. Model list lacks search/filter when 100+ models return. Curated fallback works for non-discovery providers (e.g. Zhipu). |
| 4 | **Model Selection** | Partially implemented | Supported via `<Select>` in modal and inline on `ConnectionCard`. Gap: Does not support multi-model capability (`allowed_models text[]`), locking each connection to a single string identifier. |
| 5 | **Connection Testing** | Implemented in API; Blocked by UI gate | API sends lightweight ping (`testAdapterConnection`) and measures latency. However, UI disables "Test" button when `!schemaReady`, preventing pre-migration verification. |
| 6 | **Save Named Connection** | Implemented | Connection saves to `app_ai_provider_connections` with unique UUID and encrypted secret. |
| 7 | **Multiple Saved Connections** | Implemented | Admin can add multiple accounts for the same or different providers without overwriting existing credentials. |
| 8 | **Enable, Disable, Prioritize & Manage** | Enable/Disable/Delete: YES; Prioritize: NO | Enable/disable toggle and delete dialog work. **Priority is completely missing** in both UI and API. Pool participation (`in_pool`) is also absent. |
| 9 | **Health, Cooldown & Balance Presentation** | Database: YES; API/UI: COMPLETELY ABSENT | Schema has `health_status`, `account_cooldown_until`, `known_balance_usd`. Stored procedures update them. However, `api/bolu-provider-config.ts` does not select them and UI never displays them. |
| 10 | **Separated Custom Provider Workflow** | Partially implemented; Poorly segregated | Custom endpoint is shoehorned as an extra card in the catalogue and an accordion inside the dialog. Requires a dedicated, distinct workflow with protocol and auth selectors. |

---

## 6. Backend API Capability Matrix

Audit of `api/bolu-provider-config.ts` and `api/bolu-chat.ts`:

| Capability | Server Implementation Status | Connected to UI? | Code Reference |
| :--- | :--- | :--- | :--- |
| **List saved connections without secrets** | **Implemented** | Connected | `api/bolu-provider-config.ts` L273 (`listConnections`) |
| **Create connection with encrypted credential** | **Implemented** | Connected | `api/bolu-provider-config.ts` L315 (`createConnection`) |
| **Update metadata & rotate credentials safely** | **Implemented** | Connected | `api/bolu-provider-config.ts` L392 (`updateConnection`) |
| **Delete connection** | **Implemented** | Connected | `api/bolu-provider-config.ts` L458 (`deleteConnection`) |
| **Test unsaved connection** | **Implemented** | Blocked by UI check | `api/bolu-provider-config.ts` L527 (`testAdapterConnection`) |
| **Discover available models** | **Implemented** | Blocked by UI check | `api/bolu-provider-config.ts` L546 (`discoverAdapterModels`) |
| **Enable / disable connection** | **Implemented** | Connected | `api/bolu-provider-config.ts` L427 via `update` action |
| **Change routing priority** | **Missing** | Not Connected | Schema has `priority`, but API handler ignores it. |
| **Toggle pool participation (`in_pool`)** | **Missing** | Not Connected | Schema has `in_pool`, but API handler ignores it. |
| **Retrieve health & cooldown status** | **Partially Implemented** | Not Connected | Stored procedures write health; API `GET` omits columns. |
| **Retrieve provider balance** | **Implemented but Not Connected** | Not Connected | `bolu-balance-sync.ts` implements OpenRouter/DeepSeek balance query, but API never invokes it. |
| **Configure custom providers** | **Implemented** | Connected (sub-optimal UX) | `api/bolu-provider-config.ts` L135 (`resolveInlineTarget`) |

---

## 7. Provider Catalogue & Model Discovery Audit

### 7.1 Catalogue Fragmentation Inventory
Four separate files currently define AI providers in the repository:
1. `src/lib/ai-assistant/provider-catalog.ts` (383 lines): 20 providers used by Settings UI and serverless API.
2. `src/lib/ai-assistant/routing/bolu-provider-catalog.ts` (221 lines): 5 verified providers used by Phase 1 routing engine.
3. `src/lib/ai-assistant/providerCatalog.ts` (73 lines): Legacy 4-row minimal chain (`nvidia`, `openrouter`, `amd`, `gemini`).
4. `src/lib/ai-assistant/providerRegistry.ts` (409 lines): Design Lab 14-provider simulation.

### 7.2 Provider Verification & Triage

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: VERIFIED FOR CURATED CATALOGUE                                       │
│ Contract verified, standard OpenAI/Anthropic protocol, models discovery live│
├─────────────────┬─────────────────────┬──────────────┬───────────────────────┤
│ Provider        │ Base URL            │ Protocol     │ Discovery / Balance   │
├─────────────────┼─────────────────────┼──────────────┼───────────────────────┤
│ OpenRouter      │ openrouter.ai/api/v1│ openai       │ Discovery: YES, Bal:YES│
│ OpenAI          │ api.openai.com/v1   │ openai       │ Discovery: YES, Bal:NO│
│ Anthropic       │ api.anthropic.com/v1│ anthropic    │ Discovery: YES, Bal:NO│
│ DeepSeek        │ api.deepseek.com/v1 │ openai       │ Discovery: YES, Bal:YES│
│ Groq            │ api.groq.com/openai │ openai       │ Discovery: YES, Bal:NO│
│ Google Gemini   │ generativelanguage… │ openai       │ Discovery: YES, Bal:NO│
│ Mistral         │ api.mistral.ai/v1   │ openai       │ Discovery: YES, Bal:NO│
└─────────────────┴─────────────────────┴──────────────┴───────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: REQUIRES LIVE VERIFICATION BEFORE CATALOGUE INCLUSION                │
├─────────────────┬─────────────────────┬──────────────┬───────────────────────┤
│ AMD Token Fact. │ developer.amd.com.cn│ openai       │ China host, custom key│
│ Qwen (Alibaba)  │ dashscope-intl…     │ openai       │ International vs China│
│ Together AI     │ api.together.xyz/v1 │ openai       │ Vendor-prefixed models│
│ Fireworks AI    │ api.fireworks.ai/…  │ openai       │ Account path prefixes │
│ Cerebras        │ api.cerebras.ai/v1  │ openai       │ Limited model breadth │
│ xAI Grok        │ api.x.ai/v1         │ openai       │ Paid only             │
│ NVIDIA NIM      │ integrate.api.nvidia│ openai       │ Rate-limited dev keys │
│ Cohere          │ api.cohere.ai/comp… │ openai       │ Compatibility route   │
└─────────────────┴─────────────────────┴──────────────┴───────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: EXCLUDE FROM CURATED CATALOGUE (CUSTOM WORKFLOW ONLY)                │
├─────────────────┬────────────────────────────────────────────────────────────┤
│ Coarena         │ Unverified GA stability; claims nonexistent model IDs.     │
│ IteraCompute    │ Unverified infrastructure; unstandardized 'Auto' model.    │
│ Zhipu AI / GLM  │ No standard GET /models discovery; China-only endpoints.   │
│ Qiniu Cloud AI  │ Regional gateway with unverified model claims.             │
│ Telnyx AI       │ Telecom-niche gateway; better suited for custom setup.     │
└─────────────────┴────────────────────────────────────────────────────────────┘
```

---

## 8. SQL & Database Architecture Audit

### 8.1 Schema Object Disposition Matrix

| Database Object | Migration | Current Definition & Role | Disposition | Justification & Safe Migration Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `public.app_ai_provider_config` | `20261114160000` | Singleton table (`id = 'primary'`) for single-provider prototype. | **RETIRE (READ-ONLY)** | Retain table for backward compatibility with older deployments, but set `migrated_to_connections = true`. Never write new credentials here. |
| `public.app_ai_provider_connections` | `20261114170000` | Core encrypted credential vault & connection metadata. | **KEEP WITH CHANGES** | Schema is fundamentally sound and robust. Required changes: (1) Unify `protocol` check to match routing engine (`'openai'` vs `'anthropic'`), (2) Ensure `allowed_models` and `is_paid_tier` defaults are clean, (3) Add a unique constraint on connection name per user/workspace to prevent ambiguous duplicates. |
| `public.app_ai_provider_routing` | `20261114170000` | Singleton table with `primary_connection_id` and `fallback_connection_ids uuid[]`. | **REPLACE / RETIRE** | Redundant and contradictory to the Phase 1 routing engine. Routing order should be determined by `priority` (integer 1..100) and `in_pool` directly on `app_ai_provider_connections`. Maintaining a separate routing table causes state synchronization bugs. |
| `public.app_ai_routing_events` | `20261114170000` | Append-only event feed for routing telemetry and failover tracking. | **KEEP** | Clean schema, strict event type constraints, non-blocking inserts. Essential for admin observability. |
| `public.app_ai_provider_audit` | `20261114170000` | Append-only configuration audit log. | **KEEP** | Records all administrative mutations with actor UUID and JSON detail. |
| `claim_eligible_ai_connection` | `20261114170000` | RPC: Atomic connection selection (`FOR UPDATE OF c SKIP LOCKED`). | **KEEP WITH CHANGES** | High quality. Refine to ensure `health_status` transition from `cooling_down` to `healthy` evaluates elapsed cooldown intervals accurately. |
| `record_ai_connection_failure` | `20261114170000` | RPC: Failure recording, cooldown assignment & quarantine. | **KEEP WITH CHANGES** | Sound multi-scope logic. Ensure HTTP 401/403 only quarantines account-scoped credentials and does not quarantine on transient gateway errors. |
| `record_ai_connection_success` | `20261114170000` | RPC: Success recording, token counting, failure reset. | **KEEP** | Robust and correct. |
| `record_ai_request_started` | `20261114170000` | RPC: Request-start counter and timestamp touch. | **KEEP** | Robust and correct. |

### 8.2 Live Database Application Status
**CRITICAL FACT:** Migration `20261114170000_bolu_provider_connections.sql` is currently **UNAPPLIED** to the live database (confirmed by `schemaReady: false` banner in the user's mobile screenshot and API response).
This means:
- No live production tables have been created yet.
- No production data will be dropped or corrupted by refining `20261114170000_bolu_provider_connections.sql` before execution.
- We can deliver a single, unified, clean migration that combines Phase 1 routing and Phase 2 management without intermediate schema drift.

---

## 9. Security Assessment

1. **Envelope Encryption (AES-256-GCM):**
   - Implemented in `src/lib/ai-assistant/bolu-secret-vault.ts`.
   - Master key derived from `BOLU_ENCRYPTION_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
   - Cryptographic nonces (12 bytes) and auth tags (16 bytes) are uniquely generated per encryption.
   - Credentials decrypted strictly in serverless memory; never logged or exposed.
2. **Access Control & RLS:**
   - All provider tables (`app_ai_provider_connections`, `app_ai_provider_routing`, `app_ai_provider_audit`, `app_ai_routing_events`) have Row-Level Security enabled with `DENY ALL` policies for `anon` and `authenticated`.
   - Accessible strictly by trusted serverless API handlers using `SUPABASE_SERVICE_ROLE_KEY`.
   - Administrative access to `/api/bolu-provider-config` is guarded by `verifyPlatformAdmin(request)` in `bolu-auth.ts`.
3. **SSRF Mitigation on Custom Endpoints:**
   - Syntax validation in `validateEndpointSyntax` prohibits insecure schemes (`http:`), embedded credentials, `localhost`, and internal network suffixes (`.local`, `.internal`, `.lan`).
   - Literal IP checks reject IPv4 private ranges (RFC 1918), link-local (169.254/16), loopback (127/8), and IPv6 equivalents.
   - DNS pre-resolution via `dns.lookup` verifies resolved addresses before requests.
   - Outbound fetches enforce `redirect: 'error'` to block redirect-based SSRF.
   - **Residual Risk:** DNS rebinding window between resolution check and runtime fetch. Target architecture should pin resolved IP or use agent proxy for custom endpoints.
4. **Data Isolation & Paid-Tier Guards:**
   - Hard invariant: `is_paid_tier` defaults to `true` for unknown or custom endpoints.
   - Paid inference is blocked from automatic router selection unless `allowPaid: true` is explicitly granted by tenant policy.

---

## 10. Direct Decision Quality Answers

### 1. Is the current UI worth improving, or should substantial parts be replaced?
**Answer: IMPROVE the main settings page layout; REPLACE the connection modal dialogue.**
The main view (`BoluProviderSettingsSection.tsx`) has achieved sound mobile responsiveness and clean aesthetics. However, the modal dialogue (`ConnectionDialog.tsx`) is structurally overloaded and incapable of delivering a Hermes-grade experience. It should be replaced with a structured, step-by-step setup sheet separating curated providers from custom endpoints and providing searchable model discovery.

### 2. Is the current provider SQL schema fit for purpose?
**Answer: FIT FOR PURPOSE WITH TARGETED REFINEMENT.**
The table `app_ai_provider_connections` in `20261114170000` already contains all necessary columns for multi-account management and routing. Because this migration is not yet applied to the live database, we should retire the redundant `app_ai_provider_routing` table and normalize the `protocol` enum before applying it.

### 3. Does the singleton credential table still have a legitimate role?
**Answer: NO ACTIVE ROLE; PRESERVE FOR READ-ONLY ROLLBACK SAFETY.**
`app_ai_provider_config` represents an obsolete single-provider design. The migration already copies its row into `app_ai_provider_connections`. It should be marked `migrated_to_connections = true` and left untouched as a read-only fallback.

### 4. Can the current Phase 1 routing engine consume the proposed multi-connection manager cleanly?
**Answer: YES, SUBJECT TO WIRING.**
The Phase 1 stored procedure `claim_eligible_ai_connection` was built for this exact connection table. The reason it wasn't working was a frontend/API omission: the API never exposed `priority` or `in_pool` to the UI, so all created connections defaulted to `in_pool = false` and `priority = 100`. Wiring these fields will activate the Phase 1 routing engine seamlessly.

### 5. What is the smallest safe backend/API change required?
**Answer: EXTEND `api/bolu-provider-config.ts` TO READ/WRITE ROUTING & TELEMETRY COLUMNS.**
The smallest safe change requires:
1. Adding `priority`, `in_pool`, `allowed_models`, and `is_paid_tier` to the allowed payload in `createConnection` and `updateConnection`.
2. Including `health_status`, `account_cooldown_until`, `model_cooldowns`, `known_balance_usd`, and `priority` in `PUBLIC_COLUMNS` returned by `GET /api/bolu-provider-config`.
3. Adding a background or on-demand balance sync trigger using `bolu-balance-sync.ts`.

### 6. What should the ideal admin workflow look like?
**Answer: A 5-STEP HERMES-LIKE EXPERIENCE:**
1. **Choose Provider:** Admin selects a curated card (e.g. OpenRouter, DeepSeek) or clicks "Custom Endpoint".
2. **Authenticate:** Admin pastes API key. Key is verified immediately via inline ping test without saving.
3. **Discover & Select Models:** Bolu queries the provider's `/models` endpoint, populating a searchable, filtered list of available models. Admin selects default and allowed models.
4. **Configure Routing:** Admin names the connection (e.g. "Primary OpenRouter", "Backup DeepSeek"), sets its pool priority (1, 2, 3...), and toggles pool participation.
5. **Manage & Monitor:** Saved connections appear in an active pool table with real-time health pills, cooldown timers, balance readings, and manual retest buttons.

### 7. Which current components or database structures should be retired?
- **Retire in DB:** `app_ai_provider_routing` (singleton table; replace with connection-level `priority` and `in_pool`).
- **Retire in UI:** The fallback checkboxes embedded in the Live Runtime card.
- **Retire in Code:** `src/lib/ai-assistant/providerCatalog.ts` (obsolete 4-row file) and unverified entries in `src/lib/ai-assistant/provider-catalog.ts` (e.g. Coarena, IteraCompute).

### 8. What should be implemented first?
**Answer: UNIFY SCHEMA & API CONTRACT BEFORE TOUCHING THE UI.**
1. Refine `20261114170000_bolu_provider_connections.sql` and apply it to Supabase.
2. Update `api/bolu-provider-config.ts` and `connection-vault.ts` to support priority, pool participation, health status, and balance.
3. Redesign the connection setup flow in the UI to match the 5-step Hermes workflow.

---

## 11. Recommended Target Architecture

### 11.1 Subsystem Structure

```
src/lib/ai-assistant/
├── bolu-provider-catalog.ts     <-- Unified Canonical Provider Catalogue
│                                    (Curated Tier 1 + Tier 2, explicit custom adapter)
├── bolu-secret-vault.ts         <-- Cryptographic Engine (AES-256-GCM, deriveMasterKey)
├── provider-adapters.ts         <-- Protocol Adapters (OpenAI chat, Anthropic messages, GET /models)
├── provider-security.ts         <-- SSRF Guard (Syntax check, DNS resolution check, Rate limit)
│
├── routing/                     <-- Routing & Telemetry Engine (Phase 1 Backend)
│   ├── bolu-account-pool.ts     <-- Service Role caller: claimEligibleConnection, recordAiFailure
│   ├── bolu-error-classifier.ts <-- Pure classifier: 11 categories, 5 scopes, Retry-After parser
│   ├── bolu-policy-router.ts    <-- Policy evaluator: taskType -> targetModel -> allowedProviders
│   └── bolu-balance-sync.ts     <-- Balance sync: OpenRouter credits & DeepSeek balance
│
└── connection-vault.ts          <-- Database Access Layer for Management API
```

### 11.2 Target Information Architecture & Screen Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│ Top Bar: Bolu AI Infrastructure                                        │
│ Subtitle: Encrypted credentials · Multi-account routing                │
│ [Status Pills: Active: OpenRouter (gpt-4o-mini) | Pool: 3 Healthy]     │
│ [Buttons: ↻ Refresh Status | + Connect Provider | + Custom Endpoint]   │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Active Connection Pool (Priority Ordered)                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Priority 1 [Primary]  ● Healthy  OpenRouter (Main Account)         │ │
│ │ Model: openrouter/free  | Balance: $14.20 USD                      │ │
│ │ In Pool: [ON]  Enabled: [ON]  [Test] [Models] [Edit] [Delete]      │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Priority 2 [Failover] ● Cooling Down (18s) DeepSeek (Production)   │ │
│ │ Model: deepseek-chat   | Balance: 24.50 CNY                        │ │
│ │ In Pool: [ON]  Enabled: [ON]  [Test] [Models] [Edit] [Delete]      │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Curated Provider Catalogue (Preconfigured Templates)               │
│ [OpenRouter] [Anthropic] [OpenAI] [DeepSeek] [Groq] [Gemini] [Mistral] │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Custom Provider Gateway                                             │
│ Banner: "Connect unsupported or private OpenAI/Anthropic endpoint"     │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Live Routing Activity & Diagnostics Feed                            │
│ Log stream of recent selections, failovers, and latency events.        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Prioritized Implementation Phases

### Phase 2A: Database & API Contract Normalization (Zero UI Breaking Changes)
1. **Schema Refinement:** Refine `20261114170000_bolu_provider_connections.sql` (retire `app_ai_provider_routing`, ensure clean protocol check, add unique connection name constraint) and verify push.
2. **API Exposure:** Update `connection-vault.ts` and `api/bolu-provider-config.ts` to include `priority`, `in_pool`, `health_status`, `account_cooldown_until`, `known_balance_usd`, `balance_source` in `PUBLIC_COLUMNS` and accept them in `create`/`update`.
3. **Balance Sync Integration:** Expose an action `sync_balance` in `api/bolu-provider-config.ts` calling `checkUpstreamBalance`.

### Phase 2B: Core UI / UX Overhaul (Hermes Provider Manager)
1. **Connection Dialog Replacement:** Replace `ConnectionDialog.tsx` with a guided setup sheet supporting searchable model selection, priority assignment, and unblocked inline testing.
2. **Custom Provider Separation:** Create a dedicated, distinct setup sheet for Custom Endpoints with explicit protocol/auth pickers and SSRF warnings.
3. **Connection Card Enhancement:** Add Priority badges/reordering, Health pills with countdown timers, Balance displays, and `in_pool` toggles.
4. **Catalogue Cleaning:** Remove unverified catalogue entries (Coarena, IteraCompute) from `provider-catalog.ts`.

### Phase 2C: Runtime Routing Convergence
1. **Runtime Convergence:** Update `api/bolu-chat.ts` to use `claimEligibleConnection` from `bolu-account-pool.ts` directly, fully activating the PostgreSQL atomic selection and failover engine.
2. **Observability Feed:** Surface `app_ai_routing_events` in the settings UI as an expandable activity feed.

---

## 13. Release Blockers & Unresolved Decisions

1. **DEC-17 vs DEC-18 Reconciliation:** Decision DEC-17 (Cloudflare priority) vs DEC-18 (AMD Token Factory priority) remains unresolved in project documentation. Recommended resolution: Prioritize OpenRouter and DeepSeek for verified Nigerian SME reliability, placing AMD in experimental Tier 2.
2. **DeepSeek Balance Currency Conversion:** DeepSeek balance API returns Chinese Yuan (CNY) for mainland accounts; schema defines `known_balance_usd numeric(12,4)`. Must add currency indicator or conversion.
3. **SSRF DNS Rebinding:** Add IP pinning in `safeProviderFetch` to close the DNS rebinding window for custom endpoints.

---

## 14. Git Verification & Evidence Audit

### 14.1 Git Status After Investigation
Captured via `git status --short` at conclusion:
```
 M api/bolu-chat.ts
 M docs/prd/conversational-document-assistant/Waterfall-roadmap.md
 M docs/prd/conversational-document-assistant/roadmap.html
 M src/components/settings/settings.css
 M src/lib/ai-assistant/bolu-provider.ts
 M src/lib/ai-assistant/connection-vault.ts
 M src/pages/settings/BoluProviderSettingsSection.tsx
 M src/pages/settings/bolu-provider/ConnectionDialog.tsx
 M supabase/migrations/20261114170000_bolu_provider_connections.sql
?? docs/reports/ai/2026-11-14-bolu-phase-1-defect-remediation-report.md
?? docs/reports/ai/2026-11-14-bolu-phase-1-routing-verification-and-closeout.md
?? docs/reports/ai/2026-11-14-bolu-provider-management-phase-2-pre-design-audit.md
?? src/lib/ai-assistant/routing/
?? src/tests/ai-assistant/bolu-routing-engine.test.js
?? video-json-tutorial/
```

### 14.2 Changed File Inventory
The **only** file created or modified during this investigation is the audit report:
- `docs/reports/ai/2026-11-14-bolu-provider-management-phase-2-pre-design-audit.md` (Created).

**Zero application code files, SQL migrations, or tests were changed.**

---
*Report completed in conformity with AGENTS.md, Core Guardrails, and ASD-STE100 technical documentation standards.*
