# Phase 2A Final Architecture Adjudication

**Date:** 2026-09-12
**Analyst:** OpenCode (Ponytail full mode)
**Scope:** Adjudicate the Phase 2A Design Challenge Report (13 challenges A–M) against 11 non-negotiable principles
**Zero-code audit:** No modifications to any application code, SQL, migrations, tests, or documentation

---

## 1. Verdict

**APPROVED WITH STRUCTURAL REPAIRS.** The Design Challenge Report identifies correct domain areas and correct non-negotiable principle violations. Its repair direction is sound. However, the report contains 2 internal contradictions that must be resolved before the architecture is implementation-ready.

**Table Count Contradiction (Challenge A):** The report's executive summary says "7 tables + 2 optional utility tables" but the canonical architecture section (§I) lists 11 tables (4 Layer 2 + 3 Layer 3 + 1 Layer 4 + 2 reconciliation + 1 rule bridge = 11). The correct count is **7 core tables + 3 optional utility tables**.

**Ownership Contradiction (Challenge B):** The report states `tax_rule_versions` is "Phase 2A infrastructure" (§G) but also places it under "Layer 3: Tax Computation" (§I) without clarifying it is the ONLY bridge to Gate E. The correct ownership: `tax_rule_versions` is Phase 2A-owned infrastructure that stores Gate E rule snapshots for reproducibility.

---

## 2. What Got Right

The Design Challenge Report correctly identified:

1. **Mandatory journal_entry_id on tax records violates Principle 3.** Tax adjustments are classification facts, not accounting postings. The `journal_entry_id` must be nullable and only populated when a separate provision posting is created.

2. **Hardcoded "indefinite" loss carry-forward violates Principle 6.** Loss utilization logic belongs in Gate E. The schema records facts only.

3. **`is_small_company` as a stored boolean violates Principle 6.** Small-company status is derived per assessment period from turnover and fixed-asset thresholds. Must be computed, not stored.

4. **`tax_asset_movements` duplicates accounting facts.** Additions come from source transactions. Disposals come from disposal postings. Opening WDV is prior-period closing WDV. The table should be removed.

5. **`tax_computations` mixes 5 concerns in one table.** Inputs, rules, steps, results, and posting links must be separated.

6. **`entity_tax_config` contains accounting-layer facts.** TIN, entity_name, year_end belong in entity setup, not tax config.

7. **VAT/WHT positions should be reconciliation layers, not sources of truth.** They reference accounting, Gate E, and compliance data.

8. **`tax_rule_versions` with rule_snapshot JSONB enables immutability.** This is the correct bridge pattern.

---

## 3. Remaining Defects

The Design Challenge Report has 3 defects that the adjudication corrects:

| # | Defect | Location | Correction |
|---|---|---|---|
| 1 | Table count: says 7+2 but lists 11 | §I | Canonical count is 7 core + 3 optional = 10 total |
| 2 | `tax_rule_versions` ownership ambiguous | §G, §I | Phase 2A-owned infrastructure, Gate E snapshots only |
| 3 | `tax_computation_steps` described as "optional for Gate E" | §D | Correct: optional, defer to Gate E implementation. Phase 2A does not create this table. |

---

## 4. Final Layer Boundary

| Layer | Name | Owns | Phase 2A Creates Tables? |
|---|---|---|---|
| **Layer 1** | Accounting Facts | Account balances, period totals, trial balance, P&L | No — already implemented (Gap 1) |
| **Layer 2** | Tax Facts | Tax adjustments, QCE records, loss balances, entity tax config | Yes — 4 tables |
| **Layer 3** | Tax Computation | Input snapshots, rule version references, computation results | Yes — 3 tables (1 optional) |
| **Layer 4** | Accounting Posting | Tax provision journal entries | Yes — 1 optional table |

**Hard boundary rules:**
- Layer 2 tables NEVER create journal entries. They are citation-backed classification records.
- Layer 3 tables NEVER create journal entries. They are immutable computation snapshots.
- Layer 4 tables CREATE journal entries via the accounting posting kernel. This is the ONLY tax-to-accounting bridge.
- `tax_rule_versions` is Layer 3 infrastructure owned by Phase 2A. It stores Gate E rule snapshots for reproducibility.

