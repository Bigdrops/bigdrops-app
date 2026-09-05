# Mobile More Navigation and Accounting Exposure Report

This report was written by Muse Spark on 2026-09-05 via OpenCode.

## Objective

Replace the mobile More popup with a full-page More Options destination and expose the existing Accounting Foundation persistence through it, without changing bottom navigation, desktop architecture, or accounting domain logic.

## Scope

- New More Options page, five accounting screens, one accounting service, one navigation test.
- Three surgical edits: routes, More tap behavior, active-tab mapping.
- Out of scope: Source Transaction Model, adapters, tax, Adjustments to bottom navigation, desktop redesign.

## Files Changed

- src/pages/MoreOptions.tsx (new).
- src/pages/accounting/AccountingOverview.tsx (new).
- src/pages/accounting/Accounts.tsx (new).
- src/pages/accounting/Periods.tsx (new).
- src/pages/accounting/Journal.tsx (new).
- src/pages/accounting/NewJournalEntry.tsx (new).
- src/modules/accounting/accountingService.ts (new).
- src/tests/critical/moreNavigation.test.js (new).
- src/components/app/AppShell.tsx (6 routes added).
- src/components/Layout.tsx (More tap navigates to /more; More sheet unwired).
- src/components/layout/navData.ts (/more, /letters, /accounting map to more tab).
- docs/Reports/taxation-made-easy/mobile-more-accounting-navigation-2026-09-05.md (this report).

## Skills Used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

Note: the frontend-design skill was inspected and set aside. It promotes bespoke aesthetics, which conflicts with the normative design-system and adaptive-alignment constraints. Existing tokens and components were reused instead.

## Reconciliation Against Existing Routes

- Bottom navigation stays Home, Projects, Sales, Clients, More. The requested Purchases and Reports tabs do not exist in the repository and were not introduced.
- Requested Sales CRM, Manage Team, Greetings, AI, and Support entries have no existing routes and were not invented. Manage Team needs are served by the existing Settings page (roles and access live there).
- Account Groups has no existing destination. Chart of Accounts serves as the single accounts destination. No duplicate screens were created.
- Header provides Back, Notifications (existing bell), and Profile (existing Settings). AI and Support buttons do not exist and were omitted.

## Changes Made

- More tap navigates to /more. The More sheet component is retained for document-level use and is no longer the bottom-nav flow.
- More Options groups: Accounting (permission-gated), Finance and reporting (existing routes), Workspace (Settings, Sign Out with confirm dialog).
- Accounting screens read through the tenant-schema client. Posting uses supabase.rpc('post_accounting_entry', ...) on the root client. No service_role import. No journal-table browser inserts. Only period create/open writes exist, per the sanctioned mechanism.
- Amounts stay exact strings with Decimal.js validation. Display totals use Decimal. No floating-point accounting arithmetic.
- Period lifecycle follows the persistence contract: create planned, open through authenticated UPDATE, trigger enforces transitions.

## Verification Result

- bun run typecheck: passed (exit 0).
- bun run audit:load: passed with no new warnings (one introduced broad-select warning was fixed with explicit column lists).
- Navigation tests: 5 pass. Persistence contract tests: 10 pass.
- git diff --check: passed.
- bun run build: skipped due to hardware policy.
- Pre-existing tenantGate failure and other agents' working-tree changes left untouched.

## Risks and Limitations

- Accounting screens require account, period, and journal permissions. Users without them see the group hidden or an access notice.
- No period auto-seeding exists. An authorized user must create and open the first period before posting.
- Increment 2 remains OPEN. This UI enables the human close-out but does not itself close it.

## Deferred Work

- Sales CRM surfaces, AI and Support entries, and any new secondary modules.
- Source Transaction Model and invoice/payment adapters.
- Human-executed Increment 2 positive-path close-out.
