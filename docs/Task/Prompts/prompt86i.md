You are working on the BIGDROPS business platform.

Stack:
- React 19
- Vite 7
- TypeScript 5.9
- Tailwind CSS 3.4
- Supabase
- Vercel
- Runtime: Bun

Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================

1. Read `docs/PROJECTSKIILINDEX.md`
2. Load:
   - Karpathy
   - react-pdf
   - pdf-rendering-correctness
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

This task is to wire the contract into the actual Waybill runtime boundaries so future violations fail immediately instead of relying only on tests.

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
OBJECTIVE 1
Runtime Enforcement Integration
==================================================

The assertion functions already exist.

Wire them into the actual runtime boundaries.

Required integration points:

--------------------------------------------------
A. Normalization Boundary
--------------------------------------------------

File:
- src/components/waybill/waybillUtils.ts

After item normalization:

Use:
- assertCustomDataExists(...)
- assertCustomDataPreserved(...)

Goal:

Normalization must fail loudly if:

- custom_data disappears
- custom_data keys are dropped
- custom_data becomes invalid

--------------------------------------------------
B. Import Boundary
--------------------------------------------------

Locate import application flow.

Examples:
- handleApplyImport
- import adapters
- normalization pipeline

After import conversion:

Use:
- assertUnknownFieldsPreserved(...)
- assertCustomDataPreserved(...)

Goal:

Unknown imported fields must be verified as preserved.

--------------------------------------------------
C. Persistence Boundary
--------------------------------------------------

File:
- src/domain/waybill/waybillMutations.ts

Before DB save:

Use:
- assertNoExtensionFieldsOutsideCustomData(...)
- assertCustomDataExists(...)

Goal:

Reject invalid item shapes before persistence.

No item-level extension fields may exist outside custom_data.

--------------------------------------------------
D. PDF Render Boundary
--------------------------------------------------

File:
- src/components/waybill/WaybillPDF.tsx

Before rendering rows:

Validate item integrity using:

- assertCustomDataExists(...)

Goal:

PDF rendering must never silently consume malformed items.

==================================================
OBJECTIVE 2
Single Column Authority
==================================================

The contract defines:

STANDARD_ITEM_COLUMNS

This must become the only source of truth.

Inspect:

- WaybillForm.tsx
- WaybillPDF.tsx
- ViewWaybill.tsx
- Any related table configuration code

If any file defines its own copy of:

- make
- partNo
- description
- quantity
- unit
- condition

Replace local definitions with imports from:

src/domain/waybill/contracts/waybillContract.ts

Goal:

Form and PDF derive column definitions from exactly one shared constant.

No duplicated column definitions may remain.

==================================================
OBJECTIVE 3
Golden Round-Trip Test
==================================================

Add one critical contract test.

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

Import
→ Normalize
→ Save serialization
→ Load normalization
→ PDF projection

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

Run:

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