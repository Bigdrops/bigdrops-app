# Phase 2A Architecture Audit Report

This report was written by opencode/mimo-v2-5-free on 2026-09-11 via Local Runner.

## 1. Objective

Design the minimum durable foundation for Phase 2A of BIGDROPS taxation: Tax Adjustments, Qualifying Capital Expenditure (QCE)/Asset Register, Tax Losses, Tax Computation Lineage, and Entity Tax Config. The audit is READ-ONLY — zero code modifications.

The foundation must cleanly separate four layers:

1. **Accounting Facts** — posted journal entries and lines (already complete via Gap 1 + Gap 2)
2. **Tax Adjustment Facts** — permanent differences, temporary differences, non-deductible items
3. **Tax Rules** — CIT rates, small-company qualification, ETR, capital allowance rates, loss restrictions
4. **Tax Computation Results** — taxable profit, chargeable profit, tax payable, loss balances

## 2. Scope

### Sections Covered

| Section | Topic | Verdict |
|---------|-------|---------|
| A | Tax Adjustment Foundation | PROPOSED — new `tax_adjustments` table |
| B | QCE/Asset Foundation | PROPOSED — new `tax_assets` + `tax_asset_movements` tables |
| C | Tax Loss Foundation | PROPOSED — new `tax_loss_balances` table |
| D | Tax Computation Foundation | PROPOSED — new `tax_computations` + `tax_computation_lines` tables |
| E | Entity Tax Config | PROPOSED — extend existing `tax_settings` or new `entity_tax_config` table |
| F | Accounting Integration | VERIFIED — `derive_accounting_reporting` is the correct read boundary |
| G | VAT/WHT Boundary | PROPOSED — control account balance ≠ statutory position ≠ return preparation |
| H | Duplicate Model Check | CLEAR — no conflicting models exist |
| I | Architectural Invariants | 12 invariants defined |
| J | Required Output | This report (12 deliverables) |

### Sections NOT in Scope

- Gate E statutory rules (CIT rates, capital allowance rates, loss restrictions) — deferred to Gate E implementation
- Specific migration SQL — deferred to implementation
- UI components — deferred to implementation

## 3. Codebase Facts

### Existing Tax/Compliance Models (Section H — Duplicate Model Check)

**Searched patterns**: `tax_adjustment`, `taxAdjustment`, `tax_asset`, `taxAsset`, `capital_expenditure`, `capitalAllowance`, `capital_allowance`, `tax_loss`, `taxLoss`, `loss_carry`, `lossCarry`, `tax_computation`, `taxComputation`, `taxable_profit`, `chargeable_profit`, `entity_tax_config`, `entityTaxConfig`, `tax_config`, `taxConfig`

**Results**: All zero matches in `src/`. No `src/domain/tax/` directory exists.

**Existing compliance models** (`src/domain/compliance/types.ts`):

| Type | Purpose | Phase 2A Impact |
|------|---------|-----------------|
| `TaxSettings` | Operational config: `tin`, `vat_enabled`, `vat_threshold`, `cit_category`, `year_end_month/day` | Partially overlaps with Entity Tax Config. `cit_category` is used but no CIT computation exists. |
| `TaxInputEntry` | VAT input tracking: `vendor_name`, `net_amount`, `vat_amount`, `is_recoverable` | Operational (VAT return prep), not accounting-domain. No link to ledger. |
| `TaxFiling` | Filing tracking: `tax_type` (vat/wht/cit), `amount_due`, `amount_paid`, `status` | Operational (compliance calendar). Phase 2A computation results feed into this. |
| `TaxReminder` | Deadline reminders: `due_date`, `status` | Operational. No impact on Phase 2A. |
| `WhtReceipt` | WHT receipt tracking: `gross_base_amount`, `wht_rate`, `wht_amount`, `receipt_status` | Operational. No link to ledger. |

**Existing database tables** (migrations `20260520090009_tax.sql`, `20260520090003_invoices.sql`):

