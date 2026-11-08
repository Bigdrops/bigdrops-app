# BOURXE Resend Email Delivery Post-Implementation Audit

**Document Version:** 1.0.0  
**Date:** November 8, 2026  
**Audit Type:** Strict Read-Only Post-Implementation Verification  
**Repository Working Directory:** `c:\Users\DELL\Desktop\bigdrops-app`  
**Report Destination:** `docs/reports/BOURXE_Resend_Email_Delivery_Post_Implementation_Audit.md`  
*(Note: Directory path uses `docs/reports/` to conform with the canonical lowercase casing established in Git history).*

---

## 1. Executive Summary

This post-implementation audit independently evaluates the transactional email delivery subsystem implemented for BOURXE on November 8, 2026. The subsystem integrates **Resend** via an authenticated **Supabase Edge Function** (`supabase/functions/send-document-email/index.ts`), orchestrating private PDF retrieval from Supabase Storage and client-assisted fallback in `src/components/document-view/shared/DocumentShareSheet.tsx`.

The audit evaluated security, authorization boundaries, duplicate-delivery protections, runtime fallback safety, template consistency, test efficacy, and deployment readiness across all relevant codebase files.

### Overall Audit Verdict: **CONDITIONAL PASS — NOT PRODUCTION-DEPLOYED**

- **Security & Authorization Core:** **STRONG**. Caller JWT is verified via Supabase Auth, client cannot spoof storage paths or document ownership, tokens are strictly validated, private storage access is mediated server-side, and CRLF header injection and HTML escaping are actively enforced.
- **Deployment Status:** **LOCAL STATIC PHASE ONLY**. Remote deployment, Supabase Edge secrets, and Resend DNS records have NOT been provisioned.
- **Architectural & Stability Concerns Identified:**
  1. *High Severity:* The SDK-to-REST fallback catches all SDK execution errors and issues a second HTTP request to Resend without checking if the first request timed out after acceptance (duplicate-delivery risk).
  2. *Medium Severity:* No server-side or provider-level idempotency key is implemented.
  3. *Medium Severity:* Two independent, competing email templates now exist (React Email in frontend preview vs. raw HTML builder in Edge Function).
  4. *Medium Severity:* Creator authorization (`created_by === callerUser.id`) bypasses checking current workspace membership for the tenant.

---

## 2. Git State Integrity

### Git Status Recorded Before Audit
```text
On branch main
Your branch is ahead of 'origin/main' by 17 commits.

Changes not staged for commit:
	modified:   bun.lock
	modified:   docs/prd/pdf-rendering-migration/Waterfall-roadmap.md
	modified:   package.json
	modified:   src/components/app/AppShell.tsx
	modified:   src/components/document-view/shared/CommercialTemplatePicker.tsx
	modified:   src/components/document-view/shared/DocumentShareSheet.tsx
	modified:   src/components/document/DocumentDesignControls.tsx
	modified:   src/components/onboarding-v5/onboarding-v5-scenes.css
	modified:   src/components/onboarding-v5/onboarding-v5-scenes.tsx
	modified:   src/components/pdf/forme/LandscapeFormeDocument.tsx
	modified:   src/components/pdf/index.ts
	deleted:    src/components/pdf/presentation/industry/IndustryColumnOverrides.ts
	deleted:    src/components/pdf/presentation/industry/IndustryTemplate.tsx
	deleted:    src/components/pdf/renderers/PdfRenderer.tsx
	deleted:    src/components/pdf/templates/Crest.tsx
	deleted:    src/components/pdf/templates/CrestStyles.ts
	deleted:    src/components/pdf/templates/Industry.tsx
	deleted:    src/components/pdf/templates/Minimal.tsx
	deleted:    src/components/pdf/templates/MinimalStyles.ts
	modified:   src/domain/documentShare/documentShareService.ts
	modified:   src/domain/documentShare/types.ts
	modified:   src/domain/invoice/projections/contentProjection.ts
	modified:   src/domain/invoice/types.ts
	modified:   src/lib/designLabPreviews.ts
	modified:   src/tests/invoice/pdfRegressionCleanup.test.js
	modified:   src/tests/pdf/dualIndustryRendererRouting.test.ts
	modified:   src/tests/pdf/formeIndustryTemplate.test.ts
	deleted:    src/tests/pdf/industryLayout.test.js
	modified:   src/tests/pdf/pageLayoutPipeline.test.js
	modified:   src/tests/pdf/richTextPipeline.test.js
	modified:   src/tests/pdf/templateIds.test.js

Untracked files:
	docs/integrations/polyfork-integration-guide.md
	docs/reports/BOURXE_Resend_Email_Delivery_Implementation_Report.md
	docs/reports/BOURXE_Resend_Email_Delivery_Integration_Audit.md
	src/components/cold-launch/ColdLaunchExperimentPreview.tsx
	src/pages/ColdLaunchThemeExperiment.tsx
	src/tests/critical/documentShareEmailDelivery.test.js
	src/tests/pdf/landscapeFormeRefinement.test.ts
	supabase/functions/send-document-email/
```

