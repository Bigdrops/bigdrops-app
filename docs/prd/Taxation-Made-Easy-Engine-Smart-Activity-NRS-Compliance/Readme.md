# PRD MASTER INDEX & SUMMARY

> **Purpose:** One-stop reference for the Taxation Made Easy Engine folder.  
> Read this first, then open the specific file you need.  
>
> **Status Legend:** ✅ Active | 🔄 Draft/In-Progress | ⏭️ Superseded/Old | ⛔ Pending

---

## FILE DIRECTORY

| File Name | Status | Audience | Core Focus |
|-----------|--------|----------|------------|
| Technical-plan-v1.1.md | ✅ Active | Engineering, Product | Patched PRD for NRS e-invoicing — data model, WHT rate table fix, numeric precision guardrail, compliance hub corrections |
| Technical-plan.md | ⏭️ Superseded | Engineering (historical) | Original v1.0 PRD — full baseline for NRS invoice compliance engine (superseded by v1.1) |
| Files-tax-monthly-v1.md | ✅ Active | Engineering, Product | Monthly Files.tax compliance document — VAT position, WHT position, deadlines, attention items. Downstream of Technical-plan-v1.2.md |
| Record-capture-v1.md | ✅ Active | Engineering, Product | Minimum viable payment/expense/running-cost recording — unblocks Files.tax's "deducted by you" WHT field and running-cost data. Hard dependency of Files-tax-monthly-v1.md |
| Accounting-foundation-blueprint-v1.md | 🔄 Draft | Engineering, Architecture | Accounting Foundation architecture blueprint — domain boundaries, posting kernel, periods, money precision, accounting-to-tax bridge. Downstream of Record-capture-v1.md; prerequisite for profit-based CIT |
| Record-engagement-plan-v1.md | 🔄 Draft | Product, UX, Engineering | Behavioral engagement plan — gets users to record real business activity consistently; evidence classes, prompts, escalation, prioritization, MVP boundary. Downstream of Record-capture-v1.md; feeds the Waterfall roadmap |
| ai-integration.md | ✅ Active | Engineering, Product | App-wide AI layer — assistant, search, summaries, generation, compliance analysis. Advisory only; never computes tax values or invents statutory rules (section 10 guardrails) |
| multi-tenancy-alignment.md | ✅ Active | All | Alignment & tracking — keeps this folder conscious of multi-tenancy-prd-v2.1.md; ensures no document here violates or contradicts it |
| adaptive-uiux-alignment.md | ✅ Active | All | Alignment & tracking — keeps this folder conscious of the Adaptive Mobile-First UIUX Facelift PRD; ensures no document here violates or contradicts it |
| bigdrops-tax-ux-vision-v1.md | 🔄 Draft | Product, UX, Discovery | Companion vision document — payment recording as first-class record, "Why?" explanation layer, unrecorded activity loop. Not yet buildable |
| Openai-ux-contribution.md | 🔄 Draft | Product, UX | UX review and product philosophy — reframes the product from "NRS compliance engine" to "make tax easy for Nigerian businesses" |
| Waterfall-roadmap.md | ⛔ Pending | Project Management | Execution sequence and milestone tracker — currently all phases pending, awaiting PRD sign-off |
| NRS-docs/ | ✅ Active | All | Reference source material — official Nigeria Tax Act 2025 gazette text in Markdown and JSON forms, plus the obligation lookup index |
| Refrences/ | ✅ Active | Engineering, Architecture | Curated external-architecture references — accounting and tax-engine patterns researched for the BIGDROPS-native accounting/CIT foundation. Reference only, not statutory authority |
| Readme.md | ✅ Active | All | This file — master index and navigation hub |

---

## TL;DR SUMMARIES

### 1. Technical-plan-v1.1.md
**TL;DR:** The active version of the Invoice Compliance Engine PRD. It defines the full data model, calculation engine changes, form UI changes, NRS transmission adapter, and compliance hub for producing NRS-compliant invoices under the Nigeria Tax Act 2025. v1.1 patches two errors from v1.0: it corrects which party's entity type drives the WHT rate table (the tenant, not the client), adds a numeric precision guardrail, and restructures the VAT/WHT deadline from a single hard-coded constant to an obligation-type lookup table.

