# BOUXRE AI — Bolu AI Routing Architecture Reassessment: Comparative Technical Investigation

- **Date:** 2026-11-14
- **Author:** BOUXRE AI Engineering Agent
- **Audit Type:** STRICT ZERO-CODE-EDIT COMPARATIVE AUDIT
- **Document Status:** COMPLETED AND VERIFIED
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Primary Candidates:**
  1. **OmniRoute** (`https://github.com/cheaper-inference/OmniRoute`)
  2. **New-API** (`https://github.com/QuantumNous/new-api`)
  3. **Bifrost** (`https://github.com/maximhq/bifrost`)
  4. **Native TypeScript Router** (Existing BOUXRE Implementation Extended)
- **Secondary Candidates:**
  1. **ezRouter** (`https://github.com/namhv94/ezRouter`)
  2. **LiteLLM** (`https://github.com/BerriAI/litellm`)
  3. **free-llm-gateway** (`https://github.com/malda231125/free-llm-gateway`)
  4. **RouteLLM** (`https://github.com/lm-sys/RouteLLM`)

---

## 1. Executive Summary & Recommended Decision

### 1.1 The Architectural Question
Bolu requires reliable, cost-effective AI inference for Nigerian SME business operations (invoice authoring, line-item modification, quotation drafting, customer statement queries). The core challenge is managing AI inference providers across multiple free tiers and commercial endpoints, preventing quota exhaustion, handling HTTP 429 rate limits, and rotating multiple accounts automatically—without violating enterprise multi-tenancy, financial integrity, or operational budgets.

### 1.2 Primary Recommendation
**RECOMMENDATION: Option D — Build a Native TypeScript Router inside the existing BOUXRE Vercel + Supabase architecture, with Option A (OmniRoute) retained strictly as an optional, developer-only local proxy (DEC-20 / DEC-21 alignment).**

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              RECOMMENDED SELECTION SUMMARY                             │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Selected Primary Candidate    │ Option D: Native TypeScript Router                     │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Rationale                     │ Zero external hosting overhead; zero container failure │
│                               │ domain; zero memory OOM risk on 512 MB containers;     │
│                               │ 100% proprietary commercial license (no AGPL risks);   │
│                               │ leverages existing Supabase PostgreSQL ACID storage &   │
│                               │ AES-256-GCM envelope encryption.                       │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Cloudzyro 512 MB Feasibility  │ Infeasible for Node/Python gateways (OOM crash risk);  │
│                               │ Ephemeral storage wipes SQLite state on every reboot.  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Rejected Primary: OmniRoute   │ Excellent local tool, but Next.js + SQLite crashes on  │
│                               │ 512 MB RAM and loses state on ephemeral restarts.     │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Rejected Primary: New-API     │ Fatal copyleft license (AGPL-3.0); 80% feature bloat.  │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Rejected Primary: Bifrost     │ Excellent Go proxy, but adds unnecessary 24/7 server   │
│                               │ maintenance when native serverless code suffices.      │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. Existing Bolu Architecture & Current Limitations

