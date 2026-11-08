# BOURXE Resend Email Delivery Implementation Report

**Document Version:** 1.0.0  
**Date:** November 8, 2026  
**Status:** Complete & Verified  
**Runtime:** Bun / Supabase Edge Functions (Deno) / React 19 / TypeScript 5.9  

---

## Executive Summary

Direct transactional email delivery for the BOURXE document-sharing subsystem has been implemented using **Resend** orchestrated via an authenticated **Supabase Edge Function** (`send-document-email`).

The implementation adheres strictly to BOURXE architectural guardrails:
- **Zero Client-Side Secret Leakage:** The `RESEND_API_KEY` is strictly confined to the server-side Edge Function environment.
- **Strict Tenant Boundary Verification:** Senders must be authenticated and authorized workspace members.
- **Storage Integrity:** PDFs are fetched strictly server-side from private Supabase Storage (`document-shares`) with `%PDF-` header validation and size limits (10MB).
- **Dual Send Engine:** Resend Node/Deno SDK with an automatic REST fetch fallback for multi-runtime compatibility.
- **Non-Disruptive Channel Preservation:** Direct link generation, WhatsApp sharing, and client-side fallback (native share sheet / desktop `mailto:`) remain fully functional.

---

## 1. Architecture Implemented

```
+-------------------------------------------------------------+
|                      Client Browser                         |
|                                                             |
|  DocumentShareSheet.tsx                                     |
|    - Inputs: recipient, subject, custom message             |
|    - Invokes: shareViaEmail(...)                            |
+------------------------------+------------------------------+
                               |
                               | (JWT + Share Token + Metadata)
                               v
+-------------------------------------------------------------+
|               documentShareService.ts (Domain)              |
|                                                             |
|  Calls supabase.functions.invoke('send-document-email')     |
|  Returns: { success, method: 'resend-edge', messageId }     |
+------------------------------+------------------------------+
                               |
                               | (Bearer Authorization Header)
                               v
+-------------------------------------------------------------+
|      Supabase Edge Function: `send-document-email`          |
|                                                             |
|  1. Authenticate Caller JWT (supabaseClient.auth.getUser)   |
|  2. Retrieve Share Record from DB (`document_shares`)       |
|  3. Validate Share: not revoked, not expired                |
|  4. Authorize Sender: creator OR workspace member           |
|  5. Download PDF from Private Bucket (`document-shares`)    |
|  6. Verify PDF Magic Bytes (%PDF-) & Size (<= 10MB)         |
|  7. Assemble Executive Branded HTML Template               |
|  8. Base64 Encode Authoritative PDF Attachment              |
|  9. Dispatch to Resend API                                  |
+------------------------------+------------------------------+
                               |
                               | (HTTPS / Bearer RESEND_API_KEY)
                               v
+-------------------------------------------------------------+
|                         Resend API                          |
|                                                             |
|  Dispatches branded transactional email with PDF attachment |
|  to Recipient                                               |
+-------------------------------------------------------------+
```

---

## 2. Resend SDK / Import Strategy & Runtime Compatibility

- **Package Dependency:** `resend@^6.37.0` installed via `bun add resend` in `package.json` and resolved in `bun.lock`.
- **Edge Function Runtime:** Supabase Edge Functions execute in Deno. The function imports `Resend` via `npm:resend@6.37.0`.
- **Dual Dispatch Fallback:** To ensure zero disruption across local Deno, Dockerized Supabase CLI, or cloud edge runners, `send-document-email/index.ts` implements both:
  1. The primary `Resend` SDK client (`resend.emails.send(...)`).
  2. An automatic direct REST fallback calling `https://api.resend.com/emails` via native `fetch` if the SDK module fails to initialize.

---

## 3. Edge Function Contract

- **Endpoint:** `POST /functions/v1/send-document-email`
- **Authentication:** `Authorization: Bearer <user_jwt>` (Required)
- **CORS Support:** `OPTIONS` preflight handled with appropriate CORS headers (`Access-Control-Allow-Origin: *`, `authorization, x-client-info, apikey, content-type`).

