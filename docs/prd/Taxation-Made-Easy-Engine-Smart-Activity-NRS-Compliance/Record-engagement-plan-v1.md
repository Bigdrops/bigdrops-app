# Record Engagement Plan v1

> Status: Draft — planning artifact
> Last updated: 2026-09-05
> Type: Product / UX planning document
> PRD set: Taxation Made Easy Engine Smart Activity & NRS Compliance (this folder)

---

## 1. Purpose

This document converts the behavioral and UX concepts already present in
this PRD folder into an implementation-ready product plan for getting
BIGDROPS users to record real business activity consistently.

It answers one question:

"How does BIGDROPS systematically get a Nigerian business to keep its
real business activity recorded without turning the product into an
unusable accounting chore?"

This is a planning artifact. It does not implement anything. It feeds
the future architecture blueprint and the Waterfall roadmap.

## 2. Problem

An invoice says "we billed someone." A payment says "money actually
moved." Those are not interchangeable facts.

Many Nigerian SMEs do not maintain clean records. If BIGDROPS builds
only an invoicing and compliance engine, it produces a technically
sophisticated product sitting on top of incomplete business records.
VAT figures, WHT positions, and CIT estimates are only as correct as
the records beneath them.

The failure mode to avoid: a compliance engine that is accurate about
the data it has and blind to the data it does not.

## 3. Product principle

The guiding principle, preserved from `Openai-ux-contribution.md`
section 21 and `bigdrops-tax-ux-vision-v1.md` section 2:

> The user records what happened. BIGDROPS explains what it means for
> tax.
>
> BIGDROPS must not require users to understand Nigerian tax law to
> maintain useful business records. The system collects ordinary
> business facts first, infers or determines the tax treatment second,
> and asks for more information only when needed.

The operating principle for this plan:

**Recording business activity must be easier than continuously ignoring
it.**

The objective is not to punish users. The objective is to make omission
progressively harder to ignore while keeping legitimate business
operation practical. The system moves from helpful prompting to
persistent attention and, only where narrowly justified, controlled
enforcement.

The system never asserts that an unobserved transaction occurred merely
because a pattern suggests it might have occurred.

## 4. Scope

In scope:

- Product behavior for recording customer payments, supplier payments,
  expenses, running costs, purchases, receipts, tax-relevant activity,
  supporting evidence, and recurring business activity.
- Trigger and evidence semantics.
- The engagement lifecycle: prompt, dismiss, snooze, defer, re-prompt,
  escalate, persist, enforce.
- Prioritization of unresolved recording gaps.
- MVP boundary and later phases.

Out of scope:

- Application code, database schema, and migrations.
- Notification, accounting, and tax-calculation implementation.
- The accounting foundation itself. This plan defines the behavioral
  layer only; the accounting model is defined later by the accounting
  foundation work.
- Statutory rules. Rates, thresholds, and deadlines remain governed by
  NRS-docs/. This plan describes product behavior around tax
  obligations without inventing legal requirements.

## 5. Relationship to existing PRDs

| Document | Relationship |
|---|---|
| `Openai-ux-contribution.md` | Primary product direction. Supplies the Record → Reconcile → Explain → Optimise → Comply → Transmit sequence, the business-dashboard view, and the "record what happened" mental model. |
| `bigdrops-tax-ux-vision-v1.md` | Supporting discovery material. Its concepts (Unrecorded Business Activity loop, "Why?" explanations, metrics) are incorporated. Its six audit questions are answered or marked in section 14. |
| `Record-capture-v1.md` | Existing dependency. Defines the minimum capture surface (plain-language "record what happened" flow extending `tax_input_entries`). This plan drives users toward that surface; it does not replace it. |
| `Files-tax-monthly-v1.md` | Downstream consumer. Files.tax renders the gaps this plan helps users close. The engagement plan feeds its attention items; it does not duplicate its VAT/WHT content. |
| `Technical-plan-v1.1.md` | Carries the send-time compliance gate (progressive disclosure). This plan references that gate in section 9; it does not alter it. |
| `ai-integration.md` | The AI layer is advisory. It observes the same confirmed / strongly-indicated / suggested semantics defined in this plan and must never present inferred activity as fact. |
| `NRS-docs/` | Statutory authority. No product rule in this plan creates a statutory requirement. |

## 6. Activity taxonomy

Business activity is grouped into capture families. Each family maps to
existing or planned capture surfaces.

