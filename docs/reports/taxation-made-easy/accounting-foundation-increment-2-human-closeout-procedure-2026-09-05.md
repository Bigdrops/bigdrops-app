# Accounting Foundation Increment 2 Human Close-Out Procedure

This report was written by Muse Spark on 2026-09-05 via OpenCode.

## Purpose

Define the exact sanctioned procedure a real authorized workspace owner follows to close the Increment 2 positive-path gate. This task is documentation-only. No code, migration, schema, RPC, RLS, test, or live data changed. Increment 2 remains OPEN until a human completes this procedure and supplies the evidence.

## Authentication Path (Supported)

- Sign in with the workspace owner's real credentials through the application Supabase client (anon key plus signInWithPassword). The resulting user JWT is the authenticated operator context.
- Every subsequent call uses that JWT. No other credential is valid proof.
- Service-role access is explicitly excluded as positive-path evidence. It demonstrates SQL acceptance, never tenant authorization.

## Authorization Requirement

- The operator needs entity_permissions rows for the target entity: journal create (posting), account view, period view, period create, period edit (period lifecycle), plus journal view for verification reads.
- Workspace owners hold these rows through the canonical default-permission seeder (extended in Increment 2 with account, period, and journal). No grant step is part of this procedure. If any row is missing, stop and report; do not invent grants.

## Entity Selection Procedure

- The operator picks one real entity they own, through the application entity switcher.
- The operator reads its id from public.entities through the authenticated client (entities_select_member permits member reads).
- The tenant schema name derives as entity_<workspace_slug>_<entity_slug>. Slugs are member-visible. This derivation is the same rule the provisioning engine uses. The schema name is never stored as an ownership key.

## Period-Opening Mechanism (Resolved)

- Finding: no dedicated period RPC, function, or UI exists. Zero application references to accounting_periods, journal_entries, journal_lines, or post_accounting_entry exist outside the Increment 2 contract test.
- Resolution: direct authenticated table operations through the tenant client are the intended and only supported mechanism.
- Create: INSERT one row into <entity_schema>.accounting_periods with a code, start_date, end_date, and default planned state. Requires period/create permission under RLS.
- Open: UPDATE the same row SET state = 'open' WHERE id = <period_id>. Requires period/edit permission under RLS. The period guard trigger permits only planned to open and rejects all other transitions from planned.
- Why this is safe: RLS (forced) restricts the write to permission holders of this entity only; the trigger enforces the lifecycle; CHECK constraints enforce state vocabulary and date order. The prior report's direct UPDATE prescription is therefore valid, with these authorization conditions attached.
- Suggested period: code CLOSEOUT-2026-09, start 2026-09-01, end 2026-09-30. Transaction date inside September 2026.

## Account Selection Mechanism

- Read <entity_schema>.accounting_accounts through the tenant client (account/view permission). Select two active seeded accounts, for example code 1100 Bank (asset, debit-normal) and code 4000 Revenue (revenue, credit-normal).
- Assert active is true for both before posting.

## Posting Invocation Shape

- Call path: root authenticated client, NOT the tenant-schema client. Pattern: supabase.rpc('post_accounting_entry', { p_entity_id, p_entry, p_lines }). Precedent: src/domain/tenant/tenantCreation.ts invokes public provision_entity and accept_workspace_invitation through the root client. The RPC resolves the tenant schema internally from p_entity_id.
- p_entry: period_code CLOSEOUT-2026-09; transaction_date inside the period; source_type closeout-selftest; source_id closeout-001; idempotency_key closeout:001:post; memo CLOSEOUT SELFTEST.
- p_lines: line 1 account_code 1100, side debit, amount '100.00'; line 2 account_code 4000, side credit, amount '100.00'.
- Amounts are strings with exactly two decimals. No float values cross this boundary.

## Expected Successful Response

- JSON object with id (uuid), status posted, total_debits 100.00, total_credits 100.00, line_count 2.

## Persistence Assertions

Through the tenant client, the operator asserts:

- One journal_entries row with the returned id, status posted, the chosen period_id, matching transaction date, source, and idempotency key.
- Two journal_lines rows with entry_id equal to the entry id, correct account ids, sides debit and credit, amounts 100.00 and 100.00.
- SUM(debit) equals SUM(credit) exactly.
- No negative amounts. Amount scale is 2.
- No rows from any other entity are visible.

## Entity-Isolation Assertions

- The operator sees only their entity's rows. Cross-entity ids are unknown to them and unreachable: the permission gate denies the RPC and RLS denies the tables.

## Immutability Assertions

Through the tenant client (never service-role), the operator attempts:

- UPDATE journal_entries SET memo (expect rejection, posted-entry immutable error).
- DELETE FROM journal_entries (expect rejection).
- UPDATE and DELETE on each journal line (expect rejection).
- Re-query and assert all facts unchanged.

## Invalid-Posting Assertions

- Submit the same shape with credit amount '99.99' and a fresh idempotency key (expect unbalanced rejection).
- Assert no posted row with the fresh key exists and no orphan lines exist.
- Assert the valid entry from the success step is unchanged.

## Reversal and Retention Procedure

- Posted facts are never deleted. The successful test entry remains permanently, with its SELFTEST memo.
- Post a mirror reversal through post_accounting_entry: same period (must still be open), lines flipped (1100 credit 100.00, 4000 debit 100.00), source_type closeout-selftest, source_id closeout-001-reversal, fresh idempotency key closeout:002:reversal, reversal_of_entry_id set to the original entry id.
- The trigger verifies the target exists and is posted. The original row is never mutated.
- Net effect on the books is zero. Record both entry ids as the close-out evidence.

## Security Restrictions

- No synthetic users, permissions, entities, or grants.
- No service-role calls as proof at any step.
- No direct deletion of posted facts, even for cleanup.
- No RLS, trigger, RPC, or schema change to make any step pass. A step failure is a finding, not a fix task.

## Limitations

- The operator needs journal/create plus the period and account permissions listed above. Without them, the procedure stops at authorization.
- The procedure writes permanent test facts (entry plus reversal). Amounts stay minimal (100.00) and memos stay explicit.

## Final Operator Checklist

- [ ] Signed in as workspace owner (user JWT, anon-key client).
- [ ] Entity id resolved; operator holds journal, account, and period permissions.
- [ ] Two active seed accounts selected (1100, 4000).
- [ ] Period created planned, opened via authenticated UPDATE.
- [ ] Balanced 100.00 posting succeeded; response totals match.
- [ ] Entry and lines verified; exact balance; scale 2; same entity.
- [ ] UPDATE and DELETE on posted facts rejected; facts unchanged.
- [ ] Unbalanced posting rejected; no residual rows.
- [ ] Mirror reversal posted; both ids recorded.
- [ ] Evidence attached to the gate-closure note.

## Before and After Git Status

- Before: 5 staged additions from prior Increment 2 work plus 1 untracked third-party directory, all preserved untouched.
- After: identical, plus this new untracked report file. No other change.
- Build, typecheck, lint, and audit:load were not run per task exclusion.
