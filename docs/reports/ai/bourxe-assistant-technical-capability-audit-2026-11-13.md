# BOURXE Assistant — Technical Capability Audit of the Existing Application

This report was written by Buffy on 2026-11-13 via Freebuff.

## Objective

Record what the existing BOURXE application can do today, so the first assistant capability can be chosen from evidence. This report does not design the assistant and does not propose an implementation plan.

## Scope

In scope:

- Repository structure as it exists on disk.
- Existing AI code and AI interaction patterns.
- Data access, tenant resolution, authorization, and row-level security.
- Financial calculation authority and document persistence.
- Representative workflows traced from entry point to user feedback.
- Integration points that the evidence supports.

Out of scope:

- Code changes.
- Build, typecheck, lint, or test execution.
- Provider integration.
- Assistant design, naming, avatar, or personality.
- Product decisions.

## Boundary

This audit is a static, zero-code investigation.

- No application file was added, modified, or deleted.
- No migration, SQL, or configuration was changed.
- No provider key, account, or integration was created.
- The only file created is this report.

## Skills used

Skills used: NONE

Documentation standard: ASD-STE100 Simplified Technical English

## Classification key

Every material statement below carries one of these labels.

| Label | Meaning |
|---|---|
| USER-STATED DIRECTION | Direction given by the project owner in this conversation. |
| REFERENCE | Material used for evaluation only. Not a BOURXE requirement. |
| OBSERVATION | Verified fact from repository files. |
| INFERENCE | Conclusion drawn from observations. Labelled as such. |
| PROPOSAL | Suggestion for later evaluation. Not approved. |
| DECISION | An approved product or technical choice. See §16. |
| GAP | Cannot be established by static inspection. |

## 1. Git state before the audit

Command: `git status --porcelain=v1`

Branch: `main`. HEAD: `f8fb22c6 2026-11-13 chore(pdf): purge React-PDF renderers for Forme`.

Pre-existing changes, not authored by this audit:

- 84 deleted files. Groups: 44 under `docs/templates/` (41 `html-temps`, 2 `react-temps`, 1 `sound-temps`), 23 under `docs/reports/`, and 16 under `docs/session-memories/`.
- 3 modified files:
  - `src/components/dashboard/DashboardOverview.tsx` (+3 / −9: the header AI button now renders `DashboardAssistant`).
  - `src/components/app/AppShell.tsx` (+2: a lazy import and a `/design-lab/assistant-chat` route).
  - `src/lib/designLabPreviews.ts` (design-lab preview registry entry).
- Untracked directories and files include:
  - `docs/prd/conversational-document-assistant/`
  - `docs/tickets/free-claude-code-evaluation.md`, `docs/tickets/free-model-failover-stack.md`, `docs/tickets/local-ai-model-swap-and-speedup.md`
  - `src/components/ai-assistant/`
  - `src/components/design-lab/assistant-chat-parts.tsx`, `assistant-chat-preview.tsx`, `assistant-chat-preview.css`, `assistant-chat-script.ts`
  - `src/lib/ai-assistant/`
  - `src/pages/AssistantChatExperiment.tsx`
  - `src/tests/ai-assistant/`
  - `scratch/**` and `video-json-tutorial/`

Interpretation:

- OBSERVATION: A chat-only assistant implementation exists in the working tree but is **untracked**. It is not part of committed application code. The audit treats it as pre-existing work in progress and does not modify it.
- OBSERVATION: The three modified tracked files are pre-existing edits by that same work. They are not audit changes.
- OBSERVATION: The same applies to `docs/prd/conversational-document-assistant/` (PRD, architecture, decision log, roadmap, risk register, test plan).

## 2. Repository structure — discovered, not assumed

Commands used: directory listing plus file counts.

| Path | Verified content |
|---|---|
| `src/` | Directories: `app`, `assets`, `auth`, `components`, `config`, `context`, `contexts`, `domain`, `hooks`, `lib`, `modules`, `pages`, `styles`, `supabase`, `tests`, `types`, `utils`. Files: `App.tsx`, `index.css`, `main.tsx`, `supabase.ts`. |
| `src/components/` | 512 files. `src/components/ui/` holds 39 files. |
| `src/pages/` | 88 files and 5 sub-directories. |
| `src/domain/` | 26 sub-directories plus 10 top-level modules (`projects.ts`, `documentNumbering.ts`, `documentConversion.ts`, `prefixConstants.ts`, and others). |
| `src/modules/` | 11 sub-directories: `accounting`, `compliance`, `invoices`, `item-library`, `party`, `purchase-order`, `quotations`, `reports`, `search`, `supplier`, `tax`. |
| `src/hooks/` | 36 files. |
| `src/supabase/` | One sub-directory `policies/` with one file, `audit_logs_staging.sql`. There is no client code in this directory. |
| `src/supabase.ts` | The actual Supabase client. |
| `supabase/` | `config.toml`, `database-workflow.md`, `functions/`, `migrations/` (145 files). |
| `supabase/functions/` | 4 functions: `dispatch-push-notifications`, `postgrest-schema-exposure`, `public-document-pdf`, `send-document-email`. |
| `api/` | 2 Vercel serverless functions: `edit-payment-caption.ts`, `upload-payment-attachment.ts`. |
| `backend/` | `BigDrops.Api` directory. Not examined in detail. |
| `src/tests/` | 188 `*.test.js` files; `src/tests/critical/` holds 118. |

Corrections to earlier assumptions:

- OBSERVATION: `src/lib/Calculations.ts` exists (794 lines). This path is verified.
- OBSERVATION: `src/domain/` and `src/supabase/` exist, but `src/supabase/` is not the database client. The client is `src/supabase.ts`.
- OBSERVATION: The UI component count is 39 files in `src/components/ui/`, not "40+". The wider component tree is 512 files.
- OBSERVATION: `AGENTS.md` states "Database access goes through the Supabase layer". Evidence shows direct `supabase` client calls, `tenantClient` calls, Postgres RPCs, Edge Functions, and two Vercel API routes. The accurate statement is a mixed architecture. See §5.

