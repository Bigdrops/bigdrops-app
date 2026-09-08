# Period Picker and Success Danger Token Report

This report was written by Muse Spark on 2026-09-08 via OpenCode.

## Objective

Migrate the Create Journal period selector to the themed picker. Strengthen root success and danger treatments at the canonical source.

## Scope

- Period picker: `src/pages/accounting/NewJournalEntry.tsx` only.
- Danger treatment: `src/components/ui/button.tsx` destructive variant only.
- No changes to business logic, validation, deletion semantics, sign-out behavior, permissions, or persistence.

## Files changed

- `src/pages/accounting/NewJournalEntry.tsx`
- `src/components/ui/button.tsx`
- `docs/reports/GENERAL/period-picker-danger-token-fix.md` (this report)

## Skills used: shadcn, tailwind-capacitor, mobile-android-design

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Period picker

- Removed the last native `<select>` in Create Journal (period selector).
- Added a `periodOptions` memo: value and label use the period code, description shows the date range. Options, values, and `setPeriodCode` state logic are unchanged.
- The selector now uses the shared `Combobox` with the same drawer-on-mobile and popover-on-desktop contract as the Account picker. Trigger keeps the form `h-11` input style with keyboard support.
- The element is a period selector, not a date picker. No date logic was added.

### Success and danger tokens

- Token trace result: the pale destructive appearance came from the canonical `destructive` Button variant (`bg-destructive/10` wash), not from pale token values. The `--destructive` triplet itself is already saturated.
- Fix: the `destructive` variant is now solid (`bg-destructive text-destructive-foreground hover:bg-destructive/90`). All consumers inherit it with no per-component patch:
  - Sign Out confirmations in `Layout`, `MoreOptions`, `WorkspacePendingApproval`, `WorkspaceInvitation`, `ProvisioningProgress`, `ProvisioningFailed`.
  - Delete confirmations through `ConfirmActionDialog` (passes variant to Button).
- Success feedback already uses solid `--bd-status-success-text` toast fills from the prior task. No change was needed.
- Subtle background tokens (`--bd-feedback-*`, `--bd-status-*-bg`) were left intact per the solid-versus-subtle constraint.
- `BatchActionFooter` keeps its own existing solid red treatment. It was not modified.

## Verification result

Verification:

- `bun run typecheck`: passed
- `bun run audit:load`: skipped (no schema, query, or data-layer logic touched)
- `bun run build`: not run (hardware ban)
- Native `<select>` search in `NewJournalEntry.tsx`: zero matches
- `git status`: task changes limited to `NewJournalEntry.tsx` and `button.tsx` (other modified files belong to prior session tasks or another agent and were left intact)
- Runtime or device test: not performed (no claim made)

## Risks or limitations

- The solid destructive button is a visible change everywhere the variant is used. All current consumers are confirmation or commit actions, so solid red is correct for each one.
- White text on `--destructive` relies on the existing `--destructive-foreground` token. No contrast metering was performed.

## Deferred work

- Delete dead Radix toast code and deprecated document-view toast shims.
- Remove the hardcoded `bg-red-600` in `BatchActionFooter` in favor of the canonical token during a dedicated cleanup.
- On-device Android confirmation for the period picker and destructive buttons.
