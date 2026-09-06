# Increment 6 — Controlled Remediation: v1 Design Boundary

Purpose.
Proof and enable safe remediation of explicitly identified accounting gaps,
reusing the Increment 4A/4B posting path. Do not introduce bulk backfill.

Locked boundary.
- Reconciliation remains read-only. Increment 5 is unchanged.
- Remediation re-validates the operational fact server-side before any
  Source Transaction is created.
- Remediation re-checks that the accounting fact is still genuinely missing
  before any posting.
- Remediation uses only the existing boundary:
    ingest_source_transaction
    -> confirm_source_transaction
    -> post_from_source_transaction
    -> post_accounting_entry
- Remediation never writes journal entries directly.
- Remediation never modifies Invoice/Payment records to make them reconcile.
- Remediation uses exact decimal amounts only.
- Remediation preserves the operational transaction date; it does not use
  the current date for historical facts.

Historical gaps.
The ~300 real pre-cutover Invoice/Payment gaps on `main` are NOT
bulk-repaired in this increment. They remain detected by Increment 5.
No automatic scan, no automatic postback, no implicit approval.

Remediation authority (v1).
- No production remediation lane exists yet.
- An authorized reviewer may remediate an explicitly identified, qualified
  fact through the controlled boundary, if the current implementation
  provides that path.
- If the repository does not yet expose that path safely, the increment
  proves safety only and does not ship an operator backfill path either.
- Any future backfill of the ~300 gaps requires an explicit separate decision.

Non-repairable (detection only).
- Journal mismatches.
- Orphaned source transactions.
- Duplicate accounting facts.
- Journals without source transactions.
- Historical records with insufficient authoritative amount/date.
- Any fact whose accounting treatment cannot be established from 4A/4B.

Result codes.
- REPAIRED
- ALREADY_RESOLVED
- BLOCKED_NO_OPEN_PERIOD
- NOT_REPAIRABLE
- NOT_FOUND

This document is the boundary. It is not an implementation.