## 3. Existing AI code — what exists today

### 3.1 Chat-only assistant (untracked, pre-existing)

| File | Role |
|---|---|
| `src/lib/ai-assistant/chat.ts` | `sendAssistantChat()` walks provider rows in order, streams SSE, advances on failure. |
| `src/lib/ai-assistant/protocol.ts` | `buildChatRequestBody()`, `classifyProviderFailure()`, `extractSseText()`, `maskKey()`, `readProviderErrorBody()`. |
| `src/lib/ai-assistant/providerCatalog.ts` | 4 provider rows: NVIDIA NIM, OpenRouter, AMD Token Factory, Google AI Studio. |
| `src/lib/ai-assistant/keys.ts` | Key storage: app-private file (`ai-assistant/keys.json`) on native; memory only on web. |
| `src/components/ai-assistant/AssistantSheet.tsx` | Bottom sheet UI: key entry, message list, send. |
| `src/components/ai-assistant/DashboardAssistant.tsx` | Header button that opens the sheet. |
| `src/pages/AssistantChatExperiment.tsx` | Full-page design-lab variant, routed at `/design-lab/assistant-chat` in `AppShell.tsx`. |
| `src/components/design-lab/assistant-chat-*.tsx` | Lab-only composition, scripted preview data, CSS. |
| `src/tests/ai-assistant/protocol.test.js` | Unit tests for request shape, SSE parse, masking. |

Verified behavior:

- OBSERVATION: The request body contains only `model`, `messages`, `stream`, and `max_tokens`. `AI_CHAT_MAX_TOKENS = 700`.
- OBSERVATION: There is no tool calling, no function schema, no structured output, and no document context.
- OBSERVATION: Conversation state lives in React state only. A reload clears it.
- OBSERVATION: The UI states the limits in its own copy: "This build answers questions only. It cannot read your documents or totals yet, and it cannot create or change anything."
- OBSERVATION: Provider order is a static list. The file comment records an unresolved conflict between a PRD order and two decision identifiers (DEC-17, DEC-18). Cloudflare is deliberately absent because its base URL needs an account id.
- OBSERVATION: Provider keys are stored per device. Web builds keep them in memory for the session and never in `localStorage`.
- OBSERVATION: There is no server proxy. A search of `supabase/functions` and `api/` for provider hostnames or `chat/completions` returned no matches.
- INFERENCE: Any provider key entered in a web build is sent from the browser to the provider. No rate limit, quota, or per-user allowance exists in application code.
- GAP: The provider rows cannot be checked against live provider terms here. The file itself records uncertain model names and quotas.

### 3.2 Local AI on Android (committed)

| File | Role |
|---|---|
| `src/lib/local-ai/modelManifest.ts` | Two GGUF models (Qwen3 0.6B lite, Qwen3 1.7B standard), SHA-256, byte size, license, runtime. |
| `src/lib/local-ai/modelStatus.ts` | Install states: `unsupported`, `not_installed`, `downloading`, `verifying`, `installed`, `failed`. |
| `src/lib/local-ai/modelSelection.ts` | Device memory based recommendation; selection in `localStorage`. |
| `src/lib/native/localAI.ts` | Capacitor plugin bridge `LocalAI`: load, download, verify, delete, `analyzeCleanupTask`, cancel, unload. |
| `src/modules/item-library/domain/cleanupLocalAI.ts` | Versioned JSON contract: `CleanupLocalAITask`, `CleanupLocalAIResult`, validator. |
| `src/modules/item-library/domain/cleanupLocalAIJob.ts` | Job plan and group runner. |
| `src/modules/item-library/domain/cleanupLocalAIAssistant.ts` | Deterministic intent parser and spec-difference detector. |
| `src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx` | Chat-like panel, progress, cancel, results. |
| `src/modules/item-library/pages/ItemLibraryPage.tsx` | `handleApplyCleanupProposals` — the only path that applies AI proposals. |

Verified behavior:

- OBSERVATION: Inference runs only inside the Android native app through a llama.cpp plugin. Outside Android, the bridge returns `unsupported` or throws.
- OBSERVATION: The model contract has one task type: `item_cleanup_review`. Results are validated against schema version 1 before display.
- OBSERVATION: The assistant panel parses user text with regular expressions into a closed intent set (`review_all`, `review_next`, `show_filter`, `show_groups`, `explain`, `choose_model`, `retry_failed`, `status`, `unsupported`). It does not send user text to a language model for intent resolution.
- OBSERVATION: Every assistant message about a run states that nothing was changed. Example strings: "I will not change anything." and "Nothing was changed."
- OBSERVATION: Applying proposals requires an explicit user action. `handleApplyCleanupProposals` re-validates each proposal against the locked export batch, the reviewed-separate pairs, and synthetic item ids before it calls `mergeItems()`.
- INFERENCE: The existing AI pattern is read-and-propose, then human apply. It is not an auto-write pattern.

### 3.3 External AI exchange (committed)

- OBSERVATION: `src/modules/item-library/domain/itemCleanupExchange.ts` defines `FLAGGED_CLEANUP_SCHEMA_VERSION = 1` and the export/import payloads. The UI path is labelled "External AI Import / Export".
- OBSERVATION: `src/lib/itemJsonImport.ts` exposes `importJsonItems()` for JSON item import.
- INFERENCE: The application already contains a manual export → external chat → paste JSON → validate → apply exchange for item cleanup. It is a bounded tool, not a general chat interface.

## 4. Financial calculation and document authority

### 4.1 Calculation engine

