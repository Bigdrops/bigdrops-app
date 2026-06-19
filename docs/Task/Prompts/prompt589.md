You are working on the BIGDROPS business platform.

==================================================
TASK: Implement Waybill Canonical Contract v2 Enforcement
==================================================

The contract already exists and is authoritative.

Read:
- docs/contracts/waybill-canonical-contract-v2.md
- AGENTS.md
- docs/PROJECTSKIILINDEX.md

Goal:
Create enforcement mechanisms that prevent future violations of the contract.

==================================================
REQUIRED OUTCOME
==================================================

Implement enforcement, not feature changes.

The enforcement layer must verify:

1. custom_data is always present on every WaybillItem
2. No item-level extension fields exist outside custom_data
3. Normalization never drops custom_data keys
4. Visibility never alters persistence data
5. Form and PDF use identical visibility behavior
6. Import preserves unknown item fields
7. Templates cannot alter item schema

==================================================
IMPLEMENTATION
==================================================

Create:

src/domain/waybill/contracts/

Files:

- waybillContract.ts
- waybillContractAssertions.ts

Add reusable assertions such as:

- assertCustomDataExists()
- assertCustomDataPreserved()
- assertNoExtensionFieldsOutsideCustomData()
- assertVisibilityDoesNotMutateData()

Integrate only where appropriate.

Do NOT rewrite existing features.

==================================================
TESTS
==================================================

Create contract tests covering:

A. Import Preservation

Input:
custom_data.make
custom_data.partNo
custom_data.serial

Expectation:
all keys survive import → normalize → save → load

B. Visibility Isolation

Toggle column visibility on/off

Expectation:
stored item data remains unchanged

C. PDF/Form Consistency

Any column visible in Form must be visible in PDF.
Any column hidden in Form must be hidden in PDF.

D. Unknown Field Preservation

Input:
custom_data.storageLocation

Expectation:
field survives entire round trip.

==================================================
REPORT
==================================================

Save report to:

docs/Task/reports/waybill-canonical-contract-v2-enforcement.md

Include:

- violations discovered
- enforcement added
- tests added
- files modified

==================================================
DO NOT
==================================================

- Do not redesign UI
- Do not change numbering
- Do not change templates
- Do not modify PDF layout
- Do not alter import behavior except where required for enforcement
- Do not introduce new business logic

Success means:
Future developers cannot accidentally reintroduce custom_data loss, visibility drift, or import field loss without failing enforcement.