# Roadmap-to-PRD Reconciliation Report

This report was written by opencode on 2026-09-07 via Local Runner.

## Objective

Reconcile the Waterfall Roadmap (Waterfall-roadmap.md) against the Taxation-Made-Easy PRD set and Accounting Foundation Blueprint. Identify which planned business systems have PRD plans, which lack them, and produce a recommended implementation sequence.

## Scope

- Waterfall Roadmap phases 0–6 and gates A–F
- All PRD documents in `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/`
- Accounting Foundation Blueprint v1 sections 14–22
- Increment 7 coverage audit findings
- Recommended implementation sequence

## Skills used

karpathy (discipline), supabase, supabase-postgres-best-practices

## Documentation standard

ASD-STE100 Simplified Technical English

---

## 1. Roadmap Phase Status

| Phase | Gate | Status | Evidence |
| :--- | :--- | :--- | :--- |
| Phase 0 — Baseline lock | GATE A (entity boundary) | ✅ CLOSED | Entity accounting boundary resolved in Increment 1 |
| | GATE B (money precision) | ✅ CLOSED | Decimal.js precision 20, ROUND_HALF_UP confirmed |
| Phase 1 — Accounting Foundation | GATE C (posting kernel) | ✅ CLOSED | Balanced posting kernel exists (Increments 1–2) |
| Phase 2 — Accounting→Tax Bridge | GATE D | ⛔ OPEN | No accounting-to-tax bridge exists |
| Phase 3 — Tax Rules Engine | GATE E | ⛔ OPEN | No versioned statutory parameters |
| Phase 4 — Compliance | GATE F | ⛔ OPEN | Compliance Hub exists but no authoritative compliance positions |
| Phase 5 — Record Engagement | — | ⛔ PENDING | Planning artifact only (Record-engagement-plan-v1.md) |
| Phase 6 — Deferred Extensions | — | ⛔ PENDING | Bank feeds, multi-currency, payroll deferred |

---

## 2. Business System PRD Coverage Matrix

| Business System | Blueprint Section | Roadmap Phase | PRD Document | PRD Status | Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Invoices | §12 (Revenue) | Phase 1 §7 | Technical-plan-v1.1.md | ✅ Active | ✅ Full |
| Payments | §13 (Payments) | Phase 1 §8 | Technical-plan-v1.1.md | ✅ Active | ✅ Full |
| Expenses | §14 (Expenses) | Phase 1 §9 | Record-capture-v1.md | ✅ Active | ⚠️ Partial (capture only) |
| Fixed Assets | §15 (Fixed Assets) | Phase 1 §10 | None | — | ❌ No PRD |
| Credit Notes / Refunds | §16 (Corrections) | Phase 1 §11 | None | — | ❌ No PRD |
| Purchases (AP) | §14 (Expenses) | Phase 1 §9 | Record-capture-v1.md | ✅ Active | ⚠️ Partial (capture only) |
| Other Income | — | Not mapped | None | — | ❌ No PRD |
| WHT (deducted by you) | §19 (Bridge) | Phase 2 | Files-tax-monthly-v1.md | ✅ Active | ⚠️ Blocked (no expense module) |
| VAT journal entries | §19 (Bridge) | Phase 2 | None | — | ❌ No journal-level PRD |
| Loss Register | §22 (Losses) | Phase 2 | None | — | ❌ No PRD |
| Accounting-to-Tax Bridge | §19 (Bridge) | Phase 2 | None | — | ❌ No PRD |
| Tax Rules Engine | §21 (Rules) | Phase 3 | None | — | ❌ No PRD |
| Compliance (authoritative) | §23 (Compliance) | Phase 4 | Files-tax-monthly-v1.md | ✅ Active | ⚠️ Partial (planning only) |
| Record Engagement | — | Phase 5 | Record-engagement-plan-v1.md | 🔄 Draft | ✅ Full (planning) |

### Key gaps

1. **Fixed Assets**: Blueprint §15 defines capitalization, useful life, depreciation, disposal. No PRD document exists. Roadmap Phase 1 §10 lists it. Gap: no capture surface, no register, no depreciation logic.

2. **Credit Notes / Refund**: Blueprint §16 defines corrections/reversals. No PRD exists. Roadmap Phase 1 §11 lists corrections. Gap: no reversal entries, no correction linkage.

3. **VAT Journal Entries**: Record-capture-v1.md defines capture. No PRD defines how VAT flows from captured entries into journal postings. Gap: the bridge between operational VAT records and accounting entries.

4. **WHT (deducted by you)**: Files-tax-monthly-v1.md defines the field. Record-capture-v1.md defines the capture surface. But no expense/supplier-payment module exists to feed data. Blocked until Record Capture is implemented.

5. **Accounting-to-Tax Bridge**: Blueprint §19 defines the transformation chain. No PRD exists. Roadmap Phase 2 lists it. Gap: no adjustment records, no taxable-profit derivation.

6. **Tax Rules Engine**: Blueprint §21 defines versioned parameters. No PRD exists. Roadmap Phase 3 lists it. Gap: no parameter store, no rule citations.

---

## 3. Recommended Implementation Sequence

The sequence follows the Waterfall Roadmap's dependency chain and fills the gaps identified above. Each step names its blocking dependency.

