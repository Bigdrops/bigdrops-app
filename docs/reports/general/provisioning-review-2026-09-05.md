# Canonical Provisioning Review Report

This report was written by Muse Spark on 2026-09-05 via OpenCode.

## Objective

Determine why blank waybill logging fails on a fresh tenant. Fix the canonical path if broken.

## Scope

- Inspected: writer path, table definition, RLS, predicates, grants, permissions, Main parity.
- Changed: one error branch on the blank-download path.
- Untouched: provisioning engine, RLS, lifecycle, business data, UI design.

## Files Changed

- `src/pages/WaybillFormPage.tsx`: permission-denied maps to an actionable message.

## Skills Used

Skills used: supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- No provisioning change was needed. Evidence proves the path is complete.
- The catch block now distinguishes authorization failure from system failure.

## Verification Result

- Live predicate check: owner `has_entity_permission` returns true.
- Table, policy, and grant parity between Main and Anthropology confirmed.
- `bun run typecheck`: passed.
- `bun run audit:load`: passed (pre-existing warnings only).
- Focused tests: 17 pass. Four `userFacingMutationErrors` failures are pre-existing in an untouched file.
- `git status`: only `WaybillFormPage.tsx` changed.
- `bun run build`: not executed. Docker not started.

## Risks and Limitations

- The failing caller identity is inferred from permission rows, not session logs.
- No fresh production company was created for testing. Creation is prohibited.
- Non-owner members still cannot log blank waybills. This is deny-by-default design.

## Deferred Work

- Pre-existing `userFacingMutationErrors` test mismatch.
- Member onboarding grant flow (product decision required).
