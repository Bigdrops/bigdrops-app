# Corrections Required — Multi-Tenancy Gap Analysis Report

Before proceeding to Round 2, correct the following issues in the existing Round 1 gap analysis report. Follow AGENTS.md, load the appropriate project skills, and route work to the relevant sub-agent(s) where appropriate.

This is a targeted correction pass. Do not repeat the completed Round 1 repository inventory unless one of the corrections below explicitly requires re-validation.

---

# 0. Version Reference Verification

The report cites **PRD v2.2** throughout (including Sections 2.1, 3, and 6). The authoritative source document is:

`docs/PRD/multi-tenancy-prd.md` (PRD v2.1)

Determine whether:

- the analysis itself was performed against PRD v2.1 and only the report labels are incorrect; or
- the analysis actually relied on a different revision.

If only the version references are incorrect, simply update them throughout the report.

Only re-validate findings whose correctness depends on requirements that differ between PRD v2.1 and any later draft.

Document:

- which PRD was actually used;
- whether any findings required re-validation;
- which sections changed as a result.

---

# 1. Remove Gap G8

Gap G8 currently states:

> No workspace_id column exists on business tables.

This is **not a valid gap** and must be removed entirely.

Business tables inside an entity schema **must not** contain a `workspace_id` column.

The schema itself already represents exactly one entity, while ownership is recorded once in:

`public.entities.workspace_id`

Duplicating `workspace_id` onto every business row would reintroduce the row-level tenancy model that the schema-per-entity architecture intentionally replaces.

Therefore:

- Remove G8 completely.
- Renumber subsequent gaps.
- Update blocker counts.
- Update summaries.
- Update conclusions.
- Update cross references.
- Remove every downstream reference to G8.

Do not replace it with another equivalent recommendation.

---

# 2. Correct the Target Architecture Diagram

Section 6 currently depicts one entity being split into multiple schemas such as:

- acme_invoices
- acme_projects
- acme_waybills

This architecture is incorrect.

The approved architecture defines:

**Exactly one dedicated schema per entity.**

Example:

```
entity_mrc_acme
    invoices
    invoice_items
    quotations
    projects
    project_documents
    waybills
    clients
    csrs
    boqs
    rfqs
    receipts
    payments
    letters
    settings
    bank_accounts
    signatories
    tax_settings
    audit_logs
    device_sequences
    ...
```

Redraw Section 6 accordingly.

Do not depict or recommend module-specific schemas anywhere in the report.

The corrected diagram must clearly communicate that all business tables belonging to an entity live inside the same dedicated schema.

---

# 3. Correct Schema Naming Convention

Replace every schema naming example that implies:

```
<prefix>_<entity_slug>
```

with the locked convention defined by PRD v2.1:

```
entity_<workspace_slug>_<entity_slug>
```

Examples:

```
entity_mrc_acme
entity_xyz_construction
```

The `workspace_slug` segment is mandatory to prevent collisions between entities belonging to different workspaces.

Update:

- report text;
- diagrams;
- examples;
- migration planning notes;
- pseudocode;
- naming recommendations;
- architectural references.

---

# Deliverables

Produce corrected versions of:

- Section 2.1
- Section 3
- Section 6
- every other section affected by the removal of G8 or the corrected architecture

Carry forward unchanged:

- Section 2.3
- Section 2.4
- existing repository inventory
- risk analysis
- assumptions
- call-site inventory

unless one of the corrections above explicitly requires modification.

Include a final **Corrections Applied** section listing:

- each modified section;
- what changed;
- why it changed;
- whether the architectural conclusion changed.

After these corrections are complete, continue directly with the planned **Round 2 architectural gap analysis** using **PRD v2.1** as the sole source of truth.

Do **not** repeat the Round 1 repository inventory or perform a fresh repository-wide audit unless required by one of the corrections above.