### Step 1: Record Capture (unblocks everything downstream)

**Source PRD**: Record-capture-v1.md ✅ Active

**What it delivers**: Plain-language capture surface for expenses, supplier payments, and running costs. Extends `tax_input_entries`.

**Blocks**: Files-tax "deducted by you" WHT field, expense data for CIT estimates, engagement plan MVP.

**Status**: PRD exists. Not implemented.

### Step 2: Expense-to-Journal Entries (new PRD needed)

**Source PRD**: None ❌

**What it delivers**: Expenses captured by Record Capture feed accounting journal entries (debit expense, credit cash/AP).

**Blocks**: Complete trial balance, P&L accuracy, accounting-to-tax bridge.

**Gap**: No PRD defines how captured expenses become journal entries. Blueprint §14 defines the contract. A new PRD is needed, or Record-capture-v1.md must be extended.

### Step 3: Credit Notes and Reversals (new PRD needed)

**Source PRD**: None ❌

**What it delivers**: Correction entries for invoices, payments, and expenses. Reversal posts equal-and-opposite entry. Correcting entry links to original.

**Blocks**: Immutability guarantees, audit trail completeness.

**Gap**: No PRD defines correction semantics. Blueprint §16 defines the contract. A new PRD is needed.

### Step 4: Files-Tax Monthly Compliance Document

**Source PRD**: Files-tax-monthly-v1.md ✅ Active

**What it delivers**: Monthly VAT position, WHT position, deadlines, attention items. VAT rollup over invoices and tax_input_entries. Dashboard card, notification rows, Compliance Hub drill-down.

**Blocks**: Compliance visibility, engagement plan attention items.

**Status**: PRD exists. Build order defined (section 7). "Deducted by you" WHT blocked on Step 1. WHT deadline blocked on unsourced subsidiary regulation.

### Step 5: Fixed Assets and Depreciation (new PRD needed)

**Source PRD**: None ❌

**What it delivers**: Asset register, capitalization policy, useful life, straight-line depreciation, disposal. Separate from tax capital allowances.

**Blocks**: Complete asset position, accurate P&L (depreciation expense), accounting-to-tax bridge (capital allowances need asset facts).

**Gap**: No PRD exists. Blueprint §15 defines the contract. A new PRD is needed.

### Step 6: VAT Journal Integration (extend Record-capture or new PRD)

**Source PRD**: Record-capture-v1.md ⚠️ Partial

**What it delivers**: VAT input entries captured today feed journal entries (debit VAT input, credit AP). Output VAT from invoices feeds journal entries (debit AR, credit VAT output).

**Blocks**: Complete trial balance, VAT position in accounting reports.

**Gap**: Record-capture defines capture but not journal posting. Blueprint §12–13 define the contract.

### Step 7: Accounting-to-Tax Bridge (new PRD needed)

**Source PRD**: None ❌

**What it delivers**: Accounting profit → tax adjustments → taxable-profit inputs. Disallowables, exempt-income adjustments, capital allowances, loss register.

**Blocks**: Profit-based CIT, authoritative tax positions.

**Gap**: No PRD exists. Blueprint §19, §22 define the contract. Roadmap Phase 2 lists it.

### Step 8: Compliance Positions (extend Files-tax)

**Source PRD**: Files-tax-monthly-v1.md ⚠️ Partial

**What it delivers**: Reproducible compliance positions from accounting facts, tax rules, and evidence. Filing preparation, payment tracking, reconciliation.

**Blocks**: Authoritative compliance status, dashboard visibility.

**Gap**: Files-tax defines planning. No authoritative compliance calculation exists.

### Step 9: Record Engagement (extend Record-engagement-plan-v1)

**Source PRD**: Record-engagement-plan-v1.md 🔄 Draft

**What it delivers**: Behavioral prompts, attention items, escalation, prioritization. MVP uses existing infrastructure.

**Blocks**: User adoption, record completeness.

**Status**: Planning artifact. MVP scope defined. Dependencies on Steps 1 and 4.

---

## 4. Summary

| Category | Count | Items |
| :--- | :--- | :--- |
| PRD exists and active | 4 | Technical-plan-v1.1, Files-tax-monthly-v1, Record-capture-v1, Record-engagement-plan-v1 |
| PRD exists but draft | 2 | Accounting-foundation-blueprint-v1, bigdrops-tax-ux-vision-v1 |
| Business system with full PRD | 2 | Invoices, Payments |
| Business system with partial PRD | 3 | Expenses, Purchases, Compliance |
| Business system with no PRD | 5 | Fixed Assets, Credit Notes/Refunds, VAT Journal, WHT Bridge, Tax Rules Engine |
| New PRDs needed | 5 | Expense-to-Journal, Credit Notes/Reversals, Fixed Assets, VAT Journal Integration, Accounting-to-Tax Bridge |
| Existing PRDs needing extension | 2 | Files-tax-monthly-v1 (compliance positions), Record-capture-v1 (journal posting) |

---

## 5. Verification

- bun run audit:load: skipped (no code changes)
- bun run typecheck: skipped (no code changes)
- git status: clean, only this report as untracked file
- bun run build: skipped due to hardware policy
