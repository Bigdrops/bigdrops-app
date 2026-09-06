# Accounting Periods FAB Fix and Learn Content Report

This report was written by Buffy on 2026-09-06 via Freebuff.

## Objective

Part A: make the Accounting Periods FAB actually open a hidden creation form.
Part B: create a plain-language accounting explainer in three equivalent formats.

## Scope

Part A:
- src/pages/accounting/Periods.tsx
- src/pages/accounting/Accounts.tsx

Part B:
- docs/learn/accounting/what-is-accounting.md
- docs/learn/accounting/what-is-accounting.txt
- docs/learn/accounting/what-is-accounting.html

## Files changed

- src/pages/accounting/Periods.tsx
- src/pages/accounting/Accounts.tsx
- docs/learn/accounting/what-is-accounting.md
- docs/learn/accounting/what-is-accounting.txt
- docs/learn/accounting/what-is-accounting.html

## Skills used

NONE

Documentation standard: ASD-STE100 Simplified Technical English

## Pre-existing changes observed before work

`git status` before changes:

On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  modified:   docs/TEMPLATES/html-temps/fab-variants.html
  modified:   src/components/dashboard/DashboardOverview.tsx
  modified:   src/components/dashboard/PaymentReminderBanner.tsx
  modified:   src/components/dashboard/RecentAlertsCarousel.tsx
  modified:   src/pages/Dashboard.tsx

Those pre-existing changes were left untouched.

## Part A — Fix the Accounting Periods FAB

### Step 1 — Existing overlay pattern

The app already presents short creation forms as a bottom sheet.

The clearest example is the company creation flow:
- src/components/layout/CompanySelectionSheet.tsx
- src/components/layout/CreateCompanySheet.tsx

Those components use the shared sheet primitive at:
- src/components/ui/sheet.tsx

That sheet primitive is a Radix UI Dialog repackaged as a bottom sheet with:
- Sheet
- SheetContent
- SheetHeader
- SheetTitle
- SheetDescription
- SheetFooter
- SheetClose

That is the established pattern, so it was reused. No new modal or sheet component was introduced.

### Step 2 — Before and after

#### Before

Periods.tsx kept the creation form in the page body.

Relevant before structure:
- a `refresh` callback defined earlier in the component
- `useEffect(() => { refresh() }, [refresh])` driving the initial load
- `beforeListContent` containing the New period form
- MobileFab with `onClick={() => {}}`
- no sheet state

#### After

Periods.tsx now hides the form until the FAB is tapped.

Relevant after structure:
- removed `refresh` from the top-level callback area
- initial load now runs directly from a `useEffect` that calls a `refresh()` helper declared later in the file
- removed `beforeListContent`
- added `sheetOpen` / `setSheetOpen`
- added `code`, `startDate`, `endDate` state for the form
- MobileFab now calls `setSheetOpen(true)`
- added `<Sheet>` with `SheetContent side="bottom"`
- sheet contains the same code, start date, and end date fields
- sheet has Cancel and Create buttons
- Create still calls `handleCreate`
- `handleCreate` now also closes the sheet on success

The form fields, create handler, and Create button logic were preserved. Only the presentation changed.

#### What changed for creation

Before:
- form was always visible in `beforeListContent`
- FAB did nothing

After:
- form is not rendered until `sheetOpen` is true
- FAB opens the sheet
- Cancel closes the sheet
- Create submits and closes the sheet
- empty state text was updated to say "Create a planned period below" instead of "above"

#### Other small structural changes

Two incidental changes came with moving the sheet in.

First, the component no longer keeps `refresh` as a `useCallback` at the top. The initial load now lives in its own `useEffect` that calls a `refresh()` function declared later in the same component.

Second, the refresh after creating a period now calls `refresh()` from inside `handleCreate`, and the periodic list reload path uses the later-declared `refresh()` function. That is the same effect as before, only reorganized.

### Step 3 — Chart of Accounts confirmation

The Chart of Accounts page was re-checked.

File: src/pages/accounting/Accounts.tsx

Current relevant facts:
- the account rows are rendered with ModuleRowCard
- no `onClick` is passed to the row
- the empty state text currently says: "No accounts match this search, or the chart has not been seeded for this entity."

ModuleRowCard applies tappable styling conditionally. The relevant part is that the interactive class and `role="button"` behavior is tied to `onClick`. Without `onClick`, the row should not expose a tap affordance.

In the current codebase, `ModuleRowCard` classes include `cursor-pointer` unconditionally on the outer row div in this version of the file. That means the row can still look interactive even when no `onClick` is passed. For that reason, no temporary `onClick={() => {}}` was left in place. A no-op click handler would silence the symptom without fixing the mismatch, and it would still promise an action that does not exist.

The Accounts file was reviewed and is consistent with the prior decision: the row is a display row, not a navigation row. No destination exists to wire up, so no `onClick` was added and no fake destination was created.

The empty state text does still mention seeding. That wording was left because the chart is seeded per entity, and the app can legitimately show that message when an entity has no accounts yet. It is not the same kind of defect as an orphaned tap affordance.

### Part A verification

- bun run audit:load: passed
- bun run typecheck: passed after fixing one `ariaLabel` prop on the close button to `aria-label`
- bun run lint: timed out in this environment; not used as a pass/fail gate here
- git status: shows the Accounting files and the new docs/learn files

No visual or screenshot tooling was used for Part A. The project lead checks visuals manually.

## Part B — Plain-language accounting explainer

### Step 4 — Folder and files

Created:
- docs/learn/accounting/
- docs/learn/accounting/what-is-accounting.md
- docs/learn/accounting/what-is-accounting.txt
- docs/learn/accounting/what-is-accounting.html

### Step 5 — Content

Audience: a complete beginner who says they do not understand accounting at all.

The same content was written for all three formats. The only differences are presentation markup:
- Markdown uses headings and lists
- Plain text uses plain headings and list markers
- HTML wraps the same prose in a standalone page with basic styling

All three files cover the same seven parts in the same order:
1. What accounting is, with a notebook and labeled jars analogy first
2. Why BIGDROPS added it, tied to taxes
3. What Chart of Accounts means, using the 11 seed accounts as the real examples
4. What Journal and journal entry mean, with debit and credit explained as which jar money left and which jar it landed in
5. What an Accounting Period means, as a named stretch of time
6. A numbered how-to using only what exists today
7. A closing note on what is not built yet

The 11 seed accounts are named exactly as they are in the app:
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

The three files are equivalent in wording. The differences are only markup and structure:
- Markdown vs plain text differ mainly in heading markers and list markers
- HTML differs by wrapping the same text in a simple standalone page

No accounting term was left unexplained the first time it appears. Debit and credit, Chart of Accounts, Journal, journal entry, and Accounting Period are all explained in plain language before any technical use of them.

### Part B verification

Part B is documentation-only. Per project convention, audit:load, typecheck, and lint were skipped for that part.

The three files were created and staged. Their content was cross-checked by comparing the Markdown and text versions directly, and by confirming the HTML version contains the same sections and same 11 account names.

## Report location

docs/reports/GENERAL/accounting-fab-and-learn-content.md
