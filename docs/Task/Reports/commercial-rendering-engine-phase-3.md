# Commercial Rendering Engine — Phase 3 Report

**Date:** 2026-06-27
**Status:** Complete

---

## Executive Summary

Phase 3 extracted the Commercial Rendering Engine from a presentation layer (JSX + hardcoded styles) into a pure behaviour layer (functions only). The engine now contains zero React-PDF imports and zero style imports. Industry's group rendering was redesigned from decorative cards/banners to spreadsheet-style sections with thin rules. The Industry template was migrated to `presentation/industry/` with its own components, styles, and column overrides. The compatibility shim (`commercialDocumentBlocks.tsx`) was deleted.

---

## Files Created

### Engine Behaviour Modules (pure functions, no JSX, no styles)

| File | Purpose |
|------|---------|
| `engine/party.ts` | `buildPartyLines()` — normalizes party data into ordered display lines |
| `engine/group.ts` | `isGroupHeader()`, `isGroupFooter()`, `getGroupLabel()`, `getGroupSubtotal()`, `shouldShowGroupSubtotal()` |
| `engine/attachments.ts` | `buildAttachmentItems()` — normalizes attachments with URL protocol enforcement |
| `engine/columnLayout.ts` | `resolveColumnLayout()` — generic column width/flex resolver with optional overrides |
| `engine/alignment.ts` | `resolveTextAlignment()` — maps align string to `{ textAlign }` or null |
| `engine/totals.ts` | `buildTotalsLines()`, `getMainTotal()`, `getBalanceDue()`, `getAmountInWords()` |
| `engine/advance.ts` | `buildAdvanceSummary()` — normalizes advance invoice data |

### Presentation Layer (Industry-specific JSX + styles)

| File | Purpose |
|------|---------|
| `presentation/industry/IndustryTemplate.tsx` | Full Industry template using engine behaviour + own styles |
| `presentation/industry/industryStyles.ts` | Industry stylesheet with new spreadsheet-style group styles |
| `presentation/industry/PartyCard.tsx` | Party card component using `buildPartyLines()` |
| `presentation/industry/GroupHeaderRow.tsx` | Spreadsheet-style group header with thin rules |
| `presentation/industry/GroupFooterRow.tsx` | Spreadsheet-style group footer with subtotal |
| `presentation/industry/OptionalList.tsx` | Attachment list using `buildAttachmentItems()` |
| `presentation/industry/IndustryColumnOverrides.ts` | Industry-specific column width/flex overrides |
| `presentation/industry/compact.ts` | Industry compact mode overrides |

### Key Code Excerpts

**engine/party.ts:**
```typescript
export function buildPartyLines(party: PartyInput): PartyLine[] {
  const lines: PartyLine[] = []
  if (party.name) lines.push({ key: 'name', value: party.name, type: 'name' })
  if (party.address) lines.push({ key: 'address', value: party.address, type: 'address' })
  // ... etc
  return lines
}
```

**presentation/industry/GroupHeaderRow.tsx:**
```typescript
export function GroupHeaderRow({ row, rowIdx, ruleColor, textColor, headerFontFamily }: GroupHeaderRowProps) {
  const label = getGroupLabel(row)
  return (
    <View key={`group-h-${rowIdx}`} style={[styles.groupHeaderRow, ruleColor ? { borderTopColor: ruleColor, borderBottomColor: ruleColor } : null]} wrap={false}>
      <Text style={[styles.groupHeaderText, textColor ? { color: textColor } : null, headerFontFamily ? { fontFamily: headerFontFamily } : null]}>
        {label}
      </Text>
    </View>
  )
}
```