### Git Confirmation
- **No application source files modified during this audit.**
- **No dependencies or lockfiles changed.**
- **No configuration or migration files changed.**
- **Only this post-implementation audit report (`docs/reports/BOURXE_Resend_Email_Delivery_Post_Implementation_Audit.md`) has been created.**

---

## 3. Scope and Evidence Examined

The audit performed line-by-line inspection of:
1. `supabase/functions/send-document-email/index.ts` (Edge Function handler, authentication, validation, attachment encoding, Resend dispatch)
2. `src/domain/documentShare/documentShareService.ts` (Client domain invocation and fallback logic)
3. `src/domain/documentShare/types.ts` (Domain action contracts)
4. `src/components/document-view/shared/DocumentShareSheet.tsx` (UI composer, loading states, fallback alert)
5. `src/components/email/DocumentEmailTemplate.tsx` (React Email template)
6. `supabase/functions/public-document-pdf/index.ts` (Reference Edge Function architecture)
7. `supabase/migrations/20261107140000_document_sharing_platform.sql` & `20261107150000_document_sharing_security_hardening.sql` (Database schema, RLS, storage privacy, `is_workspace_member` RPC)
8. `package.json` & `bun.lock` (Resend SDK versioning)
9. `src/tests/critical/documentShareEmailDelivery.test.js`, `src/tests/critical/documentShareSecurity.test.js`, `src/tests/critical/unifiedDocumentSharing.test.js` (Automated verification suites)

---

## 4. Authentication and Authorization Findings

### Observed Implementation
- **JWT Extraction & Validation ([`supabase/functions/send-document-email/index.ts#L221-L256`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L221-L256)):**
  - Requires `Bearer` Authorization header.
  - Extracts caller JWT and authenticates with `adminClient.auth.getUser(jwt)`.
  - Rejects missing, invalid, or expired sessions with `401 Unauthorized`.
  - Does **not** trust client-supplied user IDs; identity is anchored to Supabase Auth.
- **Token as Locator, Not Authorization ([`index.ts#L269-L320`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L269-L320)):**
  - Token is validated against `/^[a-zA-Z0-9_-]{16,64}$/`.
  - Queries `document_shares` table via service client.
  - If share record is missing, returns `404 Not Found`.
- **Share Lifecycle Enforcement ([`index.ts#L322-L334`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L322-L334)):**
  - `if (share.is_revoked)` returns `410 Gone`.
  - `if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now())` returns `410 Gone`.
- **Tenant Workspace Authorization ([`index.ts#L337-L364`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L337-L364)):**
  - When `share.created_by !== callerUser.id`, it retrieves `entities.workspace_id` for `share.tenant_id` and invokes `is_workspace_member(p_workspace_id, p_user_id)`.
  - If the caller is not an active workspace member, returns `403 Forbidden`.
  - The client cannot supply a workspace ID; the workspace is derived strictly from the verified database record.

### Security Deficiencies Identified
1. **Creator Workspace Membership Bypass ([`index.ts#L337`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L337)):**
   - Line 337 sets `let isAuthorized = share.created_by === callerUser.id;`.
   - If an employee created a document share while employed at Tenant A, and is subsequently removed or terminated from Tenant A's workspace, they can still email Tenant A's commercial documents because `share.created_by === callerUser.id` evaluates to true without checking current membership in `share.tenant_id`'s workspace.
   - *Severity: Medium.*
