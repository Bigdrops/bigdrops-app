# BOURXE Follow-Up Brainstorm

This ticket was written by Buffy on 2026-11-19 via Freebuff.

---

## Status: PROPOSED (ideas only)

BOUXRE is a React/TypeScript/Supabase business-operations platform for Nigerian SMEs. Bolu is its conversational document assistant with invoice create/modify implemented; other document families are deferred. Brainstorm of valuable follow-up ideas, grouped by theme. These are proposals only — not approved product decisions. No code changes are included.

---

## 1. Bolu Assistant Expansion

- Quotation pack: create/modify/convert quotation ↔ invoice/CSR flows, BOQ→quotation conversion, line-item editing, discounts/taxes.
- Purchase Order pack: PO create/modify, supplier linkage, GRN/waybill conversion.
- CSR (Customer Service Request) pack: create/modify, status lifecycle, attachments.
- Waybill/delivery note pack: create/modify, dispatch tracking.
- Receipt & payment pack: record payments, allocate to invoices, generate receipts, partial payments.
- Credit note / debit note / refund pack.
- Multi-document workflows: "convert this quotation to invoice", "duplicate last invoice with changes", batch operations.
- Document search & retrieval via Bolu: "find all unpaid invoices for customer X".
- Template/customization assistance: help users edit document templates, branding, signatories.
- Conversational reporting: "show me revenue this month", "which customers owe the most".

## 2. Provider Reliability & Routing

- Live-provider E2E and multi-tenant browser tests.
- Provider health monitoring, fallback chains, retry/backoff, circuit breakers.
- Cost/latency observability per provider; per-user daily limit enforcement and model allowlist hardening.
- Secret vault rotation and audit; loopback-only dev user enforcement.
- Streaming completion reliability and save-hang remediation (already partially addressed).

## 3. Money / Compliance Correctness

- Tax posting kernel wiring: journal-derived reporting, reversal boundaries, immutability triggers.
- NTA 2025 statutory rules (CIT, allowances, levy) seeding and versioning.
- Expense money-out flow: accounting foundation, reversals.
- Reconciliation: bank statement import, matching, exception handling.
- Audit trail completeness: document lifecycle events, permission changes, data access.
- Multi-currency and FX handling; VAT/WHT calculations.

## 4. Mobile / Native

- Offline sync rebuild on tenant-aware architecture (currently deferred debt): tenant-scoped queue, sync after tenant context resolves, per-tenant document numbers, auth re-validation.
- Android release pipeline, update notifications, APK delivery.
- Foldable/tablet responsive layouts per the Responsive UI Design Standard (mobile/fold-closed, fold-open, tablet, desktop).
- Native SQLite access hardening and migration versioning.

## 5. Platform Quality

- Cold launch / startup performance and branding cleanup.
- Observability: Sentry frontend privacy audit, PostHog analytics, product intelligence dashboards.
- SEO and metadata hardening.
- Design-lab previews and onboarding experiments (v4/v5) stabilization or removal.
- Dead code / toast infrastructure cleanup.

## 6. UX Polish

- Settings information architecture redesign.
- Intrusive tips suspension / product guidance tuning.
- Document view CSR issues, view-invoice CSR issues.
- Signatory management system.
- Responsive table/card densification across viewport classes.

## 7. Data / Reporting

- Journal-derived reporting foundation (Gap 1 spec).
- Dashboard metrics: revenue, receivables, payables, tax liabilities.
- Export: PDF/CSV/Excel for invoices, quotations, reports.
- Search phase 2: document search forensic audit follow-ups.

---

## Suggested Next Concrete Steps

1. Quotation pack for Bolu (highest leverage after invoice).
2. Live-provider E2E + multi-tenant browser tests.
3. Tax posting-kernel wiring.

## References

- `AGENTS.md` — repository governance

## Verification

- No code changed by this ticket; documentation only.
- `bun run audit:load` / `bun run typecheck`: not run (documentation-only).
- Git state: pre-existing modified/untracked work preserved; this ticket adds one new untracked file only.