| Item | Evidence |
|---|---|
| Source of truth | `src/lib/Calculations.ts`, header comment: "Single source of truth for all document financial math." |
| Entry point | `computeDocument(raw)` = `calculateDocument(normalizeDocumentInput(raw))`. |
| Numeric type | `decimal.js`, precision 20, `ROUND_HALF_UP`. |
| Outputs | `DocumentResult`: `subtotal`, `installRateTotal`, `extraChargesTotal`, `taxableBase`, `discount`, `vat`, `wht`, `grandTotal`, `totalPayable`. |
| Second pass | `reverseVat(gross, vatRate)`. |
| Legacy code | `src/domain/invoice/calculations.ts` still exports `calcTotals()` and `resolveRowVat()`. A search shows no call site for `calcTotals()` apart from a re-export in `src/components/useInvoiceColumns.tsx`. The live document math is `src/lib/Calculations.ts`. |

Callers verified:

- `src/pages/InvoiceFormPage.tsx` line ~355: `useMemo` calls `computeDocument({ items, columns, document, cf })`.
- `src/pages/view-quotation-actions.ts`: `computeDocument` builds quotation view totals.
- `src/components/invoice-theme/invoice-theme-preview.tsx`: `computeDocument` in preview.
- `src/tests/critical/calculations.test.js` and related tests cover the engine.

- OBSERVATION: The PDF layer receives prepared data. `src/domain/invoice/buildPdfRenderPayload.ts` copies identity, items, `subtotal`, and `total` into a frozen payload. Rendering uses `@formepdf/react` and delivery adapters in `src/lib/pdf/`.
- OBSERVATION: Totals are not computed in the database. `save_invoice_with_items_transaction` inserts `discount`, `vat`, `wht`, `subtotal`, `install_rate_total`, and `total` from the JSON payload with `coalesce(..., 0)`. The migration comment in `20260809060000_invoice_financials_tenant_view.sql` states: "No financial formula is changed (Calculations.ts remains the locked TS authority)."
- OBSERVATION: The database computes **settlement** state, not document math. `invoice_financials_v` derives `settled_total`, `balance_due`, and `computed_status` from payment rows, and `invoice_persisted_status()` maps presentation states to the persisted vocabulary (`unpaid`, `partially_paid`, `paid`, `archived`).
- INFERENCE: A document written without `computeDocument` would persist whatever totals it supplied. The server would not reject or correct them.
- GAP: Static inspection cannot confirm that every write path calls `computeDocument` before save. The invoice, quotation, and purchase-order paths inspected do; other paths were not all read.

### 4.2 Document identity and lifecycle

- OBSERVATION: `docs/standard/document-transformation-standard.md` defines the 3 Laws System. Identity is `client_id`, document number, type, and lineage; it is immutable after save.
- OBSERVATION: `src/domain/invoice/assertIdentityImmutable.ts` is called from `useInvoiceSave.ts` `validate()` on edit and produces the user message "… cannot be changed after saving. To use a different …, please duplicate this document."
- OBSERVATION: `duplicateInvoice` in `src/modules/invoices/services/invoiceLifecycleService.ts` clears number, client, project, lineage, and conversion chain, and strips row lineage.
- OBSERVATION: `src/domain/documentNumbering.ts` keeps automatic cursors in `settings.document_prefixes.__auto_seq`. The comment states cursors are advisory: "the uniqueness constraint plus skip-scan over ground-truth rows arbitrate every allocation".
- OBSERVATION: `src/lib/withUniqueRetry.ts` retries a write with a new candidate number on unique violation.
- OBSERVATION: `supabase/migrations/20261107120000_document_numbering_uniqueness_constraints.sql` exists, consistent with that arbitration claim.

### 4.3 Accounting

- OBSERVATION: `src/modules/invoices/services/invoiceAccountingService.ts` `syncInvoiceAccountingEvent()` is documented as the only bridge from the invoice lifecycle to accounting. It calls `supabase.rpc('ingest_source_transaction')`, then `confirm_source_transaction`, resolves an open period, then calls `post_from_source_transaction`. Debit 1200 receivable, credit 4000 revenue.
- OBSERVATION: The call is dispatched after invoice creation inside `useInvoiceSave.ts` at line ~362 through a dynamic import, in a `try/catch` that logs and continues. It never blocks the save.
- OBSERVATION: If no open accounting period covers the invoice date, the service returns `attempted: false` with the reason and skips posting.
- OBSERVATION: `paymentAccountingService.ts` provides the payment settlement event and uses an idempotency key.
- OBSERVATION: Migrations `20260905142503_accounting_persistence.sql`, `20260906120000_invoice_accounting_adapter.sql`, `20260906130000_accounting_reconciliation.sql`, and `20260908100000_accounting_reporting_foundation.sql` define the persistence and reporting layer.
- INFERENCE: Invoice and payment accounting dispatch is best-effort from the client. A failed dispatch leaves a document without a journal entry. Reconciliation and remediation functions exist for that case.

## 5. Data-access architecture — mapped before any recommendation

### 5.1 Browser client

`src/supabase.ts`:

- Creates one `createClient()` with `VITE_SUPABASE_URL` and the anon or publishable key.
- Rejects a `service_role` key at startup: "Refusing to initialize Supabase in the frontend with a service_role key."
- Adds a 20 s request timeout.
- Retries only `GET` and `HEAD`, plus a narrow `POST` exception for `/auth/v1/token`.
- Enables session persistence and token refresh.

- OBSERVATION: The browser holds an anon key and a user session. It has no service-role credentials.

### 5.2 Tenant resolution chain

Files: `src/lib/tenant/contexts.tsx`, `src/lib/tenant/entityContext.ts`, `src/lib/tenantClient.ts`, `src/domain/tenant/tenantGate.ts`, `src/domain/tenant/tenantCreation.ts`.

