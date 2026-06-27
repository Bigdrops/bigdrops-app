# Commercial Rendering Engine — Phase 2: Ledger Migration Report

**Date:** 2026-06-27
**Status:** STOP — Migration Not Possible (Outcome B)

---

## 1. Executive Summary

Ledger's duplicated rendering logic **cannot** be replaced by the existing engine primitives without either modifying the engine or changing Ledger's visual identity. Every engine component hardcodes references to `industryStyles` — the Industry template's stylesheet. Using these components in Ledger would force Industry's visual appearance onto Ledger.

The minimum future engine change required is: **Add style prop overrides to every engine component** so templates can inject their own stylesheet references.

---

## 2. Architecture Review

### Engine Components and Their Coupling

All engine components import `styles` from `../templates/industryStyles` directly:

| Engine Component | Hardcoded Style References |
|---|---|
| `CommercialPartyCard` | `styles.partyBox`, `styles.partyBoxLast`, `styles.partyTitle`, `styles.partyName`, `styles.partyLine` |
| `CommercialGroupHeaderRow` | `styles.tableGroupHeader`, `styles.groupTitleCell` |
| `CommercialGroupFooterRow` | `styles.tableGroupFooter`, `styles.groupSubtotalRow`, `styles.groupSubtotalValue` |
| `renderOptionalList` | `styles.attachmentItem`, `styles.attachmentLink` |
| `resolveColumnStyle` | `INDUSTRY_COLUMN_OVERRIDES` (hardcoded column widths for Industry) |

### Ledger's Own Stylesheet

Ledger uses a completely separate stylesheet (`LedgerStyles.ts`) with different colors, spacing, and layout rules. There is no overlap in style names or values between the two sheets.

---

## 3. Files Read

| File | Purpose |
|---|---|
| `src/components/pdf-new/templates/Ledger.tsx` | Target template for migration |
| `src/components/pdf-new/templates/LedgerStyles.ts` | Ledger's stylesheet (521 lines) |
| `src/components/pdf-new/engine/index.ts` | Engine barrel exports |
| `src/components/pdf-new/engine/CommercialPartyCard.tsx` | Engine party card component |
| `src/components/pdf-new/engine/CommercialGroupHeaderRow.tsx` | Engine group header component |
| `src/components/pdf-new/engine/CommercialGroupFooterRow.tsx` | Engine group footer component |
| `src/components/pdf-new/engine/renderOptionalList.tsx` | Engine attachment renderer |
| `src/components/pdf-new/engine/resolveColumnStyle.ts` | Engine column width resolver |
| `src/components/pdf-new/engine/resolveTextAlignmentStyle.ts` | Engine text alignment resolver |
| `src/components/pdf-new/engine/getAccentTint.ts` | Engine accent tint utility |
| `src/components/pdf-new/templates/Industry.tsx` | Reference: how engine is consumed |
| `src/components/pdf-new/templates/industryStyles.ts` | Reference: engine's hardcoded styles |
| `src/components/pdf-new/templates/commercialDocumentBlocks.tsx` | Compatibility re-exports |

---

## 4. Files Modified

**None.** The migration was determined to be impossible without violating the hard rules.

---

## 5. Why Each Modification Was Required (N/A — No Changes Made)

---

## 6. Incompatibility Analysis — Before/After Comparison

### 6.1 Party Card Rendering

**Ledger** (lines 96-107):
```tsx
<View style={styles.addressPanel}>      {/* 50% width, border-right, padding: 24 */}
  {client && (
    <View style={styles.addressBlock}>
      <Text style={styles.addressLabel}>Bill To</Text>   {/* 7px, uppercase, lightGray */}
      <Text style={styles.addressVal}>{safeText(client.name)}</Text>  {/* 10px, ink */}
      {client.address && <Text style={styles.addressVal}>{safeText(client.address)}</Text>}
      {client.cityState && <Text style={styles.addressVal}>{safeText(client.cityState)}</Text>}
      {client.email && <Text style={styles.addressVal}>{safeText(client.email)}</Text>}
      {client.phone && <Text style={styles.addressVal}>{safeText(client.phone)}</Text>}
    </View>
  )}
</View>
```

**Engine** (`CommercialPartyCard.tsx`):
```tsx
<View style={[styles.partyBox, ...]}>   {/* flex:1, bg: #e8e8e8, border: 1px, borderRadius: 3 */}
  <Text style={[styles.partyTitle, ...]}>Title</Text>     {/* 14px, Helvetica-Bold */}
  {party.name ? <Text style={styles.partyName}>{party.name}</Text> : null}  {/* 12.5px */}
  {party.address ? <Text style={styles.partyLine}>{party.address}</Text> : null}  {/* 10px */}
  {party.cityState ? <Text style={styles.partyLine}>{party.cityState}</Text> : null}
  {party.phone ? <Text style={styles.partyLine}>{party.phone}</Text> : null}
  {party.email ? <Text style={styles.partyLine}>{party.email}</Text> : null}
</View>
```

