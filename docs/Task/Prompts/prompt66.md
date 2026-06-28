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
`docs/Task/reports/commercial-rendering-engine-phase-4.md`

The report MUST include:
- Executive Summary
- Gate 1: Behaviour Adoption (changes, verification)
- Gate 2: Presentation Cleanup (changes, verification)
- Gate 3: Group Rendering Refresh (changes, verification)
- Verification Results (audit:load, typecheck, build, visual parity)

==================================================
CONTEXT
==================================================

Phase 3 extracted the engine as a pure behaviour layer. Phase 3.1 refined Industry's group rendering to a spreadsheet‑style design language using its own presentation layer.

Ledger currently has inline data preparation and rendering logic. It does not use the engine.

The goal is to migrate Ledger to use the engine's behaviour functions while preserving its visual identity.

==================================================
OBJECTIVE
==================================================

**Primary Goal:** Migrate Ledger to the Commercial Rendering Engine's behaviour layer without changing Ledger's visual appearance.

**Guiding Principle:** Share behaviour. Preserve presentation. Align design language—not components.

==================================================
STRICT SCOPE
==================================================

**Allowed files:**
- `src/components/pdf-new/presentation/ledger/LedgerTemplate.tsx`
- `src/components/pdf-new/presentation/ledger/ledgerStyles.ts`
- (and any new presentation files within `presentation/ledger/` if needed)

**NOT allowed:**
- Modify `engine/`
- Modify `core/`
- Modify Industry presentation
- Modify Obsidian presentation
- Modify any shared components
- Import Industry JSX or styles into Ledger

==================================================
PHASE 4 — THREE VERIFICATION GATES
==================================================

### Gate 1: Behaviour Adoption

**Goal:** Replace Ledger's inline data preparation with engine behaviour functions. Zero visual changes expected.

**Actions:**
1. Import engine behaviour functions:
   - `buildPartyLines` from `engine/party`
   - `buildAttachmentItems` from `engine/attachments`
   - `resolveColumnLayout` from `engine/columnLayout`
   - `resolveTextAlignment` from `core/alignment` (or `engine/alignment`)
   - `isGroupHeader`, `isGroupFooter`, `getGroupLabel`, `getGroupSubtotal`, `shouldShowGroupSubtotal` from `engine/group`
   - `buildTotalsLines`, `getMainTotal`, `getBalanceDue`, `formatAmountInWords` from `engine/totals`
   - `buildAdvanceSummary` from `engine/advance`
   - (also `buildGroupRows` if available, or equivalent)

2. Replace inline data extraction/formatting:
   - Party rendering: use `buildPartyLines(company)` and `buildPartyLines(client)` to get display lines.
   - Group metadata: use `getGroupLabel(row)` instead of `row.groupName || row.groupLabel`.
   - Subtotal logic: use `getGroupSubtotal(row)` and `shouldShowGroupSubtotal(row)`.
   - Column layout: use `resolveColumnLayout(col)` (no overrides needed—Ledger has its own column widths defined inline).
   - Totals: use `buildTotalsLines(totals)` to generate label/value pairs.
   - Advance: use `buildAdvanceSummary(advanceData)`.
   - Attachments: use `buildAttachmentItems(data.attachments)`.

3. Keep all JSX and styles exactly the same. The data feeding the JSX should be produced by engine functions, not inline logic.

**Verification:**
- Generate a Ledger Invoice PDF before and after.
- Compare visually: must be pixel‑identical.
- Run `typecheck`, `build`, `audit:load`.

**If any visual difference exists, stop and investigate before proceeding.**

### Gate 2: Presentation Cleanup

**Goal:** Remove any duplicated behaviour logic that was replaced in Gate 1. Keep rendering pixel‑identical.

**Actions:**
1. Delete inline helper functions that are now provided by the engine (e.g., custom `safeText` wrappers, custom alignment helpers, custom group label extraction).
2. Remove any unused imports.
3. Ensure all JSX still compiles and renders identically.

**Verification:**
- Re‑run visual comparison.
- `typecheck`, `build`, `audit:load` must pass.

### Gate 3: Group Rendering Refresh

**Goal:** Apply the spreadsheet-style design principles (white background, thin opening rule, heavy closing rule, "Subtotal" label) to Ledger's group rendering. This is the only intended visual change.

**Actions:**
1. Update group header rendering in `LedgerTemplate.tsx`:
   - Remove any tinted background (use `#ffffff`).
   - Apply thin opening rule (1px) above and below the group title.
   - Use title‑case (or mixed‑case) for group labels, not uppercase.
   - Use bold font, 10–10.5pt.
   - Keep padding minimal (6–8px).

2. Update group footer rendering:
   - If subtotal exists: render a "Subtotal" label + value row, right‑aligned, bold, followed by a heavy closing rule (2px).
   - If no subtotal: render only the heavy closing rule (2px) — no empty row.
   - No background tint. White background only.

3. Ensure item rows remain unchanged (no indentation, no decoration).

4. Ensure existing Ledger styles (colors, fonts, spacing, borders) for non‑group elements are unaffected.

**Verification:**
- Generate a Ledger Invoice PDF after the refresh.
- Compare against the previous version:
  - Only group rendering should have changed (removal of tint, new rules, "Subtotal" label).
  - Everything else (company header, table items, totals panel, bank details, footer) must remain identical.
- `typecheck`, `build`, `audit:load` must pass.

==================================================
STRICT RULES
==================================================

- **DO NOT** import Industry components or styles into Ledger.
- **DO NOT** modify the engine.
- **DO NOT** touch Obsidian.
- **DO NOT** change Ledger's overall visual identity (colors, font families, layout philosophy).
- The spreadsheet principles are implemented in Ledger's own stylesheet and JSX.

==================================================
VERIFICATION (FULL)
==================================================

Run in this order after each gate:
1. `bun run audit:load`
2. `bun run typecheck`
3. `bun run build`

Visual verification:
- Generate a Ledger Invoice PDF before the refactor.
- Generate a Ledger Invoice PDF after each gate.
- Compare visually for regressions.

==================================================
STOP CONDITION
==================================================

Stop immediately after Gate 3 is complete and all verification passes.

Do NOT begin Obsidian migration (Phase 5) or any other phase.

==================================================
SUCCESS CRITERIA
==================================================

- Ledger uses engine behaviour functions for data preparation (Gate 1).
- Ledger no longer has inline data‑extraction logic (Gate 2).
- Ledger group rendering uses spreadsheet-style section markers (white background, thin opening rule, heavy closing rule, "Subtotal" label) implemented in its own presentation layer (Gate 3).
- Ledger's visual identity (colours, fonts, spacing, layout philosophy) remains unchanged.
- No Industry components or styles are imported into Ledger.
- `bun run audit:load`, `typecheck`, `build` pass after each gate.
- The report is complete and ready for review.