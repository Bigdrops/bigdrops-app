You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
1. Read `docs/PROJECTSKIILINDEX.md`
2. Load: `Karpathy`, `react-pdf`, `pdf-rendering-correctness`
3. Fallback to direct file read if skill loading fails.
4. Stop if unreadable.
5. Read `AGENTS.md` before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save report to:
docs/Task/reports/waybill-canonical-contract-v2-runtime-enforcement.md

==================================================
TASK
==================================================
Implement the final runtime enforcement layer for:
docs/contracts/waybill-canonical-contract-v2.md

The contract, assertions, and tests already exist.
This task is NOT a feature task.
This task wires the contract into the actual Waybill runtime boundaries
so future violations fail immediately instead of relying only on tests.

==================================================
READ FIRST (MANDATORY)
==================================================
- docs/contracts/waybill-canonical-contract-v2.md
- src/domain/waybill/contracts/waybillContract.ts
- src/components/waybill/waybillUtils.ts
- src/domain/waybill/waybillMutations.ts
- src/components/waybill/WaybillPDF.tsx
- src/components/waybill/WaybillForm.tsx
- src/tests/critical/waybillContract.test.js
- AGENTS.md

==================================================
OBJECTIVE 1 — Runtime Enforcement Integration
==================================================
Wire the existing assertion functions into the actual runtime boundaries.

IMPORTANT — Production safety for thrown assertions:

Before wiring assertions into PDF render and persistence boundaries,
check whether any existing waybills in the database could violate the
contract (e.g. items with extension fields outside custom_data, or
missing custom_data entirely — likely from waybills created before
this contract existed).

If such records may exist:
- In the PDF render boundary, catch assertion failures and log them
  (do not let a thrown assertion break PDF rendering for the user).
  Use a development-mode-only throw, or a warn-and-continue pattern
  in production.
- In the persistence boundary, throwing on NEW writes is acceptable
  and intended (it should block bad writes going forward).
- In the normalization boundary, prefer a repair-then-warn approach
  for legacy data rather than a hard throw, unless explicitly told
  this is acceptable.

Document in the report which boundaries throw vs. warn, and why.

-------------------------------------------------
A. Normalization Boundary
-------------------------------------------------
File: src/components/waybill/waybillUtils.ts
After item normalization, use:
- assertCustomDataExists(...)
- assertCustomDataPreserved(...)

Goal: Normalization must fail loudly if custom_data disappears,
keys are dropped, or custom_data becomes invalid.

-------------------------------------------------
B. Import Boundary
-------------------------------------------------
Locate import application flow:
- handleApplyImport
- import adapters
- normalization pipeline

After import conversion, use:
- assertUnknownFieldsPreserved(...)
- assertCustomDataPreserved(...)

Goal: Unknown imported fields must be verified as preserved.

-------------------------------------------------
C. Persistence Boundary
-------------------------------------------------
File: src/domain/waybill/waybillMutations.ts
Before DB save, use:
- assertNoExtensionFieldsOutsideCustomData(...)
- assertCustomDataExists(...)

Goal: Reject invalid item shapes before persistence.
No item-level extension fields may exist outside custom_data.

-------------------------------------------------
D. PDF Render Boundary
-------------------------------------------------
File: src/components/waybill/WaybillPDF.tsx
Before rendering rows, validate item integrity using:
- assertCustomDataExists(...)

Goal: PDF rendering must never silently consume malformed items.

==================================================
OBJECTIVE 2 — Single Column Authority
==================================================
The contract defines STANDARD_ITEM_COLUMNS.
This must become the only source of truth.

Inspect:
- WaybillForm.tsx
- WaybillPDF.tsx
- ViewWaybill.tsx
- Any related table configuration code

If any file defines its own copy of:
make, partNo, description, quantity, unit, condition

Replace local definitions with imports from:
src/domain/waybill/contracts/waybillContract.ts

Verify with:
grep -r "partNo.*label\|make.*label" src/components/waybill/WaybillForm.tsx src/components/waybill/WaybillPDF.tsx src/pages/ViewWaybill.tsx
or equivalent search across those files for any local array/object
defining column metadata that duplicates STANDARD_ITEM_COLUMNS.

Goal: Form and PDF derive column definitions from exactly one shared
constant. No duplicated column definitions may remain.

==================================================
OBJECTIVE 3 — Golden Round-Trip Test
==================================================
Add one critical contract test to the existing test file:
src/tests/critical/waybillContract.test.js

Scenario:
Input:
{
  "description": "Motor",
  "quantity": 1,
  "custom_data": {
    "make": "Toyota",
    "partNo": "ABC123",
    "serial": "SN001",
    "storageLocation": "WH-A"
  }
}

Pipeline:
Import → Normalize → Save serialization → Load normalization → PDF projection

Assertions:
- make survives
- partNo survives
- serial survives
- storageLocation survives
No key may be lost.

This becomes the canonical regression test.

==================================================
VERIFICATION
==================================================
1. bun run audit:load
2. bun run typecheck
3. bun test src/tests/critical/waybillContract.test.js

All must pass.

==================================================
DONE WHEN
==================================================
[ ] Assertions are wired into runtime boundaries
[ ] Normalization enforces custom_data preservation
[ ] Import path enforces unknown-field preservation
[ ] Persistence path rejects extension fields outside custom_data
[ ] PDF validates item integrity before rendering
[ ] Form and PDF consume STANDARD_ITEM_COLUMNS as the single source of truth
[ ] No duplicate standard column definitions remain
[ ] Golden round-trip test added and passing
[ ] Report documents which boundaries throw vs. warn and why
[ ] Typecheck passes
[ ] Contract tests pass
[ ] Report saved to docs/Task/reports/waybill-canonical-contract-v2-runtime-enforcement.md

==================================================
DO NOT
==================================================
- Do not redesign the UI
- Do not change PDF layout
- Do not modify numbering logic
- Do not change import prompts
- Do not alter business rules
- Do not introduce new dependencies
- Do not skip the report

Success criterion:
A future developer cannot accidentally reintroduce:
- custom_data loss
- unknown-field loss
- PDF/Form column drift
- extension fields outside custom_data
without triggering a contract failure.