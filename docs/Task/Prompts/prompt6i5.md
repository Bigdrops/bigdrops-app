You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
1. Read `docs/PROJECTSKIILINDEX.md`
2. Load: `Karpathy` (coding discipline)
3. Fallback to direct file read on failure. Stop if unreadable.
4. Read `AGENTS.md` before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save work report to `docs/Task/reports/csr-pdf-audit.md`

==================================================
TASK: CSR PDF Audit — Read Only, No Code Changes
==================================================

Audit the complete CSR PDF pipeline: form fields, preview/model builder, and all 4 PDF templates. Document mismatches, hardcoded values, and layout issues. Then update the PDF rendering roadmap with the findings.

READ FIRST (mandatory):
- `src/components/csr/CsrFormScreen.tsx` — the CSR form, list every field collected
- `src/domain/csr/` — find the PDF preview/model builder (likely a `buildCsrPreviewModel` or similar function)
- `src/components/csr/` — find all PDF template files (there should be 4: pulse, zinc, crimson, signal)
- `docs/PRD/pdf-rendering-roadmap.md` — read fully for context

==================================================
STEP 1 — Audit the CSR Form
==================================================

Read `CsrFormScreen.tsx` thoroughly. List every field the form collects. For each field, note:
- Field name (as stored in state/DB)
- Is this field passed to the PDF model builder? (You'll answer this in Step 2)
- Any known issues (e.g., status field was lost during a UI upgrade)

Special attention: 
- "Call Type" — confirmed present on form, check if it reaches PDF model
- "Status" — confirmed missing from form (lost during UI upgrade that made CSR look like invoice form), but appears on PDF as hardcoded "Complete"

==================================================
STEP 2 — Audit the PDF Preview/Model Builder
==================================================

Find the function that builds the data model for the CSR PDF templates. It's likely in `src/domain/csr/` or `src/components/csr/`. Read it fully and report:

- Every field included in the model
- Which form fields are NOT included (missing from PDF)
- Which fields are hardcoded (e.g., status: "Complete") rather than read from form state
- How the model is passed to the templates

==================================================
STEP 3 — Audit All 4 PDF Templates
==================================================

Find all 4 CSR PDF template files (pulse, zinc, crimson, signal). For each template, report:

**Template Name:**
- File path
- All fields rendered (list them)
- Any hardcoded strings (e.g., always shows "Complete" for status)
- Layout issues: does it fit on one page? Does content overflow? Are sections elastic or fixed-height?
- Materials Used table: how does it handle long lists? Does content overflow boundaries or shrink text?
- Missing fields compared to Step 2 model (fields in model but not rendered)
- Styling bugs: does it respect the style/color config passed from settings, or ignore it?

==================================================
STEP 4 — Cross-Reference and Document Mismatches
==================================================

Build a clear table showing:

| Field | Form | Model | Pulse | Zinc | Crimson | Signal |
|-------|------|-------|-------|------|---------|--------|

Fill in with ✅ (present), ❌ (missing), or 🔒 (hardcoded).

==================================================
STEP 5 — Update PDF Rendering Roadmap
==================================================

Read `docs/PRD/pdf-rendering-roadmap.md`. Add a new section under Phase 3 — "CSR PDF Audit Findings" — with:

1. A summary table of all issues found (missing fields, hardcoded values, layout bugs, styling bugs)
2. A prioritized list of fixes needed (critical geometry first, then missing fields, then styling bugs)
3. Reference to your detailed audit report (`docs/Task/reports/csr-pdf-audit.md`) for full details

Do NOT modify the roadmap's existing Phase 4 or other phases. This is additive documentation only.

==================================================
VERIFICATION
==================================================
1. Read the final roadmap and confirm the new CSR section is present
2. Confirm no source code files were modified (read-only task)
3. Push to main

==================================================
DONE WHEN
- [ ] CSR form fields audited and documented
- [ ] PDF model builder audited and documented
- [ ] All 4 templates audited with findings per template
- [ ] Mismatch table created
- [ ] `docs/PRD/pdf-rendering-roadmap.md` updated with CSR findings
- [ ] Work report saved to `docs/Task/reports/csr-pdf-audit.md`
- [ ] Zero code changes in `src/`
- [ ] All changes pushed to main

==================================================
DO NOT
- Do NOT modify any source code
- Do NOT fix any issues — document only
- Do NOT run `bun run dev`
- Do NOT skip the work report