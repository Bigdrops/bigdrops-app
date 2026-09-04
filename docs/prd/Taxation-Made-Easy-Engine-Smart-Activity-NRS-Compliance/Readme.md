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
| bigdrops-tax-ux-vision-v1.md | 🔄 Draft | Product, UX, Discovery | Companion vision document — payment recording as first-class record, "Why?" explanation layer, unrecorded activity loop. Not yet buildable |
| Openai-ux-contribution.md | 🔄 Draft | Product, UX | UX review and product philosophy — reframes the product from "NRS compliance engine" to "make tax easy for Nigerian businesses" |
| Waterfall-roadmap.md | ⛔ Pending | Project Management | Execution sequence and milestone tracker — currently all phases pending, awaiting PRD sign-off |
| NRS-docs/ | ✅ Active | All | Reference source material — official Nigeria Tax Act 2025 gazette text in Markdown and JSON forms, plus the obligation lookup index |
| Readme.md | ✅ Active | All | This file — master index and navigation hub |

---

## TL;DR SUMMARIES

### 1. Technical-plan-v1.1.md
**TL;DR:** The active version of the Invoice Compliance Engine PRD. It defines the full data model, calculation engine changes, form UI changes, NRS transmission adapter, and compliance hub for producing NRS-compliant invoices under the Nigeria Tax Act 2025. v1.1 patches two errors from v1.0: it corrects which party's entity type drives the WHT rate table (the tenant, not the client), adds a numeric precision guardrail, and restructures the VAT/WHT deadline from a single hard-coded constant to an obligation-type lookup table.

### 2. Technical-plan.md
**TL;DR:** The original v1.0 PRD that first defined the Invoice Compliance Engine scope. It covers 12 sections: system baseline audit, objective, scope, data model changes, calculation engine, form UI changes, NRS adapter, compliance hub, statutory reports, audit trail, open questions, and change log. Superseded by v1.1 — read v1.1 for current requirements, but v1.0 contains unchanged sections 1–4, 6, 7, 9, and 10 that v1.1 carries forward.

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

---

## IMPORTANT DECISIONS / DEPENDENCIES

- `Technical-plan-v1.1.md` **supersedes** `Technical-plan.md`. Read v1.1 for current requirements. v1.0 sections 1–4, 6, 7, 9, and 10 carry forward unchanged — re-read v1.0 for their full text.
- `bigdrops-tax-ux-vision-v1.md` is a **companion** to the engineering PRD, not a replacement. It holds ideas that are not yet buildable. Do not pull ideas from it into a ticket without first answering its section 6 audit questions.
- `Openai-ux-contribution.md` **drives the requirements** for the transaction-recording layer. It proposes a new product philosophy and priority order that should inform the next PRD revision.
- `Waterfall-roadmap.md` **depends on** `Technical-plan-v1.1.md` and `Openai-ux-contribution.md` being signed off. No phases will be sequenced until both are finalised.
- The NRS transmission adapter (section 7 of the engineering PRD) **depends on** selecting an Access Point Provider (APP). This decision is still open and blocks Module 4 implementation.
- The "Unrecorded Business Activity" loop from `bigdrops-tax-ux-vision-v1.md` **depends on** answers to six audit questions (section 6 of that file) about the current Payments module, expense modules, and evidence upload pipeline.
- `NRS-docs/` **is the reference authority** for tax rates, deadlines, and obligations. When a PRD requirement conflicts with the Act text, the Act text wins. Flag the conflict, do not silently follow the PRD.
- `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` **depends on** the Act conversions and on `Technical-plan.md` / `Technical-plan-v1.1.md`. Keep it in sync when either side changes. It currently flags three open items: the VAT remittance date (14th in the Act vs 21st in the PRD table), the small-company turnover threshold (₦50,000,000 in the Act vs ₦100,000,000 in the PRD), and the missing NTAA 2025 text that holds the WHT rate table and the 21st-day return deadline.

---

## UPDATE LOG

| Date | Action Taken | Changed File |
|------|--------------|--------------|
| 2026-09-04 | Readme.md updated — NRS-docs/ reference folder added to file directory, summaries, and dependencies | Readme.md |
| 2026-09-04 | NRS-docs/OBLIGATION-LOOKUP-INDEX.md created — PRD obligation rules mapped to gazette pages, JSON pages, and MD lines | OBLIGATION-LOOKUP-INDEX.md |
| 2026-09-03 | Readme.md populated — file directory, summaries, dependencies, update log | Readme.md |
| 2026-09-03 | Technical-plan-v1.1.md created — patches v1.0 with WHT rate fix, numeric precision guardrail, deadline restructure | Technical-plan-v1.1.md |
| 2026-09-03 | bigdrops-tax-ux-vision-v1.md created — discovery-stage companion vision document | bigdrops-tax-ux-vision-v1.md |
| 2026-09-03 | Openai-ux-contribution.md created — UX review and product philosophy | Openai-ux-contribution.md |
| 2026-09-03 | Waterfall-roadmap.md created — execution sequence tracker (all phases pending) | Waterfall-roadmap.md |
| 2026-09-03 | Technical-plan.md marked superseded by v1.1 | Technical-plan.md |