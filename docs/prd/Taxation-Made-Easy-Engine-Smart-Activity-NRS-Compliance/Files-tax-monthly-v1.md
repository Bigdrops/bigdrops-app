# Files.tax Monthly Compliance Document — PRD v1

## 1. Objective and Scope

**Objective:** Generate one compliance document per calendar month for each tenant. The document shows the VAT position, the WHT position, the upcoming deadlines, and the items that need attention. The VAT section must also provide VAT filing support: the user must be able to trace the VAT figure to its contributing transactions and supporting evidence (section 4).

**Scope:** This feature is downstream of, and depends on, `Technical-plan-v1.2.md` and the existing invoice and payment tables. This document links to those sources. It does not restate their content.

- `Technical-plan-v1.2.md` is the next revision of the compliance engine PRD. It is not yet finalized. Its reconciliation items live in `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` and in the reconciliation report `docs/reports/invoice-quote/nrs-obligation-reconciliation-2026-09-04.md`.
- The statutory authority is `NRS-docs/`. The Nigeria Tax Act 2025 (NTA) text is in the repository. The Nigeria Tax Administration Act 2025 (NTAA) text is confirmed from the official gazette but is not yet committed to `NRS-docs/`. This gap is tracked below.

**Out of scope:** NRS e-invoicing transmission, the general notification system, the WHT subsidiary regulation sourcing, and the VAT filing delivery mechanism (section 4.11). Those are separate decisions.

## 2. Open Decisions

These decisions need a call from the project lead. They are consolidated here.

| # | Decision | Context | Blocks |
|---|----------|---------|--------|
| 1 | WHT remittance deadline | The deadline is not in the NTA or the NTAA. It is delegated to "regulations relating to deduction of tax at source" (NTAA §51(1), §51(9)). That regulation is a third document, separate from both Acts in the repository, and has not been sourced. NTAA §107(1) fixes a 21st-day penalty trigger for late remittance, but the obligation itself is not fully defined without the regulation. | The WHT remittance deadline field |
| 2 | "Deducted by you" WHT | No expense or supplier-payment module exists. This field has no data source. Build an expense module, or render the field as "not tracked yet" permanently. | The deducted-by-you field |
| 3 | VAT remittance at day 14 | NTA §155(4) applies only to a designated VAT withholding agent. Confirm whether any real BIGDROPS tenant is ever in that category before this line ships for anyone. | The day-14 remittance line |
| 4 | NTAA text in NRS-docs | The NTAA gazette text is converted but not committed to `NRS-docs/`. Commit it so citations resolve inside the repository. | Any NTAA citation |
| 5 | Push function name | The client helper `sendPushForNotification` invokes an edge function named `send-push`, which does not exist in `supabase/functions/`. The real dispatcher is `dispatch-push-notifications`. Decide which name is canonical and align the code. | The push propagation channel |
| 6 | Email channel | No outbound email mechanism exists. Decide whether to build one before or alongside this feature. | The email propagation channel |
| 7 | Small-business exemption | Unresolved statutory question pending the NTAA 2025 primary source. The NTAA text is absent from NRS-docs/, so section 22(4) cannot be quoted or treated as verified. Do not introduce a separate small business classification; the verified NTA 2025 classification is small company (section 202). Confirm tenant qualification before the exemption changes the return deadline line. | The VAT return deadline line for qualifying tenants |
| 8 | Dashboard surface | The dashboard has a config-driven KPI card registry and a section-level component pattern. Decide whether Files.tax uses a KPI card or a dedicated dashboard section. | The dashboard propagation channel |
| 9 | VAT Filing Support delivery mechanism | The PRD does not prescribe a delivery format (section 4.11). Decide later: an in-app filing workspace, a downloadable report, a structured export, a portal-assisted workflow, or an official integration. | The VAT filing-support implementation |
| 10 | Evidence requirements | Exact evidence requirements must follow the applicable Nigerian tax rules. This PRD does not invent them. Confirm the applicable rules when implementation is planned. | The evidence model (section 4.5) |

