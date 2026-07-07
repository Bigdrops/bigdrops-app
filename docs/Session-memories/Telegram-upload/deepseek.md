# Architect Session Log — Telegram Attachment Upload Cycle

**Role:** Lead Architect (Synthesis)  
**Date:** 2026-07-07  
**Cycle:** Financial Operations Phase 2.6 (Telegram Payment Attachments)  
**Participants:** dorime, rector, Sirius 7, Gu Change, Sharon, project lead  
**Status:** Awaiting Vercel function log capture to diagnose upload failure (Phase 2.6D)

---

## 1. Platform Context

- **Application:** BIGDROPS — B2B business management suite for Nigerian SMEs.
- **Stack:** React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel, Bun.
- **Key Modules:** Payments (WHT, VAT, settlements), Compliance Hub, Reports, Audit Trail.
- **Storage Decision:** Telegram Bot API used as evidence vault (instead of Supabase Storage) to diversify storage from Supabase free tier.
- **Operational Environment:** Mobile / Multi‑AI Strategy Room; OpenCode as PC coding agent with full repository access.

## 2. Mental Model & Architectural Philosophy

- **Financial truth flows one direction:** Calculation Engine → Invoice → Payment → Financial State → Consumers (Compliance, Reports, Dashboards). Upstream never consumes downstream.
- **Payments are immutable events.** Corrections append; nothing is deleted.
- **Payment‑before‑upload sequencing:** Financial record must exist before any external service call. Upload failure never rolls back a payment.
- **Provider‑neutral attachment model:** `PaymentAttachment` interface with `provider: "telegram"` and opaque `providerMetadata`. No Telegram‑specific types leak into domain.
- **Server‑side Telegram boundary:** Bot token never exposed to browser. All Telegram communication through Vercel serverless functions.
- **Presentation layer purity:** `PaymentHistoryCard` is a frozen renderer (Phase 2.5). All new UI features extend `PaymentHistoryRowViewModel`.
- **Surgical, evidence‑first changes:** Every phase is small, verifiable, and backed by repository evidence.

## 3. Critical Architecture Decisions (CADs)

| ID | Decision | Rationale | Trade‑offs |
|----|----------|-----------|------------|
| CAD‑1 | **Use Telegram as evidence store** | Avoid Supabase Storage free‑tier limits; diversify infrastructure | External dependency; bot token security; no SLA |
| CAD‑2 | **Provider‑neutral attachment model** | Swap storage later without changing domain types | Slightly more indirection |
| CAD‑3 | **Payment committed before upload** | Financial integrity; upload failure must not block settlement | Some attachments may remain missing if upload fails (recovery addressed in Phase 2.6B.5 later) |
| CAD‑4 | **Serverless proxy for Telegram** | Protects bot token; client never touches Telegram API | Extra network hop; requires Vercel function |
| CAD‑5 | **Tenant resolution on server** | Client never sends tenant_id; prevents tampering | Server must fetch tenant from auth session |
| CAD‑6 | **Thread IDs in database, not env** | Multi‑tenant ready; one env variable per environment | Requires DB lookup per upload |
| CAD‑7 | **PaymentHistoryCard frozen** | Prevents UI entropy; all rendering via ViewModel | New features must be mapped before rendering |
| CAD‑8 | **Sequential uploads (not parallel)** | Avoid Telegram rate limits | Slower for multiple files (acceptable for payment evidence) |
| CAD‑9 | **WHT snapshot on payments** | Capture `wht_rate`, `wht_type` at payment time; immutable history | Extra DB columns; needed for compliance |
| CAD‑10 | **Dual audit mechanism preserved** | `audit_logs` + `activity_events` direct‑call pattern extended | Not yet a platform service; correlation IDs deferred |

## 4. Phase‑by‑Phase Implementation Breakdown

### Phase 1 — Payment Integrity Foundation (Completed)
**Objective:** Close critical data‑loss gaps and unify payment pipeline.

