# ARCHITECTURAL SESSION LOG: INSTANT CONTEXT RESTORATION
**System Domain:** Prefix Engine & Document Collision Subsystem
**Date:** 2026-06-16
**Author:** Lead Architect
**Current State:** ✅ Production Ready / Typecheck Passed / Fully Documented
## 1. Platform Context
The BIGDROPS platform is built on a modern, high-velocity stack: **React 19**, **Vite 7**, **TypeScript 5.9**, **Tailwind CSS 3.4**, and **Supabase** (PostgreSQL/PostgREST). Execution is strictly driven by the **Bun** runtime.
The core business objective of this engineering cycle was to eliminate sequence fragmentation and hardcoded defaults across multi-tenant billing, procurement, and fulfillment pipelines. The application requires runtime configuration of organizational document prefixes, high-concurrency protection during unique sequence creation, and a deterministic logging strategy for offline/manual physical printouts (blank sheets) to sync with an upcoming PDF canvas compilation engine.
## 2. The Mental Model
The entire subsystem operates as a strict, unidirectional transaction-boundary wrapper around the database insert layer:
```
[UI Component Form / Action Layer]
       │
       ▼
[Resolve Configured Org Prefix via useSettings()]
       │
       ▼
[Generate Candidate Reference String (e.g., INV-000001)]
       │
       ▼
┌────────────────── withUniqueRetry High-Order Wrapper ──────────────────┐
│                                                                        │
│  ► 1. Execute DB Insert Request                                        │
│  ► 2. Trap Error Status?                                               │
│         ├── NO  (Success) ───> Return { data, error: null }            │
│         └── YES (PostgreSQL Error 23505 - Unique Violation)            │
│                 │                                                      │
│                 ▼                                                      │
│       [Trigger RegenerateValue Callback]                               │
│                 │                                                      │
│                 ▼                                                      │
│       [Recalculate Next Padded Sequence Number]                         │
│                 │                                                      │
│                 ▼                                                      │
│       [Loop Execution until Success or Max Retries (3) Exhausted]      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```
For **Blank Documents**, the UI forces generation of offline specific tokens (-ME- Manual External, -MI- Manual Internal, -M- Manual CSR), commits the allocated tracking index straight to the ledger tables (blank_waybill_logs / blank_csr_logs), and routes the pure payload stream to the renderer.
## 3. Critical Architecture Decisions (CADs)
 * **CAD-01: Centralized Functional Interceptor over Component-Level Loops**
   * *Decision:* Rejected localized for loops within UI form files. Implemented withUniqueRetry as an abstract high-order execution pipeline.
   * *Rationale:* Avoids boilerplate pollution across five separate layout trees. Encapsulates PostgREST error filtering cleanly without exposing react hooks, rendering lifecycles, or mutate states to database mechanics.
 * **CAD-02: Structural Split of Blank Ledger Records**
   * *Decision:* Created explicit blank_waybill_logs and blank_csr_logs tracking tables containing built-in structural columns (linked_waybill_id, linked_csr_id, reconciled_at).
   * *Rationale:* Keeps transactional production data paths clean. Provides an elegant trace history for physical manifests distributed to drivers or engineers without polluting main state tables with null-value records.
 * **CAD-03: The "Dumb Canvas" Principle for Document Renderers**
   * *Decision:* Forced all number generation and collision evaluations to settle *before* reaching presentation components.
   * *Rationale:* Ensures @react-pdf/renderer components act purely as layout sheets. Layout layers consume immutable strings, avoiding rendering side-effects or inline asynchronous retry blocks.
## 4. Phase-by-Phase Breakdown & Modifications
### Phase A: Core Resiliency Engine
 * **File Created:** src/lib/withUniqueRetry.ts
 * **Implementation:** Developed a functional wrapper catching PostgreSQL error 23505. It locks a maximum constraint threshold of 3 attempts. When triggered, it invokes a non-blocking sequence calculator before trying the operation again.
