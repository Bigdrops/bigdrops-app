You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
It strictly enforces project fundamentals, locked math/rules, audit-first workflow, skills registry, and standards conformity. Follow it completely.
====================================================================

CONTEXT & OBJECTIVE

A previous Receipt module implementation established the initial scaffolding (types, prefix key, number generator, repository, payment hook, PDF placeholder), but it does NOT fully comply with:

- docs/STANDARD/receipt-standard.md (controlling authority)
- docs/STANDARD/prefix-engine-settings-standard.md
- docs/STANDARD/document-transformation-standard.md
- docs/PRD/financial-operations-prd.md §7.4

This task is a corrective implementation.

The objective is to complete the Receipt module so every receipt becomes a legally durable, immutable proof-of-payment that is permanently independent of future invoice, client, company, project, bank or settings changes.

Do not redesign the module.
Bring it into full compliance with the Receipt Standard.

====================================================================
READ FIRST (DO NOT MODIFY)
====================================================================

- docs/STANDARD/receipt-standard.md
- docs/STANDARD/prefix-engine-settings-standard.md
- docs/STANDARD/document-transformation-standard.md
- docs/PRD/financial-operations-prd.md

Review existing implementation:

- src/domain/receipt/
- src/modules/invoices/services/paymentService.ts
- src/domain/prefixConstants.ts
- src/lib/audit.ts
- supabase/migrations/20260706000000_create_receipts.sql

The Receipt Standard is the controlling authority wherever implementation differs.

====================================================================
IMPLEMENTATION
====================================================================

1. DATABASE

Create a NEW forward-only migration.

Never modify existing historical migrations.

The migration must:

A.
ALTER TABLE receipts

Add every missing snapshot column required by Receipt Standard §2.1, including but not limited to:

Payment snapshot

- payment_notes
- cash_amount
- wht_amount
- currency_code
- wht_rate
- wht_type

Invoice snapshot

- invoice_number
- invoice_total
- invoice_subtotal
- invoice_vat
- invoice_wht
- invoice_discount
- invoice_notes
- invoice_terms
- invoice_po_number

Client snapshot

- client_address
- client_city
- client_state
- client_phone
- client_email

Project snapshot

- project_name
- project_code

Company snapshot

- company_name
- company_address
- company_email
- company_phone
- company_logo_url

Bank snapshot

- bank_name
- bank_account_number
- bank_account_name

Signatory snapshot

- signatory_name
- signatory_role
- signatory_signature_url

Lifecycle

- status
- voided_at
- void_reason

Use appropriate SQL types matching existing schema conventions.

B.

Update the settings.document_prefixes CHECK constraint to include:

receipt

per Prefix Engine Settings Standard.

C.

Update activity_events CHECK constraints to support:

Entity:

receipt

Events:

RECEIPT_GENERATED
RECEIPT_VOIDED

====================================================================
2. PREFIX ENGINE COMPLIANCE
====================================================================

Receipt numbering MUST fully comply with
docs/STANDARD/prefix-engine-settings-standard.md.

Requirements:

- register receipt in DEFAULT_PREFIXES
- extend DocumentPrefixKey
- update settings defaults where required
- update settings CHECK constraint
- register receipt in prefix previews/settings UI if configurable prefixes are already exposed
- register receipt in preview templates if required by the settings page

Runtime numbering MUST ALWAYS resolve the tenant prefix using:

React:

resolvePrefix(settings?.document_prefixes, 'receipt')

Non-React:

resolvePrefix(prefixes, 'receipt')

Never hardcode "RCP" outside:

- DEFAULT_PREFIXES fallback
- getNextReceiptNumber(prefix = "RCP")

Receipt numbers are immutable after insertion.

Edit/update paths must never regenerate receipt numbers.

Receipt INSERT must use:

withUniqueRetry()

exactly as required by the Prefix Engine Settings Standard.

====================================================================
3. RECEIPT SNAPSHOT
====================================================================

Create or complete:

src/domain/receipt/snapshotBuilder.ts

Architectural rule:

Fetching data and shaping data are separate concerns.

The repository/service layer is responsible for efficiently retrieving all required entities (prefer a joined query where practical).

buildReceiptSnapshot() must be a PURE shaping function.

It accepts resolved payment, invoice, client, project, company, bank and signatory data and returns one immutable receipt snapshot object.

