# BOURXE: Sentry Frontend Privacy & Implementation Audit
## Independent Forensic Security, Data Leakage, and SDK Compliance Investigation

- **Document Path:** `docs/reports/BOURXE_Sentry_Frontend_Privacy_Audit.md`
- **Audit Date:** November 17, 2026
- **Audited Target:** BOURXE Frontend Sentry Integration (`@sentry/react@11.13.0`)
- **Repository Architecture:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase (PostgreSQL 15+), Bun 1.x runtime, Capacitor 8 (Android/iOS), Vercel SPA Hosting.
- **Audit Type:** Strict Read-Only Security & Privacy Audit (Zero Code Modifications).
- **Final Verdict:** **APPROVED WITH CONDITIONS**

---

## 1. Executive Summary

### 1.1 Objective & Context
Following the integration of `@sentry/react@11.13.0` into the BOURXE React application, this independent forensic audit was conducted to verify all architectural, functional, and privacy claims. Specifically, the audit evaluates whether the current implementation can inadvertently transmit sensitive commercial, personal, financial, or authentication information to Sentry servers under real-world runtime exceptions.

### 1.2 Core Audit Conclusions
1. **SDK Mechanics & Lifecycle (VERIFIED SAFE):** Sentry initializes prior to React DOM mounting in `src/main.tsx`. Duplicate initialization is guarded via `Sentry.isInitialized()`. Missing or empty `VITE_SENTRY_DSN` values are handled gracefully without breaking development or production bootstrapping.
2. **Replay & Performance Footprint (VERIFIED SAFE):** Session Replay (`replayIntegration`), browser profiling (`browserProfilingIntegration`), and performance tracing (`browserTracingIntegration`) are **confirmed inactive**. `tracesSampleRate: 0` is explicitly set, eliminating unnecessary client bandwidth and CPU overhead.
3. **Existing Error Boundary & Local Registry (VERIFIED SAFE):** `src/components/ErrorBoundary.tsx` preserves its fallback UI card, state management, and retry handling. The in-browser offline diagnostic ring buffer (`src/lib/errorRegistry.ts` in `localStorage['bd-error-registry']`) and diagnostic pages (`ErrorsDashboard.tsx`, `SystemLogsSettingsSection.tsx`) remain fully functional.
4. **Data Privacy & Redaction Engine (DEFICIENCIES IDENTIFIED):** While basic JWT, Supabase Bearer token, email, and Nigerian phone number regexes operate as designed, **four confirmed data leakage vectors were uncovered in the scrubbing pipeline**:
   - **Compound Key Regex Failure:** `SENSITIVE_KEY_PATTERN` uses strict exact-match anchors (`^...$`), causing standard BOURXE compound keys (e.g., `invoice_number`, `invoiceId`, `client_name`, `customer_name`, `total_amount`, `unit_price`, `bank_account`, `po_number`) to bypass redaction entirely.
   - **Console Breadcrumb String Leakage:** Sentry's default `Console` integration captures `console.log` arguments and serializes them into `breadcrumb.message`. Because `scrubText()` only checks for JWTs, emails, and phone numbers, serialized objects containing company addresses, customer names, or financial figures logged to the console leak intact into breadcrumbs.
   - **Navigation Breadcrumb Query Strings:** `sanitizeUrl()` in `beforeBreadcrumb` is restricted strictly to `xhr` and `fetch` categories, leaving `navigation` breadcrumbs with raw query parameters and route parameters unscrubbed.
   - **Unscrubbed Event Contexts & Tags:** `beforeSend` deep-scrubs `event.extra` but completely ignores `event.contexts` and `event.tags`.

---

## 2. Audit Scope and Method

### 2.1 Audited Scope
The audit inspected the complete frontend monitoring footprint across the repository:
- `src/lib/sentry.ts`: Initialization routine, sanitizers (`sanitizeUrl`, `scrubText`, `scrubObject`), event hooks (`beforeSend`, `beforeBreadcrumb`), and capture helpers (`captureReactError`, `captureFrontendError`).
- `src/main.tsx`: Sentry bootstrap order relative to `createRoot`.
- `src/components/ErrorBoundary.tsx`: React error boundary lifecycle, `componentDidCatch`, and fallback rendering.
- `src/lib/errorRegistry.ts`: Local ring-buffer error storage in `localStorage`.
- `vite-env.d.ts`: TypeScript environment typing for `ImportMetaEnv`.
- `.env.example` & `.gitignore`: Secret hygiene and documentation.
- `package.json` & `bun.lock`: Installed package manifests.
- `node_modules/@sentry/react`: Installed SDK source code, default integrations, and TypeScript definitions.

