# Phase 2A Architecture Integrity Gate

**Date:** 2026-09-12
**Analyst:** OpenCode (Ponytail full mode)
**Scope:** Final integrity gate for the Phase 2A Final Architecture Adjudication
**Zero-code audit:** No modifications to any application code, SQL, migrations, tests, or documentation

---

## 1. Verdict

**APPROVED WITH CONDITIONS.** The Adjudication resolves 10 of 13 contradictions correctly. Three conditions must be met before implementation begins:

| # | Condition | Severity | Resolution |
|---|---|---|---|
| 1 | `assessment_period` entity does not exist | **BLOCKER** | Define whether `assessment_period_id` maps to `accounting_periods` or requires a new table |
| 2 | `loss_used` / `loss_expired` classified as FACT but depend on Gate E rules | **MEDIUM** | Reclassify as DERIVED VALUE or document the dependency |
| 3 | `input_snapshot` JSONB structure undefined | **LOW** | Document the expected schema before implementation |

The architecture is sound. The 4-layer model, the Gate E firewall, and the immutability pattern are correct. The three conditions are definitional gaps, not structural violations.

---

## 2. Validated Decisions

The Adjudication correctly resolved these contradictions:

| Challenge | Resolution | Evidence |
|---|---|---|
| **A: Rule Snapshot Contradiction** | Gate E owns authoritative rules. Phase 2A stores frozen snapshots in `rule_snapshot` JSONB. `tax_rule_versions` is the bridge. | §6.7: `tax_rule_versions` has `rule_snapshot` JSONB. §8: Gate E Firewall. |
| **B: Rule Snapshot Duplication** | Per-record snapshots (`tax_adjustments`, `tax_loss_balances`) + full set (`tax_rule_versions`) is intentional. Per-record captures which specific rule applied to that record. Full set enables reproducibility. | §6.1, §6.3, §6.7: three `rule_snapshot` fields, each serving a distinct purpose. |
| **D: Tax Adjustment Semantics** | `accounting_amount` + `tax_amount` both classified as FACT. For add-backs: both equal. For exempt income: accounting_amount = revenue, tax_amount = zero. | §6.1: both fields present with clear semantics. |
| **G: Entity Tax Config** | `is_small_company` removed (derived per period). TIN, entity_name, year_end removed (belong in entity setup). `company_type` retained as operational config. | §6.4: simplified to `tax_profile` JSONB with 5 fields. |
| **I: Computation Lifecycle** | `draft` → `finalized` with `finalized_at`. Immutable once finalized. Supersession by creating new computation. | §6.6: status field + finalized_at timestamp. |
| **K: Computation Result** | `tax_due` classified as COMPUTATION OUTPUT. "30% CIT rate applied" is a documentation note, not a schema leak. Rate is applied during computation, not stored. | §6.6: COMPUTATION OUTPUT classification. |
| **L: Tax Provisions** | `tax_provisions` deferred to Phase 2A.5. Optional Layer 4 table. Not part of core CIT computation. | §5.2: optional, defer to Phase 2A.5. |
| **M: VAT/WHT** | VAT/WHT position tables deferred to Phase 2B or later. Reconciliation layers, not sources of truth. Existing compliance tables (tax_filings, wht_receipts) are not duplicated. | §9: deferred. Design Challenge §F: reconciliation layer pattern. |

---

## 3. Failed Decisions

| Challenge | Issue | Evidence | Required Fix |
|---|---|---|---|
| **H: Assessment Period** | `assessment_period_id` is referenced on all computation tables (§6.5, §6.6) but the `assessment_period` entity does not exist anywhere in the codebase. Zero matches in `src/` and `supabase/migrations/`. | grep: 0 matches for `assessment_period` in entire repo. `accounting_periods` table exists (id, code, state, start_date, end_date) but has no `assessment_period` concept. | **Define the entity.** Two options: (a) `assessment_period_id` is an alias for `period_id` (the accounting period IS the assessment period for most companies), or (b) create a separate `assessment_periods` table. The Adjudication must pick one. |
| **C: Tax Loss Balances** | `loss_used` and `loss_expired` classified as FACT (§6.3) but they depend on Gate E statutory rules (s.27(6) for carry-forward, s.97 for utilization). `closing_balance` is correctly classified as DERIVED VALUE, but `loss_used` and `loss_expired` are also derived from rules + opening_balance + loss_arising. | NTA 2025 s.27(6): "losses may be carried forward indefinitely for trade-specific losses." s.97: "assessable profits = adjusted profits − prior losses." These are rules, not independently observable facts. | **Reclassify `loss_used` and `loss_expired` as DERIVED VALUE.** They are computed by Gate E from `opening_balance` + `loss_arising` + statutory rules. Store for performance but document as rebuildable. |
| **J: Computation Input Snapshot** | `input_snapshot` classified as COMPUTATION INPUT, JSONB. Adjudication says "Immutable snapshot of all Layer 2 facts used as inputs" (§6.5) but does not define the JSONB structure. | §6.5: opaque JSONB. §9: "Gate E rule_snapshot JSONB schema — the structure of rule_snapshot is defined by Gate E." But `input_snapshot` is Phase 2A-owned, not Gate E-owned. | **Document the JSONB schema.** Expected structure: `{ adjustments: [...], qce: [...], loss_balances: [...], entity_config: {...} }`. Each array element should reference the source record ID and include the fact values at snapshot time. |

