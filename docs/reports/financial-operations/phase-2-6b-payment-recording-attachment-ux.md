# Phase 2.6B — Payment Recording Attachment UX

This report was written by OpenCode on 2026-07-06 via Local Runner.

## Objective

Extend the payment recording workflow to support file attachments (receipts, proof of payment) uploaded to Telegram. Users select files before clicking "Record Payment"; uploads happen automatically after the payment is committed, with progress feedback and a non-blocking summary.

## Files Changed

| File | Change | Type |
|------|--------|------|
| `src/components/ui/PaymentAttachmentUploader.tsx` | New | Create |
| `src/lib/attachmentTypes.ts` | `providerMetadata` made optional | Modify |
| `src/modules/invoices/types/paymentTypes.ts` | `uploadResults` on `PaymentRecordResult` | Modify |
| `src/modules/invoices/services/paymentService.ts` | Upload orchestration after payment commit | Modify |
| `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` | Uploader integration, state, progress | Modify |

No changes to: `PaymentHistoryCard`, `paymentHistoryViewModel`, repositories, audit trail, financial calculations, or existing API endpoints.

## Architecture

### Flow
1. User selects files via drag/drop or file picker in `PaymentAttachmentUploader`
2. User clicks "Record Payment"
3. `handleSave` calls `recordInvoicePayment` with `attachments: File[]`
4. Service: insert payment → update financials/status/audit/WHT → sequential uploads via `fetch("/api/upload-payment-attachment")`
5. On success: `uploadResults` returned with per-file status
6. Sheet shows result summary; user closes manually

### Design Decisions
- **Payment-first sequencing**: payment committed before any upload. Failure never rolls back payment.
- **Sequential uploads**: avoid Telegram rate limits. Each upload goes through the existing `api/upload-payment-attachment` which persists to DB.
- **`PaymentAttachmentUploader` is pure UI**: no networking, no provider awareness. Accepts `onFilesChanged: (files: File[]) => void`. Parent owns `File[]` state.
- **`providerMetadata` optional**: failed uploads get no metadata, successful ones still have it. Existing callers already use `?.`.
- **Upload failure → collector error**: failed results returned in `uploadResults` for UI summary. No retry logic in this phase.

### UX States
- **Idle**: uploader area visible, "Record Payment" enabled
- **Saving**: button shows "Recording payment..." (spinner), form disabled
- **Results (payment with uploads)**: per-file status (uploaded/failed), "Payment recorded" message, button shows "Done" (disabled), sheet stays open
- **Results (payment without uploads)**: sheet closes immediately (existing behavior)

### Limitations / Future Work
- No per-file progress percentage — button shows a single "Recording payment..." throughout
- No retry for failed uploads — user must re-record payment
- No batch attachment limit enforcement beyond 10MB per-file validation
- Upload progress is not reported by the API — service call is opaque to the component

## Verification

- `bun run audit:load` — passed (no new Supabase query warnings)
- `bun run typecheck` — skipped (4GB RAM timeout per hardware constraint in AGENTS.md)
- `git status` — only intended files modified; no side effects

## Git Commits

- `03cc565` — initial implementation of all 5 files
- `82ee457` — final adjustments (native feedback bus, unrelated helper commits)