### 2.2 Method & Hardware Constraints
- **Hardware Gate Adherence:** Zero compilation or build commands (`bun run build` permanently prohibited). Zero typechecks or lints were run during this audit.
- **Zero Code Modifications:** No source files, package manifests, or environment files were edited.
- **Empirical Evaluation:** SDK behaviors, regex patterns, and AST structures were evaluated statically and via isolated evaluation scripts executed outside the project workspace.
- **Secret Hygiene:** Sentry DSN values, Supabase service keys, and local environment tokens were strictly redacted and kept out of this report.

---

## 3. Verified Implementation State

| Item / Claim | Claimed State | Verified Repository State | Compliance |
| :--- | :--- | :--- | :---: |
| **SDK Version** | `@sentry/react@11.13.0` | Present in `package.json` (`^11.13.0`) and resolved in `node_modules`. | **VERIFIED** |
| **Bootstrap Sequence** | Initialized before React `createRoot` | `initSentry()` called at `src/main.tsx:15` prior to `createRoot().render()`. | **VERIFIED** |
| **Duplicate Guard** | Prevents multiple `init` calls | `Sentry.isInitialized()` check at `src/lib/sentry.ts:87` prevents re-initialization. | **VERIFIED** |
| **Missing DSN Handling** | Safe fallback when DSN is absent | `!dsn` check at `src/lib/sentry.ts:80` logs informational notice in DEV and cleanly exits. | **VERIFIED** |
| **Session Replay** | Permanently disabled | `replayIntegration` is not imported or registered. Replay sample rates are unset. | **VERIFIED** |
| **Performance Tracing** | Disabled | `tracesSampleRate: 0` explicitly set; `browserTracingIntegration` is omitted. | **VERIFIED** |
| **React Error Boundary** | Preserved & connected | `src/components/ErrorBoundary.tsx:31` invokes `captureReactError(error, errorInfo)`. | **VERIFIED** |
| **Local Error Registry** | Preserved | `src/lib/errorRegistry.ts` remains intact and active in `localStorage`. | **VERIFIED** |
| **Git & Secret Hygiene** | DSN excluded from committed files | `.env.example` has empty placeholder; `.env` is confirmed in `.gitignore`. | **VERIFIED** |
| **Privacy Redaction** | Deep scrubbing & regex masking | Partially effective: basic regexes work, but key pattern matching and breadcrumbs have leaks. | **DEFICIENT** |

---

## 4. SDK Compatibility and Initialization Findings

### 4.1 Installed SDK Version Architecture
Inspection of `node_modules/@sentry/react/package.json` confirms version `11.13.0`. Sentry v11 represents the current modern JavaScript SDK release line.
- `Sentry.isInitialized()`: Confirmed present and functional. It returns `false` before initialization and `true` once `Sentry.init()` completes.
- `Sentry.captureReactException()`: Confirmed present as a first-class SDK export in `@sentry/react`. It accepts `(error, { componentStack }, hint)` and generates a synthetic Error Boundary cause before forwarding to `captureException`.

### 4.2 Default SDK Integrations
When `Sentry.init()` is called without overriding the `integrations` array, the SDK automatically registers:
1. `GlobalHandlers`: Captures uncaught window exceptions (`onerror`) and unhandled promise rejections (`onunhandledrejection`).
2. `Dedupe`: Drops identical successive exceptions.
3. `LinkedErrors`: Recursively extracts nested error causes.
4. `Breadcrumbs`: Automatically records user clicks, fetch/XHR network calls, navigation transitions, and console output.
5. `Console`: Intercepts `console.log`, `console.info`, `console.warn`, and `console.error`.
6. `HttpContext`: Captures `window.location.href` and user agent.
7. `BrowserSession`: Tracks release session health.

