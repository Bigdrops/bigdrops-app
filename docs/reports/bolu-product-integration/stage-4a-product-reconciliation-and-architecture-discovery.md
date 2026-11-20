# Stage 4A Report — Bolu Product Reconciliation, Roadmap Alignment & End-to-End Architecture Discovery

This report was written by Antigravity on 2026-11-19 via Local Runner.

- **Objective:** Conduct one coordinated Stage 4A task to bring the authoritative Bolu product requirements, implementation roadmap, and actual system architecture back into alignment through a zero-code read-only discovery audit and documentation reconciliation.
- **Scope:** Bolu Conversational Document Assistant within BOUXRE (`docs/prd/conversational-document-assistant/`, `src/lib/ai-assistant/`, `src/components/ai-assistant/`, `api/bolu-chat.ts`, and relevant test suites).
- **Skills used:** NONE
- **Documentation standard:** ASD-STE100 Simplified Technical English
- **Supabase push status:** N/A (No SQL migrations or database mutations authorized)

---

## 1. Executive Summary

Stage 4A establishes full alignment between the authoritative Bolu Product Requirements Document (`Readme.md`, `functional-req.md`), the engineering roadmap (`Waterfall-roadmap.md`), the decision log (`decision-log.md`), and the actual implemented codebase in BOUXRE. 

Key outcomes:
1. **Authoritative PRD Reconciliation:** Reconciled functional requirements FR-01 through FR-87. Reconciled FR-71 through FR-77 into the requirement disposition table, and formally specified FR-78 through FR-87 covering the completed capabilities of Stage 3B (custom fields, groups, photo clearing), Stage 3C (PDF presentation toggles, charge labels, signatory resolution), and Stage 3D (lifecycle governance, quotation validity, reference attachments, custom payment terms, replay protection, operational intelligence).
2. **Definitive Lifecycle Contradiction Resolution:** Investigated live database check constraints (`quotations_status_check`, `invoices_status_check`), committed source code (`bolu-intelligence.ts`, `bolu-document-service.ts`), and unit test suites. Conclusively resolved the historical Stage 3D reporting contradiction: quotation persisted statuses are strictly `'open'`, `'converted'`, and `'archived'`, and invoice statuses are derived strictly from the payments ledger. Historical pre-commit notes referencing `'draft'`, `'sent'`, `'accepted'`, `'rejected'` were isolated as drafting errors, whereas DEC-44 and the codebase were verified correct.
3. **End-to-End Architecture Discovery:** Traced the complete 14-step request lifecycle from user invocation down to PostgreSQL RPC persistence and audit provenance. Uncovered a critical architectural duplication: the coexistence of two parallel execution pipelines (`bolu-runtime.ts` vs `bolu-generation.ts` / `useBoluThread.ts`), identified server-side Gate 2 endpoint bypass patterns, and confirmed one pre-existing unit test mock failure (`.limit(1)` in `bolu-commercial-and-gate-lifecycle.test.js`).
4. **Roadmap Alignment & Stage 4B Definition:** Reconciled historical stages 0 through 3D in `Waterfall-roadmap.md`, documented all known residual limitations (Finding F1, binary attachment storage dependency, 4-viewport visual browser acceptance), and proposed a disciplined next phase: **Stage 4B (Core Architecture Consolidation & Verification Hardening)** prior to expanding Bolu to additional document families.

---

## 2. Repository Baseline and Evidence Scope

- **Repository:** BOURXE (formerly BIGDROPS)
- **Git Commit Baseline:** `047e000c6b99aa1fb9d8ddc68af47806ceedf686` (`feat(assistant): stage 3d document lifecycle, attachments and intelligence`)
- **Git Branch Status:** `main` (ahead of `origin/main` by 13 commits)
- **Active Pre-existing Working Tree State (Preserved Intact):**
  - Staged changes: `0` (clean index)
  - Unstaged tracked files: `.perch/PERCH.md`, `src/components/app/UpdateModal.tsx`, `src/components/app/update/update-dialog-card.css`, `src/hooks/useAppUpdate.ts`, `src/tests/critical/productionUpdateDialog.test.js`, and legacy deleted PRDs.
  - Untracked files: `CHANGELOG.md`, `changelog/`, `scripts/release/`, `docs/reports/` (all reports), `src/tests/critical/changelog*`.
