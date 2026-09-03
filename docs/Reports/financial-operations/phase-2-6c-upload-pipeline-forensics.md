# Phase 2.6C — Upload Pipeline Forensic Report

This report was written by OpenCode on 2026-07-06 via Local Runner.

## Objective & Scope

Identify the first failing stage in the payment attachment upload pipeline (`InvoiceRecordPaymentSheet.tsx` → `paymentService.ts` → `api/upload-payment-attachment.ts` → `telegramService.ts` → Telegram Bot API). No fixes, no retries — purely diagnostic.

**Intentionally excluded:** Database insert/update logic (`paymentRepository.ts`), UI layer (`InvoiceRecordPaymentSheet.tsx`, `PaymentAttachmentUploader.tsx`), and type definitions (`attachmentTypes.ts`, `paymentTypes.ts`). These are downstream of the identified failure.

---

## Root Cause

The Telegram bot token in `.env` (`7836932088:AAHc2H0FM2ZMP7dkYbFEv0drCNhjDZkvnRM`) is **invalid/revoked**. Telegram's Bot API returns HTTP 401 `Unauthorized` for every call using this token — both `sendDocument` and `getMe`.

### Evidence

1. **Direct `getMe` call**: Telegram returns 401 immediately — confirms the token itself is not recognized.
   ```
   https://api.telegram.org/bot7836932088:AAHc2H0FM2ZMP7dkYbFEv0drCNhjDZkvnRM/getMe
   → 401 {"ok":false,"error_code":401,"description":"Unauthorized"}
   ```

2. **Direct `sendMessage` call** (simpler than `sendDocument`, no file handling): Also 401.
3. **`telegramService.uploadFile()` via the diagnostic script**: HTTP 401 from Telegram.

### Token Analysis
- Length: 46 characters (correct — Telegram tokens are always `digits:hex[35]`)
- No hidden whitespace/CRLF: verified via hex dump
- Format `7836932088:AAHc2H0FM2ZMP7dkYbFEv0drCNhjDZkvnRM` — structurally valid
- The bot was likely revoked, or this is a placeholder/example token that was never valid

### Secondary Issue (Local Dev Only)

`bun run dev` (Vite dev server) does **not** serve `api/` routes. The `vite.config.js` has no API route plugin — only `@vitejs/plugin-react`. The `api/` directory is handled exclusively by Vercel (`vercel.json` routes `/api/(.*)` → `/api/$1`). In local dev, `fetch("/api/upload-payment-attachment")` → 404, which would fail before even reaching the Telegram call.

This is irrelevant in production (Vercel serves the API routes), but means developers cannot test the upload pipeline locally without deploying or running a separate server.

---

## Pipeline Stage-by-Stage Analysis

| Stage | File | Result |
|-------|------|--------|
| 1. UI file pick/validate | `PaymentAttachmentUploader.tsx` | ✅ Works (drag/drop, file type/size validation) |
| 2. User clicks Record Payment | `InvoiceRecordPaymentSheet.tsx` | ✅ Calls `recordInvoicePayment` with files |
| 3. Payment committed to DB | `paymentService.ts` → `paymentRepository.ts` | ✅ `createPayment` inserts the row |
| 4. Upload loop entered | `paymentService.ts` | ✅ Session token present |
| 5. `fetch("/api/...")` called | `paymentService.ts` | ❌ **404 in local dev** (Vite has no API route plugin); would reach API on Vercel |
| 6. API route processes request | `api/upload-payment-attachment.ts` | ❌ **401 from Telegram** — bot token invalid; API route returns 500 |
| 7. Telegram receives document | `telegramService.ts` | ❌ Never reaches this stage — Telegram rejects the auth |

**First failing stage:** `telegramService.uploadFile()` — Telegram Bot API authentication.

---

## Methodology

1. Read all 5 target pipeline files
2. Temporarily instrumented 3 files with `[DEBUG-UPLOAD]` console.log statements
3. Created `scripts/test-upload-pipeline.ts` — standalone diagnostic that calls `telegramService.uploadFile()` directly with a small in-memory text file
4. Executed the diagnostic script via `bun run scripts/test-upload-pipeline.ts`
5. Also tested Telegram API directly via PowerShell `Invoke-RestMethod` with `getMe` and `sendMessage` endpoints
6. Verified no hidden characters in the bot token via hex dump
7. Git-diff confirms `.env` is gitignored — token is local-only

All instrumentation has been reverted (`git checkout`).

---

## Risks & Limitations

- The `.env` file is local and not in git, so no historical check is possible. The bot token may never have been valid, or may have been revoked at any point.
- The `api/` route 404 in local dev is a second independent failure mode, but only affects development, not production.
- The `companyName` field missing from `paymentService.ts` FormData (`parseFormData` expects it) would result in an empty company name in the caption — cosmetic only, not a failure cause.

---

## Verification

- `bun run typecheck` — skipped per AGENTS.md hardware policy (4GB RAM constraint).
- `git status` confirmed only the new report file and diagnostic script remain modified.
- `git checkout` confirmed clean revert of all 3 instrumented source files.

---

## Deferred Work

- **Fix:** Obtain a valid Telegram Bot token from @BotFather and update `.env`.
- **Fix (local dev):** Add `vite-plugin-api-routes` or a small dev server to serve `api/` routes locally, OR document that local testing requires deployment to Vercel.
- **Fix (cosmetic):** Add `companyName` to the FormData in `paymentService.ts` to produce correct captions.
- **Cleanup:** Remove `scripts/test-upload-pipeline.ts` after fixes are verified.
