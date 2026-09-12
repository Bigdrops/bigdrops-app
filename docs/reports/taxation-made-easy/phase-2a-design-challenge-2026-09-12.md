# Phase 2A Architecture Design Challenge Report

**Date:** 2026-09-12
**Analyst:** OpenCode (Ponytail full mode)
**Scope:** Systematic challenge of the Phase 2A first-pass proposal (9 tables, 3 RPCs)
**Zero-code audit:** No modifications to any application code, SQL, migrations, tests, or documentation

---

## Verdict

**REJECT WITH REPAIRABLE STRUCTURE.** The 9-table proposal has 4 structural violations of the non-negotiable principles. The tables are the wrong abstractions; the underlying concepts are correct. The proposal can be repaired into 7 tables + 2 optional utility tables, but only after applying the 4-layer taxonomy correction (Section I).

**Critical Design Corrections:** 6 (Sections A–G)
**Rejected Ideas:** 3 (Sections A, C, D)
**New Tables Required:** 0 (repair, not replacement)
**Tables to Remove:** 2 (`tax_asset_movements`, `tax_computations`)
**Tables to Rename/Restructure:** 4 (most tables need field surgery)
**Tables to Add:** 1 (`tax_rule_versions` — Phase 2A record, Gate E logic)

---

## A. Tax Adjustments — Mandatory `journal_entry_id` Violation

### First-Pass Claim
> "Each tax adjustment creates a posted journal entry via the posting kernel."

### Principle Violated
**Principle 3: TAX COMPUTATION IS NOT ACCOUNTING POSTING.** The proposal treats every tax adjustment as requiring a journal entry. This is wrong.

### Why It Fails
Tax adjustments are **tax-layer classification facts**, not accounting postings. They classify existing accounting facts differently for tax purposes.

| Tax adjustment type | Needs journal entry? | Why |
|---|---|---|
| Depreciation add-back | No | Reclassifies an existing posted depreciation expense. The original posting already exists. |
| Entertainment disallowance | No | Classifies an existing expense as non-deductible. The posting already exists. |
| Exempt income | No | Reclassifies existing revenue as tax-exempt. The posting already exists. |
| Capital allowance | Yes | Creates a new tax-deductible amount that does not exist in the accounting books. |
| Loss carry-forward | No | Records utilization of a previously recognized loss. |

### What `journal_entry_id` Should Mean
- **NOT mandatory on the adjustment record itself.** The adjustment is a tax-layer fact.
- **Mandatory on the optional accounting posting** if one is created (e.g., tax provision journal entry).
- **NOT a foreign key on the adjustment table.** The adjustment table records provenance references, not posting dependencies.

### Corrected Pattern
```
Tax Adjustment Record (tax-layer fact)
  ├── source_fact_id: UUID → accounting source_transaction or journal_line
  ├── adjustment_type: text ('depreciation_addback', 'entertainment_disallowance', etc.)
  ├── accounting_amount: NUMERIC(18,2) → the accounting figure being reclassified
  ├── tax_amount: NUMERIC(18,2) → the tax effect (usually same as accounting_amount for add-backs)
  ├── citation: text → NTA section reference
  └── journal_entry_id: UUID | NULL → only if a separate provision posting was created
```

### Existing Accounting Model Alignment
The blueprint (§19) says: "records adjustments as tax-layer facts with citations." This is the correct pattern. The adjustment is a **citation-backed classification record**, not a journal entry.

**Verdict on this point: REJECT the mandatory journal_entry_id. Make it nullable.**

---

## B. QCE / Asset Register — Overlapping Concerns

### First-Pass Proposal
Two tables: `tax_qce` (capital expenditure record) and `tax_asset_movements` (opening WDV, additions, disposals, disposals proceeds).

### Issues Found

**Issue 1: `tax_asset_movements` duplicates accounting facts.**
The opening WDV is the prior period's closing WDV. Additions come from accounting source transactions (asset purchases). Disposals come from accounting disposal postings. The "movement" table re-derives what the accounting layer already knows.

