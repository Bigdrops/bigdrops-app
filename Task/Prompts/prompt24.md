You are fixing a CRITICAL data integrity and rendering regression in the BIGDROPS Waybill module.

The symptom is consistent across VIEW PAGE, EDIT PAGE, and PDF:
➡ Qty always displays as 1
➡ even though Supabase database stores the correct value (e.g. 12, 5, 100)

This is NOT a UI bug.
This is a broken DATA MAPPING LAYER in the read path.

Your job is to trace and repair the full lifecycle:

DB → Fetch → Mapping → View → PDF → Edit Form

---

# MANDATORY SKILL LOAD (READ FIRST, APPLY THROUGHOUT)

You MUST load and apply:

- `.claude/skills/Karpathy/SKILL.md` (surgical, minimal diff discipline)
- `.agents/skills/pdf-rendering-correctness/SKILL.md` (NO fallback mutations in renderers)
- `.agents/skills/react-pdf/SKILL.md` (PDF rendering must be pure)
- `.claude/skills/using-superpowers/SKILL.md` (skill-aware execution routing)
- `.agents/skills/typescript-advanced-types/SKILL.md` (strict mapping safety)

If any skill is missing or unclear, proceed using its intent, not failure.

---

# CORE PROBLEM DEFINITION

Database stores items like:

```json
{
  "description": "Bread",
  "qty": 12,
  "unit": "PCS"
}

BUT the application UI layer uses:
quantity

AND somewhere in the READ PATH:
❌ qty → quantity mapping is missing or inconsistent
❌ OR fallback logic defaults missing quantity to 1
❌ OR PDF/view/edit bypass mapping entirely and read raw DB shape

NON-NEGOTIABLE GOAL
After fix:

View page shows correct qty (not 1)
Edit form shows correct qty (not 1)
PDF shows correct qty (not 1)
No layer performs silent fallback like || 1
Data is NEVER mutated in render layers


FILES YOU MUST TRACE (READ PATH ONLY)


src/components/waybill/waybillUtils.ts

Find DB → UI mapper (e.g. mapDbWaybill)
MUST convert:
qty → quantity



src/pages/ViewWaybill.tsx

Verify it does NOT bypass mapping
Ensure it receives normalized items



src/components/waybill/WaybillPDF.tsx

MUST NOT transform or default values
MUST render raw mapped data only



src/pages/EditWaybill.tsx

Must hydrate form using mapped quantity, not raw qty



src/domain/waybill/waybillMutations.ts

Confirm write path uses:
quantity → qty
Do NOT change unless necessary



src/components/waybill/WaybillForm.tsx

Ensure form default value logic does NOT force quantity = 1




ROOT CAUSE HYPOTHESIS (VALIDATE THIS)
The bug is almost certainly:

Missing or incomplete reverse mapping:
DB.qty → UI.quantity

OR

A fallback like:

item.quantity || 1

OR

One page bypasses mapDbWaybill and uses raw Supabase response


REQUIRED FIX STRATEGY
STEP 1 — FIND SINGLE SOURCE OF TRUTH MAPPER
Locate or create:
mapDbWaybill()

It MUST guarantee:
items: row.items.map((item) => ({
  ...item,
  quantity: item.qty,   // REQUIRED
}))

AND nothing else in the app should guess quantity.

STEP 2 — ENFORCE CONSISTENT READ PATH
All of these MUST use the same normalized object:

View page
Edit page
PDF generator

If ANY of them bypass mapping → fix it.

STEP 3 — ELIMINATE FALLBACK BUG
Search and remove any of:

quantity || 1
item.quantity ?? 1
qty || 1

This is illegal in this system.
If quantity is missing → it is a mapping failure, not a fallback case.

STEP 4 — PDF MUST BE PURE RENDERER
In WaybillPDF.tsx:

NO transformation
NO defaults
NO business logic
ONLY display props

If PDF fixes data → REVERT IT.

STEP 5 — EDIT FORM HYDRATION
Ensure:
DB → mapDbWaybill → EditWaybill → Form
And NOT:
DB → EditWaybill raw → Form
Form must ALWAYS receive:
quantity: number


CROSS-MODULE VALIDATION (CRITICAL)
After fix, verify Invoice system:

Invoice must NOT break
Invoice mapping logic must remain intact
If shared mapping utilities exist → ensure no regression


ACCEPTANCE TESTS (MANDATORY)
Manually verify:

Create Waybill with qty = 12
View page shows: 12
Edit page shows: 12
PDF shows: 12
Refresh app → still 12
Create Invoice → Invoice still correct


OUTPUT REQUIREMENTS
After completing fix:

Run:

bun run typecheck


Then commit:

git add -A && git commit -m "fix: correct qty→quantity mapping across view, edit, and PDF layers" && git push origin main


REPORT (MANDATORY)
Create:
Task/reports/waybill-qty-mapping-fix-report.md

Include:

exact root cause (missing mapping / fallback / bypass)
files affected
before/after data flow
proof PDF + view + edit consistency
confirmation Invoice unaffected


EXECUTION RULE
Do NOT guess UI fixes.
Do NOT patch symptoms.
TRACE DATA FLOW AND FIX THE MAPPING LAYER ONLY.

END OF PROMPT