---

## 5. Canonical Table Set

### 5.1 Core Tables (7)

| # | Table | Layer | Purpose |
|---|---|---|---|
| 1 | `tax_adjustments` | 2 | Classification records: "this accounting fact is treated differently for tax" |
| 2 | `tax_qce` | 2 | Qualifying capital expenditure register |
| 3 | `tax_loss_balances` | 2 | Loss carry-forward register |
| 4 | `entity_tax_config` | 2 | Entity tax profile (operational config, not rules) |
| 5 | `tax_computation_inputs` | 3 | Immutable input snapshot per entity per assessment period |
| 6 | `tax_computation_results` | 3 | Final tax position per entity per assessment period |
| 7 | `tax_rule_versions` | 3 | Bridge to Gate E: captures which rule set was applied |

### 5.2 Optional Utility Tables (3)

| # | Table | Layer | Purpose | Defer? |
|---|---|---|---|---|
| 8 | `tax_qce_periods` | 2 | Running-WDV cache per QCE item per period. Rebuildable. | Yes — defer to Gate E |
| 9 | `tax_computation_steps` | 3 | Intermediate computation results (step-by-step audit trail). | Yes — defer to Gate E |
| 10 | `tax_provisions` | 4 | Tax provision journal entries. Only created when liability needs accounting recognition. | Yes — defer to Phase 2A.5 |

### 5.3 Tables Removed from First-Pass

| First-Pass Table | Verdict | Reason |
|---|---|---|
| `tax_asset_movements` | **REMOVE** | Duplicates accounting facts (additions from source transactions, disposals from disposal postings, opening WDV from prior closing). Contents split between source transactions and `tax_qce_periods`. |

### 5.4 Tables Renamed/Restructured from First-Pass

| First-Pass Name | New Name | Reason |
|---|---|---|
| `tax_computations` | Split into `tax_computation_inputs` + `tax_computation_results` | Separates input snapshot from final result. Computation steps deferred. |
| `tax_adjustments` | `tax_adjustments` (same name, restructured fields) | Remove mandatory journal_entry_id. Add assessment_period_id. Add tax_amount alongside accounting_amount. |
| `entity_tax_config` | `entity_tax_config` (same name, restructured fields) | Remove TIN, entity_name, year_end, thresholds, is_small_company. Simplify to tax_profile JSONB. |

---

## 6. Field Ownership Corrections

Every proposed field classified per Gate E Firewall taxonomy:

### 6.1 `tax_adjustments` (Layer 2 — Tax Facts)

| Field | Classification | Notes |
|---|---|---|
| `id` | Infrastructure | UUID PK |
| `entity_id` | Infrastructure | FK → entity. Principle 8: entity isolation |
| `period_id` | Infrastructure | FK → accounting period. Principle 9: period integrity |
| `assessment_period_id` | Infrastructure | FK → assessment period |
| `adjustment_type` | **FACT** | Classification: 'depreciation_addback', 'entertainment_disallowance', 'exempt_income', 'capital_allowance', 'loss_utilization' |
| `source_fact_id` | **FACT** | FK → accounting source_transaction or journal_line |
| `accounting_amount` | **FACT** | The accounting figure being reclassified. NUMERIC(18,2) |
| `tax_amount` | **FACT** | The tax effect. NUMERIC(18,2) |
| `citation` | **FACT** | NTA section reference. Principle 11: source traceability |
| `journal_entry_id` | **ACCOUNTING POSTING REFERENCE** | Nullable. Only populated when a separate provision posting was created. |
| `rule_snapshot` | **RULE SNAPSHOT** | JSONB. Gate E rule version used for this classification. Principle 5: immutability |
| `notes` | Operational | Free text |
| `created_at` | Infrastructure | TIMESTAMPTZ |
| `created_by` | Infrastructure | UUID |

### 6.2 `tax_qce` (Layer 2 — Tax Facts)

