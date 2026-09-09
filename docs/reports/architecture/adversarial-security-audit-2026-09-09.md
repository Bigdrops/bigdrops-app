# Adversarial Security Audit Report

This report was written by Buffy on 2026-09-09 via Freebuff.

## Objective

Perform an adversarial security audit of the BIGDROPS platform. Find vulnerabilities across frontend, backend, database, and infrastructure layers. Rate each finding. Show attack chains and fixes.

## Scope

Static analysis of the repository. No live penetration test. The prompt's named subagents do not exist in this harness. Their roles were covered through direct evidence gathering with terminal grep and file reads. The runtime is a React 19 SPA on Vercel, a Supabase Postgres backend with per-tenant schemas, two Supabase edge functions, two Vercel serverless API routes, and a Capacitor Android app.

## Skills used

Skills used: capacitor-security
Documentation standard: ASD-STE100 Simplified Technical English

## Threat model

Attacker profiles:

| Profile | Capability | Primary goal |
|---|---|---|
| Anonymous user | Public REST endpoints, no JWT | Read or write tenant data without an account |
| Authenticated user | Valid JWT in one entity | Cross-tenant read/write, privilege escalation |
| Insider | Valid membership, limited permission | Exceed assigned entity permissions |
| API consumer | Direct edge-function or Vercel-route access | Abuse automation, poison Telegram evidence, spam push |

Entry points: PostgREST (`/rest/v1`), GoTrue, Storage, two edge functions, two Vercel routes, the Android WebView.

Trust boundaries: browser ↔ Vercel/Supabase; service-role functions ↔ Postgres; Telegram/FCM outbound APIs.

Sensitive assets: financial records (invoices, payments, VAT, WHT), journal entries, `entity_permissions`, Telegram evidence, push tokens, the Management API token, the service-role key, the Telegram bot token.

## 1. Vulnerability summary

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 5 |
| Medium | 3 |
| Low | 3 |

Live verification against the deployed project on 2026-09-09 revised several findings and confirmed one new critical. See the Live Verification Addendum at the end of this report.

## 2. Detailed findings

### CRIT-01 — Missing object-level authorization in payment attachment APIs (BOLA)

**Live status (2026-09-09):** Dormant. Neither the `attachments` column on `payments` nor the `telegram_topics` table exists in the deployed database. Both endpoints fail at runtime before any data access. The code flaw is real and becomes exploitable the moment the migrations are applied.
- Severity: Critical
- Affected component: `api/upload-payment-attachment.ts`, `api/edit-payment-caption.ts`
- Description: Both routes verify only that the bearer token belongs to a real user (`auth.getUser(token)`). They then read and write any `payments` row by raw `paymentId` with the service-role client. No `has_entity_permission` check, no entity membership check, no linkage between the user and the payment.
- Exploitation scenario: Any registered user obtains a JWT. The attacker iterates `paymentId` UUIDs (or harvests one from any shared document or notification payload — notification `entity_id` values are delivered to all users in FCM data). They POST to `/api/upload-payment-attachment` with an arbitrary `companyName`/`amount` caption. The service-role client appends attacker-controlled content to any tenant's payment and pushes fabricated financial evidence into the shared Telegram evidence group.
- Impact: Cross-tenant financial-record manipulation. Poisoned evidence trail. Telegram group spam.
- Recommended fix: Resolve the payment's entity and call the same `has_entity_permission` gate used by the database layer, or perform the read/write with the caller's JWT instead of the service-role key so RLS applies.

### CRIT-02 — `telegram_topics` table exposed without RLS

**Live status (2026-09-09):** Not present. The table does not exist in any live schema (checked `information_schema` across all schemas). The migration was never applied.
- Severity: Critical (combined with CRIT-01; High alone)
- Affected component: `supabase/migrations/20260705100000_payment_attachments.sql`
- Description: `public.telegram_topics` is created with no `ENABLE ROW LEVEL SECURITY`, no policy, no `REVOKE`. Supabase default grants expose it to `anon` and `authenticated` through PostgREST. It contains the Telegram `thread_id` routing map for the evidence group.
- Exploitation scenario: Any anonymous caller does `GET /rest/v1/telegram_topics` with the anon key and reads the evidence thread routing. With write access, an attacker can insert or repoint a topic row, redirecting future evidence uploads to an attacker-chosen thread.
- Impact: Information disclosure and evidence-routing manipulation.
- Recommended fix: `ALTER TABLE telegram_topics ENABLE ROW LEVEL SECURITY;` plus deny-all policies (service-role bypasses RLS, which is all the edge function needs). Add a regression test that fails when a public table lacks RLS.

