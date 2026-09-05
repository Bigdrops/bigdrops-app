# Luca vs BIGDROPS Accounting Architecture Audit

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Evaluate Luca V0.5 (roger296/lucaV0.5) as a candidate accounting and general-ledger subsystem for BIGDROPS. The evaluation is architectural and evidence-based. No integration was performed. Neither repository was modified.

The BIGDROPS CIT readiness audit (2026-09-05) established that BIGDROPS lacks the accounting-to-tax bridge required for defensible CIT. This audit determines whether Luca can safely close that gap.

## Scope

- Inspected Luca V0.5 source at `/tmp/lucaV05` (read-only clone, working tree clean).
- Inspected BIGDROPS financial architecture: invoices, payments, reports, compliance, RLS, migrations.
- Read BIGDROPS tax PRDs and the canonical NTA 2025 materials.
- No code, schema, PRD, or configuration change was made to either repository.

## Skills Used

- `karpathy`
- `writing-clearly-and-concisely`

## Documentation Standard

ASD-STE100 Simplified Technical English

## Baseline Git Status (BIGDROPS)

Captured before the audit:

```
AM docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
MM docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
A  docs/reports/general/files-tax-monthly-prd-audit-2026-09-05.md
A  docs/reports/general/invoice-to-quotation-revert-blocker.md
A  docs/reports/general/invoice-to-quotation-revert-fix.md
A  docs/reports/general/vat-filing-support-prd-update-2026-09-05.md
A  docs/reports/multi-tenancy/workspace-management-gaps-audit.md
M  src/domain/tenant/tenantCreation.ts
M  src/modules/invoices/services/invoiceConversionService.ts
M  src/pages/settings/AdminSettingsSection.tsx
M  src/pages/viewQuotationActions.ts
A  supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
A  supabase/migrations/20260905010000_workspace_management_gaps.sql
?? docs/Reports/general/cit-readiness-audit-2026-09-05.md
?? docs/Reports/general/record-capture-prd-audit-2026-09-05.md
?? docs/Reports/multi-tenancy/ownership-transfer-ui.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
```

All changes above pre-date this audit. The Luca clone at `/tmp/lucaV05` was created fresh and its working tree is unchanged.

## 1. Executive Verdict

**REFERENCE ARCHITECTURE ONLY.**

Luca is a well-built, single-tenant, double-entry general ledger with strong financial-integrity mechanics. It is not a viable accounting subsystem for BIGDROPS without changes that are disproportionate to the value it would provide. The decisive reasons:

1. **Licensing is disqualifying for SaaS use.** The Luca Community License v1.0 prohibits providing the software to third parties as a hosted, managed, or software-as-a-service offering, and prohibits distribution of modified versions, without a separate commercial licence. BIGDROPS is a multi-tenant SaaS platform. Using Luca beneath it is precisely the use the license forbids.
2. **Luca is single-tenant by design.** The code states this explicitly ("GBP for MVP (single-tenant)"). There is no organization or tenant column on any ledger table. `company_settings` is a single row keyed to `id = 1`. The chain file directory is a single hardcoded `chains/default`. Making Luca multi-tenant is a schema-wide rework, not a configuration change.
3. **Luca does not close the BIGDROPS accounting gaps it would be adopted for.** It has no fixed-asset register (depreciation is only a journal transaction type), no tax-loss tracking, no tax-adjustment layer, and no Nigerian tax concepts. Its VAT return is a UK quarterly Box 1-9 form hardcoded to UK account codes.
4. **Nigerian tax logic would remain in BIGDROPS regardless.** Luca provides generic accounting. The statutory CIT bridge would still be built in the BIGDROPS tax domain. Luca adds a second Postgres instance, a second data-ownership boundary, and a Node runtime to a Bun/Supabase/Vercel stack, without removing any of the work the CIT audit identified.

The value Luca does provide — hash-chained append-only journal, Decimal.js precision, idempotency keys, period locking, approval staging, and 568 test declarations — is genuinely good and should influence how BIGDROPS builds accounting natively.

## 2. Capability Matrix

Legend: ✅ implemented and verified in source · ⚠️ partial or documented intention · ❌ missing

