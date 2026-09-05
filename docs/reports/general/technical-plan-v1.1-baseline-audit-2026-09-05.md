# Technical-plan-v1.1 Baseline Audit Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Establish whether Technical-plan-v1.1.md can safely serve as the current technical baseline for the Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance folder while the project prepares the Waterfall Roadmap. Classify every material technical claim against current repository evidence. Apply only factual baseline corrections.

Technical-plan-v1.2.md does not exist and was not created by this audit.

## Scope

- Audit Technical-plan-v1.1.md and its carried-forward v1.0 baseline.
- Compare against the approved PRD set: Record-capture-v1.md, Record-engagement-plan-v1.md, Accounting-foundation-blueprint-v1.md, Files-tax-monthly-v1.md, the folder Readme.md, and relevant NRS documentation.
- Verify implementation claims against code and migrations where the plan states what exists.
- Apply minimal factual corrections to Technical-plan-v1.1.md and the Readme.md v1.2 references.
- Do not create Technical-plan-v1.2.md. Do not redesign the technical plan. Do not implement anything.

## Files Inspected

- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Technical-plan-v1.1.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Technical-plan.md (v1.0 baseline, carried forward by v1.1)
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Accounting-foundation-blueprint-v1.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-engagement-plan-v1.md (read in prior audit sessions)
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/bigdrops-tax-ux-vision-v1.md (read in prior audit sessions)
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Openai-ux-contribution.md (read in prior audit sessions)
- supabase/migrations/20260520090003_invoices.sql (wht_receipts table)
- src/lib/Calculations.ts (decimal evidence)
- src/pages/ComplianceHub.tsx (existence)
- NRS-docs/OBLIGATION-LOOKUP-INDEX.md (open statutory items)
- docs/reports/general/nrs-obligation-reconciliation-2026-09-04.md (verified statutory baseline)

## Files Changed

- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Technical-plan-v1.1.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
- docs/Reports/general/technical-plan-v1.1-baseline-audit-2026-09-05.md (this report)

## Skills Used

writing-clearly-and-concisely

## Documentation Standard

ASD-STE100 Simplified Technical English

## Technical-plan-v1.2 Existence Check

Direct repository inspection found two technical-plan files:

- Technical-plan.md (v1.0, marked Superseded in the Readme)
- Technical-plan-v1.1.md (v1.1, marked Active in the Readme)

Technical-plan-v1.2.md does not exist. No document designates a v1.2 as the active replacement. This audit created no v1.2 file and no v1.2 placeholder.

## Current Baseline Determination

Technical-plan-v1.1.md is the current technical baseline. It remains suitable for Waterfall Roadmap planning with explicit gates. The audit found no evidence that any other document supersedes it as the engineering baseline. It carries forward sections 1-4, 6, 7, 9, and 10 from v1.0. Read those sections in Technical-plan.md.

## Evidence Matrix