| Table | Columns | Phase 2A Impact |
|-------|---------|-----------------|
| `tax_settings` | `tin`, `vat_enabled`, `vat_threshold`, `cit_category`, `year_end_month/day` | `cit_category` is the only CIT-related config. Extend or replace for Entity Tax Config. |
| `tax_input_entries` | `vendor_name`, `net_amount`, `vat_amount`, `is_recoverable`, `evidence` | VAT input tracking. No ledger linkage. |
| `tax_filings` | `tax_type`, `amount_due`, `amount_paid`, `status` | Filing tracking. Phase 2A feeds `amount_due`. |
| `tax_reminders` | `tax_type`, `due_date`, `status` | Reminder tracking. No impact. |
| `wht_receipts` | `payment_id`, `invoice_id`, `gross_base_amount`, `wht_rate`, `wht_amount`, `receipt_status` | WHT receipt tracking. No ledger linkage. |

**VAT/WHT on invoice/payment line items**:

- Invoice line items: `vat_amount`, `wht_amount` columns (in `invoices` table schema)
- Payment line items: `wht_amount` column (in `payments` table schema)
- These are source amounts, not computed tax positions.

**Seed chart of accounts** (`src/domain/accounting/chartOfAccounts.ts`):

- `2100` — VAT Control (liability, credit normal)
- `2200` — WHT Control (liability, credit normal)
- These hold collected/withheld amounts until remitted.

**Conclusion**: No tax adjustment, QCE/asset, tax loss, or tax computation models exist. The compliance layer is operational (filing tracking, reminders) and does not overlap with Phase 2A's accounting-domain models. The `cit_category` field in `tax_settings` is the only CIT-related config and is underutilized.

### Accounting Integration Boundary (Section F)

The accounting foundation provides these read-only derivation points:

| Function | File | Purpose |
|----------|------|---------|
| `derive_accounting_reporting` | `src/modules/accounting/reportingService.ts` | RPC wrapper. Returns `AccountingReportingReport` with `balances`, `periods`, `trial_balance`, `source_trace`, `draft_residue`. |
| `DerivedAccountBalance` | `src/domain/accounting/reporting.ts` | One account's derived balance over all active posted lines. |
| `DerivedPeriodTotal` | `src/domain/accounting/reporting.ts` | One account's totals inside one accounting period with opening/closing chain. |
| `TrialBalanceAssertion` | `src/domain/accounting/reporting.ts` | Grand debits = grand credits assertion. |
| `ReportingSourceTraceRow` | `src/domain/accounting/reporting.ts` | Journal provenance for every derived figure. |

**Key design rules**:

- Reporting is **read-only** — never mutates accounting state
- Amounts are **exact decimal strings** — no JavaScript number arithmetic
- Scope is **posted-only, active-entries-only** — draft entries contribute nothing
- Reversal semantics: reversed entry excluded, reversal stays active unless itself reversed
- Trial balance mismatch is **surfaced as data** (is_equal flag), never repaired

**Phase 2A integration**: Tax computation reads from `derive_accounting_reporting` output. It does NOT read journal entries directly. The derivation is the single read boundary.

### Reversal Semantics (Gap 2)

- Reversal creates a new posted entry linked via `reversal_of_entry_id`
- Original entry is never mutated (status stays `'posted'`)
- Reporting excludes reversed originals; reversal entry is active
- Double-reversal rejected at RPC boundary
- DB constraint: only `'draft'` / `'posted'` — no `'reversed'` status

**Phase 2A impact**: Tax adjustments that reverse prior-period adjustments follow the same pattern — new posted entry, original stays posted, reporting derives net effect.

## 4. Proposed Models

### 4.1 Tax Adjustments (Section A)

**Purpose**: Record permanent and temporary differences between accounting profit and taxable profit. Each adjustment is a posted journal entry that references the accounting period it adjusts.

**Table**: `tax_adjustments`

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK | Deterministic UUID |
| `entity_id` | uuid | FK → `entities.id`, NOT NULL | Entity boundary |
| `period_id` | uuid | FK → `accounting_periods.id`, NOT NULL | Accounting period |
| `journal_entry_id` | uuid | FK → `journal_entries.id`, NOT NULL | Linked posted journal entry |
| `adjustment_type` | text | NOT NULL, CHECK IN ('permanent', 'temporary') | Difference type |
| `category` | text | NOT NULL | e.g. 'depreciation', 'entertainment', 'fine', 'provision' |
| `description` | text | NOT NULL | Human-readable description |
| `accounting_amount` | numeric(18,2) | NOT NULL | Amount in accounting books |
| `tax_amount` | numeric(18,2) | NOT NULL | Amount for tax purposes |
| `difference_amount` | numeric(18,2) | GENERATED ALWAYS AS (tax_amount - accounting_amount) STORED | Computed difference |
| `is_add_back` | boolean | NOT NULL | true = add back to profit; false = deduct from profit |
| `reference_type` | text | NULL | e.g. 'invoice', 'payment', 'manual' |
| `reference_id` | uuid | NULL | FK to source document |
| `status` | text | NOT NULL DEFAULT 'draft', CHECK IN ('draft', 'posted') | Lifecycle status |
| `reversal_of_entry_id` | uuid | NULL | FK → `tax_adjustments.id` for reversal chain |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