### Phase B: Form Standardization & Bug Eradication
 * **File Modified:** src/components/quotation/QuotationForm.tsx
   * *Action:* Removed hardcoded SASQ fallback lines completely. Replaced with dynamic lookups pulling configuration variables via resolvePrefix(settings?.document_prefixes, 'quotation').
   * *Action:* Wrapped document commit action inside the withUniqueRetry utility block.
 * **Files Modified:** src/pages/NewInvoice.tsx, src/pages/NewRfq.tsx, src/pages/NewCSR.tsx, src/domain/waybill/waybillMutations.ts
   * *Action:* Integrated custom sequence generators into the withUniqueRetry envelope.
   * *Action:* Fixed type definitions in NewInvoice.tsx by introducing explicit generic return casting (as Promise<{ data: any; error: any }>) to satisfy TS compile constraints.
### Phase C: Blank Voucher Provisioning
 * **Files Modified:** src/pages/NewCSR.tsx, src/components/csr/CsrFormScreen.tsx
   * *Action:* Wired manual generation mechanics. Created handleDownloadBlankCsr to construct localized formats ([PREFIX]-M-[SERIAL]).
   * *Action:* Injected row logs tracking into blank_csr_logs.
   * *Action:* Updated desktop action view options with a dedicated download access trigger.
### Phase D: Engineering Framework Enforcement
 * **Files Created/Updated:** docs/STANDARD/prefix-engine-settings-standard.md, docs/PRD/pdf-rendering-roadmap.md
   * *Action:* Formulated the 4 Architectural Pillars blueprint to serve as a guide for building future platform documents.
   * *Action:* Restructured the upcoming rendering plan, inserting Phase 4 to dictate background reconciliation sync criteria.
## Summary of File Tree Impact

| Target Workspace Vector | Component Layer Responsibility | Operational Mutation |
| :--- | :--- | :--- |
| src/lib/withUniqueRetry.ts | Shared Subsystem Engine | Created core database resilience wrapper |
| src/components/quotation/QuotationForm.tsx | Quotation Workspace Form | Removed legacy SASQ tokens, integrated dynamic wrapper |
| src/pages/NewInvoice.tsx | Invoice Pipeline | Wrapped save pipeline, resolved type cast errors |
| src/pages/NewRfq.tsx | RFQ Pipeline | Wrapped save pipeline |
| src/pages/NewCSR.tsx | Customer Service Report Pipeline | Replaced pre-save validation with unique retry boundary; built blank entry hooks |
| src/domain/waybill/waybillMutations.ts | Waybill Data Layer | Integrated wrapper inside database insert paths |
| src/components/csr/CsrFormScreen.tsx | CSR Presentation Screen | Integrated blank download trigger interface |
| docs/STANDARD/prefix-engine-settings-standard.md | Core Standardization Specs | Authored architectural guide rules |
| docs/PRD/pdf-rendering-roadmap.md | Strategic System Engineering | Injected Phase 4 tracking details and data paradigms |

## 5. Lessons Learned
### Technical Debt Identified
 * **PostgREST Type Disconnects:** Supabase insert schemas often return complex response unions. When passing naked operations through generic wrappers (e.g., inside NewInvoice.tsx), TypeScript requires explicit typing assertions. Future extensions should build type helper interfaces directly into the global data hook layer.
 * **Dangling Reconciliation Hooks:** The schema for matching manual documents to system database updates (linked_*_id) is complete, but the background operations to link them are deferred to the rendering module. This creates an interim monitoring gap that requires clean administrative dashboards down the line.
### Agent Workflow Failures & Solutions
 * **The Fragmentation Blueprint Trap:** The AI agent originally suggested copying and pasting separate for loops across five distinct application views. This would have caused widespread code fragmentation.
   * *Correction:* Enforced strict human oversight to reject copy-paste proposals, pivot back to architectural principles, and extract reusable utilities first.
 * **Vague Instructions vs. Concrete Execution Blueprints:** Vague prompts like *"Ensure the component uses correct settings"* result in incomplete implementations or skipped logging hooks.
   * *Correction:* Shifted to deterministic markdown prompts containing exact table schemas, expected token string patterns (-ME-, -MI-), and explicit targeted file trees. This approach ensures the agent delivers complete features on the first attempt.