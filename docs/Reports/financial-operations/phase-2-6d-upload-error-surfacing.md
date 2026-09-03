# Phase 2.6D — Upload Error Surfacing & Investigation Update

This report was written by OpenCode on 2026-07-06 via Local Runner.

## Retraction of Previous Conclusion

The earlier investigation (Phase 2.6C forensic report) concluded that the Vercel environment variable names were incorrect:

> "TELEGRAM_T_TOKEN → TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID → TELEGRAM_GROUP_CHAT_ID"

**This conclusion is retracted.** It was based on a compressed mobile screenshot that obscured the actual variable names.

**Corrective evidence:** `docs/tickets/Telegram-payment-attachment-upload/desktop vercel.png` (the desktop screenshot) shows the Vercel Environment Variables ledger for `bigdrops-app` with:

| Variable | Status | Scope | Last Updated |
|----------|--------|-------|--------------|
| `TELEGRAM_GROUP_CHAT_ID` | Sensitive | Production and Preview | 4h ago |
| `TELEGRAM_BOT_TOKEN` | Sensitive | Production and Preview | 4h ago |

Both variables exist, are correctly named, are marked Sensitive, and are enabled for Production and Preview. The desktop screenshot is considered stronger evidence because it is an uncompressed, full-resolution capture of the Vercel dashboard, whereas the earlier mobile screenshot was compressed and difficult to read.

**Why the desktop screenshot supersedes the mobile screenshot:**
1. Desktop resolution reveals exact character-level variable names without ambiguity
2. Mobile compression introduced artifacts that made `TELEGRAM_BOT_TOKEN` appear as `TELEGRAM_T_TOKEN`
3. The desktop screenshot is the canonical source for this investigation

---

## Current Investigation State

### What is known

1. **Vercel env var names are correct** — `TELEGRAM_BOT_TOKEN` and `TELEGRAM_GROUP_CHAT_ID` (desktop screenshot)
2. **The old bot token was invalid** — `7836932088:AAHc2H0FM2ZMP7dkYbFEv0drCNhjDZkvnRM` returned HTTP 401 from Telegram's `getMe` endpoint (Phase 2.6C forensic evidence)
3. **A working bot token exists** — `8722546948:AAGn0_CBi_XouBWjqVxsLaI__VZKi1VzAqU` was verified via direct PowerShell `sendDocument` call (Phase 2.6C forensic evidence)
4. **The local `.env` was updated** to use the working token
5. **Vercel env vars were updated 4h ago** — but the VALUE stored in Vercel is unknown (the env var names are correct, but the token value could still be the old invalid one)
6. **Instrumented code is already in place** — `api/upload-payment-attachment.ts` and `telegramService.ts` have `[UPLOAD DEBUG]` and `[TELEGRAM]` logging

### What is unknown

1. **Whether the Vercel env var `TELEGRAM_BOT_TOKEN` contains the valid or invalid token** — the env var name is correct, but the value is unverified
2. **Whether `process.env.TELEGRAM_BOT_TOKEN` is visible at runtime in the Vercel serverless function** — the env var is set in the dashboard, but scope/visibility issues could prevent the function from seeing it
3. **The actual Telegram API response** — the instrumented code will log the full error, but this has not been captured yet

---

## Pipeline Stage-by-Stage Analysis (Updated)

| Stage | File | Status | Notes |
|-------|------|--------|-------|
| 1. UI file pick/validate | `PaymentAttachmentUploader.tsx` | ✅ Works | Drag/drop, file type/size validation |
| 2. User clicks Record Payment | `InvoiceRecordPaymentSheet.tsx` | ✅ Works | Calls `recordInvoicePayment` with files |
| 3. Payment committed to DB | `paymentService.ts` → `paymentRepository.ts` | ✅ Works | `createPayment` inserts the row |
| 4. Upload loop entered | `paymentService.ts` | ✅ Works | Session token present |
| 5. `fetch("/api/...")` called | `paymentService.ts` | ✅ On Vercel | API route exists; would 404 in local dev |
| 6. API route processes request | `api/upload-payment-attachment.ts` | ✅ Instrumented | Logs `[UPLOAD DEBUG]` at 12 checkpoints |
| 7. Env var visibility | `process.env.TELEGRAM_BOT_TOKEN` | **UNVERIFIED** | Env var names correct in dashboard; value unknown |
| 8. Thread lookup | `telegram_topics` table | **UNVERIFIED** | Query may fail or return null |
| 9. Telegram upload | `telegramService.ts` → Telegram Bot API | **UNVERIFIED** | Instrumented with `[TELEGRAM]` logging |
| 10. Database update | `api/upload-payment-attachment.ts` | **UNVERIFIED** | Updates `payments.attachments` column |

---

## First Real Failing Stage (Hypothesis)

Based on the available evidence, the first real failing stage is most likely **Stage 7 or Stage 9**:

**Hypothesis A (Stage 7 — Env var value wrong):** The Vercel env var `TELEGRAM_BOT_TOKEN` contains the old invalid token `7836932088:AAHc2H0FM2ZMP7dkYbFEv0drCNhjDZkvnRM`, not the working token `8722546948:AAGn0_CBi_XouBWjqVxsLaI__VZKi1VzAqU`. The env var name is correct, but the value is stale.

