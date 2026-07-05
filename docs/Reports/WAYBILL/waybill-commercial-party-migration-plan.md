# Waybill Commercial Party Migration Plan

This report was written by MiMoCode on 2026-07-04 via Local Runner.

---

## Executive Summary

This migration plan outlines how to transform Waybill from a legacy Company/Client rendering pipeline into a consumer of the shared Commercial Party architecture used by Invoice and Quotation. The goal is to eliminate duplication while preserving all logistics-specific behavior.

**Current State**: Waybill maintains separate company/client rendering logic that duplicates functionality already centralized in the shared Commercial Party architecture.

**Target State**: Waybill becomes another consumer of the shared Commercial Party renderer, using the same normalization, formatting, and rendering logic as Invoice and Quotation.

**Migration Boundary**: Company and Client rendering responsibilities migrate to the shared architecture. Logistics-specific responsibilities (shipment information, sender/receiver, dispatch/delivery, transport logic) remain inside the Waybill engine.

---

## 1. Current Waybill Responsibility Map

### Company/Client Responsibilities (MIGRATION CANDIDATES)

| Responsibility | Current Implementation | Location |
|----------------|----------------------|----------|
| Company name rendering | Direct `model.branding.name` access | All waybill templates |
| Company address rendering | Direct `model.branding.address` (single string) | All waybill templates |
| Company phone rendering | Direct `model.branding.phone` | All waybill templates |
| Company email rendering | Direct `model.branding.email` | All waybill templates |
| Company tagline rendering | Direct `model.branding.tagline` | All waybill templates |
| Company logo rendering | Direct `model.branding.logo` | All waybill templates |
| Client name rendering | Direct `model.parties.clientName` | All waybill templates |
| Client address rendering | Direct `model.parties.clientAddress` (single string) | All waybill templates |
| Address formatting | None (raw strings) | No normalization |
| Phone/email formatting | None (raw strings) | No normalization |
| Company custom fields | Not supported | Missing from `CompanySettings` type |
| Client phone/email | Not supported | Missing from `PartiesBlock` type |
| Client city/state | Not supported | Missing from `PartiesBlock` type |

### Logistics Responsibilities (KEEP INSIDE WAYBILL)

| Responsibility | Current Implementation | Location |
|----------------|----------------------|----------|
| Waybill number generation | `waybill.waybill_number` | `resolvers/header.ts` |
| Document type (internal/external) | `waybill.type` | `resolvers/header.ts` |
| Date/time rendering | `waybill.date`, `waybill.time` | `resolvers/header.ts` |
| PO number rendering | `waybill.po_number` | `resolvers/header.ts` |
| Vehicle plate rendering | `waybill.vehicle_plate` | `resolvers/logistics.ts` |
| Driver name rendering | `waybill.driver_name` | `resolvers/logistics.ts` |
| Delivery mode rendering | `waybill.transport_mode` | `resolvers/logistics.ts` |
| Delivery location rendering | `waybill.delivery_location` | `resolvers/logistics.ts` |
| Purpose rendering | `waybill.purpose` | `resolvers/logistics.ts` |
| Sender name rendering | `waybill.sender_name` | `resolvers/parties.ts` |
| Receiver name rendering | `waybill.receiver_name` | `resolvers/parties.ts` |
| Sender signature | `waybill.custom_fields.signatures.sender` | `resolvers/signatures.ts` |
| Receiver signature | `waybill.custom_fields.signatures.receiver` | `resolvers/signatures.ts` |
| Item table rendering | `waybill.items` | `resolvers/table.ts` |
| Notes rendering | `waybill.notes` | `resolvers/notes.ts` |
| Logistics-specific layout | Template-specific | All waybill templates |

---

## 2. Shared Commercial Party Responsibility Map

### Company Responsibilities (ALREADY CENTRALIZED)

