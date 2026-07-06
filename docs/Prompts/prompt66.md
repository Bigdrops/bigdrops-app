You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access.
Read AGENTS.md before touching anything.
Follow the audit-first workflow, project fundamentals, standards,
locked business rules, and required skills.
====================================================================

A. CONTEXT & OBJECTIVE

Phase 2.6B attachment uploads consistently fail from the application.

A manual PowerShell upload to Telegram succeeds.

Therefore the Telegram Bot API is already verified.

The objective of this task is NOT to fix the issue.

The objective is to identify the FIRST failing stage of the upload pipeline with hard evidence.

No feature work.
No refactors.
No architecture changes.
No retry implementation.

Treat this as a forensic investigation.

====================================================================

B. TARGET COMPONENTS

Read only:

- src/components/ui/PaymentAttachmentUploader.tsx
- src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx
- src/modules/invoices/services/paymentService.ts
- api/upload-payment-attachment.ts
- src/modules/invoices/services/telegramService.ts
- paymentRepository upload/update methods
- PaymentAttachment types

Create only if necessary:

scripts/test-upload-pipeline.ts

Temporary instrumentation only.

====================================================================

C. INVESTIGATION PIPELINE

Audit every stage.

DO NOT SKIP ANY STAGE.

For every stage produce evidence proving it executed.

1.
User selected files.

Verify:

- File count
- File names
- MIME types
- File sizes

2.
PaymentAttachmentUploader

Verify:

- Files passed through callback

3.
InvoiceRecordPaymentSheet

Verify:

- Files received
- Files passed into recordInvoicePayment()

4.
paymentService

Verify:

- Files received
- Upload loop entered
- FormData built correctly

Log:

- filename
- mime type
- size
- FormData keys

5.
fetch()

Verify:

- Request URL
- HTTP Method
- Content-Type

6.
Browser Network

If local runner supports browser inspection:

Capture:

- request URL
- request headers
- request payload
- response status
- response body
- timing

If request never appears,
identify why.

7.
api/upload-payment-attachment

TEMP DEBUG:

Log:

- request entered
- authentication result
- request.formData()
- file exists
- filename
- mime type
- bytes
- tenant resolution
- telegram_topics query
- resolved thread_id

8.
telegramService

TEMP DEBUG:

Log:

- chat_id
- thread_id
- caption length
- Telegram endpoint
  (mask token)

Log:

- HTTP status

Capture COMPLETE Telegram response.

Do NOT truncate.

Mask only secrets.

9.
Database

Verify:

payments.attachments update executes.

Capture:

- update payload
- success/failure
- affected rows

10.
Client

Verify:

Returned JSON received.

Log:

- success payload

OR

- failure payload

====================================================================

D. DIAGNOSTIC SCRIPT

Create:

scripts/test-upload-pipeline.ts

Purpose:

Bypass the browser completely.

The script should:

• Load TELEGRAM_BOT_TOKEN
• Load TELEGRAM_GROUP_CHAT_ID
• Resolve thread_id
• Create a tiny in-memory test file
• Call telegramService.uploadFile()
• Print raw Telegram JSON
• Exit

Do NOT modify production data.

Do NOT insert fake payments.

If attachment persistence cannot be safely tested,
skip it and explain why.

====================================================================

E. HARD EVIDENCE TABLE

The report MUST contain this exact table.

| Stage | Evidence | PASS | FAIL | Error |
|------|------|------|------|------|
| File selected | | | | |
| Uploader callback | | | | |
| Sheet received files | | | | |
| paymentService entered | | | | |
| FormData built | | | | |
| fetch executed | | | | |
| Browser request exists | | | | |
| API route entered | | | | |
| request.formData parsed | | | | |
| File extracted | | | | |
| Auth validated | | | | |
| Topic lookup | | | | |
| thread_id resolved | | | | |
| Telegram request | | | | |
| Telegram response | | | | |
| Attachment persisted | | | | |
| Client received response | | | | |

====================================================================

F. INVESTIGATION RULES

You are NOT allowed to conclude:

"Upload failed."

You are NOT allowed to conclude:

"Likely..."

You are NOT allowed to speculate.

You MUST identify the FIRST failing stage.

If impossible,

state exactly what evidence is missing and why.

====================================================================

G. CONSTRAINTS

• No business logic changes.
• No UI changes.
• No retry implementation.
• No architecture changes.
• Temporary debug logging only.
• Mask secrets.
• Remove nothing except temporary diagnostics if instructed later.

====================================================================

H. REQUIRED VERIFICATION

Run:

- bun run typecheck
- bun run audit:load
- git status

If the local environment allows execution:

Run the diagnostic script.

If not,

provide exact execution instructions for the user.

====================================================================

I. OUTPUT

Save the investigation to:

docs/Reports/FinancialOperations/phase-2-6b-upload-pipeline-forensics.md

The report MUST include:

1. Files instrumented.
2. Diagnostic script.
3. Browser evidence (if available).
4. Raw Telegram response (masked).
5. Pipeline Evidence Table.
6. First confirmed failing stage.
7. Root cause (only if proven by evidence).
8. Recommended surgical fix (no implementation).
9. Confirmation that zero production behavior was intentionally changed.

Do NOT run bun run build.