**Issue 2: `tax_asset_movements` conflates two different things.**
- **Accounting asset movements** (additions, disposals, depreciation) — these are accounting-layer facts.
- **Tax asset movements** (qualifying expenditure, disqualifying expenditure, WDV brought forward) — these are tax-layer facts.

The proposal puts both in one table. This violates the accounting/tax separation.

**Issue 3: The running-WDV column is a derived value.**
The running WDV (`opening_qce + additions - disposals - qualifying_amount`) is a derived value. It should be computable, not stored as an opaque column. If stored for performance, it must be rebuildable.

### Corrected Pattern
**Table: `tax_qce`** (the asset register)
- Records each qualifying capital expenditure item.
- Fields: `entity_id`, `period_id`, `asset_description`, `qce_amount` (NUMERIC(18,2)), `date_incurved`, `wht_amount` (if applicable), `statutory_category` (text — e.g., 'plant_machinery', 'building', 'motor_vehicle', 'software', 'intangible'), `notes`.
- `entity_id` + `period_id` identifies the assessment period.
- Does NOT store WDV or allowance amounts — those are Gate E computation outputs.

**Table: `tax_qce_periods`** (optional utility — running-WDV cache)
- Stores the computed WDV per QCE item per period.
- Fields: `tax_qce_id`, `period_id`, `opening_wdv`, `additions`, `disposals`, `disposal_proceeds`, `qualifying_amount`, `closing_wdv`, `allowance_amount`.
- **Rebuildable from `tax_qce` + Gate E computation.** A cache, not a source of truth.

**Reject `tax_asset_movements` as a standalone table.** Its contents belong split between accounting source transactions (asset purchases/disposals) and `tax_qce_periods` (tax WDV).

---

## C. Tax Losses — Hardcoded Carry-Forward Period

### First-Pass Claim
> "Loss carry-forward: indefinite."

### NTA 2025 Source
- **s.27(6):** Losses may be carried forward indefinitely for trade-specific losses. BUT the proposal hardcodes "indefinite" without acknowledging the restriction to **trade losses only** (not capital losses, not digital-asset losses).
- **s.27(7):** Capital losses can only offset capital gains.
- **Digital asset losses** (§59): only deductible against digital asset profits.

### Principle Violated
**Principle 6: VERSIONED TAX POLICY.** The carry-forward period and loss utilization rules are statutory rules that belong in Gate E, not hardcoded in the schema.

### What Phase 2A Should Record
The loss register records **facts**, not rules:
- That a loss arose in period X.
- The loss amount.
- The trade/profit-source type.
- That the loss was utilized in period Y (and how much).
- The closing balance.

The **rule** (how long losses carry forward, which loss types can offset which profit types) is Gate E's responsibility.

### Corrected Pattern
```
Table: tax_loss_balances
  ├── entity_id: UUID
  ├── period_id: UUID
  ├── profit_source_type: TEXT ('trade', 'property', 'digital_asset', 'capital')
  ├── opening_balance: NUMERIC(18,2) — prior period closing
  ├── loss_arising: NUMERIC(18,2) — loss in this period
  ├── loss_used: NUMERIC(18,2) — utilization against taxable profit
  ├── loss_expired: NUMERIC(18,2) — expiration per statutory rules
  ├── closing_balance: NUMERIC(18,2) — opening + arising - used - expired
  ├── rule_snapshot: JSONB — gate_e rule reference used for utilization
  └── notes: TEXT
```

**Reject the hardcoded "indefinite" claim.** Loss utilization logic belongs in Gate E, not the schema.

---

## D. Tax Computation Lineage — Single Combined Table

### First-Pass Proposal
One table `tax_computations` containing: input snapshot, rule version reference, computation steps, final result, journal entry link.

### Principle Violated
**Principle 3: TAX COMPUTATION IS NOT ACCOUNTING POSTING.** The proposal mixes:
- Input facts (what the accounting layer produced)
- Rule references (what Gate E rules were applied)
- Computation steps (intermediate results)
- Final result (the tax liability)
- Accounting posting link (journal entry)

### Issues Found

