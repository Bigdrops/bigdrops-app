# BOURXE Workstream Specification: PostHog Product Analytics

- **Document Version:** 1.0.0
- **Status:** Strategic Workstream Specification (`[PROPOSAL]` / Under Review)
- **Current Repository Presence:** `[VERIFIED 0% INSTALLED]`
- **Proposed Core Module:** `src/lib/analytics/posthog.ts`
- **Governance Gate:** Gated on Phase 1 PRD Signoff and Phase 2 Account Readiness

---

## 1. Workstream Overview

PostHog is designated as the future product analytics engine for BOURXE. Its purpose is to provide the product team with behavioral visibility into how Nigerian SMEs navigate the platform, adopt new features, complete or abandon document creation workflows, and retain over 30-day cycles.

PostHog is an analytics component within the broader Product Intelligence initiative; it does not replace Sentry for error tracking, nor does it ingest financial or personal records.

---

## 2. Technical Audit Summary (Current Baseline)

A forensic audit of the repository confirmed the following:
- `[VERIFIED]` **0% Code Presence:** No `posthog-js` package is declared in `package.json` or `bun.lock`.
- `[VERIFIED]` **0% Initialization:** Zero bootstrap logic exists in `src/main.tsx` or `src/App.tsx`.
- `[VERIFIED]` **0% Instrumentation:** Zero manual `.capture()` or `.track()` calls exist in `src/`.
- `[VERIFIED]` **0% Configuration:** No `VITE_POSTHOG_*` variables exist in `.env.example` or `vite-env.d.ts`.
- `[USER-CONFIRMED]` The user owns an active PostHog account.
- `[UNKNOWN]` Ingestion region (US vs EU), project API write keys, and billing tier remain unverified.

---

## 3. Account Readiness Requirements (Phase 2 Deliverables)

Before any code integration can begin, the external PostHog account must be prepared:

### 3.1 Cloud Region Selection
- **Option A (US Cloud):** `https://us.i.posthog.com`
- **Option B (EU Cloud):** `https://eu.i.posthog.com` (Frankfurt, Germany - Recommended for GDPR data residency alignment).

### 3.2 Environment Separation Strategy
To prevent developer tests from distorting real business conversion metrics, the PostHog organization must configure two separate projects:
1. `BOURXE-Production` (Generates production write key `VITE_POSTHOG_KEY`).
2. `BOURXE-Development` (Generates development write key for local staging).

### 3.3 Account-Side Feature Configuration
- **Session Recording:** Verified **DISABLED** in project settings.
- **Autocapture:** Verified **DISABLED** or restricted to prevent raw DOM capture.
- **Data Retention:** Configured to standard 12-month rolling expiration.

---

## 4. Proposed Client Architecture & Service Wrapper

All direct interactions with PostHog must be encapsulated in a single wrapper module: `src/lib/analytics/posthog.ts`. Components, pages, and hooks must **never** import `posthog-js` directly.

```typescript
/**
 * src/lib/analytics/posthog.ts (Proposed)
 * Singleton wrapper providing typed tracking, privacy scrubbing,
 * and resilient no-op fallback behavior.
 */

import posthog from 'posthog-js'
import type { StandardEventEnvelope } from './types'

let isInitialized = false

export function initPostHog(): void {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com'

  if (!apiKey || typeof window === 'undefined') return

  // Check consent from localStorage
  const consent = window.localStorage.getItem('bouxre_cookie_consent')
  if (consent === 'declined') return

  posthog.init(apiKey, {
    api_host: apiHost,
    autocapture: false,                  // Disabled for strict financial privacy
    capture_pageview: false,             // Managed via router transitions
    capture_pageleave: true,
    disable_session_recording: true,     // Permanently disabled
    mask_all_text: true,
    opt_out_capturing_by_default: consent !== 'accepted',
    loaded: () => {
      isInitialized = true
    }
  })
}

export function identifyUser(userId: string): void {
  if (!isInitialized) return
  posthog.identify(userId) // Opaque Supabase Auth UUID
}

export function resetUser(): void {
  if (!isInitialized) return
  posthog.reset() // Flushes cache, generates fresh anonymous ID
}

export function setTenantGroup(tenantId: string | null): void {
  if (!isInitialized || !tenantId) return
  posthog.group('tenant', tenantId)
}

export function trackEvent<T extends Record<string, unknown>>(
  eventName: string,
  properties?: T
): void {
  if (!isInitialized) return

  const sanitized = scrubAnalyticsPayload(properties || {})
  const envelope: StandardEventEnvelope = {
    ...sanitized,
    app_version: __APP_VERSION__ || '2.0.0',
    environment: import.meta.env.MODE as any,
    platform: window.Capacitor ? 'android' : 'web',
    timestamp: new Date().toISOString(),
    is_authenticated: Boolean(posthog.get_distinct_id()),
    distinct_id: posthog.get_distinct_id(),
    tenant_id: posthog.get_group_id('tenant') || null,
    current_route: window.location.pathname
  }

  posthog.capture(eventName, envelope)
}
```

---

## 5. Unresolved Decisions Requiring Product Owner Signoff

1. **Host Ingestion Region:** Which cloud region does the user's existing account reside in (US vs EU)?
2. **Environment Separation:** Authorize creating two distinct projects (`BOURXE-Prod` and `BOURXE-Dev`).
3. **Session Replay Policy:** Confirm that Session Replay remains permanently disabled.
4. **Activation Definition:** Confirm that activation is defined as issuing at least one document within 7 days.