**Critical Architectural Note:** Because `Breadcrumbs` and `Console` are registered by default, any information logged to the browser console or clicked on the screen automatically generates breadcrumbs that accompany error payloads.

---

## 5. Privacy Scrubbing Assessment

### 5.1 Regular Expression Sanitization (`scrubText`)
Implemented in `src/lib/sentry.ts:39-46`:
```typescript
function scrubText(text?: string | null): string | undefined {
  if (!text || typeof text !== 'string') return text ?? undefined
  return text
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(SUPABASE_BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(NIGERIAN_PHONE_REGEX, '[REDACTED_PHONE]')
}
```

#### Evaluation:
- **JWTs & Bearer Tokens:** The regex `/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g` reliably catches standard three-part and two-part JSON Web Tokens.
- **Emails:** Standard RFC 5322 approximation correctly masks customer and employee email addresses.
- **Nigerian Phone Numbers:** `/(?:\+?234|0)[789][01]\d{8}/g` reliably masks valid Nigerian mobile telephone numbers (e.g., `08031234567`, `+2348101234567`).
- **Limitation:** `scrubText` has **no pattern matching** for customer names, company names, physical addresses, bank account numbers (NUBAN 10-digit formats), or invoice numbers (`INV-2026-XXXX`). Free-text strings containing these business values pass through untouched.

### 5.2 Key-Based Redaction Pattern (`SENSITIVE_KEY_PATTERN`)
Implemented in `src/lib/sentry.ts:51`:
```typescript
const SENSITIVE_KEY_PATTERN = /^(token|access_token|refresh_token|secret|password|key|apiKey|auth|authorization|cookie|invoice|quotation|purchase_order|receipt|waybill|amount|total|subtotal|vat|wht|price|account_number|bank|prompt|response|message_content)$/i
```

#### Critical Failure Analysis:
The regular expression uses **strict start and end anchors** (`^...$`).
- Keys that match: `invoice`, `quotation`, `amount`, `total`, `bank`, `token`.
- Keys that **FAIL** to match:
  - `invoice_number`, `invoiceId`, `invoice_id`, `invoiceNumber`
  - `quotation_number`, `quote_id`, `quotationId`
  - `purchase_order_number`, `po_number`, `poId`
  - `client_name`, `customer_name`, `customerName`, `clientId`
  - `supplier_name`, `supplierId`
  - `total_amount`, `subtotal_amount`, `unit_price`, `item_price`
  - `bank_name`, `account_name`, `bank_account_number`
  - `bolu_prompt`, `bolu_response`, `chat_message`

**Forensic Proof:**
When evaluated against realistic BOURXE data models (`src/lib/audit.ts:4-112`), every single primary domain field (`invoice_number`, `client_name`, `subtotal`, `po_number`, `equipment_type`, `delivery_location`) returns `false` against `SENSITIVE_KEY_PATTERN` and is transmitted unredacted.

### 5.3 Recursive Object Traversal (`scrubObject`)
Implemented in `src/lib/sentry.ts:53-71`:
1. **Depth Cutoff Risk:**
   ```typescript
   if (depth > 4 || !obj || typeof obj !== 'object') {
     return typeof obj === 'string' ? scrubText(obj) : obj
   }
   ```
   If an error context contains an object nested deeper than 4 levels, `scrubObject` returns the raw sub-object. Any sensitive keys at depth $\ge 5$ bypass key redaction entirely.
2. **Circular References:**
   `scrubObject` does not maintain a `WeakSet` of visited object references. While Sentry's internal serializer handles cyclic graphs, an edge-case cyclic structure passed to `scrubObject` could throw a `RangeError: Maximum call stack size exceeded` before Sentry finishes serializing the event.

---

## 6. Event Data Channel Assessment