---

## 4. Final Ownership Matrix

| Concern | Owner | Phase 2A Stores? | Evidence |
|---|---|---|---|
| CIT rates (0%, 25%, 30%) | Gate E | No | §8.2: "CIT rates → Gate E rule_snapshot" |
| ETR minimum (15%) | Gate E | No | §8.2: "ETR minimum → Gate E rule_snapshot" |
| Capital allowance rates | Gate E | No | §8.2: "Capital allowance rates → Gate E rule_snapshot" |
| Loss carry-forward rules | Gate E | No | §8.2: "Loss carry-forward rules → Gate E rule_snapshot" |
| Disallowable expense categories | Gate E | No | §8.2: "Disallowable expense categories → Gate E rule_snapshot" |
| Small company thresholds | Gate E | No | §8.2: "Small company thresholds → Gate E rule_snapshot" |
| WHT rates and categories | Gate E | No | §8.2: "WHT rates and categories → Gate E rule_snapshot" |
| Rule snapshots (frozen copies) | Phase 2A | Yes (`rule_snapshot` JSONB) | §8.3: "Phase 2A DOES Store (Gate E Bridge)" |
| Tax classification facts | Phase 2A | Yes | §4: Layer 2 owns tax facts |
| Computation inputs/results | Phase 2A | Yes | §4: Layer 3 owns computation |
| Accounting posting | Phase 2A (optional) | Yes (`journal_entry_id` nullable) | §4: Layer 4 owns posting |

---

## 5. Final Canonical Tables

### 5.1 Core Tables (7)

| # | Table | Layer | Purpose | Status |
|---|---|---|---|---|
| 1 | `tax_adjustments` | 2 | Classification records: "this accounting fact is treated differently for tax" | ✅ Validated |
| 2 | `tax_qce` | 2 | Qualifying capital expenditure register | ✅ Validated |
| 3 | `tax_loss_balances` | 2 | Loss carry-forward register | ⚠️ Conditional (reclassify loss_used/loss_expired) |
| 4 | `entity_tax_config` | 2 | Entity tax profile (operational config) | ✅ Validated |
| 5 | `tax_computation_inputs` | 3 | Immutable input snapshot per entity per assessment period | ⚠️ Conditional (document JSONB schema) |
| 6 | `tax_computation_results` | 3 | Final tax position per entity per assessment period | ✅ Validated |
| 7 | `tax_rule_versions` | 3 | Bridge to Gate E: captures which rule set was applied | ✅ Validated |

### 5.2 Optional Utility Tables (3)

| # | Table | Layer | Purpose | Defer? |
|---|---|---|---|---|
| 8 | `tax_qce_periods` | 2 | Running-WDV cache per QCE item per period | Yes — defer to Gate E |
| 9 | `tax_computation_steps` | 3 | Intermediate computation results | Yes — defer to Gate E |
| 10 | `tax_provisions` | 4 | Tax provision journal entries | Yes — defer to Phase 2A.5 |

### 5.3 Tables Removed

| Table | Reason |
|---|---|
| `tax_asset_movements` | Duplicates accounting facts. Contents split between source transactions and `tax_qce_periods`. |
| `tax_computations` | Split into `tax_computation_inputs` + `tax_computation_results`. |

---

## 6. Final Field Corrections

### 6.1 `tax_adjustments` — Corrected

| Field | Classification | Adjudication | Correction |
|---|---|---|---|
| `assessment_period_id` | Infrastructure | ✅ Present | **BLOCKER:** Entity does not exist. Must define target. |
| `source_fact_id` | FACT | ✅ Present | No change. Polymorphic UUID is acceptable for Phase 2A. |
| `rule_snapshot` | RULE SNAPSHOT | ✅ Present | Per-record snapshot is correct (captures which rule applied to this specific adjustment). |

### 6.2 `tax_loss_balances` — Corrected

