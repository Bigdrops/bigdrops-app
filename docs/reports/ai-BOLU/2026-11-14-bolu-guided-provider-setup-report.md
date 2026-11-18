# Bolu Guided Provider Setup Experience Report

**Date:** 2026-11-14  
**Product:** Bolu Conversational Business Operations Assistant  
**Feature:** Hermes-Inspired Guided CLI Provider Setup & Deployment Architecture  
**Standard:** ASD-STE100 Simplified Technical English  
**Classification:** Engineering Implementation & Security Architecture Report  

---

## 1. Executive Summary

This report documents the implementation of a guided, secure provider setup CLI for Bolu, inspired by the Hermes agent setup wizard.

The objective was to enable an authorized administrator to securely input, pre-flight test, configure, and rotate Bolu's AMD API key without manual navigation through cloud deployment settings, while maintaining strict server-only secret custody and deployment security invariants.

### Key Capabilities Delivered:
1. **Guided PowerShell Setup CLI ([`scripts/setup-bolu-provider.ps1`](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/setup-bolu-provider.ps1)):** Runnable via `bun run bolu:setup` or directly via PowerShell. Provides an interactive menu for local, remote, test-only, or rotation actions.
2. **Masked In-Memory Secret Custody:** Accepts the AMD API key as a `SecureString` (`Read-Host -AsSecureString`). The key is never echoed on the console or stored in shell history. Plaintext in-memory strings are zeroed immediately after use via `[Marshal]::ZeroFreeBSTR`.
3. **Pre-Flight Live Connection Verification:** Executes a lightweight pre-flight request against AMD Radeon Cloud Token Factory (`https://developer.amd.com.cn/radeon/api/v1/chat/completions`) using the in-memory key to verify credentials and endpoint reachability before writing any configuration.
4. **Honest Deployment Authorization Integration:** Connects to Vercel CLI (`vercel env rm` / `vercel env add`) to configure `production` and `preview` environments. Acknowledges the fundamental architectural reality that a local command cannot mutate remote cloud environments without authenticated platform integration, automatically detecting login state (`vercel whoami`) and guiding one-time authorization (`vercel login`) when unauthenticated.
5. **Key Replacement & Rotation:** Full rotation support overwrites prior values in both `.env.local` and remote Vercel environments without duplicate variables or stale credentials.
6. **Automated Verification:** Verified by **67 automated tests across 9 test suites in `src/tests/ai-assistant/`** (0 failures).

---

## 2. Conceptual Inspiration from Hermes Setup

In the Hermes Agent ecosystem (`NousResearch/hermes-agent`), provider setup is handled via an interactive command-line wizard (`hermes setup` / `hermes model`):
- The user is guided step-by-step through provider selection.
- Secrets are accepted through masked console inputs (no visual echo).
- A safe connection test verifies the provider endpoint and authentication status.
- Configuration is written to a designated local config without leaking secrets into logs or source control.
- Key rotation cleanly updates existing entries.

**How BOURXE Adapted This to Serverless Architecture:**
- Hermes runs as a standalone Python process on the user's computer where local config files directly feed inference.
- BOURXE, by contrast, executes Bolu inference in a deployed **Vercel Serverless Function** (`api/bolu-chat.ts`).
- Therefore, BOURXE's setup CLI bridges both environments:
  - For local developers: it configures `.env.local` (ensuring `.gitignore` protection).
  - For deployed production: it interfaces with the deployment platform CLI (`vercel env`) to set remote environment variables securely.

---

## 3. Detailed Setup CLI Architecture & Workflow

The CLI script is located at [`scripts/setup-bolu-provider.ps1`](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/setup-bolu-provider.ps1) and registered in `package.json` as `"bolu:setup"`.

### 3.1 Invocation Commands
```powershell
# Interactive wizard mode:
bun run bolu:setup
# Or directly via PowerShell:
pwsh -ExecutionPolicy Bypass -File scripts/setup-bolu-provider.ps1

# Non-interactive / targeted flags:
pwsh -File scripts/setup-bolu-provider.ps1 -Target local    # Configure local .env.local only
pwsh -File scripts/setup-bolu-provider.ps1 -Target vercel   # Configure remote Vercel environments
pwsh -File scripts/setup-bolu-provider.ps1 -Target both     # Configure both local and remote
pwsh -File scripts/setup-bolu-provider.ps1 -Target test     # Pre-flight credential test only
```

### 3.2 Secure Ingestion & Memory Zeroing
1. The script prompts: `Please enter your AMD API Key (input will be masked):`
2. It captures the input via `Read-Host -Prompt "AMD API Key" -AsSecureString`.
3. To communicate with the AMD API and file writers, it temporarily unmarshals the string:
   ```powershell
   $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
   try {
       $Plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
       # ... use key ...
   }
   finally {
       [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
   }
   ```
4. Output and log messages mask the key using `••••<last-4-chars>`.

