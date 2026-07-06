# Waybill Commercial Party Migration — Architectural Regression Analysis

This report was written by OpenCode on 2026-07-06 via Local Runner.

---

## Executive Summary

The Commercial Party migration (commit range `a0eff88..c68afcb`) successfully unified Waybill's data layer with the shared Invoice/Quotation party architecture, but it overshot the correct migration boundary by also replacing template-level rendering ownership. PartyCard — built for Invoice/Quotation layouts — was injected into all 6 waybill templates, overriding their purpose-built company/client rendering. This introduced:

1. **Layout regressions** in every template (PartyCard's `industryStyles.ts` sizing is incompatible with waybill's denser dimensions)
2. **Data redundancy** — `WaybillRenderModel` now carries 4 party data sources (`branding`, `parties`, `company`, `client`) where 2 would suffice for the templates
3. **Domain coupling** — waybill assembly now imports from `@/domain/invoice/normalize` and `@/domain/invoice/projections/partyProjection`

The type system and resolver extensions (shared type infrastructure) are correct and should be kept. The template-level PartyCard injection must be reverted to restore original visual layouts.

---

## 1. Original Architecture (commit `a0eff88`)

### Data Layer
```
Supabase (company_settings, waybills, clients)
    ↓
ViewWaybill.tsx (Supabase queries)
    ↓
WaybillRenderModel {
    branding: BrandingBlock      // name, address, phone, email, tagline, logo
    parties: PartiesBlock        // clientName, clientAddress, senderName, receiverName
    ... (waybill-specific fields)
}
```

### Rendering Layer
```
WaybillRenderModel
    ↓
Each Template (Evergreen, Classic, Minimal, Premium, Slate, Thermal)
    ↓
Direct model.branding.* / model.parties.* access
    ↓
Template-specific StyleSheet.create() styles
    ↓
@react-pdf/renderer
```

### Key Properties
- **Template autonomy**: Each template owns its company/client rendering — custom font sizes, padding, colors, layout
- **Flat model**: 2 party sources (`branding`, `parties`)
- **No cross-domain imports**: Waybill domain self-contained
- **Rendering is layout-specific**: brandName rendered at 12-13px bold in some templates, 7-8px address in others

---

## 2. Current Architecture (HEAD `c68afcb`)

### Data Layer
```
Supabase (company_settings, waybills, clients)
    ↓
ViewWaybill.tsx (Supabase queries — EXTENDED: website, customInfo, city, state, client phone/email/cityState)
    ↓
assembly.ts (NEW: consumes invoice-domain projections)
    ↓
WaybillRenderModel {
    branding: BrandingBlock       // ORIGINAL — still populated, still used by non-migrated sections
    parties: PartiesBlock         // ORIGINAL — still populated, still used by logistics sections
    company: CompanyPartyData     // NEW — built via buildCompanyPreviewLines()
    client: ClientPartyData       // NEW — built via buildClientPreviewLines()
    ... (waybill-specific fields)
}
```

### Rendering Layer
```
WaybillRenderModel
    ↓
Each Template (all 6)
    ↓
PartyCard component ← industryStyles.ts sizing
    ↓
@react-pdf/renderer
```

### Key Properties
- **Shared renderer**: PartyCard used everywhere (from `industry/PartyCard.tsx`)
- **Inflated model**: 4 party sources (`branding`, `parties`, `company`, `client`)
- **Cross-domain imports**: `@/domain/invoice/normalize`, `@/domain/invoice/projections/partyProjection`, `@/components/pdf-new/industryAdapter`
- **Rendering is uniform**: PartyCard imposes same sizing on all templates
- **Data redundancy**: `branding/parties` still populated AND `company/client` added — each template still uses `branding` for section headers, badge text, and other non-party elements

---

## 3. Regression Analysis

### 3.1 PartyCard Sizing Contract

PartyCard (`src/components/pdf-new/presentation/industry/PartyCard.tsx`) renders all party information in a fixed frame styled by `industryStyles.ts`:

```typescript
// industryStyles.ts — partyBox sizing
partyBox: {
    padding: 16,
    marginRight: 14,
    minHeight: 60,
}
partyName: {
    fontSize: 9,        // or 12.5 for separate branches
    // fontFamily: 'InterSemiBold' or 'InterBold'
    // color varies by accentColor prop
}
partyLine: {
    fontSize: 7,        // or 10 for separate branches
    // color: mutedColor prop
}
```