Verified sequence:

1. `WorkspaceProvider` reads `workspaces` and `workspace_members` for the user and resolves an active workspace.
2. `EntityProvider` lists active `entities` for that workspace and selects one.
3. `expectedSchema = entity_<workspace.slug>_<entity.slug>`.
4. Provisioning status is read with `get_entity_provisioning_status`.
5. Exposure is probed with `is_tenant_schema_exposed`.
6. `schemaName` is set only when status is `ready` **and** exposure is `true`. Otherwise it stays `null`.
7. `createTenantClient(supabase, schemaName)` returns a client whose `from()` and `rpc()` **throw** when the schema is not ready.

- OBSERVATION: Every tenant data path therefore fail-closes before provisioning completes.
- OBSERVATION: `TenantGate` holds the UI on provisioning until exposure is confirmed. `tenantGate.ts` comments state: "Ready means the schema exists, NOT that PostgREST serves it."

### 5.3 Authorization model

- OBSERVATION: `AuthorizationProvider` in `src/lib/tenant/contexts.tsx` reads `entity_permissions` rows `(resource, action)` for the current entity and user.
- OBSERVATION: `hasAuthorization(resource, action)` mirrors the database function exactly: exact match, wildcard resource, wildcard action, or both.
- OBSERVATION: `src/hooks/usePermissionTemplates.ts` reads permission templates and `entity_permissions` for role assignment UI.
- OBSERVATION: Role assignment and removal go through SECURITY DEFINER RPCs (`assign_role_to_company_member`, `remove_role_from_company_member`). The client never writes `entity_permissions` directly.
- OBSERVATION: `supabase/migrations/20260714000000_multi_tenancy_core.sql` defines `has_entity_permission(p_entity_id, p_user_id, p_resource, p_action)` with the same wildcard logic.

### 5.4 Row-level security

- OBSERVATION: Platform tables (`workspaces`, `workspace_members`, `entities`, `entity_permissions`, `permission_templates`, `workspace_invitations`) have RLS enabled in `20260714000000_multi_tenancy_core.sql` and policies in `20260714000001_multi_tenancy_rls.sql`.
- OBSERVATION: Tenant tables get RLS at provisioning time. `_prov_install_rls()` in `20260717000000_entity_provisioning_engine.sql` runs `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`, then creates four policies (`select`, `insert`, `update`, `delete`). Each policy calls `has_entity_permission(<entity_id>, auth.uid(), <resource>, <action>)` with actions `view`, `create`, `edit`, `delete`.
- OBSERVATION: `_prov_table_to_resource()` maps table names to resources: `invoices` → `invoice`, `quotations` → `quotation`, `payments` → `payment`, `clients` → `client`, `boqs` → `boq`, `rfqs` → `rfq`, and so on.
- OBSERVATION: `search_documents` is declared `LANGUAGE sql STABLE` **without** `SECURITY DEFINER`, so it runs with caller rights and inherits tenant RLS. The migration comment records this as a deliberate choice.
- GAP: Only migrations were read. The deployed database state is not verified. One migration comment already records production drift for the invoice status check constraint.

### 5.5 Server-side RPC boundary

- OBSERVATION: Composite writes use `SECURITY DEFINER` functions in the `public` schema. Each resolves the tenant schema from the entity id and checks permission before writing.
  - `save_invoice_with_items_transaction(p_entity_id, p_invoice_payload, p_items, p_mode)` — gate `invoice/create` or `invoice/edit`, error code `insufficient_privilege`.
  - `record_payment_transaction(p_entity_id, p_payment_payload)` — gate `payment/create`; inserts the payment and syncs invoice status from `invoice_financials_v`.
  - `delete_invoice_with_items_transaction`, `revert_invoice_to_quotation_transaction`, `save_quotation_with_items_transaction`, `post_from_source_transaction`, `ingest_source_transaction`, `confirm_source_transaction`, and the purchase-order RPCs follow the same shape.
- OBSERVATION: `_prov_get_schema_name(p_entity_id)` resolves the schema from `entities`/`workspaces` slugs. A caller cannot choose a schema string.
- OBSERVATION: RPC names used by the client were counted from `src`. `save_invoice_with_items_transaction` appears in `useInvoiceSave.ts`, `view-quotation-actions.ts`, and `domain/cps/lineageStore.ts`. `save_quotation_with_items_transaction` has 2 references. Other names include `record_payment_transaction`, `delete_invoice_with_items_transaction` (2), `revert_invoice_to_quotation_transaction`, `search_documents`, `get_item_suggestions`, `sync_permission_template_assignments`, and `transfer_workspace_ownership`.
- INFERENCE: The RPC boundary is the existing, approved pattern for multi-table writes that must be atomic. It is not an "Edge Function versus direct access" choice.

### 5.6 Edge Functions and serverless routes

| Function | Verified role |
|---|---|
| `supabase/functions/public-document-pdf` | Public GET by share token; service-role client; validates token format, revocation, expiry, and `pdf_path` shape; uniform 404 for invalid states; streams the stored PDF. |
| `supabase/functions/send-document-email` | 560 lines. Not read line by line. Sends document email. |
| `supabase/functions/postgrest-schema-exposure` | Bearer token required; triggers tenant schema exposure; called after provisioning. |
| `supabase/functions/dispatch-push-notifications` | Push notification dispatch. |
| `api/upload-payment-attachment.ts` | Bearer token verified with a service-role client; uploads a payment attachment. |
| `api/edit-payment-caption.ts` | Bearer token verified with a service-role client; edits a Telegram caption. |

