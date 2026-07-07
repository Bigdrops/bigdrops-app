BIGDROPS Architecture Session Log

Telegram Payment Attachment Infrastructure

Context Restoration Log (Lead Architect)

Session Date: 2026-07-07
Status: Phase 2.6A–2.6D substantially complete. Upload pipeline investigation paused pending production log capture. Development focus shifting to the Receipts module.

---

1. Platform Context

BIGDROPS ERP is a single-tenant business platform built on:

- React 19
- Vite 7
- TypeScript 5.9
- Tailwind CSS 3.4
- Supabase
- Vercel Serverless Functions
- Bun runtime

The platform follows a strict architectural separation between:

- Business logic
- Presentation/ViewModels
- Infrastructure providers
- Document rendering
- Audit trail
- Financial calculations

Financial correctness is treated as immutable.

Telegram acts as the Evidence Vault rather than persistent application storage.

Application state stores metadata only.

Large files remain external.

---

2. Mental Model

The payment attachment system is not a Telegram feature.

Telegram is merely an implementation detail behind an Evidence Storage abstraction.

The platform owns attachment metadata.

Telegram owns binary storage.

Future providers (Google Drive, S3, Azure Blob, etc.) should replace Telegram without affecting UI or business logic.

Therefore:

UI
↓

Payment Service

↓

Attachment Infrastructure

↓

Provider Adapter

↓

Telegram

Never:

UI

↓

Telegram directly

---

3. Overall Objective

Allow payment evidence (bank alerts, transfer receipts, PDFs, screenshots) to become permanent financial evidence linked to invoice payments while preserving:

- payment integrity
- audit integrity
- provider abstraction
- future migration flexibility

Uploads must never become part of financial validation.

Payments remain the source of truth.

Attachments are supplemental evidence.

---

4. Guiding Principles Established

Payment First

Financial transaction commits first.

Evidence uploads afterwards.

Uploads never block payments.

---

Provider Neutral

Payment records never store Telegram-specific objects.

They store generic attachment metadata.

---

Pure Rendering

PaymentHistoryCard remains presentation-only.

No API calls.

No business logic.

No upload orchestration.

---

Infrastructure Isolation

Telegram API access lives only inside infrastructure.

Business services never understand Telegram endpoints.

---

Failure Isolation

Evidence upload failure cannot invalidate financial state.

Financial correctness always wins.

---

5. Phase Timeline

---

Phase 2.6A

Telegram Infrastructure

Goal

Introduce provider-neutral attachment infrastructure.

Major Files

Created

- attachmentTypes.ts

Modified

- paymentTypes.ts
- paymentService.ts
- telegramService.ts

Created

- api/upload-payment-attachment.ts

Database

- payment_attachments support
- telegram_topics lookup

Decisions

Introduced PaymentAttachment model.

Introduced providerMetadata.

Telegram thread lookup from database.

Upload endpoint separated from UI.

Telegram captions standardized.

PaymentAttachment became provider-neutral.

---

Phase 2.6A Cleanup

Goal:

Reduce architectural duplication.

Changes:

Initially removed

api/edit-payment-caption.ts

Caption editing moved client-side.

Decision later reversed.

Reason:

Bot token became exposed through VITE environment variables.

Security regression identified.

Lesson:

Infrastructure boundaries must never be collapsed merely to remove one HTTP call.

---

Phase 2.6A Security Correction

Restored:

api/edit-payment-caption.ts

Browser

↓

Server Function

↓

Telegram

Bot token removed from browser.

Environment variables reverted to server-only.

Architecture restored.

---

Phase 2.6B

Payment Recording Attachment UX

Goal

Integrate upload into Record Payment flow.

Major Files

Created

PaymentAttachmentUploader.tsx

Modified

InvoiceRecordPaymentSheet.tsx

paymentService.ts

paymentTypes.ts

attachmentTypes.ts

UX

Files selected before payment.

Payment committed.

Uploads begin.

Failures summarized afterwards.

Payment remains valid.

Uploader intentionally provider agnostic.

---

Phase 2.6B Follow-up

Validation policy unified.

Removed custom MIME regex.

Uploader now uses:

isSupportedImageFile()

Platform upload policy became single source of truth.

---

Phase 2.6C

Payment History Preparation

Architecture decided:

ViewModel owns attachment mapping.

PaymentHistoryCard remains renderer only.

New planned ViewModel fields:

hasAttachments

attachmentPreviews

Future viewer support planned using:

fileId

fileUniqueId

Original filename preserved.

Telegram sanitized filenames intentionally ignored.

Implementation intentionally deferred.

---

