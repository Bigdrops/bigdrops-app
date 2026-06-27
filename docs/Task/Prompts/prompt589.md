
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
   - typescript-advanced-types
3. For each skill:
   - Attempt to load via the skill system.
   - If loading fails, fallback to direct file read from `.claude/skills/` or `.agents/skills/`.
4. If any critical skill cannot be loaded, STOP immediately and report the failure.
5. Read `AGENTS.md` completely before making any code changes.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================

Save a complete implementation report to:
`docs/Task/reports/commercial-rendering-engine-phase-3.md`

The report MUST include:
- Executive Summary
- Files Created (with code excerpts)
- Files Modified (with before/after)
- Files Deleted
- Verification Results (audit:load, typecheck, build, visual parity)
- Group Rendering Changes (before/after visual description)

==================================================
CONTEXT
==================================================

The architecture audit (Phase 2) has been completed and approved.

Key findings:
- The current engine is Industry-specific — all JSX components hardcode `industryStyles`
- The engine must become a behaviour layer (pure functions), not a presentation layer
- No React-PDF imports in engine/
- No reverse dependencies (engine → templates)

Additionally, the user has requested a redesign of Industry's group rendering:
- Current: "open" header + "close" footer with decorative containers, tinted backgrounds, cards
- Desired: Spreadsheet-style section start and section end using rows and horizontal rules only

==================================================
OBJECTIVE
==================================================

Execute Phase 3 of the Commercial Rendering Engine migration:

1. Create engine behaviour modules (pure functions, no JSX)
2. Update Industry to use the new behaviour modules
3. Redesign Industry's group rendering to spreadsheet-style sections
4. Migrate Industry JSX components to `presentation/industry/`
5. Remove obsolete engine JSX components
6. Remove the compatibility layer (`commercialDocumentBlocks.tsx`)

==================================================
ARCHITECTURAL CONSTRAINTS (NON-NEGOTIABLE)
==================================================

### Constraint 1: Extract Behaviour, Not "ViewModel Everything"

The engine should expose small, composable pure functions. Avoid creating a class or model for every rendering concern.

**Good:**
```ts
buildPartyLines(party)  // returns Array<{ key, value, type }>
buildGroupRows(rows)    // returns enriched rows with group metadata
resolveColumnLayout(column, overrides?) // returns { width, flex, flexGrow, ... }
resolveAlignment(align) // returns { textAlign } or null
splitDescription(value) // returns { main, sub }
formatGroupLabel(row)   // returns string
```

Avoid: Dedicated PartyViewModel, GroupHeaderViewModel, DescriptionModel classes unless genuinely required (they are not).

Constraint 2: No React in engine/

The engine must never import:

· @react-pdf/renderer
· <View>, <Text>, <Link>, StyleSheet
· Any template stylesheet

The dependency graph must be:

```
Core ↓ Engine ↓ Presentation
```

Never:

```
Engine ↓ Presentation
```

==================================================
PHASE 3 — STEP A: BEHAVIOUR EXTRACTION
==================================================

Create new engine behaviour modules. No JSX. No React imports. No style imports.

1. Create engine/party.ts

Pure function that builds a structured party representation:

```ts
export function buildPartyLines(party: {
  name?: string | null;
  address?: string | null;
  cityState?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  customInfo?: Array<{ label: string; value: string }>;
}): Array<{ key: string; value: string; type: 'name' | 'address' | 'cityState' | 'phone' | 'email' | 'website' | 'custom' }>
```

· Returns array of lines in display order
· Skips null/undefined/empty values
· Does NOT render — only returns data structure

2. Create engine/group.ts

Pure functions for group header/footer enrichment:

```ts
export function isGroupHeader(row: any): boolean
export function isGroupFooter(row: any): boolean
export function getGroupLabel(row: any): string
export function getGroupSubtotal(row: any): number | null
export function shouldShowGroupSubtotal(row: any): boolean
```