- OBSERVATION: Service-role credentials exist only in Edge Functions and Vercel API routes, never in the browser bundle.
- OBSERVATION: `src/domain/documentShare/documentShareService.ts` creates shares directly against `document_shares` and the `document-shares` storage bucket from the browser, with a client-generated 192-bit token. RLS allows public SELECT of non-revoked, non-expired rows and INSERT where `auth.uid() = created_by`.
- OBSERVATION: `public.document_shares` carries `tenant_id` as text and stores issuer and recipient metadata. It is a platform table, not a tenant-schema table.

### 5.7 Offline layer

- OBSERVATION: `@capacitor-community/sqlite` is a dependency. `src/lib/native/` contains `sqlite.ts`, `appStorage.ts`, `invoiceCache.ts`, `quotationOffline.ts`, `csrOffline.ts`, `quotationSync.ts`, `csrSync.ts`, `offlineAccess.ts`.
- OBSERVATION: `src/app/useSyncBootstrap.ts` runs sync modules on app start.
- OBSERVATION: `src/App.tsx` gates the app with `offlineAccessState.allowed` and shows `OfflineAccessBlocked` when access is not allowed.
- INFERENCE: On Android, invoice, quotation, and CSR data are mirrored locally. Any assistant that reads local data must respect this mirror, not only the network path.

## 6. Workflow traces

Each trace records the six required points. Folder names alone are not used as evidence.

### W1 — Create an invoice

| Stage | Evidence |
|---|---|
| Entry point | Route inside `AppShell`; form page `src/pages/InvoiceFormPage.tsx`; create wrapper `src/pages/NewInvoice.tsx`. |
| Input and validation | `useInvoiceSave.ts` `validate()`: a client is required ("Pick a client before saving"); at least one standard row must have a description; every standard row needs a description ("N item rows must have a description before saving"); `validateProjectAssignment()` checks the project belongs to the client; `assertIdentityImmutable()` on edit. |
| Business logic | `computeDocument()` in `InvoiceFormPage.tsx` produces `documentTotals` for the live form; `buildPayload()` stores the same totals plus `custom_fields` JSON (`calculationInputs`, `columnConfig`, `extraCharges`, `attachments`, `pdfOutput`, group metadata) and `amount_in_words` via `numberToWords()`. |
| Permission and tenant checks | `tenantClient` from `useEntity()`; blocking write is `save_invoice_with_items_transaction`, which requires `invoice/create` and resolves the schema from `p_entity_id`. RLS applies on reads and on the legacy path. |
| Persistence and transaction | One RPC call with `p_mode: 'create'` writes the invoice and all item rows atomically. The number is allocated by `getNextInvoiceNumber()` with `withUniqueRetry()`; the cursor advances only for system numbers. A legacy fallback inserts header then items sequentially when `entityId` is null. |
| Success, failure, feedback | `useDocumentSave.ts` shows `feedback.error('Save failed', { description: getUserFacingMutationMessage(...) })` on validation, throw, or error. Success navigates to `/invoices/<id>`. After save: `recordInvoiceCreated()` and `recordAuditLog()` from `src/lib/audit.ts`, then best-effort `syncInvoiceAccountingEvent()`. |

- OBSERVATION: If the number collides, the retry loop generates a new candidate and repeats the whole atomic write.
- OBSERVATION: Post-save audit and accounting failures are logged to the console and do not fail the save.

### W2 — Record a payment

| Stage | Evidence |
|---|---|
| Entry point | `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx`. |
| Input and validation | `loadPaymentSheetData()` computes `currentBalance = invoiceTotal − previous settled`; `normalizePaymentInput()` normalizes cash, WHT, and settlement total. |
| Business logic | Settlement split is caller-supplied (cash received, WHT deducted, settlement total, remaining balance). |
| Permission and tenant checks | RPC `record_payment_transaction` requires `payment/create` and resolves the schema from `p_entity_id`. |
| Persistence and transaction | RPC inserts the payment, reads `invoice_financials_v`, and updates `invoices.status` to the mapped persisted value. Then the client creates the receipt and attachments. |
| Success, failure, feedback | Errors surface through `feedback.error` in the sheet path. Later steps are best-effort: accounting event, audit, WHT receipt draft, receipt insert with `withUniqueRetry`, attachment upload through `/api/upload-payment-attachment`. |

- OBSERVATION: Voiding is different. `voidInvoicePayment()` updates `payments.voided_at` and `void_reason` directly through the tenant client, then re-syncs status, writes audit, edits Telegram captions, and voids the linked receipt. This is a client-orchestrated sequence, not one RPC.
- INFERENCE: A void that fails partway can leave a voided payment with a live receipt until the remaining steps run.

### W3 — Convert a quotation to an invoice

| Stage | Evidence |
|---|---|
| Entry point | `src/pages/view-quotation-actions.ts` (action handler for a saved quotation). |
| Input and validation | Reads the latest quotation and items; an idempotency gate `resolveConvertedInvoice()` returns an existing invoice if one exists. |
| Business logic | Copies client, project, notes, terms, charges, totals, and `custom_fields`; adds a source trail link; creates a new conversion chain id when absent; allocates the next invoice number. |
| Permission and tenant checks | `save_invoice_with_items_transaction` with `p_mode: 'create'` requires `invoice/create`. |
| Persistence and transaction | Atomic RPC when `entityId` exists; otherwise sequential inserts. A UNIQUE index on `invoices.source_quotation_id` arbitrates concurrent conversions, and the loser resolves to the winner. |
| Success, failure, feedback | Success navigates to the created invoice; failures throw with the database message and are caught by the quotation action handler. |

- OBSERVATION: The conversion copies stored totals (`discount`, `vat`, `wht`, `subtotal`, `total`) from the quotation row into the invoice payload, while `custom_fields.calculationInputs` carries the rates that produced them.
- INFERENCE: The copy is consistent only while the quotation row and its `calculationInputs` stay in agreement. The conversion does not re-run `computeDocument()` on the copied items in the code read.

### W4 — Find a document (two separate mechanisms exist)