| Field | Classification | Adjudication | Correction |
|---|---|---|---|
| `loss_used` | FACT (adjudication) | ❌ | **Reclassify as DERIVED VALUE.** Computed from opening_balance + loss_arising + Gate E rules. Store for performance, rebuildable. |
| `loss_expired` | FACT (adjudication) | ❌ | **Reclassify as DERIVED VALUE.** Computed from opening_balance + loss_arising + Gate E rules. Store for performance, rebuildable. |
| `closing_balance` | DERIVED VALUE | ✅ Correct | No change. |
| `assessment_period_id` | Infrastructure | ✅ Present | **BLOCKER:** Entity does not exist. Must define target. |

### 6.3 `entity_tax_config` — Corrected

| Field | Classification | Adjudication | Correction |
|---|---|---|---|
| `company_type` | OPERATIONAL CONFIG | ✅ Present | Acceptable as user-entered. Gate E may reclassify during computation. |

### 6.4 `tax_computation_inputs` — Corrected

| Field | Classification | Adjudication | Correction |
|---|---|---|---|
| `input_snapshot` | COMPUTATION INPUT | ✅ Present | **LOW:** Document JSONB schema. Expected: `{ adjustments: [...], qce: [...], loss_balances: [...], entity_config: {...} }` |
| `assessment_period_id` | Infrastructure | ✅ Present | **BLOCKER:** Entity does not exist. Must define target. |

### 6.5 `tax_computation_results` — No corrections needed

All fields validated. `tax_due` is correctly classified as COMPUTATION OUTPUT.

### 6.6 `tax_rule_versions` — No corrections needed

All fields validated. `rule_snapshot` JSONB is the correct bridge pattern.

---

## 7. Final Rule Boundary

### What Phase 2A MUST NOT store (confirmed):

| Field Type | Location | Principle |
|---|---|---|
| CIT rates | Gate E `rule_snapshot` | P2: TAX FACTS ARE NOT TAX RULES |
| ETR minimum | Gate E `rule_snapshot` | P2 |
| Capital allowance rates | Gate E `rule_snapshot` | P2 |
| Loss carry-forward rules | Gate E `rule_snapshot` | P2 |
| Disallowable expense categories | Gate E `rule_snapshot` | P2 |
| Small company thresholds | Gate E `rule_snapshot` | P2 |
| WHT rates | Gate E `rule_snapshot` | P2 |
| Transitional provisions | Gate E `rule_snapshot` | P2 |

### What Phase 2A DOES store (confirmed):

| Field | Table | Purpose |
|---|---|---|
| `rule_version_id` | `tax_computation_results` | FK → `tax_rule_versions` |
| `rule_snapshot` | `tax_adjustments` | Per-record: which Gate E rule applied to this classification |
| `rule_snapshot` | `tax_loss_balances` | Per-record: which Gate E rule applied to loss utilization |
| `rule_snapshot` | `tax_rule_versions` | Full rule set for reproducibility |

---

## 8. Final Provenance Model

```
source_fact_id (UUID)
  │
  ├── FK → source_transactions (typed, if source is a source transaction)
  │
  └── FK → journal_lines (typed, if source is a journal line)
```

**Pattern:** Polymorphic UUID with source type disambiguation at the application layer.

**Existing alignment:** `reconciliation.ts` uses `source_transaction_id` (nullable UUID) and `journal_entry_id` (nullable UUID) as typed references. The `tax_adjustments` table uses a single `source_fact_id` instead.

**Assessment:** The polymorphic pattern is acceptable for Phase 2A. The typed pattern (separate nullable columns) is cleaner but requires two columns. The adjudication does not resolve this — it's an implementation choice.

---

## 9. Final Computation Lifecycle

```
tax_computation_inputs (immutable snapshot)
  │
  │  input_snapshot JSONB: all Layer 2 facts at snapshot time
  │
  ▼
tax_computation_results
  │
  │  status: 'draft' → 'finalized'
  │  finalized_at: TIMESTAMPTZ (set on finalization)
  │  rule_version_id: FK → tax_rule_versions
  │  inputs_snapshot_id: FK → tax_computation_inputs
  │
  │  IMMUTABLE once finalized
  │  Superseded by creating a new computation (not by updating)
  │
  ▼
tax_provisions (optional, Layer 4)
  │
  │  journal_entry_id: FK → accounting journal_entries
  │  Only created when tax liability needs accounting recognition
  │
  ▼
Accounting Layer (Layer 1)
  │  Posted via accounting posting kernel
  │  Follows Gap 2 reversal semantics
```

**Status values:** `draft` | `finalized` (no `reversed` — follows Gap 2 constraint)

**Immutability:** `finalized_at` timestamp. No UPDATE after finalization. Supersession = new computation row.

---

## 10. Gate E Firewall

### Compliance Check