2. **Underlying Source Document Lifecycle (TOCTOU):**
   - The function checks `document_shares.is_revoked`, but does not query the source entity table (e.g., `invoices` or `quotations`). If an invoice was cancelled or deleted directly in the entity table without calling `revokeDocumentShare`, the share record remains active until its expiry date.
   - *Severity: Low.*

---

## 5. PDF Storage and Attachment Findings

### Observed Implementation
- **Private Storage Bucket ([`index.ts#L376-L386`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L376-L386)):**
  - Downloads strictly from private bucket `document-shares`.
  - Direct public access to this bucket was revoked in migration `20261107150000_document_sharing_security_hardening.sql`.
- **Storage Path Canonical Enforcement ([`index.ts#L367-L373`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L367-L373)):**
  - Validates `share.pdf_path` strictly against `${token}.pdf` and `/^[a-zA-Z0-9_-]{16,64}\.pdf$/`.
  - Client cannot specify or override the storage path; directory traversal (`../`) is impossible.
- **File Validation & Magic Bytes ([`index.ts#L388-L409`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L388-L409)):**
  - Verifies minimum size $\ge 5$ bytes.
  - Slices the first 5 bytes and verifies `%PDF-` (`0x25, 0x50, 0x44, 0x46, 0x2D`). Rejects malformed or non-PDF files with `422 Unprocessable Entity`.
  - Enforces `MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024` (10 MB). Returns `413 Payload Too Large` if exceeded.
- **Filename Sanitization ([`index.ts#L424-L425`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L424-L425)):**
  - Sanitizes filename via `.replace(/[^a-zA-Z0-9._-]/g, "_")`. Strips slashes, null bytes, CRLF, and shell characters.
- **Base64 Encoding ([`index.ts#L45-L53, L444-L445`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L45-L53)):**
  - Implements chunked binary-to-base64 conversion in 8KB blocks. Matches Resend's expected `attachments: [{ filename, content }]` schema.

### Observations & External Verification
- **Base64 Expansion vs. Provider Limits:**
  - A 10 MB raw PDF binary expands to $\approx 13.98\text{ MB}$ in Base64 string format.
  - While Resend's default attachment limit is 40 MB for paid accounts, standard/starter accounts or strict email relays may enforce a 10 MB total message size limit.
  - *Recommendation:* Lower `MAX_ATTACHMENT_BYTES` from 10 MB to 7 MB ($7 \times 1.333 \approx 9.33\text{ MB}$) to guarantee the total post-Base64 JSON payload remains below 10 MB.

---

## 6. Resend SDK and REST Fallback Findings

### Observed Implementation
- **Import Strategy:**
  - `import { Resend } from "npm:resend@6.37.0";` in Edge Function.
  - Aligns with `"resend": "^6.37.0"` in `package.json` and `bun.lock`.
- **Secret Handling:**
  - `RESEND_API_KEY` is loaded strictly via `Deno.env.get("RESEND_API_KEY")`.
  - Never bundled into Vite or exposed to client responses.

### Critical Fallback Flaw: **Ambiguous Delivery Dual-Send Bug**
Look at [`supabase/functions/send-document-email/index.ts#L451-L506`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L451-L506):
```ts
    try {
      const resend = new Resend(RESEND_API_KEY);
      const resendRes = await resend.emails.send({ ... });
      if (resendRes.error) {
        resendErrorMsg = resendRes.error.message;
      } else if (resendRes.data?.id) {
        messageId = resendRes.data.id;
      }
    } catch (sdkErr) {
      console.warn("[send-document-email] Resend SDK invocation failed, trying direct REST API fallback:", sdkErr);

      // Direct REST fallback to api.resend.com
      try {
        const restRes = await fetch("https://api.resend.com/emails", { ... });
        ...
      } catch (restErr) { ... }
    }
```
**Why this is dangerous:**
1. The `catch (sdkErr)` block does **not** distinguish between an SDK initialization failure (e.g., Deno runtime inability to import `npm:resend`) and an in-flight network error during `resend.emails.send(...)`.
2. If `resend.emails.send(...)` transmits the HTTP request to Resend, Resend queues/dispatches the email, but a socket timeout or TLS interruption occurs while Deno is reading the response, an exception is thrown.
3. The function catches this exception and **immediately executes a second HTTP POST** to `https://api.resend.com/emails`.
4. As a result, Resend receives **two separate send instructions**, delivering duplicate emails to the client.
5. *Severity: High.*
6. *Remediation:* Decide the transport mechanism (SDK or REST fetch) *once* before dispatch, or test client availability at startup rather than retrying in-flight network exceptions.

