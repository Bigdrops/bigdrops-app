# More Accounting Popup Audit Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Audit More → Accounting for browser-native popups. Replace each popup with a BIGDROPS-themed dialog, sheet, or toast.

## Scope

- Route path: `/more` → `/accounting`, `/accounting/accounts`, `/accounting/periods`, `/accounting/journal`, `/accounting/journal/new`.
- Files in scope: `src/pages/MoreOptions.tsx`, `src/pages/accounting/*.tsx`, shared components in the path (`Layout`, `ModuleShell`, `ModuleRowCard`, `MobileFab`, `feedback`, `accountingService`).
- Out of scope: Settings, Compliance Hub, export dropdown. No changes made to these files.

## Files changed

None. No code change was required. See Changes made.

## Skills used: NONE

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

No changes. The audit found zero browser-native popups in the More → Accounting path:

- `AccountingOverview.tsx`: navigation buttons only. No popups.
- `Accounts.tsx`: errors use `feedback.error` toast. No popups.
- `Periods.tsx`: create flow uses themed bottom `Sheet`. Errors and success use `feedback` toast. No popups.
- `Journal.tsx`: errors use `feedback.error` toast. Expandable rows render inline. No popups.
- `NewJournalEntry.tsx`: balance check renders an inline hint. Submit uses `feedback` toast and navigation. No popups.
- `MoreOptions.tsx`: sign-out uses themed `AlertDialog`. This dialog is not part of Accounting.
- Shared path components (`Layout`, `ModuleShell`, `ModuleRowCard`, `MobileFab`, `feedback.ts`, `accountingService.ts`): no `alert`, `confirm`, or `prompt` calls.

Remaining `alert`/`confirm` calls in `src` sit outside the Accounting path:

- `ContextualExportDropdown.tsx`: used by Invoices, Clients, Waybills, CSR, Projects, RFQ, BOQ, Quotation. Not used by Accounting.
- `compliance/*` panels: belong to Compliance Hub. Out of scope.
- `settings/*` sections: excluded by task instruction.

Per the AGENTS.md smallest-change rule, no edit was made. An edit with no defect to fix would break the surgical-change rule.

## Verification result

Verification:

- `bun run typecheck`: passed (no output, exit 0)
- `bun run audit:load`: skipped (no schema, query, or data-layer logic touched)
- `bun run build`: skipped due to hardware policy
- Popup search in Accounting path: zero matches for `alert(`, `confirm(`, `prompt(`, `window.alert`, `window.confirm`, `window.prompt`
- `git status`: unchanged from start (pre-existing `bun.lock` and `package.json` modifications plus untracked `docs/Reports/pdf/*` files belong to another agent and were left intact)
- Settings files modified: none

## Risks or limitations

- The task premise (Accounting uses old browser popups) did not match the code. Accounting already uses Sheet and toast patterns. A prior facelift pass may have fixed it.
- Other More items (Compliance Hub, export flows) still use browser-native popups. They need separate tasks.

## Deferred work

- Replace `confirm()` in `TaxFilingsPanel.tsx`, `TaxRemindersPanel.tsx`, `VatInputsPanel.tsx` (Compliance Hub path).
- Replace `alert()` in `ContextualExportDropdown.tsx` (export flows).
- Settings popups (`CompanyManageSection.tsx`, `BankingSettingsSection.tsx`) remain untouched per task instruction.
