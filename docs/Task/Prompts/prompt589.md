You are working on the BIGDROPS business platform.

Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================

1. Read `docs/PROJECTSKILLINDEX.md` first.
2. Load the following skills:
   - Karpathy
   - frontend-design
   - pdf-rendering-correctness
   - typescript-advanced-types
3. For each skill:
   - Attempt to load via the skill system.
   - If loading fails, fallback to direct file read from `.claude/skills/` or `.agents/skills/`.
4. If any critical skill cannot be loaded, STOP immediately and report the failure.
5. Read `AGENTS.md` before making any edits.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================

Save a complete implementation report to:

docs/Task/reports/pdf-template-foundation-fixes.md

The report MUST include:

- Executive Summary
- Root Cause Analysis
- Files Modified
- Obsidian Removal Audit
- Template Registration Audit
- PDF Customisation Audit
- Verification Results
- Remaining Issues (if any)

==================================================
CONTEXT
==================================================

Several new templates have recently been implemented.

Current status:

✓ Industry works.

✓ Bolt renders.

✗ Ember crashes during PDF generation.

✗ Apex renders blank pages.

✗ PDF customisation only works correctly with Industry.

The customization modal allows:

- Custom Accent Colour
- Custom Fonts
- Compact Layout
- Landscape Layout

However, changing these settings has no visible effect on the new templates.

This indicates the templates are likely bypassing the shared PDF customization pipeline.

The objective is to fix the foundation before adding any more templates.

==================================================
OBJECTIVE
==================================================

Fix all current PDF template regressions.

Do NOT create any new templates.

Do NOT redesign any templates.

Restore correct behaviour across all templates.

==================================================
TASK 1 — FIX EMBER
==================================================

Current error:

Download failed

s(...).map is not a function

Find the exact source.

Do NOT patch with optional chaining or `as any`.

Identify which value is expected to be an array and why it is not.

Match Crest's defensive rendering behaviour.

Ember must render successfully.

==================================================
TASK 2 — FIX APEX
==================================================

Current behaviour:

PDF renders two blank pages.

Audit the render tree.

Determine why React-PDF is producing blank pages.

Possible causes include:

- invalid layout hierarchy
- unsupported styling
- page positioned outside viewport
- invalid fixed element
- render exception
- zero-height content

Fix the actual root cause.

Also verify Apex follows
docs/TEMPLATES/htmltemps/apex.html

Do NOT revert to the original placeholder styling.

==================================================
TASK 3 — FIX BOLT
==================================================

Bolt renders successfully.

Remove the decorative banner:

● Verified document

The oversized coloured bullet should not appear.

Replace it with either:

Verified document

or a proper badge component.

No oversized bullet.

==================================================
TASK 4 — DELETE OBSIDIAN
==================================================

Remove Obsidian completely.

Delete template files.

Remove registrations.

Remove selector entries.

Remove preview mappings.

Remove template ids.

Search the repository for every remaining reference.

Nothing referencing Obsidian should remain.

==================================================
TASK 5 — AUDIT TEMPLATE CUSTOMISATION
==================================================

This is the highest priority investigation.

Determine why Industry responds to PDF customisation while the newer templates do not.

Audit the entire pipeline.

Start from the UI:

- PdfOutputCustomizeSheet

Follow the settings through:

- persisted settings
- render model
- template adapter
- template registry
- template props

Verify how these values arrive at every template:

- accent colour
- header font
- body font
- compact mode
- landscape mode

Determine why Industry respects these settings.

Determine why:

- Crest
- Ledger
- Apex
- Bolt
- Ember
- Minimal
- Evergreen

do not.

Document the exact root cause.

==================================================
TASK 6 — FIX CUSTOMISATION
==================================================

Once the root cause is identified,

ensure EVERY template uses the shared customization pipeline.

Verify that all templates respond correctly to:

✓ Accent colour

✓ Header font

✓ Body font

✓ Compact layout

✓ Landscape layout

Do NOT duplicate customisation logic.

Use the existing shared pipeline.

==================================================
STRICT RULES
==================================================

Do NOT invent a second customization system.

Do NOT hardcode theme colours where shared values should be used.

Do NOT bypass shared font resolution.

Do NOT bypass compact mode helpers.

Do NOT bypass landscape helpers.

If Industry already solves something correctly,

reuse that implementation.

==================================================
VERIFICATION
==================================================

Run:

1.
bun run audit:load

2.
bun run typecheck

3.
bun run build

Manual verification:

Generate PDFs for:

Industry

Ledger

Crest

Apex

Bolt

Ember

Minimal

Evergreen

For every template verify:

✓ Accent colour changes

✓ Header font changes

✓ Body font changes

✓ Compact mode changes spacing

✓ Landscape mode changes orientation

✓ Footer renders correctly

✓ Multi-page invoices paginate correctly

✓ Group subtotals remain outside footer

✓ PDF downloads successfully

==================================================
STOP CONDITION
==================================================

Stop only after:

- Ember renders
- Apex renders
- Bolt is cleaned up
- Obsidian is removed
- Every template responds to all PDF customisation settings
- Verification passes
- Report is complete

==================================================
SUCCESS CRITERIA
==================================================

✅ Ember downloads successfully.

✅ Apex renders correctly.

✅ Bolt decorative bullet removed.

✅ Obsidian completely removed.

✅ Every template honours accent colour.

✅ Every template honours custom fonts.

✅ Every template honours compact mode.

✅ Every template honours landscape mode.

✅ Industry behaviour remains unchanged.

✅ bun run audit:load passes.

✅ bun run typecheck passes.

✅ bun run build passes.

✅ Report complete.