# BOURXE — Bolu AI Provider Deployment Failure: Response Parsing Investigation & Repair Report

- **Date:** 2026-11-14
- **Author:** BOURXE AI Engineering Agent
- **Status:** COMPLETED AND VERIFIED
- **Related Error ID:** `err_1794666644349_pc65yt`
- **Route:** `/settings`
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Reference Decisions:** [DEC-35](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/decision-log.md#L390), [DEC-37](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/decision-log.md#L451), [DEC-38](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/decision-log.md#L483)
- **Target Files:**
  - [`src/pages/settings/BoluProviderSettingsSection.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/settings/BoluProviderSettingsSection.tsx)
  - [`src/lib/ai-assistant/bolu-secret-vault.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-secret-vault.ts)
  - [`vite.config.js`](file:///c:/Users/DELL/Desktop/bigdrops-app/vite.config.js)
  - [`src/tests/ai-assistant/bolu-secret-vault.test.js`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/ai-assistant/bolu-secret-vault.test.js)

---

## 1. Incident Summary & Observed Error

An administrator configuring Bolu's live inference provider on the `/settings` screen encountered an unhandled browser runtime exception:

```json
{
  "id": "err_1794666644349_pc65yt",
  "timestamp": 1794666644349,
  "route": "/settings",
  "title": "Failed to execute 'json' on 'Response': Unexpected end of JSON input",
  "diagnostic": "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
}
```

The error occurred when testing active connections, saving/encrypting credentials, or during initial provider status retrieval.

---

## 2. Root Cause Analysis

A complete code and runtime audit identified three distinct contributing factors:

### Factor 1: Frontend Unconditional `Response.prototype.json()` Parsing
In [`src/pages/settings/BoluProviderSettingsSection.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/settings/BoluProviderSettingsSection.tsx) (`handleSave`, `handleTest`, `fetchStatus`, and `handleRemove`), `await res.json()` was called unconditionally.
When a server returns:
- An empty response body (0 bytes), such as an unhandled 404 or 500,
- A non-JSON HTML error page (e.g., 502/504 Bad Gateway from an upstream edge router or proxy), or
- An aborted network connection,

the browser engine throws `SyntaxError: Unexpected end of JSON input` or `Unexpected token '<'`. This halted the UI and triggered the error boundary without actionable feedback for the administrator.

### Factor 2: Local Vite Development Server Route Handling
The BOURXE local development command (`bun run dev`) executes Vite (`vite.config.js`). In production (Vercel), routes in `/api/*` execute as serverless Edge/Node functions. In local development, however, Vite had no server middleware for `/api/*` requests.
When the browser issued `POST /api/bolu-provider-config`, Vite treated it as an unhandled static asset route and returned an HTTP 404 response with an empty 0-byte body. This immediately triggered Factor 1.

### Factor 3: Coupled Post-Mutation Status Refreshes
In `handleSave` and `handleRemove`, successful mutations immediately triggered `await fetchStatus()`. When the subsequent status refresh experienced a network delay or empty response, the save handler caught the error and reported that the save operation itself had failed, even when the credential had already been encrypted and persisted to the database vault.

---

## 3. Implemented Engineering Repairs

### 3.1 Resilient API Response Parser (`safeParseApiResponse`)
Added `safeParseApiResponse` to [`src/lib/ai-assistant/bolu-secret-vault.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-secret-vault.ts):
- **Raw Text Reading:** Reads response body using `await res.text()` before attempting to parse.
- **Empty Body Handling (0 bytes):** Detects empty payloads (HTTP 404, 500, or 204). Returns clean diagnostic status:
  - If 404: `API endpoint (/api/bolu-provider-config) was not found (HTTP 404). In local development, verify that Vite dev API middleware is active.`
  - If 204/200: marks `ok: true` with null data.
  - If error: reports HTTP status code cleanly without throwing syntax errors.
- **HTML / Non-JSON Sanitization:** Strips HTML angle brackets and tags from 502/504 reverse proxy error pages and extracts concise summaries.
- **Structured Error Extraction:** Automatically unpacks `{ error: string }` or `{ ok: false, message: string }` payloads.
- **Credential Protection:** Guarantees that raw API keys (`rc-*`, `sk-*`) and database service role secrets are never reflected in error messages.

### 3.2 Frontend Defensive Hardening
Updated [`src/pages/settings/BoluProviderSettingsSection.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/settings/BoluProviderSettingsSection.tsx):
- Replaced all raw `res.json()` invocations in `fetchStatus`, `handleTest`, `handleSave`, and `handleRemove` with `safeParseApiResponse`.
- Decoupled `fetchStatus()` following `handleSave` and `handleRemove` so that post-mutation status refresh delays log warning diagnostics without masking successful credential storage or removal.

### 3.3 Vite Local Development Server API Middleware
Added `apiDevServerPlugin()` to [`vite.config.js`](file:///c:/Users/DELL/Desktop/bigdrops-app/vite.config.js):
- Intercepts incoming requests matching `/api/*` in the Vite development server (`bun run dev`).
- Dynamically resolves and loads the corresponding serverless function in `api/*.ts` using Vite's `server.ssrLoadModule`.
- Translates Node HTTP request objects into standard Web `Request` objects and pipes the resulting Web `Response` back to the browser with correct HTTP status codes, headers, and body streams.
- Returns structured JSON 404 responses (`{ error: 'API route not found: ...' }`) for non-existent endpoints rather than unhandled 0-byte static responses.

---

## 4. Verification Evidence & Quality Gates

### 4.1 Automated Test Suite
- Ran full test suite via `bun test src/tests/ai-assistant/`.
- **Result:** **80 passing tests across 10 files (0 failures)**.
- Added 6 dedicated resilience tests in `src/tests/ai-assistant/bolu-secret-vault.test.js`:
  1. `handles 0-byte empty responses without throwing "Unexpected end of JSON input"` (asserts safe 404 handling).
  2. `handles empty 204 or 200 responses gracefully`.
  3. `handles non-JSON HTML error responses (502/504) without throwing syntax errors` (asserts HTML tag stripping and formatting).
  4. `parses valid JSON successfully`.
  5. `extracts error from JSON error bodies`.
  6. `extracts message when ok: false in JSON payload`.

### 4.2 Local Dev Server HTTP Probing
- **Probe 1 (Config endpoint without auth):**
  - Target: `POST http://localhost:5000/api/bolu-provider-config`
  - Output: `STATUS: 401`, `CONTENT-TYPE: application/json`, `BODY: {"error":"Authentication required."}`
- **Probe 2 (Non-existent endpoint):**
  - Target: `GET http://localhost:5000/api/non-existent-route`
  - Output: `STATUS: 404`, `CONTENT-TYPE: application/json`, `BODY: {"error":"API route not found: /api/non-existent-route"}`

### 4.3 Code Quality & Static Analysis Gates
- **`bun run audit:load`:** Passed. Zero broad queries, zero heavy limits, zero component fetch warnings introduced.
- **`bun run typecheck` (`tsc --noEmit`):** Zero errors in all modified files (`BoluProviderSettingsSection.tsx`, `bolu-secret-vault.ts`, `vite.config.js`). Only 8 pre-existing errors in legacy files.
- **`git diff --check`:** Passed with code 0 (zero whitespace or formatting errors).
- **Hardware Boundary Gate:** Zero `bun run build` invocations performed.

---

## 5. Roadmap & PRD Reconciliation

- **Canonical Waterfall Roadmap:** Updated [`Waterfall-roadmap.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/Waterfall-roadmap.md) Section 25.4 with deployment and response parsing resilience details.
- **Interactive Roadmap:** Updated [`roadmap.html`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/roadmap.html) Phase A with in-app AI provider vault and dev API middleware references.
- **Decision Log:** Formally recorded **DEC-38** in [`decision-log.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/decision-log.md).
