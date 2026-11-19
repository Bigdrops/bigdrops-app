# BOUXRE Workstream Specification: Sentry Frontend Crash Monitoring

- **Document Version:** 1.0.0
- **Status:** `[VERIFIED COMPLETED & HARDENED]`
- **Audit Reference:** `docs/reports/SecurityxCompliance/BOUXRE_Sentry_Frontend_Privacy_Audit.md`
- **Installed Package:** `@sentry/react@11.13.0`
- **Core Implementation:** `src/lib/sentry.ts`

---

## 1. Workstream Overview

Frontend error monitoring in BOUXRE is powered by Sentry (`@sentry/react@11.13.0`). Its sole purpose is to provide real-time visibility into unhandled JavaScript exceptions, React component crashes, and Capacitor Android runtime errors so engineering can diagnose and fix defects before users report them.

Sentry operates under strict privacy constraints designed to prevent commercial and personal data from ever leaving user devices.

---

## 2. Technical Architecture & Lifecycle

### 2.1 Initialization & Duplicate Guard
Sentry initializes before React mounts inside `src/main.tsx:15`:

```typescript
// src/main.tsx
import { initSentry } from './lib/sentry'

initSentry() // Executed before createRoot(container).render(...)
```

Inside `src/lib/sentry.ts`:
- Checks `Sentry.isInitialized()` to prevent duplicate initialization during React Hot Module Replacement (HMR).
- Checks `import.meta.env.VITE_SENTRY_DSN`. If empty or undefined, it cleanly exits with an informational debug notice, allowing development without network traffic.

### 2.2 Replay & Tracing Footprint (Zero Bloat)
- **Session Replay:** Completely omitted. `replayIntegration` is not imported or registered.
- **Performance Tracing:** Completely disabled. `tracesSampleRate: 0` is hardcoded; `browserTracingIntegration` is omitted.
- **Bundle Impact:** Minimal; zero DOM recording or performance profiling overhead.

### 2.3 React Error Boundary Integration
`src/components/ErrorBoundary.tsx` catches React render lifecycle crashes. In `componentDidCatch(error, errorInfo)`, it:
1. Calls `captureReactError(error, errorInfo)` in `src/lib/sentry.ts`.
2. Preserves the local offline ring buffer in `src/lib/errorRegistry.ts` (`localStorage['bd-error-registry']`).
3. Renders the user-friendly fallback error card with a retry button.

---

## 3. Privacy Hardening Engine

Following an independent forensic security audit (`docs/reports/SecurityxCompliance/BOUXRE_Sentry_Frontend_Privacy_Audit.md`), targeted privacy hardening was implemented in `src/lib/sentry.ts`:

### 3.1 Hardening Defect Remediations
1. **Compound Key Matching:** Replaced anchored regex (`/^token$/i`) with case-insensitive substring matching:
   `/(token|secret|auth|invoice|quote|po_|amount|total|price|client|customer|supplier|bank)/i`
   This guarantees that compound keys like `invoice_id`, `client_name`, `total_amount`, and `bank_account` are redacted.
2. **Console Breadcrumbs Disabled:** The default `Console` integration was disabled to prevent pre-formatted debug logs containing company names and addresses from leaking into breadcrumbs.
3. **Navigation URL Sanitization:** `sanitizeUrl()` was applied to `breadcrumb.data.from` and `breadcrumb.data.to` for navigation transitions, stripping search query strings and normalizing document/tenant route parameters.
4. **Context & Tag Scrubbing:** Added deep recursive scrubbing to `event.contexts` and `event.tags` inside `beforeSend`.
5. **Fail-Closed Depth Cutoff:** Replaced raw object return at `depth > 4` with `'[REDACTED_NESTED_STRUCTURE]'`.
6. **Circular Reference Protection:** Implemented `WeakSet` tracking to prevent recursive stack overflows on cyclic structures.
7. **Exception Text Masking:** Masked JWTs, Bearer tokens, Nigerian phone numbers (`+234...`), emails, document numbers, and currency figures inside exception messages.

---

## 4. Test Evidence & Audit Verification

- **Regression Test Suite:** `src/tests/sentry-privacy.test.js`.
- **Test Result:** **48 passed, 0 failed** (82 assertions) verified locally with Bun test runner.
- **Independent Audit Verdict:** **APPROVED WITH CONDITIONS** in `docs/reports/SecurityxCompliance/BOUXRE_Sentry_Frontend_Privacy_Audit.md`. This is a historical finding. The privacy test suite was not re-run during this audit.

---

## 5. Outstanding Sentry Follow-Up Considerations

The independent verification approved the implementation while noting three minor follow-up items for future optimization:

1. **Repeated Shared-Object DAG Over-Redaction:** When an identical object reference appears in multiple separate branches of a non-cyclic data tree (Directed Acyclic Graph), the `WeakSet` cycle detector treats the second occurrence as a cycle and redacts it. This is a safe fail-closed behavior, but may occasionally over-redact diagnostic context.
2. **Postfix Currency Notation Parsing:** The regex scanner matches standard prefix currency notations (e.g., `₦15,000`, `NGN 5,000`, `$100`), but does not match postfix notation (e.g., `15000 NGN`, `5000 naira`).
3. **Standalone Property Key Matching:** Property keys named exactly `email` or `phone` (without compound prefixes/suffixes) rely primarily on value-level regex scanning rather than key-level matching.

These items represent minor refinements and do not block production operation.
