Waybill Canonical Contract v2 (Lockable)

Status: System Contract
Priority: Highest Authority
Purpose: Prevent data loss, rendering divergence, import drift, and template oscillation.


---

1. Single Source of Truth

Canonical Item

type WaybillItem = {
  description: string
  quantity: number
  unit: string | null
  condition?: 'good' | 'damaged' | 'partial'
  custom_data: Record<string, string | number | boolean | null>
}

Rules

custom_data is REQUIRED.

custom_data is the ONLY extension mechanism.

No new item fields may be introduced outside custom_data.

Unknown fields MUST NOT be discarded.

Unknown fields MUST NOT be transformed into top-level item properties.


Examples:

custom_data.make
custom_data.partNo
custom_data.serial
custom_data.batchNumber
custom_data.storageLocation

Valid.

item.make
item.partNo
item.serial

Invalid.


---

2. Preservation Rule

Every layer must preserve all keys.

Import
→ Normalize
→ Form State
→ Save
→ Database
→ Load
→ PDF
→ Export

At no point may a key be removed because:

it is unknown

it is hidden

it is not configured

it is not visible

it is not rendered


Rule:

output.custom_data === input.custom_data

unless explicitly edited by the user.


---

3. Separation of Concerns

Data Layer

Owns:

WaybillItem
custom_data

Does NOT know:

columnVisibility
customColumns
PDF
templates
layout


---

Visibility Layer

Owns:

columnVisibility

Purpose:

show / hide

Only.

Visibility may NEVER:

create data

delete data

modify data

normalize data



---

Rendering Layer

Owns:

Form
PDF
Preview
Templates

Render from data.

Must NEVER:

mutate data

invent data

delete data



---

Import Layer

Owns:

Document extraction

Rule:

All unknown item fields:

→ custom_data

Always.

Never discarded.


---

4. Column Architecture

Columns are views.

Columns are NOT schema.

Example:

make
partNo
serial

are merely display projections.

They are always read from:

item.custom_data[key]

Never from:

item.make
item.partNo
item.serial


---

5. Visibility Contract

Visibility affects rendering only.

columnVisibility.make = false

Means:

Hidden in UI
Hidden in PDF
Hidden in Preview

It does NOT mean:

Delete make
Clear make
Ignore make
Drop make

Data remains intact.


---

6. Normalization Contract

Normalization may:

coerce types

trim values

fill defaults


Normalization may NOT:

remove custom_data keys

inject UI-driven keys

depend on customColumns

depend on visibility


Forbidden:

customColumns.map(...)

as the source of truth.

Required:

preserve all existing keys


---

7. Template Contract

Templates are presentation only.

Templates may change:

colours

typography

borders

spacing

branding

visual style


Templates may NOT change:

data structure

item schema

visibility logic

numbering

import behaviour

persistence behaviour



---

8. PDF Contract

PDF must render using the same visibility rules as the Form.

Invariant:

Visible in Form
=
Visible in PDF

for every column.

No exceptions.


---

9. Import Contract

If source contains:

{
  "make": "Toyota",
  "partNo": "ABC123",
  "serial": "SN001"
}

Result:

{
  "custom_data": {
    "make": "Toyota",
    "partNo": "ABC123",
    "serial": "SN001"
  }
}

Never:

{
  "make": "Toyota"
}

Never:

{}


---

10. Non-Negotiable Invariants

Invariant A

custom_data is the only extension mechanism.

Invariant B

Visibility never affects persistence.

Invariant C

Templates never affect data.

Invariant D

Import never discards unknown item fields.

Invariant E

Normalization preserves all custom_data keys.

Invariant F

Form and PDF use identical visibility logic.


---

Definition of Done

Any change is automatically rejected if it:

Drops a custom_data key

Uses visibility to alter persistence

Introduces new item-level fields outside custom_data

Makes PDF visibility differ from Form visibility

Couples templates to data behaviour

Uses customColumns as the source of truth for item data


This contract becomes the authoritative specification for all Waybill item data flow.

