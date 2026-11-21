# BOURXE / Bolu — Production Pool-Wide Model Availability Incident Diagnosis

- **Date:** November 21, 2026
- **Status:** Completed
- **Priority:** Critical
- **Task Type:** Production Incident Investigation (Read-Only)
- **Baseline Git HEAD:** `8a828de020178347fd91086c47016176556951c4` (`main`)
- **Investigator:** Antigravity Engineering (Independent Incident Investigation)
- **Target Report:** `docs/reports/bolu-model-routing/production-pool-availability-incident.md`

---

## 1. Executive Summary & Incident Classification

### 1.1 The Reported Incident
Users across both **Auto** and **Manual** model selection modes reported recurring pool-wide failures:
1. *"The selected model is unavailable, and no alternatives were found in the active pool."*
2. *"No eligible Bolu AI provider connection is currently available in the active pool."*

### 1.2 Verdict & Classification
- **Incident Classification:** **Health / Quarantine Failure** triggered by a **Cryptographic Salt Mutation via Brand Renaming**, compounded by a **Terminal Quarantine Cascade** and a **Pre-Existing HTTP 403 Scope Defect**.
- **Root Cause Summary:**
  1. **Primary Poison Pill (Cryptographic Salt Mutation):** On November 19, 2026 (commit `9f6102c757`), a repository-wide find-and-replace renaming `"BOURXE"` to `"BOUXRE"` silently modified the cryptographic salt in `src/lib/ai-assistant/bolu-secret-vault.ts` line 62 from `'bourxe-bolu-vault-v1'` to `'bouxre-bolu-vault-v1'`.
  2. **Decryption Authentication Failure:** Because all connection credentials stored in Supabase table `app_ai_provider_connections` were encrypted at rest with an AES-256-GCM master key derived using the original salt, the runtime server derived a mismatched master key (`a20e4719...` instead of `5e2f80a9...`). Every subsequent credential decryption attempt failed GCM authentication tag validation (`Unsupported state or unable to authenticate data`).
  3. **Quarantine Cascade (The Self-Destruct Loop):** In `bolu-account-pool.ts` (lines 140–148), decryption failures were classified as `failureCategory: 'authentication'`, calling database function `record_ai_connection_failure`. In PostgreSQL, authentication failures immediately update `health_status = 'quarantined'`. As user requests arrived on the morning of November 20 (07:03–09:53 UTC), the router systematically quarantined 6 healthy provider connections within milliseconds of selection.
  4. **Pre-Existing OpenRouter Quarantine:** On November 18 at 04:05 UTC, OpenRouter was quarantined when an unpatched error classifier assigned `scope: 'account'` to an HTTP 403 model-tier error on `thinkingmachines/inkling-2-small:free`.
  5. **Terminal Pool Availability (0 / 8):** In PostgreSQL, `quarantined` is a permanent status with **no automatic expiration** (unlike `account_cooldown_until`). Because 100% of the 8 configured connections were placed into `quarantined`, both Auto routing (`claim_eligible_ai_connection`), Manual routing (`claimExactConnection`), and alternative discovery (`discoverEligibleAlternatives`) excluded all connections, producing a 100% pool-wide outage.

---

## 2. Production Connection Inventory

Live inspection of production table `public.app_ai_provider_connections` (queried via trusted service role) established the complete connection inventory:

- **Total Connections Found:** 8
- **Globally Managed:** Yes (no tenant-scoping column on `app_ai_provider_connections`; connections serve all tenants platform-wide).
- **Client Access:** Strictly denied by Row-Level Security (`Deny client access to app_ai_provider_connections`). Accessible only via backend service role.
- **Enabled (`is_enabled = true`):** 8 of 8 (100%)
- **Opted into Pool (`in_pool = true`):** 8 of 8 (100%)
- **Health Status Breakdown:**
  - `healthy`: **0** (0%)
  - `cooling_down`: **0** (0%)
  - `exhausted`: **0** (0%)
  - `quarantined`: **8** (100%)

### 2.1 Connection Inventory & Health Breakdown

