You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

THIS IS A READ-ONLY INSPECTION. DO NOT CREATE, MODIFY, OR DELETE ANY FILES.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save report to: docs/Task/reports/waybill-engine-inspection.md

==================================================
TASK: Check for existing/partial Waybill PDF engine code
==================================================

We are considering building a WaybillPdfRenderEngine but want to confirm
nothing partial already exists from earlier work before deciding anything.

1. Does src/components/waybill/engine/ exist? If yes, list every file
   and its full contents.
2. Search the codebase for any file or export named
   WaybillPdfRenderEngine, WaybillPrintModel, or WaybillPrintItem.
   Report every match with file path and line number.
3. Check whether WaybillPDF.tsx or blankWaybillTemplate.tsx import
   anything from a path containing "engine" — report findings either way.
4. For anything found above: state whether it is (a) complete and
   actually wired into either template, (b) a stub/incomplete fragment,
   or (c) fully unused dead code.
5. Recommendation per finding: REUSE, DELETE, or EXTEND — but this is
   a recommendation only, do not act on it.

OUTPUT: facts only, no implementation, no proposed engine design.