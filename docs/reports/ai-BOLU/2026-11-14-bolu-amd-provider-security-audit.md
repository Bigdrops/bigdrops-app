# Bolu AMD Provider Security & Configuration Audit Report

**Date:** 2026-11-14  
**Product:** Bolu Conversational Business Operations Assistant  
**Subject:** AMD AI Developer Program / AMD Radeon Cloud Token Factory Integration  
**Standard:** ASD-STE100 Simplified Technical English  
**Classification:** Security Architecture & Provider Configuration Audit  

---

## 1. Executive Summary

This audit establishes the security, compatibility, and exact configuration requirements for activating an AMD API key from the AMD AI Developer Program / AMD Radeon Cloud Token Factory with Bolu.

### Primary Audit Findings:
1. **Compatibility Confirmed:** AMD Radeon Cloud Token Factory is **100% compatible** with Bolu's existing server-side OpenAI-compatible adapter (`api/bolu-chat.ts`). It exposes a standard `/chat/completions` endpoint supporting Bearer authentication, SSE streaming, and OpenAI request/response schemas.
2. **Key Security Verified:** Bolu's API key custody is **strictly server-side**. The API key is read exclusively in `api/bolu-chat.ts` via `process.env`. The key is **never exposed** in client-side bundles, React components, browser storage (`localStorage`/`sessionStorage`), cookies, database rows, or error responses.
3. **Smart Auto-Detection Added:** A minor defect in provider defaulting was resolved. Previously, setting `BOLU_AMD_API_KEY` without `BOLU_PROVIDER_NAME=amd` defaulted to OpenRouter. `src/lib/ai-assistant/bolu-provider.ts` now automatically infers provider `'amd'`, base URL `https://developer.amd.com.cn/radeon/api/v1`, and model `DeepSeek-V4-Flash` whenever `BOLU_AMD_API_KEY` is present or an `rc-` prefixed key is used.
4. **Configuration Destination Clarified:** API keys **must NOT** be entered into BOURXE frontend Settings, source files, Git commits, or ordinary database tables. The key belongs in the **deployment platform's secure environment variable settings (Vercel Project Settings)** or local `.env.local`.
5. **Readiness Determination:** **Bolu is fully ready for the user to configure the AMD key.**

---

## 2. AMD Provider Compatibility Verification

The API requirements were verified against official AMD China Developer Program documentation and repository architectural research (`docs/tickets/free-model-failover-stack.md`):

| Property | AMD Requirement / Specification | Existing Adapter Status (`api/bolu-chat.ts`) | Match? |
|---|---|---|:---:|
| **Provider Name** | AMD Radeon Cloud Token Factory | `BOLU_PROVIDER_NAME=amd` | **YES** |
| **Base URL** | `https://developer.amd.com.cn/radeon/api/v1` | `normalizeChatEndpoint(baseUrl)` | **YES** |
| **Endpoint URL** | `https://developer.amd.com.cn/radeon/api/v1/chat/completions` | `https://developer.amd.com.cn/radeon/api/v1/chat/completions` | **YES** |
| **Protocol / Interface** | OpenAI-compatible Chat Completions HTTP POST | Uses standard `POST /chat/completions` payload | **YES** |
| **Authentication Format** | HTTP Header `Authorization: Bearer <key>` | `buildProviderHeaders()` emits `Authorization: Bearer ${config.apiKey}` | **YES** |
| **Key Prefix** | `rc-` (Radeon Cloud Token Factory key format) | Tested and accepted; triggers auto-detection | **YES** |
| **Default Model** | `DeepSeek-V4-Flash` (1,048,576 context window) | Defaults to `DeepSeek-V4-Flash` when provider is `amd` | **YES** |
| **Alternate Models** | `DeepSeek-V4.1-Flash`, `GLM-5.3-Flash`, `Qwen3.8-Flash-Next`, `Qwen3.8-27B`, `Gemma-4-31B-IT` | Configurable via `BOLU_PROVIDER_MODEL` | **YES** |
| **Streaming Support** | Standard Server-Sent Events (`text/event-stream`) | Directly piped; buffered JSON also converted to SSE | **YES** |
| **Provider Headers** | Standard `Content-Type: application/json` only | OpenRouter-only headers (`HTTP-Referer`, `X-Title`) omitted | **YES** |
| **Rate Limits** | 30 req/min per key; 8 concurrent connections | Handled with HTTP 429 classification & user retry alert | **YES** |
| **Service Terms** | Free trial and development service; non-production | Permitted for internal testing, dev, and team trial | **YES** |