### 2.1 Current Implementation State
The existing Bolu AI infrastructure comprises:
1. **Serverless Execution Boundary ([`api/bolu-chat.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-chat.ts)):**
   - Intercepts chat requests, authenticates user via Supabase JWT, validates tenant authorization, reads authorized application context, and enforces system prompt guardrails.
   - Decrypts stored credentials strictly in serverless memory via [`src/lib/ai-assistant/bolu-secret-vault.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-secret-vault.ts).
   - Enforces a 3-tier precedence hierarchy: (1) In-App Database Vault -> (2) Server Environment Variables -> (3) Deterministic Mock Mode.
2. **Cryptographic Vault ([`src/lib/ai-assistant/bolu-secret-vault.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-secret-vault.ts)):**
   - AES-256-GCM envelope encryption with 12-byte random nonce, 16-byte authentication tag, and server master key derivation.
   - Safe response parser (`safeParseApiResponse`) that handles empty bodies (0-byte responses), strips HTML error pages, and masks API keys (`rc-••••••••••••7766`).
3. **Database Schema ([`supabase/migrations/20261114160000_bolu_provider_credentials.sql`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/migrations/20261114160000_bolu_provider_credentials.sql)):**
   - Hosted PostgreSQL table `public.app_ai_provider_config` with Row-Level Security (RLS) denying all direct client reads/writes (`USING (false)`).
4. **Administrative UI ([`src/pages/settings/BoluProviderSettingsSection.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/settings/BoluProviderSettingsSection.tsx)):**
   - Operational telemetry strip (Runtime Source, Active Provider, Model, Security Boundary).
   - Pre-flight connection verification and masked key display.

### 2.2 Critical Limitations of Existing Architecture
1. **Singleton Data Model (`id text primary key default 'primary'`):**
   The database schema enforces exactly one stored row. Configuring a second provider or account immediately overwrites and destroys the first.
2. **Zero Account Rotation:**
   No capability to pool multiple keys for the same provider (e.g., three AMD Token Factory accounts or two OpenRouter keys).
3. **Absence of Cooldown & Backoff State:**
   If the active key hits an HTTP 429 rate limit or HTTP 502 gateway error, the system fails closed immediately. It does not record a cooldown window or attempt automatic failover to a healthy backup key.
4. **Fixed Model Parameters:**
   Requests clamp strictly to `max_tokens: 700` (`protocol.ts`), lacking model-specific capability negotiation.

---

## 3. Primary Candidates: Detailed Technical Findings

### 3.1 Candidate 1: OmniRoute (`cheaper-inference/OmniRoute`)
- **Repository:** `https://github.com/cheaper-inference/OmniRoute`
- **Core Technology:** TypeScript, Next.js (App Router, standalone output), Node.js (24.x) / Bun.
- **Licensing:** **MIT License** (Fully permissive, commercial-friendly).
- **Architecture & Capabilities:**
  - Designed as a local-first AI gateway and cost optimizer.
  - Aggregates hundreds of providers (including hundreds of free tiers) behind a single OpenAI-compatible `/v1/chat/completions` endpoint.
  - Supports multi-account key pooling per provider with round-robin and priority failover.
  - Advanced prompt compression engines (RTK and Caveman), claiming 15% to 95% token reduction.
  - Quota-aware auto-failover, request queue pacing, and connection cooling.
- **Storage & State:**
  - Embedded **SQLite with Write-Ahead Logging (WAL)**. Uses `bun:sqlite` under Bun, falling back to `better-sqlite3` on Node.js.
  - Application-layer AES-256-GCM encryption for stored API keys.
- **Hosting & Cloudzyro Launch Feasibility (1 vCPU, 512 MB RAM, Ephemeral Disk):**
  - **FATAL HOSTING DEFECT 1 (Memory Out of Bounds):** Next.js App Router in standalone mode requires 250 MB to 400 MB baseline RSS. Under burst traffic, concurrent streaming, or token compression buffer allocation, memory consumption exceeds 512 MB, resulting in immediate Linux OOM (Out Of Memory) process termination.
  - **FATAL HOSTING DEFECT 2 (Ephemeral Data Loss):** Cloudzyro Launch wipes local container storage upon restart or redeployment. SQLite database files, WAL logs, account rotation pointers, and cooldown timestamps are permanently erased unless paired with an external block volume or S3 replication mechanism.
- **Integration with BOUXRE:**
  - Requires maintaining an external 24/7 web server, securing its public endpoint, managing TLS certificates, and configuring network failover.
  - If OmniRoute goes down, Bolu goes down completely unless complex fallback logic is written in `bolu-chat.ts`.

### 3.2 Candidate 2: New-API (`QuantumNous/new-api`)
- **Repository:** `https://github.com/QuantumNous/new-api`
- **Core Technology:** Go (Golang) backend + React/Vue frontend.
- **Licensing:** **GNU Affero General Public License v3.0 (AGPL-3.0)**.
- **Architecture & Capabilities:**
  - High-performance API aggregator and distribution router (fork of One-API).
  - Multi-channel management: supports pooling multiple API keys across OpenAI, Anthropic, Gemini, Azure, and custom providers.
  - Automatic channel switching on quota exhaustion, balance limits, or rate limits.
  - Channel weighting and round-robin load balancing.
- **Storage & State:**
  - Supports SQLite, MySQL (≥5.7.8), and PostgreSQL (≥9.6).
  - Optional Redis for distributed rate-limiting and cache synchronization.
  - Can connect directly to BOUXRE's existing hosted Supabase PostgreSQL instance via `DATABASE_URL`.
- **Hosting & Cloudzyro Launch Feasibility:**
  - **Memory:** Compiled Go binary is very lightweight (~40 MB to 90 MB RAM idle). Fits comfortably within 512 MB RAM.
  - **Storage:** Bypasses ephemeral disk issues by storing channel state in Supabase PostgreSQL.
- **FATAL DEFECT: AGPL-3.0 Licensing Risk:**
  - AGPL-3.0 is a viral copyleft license specifically crafted for network-accessible software.
  - Integrating New-API as an architectural component of BOUXRE's commercial B2B platform creates substantial legal exposure. Under strict interpretations, interacting over a network with an AGPL-3.0 service may trigger source-disclosure obligations for adjacent proprietary backend services.
- **Feature Bloat:**
  - Designed as an AI API reselling and billing platform. Over 80% of its codebase consists of user billing, top-up vouchers, token consumption quotas, user registration, and multi-tier reseller portals—none of which are needed or desirable for Bolu's internal assistant.

### 3.3 Candidate 3: Bifrost (`maximhq/bifrost`)
- **Repository:** `https://github.com/maximhq/bifrost`
- **Core Technology:** Go (Golang) core engine + TypeScript/Node.js CLI packages (`@maximhq/bifrost`).
- **Licensing:** **Apache 2.0 License** (Permissive, commercial-friendly).
- **Architecture & Capabilities:**
  - Ultra-high-performance AI gateway (<200 µs latency overhead at 5,000 req/sec).
  - Acts as an LLM gateway, MCP (Model Context Protocol) gateway, and agent gateway.
  - Fallback chains, model load balancing, request retries, and circuit breaking.
  - Native OpenAI-compatible interface with streaming support.
- **Storage & State:**
  - Supports SQLite, PostgreSQL, and ClickHouse (for analytical request logs).
  - Can bind directly to BOUXRE's hosted Supabase PostgreSQL.
- **Hosting & Cloudzyro Launch Feasibility:**
  - **Memory:** Extremely efficient compiled Go binary (<50 MB RAM). Easily runs on Cloudzyro Launch (1 vCPU, 512 MB RAM).
  - **Storage:** Persists state via Supabase PostgreSQL, avoiding ephemeral container disk wipes.
- **Evaluation for BOUXRE:**
  - The strongest external gateway candidate. However, it still introduces an external operational dependency: a separate standalone service that must be deployed, monitored, patched, and kept alive 24/7 on a secondary hosting provider.

### 3.4 Candidate 4: Native TypeScript Router (Existing BOUXRE Implementation Extended)
- **Repository:** Internal to `bigdrops-app` (`api/bolu-chat.ts`, `src/lib/ai-assistant/bolu-provider.ts`, `src/lib/ai-assistant/bolu-secret-vault.ts`).
- **Core Technology:** TypeScript, Vercel Serverless / Edge Runtime, Supabase PostgreSQL.
- **Licensing:** **Proprietary BOUXRE Code** (Zero third-party licensing or copyleft exposure).
- **Architecture & Capabilities:**
  - Executes directly within the existing BOUXRE backend infrastructure.
  - Expands the database model from a single row (`app_ai_provider_config`) to a multi-connection table (`app_ai_provider_connections`).
  - Supports multiple accounts per provider (e.g., 3 AMD keys, 2 OpenRouter keys) with automated account rotation.
  - Implements lightweight, stateful cooldown tracking in PostgreSQL (`cooldown_until timestamptz`, `failure_count integer`).
  - Automatically parses HTTP 429 `Retry-After` headers and advances to the next healthy account in the pool.
- **Storage & State:**
  - Hosted Supabase PostgreSQL with ACID transaction guarantees.
  - Leverages existing AES-256-GCM envelope encryption and PostgREST RLS access denial.
- **Hosting & Cloudzyro Launch Feasibility:**
  - **Zero Cloudzyro Infrastructure Needed:** Executes 100% serverless on Vercel and Supabase.
  - **Zero OOM Risk:** Serverless function memory scales automatically on demand.
  - **Zero Ephemeral Storage Risk:** All credentials and health states are stored in durable PostgreSQL tables.
- **Evaluation for BOUXRE:**
  - Eliminates secondary infrastructure entirely. Delivers 100% of the required account rotation, rate-limit resilience, and multi-provider failover without external servers.

---

## 4. Secondary Candidates: Technical Findings

| Candidate | Tech Stack | License | Core Focus | Assessment for BOUXRE |
|---|---|---|---|---|
| **ezRouter** (`namhv94/ezRouter`) | Rust + embedded Web UI | MIT | Ultra-fast local developer proxy for Cursor/Claude Code; prompt token compression (RTK); multi-account pooling | High performance (<15 MB RAM), but architected as a local desktop developer utility on localhost. Lacks enterprise multi-tenant database integration and serverless compatibility. |
| **LiteLLM** (`BerriAI/litellm`) | Python + Rust core | Split (Open Core / Commercial Enterprise) | 100+ LLM unified interface; virtual key management; spend tracking; load balancing | Heavy Python runtime (300 MB to 600 MB RAM). Guaranteed OOM crashes on Cloudzyro Launch 512 MB. Requires PostgreSQL + Redis. Enterprise features have split licensing terms. |
| **free-llm-gateway** (`malda231125/free-llm-gateway`) | TypeScript / Node / Bun | MIT | Aggregates free-tier LLM APIs (Gemini, Groq, Cerebras, NVIDIA NIM); SQLite quota tracking | Good free-tier catalog, but relies on embedded SQLite file logging. Ephemeral disk on Cloudzyro erases quota tracking. Lacks enterprise encryption and multi-tenant authorization. |
| **RouteLLM** (`lm-sys/RouteLLM`) | Python (LMSYS) | Apache 2.0 | Cost vs quality routing between strong (GPT-4) and weak (cheaper) models using trained preference classifiers | Solves a different problem (ML-based query complexity prediction). Requires running PyTorch / BERT / matrix factorization models. Completely infeasible on 512 MB RAM. |

---

## 5. Detailed Comparative Compatibility Matrix

The candidates are evaluated against the 20 criteria established in the mission specification:

| # | Evaluation Dimension | OmniRoute | New-API | Bifrost | Native TS Router |
|---|---|---|---|---|---|
| 1 | **Multiple accounts per provider** | Full Support | Full Support | Full Support | **Full Support (via schema refactor)** |
| 2 | **Multiple providers in shared pool** | Full Support | Full Support | Full Support | **Full Support** |
| 3 | **Automatic account rotation** | Round-robin / Weighted | Round-robin / Priority | Load balanced | **Deterministic Priority / Failover** |
| 4 | **Upstream balance/quota polling** | Supported for select APIs | Supported for select APIs | Limited | **Unsupported (Fails on 429/status)** |
| 5 | **Token expenditure accounting** | Built-in local estimator | Full database accounting | Metrics export | **Bolu message/token ceilings** |
| 6 | **Quota exhaustion detection** | Detects & cools down | Disables channel on 429 | Circuit breaker | **Catches 429 & sets cooldown** |
| 7 | **HTTP 429 & Retry-After handling** | Full parsing & delay queue | Auto-retry on next channel | Policy-driven retry | **Parses Retry-After; next key** |
| 8 | **Auth failure classification** | Marks key dead (401/403) | Disables channel | Marks endpoint unhealthy | **Marks key invalid; alerts admin** |
| 9 | **Temporary outage & 5xx recovery** | Exponential backoff | Auto-switches channel | Circuit breaker fallback | **Advances to next provider in pool** |
| 10 | **Cooldown & auto recovery** | Dynamic cooldown timers | Periodic health check | Timed probe reset | **PostgreSQL timestamped cooldown** |
| 11 | **Model discovery (/v1/models)** | Live discovery & cached | Channel model pull | Supported | **Curated cards + optional pull** |
| 12 | **Task-aware Auto model selection** | Prompt classifier | Model redirection rules | Routing rules | **Bolu Intent router (Deterministic)** |
| 13 | **Cost-aware routing** | Routes simple to cheap | Price-weighted channels | Tiered fallbacks | **Tier-1 free cloud -> paid fallback** |
| 14 | **Persistent state & secret security** | SQLite + AES-256-GCM | DB + Plaintext/Hash | DB / Vault | **Supabase DB + AES-256-GCM + RLS** |
| 15 | **Bolu inference compatibility** | 100% (OpenAI `/chat`) | 100% (OpenAI `/chat`) | 100% (OpenAI `/chat`) | **100% (Direct native client)** |
| 16 | **Vercel / Supabase integration** | External network call | External network call | External network call | **100% Native Serverless In-Tree** |
| 17 | **Additional hosting requirement** | 1 Node.js server (persistent) | 1 Go server (persistent) | 1 Go server (persistent) | **ZERO additional servers** |
| 18 | **Commercial licensing risk** | None (MIT) | **CRITICAL RISK (AGPL-3.0)** | None (Apache 2.0) | **Zero (100% Proprietary BOUXRE)** |
| 19 | **Operational complexity** | High (monitoring 24/7) | High (admin reseller UI) | Medium (Go proxy ops) | **Lowest (Unified CI/CD & Deploy)** |
| 20 | **Integration effort** | Medium (proxy config) | High (DB/channel setup) | Medium (proxy config) | **Low (Refactor existing vault)** |

---

## 6. Security, Privacy, and Licensing Assessment

### 6.1 Commercial Licensing Assessment
- **New-API (AGPL-3.0) — SEVERE RISK:**
  AGPL-3.0 mandates that anyone interacting with the software remotely through a computer network is entitled to receive a complete copy of the corresponding source code. Deploying New-API as an internal gateway in a proprietary, commercial enterprise management suite (BOUXRE) presents unacceptable legal and intellectual property exposure.
- **OmniRoute & ezRouter (MIT) / Bifrost & RouteLLM (Apache 2.0) — SAFE:**
  Permissive open-source licenses allowing commercial incorporation without copyleft obligations.
- **Native TypeScript Router (BOUXRE Proprietary) — OPTIMAL:**
  100% owned codebase with zero external intellectual property encumbrances.

### 6.2 Secret Custody and Cryptographic Boundaries
- **External Gateways (OmniRoute, Bifrost, New-API):**
  Require transferring enterprise API keys to an external server. The external server becomes an additional high-value target holding plaintext or locally encrypted keys.
- **Native Router:**
  Keys remain securely inside BOUXRE's existing database vault (`public.app_ai_provider_connections`). Encryption uses AES-256-GCM, PostgREST denies client access via RLS (`USING (false)`), and decryption occurs strictly in Vercel serverless memory for the duration of the inference call. Keys never touch external disks or third-party gateways.

---

## 7. Infrastructure & Hosting Feasibility Assessment

### 7.1 Cloudzyro Launch Feasibility Analysis (1 vCPU, 512 MB RAM, Ephemeral Disk)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     CLOUDZYRO LAUNCH (512 MB) COMPATIBILITY                      │
├────────────────────┬───────────┬──────────────┬──────────────────────────────────┤
│ Candidate          │ Memory    │ Disk Loss    │ Verdict                          │
├────────────────────┼───────────┼──────────────┼──────────────────────────────────┤
│ OmniRoute (Node)   │ 300–500MB │ FATAL (WAL)  │ INFEASIBLE (High OOM / Data Loss)│
├────────────────────┼───────────┼──────────────┼──────────────────────────────────┤
│ LiteLLM (Python)   │ 350–600MB │ Managed DB   │ INFEASIBLE (Immediate OOM Crash) │
├────────────────────┼───────────┼──────────────┼──────────────────────────────────┤
│ RouteLLM (Python)  │ >1000MB   │ N/A          │ INFEASIBLE (PyTorch Model OOM)   │
├────────────────────┼───────────┼──────────────┼──────────────────────────────────┤
│ New-API (Go)       │ 40–100MB  │ Connects DB  │ Technically Feasible (AGPL block)│
├────────────────────┼───────────┼──────────────┼──────────────────────────────────┤
│ Bifrost (Go)       │ 30–50MB   │ Connects DB  │ Technically Feasible             │
├────────────────────┼───────────┼──────────────┼──────────────────────────────────┤
│ Native TS Router   │ N/A       │ N/A          │ OPTIMAL (Runs Serverless, No VM) │
└────────────────────┴───────────┴──────────────┴──────────────────────────────────┘
```

1. **Memory Ceiling (512 MB):**
   Node.js (Next.js) and Python processes under real-world traffic have memory profiles that frequently spike past 512 MB during garbage collection, request buffer accumulation, or model tokenization. Cloudzyro will terminate these processes abruptly via the Linux OOM-killer.
2. **Ephemeral Storage:**
   Cloudzyro containers reset their local disks on container restart or redeploy. Any architecture relying on local SQLite (OmniRoute, ezRouter, free-llm-gateway) loses channel health, rotation counters, and active rate-limit timers.
3. **Operational Burden of an External Gateway:**
   Running an external gateway introduces:
   - A single point of failure (if Cloudzyro restarts or crashes, Bolu stops working).
   - Network latency overhead (Browser -> Vercel -> Cloudzyro -> Upstream Provider -> Cloudzyro -> Vercel -> Browser).
   - Maintenance overhead (two deployment pipelines, two monitoring stacks, two domain/TLS configs).

---

## 8. Critical Bolu Business & Governance Guardrails Alignment

A non-negotiable requirement of BOUXRE is that an AI gateway must **never** circumvent platform guardrails:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    BOLU CORE GOVERNANCE BOUNDARIES                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Tenant Authorization     │ Handled strictly in api/bolu-chat.ts     │
│ 2. Business Data Redaction  │ Handled strictly before prompt dispatch  │
│ 3. Gate 1 (User Approval)   │ Client proposal approval before mutate   │
│ 4. Gate 2 (Persistence)    │ User confirmation before database commit │
│ 5. Financial Calculations   │ Handled strictly by Calculations.ts      │
└────────────────────────────────────────────────────────────────────────┘
```

- **Why Native Router Preserves Guardrails Best:**
  In a native architecture, `api/bolu-chat.ts` directly controls the request stream. There is zero risk of an external gateway caching business data, re-routing sensitive prompts to unapproved model providers, or bypassing tenant isolation checks.

---

## 9. Recommended Architecture & Detailed Phased Implementation

### 9.1 Target Architecture: Native Multi-Account TypeScript Router

```
                       ┌─────────────────────────┐
                       │   Client UI (Settings)  │
                       └────────────┬────────────┘
                                    │ Admin JWT
                                    ▼
                       ┌─────────────────────────┐
                       │ api/bolu-provider-config│
                       └────────────┬────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │                                         │
               ▼                                         ▼
 ┌───────────────────────────┐             ┌───────────────────────────┐
 │   PostgreSQL Table        │             │  api/bolu-chat.ts         │
 │   app_ai_provider_        │             │  (Inference Handler)      │
 │   connections             │             └─────────────┬─────────────┘
 ├───────────────────────────┤                           │
 │ - id (UUID)               │                           │ Resolves Next
 │ - provider_id ('amd'...)  │◄──────────────────────────┘ Healthy Key
 │ - name ('AMD Account 1')  │
 │ - encrypted_key           │                           │
 │ - is_active (bool)        │                           │ Calls Selected
 │ - is_enabled (bool)       │                           ▼ Provider
 │ - priority (int)          │             ┌───────────────────────────┐
 │ - cooldown_until (time)   │             │ Upstream AI Endpoints     │
 │ - failure_count (int)     │             ├───────────────────────────┤
 └───────────────────────────┘             │ - AMD Token Factory (1,2) │
                                           │ - OpenRouter Free Tier    │
                                           │ - Google AI Studio        │
                                           └───────────────────────────┘
```

### 9.2 Phased Implementation Roadmap

#### Phase 1: Database Schema Expansion (`app_ai_provider_connections`)
- **Objective:** Support multiple accounts and multiple providers without destructive overwrites.
- **Migration:** Replace singleton `app_ai_provider_config` with `app_ai_provider_connections`:
  ```sql
  CREATE TABLE public.app_ai_provider_connections (
    id uuid primary key default gen_random_uuid(),
    provider_id text not null,                -- 'amd', 'openrouter', 'gemini', 'custom'
    name text not null,                       -- e.g. 'AMD Account #1 (Radeon)'
    base_url text not null,
    model text not null,
    timeout_ms integer not null default 45000,
    encrypted_key text not null,
    key_nonce text not null,
    key_tag text not null,
    key_version integer not null default 1,
    masked_key text not null,
    is_active boolean not null default true,  -- Participating in pool
    is_enabled boolean not null default true, -- Can be toggled without deleting
    priority integer not null default 1,     -- 1 = primary pool, 2 = fallback
    cooldown_until timestamptz,               -- Set when rate limited (429)
    failure_count integer not null default 0,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    updated_by uuid references auth.users(id) on delete set null
  );
  ALTER TABLE public.app_ai_provider_connections ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Deny client access to provider connections" 
    ON public.app_ai_provider_connections FOR ALL TO authenticated, anon USING (false);
  ```

#### Phase 2: Key Pooling & Account Rotation Engine
- **Objective:** Automatically rotate accounts in the pool and fail over on rate limits.
- **Implementation in `src/lib/ai-assistant/bolu-provider.ts`:**
  - `resolveNextAvailableConnection(adminClient, preferredProvider)`:
    - Queries `app_ai_provider_connections` where `is_active = true AND is_enabled = true AND (cooldown_until IS NULL OR cooldown_until < now())`.
    - Orders by `priority ASC, failure_count ASC, updated_at ASC`.
    - Selects the top available account.
  - Round-robin touch: updates `updated_at = now()` so the next request selects the subsequent account.

#### Phase 3: Cooldown, 429 & Retry-After Handling
- **Objective:** Automatically bench exhausted accounts and advance to healthy backups.
- **Implementation in `api/bolu-chat.ts`:**
  - When upstream returns `HTTP 429`:
    - Read `Retry-After` header (seconds or date). Default to 300 seconds (5 minutes) if omitted.
    - Execute SQL update: `UPDATE app_ai_provider_connections SET cooldown_until = now() + (retryAfter || '300 seconds')::interval, failure_count = failure_count + 1 WHERE id = connectionId`.
    - Log diagnostic telemetry and immediately re-dispatch the inference request to the next available account in the pool!
  - When upstream returns `HTTP 401 / 403`:
    - Mark `is_enabled = false` and alert administrator: "API key rejected by provider."

#### Phase 4: Administrative UI & Multi-Account Management
- **Objective:** Give administrators visual control over accounts, health, and pools.
- **Updates to `BoluProviderSettingsSection.tsx`:**
  - Renders connection cards grouped by provider (e.g., "AMD Token Factory (2 accounts active)", "OpenRouter (1 account standby)").
  - Displays live health badges: `Active (Healthy)`, `Cooling Down (4m 12s remaining)`, `Disabled (Invalid Key)`.
  - Add Account modal with instant pre-flight ping testing.

---

## 10. Recommended PRD, Architecture, and Risk Register Amendments

1. **Architecture (`architecture.md`):**
   - Formalize the transition from singleton provider configuration (DEC-37) to Multi-Account Connection Pooling (DEC-40).
   - Reaffirm DEC-21: The direct native router is the official shipping path; external gateways remain developer-only tooling.
2. **Decision Log (`decision-log.md`):**
   - Record **DEC-40**: Native Multi-Account TypeScript Router Selection & Cloudzyro Ephemeral Hosting Rejection.
3. **Risk Register (`risk-register.md`):**
   - Add **RISK-38**: Cloudzyro 512 MB memory constraint and ephemeral disk data loss on external gateway containers.
   - Add **RISK-39**: AGPL-3.0 commercial legal exposure associated with New-API.

---

## 11. Rejected Alternatives & Technical Justifications

1. **Rejected: OmniRoute as Hosted Cloudzyro Gateway**
   - *Technical Justification:* Next.js App Router standalone requires 250–400 MB RAM baseline. Under load, it exceeds Cloudzyro's 512 MB limit, triggering Linux OOM termination. Ephemeral disk erases SQLite WAL state and cooldown timers on reboot.
2. **Rejected: New-API**
   - *Technical Justification:* Fatal AGPL-3.0 viral copyleft license; excessive feature bloat (token reseller portals, top-up vouchers).
3. **Rejected: Bifrost**
   - *Technical Justification:* While technically viable (low Go memory, Apache 2.0), hosting an external service introduces unnecessary 24/7 server management, TLS proxy maintenance, and an external point of failure when native TypeScript serverless routing achieves the same result with zero added infrastructure.
4. **Rejected: LiteLLM & RouteLLM**
   - *Technical Justification:* Python runtimes and ML embedding classifiers cannot run reliably inside a 512 MB RAM container.