| Responsibility | Implementation | Location |
|----------------|---------------|----------|
| Company name normalization | Direct field mapping | `industryAdapter.ts` |
| Company address splitting | `splitAddressLines()` | `industryAdapter.ts` |
| Company city/state formatting | `splitAddressLines()` | `industryAdapter.ts` |
| Company phone rendering | Direct field mapping | `industryAdapter.ts` |
| Company email rendering | Direct field mapping | `industryAdapter.ts` |
| Company website rendering | Direct field mapping | `industryAdapter.ts` |
| Company custom fields | `normalizeCompanyCustomInfo()` | `normalize.ts` |
| Company tagline rendering | Direct field mapping | `industryAdapter.ts` |
| Company logo rendering | `resolveCanonicalLogoUrl()` | `industryAdapter.ts` |

### Client Responsibilities (ALREADY CENTRALIZED)

| Responsibility | Implementation | Location |
|----------------|---------------|----------|
| Client name normalization | Direct field mapping | `industryAdapter.ts` |
| Client address splitting | `splitAddressLines()` | `industryAdapter.ts` |
| Client city/state formatting | `splitAddressLines()` | `industryAdapter.ts` |
| Client phone rendering | Direct field mapping | `industryAdapter.ts` |
| Client email rendering | Direct field mapping | `industryAdapter.ts` |

### Rendering Responsibilities (ALREADY CENTRALIZED)

| Responsibility | Implementation | Location |
|----------------|---------------|----------|
| Party line building | `buildPartyLines()` | `engine/party.ts` |
| Party card rendering | `PartyCard.tsx` | `presentation/industry/PartyCard.tsx` |
| Duplication prevention | `buildPartyLines()` logic | `engine/party.ts` |
| Spacing rules | `PartyCard.tsx` styles | `presentation/industry/industryStyles.ts` |
| Address formatting | `buildPartyLines()` | `engine/party.ts` |
| Phone/email formatting | `buildPartyLines()` | `engine/party.ts` |
| Website formatting | `buildPartyLines()` | `engine/party.ts` |
| Custom field formatting | `buildPartyLines()` | `engine/party.ts` |

---

## 3. Side-by-Side Comparison

### Company Data Flow

| Aspect | Invoice/Quotation | Waybill (Current) | Waybill (Target) |
|--------|-------------------|-------------------|------------------|
| **Data Source** | `settings.company_*` | `CompanySettings` | `settings.company_*` via shared adapter |
| **Normalization** | `splitAddressLines()`, `normalizeCompanyCustomInfo()` | None | Same as Invoice/Quotation |
| **Address Format** | Split into address + cityState | Single string | Split into address + cityState |
| **Custom Fields** | Supported via `customInfo` array | Not supported | Supported via `customInfo` array |
| **Website** | Supported | Not supported | Supported |
| **Rendering** | `PartyCard.tsx` via `buildPartyLines()` | Direct template rendering | `PartyCard.tsx` via `buildPartyLines()` |

### Client Data Flow

| Aspect | Invoice/Quotation | Waybill (Current) | Waybill (Target) |
|--------|-------------------|-------------------|------------------|
| **Data Source** | `client.*` | `waybill.client_*` | `client.*` via shared adapter |
| **Normalization** | `splitAddressLines()` | None | Same as Invoice/Quotation |
| **Address Format** | Split into address + cityState | Single string | Split into address + cityState |
| **Phone/Email** | Supported | Not supported | Supported |
| **Rendering** | `PartyCard.tsx` via `buildPartyLines()` | Direct template rendering | `PartyCard.tsx` via `buildPartyLines()` |

### Template Integration

| Aspect | Invoice/Quotation | Waybill (Current) | Waybill (Target) |
|--------|-------------------|-------------------|------------------|
| **Template Type** | `Industry.tsx` (or variants) | `EvergreenTemplate.tsx`, etc. | Keep existing templates |
| **Party Component** | `PartyCard.tsx` | Direct `<Text>` elements | `PartyCard.tsx` |
| **Layout** | Shared party card layout | Custom per template | Keep custom logistics layout |
| **Integration Point** | `CommercialDocumentData.company/client` | `WaybillRenderModel.branding/parties` | New `company/client` fields in `WaybillRenderModel` |