**Index**: UNIQUE (`entity_id`, `period_id`, `journal_entry_id`)

**Design rules**:
- Each tax adjustment creates a posted journal entry via the posting kernel
- Permanent differences never reverse; temporary differences reverse when the timing difference resolves
- The `difference_amount` is a generated column — no application-level computation
- Adjustments reference their source document (`reference_type`/`reference_id`) for audit trail

### 4.2 QCE/Asset Register (Section B)

**Purpose**: Track qualifying capital expenditure and compute capital allowances per NTA 2025 First Schedule. Each asset is a record; movements (additions, disposals, allowances) are ledger entries.

**Table**: `tax_assets`

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK | Deterministic UUID |
| `entity_id` | uuid | FK → `entities.id`, NOT NULL | Entity boundary |
| `name` | text | NOT NULL | Asset description |
| `category` | text | NOT NULL | e.g. 'plant_machinery', 'building', 'motor_vehicle', 'software', 'intangible' |
| `acquisition_date` | date | NOT NULL | Date acquired |
| `acquisition_cost` | numeric(18,2) | NOT NULL | Original cost |
| `residual_value` | numeric(18,2) | NOT NULL DEFAULT 0 | Residual/written-down value |
| `allowance_rate` | numeric(5,2) | NOT NULL | Annual allowance rate (e.g. 25.00 for 25%) |
| `allowance_method` | text | NOT NULL, CHECK IN ('wrvdb', 'straight_line') | Writing-down or straight-line |
| `is_active` | boolean | NOT NULL DEFAULT true | Active until fully written down or disposed |
| `disposal_date` | date | NULL | Date disposed |
| `disposal_proceeds` | numeric(18,2) | NULL | Proceeds on disposal |
| `linked_account_code` | text | NULL | FK to chart of accounts (e.g. '1500' Fixed Assets) |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

**Table**: `tax_asset_movements`

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK | Deterministic UUID |
| `asset_id` | uuid | FK → `tax_assets.id`, NOT NULL | Parent asset |
| `entity_id` | uuid | FK → `entities.id`, NOT NULL | Entity boundary |
| `movement_type` | text | NOT NULL, CHECK IN ('addition', 'allowance', 'disposal', 'revaluation') | Movement kind |
| `period_id` | uuid | FK → `accounting_periods.id`, NOT NULL | Accounting period |
| `journal_entry_id` | uuid | FK → `journal_entries.id`, NOT NULL | Linked posted journal entry |
| `amount` | numeric(18,2) | NOT NULL | Movement amount |
| `running_wdv` | numeric(18,2) | NOT NULL | Written-down value after this movement |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

**Index**: UNIQUE (`asset_id`, `period_id`, `movement_type`)

**Design rules**:
- Each movement creates a posted journal entry via the posting kernel
- Additions debit Fixed Assets, credit Bank/AP
- Allowances debit Capital Allowance Expense, credit Accumulated Depreciation
- Disposals reverse the asset and recognize gain/loss
- `running_wdv` is computed and stored — never derived at read time
- Gate E provides the rates; Phase 2A provides the structure

### 4.3 Tax Loss Balances (Section C)

**Purpose**: Track cumulative tax loss carry-forward balances per trade type. Losses are trade-specific and carry forward indefinitely (s.27(6) NTA 2025).

