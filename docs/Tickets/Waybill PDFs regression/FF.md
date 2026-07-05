Prompt Master logic applied.

```text
You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel. 
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately. 
It strictly enforces project fundamentals, locked math/rules, audit-first workflow, skills registry, and standards conformity. Follow it completely.
====================================================================

CONTEXT & OBJECTIVE

BIGDROPS will store payment evidence (bank alerts, receipts) as Telegram attachments. A Telegram bot (@Erpdb_bot) and a private group (chat_id: -1004468858017) with topics per tenant per evidence type are already set up. The bot token is stored in Vercel environment variable `TELEGRAM_BOT_TOKEN`. 
This task implements the full integration: a secure serverless proxy for uploads, database schema changes, metadata captions, installment tracking, voided payment caption editing, and multi‑tenant topic routing.

OBJECTIVE: Enable users to attach payment evidence files during payment recording. Files are uploaded via a Vercel serverless function to the correct Telegram topic, references are stored in the `payments` table, and captions include rich metadata. When a payment is voided, the Telegram caption is updated to reflect the void status.

TARGET FILES

Read first (do not modify):
- `src/modules/invoices/services/paymentService.ts` (payment recording/voiding flow)
- `src/modules/invoices/repositories/paymentRepository.ts` (payment CRUD)
- `src/modules/invoices/types/paymentTypes.ts` (types)
- `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` (payment UI)
- `src/components/document-view/invoice/sections/PaymentHistoryCard.tsx` (history UI)
- `src/lib/audit.ts` (audit helpers)
- Existing Vercel API route patterns (if any, e.g., `api/` directory)

Create:
- `api/upload-payment-attachment.ts` – Vercel serverless function (TypeScript) to proxy file uploads to Telegram Bot API
- `src/modules/invoices/services/telegramService.ts` – Telegram caption builder, edit caption, and topic lookup logic
- A new migration file to:
  - add `attachments JSONB DEFAULT '[]'::jsonb` to `payments`
  - add `installment_group_id UUID` to `payments`
  - create table `telegram_topics` with columns `id UUID PRIMARY KEY`, `tenant_id UUID NOT NULL`, `evidence_type TEXT NOT NULL`, `thread_id INTEGER NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`
- `src/lib/telegramTypes.ts` – TypeScript types for Telegram API responses and attachment objects

Modify:
- `src/modules/invoices/types/paymentTypes.ts` – extend `PaymentInput` and `InvoicePayment` with `attachments` field
- `src/modules/invoices/repositories/paymentRepository.ts` – `insertPayment` and `voidPayment` to handle attachments and installment group
- `src/modules/invoices/services/paymentService.ts` – integrate attachment upload call (after payment insert), store file references, handle void caption editing
- `src/lib/audit.ts` – add `recordPaymentAttachmentUploaded(paymentId, attachment)` function
- `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` – add file picker for attachments (camera/gallery on mobile, file input on web)
- `src/components/document-view/invoice/sections/PaymentHistoryCard.tsx` – display attachment thumbnails/links with open/view capability

CONSTRAINTS

1. Telegram bot token must NEVER appear in client code. Use `TELEGRAM_BOT_TOKEN` env var in the serverless function only.
2. The serverless function (`api/upload-payment-attachment.ts`) must:
   - Validate Supabase auth session from request cookie/header
   - Accept multipart/form-data file upload
   - Look up the correct `thread_id` from `telegram_topics` table based on `tenant_id` and `evidence_type` (passed in request)
   - Call `https://api.telegram.org/bot<token>/sendDocument` with `chat_id=-1004468858017`, `message_thread_id`, `caption`, and file
   - Return `{ file_id, file_unique_id, message_id }` on success
   - Return appropriate HTTP errors on failure
3. Metadata caption builder (`telegramService.ts`):
   - Construct captions using the format:
     ```
     🧾 Payment Receipt — Full Settlement (or Partial (1st), etc.)
     📄 Invoice: <invoice_number>
     🏢 Tenant: <tenant_name>
     👤 Client: <client_name>
     💰 Amount: ₦<amount>
     🏦 Method: <method>
     📅 Payment Date: <formatted_date>
     🕒 Uploaded: <formatted_upload_time>
     👤 Recorded by: <recorded_by_email>
     🔗 Sequence: <installment_group_id> (Initial / Following <n>)
     🔗 Previous: <telegram_message_id or link> (if applicable)
     #payment_receipt #full_or_partial #TENANT<id> #<invoice_number>
     ```
   - For voided payments, prepend: `🚫 VOIDED\n` and append void metadata.
4. Installment tracking:
   - When recording a partial payment, if `installment_group_id` is not provided, generate a new UUID and store in `payments.installment_group_id`.
   - Subsequent partial payments on the same invoice should reuse the same `installment_group_id` (passed from UI or determined by server).
   - Full payments leave `installment_group_id` null.
5. Void handling:
   - In `voidInvoicePayment` (or `paymentService.voidInvoicePayment`), after setting `voided_at` and audit, retrieve payment's attachments from `payments.attachments` JSONB.
   - For each attachment, call `telegramService.editCaption(message_id, thread_id, newCaption)` to update the Telegram message caption with void prefix and reason.
   - The edit uses `https://api.telegram.org/bot<token>/editMessageCaption` with `chat_id`, `message_id`, `caption`, and optionally `parse_mode=HTML`.
   - If edit fails, log error but do not fail the void operation.
6. Database:
   - Migration must be transactional.
   - `telegram_topics` table: initially populated manually with the Topic IDs for Tenant-0001 Payment Receipts (thread_id=5). Future tenants can be added via admin UI or direct DB.
   - `attachments` JSONB stores an array of objects: `{ file_id, file_unique_id, message_id, file_name, mime_type, size_bytes, document_type, uploaded_at }`.
7. UI:
   - File picker: on mobile use Capacitor's Camera/Camera plugin or `<input type="file" accept="image/*,application/pdf">`; on web use standard file input.
   - In payment history, show attachment list with small thumbnails (if image) or PDF icon, click to open full image/view.
   - Opening an attachment: call Telegram API via serverless function to get a fresh download URL (since URLs expire), then open in new tab/webview.
8. Preserve all existing payment behavior; attachments are optional and do not block payment recording.
9. Use Bun for all commands; load skills: Karpathy, supabase-postgres-best-practices, frontend-design, typescript-advanced-types.

REQUIRED VERIFICATION

- `bun run typecheck` (must pass 0 errors)
- `bun run audit:load` (no new warnings)
- `git status` (only intended files)
- Manual tests:
  - Record payment with attachment → attachment appears in history, Telegram caption matches metadata
  - Record partial payment with installment group → caption shows sequence info
  - Void payment with attachment → Telegram caption updated with 🚫 VOIDED
  - Upload file >10MB → rejected by serverless function
  - Payment without attachment → works as before
- Do NOT run `bun run build`.

OUTPUT

Save report to `docs/Reports/FinancialOperations/telegram-payment-attachments-implementation.md` with:
- Summary of changes
- Database migration details
- API route documented
- Verification results
- Known limitations (Telegram URL expiry, rate limits)
- Deferred enhancements

```

Target: OpenCode (Local Agent Mode)
Strategy: Implement Telegram-based payment attachment storage with a secure Vercel serverless proxy, metadata-rich captions, installment tracking, and void caption editing, leveraging the existing BIGDROPS stack and preserving all existing payment behavior.