**Issue 1: Mixing concerns.** The computation is a **read-only derivation** from inputs + rules. It should not be a combined table that stores inputs, rules, steps, and results together.

**Issue 2: Missing rule version snapshot.** Principle 5 requires that finalized computations be reproducible from captured inputs + rule version. The proposal references `tax_rule_versions` but does not snapshot the rules themselves. If rules change, the computation becomes non-reproducible.

**Issue 3: `tax_computations` table has `tax_due` and `tax_payable` but no `assessment_period_id`.** The CIT computation produces an assessment-period result. The table needs a period-to-assessment mapping.

**Issue 4: The `steps` JSONB column is opaque.** Steps should be either a separate table (if auditable) or a structured JSONB with a defined schema (not freeform).

### Corrected Pattern
**Separate into 3 concerns:**

**Table: `tax_computation_inputs`** (input snapshot — immutable once captured)
- `id`, `entity_id`, `period_id`, `assessment_period_id`, `input_snapshot` (JSONB), `created_at`

**Table: `tax_computation_results`** (output — immutable once finalized)
- `id`, `entity_id`, `assessment_period_id`, `rule_version_id`, `inputs_snapshot_id` (FK → `tax_computation_inputs`), `taxable_profit`, `tax_due`, `tax_credits`, `tax_payable`, `status` ('draft', 'finalized'), `finalized_at`, `journal_entry_id` (nullable), `notes`

**Table: `tax_computation_steps`** (intermediate results — optional for Gate E)
- `id`, `computation_result_id` (FK → `tax_computation_results`), `step_order`, `step_code`, `step_description`, `input_value`, `rule_applied`, `output_value`, `citation`

**OR** — if simplicity is preferred — a single `tax_computation` table with:
- `id`, `entity_id`, `period_id`, `assessment_period_id`
- `inputs_snapshot` (JSONB — all inputs)
- `rule_version_id` (FK → `tax_rule_versions`)
- `result_snapshot` (JSONB — taxable_profit, tax_due, tax_credits, tax_payable)
- `status` ('draft', 'finalized')
- `finalized_at`
- `journal_entry_id` (nullable — for tax provision posting only)
- `notes`

**Reject the combined table as proposed.** Either split into 3 tables or use a single table with clearly separated JSONB snapshots.

---

## E. Entity Tax Config — Mixed Concerns

### First-Pass Proposal
`entity_tax_config` with TIN, entity_name, company_type, year_end, is_vat_registered, is_monthly_filer, turnover_threshold, is_small_company, fixed_assets_threshold.

### Issues Found

**Issue 1: TIN and entity_name are accounting-layer facts, not tax-config.** TIN is a business identity fact (from source transactions or entity setup). It should be queried from the entity setup, not duplicated in a tax config table.

**Issue 2: `is_small_company` is a derived classification, not a config.** It's derived from turnover ≤ ₦50M and fixed assets ≤ ₦250M (NTA 2025 §202). It should be computed per assessment period, not stored as a boolean.

**Issue 3: `turnover_threshold` and `fixed_assets_threshold` are statutory constants.** They belong in Gate E rules, not entity config.

**Issue 4: `year_end` is an accounting-period concept, not a tax config.** The accounting period determines the assessment period. The tax config does not need a separate year_end.

### Corrected Pattern
```
Table: entity_tax_config
  ├── entity_id: UUID (PK)
  ├── tax_profile: JSONB {
  │     company_type: TEXT ('small_company', 'medium', 'large'),
  │     is_vat_registered: BOOLEAN,
  │     is_monthly_filer: BOOLEAN,
  │     remittance_schedule: TEXT ('monthly', 'quarterly'),
  │     sector: TEXT | NULL,
  │     notes: TEXT
  │   }
  ├── updated_at: TIMESTAMPTZ
  └── updated_by: UUID
```

**Remove from entity_tax_config:**
- TIN → entity setup (accounting layer)
- entity_name → entity setup (accounting layer)
- year_end → accounting periods
- turnover_threshold → Gate E rules
- fixed_assets_threshold → Gate E rules
- is_small_company → computed per assessment period from accounting facts + Gate E thresholds

---