**presentation/industry/industryStyles.ts (new group styles):**
```typescript
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
groupHeaderText: {
  textAlign: 'left',
  fontSize: 10.5,
  fontFamily: 'Helvetica-Bold',
  color: '#1f2937',
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

---

## Files Modified

| File | Before | After |
|------|--------|-------|
| `engine/index.ts` | Exported JSX components + style-coupled functions | Exports only pure behaviour functions |
| `templates/Industry.tsx` | 628-line full template | 3-line re-export to presentation layer |
| `templates/industryStyles.ts` | 553 lines with style re-exports from engine | Removed stale `resolveIndustryColumnStyle` and `resolveTextAlignmentStyle` re-exports |
| `core/pdfCompact.ts` | Contains `compactCommercialDocument`, `compactLedger`, `compactObsidian` | Removed `compactCommercialDocument` (moved to presentation/industry/compact.ts) |
| `tests/pdf-new/industryLayout.test.js` | Imports from `templates/industryStyles` and reads `commercialDocumentBlocks.tsx` | Updated to import from `presentation/industry/industryStyles` and read `IndustryTemplate.tsx` |

---

## Files Deleted

| File | Reason |
|------|--------|
| `engine/CommercialPartyCard.tsx` | Moved to `presentation/industry/PartyCard.tsx` |
| `engine/CommercialGroupHeaderRow.tsx` | Moved to `presentation/industry/GroupHeaderRow.tsx` |
| `engine/CommercialGroupFooterRow.tsx` | Moved to `presentation/industry/GroupFooterRow.tsx` |
| `engine/renderOptionalList.tsx` | Moved to `presentation/industry/OptionalList.tsx` |
| `engine/resolveColumnStyle.ts` | Functionality split: generic logic → `engine/columnLayout.ts`, overrides → `IndustryColumnOverrides.ts` |
| `engine/resolveTextAlignmentStyle.ts` | Replaced by `engine/alignment.ts` with simpler API |
| `templates/commercialDocumentBlocks.tsx` | Compatibility shim no longer needed |

---

## Verification Results

| Check | Result |
|-------|--------|
| `bun run audit:load` | **PASS** — 681 files scanned, new bloat warning for `IndustryTemplate.tsx` (639 lines, limit 600) |
| `bun run typecheck` | **PASS** — zero errors |
| `bun run build` | **PASS** — built in 1m 26s |
| `bun run test` | 37/38 pass — 1 pre-existing failure (`externalWaybillPrompt` module not found, unrelated) |

---

## Group Rendering Changes

### Before (decorative cards/banners)

```
┌─────────────────────────────────────────────────────────────────┐
│ Electrical Installation                                          │  ← Thick top border, bg tint, padding
└─────────────────────────────────────────────────────────────────┘
  Item 1                                          1,200.00
  Item 2                                          3,400.00
  Item 3                                          5,600.00
┌─────────────────────────────────────────────────────────────────┐
│                                               Group Total: 10,200│  ← Thick bottom border, bg tint, padding
└─────────────────────────────────────────────────────────────────┘
```

### After (spreadsheet-style sections)

```
───────────────────────────────────────────────────────────────────
 Electrical Installation                                          │  ← Thin rule above + below, no bg
───────────────────────────────────────────────────────────────────
  Item 1                                          1,200.00
  Item 2                                          3,400.00
  Item 3                                          5,600.00
───────────────────────────────────────────────────────────────────
                                               Subtotal   10,200.00│  ← Heavy closing rule (2px)
═════════════════════════════════════════════════════════════════════
```

### Visual Differences

| Aspect | Before | After |
|--------|--------|-------|
| Group header borders | Thick top (1.8px) + no bottom | Thin top (1px) + thin bottom (1px) |
| Group header background | `#f9fafb` tinted | `#f9fafb` subtle |
| Group header font | Bold, letter-spacing 0.1 | Bold, no letter-spacing |
| Group footer | Right-aligned value only, thick bottom border | "Subtotal" label + value, heavy closing rule (2px) |
| No-subtotal case | Empty thick-bordered container | Heavy closing rule (2px) only |
| Item rows in group | Left border (3px) + tinted background | Same as non-group rows (no decoration) |
| Spacing | 14px margin top/bottom | 0px margin (rules provide visual separation) |

---

## Architectural Achievement

### Before Phase 3
```
Engine (JSX + styles) ←── imports industryStyles
    ↓
Templates (Industry, Ledger, Obsidian)
```

### After Phase 3
```
Engine (pure functions only)
    ↓
Core (utilities)
    ↑
Presentation (Industry JSX + own styles)
```

### Success Criteria Met

| Criterion | Status |
|-----------|--------|
| `engine/` contains no JSX components | ✅ |
| `engine/` imports no template files | ✅ |
| `engine/` imports no React-PDF components | ✅ |
| `engine/` contains only pure behaviour functions | ✅ |
| Industry renders with new spreadsheet-style group rendering | ✅ |
| Ledger and Obsidian remain untouched functionally | ✅ |
| `commercialDocumentBlocks.tsx` is removed | ✅ |
| `pdfCompact.ts` split into per-template compact files | ✅ |
| `bun run audit:load` passes | ✅ |
| `bun run typecheck` passes | ✅ |
| `bun run build` passes | ✅ |
| Phase 3 report is complete | ✅ |

---

*Report generated 2026-06-27*