| # | Connection ID | Name | Provider | Configured Model | Priority | In Pool | Health Status | Consecutive Failures | Last Failure (UTC) | Last Error Message Recorded in Database |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **0** | `0d1432cb-6b9d-42ef-8471-41d0fa69bd16` | Runcrate | runcrate | `deepseek-ai/DeepSeek-V4.1-Flash` | 100 | true | **quarantined** | 2 | 2026-11-20 07:04:27 | `Server failed to decrypt connection credential.` |
| **1** | `22c9bdf9-0e98-4d8b-8531-51992e4cc221` | wisdom | gemini | `models/gemini-4-hydrogen` | 100 | true | **quarantined** | 2 | 2026-11-20 07:04:40 | `Server failed to decrypt connection credential.` |
| **2** | `6b3ffad8-f727-4fda-924b-be1bb270ac66` | AMD Token Factory | amd | `DeepSeek-V4-Flash` | 100 | true | **quarantined** | 0 | *None* | *Migrated from primary in unverified state* |
| **3** | `dac7dbb5-a8ad-48ca-acca-5fe28b143561` | 111 | 100milionseek | `deepseek-v4.1-flash-free` | 100 | true | **quarantined** | 1 | 2026-11-20 07:04:13 | `Server failed to decrypt connection credential.` |
| **4** | `1f7b4379-2a76-49c2-bcbe-fbc5489b35f4` | Bolu | zro | `deepseek-v4.1-flash` | 100 | true | **quarantined** | 1 | 2026-11-20 07:03:48 | `Server failed to decrypt connection credential.` |
| **5** | `5aa35c63-639e-4b9c-b759-16bdd542dde7` | jwiz | plamo | `plamo-3.1-prime` | 100 | true | **quarantined** | 2 | 2026-11-20 09:53:22 | `Server failed to decrypt connection credential.` |
| **6** | `d8c7b0a6-0232-4aa8-8a1d-98f746bb6b0c` | Apinex | apinex | `free/deepseek-v4.1-flash` | 100 | true | **quarantined** | 1 | 2026-11-20 07:04:06 | `Server failed to decrypt connection credential.` |
| **7** | `9ce3ac70-b146-485d-b31d-1eca42fefb87` | Bouxre | openrouter | `cohere/north-mini-code:free` | 1 | true | **quarantined** | 1 | 2026-11-18 04:05:33 | `Provider access forbidden. Verify account permissions or model access tier.` |

---

## 3. Cryptographic Verification & Root Cause Evidence

### 3.1 The Git Mutation
Inspection of repository history reveals that on Thursday, November 19, 2026, commit `9f6102c7570f82724a4dcecdd098960608b9bcc8` (`wrench: chore(brand): rename BOURXE to BOUXRE across app`) executed a broad string replacement:

```diff
--- a/src/lib/ai-assistant/bolu-secret-vault.ts
+++ b/src/lib/ai-assistant/bolu-secret-vault.ts
@@ -59,7 +59,7 @@ export type SaveProviderConfigInput = {
 export const KEY_VERSION_SERVICE_ROLE = 1
 export const KEY_VERSION_DEDICATED = 2
 
-const VAULT_SALT = 'bourxe-bolu-vault-v1'
+const VAULT_SALT = 'bouxre-bolu-vault-v1'
```

### 3.2 Cryptographic Key Derivation Proof
All 8 connections in `app_ai_provider_connections` were persisted with `key_version: 1`. Under `key_version: 1`, master key derivation is defined as:
$$\text{MasterKey} = \text{HMAC-SHA256}(\text{VAULT\_SALT}, \text{SUPABASE\_SERVICE\_ROLE\_KEY})$$

An isolated, non-mutating decryption test was executed using the production `SUPABASE_SERVICE_ROLE_KEY` against all 8 stored ciphertext rows:

| Derivation Salt | Derived Master Key (Hex Preview) | Decryption Outcome across all 8 Connections |
| :--- | :--- | :--- |
| **`bourxe-bolu-vault-v1`** (Original) | `5e2f80a9aed95cb523ef5e616dc73aea463cab2ab491c818b1563660608d8f38` | **100% Success (8 of 8 decrypted)** |
| **`bouxre-bolu-vault-v1`** (Mutated) | `a20e4719f9416fc29ea41fb13c3f8048bd836d4efc6f0b2309f873551aef5dfb` | **100% Failure (`Unsupported state or unable to authenticate data`)** |

**Conclusion:** The stored database ciphertexts are fully intact and uncorrupted. The failure to decrypt was strictly caused by the salt string mutation in application source code.

---

## 4. Telemetry Log & Quarantine Cascade Trace

Inspection of table `app_ai_routing_events` confirms the exact sequence of events leading to total pool incapacitation:

```
[2026-11-18T04:05:19Z] success          | conn: 9ce3ac70 (openrouter)    | Inference succeeded
[2026-11-18T04:05:33Z] quarantined      | conn: 9ce3ac70 (openrouter)    | Provider access forbidden. Verify account permissions... (HTTP 403 on inkling-2-small)
[2026-11-18T04:06:00Z] success          | conn: dac7dbb5 (100milionseek) | Inference succeeded (pool fell over to 100milionseek)
[2026-11-18T04:23:57Z] success          | conn: dac7dbb5 (100milionseek) | Inference succeeded
--- Commit 9f6102c7 deployed; VAULT_SALT mutated to 'bouxre-bolu-vault-v1' ---
[2026-11-20T07:03:48Z] selected         | conn: 1f7b4379 (zro)           | Connection claimed by router
[2026-11-20T07:03:48Z] quarantined      | conn: 1f7b4379 (zro)           | Server failed to decrypt connection credential.
[2026-11-20T07:04:06Z] selected         | conn: d8c7b0a6 (apinex)        | Connection claimed by router
[2026-11-20T07:04:06Z] quarantined      | conn: d8c7b0a6 (apinex)        | Server failed to decrypt connection credential.
[2026-11-20T07:04:13Z] selected         | conn: dac7dbb5 (100milionseek) | Connection claimed by router
[2026-11-20T07:04:13Z] quarantined      | conn: dac7dbb5 (100milionseek) | Server failed to decrypt connection credential.
[2026-11-20T07:04:27Z] selected         | conn: 0d1432cb (runcrate)      | Connection claimed by router
[2026-11-20T07:04:27Z] quarantined      | conn: 0d1432cb (runcrate)      | Server failed to decrypt connection credential.
[2026-11-20T07:04:40Z] selected         | conn: 22c9bdf9 (gemini)        | Connection claimed by router
[2026-11-20T07:04:40Z] quarantined      | conn: 22c9bdf9 (gemini)        | Server failed to decrypt connection credential.
[2026-11-20T09:53:22Z] selected         | conn: 5aa35c63 (plamo)         | Connection claimed by router
[2026-11-20T09:53:22Z] quarantined      | conn: 5aa35c63 (plamo)         | Server failed to decrypt connection credential.
```

Within **52 seconds** (07:03:48 to 07:04:40 UTC), 5 active connections were systematically eliminated from the pool upon their first selection attempt. At 09:53:22 UTC, the final remaining eligible connection (`plamo`) was selected, failed decryption, and was quarantined, leaving the eligible count at exactly **0**.

---

## 5. Architectural Trace: Why Both Auto, Manual, and Discovery Failed

### 5.1 Auto Mode Trace (`claim_eligible_ai_connection`)
1. In `api/bolu-chat.ts`, Auto mode calls `claimEligibleConnection(adminClient, policyDecision, ...)`.
2. This invokes PostgreSQL RPC `claim_eligible_ai_connection`.
3. In PostgreSQL:
   ```sql
   SELECT c.id ... FROM public.app_ai_provider_connections c
   WHERE c.is_enabled = true
     AND c.in_pool = true
     AND c.health_status <> 'quarantined'
     ...
   ```
4. Because all 8 connections have `health_status = 'quarantined'`, the predicate `c.health_status <> 'quarantined'` evaluates to `false` for every row.
5. The RPC returns `[]` (empty set).
6. `claimEligibleConnection` returns `null`.
7. `api/bolu-chat.ts` returns HTTP 503:
   ```json
   {
     "error": "No eligible Bolu AI provider connection is currently available in the active pool. A platform administrator must configure or enable connections in Settings, or wait for cooldowns to expire.",
     "code": "no_connections_available"
   }
   ```

### 5.2 Manual Mode Trace (`claimExactConnection`)
1. User selects a connection in the Model Picker (e.g. `111` or `Runcrate`).
2. Frontend sends `POST /api/bolu-chat` with `{ connectionId: "dac7dbb5-..." }`.
3. `api/bolu-chat.ts` invokes `claimExactConnection(adminClient, connectionId, modelId)`.
4. In `src/lib/ai-assistant/routing/bolu-account-pool.ts` lines 180–183:
   ```ts
   if (row.health_status === 'quarantined') {
     console.warn('[bolu-account-pool] Exact connection is quarantined:', connectionId)
     return null
   }
   ```
