# Core Guardrails

## Overview

These guardrails protect business correctness. Do not violate them unless the user explicitly instructs otherwise. They cover financial calculation integrity, domain boundaries, document lifecycle, and database safety.

## Rules

### Financial Calculations

`src/lib/Calculations.ts` is the financial source of truth.

- Use `computeDocument()` for financial calculations. It wraps `normalizeDocumentInput()` and `calculateDocument()` and is the only entry point used in production.
- `calcTotals()` and `resolveRowVat()` in `src/domain/invoice/calculations.ts` are deprecated. They have no production callers as of 2026-09-04. Do not call them in new code. Do not remove them without a separate, explicit task — this patch does not authorize deletion.
- Do not duplicate financial calculation logic.
- Do not bypass `Calculations.ts`.
- Quotations must reuse the invoice/domain financial layer.

### Domain Boundaries

- PDFs are renderers. They receive prepared data only.
- PDFs must not calculate prices, taxes, totals, VAT, or discounts.
- Quotation logic must reuse the invoice domain layer.
- When transforming invoice items to waybills, remove monetary values:
  - `unit_price`
  - `rate`
  - `vat`
  - `discount`
  - `subtotal`
  - `grand_total`

### Document Lifecycle

Edit, duplicate, revert, and transformation operations must follow:

- `docs/standard/document-transformation-standard.md`

This standard defines the 3 Laws System (Edit, Duplicate, Revert) and the identity immutability contract for all financial documents.

### Database Guardrails

- You MUST write a migration file for every schema change.
- You MUST push the migration with `supabase db push`.
- You MUST fix every error that Supabase returns. Push again after each fix.
- You MUST repeat the push-and-fix loop until the push succeeds.
- Do NOT stop after you write the SQL file. The push is part of the task.
- Do NOT mark the task complete if the push fails.
- Skip the push only when the user says "do not push" in clear words.
- Do NOT edit the hosted database by hand.
- Do NOT run Docker. Do NOT run `supabase start`.
- Follow `supabase/database-workflow.md` for the full procedure.
- Use the Supabase skills in this order: db diff, db shell, db dump.

### Supabase Skills Usage

When working with SQL and Supabase, follow `supabase/database-workflow.md`:

1. `supabase db diff --linked` — find what is out of sync.
2. `supabase db shell` — run probe queries.
3. `supabase db dump --linked` — get the live schema.

## Examples

### Good

```bash
# Always push migrations and fix errors
supabase db push
# If it fails, read the error, fix the SQL, push again until it succeeds
```

### Avoid

```bash
# DO NOT write a migration file and stop — the push is part of the task
# DO NOT edit the hosted database by hand
# DO NOT run supabase start (Docker not available)
```