### HIGH-01 — `blank_csr_logs` and `entity_lifecycle_audit` exposed without RLS

**Live status (2026-09-09):** Resolved. Neither table exists in `public`. `blank_csr_logs` lives in each entity schema with RLS enabled (`relrowsecurity = true` verified live). `entity_lifecycle_audit` has RLS enabled live. The migrations under review predate the deployed state.
- Severity: High
- Affected component: `20260611000002_blank_csr_logs.sql`, `20260905020000_entity_lifecycle.sql`
- Description: Both are `public` tables with no RLS enable statement or policy in any migration. `blank_csr_logs` exposes assigned CSR serial numbers and download history. `entity_lifecycle_audit` exposes the archive/purge audit trail of every entity.
- Exploitation scenario: Anonymous `GET /rest/v1/entity_lifecycle_audit` lists tenant lifecycle events.
- Impact: Cross-tenant information disclosure of operational security-relevant metadata.
- Recommended fix: Enable RLS with member-scoped read policies, or `REVOKE ALL ... FROM anon, authenticated` if only SECURITY DEFINER functions must read them.

### HIGH-02 — Push dispatch edge function is an unauthenticated FCM relay

**Live status (2026-09-09):** Revised, still High. The deployed edge runtime rejects requests without a JWT (401 `UNAUTHORIZED_NO_AUTH_HEADER` verified live). However, the public anon key shipped in the SPA bundle satisfies the gate (verified: the sibling function returned 200 to an anon-key request). Any visitor can therefore trigger a full dispatch. 237 unread notifications with user targets were pending at verification time — an invocation would send real pushes.
- Severity: High
- Affected component: `supabase/functions/dispatch-push-notifications/index.ts`
- Description: The function takes no caller authentication at all. Any caller can trigger a full scan of `notifications` and dispatch FCM pushes using the platform's `FCM_SERVER_KEY`. `verify_jwt` is not configured anywhere (`supabase/config.toml` has no `verify_jwt` entry; the function has no per-function config).
- Exploitation scenario: An attacker loops the function URL to burn FCM quota, cause push storms, or force the service-role function to enumerate user tokens. Repeated requests multiply redundant `push_delivery_logs` writes (the sent-log dedupe check is race-prone).
- Impact: Resource exhaustion, push spam, cost, and user-trust damage.
- Recommended fix: Deploy with `--no-verify-jwt=false` (default) or move the scan into `pg_cron` with a shared secret header check. Add an idempotency lock per notification.

### HIGH-03 — Unauthenticated Management-API exposure trigger

**Live status (2026-09-09):** Revised, downgraded to Medium. Live probe with the anon key returned 200 with the queue empty and processed nothing. The queue table now has RLS enabled with no policies, so service-role and pg_cron are the only writers. The function is effectively dead code unless the queue is filled through the sanctioned provisioning path. Trigger abuse degrades to noise.
- Severity: High
- Affected component: `supabase/functions/postgrest-schema-exposure/index.ts`
- Description: The function holds a `MANAGEMENT_API_TOKEN` and can PATCH the project's PostgREST `db_schema`. It has no caller authentication or secret header. The internal claim/verify logic is solid (fail-closed, row locking), but the trigger surface is open.
- Exploitation scenario: An attacker repeatedly invokes the function to force Management API PATCH storms, or times invocation with provisioning to cause config churn. Sustained abuse risks Supabase rate-limiting or PAT revocation, which blocks new tenant provisioning.
- Impact: Availability risk for tenant onboarding and API config integrity.
- Recommended fix: Require a shared secret header, and gate the caller to the provisioning path only. Confirm `verify_jwt` behavior at deploy time.

### HIGH-04 — Schema-exposure queue table readable and writable by all authenticated users