---

## 4. Migration Plan

### Phase 1: Extend Waybill Type System

**Objective**: Add missing fields to Waybill types to support shared Commercial Party architecture.

**Changes**:
1. Extend `CompanySettings` interface in `src/domain/waybill/engine/types.ts`:
   - Add `website: string | null`
   - Add `customInfo: Array<{label: string; value: string}> | null`
   - Add `city: string | null`
   - Add `state: string | null`

2. Extend `PartiesBlock` interface in `src/domain/waybill/engine/types.ts`:
   - Add `clientPhone: string | null`
   - Add `clientEmail: string | null`
   - Add `clientCityState: string | null`

3. Extend `BrandingBlock` interface in `src/domain/waybill/engine/types.ts`:
   - Add `website: string | null`
   - Add `customInfo: Array<{label: string; value: string}> | null`

### Phase 2: Update Waybill Data Assembly

**Objective**: Modify `buildWaybillRenderModel()` to populate the new fields using shared normalization logic.

**Changes**:
1. Update `src/domain/waybill/engine/assembly.ts`:
   - Import `splitAddressLines()` from shared adapter
   - Import `normalizeCompanyCustomInfo()` from shared normalizer
   - Apply address splitting to company address
   - Apply address splitting to client address
   - Populate new fields in `BrandingBlock` and `PartiesBlock`

2. Update `src/domain/waybill/engine/resolvers/branding.ts`:
   - Add website and customInfo to resolver output

3. Update `src/domain/waybill/engine/resolvers/parties.ts`:
   - Add client phone, email, cityState to resolver output

### Phase 3: Update Waybill Templates to Use Shared Renderer

**Objective**: Replace direct company/client rendering with `PartyCard.tsx` component.

**Changes**:
1. Update each waybill template (EvergreenTemplate, MinimalTemplate, etc.):
   - Import `PartyCard` component
   - Replace direct company rendering with `PartyCard` component
   - Replace direct client rendering with `PartyCard` component
   - Preserve all logistics-specific sections unchanged

2. Ensure `PartyCard` integration respects waybill layout constraints:
   - Maintain single-page A4 requirement
   - Preserve logistics grid layout
   - Keep signature zones intact

### Phase 4: Update Data Sources

**Objective**: Ensure waybill PDF generation passes complete company/client data.

**Changes**:
1. Update `src/pages/ViewWaybill.tsx`:
   - Extend `companySettings` object to include website, customInfo, city, state
   - Pass client phone, email, city, state from client data

2. Update any other waybill creation/editing pages that call `buildWaybillRenderModel()`

### Phase 5: Verification and Testing

**Objective**: Ensure migration preserves all functionality.

**Changes**:
1. Run `bun run typecheck` to verify type compatibility
2. Manual testing of all waybill templates
3. Verify company/client rendering matches Invoice/Quotation
4. Verify logistics sections remain unchanged
5. Verify single-page A4 constraint holds
6. Verify signature zones remain functional

---

## 5. Ordered Implementation Sequence

### Step 1: Type System Extension (Low Risk)
- Extend `CompanySettings`, `PartiesBlock`, `BrandingBlock` types
- No functional changes, only type additions
- Verification: `bun run typecheck`

### Step 2: Data Assembly Update (Medium Risk)
- Update `buildWaybillRenderModel()` to populate new fields
- Apply shared normalization logic
- Verification: Unit tests for `buildWaybillRenderModel()`

### Step 3: Template Migration (Medium Risk)
- Update templates to use `PartyCard` component
- Preserve logistics layout
- Verification: Manual PDF generation testing

### Step 4: Data Source Updates (Low Risk)
- Update `ViewWaybill.tsx` and other pages
- Pass complete company/client data
- Verification: End-to-end PDF testing

### Step 5: Integration Testing (High Priority)
- Test all waybill templates
- Compare with Invoice/Quotation rendering
- Verify no logistics behavior changes

