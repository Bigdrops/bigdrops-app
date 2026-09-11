# Increment 9 — Record Capture Readiness Audit

This report was written by MiMo on 2026-09-07 via OpenCode.

## Objective

Audit `Record-capture-v1.md` against seven readiness dimensions to determine whether the PRD is sufficiently specified for implementation as the next accounting increment. Read-only — no code, migration, test, or documentation changes.

## Scope

- Record-capture-v1.md (full PRD, 192 lines)
- Waterfall-roadmap.md (positioning and sequencing)
- Accounting-foundation-blueprint-v1.md (downstream architecture)
- adaptive-uiux-alignment.md (first-class UI authority)
- Applicable standards: document-column, document-form-consolidation, json-import, audit-trail, receipt
- Existing Increment 1–8 reports (implementation state)
- Current implementation: VatInputsPanel, tax_input_entries schema, ComplianceJsonImportSheet
- Skills: karpathy, ponytail

## Documentation Standard

ASD-STE100 Simplified Technical English

---

## Audit by Dimension

### 1. Capture Flows — CLEAR

The PRD defines one entry point: "Record what happened." The flow asks five plain-language questions:

1. Who did you pay? (payee)
2. How much? (total amount)
3. When? (date)
4. What was it for? (plain-language category)
5. Did you get a receipt? (evidence upload)

The flow must not ask the user to split net and VAT. It must not ask for a tax category or recoverability decision. This is unambiguous. The UX aligns with `adaptive-uiux-alignment.md` — bottom-sheet entry, progressive disclosure, mobile-first. The PRD was marked "Aligned" in that tracking document on 2026-09-05.

### 2. Authoritative Business Event / Date / Amount — CLEAR

| Field | Source | Authority |
|-------|--------|-----------|
| Total amount | User input (plain-language) | Authoritative for the record |
| Date | User input | Authoritative |
| Payee | User input | Authoritative |
| Category | User input (plain-language) | Authoritative for the record |
| Evidence | Upload (optional at record time) | Authoritative when present |

The PRD correctly identifies a boundary: the system derives net/VAT from the total amount behind the scenes. The presentation layer reads the derived view; it never recomputes. This is consistent with `Calculations.ts` as the financial source of truth (AGENTS.md §3).

**Known gap (explicitly called out by the PRD at §3.3):** `src/lib/Calculations.ts` does not expose a reverse gross-to-net/VAT function. A new calculation-engine function is required. The PRD states this openly and does not pretend it is reusable. This is engineering work, not an architectural blocker.

### 3. Lifecycle — CLEAR

The lifecycle is implicit but well-defined across the PRD:

1. **Create:** User records a plain-language expense/payment/running-cost.
2. **Derive:** System maps category to tax treatment (net/VAT split, recoverability, WHT).
3. **Evidence:** Upload optional at record time, required before the record counts as "supported."
4. **Consume:** Record feeds the accounting system through the source transaction → journal pipeline (blueprint §6).

The "supported" state policy is listed as Open Decision #1 (evidence policy). The PRD acknowledges this decision must be called before full implementation. However, a minimal default is natural: evidence optional at record time, tracked as a status field. This does not block a first increment.

### 4. Entity Boundary — CLEAR

The PRD extends `tax_input_entries` rather than creating a new table. This is justified:

- The table exists with the right tenant scoping (`settings_id`).
- The Compliance Hub already renders it through `VatInputsPanel`.
- A second table would split the evidence trail.

**Current `tax_input_entries` schema (migration `20260520090009_tax.sql`):**

