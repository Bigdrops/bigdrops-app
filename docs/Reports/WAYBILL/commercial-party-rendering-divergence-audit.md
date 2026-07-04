# Commercial Party Rendering Divergence Audit

This report was written by MiMoCode on 2026-07-04 via Local Runner.

---

## Executive Summary

This audit identifies the architectural divergence causing Waybill PDFs to display incomplete Company information compared to Invoice and Quotation documents. The root cause is that Waybill uses a completely separate rendering pipeline that bypasses the shared Commercial Party rendering layer used by Invoice and Quotation.

---

## 1. Invoice Rendering Flow

### Data Sources
- **Company Data**: `settings.company_*` fields (company_name, company_address, company_city, company_state, company_phone, company_email, company_website, company_vat, company_tagline, custom_info)
- **Client Data**: `client.*` fields (client_name, contact_person, address, city, state, phone, email)

### Normalization Logic
1. **Address Splitting**: `splitAddressLines()` in `industryAdapter.ts` (lines 135-141) splits address lines into `address` and `cityState` components
2. **Custom Info Normalization**: `normalizeCompanyCustomInfo()` in `normalize.ts` (lines 66-95) converts legacy `{title,content}` format to `{label,value}`
3. **Phone/Email Extraction**: Direct field mapping from settings/client objects

### Rendering Logic
1. **Preview Model**: `buildInvoicePreviewModel()` in `previewModel.ts` assembles company/client preview lines
2. **PDF Model**: `invoicePdfActions.ts` builds `PdfDocumentModel` with `issuer` and `recipient` parties
3. **Data Adaptation**: `adaptCommercialDocumentData()` in `industryAdapter.ts` transforms to `CommercialDocumentData`
4. **Party Rendering**: `PartyCard.tsx` component renders using `buildPartyLines()` engine

### Final PDF Output Layer
- **Template**: Industry.tsx (or other invoice templates)
- **Renderer**: PdfRenderer.tsx wraps template in @react-pdf/renderer Document
- **Party Display**: Full company details (name, address, cityState, phone, email, website, customInfo) and client details (name, address, cityState, phone, email)

---

## 2. Quotation Rendering Flow

### Data Sources
- **Company Data**: Same as Invoice (settings.company_* fields)
- **Client Data**: Same as Invoice (client.* fields)

### Normalization Logic
- Identical to Invoice (reuses invoice projections via `partyProjection.ts`)

### Rendering Logic
1. **Preview Model**: `buildQuotationPreviewModel()` in `quotation/previewModel.ts`
2. **PDF Model**: `pdfDownloadHandler.ts` builds `PdfDocumentModel` with `issuer` and `recipient`
3. **Data Adaptation**: Same `adaptCommercialDocumentData()` function
4. **Party Rendering**: Same `PartyCard.tsx` component

### Final PDF Output Layer
- **Template**: Industry.tsx (or other quotation templates)
- **Renderer**: PdfRenderer.tsx
- **Party Display**: Full company and client details (identical to Invoice)

---

## 3. Waybill Rendering Flow

### Data Sources
- **Company Data**: `company: CompanySettings` (name, tagline, logo, address, phone, email)
- **Client Data**: `waybill: RawWaybill` (client_name, client_address, sender_name, receiver_name)

### Normalization Logic
1. **Blank Normalization**: `normalizeBlank()` in `normalizeBlank.ts` converts null/undefined/empty to empty string
2. **No Address Splitting**: Address remains as single string
3. **No Custom Info Handling**: No `customInfo` field in `CompanySettings` type
4. **No Phone/Email for Client**: Not included in `PartiesBlock` type

### Rendering Logic
1. **Render Model**: `buildWaybillRenderModel()` in `assembly.ts` assembles `WaybillRenderModel`
2. **Direct Rendering**: Templates render company/client data directly without shared components
3. **No PartyCard Usage**: No `buildPartyLines()` engine usage

### Final PDF Output Layer
- **Template**: EvergreenTemplate.tsx, MinimalTemplate.tsx, etc.
- **Renderer**: Direct @react-pdf/renderer components
- **Party Display**: Limited company details (name, address as single string, phone, email) and minimal client data (name, address only)

---

## 4. Comparative Matrix

| Aspect | Invoice/Quotation | Waybill | Divergence |
|--------|-------------------|---------|------------|
| **Company Data Source** | `settings.company_*` | `CompanySettings` | Different types |
| **Client Data Source** | `client.*` | `waybill.client_*` | Different fields |
| **Normalization Usage** | `splitAddressLines()`, `normalizeCompanyCustomInfo()` | Only `normalizeBlank()` | Missing normalization |
| **Shared Renderer Usage** | `PartyCard.tsx` + `buildPartyLines()` | Direct template rendering | No shared renderer |
| **Address Formatting** | Split into address + cityState | Single address string | Missing splitting |
| **Phone/Email Rendering** | Company + Client phone/email | Company only | Missing client phone/email |
| **Custom Field Handling** | Dynamic `customInfo` array | Not supported | Missing custom fields |
| **Website Rendering** | Included in company data | Not included | Missing website |
| **Legacy Bypass** | None | Entire pipeline is separate | Complete bypass |

---

## 5. Divergence Point Identification

### Exact File/Function Where Waybill Diverges

**Primary Divergence Point**: `src/domain/waybill/engine/types.ts` - `CompanySettings` interface (lines 143-150)

```typescript
export interface CompanySettings {
  name: string
  tagline: string | null
  logo: string | null
  address: string | null  // ← Single string, not split
  phone: string | null
  email: string | null
  // ← Missing: website, customInfo
}
```

**Secondary Divergence Point**: `src/domain/waybill/engine/resolvers/branding.ts` - `resolveBranding()` function (lines 4-12)