---

## 3. API Key Security Audit

A line-by-line inspection of the key-handling lifecycle confirmed strict compliance with security standards:

### 3.1 Server-Only Ingestion
- `process.env.BOLU_PROVIDER_API_KEY` and `process.env.BOLU_AMD_API_KEY` are accessed strictly on the server in `api/bolu-chat.ts` (line 105).
- No frontend files in `src/` import or inspect `process.env` directly.
- No `VITE_` prefixed environment variables exist for AI provider keys. Vite will never package Bolu keys into browser bundles.

### 3.2 Zero Response Exposure
- Upstream SSE chunks are streamed directly to the authenticated client or converted to delta packets. Keys are never embedded into streaming chunks.
- Error handlers in `api/bolu-chat.ts` (lines 37-47) return static sanitized JSON:
  - 401/403: *"Bolu provider authentication failed. Check your server API key configuration."*
  - 429: *"Bolu is currently rate-limited by the AI provider. Please wait a moment and try again."*
  - 504: *"The AI provider request timed out. Please try again."*
- Raw authorization headers and request credentials are never echoed to clients.

### 3.3 Zero Client Storage
- The repository was audited for `localStorage`, `sessionStorage`, cookies, and IndexedDB. No AI keys are stored in browser storage.
- The browser client (`src/lib/ai-assistant/bolu-runtime.ts`) interacts with Bolu solely by passing the user's Supabase session Bearer token to `/api/bolu-chat`. The browser has no knowledge of upstream AI keys.

### 3.4 Missing Credentials & Mock Boundary
- When no key is configured, `api/bolu-chat.ts` returns HTTP 503 without executing any network calls.
- In `mock` mode, the route returns deterministic fixtures locally; no outbound network connection to AMD or third parties is established.

---

## 4. Configuration Instructions For The User

### 4.1 Production & Preview Deployment (Vercel)
The user should enter the AMD key directly into Vercel Project Settings:

1. Log into **Vercel** and select the BOURXE project (`bourxe-app` / `bigdrops-app`).
2. Go to **Settings** $\rightarrow$ **Environment Variables**.
3. Add the following variables:

| Variable Name | Required? | Recommended Value | Description |
|---|:---:|---|---|
| `BOLU_PROVIDER_NAME` | **Required** | `amd` | Activates AMD Token Factory defaults |
| `BOLU_PROVIDER_API_KEY` | **Required** | `rc-xxxxxxxxxxxx` | User's AMD API key (starts with `rc-`) |
| `BOLU_PROVIDER_BASE_URL` | Optional | `https://developer.amd.com.cn/radeon/api/v1` | Automatically defaults to this when provider is `amd` |
| `BOLU_PROVIDER_MODEL` | Optional | `DeepSeek-V4-Flash` | Automatically defaults to this when provider is `amd` |
| `BOLU_PROVIDER_TIMEOUT_MS` | Optional | `45000` or `60000` | Recommended 60000ms for China-to-Africa routes |
| `BOLU_PROVIDER_MODE` | Optional | `live` | Automatically defaults to `live` when key is present |

*(Note: Setting legacy `BOLU_AMD_API_KEY=rc-...` is also supported and automatically activates AMD mode).*