---

## 6. Risk Assessment

### High Risk Areas

1. **Template Layout Disruption**: Introducing `PartyCard` may disrupt carefully crafted waybill layouts.
   - **Mitigation**: Use `PartyCard` in a contained section, preserve logistics grid.

2. **Single-Page Constraint**: Adding more company/client fields may cause content overflow.
   - **Mitigation**: Test with maximum content scenarios, adjust styling.

3. **Signature Zone Overflow**: Changes may affect signature zone positioning.
   - **Mitigation**: Keep signature zone untouched, verify flex allocation.

### Medium Risk Areas

1. **Data Source Changes**: Modifying `ViewWaybill.tsx` may introduce regressions.
   - **Mitigation**: Incremental changes, thorough testing.

2. **Type Compatibility**: Extending types may break existing consumers.
   - **Mitigation**: Add optional fields with defaults.

### Low Risk Areas

1. **Shared Architecture Adoption**: Using proven `PartyCard` component.
2. **Normalization Logic**: Reusing battle-tested `splitAddressLines()`.

### Risk Summary

| Risk Level | Area | Mitigation |
|------------|------|------------|
| **High** | Template layout disruption | Contained `PartyCard` integration |
| **High** | Single-page constraint | Content overflow testing |
| **Medium** | Data source changes | Incremental updates |
| **Medium** | Type compatibility | Optional fields with defaults |
| **Low** | Shared architecture adoption | Proven component |

---

## 7. Files That Will Be Modified

### Core Waybill Engine Files
1. `src/domain/waybill/engine/types.ts` - Extend type definitions
2. `src/domain/waybill/engine/assembly.ts` - Update data assembly
3. `src/domain/waybill/engine/resolvers/branding.ts` - Add missing fields
4. `src/domain/waybill/engine/resolvers/parties.ts` - Add missing fields

### Waybill Template Files
5. `src/components/waybill/EvergreenTemplate.tsx` - Integrate `PartyCard`
6. `src/components/waybill/MinimalTemplate.tsx` - Integrate `PartyCard`
7. `src/components/waybill/ThermalTemplate.tsx` - Integrate `PartyCard`
8. `src/components/waybill/ClassicTemplate.tsx` - Integrate `PartyCard`
9. `src/components/waybill/PremiumTemplate.tsx` - Integrate `PartyCard`
10. `src/components/waybill/SlateTemplate.tsx` - Integrate `PartyCard`

### Waybill Page Files
11. `src/pages/ViewWaybill.tsx` - Update data source
12. `src/pages/NewWaybill.tsx` - Update data source (if applicable)

### Shared Architecture Files (Read-Only)
- `src/components/pdf-new/presentation/industry/PartyCard.tsx` - Existing component
- `src/components/pdf-new/engine/party.ts` - Existing engine
- `src/components/pdf-new/industryAdapter.ts` - Existing adapter (reference only)

---

## 8. Files That Should Remain Untouched

### Logistics-Specific Files
1. `src/domain/waybill/engine/resolvers/header.ts` - Waybill number, date, time
2. `src/domain/waybill/engine/resolvers/logistics.ts` - Vehicle, driver, delivery
3. `src/domain/waybill/engine/resolvers/signatures.ts` - Sender/receiver signatures
4. `src/domain/waybill/engine/resolvers/table.ts` - Item table
5. `src/domain/waybill/engine/resolvers/notes.ts` - Notes
6. `src/domain/waybill/engine/normalizeBlank.ts` - Blank normalization

### Shared Architecture Files (No Changes Needed)
7. `src/components/pdf-new/presentation/industry/PartyCard.tsx` - Existing component
8. `src/components/pdf-new/engine/party.ts` - Existing engine
9. `src/components/pdf-new/industryAdapter.ts` - Existing adapter
10. `src/domain/invoice/projections/partyProjection.ts` - Existing projections

### Invoice/Quotation Files (No Changes Needed)
11. All files in `src/components/pdf-new/templates/` - Existing templates
12. All files in `src/domain/invoice/` - Existing invoice logic
13. All files in `src/domain/quotation/` - Existing quotation logic