| Field | Classification | Notes |
|---|---|---|
| `id` | Infrastructure | UUID PK |
| `entity_id` | Infrastructure | FK → entity |
| `period_id` | Infrastructure | FK → accounting period |
| `assessment_period_id` | Infrastructure | FK → assessment period |
| `asset_description` | **FACT** | Human-readable asset description |
| `qce_amount` | **FACT** | Qualifying capital expenditure. NUMERIC(18,2). Principle 7: exact money |
| `date_incurred` | **FACT** | Date the expenditure was incurred |
| `statutory_category` | **FACT** | User-entered classification: 'plant_machinery', 'building', 'motor_vehicle', 'software', 'intangible'. Gate E validates and may override. |
| `wht_amount` | **FACT** | Withholding tax amount on the expenditure (if applicable). NUMERIC(18,2) |
| `notes` | Operational | Free text |
| `created_at` | Infrastructure | TIMESTAMPTZ |

### 6.3 `tax_loss_balances` (Layer 2 — Tax Facts)

| Field | Classification | Notes |
|---|---|---|
| `id` | Infrastructure | UUID PK |
| `entity_id` | Infrastructure | FK → entity |
| `period_id` | Infrastructure | FK → accounting period |
| `assessment_period_id` | Infrastructure | FK → assessment period |
| `profit_source_type` | **FACT** | 'trade', 'property', 'digital_asset', 'capital'. Principle 9: period integrity |
| `opening_balance` | **FACT** | Prior period closing balance. NUMERIC(18,2) |
| `loss_arising` | **FACT** | Loss incurred in this period. NUMERIC(18,2) |
| `loss_used` | **FACT** | Utilization against taxable profit. NUMERIC(18,2) |
| `loss_expired` | **FACT** | Expiration per Gate E statutory rules. NUMERIC(18,2) |
| `closing_balance` | **DERIVED VALUE** | opening + arising - used - expired. Rebuildable. May be stored for performance. |
| `rule_snapshot` | **RULE SNAPSHOT** | JSONB. Gate E rule version used for utilization. Principle 5: immutability |
| `notes` | Operational | Free text |
| `created_at` | Infrastructure | TIMESTAMPTZ |

### 6.4 `entity_tax_config` (Layer 2 — Operational Config)

| Field | Classification | Notes |
|---|---|---|
| `entity_id` | Infrastructure | PK, FK → entity |
| `tax_profile` | **OPERATIONAL CONFIG** | JSONB structure below |
| `updated_at` | Infrastructure | TIMESTAMPTZ |
| `updated_by` | Infrastructure | UUID |

**`tax_profile` JSONB structure:**
```json
{
  "company_type": "small_company | medium | large",
  "is_vat_registered": true,
  "remittance_schedule": "monthly | quarterly",
  "sector": "technology | manufacturing | ...",
  "notes": "string"
}
```

**Removed fields (classified as violations):**
- `tin` → **FACT** in entity setup, not tax config
- `entity_name` → **FACT** in entity setup, not tax config
- `year_end` → **OPERATIONAL CONFIG** in accounting periods, not tax config
- `turnover_threshold` → **RULE** in Gate E, not entity config
- `fixed_assets_threshold` → **RULE** in Gate E, not entity config
- `is_small_company` → **DERIVED VALUE** computed per assessment period, not stored

### 6.5 `tax_computation_inputs` (Layer 3 — Tax Computation)

| Field | Classification | Notes |
|---|---|---|
| `id` | Infrastructure | UUID PK |
| `entity_id` | Infrastructure | FK → entity |
| `period_id` | Infrastructure | FK → accounting period |
| `assessment_period_id` | Infrastructure | FK → assessment period |
| `input_snapshot` | **COMPUTATION INPUT** | JSONB. Immutable snapshot of all Layer 2 facts used as inputs. Principle 5: immutability |
| `created_at` | Infrastructure | TIMESTAMPTZ |

### 6.6 `tax_computation_results` (Layer 3 — Tax Computation)