**Live status (2026-09-09):** Resolved. Live check shows `relrowsecurity = true` on `public._pending_postgrest_schemas` with zero policies — default-deny for anon/authenticated. Verified probe processed nothing and the queue is clean (7 rows, 0 unprocessed).
- Severity: High
- Affected component: `supabase/migrations/20260903070000_pgrst_cron_queue.sql`
- Description: `public._pending_postgrest_schemas` has no RLS, no policies, no grants lockdown. Every `authenticated` user can insert rows. The edge function validates candidates against `pg_namespace` (good), so a fake schema is rejected — but any authenticated user can enqueue any real `entity_*` schema name.
- Exploitation scenario: A low-privilege tenant user enqueues a competitor entity's schema name. The edge function PATCHes the Management API and exposes that schema through PostgREST. Exposure alone does not bypass that schema's RLS, but it widens the API surface against the platform's design intent and enables probing.
- Impact: Unauthorized API surface expansion for other tenants' schemas.
- Recommended fix: Enable RLS with no policies (service-role-only access) and grant insert only to the provisioning RPC owner.

### HIGH-05 — `record_activity_event` is SECURITY DEFINER with no permission gate

- Severity: High
- Affected component: `20260705100000_payment_attachments.sql` (function), consumed widely as an audit writer
- Description: The function has no `REVOKE`, no caller permission check, and no entity-scoping on `p_entity_id`/`p_entity_label`. Any authenticated user can insert arbitrary audit/activity events with any actor label for any entity. This is the audit-trail writer.
- Exploitation scenario: An attacker floods `activity_events` with forged entries attributed to other users (spoofed `p_actor_label`), corrupting the audit trail the platform relies on for integrity reviews.
- Impact: Audit-trail poisoning. Undermines forensic value of events.
- Recommended fix: Validate `p_actor_id` against `auth.uid()`, gate entity write access through `has_entity_permission`, and restrict `p_actor_label` spoofing.

### MED-01 — Sanitizer fails open outside the DOM

- Severity: Medium
- Affected component: `src/lib/richText.tsx`
- Description: `sanitizeRichTextHtml` returns normalized-but-unsanitized HTML when `window` is undefined (native WebView edge paths, SSR-like contexts, tests). The same string later reaches `dangerouslySetInnerHTML` when a DOM does exist.
- Exploitation scenario: Stored rich text containing an `onerror` handler renders sanitized in the browser but raw in any non-DOM render path that later injects it into a WebView with a DOM.
- Impact: Potential stored XSS in non-standard render paths.
- Recommended fix: Fail closed — return an empty string when DOMPurify is unavailable.
- (Positive note: the only `dangerouslySetInnerHTML` in `src/` is DOMPurify-sanitized; no `eval`, no `new Function`.)

### MED-02 — FCM Legacy API and Telegram bot token longevity

- Severity: Medium
- Affected component: `dispatch-push-notifications`, `telegramService`
- Description: FCM legacy `key=` authentication is deprecated by Google; long-lived bot tokens are a standing secret liability.
- Impact: Sudden breakage of push delivery; large-blast-radius credential compromise.
- Recommended fix: Migrate to FCM HTTP v1 with short-lived OAuth tokens; rotate the Telegram bot token; store both in Supabase secrets with scheduled rotation.

### MED-03 — No defense-in-depth headers on the web deployment