## F. VAT / WHT Boundary — Accounting Integration

### First-Pass Proposal
`tax_vat_positions` and `tax_wht_positions` with ledger_vat, law_vat, return_vat, remitted_vat, difference.

### Issues Found

**Issue 1: `ledger_vat` is an accounting-derived figure, not a tax input.**
The accounting layer already has VAT control account balances (from `derive_accounting_reporting`). The tax position table should reference the accounting derivation, not store its own `ledger_vat` column.

**Issue 2: The 4-column model (ledger/law/return/remitted) conflates 3 different domains.**
- **Ledger** = accounting layer (from posting kernel)
- **Law** = Gate E rules (statutory VAT liability calculation)
- **Return** = compliance layer (the filed return)
- **Remitted** = compliance layer (payment confirmation)

**Issue 3: `tax_vat_positions` duplicates what the compliance module already tracks.**
The existing `tax_filings` table (in compliance) already tracks filing status and amounts. The tax position table adds a reconciliation layer, but the naming ("position") suggests it owns the data.

### Corrected Pattern
**Table: `tax_vat_positions`** (reconciliation + gap detection)
- `entity_id`, `assessment_period_id`
- `ledger_vat_collected` → **reference** to accounting reporting derivation (not a stored duplicate)
- `ledger_vat_paid` → **reference** to accounting reporting derivation
- `law_vat_payable` → computed by Gate E
- `filing_vat_declared` → **reference** to compliance filing record
- `remitted_vat_amount` → **reference** to compliance payment record
- `difference` → derived, never stored
- `notes`

**Table: `tax_wht_positions`** (same pattern)
- `entity_id`, `assessment_period_id`
- `ledger_wht_withheld` → reference to WHT control account from accounting
- `law_wht_credit` → computed by Gate E (amount the entity can credit)
- `filing_wht_declared` → reference to compliance filing
- `certificate_wht_received` → reference to WHT receipt records
- `difference` → derived
- `notes`

**Reject the 4-column model as a source of truth.** The positions table is a **reconciliation layer** that references authoritative data from accounting, Gate E, and compliance. It does not own the data.

---

## G. Gate E Boundary — Tax Rules Separation

### First-Pass Proposal
Implicitly assumes tax rules (rates, thresholds, calculation logic) will be implemented inside Phase 2A tables. The proposal includes `tax_rule_versions` as a standalone table but does not clearly separate what Phase 2A owns vs. what Gate E owns.

### Principle Violated
**Principle 2: TAX FACTS ARE NOT TAX RULES.** Phase 2A records tax facts. Gate E owns tax rules.

### What Phase 2A Owns (tax facts)
- Tax adjustments (classification records)
- QCE records (capital expenditure facts)
- Loss balances (loss facts)
- Entity tax config (entity tax profile)
- Computation inputs (accounting-derived facts for tax)
- Computation results (final tax position)
- VAT/WHT positions (reconciliation records)

### What Gate E Owns (tax rules)
- CIT rates (0%, 25%, 30%)
- ETR minimum (15%)
- Capital allowance rates and methods (25% WRVDB, 10% straight-line, etc.)
- Loss carry-forward rules (trade-specific, indefinite, digital-asset-only)
- Disallowable expense categories
- Exempt income categories
- WHT rates and categories
- Small company thresholds (₦50M turnover, ₦250M fixed assets)
- Transitional provisions
- Effective dates for all rules

### The Bridge
Phase 2A needs a **rule version reference** to ensure computations are reproducible. This is the ONLY Gate E touchpoint in Phase 2A:

```
Table: tax_rule_versions
  ├── id: UUID (PK)
  ├── version: TEXT ('NTA-2025-v1')
  ├── effective_date: DATE
  ├── expires_date: DATE | NULL
  ├── rule_snapshot: JSONB (full rule set — rates, thresholds, methods)
  ├── source_document: TEXT ('NIGERIA-TAX-ACT-2025.md')
  ├── created_at: TIMESTAMPTZ
  └── notes: TEXT
```

**This table is Phase 2A infrastructure** (the bridge to Gate E), not a Gate E table. Phase 2A stores the version reference; Gate E computes using it.