**Hypothesis B (Stage 7 — Env var not visible):** The env var is set in the Vercel dashboard, but the serverless function cannot see it due to scope/visibility issues (e.g., the function was deployed before the env var was added, or the env var is not propagated to the deployment).

**Hypothesis C (Stage 9 — Telegram rejects the request):** The token is valid, but Telegram rejects the `sendDocument` call for another reason (e.g., chat_id is wrong, thread_id is invalid, file is too large, bot is not a member of the chat).

---

## What the Instrumented Code Will Show

The already-instrumented code will produce the following logs in Vercel function logs:

```
[UPLOAD DEBUG] [1] Request received
[UPLOAD DEBUG] [config] SUPABASE_URL=set SERVICE_ROLE_KEY=set
[UPLOAD DEBUG] [2] Authenticated user: user@example.com
[UPLOAD DEBUG] [3] FormData parsed
[UPLOAD DEBUG] [4] File name: receipt.pdf
[UPLOAD DEBUG] [5] File size: 123456 bytes
[UPLOAD DEBUG] [6] Mime type: application/pdf
[UPLOAD DEBUG] [config] TELEGRAM_GROUP_CHAT_ID=set/MISSING TELEGRAM_BOT_TOKEN=set/MISSING
[UPLOAD DEBUG] [7] Thread lookup started
[UPLOAD DEBUG] [8] Thread lookup result: thread_id=5 (from DB: 5)
[UPLOAD DEBUG] [9] Calling telegramService.uploadFile()...
[TELEGRAM] uploadFile() token=872254...3zAqU chatId=-1001234567890 threadId=5 fileName=receipt.pdf
```

If Telegram rejects the request:
```
[TELEGRAM] sendDocument FAILED status=400 body={"ok":false,"error_code":400,"description":"Bad Request: ..."}
[UPLOAD DEBUG] [9] Telegram upload FAILED: Telegram upload failed (400): {"ok":false,...}
```

If the env var is missing:
```
[UPLOAD DEBUG] [config] TELEGRAM_GROUP_CHAT_ID=MISSING TELEGRAM_BOT_TOKEN=MISSING
```

---

## Required Next Steps (No Code Changes)

1. **Deploy the instrumented code** to Vercel (the code is already in place)
2. **Trigger a test upload** via the UI
3. **Check Vercel function logs** for the `[UPLOAD DEBUG]` and `[TELEGRAM]` output
4. **Determine the first failing stage** from the logs:
   - If `TELEGRAM_BOT_TOKEN=MISSING` → Stage 7: env var not visible
   - If `TELEGRAM_BOT_TOKEN=set` but `sendDocument FAILED status=401` → Stage 9: token value is wrong
   - If `TELEGRAM_BOT_TOKEN=set` but `sendDocument FAILED status=400` → Stage 9: other Telegram error
   - If `sendDocument OK` but `db-update FAILED` → Stage 10: database persistence error

5. **Update this report** with the actual log output and the confirmed first failing stage

---

## Files Modified (Instrumentation)

| File | Change | Status |
|------|--------|--------|
| `api/upload-payment-attachment.ts` | 12 `[UPLOAD DEBUG]` checkpoints, `stageError()` helper, env var presence logging | ✅ In place |
| `src/modules/invoices/services/telegramService.ts` | `[TELEGRAM]` logging with masked token, error body logging | ✅ In place |
| `src/modules/invoices/services/paymentService.ts` | Full response body reading, `[UPLOAD]` error logging, stage info extraction | ✅ In place |
| `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` | Error banner with aggregated upload errors | ✅ In place |

---

## Verification

- `bun run audit:load` — passed, no new regressions
- `git status` — 4 modified files (instrumented), 1 report file, no unintended changes
- `bun run typecheck` — skipped per AGENTS.md hardware policy (4GB RAM constraint)

---

## Deferred Work

- **Deploy** instrumented code to Vercel and capture function logs
- **Determine** the actual token value stored in Vercel env var `TELEGRAM_BOT_TOKEN`
- **Update** this report with the confirmed first failing stage
- **Fix** the root cause once identified (no code changes until root cause is confirmed)

---

## Appendix: Evidence Chain

| Evidence | Source | Weight | Conclusion |
|----------|--------|--------|------------|
| Desktop screenshot (`desktop vercel.png`) | Vercel dashboard | **High** — uncompressed, full-resolution | Env var names are correct |
| Mobile screenshot (earlier) | Vercel dashboard | **Low** — compressed, artifacts | Initially misread as wrong names |
| `getMe` call with old token | PowerShell test | **High** — direct API call | Old token `7836932088:...` is invalid (401) |
| `sendDocument` call with new token | PowerShell test | **High** — direct API call | New token `8722546948:...` works |
| `.env` updated locally | File system | **Medium** — local only, not in git | Working token is in local `.env` |
| Vercel env vars updated "4h ago" | Desktop screenshot | **Medium** — timestamp only, value unknown | Could be old or new token |
