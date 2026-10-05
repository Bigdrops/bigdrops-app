# CPS Downstream SP Feedback And PDF Standard Audit

This report was written by Codex on 2026-10-05 via Codex desktop.

## Objective

Update the shared PDF migration standard so it is renderer-neutral.

Audit the CPS to Quotation to Invoice Selling Price feedback contract. Do not
change application code.

## Scope

Changed:

- `docs/standard/pdf-migration-standard.md`
- `docs/reports/cost-pricing-sheet/2026-10-05-cps-downstream-sp-feedback-and-pdf-standard-audit.md`

Inspected:

- `docs/prd/cost-pricing-sheet/`
- `docs/standard/document-transformation-standard.md`
- `docs/standard/pdf-migration-standard.md`
- `docs/standard/pdf-customization-extension-standard.md`
- `src/domain/cps/conversion.ts`
- `src/pages/view-cps-actions.ts`
- `src/pages/view-quotation-actions.ts`
- `src/hooks/useQuotationSave.ts`
- `src/hooks/useInvoiceSave.ts`
- `src/domain/documentConversion.ts`
- `src/domain/invoice/factories.ts`
- `src/domain/invoice/types.ts`
- `src/domain/quotation/types.ts`
- relevant Supabase migrations for quotation, invoice, CPS, and item tables

Skills used: karpathy, pdf-rendering-correctness, systematic-debugging, crafting-effective-readmes

Documentation standard: ASD-STE100 Simplified Technical English

Supabase push status: not applicable. No SQL changed.

## Workstream 1: PDF Standard Reconciliation

### Previous Conflict

`docs/standard/pdf-migration-standard.md` required every PDF pipeline to use:

- `DefaultPdfGenerator`;
- `CompositePdfDelivery`;
- `DefaultFeedbackBus`;
- `@react-pdf/renderer`.

That made React-PDF a global renderer requirement.

The reconciled CPS PRD now approves Forme/pdfcn for active CPS PDF rendering.
The old shared standard conflicted with that approved CPS contract.

### Standard Update

The shared PDF migration standard is now renderer-neutral.

It now states:

- each document family selects its renderer through its authoritative contract;
- different document families may use different rendering engines;
- CPS can use Forme/pdfcn;
- Invoice and Quotation keep their existing approved renderer behavior until
  their own contracts change;
- the standard controls boundaries, not the renderer choice.

The standard remains strict about:

- prepared data;
- calculation isolation;
- no Supabase queries from PDF templates;
- no renderer-owned business math;
- customization as presentation only;
- delivery authority;
- migration safety;
- parity verification;
- runtime verification for renderer changes.

No Invoice or Quotation migration was made.

## Workstream 2: CPS Downstream SP Feedback Audit

### Written PRD Contract

The current active CPS PRD does not contain a downstream SP feedback
requirement.

The active CPS PRD states:

- SP is the customer-facing commercial price when converted to Quotation.
- CP must never transfer to a Quotation.
- Lineage is ancestry and audit history. It is not synchronization.
- A converted Quotation must keep the CPS document as its source lineage.
- A later CPS change must not mutate the Quotation.
- CPS to Quotation conversion maps SP to Quotation `unit_price`.
- CPS to Quotation conversion preserves source row order and group structure.

Primary locations:

- `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md`, sections 2, 12, and 13.
- `docs/prd/cost-pricing-sheet/README.md`, current status table and implementation debt table.

The retained lifecycle document also states that lineage is not live
synchronization. It prohibits live parent-child sync and warns that lineage
must not be used as synchronization.

Primary location:

- `docs/prd/cost-pricing-sheet/02-boq-document-lifecycle.md`, sections 2.1 to 2.5 and 4.3.

### Intended Product Clarification

The intended clarification describes one-way commercial feedback:

- Quotation linked-item price changes update only the originating CPS row SP.
- After Quotation to Invoice conversion, Invoice becomes the active downstream
  commercial source.
- The old Quotation then stops affecting CPS SP.
- Only CPS-origin rows participate.
- Downstream-added rows do not create CPS rows.
- CP remains untouched.

This is not the current written CPS PRD contract.

The clarification requires a product decision and a PRD update before
implementation.

### Current Implementation

CPS to Quotation conversion exists.

