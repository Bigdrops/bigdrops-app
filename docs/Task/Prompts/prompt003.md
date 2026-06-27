o
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
`docs/Task/reports/commercial-rendering-engine-phase-3.1.md`

The report MUST include:
- Executive Summary
- Files Modified (with before/after excerpts)
- Visual Design Specification (spreadsheet-style group rendering)
- Verification Results (audit:load, typecheck, build, visual parity)

==================================================
CONTEXT
==================================================

Phase 3 successfully extracted the engine as a pure behaviour layer and migrated Industry to `presentation/industry/`. However, the group rendering still retains decorative elements from the old design:

- Tinted backgrounds (`#f9fafb`) on group headers
- Tinted backgrounds on group footers
- "Group Total" label instead of "Subtotal"
- Decorative cards / containers
- Header/footer component abstractions that are too heavy

The client has requested a spreadsheet‑style group rendering that follows the Excel/accounting aesthetic:
- White background only
- Thin opening rule (1px) above the group title
- Group title: bold, title case (or small caps), 10.5–11pt
- Item rows: unchanged, no decoration
- Subtotal row (if present): bold, right‑aligned, with a heavy closing rule (2px)
- Closing rule (if no subtotal): heavy rule only — no empty row
- No backgrounds, no cards, no rounded corners, no left accent bars
- No separate "Header"/"Footer" components — table renderer owns the logic inline

==================================================
OBJECTIVE
==================================================

Refine Industry's group rendering to the spreadsheet-style specification.

This is a presentation‑only change. No engine modifications. No behaviour changes. No Ledger or Obsidian changes.

==================================================
STRICT SCOPE
==================================================

ONLY modify:
- `presentation/industry/IndustryTemplate.tsx` — table rendering section
- `presentation/industry/industryStyles.ts` — add/update group styles

DO NOT touch:
- `engine/` — no changes
- `core/` — no changes
- `presentation/ledger/` — no changes
- `presentation/obsidian/` — no changes
- `src/components/pdf-new/` outside the two files above

==================================================
VISUAL SPECIFICATION
==================================================

### Group Start (Section Marker — Open)

```

────────────────────────────────────────────────────────────
Electrical Installation
────────────────────────────────────────────────────────────

```

Characteristics:
- Full‑width table row
- Thin rule above and below (1px)
- No background tint
- Font: Helvetica Bold, 10.5–11pt, title case (e.g., "Electrical Installation", not "ELECTRICAL INSTALLATION")
- Vertical padding: 6–8px (slightly more than item rows)

### Item Rows

```

Cable installation                      2         1,200.00
Conduit work                            5         3,400.00
Termination                             1         5,600.00

```

Characteristics:
- Completely unchanged from current item rows
- No indentation, no background, no borders
- The contrast comes from the start and end markers, not the items themselves

### Group End (Section Divider)

**If subtotal exists:**
```

────────────────────────────────────────────────────────────
Subtotal                                       10,200.00
════════════════════════════════════════════════════════════

```
- One row: "Subtotal" label + value
- Subtotal value right‑aligned to numeric columns
- Bold font
- Heavy closing rule (2px) — double the thickness of the opening rule

**If no subtotal exists:**
```

────────────────────────────────────────────────────────────
════════════════════════════════════════════════════════════

```
- No text — just the heavy closing rule (2px)
- This signals "section finished" without a fake footer

### Key Principles
- White background throughout
- No rounded corners, no cards, no left accent bars
- No margin blocks (rules provide separation)
- Only typography and horizontal rules distinguish sections

==================================================
IMPLEMENTATION NOTES
==================================================

### 1. Remove Existing Decorative Elements

- Remove `backgroundColor` from group header styles
- Remove `backgroundColor` from group footer styles
- Remove any `borderRadius`, `marginTop`, `marginBottom` that create card‑like spacing around groups
- Remove left accent bars or side borders

### 2. Inline the Logic

Do NOT create separate `GroupStartRow.tsx` or `GroupEndRow.tsx` components. The table renderer in `IndustryTemplate.tsx` should own this logic inline.

**Conceptual structure (inside the table render loop):**