| Capability | BIGDROPS | Luca | Evidence | Gap/Risk |
|------------|----------|------|----------|----------|
| Chart of accounts | ❌ | ✅ | `accounts` table (migration 01), 28 seeded accounts, import supported | Luca is UK-oriented (PAYE/NI, VAT Input/Output) |
| Double-entry journal | ❌ | ✅ | `transactions` + `transaction_lines` (migration 03); 16 transaction types | Required for CIT bridge |
| Transaction balancing | ❌ | ✅ | `validateBalance` in `src/engine/validate.ts` (Decimal.js) | Solid |
| Account balances | ❌ | ✅ | Computed from lines in reports engine | — |
| Accounting periods | ❌ | ✅ | `periods` table, `period_id` on transactions | — |
| Period locking | ❌ | ✅ | OPEN / SOFT_CLOSE / HARD_CLOSE enforced in `post.ts` | — |
| Revenue recognition | ❌ | ❌ | Neither system has an accrual model; BIGDROPS has invoice dates only | CIT audit gap remains |
| Customer receivables | ⚠️ | ⚠️ | BIGDROPS: invoice financial state; Luca: `counterparty_trading_account_id` on lines, aged debtors report | No shared customer master |
| Supplier payables | ❌ | ⚠️ | Luca has aged creditors report but no supplier master table; BIGDROPS none | — |
| Expense capture | ⚠️ PRD only | ⚠️ via journal | `Record-capture-v1.md` is a PRD; Luca has SUPPLIER_INVOICE type | — |
| Payment accounting | ⚠️ received only | ✅ | BIGDROPS: invoice payments (money-in); Luca: CUSTOMER/SUPPLIER_PAYMENT, BANK_RECEIPT/PAYMENT | BIGDROPS has no money-out |
| Bank reconciliation | ❌ | ✅ | `bank-import.ts`, `bank-reconciliation.ts`, CSV/OFX import, matching | Luca strength |
| Trial balance | ❌ | ✅ | Dashboard summary + TrialBalance page | — |
| Profit & loss | ❌ | ✅ | `getProfitAndLoss` in `reports.ts` | — |
| Balance sheet | ❌ | ✅ | `getBalanceSheet` in `reports.ts` | — |
| Cash flow | ❌ | ❌ | No cash-flow statement in either system | — |
| Fixed assets | ❌ | ❌ | Luca has COA accounts 1300/1310 but no asset register | Key CIT gap |
| Depreciation | ❌ | ⚠️ | Luca: DEPRECIATION journal type only; no schedule computation | Not a register |
| Asset disposal | ❌ | ❌ | Neither | — |
| Tax adjustments | ❌ | ❌ | Neither; BIGDROPS has none, Luca has none | Key CIT gap |
| Tax losses | ❌ | ❌ | Neither | Key CIT gap |
| Capital allowance inputs | ❌ | ❌ | Requires fixed-asset register with cost and dates | Key CIT gap |
| Document attachments | ⚠️ | ✅ | BIGDROPS: payments `attachments` jsonb, wht receipts; Luca: `inbox_documents`, document inbox | — |
| Audit trail | ⚠️ | ✅ | BIGDROPS: `audit_logs` diffing; Luca: SHA-256 hash-linked chain + Merkle | Luca stronger |
| Corrections | ⚠️ | ✅ | Luca: PRIOR_PERIOD_ADJUSTMENT, counter-balancing; BIGDROPS: void payment | — |
| Reversals | ⚠️ | ⚠️ | Luca: counter-balancing entries, no automated reversal type | — |
| Approvals | ❌ | ✅ | `staging` table + `approval_rules`, auto vs manual review | — |
| Financial precision | ⚠️ | ✅ | BIGDROPS: numeric columns; Luca: decimal.js, 18,2 columns, dual-balance FX check | Luca stronger |
| Concurrency | ⚠️ | ✅ | Luca: per-period chain mutex, transactions; BIGDROPS: Supabase defaults | — |
| Multi-tenancy | ✅ | ❌ | BIGDROPS RLS per table; Luca single `company_settings` row | Hard gate |
| Authorization | ⚠️ | ⚠️ | BIGDROPS: profiles is_approved gates; Luca: JWT roles | See section 5 |
| Reporting | ✅ | ✅ | Both have report pages | — |
| Export | ✅ | ✅ | Both | — |
| Backup/recovery | ✅ | ✅ | Luca: chain rebuild scripts (`rebuild-from-chain`, `recover-transactions`); Supabase managed | — |
| Observability | ⚠️ | ⚠️ | Luca: morgan, health endpoint; BIGDROPS: standard | — |
| Testing | ⚠️ | ✅ | Luca: 568 test declarations (README claims 520 passing); BIGDROPS: critical-path tests | Luca stronger |