**Table**: `tax_loss_balances`

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK | Deterministic UUID |
| `entity_id` | uuid | FK → `entities.id`, NOT NULL | Entity boundary |
| `trade_type` | text | NOT NULL | e.g. 'general', 'digital_asset' |
| `period_id` | uuid | FK → `accounting_periods.id`, NOT NULL | Period when loss arose |
| `opening_balance` | numeric(18,2) | NOT NULL DEFAULT 0 | Balance brought forward |
| `loss_arising` | numeric(18,2) | NOT NULL DEFAULT 0 | New loss in this period |
| `loss_used` | numeric(18,2) | NOT NULL DEFAULT 0 | Loss utilized against profits |
| `closing_balance` | numeric(18,2) | GENERATED ALWAYS AS (opening_balance + loss_arising - loss_used) STORED | Computed closing |
| `journal_entry_id` | uuid | FK → `journal_entries.id`, NOT NULL | Linked posted journal entry for the loss recognition |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

**Index**: UNIQUE (`entity_id`, `trade_type`, `period_id`)

**Design rules**:
- `closing_balance` is a generated column — no application-level computation
- Losses are trade-specific: `digital_asset` losses only offset `digital_asset` profits (s.27(6))
- `loss_used` is capped by the available profit in the utilization period (Gate E provides the restriction rules)
- Each loss recognition creates a posted journal entry
- No expiration: losses carry forward indefinitely

### 4.4 Tax Computation (Section D)

**Purpose**: Produce a complete tax computation for an entity/period with full lineage from accounting facts to taxable profit to tax payable.

**Table**: `tax_computations`

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK | Deterministic UUID |
| `entity_id` | uuid | FK → `entities.id`, NOT NULL | Entity boundary |
| `period_id` | uuid | FK → `accounting_periods.id`, NOT NULL | Accounting period |
| `status` | text | NOT NULL DEFAULT 'draft', CHECK IN ('draft', 'final') | Lifecycle status |
| `accounting_profit` | numeric(18,2) | NOT NULL | From `derive_accounting_reporting` |
| `total_permanent_additions` | numeric(18,2) | NOT NULL DEFAULT 0 | Sum of permanent add-backs |
| `total_permanent_deductions` | numeric(18,2) | NOT NULL DEFAULT 0 | Sum of permanent deductions |
| `adjusted_profit` | numeric(18,2) | GENERATED ALWAYS AS (accounting_profit + total_permanent_additions - total_permanent_deductions) STORED | After permanent differences |
| `total_temporary_additions` | numeric(18,2) | NOT NULL DEFAULT 0 | Sum of temporary add-backs |
| `total_temporary_deductions` | numeric(18,2) | NOT NULL DEFAULT 0 | Sum of temporary deductions |
| `chargeable_profit` | numeric(18,2) | GENERATED ALWAYS AS (adjusted_profit + total_temporary_additions - total_temporary_deductions) STORED | After temporary differences |
| `capital_allowances` | numeric(18,2) | NOT NULL DEFAULT 0 | Total allowances claimed |
| `taxable_profit` | numeric(18,2) | GENERATED ALWAYS AS (chargeable_profit - capital_allowances) STORED | After allowances |
| `loss_utilized` | numeric(18,2) | NOT NULL DEFAULT 0 | Loss carry-forward applied |
| `net_taxable_profit` | numeric(18,2) | GENERATED ALWAYS AS (taxable_profit - loss_utilized) | Final taxable base |
| `cit_rate` | numeric(5,2) | NOT NULL | Applied CIT rate |
| `cit_payable` | numeric(18,2) | GENERATED ALWAYS AS (net_taxable_profit * cit_rate / 100) STORED | CIT liability |
| `etr_minimum` | numeric(5,2) | NOT NULL DEFAULT 15 | ETR floor |
| `etr_payable` | numeric(18,2) | NULL | ETR top-up if applicable |
| `total_tax_payable` | numeric(18,2) | GENERATED ALWAYS AS (cit_payable + COALESCE(etr_payable, 0)) STORED | Final tax payable |
| `journal_entry_id` | uuid | FK → `journal_entries.id`, NOT NULL | Linked posted journal entry for tax provision |
| `computed_at` | timestamptz | NOT NULL DEFAULT now() | Computation timestamp |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

**Index**: UNIQUE (`entity_id`, `period_id`)

