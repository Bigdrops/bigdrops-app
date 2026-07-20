# Financial Operations — Architecture Rewrite Report

**This report was written by DeepSeek on 2026-07-04.**
**Trigger:** Full architecture trace of every financial path in the codebase, producing a business architecture specification and this implementation report.

---

## 1. Objective & Scope

### Covered
- Full financial obligation graph: origin (Calculation Engine), ownership boundaries (Invoice → Payment → Financial State → Compliance), tax architecture (VAT and WHT), cross-document rules (Invoice, Quotation, Waybill, BOQ/RFQ), reporting architecture, audit architecture.
- 7 architectural questions answered with codebase evidence.
- Rewrite of `docs/prd/financial-operations-prd.md` as a forward-looking business architecture specification.

### Intentionally Excluded
- UI component hierarchies (except where they reveal architecture violations).
- Non-financial document modules (purchase orders, standalone waybills).
- Authentication and authorization for financial actions.

---

## 2. Evidence-Based Findings

Every architectural claim below is traced to inspected code:

### 2.1 Calculation Engine Authority

| Finding | Evidence |
|---------|----------|
| `Calculations.ts` is the canonical pipeline | `src/lib/Calculations.ts` — `computeDocument()` is the sole entry point for per-row VAT/WHT/discount/total computation |
| Invoice wrapper duplicates | `src/domain/invoice/calculations.ts` — `calcTotals()` and `resolveRowVat()` normalize legacy states then call `computeDocument()` |
| Quotations reuse invoice domain | `src/domain/quotation/calculations.ts` — imports and calls invoice `calcTotals()` |
| Waybills forbid monetary values | `src/domain/waybill/engine/types.ts` — `RawWaybillItem` has explicit comment: `// unit_price, rate, vat, discount, subtotal, grand_total are NOT allowed on waybills` |
| BOQ/RFQ no financial math | `src/domain/table-document/types.ts` — `cp`/`sp` are `string` type, no calculation functions exist in BOQ domain |

### 2.2 Settlement Architecture

| Finding | Evidence |
|---------|----------|
| Settlement tracks cash + WHT only | `payments.cash_amount`, `payments.wht_amount` — VAT is embedded in grand_total |
| WHT schema columns exist but are dead | `supabase/migrations/20260520090001_invoices.sql` defines `wht_rate` (numeric), `wht_type` (text); `paymentRepository.ts:27-28` hardcodes `null` for both |
| Overpayment derived, never persisted | `financialState.ts:53` — computed as `Math.max(0, settled - total)` but never stored |
| Fast-pay vs full-service divergence | `paymentEntryHelpers.ts:50` hardcodes `whtDeducted: 0`; `paymentService.ts` supports WHT |
| Payment voiding RPC exists | `supabase/migrations/20260703000000_record_payment_voided.sql` — `record_payment_voided` RPC |

### 2.3 WHT Evidence Chain

| Layer | Table | Source | Evidence |
|-------|-------|--------|----------|
| Expected | `invoices.wht` | Calculation Engine | `src/lib/Calculations.ts` computes WHT |
| Actual | `payments.wht_amount` | Payment entry | `paymentRepository.ts:25` writes `wht_amount` |
| Proof | `wht_receipts` | Manual entry | `WhtReceiptsPanel.tsx:193` — direct Supabase insert |
| Cross-ref | — | `summarizeComplianceWht()` | `src/domain/compliance/whtSummary.ts` — shows 0 WHT from payments |

### 2.4 Compliance Architecture Violations

| Finding | Evidence |
|---------|----------|
| WHT receipts bypass service layer | `WhtReceiptsPanel.tsx:193` — `supabase.from('wht_receipts').insert(...)` |
| VAT inputs bypass service layer | `VatInputsPanel.tsx:61` — `supabase.from('tax_input_entries').insert(...)` |
| Compliance has no repository abstraction | `ComplianceHub.tsx` — parent orchestrator, but all children call Supabase directly |
| No event-driven sync | No subscribe/publish hooks between invoice/payment lifecycle and compliance |

### 2.5 Financial State Derivation