## 3. Accounting-to-CIT Bridge

| Stage | BIGDROPS | Luca | Missing component | Recommended ownership |
|-------|----------|------|-------------------|----------------------|
| Operational business records | ✅ invoices, payments | — | — | BIGDROPS |
| Accounting events | ❌ | ✅ postTransaction submissions | Event mapping layer | BIGDROPS adapter (native engine) |
| Journal entries | ❌ | ✅ | — | Accounting layer |
| Ledger balances | ❌ | ✅ | — | Accounting layer |
| Accounting-period close | ❌ | ✅ period close + year-end | — | Accounting layer |
| Accounting profit | ❌ | ✅ P&L | — | Accounting layer |
| Statutory tax adjustments | ❌ | ❌ | Add-backs, disallowables | BIGDROPS tax domain |
| Taxable/assessable profit | ❌ | ❌ | Adjustment engine | BIGDROPS tax domain |
| Losses/capital allowances | ❌ | ❌ | Loss register, asset register | BIGDROPS tax domain (asset register in accounting) |
| CIT liability | ❌ | ❌ | Rate application (NTA §56) | BIGDROPS tax domain |
| Filing | ❌ | ❌ | Return preparation | BIGDROPS (deadline in NTAA, absent) |
| Payment | ❌ | ❌ | Remittance | BIGDROPS |
| Reconciliation | ❌ | ✅ bank reconciliation | Tax-payment reconciliation | Shared |

Luca closes the middle of this chain (journal through accounting profit) but nothing else. The statutory half — adjustments, losses, capital allowances, rates, filing — is entirely outside Luca and would be built in BIGDROPS either way. Adopting Luca does not meaningfully reduce the CIT build; it adds a data-ownership boundary through the middle of the chain.

## 4. Data Ownership

| Data/Fact | BIGDROPS | Luca | Tax Engine | Recommended Authority |
|-----------|----------|------|------------|-----------------------|
| Company/entity | ✅ settings | ⚠️ single company_settings row | — | BIGDROPS |
| Customer | ✅ | ❌ (string ref only) | — | BIGDROPS |
| Supplier | ❌ | ❌ (string ref only) | — | BIGDROPS |
| Invoice | ✅ | — | — | BIGDROPS |
| Payment | ✅ received only | — | — | BIGDROPS |
| Expense | PRD only | ✅ journal entry | — | Accounting layer |
| Journal entry | ❌ | ✅ | — | Accounting layer |
| Account | ❌ | ✅ | — | Accounting layer |
| Account balance | ❌ | ✅ | — | Accounting layer |
| Accounting period | ❌ | ✅ | — | Accounting layer |
| Fixed asset | ❌ | ❌ | — | Accounting layer |
| Depreciation | ❌ | journal type only | — | Accounting layer |
| Bank transaction | ❌ | ✅ | — | Accounting layer |
| Reconciliation | ❌ | ✅ | — | Accounting layer |
| Accounting profit | ❌ | ✅ P&L | — | Accounting layer |
| Tax adjustment | ❌ | ❌ | — | BIGDROPS tax domain |
| Capital allowance | ❌ | ❌ | — | BIGDROPS tax domain |
| Tax loss | ❌ | ❌ | — | BIGDROPS tax domain |
| VAT | ✅ computed | UK-style only | ✅ | BIGDROPS |
| WHT | ✅ computed | ❌ | ✅ | BIGDROPS |
| CIT | ❌ | ❌ | — | BIGDROPS |
| Filing | ✅ manual tracking | ❌ | — | BIGDROPS |
| Payment evidence | ✅ attachments | ✅ inbox | — | Shared |

A hybrid with Luca would split the ledger (Luca) from statutory tax facts (BIGDROPS). That is architecturally coherent on paper, but it creates two Postgres instances, two identity systems, and a synchronization boundary through the most integrity-sensitive data in the product — for a subsystem that still leaves the entire CIT adjustment layer to build.

## 5. Multi-Tenancy and Security