```tsx
// Within the table row map
if (row.rowType === 'group_header') {
  // Render group start row
  return (
    <View style={[styles.groupStartRow, ruleColor ? { borderTopColor: ruleColor, borderBottomColor: ruleColor } : null]} wrap={false}>
      <Text style={[styles.groupStartText, textColor ? { color: textColor } : null, headerFontFamily ? { fontFamily: headerFontFamily } : null]}>
        {getGroupLabel(row)}
      </Text>
    </View>
  )
}

// ... item rows ...

// After processing all items in the group, render the group end
if (hasGroupEnd) {
  if (hasSubtotal) {
    // Render subtotal row + closing rule
    return (
      <>
        <View style={[styles.groupSubtotalRow]} wrap={false}>
          <Text style={styles.groupSubtotalLabel}>Subtotal</Text>
          <PdfCurrencyText value={subtotal} style={styles.groupSubtotalValue} />
        </View>
        <View style={styles.groupClosingRule} />
      </>
    )
  } else {
    // Render closing rule only
    return <View style={styles.groupClosingRule} />
  }
}
```

3. Update Styles in industryStyles.ts

```ts
groupStartRow: {
  flexDirection: 'row',
  paddingVertical: 6,
  paddingHorizontal: 6,
  borderTopWidth: 1,
  borderTopColor: '#e5e7eb',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
  backgroundColor: 'transparent', // or remove entirely
},
groupStartText: {
  textAlign: 'left',
  fontSize: 10.5,
  fontFamily: 'Helvetica-Bold',
  color: '#1f2937',
  // no letter-spacing, no uppercase
},
groupSubtotalRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  paddingVertical: 4,
  paddingHorizontal: 6,
  backgroundColor: 'transparent',
},
groupSubtotalLabel: {
  fontSize: 10,
  fontFamily: 'Helvetica-Bold',
  color: '#1f2937',
  marginRight: 8,
},
groupSubtotalValue: {
  fontSize: 10,
  fontFamily: 'Helvetica-Bold',
  color: '#1f2937',
},
groupClosingRule: {
  height: 2,
  backgroundColor: '#333333',
  marginVertical: 0,
},
```

4. Verify the Opening Rule Colour

If ruleColor (from design presets) is available, apply it to the opening rule. Otherwise, use a neutral colour like #e5e7eb (grey‑200) or #cdc9c1 (Industry's current rule colour).

5. Ensure Page Breaks Still Work

The existing buildTableWithPageBreaks() and splitTableAcrossPages() functions must be updated to treat the start and end markers as part of the group they belong to. The group should not be split across pages unless necessary — keep the wrap={false} on the start/end rows to prevent orphaned markers.

==================================================
VERIFICATION
==================================================

Run in this order:

1. bun run audit:load
2. bun run typecheck
3. bun run build

Manual verification:

· Generate an Industry Invoice PDF.
· Compare visually against a previous version (or ensure the following are true):
  · Group headers have white background (no tint)
  · Thin rule above and below each group title
  · Group title is bold, title case (not uppercase)
  · Item rows unchanged
  · Subtotal row (if present) has "Subtotal" label + value, right‑aligned
  · Heavy closing rule (2px) after subtotal or after last item if no subtotal
  · No cards, no rounded corners, no left accent bars
  · No background on any group‑related element
  · Compact mode (if tested) still works

If any visual difference exists (other than intentional removal of decorative elements), stop and investigate.

==================================================
STOP CONDITION
==================================================

Stop immediately after:

· Industry's group rendering has been updated to spreadsheet style
· Verification passes
· The report is complete

Do NOT touch Ledger, Obsidian, or the engine.

==================================================
SUCCESS CRITERIA
==================================================

✅ Group headers have no background tint
✅ Group headers have thin rule above and below
✅ Group headers use title case, not uppercase
✅ Subtotal rows (if present) use "Subtotal" label
✅ Closing rule is 2px heavy
✅ No‑subtotal groups close with a 2px heavy rule only
✅ No cards, no rounded corners, no left accent bars
✅ Item rows unchanged
✅ bun run audit:load passes
✅ bun run typecheck passes
✅ bun run build passes
✅ Report is complete and ready for review

```

---