```typescript
export function resolveBranding(company: CompanySettings): BrandingBlock {
  return {
    name: company.name || "",
    tagline: normalizeBlank(company.tagline),
    logo: normalizeBlank(company.logo),
    address: normalizeBlank(company.address),  // ← No address splitting
    phone: normalizeBlank(company.phone),
    email: normalizeBlank(company.email),
    // ← Missing: website, customInfo
  }
}
```

**Tertiary Divergence Point**: `src/domain/waybill/engine/resolvers/parties.ts` - `resolveParties()` function (lines 4-10)

```typescript
export function resolveParties(waybill: RawWaybill): PartiesBlock {
  return {
    clientName: normalizeBlank(waybill.client_name),
    clientAddress: normalizeBlank(waybill.client_address),  // ← No address splitting
    senderName: normalizeBlank(waybill.sender_name),
    receiverName: normalizeBlank(waybill.receiver_name),
    // ← Missing: client phone, client email, client cityState
  }
}
```

### Whether Invoice/Quotation Share a Pipeline Waybill Does Not

**YES**. Invoice and Quotation share:
1. **Shared Data Adapter**: `adaptCommercialDocumentData()` in `industryAdapter.ts`
2. **Shared Party Renderer**: `PartyCard.tsx` component
3. **Shared Party Engine**: `buildPartyLines()` in `engine/party.ts`
4. **Shared Normalization**: `splitAddressLines()`, `normalizeCompanyCustomInfo()`

Waybill uses **completely separate**:
1. **Waybill Engine**: `src/domain/waybill/engine/` directory
2. **Waybill Templates**: `src/components/waybill/` directory
3. **Waybill Render Model**: `WaybillRenderModel` type

### Issue Classification

The issue is **multiple overlapping problems**:

1. **Missing Normalization**: No address splitting, no custom info normalization
2. **Missing Renderer Adoption**: Waybill does not use `PartyCard.tsx` or `buildPartyLines()`
3. **Incomplete Type Definitions**: `CompanySettings` and `PartiesBlock` types lack required fields
4. **Legacy Bypass**: Entire waybill pipeline is architecturally separate from invoice/quotation

---

## 6. Dependency Graph

### Invoice/Quotation Flow
```
settings/company_* ──→ buildCompanyPreviewLines() ──→ PdfDocumentModel.issuer
client.* ──────────→ buildClientPreviewLines() ────→ PdfDocumentModel.recipient
                                                              ↓
                                              adaptCommercialDocumentData()
                                                              ↓
                                              CommercialDocumentData.company/client
                                                              ↓
                                              buildPartyLines() ←── Shared Engine
                                                              ↓
                                              PartyCard.tsx ←── Shared Component
                                                              ↓
                                              Industry.tsx (or other template)
                                                              ↓
                                              PdfRenderer.tsx → @react-pdf/renderer
```

### Waybill Flow
```
CompanySettings ──→ resolveBranding() ──→ BrandingBlock
RawWaybill ──────→ resolveParties() ──→ PartiesBlock
                    (no normalization)
                          ↓
              buildWaybillRenderModel()
                          ↓
              WaybillRenderModel
                          ↓
              EvergreenTemplate.tsx (direct rendering)
                          ↓
              @react-pdf/renderer
```

---

## 7. Minimal Fix Recommendation

### Approach: Extend Waybill Types and Resolvers

**Smallest possible change** to align Waybill with Invoice/Quotation:

1. **Extend `CompanySettings` type** in `src/domain/waybill/engine/types.ts`:
   ```typescript
   export interface CompanySettings {
     name: string
     tagline: string | null
     logo: string | null
     address: string | null
     phone: string | null
     email: string | null
     website: string | null        // ← Add
     customInfo: Array<{label: string; value: string}> | null  // ← Add
     city: string | null           // ← Add for address splitting
     state: string | null          // ← Add for address splitting
   }
   ```

2. **Extend `PartiesBlock` type**:
   ```typescript
   export interface PartiesBlock {
     clientName: string | null
     clientAddress: string | null
     clientCityState: string | null  // ← Add
     clientPhone: string | null      // ← Add
     clientEmail: string | null      // ← Add
     senderName: string | null
     receiverName: string | null
   }
   ```

3. **Update `resolveBranding()`** to include website and customInfo
4. **Update `resolveParties()`** to include client phone, email, cityState
5. **Update waybill templates** to render the new fields

### Alternative: Adopt Shared PartyCard Component

A more comprehensive fix would be to refactor Waybill templates to use the shared `PartyCard.tsx` component, but this requires more extensive changes to template layouts.

### Recommended Approach

Start with **extending types and resolvers** (Option 1) as it's the minimal change that addresses the core issue while maintaining waybill template layouts. The shared `PartyCard` adoption can be a separate follow-up task.

---

## Verification

- **Type Check**: `bun run typecheck` (pending)
- **Build**: Skipped per hardware policy
- **Manual Verification**: N/A (audit-only)

---

## Deferred Work

1. **Shared PartyCard Adoption**: Refactor waybill templates to use shared `PartyCard.tsx`
2. **Address Splitting Logic**: Implement `splitAddressLines()` equivalent for waybill
3. **Custom Info Normalization**: Add `normalizeCompanyCustomInfo()` to waybill pipeline
4. **Template Layout Updates**: Adjust waybill template layouts to accommodate new fields
5. **Database Schema Review**: Evaluate if company settings need additional fields

---

## Conclusion

The divergence exists because Waybill uses a completely separate rendering pipeline that was never integrated with the shared Commercial Party architecture. The fix requires extending the waybill type system and resolvers to include the missing fields, then updating templates to render them. The smallest change is to extend existing types rather than adopt the shared renderer, which would require more extensive template refactoring.