**Incompatibility:** Ledger's address panel is a simple 50%-width column with a "Bill To" label. Engine renders a styled card with background, border, rounded corners, and a title header. Completely different visual concept.

### 6.2 Group Header Rendering

**Ledger** (lines 132-138):
```tsx
{row.rowType === 'group_header' && (
  <View key={rIndex} style={styles.groupHeader} wrap={false}>
    {/* backgroundColor: '#f4f2ed', paddingVertical: 8, paddingHorizontal: 8,
        borderBottomWidth: 1, borderBottomColor: '#cdc9c1', flexDirection: 'row' */}
    <Text style={styles.groupHeaderText}>{safeText(row.groupLabel)}</Text>
    {/* fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', color: '#2b2b2b' */}
  </View>
)}
```

**Engine** (`CommercialGroupHeaderRow.tsx`):
```tsx
<View style={[styles.tableGroupHeader, ...]}>
  {/* marginTop: 14, paddingTop: 8, paddingBottom: 6, paddingHorizontal: 12,
      borderTopWidth: 1.8, borderTopColor: '#333333', backgroundColor: '#f9fafb' */}
  <Text style={[styles.groupTitleCell, ...]}>
    {/* textAlign: 'left', fontSize: 10.5, fontFamily: 'Helvetica-Bold',
        color: '#1f2937', letterSpacing: 0.1 */}
    {row.groupName || row.groupLabel || ''}
  </Text>
</View>
```

**Incompatibility:** Ledger uses bottom-border only, no top margin, 8px padding, `#f4f2ed` background. Engine uses top-border with 1.8px width, top margin, 12px horizontal padding, `#f9fafb` background. Font sizes differ (8px vs 10.5px). These produce visibly different group headers.

### 6.3 Group Footer Rendering

**Ledger** (lines 140-148):
```tsx
{row.rowType === 'group_footer' && (
  <View key={rIndex} style={styles.groupSubtotalRow} wrap={false}>
    {/* flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#cdc9c1',
        borderBottomWidth: 2, borderBottomColor: '#2b2b2b',
        paddingVertical: 12, backgroundColor: '#ffffff' */}
    <View style={{ flex: 1 }} />
    <Text style={styles.groupSubtotalLabel}>Group Total:</Text>
    {/* fontSize: 9, fontWeight: 'bold', color: '#2b2b2b', textAlign: 'right', paddingRight: 8 */}
    <PdfCurrencyText value={safeText(row.groupSubtotalValue)} style={styles.groupSubtotalVal} />
  </View>
)}
```

**Engine** (`CommercialGroupFooterRow.tsx`):
```tsx
<View style={[styles.tableGroupFooter, ...]}>
  {/* marginBottom: 14, paddingTop: 6, paddingBottom: 8, paddingHorizontal: 12,
      borderBottomWidth: 1.8, borderBottomColor: '#333333',
      backgroundColor: '#f9fafb', flexDirection: 'row', justifyContent: 'flex-end' */}
  {row.showSubtotal ? (
    <View style={styles.groupSubtotalRow}>
      {/* flexDirection: 'row', alignItems: 'center', gap: 8 */}
      <PdfCurrencyText value={row.groupSubtotalValue} style={[styles.groupSubtotalValue, ...]} />
      {/* fontSize: 10, color: '#1f2937', fontFamily: 'Helvetica-Bold' */}
    </View>
  ) : null}
</View>
```

**Incompatibility:** Ledger renders "Group Total:" label with a spacer. Engine renders value only, no label. Ledger's container has top+bottom borders, engine has bottom-border only. Ledger uses white background, engine uses `#f9fafb`. Completely different layout.

### 6.4 Column Alignment

**Ledger** (line 30):
```tsx
const alignStyle = col.align === 'right' ? styles.textRight
  : col.align === 'center' ? styles.textCenter
  : styles.textLeft;  // Explicit default
```

**Engine** (`resolveTextAlignmentStyle.ts`):
```tsx
if (column.align === 'right') return TEXT_RIGHT
if (column.align === 'center') return TEXT_CENTER
return null  // No default — relies on container
```

**Partial compatibility:** Logic is similar, but Ledger explicitly sets `textLeft` as default while Engine returns `null`. This could cause subtle layout differences depending on container defaults.

### 6.5 Column Width Resolution

**Ledger** (line 31):
```tsx
const widthStyle = col.width
  ? { width: col.width, flexGrow: 0, flexShrink: 0 }
  : { flex: col.flex || 1, flexBasis: 0 };
```

**Engine** (`resolveColumnStyle.ts`):
```tsx
const INDUSTRY_COLUMN_OVERRIDES: Record<string, { width?: number; flex?: number }> = {
  num: { width: 20, flex: 0.45 },
  description: { flex: 3.7 },
  make: { flex: 1.1 },
  quantity: { width: 44, flex: 0.8 },
  // ... Industry-specific overrides
}
// Applies overrides when column definition doesn't specify width
```

