# Company & Client Data Architecture Audit

**Date:** 2026-06-26
**Scope:** Read-only inspection of company and client data model, PDF rendering pipeline, and UI forms
**Status:** Complete

---

## 1. Database Schema

### `settings` table (single-row, always `id=1`)

| Column | Type | Notes |
|---|---|---|
| `id` | integer | Always `1` |
| `company_name` | text | |
| `company_tagline` | text | |
| `company_address` | text | Single line, no structure |
| `company_city` | text | Labeled "City / State" in UI — stores both |
| `company_phone` | text | |
| `company_email` | text | |
| `company_website` | text | **Stored but NOT rendered in PDF** |
| `bank_name` | text | Legacy — now uses `bank_accounts` table |
| `bank_account_name` | text | Legacy |
| `bank_account_number` | text | Legacy |
| `bank_sort_code` | text | Legacy |
| `footer_text` | text | |
| `company_logo_url` | text | |
| `signature_url` | text | |
| `custom_info` | text | JSON string `[{title, content}]` |
| `app_background_color` | text | Theme |
| `app_card_color` | text | Theme |
| `app_theme_preset_id` | text | Theme |
| `app_theme_tokens` | jsonb | Theme |

**Missing columns:** `company_state`, `company_country`, `company_post_code`

### `clients` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Auto-generated |
| `name` | text | NOT NULL |
| `address` | text | NOT NULL — single line |
| `phone` | text | |
| `email` | text | |
| `category` | text | |
| `notes` | text | |
| `city` | text | |
| `state` | text | |
| `contact_person` | text | |
| `archived_at` | timestamptz | |

**Missing columns:** `country`, `post_code`, `website`, `vat_number`

---

## 2. Type System Gaps

### `ClientLike` (renderTypes.ts:81)

```ts
export type ClientLike = {
  contact_person?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
}
```

- **Missing:** `name` — the client name is NOT on `ClientLike`. It comes from `InvoiceLike.client_name` instead.
- **Missing:** `category`, `notes` — present in DB but not in render type.
- No `country`, `post_code`, `vat_number` fields.

### `SettingsLike` (renderTypes.ts:90)

```ts
export type SettingsLike = {
  company_address?: string | null
  company_city?: string | null
  company_state?: string | null   // <-- PHANTOM FIELD
  company_vat?: string | null
  company_phone?: string | null
  company_email?: string | null
}
```

- **`company_state` is a phantom field.** It does not exist in the `settings` DB table. The `partyProjection.ts` tries to use it (`settings?.company_state`), but it will always be `undefined`. The Settings UI form only has `company_city` (labeled "City / State"), which stores the combined value.
- **Missing:** `company_name`, `company_tagline`, `company_website`, `custom_info` — present in DB and Settings UI but not in `SettingsLike`.
- **Missing:** `company_logo_url`, `signature_url`, `footer_text` — present in DB but not in `SettingsLike`.

### `ClientRecord` (clientWorkspace.ts:4)

```ts
export interface ClientRecord {
  id: string
  name?: string | null
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  category?: string | null
}
```

- This is the most complete client type, used by `ClientSelector.tsx` and `Clients.tsx`.
- **Missing:** `notes`, `archived_at` — present in DB but not in `ClientRecord`.

---

## 3. PDF Rendering Pipeline

### Flow

```
Supabase (settings/clients tables)
  → BuildInvoicePreviewModelInput
    → buildInvoicePreviewModel()
      → buildCompanyPreviewLines(settings) → string[]
      → buildClientPreviewLines(client)    → string[]
    → adaptIndustryData(PdfDocumentModel)
      → splitAddressLines(addressLines)
      → IndustryTemplateData.company / client
    → IndustryPartyCard component
```

### `partyProjection.ts` — Line Builders

**`buildCompanyPreviewLines(settings)`** produces:
```
[settings.company_address, "city, state", "VAT Number: ...", "Phone: ...", "Email: ..."]
```

- Uses `settings.company_state` (phantom — always undefined).
- Does NOT include `company_website`, `custom_info`, `company_name`, or `company_tagline`.
- VAT comes from `settings.company_vat` — but `company_vat` is NOT in the DB schema! It's a phantom field that's never set from the UI.

**`buildClientPreviewLines(client)`** produces:
```
["Attn: contact_person", address, "city, state", phone, email]
```

- Does NOT include `category`, `notes`, or any hypothetical `vat_number`.

### `industryAdapter.ts` — `adaptIndustryData()`

**Company shape passed to template:**
```ts
{
  companyLogoUrl: string
  name: string
  tagline: string
  address: string          // first line from splitAddressLines
  cityState: string        // remaining lines joined
  phone: string
  email: string
  customInfo: [{ label, value }]  // only from model.issuer.taxId
}
```

**Client shape passed to template:**
```ts
{
  name: string
  address: string
  cityState: string
  phone: string
  email: string
}
```

- Client has **NO `customInfo`** field — the `IndustryPartyCard` component handles this via `'customInfo' in party ? party.customInfo : []`, so client custom fields silently render nothing.
- `customInfo` for company only comes from `model.issuer.taxId` — NOT from `settings.custom_info` JSON. The `custom_info` field in the DB is parsed in `CompanySettingsSection.tsx` for the UI display, but never flows to the PDF.

### `IndustryPartyCard` (industryTemplateBlocks.tsx)

Renders:
- `party.name` (bold)
- `party.address` (Text)
- `party.cityState` (Text)
- `party.phone` (Text, muted color)
- `party.email` (Text, muted color)
- `customInfo` items in a bordered section with label/value rows

Labels are **inline with values** (e.g., just the phone number text), NOT separate label rows like SignalBands. The customInfo section uses a two-column `metaRow` layout with separate label and value.