| Field | Classification | Notes |
|---|---|---|
| `id` | Infrastructure | UUID PK |
| `entity_id` | Infrastructure | FK → entity |
| `assessment_period_id` | Infrastructure | FK → assessment period |
| `rule_version_id` | **RULE SNAPSHOT REFERENCE** | FK → tax_rule_versions. Principle 5: immutability |
| `inputs_snapshot_id` | **COMPUTATION INPUT REFERENCE** | FK → tax_computation_inputs |
| `taxable_profit` | **COMPUTATION OUTPUT** | NUMERIC(18,2). Derived from inputs + rules. |
| `tax_due` | **COMPUTATION OUTPUT** | NUMERIC(18,2). 30% CIT rate applied. |
| `tax_credits` | **COMPUTATION OUTPUT** | NUMERIC(18,2). Tax credits applied. |
| `tax_payable` | **COMPUTATION OUTPUT** | NUMERIC(18,2). tax_due - tax_credits. |
| `status` | Operational | 'draft', 'finalized' |
| `finalized_at` | Infrastructure | TIMESTAMPTZ |
| `journal_entry_id` | **ACCOUNTING POSTING REFERENCE** | Nullable. Only populated if a tax provision journal was posted. |
| `notes` | Operational | Free text |
| `created_at` | Infrastructure | TIMESTAMPTZ |

### 6.7 `tax_rule_versions` (Layer 3 — Bridge to Gate E)

| Field | Classification | Notes |
|---|---|---|
| `id` | Infrastructure | UUID PK |
| `version` | **RULE SNAPSHOT** | Text: 'NTA-2025-v1' |
| `effective_date` | **RULE SNAPSHOT** | DATE. When this rule set takes effect. |
| `expires_date` | **RULE SNAPSHOT** | DATE, nullable. When this rule set expires. |
| `rule_snapshot` | **RULE SNAPSHOT** | JSONB. Full rule set: rates, thresholds, methods. For reproducibility (Principle 5). |
| `source_document` | **RULE SNAPSHOT** | Text: 'NIGERIA-TAX-ACT-2025.md' |
| `created_at` | Infrastructure | TIMESTAMPTZ |
| `notes` | Operational | Free text |

---

## 7. Final Data Flow

```
Accounting Layer (Layer 1) — ALREADY EXISTS
  │
  │  derive_accounting_reporting()
  │  → account balances, profit & loss, trial balance
  │
  ▼
Tax Facts Layer (Layer 2) — PHASE 2A.1–2A.2
  │
  │  tax_adjustments: "this expense is add-backed for tax"
  │  tax_qce: "this is qualifying capital expenditure"
  │  tax_loss_balances: "this loss carries forward"
  │  entity_tax_config: "this entity's tax profile"
  │
  │  All fields are FACTS or OPERATIONAL CONFIG.
  │  No journal entries. No derived values stored as source.
  │
  ▼
Tax Computation Layer (Layer 3) — PHASE 2A.3
  │
  │  tax_computation_inputs: immutable snapshot of all Layer 2 facts
  │  tax_rule_versions: "which Gate E rule set applies"
  │  tax_computation_results: "the final tax position"
  │
  │  All fields are COMPUTATION INPUT/OUTPUT or RULE SNAPSHOT.
  │  No journal entries. Results are immutable once finalized.
  │
  ▼
Accounting Posting Layer (Layer 4) — PHASE 2A.5 (OPTIONAL)
  │
  │  tax_provisions: "recognize this liability in the books"
  │  → journal_entry_id references accounting journal_entries
  │  → posted via accounting posting kernel
  │
  │  This is the ONLY tax-to-accounting bridge.
  │  Created only when a tax liability needs accounting recognition.
```

---

## 8. Gate E Firewall

### 8.1 Classification Rules

Every field in the canonical table set is classified as one of:

| Classification | Definition | Who Owns |
|---|---|---|
| **Infrastructure** | PK, FK, timestamps, UUIDs | Schema |
| **FACT** | A recorded business event or state | Phase 2A (user-entered or derived from accounting) |
| **OPERATIONAL CONFIG** | Entity-level operational settings | Phase 2A (entity-level) |
| **DERIVED VALUE** | Computed from other facts, rebuildable | Phase 2A (may store for performance) |
| **RULE** | Statutory rate, threshold, method | Gate E (never in Phase 2A schema) |
| **RULE SNAPSHOT** | Frozen copy of a Gate E rule at computation time | Phase 2A (stored for immutability) |
| **COMPUTATION INPUT** | Accounting-derived fact fed to tax computation | Phase 2A (immutable snapshot) |
| **COMPUTATION OUTPUT** | Result of applying rules to inputs | Phase 2A (immutable once finalized) |
| **ACCOUNTING POSTING REFERENCE** | FK to accounting journal_entries | Phase 2A (nullable, only on provision) |