- **Evidence Sources Inspected:**
  - Migrations: `supabase/migrations/20260520090002_quotations.sql`, `20260820000000_fix_revert_quotation_status_mapping.sql`, `20260809060000_invoice_financials_tenant_view.sql`.
  - Application Source: `api/bolu-chat.ts`, `src/lib/ai-assistant/*.ts`, `src/components/ai-assistant/**/*.tsx`, `src/hooks/*.ts`.
  - Test Suites: `src/tests/ai-assistant/*.test.js`, `src/tests/ai-assistant/*.test.ts`.
  - Documentation: `docs/prd/conversational-document-assistant/` (`Readme.md`, `functional-req.md`, `architecture.md`, `Waterfall-roadmap.md`, `decision-log.md`).

---

## 3. PRD Reconciliation Results

The authoritative Bolu product specification is housed under `docs/prd/conversational-document-assistant/`. Inspection established that:
- `Readme.md` governs product direction, UX principles, high-level objectives, and milestone summaries.
- `functional-req.md` is the authoritative specification for all numbered functional requirements (FR-01 through FR-87), acceptance criteria, and disposition statuses.
- `architecture.md` governs system boundaries, the dynamic multi-model engine vision (DEC-29), and the universal document-intelligence pipeline contract (DEC-32 / DEC-33).
- `decision-log.md` is the immutable record of approved design decisions (DEC-01 through DEC-45).

### Reconciliation Findings:
1. **Scope Evolution:** Bolu was originally conceived as an invoice-only conversational assistant and subsequently expanded (DEC-28) into a multi-document operations assistant. Invoices and Quotations are now fully functional for creation, field editing, custom detail rows, line-item groups, PDF presentation settings, lifecycle transitions, validity periods, custom payment terms, reference attachments, replay protection, and operational intelligence.
2. **Missing Requirement Records:** Prior to Stage 4A, `functional-req.md` ended at FR-77. The capabilities delivered during Stages 3B, 3C, and 3D were documented in implementation reports and decision logs, but were absent from `functional-req.md`.
3. **Resolution:** Formally appended FR-78 through FR-87 to `functional-req.md`, updated the top-level requirement disposition table, reconciled FR-74 to reflect delivered extensions, and updated `Readme.md`.

---

## 4. Comprehensive Requirement-to-Implementation Matrix

Classifications:
- **VERIFIED:** Implemented, covered by automated test suites, typechecked.
- **BOUNDED:** Implemented within authorized boundaries; blocked capabilities (such as binary file upload) honestly reported.
- **PARTIAL:** Implemented for reference families (Invoice/Quotation); other document families deferred.
- **PROPOSED:** Architectural vision or design candidate awaiting approval.

