# Gate 2 Document Persistence and Stream Completion Remediation Report

This report was written by Antigravity on 2026-11-16 via Antigravity Agent.

## Objective

Remediate the indefinite hang during the Bolu Gate 2 "Confirm & Save" workflow, fix the lingering "Pending" HTTP connection in the chat controller stream, implement an authoritative backend Gate 2 save endpoint, and deploy the updated service to Cloudzyro.

## Scope

- Backend stream wrapper in `api/bolu-chat.ts`
- Client streaming transport in `src/lib/ai-assistant/bolu-transport.ts`
- Two-Gate approval hook and persistence resolution in `src/lib/ai-assistant/hooks/useBoluThread.ts`
- Composer locking state and awaiting predicate in `src/components/ai-assistant/chat/BoluChatWorkspace.tsx`
- Dedicated Gate 2 document save API route in `api/bolu-save.ts`
- HTTP router in `server.ts`
- Server test suite in `src/tests/ai-assistant/server.test.ts`
- Cloudzyro backend deployment for site `bourxe-api`

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Root Cause Analysis

Two interacting defects caused the interface to show "Bolu is working..." indefinitely while the browser Network tab displayed the request in "Pending" status:

1. **Unterminated Server-Sent Events (SSE) Stream:**
   When upstream models (such as PlaMo 3.1 Prime or OpenRouter proxies) outputted the document proposal and sent `data: [DONE]`, the TCP socket stayed open because of HTTP keep-alive.
   In `api/bolu-chat.ts`, `wrapStreamForFirstTokenBoundary` waited for `reader.read()` to return `done: true`. Because the socket did not close, the reader hung waiting for subsequent chunks.
   In `src/lib/ai-assistant/bolu-transport.ts`, the client loop also ignored `data: [DONE]` and waited on `reader.read()`.
   Consequently, `isStreaming` remained `true`, the chat response turn never completed, and the network request stayed pending indefinitely.

2. **Composer Locking During Gate 2 Review:**
   In `BoluChatWorkspace.tsx`, the composer passed `awaiting={Boolean(activeProposal && activeProposal.status === 'pending_approval')}`.
   When Gate 1 was approved, the proposal transitioned to `'approved_pending_save'`. Because `awaiting` evaluated to `false` and `clerkState` was `'listening'`, the composer evaluated `isLocked ? (awaiting ? ... : 'Bolu is working…')`.
   This caused the composer to display the placeholder "Bolu is working..." even though Bolu was idle and awaiting human Gate 2 confirmation.

3. **Missing Backend Save Handler:**
   The backend had no dedicated `/api/bolu-save` route. If Gate 2 save was routed to the backend or failed during Supabase message ledger operations, unhandled rejections could leave the UI state locked in `'thinking'`.

## Changes Made

1. **`api/bolu-chat.ts` (Stream Completion & Keep-Alive Protection):**
   - Added immediate stream finalization upon encountering `data: [DONE]` or `[DONE]`.
   - Added a 25-second chunk idle timeout via `Promise.race` to protect against hung keep-alive sockets.
   - Wrapped `onSuccess` and `onComplete` in safe asynchronous execution with error logging.
   - Ensured `controller.close()` and `reader.releaseLock()` run deterministically in `finally` blocks.

2. **`src/lib/ai-assistant/bolu-transport.ts` (Client Stream Finalization):**
   - Added immediate loop termination when `line.trim() === 'data: [DONE]' || line.trim() === '[DONE]'`.
   - Guaranteed reader lock release in a `finally` block to allow clean socket tear-down.

3. **`src/components/ai-assistant/chat/BoluChatWorkspace.tsx` (Composer Placeholder Correction):**
   - Updated the `awaiting` prop to evaluate:
     `Boolean(activeProposal && (activeProposal.status === 'pending_approval' || activeProposal.status === 'approved_pending_save'))`.
   - The composer placeholder now correctly shows "Review the proposed card above…" during Gate 2 approval.

4. **`api/bolu-save.ts` (Authoritative Gate 2 Persistence Endpoint):**
   - Implemented `POST /api/bolu-save` to handle Gate 2 document persistence on the server.
   - Authenticates the user session bearer token via Supabase Auth.
   - Validates proposal existence, operations, and approved status (`approved_pending_save` or `saving`).
   - Resolves tenant schema name from `entities`.
   - Executes authoritative persistence (`persistInvoiceCreation` / `persistInvoiceModification`) with atomic RPCs (`save_quotation_with_items_transaction` / `save_invoice_with_items_transaction`).
   - All Supabase calls are strictly `await`ed in a `try/catch` block.
   - Explicitly returns HTTP 400 or 500 JSON errors (`{ error, code }`) if Supabase rejects the write.
   - Updates `bolu_messages` with persisted payload and inserts assistant confirmation message upon success.

5. **`server.ts`:**
   - Registered `routeName === 'bolu-save'` to load `./api/bolu-save`.

6. **`src/lib/ai-assistant/hooks/useBoluThread.ts`:**
   - In `confirmGate2Save`, added dual-mode persistence: calls `/api/bolu-save` on the backend first when `VITE_API_URL` is set, and falls back cleanly to local client persistence.
   - Wrapped all `bolu_messages` table mutations in safe `try/catch` blocks so UI states (`clerkState` and `activeProposal`) always transition to completion and never stay stuck in `'thinking'`.

7. **`src/tests/ai-assistant/server.test.ts`:**
   - Added test cases verifying that `GET /api/bolu-save` returns 405 Method Not Allowed and unauthorized `POST /api/bolu-save` returns 401 Unauthorized with CORS headers.

## Files Changed

- `api/bolu-chat.ts`
- `api/bolu-save.ts` (new file)
- `server.ts`
- `src/components/ai-assistant/chat/BoluChatWorkspace.tsx`
- `src/lib/ai-assistant/bolu-transport.ts`
- `src/lib/ai-assistant/hooks/useBoluThread.ts`
- `src/tests/ai-assistant/server.test.ts`
- `docs/reports/ai/2026-11-16-gate2-save-hang-and-stream-completion-remediation-report.md` (this report)

## Verification

- `bun test src/tests/ai-assistant/`: passed (278 passed, 0 failed across 30 files)
- `bun test src/tests/ai-assistant/server.test.ts`: passed (6 passed, 0 failed)
- `bun run audit:load`: passed (0 regressions)
- `bun run build`: skipped due to hardware policy
- Cloudzyro backend deployment: packaged sanitized archive and triggered Version 7 build (`dpc51ec2ebbbf8fbf4`) for site `bourxe-api`

## Supabase Push Status

No migration files were changed. Supabase database schema push was not required.

## Risks or Limitations

- Upstream providers that omit both `data: [DONE]` and EOF will be disconnected by the 25-second chunk timeout protection.
- Offline environments without `VITE_API_URL` will transparently continue using the direct client Supabase tenantClient persistence path.

## Deferred Work

None.
