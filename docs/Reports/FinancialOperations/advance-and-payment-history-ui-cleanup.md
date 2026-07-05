# Advance Invoice & Payment History UI Cleanup

This report was written by OpenCode on 2026-07-05 via Local Runner.

## Objective & Scope

Remove the payment status badge from the Advance Invoice card and fix orphaned separator artifacts in Payment History transaction rows. UI-only changes — no business logic, database, or service layer touched.

## Changes

### 1. AdvanceInvoicesCard.tsx (line 66-68)

**Before:** `Issued {date} • {status}` — displayed invoice status (e.g., "unpaid", "paid", "partially paid") after a bullet separator on the same line as the issue date.

**After:** `Issued {date}` — status removed, trailing bullet removed. If no issue date, the subtitle div remains empty.

### 2. PaymentHistoryCard.tsx (line 96-98)

**Before:** `{payment.notes ? ` • ${payment.notes}` : ""}` — only rendered the `notes` field with a conditional bullet; did not render the `reference` field at all.

**After:** `{payment.notes || payment.reference ? ` • ${[payment.reference, payment.notes].filter(Boolean).join(" • ")}` : ""}` — renders both `reference` and `notes` fields; the bullet separator only appears between non-empty values. Handles all four cases:
- Neither field present → just date
- Reference only → `date • ref`
- Notes only → `date • notes`
- Both present → `date • ref • notes`

## Files Modified

- `src/components/document-view/invoice/sections/AdvanceInvoicesCard.tsx` — removed `{advanceInvoice.status}` and trailing ` • ` from subtitle line.
- `src/components/document-view/invoice/sections/PaymentHistoryCard.tsx` — replaced simple notes-only conditional with combined reference+notes rendering via `.filter(Boolean).join(" • ")`.

## Verification

- `bun run typecheck` — PASSED (all errors are pre-existing waybill/render test type issues unrelated to these changes).
- `bun run audit:load` — PASSED (no new warnings).

## Deferred Work

- The AdvanceInvoice card still uses CSS module imports (`InvoiceWorkspace.module.css`). A full migration to Tailwind was out of scope — this task was status removal only.
