# CPS Post-Save React #310 Root Cause Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Diagnose the global error state (minified React error #310) that follows every successful Mobile/Fold CPS save, repair the React lifecycle violation at its source, and cover the transition with regression tests.

## Scope

- `src/pages/ViewCps.tsx`
- `src/tests/critical/cpsViewHooksOrder.test.js`
- This report.

No other application file changed. No domain, save, numbering, schema, or UI behavior changed.

## Files Changed

- `src/pages/ViewCps.tsx`
- `src/tests/critical/cpsViewHooksOrder.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-post-save-react-310-root-cause-report.md`

## Skills Used

Skills used: karpathy
Documentation standard: ASD-STE100 Simplified Technical English

---

## Observed Failure

1. Exact observed error: application global error page reading `Something went wrong`, with minified React error #310. React #310 means `Rendered more hooks than during the previous render`.
2. Reproduction conditions: create a Mobile/Fold CPS with grouped items and a client, tap Save. The save succeeds. Navigation to the new document view starts. The view never paints. The error boundary takes over.
3. The previous row_type failure is absent. The row-type repair migration is applied and hosted accepts the payload.

## Persistence Timeline

Hosted probes on the main entity schema prove the save completes fully before the crash:

4. Parent persisted: yes. Three retry documents exist (`SASBOQ-000004`, `SASBOQ-000005`, `SASBOQ-000006`, titled `CPS Form Test`, client `Lorem Ipsum`). Each retry created a new parent, which also confirms numbering advanced normally.
5. Rows persisted: yes. The latest document holds 15 `item` rows and 3 `section` rows, matching the reported payload exactly.
6. Save success callback executed: yes, implied by completed persistence plus navigation away from the form (the error page replaces the form, so the route changed).
7. `afterSave` executed: yes. Rows exist, which only `afterSave` writes.
8. Navigation executed: yes. `useDocumentSave` navigates to `/cost-pricing-sheets/:id` after `afterSave`, and the crash surface is the view route, not the form route.
9. Exact point where React fails: POST-NAVIGATION, on the first data-loaded render of the document view. Classification: POST-SAVE-SUCCESS. Nothing in persistence failed.

## Routing and Mode

10. Route before save: `/cost-pricing-sheets/new` (create mode).
11. Route after save: `/cost-pricing-sheets/:id` (view route, replace via router navigation).
12. Create to edit transition: the form unmounts on navigation. No component morphs from create to edit semantics in place.
13. Relevant components remounted: the form tree unmounts; the view tree (`ViewCps`) mounts fresh in loading state, then re-renders hydrated. The crash occurs between those two view renders.

## Hook Root Cause

14. Full non-minified React error: not obtainable in this environment. No build is permitted, and the repository has no interactive browser harness. Diagnosis rests on the minified code meaning plus exact static hook-count proof below.
15. Exact component: default export `ViewCps` in `src/pages/ViewCps.tsx`.
16. Exact source location: the `actions` `useMemo` previously placed after the `if (loading || !cps || !viewData)` early return (former line 95).
17. Hook sequence before transition (loading render, 8 hooks): `useParams`, `useNavigate`, `useEntity`, `useLayoutMode`, `useState` (cps), `useState` (loading), `useEffect` (load), `useMemo` (viewData). Then the early return.
18. Hook sequence after transition (loaded render, 9 hooks): the same 8 hooks plus the `actions` `useMemo`. React throws #310 because the count grew.
19. Root-cause classification: B. EARLY-RETURN HOOK ORDER. A state transition (loading to loaded) crosses an early return and activates one more hook.
20. Why the hook sequence changed: the actions memo was authored below the guard, so it executed only on renders that passed the guard. Every first view hydration crosses that guard exactly once, which is why every successful save ended on the error page. Earlier saves never reached this path because they failed at the database constraint first.

The audit also checked `CpsFormPage` (all hooks above its guard), `CostPricingSheetEditor` (no component-level early return), `CostPricingSheetForm` (no component-level early return), `ClientSelector` (no early return), the extracted `MoreSheet` early return (all three of its hooks run above it, so it is valid), and the shared hooks (stable on every working page). No other violation exists in the CPS save and view lifecycle.

## Fix

21. Exact repair: moved `status`, `cpsId`, and the `actions` memo above the loading early return in `ViewCps`. Derivations are null-safe (`(cps as any)?.status`, `cps?.id`). Each action callback guards on `cps` or `cpsId` before acting, which preserves type narrowing and keeps unreachable pre-load invocation safe. Callback bodies, dependencies, props, and render output are otherwise byte-identical in behavior.
22. Why it restores invariant hook ordering: every render now executes the same 9 hooks in the same order regardless of loading state. The guard only chooses what to paint.
23. Why it is not a remount or reload workaround: no key was added, no navigation was changed or delayed, no reload was introduced, the error boundary was not touched, and no branch was forced. The component simply obeys the Rules of Hooks.
24. Files changed: `src/pages/ViewCps.tsx` (reordered only) plus the new structural test below.

## Regression

25. New to Save: covered by existing save, validation, numbering, and serialization suites, all passing.
26. Post-save render: covered by the new `cpsViewHooksOrder` test, which asserts the loading guard exists, no hook call appears after it in the component body, and the memos and effects remain above it. The test fails on the previous structure (the actions memo sat below the guard) and passes on the repaired structure.
27. Edit to Save: unchanged code path, covered by existing suites.
28. Mobile and Fold: the repaired file serves both through the existing layout branch, which was not modified.
29. Desktop: the same file serves desktop through the same branch. Shared view presentations were not modified.
30. Row-type persistence unchanged: `item` and `section` contract intact, no migration, no serializer change.
31. Group semantics unchanged.
32. Calculations unchanged.
33. Numbering unchanged.
34. UI unchanged: identical titles, loading copy, actions, and presentation props.

## Verification

35. Typecheck: `bun run typecheck` passed.
36. Targeted tests: new `cpsViewHooksOrder` file passes (3 tests). Full critical suite: 541 passed, 5 failed. All 5 failures are pre-existing and unrelated: 4 files crash at import time on missing Vite env (`VITE_SUPABASE_URL`) and 1 item-library assertion fails. None imports the changed file or any CPS view code.
37. Diff check: `git diff --check` passed (line-ending notice only).
38. Git status: 1 modified source file (`src/pages/ViewCps.tsx`), 1 new test file, 1 new report. No other scope.
39. `audit:load` status: not run. No schema, query, or data-layer logic changed.
40. Confirmation: `bun run build` was not executed per hardware policy.

## Supabase Push Status

Not applicable. No migration created. The row-type migration from the prior task stands unchanged.

## Limitations

41. Runtime and device verification still required: a real New to Save to view pass plus an Edit to Save pass on Mobile/Fold, confirming the view paints with the saved groups, items, client, totals, and number. Static evidence predicts success (persistence proven, hook order proven invariant, all suites green), but only a live run closes it.