- **1a — WHT snapshot persistence:** `paymentService.ts`, `paymentRepository.ts` — `wht_rate`/`wht_type` now populated from invoice at recording time; removed hardcoded nulls.
- **1a — Financial state alignment:** `financialState.ts:59` — removed tolerance mismatch with `invoice_financials_v`; both now use exact comparison.
- **1a — Dead UI removal:** Deleted unused `RecordPaymentModal.tsx`.
- **1b — Payment pipeline consolidation:** Removed fast‑pay divergence; all recordings route through `paymentService.recordInvoicePayment()`. UI helpers (`paymentEntryHelpers.ts`) cleared of WHT logic.

### Phase 2.1 — Compliance Service/Repository Layer (Completed)
- Created `complianceRepository.ts` and `complianceService.ts`; migrated all compliance panels (`WhtReceiptsPanel`, `VatInputsPanel`, `TaxFilingsPanel`, `TaxRemindersPanel`, `ComplianceSettingsPanel`) from direct Supabase calls to service layer.

### Phase 2.2 — Reporting Projection Layer (Completed)
- Introduced `reportRepository.ts` and `reportProjectionService.ts`; `Reports.tsx` now consumes projections; all report sections (`ReceivablesSection`, `ProjectsSection`, `TaxSection`) made presentational.

### Phase 2.3 — Automatic WHT Receipt Draft (Completed)
- Added `autoCreateWhtReceiptDraft()` to `complianceService.ts`; called fire‑and‑forget after payment recording with `wht_amount > 0`. Uses idempotent insert.

### Phase 2.4A — WHT Receipt Numbering (Paused)
- Prompt prepared to add `receipt_number` to `wht_receipts` via existing prefix engine, but deferred due to priority shift.

### Phase 2.5 — Payment History ViewModel Refactor (Completed)
**Objective:** Freeze `PaymentHistoryCard` as a pure renderer.
- Created `paymentHistoryViewModel.ts` with `PaymentHistoryRowViewModel` (17 typed fields).
- Moved all formatting, status logic, and fallbacks from `PaymentHistoryCard.tsx` to mapper.
- Card now only iterates and renders; no string concatenation, no nullable checks.

### Phase 2.6A — Telegram Infrastructure (Completed + Cleanup)
**Objective:** Secure, provider‑neutral upload backend.
- **Migration:** `payments.attachments` JSONB column, `telegram_topics` table seeded with verified thread_id=5.
- **Serverless functions:** `api/upload-payment-attachment.ts` (multipart/form‑data, tenant resolution from DB), `api/edit-payment-caption.ts` (thin proxy for void caption editing).
- **Service:** `telegramService.ts` — upload, caption building, void caption editing.
- **Types:** `src/lib/attachmentTypes.ts` — generic `PaymentAttachment` interface.
- **Audit:** `ATTACHMENT_UPLOADED` event type whitelisted; `record_payment_attachment_uploaded` RPC created.
- **Cleanup (security regression fix):** Re‑restored server boundary after `VITE_TELEGRAM_BOT_TOKEN` accidentally exposed in client bundle. Removed client secrets, re‑established API proxy for caption edits, validated zero `VITE_TELEGRAM` references.

### Phase 2.6B — Payment Recording Attachment UX (Completed)
**Objective:** Add file upload UI to Record Payment sheet.
- Created `src/components/ui/PaymentAttachmentUploader.tsx` — pure UI (drag/drop, preview, validation), provider‑agnostic.
- Modified `InvoiceRecordPaymentSheet.tsx` to integrate uploader; handles sequential uploads after payment commit, shows non‑blocking summary.
- Extended `paymentService.recordInvoicePayment()` to accept optional `File[]`, orchestrate uploads, return `uploadResults`.
- Upload failures do not block payment; per‑file status reported.

### Phase 2.6C — Forensic Investigation (Completed)
**Objective:** Diagnose upload failures in production.
- Instrumented `api/upload-payment-attachment.ts`, `telegramService.ts`, `paymentService.ts` with detailed `[UPLOAD DEBUG]` and `[TELEGRAM]` logging.
- Created diagnostic script `scripts/test-upload-pipeline.ts`.
- Found old bot token (`7836932088:...`) invalid (401). New token (`8722546948:...`) verified working via PowerShell.
- Retracted earlier incorrect conclusion about Vercel env var names; desktop screenshot confirmed names correct.