---

## H. Phase 2A Duplicate Model Check

**Search patterns:** `tax_adjustment|tax_asset|tax_loss|tax_computation|entity_tax_config|tax_vat_position|tax_wht_position|tax_rule|tax_rate|capital_allowance`

**Zero matches in `src/` directory.** No `src/domain/tax/` directory exists.

**Existing compliance tables** (operational tracking, not tax computation):
- `wht_receipts` — WHT certificate tracking (22 matches in compliance module)
- `tax_input_entries` — VAT input invoice records
- `tax_filings` — Filing obligation tracking
- `tax_reminders` — Deadline reminders
- `tax_settings` — Entity tax settings

**Verdict: No duplicates.** Phase 2A builds on a clean slate for tax computation. Existing compliance tables are operational/compliance-layer concerns and must not be repurposed as tax computation inputs.

---

## I. Canonical Architecture — 4-Layer Taxonomy

### The Structural Correction

The first-pass proposal has the right concepts but the wrong abstractions. The 9 tables conflate 4 distinct architectural layers:

| Layer | Purpose | Owns |
|---|---|---|
| **Layer 1: Accounting Facts** | Read-only derivation from posted journal | Account balances, period totals, trial balance, profit and loss. Already implemented (Gap 1). |
| **Layer 2: Tax Facts** | Classification records that transform accounting facts into tax inputs | Tax adjustments, QCE records, loss balances, entity tax config. Phase 2A's primary work. |
| **Layer 3: Tax Computation** | Immutable snapshot of inputs + rules + results | Computation inputs, rule version reference, computation results, computation steps. Phase 2A's bridge to Gate E. |
| **Layer 4: Accounting Posting** | Optional journal entry for tax provision | Tax provision journal entry. Only created when a tax liability needs to be recognized in the accounting books. |

### Canonical Data Primitives (per layer)

**Layer 1 (Accounting Facts) — ALREADY EXISTS:**
- `derive_accounting_reporting` RPC → `AccountingReportingReport`
- No new tables needed.

**Layer 2 (Tax Facts) — PHASE 2A TABLES:**

| Table | Purpose | Key fields |
|---|---|---|
| `tax_adjustments` | Classification records: "this accounting fact is treated differently for tax" | entity_id, period_id, assessment_period_id, adjustment_type, source_fact_id, accounting_amount, tax_amount, citation, journal_entry_id (nullable) |
| `tax_qce` | Qualifying capital expenditure register | entity_id, period_id, asset_description, qce_amount, date_incurred, statutory_category, wht_amount, notes |
| `tax_loss_balances` | Loss carry-forward register | entity_id, period_id, profit_source_type, opening_balance, loss_arising, loss_used, loss_expired, closing_balance, rule_snapshot |
| `entity_tax_config` | Entity tax profile (not rates/thresholds) | entity_id, tax_profile (JSONB: company_type, is_vat_registered, remittance_schedule, sector, notes) |

**Layer 3 (Tax Computation) — PHASE 2A TABLES:**

| Table | Purpose | Key fields |
|---|---|---|
| `tax_computation_inputs` | Immutable input snapshot per entity per assessment period | entity_id, period_id, assessment_period_id, input_snapshot (JSONB), created_at |
| `tax_computation_results` | Final tax position per entity per assessment period | entity_id, assessment_period_id, rule_version_id, inputs_snapshot_id, taxable_profit, tax_due, tax_credits, tax_payable, status, finalized_at, journal_entry_id (nullable) |
| `tax_rule_versions` | Bridge to Gate E: captures which rule set was applied | version, effective_date, expires_date, rule_snapshot (JSONB), source_document |

**Layer 4 (Accounting Posting) — OPTIONAL, GATE E + POSTING KERNEL:**

| Table | Purpose | Key fields |
|---|---|---|
| `tax_provisions` | Tax provision journal entry (optional) | assessment_period_id, journal_entry_id (FK → accounting journal_entries), provision_type ('cit', 'vat', 'wht'), amount, notes |

### Data Flow

