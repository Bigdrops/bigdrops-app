# Accounting List Page Refactor Report

This report was written by Buffy on 2026-09-06 via Freebuff.

## Objective

Restructure the Accounting section list pages to match the established RFQ list pattern, and fix the dead-tap defect on Chart of Accounts rows.

## Scope

- src/pages/accounting/AccountingOverview.tsx
- src/pages/accounting/Journal.tsx
- src/pages/accounting/Periods.tsx
- src/pages/accounting/Accounts.tsx

## Files changed

- src/pages/accounting/AccountingOverview.tsx — removed Create Journal Entry from the Accounting overview list
- src/pages/accounting/Journal.tsx — removed exposed New Journal Entry button, added FAB, used ModuleShell primary action slot
- src/pages/accounting/Periods.tsx — moved New period form into beforeListContent, added FAB
- src/pages/accounting/Accounts.tsx — removed misleading empty state text; no FAB added

## Skills used

mobile-app-ui-design

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Reference pattern

The canonical RFQ pattern is the RfqList module at src/components/rfq/RfqList.tsx. The pattern has these parts:

- Header: eyebrow label + title + summary count + search
- Optional filter controls and header actions
- ModuleShell main action slot for creation
- MobileFab in the bottom-right outside the shell
- List body rendered by ModuleShell
- Empty state when there are no records

That module uses MobileFab from src/components/layout/MobileFab.tsx.

### Journal

Before:

- Journal was a list page with an exposed full-width "New Journal Entry" button above the list.
- AccountingOverview.tsx linked to both /accounting/journal and /accounting/journal/new.

After:

- Journal now uses the same ModuleShell header pattern as RFQs, including search and entry count.
- The exposed New Journal Entry button is removed.
- Creation moves to the MobileFab and to the ModuleShell primary action slot.
- The destination is still /accounting/journal/new, which reuses the existing NewJournalEntry component.

### Accounting Periods

Before:

- Periods had an exposed New period form at the top of the page, above the list.

After:

- The New period form moves into the beforeListContent slot.
- The header gets a primary action label.
- A MobileFab is added.
- The creation form is still the same inline form. It was not rebuilt.

### Chart of Accounts

Before:

- Accounts rendered 11 rows from the seed chart of accounts using ModuleRowCard.
- ModuleRowCard applies cursor-pointer, hover, active scaling, keyboard activation, and role="button" when onClick is provided.
- Accounts.tsx did not pass onClick, so the row was visually interactive but non-functional.
- The empty state text implied the chart might not be seeded yet, which is misleading for a seed-driven chart.

After:

- The empty state text no longer implies the chart may be missing. It now says "No accounts match this search."
- No FAB was added. The app does not expose an account-creation path in the Accounting section, and there is no account create permission in the authorization surface. A non-functional FAB would be a worse defect than no FAB at all.

### Same anti-pattern elsewhere

These pages still pin a create form above the list instead of using the RFQ pattern:

- src/pages/Boqs.tsx — NewBoq is a separate page
- src/pages/Projects.tsx — NewProject is a separate page
- src/pages/Invoices.tsx — NewInvoice is a separate page
- src/pages/Waybills.tsx — NewWaybill is a separate page
- src/pages/Letters.tsx — NewLetter is a separate page
- src/pages/Clients.tsx — AddClient is a separate page
- src/pages/Rfqs.tsx — already follows the RFQ pattern
- src/pages/Quotations.tsx — already follows the RFQ pattern

This task did not fix those. They are listed here for deliberate follow-up scoping.

## Proof

### Journal

Before:

- src/pages/accounting/Journal.tsx contained an explicit New Journal Entry button block:
  - full-width button
  - onClick navigating to /accounting/journal/new
  - rendered above ModuleShell

After:

- src/pages/accounting/Journal.tsx no longer has:
  - the Plus import
  - the exposed New Journal Entry button
  - a separate create banner div above the shell
- src/pages/accounting/Journal.tsx now has:
  - import MobileFab from '@/components/layout/MobileFab'
  - onPrimaryAction={() => navigate('/accounting/journal/new')}
  - primaryActionLabel="New entry"
  - MobileFab rendered when canCreate is true

### Accounting Periods

Before:

- src/pages/accounting/Periods.tsx rendered the New period form directly above ModuleShell, inside the page wrapper, guarded by canCreate.

After:

- src/pages/accounting/Periods.tsx now renders that same form inside beforeListContent.
- The same create handler, inputs, and Create button are preserved.
- MobileFab is added when canCreate is true.

### Chart of Accounts

Before:

- src/pages/accounting/Accounts.tsx empty state said:
  - "No accounts match this search, or the chart has not been seeded for this entity."
  - "The entity schema is still provisioning."

After:

- src/pages/accounting/Accounts.tsx empty state now says:
  - "No accounts match this search."
  - "The entity schema is still provisioning."

Visual rendering was not verified in this environment. Screenshots are not included here. The proof is the component structure and the code paths above.

## Chart of Accounts data question

Question: Are these 11 rows the real seed chart of accounts from the accounting domain kernel work?

Answer: Yes.

The rows rendered in Accounts.tsx come from listAccounts(), which reads from accounting_accounts.

The seed chart itself is defined in src/domain/accounting/chartOfAccounts.ts.

That file exports SEED_ACCOUNT_GROUPS with these 11 entries:

1. 1000 Cash
2. 1100 Bank
3. 1200 Accounts Receivable
4. 1500 Fixed Assets
5. 1510 Accumulated Depreciation
6. 2000 Accounts Payable
7. 2100 VAT Control
8. 2200 WHT Control
9. 3000 Equity
10. 4000 Revenue
11. 5000 Operating Expenses

This matches the account set implied by the earlier domain-kernel increment and the accounting persistence migration at supabase/migrations/20260905142503_accounting_persistence.sql, which calls _prov_seed_chart_of_accounts.

The chart is real domain-kernel seed data, not placeholder mock UI data.

## Dead tap root cause

The dead tap was not a missing link to an existing detail page.

It was a mismatch between affordance and destination.

- ModuleRowCard applies tappable styling only when onClick is provided.
- Journal passes onClick.
- Accounts does not pass onClick.

Because Accounts did not pass onClick, the rows should not have been visually tappable in the first place. This task did not add a fake navigate handler. It left the rows as display rows and corrected the empty state text so it no longer implies the chart might be missing.

If an account detail or ledger view is wanted later, that is a separate not-yet-built piece of work. This task did not fabricate one.

## Verification

- bun run audit:load: passed
- bun run typecheck: passed
- git status: shows changes only in the Accounting section files plus the report file

Lint could not be completed in this session due to a timeout. It was not used as a pass/fail gate here.

## Risks and limitations

- The Periods form was not converted to a modal or sheet. It was moved into beforeListContent and a FAB was added, but the FAB does not yet open a separate overlay.
- The Journal creation destination still relies on /accounting/journal/new.
- Account creation is still not a reachable user-facing action in the Accounting section.
- Lint was not completed.

## Deferred work

- Decide whether the Periods FAB should open the existing inline form in an overlay, and match whatever presentation mechanism the RFQ FAB uses.
- Decide whether Chart of Accounts needs a detail or ledger destination, and wire it only when that destination exists.
- Review the other list pages that still use the exposed create-form anti-pattern.