| Activity family | Examples | Capture surface today | Capture surface planned |
|---|---|---|---|
| Money in — customer payments | Invoice payment, partial payment, advance, overpayment | `payments` table linked to invoice; "Record Payment" flow | Record-capture v1 flow; bank-reconciliation-driven (later) |
| Money in — other receipts | Non-invoice income, refunds received, loans | None | Record-capture "received money from another source" branch |
| Money out — supplier payments | Supplier invoice payment | None | Record-capture flow (money-out) |
| Money out — expenses and running costs | Transport, subscriptions, bank charges, rent, utilities | None (VAT-input form only, tax-literate) | Record-capture flow with plain-language category |
| Money out — purchases | Equipment, materials, assets | None | Record-capture flow; fixed-asset register later |
| Tax-relevant activity | VAT input entries, WHT credit notes received, VAT/WHT remittances | `tax_input_entries` (VatInputsPanel), `wht_receipts` | Unchanged; engagement drives completion |
| Evidence | Receipts, invoices, credit notes, WHT certificates | `payments.attachments` JSONB via PaymentAttachmentUploader | Record-capture evidence step |
| Recurring activity | Subscriptions, rent, standing supplier services | None | Pattern suggestions (later, weak-signal only) |
| Activity inside BIGDROPS | Invoice created, quotation accepted, waybill dispatched | Document modules already record these | Reuse as confirmed signals |

The event taxonomy from `bigdrops-tax-ux-vision-v1.md` section 4.1
(SALE, PAYMENT_RECEIVED, SUPPLIER_PAYMENT, EXPENSE, ASSET_PURCHASE,
REFUND, WHT_DEDUCTION, WHT_CREDIT_RECEIVED, VAT_PAYMENT, TAX_PAYMENT)
remains the long-term domain shape. It is a schema decision for the
future accounting foundation, not a v1 requirement.

## 7. Trigger and evidence model

Every prompt must be traceable to evidence. Three confidence classes
are defined.

| Class | Meaning | Example | What the user sees |
|---|---|---|---|
| Confirmed | A record already exists in BIGDROPS (an invoice, a payment, an entry). The gap is the missing companion record. | Invoice issued, no payment recorded; expense recorded, no evidence attached | Direct prompt with a specific recording action |
| Strongly indicated | Evidence suggests an event occurred but no record confirms it. | Payment amount differs from invoice amount; invoice long past due; bank line (later) | Confirmation prompt. Never a recorded fact |
| Suggested | A recurring pattern implies possible activity. | Same supplier paid monthly; subscriptions recurring | Low-friction suggestion, dismissible without consequence |

Rules:

1. Confirmed gaps justify persistent reminders.
2. Strong signals justify confirmation prompts only. The user's
   confirmation creates the record; the signal alone never does.
3. Suggested patterns justify suggestions only. A suggestion is never
   counted in any record-completeness measure as a known gap.
4. BIGDROPS never replaces missing data with zero and never presents an
   inferred transaction as a recorded one.

## 8. Engagement lifecycle

The core lifecycle:

```
EXPECTED ACTIVITY
  → SIGNAL / EVIDENCE
  → PROMPT
  → RECORD
  → RESOLVE
```

When unresolved:

```
PROMPT
  → SNOOZE / DISMISS / DEFER
  → RE-PROMPT
  → ESCALATE
  → PERSISTENT ATTENTION
  → CONTROLLED ENFORCEMENT (narrow, justified cases only)
```

Definitions:

| Term | Meaning |
|---|---|
| Attention item | One unresolved gap with evidence, a recording action, and a resolution condition. |
| Prompt | The first presentation of an attention item. |
| Record | The user performs the offered action; the gap closes. |
| Resolve | The attention item is removed by a recorded event or an accepted explanation. |
| Dismiss | The user states the item does not apply or is wrong for this instance. Dismissal suppresses the item; it does not delete the underlying evidence. |
| Snooze / defer | The user postpones. The item returns on a bounded schedule. |
| Re-prompt | The item reappears after snooze or after the underlying condition persists. |
| Escalate | The item moves to a more visible treatment. Escalation increases visibility, not frequency. |
| Gate | A workflow step the user cannot complete until a narrow condition is met. Gates are reserved for statutory or factual-safety cases. |

## 9. Intervention levels

The source documents support a graduated model. Five levels are defined,
refined from the sketch in the task brief.

