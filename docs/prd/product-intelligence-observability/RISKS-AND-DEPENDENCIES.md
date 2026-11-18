# BOURXE: Master Risks, Assumptions & Dependencies Analysis

- **Document Version:** 1.0.0
- **Status:** Active Risk Register & Mitigation Strategy
- **Scope:** Technical, Privacy, Multi-Tenant, Performance, Operational, and Account-Side Risk Factors

---

## 1. Executive Summary

Introducing external product intelligence and observability into a financial operations platform introduces distinct risks that do not exist in standard consumer applications. Nigerian SMEs rely on BOURXE for sensitive commercial bookkeeping, tax compliance, and business correspondence. 

This document identifies all material risks associated with the unified Product Intelligence & Observability initiative and defines verified technical mitigations for each.

---

## 2. Comprehensive Risk Matrix & Mitigation Strategy

| Risk ID | Category | Risk Description | Severity | Likelihood | Technical Mitigation Strategy |
| :-: | :--- | :--- | :---: | :---: | :--- |
| **RSK-01** | **Privacy** | **Commercial Data Leakage:** Financial figures (unit prices, invoice totals, bank account numbers) inadvertently transmitted in telemetry properties. | **CRITICAL** | Low | Deep recursive payload scrubbing with unanchored regex key-matching; strict property schema validation; automated zero-leakage regression tests. |
| **RSK-02** | **Privacy** | **AI Conversation Exfiltration:** Sensitive user prompts or generated document draft contents sent to PostHog from Bolu assistant. | **HIGH** | Low | Total exclusion of conversation text; Bolu events restricted strictly to boolean flags (`had_manual_edits`) and counts (`line_item_count`). |
| **RSK-03** | **Identity** | **Shared Terminal Session Bleed:** In SME offices, multiple staff members use the same computer. If logout does not reset distinct ID, subsequent users' actions merge into the prior user's profile. | **HIGH** | Medium | Mandatory execution of `posthog.reset()` on `supabase.auth.onAuthStateChange('SIGNED_OUT')`, generating a fresh anonymous distinct ID. |
| **RSK-04** | **Multi-Tenancy** | **Cross-Tenant Data Blending:** A user managing multiple business entities switches context, but analytics continues attributing events to the previous entity. | **HIGH** | Low | Dedicated entity change listener in `EntityContext.tsx` that calls `posthog.group('tenant', newEntityId)` and clears cached tenant properties. |
| **RSK-05** | **Performance** | **Main-Thread Latency & Data Usage:** Heavy analytics SDK or blocking event dispatches degrade performance on low-end Nigerian mobile devices. | **MEDIUM** | Low | Asynchronous non-blocking tracking (`setTimeout` or `requestIdleCallback`); event batching; total bundle overhead capped under 45 KB gzipped. |
| **RSK-06** | **Network** | **Ad-Blocker & Firewall Interception:** Browser privacy extensions (uBlock, Brave Shields) block `us.i.posthog.com` or `eu.i.posthog.com`. | **MEDIUM** | Medium | Wrap all client calls in safe error handlers; application must function 100% normally when PostHog endpoints are blocked; optional future reverse-proxy via Vercel rewrite. |
| **RSK-07** | **Data Quality** | **Duplicate Event Ingestion:** React 19 component re-renders trigger double event dispatches, distorting funnel math. | **MEDIUM** | Medium | Deduplication guards on critical workflow transitions; track on user action handlers (e.g., button click) rather than generic `useEffect` render cycles. |
| **RSK-08** | **Environment** | **Staging Data Polluting Production:** Developers running local tests inflate active business counts and skew conversion metrics. | **MEDIUM** | Medium | Dual-project architecture (`BOURXE-Prod` vs `BOURXE-Dev`) with distinct write keys, completely partitioning environments. |
| **RSK-09** | **Operational** | **Host Memory Overflow:** Executing prohibited build commands crashes the 4 GB RAM host machine. | **HIGH** | Low | Strict adherence to project governance: `bun run build` is permanently prohibited. Verification relies on targeted static checks and local test execution. |

---

## 3. Account-Side & External Dependencies

| Dependency ID | Dependency Name | Owner | Critical Path Impact |
| :-: | :--- | :---: | :--- |
| **DEP-01** | **PostHog Project Provisioning** | Product Owner | Blocks Phase 2 and Phase 3. Cannot initialize client SDK without valid `VITE_POSTHOG_KEY`. |
| **DEP-02** | **Host Region Confirmation** | Product Owner | Determines whether `us.i.posthog.com` or `eu.i.posthog.com` is configured in production environment. |
| **DEP-03** | **PostHog Free Tier Volume Monitoring** | Product Owner | PostHog provides 1,000,000 free events per month. Event volume must be projected and monitored to avoid unexpected billing. |
| **DEP-04** | **Hardware Gate Constraint** | Engineering Lead | Permanent prohibition against running `bun run build` on the 4 GB RAM host environment. |

---

## 4. Key Assumptions

1. **User PostHog Account:** It is assumed that the user has an active PostHog cloud account and administrative access to retrieve API write keys and manage project settings.
2. **Supabase Auth as Identity Source:** It is assumed that Supabase Auth remains the single authoritative identity provider for BOURXE, and that `user.id` (UUIDv4) is stable across user lifetimes.
3. **No Retroactive Backfill:** It is assumed that PostHog analytics will begin capturing data from the date of deployment forward; historical database records will not be backfilled into PostHog.
4. **Sentry Error Isolation:** It is assumed that Sentry will continue handling all runtime exceptions and frontend crash reporting, with zero overlap in PostHog.