---

## 4. UI Forms

### Settings → Company Info (`CompanySettingsSection.tsx`)

Editable fields:
- `company_name` → "Legal Business Name"
- `company_tagline` → "Tagline / Motto"
- `company_address` → "Physical Address"
- `company_city` → "City / State" (single field, stores combined value)
- `company_phone` → "Phone Number"
- `company_email` → "Official Email"
- `company_website` → "Website URL"
- `custom_info` → JSON array of `{title, content}` pairs, editable via dynamic add/remove

**No fields for:** state (separate), country, post code, VAT number.

### Clients → Add/Edit (`ClientSelector.tsx` inline dialog, `AddClient.tsx`, `EditClient.tsx`)

Editable fields:
- `name` → "Company / Client Name"
- `contact_person` → "Contact Person"
- `category` → "Category" (dropdown)
- `phone` → "Phone"
- `email` → "Email"
- `address` → "Address Line 1"
- `address2` → "Address Line 2" (concatenated with address on save: `address, address2`)
- `city` → "City"
- `state` → "State"

**No fields for:** country, post code, website, VAT number, notes (in inline dialog).

---

## 5. Identified Gaps

### 5.1 Phantom Fields (Type exists, DB column missing)

| Field | Where Referenced | DB Status |
|---|---|---|
| `company_state` | `SettingsLike`, `partyProjection.ts` | **Does not exist** in `settings` table |
| `company_vat` | `SettingsLike`, `partyProjection.ts` | **Does not exist** in `settings` table |

### 5.2 Stored but Not Rendered

| Field | DB | Settings UI | PDF |
|---|---|---|---|
| `company_website` | ✅ | ✅ | ❌ Not rendered |
| `custom_info` | ✅ (JSON) | ✅ (parsed/displayed) | ❌ Not sent to PDF pipeline |
| `client.notes` | ✅ | ❌ (not in inline dialog) | ❌ |

### 5.3 Missing DB Columns

| Missing Column | Would Affect |
|---|---|
| `company_state` (separate) | Settings, PDF |
| `company_country` | Settings, PDF |
| `company_post_code` | Settings, PDF |
| `client.country` | Client forms, PDF |
| `client.post_code` | Client forms, PDF |
| `client.vat_number` | Client forms, PDF |
| `client.website` | Client forms, PDF |

### 5.4 Type Mismatches

| Issue | Detail |
|---|---|
| `ClientLike` missing `name` | Client name comes from `InvoiceLike.client_name` instead |
| `SettingsLike` missing `company_name` | Company name not in render type |
| `SettingsLike` missing `company_tagline` | Tagline not in render type |
| `SettingsLike` missing `company_website` | Website not in render type |
| `SettingsLike` missing `custom_info` | Custom info not in render type |
| Client `customInfo` silently empty | `IndustryPartyCard` checks `'customInfo' in party` but client type never has it |

### 5.5 Address Handling

- Both company and client addresses are **single text fields** in the DB.
- `ClientSelector.tsx` concatenates "Address Line 1" + "Address Line 2" with a comma separator before saving.
- `splitAddressLines()` in the adapter treats the first line as `address` and remaining as `cityState`.
- `buildCompanyPreviewLines()` and `buildClientPreviewLines()` put the raw `address` as the first line, then `city, state` as the second line.
- There is **no structured address** (line 1, line 2, city, state, country, post code) — everything is freeform text.

---

## 6. Data Flow Summary

```
┌─────────────────────────────────────────────────────┐
│  DB: settings table (single row, id=1)              │
│  company_name, company_tagline, company_address,    │
│  company_city, company_phone, company_email,        │
│  company_website, custom_info (JSON)                │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  SettingsLike (renderTypes.ts)                      │
│  company_address, company_city, company_state*,     │
│  company_vat*, company_phone, company_email         │
│  (* = phantom, not in DB)                           │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  partyProjection.ts                                 │
│  buildCompanyPreviewLines() → string[]              │
│  [address, "city, state", "VAT: ...", "Phone: ..."]│
│  Does NOT include: name, tagline, website, custom   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  PdfDocumentModel.issuer (PdfParty)                 │
│  { name, addressLines: string[], phone, email,      │
│    taxId, attention }                               │
│  NOTE: name comes from InvoiceLike.client_name or   │
│  settings — NOT from PdfParty.addressLines          │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  industryAdapter.ts → adaptIndustryData()           │
│  splitAddressLines() → { address, cityState }       │
│  Builds IndustryTemplateData.company                │
│  { name, tagline, address, cityState, phone, email, │
│    customInfo: [{ label: "Tax ID", value }] }       │
│  customInfo ONLY from taxId, NOT from custom_info   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  IndustryPartyCard (industryTemplateBlocks.tsx)     │
│  Renders: name (bold), address, cityState, phone,   │
│  email, customInfo items in bordered section        │
│  Client party has NO customInfo field               │
└─────────────────────────────────────────────────────┘
```

---

## 7. Recommendations (Observations Only)

1. **`company_website`** is stored and editable but never appears on PDFs — may be intentional or an oversight.
2. **`custom_info`** is stored and displayed in Settings UI but never reaches the PDF — the PDF only shows `taxId` as a hardcoded custom field.
3. **`company_state`** and **`company_vat`** phantom fields should either be added to the DB or removed from the type system.
4. **Address structure** is entirely freeform — no structured fields for country, post code, or multi-line addresses.
5. **Client `customInfo`** is architecturally supported by the component but has no data source — the `IndustryTemplateData.client` type lacks a `customInfo` field.
6. **`ClientLike`** is missing `name` — client name is passed separately via `InvoiceLike.client_name`, creating a split data path.

---

*This is a read-only audit. No code changes were made.*
