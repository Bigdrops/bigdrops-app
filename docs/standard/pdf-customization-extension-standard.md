# PDF Customization Extension Standard

> **Canonical implementation guide.** Reflects the validated production architecture after the Waybill adoption cycle. All future document families MUST conform to this standard.

---

## 1. Architecture Overview

The PDF Customization Engine is a **three-layer system** owned by `src/domain/pdf/customization/`:

```
┌──────────────────────────────────────────────────────────┐
│                    UI Layer (pages/)                       │
│  Owns: controls layout, save flow, template selection     │
│  Pattern: DocumentSheet-embedded, no standalone drawer    │
├──────────────────────────────────────────────────────────┤
│                  Hook Layer (hooks.ts)                      │
│  Owns: React integration, localStorage persistence,       │
│  category-keyed storage, save/load lifecycle              │
├──────────────────────────────────────────────────────────┤
│                Engine Layer (resolver.ts)                   │
│  Owns: pure merge logic, capability gating, policy gating │
│  Resolver is the single source of truth                    │
└──────────────────────────────────────────────────────────┘
```

**Key principle:** The engine owns the data model and resolution logic; the page owns the UI. There is NO standalone `PdfCustomizationPanel` or shared customization drawer. Each document family embeds its controls directly in its own `DocumentSheet`.

---

## 2. Capability Declaration

Every document family MUST declare a static `PdfCustomizationCapabilities` object that defines which customization sockets are available.

**Type:**

```ts
interface PdfCustomizationCapabilities {
  accentColor: boolean    // Template accent color (headers, rules)
  documentFont: boolean   // Body text font family
  handwritingFont: boolean // Fillable entry font (handwriting/script)
  handwritingColor: boolean // Fillable entry color (ink colour)
}
```

**Rule:** Capabilities describe what the **templates** support, not what the UI exposes. If no template in the family uses accentColor, set it `false`.

**Example (Waybill):**

```ts
// src/domain/pdf/customization/waybill.ts
export const WAYBILL_PDF_CAPABILITIES: PdfCustomizationCapabilities = {
  accentColor: false,
  documentFont: true,
  handwritingFont: true,
  handwritingColor: true,
}
```

---

## 3. Policy Declaration

Every document family MUST define a `PdfCustomizationPolicy` that acts as a **master switch** for each capability at the document level.

**Type:**

```ts
interface PdfCustomizationPolicy {
  accentColor: boolean
  documentFont: boolean
  handwritingFont: boolean
  handwritingColor: boolean
}
```

**Rule:** Policy gates the feature independently of template capability. A capability is only active when BOTH `capabilities[cap]` AND `policy[cap]` are `true`. This allows turning off a feature for specific document types without modifying templates.

**Example (Waybill):**

```ts
export const WAYBILL_PDF_POLICY: PdfCustomizationPolicy = {
  accentColor: false,
  documentFont: true,
  handwritingFont: true,
  handwritingColor: true,
}
```

---

## 4. Template Defaults

Every document family MUST define `PdfTemplateDefaults` per template ID, providing fallback values for every capability.

**Type:**

```ts
interface PdfTemplateDefaults {
  accentColor: string
  documentFont: string
  handwritingFont: string
  handwritingColor: string
}
```

**Rule:** Template defaults are the **last-resort fallback** when: the capability is disabled (policy or template), the user has no saved setting, OR the user setting is `'auto'`. They MUST be concrete values, never `'auto'` or a sentinel.

When multiple templates exist, each template ID gets its own defaults map:

```ts
export const WAYBILL_TEMPLATE_DEFAULTS: Record<string, PdfTemplateDefaults> = {
  evergreen: { accentColor: '#1e293b', documentFont: 'Inter', handwritingFont: 'Caveat', handwritingColor: '#1e293b' },
  minimal:   { accentColor: '#1e293b', documentFont: 'Inter', handwritingFont: 'Caveat', handwritingColor: '#1e293b' },
  thermal:   { accentColor: '#1e293b', documentFont: 'Inter', handwritingFont: 'Caveat', handwritingColor: '#1e293b' },
  classic:   { accentColor: '#1e293b', documentFont: 'Inter', handwritingFont: 'Caveat', handwritingColor: '#1e293b' },
  premium:   { accentColor: '#1e293b', documentFont: 'Inter', handwritingFont: 'Caveat', handwritingColor: '#1e293b' },
  slate:     { accentColor: '#1e293b', documentFont: 'Inter', handwritingFont: 'Caveat', handwritingColor: '#1e293b' },
}
```

---

## 5. Resolver Usage (Single Source of Truth)

