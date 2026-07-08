You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
It strictly enforces project fundamentals, locked math/rules, audit-first workflow, skills registry, and standards conformity. Follow it completely.
====================================================================

A. CONTEXT & OBJECTIVE

Implement Phase 1 of the BIGDROPS Receipt module according to:
- docs/STANDARD/receipt-standard.md
- docs/STANDARD/prefix-engine-settings-standard.md
- docs/STANDARD/document-transformation-standard.md
- docs/PRD/financial-operations-prd.md §15 (Receipt Lifecycle)

The goal is to create immutable payment receipts automatically generated
from successful payment recording. A receipt is a legal proof-of-payment
artifact. It must:
- be generated from recordPayment()
- freeze all required historical data
- never depend on live tables after creation
- support void lifecycle from payment voiding
- follow prefix engine numbering rules

Do not treat receipts as invoices. Do not add receipt transformation
behavior.

B. TARGET COMPONENTS / FILES

Expected areas:

Database migrations:
- supabase/migrations/
- create receipts table
- update prefix JSONB CHECK constraint
- extend activity_events constraints

Domain:
- src/domain/prefixConstants.ts
- src/domain/receipt/
  - types.ts
  - receiptNumber.ts
  - receiptRepository.ts
  - assertReceiptImmutable.ts
  - previewModel.ts

Payments:
- src/modules/invoices/services/paymentService.ts

Audit:
- src/lib/audit.ts

PDF:
- src/components/pdf-new/
  - ReceiptPdf.tsx

Follow existing project structure if paths differ.

C. CONSTRAINTS

Prefix Engine:
Add receipt: 'RCP' to DEFAULT_PREFIXES. Do not hardcode receipt numbers
inside generation logic. All receipt generation must use:
resolvePrefix(prefixes, 'receipt')

Number format: {resolvedPrefix}-{6-digit serial}
Example: RCP-000001

Create getNextReceiptNumber(rows, prefix = 'RCP') using existing document
numbering conventions.

Receipt INSERT must use withUniqueRetry() per
prefix-engine-settings-standard.md.

Snapshot Rules:
Receipt rows must never depend on live joins after creation.

Freeze:
Payment: amount, date, method, reference, notes, cash_amount, wht_amount,
         currency_code, wht_rate, wht_type
Invoice: invoice_number, total, subtotal, vat, wht, discount, notes,
         terms, po_number
Client: name, address, city, state, phone, email
Project: name, project_code
Company: name, address, email, phone, logo_url
Bank: bank_name, account_number, account_name
Signatory: name, role, signature_url

Never use invoice_financials_v for receipt creation or rendering.

Immutability:
Create domain protection so snapshot fields cannot be updated.
Only allow: status, voided_at, void_reason, created_by backfill.
No receipt edit functionality.

Skills Injection Rule:
Before implementation, load relevant skills from docs/PROJECTSKILLINDEX.md:
- Karpathy (surgical changes, minimal code, goal-driven execution)
- ponytail-lite (YAGNI ladder, minimum code, root-cause fixes only)
- typescript-advanced-types
- supabase-postgres-best-practices (migrations, constraints, queries)
- pdf-rendering-correctness (receipt PDF template)
- frontend-design (if any UI is needed for receipt viewer)

No unrelated refactors.

D. REQUIRED VERIFICATION (HARD HARDWARE GATE)

Do not run: bun run build
Build execution is permanently banned due to host 4GB RAM limits.

For active code changes:
Run only: bun run typecheck
Run: bun run audit:load (if schema/query/data-layer logic is touched)
Confirm: git status shows only intended receipt implementation files
         and migrations changed.

E. REQUIRED BEHAVIOR

Implementation must be minimal and scoped.

Required behavior:
1. Successful payment recording creates exactly one receipt.
2. Receipt receives immutable receipt_number.
3. Receipt snapshot survives:
   - client rename
   - company rename
   - project rename
   - bank account changes
   - invoice edits
4. Payment voiding transitions receipt: active → voided while preserving
   all snapshot data.
5. Receipt PDF receives shaped preview data only. No renderer business
   logic.
6. Add audit support:
   Entity: receipt
   Events: RECEIPT_GENERATED, RECEIPT_VOIDED
   Tracked mutable fields: status, voided_at, void_reason

F. ACCEPTANCE CRITERIA

Feature is complete when:
- receipts table exists with required snapshot fields.
- receipt prefix is registered through Prefix Engine.
- receipt numbering follows runtime prefix resolution.
- receipt insert uses withUniqueRetry.
- recordPayment creates receipt snapshot.
- receipt data is immutable.
- payment void updates receipt lifecycle.
- audit events support receipt lifecycle.
- PDF renderer consumes only ReceiptPreviewData.
- typecheck passes.
- no unrelated source files modified.