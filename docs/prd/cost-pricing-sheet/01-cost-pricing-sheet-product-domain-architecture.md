# Cost & Pricing Sheet PRD 01 — Product and Domain Architecture

**Status:** Current approved CPS product contract.

**Last reconciled:** 2026-10-05.

This document defines CPS domain behavior. It supersedes BOQ-era normative
language in this package. Historical BOQ references remain valid only for
migration history and persisted legacy identifiers.

## 1. Product Identity

The canonical product name is **Cost & Pricing Sheet**.

The canonical short name is **CPS**.

CPS is an internal commercial document. It helps a business review cost price,
selling price, gross profit, and margin before a customer-facing Quotation is
created.

CPS is not:

- a Quotation;
- an Invoice;
- a receipt;
- a tax hub document;
- a compliance source document;
- a BOQ under the current product identity.

## 2. Commercial Identity Invariants

Every eligible CPS item carries:

- quantity;
- cost price, also called CP;
- selling price, also called SP.

The calculation authority remains the CPS domain calculation layer and the
shared financial layer where applicable. Renderers, View components, import
adapters, and presentation components must not own business math.

The locked commercial meanings are:

- `total cost = sum(CP x quantity)`;
- `selling total = sum(SP x quantity)`;
- `gross profit = selling total - total cost`;
- `margin = gross profit / selling total`;
- CP is internal cost data;
- SP is the customer-facing commercial price when converted to Quotation.

CP must never transfer to a Quotation.

## 3. Numbering And Prefix Contract

CPS uses the tenant-aware prefix engine.

The canonical default CPS prefix is:

```text
CPS
```

When the CPS prefix is reset to default, the reset target is `CPS`.

The reset sequence begins:

```text
CPS-000001
```

Custom tenant prefixes remain supported through the prefix engine.

Historical persisted numbers such as `BOQ-*` and `SASBOQ-*` remain valid
historical identifiers. The system must not rewrite them.

Quotation conversion must allocate a Quotation number through the normal
Quotation numbering authority. Conversion must not use a conversion-specific
`QTN` fallback.

## 4. Row Vocabulary

CPS uses this row vocabulary:

| CPS row kind | Meaning |
|---|---|
| `item` | A commercial item row with quantity, CP, SP, and item data |
| `section` | A structural group or section row |

The Quotation domain may use different row kinds. During conversion:

- CPS `section` maps to a Quotation `group_header` where the Quotation domain
  requires that row kind;
- CPS `item` maps to the normal Quotation commercial item row.

Visible enumeration is presentation-only. It does not become row identity.

## 5. Group Semantics

Group membership derives from `row.group_id`.

Group membership does not derive from adjacency.

Non-contiguous group membership remains supported by the approved CPS product
contract. Presentations may render groups as sections, but they must use actual
group membership data and must not invent membership from nearby rows.

Group headers and section rows are structural. They are not commercial item
rows and must not consume item enumeration.

Add Line Item creates an ungrouped item.

Add Item to Group explicitly assigns the selected group.

### 5.1 Delete Group

Deleting a group has one cross-presentation meaning:

1. Remove the group container or header.
2. Keep all member item rows.
3. Clear the group membership from those member rows.
4. Preserve item order.
5. Preserve quantities, CP, SP, photos, descriptions, specifications, make or
   brand, units, custom column values, and other row data.

Deleting a group must not delete its member items.

To delete items, the user must delete the items themselves.

## 6. Instant Markup

Instant Markup is a current-SP stacking workspace.

CP is immutable inside the markup workspace.

Percentage operation:

```text
new SP = current working SP x (1 + percentage / 100)
```

Fixed operation:

```text
new SP = current working SP + fixed amount
```

Example:

```text
SP NGN 25,000
-> +5%
-> NGN 26,250
-> +NGN 600
-> NGN 26,850
```

The preview compares current working SP to the proposed next SP.

Zero-SP behavior is fixed:

- fixed markup from zero produces the fixed value;
- percentage markup from zero remains zero;
- the system must not fall back to CP.

Excluded rows remain visible. They do not receive the next stack operation.
They can be included again later.

Reset is destructive. It sets markup workspace item SP values to zero and
requires confirmation.

Undo Reset is a separate Ctrl+Z-style action after Reset. It restores the exact
pre-reset workspace snapshot. It is distinct from form-level post-Apply markup
undo.

Final Apply commits through the production CPS row-update authority.

## 7. Column And Field Contract

CPS supports Quotation-level column capability where that capability is
approved for CPS. The system must keep CP and SP semantics clear.

Required CPS commercial fields include:

- description;
- quantity;
- unit where configured;
- CP;
- SP;
- item total values derived by the calculation authority.

Supported item data can include:

- sub-description or specification;
- make or brand;
- item photo;
- approved custom column values.

Column visibility affects presentation. It must not change CP, SP, quantity,
totals, profit, margin, tax, conversion mapping, or persistence semantics.

## 8. JSON Import Contract

CPS JSON import is an external trust boundary.

Syntactically valid JSON is not automatically valid CPS import data.

Import validation must reject malformed structure before form application or
persistence.

The import contract must validate:

- unique imported item identities where identity is required;
- valid group references;
- valid group `itemIds` references;
- single group membership per item;
- exact agreement between `groups[].itemIds` and `items[].group_id` when both
  representations are present;
- group `itemIds` order according to source item order;
- the current approved group and row vocabulary;
- standalone items.

Import validation must not silently repair malformed payloads by reordering
items, inferring group membership, dropping bad references, or converting bad
grouped items to standalone rows.

## 9. Item Photo Contract

CPS supports item photos where the row model and selected presentation support
them.

Missing optional images must not break form, View, conversion, or PDF behavior.

Images are presentation and evidence data. They must not affect calculations.

## 10. Persistence And Row Store Direction

The target architecture is one authoritative CPS row store.

The target row store must preserve:

- row identity;
- row order;
- row kind;
- group membership;
- CP and SP;
- quantities and units;
- descriptions and specifications;
- make or brand;
- photos;
- supported custom column values.

### 10.1 Implementation Status And Migration Note

Current production still maintains compatibility data across:

- parent `custom_fields.table_rows`;
- `cps_rows`;
- `cells` JSON for some row fields.

This is implementation debt and migration state.

It is not the permanent target architecture.

This PRD does not prescribe a schema migration.

## 11. Form And Save Architecture

The current CPS form architecture is normative:

```text
CpsFormPage
-> CostPricingSheetEditor
-> responsive presentation selection
-> Desktop presentation OR Mobile/Fold presentation
```

The editor/controller owns shared production state and orchestration.

Presentations render and collect interaction.

Presentations must not independently own:

- persistence;
- numbering;
- business calculations;
- Supabase writes.

Local UI buffer state is allowed when it commits through the shared
editor/domain authority.

## 12. Snapshot Lineage Model

Lineage is ancestry and audit history. It is not synchronization.

A converted Quotation must keep the CPS document as its source lineage.

The source CPS can change later. That later change must not mutate the
Quotation.

The current production defect that labels the CPS source as a Quotation is not
approved product behavior.

### 12.1 CPS Downstream Item Feedback Exception

CPS defines one explicit exception to the general lineage rule.

CPS-origin downstream rows may synchronize only the fields authorized by the
CPS downstream item feedback contract.

No other document family gains live synchronization because lineage exists.

No other CPS field gains live synchronization because lineage exists.

Conversion remains snapshot creation. Initial CPS to Quotation copying is
conversion behavior, not ongoing synchronization.

### 12.2 Feedback Direction And Active Authority

Feedback is one-way.

Before Invoice conversion:

```text
Quotation item -> originating CPS row
```

After Quotation to Invoice conversion:

```text
Invoice item -> originating CPS row
```

The system must never automatically synchronize:

```text
CPS -> existing Quotation
CPS -> existing Invoice
```

At most one downstream stage can control CPS feedback for one conversion
chain.

After CPS to Quotation conversion, the Quotation is the active feedback
authority.

After that Quotation converts to Invoice, the Quotation feedback authority
ends permanently for that chain. The Invoice becomes the active feedback
authority.

A later edit to the old converted Quotation must not update CPS.

Authority must come from explicit lifecycle state. The system must not use a
"last edited document wins" rule.

Quotation to Invoice conversion must create an auditable lifecycle event that
records the authority handoff:

```text
feedback authority: quotation -> invoice
```

The system must not determine authority only by checking whether an Invoice
exists.

### 12.3 CPS-Origin Row Scope

Only downstream rows that originated from a CPS row can feed back to CPS.

Downstream-added rows must not:

- create a CPS row;
- modify an unrelated CPS row;
- acquire CPS ownership through matching;
- participate in CPS feedback.

This rule applies to both Quotation rows and Invoice rows.

### 12.4 Approved Synchronized Fields

Only these fields can synchronize from the active downstream authority to the
originating CPS row:

| Downstream field | CPS field | Rule |
|---|---|---|
| canonical item `unit_price` | `sp` | Use the raw commercial item unit price |
| canonical item `description` | `description` | Use as synchronized data only |
| canonical item image URL/reference | `image_url` | Transfer the stored URL or approved shared reference |

Do not feed document-level calculated totals into CPS SP.

Do not infer CPS SP from:

- VAT;
- WHT;
- document discount;
- additional charges;
- document grand total;
- total after tax.