The resolver in `src/domain/pdf/customization/resolver.ts` is the **only place** where customizations are computed. It provides three pure functions:

### `resolveSettings(templateCapabilities, policy, userSettings?, templateDefaults?)`
- Produces `ResolvedPdfCustomizationSettings` (the flat settings object consumed by templates)
- For each capability: if ENABLED in both capabilities and policy, uses user setting (or template default if absent); if DISABLED, always falls back to template default
- **Critical:** The `handwritingFont` capability maps to `inkFont` in settings; `handwritingColor` maps to `inkColour`

### `resolvePdfCustomization(templateDefaults, resolvedSettings)`
- Transforms `ResolvedPdfCustomizationSettings` → `ResolvedPdfCustomization`
- This is the shape consumed by downstream document engines
- Bridges naming: `inkFont` → `handwritingFont`, `inkColour` → `handwritingColor`

### `resolveFull(templateDefaults?, templateCapabilities?, policy?, userSettings?)`
- Convenience wrapper that calls both above functions in sequence

---

## 6. Hook Usage (`usePdfCustomization`)

Every document view page MUST use the `usePdfCustomization` hook to manage customization state.

**Signature:**

```ts
function usePdfCustomization(options: {
  documentFamily: PdfCustomizationDocumentFamily
  capabilities: PdfCustomizationCapabilities
  policy: PdfCustomizationPolicy
  templateDefaults: Record<string, PdfTemplateDefaults>
}): UsePdfCustomizationReturn
```

**Return value:**

```ts
interface UsePdfCustomizationReturn {
  resolved: ResolvedPdfCustomization           // Computed customization values
  settings: ResolvedPdfCustomizationSettings   // Resolved settings (engine format)
  userSettings: PdfCustomizationSettings       // Raw user-saved settings
  setSettings: (s: PdfCustomizationSettings) => void  // Update + persist
  resetSettings: () => void                    // Clear all user settings
  loading: boolean                             // True during initial load
}
```

**Key behaviors:**
- Loads user settings from `localStorage` on mount using the category key (`pdf_customization_<family>`)
- Calls `resolveFull()` with all inputs
- `setSettings()` writes back to `localStorage` under the same key
- The page owns the save-to-DB flow (template persistence, etc.)
- The hook does NOT write to any database

---

## 7. UI Wiring (Document Sheet, No Standalone Drawer)

Customization controls MUST be embedded inside a `DocumentSheet` on the document view page. There is NO shared `PdfCustomizationPanel` component.

### Preferred UX Pattern (CSR-Style Switch)

Each customization socket uses a **Switch with auto/custom sentinel**:

```
┌──────────────────────────────────────┐
│  Ink Color                    [Switch]│
│  Override the fillable text color    │
│                                      │
│  (When ON: shows color swatches +    │
│   hex input field)                   │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  Handwriting Font             [Switch]│
│  Swap the handwriting script         │
│                                      │
│  (When ON: shows font option chips)  │
└──────────────────────────────────────┘
```

- **Switch OFF** → value is `'auto'` → template default is used
- **Switch ON** → value is a concrete selection → user override applied
- The switch label/description is clickable (not just the switch element)
- Each `Switch` section wraps a single capability socket

### Template Selection

Template selection is rendered inline at the top of the sheet, using either a carousel or selector component appropriate to the family. Never embedded inside a switch.

---

## 8. Category Storage Keys

User preferences persist in `localStorage` using the **category key** pattern:

```
pdf_customization_<documentFamily>
```

Where `documentFamily` is one of: `invoice`, `quotation`, `csr`, `waybill`, `boq`.

**Storage value** is the JSON-serialized `PdfCustomizationSettings` object.

**Rationale:** Category keys allow a user to have different customizations for waybills vs CSRs vs invoices. The key is derived from the `PdfCustomizationDocumentFamily` type, ensuring consistency.

### Attached Document Fallback

When a CSR has an attached invoice and the user downloads both documents together, the customization settings MUST be unified:
- CSR settings are used for the CSR section
- Invoice settings (if available) are used for the invoice section
- If invoice settings are unavailable, the default/invoice-category settings apply
- This is the current known limitation — unified per-audience bundles are deferred

---

## 9. Font Library Extensibility

Fonts are registered in `src/domain/pdf/customization/fontRegistry.ts` via:

- `registerPdfCustomizationFonts()` — registers all PDF fonts with `@react-pdf/renderer`
- `registerPdfCustomizationFillableFonts()` — registers the subset of fonts used for fillable/ink fields

**Adding a new font requires exactly three changes:**
1. Register the font file in the registry
2. Add it to the allowed document font list (`PDF_FONT_OPTIONS`)
3. Add it to the allowed handwriting font list (e.g., `WAYBILL_HANDWRITING_FONTS`, `CSR_HANDWRITING_FONTS`)