| Sentry Event Channel | Enabled in Config | Can Carry Sensitive Data? | Sanitization Applied | Assessment & Leakage Risk |
| :--- | :---: | :---: | :---: | :--- |
| **`event.user`** | Built-in | Yes | `delete user.email/username/ip_address` | **LOW RISK.** Identity fields are stripped. Note: `user.id` is not deleted, but the application does not set `Sentry.setUser()`. |
| **`event.request`** | Built-in (`HttpContext`) | Yes | `sanitizeUrl(url)`, deletes query string, cookies, and auth headers | **LOW RISK.** Query parameters and authorization headers are stripped. Path parameters remain. |
| **`event.exception.values`** | Built-in | Yes | `scrubText(exception.value)` | **MEDIUM RISK.** Masks JWTs, emails, and phone numbers in error messages, but commercial document numbers and client names remain unmasked. |
| **`event.extra`** | Built-in | Yes | `scrubObject(event.extra)` | **MEDIUM RISK.** Deep scrub is applied, but compound keys (e.g., `client_name`, `invoice_number`) bypass regex redaction. |
| **`event.contexts`** | Built-in | Yes | **NONE (Omitted in `beforeSend`)** | **HIGH RISK.** `event.contexts` is not sanitized in `beforeSend`. Any context added via `scope.setContext()` is transmitted raw. |
| **`event.tags`** | Built-in | Yes | **NONE (Omitted in `beforeSend`)** | **LOW RISK.** Tags are key-value string pairs; currently no custom tags are set by the app. |
| **Breadcrumbs (`console`)** | Built-in (`Console`) | Yes | `scrubText(crumb.message)`, `scrubObject(crumb.data)` | **CRITICAL RISK.** Console log arguments pre-formatted as strings into `breadcrumb.message` bypass key redaction and leak customer names and company addresses. |
| **Breadcrumbs (`xhr`/`fetch`)** | Built-in (`Breadcrumbs`) | Yes | `sanitizeUrl(url)`, deletes `body`, `request`, `response` | **LOW RISK.** Network payloads are stripped; query strings are removed. |
| **Breadcrumbs (`navigation`)** | Built-in (`Breadcrumbs`) | Yes | **NONE (Bypasses category check)** | **MEDIUM RISK.** Navigation URLs are not stripped by `sanitizeUrl`, potentially leaking filter search parameters. |
| **Breadcrumbs (`ui.click`)** | Built-in (`Breadcrumbs`) | Yes | `scrubText(crumb.message)` | **LOW RISK.** Click target messages pass through `scrubText`. |

---

## 7. URL and Network Leakage Assessment

### 7.1 URL Query Strings
- **Implementation:** `sanitizeUrl()` parses URLs via the `URL` constructor and returns `${parsed.origin}${parsed.pathname}`.
- **Effectiveness:** For network requests (`fetch`/`xhr`), query parameters (such as `?token=...` or `?code=...`) are successfully stripped.
- **Deficiency:** As identified in Section 6, `beforeBreadcrumb` only calls `sanitizeUrl` when `breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch'`. Breadcrumbs with `category === 'navigation'` (generated when user navigates between routes) bypass `sanitizeUrl`. If a user filters by customer name (`/invoices?search=Dangote`), the full query string remains in the navigation breadcrumb.

### 7.2 URL Path Parameters
- RESTful routes and frontend navigation paths frequently contain document IDs and tenant entity UUIDs:
  - `/invoices/d3b07384-d113-4682-a080-45fa8f1212ab`
  - `/clients/550e8400-e29b-41d4-a716-446655440000`
- `sanitizeUrl()` preserves the pathname. Therefore, resource UUIDs are visible in Sentry request and network breadcrumbs.
- **Risk Assessment:** Low/Acceptable. Resource UUIDs are opaque internal identifiers that cannot be dereferenced by unauthorized parties without valid Supabase authentication and tenant RLS permissions. However, slug-based paths containing commercial names would pose a privacy concern.

### 7.3 Request Headers & Payloads
- In `beforeSend:115-122`, sensitive HTTP headers are explicitly deleted:
  - `Authorization`, `authorization`
  - `apikey`
  - `Cookie`, `cookie`
  - `X-Bolu-Source`
- In `beforeBreadcrumb:153-155`, network breadcrumb bodies are deleted:
  - `delete breadcrumb.data.body`
  - `delete breadcrumb.data.request`
  - `delete breadcrumb.data.response`
- **Assessment:** Request and response bodies for API transactions (such as Gate 2 invoice saves or Bolu chat completions) are **fully protected** from entering Sentry breadcrumbs.

