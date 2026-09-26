# Manual Number Collision Follow-Up Report

This report was written by Muse Spark on 2026-09-26 via opencode.

## Objective

Resolve the contradiction in the prior numbering report. Enforce that conflicting manual numbers are rejected, never substituted. Audit the same-prefix sequence policy from repository evidence only.

## Scope

The shared retry utility, its call sites, and the numbering tests. No other document behavior.

Out of scope:

- Canonical formatting. Unchanged.
- Historical numbers. Untouched.
- Database schema, migrations, RPCs, Settings UI. None touched.

## Files changed

- `src/lib/withUniqueRetry.ts` (manual-authoritative collision rule)
- `src/pages/view-csr-actions.ts` (system duplicate flow keeps pure-auto retry)
- `src/tests/critical/documentNumbering.test.js` (replaced fallback test with rejection proof)
- `docs/reports/invoice-quote/document-numbering-contract-fix.md` (contradiction corrected)
- `docs/reports/invoice-quote/document-numbering-manual-collision-fix.md` (this report)

## Skills used

Skills used: karpathy
Documentation standard: ASD-STE100 Simplified Technical English

The karpathy skill guided this work. It was loaded in this session for the prior numbering task and its discipline still applies. The typescript-advanced-types skill was evaluated and not loaded. No advanced type work was needed. The change adds one boolean flag and one early return.

## Documentation standard

This report uses ASD-STE100 Simplified Technical English. It uses short sentences. It uses active voice. It uses one idea per paragraph.

## Contradiction resolution

The prior report stated both regeneration after manual collision and failure on manual duplicates. Code evidence decides the matter.

`withUniqueRetry` regenerates the candidate before the first attempt. Every `insertFn` assigned the candidate unconditionally. A manual duplicate therefore saved an automatic number with success. Statement 1 described this code path. Statement 2 described intent, not code. Statement 1 was true of the implementation. Statement 2 was false.

The enforced contract is now exact:

- Manual: exact value, then success or explicit duplicate failure.
- Automatic: generated candidate, then collision retry may continue.
- No path converts a manual duplicate into an automatic success.

## Changes made

### `src/lib/withUniqueRetry.ts`

The utility records whether the first candidate came from the caller. On a 23505 collision with a caller-supplied candidate, it returns the duplicate error at once. It never regenerates. Pure automatic candidates keep the existing retry loop unchanged. Non-23505 errors return at once as before.

### `src/pages/view-csr-actions.ts`

The system duplicate flow passed a pre-generated number as the first candidate. Under the new rule that would forfeit retry. It now passes no first candidate. The first attempt regenerates the identical value through the existing closure. Retry behavior is preserved exactly. No user value exists in this flow.

### Other call sites

Invoice, Quotation, Waybill, RFQ, BOQ, and CSR forms pass their displayed field value. Those fields are user-editable in create mode. The displayed value is therefore authoritative by the required definition. Receipt paths pass no first candidate and keep pure-auto retry.

### Prior report correction

The risks section of `document-numbering-contract-fix.md` now states the enforced contract. It points to this report for proof.

## Same-prefix sequence policy

Question: must a manual value such as `SASINV-900000` advance the next automatic invoice to `SASINV-900001`?

Repository evidence:

- Every automatic generator scans existing rows for the active prefix family and takes the maximum trailing sequence. Invoice, Quotation, RFQ, BOQ, Waybill, CSR, receipt, and letter generators all share this max-scan shape.
- Neither AGENTS.md nor the prefix-engine standard states this policy in prose. The standard defines format, not scan membership.
- The retry loop in `withUniqueRetry` depends on the scan. If same-prefix manual numbers were excluded, automatic generation could mint an existing number. The insert would collide. Regeneration would mint it again. The loop would exhaust retries and fail. Participation is therefore load-bearing, not incidental.

Conclusion: the policy is established by implementation evidence across all generators plus the retry design that requires it. No prose rule was invented. Current behavior is preserved. No policy change was made.

## Verification result

Verification:

- `bun run typecheck`: passed with zero errors.
- Focused test `src/tests/critical/documentNumbering.test.js`: 12 passed. This includes the new proof that `SASINV-CUSTOM` against an existing `SASINV-CUSTOM` attempts exactly once, triggers zero regenerations, returns the 23505 error, and substitutes nothing.
- `bun run audit:load`: passed with only pre-existing warnings. Query logic lost one settings read in the CSR duplicate flow. No new warning categories.
- `git status` and `git diff`: only intended files changed. Other agents' files preserved.
- `supabase db push`: not applicable (no SQL change).
- `bun run build`: not executed (banned for this task).

## Supabase push status

No database change. Push not required.

## Risks or limitations

- A pre-filled but unedited number that loses a concurrent race now surfaces a duplicate error instead of silently saving a different number. Recovery is to clear the field and save again, or enter a distinct number. This is more honest than the old silent substitution.
- The prior report's regeneration claim is superseded. This report controls.

## Deferred work

- None. The contract is enforced and proven.
- Dirty-tracking of number fields (to separate untouched pre-filled values from typed values) was considered and rejected. It adds per-form state for a rare race. The current rule is simpler and matches the required behavior exactly.