**Table**: `tax_computation_lines`

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK | Deterministic UUID |
| `computation_id` | uuid | FK → `tax_computations.id`, NOT NULL | Parent computation |
| `entity_id` | uuid | FK → `entities.id`, NOT NULL | Entity boundary |
| `line_type` | text | NOT NULL | e.g. 'accounting_profit', 'permanent_addition', 'permanent_deduction', 'temporary_addition', 'temporary_deduction', 'capital_allowance', 'loss_utilized', 'cit_rate', 'etr_topup' |
| `description` | text | NOT NULL | Human-readable label |
| `amount` | numeric(18,2) | NOT NULL | Line amount |
| `source_type` | text | NULL | e.g. 'tax_adjustment', 'tax_asset', 'tax_loss', 'tax_settings' |
| `source_id` | uuid | NULL | FK to source record |
| `sort_order` | integer | NOT NULL | Display order |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

**Index**: UNIQUE (`computation_id`, `line_type`, `sort_order`)

**Design rules**:
- Computation reads from `derive_accounting_reporting` for accounting profit
- Reads from `tax_adjustments` for permanent/temporary differences
- Reads from `tax_asset_movements` for capital allowances
- Reads from `tax_loss_balances` for loss utilization
- Reads from `entity_tax_config` for CIT rate and ETR minimum
- Generated columns ensure computation is deterministic — no application rounding
- Each computation creates a posted journal entry for the tax provision
- `tax_computation_lines` provides drill-down lineage from summary to source

### 4.5 Entity Tax Config (Section E)

**Purpose**: Per-entity tax configuration that controls CIT computation parameters. Extends or replaces the existing `cit_category` field in `tax_settings`.

**Recommended approach**: New table `entity_tax_config` (not extending `tax_settings`) to keep operational config separate from tax computation config.

**Table**: `entity_tax_config`

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK | Deterministic UUID |
| `entity_id` | uuid | FK → `entities.id`, UNIQUE, NOT NULL | Entity boundary |
| `tin` | text | NULL | Tax Identification Number |
| `cit_category` | text | NOT NULL DEFAULT 'medium', CHECK IN ('small', 'medium', 'large', 'exempt') | CIT category |
| `cit_rate` | numeric(5,2) | NOT NULL | Applied CIT rate (0/25/30 per s.56) |
| `etr_minimum` | numeric(5,2) | NOT NULL DEFAULT 15 | ETR floor per s.57 |
| `year_end_month` | integer | NOT NULL | Fiscal year-end month |
| `year_end_day` | integer | NOT NULL | Fiscal year-end day |
| `is_small_company` | boolean | GENERATED ALWAYS AS (cit_category = 'small') STORED | Derived flag |
| `notes` | text | NULL | |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

**Index**: UNIQUE (`entity_id`)

**Design rules**:
- One config row per entity — upsert on save
- `cit_rate` is stored explicitly (not derived) because Gate E may apply Presidential Orders (s.56)
- `is_small_company` is a generated column — no application logic
- `etr_minimum` defaults to 15% but is stored for future adjustment
- This table feeds into `tax_computations.cit_rate` and `tax_computations.etr_minimum`

### 4.6 VAT/WHT Boundary (Section G)

**Current state**: VAT and WHT amounts exist on invoice/payment line items. Control accounts (`2100`, `2200`) hold collected/withheld amounts. `tax_input_entries` tracks VAT inputs. `wht_receipts` tracks WHT receipts. No statutory position or return preparation layer exists.

**Proposed boundary**:

| Layer | Source | Purpose |
|-------|--------|---------|
| **Control Account Balance** | `derive_accounting_reporting` → `DerivedAccountBalance` for accounts `2100`/`2200` | Accounting fact: what the ledger says |
| **Statutory Position** | New: `tax_vat_position` / `tax_wht_position` tables | Tax computation: what the law says is owed (may differ from ledger due to timing, exemptions, partial recovery) |
| **Return Preparation** | Existing: `tax_filings` + `tax_input_entries` | Operational: what goes on the return |

**Proposed tables** (minimal):

**Table**: `tax_vat_positions`

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK | |
| `entity_id` | uuid | FK → `entities.id`, NOT NULL | |
| `period_id` | uuid | FK → `accounting_periods.id`, NOT NULL | |
| `output_vat` | numeric(18,2) | NOT NULL DEFAULT 0 | VAT on sales (from ledger or manual) |
| `input_vat` | numeric(18,2) | NOT NULL DEFAULT 0 | VAT on purchases (from `tax_input_entries` or manual) |
| `net_vat_payable` | numeric(18,2) | GENERATED ALWAYS AS (output_vat - input_vat) STORED | Net liability |
| `vat_recoverable` | numeric(18,2) | NOT NULL DEFAULT 0 | Portion of input VAT recoverable |
| `vat_payable` | numeric(18,2) | GENERATED ALWAYS AS (output_vat - vat_recoverable) STORED | Amount to remit |
| `journal_entry_id` | uuid | FK → `journal_entries.id`, NOT NULL | Provision entry |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