Evidence:

- `src/domain/cps/conversion.ts` maps CPS row `sp` to Quotation `unit_price`.
- `src/domain/cps/conversion.ts` sets document-level `source_cps_id`.
- `src/pages/view-cps-actions.ts` creates the Quotation and inserts
  `quotation_items`.
- If `quotation_items` insertion fails, `src/pages/view-cps-actions.ts` deletes
  the created parent Quotation.

Quotation to Invoice conversion exists.

Evidence:

- `src/pages/view-quotation-actions.ts` creates an Invoice from a Quotation.
- It writes document-level conversion trail data.
- It updates the Quotation status to `converted`.
- It appends the derived Invoice trail to the Quotation custom fields.

Ongoing downstream SP feedback does not exist.

Evidence:

- `src/hooks/useQuotationSave.ts` saves `quotations` and rewrites
  `quotation_items`.
- It does not update `cps_rows`.
- `src/hooks/useInvoiceSave.ts` saves `invoices` and `invoice_items`.
- It does not update `cps_rows`.
- `src/pages/view-quotation-actions.ts` converts Quotation to Invoice.
- It does not install a CPS SP feedback authority.
- Supabase migrations contain no trigger or function that updates CPS row SP
  from `quotation_items` or `invoice_items`.

### Row-Level Lineage Finding

The current system has document-level lineage. It does not have stable CPS row
origin lineage across the full chain.

CPS to Quotation:

- `ConvertedQuotationPayload` has `source_cps_id`.
- `ConvertedQuotationItem` has no `source_cps_row_id`.
- `toStandardItem()` maps row values and omits CP, notes, site context, profit,
  and margin data.
- It does not store the originating CPS row id in a stable item lineage field.

Quotation to Invoice:

- Invoice conversion uses Quotation document-level lineage.
- Invoice item serialization uses `toDbItem()`.
- `toDbItem()` removes UI/transient fields and writes normal invoice item
  fields.
- It does not add a source Quotation item id or source CPS row id.

Database:

- `quotation_items` has `item_id`, but that is item catalog identity.
- `invoice_items` has `item_id`, but that is item catalog identity.
- `quotations.source_cps_id` is document-level lineage.
- No inspected migration adds a CPS source-row column to `quotation_items` or
  `invoice_items`.

Therefore a downstream row cannot reliably resolve its originating CPS row
without heuristic matching.

Unsafe matching methods include:

- description text;
- row order;
- group membership;
- unit;
- price similarity;
- item catalog id.

Those methods are not acceptable for SP feedback.

## Mandatory Audit Questions

1. Does the current CPS PRD contain this downstream SP feedback requirement?

   No.

2. If yes, identify exact file and section.

   Not applicable. No exact requirement was found.

3. What exact behavior does the written PRD require?

   It requires snapshot conversion and lineage. It requires SP to map to
   Quotation `unit_price` at conversion. It states that lineage is not
   synchronization.

4. Does it cover Quotation to CPS, Invoice to CPS, or both?

   It covers neither as live feedback.

5. Does it explicitly define the Quotation to Invoice handoff?

   It defines snapshot conversion and lineage from Quotation to Invoice. It
   does not define CPS SP feedback authority handoff.

6. Does it say that Quotation stops affecting CPS after conversion to Invoice?

   No. The written PRD has no Quotation to CPS feedback authority to stop.

7. Does it limit feedback to CPS-origin items?

   No. The written PRD has no feedback rule.

8. Does it state that new Quotation or Invoice items must not be inserted into CPS?

   No. The written PRD has no downstream-to-CPS row insertion rule.

9. Which downstream price field is supposed to become CPS SP?

   The written PRD defines only initial conversion: CPS `sp` becomes Quotation
   `unit_price`. It does not define the feedback field for ongoing downstream
   edits. This requires a product decision.

10. Is synchronization one-way?

    The written PRD defines no live synchronization. The intended
    clarification defines one-way downstream-to-CPS synchronization.

11. Does production currently implement Quotation to CPS SP feedback?

    No.

12. Does production currently implement Invoice to CPS SP feedback?

    No.

13. Does production disable Quotation feedback after Invoice conversion?

    No. There is no Quotation feedback implementation to disable.

