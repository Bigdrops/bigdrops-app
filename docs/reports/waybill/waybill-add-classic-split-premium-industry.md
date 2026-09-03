# Waybill Template Additions — Classic, Split, Premium, Industry

## Summary

Added 4 new waybill PDF templates (Classic, Split, Premium, Industry) and wired all 7 templates into routing and the template picker. ClassicTemplate and SplitTemplate already existed and were patched for engine contract compliance; PremiumTemplate and IndustryTemplate were built from scratch guided by HTML mockups.

## Templates

| Template | Origin | Changes | Status |
|---|---|---|---|
| **ClassicTemplate** | Pre-existing | Patched 1 violation (Rule 8 — notes section always renders now) | ✅ |
| **SplitTemplate** | Pre-existing | Patched 1 violation (Rule 2 — added "WAYBILL / DELIVERY NOTE" title) | ✅ |
| **PremiumTemplate** | New (from Premium.html) | Built full template — warm brown/leather finish, dark title band, 8-card meta grid, method/purpose tick rows, notes+checklist, signature sidebar | ✅ |
| **IndustryTemplate** | New (from Industry.html) | Built full template — dark sage green header, two-column client/meta grid, bold signature block | ✅ |

## Contract Audit Results

All 10 engine contract rules verified against every template. Details in the task conversation history.

- ClassicTemplate: 1 violation found and **fixed** (Rule 8: conditional notes box → always rendered)
- SplitTemplate: 1 violation found and **fixed** (Rule 2: missing title → added)
- PremiumTemplate: 0 violations (built to spec)
- IndustryTemplate: 0 violations (built to spec)

## Files Changed

| File | Action |
|---|---|
| `src/components/waybill/ClassicTemplate.tsx` | Patched — notes section always renders; removed invalid `verticalAlign` prop |
| `src/components/waybill/SplitTemplate.tsx` | Patched — added title and titleBlock/titleText styles |
| `src/components/waybill/PremiumTemplate.tsx` | **New** — created from Premium.html reference |
| `src/components/waybill/IndustryTemplate.tsx` | **New** — created from Industry.html reference |
| `src/components/waybill/WaybillPDF.tsx` | Updated — imports + routes 4 new templates |
| `src/pages/ViewWaybill.tsx` | Updated — template picker includes all 7 options |
| `src/components/waybill/waybillUtils.ts` | Updated — `WaybillPdfTemplateId` union and `normalizeWaybillPdfTemplateId` extended |

## Verification

- `bun run typecheck` — **passed** (0 errors)
- `bun run lint` — **no new errors** (6 pre-existing warnings in ViewWaybill.tsx unchanged)