### 2. Technical-plan.md
**TL;DR:** The original v1.0 PRD that first defined the Invoice Compliance Engine scope. It covers 12 sections: system baseline audit, objective, scope, data model changes, calculation engine, form UI changes, NRS adapter, compliance hub, statutory reports, audit trail, open questions, and change log. Superseded by v1.1 — read v1.1 for current requirements, but v1.0 contains unchanged sections 1–4, 6, 7, 9, and 10 that v1.1 carries forward.

### 2a. Files-tax-monthly-v1.md
**TL;DR:** The monthly Files.tax compliance document. One document per month per tenant, showing the VAT position, the WHT position, upcoming deadlines, and attention items. It depends on `Technical-plan-v1.2.md` (not yet finalized) and the existing invoice and payment tables. It reuses the notification center, push channel, dashboard card slotting, and the Compliance Hub panels that already exist in code. Two fields are blocked by design and must never render fabricated values: "deducted by you" WHT (no expense module exists) and the WHT remittance deadline (the subsidiary regulation is not yet located). Its VAT section also defines a future VAT Filing Support capability (section 4 of that file): the VAT figure must be traceable to its contributing transactions and supporting evidence. Delivery is deferred to a later execution decision.

### 2b. Record-capture-v1.md
**TL;DR:** The minimum viable record-capture surface that Files.tax depends on. The audit found the only existing capture path is a tax-literate VAT-input form (net/VAT split required) with no evidence trail and no money-out recording. This PRD defines one plain-language "record what happened" flow — payee, amount, date, plain category, evidence — with tax treatment mapped behind the scenes via `Calculations.ts`. It extends `tax_input_entries` rather than adding a new table. It is a hard blocking dependency for the "deducted by you" WHT field and running-cost data in Files-tax-monthly-v1.md.

### 2c. ai-integration.md
**TL;DR:** The app-wide AI layer specification: gateway evaluation (free-llm-gateway, MIT), client configuration, nine use cases (assistant, global search, document summaries, document generation, inline suggestions, compliance/WHT analysis, email drafts, PDF enrichment, analytics narration), model selection, error handling, privacy, integration points, testing, and deployment. Within this PRD set it is advisory only: it never computes financial values and never supplies statutory rules from model memory. Section 10 defines nine tax-correctness guardrails. The WHT remittance deadline and WHT rate table stay unresolved; the AI must never fill them from memory.

### 2d. multi-tenancy-alignment.md
**TL;DR:** Tracking document for the multi-tenancy PRD (v2.1): records the tenancy constraints this folder must respect (workspace/entity/schema boundaries, action-based permissions, entity lifecycle), the alignment status of each document here, and contradiction rules.

### 2e. adaptive-uiux-alignment.md
**TL;DR:** Tracking document for the Adaptive Mobile-First UIUX Facelift PRD: records the UI constraints this folder must respect (mobile-first, design system, bottom-sheet overlays, progressive disclosure), the alignment status of each document here, and contradiction rules.

### 2f. Record-engagement-plan-v1.md
**TL;DR:** The behavioral plan that gets users to record real business activity consistently — customer payments, supplier payments, expenses, running costs, purchases, receipts, evidence, recurring activity. Converts the Openai-ux-contribution philosophy into triggers, evidence classes (confirmed / strongly indicated / suggested), the prompt → dismiss → snooze → escalate → persist lifecycle, five intervention levels, prioritization, record completeness (never a financial-health score), and a narrow enforcement-gate policy. Record-capture-v1.md is the capture surface it drives users toward. Preserves Record → Reconcile → Explain → Optimise → Comply → Transmit.

### 2g. Accounting-foundation-blueprint-v1.md
**TL;DR:** The architecture blueprint for the accounting foundation beneath the recording layer. It defines domain boundaries, the source-transaction model, chart of accounts, double-entry journal/posting kernel, money precision (Decimal.js + NUMERIC, ROUND_HALF_UP), accounting periods, corrections/reversals, tenant isolation, and the accounting-to-tax bridge. It is a specification, not an implementation. It resolves former project-wide exclusions: the general ledger, chart of accounts, and depreciation/asset infrastructure are now approved downstream capabilities (Record-capture-v1.md section 5 records the correction). Statutory values remain un-invented; NTAA-dependent items stay unresolved.