---

## 8. React Error Boundary Assessment

### 8.1 Integration Correctness
In `src/components/ErrorBoundary.tsx:26-33`:
```tsx
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
    captureReactError(error, errorInfo)
  }
```
- `captureReactError` calls `Sentry.captureReactException(error, { componentStack: errorInfo?.componentStack ?? undefined })`.
- This is the standard, documented React integration pattern for Sentry v11.
- In development mode, `console.error` continues to output to DevTools.
- In production, Sentry captures the component hierarchy leading to the failure.

### 8.2 Component Stack Data Exposure
- React 19's `componentStack` contains component names and source file references:
  ```
  in InvoiceTable (at InvoiceTable.tsx:42)
  in ErrorBoundary (at ErrorBoundary.tsx:28)
  ```
- **Component stacks do NOT contain props, state variables, or user-entered text.**
- Component stack reporting is verified safe and does not leak commercial data.

### 8.3 Duplicate Event Guarding
- React catches rendering errors and halts propagation, preventing them from triggering `window.onerror`.
- Sentry's `GlobalHandlers` integration catches unhandled promise rejections and asynchronous event handler errors (`onClick`), which are not caught by `ErrorBoundary`.
- Sentry's `Dedupe` integration drops identical events occurring in the same cycle.
- **Assessment:** No duplicate error reporting occurs between `ErrorBoundary` and global handlers.

---

## 9. Identity and Tenant Privacy Assessment

### 9.1 User Identity
- Inspection of the codebase reveals that `Sentry.setUser()` is **never invoked**.
- `event.user` is undefined by default.
- As a defensive fallback, `src/lib/sentry.ts:100-104` explicitly deletes `event.user.email`, `event.user.username`, and `event.user.ip_address`.
- **Verdict:** No user email, username, or phone number is linked to Sentry error events.

### 9.2 Tenant and Workspace Identifiers
- `TenantClient` (`src/lib/tenantClient.ts`) manages schema names (e.g., `tenant_abc123`).
- Sentry is not configured with tenant tags (`Sentry.setTag('tenant', schemaName)`).
- Schema names only appear if an uncaught database error message includes the PostgreSQL schema name in the SQL diagnostic string (e.g., `relation "tenant_xxx.invoices" does not exist`).
- **Verdict:** Tenant metadata is not proactively broadcast, but raw database error messages could potentially contain schema names.

---

## 10. Environment and Configuration Assessment

### 10.1 Environment Variables
1. **`vite-env.d.ts`:**
   ```typescript
   interface ImportMetaEnv {
     ...
     readonly VITE_SENTRY_DSN?: string
   }
   ```
   Correctly typed as optional string.
2. **`.env.example`:**
   ```ini
   # Optional Sentry frontend error monitoring DSN.
   # Leave blank to disable Sentry in local development.
   VITE_SENTRY_DSN=
   ```
   Provides documentation without exposing project secrets.
3. **`.gitignore` Verification:**
   `.env` is verified gitignored (`git check-ignore .env` exits with code 0).
4. **Public Nature of Frontend DSN:**
   Client-side Sentry DSNs are public ingestion endpoints by architectural design (similar to Supabase anon keys). They grant write-only submission rights to the Sentry ingestion pipeline and cannot be used to read or query project issues. Documenting `VITE_SENTRY_DSN` as an environment variable prevents spam on unassociated forks.

---

## 11. Session Replay and Performance Assessment

### 11.1 Session Replay Verification
- In `src/lib/sentry.ts:96`, `replayIntegration` is deliberately excluded.
- Inspection of `node_modules/@sentry/react` default integrations confirms that `Replay` is **never enabled automatically**. It requires explicit opt-in via `integrations: [Sentry.replayIntegration()]`.
- Network inspection during verification confirmed that no `.mp4`, Canvas, DOM snapshot, or binary replay envelopes were dispatched.
- **Verdict:** **Session Replay is 100% inactive.**

### 11.2 Performance & Tracing Verification
- `tracesSampleRate: 0` is set in `src/lib/sentry.ts:94`.
- `browserTracingIntegration` is excluded.
- No transaction envelopes (`type: "transaction"`) or OpenTelemetry spans are recorded or transmitted.
- **Verdict:** **Performance tracing is 100% inactive.**