**Index**: UNIQUE (`entity_id`, `period_id`)

**Table**: `tax_wht_positions`

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK | |
| `entity_id` | uuid | FK → `entities.id`, NOT NULL | |
| `period_id` | uuid | FK → `accounting_periods.id`, NOT NULL | |
| `wht_collected` | numeric(18,2) | NOT NULL DEFAULT 0 | WHT withheld by customers (from ledger) |
| `wht_remitted` | numeric(18,2) | NOT NULL DEFAULT 0 | WHT already remitted to FIRS |
| `wht_outstanding` | numeric(18,2) | GENERATED ALWAYS AS (wht_collected - wht_remitted) STORED | Amount to remit |
| `journal_entry_id` | uuid | FK → `journal_entries.id`, NOT NULL | Provision entry |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | |

**Index**: UNIQUE (`entity_id`, `period_id`)

**Design rules**:
- Control account balance = ledger fact (read from `derive_accounting_reporting`)
- Statutory position = tax computation (may differ from ledger due to timing/exemptions)
- Return preparation = operational (existing `tax_filings` + `tax_input_entries`)
- The gap between control account balance and statutory position is a reconciliation finding

## 5. Architectural Invariants (Section I)

### Invariant 1: Accounting Facts Are Immutable

Tax computation never mutates `journal_entries` or `journal_lines`. All tax-side mutations create new posted entries via the posting kernel.

### Invariant 2: Read Boundary Is Derivation

Tax computation reads from `derive_accounting_reporting`, never from raw `journal_entries`/`journal_lines` directly. The derivation is the single read boundary.

### Invariant 3: Generated Columns Enforce Determinism

Monetary computations (`adjusted_profit`, `chargeable_profit`, `taxable_profit`, `cit_payable`, `closing_balance`, `net_vat_payable`, etc.) use Postgres `GENERATED ALWAYS AS` columns. No application-level arithmetic touches these values.

### Invariant 4: Decimal.js Precision

All application-level money handling uses `Decimal.js` with precision 20, scale 2, `ROUND_HALF_UP`. No JavaScript number arithmetic for money.

### Invariant 5: Posted-Only Scope

Tax adjustments and asset movements follow the same scope rule as accounting reporting: posted entries only, active entries only. Draft entries contribute nothing.

### Invariant 6: Reversal Semantics Match

Tax adjustments follow the Gap 2 reversal pattern: new posted entry linked via `reversal_of_entry_id`, original stays posted, no `'reversed'` status.

### Invariant 7: Entity Boundary

All tax tables are scoped to `entity_id`. No cross-entity computation.

### Invariant 8: Period Boundary

All tax tables are scoped to `period_id`. No cross-period computation within a single record.

### Invariant 9: Audit Trail

Every tax adjustment, asset movement, loss recognition, and computation creates a posted journal entry. The journal entry is the audit trail.

### Invariant 10: No Statutory Hardcoding

Phase 2A provides structure. Gate E provides rates, thresholds, and restriction rules. No numeric statutory value is hardcoded into Phase 2A models unless explicitly approved as an immutable project rule.

### Invariant 11: Lifecycle Status

Tax computations use `'draft'` → `'final'` lifecycle. A `'final'` computation is immutable — to change it, reverse and recompute.

### Invariant 12: Reconciliation Is Detection

Discrepancies between control account balances and statutory positions are surfaced as reconciliation findings (following `src/domain/accounting/reconciliation.ts` pattern), never silently repaired.

## 6. Domain File Map

