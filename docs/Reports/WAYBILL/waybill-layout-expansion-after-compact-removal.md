# Waybill Layout Expansion After Compact Prop Removal

This report was written by OpenCode on 2026-07-05 via Local Runner.

---

## 1. Objective & Scope

**Covered:** Removal of the `compact` prop from PartyCard and all 6 waybill templates, followed by targeted layout expansion to accommodate richer Company/Client data from the Commercial Party migration.

**Intentionally excluded:** Invoice/Quotation templates (IndustryTemplate uses its own unrelated `compact`), WaybillForm's ClientPickerSheet `compact` prop, visual regression testing (deferred).

---

## 2. Root Cause

The Commercial Party migration added richer fields to the waybill render model (`company`/`client` on `WaybillRenderModel`). `PartyCard` (designed for Invoice/Quotation proportions) renders these fields at full default size. A prior commit (`51dcd6c`) introduced a `compact` prop on PartyCard to shrink it — the wrong approach, because it suppressed data the architecture intentionally surfaces.

---

## 3. Changes Made

### 3.1 PartyCard.tsx (reverted to clean state)

- **Removed** `compact?: boolean` from `PartyCardProps`
- **Removed** `compact = false` default parameter
- **Removed** `compactStyles.partyBox` conditional style on outer `<View>`
- **Removed** `compact ? compactStyles.partyTitle : styles.partyTitle` conditional on title `<Text>`
- **Removed** `compact ? compactStyles.partyName : styles.partyName` / `compact ? compactStyles.partyLine : styles.partyLine` conditional on line `<Text>`
- **Removed** entire `compactStyles` `StyleSheet.create()` block (25 lines)
- **Removed** `StyleSheet` import (no longer needed)

**Result:** PartyCard renders exclusively with `industryStyles` defaults (`partyBox`: padding 16/16/16, `partyTitle`: fontSize 14/mb 10, `partyName`: 12.5/mb 5, `partyLine`: 10/mb 2).

### 3.2 Template Layout Expansions

Each template received targeted spacing increases to accommodate PartyCard's default (larger) rendering:

| Template | Property | Before | After | Rationale |
|----------|----------|--------|-------|-----------|
| **Evergreen** | `header.marginBottom` | 8 | 10 | More space between header row and body |
| **Evergreen** | `header.paddingBottom` | 8 | 10 | More breathing room under header border |
| **Evergreen** | `waybillBadge.paddingVertical` | 4 | 6 | Badge taller to match expanded header |
| **Evergreen** | `block.padding` | 5 | 8 | PartyCard blocks need more internal padding |
| **Classic** | `header.marginBottom` | 8 | 10 | More space between header row and body |
| **Classic** | `block.padding` | 6 | 8 | PartyCard blocks need more internal padding |
| **Classic** | `block.minHeight` | 52 | 60 | Taller minimum to prevent overflow |
| **Premium** | `topbar.minHeight` | 56 | 68 | Taller top bar to match richer company info |
| **Premium** | `panel.padding` | 7 | 10 | More breathing room in info panels |
| **Premium** | `metaInner.minHeight` | 44 | 52 | Taller metadata boxes for richer client data |
| **Slate** | `darkHeader.paddingVertical` | 12 | 16 | More vertical padding in dark header for party info |
| **Minimal** | `headerGrid.marginBottom` | 6 | 8 | More space below header grid |
| **Minimal** | `topBox.padding` | 4 | 6 | More internal padding in party boxes |
| **Minimal** | `topBox.minHeight` | 34 | 44 | Taller minimum to fit expanded party data |
| **Thermal** | `brand.paddingBottom` | 6 | 8 | More space under brand section |
| **Thermal** | `brand.marginBottom` | 6 | 8 | More space after brand divider |
| **Thermal** | `addrBox.padding` | 6 | 8 | More internal padding in address boxes |

### 3.3 `compact` Prop Removed From All 6 Templates

Every `<PartyCard ... compact />` call in all 6 waybill templates had the `compact` prop removed:

- `EvergreenTemplate.tsx` — 2 calls (sender, receiver)
- `ClassicTemplate.tsx` — 2 calls (sender, receiver)
- `PremiumTemplate.tsx` — 2 calls (sender, receiver)
- `SlateTemplate.tsx` — 2 calls (sender, receiver)
- `MinimalTemplate.tsx` — 2 calls (sender, receiver)
- `ThermalTemplate.tsx` — 3 calls (sender, receiver, delivery)

---

## 4. Verification

- `bun run typecheck` — timed out on 4GB RAM machine (large project); partial `tsc` on individual files showed only pre-existing `--jsx` flag errors (not from our changes) and pre-existing `S.blockTitle.color` / `S.addrName.color` errors in ThermalTemplate (documented elsewhere).
- `git status` — clean, no unintended files modified.
- `git diff HEAD~1..HEAD --stat` — confirms only the 6 template files + PartyCard.tsx were changed (plus unrelated PaymentHistoryCard changes in same commit).

**No new TypeScript errors introduced by these changes.**

---

## 5. Risks & Limitations

- **Visual verification pending:** Layout expansion values were calculated from PartyCard's default style measurements and template layout inspection. Actual visual rendering has not been verified with test PDFs. Overflow/overlap may persist if PartyCard renders taller than the expanded containers.
- **Invoice/Quotation regression check not performed:** PartyCard is shared across all document types. Removing `compact` should not affect Invoice/Quotation (they never passed `compact`), but this was not explicitly verified.
- **Compact was also used in IndustryTemplate:** IndustryTemplate has its own `compact` prop that applies `compactCommercialDocument` styles — this is a separate system and was not touched.

---

## 6. Deferred Work

1. **Visual regression testing:** Render test PDFs for each of the 6 templates and compare against the regression screenshots in `docs/tickets/Waybill PDFs regression/` to confirm overflow/overlap is resolved.
2. **Invoice/Quotation sanity check:** Verify PartyCard renders correctly in IndustryTemplate without the compact prop (should be unaffected — verify).
3. **Further layout tuning:** If visual testing reveals remaining overflow, individual template padding/minHeight values may need additional increases.

---

## 7. Files Modified

| File | Change |
|------|--------|
| `src/components/pdf-new/presentation/industry/PartyCard.tsx` | Removed `compact` prop, `compactStyles`, reverted to clean default-only rendering |
| `src/components/waybill/EvergreenTemplate.tsx` | Removed `compact` from 2 PartyCard calls; expanded header, waybillBadge, block spacing |
| `src/components/waybill/ClassicTemplate.tsx` | Removed `compact` from 2 PartyCard calls; expanded header, block spacing |
| `src/components/waybill/PremiumTemplate.tsx` | Removed `compact` from 2 PartyCard calls; expanded topbar, panel, metaInner spacing |
| `src/components/waybill/SlateTemplate.tsx` | Removed `compact` from 2 PartyCard calls; expanded darkHeader padding |
| `src/components/waybill/MinimalTemplate.tsx` | Removed `compact` from 2 PartyCard calls; expanded headerGrid, topBox spacing |
| `src/components/waybill/ThermalTemplate.tsx` | Removed `compact` from 3 PartyCard calls; expanded brand, addrBox spacing |