| Req ID | Requirement Description | Status | Verification Evidence / Repository Module |
|---|---|---|---|
| **FR-01** | Conversation surface on document forms | VERIFIED | `BoluFloatingActionButton.tsx`, `BoluAssistantProvider.tsx`, `BoluChatWorkspace.tsx` |
| **FR-02** | Streaming token replies via SSE | VERIFIED | `api/bolu-chat.ts`, `bolu-transport.ts`, `useBoluThread.ts` |
| **FR-03** | Structured tool call / operation interpretation | VERIFIED | `bolu-operations.ts` (`parseStructuredOperationEnvelope`) |
| **FR-04** | Two-Gate proposal approval lifecycle | VERIFIED | `ProposalCardView` in `assistant-chat-parts.tsx`, `useBoluThread.ts` |
| **FR-05** | Authoritative calculations locking | VERIFIED | `Calculations.ts` / `calculateDocument`; model arithmetic strictly discarded |
| **FR-06** | Contradiction detection & clarification | VERIFIED | Prompt rules in `api/bolu-chat.ts`, `clarification` schema in `bolu-operations.ts` |
| **FR-07** | Title, notes, and terms proposals | VERIFIED | `bolu-titles.ts`, `parseRichText`, `bolu-operations.ts` |
| **FR-08** | Missing required field interrogation | VERIFIED | `validateInvoiceCreateInput` & `clarificationForClientResolution` |
| **FR-09** | Explicit filing / confirmation (No implicit save) | VERIFIED | Gate 2 confirmation button; typed messages cannot trigger persistence |
| **FR-10** | Provider chain and failover | VERIFIED | `api/bolu-chat.ts`, `bolu-account-pool.ts`, `bolu-policy-router.ts` |
| **FR-11** | Dynamic quota readout in Settings | PARTIAL | `bolu-balance-sync.ts`, `BoluProviderSettingsSection.tsx` |
| **FR-12** | In-app administrator secret management | VERIFIED | `bolu-secret-vault.ts`, serverless decrypt in `api/bolu-chat.ts` |
| **FR-13** | Privacy disclosure and consent | PROPOSED | Feature flag & disclosure design pending formal product rollout |
| **FR-14** | Degradation & manual form preservation | VERIFIED | Form remains completely functional when assistant is closed or offline |
| **FR-15** | Settings trial toggle | VERIFIED | Feature toggle in `BoluProviderSettingsSection.tsx` |
| **FR-16** | Financial & domain boundary guardrails | VERIFIED | Core financial engine `Calculations.ts` untouched; RLS enforced |
| **FR-17** | Shared assistant architecture across documents | PARTIAL | Implemented for Invoices and Quotations; remaining 6 families deferred |
| **FR-29–33** | Dynamic multi-model engine vision | PROPOSED | Documented in `architecture.md` (DEC-29); not fully implemented |
| **FR-34–41** | Universal document-intelligence pipeline | PROPOSED | Documented in `architecture.md` (DEC-32/33); BOQ reference deferred |
| **FR-42** | Protected server-side storage for AI keys | VERIFIED | `app_ai_provider_config`, `bolu-secret-vault.ts` |
| **FR-43** | Unified Bolu identity in header | VERIFIED | `assistant-chat-chrome.tsx`; standalone "B" badge removed |
| **FR-44** | Compact single-row header with Model Picker | VERIFIED | `AssistantHeader`, `ModelPill` in `assistant-chat-model-pill.tsx` |
| **FR-45** | Direct AI Infrastructure navigation | VERIFIED | `/settings?section=bolu-provider` deep link in More menu |
| **FR-46** | Mobile responsive AI Infrastructure console | VERIFIED | `BoluProviderSettingsSection.tsx`, overflow remediation |
| **FR-47–50** | Message rendering, copy, code blocks, artifacts | VERIFIED | `assistant-chat-thread.tsx`, `assistant-chat-parts.tsx`, `copyToClipboard` |
| **FR-51–53** | User message edit, regenerate, branch safety | VERIFIED | `bolu-thread-actions.ts`, `metadata.superseded = true` |
| **FR-54** | Restrained response haptics | VERIFIED | `useBoluResponseHaptics.ts`, `bolu-haptics.ts` |
| **FR-55** | Speech narration with browser/Android fallback | VERIFIED | `useBoluNarration.ts`, `bolu-narration.ts`, `boluSpeech.ts` |
| **FR-62** | Write-intent business record discovery | VERIFIED | `resolveOperationFacts` in `bolu-data.ts` |
| **FR-63** | Client discovery & candidate resolution picker | VERIFIED | `searchBoluClients`, `ClientPickerModal` in `assistant-chat-parts.tsx` |
| **FR-64** | Reusable contextual clarification | VERIFIED | `ProposalClarificationCard` in `assistant-chat-parts.tsx` |
| **FR-65–66** | Extra charges parity & tax treatment | VERIFIED | `extraCharges` validation, persistence, and calculation locking |
| **FR-67** | Quotation modification transaction | VERIFIED | `save_quotation_with_items_transaction` RPC integration |
| **FR-68** | Composer ergonomics & Gate 1/2 isolation | VERIFIED | Enter inserts newline, Gate 1 editable, Gate 2 confirmation-only |
| **FR-69** | Commercial shorthand parsing | VERIFIED | `bolu-commercial-language.ts` (`parseCommercialList`) |
| **FR-70** | Gate 2 canonical action authorization | VERIFIED | Canonical `create` and `edit` permission checks in `bolu-document-service.ts` |
| **FR-71** | Canonical document numbering | VERIFIED | `fetchDocumentPrefixesSafe`, `withUniqueRetry` |
| **FR-72** | Co-creation attribution & audit provenance | VERIFIED | `custom_fields.created_via = 'bolu_assistant'`, audit logging |
| **FR-73** | Business context discovery beyond documents | VERIFIED | `resolveOperationFacts` resolves client, past docs, item catalog |
| **FR-74** | Document field parity | VERIFIED | Invoices & quotations share full commercial field capability |
| **FR-75** | Preview card fidelity | VERIFIED | `ProposalCardView` with authoritative totals |
| **FR-76** | Gate composer availability | VERIFIED | Composer remains active during proposal review |
| **FR-77** | Idempotent Gate 2 persistence | VERIFIED | `custom_fields.operation_id` deduplication |
| **FR-78** | Custom detail rows and info chips | VERIFIED | `customFieldsChange` (`header` & `additionalFields`) in `bolu-operations.ts` |
| **FR-79** | Line-item group sections & subtotals | VERIFIED | `groupsChange` (`row_type: 'group_header'`) in `bolu-operations.ts` |
| **FR-80** | Item photo clearing (upload blocked) | BOUNDED | `image_url: null` clearing verified; photo upload blocked on storage |
| **FR-81** | PDF presentation controls & signatory | VERIFIED | `presentationChange` (toggles, headings, signatory resolution) |
| **FR-82** | Document lifecycle management | VERIFIED | `lifecycleChange` (archive, restore, quotation conversion) |
| **FR-83** | Quotation validity independence | VERIFIED | `valid_until` quotation handling vs invoice `due_date` |
| **FR-84** | Reference link attachments | BOUNDED | `custom_fields.attachments` URL checks verified; binary uploads blocked |
| **FR-85** | Bespoke custom payment terms | VERIFIED | `custom_payment_terms` 500-char limit and persistence asymmetry |
| **FR-86** | Durable operation replay protection | VERIFIED | In-memory `executedOperationIds` + persistent `last_operation_id` |
| **FR-87** | Operational intelligence diagnostics | VERIFIED | `bolu-intelligence.ts` separating observations from suggestions |