| v1.1 section | Claim | Current evidence | Classification | Roadmap consequence |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | Stack: React 19, Vite, TS, Tailwind, Supabase, Vercel, Bun, Capacitor | AGENTS.md and package state | EXISTS | None. |
| 1.2 | Four document modules; Invoice and Quotation share SharedDocumentForm | Prior audits confirmed modules and shared form | EXISTS | None. |
| 1.3 | computeDocument() is the single source of truth; PDFs never calculate | AGENTS.md core guardrail; Calculations.ts exports | EXISTS | None. |
| 1.3 | null and 0 are distinct rate values | Documented engine semantics | EXISTS | None. |
| 1.5 | Tenant schema pattern entity_{workspace_slug}_{entity_slug}; supplier identity is tenant-level | Tenant schema provisioning confirmed in prior audits | EXISTS | None. |
| 1.6 | audit_logs and activity_events exist | Confirmed in prior audits | EXISTS | None. |
| 1.7 | prefixConstants.ts and resolvePrefix() are no-touch zones | Documented | EXISTS | None. |
| 1.8 | Invoice/Client/line-item gaps (no currency, no TIN, no codes) | Gap list is from the v1.0 audit; current state not re-verified | PARTIAL | Re-verify before the e-invoicing data model is implemented. |
| 2 | computeDocument() only place for money math; audit trail on compliance fields | Matches current guardrails | RESOLVED | None. |
| 3.1 | Scope: Invoice module only | Folder scope now includes Files-tax, Record Capture, Accounting Foundation | STALE / SUPERSEDED | The plan covers the invoice e-invoicing engine only. Broader scope lives in newer PRDs. |
| 3.2-3.4 | Quotation, Waybill, CSR out of scope | Quotation now reuses the invoice/domain financial layer | PARTIAL | Quotation exclusion predates shared financial layer. Waybill/CSR exclusions stand. |
| 3.6 | No direct NRS connection; APP transmits | Consistent with Files-tax 4.11 | RESOLVED | None. |
| 3.7 | APP selection open, blocks Module 4 | Readme still lists it open | RESOLVED | Roadmap gate. |
| 4.1-4.5 | SP/CL/IH/LI fields and NRS metadata | No NRS field found in src/ | NOT YET IMPLEMENTED | E-invoicing data model is future work. |
| 4.6 | WHT receipt ledger proposal | wht_receipts table exists with receipt_status, receipt_file_url, wht_amount | PARTIAL | Table exists; field names and status values differ from the plan. |
| 5.1 / 11.5 | Numeric precision guardrail; does Calculations.ts use decimal math? | Calculations.ts line 34 imports Decimal.js; line 38 sets precision 20, ROUND_HALF_UP | RESOLVED | 11.5 is answered. No second library needed. |
| 5.2-5.9 | Engine steps and formulas | Matches the forward calculation path in Calculations.ts | CURRENT | None. |
| 5.7 | WHT rate table values | No primary source in repository; subsidiary regulation absent | UNRESOLVED | Rates are working assumptions. Do not ship as statutory. |
| 5.7 | Tenant legal form (SP-12) drives the rate column | v1.1 patch; SP-12 not implemented; 11.6 open | CONTRADICTED | v1.1 supersedes the v1.0 client-entity-type note; internal conflict now flagged in the document. |
| 6 | Form UI changes (currency, TIN overlay, transaction nature, etc.) | No NRS field found in src/ | NOT YET IMPLEMENTED | Future work. |
| 8.1 | Deadline lookup keyed by obligation type; 21st default for both | Design sound; statutory basis unresolved | PARTIAL | 21st is a PRD default, not verified. §155(4) day-14 verified for withholding agents only. |
| 8.2 | Turnover indicator labeled Internal Estimate | Matches evidence-correction discipline | CURRENT | None. |
| 8.3 | Small company turnover condition ₦100,000,000 | Verified NTA 2025 section 202: ₦50,000,000 (line 4502) | CONTRADICTED | Corrected in v1.1 to ₦50,000,000. |
| 8.4 | VAT registration threshold ₦25,000,000 | No primary source in repository | UNRESOLVED | Do not present as verified. |
| 8.5 | NRS Clearance Queue panel | Not implemented | NOT YET IMPLEMENTED | Future work. |
| 9.1-9.3 | Statutory reports | reports.tsx exists; specific reports not verified | PARTIAL | Re-verify report inventory before implementation. |
| 9.4 | CIT and Development Levy Estimator | Formula not in this document; predates the Accounting Foundation | STALE / SUPERSEDED | Profit-based CIT now requires accounting profit from the foundation. |
| 10 | Audit trail integration for new fields | Matches blueprint section 17 provenance requirement | CURRENT | None. |
| 11.1 | APP question open | Readme confirms | RESOLVED | Roadmap gate. |
| 11.2 | Client entity type question | Closed in v1.1; replaced by SP-12 | RESOLVED | None. |
| 11.3 | Audit diffing manual registration | No evidence resolved | UNRESOLVED | Verify before audit-trail work. |
| 11.4 | IH-5 mapping to PO Number | No evidence resolved | UNRESOLVED | Verify before implementation. |
| 11.6 | Tenant legal form already stored | No evidence | UNRESOLVED | Verify before adding SP-12. |

## Material Stale or Contradicted Assumptions

1. Small company turnover threshold. v1.0 section 8.3 states ₦100,000,000. The verified Act text defines ₦50,000,000. Corrected in v1.1.
2. The 21st-day deadline presented as the corrected statutory value. v1.0 section 12 labels the 21st as correct. The 21st is a PRD default only. The general VAT return deadline depends on the absent NTAA. Verified §155(4) day-14 applies only to designated VAT withholding agents.
3. WHT rate table values. The plan presents goods 2%, construction 2%/5%, services 5%/10%, rent 10% as the engine spec. The rate source, the subsidiary regulation, is not in the repository. The values are working assumptions.
4. Client entity type versus tenant legal form. v1.1 section 5.7 supersedes the v1.0 note, but the carried-forward v1.0 text still says the client's entity type. The v1.1 patch is now flagged as authoritative in the document.
5. Invoice-only scope. The folder scope has grown. The plan remains valid for its module but is no longer the whole technical surface.

## Accounting Foundation Impact

Technical-plan-v1.1.md predates Accounting-foundation-blueprint-v1.md. The plan contains no accounting foundation content. Two statements must eventually be superseded:

- Section 9.4 CIT estimator. Profit-based CIT now requires accounting profit, which the Accounting Foundation produces. The estimator must consume accounting facts and tax adjustments, not a standalone formula.
- Section 3.1 Invoice-only scope. The approved scope now includes the accounting foundation as downstream architecture.

No accounting capability is implemented by this task. The blueprint remains the design source of truth for the foundation.

## CIT, VAT, WHT, and Compliance Impact

CIT: The plan has one estimator reference (9.4) with no formula. Accounting-profit, expense, tax-adjustment, capital-allowance, and loss dependencies are absent from the plan. Development Levy is named but not specified. These become Phase 2-3 roadmap gates under the blueprint, not blockers for the e-invoicing engine.

