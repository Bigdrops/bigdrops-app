# BOUXRE: Unified Observability & Telemetry Architecture

- **Document Version:** 1.0.0
- **Status:** Architectural Blueprint (`[PROPOSAL]` / Under Review)
- **Scope:** System Boundaries, Integration Topology, Network Routing, and Separation of Concerns

---

## 1. Unified Architectural Topology

```mermaid
flowchart TD
    subgraph Client Application [React 19 SPA & Capacitor 8 Mobile WebView]
        Main[src/main.tsx] -->|1. Init| SentryInit[initSentry]
        Main -.->|PROPOSED: 2. Init| PHInit[initPostHog - Conditional]
        Main -->|Render| AppRoot[src/App.tsx]

        AppRoot --> EB[src/components/ErrorBoundary.tsx]
        AppRoot --> Banner[src/components/compliance/CookieConsentBanner.tsx]
        AppRoot --> EntityCtx[src/lib/tenant/entityContext.tsx]

        EB -->|Runtime Crash| SentryLib[src/lib/sentry.ts]
        Feedback[src/lib/feedback.ts] -->|Diagnostic Errors| LocalReg[src/lib/errorRegistry.ts]

        Banner -->|Consent Choice| LocalStorage[localStorage: bouxre_cookie_consent]
        LocalStorage -.->|PROPOSED Gate Dispatch| PHLib[src/lib/analytics/posthog.ts]

        UI[User Workflows & Actions] -.->|PROPOSED: trackEvent| PHLib
        UI -->|Document Mutations| AuditTrail[src/lib/audit.ts]
    end

    subgraph Backend Services [Cloudzyro VPS - Persistent Bun Server]
        Server[server.ts] --> RouteChat[/api/bolu-chat/]
        Server --> RouteSave[/api/bolu-save/]
        Server --> RouteConfig[/api/bolu-provider-config/]
        Server --> Ledger[src/lib/ai-assistant/bolu-usage-ledger.ts]
    end

    subgraph Database Layer [Supabase PostgreSQL 15+]
        SupaAuth[Supabase Auth: users & sessions]
        TenantSchemas[Multi-Tenant Schemas: invoices, quotations, audit_logs]
        CentralTables[Central Tables: app_ai_usage_ledger, entities]
    end

    subgraph External Observability Clouds
        SentryCloud[Sentry.io Cloud - Crash Reporting]
        PHCloud[PostHog.com Cloud - Product Analytics]
    end

    SentryLib -->|Sanitized POST /envelope/| SentryCloud
    PHLib -.->|PROPOSED: Sanitized POST /capture/| PHCloud
    AuditTrail -->|Direct Insert| TenantSchemas
    Ledger -->|Direct Insert| CentralTables
    EntityCtx -.->|PROPOSED: Sync Group ID| PHLib
    SupaAuth -.->|PROPOSED: Sync Auth UUID| PHLib
```

---

## 2. Subsystem Boundaries & Separation of Concerns

To prevent telemetry pollution, bundle bloat, and conflicting data, each subsystem is assigned a strict, non-overlapping responsibility domain:

| Subsystem | Primary Owner | Data Ingested | Target Storage | Explicit Exclusions |
| :--- | :--- | :--- | :--- | :--- |
| **Sentry** | Engineering Lead | Unhandled exceptions, React crash component stacks, sanitized URL breadcrumbs. | Sentry Cloud | Feature clicks, user journeys, financial totals, customer PII. |
| **PostHog** | Product Manager | Pageviews, module navigation, onboarding steps, document lifecycle states. | PostHog Cloud | Error traces, exceptions, invoice prices, customer names, chat prompt text. |
| **Local Error Registry** | Device / User | Recent 200 frontend errors for local in-app debugging and support inspection. | `localStorage` | Remote network transmissions. |
| **Document Audit Trail** | Regulatory / SME | Application-level records of document creation, edits, cancellations, and status changes. Database immutability not enforced. | Supabase Tenant DB | Third-party analytics clouds. |
| **Bolu AI Ledger** | AI Ops / Finance | Token consumption, inference duration, TTFT, token velocity, estimated USD cost. | Supabase Central DB | Prompt text, document draft contents. |
| **Cookie Consent** | Compliance Officer | User choice (`accepted` or `declined`) governing analytics activation. | `localStorage` | Remote network transmissions. |

---

## 3. Client Initialization & Bootstrap Sequence

Proposed initialization timing. Current `src/main.tsx` initializes Sentry only; PostHog is not installed and the consent banner gates no tracker:

```typescript
// 1. Early Sentry initialization (Must run first)
initSentry()

// 2. Conditional PostHog initialization (Respects local consent)
initPostHog()

// 3. React DOM mounting
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
```

---

## 4. Failure Isolation & Network Resilience

1. **Ad-Blocker & Network Interception:**
   - In Nigerian corporate and mobile environments, DNS blockers or browser shields (uBlock, Brave) frequently block analytics endpoints (`*.posthog.com`).
   - The analytics wrapper executes all tracking in non-blocking try/catch wrappers. Any network rejection fails silently and cannot interrupt React rendering, form submission, or Supabase database writes.
2. **Capacitor Mobile Offline Mode:**
   - On Android/iOS devices running on intermittent cellular connections, the wrapper buffers events in memory up to 50 events.
   - When connectivity drops, critical business actions (document drafting, offline reading) proceed normally.
3. **Zero Main-Thread Latency:**
   - Event scrubbing and metadata envelope attachment execute asynchronously, preserving 60fps UI responsiveness.

---

## 5. Multi-Tenant Group Attribution Model

BOUXRE operates multi-tenancy where a single user account can access or own multiple business entities. 

- **Tenant Isolation:** Postgres Row-Level Security (RLS) enforces database isolation.
- **Analytics Mapping:** PostHog Group Analytics maps entity context:
  ```typescript
  // When active entity changes in EntityContext.tsx
  posthog.group('tenant', activeEntityId, {
    industry: 'retail | services | manufacturing',
    plan_tier: 'starter | pro',
    created_at: '2026-01-15T00:00:00Z'
  })
  ```
- **Privacy Rule:** The `activeEntityId` is always the opaque Supabase UUID (`entity_id`), never the plain-text commercial business name.
