# BOURXE Resend Email Delivery Pre-Deployment Remediation Report

**Document Version:** 1.0.0  
**Date:** November 8, 2026  
**Status:** Pre-Deployment Remediation Complete & Verified  
**Authoritative Audit Source:** `docs/reports/BOURXE_Resend_Email_Delivery_Post_Implementation_Audit.md`  
**Runtime:** Bun / Supabase Edge Functions (Deno) / React 19 / TypeScript 5.9  

---

## 1. Executive Summary

This remediation report documents the pre-deployment corrections applied to the BOURXE transactional email delivery subsystem based on the audit findings from November 8, 2026.

All critical security, operational, and consistency defects (FIND-01 through FIND-05) have been resolved. The attachment limit question (FIND-06) was researched using authoritative Resend documentation, confirming that the 10MB raw PDF limit is fully valid and supported. The static-only test suite (FIND-07) was replaced with 17 executable, deterministic behavioral tests covering authentication, authorization, share lifecycle, storage integrity, error handling, reply-to configuration, and template escaping.

---

## 2. Findings Resolved & Current Status

| Finding ID | Severity | Description | Resolution Status |
|---|---|---|---|
| **FIND-01** | **HIGH** | Catch-all SDK error fallback attempted a second POST via REST API, risking duplicate emails on network timeouts. | **RESOLVED.** Dual-send fallback eliminated. Single Resend SDK transport used. Network timeout/interruption returns 504 with `ambiguous: true` and preserves operation ID. No second send is ever attempted. |
| **FIND-02** | **MEDIUM** | No operation-level idempotency; only client-side button disable existed. | **RESOLVED.** Implemented operation-level idempotency (`operationId`). Client generates unique ID per intentional send, reuses it on retries, and passes it to Edge Function. Edge Function validates format and passes `idempotencyKey: operationId` to Resend (backed by Resend's native 24-hour deduplication). |
| **FIND-03** | **MEDIUM** | Two separate email template implementations (React Email in frontend vs. raw HTML in Edge Function). | **RESOLVED.** Single authoritative template builder established in `src/domain/documentShare/documentEmailHtml.ts`. Frontend preview component (`DocumentEmailTemplate.tsx`) and Edge Function both consume this exact builder. |
| **FIND-04** | **MEDIUM** | Share creator bypassed current tenant workspace membership checks. | **RESOLVED.** Creator bypass removed. All senders (including creator) must be active members of the tenant's workspace via `public.is_workspace_member(entity.workspace_id, caller.id)`. Revoked/terminated employees are rejected with 403 Forbidden. |
| **FIND-05** | **LOW** | Email footer invited replies, but dispatch omitted `reply_to`. | **RESOLVED.** Edge Function derives and validates trusted business email from `metadata.issuerEmail` or creator profile. When valid, configures `replyTo` array. When absent, omits `replyTo` and dynamically updates footer copy to direct users to standard business contact channels without false promises. |
| **FIND-06** | **LOW** | 10MB raw attachment limit question and unverified 7MB reduction. | **RESOLVED.** Resend official documentation establishes a **40 MB total message payload limit**. A 10 MB raw PDF expands to $\approx 13.3\text{ MB}$ Base64 string, well within Resend's 40 MB ceiling and Supabase Edge Function memory limits (150 MB). 10 MB limit retained with authoritative proof. |
| **FIND-07** | **INFO** | Test suite relied purely on static source-code regex assertions. | **RESOLVED.** Comprehensive behavioral test suite implemented in `src/tests/critical/documentShareEmailDelivery.test.js` with 17 executable test cases exercising request parsing, auth, authorization, storage, Resend mock dispatch, idempotency, and HTML escaping. |

---

## 3. Architecture After Remediation

```
+-------------------------------------------------------------------------+
|                              Client Layer                               |
|                                                                         |
|  DocumentShareSheet.tsx                                                 |
|    - Generates & manages `operationId` per intentional send             |
|    - Preserves `operationId` across retries                             |
|    - Disables UI button in-flight                                       |
|    - Renders preview using authoritative `buildDocumentEmailHtml()`     |
+------------------------------------+------------------------------------+
                                     |
                                     | (JWT + Share Token + operationId)
                                     v
+-------------------------------------------------------------------------+
|                    Domain Service (documentShareService.ts)             |
|                                                                         |
|  - Validates inputs                                                     |
|  - Invokes `supabase.functions.invoke('send-document-email')`           |
|  - Maps structured responses (success, confirmed rejection, ambiguous)  |
+------------------------------------+------------------------------------+
                                     |
                                     | (Bearer Authorization Header)
                                     v
+-------------------------------------------------------------------------+
|                  Supabase Edge Function (`send-document-email`)         |
|                                                                         |
|  1. Authenticates caller JWT via Supabase Auth                          |
|  2. Validates operationId format (/^[a-zA-Z0-9_-]{16,128}$/)            |
|  3. Validates share record from DB (active, not expired, not revoked)   |
|  4. Enforces current workspace membership via `is_workspace_member()`   |
|     (No creator bypass; revoked employees receive 403)                  |
|  5. Downloads authoritative PDF from private bucket `document-shares`   |
|  6. Validates path strictly matches `${token}.pdf`                      |
|  7. Verifies `%PDF-` magic bytes and size <= 10MB                       |
|  8. Derives & validates trusted business `replyTo`                      |
|  9. Builds email HTML via shared `buildDocumentEmailHtml()`             |
|  10. Dispatches via single Resend SDK transport with                    |
|      `{ idempotencyKey: operationId }`                                  |
|  11. On in-flight exception: returns 504 { ambiguous: true }            |
|      (ABSOLUTELY NO SECOND SEND)                                        |
+------------------------------------+------------------------------------+
                                     |
                                     | (HTTPS / Bearer RESEND_API_KEY)
                                     v
+-------------------------------------------------------------------------+
|                               Resend API                                |
|                                                                         |
|  - 24-hour native idempotency key caching                               |
|  - Rejects duplicate sends with identical key within 24h                |
|  - Attaches authoritative PDF                                           |
|  - Configures verified reply-to address                                 |
+-------------------------------------------------------------------------+
```

---

## 4. Idempotency Design and Guarantees

1. **Operation-Level Scoping:**
   - A unique identifier is assigned per intentional send (`op_${cryptoRandom}`).
   - Retries of the same operation (e.g. after a network timeout or connection reset) reuse the exact same `operationId`.
   - Modifying the recipient email, subject, or message generates a new `operationId`.
   - Intentional new sends always generate a fresh `operationId`.
2. **Provider Deduplication:**
   - The Edge Function passes `idempotencyKey: operationId` to `resend.emails.send()`.
   - Resend guarantees 24-hour idempotency: if the same `operationId` is submitted within 24 hours, Resend returns the cached API response (`{ id: '...' }`) without transmitting duplicate emails.
3. **Database Migration Assessment:**
   - Provider-level 24-hour idempotency via Resend's verified API contract combined with client-side operation lifecycle provides complete operation-level deduplication without modifying the database schema or requiring new tables.

---

## 5. Authorization Behavior

1. **Active Membership Required for All Senders:**
   - In `send-document-email/index.ts`, `isAuthorized` no longer defaults to `true` for `share.created_by === callerUser.id`.
   - The function retrieves `entities.workspace_id` for `share.tenant_id`.
   - Calls `adminClient.rpc("is_workspace_member", { p_workspace_id: entityData.workspace_id, p_user_id: callerUser.id })`.
   - If the caller is not an active workspace member (even if they originally created the share), access is rejected with `403 Forbidden`.
2. **Cross-Tenant Isolation:**
   - Share tokens with missing or unresolvable tenant associations are rejected.
   - Senders from Workspace B cannot email documents belonging to Workspace A.

---

## 6. Template Architecture

1. **Single Source of Truth:**
   - Created `src/domain/documentShare/documentEmailHtml.ts`.
   - Exports `buildDocumentEmailHtml(props: DocumentEmailTemplateProps): string`.
   - Contains built-in HTML escaping (`escapeHtml`), BOURXE executive theme styling, and responsive layout.
2. **Preview Integration:**
   - `src/components/email/DocumentEmailTemplate.tsx` renders `dangerouslySetInnerHTML={{ __html: buildDocumentEmailHtml(props) }}`.
   - Eliminates all visual, stylistic, or structural drift between the frontend preview tab and server delivery.
3. **Edge Function Integration:**
   - `send-document-email/index.ts` imports `buildDocumentEmailHtml` directly.

---

## 7. Reply-To Behavior

1. **Trusted Source Resolution:**
   - Checks `share.metadata.issuerEmail`.
   - Falls back to `profiles.email` for `share.created_by`.
   - Validates RFC email format, length $\le 254$, and rejects CRLF characters (`/[\r\n]/`).
2. **Dynamic Copy Adjustment:**
   - When a valid business email exists:
     - Configures `replyTo: [trustedReplyTo]`.
     - Footer copy: *"If you have any questions regarding this document, please reply directly to this email or contact {issuerName}."*
   - When no valid business email exists:
     - `replyTo` is omitted.
     - Footer copy dynamically changes to: *"If you have any questions regarding this document, please contact {issuerName} through your standard business contact channels."*

---

## 8. Attachment Limit Evidence & Decision

- **Authoritative Provider Limit:** Official Resend API specifications document a **40 MB total payload limit** per email message (including headers, HTML, and base64-encoded attachments).
- **Calculation:**
  - Raw PDF size: Up to $10\text{ MB}$ ($10,485,760\text{ bytes}$).
  - Base64 expansion factor: $4/3 \approx 1.333$.
  - Post-encoding attachment size: $\approx 13.98\text{ MB}$.
  - HTML body and headers: $\approx 20\text{ KB}$.
  - Total HTTP request body: $\approx 14.0\text{ MB}$.
- **Container Limit:** Supabase Edge Functions provide a $150\text{ MB}$ memory container, easily accommodating the working memory during download and Base64 conversion ($\approx 35\text{--}45\text{ MB}$).
- **Decision:** Retained `MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024` (10 MB). The audit's hypothetical 7 MB replacement was unnecessary.

---

## 9. Tests Executed & Results

All 35 critical tests executed via Bun passed cleanly:

1. **`src/tests/critical/documentShareEmailDelivery.test.js` (17/17 PASS):**
   - Missing Authorization header rejected with 401
   - Invalid or expired JWT rejected with 401
   - Creator who is no longer a workspace member rejected with 403 (FIND-04)
   - Unauthorized non-member user rejected with 403
   - Active workspace member passes authorization (200 OK)
   - Revoked share rejected with 410 Gone
   - Expired share rejected with 410 Gone
   - Path traversal or mismatched storage path rejected with 422
   - Non-PDF binary failing `%PDF-` signature rejected with 422
   - Attachment exceeding 10MB limit rejected with 413 (FIND-06)
   - Dispatches via Resend SDK with `idempotencyKey` and NO dual-send fallback (FIND-01 & FIND-02)
   - Network timeout during dispatch returns 504 ambiguous and never triggers second send (FIND-01)
   - Provider rejection returns 422 with `ambiguous=false`
   - Configures valid `replyTo` and invites replies when business email exists (FIND-05)
   - Omits `replyTo` and avoids false promise when business email is absent (FIND-05)
   - HTML escaping protects against malicious content (FIND-03)
   - Preview component renders identical HTML string output (FIND-03)
2. **`src/tests/critical/documentShareSecurity.test.js` (11/11 PASS):**
   - Cryptographic token entropy, uniform error handling, RLS audit, and storage privacy.
3. **`src/tests/critical/unifiedDocumentSharing.test.js` (7/7 PASS):**
   - Multi-channel document sharing across all supported document modules.

---

## 10. Exact Modified & Created Files

### Created Files
- `src/domain/documentShare/documentEmailHtml.ts`: Authoritative runtime-neutral email template builder.
- `docs/reports/BOURXE_Resend_Email_Delivery_Pre_Deployment_Remediation_Report.md`: This remediation report.

### Modified Files
- `supabase/functions/send-document-email/index.ts`: Enforced workspace membership for creator, eliminated dual-send fallback, added `operationId` idempotency, integrated trusted `replyTo`, cross-runtime loaders.
- `src/domain/documentShare/types.ts`: Added `issuerEmail`, `operationId`, and `ambiguous` to sharing types.
- `src/domain/documentShare/documentShareService.ts`: Added `issuerEmail` mapping, forwarded `operationId`, handled `ambiguous` responses.
- `src/components/document-view/shared/DocumentShareSheet.tsx`: Added `operationId` state lifecycle, retry action for ambiguous outcome, reset on compose changes.
- `src/components/email/DocumentEmailTemplate.tsx`: Refactored to consume authoritative `buildDocumentEmailHtml()`.
- `src/tests/critical/documentShareEmailDelivery.test.js`: Expanded from 8 regex tests to 17 comprehensive behavioral execution tests.

---

## 11. Remaining Migration or External Configuration Requirements

1. **Database Migrations:** None required. All remediation logic leverages existing database columns (`document_shares.metadata`, `entities.workspace_id`, `profiles.email`) and RPCs (`public.is_workspace_member`).
2. **External Configuration (Pending Authorization):**
   - Provision `RESEND_API_KEY` in Supabase Secrets.
   - Provision `DOCUMENT_EMAIL_FROM` in Supabase Secrets.
   - Deploy `send-document-email` Edge Function.
   - Configure DNS records (SPF, DKIM, DMARC) in domain registrar.

---

## 12. Explicit Deployment Status

- **Status:** **PRE-DEPLOYMENT VERIFIED (CODE READY).**
- **Remote Deployment:** **NOT PERFORMED.**
- **Real Email Dispatch:** **NONE PERFORMED.**