**Partial compatibility:** Engine applies Industry-specific column overrides. If Ledger passes explicit column widths, overrides are ignored. But Ledger's column definitions may not include all fields, causing wrong widths.

### 6.6 Attachments / Optional List

**Ledger** (lines 318-333):
```tsx
{data.attachments && data.attachments.length > 0 && (
  <View style={styles.attachmentsBox}>
    <Text style={styles.sectionTitle}>Attachments</Text>
    {data.attachments.map((att, idx) => (
      <View key={idx} style={styles.attachmentItem}>  {/* marginBottom: 4 */}
        {att.url ? (
          <Link src={formatValidUrl(att.url)} style={styles.attachmentLink}>
            {/* fontSize: 9, color: '#0056b3', textDecoration: 'none' */}
            {safeText(att.label)}
          </Link>
        ) : (
          <Text style={styles.attachmentLink}>{safeText(att.label)}</Text>
        )}
      </View>
    ))}
  </View>
)}
```

**Engine** (`renderOptionalList.tsx`):
```tsx
export function renderOptionalList(items) {
  return items.map((item, idx) => {
    if (typeof item === 'string') return <Text key={...} style={styles.attachmentItem}>- {item}</Text>
    if (item?.url && item?.label) return <Link key={...} src={item.url} style={styles.attachmentLink}>{item.label}</Link>
    if (item?.label) return <Text key={...} style={styles.attachmentItem}>- {item.label}</Text>
    if (item?.url) return <Link key={...} src={item.url} style={styles.attachmentLink}>{item.url}</Link>
    return null
  })
}
```

**Incompatibility:** Ledger adds `formatValidUrl()` to prepend `https://` if missing. Engine passes URL raw. Ledger uses `safeText()` on labels. Engine doesn't. Ledger wraps items in `<View>`. Engine returns raw elements. Ledger's `attachmentLink` has `textDecoration: 'none'`, Engine's has `textDecoration: 'underline'`.

---

## 7. Verification Results

| Check | Result |
|---|---|
| `bun run audit:load` | ✅ Pass (pre-existing warnings only) |
| `bun run typecheck` | ✅ Pass (clean) |
| `bun run build` | ✅ Pass |
| Ledger.tsx modified | ❌ No (migration not performed) |

---

## 8. Visual Comparison Notes

Every engine component produces Industry's visual output, not Ledger's:

| Section | Industry (Engine) | Ledger |
|---|---|---|
| Party card | Styled card with background, border, rounded corners, title | Simple Bill To label in a 50% column |
| Group header | Top-border, `#f9fafb` bg, 10.5px font, margin-top: 14 | Bottom-border, `#f4f2ed` bg, 8px font, no margin |
| Group footer | Value only, no label, bottom-border, `#f9fafb` bg | "Group Total:" label + value, top+bottom border, white bg |
| Attachments | Raw elements, underline links, no URL formatting | Wrapped in View, no-underline links, URL formatting |
| Column widths | Industry overrides applied | Direct column.width/column.flex |

Using any engine component in Ledger would produce a visually distinct document that mixes Industry and Ledger aesthetics — an unacceptable regression.

---

## 9. Risks

| Risk | Severity |
|---|---|
| Engine components hardcoded to `industryStyles` | Critical — blocks all cross-template reuse |
| No style prop injection mechanism | Critical — no way for templates to override styling |
| `resolveColumnStyle` has Industry-specific overrides | Medium — would produce wrong widths for Ledger columns |
| `renderOptionalList` missing `formatValidUrl` and `safeText` | Low — functional difference, not just styling |

---

## 10. Remaining Work

### Minimum Engine Change Required

To make the engine reusable across templates, each component needs a `styles` prop (or individual style props) that allows the consuming template to inject its own stylesheet:

```tsx
// Example of what would be needed
type GroupHeaderProps = {
  row: CommercialDocumentData['table']['rows'][number]
  rowIdx: number
  containerStyle?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

export function CommercialGroupHeaderRow({ row, rowIdx, containerStyle, textStyle }: GroupHeaderProps) {
  return (
    <View key={`group-h-${rowIdx}`} style={[styles.tableGroupHeader, containerStyle]}>
      <Text style={[styles.groupTitleCell, textStyle]}>{row.groupName || row.groupLabel || ''}</Text>
    </View>
  )
}
```

### Alternative: Template-Specific Engine Components

Create `LedgerPartyCard`, `LedgerGroupHeaderRow`, etc. that reference `LedgerStyles` instead of `industryStyles`. This duplicates code but avoids modifying the existing engine.

---

## 11. Final Verdict

**Outcome B — Migration Not Possible.**

The engine is tightly coupled to Industry's visual identity through hardcoded style references. Using it in Ledger would change Ledger's appearance, violating the hard rule against visual changes.

A successful investigation is preferable to an unsafe migration. Ledger should remain as-is until the engine gains style injection capability.