If downstream item-level discount semantics make `unit_price` ambiguous, the
implementation design must preserve the canonical commercial `unit_price`
field separately.

Description is synchronized data. It must never be used as lineage identity.

Image feedback transfers the stored image reference or URL. It must not:

- duplicate the binary;
- re-upload the image without need;
- infer image identity from filename.

### 12.5 Fields That Must Not Synchronize

Unless a later PRD revision approves it, downstream changes must not
automatically change CPS:

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

CP is protected. No downstream event may modify CPS CP.

### 12.6 Row-Level Lineage Requirement

The feedback feature requires stable row-level lineage across:

```text
CPS row -> Quotation item -> Invoice item
```

Document-level `source_cps_id` is insufficient.

The architecture must support an explicit identity equivalent to:

```text
origin CPS document id + origin CPS row id
```

The exact persisted schema design is deferred to implementation design.

A downstream row must reliably answer:

```text
Which exact CPS row did I originate from?
```

The system must not match rows by:

- description;
- row position;
- source order;
- price;
- quantity;
- unit;
- group id;
- item catalog id;
- image;
- fuzzy similarity.

When Quotation converts to Invoice, CPS row ancestry must survive explicitly:

```text
CPS row X -> Quotation item Y -> Invoice item Z
```

Invoice item Z must be able to resolve CPS row X without matching by mutable
commercial values.

### 12.7 Deletion And Missing-Origin Rules

If a downstream item retains lineage to a CPS row that no longer exists, the
system must not:

- recreate the CPS row;
- match another CPS row heuristically;
- fail the whole downstream save only because feedback cannot find the source,
  unless a future transaction policy explicitly requires that.

The system must record an audit or diagnostic event that explains that CPS
feedback was skipped because the originating CPS row no longer exists.

Deleting a Quotation or Invoice row must not delete the originating CPS row.

Deletion removes only the downstream row. If audit policy requires it, the
downstream deletion must be recorded.

### 12.8 Explicit Clear Semantics

The implementation must distinguish:

- a missing field or omitted serialized value;
- an intentional clear or remove action.

A blank downstream description must not wipe CPS description unless the
downstream domain permits a valid empty canonical description.

If a user explicitly removes the image from a linked active-authority item, the
implementation may clear CPS `image_url` only when the action is represented
as intentional image removal.

Serialization omission must not erase CPS data.

### 12.9 Consistency Requirements

Feedback writes must be deterministic and idempotent.

The implementation must prevent:

- duplicate feedback application;
- Quote and Invoice authority races;
- stale Quote overwrite after Invoice conversion;
- feedback loops;
- CPS save triggering Quote save triggering CPS save;
- heuristic item matching.

The exact database or application transaction design is deferred to
implementation design. The integrity requirement is normative.

## 13. CPS To Quotation Conversion

The conversion contract remains:

- SP maps to Quotation `unit_price`;
- CP must not transfer;
- source row order must be preserved;
- group structure must be preserved;
- client identity and snapshot must transfer through the approved client
  contract;
- CPS notes must not transfer;
- CPS site or project context must not transfer;
- CPS project context can remain on CPS only unless a later product decision
  changes this;
- Quotation numbering must use the normal Quotation numbering authority;
- opening or cancelling the options step must not allocate a Quotation number;
- number allocation occurs only when conversion is confirmed;
- if child-row insertion fails, conversion must clean up the parent Quotation
  record.

### 13.1 Commercial Options Step

The pre-conversion options step is normative.

It contains exactly these approved options:

- VAT;
- Discount;
- Additional Charges.

It must not become a miniature Quotation editor.

WHT is not part of this step unless a later product decision approves it.

## 14. Duplicate Contract

The Duplicate Law remains normative for CPS.

Duplicating a CPS must create a new draft identity and preserve approved
document work, including:

- item rows;
- groups;
- CP;
- SP;
- descriptions;
- specifications;
- make or brand;
- quantities and units;
- photos;
- supported custom column values;
- structural ordering;
- other approved duplicate-safe presentation data.

The duplicated CPS must receive a new identity under normal duplicate rules.

Current parent-only duplicate behavior is a production defect. It is not
approved product behavior.

## 15. Audit Event Contract

CPS lifecycle operations remain auditable.

The PRD requires audit events for material operations such as:

- create and save where policy requires them;
- conversion;
- duplicate;
- material pricing state changes where policy requires them.

Current implementation gaps do not weaken this requirement.

### 15.1 Audit-First Feedback Gate

Automatic downstream-to-CPS feedback must not be enabled until audit
infrastructure can reliably record and expose:

- who caused the change;
- which downstream document caused it;
- which downstream row caused it;
- which CPS row changed;
- what field changed;
- previous value;
- new value;
- when it changed;
- whether the mutation was direct or automatic;
- the causal or root chain that led to the CPS mutation.

### 15.2 Required Feedback Audit Data

Feedback audit records must support:

- event id;
- root or correlation id;
- parent or causal event id where applicable;
- tenant id;
- actor user id;
- actor display identity where available;
- actor type such as user, system, automated-feedback, migration, or admin;
- timestamp;
- source document type;
- source document id;
- source document number where appropriate;
- source row id;
- target document type;
- target document id;
- target CPS row id;
- action;
- changed field;
- previous value;
- new value;
- reason or origin;
- originating conversion chain.

The system must use existing account and profile identity authority.

It must not duplicate authenticated identity into ad hoc strings when stable
user ids exist.

### 15.3 Causal Event Tracking

The audit system must distinguish a direct user action from an automatic
consequence.

Example:

```text
Event A:
Jane changed Invoice item unit_price from NGN 27,000 to NGN 29,500.

Event B:
The system automatically updated originating CPS row SP from NGN 27,000 to
NGN 29,500.
```

Event B must reference Event A as its cause.

Both events must belong to the same root or correlation chain.

The CPS mutation must not be recorded as an unexplained generic system update.

### 15.4 Field-Level Change Records

Downstream feedback audit history must be field-level.

Examples:

```text
description: Perkins Fuel Filter -> Perkins Primary Fuel Filter 26561117
image_url: old Cloudinary URL -> new Cloudinary URL
sp: NGN 25,000 -> NGN 27,500
```

If one save changes multiple synchronized fields, the audit system may record
one event with multiple field changes or a correlated event group.

Each before and after value must remain individually inspectable.

The system must not reduce this to a generic message such as "Invoice updated
CPS."

### 15.5 Lifecycle Provenance

The CPS audit contract must expose major lifecycle provenance, including:

- who created the CPS;
- CPS creation time;
- who directly edited the CPS;
- which CPS fields changed;
- which Quotation was created from CPS;
- who performed the conversion;
- which Quotation item originated from which CPS row;
- who changed a linked Quotation item;
- whether that change fed back into CPS;
- who converted the Quotation to Invoice;
- which Invoice inherited the chain;
- who changed a linked Invoice item;
- which CPS values changed automatically;
- all relevant timestamps.

The system must distinguish:

- direct CPS edit;
- Quote-caused CPS update;
- Invoice-caused CPS update.

### 15.6 Audit Integrity

Audit history is evidence.

Ordinary users must not silently edit historical audit events.

Any correction mechanism must itself be auditable.

The system must not provide destructive clear-history behavior for CPS audit
records.

## 16. View And PDF Business Parity

View and PDF must consume the same CPS domain and business authority.

They do not have to use one identical prepared object if production uses
separate prepared models.

Both must derive values from canonical calculations.

Neither may implement independent business math.

Parity must be testable.

## 17. Domain Acceptance Criteria

- CPS is the active product identity.
- BOQ terminology is historical unless used for compatibility.
- CP and SP meanings are preserved.
- CP never transfers to Quotation.
- Instant Markup stacks from current working SP.
- Reset sets markup workspace SP values to zero.
- Undo Reset restores the pre-reset workspace snapshot.
- Group membership derives from `row.group_id`.
- Deleting a group keeps member rows and clears membership.
- JSON import remains a strict admission boundary.
- Conversion preserves source order, groups, client contract, and CPS lineage.
- Conversion options are VAT, Discount, and Additional Charges only.
- Lineage is not synchronization by default.
- CPS downstream item feedback is the only approved synchronization exception.
- Feedback is one-way from the active downstream authority to CPS.
- Quotation can update CPS only before its chain advances to Invoice.
- Invoice can update CPS only after Quotation to Invoice handoff.
- Only CPS-origin downstream rows can feed back.
- New downstream rows do not create CPS rows.
- Stable row-level lineage is mandatory before feedback can run.
- Heuristic row matching is forbidden.
- Approved feedback fields are SP, description, and image URL/reference.
- CP, quantity, unit, make or brand, groups, tax, discount, charges, totals,
  new rows, and deleted rows do not synchronize upstream.
- Downstream deletion must not delete CPS rows.
- Deleted CPS origin rows must not be recreated heuristically.
- Explicit clear actions must be distinguished from omitted fields.
- Duplicate preserves permitted CPS work.
- Numbering uses the CPS prefix engine and preserves historical identifiers.
- One authoritative row store remains the target.
- Current dual-store compatibility is documented as implementation debt.
- Lifecycle audit coverage remains required.
- Causal field-level audit is a hard prerequisite for automatic feedback.
