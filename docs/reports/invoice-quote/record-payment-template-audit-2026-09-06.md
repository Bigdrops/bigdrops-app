# Record Payment Template Forensic Audit

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Compare the supplied `record-payment.html` template against the live Invoice Record Payment flow.
- Resolve whether the template holds one or two popup states.
- Judge recreation feasibility without touching production code.

## Scope

- Template: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/popups-popovers-dropdowns/record-payment.html` (609 lines, read in full).
- Live: `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` (412 lines), `paymentEntryHelpers.ts`, `paymentService.ts` (`recordInvoicePayment`, `loadPaymentSheetData`), `paymentTypes.ts`, `PaymentAttachmentUploader.tsx`.
- No production file changed.

## Skills used

Skills used: karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Current live architecture

- Entry: `InvoiceOverlays` opens sheet `record-payment`. Sheet mounts `InvoiceRecordPaymentSheet` with invoice id, number, client, total, wht.
- On open the form resets to defaults (today date, Transfer method, empty amount) and loads balance plus bank accounts in parallel.
- Balance equals invoice total minus settled cash plus WHT across fetched payment rows.
- Fields: amount hero input, 25/50/75/Full chips, Paid/Left strip, progress bar, date, method (Transfer, Cash, POS, Cheque, Other), destination account (Transfer only, first bank preselected), reference, notes, receipt uploader.
- Validation rejects empty date, zero amount, negative amount, and over-balance amounts with explicit errors.
- Save calls atomic RPC `record_payment_transaction` (payment insert plus status sync), then best-effort accounting event, audit trail, WHT draft, and acknowledgement receipt with unique-number retry.
- WHT from this UI is always zero. No WHT field exists.
- After save with uploads the sheet stays open with per-file status. Without uploads it refreshes the parent and closes.
- Double submit is blocked by saving and recorded flags.

## Template architecture

- One bottom sheet (`#sheet`), one scroll body, one submit handler.
- Sections: drag handle, header (title plus invoice number, close), amount block (balance line, hero input, 4 chips, Paid/Left strip, progress bar), 2-column details grid (date, method, conditional destination account, reference, notes), one-line attach row, hidden error block, hidden success block, Cancel plus Record submit bar.
- Conditional states use display toggles only: bank field (Transfer only), error, success, submit success style.
- Demo JS auto-closes 1100 ms after save. Date defaults to today.

## Two-popup determination

- Result: one sheet with conditional states (model C).
- Evidence: exactly one `.sheet` element and one `.sheet-body`. No second popup element exists. Bank, error, and success blocks toggle `display` inside the same scroll container. One `handleSave` owns all states.
- There is no staged wizard, no secondary selector sheet, and no independent second popup.
- The perceived second state is the Transfer-only destination account row plus the transient error and success blocks.

## Control comparison

| Template element | Live equivalent | Behavior | Recreatable | Notes |
|---|---|---|---|---|
| Sheet surface, scrim, drag handle | `DocumentSheet` | Open, close, swipe dismiss, back button | Yes, keep `DocumentSheet` | Do not copy fixed positioning or z-index |
| Header title plus invoice number | Title plus `Payment for INV` subtitle | Display only | Yes | Copy text pattern only |
| Balance-due line | Amount hero block | Display only | Yes | Values come from loader |
| Hero amount input | Hero input, 26px centered | Numeric entry, formatting | Yes | Keep live parsing and error ring |
| 25/50/75/Full chips | Same four chips | Quick fill | Yes | Keep live exact-match highlight |
| Paid/Left strip plus progress | Same strip plus bar | Live feedback | Yes | Keep live math, not template clamp |
| Date field | Date field, defaults today | Required | Yes | Keep required validation |
| Method select | shadcn Select, same 5 options | Selection | Yes, keep shadcn Select | Do not use native select |
| Destination account | shadcn Select, Transfer only | Conditional required path | Yes | Keep first-bank preselect |
| Reference | Text input | Optional passthrough | Yes | Identical |
| Notes | Textarea | Optional passthrough | Yes | Respect current row height |
| Attach receipt row | `PaymentAttachmentUploader` | Multi-file, progress, failure states | Partial | Single row is insufficient; keep uploader |
| Error block | Error box plus toast | Validation and server errors | Yes | Keep full validation set |
| Success block plus button state | Recorded flags and Done state | Post-save feedback | Yes | Keep parent refresh contract |
| Cancel plus Record bar | Record pill plus text Cancel | Close and submit | Yes | Keep single primary emphasis |
| Auto-close timer | Conditional close or stay-open | Post-save flow | No | Drop timer; keep live contract |
| Amount clamp to balance | Over-balance rejection | Invalid input handling | No | Clamp hides errors; live validation wins |
| M3 purple theme | Divine Blood slate-navy | Visual system | Restyle required | Full token remap |

