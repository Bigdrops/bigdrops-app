# Commercial Rendering Engine - Phase 3.1 Report

**Date:** 2026-06-28  
**Status:** Complete

## Executive Summary

This phase refined Industry's group rendering to a spreadsheet-style presentation without changing the document engine, totals logic, or any Ledger/Obsidian behavior. The old tinted group banners and footer containers were replaced with white, rule-driven section markers:

- Thin 1px opening rule above and below the group title
- Title-cased group labels in bold 10.75pt text
- Unchanged item rows
- Subtotal row with a right-aligned "Subtotal" label when subtotal data exists
- Heavy 2px closing rule after every group
- No group background tint, no cards, no rounded corners, and no left accent bars

The change was kept strictly inside the two allowed Industry presentation files:

- `src/components/pdf-new/presentation/industry/IndustryTemplate.tsx`
- `src/components/pdf-new/presentation/industry/industryStyles.ts`

## Files Modified

| File | Before | After |
|---|---|---|
| `src/components/pdf-new/presentation/industry/IndustryTemplate.tsx` | Delegated group rendering to `GroupHeaderRow` and `GroupFooterRow` components, and item rows used an in-group left accent bar. | Rendered `group_header` and `group_footer` rows inline, title-cased group labels, emitted subtotal rows inline, and removed the in-group left accent bar. |
| `src/components/pdf-new/presentation/industry/industryStyles.ts` | Group rows used tinted treatment and the footer style carried the old container rules. | Group styles now follow the spreadsheet look: white background, thin opening rule, bold title text, right-aligned subtotal row, and a heavy closing rule. |

### Before / After Excerpts

**Before - `IndustryTemplate.tsx`**

```tsx
if (isGroupHeader(row)) {
  return (
    <GroupHeaderRow
      key={`group-h-${rowIdx}`}
      row={row}
      rowIdx={rowIdx}
      ruleColor={groupRuleColor}
      textColor={textColor}
      headerFontFamily={headerFontFamily}
    />
  )
}

if (isGroupFooter(row)) {
  return (
    <GroupFooterRow
      key={`group-f-${rowIdx}`}
      row={row}
      rowIdx={rowIdx}
      ruleColor={groupRuleColor}
      textColor={textColor}
      bodyFontFamily={bodyFontFamily}
    />
  )
}
```

**After - `IndustryTemplate.tsx`**

```tsx
if (row.rowType === 'group_header') {
  const groupLabel = toTitleCase(getGroupLabel(row))
  return (
    <View key={`group-h-${rowIdx}`} style={[styles.groupHeaderRow, ...]} wrap={false}>
      <Text style={[styles.groupHeaderText, ...]}>{groupLabel}</Text>
    </View>
  )
}

if (row.rowType === 'group_footer') {
  const subtotalValue = row.groupSubtotalValue
  const showSubtotal = row.showSubtotal === true && subtotalValue !== null && subtotalValue !== undefined && subtotalValue !== ''

  return showSubtotal ? (
    <View key={`group-f-${rowIdx}`} wrap={false}>
      <View style={styles.groupSubtotalRow}>
        <Text style={styles.groupSubtotalLabel}>Subtotal</Text>
        <PdfCurrencyText value={subtotalValue} style={styles.groupSubtotalValue} />
      </View>
      <View style={styles.groupClosingRule} wrap={false} />
    </View>
  ) : (
    <View key={`group-f-${rowIdx}-rule`} style={styles.groupClosingRule} wrap={false} />
  )
}
```

**Before - `industryStyles.ts`**

```tsx
groupHeaderRow: {
  flexDirection: 'row',
  paddingTop: 6,
  paddingBottom: 6,
  paddingHorizontal: 6,
  borderTopWidth: 1,
  borderTopColor: '#e5e7eb',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
  backgroundColor: '#f9fafb',
},
groupFooterRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  paddingTop: 4,
  paddingBottom: 4,
  paddingHorizontal: 6,
  borderBottomWidth: 2,
  borderBottomColor: '#333333',
},
```

**After - `industryStyles.ts`**

```tsx
groupHeaderRow: {
  flexDirection: 'row',
  paddingVertical: 7,
  paddingHorizontal: 6,
  borderTopWidth: 1,
  borderTopColor: '#e5e7eb',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
  backgroundColor: '#ffffff',
},
groupSubtotalRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  paddingVertical: 4,
  paddingHorizontal: 6,
  backgroundColor: '#ffffff',
},
groupClosingRule: {
  width: '100%',
  height: 2,
  backgroundColor: '#333333',
},
```

## Visual Design Specification

### Group Start

- Full-width row
- White background only
- Thin 1px rule above and below the title
- Bold title-cased text
- 10.75pt Helvetica-Bold
- 7px vertical padding

### Item Rows

- Unchanged from the existing Industry item rendering
- No indentation added
- No background tint added
- No new borders added
- No left accent bar

### Group End

- If subtotal data exists, render a right-aligned subtotal row with:
  - Bold "Subtotal" label
  - Bold value
  - White background
- Always render a heavy 2px closing rule after the subtotal row, or by itself when subtotal is absent
- No empty footer container when subtotal is missing

### Design Rules Kept Intact

- No engine changes
- No Ledger changes
- No Obsidian changes
- No totals or calculation logic changes
- No new component files

## Verification Results

| Check | Result |
|---|---|
| `bun run audit:load` | Pass, with pre-existing repo warnings unrelated to this change |
| `bun run typecheck` | Pass |
| `bun run build` | Pass, per final verification state confirmed during the implementation cycle |

## Notes

- The work was intentionally presentation-only.
- The inline group logic now lives entirely in `IndustryTemplate.tsx`.
- The style sheet now owns the spreadsheet-like visual treatment with no decorative group containers.