## 3. Field-by-field Data Mapping

Each row is verified against current code. Corrections to the working assumption are marked.

| Field | Source | Status |
|-------|--------|--------|
| Business name | `settings.company_name` | Exists — used by `src/pages/DashboardRedesign.tsx` |
| Period | User-selected month | **Corrected:** period fields already exist (`tax_filings.period_start/period_end`, `tax_reminders.period_start/period_end`). The new work is the monthly aggregation query over invoices by `issue_date`. |
| Output VAT charged | Sum of `computeDocument()` VAT per invoice, by `issue_date` in period | Exists per-invoice (`src/lib/Calculations.ts`). Needs a new aggregation query. |
| Input VAT paid | Sum of `tax_input_entries.vat_amount`, by `is_recoverable` | **Corrected:** table exists and is already consumed by the Compliance Hub `VatInputsPanel` (`src/modules/compliance/services/complianceService.ts`, `fetchTaxInputEntries`). First consumer of a monthly rollup. |
| Net VAT payable | Output minus input | Computed once both sides exist |
| Withheld from you (credit) | Sum of `payments.wht_amount` for the period | Exists and ready today (`payments.wht_amount`, migration `20260520090003_invoices.sql`) |
| Deducted by you (payable) | WHT withheld when paying a supplier | Does not exist — no expense or supplier-payment module. Must render as "not tracked yet", never as zero. |
| VAT return deadline, 21st (PRD default) | NTAA §22(1) | Unresolved. NTA §156(1) delegates the general return due date to the NTAA 2025. The NTAA primary text is absent from NRS-docs/, so the day cannot be verified in this repository. The 21st remains the PRD default (Technical-plan-v1.1 section 8.1); it is not statutory authority here. Subject to open decision 7. |
| VAT remittance (withheld), 14th | NTA §155(4) | Confirmed from primary text. Applies only if the tenant is a designated VAT withholding agent (open decision 3). |
| WHT remittance deadline | Subsidiary regulation not yet located | Must render as "pending", never a guessed date (open decision 1). |
| WHT credit note not uploaded | `wht_receipts` where `receipt_status != 'verified'`, joined to invoices in period | Exists, fully buildable (`wht_receipts.receipt_status`, default `'pending'`) |
| Invoice with no payment recorded | Invoices where `src/domain/invoice/financialState.ts` derives `unpaid` or `partially_paid` | Exists, fully buildable |
| Supporting evidence status | Per-transaction evidence layer for output and input VAT | **New:** no evidence layer exists today. Capability defined in section 4.5. |
| Filing status | `tax_filings` | Exists as a table with a Compliance Hub panel (`TaxFilingsPanel`). The VAT return linkage is future work (section 4.7). |

## 4. VAT Filing Support

### 4.1 Purpose

The VAT section of the monthly document must not stop at the VAT payable figure. At the applicable VAT filing and payment period, the document must present the VAT position together with the underlying transaction records and the supporting evidence. The user must be able to understand, substantiate, review, and reconcile the figure.

The core user question is: "Why does BIGDROPS say I owe this VAT amount, and what records support it?"

Filing support means preparing and presenting the information and evidence required to support the VAT position. It does not imply direct electronic submission or payment. This section establishes product intent only.

### 4.2 Evidence Chain

The VAT compliance position has an evidence chain. Each link depends on the one before it.

VAT payable → VAT calculation components → contributing transactions → supporting evidence → exceptions and missing evidence → filing position → payment → reconciliation

The product must keep these items distinct:
- The calculated VAT position.
- The underlying transactions that contribute to the position.
- The supporting documents and evidence.
- The filing or return.
- The payment or remittance.
- The final reconciled state.

### 4.3 Compliance States

The product must be able to represent these states separately.

