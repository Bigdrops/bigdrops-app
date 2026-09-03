# Phase 2.6A Security Correction: VITE_TELEGRAM Bot Token Exposure

This report was written by OpenCode on 2026-07-06 via Local Runner.

## Objective

Fix a security regression introduced in the Phase 2.6A cleanup: the Telegram bot token (`TELEGRAM_BOT_TOKEN`) was exposed to the browser bundle via `VITE_TELEGRAM_BOT_TOKEN` and `VITE_TELEGRAM_GROUP_CHAT_ID` Vite client-side env vars.

## Root Cause

During the Phase 2.6A cleanup, `api/edit-payment-caption.ts` (a server-only Vercel Function) was deleted. The caption-edit logic was moved directly into `paymentService.ts` (browser code) and rewired to call `telegramService.editCaption()` directly — which requires the bot token. Since `telegramService` runs in the browser, the token had to be exposed via `import.meta.env.VITE_TELEGRAM_BOT_TOKEN`.

## Corrections Applied

### 1. `.env` (gitignored, local only)

Removed lines 14-15:
- `VITE_TELEGRAM_BOT_TOKEN=...`
- `VITE_TELEGRAM_GROUP_CHAT_ID=...`

Server-only `TELEGRAM_BOT_TOKEN` and `TELEGRAM_GROUP_CHAT_ID` remain (lines 12-13).

### 2. Source code verification

The following fixes were already committed in a prior session (verified against `HEAD`):
- `vite-env.d.ts` — No `VITE_TELEGRAM_*` declarations in `ImportMetaEnv`
- `paymentService.ts` — Does NOT import `telegramService` or use `import.meta.env.VITE_TELEGRAM_*`. `editVoidCaptions()` calls `fetch("/api/edit-payment-caption")` with the payment ID and bearer token
- `api/edit-payment-caption.ts` — Server-only Vercel Function that uses `process.env.TELEGRAM_BOT_TOKEN`, queries payment attachments from DB via admin Supabase client, and calls `telegramService.editCaption()` per Telegram attachment

### 3. Architecture boundary restored

```
Before (regression):    Browser → telegramService.editCaption() [token in bundle]
After (correct):        Browser → fetch("/api/edit-payment-caption") → server → telegramService.editCaption()
```

## Verification

| Check | Result |
|---|---|
| `grep VITE_TELEGRAM` source files | Zero hits (only in historical report) |
| `grep process.env.TELEGRAM_BOT_TOKEN` | Only in `api/upload-payment-attachment.ts` and `api/edit-payment-caption.ts` (server-only) |
| `bun run typecheck` | Only pre-existing waybill component errors (unrelated) |
| `bun run audit:load` | Pass — no new issues |
| `git status` | Only pre-existing uncommitted changes (waybill templates, css, InvoiceFormPage) — none from this session's source changes |

## Risks & Limitations

- The local `.env` file (gitignored) is the only file that actually had stale VITE vars. If other developers had pulled the `.env.example` or a shared `.env` with VITE vars during the regression window, they would need to update theirs too.

## Deferred Work

- None. The security boundary is fully restored.