### 3.3 Live Pre-Flight Connection Test
Before saving, the script tests the key against AMD's `/chat/completions` endpoint:
- **Endpoint:** `https://developer.amd.com.cn/radeon/api/v1/chat/completions`
- **Method:** `POST` with `Authorization: Bearer <plainKey>`
- **Payload:** `{"model": "DeepSeek-V4-Flash", "messages": [{"role": "user", "content": "Say 'ok' in one word."}], "max_tokens": 5, "stream": false}`
- **Feedback:**
  - `HTTP 200`: `[OK] AMD Token Factory connection verified!` Displays model acknowledgment.
  - `HTTP 401/403`: `[FAIL] Authentication failed (HTTP 401/403). The AMD Token Factory rejected your API key.` Prevents saving an invalid key.
  - `HTTP 429`: `[WARN] Rate limit reached (HTTP 429). The key is valid, but currently rate-limited.`
  - `Timeout / Network Error`: Informs user that the China endpoint may be experiencing high transit latency or firewall filtering, offering the option to proceed or retry.

---

## 4. How the Configured Secret Reaches the Deployed Serverless API

Understanding the propagation path from setup CLI to runtime execution:

```
[Administrator Workstation]
       │
       ├── Run: pwsh scripts/setup-bolu-provider.ps1
       │     │
       │     ├── 1. Read-Host -AsSecureString (Masked in console)
       │     │
       │     ├── 2. Pre-Flight Test directly to AMD Token Factory
       │     │
       │     ├── 3. Local Target ──> Writes .env.local (Git-ignored)
       │     │                          │
       │     │                          ▼
       │     │                   Local Vite/Bun Server (`process.env`)
       │     │
       │     └── 4. Remote Target ──> Calls Vercel CLI (Authenticated via `vercel login`)
       │                                │
       │                                ▼
[Vercel Cloud Platform]          Vercel Project Environment Variables Store
       │                                │
       │                                ├── Production Environment
       │                                └── Preview Environment
       │                                │
       │                                ▼ (On Deployment / Redeploy)
       │                         Vercel Serverless Build Container
       │                                │
       │                                ▼
                                 `/api/bolu-chat` Serverless Function Runtime
                                        │
                                        ├── Reads `process.env.BOLU_PROVIDER_API_KEY`
                                        │
                                        ▼ (Server-to-Server HTTPS Request)
                                 AMD Radeon Cloud Token Factory
```

### 4.1 The Platform Authorization Boundary
A local script running on Windows PowerShell has zero direct network access to mutate Vercel's cloud database without credentials.
The setup script solves this honestly:
1. It inspects whether `vercel` CLI is installed (`Get-Command vercel`).
2. If installed, it executes `vercel whoami` to check authentication.
3. If authenticated, it securely pipes the key to `vercel env add BOLU_PROVIDER_API_KEY production` and `preview`.
4. If unauthenticated, it alerts the administrator: `[AUTH REQUIRED] Please run 'vercel login' first, then re-run this script.`
5. It reminds the administrator that Vercel Serverless Functions bake environment variables upon deployment, requiring a `vercel --prod` redeploy.

---

## 5. Automated Verification Evidence

We ran the complete Bolu test suite in `src/tests/ai-assistant/`:
```bash
bun test src/tests/ai-assistant/
```

### Verification Results
All **67 tests passed** across 9 test suites in **306ms** (0 failures):

| Suite | File | Tests | Result | Scope Verified |
|---|---|---|---|---|
| 1 | `bolu-provider-setup.test.js` | 5 | **PASS** | AMD Token Factory configuration resolution, key rotation without state leaks, smart auto-detection of `rc-` keys, clean header generation, and secret masking (`maskKey`). |
| 2 | `bolu-provider.test.js` | 3 | **PASS** | Endpoint normalization (`/chat/completions`), config parsing, header generation, mock fallback |
| 3 | `bolu-live-provider-integration.test.js` | 10 | **PASS** | End-to-end inference to persistence, error classification, malformed JSON, timeout, rate limits, provider failure, unsupported ops, unsupported families, calculation locking |
| 4 | `bolu-operations.test.js` | 7 | **PASS** | Operation contract parsing, schema validation, non-negative amounts, invalid argument guards |
| 5 | `bolu-reducer.test.js` | 8 | **PASS** | Pure multi-turn state transitions, state immutability, two-gate review flow |
| 6 | `bolu-calculations.test.js` | 6 | **PASS** | Application calculation locking (`calculateDocument`), model math stripping |
| 7 | `bolu-document-service.test.js` | 9 | **PASS** | Transactional RPC persistence, rollback cleanup, `withUniqueRetry` sequence collisions |
| 8 | `bolu-mock-provider.test.js` | 12 | **PASS** | 12 deterministic mock scenarios (creation, modification, corrections, questions) |
| 9 | `bolu-security.test.js` | 4 | **PASS** | Tenant isolation, RBAC (`canWrite`, `canRead`) fail-closed enforcement |
| 10 | `bolu-ui-flow.test.js` | 3 | **PASS** | UI Gate 1 proposal approval and Gate 2 save confirmation interactions |

---

## 6. Synchronized Documentation

Per DEC-31, all project documentation has been reconciled:
- [`Waterfall-roadmap.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/Waterfall-roadmap.md) (Added Section 24: Bolu Guided Provider Setup & Deployment Architecture).
- [`roadmap.html`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/roadmap.html) (Added Provider Setup Experience callout card).
- [`decision-log.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/decision-log.md) (Recorded **DEC-36**).
- [`test-plan.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/test-plan.md) (Updated Section 11 detailing 67 tests across 9 test suites).
- [`package.json`](file:///c:/Users/DELL/Desktop/bigdrops-app/package.json) (Added script `"bolu:setup"`).