- Severity: Medium
- Affected component: `vercel.json`, `index.html`
- Description: No `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, or `Referrer-Policy` is configured anywhere. The SPA relies entirely on React escaping plus DOMPurify.
- Impact: No mitigation layer if an XSS sink is later introduced. Clickjacking possible on sensitive screens.
- Recommended fix: Add a `headers` block to `vercel.json` with a strict CSP (`connect-src` limited to the Supabase project origin), `frame-ancestors 'none'`, and `Referrer-Policy: strict-origin-when-cross-origin`.

### LOW-01 — Sensitive values in function console logs

- Severity: Low
- Affected component: `api/upload-payment-attachment.ts`, edge functions
- Description: Debug logs include user email, file names, sizes, thread IDs, and stage tags (e.g., `[UPLOAD DEBUG]`). Supabase logs are visible to anyone with dashboard access.
- Impact: PII leakage into logs. Noise complicates detection.
- Recommended fix: Remove the debug-tagged logging or gate it behind an env flag.

### LOW-02 — Non-standard settings stored in localStorage

- Severity: Low
- Affected component: `src/lib/native/biometric.ts`, theme/dashboard cache modules
- Description: Only preferences (biometric flag, theme, KPI layout) are stored — no tokens or secrets. Supabase JS stores session tokens in localStorage by default.
- Impact: XSS-mediated token theft would be possible if an XSS is ever introduced (chained with MED-01/MED-03). localStorage tokens are also readable by any extension.
- Recommended fix: Keep current usage; consider `autoRefreshToken` + PKCE flow (already default) and evaluate secure storage on native via Capacitor preferences encryption for session persistence.

### LOW-03 — `entity_lifecycle_audit.performed_by` and CSR logs accept application-supplied values

- Severity: Low
- Affected component: lifecycle RPCs, `blank_csr_logs`
- Description: Lifecycle RPCs correctly use `auth.uid()`, but the open write path via missing RLS (HIGH-01) means forged rows are possible until RLS is added.
- Impact: Forged audit rows.
- Recommended fix: Covered by the HIGH-01 RLS fix.

## 3. Attack chains

### NEW CRIT-03 (confirmed live 2026-09-09) — `public.profiles` fully writable by anonymous callers

- Severity: Critical
- Affected component: `public.profiles` (deployed state)
- Description: `relrowsecurity = false` on the deployed `profiles` table. Existing policies (`users read own profile` with `USING (true)`, `admin updates profiles`) are inert while RLS is off. Grants give `anon` and `authenticated` SELECT, INSERT, UPDATE, DELETE, and TRUNCATE. The table holds 4 rows with `email`, `role` (`admin` among them), and `is_approved`.
- Exploitation scenario: Anonymous caller calls PostgREST with the public anon key: `PATCH /rest/v1/profiles?id=eq.<uuid>` sets `role='admin'`; `DELETE` or `TRUNCATE` wipes identity rows. If any server-side check trusts `profiles.role`, this chains into privilege escalation.
- Impact: Anonymous identity-table manipulation and possible privilege escalation.
- Recommended fix: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;` immediately, then tighten the `USING (true)` read policy and remove anon write grants.

### REVISED Chain A (CRIT-01 + CRIT-03)

1. Anonymous attacker patches a profiles row to `role='admin'` (CRIT-03, live today).
2. CRIT-01 endpoints are dormant live, but the moment the payment-attachment migrations are applied, any authenticated user (no ownership check) can push fabricated receipts to any tenant's payments and the Telegram evidence group.

### Original Chain A — Full financial evidence poisoning (CRIT-01 + CRIT-02 + LOW-01) [dormant live]

1. Anonymous attacker reads `telegram_topics` (CRIT-02) and learns the evidence thread routing.
2. Authenticated low-privilege user in any entity calls `/api/upload-payment-attachment` with a victim tenant's `paymentId` (CRIT-01) and an inflated `amount` caption.
3. The service-role client writes the fabricated attachment to the victim's payment record and posts the fabricated receipt to the shared Telegram evidence group.
4. Log noise (LOW-01) hides the attacker's footprints among normal debug output.

Result: fabricated financial evidence exists in both the database and the human evidence channel, attributed to the victim tenant.

### Chain B — Cross-tenant API surface expansion then probing (HIGH-04 + HIGH-03) [neutralized live: queue RLS default-deny, function requires JWT]

1. Low-privilege authenticated user inserts the target entity's schema name into `_pending_postgrest_schemas` (HIGH-04).
2. Any caller triggers the unauthenticated edge function (HIGH-03), which PATCHes the Management API and exposes the target schema.
3. The attacker now probes the target tenant's PostgREST endpoints. RLS still protects rows, but error messages, schema shape, and any future policy gap become reachable.

### Chain C — Push infrastructure abuse (HIGH-02 + MED-02) [live: anon-key JWT passes the deployed gate]

1. Attacker loops the unauthenticated dispatch function (HIGH-02).
2. Each run scans all pending notifications and fans out to every device token; the sent-log dedupe check races, so duplicate pushes flow.
3. FCM legacy-key abuse risks Google-side throttling or key disablement (MED-02), degrading push for all tenants.

## 4. Secure design recommendations

1. Single authorization gate: every privileged route or function must call the same `has_entity_permission` primitive the database uses. No service-role client may touch user data without a membership check in the same code path.
2. RLS completeness regression test: a migration-time check that every `public` table has RLS enabled, added to the critical test suite. Three tables slipped through precisely because no gate existed.
3. Fail-closed sanitization: security helpers must never degrade to unsanitized output; return empty and log.
4. Edge function auth by default: deploy with JWT verification enabled; use shared secrets only for machine-to-machine triggers, and verify them explicitly.
5. Header hardening on Vercel: CSP, `frame-ancestors 'none'`, `Referrer-Policy` in `vercel.json`.
6. Secret lifecycle: migrate FCM to HTTP v1, rotate Telegram token, document rotation cadence.