Do not embed database access inside the builder.

The builder must freeze every field required by Receipt Standard §2.1.

====================================================================
4. PAYMENT FLOW
====================================================================

Update paymentService.ts.

Existing behavior must remain:

Payment success MUST NOT fail if receipt creation fails.

Flow:

Insert payment

↓

Fetch related entities

↓

Build immutable snapshot

↓

Generate receipt number

↓

Insert receipt using withUniqueRetry

↓

Record RECEIPT_GENERATED audit event

↓

Log any receipt failure without rolling back payment.

====================================================================
5. IMMUTABILITY
====================================================================

Expand assertReceiptImmutable().

Every snapshot field is immutable.

Repository update paths must reject any modification outside:

- status
- voided_at
- void_reason
- created_by backfill (if applicable)

Attempting to modify any snapshot field must throw.

Receipt numbers are immutable.

====================================================================
6. PREVIEW MODEL
====================================================================

Update buildReceiptPreviewModel().

It must produce the canonical ReceiptPreviewData defined in Receipt Standard §6.4.

Do not omit required fields.

The preview model must consume ONLY receipt snapshot data.

====================================================================
7. PDF TEMPLATE
====================================================================

Rewrite ReceiptPdf.tsx.

The PDF is a dumb renderer.

It must:

- never fetch data
- never query Supabase
- never read settings
- never join tables
- never calculate totals
- never calculate VAT
- never calculate WHT
- never calculate balances
- never compute derived values

Render only pre-shaped data.

Required sections:

- Company header
- Company details
- PAYMENT RECEIPT title
- Receipt number
- Payment date
- Client block
- Payment details
- Invoice reference
- Project reference (when available)
- Bank details
- Signatory block
- Footer

Reuse existing PDF primitives where available.

====================================================================
8. SNAPSHOT LAW
====================================================================

This is the core invariant.

After receipt creation:

No rendering code,
preview model,
repository fetch,
or PDF generation

may read live values from:

- invoices
- clients
- projects
- settings
- signatories
- bank_accounts
- invoice_financials_v

Everything must come exclusively from the stored receipt snapshot.

This rule is mandatory.

====================================================================
9. AUDIT
====================================================================

Ensure audit infrastructure supports:

Entity:

receipt

Events:

RECEIPT_GENERATED
RECEIPT_VOIDED

Payloads must match Receipt Standard.

RECEIPT_GENERATED

- receipt_number
- payment_id
- invoice_id
- payment_amount
- payment_method

RECEIPT_VOIDED

- receipt_number
- void_reason
- original_payment_id

Implement RECEIPT_GENERATED now.

If receipt voiding is outside this phase, prepare the infrastructure without inventing unused code.

====================================================================
CONSTRAINTS
====================================================================

- Follow Receipt Standard exactly.
- Preserve existing payment transaction behavior.
- Do not redesign unrelated payment logic.
- No unrelated refactors.
- No new receipt UI pages.
- No receipt list page.
- No receipt detail page.
- No manual receipt creation.
- No live joins after receipt creation.
- Do not use invoice_financials_v for receipts.
- Do not modify historical migrations.

====================================================================
SKILLS
====================================================================

Load relevant skills from:

docs/PROJECTSKILLINDEX.md

Likely required:

- Karpathy
- ponytail-lite
- supabase-postgres-best-practices
- pdf-rendering-correctness
- typescript-advanced-types

====================================================================
VERIFICATION
====================================================================

Run:

bun run typecheck

Run:

bun run audit:load

Run:

git status

Do NOT run:

bun run build

Manual verification:

1. Record a payment.

2. Verify the receipt row contains every snapshot field.

3. Rename the client.

Verify the receipt still shows the original client snapshot.

4. Change company settings.

Verify existing receipts remain unchanged.

5. Edit invoice notes.

Verify the receipt remains unchanged.

6. Render the receipt PDF.

Verify every required section is present.

====================================================================
REPORT
====================================================================

Create:

docs/Reports/FinancialOperations/receipt-module-correction-report.md

Include:

- Summary of corrections
- Database schema additions
- Snapshot completeness evidence
- Prefix engine compliance
- Settings CHECK constraint update
- Audit CHECK constraint update
- withUniqueRetry confirmation
- Immutability confirmation
- Snapshot-law verification
- Manual verification results
- Typecheck results
- audit:load results
- git status summary
```