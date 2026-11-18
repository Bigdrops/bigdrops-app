# BOURXE: Master Decisions & Open Questions Register

- **Document Version:** 1.0.0
- **Status:** `[DECISION REQUIRED]`
- **Scope:** Master Decision Register Across Product Intelligence, Sentry Maintenance, PostHog, and Privacy Governance

---

## 1. Overview & Decision Governance

Before BOURXE can transition from **Phase 1 (Governance Approval)** to **Phase 2 (Account Readiness)** and subsequent technical integration, the product owner must review and resolve the key architectural, product, and operational decisions cataloged below.

To avoid decision fatigue, each decision clearly distinguishes:
- **Phase 1 Blockers:** Decisions that must be approved before Phase 2 can proceed.
- **Downstream Decisions:** Decisions that can be deferred until their relevant roadmap phase.

---

## 2. Phase 1 Blockers (Gating Phase 2 Entry)

### Decision 1.1: PostHog Cloud Ingestion Region
- **Context:** PostHog provides two primary cloud data hosting regions: US Cloud (`us.i.posthog.com`) and EU Cloud (`eu.i.posthog.com`).
- **Options:**
  - **Option A (US Cloud):** Standard cloud datacenter in North America.
  - **Option B (EU Cloud - Recommended):** Hosted in Frankfurt, Germany. Provides strict GDPR data center residency alignment and slightly lower transatlantic latency from Nigerian networks.
- **Recommendation:** **Option B (EU Cloud)**, or align with whichever region the user's existing account was created in.
- **Status:** `[UNKNOWN / PENDING PRODUCT OWNER CONFIRMATION]`

---

### Decision 1.2: Environment Separation Strategy
- **Context:** Test telemetry from local developer machines and staging builds can distort production conversion funnels if sent to the same PostHog project.
- **Options:**
  - **Option A (Dual Projects - Recommended):** Provision two separate projects inside the PostHog organization: `BOURXE-Production` and `BOURXE-Development`. Each receives its own write key (`VITE_POSTHOG_KEY`).
  - **Option B (Single Project with Property Filtering):** Use one project and filter by `environment: 'production' | 'development'`.
- **Trade-Offs:** Option A completely eliminates the risk of test data polluting production funnel statistics or auto-populating active business counts.
- **Recommendation:** **Option A (Dual Projects)**.
- **Status:** `[DECISION REQUIRED]`

---

### Decision 1.3: Session Replay (Video Recording) Policy
- **Context:** PostHog Session Replay records user cursor movements, clicks, and page scrolling. While helpful for UI diagnostics, it introduces severe data exposure risks in a financial platform managing confidential invoices and client names.
- **Options:**
  - **Option A (Permanently Disabled - Recommended):** Keep Session Replay permanently turned off (`disable_session_recording: true`) across both development and production.
  - **Option B (Gated Re-evaluation in Phase 6):** Keep disabled during initial release; re-evaluate in Phase 6 with blanket text masking and tenant opt-in.
  - **Option C (Immediate Deployment):** Deploy immediately with standard masking.
- **Trade-Offs:** Option A guarantees zero visual commercial data leakage and eliminates client data consumption for Nigerian SME users on mobile connections.
- **Recommendation:** **Option A (Permanently Disabled)**.
- **Status:** `[DECISION REQUIRED]`

---

### Decision 1.4: Autocapture vs. Explicit Event Instrumentation
- **Context:** PostHog's default autocapture automatically listens for every button click and form interaction. However, it can inadvertently capture button text or nearby input values if not meticulously masked.
- **Options:**
  - **Option A (Explicit Manual Instrumentation - Recommended):** Disable autocapture (`autocapture: false`). Only capture events explicitly instrumented via `trackEvent()`.
  - **Option B (Autocapture with Broad Masking):** Enable autocapture, but attach `.ph-no-capture` across all form elements and tables.
- **Trade-Offs:** Option A provides 100% predictable data hygiene and prevents unexpected payload bloat.
- **Recommendation:** **Option A (Explicit Manual Instrumentation)**.
- **Status:** `[DECISION REQUIRED]`

---

### Decision 1.5: Definition of the "Activation" Milestone
- **Context:** To measure onboarding success and calculate 30-day cohort retention, BOURXE must formally define when a new user becomes an "Activated Business".
- **Options:**
  - **Option A (Document Issuance - Recommended):** An SME is activated when they **complete their business profile and issue/export their first invoice or quotation within 7 days of registration**.
  - **Option B (Profile Completion Only):** An SME is activated once they complete the onboarding checklist.
  - **Option C (Client & Item Creation):** An SME is activated once they save their first client and first inventory item.
- **Trade-Offs:** Option A ties activation directly to real commercial value. An SME that issues an invoice has experienced the core utility of BOURXE.
- **Recommendation:** **Option A (First Document Issued within 7 Days)**.
- **Status:** `[DECISION REQUIRED]`

---

## 3. Downstream Decisions (Deferred to Phases 3–6)

### Decision 2.1: Multi-Tenant Attribution: PostHog Groups vs. Property Fallback
- **Context:** BOURXE allows a user to manage multiple business entities. PostHog offers "Group Analytics" to aggregate metrics by company/entity rather than individual user.
- **Options:**
  - **Option A (Group Analytics):** Utilize `posthog.group('tenant', entityId)`. Requires PostHog Teams/Paid plan or Free tier allowance.
  - **Option B (Property Fallback):** Pass `tenant_id` as a standard property on every event. Supported on all PostHog plans.
- **Recommendation:** Implement wrapper to support **Option A** with automatic fallback to **Option B**.
- **Timing:** Deferred to Phase 3 (Core SDK Integration).

---

### Decision 2.2: Sentry Minor Follow-Up Implementation Timing
- **Context:** The Sentry privacy audit noted three minor follow-up items (repeated shared-object DAG over-redaction, postfix currency notation parsing, and standalone property key normalization).
- **Options:**
  - **Option A (Implement with Phase 3):** Batch Sentry privacy refinements with PostHog wrapper implementation.
  - **Option B (Leave as-is):** The current Sentry implementation has 48 passing tests and verified safety; defer until next dedicated error monitoring cycle.
- **Recommendation:** **Option A**.
- **Timing:** Deferred to Phase 3.

---

## 4. Master Decision Summary & Signoff Checklist

| Decision ID | Decision Title | Scope | Recommended Option | Product Owner Signoff |
| :-: | :--- | :---: | :--- | :---: |
| **D-1.1** | Cloud Ingestion Region | Account | EU Cloud (`eu.i.posthog.com`) | `[ ] Approved / [ ] Modified` |
| **D-1.2** | Environment Separation | Account | Dual Projects (`Prod` & `Dev`) | `[ ] Approved / [ ] Modified` |
| **D-1.3** | Session Replay Policy | Privacy | Permanently Disabled | `[ ] Approved / [ ] Modified` |
| **D-1.4** | Autocapture Policy | Privacy | Explicit Manual Tracking Only | `[ ] Approved / [ ] Modified` |
| **D-1.5** | Activation Milestone | Product | First Document within 7 Days | `[ ] Approved / [ ] Modified` |
| **D-2.1** | Multi-Tenant Model | Tech | Group Analytics + Fallback | `[Deferred to Phase 3]` |
| **D-2.2** | Sentry Follow-Up Timing | Tech | Batch with Phase 3 Wrapper | `[Deferred to Phase 3]` |
