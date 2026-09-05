# Luca V0.5 Accounting Architecture Reference

REFERENCE ONLY — NOT STATUTORY AUTHORITY

This document is not a statutory source. The canonical NTA 2025
materials in NRS-docs/ remain the source of truth. Do not copy Luca
source code. Luca is licensed under the Luca Community License v1.0.

## Source

- Repository: `roger296/lucaV0.5` (https://github.com/roger296/lucaV0.5)
- Version: 0.5.0 (`luca-general-ledger`)
- License: Luca Community License v1.0 (eTail Support Limited)
- Audit date: 2026-09-05

## Purpose

This document preserves the reusable accounting-architecture knowledge from Luca V0.5 that is relevant to the BIGDROPS Taxation PRD. It is reference material only. It is not a specification and not an implementation plan.

The BIGDROPS CIT readiness audit (2026-09-05) established that BIGDROPS lacks the accounting-to-tax bridge required for defensible CIT. This reference records which Luca ideas are worth reusing when the native BIGDROPS accounting foundation is designed.

## Why Luca Is Relevant to the BIGDROPS Tax PRD

Luca demonstrates a complete double-entry general ledger: journal posting, balanced validation, accounting periods, idempotency, corrections, and an append-only audit trail. BIGDROPS has none of these today. The concepts below are the minimum accounting foundation the CIT bridge requires.

Luca is a reference architecture only. It is not a dependency, not a service to adopt, and not an implementation target. The Luca vs BIGDROPS accounting architecture audit (2026-09-05) classified it as REFERENCE ARCHITECTURE ONLY.

## Reusable Accounting Architecture Patterns

### Double-entry accounting

- A journal entry is a transaction with two or more transaction lines.
- Each line carries a debit or a credit against a chart-of-accounts code.
- Posting is rejected if total debits do not equal total credits.

### Financial precision

- All money arithmetic uses a decimal-safe library (Luca uses Decimal.js).
- Floating-point arithmetic is never used for monetary values.
- Rounding happens at display or final-result time, not during accumulation.

### Accounting periods

- Every transaction belongs to an explicit period.
- A period has a state: OPEN, SOFT_CLOSE, or HARD_CLOSE.
- Posting to a HARD_CLOSE period is rejected. Posting to a SOFT_CLOSE period requires an explicit override.
- Period state is enforced at posting time, not only in the UI.

### Idempotent financial posting

- Every submission can carry an idempotency key.
- The key is unique; a repeated submission with the same key does not create a duplicate posting.
- This is the mechanism that prevents double-posting when a caller retries after a timeout.

### Corrections

- Accounting records are never edited in place.
- An error is corrected by posting a counter-balancing entry that reverses the original.
- A prior-period correction is a distinct journal type (PRIOR_PERIOD_ADJUSTMENT).

### Auditability

- The journal is append-only. Historical records are never updated or deleted.
- Luca adds a cryptographic layer: each entry is SHA-256 hash-linked to the previous entry, forming a chain file, and a Merkle tree can verify the whole chain.
- The cryptographic hash-chain is an optional stronger-integrity pattern. The immutable append-only journal principle is the core requirement; the hash-chain is an implementation detail that BIGDROPS may or may not adopt.

## Accounting-to-CIT Implications

Preserve the architectural distinction: accounting profit is NOT automatically taxable or assessable profit.

The future BIGDROPS flow must conceptually separate:

1. Accounting profit (from the income statement).
2. Statutory tax adjustments (add-backs and disallowances per the NTA).
3. Losses and carry-forward treatment.
4. Capital allowances.
5. Taxable/assessable/total profits.
6. CIT and Development Levy.

Luca provides the accounting-profit stage only. Every stage after it is a BIGDROPS tax-domain responsibility.

## Fixed-Asset / Capital-Allowance Lesson

Luca demonstrates an important gap: a DEPRECIATION journal entry is not a fixed-asset register.

In Luca, depreciation is only a journal transaction type. There is no asset register, no depreciation schedule, and no asset lifecycle.

BIGDROPS will require first-class asset records with lifecycle data sufficient to support Nigerian capital-allowance computation: acquisition cost, acquisition date, asset category, and business-use proportion.

## Capital Allowances vs Depreciation

Accounting depreciation and Nigerian statutory capital allowances are separate concepts. They must not be conflated.

- Depreciation is an accounting allocation of an asset's cost over its useful life.
- Capital allowance is a statutory deduction computed under the First Schedule to the Nigeria Tax Act, 2025, with its own rates and rules.
- BIGDROPS needs asset data to compute the statutory adjustment separately from whatever depreciation method the accounting layer uses.

## What BIGDROPS Should NOT Adopt from Luca

- **Single-tenant persistence.** Luca has no tenant model; every ledger table is global and `company_settings` is a single row. This is not suitable for BIGDROPS's multi-tenant Supabase/RLS architecture and must not be copied.
- **Its authentication model.** Luca uses JWT with a roles array and no workspace concept. BIGDROPS's per-tenant authorization stays.
- **Its service architecture.** Luca is a separate Node/Express service with its own PostgreSQL and chain files. BIGDROPS is a Bun/Supabase/Vercel stack. The useful lesson is the accounting architecture, not Luca's persistence, authentication, or deployment model.
- **Its UK-oriented tax conventions.** Luca's VAT return is a UK quarterly form with UK account codes. Nothing in Luca reflects Nigerian legislation.

## Nigerian Tax Boundary

Luca does not provide the Nigerian statutory CIT layer. Nigerian CIT rules, tax adjustments, capital allowances, losses, Development Levy, company classification, and filing logic remain BIGDROPS tax-domain responsibilities.

Luca is not a Nigerian tax authority and is not a statutory source. Its tax logic is not authoritative for the Nigeria Tax Act, 2025. The canonical NTA 2025 documents in `NRS-docs/` remain the statutory source of truth.

## Relationship to the Completed Luca vs BIGDROPS Audit

This reference is a curated extract of the full audit report:

`docs/reports/GENERAL/luca-vs-bigdrops-accounting-architecture-audit-2026-09-05.md`

The audit contains the full capability matrix, multi-tenancy comparison, integration model, financial-integrity review, and build-vs-adopt analysis. Read the audit for the complete evidence. Read this reference for the patterns worth reusing.

## Status

Luca is a reference architecture only. It is not a dependency and not an implementation target. No Luca code was copied into this repository. No adoption is recommended.

When BIGDROPS designs its native accounting foundation for CIT readiness, the reusable ideas are: double-entry journal, decimal-safe arithmetic, explicit periods with posting-time enforcement, idempotency keys, counter-balancing corrections, and an append-only audit journal. Everything else must be designed for BIGDROPS's multi-tenant, Nigerian-tax context.