**This is the hard gate, and Luca fails it.**

BIGDROPS:
- Supabase RLS on every table (`ENABLE ROW LEVEL SECURITY` in migrations; per-table policies such as `approved_users_only_invoices` and `invoices_authenticated_select`).
- Tenant scoping through `settings_id` and per-tenant clients; workspace/entity architecture.
- Row-level isolation is enforced by the database.

Luca:
- No tenant column on `accounts`, `periods`, `transactions`, `transaction_lines`, `staging`, `bank_statement_lines`, `inbox_documents`, or `chain_metadata`.
- `company_settings` is a single row (`id` primary key, default 1).
- `getBaseCurrency()` hardcodes `GBP` with the comment "For MVP (single tenant)."
- Chain files live in a single hardcoded `chains/default` directory.
- Auth is JWT with a roles array on `users`; there is no organization or workspace concept. A non-production `X-API-Key` dev bypass grants ADMIN and FINANCE_MANAGER roles.

Multi-tenant adoption would require adding a tenant identifier to every ledger table, partitioning the chain file storage per tenant, scoping every query, and rebuilding the auth model. The license would still forbid the SaaS deployment. This is not an adaptation; it is a rewrite of the persistence and security layers.

## 6. Integration Model

Evaluated theoretically only. Luca's design anticipates external modules (the `source_module_id`, `source_module_reference`, and `idempotency_key` columns; the webhook publisher in `src/engine/webhooks.ts`).

| Concern | Assessment |
|---------|------------|
| Identity mapping | BIGDROPS invoice UUID vs Luca `transaction_id` (`TXN-{period}-{seq}`); requires a persistent mapping table |
| Event ownership | BIGDROPS owns invoices/payments; Luca owns journal entries; a posting adapter would own the mapping |
| Idempotency | Luca supports `idempotency_key` (unique) — the one clean primitive |
| Duplicate prevention | Possible via idempotency keys; requires BIGDROPS-side persistence of the key per invoice |
| Retries/failure recovery | Luca writes chain file first, DB mirror second; a chain/DB split is recoverable but adds a second failure mode |
| Eventual consistency | Posting is synchronous to Luca; webhook delivery is fire-and-forget (non-blocking) |
| Corrections/deletions | BIGDROPS voids a payment; Luca requires a counter-balancing journal — two correction semantics to reconcile |
| Period locking | Luca hard-close is authoritative; BIGDROPS has no period concept — a BIGDROPS edit after Luca close would be rejected silently or desync |
| Reconciliation | Would require a periodic BIGDROPS↔Luca balance check as its own subsystem |
| Network/service dependency | Every financial write becomes dependent on a second service; outage blocks invoicing |

The integration is workable in theory but it is a second system of record with its own failure modes, correction semantics, and period authority. That is a large, permanent operational dependency.

## 7. Financial Integrity

Luca's integrity mechanics are its strongest asset and are verified in source:

- `decimal.js` throughout posting, validation, FX, and reports.
- `validateBalance` rejects unbalanced submissions; dual-balance check (`validateDualBalance`) with a 0.0001 tolerance for FX transactions.
- Append-only chain files: SHA-256 hash-linked, Merkle-tree verified, per-period mutex serializing writes.
- Database is a mirror; `rebuild-from-chain` and `recover-transactions` scripts exist.
- Period status enforced at post time (HARD_CLOSE rejected, SOFT_CLOSE requires override).
- Unique `idempotency_key` on transactions and staging.
- 568 test declarations covering posting, periods, chain verification, bank reconciliation, FX, multicurrency reports, and recovery.

This is the reference-quality behavior BIGDROPS would need. However: cryptographic chaining proves immutability, not accounting correctness. The accounting rules themselves (which accounts, which mappings) are the product's responsibility. Luca does not compute depreciation schedules, capital allowances, or tax adjustments; those would still be built by BIGDROPS.

## 8. Nigerian Tax Compatibility

Using the canonical NTA 2025 materials:

| Required accounting fact | Luca provides? |
|--------------------------|----------------|
| Revenue | ✅ via REVENUE accounts |
| Allowable expenses | ✅ via EXPENSE accounts and SUPPLIER_INVOICE |
| Disallowable-expense identification | ❌ no expense-classification model |
| Accounting profit | ✅ via P&L |
| Fixed assets | ❌ no register |
| Depreciation | ⚠️ journal type only, no schedule |
| Capital allowance inputs | ❌ requires asset cost, dates, categories |
| Losses | ❌ no loss register or carry-forward |
| Accounting periods | ✅ |
| Supporting records | ✅ document inbox |
| Prior tax/accounting adjustments | ❌ |