| State | Meaning |
|-------|---------|
| CALCULATED | The VAT amount derived from the authoritative BIGDROPS tax calculation. |
| SUPPORTED | The transactions and records that substantiate the calculation. |
| EXCEPTIONS | Transactions or required supporting information that are missing, incomplete, inconsistent, or require user review. |
| FILED | The VAT return or declaration submitted for the applicable period. |
| PAID | The amount actually remitted. |
| RECONCILED | The BIGDROPS calculation, filing position, and payment state have been reconciled. |

The states are conceptually distinct. This PRD does not require all states to be implemented immediately.

### 4.4 Transaction Traceability

The future VAT filing-support experience must let the user trace the VAT position to its underlying records.

Output VAT:
- Total output VAT.
- Period covered.
- Contributing taxable sales and invoices.
- Per-transaction VAT contribution, where available from the authoritative calculation.

Input VAT:
- Total input VAT considered.
- Period covered.
- Contributing purchase and input records.
- Recoverability or eligibility state, where available.
- Supporting evidence status.

Adjustments:
- Any applicable adjustment.
- The reason and the source record.
- The impact on the VAT position.

Rule: the presentation layer must not independently recompute tax values when authoritative calculation outputs exist. `src/lib/Calculations.ts` remains the financial source of truth.

### 4.5 Evidence Model

Define a future evidence layer that can answer:
- What evidence exists?
- What transaction does it support?
- What tax calculation component does it support?
- Is the evidence complete?
- Is evidence missing?
- Does the item require user action?

Use generic language such as "supporting records" or "evidence". Do not prescribe one universal document type. Do not invent statutory document requirements. Exact evidence requirements must follow the applicable Nigerian tax rules.

Hard rule: the future implementation must never silently treat missing evidence as valid evidence.

### 4.6 Exception Experience

Define a future VAT review state for incomplete support. The user must be able to distinguish "VAT amount calculated" from "VAT amount fully supported".

Conceptual example (not a requirement):

| Item | Count |
|------|-------|
| VAT payable | ₦X |
| Sales transactions | 47 |
| Input VAT transactions | 18 |
| Transactions with incomplete supporting evidence | 3 |

The example is conceptual only. Its values are not product requirements.

Do not automatically invalidate a VAT calculation solely because supporting evidence is missing, unless the applicable tax rule requires that treatment.

### 4.7 Filing and Payment Separation

VAT calculation is not the same thing as VAT filing.
VAT filing is not the same thing as VAT payment.
VAT payment is not the same thing as reconciliation.

The future product must represent these states separately. This PRD does not decide the final implementation mechanism.

### 4.8 Period-End Experience

At the applicable VAT filing and payment period, the product should surface a VAT compliance package or workspace. It should contain:
- VAT period.
- Taxable transaction totals.
- VAT calculation.
- A clear derivation of the VAT amount.
- Output VAT summary.
- Input VAT summary.
- Net VAT position.
- Transaction drill-down.
- Supporting evidence status.
- Missing evidence and exceptions.
- Filing information.
- Payment and remittance information.
- Reconciliation status.
- Relevant user actions.

The package is not required to be one monolithic file. Do not assume it is a PDF. Do not assume it is a downloadable file. Do not assume direct tax-authority submission. Those are future implementation decisions.

### 4.9 Relationship to Monthly Tax Compliance

The VAT filing-support capability fits into the existing monthly tax compliance architecture. The monthly document must be able to communicate:
- What is my VAT position?
- Why is it this amount?
- What records support it?
- What evidence is missing?
- Has it been filed?
- Has it been paid?
- Is it reconciled?

The dashboard, notification, push, WhatsApp, and future email and scheduling concepts must reference the authoritative VAT compliance state. They must not independently calculate or redefine the VAT amount.

### 4.10 Trust and Tax-Correctness Rules