These accept a table row and return derived metadata. No styling. No JSX.

3. Create engine/attachments.ts

Pure function for attachment normalisation:

```ts
export function buildAttachmentItems(attachments: any[]): Array<{
  label: string;
  url: string | null;
  formattedUrl: string | null;
}>
```

· Ensures URL has protocol prefix if missing (https://)
· Returns structured data for templates to render

4. Create engine/columnLayout.ts

Generic column width/flex resolver:

```ts
export function resolveColumnLayout(
  column: { id: string; width?: number; flex?: number },
  overrides?: Record<string, { width?: number; flex?: number }>
): { width: number | null; flex: number; flexGrow: number; flexShrink: number; flexBasis: number }
```

· Accepts optional per-column overrides
· Industry provides its own overrides
· Ledger/Obsidian provide none (or their own)

5. Create engine/alignment.ts (or move from engine to core)

```ts
export function resolveTextAlignment(align?: 'left' | 'center' | 'right' | null): { textAlign: 'left' | 'center' | 'right' } | null
```

· Returns { textAlign } object or null
· No default — let templates set their own defaults

6. Create engine/totals.ts

Pure functions for totals normalisation:

```ts
export function buildTotalsLines(totals: any): Array<{ label: string; value: string }>
export function getMainTotal(totals: any): { label: string; value: string } | null
export function getBalanceDue(totals: any): { label: string; value: string } | null
export function formatAmountInWords(amount: number): string
```

7. Create engine/advance.ts

Pure function for advance summary:

```ts
export function buildAdvanceSummary(advanceData: any): {
  primaryLabel: string;
  advanceAmount: string;
  secondaryLabel: string;
  balanceRemaining: string;
} | null
```

==================================================
PHASE 3 — STEP B: REDESIGN INDUSTRY GROUP RENDERING
==================================================

The user has requested a spreadsheet-style group layout:

```
————————————————————————————————————————————————————————————
Electrical Installation
————————————————————————————————————————————————————————————
Item 1                                          1,200.00
Item 2                                          3,400.00
Item 3                                          5,600.00
————————————————————————————————————————————————————————————
Subtotal                                       10,200.00
════════════════════════════════════════════════════════════
```

Design Requirements

Group Header:

· Full-width table row
· Thin rule above and below
· Slightly larger font weight (semibold) and vertical padding than item rows
· Title Case (not uppercase)
· No background tint, no card, no rounded corners, no left accent bar
· It should feel like Excel inserting a heading row

Group Items:

· Exactly the same item rows as currently rendered
· No indentation, no coloured background, no decorative borders
· The contrast comes from the header and footer — not the items

Group Footer (Closing Row):

If subtotal exists:

```
————————————————————————————————————————————————————————————
Subtotal                                       10,200.00
════════════════════════════════════════════════════════════
```

· One row: "Subtotal" label + value
· Subtotal label aligned to the left (or appropriately positioned)
· Subtotal value aligned to numeric columns (right-aligned)
· Heavy bottom rule (double weight) for visual closure

If no subtotal exists:

```
————————————————————————————————————————————————————————————
════════════════════════════════════════════════════════════
```

· No text — just a heavy closing rule
· This signals "group finished"

Implementation Notes

· The group footer should only appear if the group has rows (the header always appears)
· The heavy closing rule should always appear, regardless of whether subtotal exists
· Existing buildTableWithPageBreaks() and splitTableAcrossPages() must be updated to respect the new header/footer row structure
· The table should remain dense — header and footer rows should have only 4–6px more padding than item rows

==================================================
PHASE 3 — STEP C: UPDATE INDUSTRY TO USE ENGINE
==================================================

1. Import new behaviour functions from engine/:
   · buildPartyLines
   · isGroupHeader, isGroupFooter, getGroupLabel, getGroupSubtotal, shouldShowGroupSubtotal
   · buildAttachmentItems
   · resolveColumnLayout (with Industry overrides)
   · resolveTextAlignment (moved to core)
   · buildTotalsLines, getMainTotal, getBalanceDue, formatAmountInWords
   · buildAdvanceSummary
2. Replace inline data preparation with engine calls:
   · Party rendering: const partyLines = buildPartyLines(company)
   · Group headers/footers: use engine predicates and label extractors
   · Attachments: const items = buildAttachmentItems(data.attachments)
   · Column layout: const layout = resolveColumnLayout(col, INDUSTRY_COLUMN_OVERRIDES)
   · Totals: const lines = buildTotalsLines(totals)
   · Advance: const advance = buildAdvanceSummary(advanceData)
3. Use the returned data structures in JSX rendering.
4. Verify pixel-identical rendering (before/after comparison).

==================================================
PHASE 3 — STEP D: MIGRATE INDUSTRY PRESENTATION
==================================================

ONLY after verification passes:

1. Move Industry's JSX components from engine/ to presentation/industry/:
   · CommercialPartyCard.tsx → presentation/industry/PartyCard.tsx
   · CommercialGroupHeaderRow.tsx → presentation/industry/GroupHeaderRow.tsx
   · CommercialGroupFooterRow.tsx → presentation/industry/GroupFooterRow.tsx
   · renderOptionalList.tsx → presentation/industry/OptionalList.tsx
2. Move Industry's column overrides from engine/resolveColumnStyle.ts to presentation/industry/IndustryColumnOverrides.ts
3. Update Industry's imports to use the presentation-layer components:
   · import { PartyCard } from '../presentation/industry/PartyCard'
4. Delete engine/CommercialPartyCard.tsx, engine/CommercialGroupHeaderRow.tsx, engine/CommercialGroupFooterRow.tsx, engine/renderOptionalList.tsx
5. Delete commercialDocumentBlocks.tsx (compatibility shim no longer needed)
6. Update engine/index.ts to export only behaviour functions (no JSX)
7. Move resolveTextAlignmentStyle from engine/ to core/alignment.ts
8. Split pdfCompact.ts into per-template compact files:
   · Industry compact → presentation/industry/compact.ts
   · Ledger compact → presentation/ledger/compact.ts
   · Obsidian compact → presentation/obsidian/compact.ts

==================================================
VERIFICATION
==================================================

Run in this order:

1. bun run audit:load
2. bun run typecheck
3. bun run build

Manual verification:

· Generate an Industry Invoice PDF before the refactor.
· Generate an Industry Invoice PDF after the refactor.
· Compare visually:
  · Same company details
  · Same table content
  · New spreadsheet-style group rendering:
    · Header row with thin rules above and below
    · Items unchanged
    · Closing row with "Subtotal" + heavy bottom rule (or just heavy rule if no subtotal)
  · Same totals
  · Same bank details
  · Same signature, notes, terms, attachments
  · Same footer
  · Same compact mode behaviour (if tested)

If any visual difference exists, stop and investigate before proceeding.

==================================================
STOP CONDITION
==================================================

Stop immediately after Phase 3 is complete and all verification passes.

Do NOT begin Ledger migration (Phase 4).
Do NOT begin Obsidian migration (Phase 5).
Do NOT touch pagination, HTML sanitisation, or currency.

==================================================
SUCCESS CRITERIA
==================================================

✅ engine/ contains no JSX components
✅ engine/ imports no template files
✅ engine/ imports no React-PDF components
✅ engine/ contains only pure behaviour functions
✅ Industry renders identically (visual parity) after refactor
✅ Industry group rendering now uses spreadsheet-style section start/end
✅ Ledger and Obsidian remain untouched functionally
✅ commercialDocumentBlocks.tsx is removed
✅ pdfCompact.ts is split into per-template compact files
✅ bun run audit:load passes
✅ bun run typecheck passes
✅ bun run build passes
✅ Phase 3 report is complete and ready for review

```

---