VAT: Document-level calculations in sections 5.2-5.9 are current. The deadline row is unresolved. Reverse gross-to-net derivation is not in the plan; it is new calculation-engine work defined in Record-capture-v1.md section 3.3.

WHT: The plan covers WHT suffered on sales invoices. It does not distinguish WHT deducted by BIGDROPS, which lives in Record-capture-v1.md and Files-tax-monthly-v1.md. The wht_receipts ledger exists and supports the tax-credit evidence path. The rate table and remittance deadline stay unresolved.

Compliance and filing: The plan separates calculation from transmission. The adapter reshapes only. This matches the current rule that renderers receive prepared data. API integration stays out of scope. The plan's APP-based model is consistent with Files-tax section 4.11.

## Roadmap-Readiness Assessment

Technical-plan-v1.1.md is suitable as the current technical baseline for Waterfall Roadmap planning. It is not fully suitable without gates. The exact limitations are:

1. The e-invoicing data model (section 4), adapter (section 7), and UI (section 6) are not implemented. They are roadmap work, not blockers.
2. The APP selection (11.1) blocks Module 4. It is a decision gate.
3. Statutory values must come from the repository. The WHT rate table, the VAT registration threshold, and the general VAT return deadline are unresolved. They are evidence gates, not blockers.
4. The small-company threshold is corrected to ₦50,000,000. The dashboard must use the corrected value.
5. Profit-based CIT is future work. It depends on the Accounting Foundation (Phase 1) and the accounting-to-tax bridge (Phase 2). It does not block the invoice e-invoicing engine.

None of the limitations block the Waterfall Roadmap from being written. They must appear as explicit gates.

## Changes Made

Technical-plan-v1.1.md:

- Document Control 0.4 added. It records the 2026-09-05 evidence corrections.
- Section 5.7 patch extended. The rate table values are labeled working assumptions, not statutory authority. The carried-forward client-entity-type note is flagged as superseded by this patch.
- Section 8.1 patch extended. The 21st is labeled a PRD default, not verified authority. The verified §155(4) day-14 scope is stated. The lookup column name recommendation changed to default_due_day.
- New section 8.3 added. The small-company turnover threshold is corrected to ₦50,000,000 per verified NTA 2025 section 202, line 4502. The VAT registration threshold remains marked unresolved.
- Open question 11.5 closed as answered. Calculations.ts uses decimal.js, precision 20, ROUND_HALF_UP (line 38). No second library is needed.
- Section 12 changelog extended with the 2026-09-05 evidence-correction rows.

Readme.md:

- The three Technical-plan-v1.2.md references corrected to Technical-plan-v1.1.md. The v1.2 file does not exist and was not created.
- Update log row added for the correction.

No application code, schema, migration, database object, UI, or tax-engine code was changed. Technical-plan-v1.2.md was not created.

## Verification

- git status before changes: captured. All pre-existing work was preserved untouched.
- Repository inspection: Technical-plan-v1.1.md exists; Technical-plan-v1.2.md does not.
- Evidence checks: wht_receipts table confirmed in migration 20260520090003_invoices.sql. Calculations.ts confirmed on Decimal.js precision 20 ROUND_HALF_UP. No NRS e-invoicing field found in src/. ComplianceHub.tsx exists.
- Diff review: Technical-plan-v1.1.md and Readme.md diffs contain only the intended corrections.
- git status after changes: only the two documentation files and this report are attributable to this task.
- No build, typecheck, lint, or audit:load command was run. The task forbade them.

## Risks or Limitations

- Sections 1.8 and 9.1-9.3 carry status claims from the v1.0 audit. They were not re-verified against current code in this task. Re-verify before implementation.
- Files-tax-monthly-v1.md still references Technical-plan-v1.2.md in sections 1 and 8. This task did not modify Files-tax-monthly-v1.md. The references conflict with this audit's finding. Correct them in a separate small documentation task.
- The v1.1 document carries forward v1.0 text. A reader must merge both files. This structure is a known limitation.

## Deferred Decisions

- Files-tax-monthly-v1.md v1.2 references. Correction deferred to a separate task.
- APP selection (11.1). Open decision.
- WHT rate table values. Await the subsidiary regulation.
- VAT registration threshold. Await a primary source.
- General VAT return deadline. Await the NTAA 2025 primary text.
- Audit diffing registration question (11.3) and IH-5 mapping (11.4). Await implementation-phase verification.

## Recommendation for the Next Architecture or Roadmap Step

Write the Waterfall Roadmap against Technical-plan-v1.1.md as the verified baseline. Represent the unresolved items as explicit gates. Sequence the e-invoicing engine (data model, adapter, UI) as current-scope work. Sequence the Accounting Foundation (blueprint Phase 1) and the accounting-to-tax bridge (Phase 2) before any profit-based CIT work. Do not gate the roadmap on Technical-plan-v1.2.md, which does not exist.