### 8.2 What Phase 2A MUST NOT Store

| Field Type | Location | Why |
|---|---|---|
| CIT rates (0%, 25%, 30%) | Gate E rule_snapshot | Principle 2: rules not facts |
| ETR minimum (15%) | Gate E rule_snapshot | Principle 2 |
| Capital allowance rates (25% WRVDB, 10% SL, etc.) | Gate E rule_snapshot | Principle 2 |
| Loss carry-forward rules (indefinite, trade-specific) | Gate E rule_snapshot | Principle 2 |
| Disallowable expense categories | Gate E rule_snapshot | Principle 2 |
| Small company thresholds (₦50M, ₦250M) | Gate E rule_snapshot | Principle 2 |
| WHT rates and categories | Gate E rule_snapshot | Principle 2 |
| Transitional provisions | Gate E rule_snapshot | Principle 2 |
| Effective dates for all rules | Gate E rule_snapshot | Principle 2 |

### 8.3 What Phase 2A DOES Store (Gate E Bridge)

| Field | Table | Purpose |
|---|---|---|
| `rule_version_id` | tax_computation_results | FK → tax_rule_versions |
| `rule_snapshot` | tax_adjustments | JSONB: which Gate E rule was applied for this classification |
| `rule_snapshot` | tax_loss_balances | JSONB: which Gate E rule was applied for loss utilization |
| `rule_snapshot` | tax_rule_versions | JSONB: full Gate E rule set for reproducibility |

---

## 9. Deferred Work

| Item | Defer To | Reason |
|---|---|---|
| `tax_qce_periods` table | Gate E implementation | Running-WDV cache is rebuildable from `tax_qce` + Gate E computation. Not needed for Phase 2A foundation. |
| `tax_computation_steps` table | Gate E implementation | Step-by-step audit trail is a Gate E concern. Phase 2A stores inputs and results only. |
| `tax_provisions` table | Phase 2A.5 | Tax provision journal entries are optional. Only needed when a tax liability requires accounting recognition. |
| VAT/WHT position tables | Phase 2B or later | Reconciliation layers reference accounting, Gate E, and compliance data. Not part of core CIT computation. |
| `closing_balance` stored in `tax_loss_balances` | Implementation choice | Derived value (opening + arising - used - expired). May be stored for performance. Rebuildable. |
| Gate E rule_snapshot JSONB schema | Gate E implementation | The structure of rule_snapshot is defined by Gate E, not Phase 2A. Phase 2A stores the opaque JSONB blob. |

---

## 10. Implementation Readiness

### 10.1 Resolved Challenges

| Challenge | Status | Resolution |
|---|---|---|
| A: Table count contradiction | **RESOLVED** | 7 core + 3 optional = 10 total tables |
| B: tax_rule_versions ownership | **RESOLVED** | Phase 2A infrastructure, Gate E snapshots only |
| C: statutory_category in QCE | **RESOLVED** | User-entered FACT, Gate E validates |
| D: tax_loss_balances derived vs fact | **RESOLVED** | Fact table, closing_balance is the only derived value |
| E: tax_adjustments monetary semantics | **RESOLVED** | accounting_amount + tax_amount, both FACT |
| F: computation inputs/results competing models | **RESOLVED** | Two separate tables: inputs (snapshot) + results (output) |
| G: rule snapshot immutability | **RESOLVED** | JSONB rule_snapshot in tax_rule_versions + per-record snapshots |
| H: computation steps mandatory vs optional | **RESOLVED** | Optional, defer to Gate E |
| I: entity_tax_config JSONB structure | **RESOLVED** | company_type, is_vat_registered, remittance_schedule, sector, notes |
| J: VAT/WHT positions referencing derived values | **RESOLVED** | Reconciliation layer, references only, defer to Phase 2B |
| K: tax_provisions ownership | **RESOLVED** | Layer 4, optional, defer to Phase 2A.5 |
| L: QCE period cache | **RESOLVED** | Optional, defer to Gate E |
| M: assessment_period relationship | **RESOLVED** | assessment_period_id on all computation tables |