14. Is there stable row-level lineage from CPS to Quotation?

    No. Current lineage is document-level.

15. Is that lineage preserved from Quotation to Invoice?

    No. There is no stable row-level lineage to preserve.

16. Can a downstream row reliably resolve its originating CPS row without heuristic matching?

    No.

17. Are there triggers, hooks, save handlers, RPCs, database functions, or application services implementing this?

    No inspected trigger, hook, save handler, RPC, database function, or
    application service implements CPS SP feedback from Quotation or Invoice.

18. Is synchronization transactional or best-effort?

    Not applicable. Synchronization is not implemented.

19. Could edits from Quote and Invoice currently race or overwrite each other?

    They cannot race through CPS SP feedback today because no feedback writes
    exist. If the intended feature is implemented without an active-authority
    handoff, Quote and Invoice could overwrite CPS SP.

20. What happens to downstream-added rows?

    They remain downstream document rows. No CPS row is created from them.
    This is an effect of missing feedback, not an explicit CPS-origin scope
    rule.

21. What happens if an originating CPS row has since been deleted?

    No current behavior exists. The system lacks stable row-level lineage and
    feedback logic.

22. What happens if a Quote or Invoice item is removed?

    No CPS feedback occurs. The CPS row is not updated or removed.

23. Does feedback create audit/activity events?

    No. Feedback does not exist, so there are no feedback audit or activity
    events.

24. Does feedback modify CP anywhere?

    No feedback exists. Current conversion intentionally omits CP from
    Quotation items and does not write CP downstream.

25. Is the current behavior EXACT, PARTIAL, MISSING, BROKEN, OBSOLETE, or REQUIRES PRODUCT DECISION?

    Against the written PRD, the downstream SP feedback feature is absent and
    not required.

    Against the intended clarification, the feature is MISSING.

    The next step REQUIRES PRODUCT DECISION because the written PRD currently
    says lineage is not synchronization and does not define the downstream
    price field, active authority handoff, row-level lineage storage, audit
    events, or deleted-row behavior.

## Compatibility Impact

The PDF standard change is compatible with CPS Forme/pdfcn.

It does not change Invoice or Quotation renderer behavior.

The SP feedback audit changes no runtime behavior.

## Recommended Next Action

Make a product decision before implementation.

The decision must define:

- whether downstream SP feedback supersedes the current snapshot-only lineage
  rule;
- the exact downstream field that updates CPS SP;
- row-level lineage storage for CPS row to Quotation item to Invoice item;
- active authority handoff from Quotation to Invoice;
- behavior for downstream-added rows;
- behavior when the CPS source row is deleted;
- behavior when downstream rows are removed;
- transactional and audit requirements.

After that decision, update the CPS PRD before code work starts.

## Verification

- `git status --short` before work: captured. The working tree already had
  pre-existing source, PRD, report, and template changes.
- Application code changes: none by this task.
- Test changes: none.
- Migration changes: none.
- `bun run build`: skipped by instruction.
- `bun run typecheck`: skipped by instruction.
- lint: skipped by instruction.
- tests: skipped by instruction.
- `bun run audit:load`: skipped by instruction.
- Supabase push: not applicable.
- `git diff --check -- docs/standard/pdf-migration-standard.md docs/reports/cost-pricing-sheet/2026-10-05-cps-downstream-sp-feedback-and-pdf-standard-audit.md`: passed for tracked changes.
- `git diff --no-index --check -- NUL docs/reports/cost-pricing-sheet/2026-10-05-cps-downstream-sp-feedback-and-pdf-standard-audit.md`: no whitespace errors for the untracked report file. The command returned a diff exit code because `NUL` and the report differ.
- Final `git status --short`: shows this task-owned scope as the shared PDF standard and this report. Other listed changes are protected pre-existing or concurrent work and were not edited by this task.

## Risks Or Limitations

This audit is static. It did not query a live tenant database.

The code search found no CPS SP feedback path. If production has an out-of-band
database trigger not represented in migrations, this repository audit cannot
see it.

## Deferred Work

- Decide whether the intended downstream SP feedback supersedes the current
  snapshot-only PRD rule.
- Update the CPS PRD after that decision.
- Design row-level lineage before implementing feedback.
- Implement feedback only after the PRD defines the active authority and price
  field.
