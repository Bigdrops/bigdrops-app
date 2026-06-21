You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

TASK: Update the Waybill Render Engine PRD and Implementation docs only.
DO NOT build, create, or modify any engine code. DO NOT run bun run dev.
This is a documentation update task only.

FILES TO UPDATE:
- docs/contracts/Waybill-Render-Engine-Contract.md
- docs/EXECUTION/Waybill-Render-Engine-Developer-Implementation.md

==================================================
CORRECTIONS TO FOLD IN
==================================================

1. ADD TYPE DISCRIMINATOR (missing from current contract)

   Add a `type: 'internal' | 'external'` field to the output model
   (HeaderBlock is the natural home for it, alongside waybillNumber).
   This is required because templates need to know the waybill's type
   to decide whether to render the Client/PO Number section (external
   only) and which heading label applies. The engine does not make
   this rendering decision — it just exposes the value so templates can.

   Update Section 4.2 (Header) field map and the WaybillRenderModel
   interface accordingly.

2. PURPOSE APPLIES TO BOTH TYPES (correct an earlier draft error)

   purpose is populated for BOTH external (Supply/Return/Repair/Other)
   and internal (Transfer/Repair/Other) waybills — not external-only.
   Printable Blank Preservation still applies: unselected resolves to
   "". Update Section 4.4 (Logistics) to remove any external-only note
   if one was added, and confirm this explicitly in the field map.

3. AUDIT INDUSTRY.TSX BEFORE LOCKING FOOTER/PAGINATION (do not assume)

   Add an explicit Phase 0 step to the Developer Implementation doc:
   read src/components/pdf-new/templates/Industry.tsx in full and
   report:
   - exact footer structure (what content, what position — left/
     center/right)
   - exact continuation-page header behavior (column headers only, or
     a condensed document header repeated too)
   - exact mechanism used for page numbering (confirm it's React-PDF's
     <Text render={({pageNumber, totalPages}) => ...}/> pattern)

   This audit's findings — not assumptions — determine what Section 11
   ("Open Decisions — continuation page header style") resolves to.
   Do not write a recommendation into the contract until this audit
   has actually been read and reported.

4. FIX THE DUPLICATE HTML SANITIZER

   The Developer Implementation doc currently specifies a new
   sanitizers/sanitizeText.ts using a raw regex tag-strip
   (input.replace(/<[^>]*>/g, "").trim()). Remove this. The doc must
   instead specify reusing the existing richTextToPlainText() utility
   from src/components/pdf-new/core/richText.ts. Update Phase 1.5
   (Notes Resolver) accordingly. State explicitly: do not create a
   second HTML-stripping implementation.

5. MAKE qtyLabel UNCONDITIONAL

   Phase 2.3 currently says "If needed upstream: qtyLabel = ...".
   Remove the conditional language. The engine must ALWAYS compute
   qtyLabel = "${quantity} ${unit}" for every row. Templates must use
   qtyLabel and never format quantity/unit separately.

==================================================
OUTPUT
==================================================

Update both documents directly with the corrections above. Do not
create a third document. Do not change anything else in either file
beyond what's listed here. Confirm in your response which exact
sections/lines were changed in each file.

==================================================
DO NOT
==================================================

- Do NOT write or modify any engine code
- Do NOT run bun run dev
- Do NOT make assumptions about Industry.tsx — read it
- Do NOT remove the "Open Decisions" section from the contract until
  the Industry audit actually resolves it