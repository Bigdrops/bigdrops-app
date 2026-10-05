# CPS Downstream Feedback PRD Update Report

This report was written by Codex on 2026-10-05 via Codex desktop.

## Objective

Update the CPS PRD to define the approved downstream item feedback contract.

Do not implement code, migrations, audit infrastructure, lineage storage, or
synchronization.

## Scope

Files changed:

- `docs/prd/cost-pricing-sheet/README.md`
- `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md`
- `docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md`
- `docs/prd/cost-pricing-sheet/03-cost-pricing-sheet-implementation-readiness-roadmap.md`
- `docs/reports/cost-pricing-sheet/2026-10-05-cps-downstream-feedback-prd-update.md`

Files inspected:

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- `docs/prd/cost-pricing-sheet/`
- `docs/reports/cost-pricing-sheet/2026-10-05-cps-downstream-sp-feedback-and-pdf-standard-audit.md`
- `docs/standard/document-transformation-standard.md`

Skills used: karpathy, systematic-debugging, crafting-effective-readmes

Documentation standard: ASD-STE100 Simplified Technical English

Supabase push status: not applicable. No SQL changed.

## Changes Made

The CPS PRD now defines downstream item feedback as a controlled exception to
the general lineage rule.

The PRD preserves this rule:

```text
Lineage is not synchronization.
```

The PRD adds this CPS-only exception:

```text
CPS-origin downstream rows can synchronize only approved fields from the active
downstream authority to the originating CPS row.
```

The approved feedback fields are:

- downstream item `unit_price` to CPS `sp`;
- downstream item `description` to CPS `description`;
- downstream item image URL/reference to CPS `image_url`.

The PRD explicitly forbids automatic synchronization for:

- CP;
- quantity;
- unit;
- make or brand;
- sub-description or specification;
- group membership;
- group names;
- notes;
- site or project;
- VAT;
- WHT;
- discounts;
- additional charges;
- document totals;
- client;
- title;
- issue date;
- custom fields;
- new rows;
- deleted rows.

The PRD defines active downstream authority:

- Quotation is active after CPS to Quotation conversion.
- Quotation authority ends permanently for that chain after Quotation converts
  to Invoice.
- Invoice becomes active after the handoff.
- A later edit to the old converted Quotation must not update CPS.
- The system must not use a last-edited-wins rule.

The PRD defines CPS-origin row scope:

- only downstream rows with explicit CPS row ancestry can feed back;
- downstream-added rows must not create CPS rows;
- downstream-added rows must not match unrelated CPS rows;
- heuristic matching is forbidden.

The PRD defines required row lineage:

```text
CPS row -> Quotation item -> Invoice item
```

The PRD states that document-level `source_cps_id` is insufficient.

The PRD defines deletion and clear semantics:

- deleting downstream rows must not delete CPS rows;
- deleted CPS origin rows must not be recreated;
- skipped feedback must be auditable or diagnosable;
- omitted fields must not erase CPS data;
- explicit clear/remove actions must be distinct from missing data.

## Audit Prerequisite

The PRD now makes audit infrastructure a hard prerequisite.

Automatic downstream-to-CPS feedback must not be enabled until the system can
record and expose:

- actor identity;
- source document;
- source row;
- target CPS row;
- changed field;
- previous value;
- new value;
- timestamp;
- direct or automatic mutation type;
- causal/root event chain.

The PRD requires parent/causal event links.

Example:

```text
User edits Invoice item unit_price.
System updates CPS SP automatically.
The CPS update references the Invoice edit as its cause.
```

The PRD requires field-level before/after audit records.

The PRD states that audit history is evidence. Ordinary users must not silently
edit or clear audit history.

## CPS View Contract

The CPS View PRD now requires a future Audit Trail or Activity History surface.

The surface must expose readable chronological provenance for users with
appropriate permission.

The surface must distinguish:

- creation;
- direct CPS edits;
- CPS to Quotation conversion;
- Quotation-caused CPS updates;
- Quotation to Invoice authority handoff;
- Invoice-caused CPS updates;
- skipped feedback events.

The PRD defers visual design. It does not defer the behavior.

## Implementation Roadmap

The roadmap now separates target and current status.

Currently implemented:

- CPS to Quotation snapshot conversion;
- CPS SP to Quotation `unit_price` during conversion;
- document-level `source_cps_id`;
- Quotation to Invoice conversion;
- Quotation converted lifecycle state.

Not currently implemented:

- downstream to CPS feedback;
- stable CPS row to Quotation row lineage;
- stable CPS row ancestry through Invoice item;
- feedback authority handoff;
- feedback audit trail;
- CPS View downstream-feedback history.

The required future sequence is:

1. Audit foundation.
2. Row lineage.
3. Controlled feedback.

The roadmap now states that automatic feedback must not be enabled before audit
provenance and row lineage are reliable.

## Compatibility Impact

This task changed documentation only.

No application source changed.

No tests changed.

No migrations changed.

No runtime behavior changed.

The retained BOQ lifecycle file remains historical. The active CPS PRD now owns
the CPS-specific feedback exception.

## Verification

- `git status --short` before edits: captured. The working tree already had
  pre-existing and concurrent PRD, source, test, template, and report changes.
- `bun run build`: skipped by instruction.
- `bun run typecheck`: skipped by instruction.
- lint: skipped by instruction.
- tests: skipped by instruction.
- `bun run audit:load`: skipped by instruction.
- migrations: skipped by instruction.
- Supabase push: not applicable.
- `git diff --check -- docs/prd/cost-pricing-sheet/README.md docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md docs/prd/cost-pricing-sheet/03-cost-pricing-sheet-implementation-readiness-roadmap.md docs/reports/cost-pricing-sheet/2026-10-05-cps-downstream-feedback-prd-update.md`: passed for tracked files.
- `git diff --no-index --check -- NUL docs/reports/cost-pricing-sheet/2026-10-05-cps-downstream-feedback-prd-update.md`: no whitespace errors for the untracked report. The command returned a diff exit code because `NUL` and the report differ.
- `git diff -- <modified PRD files>`: inspected after edits.
- Final `git status --short`: shows this task-owned scope as the active CPS PRD files and this report. Other listed changes are protected pre-existing or concurrent work and were not edited by this task.

## Risks Or Limitations

The repository already had uncommitted CPS PRD edits before this task.

This task added targeted documentation on top of those files. It did not
attempt to revert or normalize pre-existing work.

The future implementation still needs a detailed design for schema, services,
transactions, and audit presentation.

## Deferred Work

- Design audit event storage and CPS View history presentation.
- Design stable row-level lineage for CPS to Quotation to Invoice.
- Implement controlled feedback only after audit and lineage are validated.
- Add verification for authority handoff, idempotency, and skipped feedback.