Phase 2.6D

Upload Failure Investigation

Problem:

Uploads consistently failed after successful payment recording.

Financial state remained correct.

Evidence missing.

No useful diagnostics.

Decision:

Do NOT fix.

Instrument first.

Instrumentation added:

paymentService

telegramService

upload-payment-attachment

InvoiceRecordPaymentSheet

Added:

UPLOAD DEBUG

UPLOAD

TELEGRAM

Structured stage reporting.

---

Investigation Timeline

Initial conclusion:

Bot token invalid.

Evidence:

Old token produced HTTP 401.

Later:

New token verified.

PowerShell sendDocument succeeded.

Captured:

message_id

file_id

file_unique_id

mime_type

file_name

topic routing

Telegram infrastructure proven healthy.

Later correction:

Mobile Vercel screenshot incorrectly interpreted.

Desktop screenshot proved:

Environment variable names were already correct.

Previous conclusion formally retracted.

Final investigation state:

Unknown runtime failure remains.

Ticket created.

Investigation paused.

No speculative fixes allowed.

---

6. Architecture Decisions

Payment Attachment

Provider neutral.

Never Telegram model.

---

Metadata Storage

Application owns:

fileName

provider

providerMetadata

uploadStatus

mimeType

size

Telegram owns binary.

---

Caption Editing

Server-only.

Never browser.

---

Environment Variables

Server

TELEGRAM_BOT_TOKEN

TELEGRAM_GROUP_CHAT_ID

Browser

Never receives Telegram credentials.

---

Upload Ordering

Payment

↓

Audit

↓

Settlement

↓

Status updates

↓

Attachment upload

Never reversed.

---

UI Ownership

Uploader

Collects files only.

Payment sheet

Coordinates uploads.

Infrastructure

Uploads.

History Card

Displays.

---

7. Files Added

PaymentAttachmentUploader.tsx

api/upload-payment-attachment.ts

api/edit-payment-caption.ts

api/tsconfig.json

attachmentTypes.ts

Various reports and tickets

---

8. Files Modified

paymentService.ts

telegramService.ts

paymentTypes.ts

InvoiceRecordPaymentSheet.tsx

vite-env.d.ts

attachmentTypes.ts

document image upload policy consumers

---

9. Evidence Collected

Verified:

Telegram Bot API

Verified:

Topic routing

Verified:

Caption rendering

Verified:

file_id

Verified:

message_id

Verified:

file_unique_id

Verified:

document upload

Verified:

manual PowerShell upload

Verified:

Telegram conversation test

Verified:

desktop Vercel configuration

Outstanding:

Runtime upload failure

Pending:

Vercel function logs

---

10. Technical Debt

Upload diagnostics remain temporarily inside production code.

Need removal after investigation.

Attachment viewer not implemented.

Download proxy not implemented.

Provider abstraction exists but currently only Telegram implemented.

Retry strategy intentionally deferred.

Thumbnail generation deferred.

Attachment deletion lifecycle undefined.

Storage cleanup policy undefined.

---

11. Agent Workflow Lessons

Premature Conclusions

Several agents diagnosed root causes before sufficient evidence.

Examples:

Invalid token

Wrong environment variable names

Both required later retraction.

Future rule:

Evidence before architecture.

---

Mobile Screenshot Failure

Compressed screenshots caused incorrect architectural decisions.

Future rule:

Desktop screenshots override mobile screenshots for infrastructure analysis.

---

Cleanup Regression

Attempting to eliminate one internal API introduced a severe security regression.

Lesson:

Removing architectural boundaries is rarely "cleanup."

---

Investigation Discipline

Fixes should never precede instrumentation.

Logs first.

Code second.

---

Documentation

Creating tickets before additional coding dramatically reduced context loss.

Architecture discussions became reproducible.

---

12. Current Project State

Completed

✓ Provider-neutral attachment model

✓ Telegram upload endpoint

✓ Secure server boundary

✓ Payment recording uploader

✓ Upload policy standardization

✓ Production instrumentation

✓ Diagnostic ticket

Paused

• Runtime upload investigation awaiting Vercel function logs

Deferred

• Attachment viewer

• Attachment thumbnails

• Download proxy

• Retry workflow

• Provider expansion

---

13. Recommended Next Session

Primary Focus

Receipts Module

The Telegram attachment subsystem should remain frozen until production runtime logs identify the precise failing stage.

No further speculative modifications should be made to the upload pipeline.

Future work should treat the attachment infrastructure as a reusable platform service that can later be integrated into Receipts, Expenses, Waybills, Delivery Confirmations, and any future evidence-producing workflows.