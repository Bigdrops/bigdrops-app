# Accounting Foundation Implementation Audit Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Audit the BIGDROPS repository against Accounting-foundation-blueprint-v1.md. Establish which blueprint capabilities already exist, exist partially, are missing, conflict with current implementation, require an explicit decision, or are intentionally deferred. Produce the verified implementation baseline for the future Waterfall Roadmap.

This audit is read-only. No application code, schema, migration, RLS policy, UI, tax engine, or PRD content was changed. Only this report was created.

## Scope

- Audit every major capability area of the Accounting Foundation Blueprint.
- Inspect actual repository implementation: migrations, schema, RLS, domain modules, services, financial utilities, audit and tenant infrastructure.
- Classify each capability with the six-value taxonomy: EXISTS, PARTIAL, MISSING, CONFLICT, REQUIRES-DECISION, DEFERRED.
- Separate accounting gaps from statutory-rule gaps.
- Do not implement, refactor, or "fix" anything.

## Files Inspected

Key evidence files:

- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Accounting-foundation-blueprint-v1.md (the audited source of truth)
- src/lib/Calculations.ts
- src/domain/invoice/financialState.ts
- src/modules/invoices/services/paymentService.ts
- src/lib/audit.ts
- src/domain/compliance/whtSummary.ts
- supabase/migrations/20260520090003_invoices.sql
- supabase/migrations/20260520090008_audit_activity.sql
- supabase/migrations/20260520090009_tax.sql
- supabase/migrations/20260520090010_views.sql
- supabase/migrations/20260714000000_multi_tenancy_core.sql
- supabase/migrations/20260714000001_multi_tenancy_rls.sql
- supabase/migrations/20260717000000_entity_provisioning_engine.sql
- supabase/migrations/20260809060000_invoice_financials_tenant_view.sql
- supabase/migrations/20260809070000_invoice_composite_transactions.sql
- supabase/migrations/20260902055836_tenant_master_template.sql
- supabase/migrations/20260905020000_entity_lifecycle.sql
- Full migration inventory: supabase/migrations/

Supporting documents: AGENTS.md, the folder Readme.md, Record-capture-v1.md, Record-engagement-plan-v1.md, Files-tax-monthly-v1.md, Technical-plan-v1.1.md, NRS-docs/OBLIGATION-LOOKUP-INDEX.md, prior audit reports under docs/Reports/general/.

## Executive Summary

The Accounting Foundation does not exist in the repository. No accounting table, posting kernel, chart of accounts, accounting period, expense, or fixed-asset module was found. The blueprint's Phase 1 (Accounting Foundation) is greenfield work.

The repository does contain strong reusable primitives: exact Decimal.js document calculations, entity-schema tenancy with RLS, an audit/activity-event trail, invoice-keyed payments with soft-void, receipts with snapshots and idempotency, WHT receipt evidence, tax input/filing tables, and a Compliance Hub.

Three implementation conflicts were found. They are the key risks for the accounting foundation:

1. JavaScript number arithmetic in operational financial derivation (financialState.ts, paymentService.ts) violates the blueprint's no-float money rule.
2. Monetary storage uses unconstrained `numeric`, not the blueprint's NUMERIC(18,2) single convention.
3. Authoritative balances derive from operational aggregates (invoices plus payments), not from posted journal entries.

The repository is understood well enough for roadmap planning, subject to explicit gates. The accounting foundation must be sequenced as new implementation, not as completion of existing work.

## Evidence Matrix

