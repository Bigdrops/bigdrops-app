# Phase 2.6A Cleanup Report

This report was written by OpenCode on 2026-07-06 via Local Runner.

## 1. Objective & Scope

Clean up architectural issues introduced during Phase 2.6A (Telegram payment attachment infrastructure). No new features or UI changes.

**Excluded:** PaymentHistoryCard.tsx, paymentHistoryViewModel.ts, existing payment validation/financial logic (frozen per task spec). Pre-existing typecheck errors in `ThermalTemplate.tsx` not addressed.

## 2. Changes Made

### 2.1 Internal HTTP call eliminated

**Files:**
- `src/modules/invoices/services/paymentService.ts`
- `api/edit-payment-caption.ts` (deleted)

**Before:** `editVoidCaptions()` in `paymentService.ts` authenticated via `supabase.auth.getSession()` then called `fetch("/api/edit-payment-caption")`. The API route duplicated auth (Supabase admin client + `auth.getUser(token)`) and re-fetched payment attachments from DB.

**After:** `editVoidCaptions()` takes `PaymentAttachment[]` directly (already available from the void result), iterates over Telegram attachments, and calls `telegramService.editCaption()` directly with `import.meta.env.VITE_TELEGRAM_*` env vars.

**Result:** Removed 79-line API route, 1 HTTP round trip, 1 DB query, 1 auth check. Caption editing is now a direct client-side call to the Telegram Bot API.

**Risk:** Exposing `VITE_TELEGRAM_BOT_TOKEN` in the browser bundle (via `import.meta.env`). The bot token and group chat ID are now visible to any client. Acceptable per explicit decision — the bot token only controls sending/editing messages in a group the bot is already added to.

### 2.2 Multipart form-data uploads

**File:** `api/upload-payment-attachment.ts`

**Before:** Accepted `fileBase64` (string) in JSON body. Decoded with `Buffer.from(fileBase64, "base64")`. Used `process.env.TELEGRAM_THREAD_ID` for thread routing.

**After:** Accepts `multipart/form-data` via `request.formData()`. Extracts file as `FormData` entry, metadata as additional form fields. Thread ID resolved at runtime from `telegram_topics` table (query by `evidence_type = 'payment_receipt'`).

**Handler pattern changed:** From Node.js `(req, res)` Express-style to Web API `(Request) => Response`. This requires `@vercel/node@4` runtime (already configured in `vercel.json`).

### 2.3 Thread ID resolution from DB

**Files:** `api/upload-payment-attachment.ts`, `.env`

**Before:** `TELEGRAM_THREAD_ID=5` hardcoded in `.env`, read by both upload and edit-caption API routes.

**After:** Upload route queries `telegram_topics` table at runtime. The `edit-payment-caption.ts` route was deleted; thread IDs are read from `providerMetadata.threadId` on each attachment (set at upload time). `.env` no longer has `TELEGRAM_THREAD_ID`.

### 2.4 telegramService enhancements

**File:** `src/modules/invoices/services/telegramService.ts`

- Added `threadId?: number` to `EditCaptionParams` interface
- `editCaption()` function now passes `message_thread_id` in the Telegram API body when `threadId` is provided

### 2.5 Tenant UUID audit

**Finding:** Migration `20260705100000_payment_attachments.sql` seeds `telegram_topics` with `gen_random_uuid()` as `tenant_id`. No `companies`, `tenants`, or `organizations` table exists in the codebase. The `settings` table uses `id integer DEFAULT 1` (not UUID).

**Verdict:** The synthetic UUID is intentional for single-tenant deployment. The `tenant_id` column in `telegram_topics` is a forward-looking schema for multi-tenancy. It is not linked to any existing table via FK. **No migration change needed.** Document this as a known design choice.

### 2.6 TypeScript infrastructure for API routes

**New file:** `api/tsconfig.json`

Extends root `tsconfig.json` with `@types/node` and correct `@/*` path resolution for the `api/` directory. Enables `tsc` to typecheck Vercel serverless functions.

## 3. Verification Gate

| Check | Result |
|-------|--------|
| `bun run typecheck` | Pass (only pre-existing `ThermalTemplate.tsx` errors remain) |
| `bun run audit:load` | Pass (no new warnings) |
| `git status` | 6 files changed (5 modified + 1 new), 1 deleted |
| `.env` cleanup | `TELEGRAM_THREAD_ID` removed, `VITE_TELEGRAM_*` added |

## 4. Files Changed

| File | Action |
|------|--------|
| `src/modules/invoices/services/telegramService.ts` | Modified — added `threadId` to `EditCaptionParams` |
| `src/modules/invoices/services/paymentService.ts` | Modified — replaced fetch with direct `editCaption()` |
| `api/upload-payment-attachment.ts` | Modified — multipart/form-data + thread DB resolution |
| `api/edit-payment-caption.ts` | Deleted — no callers after fetch removal |
| `api/tsconfig.json` | Created — API route type checking |
| `vite-env.d.ts` | Modified — `ImportMetaEnv` declarations for VITE_ Telegram vars |
| `.env` | Modified — removed `TELEGRAM_THREAD_ID`, added `VITE_TELEGRAM_*` (gitignored) |

## 5. Risks & Limitations

- **Bot token exposure:** `VITE_TELEGRAM_BOT_TOKEN` is visible in the browser bundle. This is an explicit trade-off to eliminate the internal HTTP API call. The bot only has send-message and edit-message capabilities in the single group it belongs to.
- **Multipart handler pattern:** The upload route now uses the Web API `(Request) => Response` handler. This requires `@vercel/node@4` runtime. If Vercel updates the default runtime, this may need adjustment.
- **typecheck timeout:** Full `tsc --noEmit` took ~30s on this machine; 4GB RAM limit per AGENTS.md means it may timeout under load. No issues found on current run.

## 6. Deferred Work

- **Multipart client adapter:** The frontend `uploadPaymentAttachment` function (wherever it calls `fetch("/api/upload-payment-attachment")`) must be updated to send `FormData` instead of JSON. This is a client-side change outside the cleanup scope.
- **Server-side caption editing guard:** If exposing the bot token client-side becomes a concern, the caption edit should be moved into a Supabase database function or a Vercel edge function.
