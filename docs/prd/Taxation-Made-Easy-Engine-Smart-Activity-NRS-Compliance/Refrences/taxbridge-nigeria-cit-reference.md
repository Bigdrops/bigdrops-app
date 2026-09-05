# TaxBridge Nigeria CIT Reference

> **STATUS: REFERENCE ONLY — NOT STATUTORY AUTHORITY.**

## Source

- Repository: `Scardubu/taxbridge` (https://github.com/Scardubu/taxbridge)
- Inspected: 2026-09-05 (shallow clone, read-only)
- package.json version: 1.0.0 (README claims v12.0.0 production)
- License: proprietary
- Stack: Fastify, Prisma, PostgreSQL, Redis/BullMQ, Next admin, Expo mobile

## Why This Reference Exists

The BIGDROPS CIT readiness audit established that BIGDROPS lacks the accounting-to-tax bridge for defensible CIT. TaxBridge was evaluated as a possible reference for the Nigerian CIT calculation layer. This document preserves only the durable knowledge useful to future BIGDROPS tax-engine development. It is not a spec and not a recommendation to adopt.

## Relevant CIT Architecture

- Pure-function tax engine in a shared contracts package: `calculateCIT(input): result`.
- Centralized rate constants with an explicit "never inline tax rates" discipline.
- Idempotent filing route: validate → compute → persist filing → write audit event → generate filing reference.
- Boundary-focused unit tests.

## Useful Calculation Patterns

- A single pure entry point for each tax type (the BIGDROPS analogue is `computeDocument()` in `src/lib/Calculations.ts`).
- Typed input/output contracts for the calculator.
- Loss offset applied as `max(0, taxableProfit - lossCarryforward)` before the rate.
- Exempt-company early return that yields zero CIT and zero levy.

## Useful Nigerian Rule Patterns (concept, not values)

- Small-company vs other-company rate differentiation.
- Development Levy modeled as a separate additional amount on top of CIT, not inside the CIT rate.
- Loss carry-forward as an explicit input to the computation.

## Useful Test Patterns

- Boundary tests at and around the classification threshold.
- Zero-profit, zero-income, and non-negative-liability assertions.
- Levy on/off tests.
- Loss-offset reduction tests.

## Useful Statute-Citation Pattern

- Block-level comments naming the governing section. The lesson: BIGDROPS must attach citations per rule and per calculation step, and keep them aligned with the canonical NTA 2025 section numbers in `NRS-docs/`.

## Useful Rule-Versioning Pattern

- TaxBridge has none. The lesson: BIGDROPS must design effective-date and year-of-assessment parameterization from the start, because TaxBridge's lack of versioning is a demonstrated failure mode.

## Capital-Allowance Lessons

- TaxBridge has no capital allowances at all. A CIT calculator that accepts `taxableProfit` and applies a rate is not a capital-allowance engine.
- BIGDROPS must build asset-level records (cost, date, category, business-use proportion) and the First Schedule computation separately from the rate application.

## Loss-Treatment Lessons

- A single `taxLossCarryforward` number is insufficient. NTA §27(5) requires: same trade only, first year after the loss, subsequent years until recouped.
- BIGDROPS needs a per-year loss register, not a single offset.

## Classification Lessons

- Turnover-only classification is incomplete. NTA §202 requires turnover (₦50M or less), fixed assets (₦250M or less), and the professional-services exclusion.
- The ₦100M threshold used by TaxBridge matches the known BIGDROPS Technical-plan §8.3 documentation conflict. It is not the statutory value and must not be adopted.

## Known Limitations / Incorrect Assumptions

- Three inconsistent CIT implementations coexist in the repository (`cit.ts`, `nta2025.ts`, `backend/config/nta2025-rules.json`). No single source of truth in practice.
- A 20% "medium" CIT band appears in two implementations. It is not in the canonical NTA 2025 (0% small / 30% other, 25% by Order).
- `taxableProfit` is derived as `revenue - expenses` in the route. That is the shortcut the BIGDROPS audit explicitly rejected.
- Development Levy applicability is wired to digital income. The levy's statutory trigger is company classification (NTA §59).
- A ₦1B minimum-ETR threshold appears in docs and rules.json. NTA §57 applies only to €750M groups / ₦50B-turnover companies.
- All money math uses `Math.round` on JavaScript numbers. No decimal library. Floating-point arithmetic is not acceptable for the BIGDROPS financial layer.
- Section citations are inconsistent and wrong (§55, §40/90, §60A, §11–12). None matches the canonical numbering (rates §56, levy §59, classification §202).
- Documentation describes features (EDT, employee count, minimum ETR) that the active engine does not implement.

## What BIGDROPS May Borrow Conceptually

- Pure-function calculator with typed contracts.
- Centralized constants with a no-inline discipline.
- Idempotent filing submission with reference and audit event.
- Boundary test style.

## What BIGDROPS Must Independently Verify Against NTA 2025

- Classification threshold: NTA §202 — ₦50M turnover, ₦250M fixed assets, professional-services exclusion.
- Rates: NTA §56 — 0% small, 30% other, 25% by presidential Order.
- Development Levy: NTA §59 — 4%, excluding small companies and non-residents.
- Minimum ETR: NTA §57 — €750M groups / ₦50B companies only.
- Losses: NTA §27(5).
- Capital allowances: First Schedule Part I.
- CIT filing deadline: NTAA 2025 (absent from the BIGDROPS repository — still a documented gap).

## Bottom Line

TaxBridge is a structural reference: pure functions, centralized constants, idempotent filing, boundary tests. It is not a values reference: its thresholds, rates, minimum-ETR rule, citations, and money handling must not be copied. The canonical NTA 2025 documents remain the statutory source of truth. The full evidence is in `docs/reports/GENERAL/taxbridge-nigeria-cit-architecture-audit-2026-09-05.md`.