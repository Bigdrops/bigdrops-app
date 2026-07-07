# Payment Attachment Upload Failure — Diagnostic Ticket

**Ticket ID:** PHASE-2.6D-UPLOAD-DEBUG-001  
**Date:** 2026-07-07  
**Status:** Awaiting log capture from Vercel Functions  
**Owner:** Project lead / DevOps  
**Related docs:**
- `docs/Tickets/Telegram-payment-attachment-upload/Telegramconvtest.md` — verified successful manual upload
- `docs/Reports/FinancialOperations/phase-2-6d-upload-error-surfacing.md` — latest investigation report
- `docs/Session-memories/Telegram-upload/gpt.md` — full session log (Phase 2.6A–2.6D)
- `docs/Session-memories/Telegram-upload/deepseek.md` — architect synthesis session log

---

## Issue

The payment attachment upload pipeline returns a generic “upload failed” to the user after recording a payment. The payment itself succeeds, but the attached receipt/PDF is not stored, and no specific error is shown.

---

## Environment

- **Application:** BIGDROPS ERP (bigdrops-app) deployed on Vercel
- **Storage backend:** Telegram Bot API (bot `@Erpdb_bot`, private group `BIGDROPS-ERP — Evidence Vault`)
- **Telegram group:** `-1004468858017`
- **Topic:** thread_id `5` → Tenant‑0001 Payment Receipts
- **Local dev:** Vite dev server (does NOT serve `api/` routes; upload only works on Vercel)

---

## Evidence of Correct Setup

1. **Telegram Bot Token**  
   - Token `8722546948:AAGn0_CBi_XouBWjqVxsLaI__VZKi1VzAqU` verified working via direct PowerShell `sendDocument` call.  
   - Upload succeeded; `message_id`, `file_id`, `file_unique_id`, `document.file_name`, `mime_type` captured and documented in `docs/Tickets/Telegramconvtest.md`.

2. **Telegram Group & Topic**  
   - Chat ID `-1004468858017` confirmed; topic thread_id `5` confirmed correct.  
   - Upload landed in the correct topic with proper caption rendering.

3. **Vercel Environment Variables**  
   - Desktop screenshot of Vercel dashboard (`docs/Tickets/Telegram-payment-attachment-upload/desktop vercel.png`) shows `TELEGRAM_BOT_TOKEN` and `TELEGRAM_GROUP_CHAT_ID` exist, are marked Sensitive, enabled for Production & Preview, and were updated ~4 hours ago.
   - Names are correct; values were pasted (not typed) from the working token.

4. **Code Instrumentation**  
   - `api/upload-payment-attachment.ts`, `telegramService.ts`, `paymentService.ts`, and `InvoiceRecordPaymentSheet.tsx` have temporary `[UPLOAD DEBUG]`, `[TELEGRAM]`, and `[UPLOAD]` console logs added to trace every pipeline stage.  
   - Instrumentation includes: auth check, FormData parsing, file size/type, env var presence (masked), thread lookup result, Telegram API call status/body, DB update result.

---

## Attempts Made So Far

1. **Initial Phase 2.6B implementation** — upload added to Record Payment sheet. Failed silently.
2. **Phase 2.6C forensic investigation** — concluded bot token invalid (HTTP 401) based on a test against the old token `7836932088:...`.  
3. **Token update** — New working token `8722546948:...` obtained, placed in local `.env` and Vercel env vars.  
4. **Manual verification via PowerShell** — Successful `sendDocument` with working token, correct chat_id, and thread_id (see `Telegramconvtest.md`).  
5. **Retraction of env var naming error** — earlier report incorrectly stated Vercel variable names were wrong due to a compressed mobile screenshot. Desktop screenshot confirmed names are correct.  
6. **Instrumented code deployed** — all debug logging is live on Vercel.

**Result:** Upload still fails in the application despite the token being proven valid, the group/topic correct, and the Vercel env var names accurate.

---

## Current Instrumentation

The following instrumentation is deployed and awaiting log capture:

| File | Checkpoints | What is logged |
|------|-------------|----------------|
| `api/upload-payment-attachment.ts` | 12 `[UPLOAD DEBUG]` stages | Request receipt, auth user, FormData parse, file name/size/mime, env var presence (masked), thread lookup result, `telegramService` call outcome, DB update outcome |
| `telegramService.ts` | `[TELEGRAM]` prefix | Token (masked), chatId, threadId, fileName; Telegram HTTP status and response body on failure |
| `paymentService.ts` | `[UPLOAD]` prefix | Full response body from API route, error details, per-stage error extraction |
| `InvoiceRecordPaymentSheet.tsx` | Error banner | Aggregated upload error messages shown to user |

---

## Unknowns

1. **Does `process.env.TELEGRAM_BOT_TOKEN` resolve at runtime?**  
   The env var is set in Vercel dashboard, but the serverless function may not see it if:
   - The deployment was created before the env var was added and wasn't redeployed.
   - The env var scope doesn't include the specific deployment environment.

2. **If token is visible, what does Telegram respond?**  
   Possibilities:
   - `401 Unauthorized` → token value in Vercel is still the old one (unlikely, given the paste).
   - `400 Bad Request` → thread_id, chat_id, file, or caption issue.
   - `200 OK` but DB update fails → Supabase `payments.attachments` write error.

3. **Is the thread lookup working?**  
   The `telegram_topics` table has a row for `evidence_type = 'payment_receipt'` with `thread_id = 5`. The query may fail if the admin Supabase client lacks permissions or the table is empty in production.

---

## Next Steps (No Fix, Investigation Only)

1. **Trigger a test upload** on the live Vercel deployment (record a payment with an attachment).
2. **Check Vercel function logs**:
   - Go to Vercel Dashboard → bigdrops-app → Deployments → latest → Functions → `api/upload-payment-attachment`
   - Filter for `[UPLOAD DEBUG]` and `[TELEGRAM]`
3. **Capture the following**:
   - The `[config]` line showing `TELEGRAM_BOT_TOKEN=set` or `MISSING`
   - The `[thread]` line showing thread lookup result
   - The `[TELEGRAM]` line showing HTTP status and response body
   - Any error stack trace
4. **Attach logs to this ticket** for further diagnosis.

Do NOT attempt to fix anything until the actual failing stage is identified from the logs.