**W4a — Header quick search**

| Stage | Evidence |
|---|---|
| Entry point | `src/components/layout/GlobalSearch.tsx`, mounted in the dashboard header at `DashboardOverview.tsx` line ~271. |
| Input and validation | `useGlobalSearch(query)` trims and lowercases; it returns no results when the term is shorter than 2 characters or `tenantClient.isReady` is false. |
| Business logic | No server ranking. Six parallel `ilike` queries with `limit(3)` run through `tenantClient`: `clients.name`, `projects.name`, `invoices.invoice_number`, `quotations.quotation_number`, `csrs.csr_number`, `waybills.waybill_number`. Results are merged client-side. |
| Permission and tenant checks | Tenant client selects from the resolved tenant schema; RLS applies with `view` permission. |
| Persistence and transaction | Read-only, cancellation via `useSafeAsyncTask` and `abortSignal`. |
| Success, failure, feedback | Errors are not surfaced as user feedback in the hook; each query result is read with `|| []`. |

- INFERENCE: W4a matches only numbers for documents, not client names inside documents. It is a navigation shortcut, not a document search engine.

**W4b — Ranked document search**

| Stage | Evidence |
|---|---|
| Entry point | `src/components/quotation/QuotationList.tsx` and `src/components/client/workspace/ClientDocumentSearch.tsx`. |
| Input and validation | `useDocumentSearch` debounces 350 ms and ignores terms shorter than 2 characters, in the hook and in the service. |
| Business logic | Server-side ranking in `search_documents`: number exact > number prefix > number contains > title exact > title contains > client contains; returns `match_source`, `matched_text`, `match_rank`, and `route`. |
| Permission and tenant checks | Caller-rights SQL function, no `SECURITY DEFINER`; tenant RLS applies. |
| Persistence and transaction | Read-only. |
| Success, failure, feedback | `searchDocuments()` requests `limit + 1` to report `has_more` truthfully; errors throw `Search failed: …` and `useDocumentSearch` stores `error`. |

- OBSERVATION: Phase 1 covers quotations and invoices. Later migrations (`20261014120000_document_search_convergence.sql`, `20261014160000_document_search_phase3.sql`) extend the platform.

### W5 — Share a document publicly

| Stage | Evidence |
|---|---|
| Entry point | Document view share actions; `src/domain/documentShare/documentShareService.ts`. |
| Input and validation | `getPdfBlob()` produces the PDF first; token is 24 random bytes (192 bits) with a 16–64 character pattern check. |
| Business logic | Reuses a non-revoked, non-expired share for the same document and tenant; otherwise inserts a new row, uploads to `document-shares`, and returns a public URL. |
| Permission and tenant checks | RLS: public SELECT for valid shares; INSERT requires `auth.uid() = created_by`; UPDATE only by creator. Storage bucket is public with MIME and size limits. |
| Persistence and transaction | Insert-then-upload ordering; no transaction across storage and table. |
| Success, failure, feedback | Revocation is `revokeDocumentShare(token)`. Public viewing is `/shared/:token` in the app and `public-document-pdf` at the edge. |

- OBSERVATION: The public PDF function checks revocation and expiry on every request and returns the same 404 for every failure state.
- INFERENCE: A share row inserted before a failed upload can exist without a usable PDF path.

### W6 — Local AI cleanup review

| Stage | Evidence |
|---|---|
| Entry point | Item Library → Cleanup Hub → duplicate review → Local AI panel. |
| Input and validation | Locked cleanup export snapshot; eligible groups only; prompt built by `cleanupLocalAIJob.ts`. |
| Business logic | One task per group; JSON contract validated by `cleanupLocalAI.ts`; intent parsing by regex; explanation text from `detectCleanupAssistantSpecDifferences()`. |
| Permission and tenant checks | No write during analysis. Reads are tenant-scoped. |
| Persistence and transaction | Results are held in React state; no analysis result is persisted to a tenant table in the code read. |
| Success, failure, feedback | Progress events, cancel, retry, filter. Every run states that nothing changed. Applying proposals is a separate user action with re-validation. |

- OBSERVATION: This is the only AI path that touches real business data today, and it is read-only until the user applies a proposal.

## 7. Persistence and transaction behavior — summary

| Operation | Mechanism | Atomic |
|---|---|---|
| Create or edit invoice + items | `save_invoice_with_items_transaction` RPC | Yes |
| Create or edit quotation + items | `save_quotation_with_items_transaction` RPC | Yes |
| Create or edit purchase order | `save_purchase_order_with_items_transaction` RPC | Yes |
| Delete invoice + items | `delete_invoice_with_items_transaction` RPC | Yes |
| Record payment + status sync | `record_payment_transaction` RPC | Yes |
| Void payment + receipt void | Sequential tenant updates | No |
| Receipt creation after payment | Sequential insert with unique retry | No, separate from the payment |
| Quotation → invoice | Composite RPC, unique index on source | Yes for the invoice and items |
| Invoice → quotation | `revert_invoice_to_quotation_transaction` RPC | Yes |
| Audit log | `record_audit_log` after the business write | No, best-effort |
| Accounting event | `ingest` → `confirm` → `post` after the business write | Separate from the business write |
| Document share | Table insert, then storage upload | No |

- INFERENCE: The application already separates "hard" writes (composite RPCs) from "soft" follow-ups (audit, accounting, receipts, attachments). An assistant write path would need to follow the same split.

## 8. User feedback and error handling