Luca's own VAT return is a UK quarterly Box 1-9 computation hardcoded to accounts 1200 (VAT Input) and 2100 (VAT Output). There is no NGN, no Nigerian VAT at 7.5%, no WHT, no CIT, no development levy, no PAYE/DTS, and no reference to Nigerian legislation anywhere in the source. Nigerian tax law must remain in the BIGDROPS tax domain regardless of any accounting-layer decision.

## 9. Capital Allowance Gap

Luca does not close this gap. Depreciation in Luca is a journal transaction type (`DEPRECIATION`) that posts an entry to user-chosen accounts; there is no fixed-asset register, no depreciation schedule, and no asset lifecycle.

Nigerian capital allowances (First Schedule to the NTA) require per-asset facts: acquisition cost, acquisition date, asset category (plant, building, motor vehicle, and so on), and business-use proportion (section 27(3) proration). Depreciation equals accounting depreciation; capital allowance is a separate statutory computation. BIGDROPS would still need an asset register and a capital-allowance engine even with Luca in place.

## 10. Product / UX Impact

Luca ships a full React 18 web UI with dashboard, journal, chart of accounts, trial balance, period management, and approval queue. That UI cannot remain invisible: its concepts — accounts, debit/credit lines, approval rules, period close — would either leak into the BIGDROPS experience or require a BIGDROPS-hosted wrapper that reimplements the Luca UI against its API. The alternative is to show users two applications, which contradicts the "one coherent business application" requirement.

## 11. Operational Risk

| Factor | Assessment |
|--------|------------|
| Project maturity | v0.5, private package, single-company project (eTail Support Limited), 2026 copyright |
| Maintenance burden | A second service, second Postgres, second deploy pipeline |
| Release cadence | Unknown; private repo, no public release track visible |
| Dependency health | Express 4, Knex 3, decimal.js, pg 8 — mature but Node-side, outside the Bun-only BIGDROPS stack |
| Deployment complexity | Docker + nginx + certbot VPS install; BIGDROPS is Vercel/Supabase managed |
| Database ownership | Luca owns a separate Postgres mirror plus chain files; Supabase owns BIGDROPS data — two databases |
| Backup strategy | Chain rebuild scripts exist; requires its own backup discipline |
| Failure modes | Chain/DB divergence, service outage blocks posting |
| Licensing | Community License forbids SaaS hosting and distribution of modifications without a commercial licence |
| Lock-in | Data in chain files + Postgres; exportable in principle |
| Fork/modify | License restricts distribution of modified versions |
| Recovery if unavailable | No fallback; the ledger is the system of record |

## 12. Build-vs-Adopt Analysis

Scored 1 (low) to 5 (high risk/effort) except where noted.

| Criterion | A. Build natively | B. Adopt Luca | C. Reference material |
|-----------|-------------------|---------------|----------------------|
| Implementation effort | 4 | 3 (but + integration) | 1 |
| Architectural complexity | 2 | 4 (second service) | 1 |
| Security risk | 1 (RLS retained) | 3 (second trust boundary, licensing) | 1 |
| Financial-integrity risk | 3 (must build) | 2 (Luca strong) | 1 |
| Multi-tenancy fit | 1 (native) | 5 (single-tenant by design) | 1 |
| Nigerian-tax fit | 1 (native domain) | 4 (UK-oriented) | 1 |
| Maintenance burden | 3 | 4 | 1 |
| User experience | 1 (coherent) | 4 (concept leak) | 1 |
| Vendor/project dependency | 1 | 4 (license, maturity) | 1 |
| Reversibility | 1 | 4 (data migration out) | 1 |

**Recommendation:** Option C — treat Luca as reference architecture — is the rational path. Option B is blocked by licensing and single-tenancy. Option A's scope is real but is the same scope CIT requires anyway; building the accounting layer natively inside the Supabase tenant model avoids a second system of record.

## 13. CIT Readiness Consequence