---

## 9. Explicit Confirmation: No Logistics Behavior Will Be Altered

### Logistics Responsibilities Preserved

1. **Waybill Number Generation**: `waybill.waybill_number` remains unchanged
2. **Document Type**: `waybill.type` (internal/external) remains unchanged
3. **Date/Time**: `waybill.date`, `waybill.time` remain unchanged
4. **PO Number**: `waybill.po_number` remains unchanged
5. **Vehicle Plate**: `waybill.vehicle_plate` remains unchanged
6. **Driver Name**: `waybill.driver_name` remains unchanged
7. **Delivery Mode**: `waybill.transport_mode` remains unchanged
8. **Delivery Location**: `waybill.delivery_location` remains unchanged
9. **Purpose**: `waybill.purpose` remains unchanged
10. **Sender Name**: `waybill.sender_name` remains unchanged
11. **Receiver Name**: `waybill.receiver_name` remains unchanged
12. **Sender Signature**: `waybill.custom_fields.signatures.sender` remains unchanged
13. **Receiver Signature**: `waybill.custom_fields.signatures.receiver` remains unchanged
14. **Item Table**: `waybill.items` remains unchanged
15. **Notes**: `waybill.notes` remains unchanged

### Logistics Layout Preserved

1. **Single-Page A4 Constraint**: Maintained
2. **Logistics Grid Layout**: Preserved
3. **Signature Zones**: Untouched
4. **Header Structure**: Waybill number, date, time layout unchanged
5. **Footer Structure**: Company name, waybill number layout unchanged

### Logistics Logic Unchanged

1. **Data Assembly**: `buildWaybillRenderModel()` retains all logistics resolvers
2. **Template Selection**: Evergreen/Minimal/Thermal/Classic/Premium/Slate unchanged
3. **PDF Generation**: WaybillPDF.tsx routing unchanged
4. **Download Logic**: PDF export mechanism unchanged

### Verification Method

To confirm no logistics behavior changes:
1. Generate waybills before and after migration
2. Compare logistics sections side-by-side
3. Verify all logistics fields render identically
4. Test signature capture and rendering
5. Verify item table formatting unchanged

---

## Migration Boundary Summary

### Inside Waybill Engine (KEEP)
- Waybill number generation
- Document type handling
- Date/time formatting
- Vehicle/driver information
- Delivery mode/purpose
- Sender/receiver names
- Signature handling
- Item table rendering
- Notes rendering
- Logistics-specific layout

### Inside Shared Commercial Party Architecture (ADOPT)
- Company name normalization
- Company address splitting
- Company city/state formatting
- Company phone/email rendering
- Company website rendering
- Company custom fields
- Client name normalization
- Client address splitting
- Client city/state formatting
- Client phone/email rendering
- Party line building
- Party card rendering
- Duplication prevention
- Spacing rules

### Integration Point
- `WaybillRenderModel` extends to include `company` and `client` fields using shared `CommercialDocumentData` shape
- Waybill templates consume `PartyCard` component for company/client rendering
- Logistics sections remain independent of company/client rendering

---

## Next Steps

1. **Approve Migration Plan**: Review and approve this migration plan
2. **Begin Implementation**: Start with Step 1 (Type System Extension)
3. **Incremental Testing**: Test each step before proceeding
4. **Final Integration Testing**: Comprehensive testing after all steps complete
5. **Documentation Update**: Update any relevant documentation

---

## Conclusion

This migration plan provides a clear path for Waybill to adopt the shared Commercial Party architecture while preserving all logistics-specific behavior. The plan minimizes risk by:
- Extending existing types rather than replacing them
- Using proven shared components
- Preserving all logistics functionality
- Maintaining single-page A4 constraint
- Keeping signature zones intact

The migration will eliminate duplication, improve consistency across commercial documents, and align Waybill with the Company & Client Information Architecture Upgrade PRD.