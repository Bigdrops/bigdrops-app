You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
TASK: WAYBILL PDF — PRINT LAYOUT CONTRACT (LOCKED SYSTEM)
==================================================

You are modifying a production PDF system. This is NOT UI work.
You are implementing a deterministic print layout engine.

Any deviation from this contract is a defect.

==================================================
PRIMARY RULE (OVERRIDES ALL OTHERS)
==================================================
The Waybill PDF is a fixed vertical print document.

- No flexible UI behavior
- No visual experimentation
- No ad-hoc spacing
- No conditional layout differences between blank and filled templates

If current code violates this contract → REFRACTOR, do not patch.

==================================================
HARD STRUCTURE (5 ZONES — MUST MATCH CODE ORDER)
==================================================

JSX MUST appear in this exact order:

ZONE 1 — TITLE (FIXED)
- Centered
- "WAYBILL / DELIVERY NOTE"
- Never inside any row or flex group

ZONE 2 — BRAND BLOCK (FIXED)
- Logo (optional image only, no border, no placeholder)
- Company Name
- Tagline
NO contact info here

ZONE 3 — METADATA BLOCK (FIXED)
- Address (raw text only)
- Phone | Email (raw values only, NO labels)
- Date pill (expanded for handwriting)

RULE: No "Phone:", "Email:", or "Address:" labels anywhere.

ZONE 4 — CONTENT BLOCK (FLEX ONLY ZONE)
Includes:
- Client / Destination
- Vehicle / Driver
- Delivery Mode / Reason checkboxes
- Items table
- Notes

RULES:
- Only this zone may grow/shrink
- Table position must remain bottom-anchored within zone
- Redistribute height only inside this zone

ZONE 5 — SIGNATURE + FOOTER (FIXED)
- 2 equal signature cards
- Footer: company name only

Must always remain bottom aligned.

==================================================
LAYOUT CONSTRAINTS (ABSOLUTE)
==================================================

FORBIDDEN:
- position: absolute (anywhere)
- overlays
- floating elements
- conditional layout trees (logo/no logo must not change structure)
- labels like "Phone:", "Email:", "Address:"
- dynamic zone ordering

==================================================
SPACING SYSTEM (STRICT)
==================================================
Only allowed spacing values:

4, 8, 12, 16, 24

RULE:
- All margins/padding/gaps must use these values
- Exceptions allowed ONLY for:
  - flex math
  - border widths
Must be documented in report

==================================================
TYPOGRAPHY SYSTEM
==================================================
- Title: 14–16
- Company: 12–13
- Body: 9–10
- Footer: 8

No other font sizes allowed.

==================================================
TABLE CONTRACT (LOCKED)
==================================================
Column proportions (must be identical everywhere):

- #: 5%
- Description: 70%
- Qty: 12%
- Unit: 13%

Must not change between blank and filled templates.

==================================================
LOGO RULE
==================================================
- If logo exists → render Image only
- If missing → render NOTHING (no placeholder, no box, no text)
- Never reserve visual space via borders or wrappers

==================================================
SIGNATURE RULE
==================================================
- Two equal-height cards
- Internal split:
  - Top: Name | Time
  - Bottom: Signature area (larger)
- Must remain symmetric

==================================================
IMPLEMENTATION ORDER (MANDATORY)
==================================================
1. Rewrite `waybillMinimalStyles.ts` (zones + scales + typography + table)
2. Refactor `blankWaybillTemplate.tsx` into 5-zone structure
3. Refactor `WaybillPDF.tsx` to match identical structure
4. Remove ALL label prefixes globally

==================================================
VERIFICATION
==================================================
Must pass:
- bun run audit:load
- bun run typecheck
- bun run lint

Manual checks:
- Title centered and isolated
- No labels anywhere in PDF output
- Identical structure for blank and filled PDFs
- No absolute positioning in code
- 5 zones visually traceable in JSX order
- Logo absence does not create layout artifacts
- Table proportions exact

==================================================
FAIL CONDITIONS (STOP IMMEDIATELY IF TRUE)
==================================================
- Any label text ("Phone:", "Email:", etc.) exists
- Any absolute positioning exists
- Blank and filled templates differ structurally
- Zones are reordered or merged
- Spacing outside allowed scale is introduced without documentation

==================================================
DONE WHEN
==================================================
- 5-zone deterministic layout implemented
- Blank + filled templates structurally identical
- No layout drift possible without code change
- All verification passes
- Report saved to: docs/Reports/waybill-print-layout-lock.md