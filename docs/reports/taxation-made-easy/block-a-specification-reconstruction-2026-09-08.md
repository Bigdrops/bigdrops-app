# Block A Specification Reconstruction Report

This report was written by Buffy on 2026-09-08 via Freebuff.

## Objective

Reconstruct the missing Block A: Accounting Foundation Core implementation
specification from authoritative existing documentation and closed
accounting work. Documentation only. No code or migration change.

## Scope

- Reconstruct the canonical Block A specification from the Accounting
  Foundation Blueprint, the CIT-Readiness Roadmap, the Gate A/B decision
  record, and Accounting Foundation Increments 1–10 reports.
- Classify every Block A component as EXISTING / CLOSED, EXISTING /
  RETAIN, REQUIRED GAP, VERIFY DURING IMPLEMENTATION, or DEFERRED /
  DOWNSTREAM.
- Determine whether Block A is still an implementation block.
- Do not rebuild anything the closed increments already delivered.

## Files Changed

- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Block-A-accounting-foundation-core-spec-v1.md (new — the canonical specification)
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md (folder index updated: file directory row, TL;DR section 2h, dependency entry, update log row)
- docs/reports/taxation-made-easy/block-a-specification-reconstruction-2026-09-08.md (this report)

No other file was created or modified. No application code, migration,
schema, test, or unrelated documentation was touched.

## Skills Used

Skills used: karpathy, writing-clearly-and-concisely
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

1. Created the canonical Block A specification at the existing PRD
   folder location, so Block A lives with the blueprint and roadmap it
   depends on. The specification contains: purpose, architectural
   position with the preserved chain (Business Activity → Source
   Transaction → Accounting Classification / Mapping → Posting Kernel →
   Journal → Accounting Period → Financial Reporting → Tax Adjustment →
   CIT), scope, non-scope, existing/closed foundation, component
   architecture with status, minimum data model, invariants, lifecycles,
   boundary rules, posting rules, period controls, correction model,
   reporting dependency, downstream dependencies, implementation
   boundary, dependency map toward P&L and CIT, acceptance criteria
   (12 of 17 already met), and the existing/required/deferred matrix.
2. Determined that Block A is a substantially CLOSED foundation gate,
   not a greenfield implementation block. Increments 1–6 already built
   and verified: entity scoping (Gate A), money precision (Gate B),
   book provisioning, the 11-account chart seed, the posting kernel
   with database-enforced balance, immutability, and idempotency, the
   source transaction boundary, invoice and payment ingestion
   (live-verified end to end), reconciliation detection, and the
   controlled remediation contract.
3. Identified exactly two REQUIRED GAPS, each with binding rules:
   - the journal-derived reporting foundation (account balances,
     trial balance, period totals derived from posted, un-reversed
     lines; derivation-only, read-only, traceable, deterministic);
   - a controlled posted-entry reversal path (the kernel and schema
     carry reversal semantics; no boundary flow exposes them; the
     posted-invoice-cancellation gap from Increment 4A stays open).
4. Recorded VERIFY DURING IMPLEMENTATION items (close/lock operational
   surface, remediation hosted verification, entityRef binding on new
   paths, cache design) and DEFERRED / DOWNSTREAM items (expense
   consumption, purchases, inventory, assets, refunds, other income,
   VAT, WHT, P&L, tax adjustment, CIT).
5. Indexed the specification in the PRD folder Readme as the single
   canonical Block A document, with a dependency entry that forbids
   competing Block A documents.

## Determination

Block A is not still an implementation increment. It is an
architecture/foundation gate that is substantially CLOSED. The smallest
genuine remaining foundation gap is the reporting foundation (section
16 of the specification). It requires no new table, no new posting
path, and no statutory value. The reversal path is the second gap and
is the prerequisite for later credit-note and refund work.

## Verification Result

Verification:
- git status before changes: 4 pre-existing modified source files, 1
  pre-existing staged report, 1 pre-existing untracked directory — all
  belonging to other agents, all preserved untouched
- git status after changes: only the three files above added/modified
  by this task; pre-existing changes intact
- git diff --check: passed
- bun run build: skipped due to hardware policy
- bun run typecheck, bun run test, bun run audit:load: not run (no
  application or schema file changed; task forbids runs)

## Risks or Limitations

- The reconstruction relied on the increment reports as evidence of
  implementation state. Repository inspection confirmed the claimed
  artifacts (domain module, services, adapters, migrations, tests,
  accounting pages) and confirmed the absence of trial balance code.
  The hosted database was not probed.
- The reversal-path gap is inferred from the Increment 4A open-gap
  record plus the absence of any reversal boundary flow in code and
  reports; a hosted probe could confirm no reversal RPC exists.
- The specification marks remaining decisions (close/lock surface,
  balance-authority switch, bank/cash mapping, VAT/WHT treatment) for
  the project lead. It does not decide them.

## Deferred Work

- Gap increment 1: reporting foundation derivation (specification
  section 16).
- Gap increment 2: controlled posted-entry reversal path (section 15).
- Hosted disposable verification of the remediation boundary
  (Increment 6 acceptance item).
- Close/lock operational surface decision (section 8.4).
- Balance-authority switch plan after gap 1 closes.