This sizing is designed for Invoice/Quotation layouts where party sections occupy their own generous column space. Waybill templates, by contrast, render company/client info in dense integrated header blocks alongside document number, dates, badges, and branding.

### 3.2 Template-by-Template Regression

#### EvergreenTemplate
| Element | Original (a0eff88) | Current (c68afcb) | Impact |
|---------|-------------------|-------------------|--------|
| Company name | 12px, `fillableBold` font family | PartyCard (9px partyName) | Name appears smaller, wrong font weight |
| Company address | 7px, muted color | PartyCard line (7px) | Same size, but wrapped differently |
| Client name | 10px, specific styling | PartyCard (9px partyName) | Smaller client name |
| Client address | 8px text | PartyCard line (7px) | Smaller, lost positioning context |
| Padding around brand | 5px | 8px (collateral) | Wastes vertical space |
| marginBottom brandBox | 8 | 10 (collateral) | More gap than intended |
| badge paddingVertical | 4 | 6 (collateral) | Badge taller than designed |

#### ClassicTemplate
| Element | Original | Current | Impact |
|---------|----------|---------|--------|
| Company name | 13px bold, #1e40af (blue) | PartyCard 9px, accentColor | Dramatically smaller, color may differ |
| Company address/detail | 8px | PartyCard 7px line | Smaller detail text |
| Client (metaGrid entry) | 10px bold text in flex row | PartyCard in 25% metaCard | Overflow in narrow column |
| metaCard padding | 6px | 8px (collateral) | Reduced usable space |
| metaCard minHeight | 52px | 60px (collateral) | Taller than card header text |
| headerGrid marginBottom | 8px | 10px (collateral) | More gap |

#### MinimalTemplate
| Element | Original | Current | Impact |
|---------|----------|---------|--------|
| Company name | 12px bold | PartyCard 9px | Smaller name |
| Address/detail/contact/tagline | 8px each (structured layout) | PartyCard lines (7px) | Different sizing and line order |
| Client name | 10px | PartyCard 9px | Smaller |
| Client address | 8px | PartyCard 7px | Smaller |
| topBox padding | 4px | 6px (collateral) | Wastes space in header |
| topBox minHeight | 34px | 44px (collateral) | Excessive for sparse content |
| headerGrid marginBottom | 6px | 8px (collateral) | More gap |

#### PremiumTemplate
| Element | Original | Current | Impact |
|---------|----------|---------|--------|
| Company name | 13px bold (brandName) | PartyCard 9px | Dramatically smaller |
| Company address | 8px (brandDetail) | PartyCard 7px | Smaller |
| Company phone/email | 8px brandDetail, joined by · | PartyCard lines | Different formatting |
| Client (consignee) | 10px panelBig + 8px address | PartyCard 9px/7px | Smaller, lost panel context |
| brandBox minHeight | 56px | 68px (collateral) | Excessive |
| infoBox panel padding | 7px | 10px (collateral) | Wastes space |
| infoBox minHeight | 44px | 52px (collateral) | Excessive |

