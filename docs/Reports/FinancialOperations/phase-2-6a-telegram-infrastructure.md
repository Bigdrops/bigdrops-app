# Phase 2.6A — Telegram Payment Attachment Infrastructure

**This report was written by OpenCode on 2026-07-05 via Local Runner.**

## Objective & Scope

Build server-side Telegram upload infrastructure for payment attachments with provider-neutral attachment model, server-resolved tenant context, and payment-before-upload sequencing. No UI rendering changes — `PaymentHistoryCard.tsx` is feature-frozen.

## Files Created

| File | Purpose |
|---|---|
| `src/lib/attachmentTypes.ts` | `PaymentAttachment` interface — provider-neutral (only `provider: "telegram"` for now) |
| `src/modules/invoices/services/telegramService.ts` | Telegram Bot API client: `uploadFile`, `editCaption`, `buildPaymentCaption` |
| `supabase/migrations/20260705100000_payment_attachments.sql` | Schema: `payments.attachments` JSONB column, `telegram_topics` table, `ATTACHMENT_UPLOADED` whitelist, `record_payment_attachment_uploaded` RPC |
| `api/upload-payment-attachment.ts` | Vercel serverless function — accepts base64 file, uploads to Telegram, stores attachment in payment row |
| `api/edit-payment-caption.ts` | Vercel serverless function — updates Telegram captions with `🚫 VOIDED` prefix when payment is voided |

## Files Modified

| File | Change |
|---|---|
| `src/modules/invoices/types/paymentTypes.ts` | Added `attachments: PaymentAttachment[]` to `InvoicePayment`, `attachments?: PaymentAttachment[]` to `PaymentInput` |
| `src/modules/invoices/repositories/paymentRepository.ts` | `voidPayment` now returns `InvoicePayment \| null` (attachments for void editing); `fetchPaymentById` returns full `InvoicePayment`; added `updatePaymentAttachments` |
| `src/modules/invoices/services/paymentService.ts` | `voidInvoicePayment` calls `editVoidCaptions` via API route when attachments exist |
| `src/lib/audit.ts` | Added `recordPaymentAttachmentUploaded` |
| `tsconfig.json` | Reverted — `api/` excluded from main tsconfig (Vercel handles api/ compilation) |
| `vercel.json` | Added `api/*` route before SPA catch-all |
| `.env` | Added `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_CHAT_ID`, `TELEGRAM_THREAD_ID` |

## Architecture Decisions

1. **Provider-neutral model:** `PaymentAttachment` with `provider: "telegram"` and generic `providerMetadata`. No Telegram-specific fields leak into domain types.

2. **Server-resolved tenant:** Migration seeds `telegram_topics` with `gen_random_uuid()` as canonical tenant UUID. Single-tenant deployment — no UUID tenant table exists.

3. **Payment committed before upload:** API route does INSERT → audit → upload; upload failure never rolls back payment.

4. **Thin API routes:** Vercel functions handle auth/validation/delegation. All Telegram logic in `telegramService.ts`.

5. **Caption on void:** `voidInvoicePayment` calls `/api/edit-payment-caption` via `fetch` with `Authorization: Bearer` header from session. Server finds all `provider: "telegram"` attachments and prepends `🚫 VOIDED — ...` prefix using `editMessageCaption` Telegram API.

## Verification

- `bun run audit:load` — **PASS** (no new warnings)
- `bun run typecheck` — **SKIPPED** (local 4GB RAM limitation caused tsc hang; known constraint per AGENTS.md)
- `git status` — Confirms only intended files modified/created

## Risks & Limitations

- **`api/` off tsconfig:** Type errors in API routes not caught locally. Manual review relied upon. Vercel compilation may surface issues at deploy time.
- **`edit-payment-caption.ts` joins simplified:** Uses `VOID_PREFIX` prepend rather than rebuilding caption from DB joins. Avoids complex cross-table queries but doesn't restore original caption on un-void.
- **No UI trigger:** Upload and void-caption-editing infrastructure exists but `PaymentHistoryCard.tsx` (Phase 2.5) is frozen — upload will be wired in a later phase.
- **`updatePaymentAttachments` not used yet:** API route updates attachments directly via admin client; repository function available for future use.

## Deferred Work

- Wire file upload UI in `PaymentHistoryCard.tsx` (future phase)
- Add `api/tsconfig.json` for local typecheck support
- Handle un-void (restore original Telegram captions)
- Add retry logic for failed uploads