| Rule | Status | Evidence |
|---|---|---|
| No CIT rates stored in schema | ✅ | §8.2: "CIT rates → Gate E rule_snapshot" |
| No ETR thresholds stored in schema | ✅ | §8.2: "ETR minimum → Gate E rule_snapshot" |
| No capital allowance rates stored in schema | ✅ | §8.2: "Capital allowance rates → Gate E rule_snapshot" |
| No loss carry-forward rules stored in schema | ✅ | §8.2: "Loss carry-forward rules → Gate E rule_snapshot" |
| No WHT rates stored in schema | ✅ | §8.2: "WHT rates → Gate E rule_snapshot" |
| `rule_snapshot` JSONB for all Gate E references | ✅ | §8.3: three tables with `rule_snapshot` |
| Computation reproducible from inputs + rule_snapshot | ✅ | `tax_computation_inputs` + `tax_computation_results.rule_version_id` → `tax_rule_versions.rule_snapshot` |

### Remaining Risk

| Risk | Severity | Mitigation |
|---|---|---|
| `company_type` in `entity_tax_config` has statutory implications (small company triggers 0% CIT rate) | LOW | Gate E validates during computation. User-entered value is advisory; Gate E may reclassify based on turnover + fixed assets. |

---

## 11. Phase 2A Implementation Scope

### What Phase 2A Creates (7 core tables):

1. `tax_adjustments` — Layer 2 tax classification records
2. `tax_qce` — Layer 2 qualifying capital expenditure register
3. `tax_loss_balances` — Layer 2 loss carry-forward register
4. `entity_tax_config` — Layer 2 entity tax profile
5. `tax_computation_inputs` — Layer 3 immutable input snapshot
6. `tax_computation_results` — Layer 3 final tax position
7. `tax_rule_versions` — Layer 3 bridge to Gate E

### What Phase 2A Defers:

| Table | Defer To | Reason |
|---|---|---|
| `tax_qce_periods` | Gate E | Rebuildable cache |
| `tax_computation_steps` | Gate E | Step-by-step audit trail |
| `tax_provisions` | Phase 2A.5 | Optional accounting posting |
| VAT/WHT position tables | Phase 2B | Reconciliation layers |

### What Phase 2A Does NOT Create:

- No new accounting tables (Layer 1 complete via Gap 1)
- No Gate E rule tables (owned by Gate E)
- No compliance tables (existing: tax_filings, wht_receipts, tax_input_entries, tax_reminders, tax_settings)

---

## 12. Remaining Blockers

| # | Blocker | Severity | Required Action |
|---|---|---|---|
| 1 | **`assessment_period` entity undefined** | **BLOCKER** | The Adjudication references `assessment_period_id` on 4 tables (tax_adjustments, tax_qce, tax_loss_balances, tax_computation_inputs, tax_computation_results) but no `assessment_periods` table exists. Zero matches in `src/` and `supabase/migrations/`. **Must decide:** (a) `assessment_period_id` = `period_id` (accounting period IS the assessment period), or (b) create `assessment_periods` table. Recommendation: (a) — the accounting period IS the assessment period for Nigerian CIT. The `assessment_period_id` field is redundant with `period_id`. Remove it or alias it. |
| 2 | **`loss_used` / `loss_expired` classification** | MEDIUM | Reclassify from FACT to DERIVED VALUE. These are computed from opening_balance + loss_arising + Gate E rules. Store for performance but document as rebuildable. |
| 3 | **`input_snapshot` JSONB schema** | LOW | Document the expected structure before implementation. Recommended: `{ adjustments: Array<{id, adjustment_type, accounting_amount, tax_amount, citation}>, qce: Array<{id, asset_description, qce_amount, statutory_category}>, loss_balances: Array<{id, profit_source_type, opening_balance, loss_arising}>, entity_config: {company_type, is_vat_registered, remittance_schedule, sector} }` |

---

## 13. Verification

- Git status: 96+ modified files (all pre-existing from other agents). No new modifications from this audit.
- Zero code changes made.
- Zero migrations deployed.
- Zero tests executed.
- `assessment_period`: 0 matches in `src/` and `supabase/migrations/` (confirmed blocker).
- `period_id`: 36 matches in `supabase/migrations/` (all in accounting context: journal_entries, accounting_periods).
- `rule_snapshot`: 0 matches in `supabase/migrations/` (Phase 2A tables not yet created — expected).
- `tax_adjustment|tax_qce|tax_loss|entity_tax_config|tax_computation|tax_rule_version|tax_provision`: 0 matches in `src/` (confirmed clean slate).
- `src/domain/tax/`: directory does not exist (confirmed).
- `accounting_periods` table: exists with id, code, state, start_date, end_date (confirmed as closest match to assessment period).

---

*End of Phase 2A Architecture Integrity Gate.*
