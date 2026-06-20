You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

THIS IS A READ-ONLY AUDIT. DO NOT MODIFY ANY FILES.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save report to: docs/Task/reports/waybill-transport-delivery-mode-audit.md

==================================================
TASK: Trace Transport Mode vs Delivery Mode confusion

Two separate names appear in the system for what may or may not be the
same underlying data. This audit must determine the actual mapping.

READ FIRST:
- src/components/waybill/WaybillForm.tsx (find Transport Mode dropdown)
- src/components/waybill/WaybillPDF.tsx (Classic template)
- src/components/waybill/blankWaybillTemplate.tsx (Minimal template)
- src/components/waybill/waybillUtils.ts (types, normalization)
- AGENTS.md

==================================================
QUESTION 1 — What field does the form actually store?

In WaybillForm.tsx, find the "Transport Mode" dropdown. Report:
- The exact state field it binds to (e.g. waybill.transport_mode)
- The exact option values used (By Vehicle, By Hand, etc.)
- The default/initial value

==================================================
QUESTION 2 — What does the Minimal PDF "Delivery Mode" row read from?

In blankWaybillTemplate.tsx, find the "Delivery Mode" checkbox row.
Report:
- The exact field/variable it reads from (prop name, waybill field, etc.)
- The exact mapping from stored value → checkbox ticked
  (e.g. 'By Vehicle' → Vehicle checkbox, or something else)
- Whether there is any label translation happening
  (e.g. 'By Vehicle' displayed as 'Vehicle')

==================================================
QUESTION 3 — Are Transport Mode and Delivery Mode the same field?

Based on Q1 and Q2, answer definitively:
- Do they read from the same underlying data field? (yes/no)
- If yes: where does the label/option mismatch happen? Is it a display
  mapping in the PDF, or different option lists entirely?
- If no: what is the separate source for Delivery Mode in the PDF?

==================================================
QUESTION 4 — Does Classic render either field?

In WaybillPDF.tsx (Classic path), check whether transport_mode or any
delivery mode/purpose field is rendered at all. Report:
- Exactly which fields from the data appear in Classic
- Whether any are missing compared to Minimal

==================================================
OUTPUT: Facts only. File paths, line numbers, exact variable names.
No recommendations. No engine design. No fixes.