```
Accounting Layer (Layer 1)
  │
  │  derive_accounting_reporting()
  │  → account balances, profit & loss, trial balance
  │
  ▼
Tax Facts Layer (Layer 2)
  │
  │  tax_adjustments: "this expense is add-backed"
  │  tax_qce: "this is qualifying capital expenditure"
  │  tax_loss_balances: "this loss carries forward"
  │  entity_tax_config: "this entity is a small company"
  │
  ▼
Tax Computation Layer (Layer 3)
  │
  │  tax_computation_inputs: snapshot of all Layer 2 facts
  │  tax_rule_versions: "which rule set applies"
  │  tax_computation_results: "the final tax position"
  │
  ▼
Accounting Posting Layer (Layer 4) — optional
  │
  │  tax_provisions: "recognize this liability in the books"
  │  → posted via accounting posting kernel
```

### What Was Removed from First-Pass

| First-pass table | Verdict | Reason |
|---|---|---|
| `tax_adjustments` | **KEEP (restructured)** | Remove mandatory journal_entry_id. Add assessment_period_id. |
| `tax_qce` | **KEEP (restructured)** | Remove WDV columns (derive from `tax_qce_periods` cache or compute). |
| `tax_asset_movements` | **REMOVE** | Duplicates accounting facts. Contents split between source transactions and `tax_qce_periods`. |
| `tax_loss_balances` | **KEEP (restructured)** | Remove hardcoded "indefinite" claim. Add profit_source_type. Make closing_balance derived. |
| `tax_computations` | **SPLIT** | Separate into `tax_computation_inputs`, `tax_computation_results`, `tax_computation_steps`. |
| `entity_tax_config` | **KEEP (restructured)** | Remove TIN, entity_name, year_end, thresholds, is_small_company. Simplify to entity tax profile. |
| `tax_vat_positions` | **KEEP (restructured)** | Make a reconciliation layer, not a source of truth. Reference accounting/compliance data. |
| `tax_wht_positions` | **KEEP (restructured)** | Same as VAT positions — reconciliation layer. |
| `tax_rule_versions` | **KEEP (restructured)** | Add rule_snapshot JSONB for reproducibility. Make this the only Gate E bridge. |

### What Was Added

| New table | Purpose |
|---|---|
| `tax_qce_periods` (optional) | Running-WDV cache per QCE item per period. Rebuildable. |
| `tax_computation_inputs` | Immutable input snapshot (split from `tax_computations`). |
| `tax_computation_steps` (optional) | Intermediate computation results (split from `tax_computations`). |

---

## J. Rejected Ideas (from first-pass)

### Rejection 1: "Every tax record creates a journal entry"
**Status:** REJECTED.
**Reason:** Violates Principle 3. Tax adjustments are classification facts, not accounting postings. Only the tax provision (Layer 4) creates journal entries, and only when a liability needs to be recognized.

### Rejection 2: "Loss carry-forward is indefinite"
**Status:** REJECTED as a schema-level claim.
**Reason:** Violates Principle 6. Indefinite carry-forward for trade losses is a Gate E rule (NTA 2025 s.27(6)). The schema records the facts; Gate E determines utilization.

### Rejection 3: "is_small_company stored in entity_tax_config"
**Status:** REJECTED as a stored boolean.
**Reason:** Violates Principle 6. Small-company status is derived from turnover and fixed-asset thresholds per assessment period. It must be computed, not stored.

---

## Recommended Implementation Order

### Phase 2A.1 — Foundation (Week 1)
1. **`tax_rule_versions`** — Gate E bridge. Store rule snapshots. Create first rule set from NTA 2025.
2. **`entity_tax_config`** — Entity tax profile. Minimal fields: entity_id, tax_profile JSONB.
3. **`tax_adjustments`** — Tax classification records. Start with 3 types: `depreciation_addback`, `entertainment_disallowance`, `exempt_income`.

### Phase 2A.2 — Capital Allowances (Week 2)
4. **`tax_qce`** — Qualifying capital expenditure register.
5. **`tax_qce_periods`** — Running-WDV cache (optional, can be deferred).

