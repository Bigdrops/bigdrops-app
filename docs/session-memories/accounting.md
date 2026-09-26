### Handover: Accounting Foundation (Increments 1/2/3)

**Project Status: Implementation of the Source Transaction Tracking Pipeline [1]**

The following components have been implemented and verified as part of the accounting foundation:

*   **Service Layer:** Logic is managed in `src/domain/accounting/sourceTransactions.ts` [1].
*   **Integration Layer:** Handled via `src/modules/accounting/sourceTransactionService.ts` [1].
*   **Database & Security:** Schema updates and Row Level Security (RLS) are contained in the migration file `supabase/migrations/20260906103000_source_transactions.sql` [1].
*   **Testing:** **32 contract tests** have been established in `src/tests/critical/sourceTransactionContract.test.js` to ensure pipeline integrity [1].

**Critical Financial Rules (Strict Adherence Required)**

*   **Calculation Logic:** All financial calculations must be handled exclusively through **`src/lib/Calculations.ts`** via the `computeDocument()` function [2]. **Do not duplicate** this logic in any other part of the codebase [2].
*   **PDF Rendering:** PDF files are strictly **renderers only** [2]. They must not contain any calculations for prices, taxes, VAT, or discounts [2].
*   **Package Manager:** Use **Bun only** for all operations [2].

**Documentation**
A comprehensive report on this increment is available at `docs/reports/general/accounting-increment3-source-transactions-2026-09-06.md` [1].