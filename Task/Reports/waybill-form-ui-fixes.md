# WaybillForm UI Bug Fixes — Report

## Task
Fix two UI bugs in `WaybillForm.tsx`:
- **Bug #6**: "Link Invoice" button clickable when no client is selected
- **Bug #7**: Duplicate client picker trigger buttons appearing

---

## Root Cause Analysis

### Bug #6 — Link Invoice Button Not Disabled
- The button at `src/components/waybill/WaybillForm.tsx:371` had a `disabled` class (`opacity-50`) but no `pointer-events-none` class, so clicks still reached the `onClick` handler.
- The `onClick` did not guard against a missing `client_id`, allowing the invoice linking dialog to open without a client.

### Bug #7 — Duplicate Client Picker Triggers
- `ClientSelector` component at `src/components/waybill/WaybillForm.tsx:649` renders its own `SheetTrigger`/`PopoverTrigger` button by default.
- `WaybillForm` separately renders a custom styled trigger button (lines 288–308) for richer UI (icon, label, chevron).
- Both triggers were visible simultaneously.

---

## Changes Made

### File: `src/components/waybill/WaybillForm.tsx`

#### Fix #6 — Disable Link Invoice Button
- Added `pointer-events-none` to the disabled button class list (line 371)
- Changed `onClick` from a function call to a conditional: `waybill.client_id ? handleLinkInvoice : undefined`

#### Fix #7 — Hide Built-in ClientSelector Trigger
- Added `hideTrigger` prop to the `ClientSelector` instance at line 649
- The `hideTrigger` prop (already defined in `ClientSelector.tsx:42`) skips rendering the internal `SheetTrigger`/`PopoverTrigger` and forces `strategy` to `"drawer"`
- The custom styled button (lines 288–308) remains as the single client picker trigger

### File: `src/components/ClientSelector.tsx` (no changes needed)
- `hideTrigger` prop was already properly implemented and consumed at line 313

---

## Verification

- `bun run audit:load` — passed (13 component fetches, 3 heavy limits — pre-existing)
- `bun run typecheck` — passed, zero type errors
- No new warnings or regressions introduced

---

## Relevant Files

| File | Lines |
|---|---|
| `src/components/waybill/WaybillForm.tsx` | 288–308 (styled trigger), 371–372 (disabled button), 649 (`hideTrigger` prop) |
| `src/components/ClientSelector.tsx` | 42 (prop definition), 313 (hide trigger logic) |