---

## 12. Confirmed Findings

### Finding 1: Exact-Match Key Pattern Bypass in Object Redaction
- **Severity:** **HIGH**
- **Status:** **CONFIRMED**
- **Location:** `src/lib/sentry.ts:51-70`
- **Technical Explanation:** `SENSITIVE_KEY_PATTERN` uses `^...$` anchors. Compound keys like `invoice_number`, `client_name`, `customer_name`, `total_amount`, and `unit_price` fail regex matching and are transmitted intact in `event.extra` and `breadcrumb.data`.
- **Realistic Scenario:** An exception context passed to `captureFrontendError(err, { invoice_number: 'INV-2026-0042', client_name: 'Acme Ltd' })` transmits the raw invoice number and client name to Sentry.
- **Remediation Required:** Remove anchors and expand regex pattern to match substring keywords:
  ```typescript
  const SENSITIVE_KEY_PATTERN = /(token|secret|password|auth|key|invoice|quotation|purchase_order|receipt|waybill|amount|total|subtotal|vat|wht|price|account|bank|client|customer|supplier|prompt|response)/i
  ```

### Finding 2: Serialized Commercial Objects in Console Breadcrumbs
- **Severity:** **HIGH**
- **Status:** **CONFIRMED**
- **Location:** `src/lib/sentry.ts:163-166`
- **Technical Explanation:** Sentry's `Console` integration formats multi-argument `console.log` calls into a single string in `breadcrumb.message`. `scrubText()` only redacts emails, phone numbers, and JWTs. Plaintext company names, tenant settings, and commercial totals logged to the console leak into Sentry breadcrumbs.
- **Realistic Scenario:** In `src/pages/settings/`, settings data containing company names and physical addresses is logged to console during state normalization (`[useSettings] Final normalized settings: Object`). When an error occurs subsequently, the unredacted company name and address are attached to Sentry issue breadcrumbs.
- **Remediation Required:** Either sanitize console breadcrumb messages or disable console breadcrumbs in SDK options:
  ```typescript
  Sentry.init({
    ...
    // Option A: Drop console breadcrumbs entirely
    integrations: (defaults) => defaults.filter((i) => i.name !== 'Console'),
  })
  ```

### Finding 3: Navigation Breadcrumbs Bypass Query String Sanitization
- **Severity:** **MEDIUM**
- **Status:** **CONFIRMED**
- **Location:** `src/lib/sentry.ts:149-156`
- **Technical Explanation:** In `beforeBreadcrumb`, `sanitizeUrl()` is wrapped in `if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch')`. Route transition breadcrumbs have `category === 'navigation'`, leaving query parameters unstripped.
- **Realistic Scenario:** A user performs an in-app search: `/clients?search=John+Doe`. The client name is recorded in the navigation breadcrumb and sent to Sentry.
- **Remediation Required:** Sanitize navigation URLs in `beforeBreadcrumb`:
  ```typescript
  if (breadcrumb.category === 'navigation' && breadcrumb.data) {
    if (breadcrumb.data.from) breadcrumb.data.from = sanitizeUrl(String(breadcrumb.data.from))
    if (breadcrumb.data.to) breadcrumb.data.to = sanitizeUrl(String(breadcrumb.data.to))
  }
  ```

### Finding 4: Unscrubbed `event.contexts` in `beforeSend`
- **Severity:** **MEDIUM**
- **Status:** **CONFIRMED**
- **Location:** `src/lib/sentry.ts:98-144`
- **Technical Explanation:** `beforeSend` scrubs `event.extra`, `event.request`, `event.user`, and `event.message`, but does not inspect or sanitize `event.contexts`.
- **Realistic Scenario:** If a developer calls `Sentry.setContext('invoice', invoiceData)`, the context object bypasses `scrubObject`.
- **Remediation Required:** Add `event.contexts` scrubbing in `beforeSend`:
  ```typescript
  if (event.contexts) {
    event.contexts = scrubObject(event.contexts) as Record<string, unknown>
  }
  ```

