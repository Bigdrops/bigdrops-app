# Telegram as Payment Attachment Storage — Feasibility Audit

**This report was written by OpenCode on 2026-07-05 via Local Runner.**

**Type:** Read-only feasibility audit  
**Scope:** Architectural viability of using Telegram Bot API as file storage backend for payment evidence attachments  
**Status:** Audit complete — no code changes, no dependencies added  
**Verification:** `git status` confirms clean workspace; `bun run build` skipped per AGENTS.md hardware policy

---

## 1. Executive Summary

**Verdict: Do not proceed. Use Supabase Storage instead.**

The Telegram-as-storage approach (inspired by the Telephoto project) is architecturally unsound for a financial platform. Telephoto is a consumer photo backup app — it has no access control, no SLA, no encryption-at-rest guarantees, no audit trail, and no retention policy. BIGDROPS already has a proven, purpose-built Supabase Storage infrastructure (used for `signatures` and `compliance` buckets) that solves the same problem with proper access control, RLS integration, and no external dependency risk. Adopting Telegram storage would introduce an ungoverned external state dependency, violate the single-source-of-truth principle, create bot token exposure risks, and fail Nigerian data protection (NDPR) compliance requirements for financial data.

---

## 2. Telephoto Approach Summary

Telephoto (https://github.com/ASRumon/Telephoto) is a Flutter Android app that backs up personal photos to a Telegram chat via a bot the user controls.

**Upload mechanism:**
- User creates a Telegram bot via BotFather, obtains an HTTP API token (e.g. `123456:ABC-DEF...`)
- User obtains their Telegram user ID or a group chat ID
- App uploads files using the Telegram Bot API `sendPhoto` / `sendDocument` endpoints
- Files land in the user's private Telegram chat or a designated group

**Retrieval mechanism:**
- Files are accessed via Telegram's CDN (content URLs returned in API responses)
- The app maintains its own local database to map file metadata to Telegram message IDs
- No server-side component; all logic runs on-device in the Flutter app

**Key limitations visible from the README and architecture:**
- **No access control granularity:** Anyone with the bot token has full access to every file the bot has ever sent
- **No encryption at rest:** Telegram encrypts in transit (MTProto), but file-at-rest encryption is Telegram's internal infrastructure — not auditable or certifiable
- **No retention guarantee:** Telegram reserves the right to delete files; the Bot API `file` URLs expire after ~1 hour without re-fetching
- **No SLA:** Telegram's Bot API is best-effort; no uptime commitment
- **Rate limits:** Bot API has `getUpdates` poll limits (~30 requests/sec) and file download rate limits
- **No bulk operations:** No batch upload/download API
- **File size:** Bot API supports up to 50MB for photos, 2GB for documents (but the download URL expires)
- **Version:** 19 commits, 243 stars, Flutter-only — not production infrastructure

Telephoto is an elegant personal backup tool. It is not production infrastructure for a B2B financial platform.

---

## 3. Security Assessment

### 3.1 Bot Token Exposure

The Telegram Bot API requires an HTTP API token for every request. In BIGDROPS's architecture:

- **Client-side (Capacitor/mobile):** The token would live in the mobile app binary. Bot tokens are trivially extractable from decompiled APKs. Anyone with the token can read every file the bot has ever received and send messages as the bot. **This is a critical security flaw for a financial platform.**
- **Serverless function (Vercel Edge/Supabase Edge Functions):** The token would live in environment variables, which is better. But the function must proxy every upload and download through itself, adding latency and cost — negating the "free storage" premise.

### 3.2 File Access Control

Telegram Bot API provides zero file-level access control:
- There is no concept of "this user can see file X but not file Y"
- There are no signed URLs, no expiry tokens, no per-file permissions
- Anyone who knows the Telegram `file_id` (or the download URL) can retrieve any file
- BIGDROPS currently uses Supabase RLS for payment row access control — Telegram storage has no equivalent mechanism

### 3.3 Encryption

- **In transit:** Telegram uses MTProto encryption. Files transit through Telegram's servers encrypted.
- **At rest:** Telegram's server-side encryption is opaque and not independently auditable. This does not meet financial platform standards where data sovereignty is expected.
- **NDPR compliance:** Nigeria's Data Protection Regulation (NDPR) requires data controllers to implement appropriate technical and organizational measures. Storing financial evidence (bank alerts, receipts) on a third-party messaging platform with no contractual data processing agreement is a compliance risk.

### 3.4 Audit Trail Alignment

BIGDROPS has a rigorous audit trail system (`activity_events`, `audit_logs`) that tracks payment records with actor attribution and timestamp. Telegram storage introduces a parallel state system with no audit trail:
- No record of when a file was uploaded to Telegram
- No record of who accessed or downloaded a file
- No ability to prove file integrity (Telegram could modify/resample images)
- No way to enforce immutability (files could be deleted from the Telegram chat)

This directly violates the audit trail standard at `docs/standard/audit-trail-standard.md` §4.

---

## 4. Reliability & Performance

| Factor | Telegram Bot API | Supabase Storage |
|---|---|---|
| **SLA** | None (best-effort) | 99.9% uptime (Pro plan) |
| **Rate limits** | ~30 req/sec getUpdates; file download throttled | Generous per-bucket limits |
| **File retention** | Not guaranteed; Telegram may purge | Guaranteed until deleted |
| **Download URL expiry** | ~1 hour (must re-fetch `file_path`) | Persistent public/signed URLs |
| **File size** | 50MB photos, 2GB docs | Configurable per bucket |
| **Bulk operations** | None | Batch upload/delete supported |
| **Geo-redundancy** | Telegram's infrastructure (unknown regions) | Supabase regional hosting |
| **Offline/retry** | No built-in retry semantics | Client SDK with retry logic |
| **Versioning** | None | Configurable |

### Critical reliability issues:

1. **Download URL expiry:** Telegram Bot API returns a temporary `file_path` that expires. To display a payment attachment later, the app must re-call `getFile` to get a fresh URL — every single time, for every file. This adds a mandatory API call per file view, creates a dependency on Telegram's API availability at read time, and means files become inaccessible if Telegram's API is down even momentarily.

2. **No transactional guarantees:** There is no way to confirm a file was durably stored. The bot API returns a message ID, but that doesn't guarantee the file won't be garbage-collected later.

3. **Bot token rotation:** If a bot token is compromised or rotated, all previously uploaded files become inaccessible unless a new bot is added to the same chat — which requires manual intervention.

---

## 5. Integration Complexity

Implementing Telegram storage in BIGDROPS would require:

### New components needed:
1. **Serverless proxy function** (Supabase Edge Function or Vercel serverless) — to hold the bot token server-side and proxy upload/download requests. Client-side token usage is a non-starter for security.
2. **Telegram upload service** — new TypeScript module to handle file upload via Bot API, parse responses, return file references.
3. **Telegram download/proxy service** — to serve files to the client with proper auth, since Telegram URLs expire.
4. **Database migration** — add `attachments` JSONB column to `payments` table (or a new `payment_attachments` table) to store Telegram `file_id` and `message_id` references.
5. **UI changes** — file picker component in the payment recording flow, attachment viewer/renderer component, attachment management (view/delete).
6. **Capacitor plugin** — for file picking on mobile (camera/gallery access for bank alert screenshots).

### Estimated effort:
- Serverless proxy: 2-3 days
- Upload/download service: 2 days
- Database migration + types: 1 day
- UI components: 2-3 days
- Testing + edge cases: 2 days
- **Total: ~10-11 days**

Compare to Supabase Storage: the infrastructure already exists (`supabase.storage.from('compliance')` pattern). Adding a `payments-attachments` bucket and wiring a file picker to the existing upload pattern would take ~2-3 days.

---

## 6. Architectural Fit

### 6.1 AGENTS.md Rule Violations

| Rule | Violation |
|---|---|
| **Single source of truth** | Telegram becomes a parallel file store with no link back to the database. If the `payments` row is deleted but the Telegram file persists (or vice versa), there is orphaned state with no reconciliation path. |
| **Domain segregation** | AGENTS.md §2 states "PDFs are dumb renderers that receive shaped data via preview functions; they never compute prices, taxes, or totals." Similarly, storage should be a dumb backend — Telegram introduces a messaging platform into the data pipeline. |
| **Audit trail** | No mechanism to log file access or prove file integrity. The audit trail standard requires actor attribution on all payment-related events — Telegram storage provides none. |
| **Immutability** | Payment evidence should be immutable once uploaded. Telegram files can be deleted from the chat at any time. |
| **External state dependency** | BIGDROPS's data model is entirely within Supabase. Telegram introduces a second, ungoverned external state store. |

### 6.2 Comparison with Existing Patterns

BIGDROPS already uses two proven storage patterns:

1. **Supabase Storage** (`signatures` bucket, `compliance` bucket):
   - RLS-integrated access control
   - Persistent URLs via `getPublicUrl()`
   - Server-side upload with auth context
   - Pattern: `supabase.storage.from('bucket').upload(path, file, { upsert: true })`
   - Already working in production for waybill signatures and WHT receipts

2. **Cloudinary** (item images):
   - Third-party CDN for public-facing product images
   - Upload preset pattern with client-side uploads
   - Appropriate for public-read assets, not financial evidence

Payment attachments are private financial evidence — they belong in Supabase Storage, not a messaging platform.

---

## 7. Comparison with Supabase Storage

| Dimension | Telegram Bot API | Supabase Storage |
|---|---|---|
| **Access control** | None (token = god mode) | RLS policies, per-bucket rules |
| **Signed URLs** | No (temporary, expires ~1hr) | Yes (configurable expiry) |
| **Audit trail** | None | Integrates with Supabase logs |
| **Encryption at rest** | Opaque (Telegram infra) | Supabase-managed (configurable) |
| **Retention guarantee** | None | Guaranteed until explicit delete |
| **SLA** | None | 99.9% (Pro) |
| **Cost** | Free (but hidden: proxy function cost, latency cost) | Free tier: 1GB + 2GB bandwidth; Pro: generous |
| **Integration effort** | High (new proxy, new service, new patterns) | Low (existing pattern, proven in codebase) |
| **NDPR compliance** | Risky (no DPA, no data sovereignty) | Compliant (Supabase has DPA, regional hosting) |
| **File integrity** | No verification possible | ETags, checksums |
| **Orphan risk** | High (two independent state stores) | Low (single state store, FK constraints) |
| **Mobile support** | Capacitor file picker → proxy → Telegram | Capacitor file picker → Supabase client SDK |
| **Download reliability** | URL expiry, API dependency at read time | Persistent URLs, CDN-backed |

**Supabase Storage wins on every dimension that matters for a financial platform.**

---

## 8. Recommendation

**Use Supabase Storage instead of Telegram.**

### Rationale:

1. **Proven pattern:** BIGDROPS already has two working Supabase Storage buckets (`signatures`, `compliance`) with the exact upload/download pattern needed. Adding a `payments-attachments` bucket is a 2-3 day task, not a 10-day integration.

2. **Security:** Supabase Storage integrates with the existing auth and RLS system. Telegram storage would require a proxy function just to hide the bot token, and still provides no per-file access control.

3. **Compliance:** NDPR requires data controllers to maintain control over personal/financial data. Storing payment evidence on Telegram — a messaging platform with no contractual data processing agreement — is a compliance risk for a Nigerian B2B platform.

4. **Reliability:** Supabase Storage provides persistent URLs, 99.9% SLA, and guaranteed retention. Telegram provides none of these.

5. **Architectural integrity:** Supabase Storage keeps all state within the same database system, enabling FK constraints, RLS, audit trail integration, and atomic operations. Telegram introduces a second, ungoverned state store.

6. **Cost:** The "free storage" argument for Telegram is illusory. A serverless proxy function adds Vercel/Supabase edge function compute costs, and the integration complexity adds development and maintenance cost. Supabase Storage's free tier (1GB + 2GB bandwidth) is more than sufficient for payment attachments, and the Pro plan is inexpensive.

---

## 9. Recommended Implementation (Supabase Storage)

If the team proceeds with payment attachments, here is the minimal approach:

### 9.1 Storage Bucket
- Create a `payment-attachments` bucket in Supabase Storage
- Configure appropriate access policies (authenticated read, authenticated write with owner check)

### 9.2 Database Migration
- Add `attachments jsonb DEFAULT '[]'::jsonb` column to the `payments` table
- Each entry: `{ file_id: string, file_url: string, file_name: string, mime_type: string, uploaded_at: string, size_bytes: number }`

### 9.3 Service Layer
- Add `uploadPaymentAttachment(paymentId: string, file: File)` to `paymentService.ts`
- Pattern: upload to `payment-attachments/{payment_id}/{filename}`, store URL in `payments.attachments`
- Add `removePaymentAttachment(paymentId: string, fileId: string)` for cleanup

### 9.4 UI
- File picker in the payment recording flow (bank alert screenshot, receipt photo)
- Attachment viewer/renderer in the payment history view
- Follow the existing `WhtReceiptMatcherAction.tsx` pattern for file selection UI

### 9.5 Guardrails
- Max file size: 10MB per attachment (configurable)
- Allowed types: `image/jpeg`, `image/png`, `application/pdf`
- Max attachments per payment: 5 (configurable)
- All uploads logged to `activity_events` for audit trail compliance

---

## 10. Evidence Appendix

### BIGDROPS Source Files Referenced

| File | Relevance |
|---|---|
| `src/modules/invoices/services/paymentService.ts` | Payment recording flow — no attachment support currently |
| `src/modules/invoices/repositories/paymentRepository.ts` | Payment DB operations — `insertPayment` has no attachment payload |
| `src/modules/invoices/types/paymentTypes.ts` | Payment types — `InvoicePayment` and `PaymentInput` have no attachment field |
| `src/modules/compliance/services/complianceService.ts:74-82` | Proven Supabase Storage upload pattern (`compliance` bucket) |
| `src/components/waybill/WaybillSignatures.tsx:330-335` | Proven Supabase Storage upload pattern (`signatures` bucket) |
| `src/components/compliance/WhtReceiptMatcherAction.tsx` | Existing file picker UI pattern for financial documents |
| `src/components/ItemImageUpload.tsx` | Cloudinary upload pattern (for public images, not financial evidence) |
| `supabase/migrations/20260520090003_invoices.sql:75-95` | Current `payments` table schema — no attachment column |
| `docs/standard/audit-trail-standard.md` | Audit trail requirements — Telegram storage violates §4 |
| `AGENTS.md` §2 | Architecture rules — single source of truth, domain segregation |

### External References

| Source | Reference |
|---|---|
| Telephoto GitHub | https://github.com/ASRumon/Telephoto |
| Telegram Bot API | https://core.telegram.org/bots/api (file download URLs expire, rate limits apply) |
| NDPR | Nigeria Data Protection Regulation — requires DPA, data sovereignty, appropriate technical measures |
| Supabase Storage docs | https://supabase.com/docs/guides/storage (RLS, signed URLs, buckets) |