- Without an accounting foundation: CIT implementation is unsafe. That conclusion from the CIT readiness audit stands unchanged.
- Luca does not change it. Adopting Luca would give BIGDROPS journal, balances, and accounting profit, but it would still lack: fixed-asset register, depreciation schedules, capital-allowance inputs, losses, tax adjustments, and every Nigerian statutory value. The CIT build inside the BIGDROPS tax domain would be identical in size, with an added integration boundary.
- The realistic CIT-ready sequence is: native accounting layer (journal, periods, P&L) → expense capture → asset register → tax-adjustment engine → CIT liability. Luca's mechanics inform the first layer only.

## 14. Recommended Architecture

Native accounting layer inside BIGDROPS, influenced by Luca:

- Double-entry journal keyed by tenant (Supabase RLS), modeled on Luca's `transactions`/`transaction_lines` shape.
- `decimal.js` for all money math, balanced-post validation, and a tolerance check for FX.
- Accounting periods with OPEN/SOFT_CLOSE/HARD_CLOSE and post-time enforcement.
- Idempotency keys on every posting to prevent duplicates.
- A correction model based on counter-balancing entries, not in-place edits.
- An append-only audit surface; a full cryptographic chain is optional but the append-only journal is not.
- Fixed-asset register and depreciation as first-class entities, because capital allowances depend on them.
- Approval staging only if a tenant's workflow requires it; not a v1 requirement.
- Nigerian tax computation stays in the existing tax domain (`src/lib/Calculations.ts` as the authoritative calculator).

## 15. Open Questions

Blocking:
- Is a commercial licence from eTail Support Limited obtainable, and at what terms? (License is the hard blocker for SaaS.)
- Would the project accept a second Postgres instance and second service boundary? (Architecture decision, not a code question.)

High-risk:
- Who owns the ledger if Luca is adopted, and who resolves a chain/DB divergence?
- How are corrections synchronized when BIGDROPS voids a payment but Luca requires a counter-entry?

Non-blocking:
- Luca's chain-rebuild and recovery scripts — reusable concepts worth copying?
- Is a Merkle tree warranted in the native design, or is append-only with RLS sufficient?

## 16. Final Decision

- **Recommendation:** Do not adopt Luca as the accounting subsystem. Use Luca V0.5 as reference architecture for a native BIGDROPS accounting layer.
- **Confidence level:** High.
- **Decisive evidence:**
  - License text: "You may NOT provide the software ... to third parties as a hosted, managed, or software-as-a-service offering" and "You may not distribute ... any modified version" without a commercial licence.
  - `src/engine/currency.ts`: "For MVP (single tenant), base currency is always GBP."
  - No tenant column on any ledger table; `company_settings` keyed to `id = 1`; chain directory hardcoded `chains/default`.
  - UK quarterly VAT return hardcoded to accounts 1200/2100; no Nigerian legislation reference anywhere in source.
  - No fixed-asset register: DEPRECIATION is a journal type, not an asset lifecycle.
- **Conditions that would change the recommendation:**
  - A commercial licence is obtained and its terms permit multi-tenant SaaS.
  - Luca releases a native multi-tenant edition with tenant-scoped chain storage, per-tenant chart of accounts, and per-tenant periods.
  - BIGDROPS commits to a second service boundary and a permanent data-synchronization subsystem, accepting the resulting operational cost.

## Changes Made

None to either repository. This report is the only new file.

## Verification

- BIGDROPS `git status` before and after the audit: identical except this report.
- Luca working tree: clean (fresh clone, untouched).
- No builds, typecheck, lint, `bun run audit:load`, migrations, or application execution were performed.
- No PRD, technical plan, configuration, or source file was modified.

## Risks or Limitations

- Luca is version 0.5 of a private project; later versions may differ.
- MCP tool count: README claims 50 tools; source inspection found a tool registry with 19 tool definitions in `src/mcp/tools.ts`. The discrepancy is noted but does not change the verdict.
- The audit examined the current Luca source only; no runtime execution or test run was performed, so the "520 passing" claim is reported as documented, not verified by execution.

## Deferred Work

- Author the native accounting-layer PRD for BIGDROPS, using Luca's chain/period/idempotency mechanics as reference.
- Build the fixed-asset register and capital-allowance input model before CIT implementation.
- Keep Nigerian statutory computation in the BIGDROPS tax domain.