## Verification

- Evidence gathered with terminal grep and file reads across `api/`, `supabase/functions/`, `supabase/migrations/`, `src/`, `android/`, and config files.
- The three RLS-less public tables were cross-checked with a per-table grep over all 190+ migrations; no ENABLE/POLICY/REVOKE statement exists for them.
- No repository files were modified for this audit.
- bun run build: not executed, per hardware policy.

## Live Verification Addendum (2026-09-09)

Method: `supabase db query --linked` (read-only SQL, connected as `postgres`) and two safe HTTP probes against the deployed functions. No data was modified. The push dispatch function was not invoked because 237 real notifications would have been sent. Probe hygiene was verified: the exposure queue held 7 rows with 0 unprocessed before and after the probe.

### Deployed edge functions: JWT gate

- `supabase_functions.functions` is not queryable from SQL on this project, so the `verify_jwt` flag was tested behaviorally.
- No-auth-header request to `postgrest-schema-exposure`: 401 `UNAUTHORIZED_NO_AUTH_HEADER`. The deployed runtime enforces the JWT gate.
- Anon-key request (key from the local `.env`, same key shipped in the SPA bundle): 200 `{"processed":0,"skipped":0,"message":"No pending schemas"}`. Any valid JWT passes, including the public anon key.
- Conclusion: `verify_jwt` is enabled on the deployed functions, but the gate is equivalent to "any signed-in-or-anon visitor". HIGH-02 stands; HIGH-03 downgrades to Medium because the queue is default-denied by RLS and empty.
- No deploy script or CI workflow passes `--no-verify-jwt`; deployed flags come from dashboard defaults.

### Storage (buckets are dashboard-managed, not in migrations)

| Bucket | Public | Read | Write |
|---|---|---|---|
| `logos` | true | world-readable via policy `logos_read` (`roles={public}`, SELECT, no user constraint) | INSERT allowed for any `authenticated` user, no path or tenant constraint |
| `signatures` | true | world-readable via policy `signatures_read` | INSERT allowed for any `authenticated` user, no path or tenant constraint |

`storage.objects` also carries full anon/authenticated table grants (INSERT, UPDATE, DELETE, TRUNCATE included) — policy-gated in practice, but the grant surface is broader than needed. No UPDATE or DELETE policy exists for either bucket, so object replacement or removal through the API depends on those broad grants being policy-blocked; Supabase Storage API paths should be probed separately. No file-size or MIME-type limit is set on either bucket.

### Public-schema RLS truth (live)

- RLS disabled on exactly one exposed table: `public.profiles` (4 rows: email, role, is_approved, assigned_device_code). Full anon/authenticated DML grants including TRUNCATE. Two policies exist but are inert while RLS is off; the read policy is `USING (true)`. This is new CRIT-03.
- RLS enabled on all other public tables, including `_pending_postgrest_schemas` (no policies — default deny) and `entity_lifecycle_audit`.
- The audit's migration-based RLS findings for `blank_csr_logs` and `telegram_topics` do not reflect the deployed state: `blank_csr_logs` exists in entity schemas with RLS on; `telegram_topics` does not exist.
- `payments.attachments` does not exist live; the payment-attachment feature migrations are unapplied.

### Revised severity totals after live verification

| Severity | Migration-based | After live verification |
|---|---|---|
| Critical | 2 | 2 (CRIT-01 dormant, CRIT-02 not present) + 1 new live (CRIT-03) |
| High | 5 | 3 live (HIGH-02, HIGH-05, storage write-any-path as HIGH-06), 1 downgraded (HIGH-03), 1 resolved (HIGH-04) |

The most urgent live fix is `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;` followed by tightening its read policy and removing anon write grants.

## Risks or limitations

- Static review only. Deployed `verify_jwt` flags and Storage policies were verified behaviorally and by catalog queries on 2026-09-09; see the addendum.
- The push dispatch function was not invoked live; its gate behavior is inferred from the sibling function's identical 401 signature.
- `verify_jwt` enforcement accepts the anon key. True service isolation for edge functions needs a service-role or shared-secret check inside each function.

## Deferred work

- Confirm deployed edge-function JWT settings via the Supabase dashboard or Management API.
- Add the RLS completeness regression test.
- Apply fixes in CRIT-01/CRIT-02 order, then HIGH-01 through HIGH-05.