| Level | Name | Behavior | Examples |
|---|---|---|---|
| L0 | Passive visibility | Counts and status render in dashboards; no prompt is raised. | Files.tax attention count; dashboard "records needing attention" row; evidence-completeness display |
| L1 | Contextual nudge | One inline prompt inside the flow the user is already in. Silently dismissible. | "This client has 3 unpaid invoices" on client page; "Have you received payment?" on invoice view |
| L2 | Persistent reminder | Survives navigation and session changes. Appears in the in-app notification center. Optional push (later). | Invoice-no-payment reminder 18 days after issue; expense-no-evidence reminder |
| L3 | Escalated attention | Prominent placement (dashboard banner, high-priority notification). Never blocks work. | Month-end completeness review; large-materiality unpaid gaps near period end |
| L4 | Controlled workflow gate | A narrow action is blocked until a specific condition is met. | Send/transmit-time compliance validation (already in v1.1); confirming a tax claim as supported requires evidence (Files.tax state, not a record block) |

Gate policy (narrow by design):

- A gate is justified only when (a) a statutory requirement applies to
  the action, or (b) completing the action would create a false record.
- The send/transmit gate for mandatory statutory data is justified and
  already specified in Technical-plan-v1.1.md.
- Recording flows are never gated. A user can always record a payment,
  an expense, or "not applicable."
- There is no gate of the form "record everything before continuing."
  The product must remain usable with incomplete records; incomplete
  records are surfaced, not blocked.

## 10. Prompt behavior

Prompt design rules:

1. Low friction: the offered recording action is one tap from the
   prompt.
2. Contextual: prompts appear where the related data is visible.
3. Explanatory: every prompt states what happened, why it matters,
   what BIGDROPS needs, and what to do next.
4. Non-accusatory: prompts ask about the activity, never about the
   user's diligence.
5. Fact-aware: the prompt states the confidence class. "BIGDROPS cannot
   find a payment for this invoice" is a fact. "This may have been a
   payment" is a suggestion.
6. Corrections available: the user can always tell BIGDROPS the
   assumption is wrong.
7. No spam: an attention item prompts at most once per interval; repeat
   treatment comes from escalation, not frequency.
8. Priority: high-value unresolved activity prompts before low-value
   activity (section 13).

## 11. Dismissal, snooze, defer, and resolution

| Action | Semantics | Rules |
|---|---|---|
| Dismiss — not applicable | The activity did not occur or is irrelevant. | Suppresses this item instance. The underlying evidence stays. |
| Dismiss — already recorded | The user points to an existing record. | BIGDROPS verifies the reference and closes the item if a matching record exists; otherwise asks for clarification. |
| Dismiss — wrong suggestion | The pattern-based suggestion is incorrect. | Weak-signal items learn from this; confirmed items are never dismissed as "wrong" without an explanation. |
| Snooze / defer | The user postpones to a bounded horizon. | Deferral horizons are product decisions tied to the item's materiality and the natural business rhythm (day, week, month-end). Exact durations are implementation decisions recorded in the architecture blueprint. A deferred item always returns. |
| Repeated omission | The item re-prompts and escalates. | Pressure increases through visibility and consequence framing, never through frequency or accusation. |
| Resolution | The gap closes. | An item resolves only when a recorded event or an accepted explanation removes it. |
| False positives | The user reports an error. | Recorded as a feedback event. High false-positive triggers are reviewed product-side and may be retired or re-classified. |
| User explanations | "Not applicable", "already recorded", "will record later". | "Will record later" becomes a deferral with a bounded horizon. Explanations are auditable (section 15). |

## 12. Controlled enforcement

Enforcement is the narrow exception, not the default.

Justified gates:

1. Send/transmit compliance validation (Technical-plan-v1.1.md): the
   action is transmitting a document to the tax authority; statutory
   data must be present.
2. Files.tax supported-state confirmation: a VAT or WHT figure is
   presented as SUPPORTED only with evidence; otherwise it is an
   EXCEPTION. This is a display state, not a workflow block.
3. False-record prevention: actions that would overwrite or fabricate a
   financial fact require confirmation (for example, marking a payment
   as matched without any matching evidence).

Never enforced:

- Invoice or document creation.
- Payment or expense recording.
- Access to dashboards, reports, or Files.tax.
- Any form of "record everything to continue."

## 13. Prioritization

Unresolved attention items are ranked. Ranking is qualitative; no
arbitrary weights are defined.

Ranking factors:

1. Financial materiality — the amount involved.
2. Tax or compliance impact — whether the gap affects a VAT, WHT, or
   CIT position or an obligation.
3. Age — how long the gap has been open.
4. Confidence — confirmed gaps rank above strong signals, which rank
   above suggestions.
5. Downstream dependencies — whether other records or reports wait on
   the item.
6. Recurrence — recurring activity gaps rank above one-offs.
7. Report impact — whether Files.tax or a period report is distorted by
   the gap.
8. Evidence availability — whether the missing piece is evidence the
   user can supply now.

A decision table applies the factors:

| Priority | Conditions | Treatment |
|---|---|---|
| High | Confirmed AND (material OR tax-impacting) | L2 immediately; L3 near period end |
| Medium | Strong signal OR confirmed but low materiality | L1-L2 |
| Low | Suggested patterns | L1, dismissible without consequence |

Weighted scoring is a future implementation decision, not a v1 rule.

## 14. Record completeness

A record-completeness concept is justified. It is a product metric, not
a financial-health score.

What it measures:

- The share of material business activity that BIGDROPS can see is
  captured, reconciled, and evidenced.
- The metrics from `Openai-ux-contribution.md` section 20: record
  completeness, payment-recording rate, evidence completeness,
  reconciliation rate, tax readiness.

What it does not measure:

- Business profitability or financial health.
- Actual tax liability.
- Anything outside the records BIGDROPS holds.

Conceptual calculation:

- Confirmed events are countable facts.
- Strong signals are candidates for confirmation; they are never
  counted as known gaps or known records.
- Suggested patterns are excluded entirely.
- Completeness is expressed as "share of what BIGDROPS can observe is
  documented", never as "share of the true business position."

Display:

- Users see a count ("7 things may need your attention"), not a
  percentage of truth.
- The metric is shown only where it drives an action (Files.tax
  attention list, dashboard row).
- It is never presented in a way that implies the business is doing
  well or badly financially.

## 15. UX principles

1. Recording is low-friction. One tap from any prompt.
2. Prompts are contextual. They appear where the related data lives.
3. Prompts explain why recording matters: financial accuracy, customer
   balances, profitability, tax position, evidence, reconciliation,
   compliance.
4. Repeated prompts become more visible, not more frequent.
5. The system never accuses the user.
6. Facts and suggestions are visually and textually distinct.
7. The user can correct false assumptions.
8. Important unresolved items survive navigation and session changes.
9. Every item has a clear path to resolution.
10. The system avoids notification spam.
11. High-value unresolved activity is prioritized.

## 16. Evidence and auditability

Every engagement event is recorded:

- Prompt shown (item, level, evidence, timestamp).
- Snooze/defer (horizon, reason if given).
- Dismissal (reason: not applicable, already recorded, wrong).
- Confirmation (which record was created).
- Resolution (which event or explanation closed the item).
- Feedback (false positive reports).

This history:

- Supports the reconciliation and audit-trail layer.
- Lets product review detect triggers with high false-positive rates.
- Never fabricates financial facts. Engagement history is behavioral
  data, kept separate from accounting records.
- Respects the tenancy boundary: all engagement data is scoped to the
  workspace and entity, per multi-tenancy-prd-v2.1.md.

## 17. Accounting, tax, and compliance relationship

```
Record → Reconcile → Explain → Optimise → Comply → Transmit
```

This sequence is preserved. Record capture is upstream of tax accuracy:

- VAT and WHT figures are aggregations of recorded transactions. Missing
  transactions make the aggregation wrong in ways no calculation can
  detect.
- CIT estimates depend on running costs and expenses. Without capture,
  the estimate silently understates deductible activity.
- Files.tax is accurate only for the records it receives. Its EXCEPTIONS
  state exists precisely to show what is missing.
- Reconciliation connects records (invoice ↔ payment, expense ↔
  evidence, WHT ↔ transaction). It cannot connect what was never
  recorded.
- Compliance and transmission consume the output. They cannot repair
  the input.

This plan drives the Record stage. The accounting foundation (future)
defines the underlying accounting model. Tax calculation remains in
the tax domain per NRS-docs/.

## 18. MVP boundary

MVP uses existing infrastructure and Record-capture-v1.md only:

- L0: dashboard attention count (KPI registry and banner pattern),
  Files.tax attention list.
- L1: contextual prompts on invoice view (financialState-derived
  unpaid status), client page, Compliance Hub panels.
- L2: persistent items in the existing in-app notification center;
  optional push via the existing push channel once the
  dispatch-push-notifications wiring gap is resolved.
- Triggers: invoice-without-payment (confirmed), payment-without-invoice
  (confirmed), expense-without-evidence (confirmed, via Record-capture),
  WHT-expected-without-evidence (strong signal, via wht_receipts),
  VAT-input entries (confirmed), month-end completeness review
  (aggregate of confirmed gaps).
- Dismissal, snooze, defer, escalation, and audit events as defined in
  sections 11 and 16.
- Record completeness displayed as an attention count only.

## 19. Later phases