---

## 5. Historical Stage Status Reconciliation

A rigorous reconciliation of historical stages 0 through 3D was conducted:

1. **Stage 0 / 0.1 / 0.2 / 0.3 — Document Modification Integrity (2026-11-18):**
   - *Status:* Completed with residual **Finding F1**.
   - *Evidence:* 34/34 harness tests passing; 23/23 live checks on disposable project `svrpqsdagtgtclnrlmbm`.
   - *Residual Finding F1:* Deployed tenant `invoice_items` / `quotation_items` tables lack foreign key constraints (`item_id -> item_catalog(id)`). The application layer enforces catalog validity, but database-level referential integrity is absent. Production parity not verified; FK restoration remains PROPOSED.
2. **Stage 1 — Advance Invoice Service & Operations (2026-11-18):**
   - *Status:* Implementation completed; unit-level verification passing; live database verification outstanding.
   - *Evidence:* Commit `1d7d6d75`. Metadata-only configuration in `custom_fields.advance_invoice` of parent invoice. 40/40 behavioral tests passing.
3. **Stage 2 — Conversational Advance Invoice Wiring & `warnings[]` UI (2026-11-18):**
   - *Status:* Accepted with qualifications.
   - *Evidence:* Commit `e099eab2`. Two-gate conversational wiring with verbatim `warnings[]` banner on execution messages.
   - *Qualifications:* Hook-level `useBoluThread` untested in-repo; full application-shell visual inspection outstanding (Vite dev server dependency error on host).