- OBSERVATION: `src/lib/feedback.ts` exposes `feedback.success()` and `feedback.error()`. Both play a UI sound and push to `toastStore`. Error messages are normalized by `normalizeError()` and recorded in `errorRegistry`.
- OBSERVATION: `src/lib/errorRegistry.ts` keeps at most 200 entries in `localStorage` under `bd-error-registry`, with route, title, and diagnostic text.
- OBSERVATION: `src/lib/userFacingMutationErrors.ts` maps actions (`save`, `create`, `update`, `delete`, `archive`, `restore`, `upload`, `link`, `record`, `void`) to plain fallbacks.
- OBSERVATION: `useDocumentSave` is the single save lifecycle for documents: validate → build payload → persist → after-save → navigate, with one error presentation path.
- INFERENCE: Any assistant-triggered mutation should reuse `feedback` and `getUserFacingMutationMessage` so the user sees the same wording and error behaviour as manual actions.

## 9. Existing AI-related policy questions — evidence only

The four assumptions below were **not** treated as established policy. This section reports what the files show.

### 9.1 "AI must never save without explicit user instruction and confirmation"

- OBSERVATION: No AI code path writes to a tenant table. `sendAssistantChat()` returns text only. The local AI path returns validated JSON proposals held in state.
- OBSERVATION: The only application of AI output is `handleApplyCleanupProposals`, which runs from an explicit user action.
- OBSERVATION: Assistant copy in both AI surfaces states that nothing is changed.
- CONCLUSION (evidence): Current behavior matches the statement. This is existing behavior, not an approved general policy for future assistant writes. USER-STATED DIRECTION is still needed for the first write capability.

### 9.2 "AI must never calculate prices, totals, VAT, discounts, or installation rates"

- OBSERVATION: All document math lives in `src/lib/Calculations.ts`. No AI file imports it.
- OBSERVATION: The header of `src/lib/Calculations.ts` calls itself "Single source of truth for all document financial math". That is a repository engineering rule, not an AI policy. `AGENTS.md` mentions `Calculations.ts` only in its architecture map (line 24).
- OBSERVATION: The database does not recompute document totals; it stores payload values.
- CONCLUSION (evidence): No AI calculation path exists. The rule is a repository engineering guardrail. It does not yet state what an assistant may *display* or *propose* as a computed figure.

### 9.3 "All AI calls already use safeAICall"

- OBSERVATION: `safeAICall` does not exist in the repository. A search across `src`, `supabase/functions`, and `api` returned no match.
- OBSERVATION: The only network AI call is `sendAssistantChat()` in `src/lib/ai-assistant/chat.ts`, which is untracked.
- CONCLUSION (evidence): The statement is false. There is no shared safe-call wrapper, no retry budget, no logging, and no redaction layer.

### 9.4 "A particular calculation-service integration policy has been approved"

- OBSERVATION: No calculation service, AI calculation adapter, or tool registry exists.
- OBSERVATION: `docs/prd/conversational-document-assistant/` exists in the working tree but is untracked and was not treated as approved specification.
- CONCLUSION (evidence): No such policy is recorded in the repository. The question remains open.

## 10. Capability inventory

| Capability | Exists | Reusable by an assistant | Evidence |
|---|---|---|---|
| Streaming chat with provider fallback | Yes, untracked | Partly — no tools, no context | `src/lib/ai-assistant/chat.ts` |
| Provider key management per device | Yes, untracked | No server-side control | `src/lib/ai-assistant/keys.ts` |
| On-device inference (Android) | Yes | Only for cleanup tasks today | `src/lib/native/localAI.ts` |
| Structured model output with validation | Yes, one task type | Pattern is reusable | `cleanupLocalAI.ts` validator |
| Read a single invoice or quotation | Yes | Yes, through tenant client | `loadQuotationViewData`, `useInvoiceDetailData.js` |
| Search across documents | Yes, two mechanisms | Partly — ranked RPC is the better base | `search_documents`, `documentSearchService.ts`; header `useGlobalSearch` |
| Compute document totals | Yes | Yes, deterministic TS | `computeDocument()` |
| Create or edit invoice atomically | Yes | Needs orchestration | `save_invoice_with_items_transaction` |
| Record payment | Yes | Needs orchestration | `record_payment_transaction` |
| Convert quotation to invoice | Yes | Needs orchestration | `view-quotation-actions.ts` |
| Generate PDF | Yes, client-side | Yes | Forme renderers, `src/lib/pdf/` |
| Share document publicly | Yes | Yes | `documentShareService.ts`, `public-document-pdf` |
| Send document email | Yes | Yes | `send-document-email` |
| Audit trail | Yes | Yes, follow-up call | `src/lib/audit.ts` |
| Permission check | Yes, client and server | Yes | `useAuthorization`, `has_entity_permission` |
| Conversation persistence | No | — | State only |
| Tool / function calling | No | — | Request body has 4 fields |
| Server-side AI proxy or quota | No | — | No match in `functions/` or `api/` |
| Per-user AI limits | No | — | No match |
| Assistant action confirmation UI | Only in cleanup flow | Partial precedent | `ItemLibraryLocalAIJobPanel.tsx` |

## 11. Possible integration points — PROPOSAL only

These are evidence-based suggestions. None is approved. None is a design.

1. PROPOSAL: Read-only answers can start from existing tenant-scoped reads (`tenantClient`) and `search_documents`. This needs no new write path and no new server component.
2. PROPOSAL: Any future document creation should call the same composite RPCs the UI uses, after `computeDocument()` has produced the totals, so identity, numbering, permission, and transaction behaviour stay identical.
3. PROPOSAL: Any future mutation should reuse `useDocumentSave` semantics and `feedback` wording so the user sees one error language.
4. PROPOSAL: The cleanup flow already demonstrates the interaction pattern the repository trusts: propose, show evidence, require an explicit apply, re-validate before write, state that nothing changed.
5. PROPOSAL: If cloud AI must be called from a server, the existing Edge Function pattern (`postgrest-schema-exposure`, `send-document-email`) is the closest precedent for token verification and service-role isolation.
6. PROPOSAL: Share and email capabilities already exist and can be reused instead of building delivery paths.