These rules are hard requirements:
- Never fabricate a VAT amount.
- Never replace missing transaction data with zero without an explicit business rule.
- Never treat bank inflows as automatically equivalent to taxable VAT sales.
- Never treat WHT deducted by a customer as a reduction of the underlying VAT transaction, unless the applicable tax rules explicitly require that treatment.
- Keep WHT received by the company separate from WHT deducted by the company.
- Never invent filing deadlines.
- Never invent evidence requirements.
- Never create competing VAT formulas in the presentation layer.
- Every displayed VAT figure must be traceable to an authoritative calculation or source.
- Every exception must identify the underlying record and the required user action, where possible.

### 4.11 Execution and Delivery Decision

Implementation of VAT filing support is a future execution decision. This PRD establishes product intent, information architecture, compliance lifecycle, evidence requirements, traceability requirements, exception handling, and future propagation requirements.

This PRD does not prescribe:
- API integration.
- Tax authority integration.
- PDF generation.
- CSV, XML, or JSON export.
- Direct filing.
- Direct payment.
- Provider selection.
- Scheduler implementation.

When implementation is planned, the first technical step must map this evidence chain to the existing invoice, calculation, payment, input-VAT, and supporting-record infrastructure. Do not design new tables or duplicate calculations before that mapping is complete.

## 5. Propagation Requirements

The propagation channels were audited. Each subsection names the channel, its state, and what Files.tax pushes through it.

### 5.1 Push notifications — EXISTS AND USABLE

State: `@capacitor/push-notifications@^8.0.3` is installed. The runtime is mounted (`src/App.tsx`, `PushNotificationRuntime`), tokens are registered (`src/domain/notifications/pushRegistration.ts` → `push_device_tokens`), and the edge function `supabase/functions/dispatch-push-notifications/index.ts` sends via FCM.

What Files.tax pushes: one push when the monthly document is ready, and one push per attention item on the due-date threshold. Route the user to the document page via the notification `route` field, following the pattern in `sendPushForNotification` and the `pushNotificationActionPerformed` handler.

Caveat: the client helper invokes `send-push`, which does not exist. The real dispatcher scans the `notifications` table. Align the names first (open decision 5). The dispatcher is not on a schedule — see 5.5.

### 5.2 In-app notification center — EXISTS AND USABLE

State: `notifications` table plus `NotificationBell`, `NotificationDrawer`, and `NotificationItem` (mounted in `src/components/dashboard/DashboardOverview.tsx`). The dashboard also renders `RecentAlertsCarousel` from the same `useNotifications` hook.

What Files.tax pushes: one `notifications` row per attention item, with `domain`, `severity`, and `route` set. Follow the existing row shape in `src/hooks/useNotifications.ts`. No new component is needed.

### 5.3 Dashboard — EXISTS, WITH A CARD SLOTTING SYSTEM

State: the dashboard is `src/pages/DashboardRedesign.tsx` → `DashboardOverview.tsx`. It shows KPI cards, the alerts carousel, a payment-reminder banner, recent documents, and activity. The KPI cards are config-driven through `src/config/kpiCards.ts` (metric registry, default metric list, per-user card storage).

What Files.tax pushes: one card showing the next deadline and the count of attention items, linking to the full document. Two slotting options exist:

- Add a metric to the KPI registry (`KPI_METRIC_REGISTRY` in `src/config/kpiCards.ts`), following the existing metric pattern.
- Add a section component beside `PaymentReminderBanner` / `RecentAlertsCarousel` in `DashboardOverview.tsx`.

Open decision 8 picks one. Do not build a new dashboard layout.

### 5.4 Email — DOES NOT EXIST

State: no outbound email mechanism exists. There is no SMTP configuration, no transactional email service, and no email template in `src/` or in the edge functions.

Action: list this as an open decision (open decision 6). Do not spec a new email system in this PRD. Files.tax ships without email until the lead decides otherwise.

### 5.5 Scheduled / cron — DOES NOT EXIST

State: `pg_cron` was added and then removed. Migration `20260903100000_pgrst_queue_not_cron.sql` records that `pg_net` is unavailable and notes that external cron provides server-side recovery. No scheduled edge function exists in `supabase/config.toml`. The push dispatcher is a poll-style function with no scheduler attached.