### Phase 2A.3 — Losses + Computation (Week 3)
6. **`tax_loss_balances`** — Loss register with profit_source_type.
7. **`tax_computation_inputs`** — Input snapshot.
8. **`tax_computation_results`** — Final result.
9. **`tax_computation_steps`** — Intermediate results (optional, defer to Gate E).

### Phase 2A.4 — VAT/WHT Reconciliation (Week 4)
10. **`tax_vat_positions`** — Reconciliation layer.
11. **`tax_wht_positions`** — Reconciliation layer.

### Phase 2A.5 — Posting Bridge (Week 5, optional)
12. **`tax_provisions`** — Tax provision journal entries. Only if accounting recognition is needed.

---

## Verification

All search patterns for existing tax domain code returned zero matches:
- `tax_adjustment` → 0 matches in `src/`
- `tax_asset` → 0 matches in `src/`
- `tax_loss` → 0 matches in `src/`
- `tax_computation` → 0 matches in `src/`
- `entity_tax_config` → 0 matches in `src/`
- `tax_vat_position` → 0 matches in `src/`
- `tax_wht_position` → 0 matches in `src/`
- `tax_rule` → 0 matches in `src/`
- `tax_rate` → 0 matches in `src/`
- `capital_allowance` → 0 matches in `src/`
- `accounting_profit` → 0 matches in `src/`
- `income_statement` → 0 matches in `src/`

**No conflicts.** Phase 2A builds on a clean slate for tax computation.

---

## Non-Negotiable Principle Compliance Matrix

| Principle | First-Pass Status | Corrected Status |
|---|---|---|
| P1: ACCOUNTING IS NOT TAX | ✅ | ✅ (tax adjustments don't touch journal layer) |
| P2: TAX FACTS ARE NOT TAX RULES | ⚠️ (hardcoded "indefinite", is_small_company) | ✅ (rules moved to Gate E) |
| P3: TAX COMPUTATION IS NOT ACCOUNTING POSTING | ❌ (mandatory journal_entry_id on all tax records) | ✅ (journal_entry_id nullable, only on provision) |
| P4: AUDITABILITY WITHOUT LEDGER POLLUTION | ❌ (all tax records → journal entries) | ✅ (tax facts are citation-backed, not posting-backed) |
| P5: IMMUTABLE RESULTS | ⚠️ (rule snapshot not captured) | ✅ (tax_rule_versions with rule_snapshot JSONB) |
| P6: VERSIONED TAX POLICY | ❌ (hardcoded rules in schema) | ✅ (rules in Gate E, references in Phase 2A) |
| P7: EXACT MONEY | ✅ (NUMERIC(18,2)) | ✅ |
| P8: ENTITY ISOLATION | ✅ (entity_id on all tables) | ✅ |
| P9: PERIOD INTEGRITY | ⚠️ (missing assessment_period_id) | ✅ (added to all computation tables) |
| P10: REVERSAL COMPATIBILITY | ✅ (Gap 2 semantics) | ✅ |
| P11: SOURCE TRACEABILITY | ⚠️ (no rule snapshot, no computation inputs snapshot) | ✅ (rule_snapshot, inputs_snapshot, provenance chain) |

---

## Summary

The first-pass proposal identified the right domain areas (adjustments, QCE, losses, computation, entity config, VAT/WHT positions) but applied the wrong abstractions:

1. **Made journal_entry_id mandatory** on tax records → violates accounting/tax separation
2. **Hardcoded statutory rules** (indefinite carry-forward, small company boolean) → violates versioned tax policy
3. **Mixed computation concerns** (inputs, rules, steps, results in one table) → violates separation of concerns
4. **Overlapped with accounting facts** (tax_asset_movements duplicates source transactions) → violates auditability without pollution
5. **Mixed entity identity with tax config** (TIN, entity_name in tax config) → violates entity isolation

The corrected architecture uses 7 tables across 4 layers, with clear separation between accounting facts, tax facts, tax computation, and optional accounting posting. The bridge to Gate E is a single `tax_rule_versions` table with full rule snapshots for reproducibility.