### Request Payload (JSON)
```json
{
  "token": "dsh_32hexcharacters...",
  "recipientEmail": "client@example.com",
  "subject": "Invoice INV-001 from Acme Corp",
  "message": "Please review the attached invoice for your records."
}
```

### Response Payload (JSON)
- **Success (200 OK):**
  ```json
  {
    "success": true,
    "messageId": "re_1234567890abcdef",
    "recipient": "client@example.com"
  }
  ```
- **Error (400 / 401 / 403 / 404 / 500):**
  ```json
  {
    "success": false,
    "error": "Reason for failure"
  }
  ```

---

## 4. Authentication & Authorization Controls

1. **Authentication:**
   - The function extracts the caller's JWT from `req.headers.get("Authorization")`.
   - Validates identity with `authClient.auth.getUser()`. Anonymous callers receive `401 Unauthorized`.
2. **Share Verification:**
   - Queries `document_shares` matching `token`.
   - Verifies share status is active: `is_revoked === false` and `expires_at > now()`. Expired or revoked shares return `400 Bad Request`.
3. **Tenant & Sender Authorization:**
   - Caller is authorized if:
     - `caller.id === share.created_by`, OR
     - If the document is tied to a workspace, the caller is verified via `public.is_workspace_member(share.workspace_id, caller.id)`.
   - Unauthorized senders receive `403 Forbidden`.

---

## 5. PDF Retrieval & Attachment Implementation

- **Storage Bucket:** Private bucket `document-shares`.
- **Key Path Enforcement:** Verified to match strictly `${share.token}.pdf` to prevent directory traversal or access to arbitrary storage paths.
- **Service Role Access:** The Edge Function downloads the PDF using the administrative Supabase client (`service_role` key).
- **Buffer Integrity:**
  - Size check enforces a maximum of 10MB (10,485,760 bytes).
  - Magic byte verification confirms the buffer begins with `%PDF-` (`0x25, 0x50, 0x44, 0x46, 0x2D`).
- **Base64 Encoding:** Converted to a standard base64 attachment buffer with mime type `application/pdf` and filename `${share.metadata?.documentNumber || 'document'}.pdf`.

---

## 6. Email HTML Rendering Strategy

- The Edge Function renders a self-contained, email-client-compatible HTML document tailored to the BOURXE executive theme (`#0F172A`, `#10B981`, `#64748B`).
- Includes:
  - Clean brand header and document title.
  - Formatted metadata card (Document number, currency amount, due date, sender business).
  - Custom user message bubble.
  - Prominent "View & Download Online" CTA pointing to the canonical secure share URL.
  - Security footer with expiration notice and non-repudiation details.

---

## 7. Client Composer Integration

- **Component:** `src/components/document-view/shared/DocumentShareSheet.tsx`.
- **Button State:** Displays `"Send Email"` (or `"Sending..."` with a spinner when loading), disabled while an operation is in-flight to prevent duplicate sends.
- **Form Validation:** Validates that `recipientEmail` is present and formatted before dispatching.
- **Workflow:**
  1. Ensures authoritative PDF blob exists.
  2. Ensures active share token exists (auto-creates if needed).
  3. Dispatches via `shareViaEmail`.
  4. On success: Toast `"Email submitted: Document sent to <email> with PDF attached"` and closes sheet.
  5. On direct delivery failure: Keeps modal open, renders actionable notice with `"Open in Email App (Fallback)"` button allowing one-click transition to native share sheet or prefilled `mailto:`.

---

## 8. Error Handling & Fallback Behavior

1. **Network or Configuration Failures:**
   - If `RESEND_API_KEY` is missing in Supabase Edge Functions, the Edge Function returns `500 Server Misconfiguration`.
   - The client captures this and displays a clear inline error.
2. **Client Fallback:**
   - `shareViaEmailClientFallback` is exposed by `documentShareService.ts`.
   - Mobile devices trigger Capacitor Share Sheet with the PDF file attached.
   - Desktop browsers open prefilled `mailto:` link with document link and instructions to attach the downloaded PDF.

---

## 9. Files Created or Modified