4. **Stage 3A.1 & 3A.2 — Core Contract Integrity & Field Modifications (2026-11-19):**
   - *Status:* Implemented and verified.
   - *Evidence:* Quotation `payment_terms` persistence repaired; `project_id` tenant validation; rich-text clause normalization; natural-language calculation communication; broad existing-document commercial field modifications.
5. **Stage 3B — Custom Document Rows, Group Sections & Photo Management (2026-11-19):**
   - *Status:* Implemented and verified (with storage bound).
   - *Evidence:* Commit `c27dd2c5` (DEC-42). Custom detail rows (`header`), chips (`additionalFields`), grouped line-item sections (`groupsChange`), and photo reference clearing. Photo upload blocked on storage infrastructure.
6. **Stage 3C — PDF Presentation Controls & Signatories (2026-11-19):**
   - *Status:* Implemented and verified.
   - *Evidence:* Commit `102fd481` (DEC-43). PDF output toggles, custom headings, charge labels, and verified signatory selection via `presentationChange`.
7. **Stage 3D — Document Lifecycle, Attachments & Operational Intelligence (2026-11-19):**
   - *Status:* Implemented and verified.
   - *Evidence:* Commit `047e000c` (DEC-44). Governed lifecycle transitions, quotation validity (`valid_until`), reference link attachments, custom payment terms, persistent replay safety, and grounded operational intelligence (`bolu-intelligence.ts`). 23/23 tests passing.

---

## 6. Roadmap Changes

`Waterfall-roadmap.md` was updated with Section 38, formally recording:
- Delivery of Stage 4A as a completed milestone.
- Full reconciliation of requirements FR-71 through FR-87.
- Resolution of the Stage 3D quotation lifecycle status contradiction.
- Identification of runtime architecture integration gaps.
- Prioritized definition of Stage 4B (Core Architecture Consolidation & Verification Hardening).

---

## 7. End-to-End Runtime Architecture Trace

The Bolu execution lifecycle was traced end-to-end through real repository call paths:

```
[1. User Action]
       │  (Click FAB or Contextual Launcher)
       ▼
[2. BoluAssistantProvider] ──► buildBoluPageContext(route)
       │  (Mounts BoluChatWorkspace with tenantClient & entityId)
       ▼
[3. BoluChatWorkspace]
       │  (Initializes useBoluConversations for session management)
       │  (Initializes useBoluThread for active message streaming)
       ▼
[4. User Submits Message]
       │  (Insert user message into public.bolu_messages with status 'completed')
       │  (Resolve business facts via resolveBoluFacts / resolveOperationFacts)
       ▼
[5. runBoluGeneration]
       │  (Format prompt via buildProviderMessages & factsAsPrompt)
       │  (Dispatch HTTP POST to /api/bolu-chat via sendBoluProviderRequest)
       ▼
[6. Server: api/bolu-chat.ts]
       │  (Verify Supabase Bearer Auth Token)
       │  (Claim eligible connection via claimEligibleConnection with pre-token failover)
       │  (Stream tokens as Server-Sent Events via streamAdapterChat)
       ▼
[7. Client SSE Receiver (useBoluThread)]
       │  (Accumulate deltas into streamingContent with render throttling)
       │  (On stream close, parse structured JSON envelope: bolu_operation)
       ▼
[8. Gate 1 Validation (bolu-generation.ts)]
       │  (For create: validateInvoiceCreateInput, searchBoluClients, resolve candidates)
       │  (For modify: readBoluModifySnapshot, validateInvoiceModifyInput, validateAttachmentUrl,
       │               validateLifecycleTransition, fingerprint baseline snapshot)
       │  (Calculate totals deterministically via calculateDocument; discard model math)
       │  (If snapshot error/ambiguity, abort with explanation; else construct BoluProposal)
       ▼
[9. Proposal Presentation]
       │  (Persist assistant message into bolu_messages with proposal_payload)
       │  (ProposalCardView renders structured diffs, panels, and plain text preview)
       ▼
[10. Gate 1 Approval]
       │  (User clicks 'Approve Change'; proposal transitions to 'approved_pending_save')
       │  (Composer remains unlocked; user can ask further questions or confirm save)
       ▼
[11. Gate 2 Confirmation]
       │  (User clicks 'Confirm & Save'; proposal transitions to 'saving')
       │  (Verify in-process executedOperationIds and persistent custom_fields.last_operation_id)
       │  (Revalidate persisted baseline: status, archived_at, oldValue, attachment fingerprint)
       ▼
[12. Operation Persistence (bolu-document-service.ts)]
       │  (Attempt /api/bolu-save; fall back to client tenantClient if 404 or unconfigured)
       │  (For create: fetchDocumentPrefixesSafe -> getNextNumber withUniqueRetry -> RPC)
       │  (For modify: persistInvoiceModification / persistQuotationModification -> RPC/update)
       │  (For lifecycle: update archived_at/status, or invoke convertQuotationToInvoice)
       ▼
[13. Audit & Lineage Execution]
       │  (Record audit events: record_audit_log, record_invoice_created, etc.)
       │  (Update proposal to status 'persisted' with documentNumber & documentId)
       │  (Insert assistant execution message with verbatim warnings[] banner into bolu_messages)
       ▼
[14. Return to Idle]
       │  (Clerk state resets to 'idle'; document list or active form refreshes)
```

---

## 8. Integration Gaps Ranked by Severity and Impact

| Rank | Gap Description | Severity | Impact & Technical Evidence |
|---|---|---|---|
| **1** | **Dual Execution Engine Architecture** | **HIGH** | `src/lib/ai-assistant/bolu-runtime.ts` (with `bolu-reducer.ts`) and `src/lib/ai-assistant/bolu-generation.ts` (with `useBoluThread.ts`) maintain separate, duplicated implementations of proposal validation, snapshot loading, and client resolution. `BoluAssistantProvider.tsx` instantiates `createBoluRuntime`, but `BoluChatWorkspace.tsx` interacts exclusively with `useBoluThread`. Most unit tests target the in-memory runtime, creating a risk where tests pass while the production React UI diverges. |
| **2** | **Server-Side Gate 2 Endpoint Gap** | **MEDIUM-HIGH** | `POST ${VITE_API_URL}/api/bolu-save` is bypassed in standard environments or 404 fallbacks, executing directly via client `tenantClient`. Advance Invoice configuration is unhandled by the server route and always runs client-side. A network interruption during server save leaves the client unable to verify commit status, forcing a fail-closed abort. |
| **3** | **Multi-Worker Database Concurrency for Idempotency** | **MEDIUM** | Durable replay protection verifies `custom_fields.last_operation_id` in application code before issuing the write. Without a database-level unique constraint or row locking (`SELECT FOR UPDATE`), rapid concurrent serverless requests for the same document could theoretically execute simultaneously. |
| **4** | **Pre-Existing Stale Gate-Lifecycle Test Mock Failure** | **MEDIUM** | In `src/tests/ai-assistant/bolu-commercial-and-gate-lifecycle.test.js`, test "An authorized create/edit role can save an invoice through Gate 2" fails because `createPersistenceMock()` lacks `.limit(1)` support while `fetchDocumentPrefixesSafe` calls `.limit(1)`. This is the single failing test in the assistant test suite (534 pass / 1 fail). |
| **5** | **Binary Attachment & Item Photo Storage Blocked** | **MEDIUM** | Bolu supports reference links and image clearing, but direct file upload is blocked because no tenant-isolated Supabase storage bucket exists for document attachments, and the incumbent Cloudinary preset violates security/tenant isolation standards. |
| **6** | **Four-Viewport Visual Inspection Outstanding** | **LOW-MEDIUM** | Responsive presentation was verified via JSX/SSR unit tests and CSS inspection across 375px–1440px breakpoints, but live visual rendering in a headful browser across the four mandatory viewport classes (Mobile/Fold Closed, Fold Open, Tablet, Desktop) remains unverified. |