| Blueprint area | Claim/requirement | Current evidence | Status | Roadmap consequence |
| :--- | :--- | :--- | :--- | :--- |
| Architectural position and domain boundaries | Record Engagement upstream; Accounting kernel; Tax downstream | Layering exists in PRDs only. No accounting domain in src/domain/. Record-engagement-plan-v1.md is a planning artifact, not implemented | PARTIAL | Boundaries are documented, not implemented. No conflict. |
| Record Engagement to Accounting boundary | Inferred activity never becomes an accounting fact without recording | No engagement engine exists. No accounting facts exist, so the invariant holds vacuously | PARTIAL | Engagement layer is future work. The invariant is easy to preserve. |
| Source transaction model | Unified source facts with lifecycle, source key, provenance | Invoices, payments, receipts, tax_input_entries, wht_receipts exist as operational records. Idempotency exists in receipt snapshot (20260707000000) and record_payment_transaction RPC | PARTIAL | No unified source-transaction contract. Operational records can seed it. |
| Chart of accounts | Account model, types, codes, entity ownership | No accounts table or account model found. Only free-text category fields exist | MISSING | Greenfield. Seed policy is deferred in blueprint class B. |
| Journal / posting kernel | Journal headers and lines, debit/credit, balanced invariant, posting boundary, idempotency, immutability | No journal tables, no debit/credit semantics, no balanced-posting check. record_payment_transaction RPC is an atomic operational write, not a posting | MISSING | The central greenfield component. No double-entry boundary exists. |
| Money precision: document calculation | Decimal.js exact arithmetic | src/lib/Calculations.ts line 34 imports Decimal.js; line 38 sets precision 20, ROUND_HALF_UP | EXISTS | Reuse the pattern. |
| Money precision: all money arithmetic | Binary floating-point prohibited for money | src/domain/invoice/financialState.ts and src/modules/invoices/services/paymentService.ts use Number(), Math.max, and reduce over JavaScript numbers | CONFLICT | Operational derivation must move to Decimal or DB-computed values when the accounting layer lands. |
| Money precision: storage | Postgres NUMERIC(18,2), one convention | All money columns use unconstrained `numeric` (invoices.subtotal, payments.amount, tax_input_entries.net_amount). No numeric(18,2) found | PARTIAL | Postgres numeric is exact, so no float storage risk. Scale convention missing. |
| Accounting periods | Period model, open/closed/locked states, posting restrictions | tax_filings and tax_reminders carry period_start/period_end fields. No accounting-period lifecycle or lock semantics exist | PARTIAL | Filing periods exist; accounting periods are greenfield. |
| Accounting reporting | Trial balance, GL, P&L derived from postings | Operational views exist: invoice financial view (balance_due, settled_total, paid/partial/overdue states), payments views (20260520090010_views.sql). No trial balance, GL, P&L, or balance sheet | PARTIAL | Reporting aggregates exist but derive from operational data, not postings. |
| Revenue | Invoice is a claim; recognition policy in accounting layer | Invoice statuses derive from payment aggregates via financialState.ts. No recognition policy implemented | PARTIAL | Recognition policy is future accounting-layer work. |
| Payments and allocations | Payment source facts, invoice allocation, partial, overpayment, reversal | payments table (invoice_id FK, cash_amount, wht_amount, method, bank_account_id, attachments JSONB). Multiple payments per invoice, overpaymentAmount computed, soft-void with audit. No unallocated-payment path; payments are invoice-keyed | PARTIAL | Payments are the strongest money-in primitive. They never post entries. |
| Expenses / money-out | Expense model, supplier relationship, evidence | No expense table, no supplier-payment flow. Record-capture-v1.md confirms no money-out capture exists | MISSING | Greenfield. Record-capture-v1.md defines the capture surface requirement. |
| Fixed assets and depreciation | Asset register, capitalization, useful life, depreciation, disposal | No asset or depreciation code found | MISSING | Greenfield. Must stay separate from tax capital allowances. |
| Corrections / reversals | Immutable postings, reversal entries, linked corrections | Payment void is a soft-void (voided_at, RLS whitelist, recordPaymentVoided audit event). No posted entries exist to make immutable | PARTIAL | Soft-void is reusable behavior, but reversal semantics require the kernel. |
| Provenance and auditability | Source references, actors, timestamps, trace | audit_logs and activity_events tables (entity_type, entity_id, actor_id, source, scope_type, created_at). src/lib/audit.ts record* functions and TRACKED_FIELDS. Payment attachments JSONB, receipt snapshots, wht_receipts.receipt_file_url | EXISTS | Reusable audit and evidence infrastructure. Accounting facts must attach to it. |
| Tenant / entity isolation | Entity-scoped accounting facts, RLS | Entity schemas cloned from tenant_master_template (entity_bigdrops-main_main). 158 RLS policies. Provisioning engine creates per-entity schemas. entity_lifecycle adds soft-delete lifecycle with audit. Tax tables are settings_id-scoped (FK to settings(id)) | EXISTS | Isolation infrastructure is strong. Tax facts live under settings_id, not entity_id. |
| Settings versus entity boundary | settings_id and entity_id not interchangeable | tax_settings, tax_input_entries, tax_filings, tax_reminders all FK to settings(id). Documents use entity schemas. Blueprint section 18 records the same evidence | REQUIRES-DECISION | Decide whether accounting books are entity-scoped from day one and how settings-scoped tax facts migrate. Blueprint defers the migration decision. |
| Accounting to tax bridge | Accounting profit, adjustments, add-backs, allowances, losses | No accounting profit exists. No adjustment records. WHT summary (src/domain/compliance/whtSummary.ts) is operational derivation | MISSING | Phase 2 greenfield. Statutory values stay unresolved. |
| Tax calculation context and rules boundary | Versioned parameters, effective dates, citations, trace | No rules engine, no parameter store, no rule versions, no citations in code. Statutory values are unresolved in the repository (NTAA absent; WHT rate table, VAT threshold, general VAT deadline unsourced) | MISSING | Architecture is greenfield. Statutory gaps are tracked separately and must not be invented. |
| Loss register | Tax loss lifecycle | No loss register found | MISSING | Greenfield. Carry-forward values stay unresolved. |
| Compliance boundary | Compliance consumes accounting/tax outputs | Compliance Hub exists (ComplianceHub.tsx: VatInputsPanel, WhtReceiptsPanel, TaxFilingsPanel, TaxRemindersPanel). Notifications and push infrastructure exist. Files-tax-monthly-v1.md is a PRD, not implemented | PARTIAL | Consumption surfaces exist. They are downstream of the missing accounting layer. |

