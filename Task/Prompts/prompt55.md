``
You are fixing a CRITICAL regression in the BIGDROPS Waybill module: Edit Waybill page hydration + layout mismatch. DO NOT TOUCH PDF. DO NOT TOUCH VIEW PAGE. ONLY EDIT FLOW + EDIT UI SHELL.

---

## MANDATORY SKILLS — LOAD BEFORE WRITING ANY CODE

Read the skills index first, then load and apply these skills in order:

| Priority | Skill | Path | Application |
|----------|-------|------|-------------|
| 1 | `using-superpowers` | `C:\Users\DELL\.claude\skills\using-superpowers\SKILL.md` | Meta-skill — establishes how to find and use skills. Load this FIRST. |
| 2 | `Karpathy` | `C:\Users\DELL\.claude\skills\Karpathy\SKILL.md` | Coding discipline — think before coding, surgical changes only, goal-driven execution. |
| 3 | `typescript-advanced-types` | `C:\Users\DELL\.agents\skills\typescript-advanced-types\SKILL.md` | Type-safe data mapping — ensure `qty` → `quantity` conversion uses strict types, no `any` leaks. |
| 4 | `vercel-composition-patterns` | `C:\Users\DELL\.agents\skills\vercel-composition-patterns\SKILL.md` | React composition — compound components, avoid prop proliferation when matching Edit layout to New layout. |
| 5 | `frontend-design` | `C:\Users\DELL\.agents\skills\frontend-design\SKILL.md` | Production-grade UI — ensure edit form visually matches New Waybill clean overlay, no "AI slop" leftovers. |

**FAIL-SAFE:** If the skill-loading tool fails, go directly to the paths listed above using your file-reading tools, read the `SKILL.md` manually, and apply its logic. Do not skip skills. Do not quit.

---

## CONTEXT

View page and form are now correct:
- qty displays correctly (e.g. 199 instead of 1)

BUT Edit Waybill is broken in two ways:

---

## BUG 1 — ITEMS DO NOT RENDER (CRITICAL)

### Symptom
- Edit page shows correct row count
- BUT item rows are visually missing or empty
- Data exists in DB (confirmed by count)

### Likely Cause
- Items are fetched correctly
- BUT NOT properly mapped into form state
- OR EditWaybill bypasses `mapDbWaybill()`
- OR items are shaped as `{ qty }` but form expects `{ quantity }`

### Required Investigation Path
Inspect:
1. `src/pages/EditWaybill.tsx` — how data is fetched, how items are passed into form
2. `src/components/waybill/waybillUtils.ts` — ensure `mapDbWaybill()` is used OR replicated correctly. MUST normalize: `qty` → `quantity`
3. `src/components/waybill/WaybillForm.tsx` — ensure initial values hydrate items correctly, ensure `FormLineItems` receives normalized items

### Rule
Edit page MUST behave like:
```

DB → mapDbWaybill() → WaybillForm(initialValues)

```
NOT:
```

DB → raw response → form

```

---

## BUG 2 — LAYOUT INCONSISTENCY (UI SHELL REGRESSION)

### Symptom
Edit Waybill shows:
- dashboard top nav
- hamburger menu
- search bar

BUT New Waybill uses:
- clean overlay layout (`WaybillFormOverlay` / gateway style UI)

### Expected Behavior
Edit Waybill MUST use SAME shell as New Waybill:
- no dashboard chrome
- same overlay / form container pattern
- consistent UX between create and edit flows

---

## REQUIRED FILES
- `src/pages/EditWaybill.tsx`
- `src/pages/NewWaybill.tsx` (reference correct layout)
- `src/components/waybill/WaybillFormOverlay.tsx`
- `src/components/waybill/WaybillForm.tsx`
- `src/components/waybill/waybillUtils.ts`

---

## FIX REQUIREMENTS

### FIX A — DATA HYDRATION
Ensure:
- fetched waybill → normalized via `mapDbWaybill()`
- items passed to form MUST use: `quantity` (NOT `qty`)
- no raw DB objects passed into UI

If mapping is duplicated, REMOVE duplication and centralize.

### FIX B — UI SHELL CONSISTENCY
Edit Waybill must:
- use same layout wrapper as New Waybill
- NOT render dashboard chrome
- NOT include global navigation elements

If `EditWaybill.tsx` is wrapped in `AppLayout` or `DashboardLayout`:
→ replace with `WaybillFormOverlay` pattern used in `NewWaybill`

---

## HARD RULES
- DO NOT modify PDF
- DO NOT modify View page
- DO NOT introduce fallback values like `|| 1`
- DO NOT duplicate mapping logic across files
- DO NOT break Invoice module
- Apply `vercel-composition-patterns` — prefer composition over prop proliferation when matching layouts
- Apply `frontend-design` — ensure edit form has clean, production-grade appearance matching New Waybill

---

## SUCCESS CRITERIA
After fix:
1. Edit Waybill shows ALL saved items correctly
2. Quantity values are correct (no 1 fallback)
3. Edit layout matches New Waybill UX (clean overlay)
4. No dashboard navigation chrome appears
5. Invoice module unaffected

---

## VALIDATION

Run:
```bash
bun run typecheck
```

Manual test (operator will verify):

1. Create waybill with items (qty = 199)
2. Save
3. Open Edit Waybill
4. Items must render correctly
5. Qty must show 199
6. Confirm UI matches New Waybill layout (no dashboard header)

---

COMMIT

```bash
git add -A && git commit -m "fix: edit waybill hydration and layout consistency" && git push origin main
```

---

AFTER PUSH — REPORT

Create Task/reports/waybill-edit-hydration-report.md documenting:

· Why items were missing (was mapping bypassed or duplicated?)
· How the mapping was fixed (centralized via mapDbWaybill() or equivalent)
· Layout root cause (what wrapper was wrong)
· How consistency with New Waybill was restored
· Skills applied and how they influenced the fix

Commit and push the report:

```bash
git add Task/reports/ && git commit -m "docs: edit waybill hydration and layout fix report" && git push origin main
```

---

FOCUS

· hydration correctness
· layout consistency
· no new features
· no PDF changes
· no View page changes

END

```

Target: Claude Code / Codex | Strategy: Two-bug fix with 5 mandatory skills (using-superpowers, Karpathy, typescript-advanced-types, vercel-composition-patterns, frontend-design), fail-safe for skill loading, data hydration via centralized mapDbWaybill, layout consistency via WaybillFormOverlay pattern matching NewWaybill, report creation and push required.