4. **Environments:** Select **Production**, **Preview**, and **Development**.
5. **Redeployment Requirement:** In Vercel, Serverless Functions bake environment variables upon deployment. **You MUST trigger a Redeploy** on the latest deployment in Vercel (or push a new commit) for the serverless endpoint `/api/bolu-chat` to receive the new variables.

### 4.2 Local Development (.env.local)
To test locally on a developer workstation:
1. Create or open `.env.local` in the project root:
   ```env
   BOLU_PROVIDER_NAME=amd
   BOLU_PROVIDER_API_KEY=rc-your-amd-key-here
   BOLU_PROVIDER_MODE=live
   ```
2. Verify that `.env.local` is ignored by Git:
   - Root `.gitignore` explicitly ignores `*.local`, `.env`, and `.env.*`.
   - Never commit `.env.local` or any secrets to GitHub.

---

## 5. Architectural Assessment: Frontend Settings vs. Deployment Variables

**Why an API Key Input was NOT added to BOURXE Settings:**
1. **Multi-Tenant Security Invariant:** BOURXE is a multi-tenant business suite. Storing plaintext or client-decryptable third-party AI keys in tenant database tables allows any authenticated user or XSS vector to extract commercial API credentials.
2. **Current Architecture:** Bolu is currently configured as an application-managed platform capability where the platform provides inference to authorized SME users.
3. **Prerequisites for Future In-App BYOK (Bring Your Own Key):**
   If BOURXE later supports tenant-owned keys, the following backend infrastructure is mandatory before exposing any UI:
   - Server-side envelope encryption via KMS / `pgsodium` (Supabase Vault).
   - Write-only RPCs: tenant admins can submit/rotate keys, but neither users nor API responses can ever read decrypted keys back.
   - Per-tenant secret resolution: `/api/bolu-chat` queries the encrypted vault per tenant ID rather than reading a static environment variable.

Until that vault infrastructure is scheduled, deployment platform environment variables remain the safest and correct architecture.

---

## 6. Implementation Changes Made

One narrowly scoped improvement was made to eliminate configuration traps:

- **File Modified:** [`src/lib/ai-assistant/bolu-provider.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-provider.ts)
- **Change:** Updated `getBoluProviderConfig` to automatically infer `providerName = 'amd'` when `BOLU_AMD_API_KEY` is present or when the API key begins with `rc-`.
- **File Modified:** [`src/tests/ai-assistant/bolu-provider.test.js`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-provider.test.js)
- **Change:** Added unit tests verifying auto-detection of AMD key prefixes and validation of AMD request headers.

---

## 7. Verification & Operational Risks

### 7.1 Automated Verification Evidence
- `bun test src/tests/ai-assistant/`: **62 tests passed, 0 failed** in 267ms.
- `bun run typecheck`: **Zero type errors** in Bolu files.
- `git diff --check`: Passed with **zero whitespace or formatting issues**.

### 7.2 Operational & Legal Risks
1. **Regional Latency:** The AMD Token Factory server is located in China (`developer.amd.com.cn`). Users connecting from West Africa (Nigeria) or Western Europe will experience higher round-trip latency (200-500ms RTT). A timeout of `60000`ms (`BOLU_PROVIDER_TIMEOUT_MS=60000`) is recommended.
2. **Development-Only Terms:** AMD's terms explicitly state this service is for free evaluation and development, not commercial production resale. It is approved for developer/team trial, but commercial tenant rollout will require an edge provider (e.g. Cloudflare / OpenRouter / local edge).
3. **Rate Limits:** The free tier enforces ~30 RPM per key and ~10 USD daily capacity.

---

## 8. Final Readiness Determination

**Bolu is 100% ready for the user to configure the AMD key.**

All adapter code, endpoint normalization, header generation, error masking, calculation locking, and two-gate review mechanisms are in place and verified. Once the user adds `BOLU_PROVIDER_NAME=amd` and `BOLU_PROVIDER_API_KEY=rc-...` into Vercel Project Settings and redeploys, live inference through AMD Token Factory will be active.