### Phase 2.6D — Upload Error Surfacing & Investigation Update (Current)
**Objective:** Capture runtime logs to pinpoint exact failure stage.
- Instrumented code deployed to Vercel with 12 checkpoints.
- Vercel env vars confirmed correct (names and values) from desktop dashboard.
- Awaiting real upload trigger and function log capture to determine whether token visible at runtime and Telegram response.

### Pending/Deferred
- **Phase 2.6B.5 (Attachment Recovery):** Canceled in favor of hardening upload first.
- **Phase 2.6C (Attachment Display):** Prompt ready to extend ViewModel with attachment previews (thumbnails/icons) once upload pipeline stable.
- **Phase 2.6D (Secure File Viewer):** Server-side proxy to resolve `file_id` to downloadable stream (future).

## 5. Lessons Learned

### Technical Debt Accumulated
- **Dual financial state derivation:** `financialState.ts` (TypeScript) vs `invoice_financials_v` (SQL) still exist; aligned but not unified.
- **Compliance direct‑Supabase pattern replaced** for panels, but compliance hub still loads some raw queries (invoices/payments) owned by other modules.
- **`api/` not type‑checked locally** (added `api/tsconfig.json` but main build still skips).
- **Tenant UUID in migration** uses `gen_random_uuid()`; no canonical tenant table exists (acceptable for single‑tenant but noted).
- **Payment history card frozen** — any future extension must go through ViewModel; strict but healthy constraint.

### Agent Workflow Failures
1. **Security regression (VITE_ token exposure):** During Phase 2.6A cleanup, the agent correctly removed an internal HTTP call but inadvertently moved Telegram token to client bundle. Root cause: the instruction “remove internal HTTP call” was implemented without verifying execution boundary of `paymentService`. *Lesson: Always mandate execution‑boundary analysis before eliminating server endpoints.*
2. **Premature implementation prompts:** Multiple prompts attempted to combine several features (e.g., Phase 2.4, initial 2.6A). These were split into smaller, surgical phases after review, which proved far more reliable. *Lesson: Enforce single‑responsibility phases; never bundle schema, API, UI, and business logic in one prompt.*
3. **Incorrect forensic conclusion (env var names):** The agent initially misread a compressed mobile screenshot and concluded Vercel variable names were wrong. Later retracted after seeing desktop screenshot. *Lesson: Always demand highest‑fidelity evidence; screenshots can be misleading.*
4. **Over‑reliance on manual curl tests:** The manual PowerShell test proved Telegram works, but the application still failed. The agent didn't instrument its own code until explicitly asked. *Lesson: Require end‑to‑end pipeline verification from the application code itself before declaring a phase complete.*
5. **Lack of upload failure resilience:** The initial UX left users with no recovery path (no retry, no “Attach Receipt Later”). This is now being addressed, but it should have been designed into the flow earlier. *Lesson: Always design for failure; the happy path is insufficient for financial evidence.*

### Communication & Process Wins
- The multi‑AI peer review (dorime, rector, Sirius 7, Sharon) consistently caught architectural drift before implementation.
- Evidence‑based reports (file:line citations, trace logs) allowed rapid diagnosis.
- Small, verifiable phases enabled incremental progress without large‑scale rework.
- The use of `docs/Tickets/Telegram-payment-attachment-upload/Telegramconvtest.md` for verification payloads provided a permanent, traceable reference.

---

**Current State:** The Telegram upload pipeline is fully implemented, instrumented, and ready for diagnosis. Once the Vercel function logs are captured, the exact failure point will be identified, and a targeted fix can be applied. All architectural foundations—provider‑neutral attachments, payment‑before‑upload sequencing, server‑side secrets, and frozen presentation layer—are solid.

---

## Related Ticket Documentation

- `docs/Tickets/Telegram-payment-attachment-upload/Payment-Attachment-Upload-Failure.md` — diagnostic ticket (PHASE-2.6D-UPLOAD-DEBUG-001)
- `docs/Tickets/Telegram-payment-attachment-upload/Telegramconvtest.md` — verified successful manual upload via PowerShell
- `docs/Tickets/Telegram-payment-attachment-upload/desktop vercel.png` — Vercel dashboard screenshot confirming env var names