### 3. bigdrops-tax-ux-vision-v1.md
**TL;DR:** A separate discovery-stage document that asks a different question from the engineering PRD: "How does BIGDROPS get a Nigerian business to record enough real activity that NRS compliance becomes a side effect, not a chore?" It proposes six ideas (payment recording as first-class record, "Record Payment" plain-language flow, unrecorded activity loop, "Why?" explanations, progressive disclosure of NRS fields, better success metrics) and lists six audit questions that must be answered before any of them become tickets.

### 4. Openai-ux-contribution.md
**TL;DR:** A product review that reframes the core objective from "NRS-compliant invoices" to "make taxation simpler for an ordinary Nigerian business." It argues the PRD must add a transaction recording layer, a "Record Money" UX, "Why?" explanations on every tax calculation, an unrecorded business activity loop, and evidence-based tax savings. It proposes a new priority order (Record → Reconcile → Explain → Optimise → Comply → Transmit) and a revised product architecture diagram.

### 5. Waterfall-roadmap.md
**TL;DR:** A living execution-sequence document with a milestone tracker, phased execution steps, and a changelog. Currently all milestones and phases are set to PENDING. It becomes the single source of truth for execution order once the PRD and Technical Plan are signed off. No work has been started or sequenced yet.

### 6. NRS-docs/
**TL;DR:** Reference source material for the compliance work. Contains the official Nigeria Tax Act, 2025 (Act No. 7, Official Gazette No. 117, 26th June 2025):
- `NIGERIA-TAX-ACT-2025.md` — the gazette text converted to Markdown. Canonical reference.
- `NIGERIA-TAX-ACT-2025.json` — the same document as structured page data (page numbers, text blocks, bounding boxes) for programmatic lookup.
- `Cable-Ngn-tax-act-2025-v2.md` — a second Markdown conversion of the Act for cross-checking. Section numbers drift by minus one from the official numbering. Use with care.
- `OBLIGATION-LOOKUP-INDEX.md` — maps every PRD obligation rule to its gazette page, JSON page, and MD line. Read this first when implementing a tax rule.

These are source-of-truth reference documents. Do not edit the Act conversions. The lookup index is the navigation aid; update it when a PRD rule or the Act text changes.

### 7. Refrences/
**TL;DR:** Curated architecture references from the completed external-research series for the BIGDROPS-native accounting and tax foundation. Each document is labeled REFERENCE ONLY — NOT STATUTORY AUTHORITY. Five documents exist:
- `luca-v05-accounting-architecture-reference.md` — double-entry GL patterns (journal, period locking, idempotency, append-only corrections). Luca verdict: reference architecture only.
- `taxbridge-nigeria-cit-reference.md` — CIT engine structure lessons. TaxBridge uses a wrong ₦100M/20%-band model; borrow structure, never values.
- `tekvwarho-proaudit-nigeria-tax-reference.md` — a full double-entry accounting layer; tax values internally inconsistent. Borrow the accounting architecture.
- `openaccountants-openfisca-tax-reference.md` — date-keyed parameters, versioned formulas, traces (OpenFisca) and cited knowledge-layer patterns (OpenAccountants).
- `tax-foundation-pslmodels-balaka-openbooks-beancount-reference.md` — final synthesis: exact money, DB-enforced append-only journals, period locks, year-keyed statutory parameters. Closes broad external research.

These documents preserve durable architectural knowledge. They are not requirements. No external project is a dependency.

---

## IMPORTANT DECISIONS / DEPENDENCIES

