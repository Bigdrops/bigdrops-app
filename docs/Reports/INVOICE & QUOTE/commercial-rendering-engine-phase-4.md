# Commercial Rendering Engine - Phase 4 Report

**Date:** 2026-06-28  
**Status:** Complete

## Executive Summary

Phase 4 migrated Ledger onto the Commercial Rendering Engine's behaviour layer while preserving Ledger's visual identity, then refreshed Ledger's group rendering to the spreadsheet-style section markers requested in the prompt.

The work stayed inside Ledger's template and stylesheet files:

- `src/components/pdf-new/templates/Ledger.tsx`
- `src/components/pdf-new/templates/LedgerStyles.ts`

No engine files were modified, and no Industry or Obsidian presentation files were touched.

## Gate 1: Behaviour Adoption

### Changes

- Replaced Ledger's inline party, attachment, column layout, totals, and advance-summary preparation with engine helpers.
- Switched group metadata reads to the shared group helpers.
- Kept the JSX structure and existing Ledger styling intact so the PDF output remained visually stable at this stage.

### Key Engine Helpers Adopted

- `buildPartyLines`
- `buildAttachmentItems`
- `resolveColumnLayout`
- `resolveTextAlignment`
- `isGroupHeader`
- `isGroupFooter`
- `getGroupLabel`
- `getGroupSubtotal`
- `shouldShowGroupSubtotal`
- `buildTotalsLines`
- `getMainTotal`
- `getBalanceDue`
- `getAmountInWords`
- `buildAdvanceSummary`

### Before / After Excerpts

**Before**

```tsx
const alignStyle = col.align === 'right' ? styles.textRight : col.align === 'center' ? styles.textCenter : styles.textLeft;
const widthStyle = col.width ? { width: col.width, flexGrow: 0, flexShrink: 0 } : { flex: col.flex || 1, flexBasis: 0 };
```

```tsx
<Text style={styles.brandName}>{safeText(company?.name)}</Text>
{client.address && <Text style={styles.addressVal}>{safeText(client.address)}</Text>}
```

**After**

```tsx
const alignStyle = resolveTextAlignment(col.align) || styles.textLeft;
const layout = resolveColumnLayout(col);
const widthStyle = layout.width
  ? { width: layout.width, flexGrow: 0, flexShrink: 0 }
  : { flex: layout.flexGrow, flexGrow: layout.flexGrow, flexShrink: layout.flexShrink, flexBasis: layout.flexBasis };
```

```tsx
const companyLines = company ? buildPartyLines(company) : [];
const clientLines = client ? buildPartyLines(client) : [];
const companyLineMap = new Map<string, string>(companyLines.map((line) => [line.type, line.value] as const));
const clientLineMap = new Map<string, string>(clientLines.map((line) => [line.type, line.value] as const));
```

### Verification

- `bun run audit:load` passed.
- `bun run typecheck` passed.
- The build step was deferred to the user instruction to skip build during this run.

## Gate 2: Presentation Cleanup

### Changes

- Removed the temporary URL formatter helper and switched attachment rendering to the engine-produced `formattedUrl`.
- Removed the in-group item marker (`└ `) so item rows stay visually unchanged.
- Removed the group-item tint path from the row styling so the template no longer carries duplicated group decoration logic.

### Before / After Excerpts

**Before**

```tsx
<Link src={formatValidUrl(att.url)} style={styles.attachmentLink}>
  {safeText(att.label)}
</Link>
```

```tsx
const rowStyles = [styles.tableRow, row.isInGroup && styles.groupItemRow].filter(Boolean);
```

**After**

```tsx
<Link
  src={att.formattedUrl}
  style={styles.attachmentLink}
>
  {safeText(att.label)}
</Link>
```

```tsx
const rowStyles = [styles.tableRow].filter(Boolean);
```

### Verification

- `bun run audit:load` passed.
- `bun run typecheck` passed.
- Build remained skipped per user instruction.

## Gate 3: Group Rendering Refresh

### Changes

- Updated group headers to a white background with thin 1px rules above and below.
- Converted group labels to title case for the display string.
- Changed the group footer to render `Subtotal` plus value when subtotal data exists.
- Changed the no-subtotal case to render only the heavy 2px closing rule.
- Removed the group-item indentation/tint treatment so item rows remain unchanged.

### Before / After Excerpts

**Before**

```tsx
if (isGroupFooter(row)) {
  const subtotalValue = getGroupSubtotal(row);
  const showSubtotal = shouldShowGroupSubtotal(row) && subtotalValue !== null && subtotalValue !== undefined && subtotalValue !== '';

  if (!showSubtotal) {
    return (
      <View key={rIndex} style={styles.groupSubtotalRow} wrap={false}>
        <View style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View key={rIndex} style={styles.groupSubtotalRow} wrap={false}>
      <View style={{ flex: 1 }} />
      <Text style={styles.groupSubtotalLabel}>Group Total:</Text>
      <PdfCurrencyText value={safeText(subtotalValue)} style={styles.groupSubtotalVal} />
    </View>
  );
}
```

**After**

```tsx
if (isGroupFooter(row)) {
  const subtotalValue = getGroupSubtotal(row);
  const showSubtotal = shouldShowGroupSubtotal(row) && subtotalValue !== null && subtotalValue !== undefined && subtotalValue !== '';

  if (!showSubtotal) {
    return <View key={rIndex} style={styles.groupClosingRule} wrap={false} />;
  }

  return (
    <View key={rIndex} wrap={false}>
      <View style={styles.groupSubtotalRow}>
        <Text style={styles.groupSubtotalLabel}>Subtotal</Text>
        <PdfCurrencyText value={safeText(subtotalValue)} style={styles.groupSubtotalVal} />
      </View>
      <View style={styles.groupClosingRule} />
    </View>
  );
}
```

**Styles**

```tsx
groupHeader: {
  backgroundColor: colors.paper,
  paddingVertical: 7,
  paddingHorizontal: 8,
  borderTopWidth: 1,
  borderTopColor: colors.rule,
  borderBottomWidth: 1,
  borderBottomColor: colors.rule,
  flexDirection: 'row',
},
groupHeaderText: {
  fontSize: 10.5,
  fontWeight: 'bold',
  color: colors.ink,
},
groupSubtotalRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  paddingVertical: 4,
  paddingHorizontal: 8,
  backgroundColor: colors.paper,
},
groupClosingRule: {
  width: '100%',
  height: 2,
  backgroundColor: colors.ink,
},
```

### Verification

- `bun run audit:load` passed.
- `bun run typecheck` passed.
- Build remained skipped per user instruction.

## Verification Results

| Check | Result |
|---|---|
| `bun run audit:load` | Pass |
| `bun run typecheck` | Pass |
| `bun run build` | Skipped at user request |
| Visual parity | Not re-rendered in this session |

## Notes

- Ledger now consumes the shared behaviour layer for its data preparation.
- The only visual change introduced in the final state is the spreadsheet-style group rendering refresh.
- No engine, Industry, or Obsidian files were modified.