| File | Status | Description |
|---|---|---|
| `package.json` | Modified | Added `"resend": "^6.37.0"` dependency |
| `bun.lock` | Modified | Lockfile updated with Resend dependencies |
| `supabase/functions/send-document-email/index.ts` | Created | Supabase Edge Function for authenticated Resend transmission |
| `src/domain/documentShare/types.ts` | Modified | Added `'resend-edge'` to `ShareActionResult['method']`, added `messageId` and `shareToken` |
| `src/domain/documentShare/documentShareService.ts` | Modified | Implemented Edge Function invocation in `shareViaEmail` & exported `shareViaEmailClientFallback` |
| `src/components/document-view/shared/DocumentShareSheet.tsx` | Modified | Updated email flow, added inline delivery fallback notice, updated CTA labels |
| `src/tests/critical/documentShareEmailDelivery.test.js` | Created | 8 automated tests for delivery, authentication, validation, and fallback |

---

## 10. Dependencies Changed

- **Added:** `resend@^6.37.0` (production dependency).
- **Package Manager:** Installed strictly with `bun add resend`. No npm, yarn, or pnpm used.

---

## 11. Test & Typecheck Results

### Automated Critical Tests
- `bun test src/tests/critical/documentShareEmailDelivery.test.js`:
  - 8 of 8 tests passing:
    1. Edge Function enforces POST and handles OPTIONS CORS
    2. Edge Function rejects requests without caller JWT
    3. Edge Function rejects expired or revoked share tokens
    4. Edge Function enforces tenant workspace authorization
    5. Edge Function verifies PDF magic bytes and storage download
    6. Edge Function constructs correct Resend API payload with PDF attachment
    7. documentShareService invokes Edge Function and maps response
    8. DocumentShareSheet provides fallback path when direct delivery fails
- `bun test src/tests/critical/unifiedDocumentSharing.test.js`: All 4 tests passing.
- `bun test src/tests/critical/documentShareSecurity.test.js`: All 11 tests passing.

### TypeScript Compilation
- Verified via `tsc --noEmit`.
- **0 errors** in all newly created or edited files (`send-document-email/index.ts`, `types.ts`, `documentShareService.ts`, `DocumentShareSheet.tsx`).
- Pre-existing compilation errors outside of document sharing (`src/components/pdf/index.ts` and `src/domain/invoice/projections/contentProjection.ts`) were untouched.

---

## 12. Required Supabase Secrets & DNS Configuration

### Supabase Edge Function Secrets
Set the following secrets in your Supabase project (via dashboard or CLI):
```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY="re_your_api_key_here"

# Set verified sender address (must match verified domain in Resend)
supabase secrets set DOCUMENT_EMAIL_FROM="BOURXE <documents@yourdomain.com>"
```

### Resend Domain Verification (DNS Records)
Add the following DNS records to your domain's DNS provider:
1. **SPF (TXT):**
   - Host: `bounces.yourdomain.com` (or `@`)
   - Value: `v=spf1 include:amazonses.com ~all`
2. **DKIM (CNAME / TXT):**
   - Resend provides 3 DKIM tokens (e.g. `resend._domainkey.yourdomain.com`).
3. **DMARC (TXT):**
   - Host: `_dmarc.yourdomain.com`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com`

---

## 13. Deployment Instructions

### Deploying the Edge Function
Once Supabase CLI is authenticated against your remote project:
```bash
# 1. Set required secrets
supabase secrets set RESEND_API_KEY="re_..." DOCUMENT_EMAIL_FROM="BOURXE <documents@bourxe.com>"

# 2. Deploy function
supabase functions deploy send-document-email --no-verify-jwt
```
*(Note: `--no-verify-jwt` is optional if you want the Edge Function gateway to verify JWTs; our function code explicitly performs internal cryptographic JWT verification via `authClient.auth.getUser()`).*

---

## 14. Unresolved Limitations

1. **EmailCN Status:**
   - EmailCN registry remains offline/unavailable upstream. React Email and executive HTML templates remain the active rendering standard.
2. **Resend API Key Provisioning:**
   - Requires manual entry of the production `RESEND_API_KEY` into Supabase Secrets by the project lead. The code safely falls back to client-assisted email sending if the key is absent.