| Phase | Capability | Dependency |
|---|---|---|
| Phase 1 (MVP) | Basic capture prompts (section 18) | Existing infrastructure + Record-capture-v1.md |
| Phase 2 | Persistent attention across sessions; priority ranking | Notification center persistence; prioritization rules |
| Phase 3 | Evidence-aware activity detection; strong-signal confirmation flows | Evidence layer; attachment pipeline |
| Phase 4 | Reconciliation-driven prompts (bank imports, statement matching) | Bank/reconciliation infrastructure (does not exist yet) |
| Phase 5 | Intelligent recurring-activity suggestions | Real usage patterns; weak-signal engine |
| Phase 6 | Controlled enforcement beyond the statutory send-gate | Product decision after observed false-positive rates |

Future propagation channels:

- WhatsApp, email, and scheduling are future channels. None is a v1
  dependency. Email and scheduling infrastructure do not exist today.

## 20. Dependencies

| Dependency | Status |
|---|---|
| Record-capture-v1.md capture surface | Exists (PRD). Not yet implemented. |
| Payments table, invoice link, financialState-derived status | Exists in code (verified during the Record-capture audit). |
| PaymentAttachmentUploader and payments.attachments | Exists in code. |
| In-app notification center (NotificationBell/Drawer) | Exists in code. |
| Push channel | Exists with a wiring gap (client references a non-existent `send-push` function; the real edge function is `dispatch-push-notifications`). |
| wht_receipts and tax_input_entries tables | Exist in code; consumed by Compliance Hub panels. |
| Email and scheduling infrastructure | Does not exist. |
| Accounting foundation | Does not exist. This plan does not depend on it for MVP. |
| Statutory deadlines and rates | Governed by NRS-docs/. This plan adds none. |

## 21. Open questions

### Status of the six audit questions from bigdrops-tax-ux-vision-v1.md

| # | Question | Status | Evidence |
|---|---|---|---|
| 6.1 | Does a Payments table/module exist? What fields? | Answered | `payments` table with `invoice_id`, amount, date, method, `attachments` JSONB, `wht_amount` (Record-capture audit; migration 20260705100000_payment_attachments.sql). |
| 6.2 | Is there an Invoice ↔ Payment link, or only a flag? | Answered | `invoice_id` foreign key links payment to invoice; invoice payment status is derived via `financialState.ts` (unpaid/partially_paid/paid). |
| 6.3 | What do InvoiceAdvanceSheet and RevertInvoiceDialog do? Do they touch payment data? | Partially answered | Noted as view-page-only in the original forensic audit. Not re-audited in this synthesis. Requires implementation discovery before tickets. |
| 6.4 | Is there an Expense or Supplier Payment module? | Answered | No money-out module exists. Record-capture-v1.md defines the minimum surface (extends `tax_input_entries`). |
| 6.5 | Is there a reusable evidence upload mechanism? | Partially answered | PaymentAttachmentUploader + `payments.attachments` JSONB exist and are the reuse pattern. A general evidence pipeline beyond it was not verified. |
| 6.6 | Does the audit trail cover payments, or only the four document modules? | Partially answered | Audit infrastructure exists (`audit_logs`/`activity_events` per repository architecture). Payment coverage not verified in this synthesis. Requires implementation discovery. |

### Product decisions deferred

| Item | Status |
|---|---|
| Exact snooze/defer durations | Open implementation decision, bounded by materiality and business rhythm (section 11). |
| Weighted prioritization scoring | Open implementation decision (section 13). |
| Push-channel activation | Blocked on resolving the `send-push` vs `dispatch-push-notifications` wiring gap. |
| Phase 6 enforcement scope | Requires observed false-positive data from earlier phases. |

## 22. Acceptance criteria

This plan is complete when:

1. Every trigger identifies its source, confidence class, evidence,
   prompt, recording action, dismissal behavior, repeat and escalation
   behavior, resolution, and gate status.
2. Confirmed, strongly indicated, and suggested activity are distinct
   and never conflated.
3. Dismissal, snooze, defer, escalation, and resolution semantics are
   defined.
4. Intervention escalates through visibility, not frequency.
5. Workflow gates are narrow and justified; "record everything" is
   explicitly rejected.
6. Record completeness is defined without becoming a financial-health
   score.
7. The Record → Reconcile → Explain → Optimise → Comply → Transmit
   sequence is preserved and record capture is explained as upstream of
   tax accuracy.
8. MVP is separable from later phases.
9. The six audit questions are answered or explicitly marked
   unresolved.
10. No statutory rule is invented.

## 23. Change log

| Date | Change |
|---|---|
| 2026-09-05 | Created. Synthesized Openai-ux-contribution.md and bigdrops-tax-ux-vision-v1.md into the operational engagement plan; defined triggers, evidence classes, lifecycle, intervention levels, prioritization, MVP boundary, and dependency status. |