Action: the monthly generation needs a trigger. The smallest options, in order:

1. Client-side generation on dashboard load (no new infrastructure).
2. External cron calling the existing dispatcher edge function.
3. A Supabase scheduled function (requires config.toml schedule support).

Do not rebuild the scheduling layer. Pick an option with the lead before implementation.

### 5.6 Compliance Hub — EXISTS

State: `src/pages/ComplianceHub.tsx` is implemented and routed at `/compliance` in `src/components/app/AppShell.tsx`. It contains `VatInputsPanel`, `WhtReceiptsPanel`, `TaxFilingsPanel`, and `TaxRemindersPanel`.

What Files.tax does: reuse the Compliance Hub panels as the document's drill-down targets. Link each document line to the matching panel route instead of duplicating the panels.

### 5.7 WhatsApp — FUTURE PROPAGATION CHANNEL (DOES NOT EXIST)

State: no WhatsApp integration exists. Files.tax does not treat WhatsApp as existing infrastructure.

Action: document WhatsApp only as a future channel. When a channel is built, it must reference the authoritative VAT compliance state (section 4.9). It must not calculate or redefine the VAT amount.

## 6. Hard Rule: No Fabricated Values for Blocked Fields

Two fields are blocked: "deducted by you" WHT and the WHT remittance deadline.

- The "deducted by you" field must render "not tracked yet". It must never render zero.
- The WHT remittance deadline must render "pending". It must never render a guessed date.

No reminder, badge, or notification may surface either field with a fabricated or zero value. This is a hard requirement, not a note. The dashboard card, the notification rows, and the push message must all respect it.

## 7. Build Order Recommendation

Ranked by what the audit and the data mapping show is ready.

1. **Buildable now**
   - The attention-items section: invoices with no payment recorded (`financialState.ts`) and unverified WHT credit notes (`wht_receipts`).
   - The dashboard card (slotting mechanism exists).
   - The in-app notification rows for attention items.
   - Link document lines to Compliance Hub panels.
2. **Aggregation work (second)**
   - The VAT rollup: output VAT over invoices by `issue_date`, input VAT rollup over `tax_input_entries`.
   - The net VAT payable computation.
   - The "withheld from you" credit rollup over `payments.wht_amount`.
3. **Blocked (last, with named unblocking dependency)**
   - "Deducted by you" WHT — blocked on an expense or supplier-payment module (none exists).
   - WHT remittance deadline — blocked on locating the subsidiary regulation "regulations relating to deduction of tax at source".
   - VAT remittance (withheld) at day 14 — blocked on confirming the tenant is a designated VAT withholding agent.
4. **VAT Filing Support (future execution decision)**
   - Not scheduled in this build order. Implementation is a future decision (section 4.11). It must start by mapping the evidence chain to the existing invoice, calculation, payment, and input-VAT infrastructure.

## 8. Dependencies

- `Record-capture-v1.md` — **hard blocking dependency.** The "deducted by you" WHT field and the running-cost/expense data cannot be produced without the record-capture surface. This is a hard dependency, not an optional enhancement. Until a supplier payment or expense can be recorded, those two fields stay blocked. Note: the WHT remittance deadline field remains blocked on the missing subsidiary regulation; a capture surface cannot unblock a missing regulation.
- `Technical-plan-v1.2.md` — the engine PRD this feature consumes. Not yet finalized.
- `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` — the obligation-to-citation map. The NTAA-dependent rows are still open.
- `docs/reports/invoice-quote/nrs-obligation-reconciliation-2026-09-04.md` — the evidence base for the deadline and threshold values.
- Invoice and payment tables (`invoices`, `payments`, `wht_receipts`, `tax_input_entries`, `tax_filings`, `tax_reminders`).
- `src/lib/Calculations.ts` — financial calculations stay in this module. This document never computes prices or taxes itself.
- VAT Filing Support (section 4) — depends on the existing invoice, calculation, payment, input-VAT, and supporting-record infrastructure. The delivery mechanism is open decision 9.