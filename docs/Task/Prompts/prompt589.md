You are working on the BIGDROPS business platform.
Runtime: Bun. Never use npm or yarn.

Read AGENTS.md and docs/PROJECTSKIILINDEX.md before anything else.

==================================================
TASK: Waybill PDF Template Audit — Read Only
==================================================

READ FIRST:
- `docs/PRD/pdf-rendering-roadmap.md` Phase 3B section
- Find all waybill PDF template files in `src/components/waybill/`
- Find the New Waybill type selector modal component

==================================================
REPORT THESE QUESTIONS
==================================================

1. **PDF template files**
   - What file(s) render the Waybill PDF? List all file paths.
   - Is there one shared template for Internal and External, or separate files?
   - Paste the exact item row rendering code — the part that maps items to table rows
   - Paste the exact column width definitions
   - Paste the signature/footer section code

2. **Quantity bug**
   - In the item row mapping, what field is used for quantity?
   - Is there any hardcoded `0` or fallback to `0` visible in the code?

3. **Blank waybill template**
   - Read `src/components/waybill/blankWaybillTemplate.tsx` fully
   - Why is it failing? What is broken?
   - Does it receive the waybill number as a prop or hardcode it?

4. **Type selector modal**
   - Find the component that renders the "New Waybill / Select document type" modal (Image shows cream background, display font, custom card borders)
   - What file is it?
   - What background color / class is applied to the modal container?
   - What font or typography class is applied to the "New Waybill" heading?

**Save report to `docs/Task/reports/waybill-pdf-template-audit.md` and push to main.**

**Read only. Zero code changes.**