| New File | Purpose |
|----------|---------|
| `src/domain/tax/types.ts` | All Phase 2A types (TaxAdjustment, TaxAsset, TaxAssetMovement, TaxLossBalance, TaxComputation, TaxComputationLine, EntityTaxConfig, VatPosition, WhtPosition) |
| `src/domain/tax/adjustments.ts` | Tax adjustment domain logic (validation, invariants) |
| `src/domain/tax/assets.ts` | QCE/asset register domain logic |
| `src/domain/tax/losses.ts` | Tax loss balance domain logic |
| `src/domain/tax/computation.ts` | Tax computation orchestration logic |
| `src/domain/tax/entityConfig.ts` | Entity tax config domain logic |
| `src/domain/tax/vat.ts` | VAT position domain logic |
| `src/domain/tax/wht.ts` | WHT position domain logic |
| `src/domain/tax/money.ts` | Re-export from `src/domain/accounting/money.ts` (no duplication) |
| `src/modules/tax/services/adjustmentService.ts` | Tax adjustment service (read-only RPC wrapper) |
| `src/modules/tax/services/assetService.ts` | Asset register service |
| `src/modules/tax/services/lossService.ts` | Tax loss service |
| `src/modules/tax/services/computationService.ts` | Tax computation service |
| `src/modules/tax/services/entityConfigService.ts` | Entity tax config service |
| `src/modules/tax/services/vatService.ts` | VAT position service |
| `src/modules/tax/services/whtService.ts` | WHT position service |

## 7. Migration Dependency Order

| Migration | Purpose | Depends On |
|-----------|---------|------------|
| `entity_tax_config` table | Entity tax configuration | `entities` table |
| `tax_adjustments` table + `tax_adjustment` RPC | Tax adjustments | `entities`, `accounting_periods`, `journal_entries` |
| `tax_assets` + `tax_asset_movements` tables + RPC | QCE/asset register | `entities`, `accounting_periods`, `journal_entries` |
| `tax_loss_balances` table + RPC | Tax loss balances | `entities`, `accounting_periods`, `journal_entries` |
| `tax_vat_positions` table + RPC | VAT statutory position | `entities`, `accounting_periods`, `journal_entries` |
| `tax_wht_positions` table + RPC | WHT statutory position | `entities`, `accounting_periods`, `journal_entries` |
| `tax_computations` + `tax_computation_lines` tables + RPC | Tax computation | All above tables |

## 8. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Generated columns may cause UPDATE performance issues on large datasets | Low | Tax computations are per-period, not high-frequency. Index on `entity_id` + `period_id` covers lookup. |
| `tax_computations` has many generated columns (9) | Low | Postgres handles generated columns efficiently. Column count is within Postgres limits. |
| Entity tax config duplication with `tax_settings` | Medium | Keep `tax_settings` for operational config (VAT enabled, filing reminders). `entity_tax_config` is for CIT computation. Document the boundary clearly. |
| VAT/WHT position tables may overlap with existing `tax_input_entries`/`wht_receipts` | Medium | `tax_input_entries` = operational (what goes on the return). `tax_vat_positions` = statutory (what the law says is owed). `wht_receipts` = operational (receipt tracking). `tax_wht_positions` = statutory (what must be remit). Document the boundary. |
| Loss carry-forward restrictions (s.27(6)) are complex | High | Gate E provides the restriction rules. Phase 2A provides the structure. `loss_used` is capped by Gate E logic at computation time. |
| ETR rules (s.57) may interact with CIT in unexpected ways | High | Gate E provides ETR computation logic. Phase 2A stores the result in `etr_payable`. |

## 9. Deferred to Gate E

- CIT rate values and small-company qualification logic
- ETR computation logic and minimum threshold application
- Capital allowance rate values and qualifying asset treatment
- Loss restriction rules and utilization order
- Transitional provisions for assets acquired before enactment
- Digital asset profit/loss segregation rules

## 10. Verification

```
Pre-audit git status: 96+ modified files (all pre-existing from other agents)
Post-audit git status: UNCHANGED — zero code modifications
```

All file reads performed. No SQL executed. No migrations created. No application code modified.

## 11. Skills Used

Skills used: NONE

Documentation standard: ASD-STE100 Simplified Technical English

## 12. Risks or Limitations

- This audit is READ-ONLY. Implementation requires separate tasks.
- Gate E statutory rules are not designed here — only the structure to hold them.
- The `tax_settings.cit_category` field exists but is underutilized — migration path needed to `entity_tax_config`.
- VAT/WHT position tables are minimal — may need expansion based on FIRS requirements.
- No tests designed — deferred to implementation.
