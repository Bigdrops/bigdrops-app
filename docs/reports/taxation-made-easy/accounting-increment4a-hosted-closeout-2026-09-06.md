# Accounting Foundation Increment 4A — Hosted Application and Live Verification Closeout Report

This report was written by Buffy on 2026-09-06 via Freebuff.

## Objective

Close Accounting Foundation Increment 4A. Apply the pending Invoice Accounting Adapter migration to the hosted Supabase project and prove that one invoice accounting event produces exactly one balanced journal entry through the existing posting kernel.

Skills used: supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Scope

Closeout only. No adapter redesign, no VAT/WHT treatment, no payment integration, no reversal semantics, no UI, no reconciliation. The only repository file created for this task is this report plus one disposable verification script in the gitignored `supabase/.temp/` directory (existing project convention).

## Migration Application

Pending-migration check before application (`supabase migration list --linked`):

| Local | Remote (applied) | Note |
| --- | --- | --- |
| 20260906103000 | (empty) | Increment 3 source transactions — was never pushed |
| 20260906120000 | (empty) | Increment 4A RPC repair — this task's target |

Ordered application required both. `supabase db push --dry-run` listed exactly these two. With user approval, `supabase db push` applied both in order. Post-application `supabase migration list --linked` records both as applied. No other pending migration existed.

Hosted project confirmed as the intended `bigdrops-app` (`xqlpekpkbszpdgtuwybh`) via `supabase/.temp/project-ref`.

## Repaired RPC Confirmed Live

`post_from_source_transaction()` body read back from `pg_proc.prosrc` on hosted. It contains the repaired form: `v_post_result jsonb`, `SELECT public.post_accounting_entry(...) INTO v_post_result`, `v_entry_id := (v_post_result->>'id')::uuid`, and the unchanged confirmation gate. The Increment 2 kernel `post_accounting_entry()` was not modified.

## Live End-to-End Verification

Method: one SQL script (`supabase/.temp/increment4a_live_verify.sql`, project convention for hosted verification) run through `supabase db query --linked --file`. The whole script is one transaction with `set_config('request.jwt.claim.sub', ...)` supplying the `journal/create` user (`b676c7a8-7834-40dd-bc45-655822c5c5e6`) for the real permission gate, two disposable test invoices, and a full `ROLLBACK`. Nothing was persisted; the evidence is the printed run output.

Entity used: `eca34515-0b30-482c-b12e-3963df164322` (`bigdrops-main` / `main`). Open period: `Idk` (2026-09-06 to 2026-09-30). Claim accounts `1200` and `4000` confirmed seeded before the run.

Evidence (all 14 checks returned `ok = true`):

| Check | Result |
| --- | --- |
| 1. Test invoice created | disposable row, total 12500.50 |
| 3. Ingest | `captured`, `idempotent=false`, source transaction id returned |
| 4. Re-ingest | same id, `idempotent=true`, `source transaction already exists` |
| 5. Confirm | `confirmed` |
| 6. Captured source cannot post | blocked: `only confirmed transactions can be posted` |
| 7. Post via boundary | `posted`, journal entry id returned, kernel reached |
| 8. Kernel duplicate-key backstop | blocked: `duplicate idempotency key: invoice:<id>:post` |
| 9. Posted source transaction is terminal | blocked: `posted source transaction ... is immutable` |
| 10. Balanced entry | debits=12500.50, credits=12500.50 |
| 11. Claim lines only | `1200 debit 12500.50`, `4000 credit 12500.50`, no other lines |
| 12a/12b. Exactly one entry, one source row | 1 and 1 |
| 13. Prior entries intact | pre-existing Increment 2 entry untouched |
| 14. Non-confirmed invoice stays captured | negative control held |

Two probe-design flaws were found and fixed in the script during the run (exception blocks roll back their own writes; a posted source hits the boundary gate before the kernel key check). Both were script issues, not system defects. No repository source file required any change.

Post-run residue check: 0 invoice source transactions, 1 journal entry (the pre-existing one), 0 test invoices. Hosted state is unchanged apart from the two applied migrations.

## Regression Checks

```
bun run typecheck: passed (exit 0)
bun run audit:load: passed (exit 0; remaining warnings pre-existing in untouched files)
bun test src/tests/critical/: 281 pass, 0 fail across 24 files
  - Increment 2 accounting persistence contract: green
  - Increment 3 source transaction contract (32 tests): green
  - Increment 4A invoice accounting integration (21 tests): green
git diff --check: passed (exit 0)
git status: clean; no unrelated workstream files modified
bun run build: not executed (hardware policy)
```

Note: the working tree was committed by a separate process during this session (`c5f6935f` contains the Increment 4A implementation files). This task modified no source files.

## Boundary Statements

- The Invoice → Source Transaction → confirmation → posting boundary → `post_accounting_entry()` → immutable journal path is verified live on the hosted database.
- No direct invoice journal-writing path exists. Invoice code calls three RPCs only; every posting decision stays inside the Increment 2 kernel.
- Idempotency was verified at the ingest boundary, the journal key backstop, and the source-transaction terminal state.
- The journal was balanced with exact kobo amounts (NUMERIC(18,2), Decimal.js ROUND_HALF_UP).
- Entity isolation preserved: all facts entity-scoped; no settings_id accounting ownership.

## Risks and Limitations

- Verification used the hosted-verification pattern (privileged session with simulated JWT claim) rather than a browser UI flow. The permission gate ran for real; the RLS path of the frontend session was not exercised.
- The posted claim policy remains the v1 default (claim at creation). VAT, WHT, batch/pre-cutover bypasses, and reversal semantics remain deferred per Increment 4A decisions.

## Increment 4A — CLOSED

## Deferred Work

- Payment integration (next increment).
- Reversal semantics for source transactions.
- Close the batch status override and pre-cutover creation bypasses.
- VAT and WHT accounting treatment decisions.