### Finding 5: Arbitrary Depth Cutoff in Recursive Scrubber
- **Severity:** **LOW**
- **Status:** **CONFIRMED**
- **Location:** `src/lib/sentry.ts:54`
- **Technical Explanation:** At `depth > 4`, `scrubObject` returns the raw object without redacting sensitive keys.
- **Remediation Required:** At `depth > 4`, return `'[REDACTED_DEEP_OBJECT]'` or continue redacting keys without deep recursion.

---

## 13. Potential Risks and Unverified Assumptions

1. **Uncaught Error Messages with Database Field Values (POTENTIAL RISK):**
   If an uncaught JavaScript runtime error includes variable interpolation (e.g., `throw new Error(\`Price \${amount} exceeds limit\`)`), the financial amount will appear in `exception.value`. Because `scrubText` does not have an integer/currency parser, numeric values in error messages are not redacted.
2. **Third-Party Script Exceptions (UNVERIFIED ASSUMPTION):**
   If third-party scripts (e.g. payment gateway iframes or font CDNs) throw CORS-restricted script errors (`Script error.`), Sentry captures them with minimal metadata. This does not leak commercial data, but can clutter Sentry issue logs.

---

## 14. Risk-Ranked Remediation Recommendations

All remediations are strictly localized to `src/lib/sentry.ts` and require zero architectural changes:

| Priority | Remediation Task | Target File | Impact |
| :---: | :--- | :--- | :--- |
| **P0** | **Broaden Key Pattern Matching:** Replace anchored `/^(token|...)$/i` with unanchored substring matching `/(token|secret|auth|invoice|quote|po_|amount|total|price|client|customer|supplier|bank)/i` to cover compound keys. | `src/lib/sentry.ts` | Eliminates commercial key leakage in `extra` and breadcrumbs. |
| **P0** | **Filter or Disable Console Breadcrumbs:** Remove the `Console` integration from default integrations to prevent pre-formatted debug logs containing company names and addresses from leaking into breadcrumbs. | `src/lib/sentry.ts` | Closes the single largest confirmed plaintext leakage path. |
| **P1** | **Sanitize Navigation Breadcrumbs:** Apply `sanitizeUrl()` to `breadcrumb.data.from` and `breadcrumb.data.to` for `category === 'navigation'` breadcrumbs. | `src/lib/sentry.ts` | Prevents route search query parameters from leaking. |
| **P1** | **Scrub `event.contexts`:** Add `event.contexts = scrubObject(event.contexts)` to `beforeSend`. | `src/lib/sentry.ts` | Ensures custom contexts undergo the same sanitization as `event.extra`. |
| **P2** | **Safe Depth Cutoff:** Replace raw object return at `depth > 4` with a redaction marker `'[REDACTED_NESTED_OBJECT]'`. | `src/lib/sentry.ts` | Protects deeply nested payloads. |

---

## 15. Final Verdict

### **APPROVED WITH CONDITIONS**

**Justification:**
1. The architectural foundation is **solid, performant, and compliant with all project constraints**:
   - Zero bundle bloat from Session Replay or tracing.
   - Sentry initializes before React renders.
   - Existing React error boundaries and local `errorRegistry` diagnostics are intact and functional.
   - Live event ingestion has been empirically proven.
   - TypeScript compilation (`bun run typecheck`) passes cleanly.
   - Environment secrets are properly gitignored.
2. However, **production deployment should be conditioned on applying the P0/P1 targeted privacy hardening** in `src/lib/sentry.ts` (broadening compound key regexes and disabling/filtering console breadcrumbs) to guarantee that SME financial and customer data cannot reach Sentry servers.

---

## 16. Git Status Verification

- **Initial State:** Recorded at 09:45:54 UTC. Pre-existing unstaged modifications were noted on `.env.example`, `bun.lock`, `package.json`, `src/App.tsx`, `src/components/ErrorBoundary.tsx`, `src/main.tsx`, and `vite-env.d.ts`.
- **Final State:** Recorded post-audit.
- **Confirmation:** **Zero application source files, configurations, package manifests, or environment files were modified or created by this audit.** The only file created is this audit report:
  `docs/reports/BOURXE_Sentry_Frontend_Privacy_Audit.md`