```sql
CREATE TABLE IF NOT EXISTS tax_input_entries (
    id uuid PRIMARY KEY,
    settings_id integer NOT NULL,
    date date NOT NULL,
    vendor_name text,
    category text,
    reference text,
    net_amount numeric NOT NULL DEFAULT 0,
    vat_amount numeric NOT NULL DEFAULT 0,
    is_recoverable boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Required extensions (PRD §4):**

| Requirement | Current state | Gap |
|-------------|---------------|-----|
| Evidence column (JSONB, following payments `attachments` pattern) | Missing | Migration needed |
| Optional payment link (`payment_id`-style column) | Missing | Migration needed |
| Plain-language category column (distinct from tax mapping) | `category` exists as free text — repurpose or add new column | Decision needed: reuse `category` for plain-language or add `plain_category` |
| Derived tax-treatment view over the raw record | Missing | View or service layer needed |

The existing `net_amount` / `vat_amount` columns stay. The plain-language flow writes the total amount and the derived view fills these through the authoritative calculation. This keeps `VatInputsPanel` and the monthly rollup working unchanged.

**Verdict: The table shape fits. The extension is a small migration (3–4 columns + 1 view). No new table needed.**

### 5. Accounting Boundary — CLEAR

The PRD draws an explicit boundary at §5:

> "Record Capture is the user-facing recording surface. It is not a general-ledger interface. It does not implement accounting infrastructure."

Record Capture records business activity. The Accounting Foundation Blueprint (§6: Business Activity → Source Transaction → Journal) consumes it. The two layers stay separate.

**Cross-reference with Increment 7 findings:**

| Area | Increment 7 status | Record Capture impact |
|------|-------------------|----------------------|
| Expenses | MISSING | Record Capture provides the capture surface. The accounting adapter (expense → source_transaction) is downstream work. |
| Purchases/PO | PARTIAL | Record Capture captures the money-out event separately from POs. |
| VAT input | WORKING (in tax_input_entries) | Record Capture extends this table. No conflict. |
| WHT | Tracked operationally | Record Capture enables "deducted by you" WHT through supplier-payment records. |
| Refunds/Credit Notes | MISSING | Out of scope for Record Capture (separate module). |
| Fixed Assets | STUB | Out of scope for Record Capture. |

**Verdict: The boundary is clean. Record Capture feeds the accounting pipeline; it does not replace it.**

### 6. Record Capture vs. Accounting Responsibilities — CLEAR

| Concern | Record Capture | Accounting |
|---------|---------------|------------|
| User input | Plain-language: payee, amount, date, category | Reads derived values only |
| Tax derivation | Derived view (system computes) | Does not recompute; consumes journal-ready data |
| Evidence | Upload, status tracking | Does not manage evidence |
| Journal posting | Does not post | Posts via source_transaction → journal pipeline |
| VAT/WHT | Records facts (amount, payee) | Determines ledger treatment |

This is consistent with AGENTS.md §3: "PDFs are renderers. They receive prepared data only. PDFs must not calculate prices, taxes, totals, VAT, or discounts." The same principle applies to Record Capture: it captures facts, it does not compute accounting.

### 7. Dependencies and Open Decisions — IDENTIFIED

**Open Decisions (PRD §6):**

| # | Decision | Blocks | Minimal default for first increment |
|---|----------|--------|-------------------------------------|
| 1 | Evidence policy | SUPPORTED state per record | Optional at record time; tracked as `has_evidence` boolean. |
| 2 | Payee identity (free text vs pick list) | WHT mapping quality | Free text (exists today in VatInputsPanel). Pick list is an enhancement. |
| 3 | Plain-language category set | Tax mapping quality | Fixed starter list + free text. The list can grow. |
| 4 | Money-out payment linkage | Reconciliation | Keep separate from invoice payments table. Link via `payment_reference` text. |
| 5 | Entry point location | Discoverability | Compliance Hub tab (exists today as VAT Input Entries). Rename/extend. |
| 6 | Small-business exemption | CIT consumption | Out of scope — statutory question is unresolved. Do not introduce classification. |

**Technical dependency:**

- Reverse gross-to-net/VAT function in `src/lib/Calculations.ts`. The PRD explicitly calls this out at §3.3. This is the one piece of new calculation-engine work required. It is a single function, not an architectural change.

**No external dependency blockers.** The PRD does not depend on missing tables, unsourced regulations, or unbuilt infrastructure for its core capture flow.

---

## Cross-Reference with Applicable Standards

| Standard | Applies? | Conflict? |
|----------|----------|-----------|
| document-column-standard | No — Record Capture is not a line-item document module | No |
| document-form-consolidation-standard | Partial — Record Capture uses a sheet (bottom-sheet), not a FormPage pattern | No conflict — sheets are the correct pattern for single-record entry per adaptive-uiux-alignment.md |
| json-import-standard | Yes — PRD mentions "Import JSON" path via ComplianceJsonImportSheet | No conflict — existing import surface works; PRD reuses it |
| audit-trail-standard | Yes — Record Capture events should produce activity_events | No conflict — pattern exists (PAYMENT_RECORDED); extend for EXPENSE_RECORDED |
| receipt-standard | No — receipts are downstream of invoice payments, not expenses | No conflict |

---

## Cross-Reference with Implementation Reports

| Report | Key finding | Record Capture alignment |
|--------|-------------|------------------------|
| Increment 7 | Expenses MISSING, top priority for accounting profit | Record Capture is the prescribed capture surface for expenses |
| Increment 7 | VAT input exists in tax_input_entries | Record Capture extends this exact table |
| Increment 7 | WHT tracked operationally, excluded from journal | Record Capture enables "deducted by you" WHT data |
| Increment 8 | 5 business systems lack PRDs | Record Capture is not one of them — its PRD exists and is complete |
| Increment 8 | Expenses recommended as next PRD | Record Capture already covers the expense capture surface |

---

## Contradictions or Missing Decisions

**None found.** The PRD is internally consistent. It explicitly calls out:
- The missing reverse calculation function (§3.3)
- The open decisions that need a project lead call (§6)
- The boundary between Record Capture and the Accounting Foundation (§5)
- The non-goals that are now downstream capabilities (§5.1)

The PRD does not conflict with `adaptive-uiux-alignment.md`, `Accounting-foundation-blueprint-v1.md`, or any applicable standard.

---

## Verdict

**READY FOR IMPLEMENTATION.**

The PRD is sufficiently specified for a first increment. The core capture flow is unambiguous. The data model extension is defined. The accounting boundary is explicit. The UI aligns with the Facelift design system.

**Recommended first increment scope:**

1. Extend `tax_input_entries` with evidence (JSONB), payment reference, and plain-language category columns.
2. Build a plain-language recording sheet (bottom-sheet, mobile-first) replacing the tax-literate VatInputsPanel form.
3. Add the reverse gross-to-net/VAT function to `Calculations.ts`.
4. Build the derived tax-treatment view (or service function) that computes net/VAT/recoverability from total amount + category.
5. Wire the recording sheet to insert into the extended `tax_input_entries`.
6. Add `EXPENSE_RECORDED` to the audit trail (activity_events whitelist + audit function).

**Not in first increment (deferred):**
- Full expense → source_transaction → journal adapter (downstream, per Accounting Foundation Blueprint)
- Supplier registry / pick list (Open Decision #2 — free text is sufficient initially)
- Category taxonomy (Open Decision #3 — fixed starter list is sufficient initially)
- Payment linkage to bank outflows (Open Decision #4 — text reference is sufficient initially)
- WHT rate table and derivation (blocked on statutory sourcing, per Files-tax open decision 1)

---

## Verification

- `git diff --check`: passed (no changes made — read-only audit)
- `git status`: clean (only pre-existing uncommitted changes from Increments 6–8)

## Appendix: Files Referenced

| File | Role |
|------|------|
| `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md` | Primary audit subject |
| `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/adaptive-uiux-alignment.md` | First-class UI authority |
| `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Accounting-foundation-blueprint-v1.md` | Downstream architecture |
| `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Waterfall-roadmap.md` | Sequencing reference |
| `docs/standard/document-column-standard.md` | Applicable standard (no conflict) |
| `docs/standard/document-form-consolidation-standard.md` | Applicable standard (no conflict) |
| `docs/standard/json-import-standard.md` | Applicable standard (no conflict) |
| `docs/standard/audit-trail-standard.md` | Applicable standard (extend for expense events) |
| `docs/standard/receipt-standard.md` | Reference (no direct applicability) |
| `docs/reports/taxation-made-easy/accounting-increment7-activity-coverage-audit-2026-09-07.md` | Prior audit findings |
| `docs/reports/taxation-made-easy/accounting-increment8-roadmap-reconciliation-2026-09-07.md` | Prior audit findings |
| `supabase/migrations/20260520090009_tax.sql` | Current tax_input_entries schema |
| `src/components/compliance/VatInputsPanel.tsx` | Current VAT input UI (to be replaced) |
| `src/domain/accounting/types.ts` | Accounting domain types |
| `src/lib/Calculations.ts` | Financial calculation layer (reverse function needed) |