## 12. Gaps that static inspection cannot close

- GAP: The deployed database state is unknown. Migration comments already record at least one production drift (invoice status check constraint).
- GAP: Whether every Edge Function and Vercel route is currently deployed and matches the files.
- GAP: Runtime behaviour of RLS under real JWT claims.
- GAP: Provider model names, quotas, and terms in `providerCatalog.ts` are unverified claims in a comment.
- GAP: Device-side key storage security on Android cannot be judged from TypeScript alone.
- GAP: Offline SQLite schema and sync conflict behaviour were listed but not read line by line.
- GAP: `src/lib/native/*` native plugin implementations live in the Android project; the TS bridge was read, the Kotlin side was not.
- GAP: `backend/BigDrops.Api` was not examined.
- GAP: Performance of assistant reads on large tenants.
- GAP: The intent and status of `docs/prd/conversational-document-assistant/` and the untracked assistant code. They are working-tree material, not committed state.

## 13. Minor inconsistencies found

- OBSERVATION: `AGENTS.md` maps `src/supabase/` as "Database client". The client is `src/supabase.ts`; the directory holds one staging SQL policy file.
- OBSERVATION: `src/hooks/useInvoiceMutations.ts` defines `buildRevertInvoiceToQuotationCommand()` for `/api/invoices/<id>/revert-to-quotation`. No such API file exists, and the function has no callers. The live path calls the `revert_invoice_to_quotation_transaction` RPC in `invoiceConversionService.ts`.
- OBSERVATION: In `20260809070000_invoice_composite_transactions.sql`, `save_invoice_with_items_transaction` passes `p_schema_name` to `EXECUTE format()` but declares `v_schema`. `20260814000000_fix_invoice_item_discount_null.sql` re-creates the function with `v_schema`. The later definition is the current one.
- OBSERVATION: `providerCatalog.ts` records an unresolved conflict between DEC-17 and DEC-18 and keeps PRD order.

## 14. USER-STATED DIRECTION carried into this audit

The following directions are established and were not re-litigated here.

1. The assistant is a general BOURXE AI experience, comparable to ChatGPT or Gemini on Android. It is not a document-form chatbot.
2. It is not a JSON generator, JSON importer, or schema-filling tool. JSON and structured arguments are internal implementation, never user-facing.
3. Small Drops is reference material from the owner's personal ChatGPT instructions. It is not a BOURXE requirement.
4. Assistant identity (name, avatar, personality) stays open.
5. Cloud AI is primary, using free provider tiers. Offline is an emergency backup only.
6. The assistant asks the user a question only when it genuinely cannot continue.
7. The assistant must respect BOURXE permissions, business logic, the calculation engine, and persistence rules.
8. The first milestone must deliver one genuine end-to-end capability.
9. The assistant must not modify application architecture to fit itself.
10. Evidence must lead the work. Assumptions are not requirements.
11. No implementation in this audit. No build, typecheck, or lint.
12. Report under `docs/reports/`.
13. Classification must separate direction, reference, observation, inference, and proposal.
14. Git status is recorded before and after.
15. Paths and counts are discovery targets, not givens.
16. Policy assumptions must not be invented.
17. The audit stops after the report. Capability selection is a separate design discussion.

## 15. REFERENCE material — status

- REFERENCE: Small Drops personal ChatGPT instructions. Evaluation only.
- REFERENCE: The reference PDF and HTML invoice templates under `docs/templates/` (many now deleted in the working tree). Not application behaviour.
- REFERENCE: Prior local-AI reports under `docs/reports/ai/`. They describe the cleanup feature, which is committed behaviour; they are not requirements for the BOURXE assistant.

## 16. DECISION section (corrected)

No distinct product or technical decisions have been approved beyond the USER-STATED DIRECTION in §14.

Specifically:

- No assistant architecture is approved.
- No provider order is approved. The untracked catalog keeps PRD order and records the conflict.
- No tool protocol, transport, server proxy, storage, or persistence design is approved.
- No write policy for assistant-triggered mutations is approved.
- No assistant identity is approved.

This section is intentionally empty of manufactured decisions.

## 17. Verification

- `git status` before the audit: recorded in §1.
- `git status` after the audit: recorded in §18.
- `bun run audit:load`: not run. This audit changes no code.
- `bun run typecheck`: not run. The audit boundary forbids it.
- `bun run lint`: not run. The audit boundary forbids it.
- `bun run test`: not run. The audit boundary forbids it.
- `bun run build`: skipped by hardware policy and audit boundary.
- `supabase db push`: not applicable. No SQL changed.
- Application files changed: none.
- Files created: this report only.

## 18. Git state after the audit

Command: `git status --porcelain=v1`, run after this report was written.

Recorded counts: 193 entries in total; 84 deletions; 3 modified files; the rest untracked.

The only entry added by this audit is:

`?? docs/reports/ai/bourxe-assistant-technical-capability-audit-2026-11-13.md`

All other entries match the pre-audit snapshot: the same 84 deletions, the same three modified files (`AppShell.tsx`, `DashboardOverview.tsx`, `designLabPreviews.ts`), and the same untracked directories listed in §1. No pre-existing modification, deletion, or untracked file was touched.

## 19. Risks and limitations

- This report describes static code. It does not describe running behaviour.
- It cannot confirm which migrations are applied to the hosted database.
- It cannot confirm provider availability or terms.
- It cannot confirm Android native plugin behaviour.
- It does not evaluate assistant design options.
- It does not choose the first capability.

## 20. Deferred work

- Choose the first end-to-end capability. This is a separate design discussion.
- Decide the assistant identity.
- Decide the write policy for assistant-triggered mutations.
- Decide the cloud versus local split for the general assistant.
- Decide whether a server proxy is needed.
- Resolve the DEC-17 / DEC-18 provider order conflict.
