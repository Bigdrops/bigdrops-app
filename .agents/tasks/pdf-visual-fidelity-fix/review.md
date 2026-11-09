# PDF palette isolation and Architectural logo fix

Three commercial invoice templates (Architectural, Executive, Heritage House) were inheriting the BOURXE application theme's amber accent through a shared localStorage design-preset that forwarded `useCustomColors: true` to all templates regardless of which one was active. A second defect caused the Architectural template's issuer logo to appear cramped inside the charcoal masthead. Both defects are fixed in this commit.

The amber bleed was traced to the action/handler layer, not the Forme components — the Forme components' existing `|| TEMPLATE_TOKEN` fallback patterns were already correct; the bug was that the preset entered with `useCustomColors: true` so those fallbacks never fired. The fix inserts a guard at the correct upstream point. The logo fix matches the HTML reference's ~80% image-to-container fill ratio. The commit also removes two pre-existing content problems: a hardcoded "ARCHITECTURAL SPECIFICATION SHEET" internal label in the fixed page header, and an unconditional signature block that rendered empty furniture when no signature was uploaded.

Watch for: (1) **confirmed** — `copperLight` is derived as `tokens.accentColor || ARCHITECTURAL_TOKENS.copperLight`, meaning when a custom accent is enabled, both `copper` and `copperLight` resolve to the same single value, collapsing the two-tone copper hierarchy. (2) **confirmed** — procurement signatory names fall back to hardcoded strings (`'Authorised Requisitioner'`, `'Authorised By'`), which are label-like defaults. These may or may not be customer-visible depending on whether real name data is always present. (3) **confirmed** — visual PDF verification was blocked (no CLI rasterizer available); the fix was validated structurally but not against an actual rendered page.

**Verdict**: APPROVED

---

## High-level view

The root cause was correctly identified as `resolveCommercialDesignPreset()` returning a single shared preset to all commercial templates, including `useCustomColors: true` when the user had previously toggled custom colors on. The fix adds `isIntrinsicPaletteTemplate()` in `src/domain/invoice/types.ts` and applies it in both download paths — the invoice action (`invoicePdfActions.ts`) and the quotation handler (`pdfDownloadHandler.ts`) — forcing `useCustomColors: false` before the preset reaches `adaptCommercialDocumentData`. This is the correct gating point: deeper in the pipeline, the Forme components and the adapter were already handling a null `accentColor` correctly.

Executive and Heritage House are not in the diff because their Forme components were already correct prior to this commit; the fix to the shared guard upstream is sufficient to unblock their intrinsic palettes without touching the component files.

The Architectural logo container moves from 34×34pt (padding 2, gap 8) to 40×40pt (padding 5, gap 12), achieving a 75% image-to-container fill ratio that closely matches the HTML reference's 80.6%. The refactor also reorganises the masthead layout: the logo is now conditionally rendered and its sibling text sits in a `flex: 1` view, which prevents the logo from crowding the company name when present and avoids a layout gap when absent.

The commit removes a hardcoded "ARCHITECTURAL SPECIFICATION SHEET" string that was appearing in the repeating fixed page header — a customer-facing internal label. The signature section is also rewritten to suppress the entire block when no real signature data exists, eliminating empty furniture.

The scope is tight: four files, no unrelated working-tree changes disturbed. Pre-existing uncommitted modifications to Executive, Heritage House, test files, and app-update components are untouched.

---

<details>
<summary>Issues (3)</summary>

1. **Two-tone copper collapse on custom accent** — When a custom accent is explicitly enabled, both `copper` and `copperLight` resolve to the same `tokens.accentColor`, erasing the intentional two-tone hierarchy used throughout the Architectural masthead (header rule, total-box label, balance-due value, bank details header). The HTML reference uses distinct `#a4663f` and `#c08a5f` values. If custom accent is enabled, the operator should derive `copperLight` as a lightened variant of the custom color rather than using the same value for both. Acceptable risk as a deferred enhancement, but warrants tracking.

2. **Procurement signatory name fallbacks render label-like strings** — Lines 576 and 593 fall back to `'Authorised Requisitioner'` and `'Authorised By'` respectively when `name` is absent. Unlike the old code's unconditional rendering, these blocks are now only reached when the signatory object itself exists (`data.procurementSignatories.requisitioner` is truthy). Whether the `name` property can be falsy inside a truthy signatory object depends on the data contract; if so, these generic strings will appear in customer-facing output. Confirm that the signatory object is never created with a missing `name`, or add a `name`-presence gate identical to the one added for the non-procurement signature path.

3. **Visual verification blocked** — The commit record explicitly notes that no CLI PDF rasterizer was available, so the rendered output was not visually inspected against the HTML references. The structural fix is sound, but the acceptance criterion "Actual generated PDFs have been visually inspected" was not met. Manual verification of at least one Architectural and one Executive/Heritage House PDF against their respective HTML references should be performed before treating this as fully closed.

</details>

---

<details>
<summary>Details</summary>

### Guard placement at the action layer

Both call sites read `templateId` before calling `resolveCommercialDesignPreset`, which is the correct order — `templateId` falls back to `'industry'`, so the guard is never applied to the Industry template by accident. The `isIntrinsicPaletteTemplate` helper is placed in `src/domain/invoice/types.ts`, which is slightly awkward as an infrastructure concern shared with quotations, but it's co-located with `normalizeInvoicePdfTemplateId` already imported by both call sites.

### Two-tone copper collapse under custom accent

When `useCustomColors` is true and a custom accent is set, the Architectural template now computes:

```ts
const copper = tokens.accentColor || ARCHITECTURAL_TOKENS.copper      // → custom color
const copperLight = tokens.accentColor || ARCHITECTURAL_TOKENS.copperLight  // → same custom color
```

Both variables carry the identical custom value. The HTML reference deliberately uses `#a4663f` (copper) and `#c08a5f` (copperLight) — the lighter shade on the header run, bank-details border, and charcoal total-box label; the darker on section headings. This was a pre-existing pattern in the component, not introduced here. Since the new guard suppresses custom accents by default, the impact is limited to users who explicitly re-enable the override for Architectural, but the loss of two-tone hierarchy should be tracked.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `src/domain/invoice/types.ts` | Added `INTRINSIC_PALETTE_TEMPLATE_IDS` set and `isIntrinsicPaletteTemplate()` helper |
| `src/components/document-view/invoice/invoicePdfActions.ts` | Import `isIntrinsicPaletteTemplate`; wrap `resolveCommercialDesignPreset` call to force `useCustomColors: false` for intrinsic-palette templates |
| `src/domain/quotation/pdfDownloadHandler.ts` | Same guard on the quotation download path; `templateId` declaration moved before the preset call |
| `src/components/pdf/forme/ArchitecturalFormeDocument.tsx` | Logo container 34→40pt, padding 2→5, row gap 8→12; introduce `copper`/`copperLight` local variables; remove hardcoded "ARCHITECTURAL SPECIFICATION SHEET" header label; conditionalise the PROJECT & DELIVERY SPECIFICATION panel; rewrite signature section to be strictly conditional on real data; suppress empty `customHeaderFields` panel |

Full diff: `git diff HEAD~1...HEAD`
</details>