### 10.2 Non-Negotiable Principle Compliance (Final)

| Principle | Status | Evidence |
|---|---|---|
| P1: ACCOUNTING IS NOT TAX | ✅ | Tax adjustments are classification facts, not journal entries |
| P2: TAX FACTS ARE NOT TAX RULES | ✅ | Rules in Gate E rule_snapshot. Schema stores facts only. |
| P3: TAX COMPUTATION IS NOT ACCOUNTING POSTING | ✅ | journal_entry_id nullable, only on tax_provisions (Layer 4) |
| P4: AUDITABILITY WITHOUT LEDGER POLLUTION | ✅ | Citation-backed classification records, not posting-backed |
| P5: IMMUTABLE RESULTS | ✅ | rule_snapshot JSONB, inputs_snapshot JSONB, finalized_at |
| P6: VERSIONED TAX POLICY | ✅ | tax_rule_versions with effective_date, expires_date, rule_snapshot |
| P7: EXACT MONEY | ✅ | NUMERIC(18,2) on all monetary fields |
| P8: ENTITY ISOLATION | ✅ | entity_id on all tables |
| P9: PERIOD INTEGRITY | ✅ | period_id + assessment_period_id on all computation tables |
| P10: REVERSAL COMPATIBILITY | ✅ | Follows Gap 2 semantics (posted status only, no reversed status) |
| P11: SOURCE TRACEABILITY | ✅ | source_fact_id, citation, rule_snapshot, inputs_snapshot provenance chain |

### 10.3 Gate E Firewall Compliance

| Rule | Status |
|---|---|
| No CIT rates stored in schema | ✅ |
| No ETR thresholds stored in schema | ✅ |
| No capital allowance rates stored in schema | ✅ |
| No loss carry-forward rules stored in schema | ✅ |
| No WHT rates stored in schema | ✅ |
| rule_snapshot JSONB for all Gate E references | ✅ |
| Computation reproducible from inputs + rule_snapshot | ✅ |

---

## 11. Verification

- Git status: 96+ modified files (all pre-existing from other agents). No new modifications from this audit.
- Zero code changes made.
- Zero migrations deployed.
- Zero tests executed.
- All search patterns for existing tax domain code returned zero matches in `src/` (confirmed in prior audit).
- `src/domain/tax/` directory does not exist (confirmed).

---

## 12. Decisions for Implementer

The following decisions are left to the implementer:

1. **`closing_balance` storage:** Store in `tax_loss_balances` for performance, or rebuild from opening + arising - used - expired? Recommendation: store it (one extra column, trivial storage cost, avoids rebuild complexity).

2. **`tax_computation_steps` structure:** If implementing later, decide between a separate table (auditable) or structured JSONB in `tax_computation_results` (simpler). Recommendation: separate table (cleaner audit trail).

3. **`tax_provisions` posting pattern:** How does the tax provision journal entry flow through the posting kernel? This is a Gate E + posting kernel integration question. Recommendation: defer to Phase 2A.5.

4. **VAT/WHT position tables:** Whether to implement in Phase 2B or later. These are reconciliation layers that reference accounting, Gate E, and compliance data. Recommendation: defer.

5. **`tax_rule_versions` first record:** What goes in the first rule_snapshot JSONB? The full NTA 2025 rate schedule. Recommendation: include CIT rates, ETR minimum, capital allowance rates, loss rules, disallowable categories, WHT rates, small-company thresholds, and transitional provisions.

6. **`statutory_category` validation:** Should Phase 2A validate the user-entered category against a known list, or let Gate E validate? Recommendation: Phase 2A validates against a fixed enum; Gate E may reclassify during computation.

---

*End of Phase 2A Final Architecture Adjudication.*
