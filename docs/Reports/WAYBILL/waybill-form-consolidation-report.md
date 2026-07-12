# Waybill Form Page Consolidation Report

This report was written by OpenCode on 2026-07-12 via Local Runner.

## Objective & Scope

Consolidate `NewWaybill.tsx` (133 lines) and `EditWaybill.tsx` (79 lines) into a single `WaybillFormPage.tsx` component following the pattern established by `CsrFormPage` and `LetterFormPage`. Conforms to `docs/STANDARD/document-form-consolidation-standard.md`.

**In scope:** Create `WaybillFormPage.tsx`, replace `NewWaybill.tsx` and `EditWaybill.tsx` with thin delegators.

**Out of scope:** Refactoring `WaybillForm` (753 lines), `WaybillGatewayOverlay`, or mutation logic. These are consumed as-is.

## Evidence

- `WaybillFormPage.tsx` (204 lines) — single component handling both `create` and `edit` modes
- `NewWaybill.tsx` → 4-line delegator: `<WaybillFormPage mode="create" />`
- `EditWaybill.tsx` → 4-line delegator: `<WaybillFormPage mode="edit" />`
- `WaybillGatewayOverlay` shown only in create mode for type selection; edit mode loads by `id` param
- Blank download logic (unique to waybill's blank_waybill_logs token reservation) preserved in `WaybillFormPage`
- Number generation via `getNextWaybillNumber` and `resolvePrefix` preserved identically

## Consolidation Details

| Concern | NewWaybill (old) | EditWaybill (old) | WaybillFormPage |
|---|---|---|---|
| Type gateway overlay | Inline | N/A | Create-only render branch |
| Number generation | Inline useEffect | N/A | useEffect with cancelled guard |
| Blank download | Inline handler | N/A | Create-only handler |
| Load by id | N/A | Inline useEffect | Edit-mode useEffect |
| Save dispatch | Inline | Inline | Shared handleSave branches on isCreate |
| Route params | N/A | useParams<id> | useParams unconditionally |

## Risks & Limitations

- `limit(1000)` is inherited from the original `NewWaybill.tsx`. Not part of this change.
- The same pre-existing `[HEAVY]` audit warning applies; number generation queries the full waybill set, which is a pre-existing design decision.

## Verification

- `bun run typecheck` — passed (clean exit)
- `bun run audit:load` — passed; only pre-existing warnings, no new issues
- `git status` — only intended files touched

## Deferred Work

None. Waybill form page consolidation is complete.