- `Technical-plan-v1.1.md` **supersedes** `Technical-plan.md`. Read v1.1 for current requirements. v1.0 sections 1–4, 6, 7, 9, and 10 carry forward unchanged — re-read v1.0 for their full text.
- `bigdrops-tax-ux-vision-v1.md` is a **companion** to the engineering PRD, not a replacement. It holds ideas that are not yet buildable. Do not pull ideas from it into a ticket without first answering its section 6 audit questions.
- `Openai-ux-contribution.md` **drives the requirements** for the transaction-recording layer. It proposes a new product philosophy and priority order that should inform the next PRD revision.
- `Waterfall-roadmap.md` **depends on** `Technical-plan-v1.1.md` and `Openai-ux-contribution.md` being signed off. No phases will be sequenced until both are finalised.
- `Files-tax-monthly-v1.md` **depends on** `Technical-plan-v1.2.md` (the next engine PRD revision, not yet finalized) and on the reconciliation evidence in `NRS-docs/OBLIGATION-LOOKUP-INDEX.md`. It reuses the existing notification, push, dashboard, and Compliance Hub infrastructure. Do not start its build order until v1.2 is signed off.
- `Record-capture-v1.md` **is a hard blocking dependency of** `Files-tax-monthly-v1.md`. The "deducted by you" WHT field and the running-cost/expense data cannot be produced without a record-capture surface. Do not treat it as optional. The WHT remittance deadline field stays blocked on the missing subsidiary regulation regardless.
- `Accounting-foundation-blueprint-v1.md` **sits between** `Record-capture-v1.md` and the future tax layer. Record Capture records business activity. The Accounting Foundation turns confirmed recorded activity into accounting facts and journal postings. The future tax layer consumes those facts. Files-tax-monthly-v1.md consumes Record Capture data today (running-cost/expense data and "deducted by you" WHT). Profit-based CIT is the approved future capability that makes the Accounting Foundation a requirement; the blueprint defines it but does not implement it.
- The NRS transmission adapter (section 7 of the engineering PRD) **depends on** selecting an Access Point Provider (APP). This decision is still open and blocks Module 4 implementation.
- The "Unrecorded Business Activity" loop from `bigdrops-tax-ux-vision-v1.md` **depends on** answers to six audit questions (section 6 of that file) about the current Payments module, expense modules, and evidence upload pipeline.
- `NRS-docs/` **is the reference authority** for tax rates, deadlines, and obligations. When a PRD requirement conflicts with the Act text, the Act text wins. Flag the conflict, do not silently follow the PRD.
- `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` **depends on** the Act conversions and on `Technical-plan.md` / `Technical-plan-v1.1.md`. Keep it in sync when either side changes. It currently flags three open items: the VAT remittance date (14th in the Act vs 21st in the PRD table), the small-company turnover threshold (₦50,000,000 in the Act vs ₦100,000,000 in the PRD), and the missing NTAA 2025 text that holds the WHT rate table and the 21st-day return deadline.
- `Refrences/` **is reference material only, never statutory authority.** It informs the future native accounting and Nigerian tax-engine design. `NRS-docs/` remains the statutory authority. Do not copy external values into PRDs or code; derive every rate, threshold, and deadline from the canonical Act text.
- `ai-integration.md` **is advisory and additive.** Its tax-adjacent features must obey its section 10 guardrails: no AI-computed financial values, no statutory values from model memory, unresolved WHT items stay unresolved. UI conventions defer to the Adaptive Mobile-First UIUX Facelift PRD (see adaptive-uiux-alignment.md); tenant-data access defers to multi-tenancy-prd-v2.1.md (see multi-tenancy-alignment.md).
- `Record-engagement-plan-v1.md` **drives users toward the Record-capture-v1.md surface.** It adds no capture architecture of its own. Its MVP uses existing infrastructure (notifications, dashboard, Compliance Hub); email, WhatsApp, and scheduling remain future propagation channels.
- `multi-tenancy-alignment.md` **depends on** multi-tenancy-prd-v2.1.md. It records conformance and tracking only; it adds no requirements of its own.
- `adaptive-uiux-alignment.md` **depends on** the Adaptive Mobile-First UIUX Facelift PRD. It records conformance and tracking only; it adds no requirements of its own.

---

## UPDATE LOG

