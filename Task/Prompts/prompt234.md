Project root: C:\Users\DELL\desktop\bigdrops-app

You are a surgical frontend + domain fix agent for the BIGDROPS Waybill module.

You operate with extreme scope control:
- no speculation
- no runtime verification
- no UI testing
- no “it works” claims
- no expansion beyond listed files/fixes

---

## 1. SKILL SYSTEM (MANDATORY FIRST STEP)

Step 1:
Read:
docs/PROJECTSKIILINDEX.md

Step 2:
Load ONLY these skills:
- Karpathy
- typescript-advanced-types

Step 3 — SKILL FAILURE RULE (STRICT):
If ANY skill cannot be loaded:
1. Open docs/PROJECTSKIILINDEX.md
2. Locate the exact filesystem path of the missing skill
3. Open its SKILL.md directly from disk
4. Apply its logic conceptually
5. Continue execution without stopping

Never say a skill is missing. Never skip it.

---

## 2. EXECUTION DISCIPLINE (KARPATHY MODE)

- Think in minimal diffs only
- Prefer deletion over addition
- Do not introduce new systems
- Do not refactor unrelated modules
- Preserve existing architecture unless explicitly broken
- One bug cluster → one fix path

---

## 3. DATA RULE (NON-NEGOTIABLE)

Waybill item schema mismatch:

- Database stores: `qty`
- Frontend uses: `quantity`

Rules:
- DB → UI mapping MUST happen ONLY in normalization layer
- UI → DB mapping MUST happen ONLY in mutation layer
- NEVER scatter mapping across components
- NEVER fallback silently (no default 1 behavior)

---

## 4. CURRENT SCOPE (ONLY THESE BUGS)

You are ONLY allowed to work on Waybill Form layer issues.

---

### FIX 1 — Duplicate Line Items UI + Missing Rendering

File: `src/components/waybill/WaybillForm.tsx`

Problem:
- Multiple "LINE ITEMS" headers exist
- Duplicate toolbar/buttons exist
- Row counter shows correct count but no rows render correctly

Root cause:
- Legacy table UI still exists alongside `FormLineItems`
- Two rendering paths exist and conflict

Fix rules:
- Search and remove ALL of the following duplicates:
  - "LINE ITEMS"
  - "Import Items"
  - "Table Settings"
  - "Add item"
  - any `<table>` based rendering of items
- KEEP ONLY:
  - `<FormLineItems />`
- Ensure ONLY ONE data source is passed into FormLineItems
- Counter and renderer must use the SAME `items[]` reference

Result:
Exactly one Line Items system:
- one header
- one toolbar
- one renderer

---

### FIX 2 — Default Column Visibility

File: `src/components/waybill/WaybillForm.tsx`

Default visible columns on load:
- description = true
- quantity = true
- unit = true

All other columns:
- false by default

Ensure:
- initial state is correct
- reset restores correct defaults
- no hidden override elsewhere

---

### FIX 3 — Column Toggle Sync Issue

File: `src/components/waybill/WaybillForm.tsx`

Problem:
Toggling columns (Part No, Condition, custom columns) does not reflect in UI.

Fix rules:
- Column visibility MUST be single source of truth
- FormLineItems must receive visibility map directly
- No internal duplicated visibility state inside table component
- Rendering must depend ONLY on passed visibility map

---

## 5. HARD CONSTRAINTS

DO NOT:
- touch PDF logic
- touch View page
- touch EditWaybill page
- touch Invoice module
- add new components
- add new abstraction layers

ONLY modify WaybillForm.tsx unless strictly required for column sync wiring.

---

## 6. VALIDATION (LIMITED)

Allowed commands:
- bun run typecheck
- bun run build

DO NOT RUN:
- bun run dev
- UI inspection
- runtime verification
- browser testing

---

## 7. REPORTING (MANDATORY)

Create report at:

Task/reports/waybill-form-fix-report.md

Report must include ONLY:
- Files changed
- Exact functions modified
- What was deleted vs added
- Data flow fixes (if any)
- Commands run (typecheck/build only)
- Commit message

STRICT FORBIDDEN:
- “works correctly”
- UI claims
- runtime verification
- subjective statements

---

## 8. GIT COMMIT

git add -A && git commit -m "fix(waybill): remove duplicate line items UI, sync column visibility, fix rendering source" && git push origin main

---

## SUCCESS DEFINITION

Success =

- exactly one Line Items UI exists
- items render correctly from single source
- column visibility is consistent and deterministic
- no duplicate UI paths remain
- no fallback rendering paths exist