## Money Precision Verification

- Document-level calculation: EXISTS. Calculations.ts uses Decimal.js with precision 20 and ROUND_HALF_UP (lines 34, 38). It is the enforced financial source of truth (AGENTS.md core guardrail).
- Operational derivation: CONFLICT. financialState.ts sums payments with JavaScript numbers (Number(p.cash_amount), Math.max) to derive settledAmount, balanceDue, overpaymentAmount. paymentService.ts normalizes amounts with Number() and reduces with JavaScript addition. These values drive invoice payment state and displayed balances.
- Storage: PARTIAL. Every money column inspected uses unconstrained `numeric`. This is exact storage, so no float corruption occurs at rest. The blueprint's NUMERIC(18,2) single convention is not present.
- Rounding: ROUND_HALF_UP at the document-calculation layer only. No rounding policy exists for operational derivations or future ledger postings.

## Double-Entry and Posting Kernel Verification

No journal header table, journal line table, debit/credit field, or balanced-posting check exists in any migration or in src/. Invoice totals, payment totals, balances, and financial views are operational aggregates. The record_payment_transaction RPC performs an atomic insert with a permission gate and status sync. It is a transaction boundary, not a double-entry posting boundary. The blueprint requirement is MISSING.

## Immutability and Corrections Verification

No posted accounting entries exist, so no immutability guarantee exists to verify. The closest behavior is payment soft-void: voided_at is set, RLS hides voided rows via whitelists, and an audit event is written. This is not a reversal entry. Receipts and payments support idempotent snapshots and unique retries. When the posting kernel is built, the soft-void pattern must be mapped to reversal semantics or replaced.

## Source-of-Truth Verification

Authoritative balances today derive from operational aggregates. The invoice financial view (invoice_persisted_status function, balance_due, settled_total) and financialState.ts compute paid/partial/unpaid from the invoices and payments tables. This conflicts with the blueprint rule that authoritative balances derive from posted journal entries. Cached operational aggregates must become presentation-only once the ledger exists.

## Tenancy Verification

Tenancy infrastructure is strong and reusable:

- Entity schemas are provisioned dynamically (entity_provisioning_engine.sql creates schemas; tenant_master_template.sql clones structure).
- RLS is enabled on 51 tables with 158 policies. Workspace and entity membership policies gate access (for example, workspaces_select_member).
- entity_lifecycle.sql adds soft-delete lifecycle with an audit table.
- Tax tables are settings_id-scoped (FK constraints to settings(id) in 20260520090009_tax.sql).

The accounting boundary decision is REQUIRES-DECISION: the blueprint targets entity-scoped books but the existing tax facts are settings-scoped. The blueprint explicitly states settings_id and entity_id are not interchangeable and defers the migration decision.

## Tax Boundary Verification

No accounting-to-tax bridge exists. No accounting profit exists. No adjustment, add-back, exempt-income, capital-allowance, or loss implementation exists. Accounting depreciation is not conflated with capital allowances only because neither exists. Statutory values (NTAA text, WHT rate table, VAT registration threshold, general VAT return deadline, capital-allowance values, CIT order date) remain unresolved in the repository and were not invented by this audit.

## Record Engagement Boundary Verification

Record-engagement-plan-v1.md is a planning artifact with no implemented prompts, escalation, or enforcement engine. Record-capture-v1.md defines the capture surface but is not implemented. No inferred-activity-to-accounting-fact path exists. The blueprint invariant is preserved vacuously today.

## Reusable Existing Infrastructure

These items should be reused, not recreated:

- Payments table and record_payment_transaction RPC: money-in source-transaction base.
- Receipts with snapshot and idempotency (20260707000000): evidence and unique-write pattern.
- audit_logs and activity_events tables plus src/lib/audit.ts: provenance and auditability.
- wht_receipts and WhtReceiptsPanel: WHT evidence flow.
- tax_input_entries, tax_filings, tax_reminders: tax input and filing structures (settings-scoped).
- Entity schema provisioning, tenant_master_template, RLS policies, entity_permissions: tenant isolation and permission infrastructure.
- Decimal.js pattern in Calculations.ts: exact arithmetic.
- Compliance Hub panels: compliance consumption surfaces.
- Invoice financial view: reporting aggregate pattern (to become presentation-only).
- bank_accounts table: bank account registry.
- Payment attachments JSONB and PaymentAttachmentUploader: evidence upload.

## Conflicts Found

1. JavaScript number arithmetic in financialState.ts and paymentService.ts conflicts with the no-float money rule.
2. Unconstrained numeric storage conflicts with the NUMERIC(18,2) single-convention recommendation.
3. Operational aggregates as authoritative balances conflict with the journal-derived balance rule.

None of these conflicts blocks the current product. They must be resolved when the accounting foundation is implemented.

## Accounting Gaps versus Statutory Gaps

Accounting gaps (implementation work): chart of accounts, posting kernel, periods, journal-derived reporting, expenses, fixed assets and depreciation, corrections/reversals, accounting-to-tax bridge, loss register, tax rules architecture.

Statutory gaps (evidence work, not implementation): NTAA 2025 primary text, WHT rate table and remittance deadline, VAT registration threshold, general VAT return deadline, capital-allowance values, Presidential Order effective date. These stay unresolved and were not fabricated.

## Deferred Capabilities Verification

Blueprint-deferred items were verified as absent, which is correct:

- Bank feeds and full bank reconciliation: no implementation. bank_accounts exists as a manual registry.
- Multi-currency: NGN only. The payment RPC hard-codes currency_code 'NGN'.
- Inventory and procure-to-pay: item_catalog exists as an item library, not inventory. No procurement flow.
- Payroll/PAYE: absent.
- Group consolidation: absent.
- Budgeting and dunning: absent.
- Cryptographic hash chain: absent, and the blueprint does not require it for v1.

## Roadmap Implications

Prerequisite sequencing for the future Waterfall Roadmap, stated without writing the roadmap:

- Phase 1 (Accounting Foundation) is greenfield. Sequence it as new implementation: accounts, source transactions, posting kernel, periods, reporting, expenses, fixed assets, corrections, tenant/RLS.
- Reuse the identified infrastructure rather than rebuilding tenancy, audit, payments, receipts, and evidence.
- Gate 1: resolve the settings_id versus entity_id accounting-boundary decision before accounting tables are designed.
- Gate 2: define the money convention for accounting tables (NUMERIC(18,2)) and move operational financial derivation off JavaScript numbers before journal-derived balances are authoritative.
- Gate 3: keep statutory values unresolved; add rules-versioning architecture only when primary sources exist.
- Phase 2 (accounting-to-tax bridge) depends on Phase 1. Phase 3 (tax rules engine) depends on Phase 2 and on statutory sources. Phase 4 (compliance) consumes all prior phases.

## Open Decisions / Unresolved Questions

- Accounting boundary: entity-scoped books from day one versus transitional dual scope. The blueprint defers the migration decision.
- Posting boundary enforcement: database RPC versus domain service. The blueprint requires a single posting kernel entry point but does not choose the mechanism.
- Source-transaction retrofit: whether existing invoices and payments emit source transactions or are back-filled.
- Chart of accounts seed list and seed policy. Deferred in blueprint class B.
- Money storage convention and rounding policy for the accounting schema.
- Statutory values listed above. Awaiting primary sources.

## Verification

- git status before inspection: captured. Pre-existing working-tree changes from other agents were preserved untouched.
- Repository inspection covered migrations, schema, RLS, domain modules, services, and financial utilities.
- No build, typecheck, lint, or audit:load command was run. The task forbade them.
- No application source, schema, migration, RLS, UI, or PRD file was modified.
- git diff --check: static check only, no changes to inspect beyond this report.
- Final git status confirms the only file added by this audit is this report.

## Conclusion

The repository is ready for Waterfall Roadmap planning only after specified gates. The implementation baseline is now precisely established: tenancy, audit, payment, receipt, evidence, and compliance-surface infrastructure exist and are reusable, but the Accounting Foundation itself is entirely missing. The three conflicts (JavaScript money arithmetic, unconstrained numeric storage, operational-aggregate source of truth) and the settings-versus-entity boundary decision must appear as explicit gates in the roadmap. Statutory gaps must remain unresolved until primary sources are committed to the repository.

## Skills Used

writing-clearly-and-concisely

## Documentation Standard

ASD-STE100 Simplified Technical English