---

## 9. Stage 3D Lifecycle Contradiction Findings & Resolution

### The Contradiction:
The Stage 3D Implementation Report documented quotation statuses as `'open'`, `'converted'`, `'archived'`, and stated that legacy statuses (`'draft'`, `'sent'`, `'accepted'`, `'rejected'`) were rejected. In contrast, the subsequent Stage 3D Pre-Commit Verification prompt and summary notes erroneously asserted:
- *"Quotation transitions enforce persisted status constraints (draft -> sent -> accepted|rejected)."*
- *"Restore clears archived_at and sets status back to 'draft'."*

### Independent Repository Evidence:
1. **Database Schema Constraints:**
   - Migration `supabase/migrations/20260820000000_fix_revert_quotation_status_mapping.sql` lines 4–15 explicitly record that the live table check constraint `quotations_status_check` allows **only** `'open'`, `'converted'`, and `'archived'`. It fixed a critical bug where functions attempting to write `'accepted'`, `'expired'`, or `'draft'` failed with constraint violations.
   - Migration `supabase/migrations/20260809060000_invoice_financials_tenant_view.sql` lines 18–19 explicitly record that the persisted `invoices.status` check constraint permits **only** `'unpaid'`, `'partially_paid'`, `'paid'`, and `'archived'`.
2. **Committed Implementation (`047e000c`):**
   - `src/lib/ai-assistant/bolu-intelligence.ts` (lines 530–575): explicitly classifies `['draft', 'sent', 'accepted', 'rejected', 'void', 'cancelled']` as rejected legacy statuses. It enforces `VALID_QUOTATION_STATUSES = ['open', 'converted', 'archived']`.
   - `src/lib/ai-assistant/bolu-document-service.ts` (lines 1747–1751): on restore, sets `updates.status = cfg.family === 'quotation' ? 'open' : 'unpaid'`.
3. **Automated Unit Tests:**
   - `src/tests/ai-assistant/bolu-stage-3d-capabilities.test.js` (lines 300–306): explicitly asserts that each status in `['draft', 'sent', 'accepted', 'rejected', 'void', 'cancelled']` is rejected by `validateLifecycleTransition` (`assert.equal(res.valid, false)`).

### Definitive Conclusion:
DEC-44 and the committed code in `047e000c` are **100% correct**. The text in the pre-commit report summary was a drafting slip. Quotation statuses in BOUXRE are strictly `'open'`, `'converted'`, and `'archived'`, and invoice statuses remain strictly derived from the payments ledger.

---

## 10. Proposed Next Implementation Phase: Stage 4B

**Recommendation:** Execute **Stage 4B (Core Architecture Consolidation & Verification Hardening)** before authorizing additional document families.

### Objective:
Consolidate the dual execution pipelines into a single robust engine, remediate the pre-existing test mock failure, align the Gate 2 persistence endpoint contract, and perform comprehensive four-viewport visual acceptance.

### Sub-Phases:
1. **Sub-Phase 4B.1 — Single Execution Pipeline Consolidation:**
   - Unify `bolu-runtime.ts` and `bolu-generation.ts`. Extract shared proposal validation, snapshot derivation, and client resolution into a single canonical module consumed by both the React UI hook (`useBoluThread.ts`) and headless test harnesses.