No template file changes needed — templates resolve fonts dynamically via the resolver. This was a key architectural win validated in the Waybill rollout.

---

## 10. Renderer-Hook Separation

PDF templates (the renderer layer in `src/components/waybill/` or `src/components/csr/`) receive customization via the `PdfDesignPreset` prop. They NEVER call `usePdfCustomization` or import from the hook layer.

**Contract:**
- Templates are dumb renderers — they receive `designPreset: PdfDesignPreset` and render accordingly
- The bridge function `bridgeToDesignPreset(resolved, templateDefaults)` (static, per-family) converts `ResolvedPdfCustomization` → `PdfDesignPreset`
- The page component computes the preset and passes it down

**Flow:**

```
ViewWaybill.tsx
  → usePdfCustomization()  →  resolved: ResolvedPdfCustomization
  → bridgeToDesignPreset() →  designPreset: PdfDesignPreset
  → <WaybillPDF designPreset={designPreset} ... />
```

---

## 11. Bridge Pattern (Legacy Template Compatibility)

Every document family MUST define a static `bridgeToDesignPreset()` function in its engine metadata file.

**Purpose:** Converts the engine's `ResolvedPdfCustomization` into the legacy `PdfDesignPreset` shape so existing template code can consume it without refactoring.

**Signature:**

```ts
function bridgeToDesignPreset(
  resolved: ResolvedPdfCustomization,
  templateDefaults: PdfTemplateDefaults,
): PdfDesignPreset
```

**Output:** A `PdfDesignPreset` with at minimum:
- `theme`: mapped from resolved accent color
- `fontFamily`: mapped from resolved document font
- `handwritingFontFamily`: mapped from resolved handwriting font
- `handwritingColor`: mapped from resolved handwriting color

---

## 12. Migration Order for New Document Families

When adding PDF customization to a new document family, follow this order:

1. **Define capabilities** — what sockets does this family's templates support?
2. **Define policy** — what sockets are active for this document type?
3. **Define template defaults** — one entry per template ID in the family
4. **Define a static metadata module** — a file like `src/domain/pdf/customization/<family>.ts` that exports capabilities, policy, defaults, and the bridge function
5. **Wire the hook** — in the view page, call `usePdfCustomization()` with the document family and metadata
6. **Build the UI** — embed controls in `DocumentSheet` following the CSR-style Switch pattern. Only render controls for capabilities that are enabled in both capabilities AND policy.
7. **Wire the bridge** — call `bridgeToDesignPreset()` and pass the result to the `PdfDesignPreset` prop of the PDF renderer component
8. **Register fonts** — if the family needs new fonts, update the registry and allowed lists
9. **Verify** — download a PDF in each template, confirm customizations apply. Test the auto/custom switch toggles.

---

## 13. Fillable Content Definition

Fillable fields are the document fields rendered in a handwriting/script font with the configured ink colour. They are defined per template and vary by document family.

For **waybills**, fillable fields include:
- Sender/Receiver name, address, phone
- Item descriptions in the line items table
- Waybill number, date, PO number
- Signature area

For **CSRs**, fillable fields include:
- Make, model, issue description
- Line items
- Customer name
- Date field

**Rules:**
- Fillable fields are hardcoded per template — no dynamic field selection
- All fillable fields in a template share the same handwriting font and ink colour
- Non-fillable fields (headers, labels, borders) use the document font and accent colour
- Template metadata that marks a `fillableColor` property controls which CSS stroke/fill is replaced by the resolved ink colour

---

## 14. Lessons Learned (Waybill Rollout)

1. **Resolver-first:** The biggest win was building the resolver before touching any template or UI code. This allowed parallel work on templates and the hook layer without coordination overhead.
2. **Bridge pattern prevented template churn:** All 6 waybill templates continued consuming `PdfDesignPreset` unchanged. The bridge absorbed the mapping.
3. **Capability gating prevented regressions:** Setting `accentColor: false` in capabilities meant templates that don't use accent colours never received broken values.
4. **Font library extensibility eliminated template edits:** Adding a new font is now a two-file change (registry + allowed list) instead of touching every template.
5. **Switch UX > Select for binary choices:** The CSR-style Switch with auto/custom sentinel reduces cognitive load compared to a dropdown with "Default" option.
6. **Category keys prevent cross-contamination:** The `pdf_customization_<family>` key means waybill settings never bleed into CSRs or invoices.
7. **Do not create a shared standalone drawer:** Each document family has unique enough controls that a shared panel would require too many conditional branches. Let each page own its layout.