---

## 7. Idempotency and Duplicate Delivery Findings

### Evaluation
1. **Client-Side Protection:**
   - [`DocumentShareSheet.tsx#L55, L219, L604`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/document-view/shared/DocumentShareSheet.tsx#L55): Tracks `loading` state. Button displays "Sending..." and is disabled during execution.
   - Prevents accidental rapid double-clicking within the active view.
2. **Server-Side Protection:** **NONE**.
   - The Edge Function accepts no idempotency key.
   - The function does not pass an `Idempotency-Key` HTTP header to Resend (which Resend supports).
   - There is no deduplication window or database audit record logging that an email has already been dispatched for token $X$ to recipient $Y$.
3. **Concurrent Execution:**
   - If two requests are issued concurrently (e.g. from two tabs or network retry), both will execute fully and deliver two emails.
4. **Classification:** **PARTIALLY PROTECTED (Client UI only; Not Protected at Server/Provider level).**

---

## 8. Email Template Consistency Findings

### Comparison: React Email vs. Edge Function HTML
| Feature | `DocumentEmailTemplate.tsx` (Frontend) | `buildDocumentEmailHtml` in `send-document-email` | Divergence |
|---|---|---|---|
| **Technology** | `@react-email/components` (React 19) | Raw ES6 Template Strings + inline CSS | Completely different engines |
| **Execution Context** | Client browser (Preview tab) | Deno Edge Function (Email dispatch) | Two independent sources of truth |
| **Color Tokens** | `#1a1815`, `#f6f5f2`, `#fbf3db`, `#5c4813`, `#faf9f7` | Exact matching hex colors copied | Identical styling today |
| **Typography** | `-apple-system, BlinkMacSystemFont, 'Segoe UI' ...` | Exact matching font stacks copied | Identical typography today |
| **Structure & Copy** | Header, Document No, Issuer, Dates, Total, Button, Footer | Replicated structure & copy | Identical visual layout today |
| **Maintenance Risk** | Primary design template | Manual string duplication | **HIGH**. Edits to one will diverge from the other |

### Email Header & Reply-To Divergence
- In `send-document-email/index.ts#L198`, the email footer states:
  *"If you have any questions regarding this document, please reply directly to this email or contact ${issuerName}."*
- However, lines 453-464 dispatch the email **without** a `reply_to` parameter.
- The `from` address defaults to `DOCUMENT_EMAIL_FROM` (`notifications@bourxe.com`).
- If a client hits "Reply", their email goes to the system notification address rather than the issuing SME business!
- *Severity: Low/Medium.*

---

## 9. Client Integration and Fallback Findings

### Observed Behavior in `DocumentShareSheet.tsx` & `documentShareService.ts`
- **Input Sanitization:**
  - Client checks `!recipientEmail.trim()`.
  - Edge Function enforces RFC-compliant email regex, length $\le 254$, max subject length 200, CRLF line-break rejection (`/[\r\n]/`), and message length $\le 2000$.
  - All user inputs are passed through `escapeHtml(...)` before interpolation into email HTML.
- **Feedback & State Transitions:**
  - On success (`resend-edge`): Displays "Email submitted: Document sent to <email> with PDF attached" and closes the modal via `onClose()`.
  - On delivery failure: Keeps modal open, sets `deliveryError` state, and displays an amber alert with an explicit **"Open in Email App (Fallback)"** action.
- **Client Fallback:**
  - `shareViaEmailClientFallback(...)` correctly invokes Capacitor native sharing (mobile) or opens a prefilled `mailto:` link (desktop) with metadata and document URL.
  - Fallback is never triggered automatically without user consent after an ambiguous response.
- **Channel Isolation:**
  - Direct Link generation and WhatsApp sharing operate independently and remain completely functional.

---

## 10. Test Quality Assessment

### Inspection of `src/tests/critical/documentShareEmailDelivery.test.js`
All 8 reported tests were inspected:
```javascript
test('send-document-email Edge Function exists and enforces strict HTTP method and CORS security', () => { ... })
test('send-document-email Edge Function enforces caller JWT authentication', () => { ... })
test('send-document-email Edge Function enforces strict input validation and CRLF injection protection', () => { ... })
test('send-document-email Edge Function validates share revocation, expiry, and tenant authorization', () => { ... })
test('send-document-email Edge Function validates storage path, PDF magic bytes, and attachment size', () => { ... })
test('send-document-email Edge Function configures Resend with attachments and BOURXE executive template', () => { ... })
test('documentShareService wires direct Resend delivery with client fallback', () => { ... })
test('DocumentShareSheet provides direct email sending and explicit fallback on error', () => { ... })
```

### Critical Assessment: **STATIC REGEX PATTERN TESTS**
- **Test Type:** Every assertion in `documentShareEmailDelivery.test.js` is a **static source-code pattern match** (`fs.readFileSync(...)` + `assert.match(source, /regex/)`).
- **What is verified:** They reliably verify that security checks, status codes, and method calls exist in the source text.
- **What is NOT verified:**
  - They do **not** execute the Edge Function handler in a Deno or Node runtime.
  - They do **not** supply mock `Request` objects or assert on actual `Response` outputs.
  - They do **not** simulate Resend API timeouts, provider rejections, or corrupted PDF blobs.
  - They do **not** test cross-tenant denial against a mock database.
- **Document Module Coverage:**
  - While `unifiedDocumentSharing.test.js` verifies the presence of `DocumentShareSheet` across the 7 document view pages, there are no end-to-end integration tests confirming each module's payload successfully generates an email.

---

## 11. Deployment Readiness Matrix

| Readiness Milestone | Status | Direct Repository Evidence |
|---|---|---|
| **State A: Local Code Implementation** | **COMPLETE** | Edge Function, domain service, types, UI sheet, and tests exist in repository. |
| **State B: Local Static Verification & Tests** | **PASS** | 8/8 email delivery tests pass; 11/11 security tests pass; 4/4 share tests pass; TS clean on modified files. |
| **State C: Remote Edge Function Deployment** | **PENDING** | Edge Function `send-document-email` is NOT deployed to remote Supabase infrastructure. |
| **State D: Live Remote Email Transmission** | **PENDING** | `RESEND_API_KEY` and `DOCUMENT_EMAIL_FROM` secrets are not configured in remote environment; DNS records (SPF, DKIM, DMARC) not verified; zero real emails delivered. |

---

## 12. Findings Classified by Severity

### 1. High Severity
- **FIND-01: Dual-Send Duplicate Delivery in Error Fallback**
  - **File & Line:** [`supabase/functions/send-document-email/index.ts#L451-L506`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L451-L506)
  - **Observed Behavior:** An in-flight timeout or socket reset during `resend.emails.send(...)` is caught in `catch (sdkErr)` and triggers an immediate second send via `fetch("https://api.resend.com/emails")`.
  - **Impact:** If the first request was received and processed by Resend before the timeout, the recipient receives duplicate emails with duplicate PDF attachments.
  - **Recommended Action:** Select either the Resend SDK or the direct REST API as the single transport mechanism, or only fall back to REST if SDK module instantiation fails prior to dispatch.

### 2. Medium Severity
- **FIND-02: Lack of Server-Side and Provider Idempotency Key**
  - **File & Line:** [`supabase/functions/send-document-email/index.ts#L29-L34, L453-L464`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L29-L34)
  - **Observed Behavior:** No `idempotencyKey` is generated by the client or passed in headers to Resend (`Idempotency-Key`).
  - **Impact:** Network retries or rapid concurrent API calls can result in duplicate email sends.
  - **Recommended Action:** Pass an `Idempotency-Key: ${token}-${recipientEmail}` header to Resend.
- **FIND-03: Two Competing Email Templates (React Email vs. Raw HTML Builder)**
  - **File & Line:** [`src/components/email/DocumentEmailTemplate.tsx`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/email/DocumentEmailTemplate.tsx) & [`supabase/functions/send-document-email/index.ts#L58-L204`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L58-L204)
  - **Observed Behavior:** The preview in `DocumentShareSheet.tsx` renders `DocumentEmailTemplate.tsx`, while the Edge Function dispatches HTML generated by `buildDocumentEmailHtml`.
  - **Impact:** Long-term design drift. Changes to fonts, branding, or fields in one template will not appear in the other.
  - **Recommended Action:** Export the HTML generator from a single shared module or consolidate email generation into one authoritative builder.
- **FIND-04: Creator Authorization Bypasses Active Workspace Membership**
  - **File & Line:** [`supabase/functions/send-document-email/index.ts#L337`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L337)
  - **Observed Behavior:** `isAuthorized` evaluates to true if `share.created_by === callerUser.id`, without verifying that the creator is still a member of the tenant's workspace.
  - **Impact:** A revoked or terminated employee who created a share can continue sending official tenant documents after leaving the company.
  - **Recommended Action:** If `share.tenant_id` is present, always verify `is_workspace_member(entity.workspace_id, callerUser.id)`, even if `share.created_by === callerUser.id`.

### 3. Low Severity
- **FIND-05: Missing `reply_to` Address in Email Dispatch**
  - **File & Line:** [`supabase/functions/send-document-email/index.ts#L198, L453-L464`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L453-L464)
  - **Observed Behavior:** Email footer invites recipients to reply, but no `reply_to` header is configured.
  - **Impact:** Customer replies will be routed to the automated notifications mailbox instead of the sending business.
  - **Recommended Action:** Set `reply_to` in Resend options using the issuer's or creator's email.
- **FIND-06: Potential Base64 Payload Limit Exceeded on Large Attachments**
  - **File & Line:** [`supabase/functions/send-document-email/index.ts#L27`](file:///c:/Users/DELL/Desktop/bigdrops-app/supabase/functions/send-document-email/index.ts#L27)
  - **Observed Behavior:** `MAX_ATTACHMENT_BYTES` is 10 MB. Base64 encoding expands this to $\approx 14\text{ MB}$.
  - **Impact:** May fail on email providers or Resend accounts with strict 10 MB request body limits.
  - **Recommended Action:** Lower binary limit to 7 MB.

### 4. Informational
- **FIND-07: Automated Delivery Tests Rely Solely on Static Source Regex**
  - **File & Line:** [`src/tests/critical/documentShareEmailDelivery.test.js#L1-L81`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/critical/documentShareEmailDelivery.test.js#L1-L81)
  - **Observed Behavior:** Tests assert on source code substrings rather than executing function logic.
  - **Recommended Action:** Add unit tests that invoke the handler with mock HTTP `Request` objects.

---

## 13. Recommended Remediation Order

Before deploying to production, execute the following steps in order:
1. **Fix Dual-Send Fallback (FIND-01):** Remove the in-flight REST retry from the SDK error block. Use REST or SDK exclusively, or initialize the client before sending.
2. **Add Idempotency-Key (FIND-02):** Include an `Idempotency-Key` header (`${token}-${recipientEmail}`) in the Resend API call.
3. **Tighten Tenant Authorization (FIND-04):** Require active workspace membership even for the share creator when `tenant_id` is populated.
4. **Configure `reply_to` (FIND-05):** Set `reply_to` to the issuer/creator email address.
5. **Set Remote Secrets & Deploy Edge Function:**
   ```bash
   supabase secrets set RESEND_API_KEY="re_..." DOCUMENT_EMAIL_FROM="BOURXE <documents@yourdomain.com>"
   supabase functions deploy send-document-email --no-verify-jwt
   ```
6. **Verify DNS in Resend:** Verify SPF, DKIM, and DMARC records before sending to external customer addresses.

---

## 14. Explicit Statement on Repository Modifications

- **Application source files modified:** **NONE** (0 files modified).
- **Dependencies or package configuration modified:** **NONE** (0 files modified).
- **Database migrations modified:** **NONE** (0 files modified).
- **Files created:** Exactly **one** file: `docs/reports/BOURXE_Resend_Email_Delivery_Post_Implementation_Audit.md`.
- **Pre-existing changes:** Fully preserved and untouched.