## Height breakdown

- Live sheet stacks: header, hero block, hero input, chips, settlement strip, progress bar, 2-column grid (date, method, conditional bank, reference, notes), uploader with states, error, success, 52px submit, text cancel, plus `gap-4` across 8 blocks and sheet padding.
- Estimated live height reaches 700 to 800 px. Most phone viewports must scroll.
- Template stacks the same information in about 480 px: merged amount block, 30 to 36 px fields, single 36 px attach row, one 40 px submit bar, 10 px gaps, 68dvh cap with internal scroll.
- Structural savings come from merged rows and one submit bar, not from padding trims.

## Why previous reduction failed

- Padding trims cannot fix stacked full-width blocks.
- The hero, chips, settlement, grid, uploader states, and double actions each add fixed height.
- Only structural merging (amount block, submit bar) and the 68dvh cap change the footprint materially.

## Template advantages

- One compact amount block replaces four loose live blocks.
- Settlement plus progress in one strip removes a full row.
- Single submit bar removes the second button row.
- Max-height cap guarantees above-fold primary action on most phones.
- Conditional bank field is the correct progressive-disclosure pattern.

## Template risks

- Silent amount clamp hides overpayment. Must keep live rejection.
- Auto-close timer breaks the upload-status and parent-refresh contract.
- Native selects break the shadcn interaction contract.
- Single attach row drops multi-file progress and failure states.
- 30 px chips sit below the preferred touch minimum.
- M3 motion, tokens, and z-index do not transfer. Use `DocumentSheet`.
- No loading state for balance fetch. Live skeleton must stay.

## Invariants (untouchable)

- Validated settlement math: positive amount, no negative, no over-balance, 0.01 tolerance.
- Balance equals total minus settled cash plus WHT.
- Date remains required. Method enum remains fixed.
- Bank account sends only for Transfer, else null.
- Atomic RPC insert plus status sync. Audit trail entry.
- WHT draft path with zero from this UI. Receipt snapshot with unique retry.
- Attachment upload before close. No duplicate submit.
- Void, RLS, schema, and calculation logic stay out of scope.

## Mobile assessment

- Template cap plus single scroll owner is the correct phone pattern.
- Inline conditional blocks avoid nested sheets and scroll traps.
- Safe-area padding is present. Escape and backdrop close exist.
- Keyboard focus select on amount is good. Native date picker is acceptable.
- Chips need a larger touch target than 30 px.
- Error block sits above submit, so errors stay visible.
- Live `DocumentSheet` already owns keyboard insets and Android back behavior. Keep it.

## Feasibility: YELLOW

- The template recreates with controlled UI composition changes only.
- Business logic, validation, services, and accounting stay untouched.
- Required adjustments: Divine Blood restyle, keep `DocumentSheet`, keep shadcn selects, keep uploader, keep full validation, drop clamp and timer, enlarge chips, keep loading state.

## Recommended architecture

- Keep `InvoiceRecordPaymentSheet` state, hooks, validation, and service calls exactly as is.
- Restructure JSX only: merged amount block, compact 2-column grid, single attachment row hosting the existing uploader trigger, one submit bar, 68dvh-class cap.
- Keep bank conditional, error, success, loading, and upload-result branches.
- Restyle through existing Divine Blood tokens. No new overlay library.

## Files for follow-up

- Modify: `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` (JSX and styles only).
- Possibly: `src/components/document-view/invoice/InvoiceRecordPaymentSheet.module.css` (confirm use first).
- Untouched: `paymentEntryHelpers.ts`, `paymentService.ts`, `paymentRepository`, receipt and audit paths, `DocumentSheet`, invoice calculations, schema, RLS.

## Follow-up prompt

- Recommended. A small execution prompt can carry this report plus the template path and the file list above.

## Verification

- `bun run build`: not run (hardware policy).
- `bun run typecheck`: not run (no source modified).
- `bun run audit:load`: not run (no data layer modified).
- `git status`: only pre-existing entries plus this report. No production file changed.