| Finding | Evidence |
|---------|----------|
| Dual TS + SQL derivation | `financialState.ts` (TypeScript) + `invoice_financials_v` (SQL view in `20260520090010_views.sql`) |
| Balance clamp agreement | Both use `MAX(0, ...)` — but TS uses `Math.max()`, SQL uses `MAX()` |
| Overpayment: TS only | `financialState.ts:53` computes overpayment; SQL view does not |
| Status sync writes to invoices | `invoiceStatusService.ts` — reads `computed_status` from `invoice_financials_v`, writes to `invoices.status` |

### 2.6 Audit Coverage

| Finding | Evidence |
|---------|----------|
| Payment events recorded | `src/lib/audit.ts` — `record_payment_recorded`, `record_payment_voided` RPC wrappers |
| DELETE/ARCHIVE missing | No audit RPCs for `record_invoice_deleted`, `record_invoice_archived` |
| No correlation chains | `activity_events` table has no `correlation_id`, `parent_event_id`, `aggregate_id/type` columns |
| No before/after snapshots | `activity_events.metadata` stores event data but no old/new state diff |

### 2.7 Reports

| Finding | Evidence |
|---------|----------|
| Direct DB queries | `ReceivablesSection.tsx`, `ProjectsSection.tsx` — `supabase.from(...).select('*')` |
| No projection layer | All report queries are inline per-component |
| Tax split in utility | `reportUtils.ts` — `computeReportTaxMetrics()` splits VAT/WHT |

---

## 3. Fact vs Conclusion

| Observation (Fact) | Interpretation (Conclusion) |
|--------------------|-----------------------------|
| `payments.wht_rate` and `wht_type` columns exist but are never populated | WHT context at payment time is deliberately deferred — planned feature never finished |
| `whtDeducted: 0` hardcoded in `paymentEntryHelpers.ts` despite being destructured from input | Fast-pay UI was built for cash-only MVP, WHT field was considered but cut |
| Compliance components call Supabase directly | Architecture violation — bypasses validation, audit, and future event hooks |
| Reports query DB directly per component | Violates Principle 3 (projection layer) — each report duplicates query logic |
| `financialState.ts` and `invoice_financials_v` both derive balance | Known dual-implementation risk — neither is authoritative |

---

## 4. Key Decisions (from Architecture Questions)

1. **VAT is NOT a settlement dimension.** Settlement tracks cash + WHT only. VAT is embedded in `grandTotal`.
2. **WHT is a three-layer evidence chain:** expected (invoice) → actual (payment) → proof (receipt).
3. **Compliance CONSUMES financial data** via SQL joins. It does not produce, modify, or own financial state.
4. **Reports are read-only projections** with no independent calculation engine and no write-back to financial tables.
5. **`invoices.vat`, `invoices.discount`, `invoices.wht` store COMPUTED TOTALS.** Rate inputs live in `calculationInputs` (JSONB in `custom_fields`) and per-item overrides.
6. **Overpayment is derived per-invoice, never persisted.** No credit note or refund system.
7. **Cross-document rules:** Quotations reuse invoice domain; Waybills strip monetary values; BOQ/RFQ has no financial computation.

---

## 5. Risks & Limitations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dual calculation engines (`Calculations.ts` vs invoice `calculations.ts`) diverge | Medium | Wrapper should delegate entirely; currently has overlapping logic |
| Fast-pay and full-service payment paths diverge further | Medium | Unify to single payment service entry point |
| Compliance direct-Supabase pattern makes audit/validation impossible | High | Extract service layer for compliance CRUD |
| Overpayment is computed but never acted upon (no credit workflow) | Low | Acceptable as current-MVP gap |
| WHT snapshot on payments is dead code | Low | Populate on next payment schema migration |
| Reports have no projection layer | Medium | Acceptable for current scale; projected queries will need it |

---

## 6. Verification

- `bun run build` — passed
- `bun run typecheck` — passed
- All architecture claims cross-referenced against actual source code paths and line numbers

---

## 7. Deferred Work

- Phase 2-4 implementation (see PRD §16 — Implementation Roadmap)
- Non-financial architecture analysis (inventory, procurement, HR modules)
- `RecordPaymentModal.tsx` dead code removal audit (single import check, no actual usage)