2. **Sub-Phase 4B.2 — Pre-Existing Test Mock Remediation:**
   - Add `.limit(1)` support to `createPersistenceMock()` in `src/tests/ai-assistant/bolu-commercial-and-gate-lifecycle.test.js`, bringing the entire AI assistant automated suite to 100% passing (535/535).
3. **Sub-Phase 4B.3 — Gate 2 Server-Side Save Alignment:**
   - Reconcile `api/bolu-save` to handle Advance Invoice proposals and unify error codes between client and server persistence paths.
4. **Sub-Phase 4B.4 — Four-Viewport Visual Acceptance:**
   - Conduct live visual inspection across Mobile/Fold Closed (<768px), Fold Open (768px–1023px), Tablet (1024px–1279px), and Desktop (>=1280px) viewports with documented rendering artifacts.

### Explicit Exclusions from Stage 4B:
- Adding new document families (PO, Waybill, CSR, etc.).
- Modifying production database schema or migrations.
- Executing `bun run build`.

---

## 11. Documentation Files Changed

1. [docs/prd/conversational-document-assistant/Readme.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/Readme.md)
   - Updated lines 21–24: added Stage 4A milestone summary, updated deferred document families count to 6.
2. [docs/prd/conversational-document-assistant/functional-req.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/functional-req.md)
   - Updated requirement disposition table (added FR-71 through FR-87).
   - Reconciled FR-74 to reflect delivered Stage 3B–3D capabilities.
   - Appended formal requirement specifications for FR-78 through FR-87.
3. [docs/prd/conversational-document-assistant/Waterfall-roadmap.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/Waterfall-roadmap.md)
   - Appended Section 38 (Stage 4A Product Reconciliation & Architecture Discovery).
   - Reconciled historical stages, resolved lifecycle contradiction, documented integration gaps, and defined Stage 4B.
4. [docs/prd/conversational-document-assistant/decision-log.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/prd/conversational-document-assistant/decision-log.md)
   - Appended DEC-45 documenting the Stage 4A reconciliation, lifecycle status resolution, and Stage 4B proposed scope.
5. [docs/reports/bolu-product-integration/stage-4a-product-reconciliation-and-architecture-discovery.md](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/bolu-product-integration/stage-4a-product-reconciliation-and-architecture-discovery.md)
   - Created this comprehensive Stage 4A architecture and reconciliation report.

---

## 12. Verification Performed and Unavailable Checks

- **Verification Performed:**
  - `git status --porcelain=v1`: verified clean working state with zero code or test mutations.
  - Markdown structure & internal link validation: verified across all modified documentation files.
  - Consistency audit: confirmed that `Readme.md`, `functional-req.md`, `Waterfall-roadmap.md`, `decision-log.md`, and this report agree 100%.
  - `bun run audit:load`: verified module load consistency (exit 0).
- **Unavailable / Not Performed Checks:**
  - `bun run build`: prohibited on 4 GB RAM host.
  - `bun run typecheck`: skipped as this was a zero-code documentation-only task.
  - Live hosted database mutation: prohibited by authorization boundaries.
  - Headful visual browser inspection: pending visual testing environment.

---

## 13. Unresolved Questions & Decisions Requiring User Authority

1. **Authorization for Stage 4B:** Does the user approve executing **Stage 4B (Core Architecture Consolidation & Verification Hardening)** to unify the dual execution pipelines and fix the stale test mock before proceeding to additional document families?
2. **Tenant Attachment Storage Infrastructure:** When does the user wish to authorize a database migration to create an authenticated, tenant-scoped Supabase storage bucket (`document-attachments`) to unblock conversational binary file attachments and item photo uploads?
3. **Database-Level Idempotency Constraints:** Does the user wish to authorize adding a unique partial index or constraint on `custom_fields->>'last_operation_id'` in a future migration to provide database-enforced atomicity for concurrent operations?