#### SlateTemplate
| Element | Original | Current | Impact |
|---------|----------|---------|--------|
| Company name | White (#dbe4e1) on dark header | PartyCard (accentColor #fff, mutedColor #dbe4e1) | Likely correct color, but sizing wrong |
| Company address/phone | Single line with · join, white | PartyCard lines | Different layout |
| Client name | 10px (blockMain) | PartyCard 9px | Smaller |
| Client address | 8px with marginTop | PartyCard 7px | Smaller, lost spacing |
| darkHeader paddingVertical | 12px | 16px (collateral) | Header taller, shifts everything down |

#### ThermalTemplate
| Element | Original | Current | Impact |
|---------|----------|---------|--------|
| Company header (name) | 11px bold (brandName) | PartyCard 9px | Smaller name |
| Company header (address|phone|email) | 7px, joined by \| | PartyCard lines | Different line structure |
| DISPATCH FROM section | addrName (10px) + address | PartyCard (duplicate company) | Same data rendered twice — header AND dispatch |
| DELIVER TO (client) | addrName (10px) + address (7px) | PartyCard 9px/7px | Smaller client name |
| brandBox paddingBottom | 6px | 8px (collateral) | More space |
| brandBox marginBottom | 6px | 8px (collateral) | More gap |
| dispatch/deliver block padding | 6px | 8px (collateral) | Less content space |

---

## 4. Root Cause

### 4.1 Overshot Migration Boundary

The migration had two logical layers:

1. **Type system + resolvers + data layer** (shared infrastructure) — correct to migrate
2. **Template rendering** (template-specific visual layouts) — should NOT have been migrated

The migration did both. Layer 1 was the right scope. Layer 2 was the regression.

### 4.2 Specific Decisions That Caused Regressions

**Decision A**: Replace `model.branding.name` + `model.branding.address` with `<PartyCard party={model.company} .../>` in all 6 templates.

**Why it regresses**: `model.branding.name` was rendered at template-specific font sizes (11-13px). PartyCard renders at 9px from `industryStyles.ts`. Waybill header space allocation was calibrated to the original sizes. The content shrinks AND the surrounding layout drifts.

**Decision B**: Replace `model.parties.clientName` + `model.parties.clientAddress` with `<PartyCard party={model.client} .../>` in all 6 templates.

**Why it regresses**: Same sizing mismatch. ClassicTemplate inserts PartyCard into a narrow 25% column metaCard — PartyCard's block layout overflows or compresses.

**Decision C**: Bump padding/margin/minHeight values simultaneously in the same commit.

**Why it regresses**: These changes are collateral — they compensate for PartyCard's different sizing but overshoot (or undershoot) the original proportions. Each template's spatial relationships shift.

### 4.3 Domain Coupling Leak

Before migration, waybill domain was self-contained:

```
src/domain/waybill/ → no imports from src/domain/invoice/ or src/components/pdf-new/
```

After migration:

```
src/domain/waybill/engine/assembly.ts imports:
    @/domain/invoice/normalize              → normalizeCompanyCustomInfo()
    @/domain/invoice/projections/partyProjection → buildCompanyPreviewLines(), buildClientPreviewLines()
    @/components/pdf-new/industryAdapter    → splitAddressLines()
```

And each template imports:

```
@/components/pdf-new/presentation/industry/PartyCard
```

This means changes to invoice normalization logic or PartyCard rendering now directly affect waybill output — a coupling that didn't exist before.

---

## 5. Data Redundancy Analysis

### 5.1 Dual Data Sources

`WaybillRenderModel` now has these party-related fields:

| Source | Fields | Still Used? |
|--------|--------|-------------|
| `branding` | name, address, phone, email, tagline, logo, website, customInfo | Yes — used for section headers, badges, fallbacks, non-migrated sections |
| `parties` | clientName, clientAddress, clientPhone, clientEmail, clientCityState, senderName, receiverName | Yes — used for logistics sections (sender/receiver), non-migrated sections |
| `company` | name, address, cityState, phone, email, website, customInfo, companyLogoUrl, tagline | Yes — consumed by PartyCard |
| `client` | name, address, cityState, phone, email | Yes — consumed by PartyCard |

Four sources where two would suffice:

```
branding → company (direct transform)
parties → client (direct transform)
```

The template only needs ONE source for company info and ONE for client info. Keeping both `branding` and `company` means:
- Double the data in the render model
- Risk of inconsistency (what if `branding.name` ≠ `company.name`?)
- Ambiguity for future template developers (which field should I use?)

### 5.2 Unnecessary PartyCard Props

Each PartyCard invocation passes surfaceColor, borderColor, accentColor, textColor, mutedColor — but the PartyCard uses `transparent` surface/border in every case. This means the PartyCard is transparent and its visual output differs from the original styled text blocks ONLY in font size, spacing, and line structure.

---

## 6. Correct Migration Boundary

The correct boundary was:

### Keep (Layer 1 — Shared Infrastructure)
- `CompanyPartyData` and `ClientPartyData` type definitions in `types.ts`
- Extended `BrandingBlock` with `website`, `customInfo`
- Extended `PartiesBlock` with `clientPhone`, `clientEmail`, `clientCityState`
- Resolver field mappings in `branding.ts` and `parties.ts`
- Extended Supabase queries in `ViewWaybill.tsx`
- Shared normalization pipeline in `assembly.ts` (BUT only for the data — not forced into templates)

### Reject (Layer 2 — Template Rendering)
- PartyCard import and usage in all 6 templates
- Collateral style drift (padding, margin, minHeight bumps)
- PartyCard fallback objects `{ name: '', address: '', cityState: '', ... }` in template JSX

### Alternative Rendering Approach
Instead of PartyCard, templates should have been given access to the enriched `branding`/`parties` fields (now with `website`, `customInfo`, `clientPhone`, `clientEmail`, `clientCityState`) and rendered them using their existing template-specific text elements and styles. Each template would decide:
- Whether to show website (maybe inline with address, maybe separate line)
- How to render custom info (some templates have space, some don't)
- How to show client contact info (same line as name, separate section, only if present)

This preserves visual layouts while making the new data available.

---

## 7. Proposed Integration Strategy (Corrected)

### Phase 1: Revert Template Rendering (Restore Visual Layouts)

For each of the 6 templates:

1. Remove `import { PartyCard } from '@/components/pdf-new/presentation/industry/PartyCard'`
2. Restore original company rendering:
   ```tsx
   // Before migration (must restore):
   <Text style={S.brandName}>{model.branding.name || 'Company'}</Text>
   {model.branding.address ? (
     <Text style={S.brandDetail}>{model.branding.address}</Text>
   ) : null}
   ```
3. Restore original client rendering:
   ```tsx
   <Text style={S.clientName}>{model.parties.clientName || ''}</Text>
   {model.parties.clientAddress ? (
     <Text style={S.clientAddress}>{model.parties.clientAddress}</Text>
   ) : null}
   ```
4. Revert style changes to original padding/margin/minHeight values
5. Optionally add new fields (`website`, `phone`, `email`, `cityState`) as template-specific additions — each template decides placement, formatting, and whether the field is shown

**Implementation pattern**: Do NOT restore the ORIGINAL exact code from `a0eff88` blindly. Instead, add new fields to the original rendering pattern. For example:

```tsx
{/* Company — restored original pattern + new fields */}
<Text style={S.brandName}>{model.branding.name || 'Company'}</Text>
{model.branding.address ? (
  <Text style={S.brandDetail}>{model.branding.address}</Text>
) : null}
{model.branding.website ? (
  <Text style={S.brandDetail}>{model.branding.website}</Text>
) : null}
{model.branding.customInfo?.map((info, i) => (
  <Text key={i} style={S.brandDetail}>{info.label}: {info.value}</Text>
))}
```

### Phase 2: Clean Up Data Model

1. Remove `company` and `client` fields from `WaybillRenderModel` (they duplicate `branding`/`parties`)
2. Remove `CompanyPartyData` and `ClientPartyData` types (no longer needed)
3. Remove invoice-domain imports from `assembly.ts` (revert to waybill-native assembly)
4. Remove `splitAddressLines` export from `industryAdapter.ts` (restore encapsulation)

### Phase 3: Optional Shared Rendering (Future)

If cross-document consistency is desired, design a waybill-specific shared renderer that respects waybill layout constraints:

- `WaybillPartyBlock` component with size-appropriate defaults (7-9px text, configurable layout)
- Templates opt in by calling `<WaybillPartyBlock party={model.branding} style={S.partySection} />`
- Render function uses template's style overrides, not `industryStyles.ts`
- Keep rendering ownership in the template layer

---

## 8. Implementation Order

| Order | Phase | Description | Files |
|-------|-------|-------------|-------|
| 1 | Revert | EvergreenTemplate company/client | `src/components/waybill/EvergreenTemplate.tsx` |
| 2 | Revert | MinimalTemplate company/client | `src/components/waybill/MinimalTemplate.tsx` |
| 3 | Revert | ClassicTemplate company/client | `src/components/waybill/ClassicTemplate.tsx` |
| 4 | Revert | PremiumTemplate company/client | `src/components/waybill/PremiumTemplate.tsx` |
| 5 | Revert | SlateTemplate company/client | `src/components/waybill/SlateTemplate.tsx` |
| 6 | Revert | ThermalTemplate company/client (3 PartyCard instances) | `src/components/waybill/ThermalTemplate.tsx` |
| 7 | Cleanup | Remove company/client fields from types | `src/domain/waybill/engine/types.ts` |
| 8 | Cleanup | Remove invoice-domain imports from assembly | `src/domain/waybill/engine/assembly.ts` |
| 9 | Cleanup | Remove PartyCard import from all templates | All 6 templates |
| 10 | Add | Add new fields (website, customInfo, clientPhone, etc.) to each template using original rendering pattern | All 6 templates |

Steps 1-6 can be parallelized. Steps 7-9 depend on 1-6. Step 10 is optional per-template enhancement.

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Templates still reference `branding`/`parties` for non-party content (badges, headers) — removing `company`/`client` is safe | Low | Low | Grep for `model.company` and `model.client` — only PartyCard consumes them |
| Collateral style drift (padding/margin) not reverted | Medium | Medium | Compare every style value in each template's `createStyles()` against `a0eff88` version |
| PartyCard also added data that `branding` didn't have (website, customInfo) — reverting loses this | High | Medium | Phase 2 explicitly adds new fields via template-specific rendering pattern |
| ThermalTemplate has 3 PartyCard instances — one for header brand, one for DISPATCH FROM, one for DELIVER TO. Reverting DISPATCH FROM means restoring duplicate company address block | Medium | Low | Original behavior: DISPATCH FROM used `model.branding.name` + `model.branding.address`. Restore that. Add website/contact as optional. |
| ClassicTemplate's Client is in a 25% metaGrid column — PartyCard overflow | High | Low | Reverting to text elements solves this instantly |
| Regression testing requires PDF visual comparison | High | Hard | Use snapshot exports or manual visual verification per template |

---

## 10. Files Expected to Change

| File | Change | Expected Diff Size |
|------|--------|-------------------|
| `src/components/waybill/EvergreenTemplate.tsx` | Revert PartyCard, restore original rendering + optionally add new fields | ~20 lines |
| `src/components/waybill/ClassicTemplate.tsx` | Revert PartyCard, restore original rendering + optionally add new fields | ~20 lines |
| `src/components/waybill/MinimalTemplate.tsx` | Revert PartyCard, restore original rendering + optionally add new fields | ~20 lines |
| `src/components/waybill/PremiumTemplate.tsx` | Revert PartyCard, restore original rendering + optionally add new fields | ~20 lines |
| `src/components/waybill/SlateTemplate.tsx` | Revert PartyCard, restore original rendering + optionally add new fields | ~20 lines |
| `src/components/waybill/ThermalTemplate.tsx` | Revert 3 PartyCard instances, restore original rendering + optionally add new fields | ~30 lines |
| `src/domain/waybill/engine/types.ts` | Remove `company`, `client`, `CompanyPartyData`, `ClientPartyData` | ~10 lines removed |
| `src/domain/waybill/engine/assembly.ts` | Remove invoice-domain imports, remove company/client construction | ~20 lines removed |

## 11. Files That Must Stay Untouched

| File | Reason |
|------|--------|
| `src/domain/waybill/engine/resolvers/branding.ts` | Extended correctly — adds website, customInfo to BrandingBlock |
| `src/domain/waybill/engine/resolvers/parties.ts` | Extended correctly — adds clientPhone, clientEmail, clientCityState to PartiesBlock |
| `src/pages/ViewWaybill.tsx` | Extended correctly — more data queried, branding/parties still fully populated |
| `src/components/pdf-new/industryAdapter.ts` | splitAddressLines export — harmless, other consumers may rely on it |
| `src/domain/invoice/normalize.ts` | normalizeCompanyCustomInfo — correct, waybill no longer needs to call it |
| `src/domain/invoice/projections/partyProjection.ts` | buildCompanyPreviewLines/buildClientPreviewLines — correct, waybill no longer needs to call them |

---

## 12. Verification Plan

After implementation:

1. **Type check**: `bun run typecheck` — must pass
2. **Audit**: `bun run audit:load` — must pass
3. **Visual inspection** (per template): Compare PDF output against `a0eff88` render for each of the 6 templates
4. **Style diff**: Each template's `createStyles()` function should match `a0eff88` values exactly (no collateral drift)
5. **Data verification**: Confirm new fields (website, customInfo, phone, email, cityState) render when present, don't break when absent

---

## 13. Conclusion

The Commercial Party migration correctly extended Waybill's type system, resolvers, and data layer. These changes should be kept. The regression was caused by taking the migration one step too far — replacing template-specific rendering with the shared PartyCard component.

The fix is a surgical revert of PartyCard from all 6 templates, restoration of original template-specific styling, and then selective addition of new fields (website, customInfo, clientPhone, etc.) using each template's native rendering pattern. This preserves the shared data infrastructure while restoring the visual layouts that the 6 waybill templates were designed to deliver.

The Divergence Audit report recommended exactly this approach in its "Minimal Fix Recommendation" (Option 1), but the implementation went with the "Alternative: Adopt Shared PartyCard Component" instead. The recommendation was correct; the alternative was the regression.