| Date | Action Taken | Changed File |
|------|--------------|--------------|
| 2026-09-05 | Readme.md updated — Accounting-foundation-blueprint-v1.md added to file directory, summaries, and dependencies | Readme.md |
| 2026-09-05 | Record-capture-v1.md §5 reconciled — general ledger, chart of accounts, depreciation/asset register, and full bookkeeping reclassified as superseded project exclusions with pointers to the Accounting Foundation Blueprint; remaining non-goals stay Record Capture-specific | Record-capture-v1.md |
| 2026-09-05 | Accounting-foundation-blueprint-v1.md created — architecture blueprint for the accounting foundation (domain boundaries, posting kernel, periods, money precision, accounting-to-tax bridge); downstream of Record-capture-v1.md, prerequisite for profit-based CIT | Accounting-foundation-blueprint-v1.md |
| 2026-09-05 | Readme.md updated — Record-engagement-plan-v1.md indexed; 13-ai-integration.md renamed to ai-integration.md throughout the index | Readme.md |
| 2026-09-05 | ai-integration.md renamed from 13-ai-integration.md; stale alignment-document references inside it updated to the current file names | ai-integration.md |
| 2026-09-05 | Record-engagement-plan-v1.md created — behavioral engagement plan (evidence classes, engagement lifecycle, intervention levels, prioritization, MVP boundary) | Record-engagement-plan-v1.md |
| 2026-09-05 | Readme.md updated — 13-ai-integration.md and the two alignment documents added to file directory, summaries, and dependencies | Readme.md |
| 2026-09-05 | Readme.md updated — 13a/13b AI-integration-specific alignment files replaced with general tracking files (multi-tenancy-alignment.md, adaptive-uiux-alignment.md) | Readme.md |
| 2026-09-05 | adaptive-uiux-alignment.md created — alignment & tracking vs Adaptive Mobile-First UIUX Facelift PRD | adaptive-uiux-alignment.md |
| 2026-09-05 | multi-tenancy-alignment.md created — alignment & tracking vs multi-tenancy-prd-v2.1.md | multi-tenancy-alignment.md |
| 2026-09-05 | 13-ai-integration.md updated — positioned within this PRD set; added section 10 Tax Correctness Guardrails; removed WHT-deadline fabrication risk; amount-in-words moved to deterministic code; corrected integration-point file paths | 13-ai-integration.md |
| 2026-09-05 | Readme.md updated — Refrences/ folder indexed in file directory, summaries, and dependencies; five curated external-architecture references documented | Readme.md |
| 2026-09-05 | Refrences/ populated — tax-foundation-pslmodels-balaka-openbooks-beancount-reference.md added; closes broad external research series (Luca, TaxBridge, TekVwarho, OpenAccountants, OpenFisca, PSLmodels, Balaka, OpenBooks, Beancount) | Refrences/ |
| 2026-09-05 | Record-capture-v1.md created — minimum viable payment/expense/running-cost recording PRD; hard dependency of Files-tax-monthly-v1.md | Record-capture-v1.md |
| 2026-09-05 | Readme.md updated — Record-capture-v1.md added to file directory, summaries, and dependencies | Readme.md |
| 2026-09-05 | Files-tax-monthly-v1.md updated — VAT Filing Support capability added (new section 4); delivery mechanism deferred to open decision 9 | Files-tax-monthly-v1.md |
| 2026-09-05 | Readme.md updated — Files-tax TL;DR extended with VAT Filing Support summary | Readme.md |
| 2026-09-05 | Files-tax-monthly-v1.md created — monthly compliance document PRD; audit of notification/dashboard/email/cron channels recorded inside it | Files-tax-monthly-v1.md |
| 2026-09-05 | Readme.md updated — Files-tax-monthly-v1.md added to file directory, summaries, and dependencies | Readme.md |
| 2026-09-04 | Readme.md updated — NRS-docs/ reference folder added to file directory, summaries, and dependencies | Readme.md |
| 2026-09-04 | NRS-docs/OBLIGATION-LOOKUP-INDEX.md created — PRD obligation rules mapped to gazette pages, JSON pages, and MD lines | OBLIGATION-LOOKUP-INDEX.md |
| 2026-09-03 | Readme.md populated — file directory, summaries, dependencies, update log | Readme.md |
| 2026-09-03 | Technical-plan-v1.1.md created — patches v1.0 with WHT rate fix, numeric precision guardrail, deadline restructure | Technical-plan-v1.1.md |
| 2026-09-03 | bigdrops-tax-ux-vision-v1.md created — discovery-stage companion vision document | bigdrops-tax-ux-vision-v1.md |
| 2026-09-03 | Openai-ux-contribution.md created — UX review and product philosophy | Openai-ux-contribution.md |
| 2026-09-03 | Waterfall-roadmap.md created — execution sequence tracker (all phases pending) | Waterfall-roadmap.md |
| 2026-09-03 | Technical-plan.md marked superseded by v1.1 | Technical-plan.md |