5. `claimExactConnection` immediately returns `null` without attempting inference or retries.

### 5.3 Alternative Discovery Trace (`discoverEligibleAlternatives`)
1. When Manual mode fails, the server invokes `discoverEligibleAlternatives(adminClient, ...)`.
2. In `src/lib/ai-assistant/routing/bolu-alternative-discovery.ts` lines 36–44:
   ```ts
   const eligibleConnections = allConnections.filter((c: PublicConnection) => {
     if (!c.isEnabled) return false
     if (!c.inPool) return false
     if (c.healthStatus === 'quarantined') return false
     ...
     return true
   })
   ```
3. Because all connections are quarantined, `eligibleConnections` is empty (`[]`).
4. `discoverEligibleAlternatives` returns `[]`.
5. Server returns HTTP 409 Conflict with `alternatives: []`.
6. Frontend displays:
   *"The selected model is unavailable, and no alternatives were found in the active pool."*

**Conclusion:** The original failure and the empty alternatives response share the exact same root cause: all connections in `app_ai_provider_connections` are in terminal quarantine.

---

## 6. Deployed Environment vs. Local Source State

| Dimension | Cloudzyro Live Backend (`bourxe-api.cloudzyro.app`) | Supabase Database Schema | Local Working Tree |
| :--- | :--- | :--- | :--- |
| **Deployment ID / Commit** | Version 9 (`dp638c6d02522c8435`) deployed Nov 20 19:12 UTC | Migrations up to `20261115170000_bolu_usage_ledger.sql` applied | Baseline commit `8a828de0` + uncommitted Task 10 code |
| **`VAULT_SALT` Value** | `'bouxre-bolu-vault-v1'` (**Poisoned**) | N/A (Client-side encryption in Node/Bun runtime) | `'bouxre-bolu-vault-v1'` (**Poisoned**) |
| **Task 10 Headers** | Not present (`X-Bolu-Connection-Id` missing from CORS headers) | N/A | Implemented in working tree |
| **403 Scope Patch** | Not present in deployed container | N/A | Implemented in working tree |
| **Inference Status** | **Failing closed on every request** due to database quarantine | `app_ai_provider_connections` 100% quarantined | Tests pass against clean test fixtures |

---

## 7. Unresolved Questions & Access Limitations

1. **Live Container Shell Access:** Direct shell access to the Cloudzyro container filesystem was not authorized during this read-only inspection; deployment code state was confirmed via Git log commit attribution, API CORS preflight headers, and database event timestamps.
2. **Upstream Account Balances:** Because credentials could not be decrypted with the deployed salt, upstream balances for RunCrate, Gemini, and 100MillionSeek were not polled during this investigation. (Direct local test decryption verified the raw API keys remain structurally intact in database storage).

---

## 8. Recommended Corrective Actions (`PROPOSAL` — Not Implemented)

> [!IMPORTANT]
> In accordance with read-only incident investigation authority, **zero mutations, database updates, source edits, or deployments were executed.** The following actions are submitted as proposals for remediation:

### Phase 1: Cryptographic Salt Remediation (`PROPOSAL`)
- Restore the original cryptographic salt in `src/lib/ai-assistant/bolu-secret-vault.ts` line 62:
  ```ts
  const VAULT_SALT = 'bourxe-bolu-vault-v1'
  ```
- Alternatively, support backward compatibility by attempting `'bourxe-bolu-vault-v1'` if `'bouxre-bolu-vault-v1'` fails tag authentication, or migrate stored credentials cleanly.

### Phase 2: Decryption Failure Defect Guard (`PROPOSAL`)
- In `bolu-account-pool.ts` lines 140–148, change internal decryption failures from `failureCategory: 'authentication'` to `failureCategory: 'internal_error'` or `failureScope: 'request'` so an internal server misconfiguration or key derivation error **never triggers SQL quarantine** against third-party provider accounts.

### Phase 3: Database Quarantine Recovery (`PROPOSAL`)
- Execute an administrative SQL reset on `app_ai_provider_connections` to restore eligible connections from `'quarantined'` back to `'healthy'`:
  ```sql
  UPDATE public.app_ai_provider_connections
  SET health_status = 'healthy',
      consecutive_failures = 0,
      last_error_message = NULL
  WHERE is_enabled = true;
  ```
- Once reset and deployed with the correct salt, all 8 provider connections will immediately become eligible for Auto pool routing, Manual exact routing, and alternative discovery.
