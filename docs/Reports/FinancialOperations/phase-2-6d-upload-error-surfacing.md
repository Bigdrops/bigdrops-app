# Phase 2.6D — Upload Error Surfacing Report

**Date:** 2026-07-06
**Scope:** Telegram attachment upload pipeline — real error surfacing instead of generic "Upload failed"

## Problem

The upload pipeline swallowed real errors and displayed a generic "Upload failed" message to users. When the Telegram bot token was invalid or misconfigured, the error was invisible in both the browser console and the Vercel function logs.

## Changes

### 1. `api/upload-payment-attachment.ts` — Full instrumentation

- Added 12 `[UPLOAD DEBUG]` checkpoints: request received → auth → config → form-parse → file/name/size/mime → thread lookup → telegram upload → DB save → success
- Each stage logs to `console.error` on failure with `[stage]` tag
- Error responses now return `{ success, stage, message }` instead of `{ error }`
- Config checks log whether `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_GROUP_CHAT_ID`, `TELEGRAM_BOT_TOKEN` are set

### 2. `src/modules/invoices/services/telegramService.ts` — Token masking + logging

- `uploadFile()` now logs token (masked), chatId, threadId, fileName on entry
- On Telegram error: logs status + first 500 chars of response body
- On missing file_id: logs result keys for debugging
- On success: logs message_id + file_id prefix
- Bot token is masked (first 6 + last 4 chars) in all logs

### 3. `src/modules/invoices/services/paymentService.ts` — Real error propagation

- Non-200 responses: reads full response body as text first (avoids double-consume), parses JSON, extracts `stage` and `message`
- Error format: `[stage] message` (e.g., `[telegram-config] Telegram not configured: chatId=MISSING botToken=MISSING`)
- Network errors: logged with `[UPLOAD] Network error for {filename}:` prefix
- Both paths log to `console.error` for Vercel function log visibility

### 4. `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` — Visible error display

- Upload failures now show in a red danger banner below the file list
- File name, status, and error message displayed per file
- Error banner aggregates all failed upload error messages

## Verification

- `bun run audit:load` — passed, no new regressions
- `git status` — only 4 modified files, no unintended changes
- Vercel env var names still wrong: `TELEGRAM_T_TOKEN` / `TELEGRAM_CHAT_ID` → needs renaming in dashboard

## Next

1. User renames Vercel env vars: `TELEGRAM_T_TOKEN` → `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` → `TELEGRAM_GROUP_CHAT_ID`
2. User redeploys
3. Test upload → check Vercel function logs for `[UPLOAD DEBUG]` output
