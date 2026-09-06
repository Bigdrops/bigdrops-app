# FAB Consistency Audit Report

This report was written by Codex on 2026-09-06 via Local Runner.

---

## Objective

Audit all floating action buttons (FABs) across the BIGDROPS codebase for visual and behavioral consistency. Identify every variant, map usage, and define a single canonical spec.

## Scope

- All `.tsx` files under `src/` that render fixed-position floating buttons
- Shared FAB components, inline FABs, and dead FAB code
- Visual properties: size, shape, position, icon, shadow, animation, background
- Behavioral properties: hover, active, disabled states

---

## Findings

### FAB Inventory (9 Production Variants)

| # | Location | Component | Shape | Size | Icon Size | Position (bottom) | Background | Shadow | Animation | Hover |
|---|----------|-----------|-------|------|-----------|-------------------|------------|--------|-----------|-------|
| 1 | `MobileFab.tsx` | Shared | `rounded-full` | 56×56 | 28px | `bottom-[94px]` | `bg-bd-button-primary-bg` | `shadow-lg` | `csrFabFloat 4s infinite` (gentle float) | `hover:scale-105` |
| 2 | `Dashboard.tsx:132` | Inline | `rounded-[18px]` | 50×50 | 20px | `calc(82px + safe-area)` | `linear-gradient(135deg, primary, secondary)` | custom gradient box-shadow | none | none |
| 3 | `FormFooter.tsx:56` | Inline | `rounded-2xl` | 56×56 | 20px | `calc(bottom-nav-offset + safe-area + 16px)` | `bg-bd-button-primary-bg` | `shadow-lg` | `animate-in fade-in slide-in-from-bottom-4` | none |
| 4 | `MobileInvoiceCollapsibleSections.tsx:256` | Inline | `rounded-[16px]` | 52×52 | 20px | same as FormFooter | `bg-bd-button-primary-bg` | `shadow-lg` | none | none |
| 5 | `FloatingDownloadButton.tsx` | Shared | `border-radius: 14px` | 52×52 | 22px (CSS override) | `24px` desktop / `calc(88px + safe-area)` mobile | `hsl(var(--primary))` | custom CSS multi-shadow | `transition 150ms` | `translateY(-2px)` |
| 6 | `InvoiceWorkspace.tsx:110` | `FloatingDocumentButton` | `--bd-radius-lg` | 52×52 | 22px | same as #5 via CSS module | `hsl(var(--primary))` | CSS module `.fab` | none | none |
| 7 | `ProjectActionRail.tsx:91` | Inline | `rounded-full` | 56×56 | 24px | `bottom-6` | `bg-bd-button-primary-bg` | `shadow-2xl` | none | `hover:scale-110` |
| 8 | `CsrFormScreen.tsx:993` (desktop) | Inline | `rounded-2xl` | 56×56 | 24px | `bottom-6` | `bg-bd-surface` (download) / `bg-bd-button-primary-bg` (save) | `shadow-lg` | none | `hover:scale-105` |
| 9 | `CsrFormScreen.tsx:984` (mobile) | `MobileFab` | `rounded-full` | 56×56 | 28px | `bottom-[94px]` | `bg-bd-button-primary-bg` | `shadow-lg` | `csrFabFloat 4s infinite` | `hover:scale-105` |

### Dead Code

| File | Status |
|------|--------|
| `src/components/document-view/invoice/FloatingFAB.tsx` | Exported but never imported. Superseded by `FloatingDocumentButton` + `FloatingDownloadButton`. |

---

## Inconsistencies Found

### 1. Shape — 4 different border-radii

| Shape | Used by |
|-------|---------|
| `rounded-full` (circle) | MobileFab (#1, #9), ProjectActionRail (#7) |
| `rounded-[18px]` | Dashboard (#2) |
| `rounded-[16px]` | MobileInvoiceSave (#4) |
| `rounded-2xl` (~16px) | FormFooter (#3), CSR Desktop (#8) |
| `14px` (CSS) | FloatingDownloadButton (#5) |

### 2. Size — 3 different dimensions

| Size | Used by |
|------|---------|
| 50×50 | Dashboard (#2) |
| 52×52 | MobileInvoiceSave (#4), FloatingDownloadButton (#5), InvoiceWorkspace (#6) |
| 56×56 | MobileFab (#1, #9), FormFooter (#3), ProjectActionRail (#7), CSR Desktop (#8) |

### 3. Position — 4 different bottom offsets

| Bottom offset | Used by |
|---------------|---------|
| `bottom-[94px]` | MobileFab (#1, #9) |
| `calc(82px + safe-area)` | Dashboard (#2) |
| `calc(bottom-nav-offset + safe-area + 16px)` | FormFooter (#3), MobileInvoiceSave (#4) |
| `24px` desktop / `calc(88px + safe-area)` mobile | FloatingDownloadButton (#5), InvoiceWorkspace (#6) |
| `bottom-6` (24px) | ProjectActionRail (#7), CSR Desktop (#8) |

### 4. Icon size — 4 different icon sizes

| Icon size | Used by |
|-----------|---------|
| 16px | FloatingDownloadButton (#5) |
| 20px | Dashboard (#2), FormFooter (#3), MobileInvoiceSave (#4) |
| 24px | ProjectActionRail (#7), CSR Desktop (#8) |
| 28px | MobileFab (#1, #9) |

### 5. Background — 3 different treatments

| Background | Used by |
|------------|---------|
| `bg-bd-button-primary-bg` (design token) | MobileFab (#1), FormFooter (#3), MobileInvoiceSave (#4), ProjectActionRail (#7), CSR Desktop (#8) |
| `hsl(var(--primary))` (raw CSS variable) | FloatingDownloadButton (#5), InvoiceWorkspace (#6) |
| `linear-gradient(135deg, primary, secondary)` | Dashboard (#2) |

### 6. Shadow — 3 different treatments

| Shadow | Used by |
|--------|---------|
| `shadow-lg` | MobileFab (#1), FormFooter (#3), MobileInvoiceSave (#4), CSR Desktop (#8) |
| `shadow-2xl` | ProjectActionRail (#7) |
| Custom CSS box-shadow | Dashboard (#2), FloatingDownloadButton (#5), InvoiceWorkspace (#6) |

### 7. Animation — inconsistent presence

| Animation | Used by |
|-----------|---------|
| Gentle float (`csrFabFloat 4s`) | MobileFab (#1, #9) |
| Slide-in (`animate-in fade-in slide-in-from-bottom-4`) | FormFooter (#3) |
| None | Dashboard (#2), MobileInvoiceSave (#4), FloatingDownloadButton (#5), InvoiceWorkspace (#6), ProjectActionRail (#7), CSR Desktop (#8) |

### 8. Hover — inconsistent scaling

| Hover | Used by |
|-------|---------|
| `hover:scale-105` | MobileFab (#1, #9), CSR Desktop (#8) |
| `hover:scale-110` | ProjectActionRail (#7) |
| `translateY(-2px)` | FloatingDownloadButton (#5) |
| None | Dashboard (#2), FormFooter (#3), MobileInvoiceSave (#4), InvoiceWorkspace (#6) |

---

## Recommended Canonical Spec

### A. Create FAB (primary action — "Plus")

| Property | Value |
|----------|-------|
| Shape | `rounded-full` (circle) |
| Size | 56×56 (`h-14 w-14`) |
| Icon | `Plus`, 24px, `strokeWidth={2}` |
| Position | `fixed bottom-[94px] right-4 z-50` (mobile only, `md:hidden`) |
| Background | `bg-bd-button-primary-bg` |
| Text | `text-bd-button-primary-text` |
| Shadow | `shadow-lg` |
| Animation | `csrFabFloat 4s ease-in-out infinite` (gentle float) |
| Halo | Radial gradient blur pulse behind button |
| Hover | `hover:scale-105` |
| Active | `active:scale-95` |
| Disabled | `disabled:opacity-50` |
| Reduced motion | Float and halo animations disabled |

**Used by:** All list pages (Invoices, Projects, Waybills, Clients, Letters, CSR, RFQs, Quotations, BOQs) + Dashboard.

**Dashboard special case:** Also visible on desktop (`lg:right-8 lg:top-24`). Remove `md:hidden` only for Dashboard; all other pages keep mobile-only.

### B. Save FAB (form action — "Save")

| Property | Value |
|----------|-------|
| Shape | `rounded-full` (circle) |
| Size | 56×56 (`h-14 w-14`) |
| Icon | `Save` / `Loader2` (spinning), 24px |
| Position | `fixed bottom-[94px] right-4 z-50 md:hidden` (mobile) |
| Background | `bg-bd-button-primary-bg` |
| Text | `text-bd-button-primary-text` |
| Shadow | `shadow-lg` |
| Animation | `animate-in fade-in slide-in-from-bottom-4` |
| Hover | `hover:scale-105` |
| Active | `active:scale-95` |
| Disabled | `disabled:opacity-50 disabled:bg-bd-surface-muted disabled:text-bd-text-muted` |

**Used by:** FormFooter (invoices, waybills, quotations, RFQs, letters, BOQs), CSR form (mobile via MobileFab), MobileInvoiceCollapsibleSections.

### C. Download FAB (document action — "Download")

| Property | Value |
|----------|-------|
| Shape | `rounded-full` (circle) |
| Size | 56×56 (`h-14 w-14`) |
| Icon | `Download`, 24px, `strokeWidth={2}` |
| Position | `fixed bottom-[94px] right-4 z-50 md:hidden` (mobile) |
| Background | `bg-bd-button-primary-bg` |
| Text | `text-bd-button-primary-text` |
| Shadow | `shadow-lg` |
| Animation | `animate-in fade-in slide-in-from-bottom-4` |
| Hover | `hover:scale-105` |
| Active | `active:scale-95` |

**Used by:** All document view pages (ViewInvoice, ViewWaybill, ViewQuotation, ViewRfq, ViewCSR, ViewBoq, ViewReceipt).

**Desktop:** Show at `bottom-6 right-6` with `md:bottom-6 md:right-6`.

### D. Project Action Rail (special case — keep as-is)

The ProjectActionRail is not a standard FAB — it's a quick-action menu trigger. Its larger shadow (`shadow-2xl`) and stronger hover (`hover:scale-110`) are intentional for its role as a menu anchor. Keep as-is but align shape to `rounded-full` and size to 56×56 (already matches).

---

## Files to Change

| # | File | Change |
|---|------|--------|
| 1 | `src/pages/Dashboard.tsx:132-146` | Replace inline FAB with `<MobileFab>` (or match canonical spec: `rounded-full`, 56×56, `bg-bd-button-primary-bg`, no gradient) |
| 2 | `src/components/document/FormFooter.tsx:56-63` | Change `rounded-2xl` → `rounded-full`, `h-14 w-14` stays, add `hover:scale-105` |
| 3 | `src/components/invoice/mobile/MobileInvoiceCollapsibleSections.tsx:256-263` | Change `rounded-[16px]` → `rounded-full`, `h-[52px] w-[52px]` → `h-14 w-14`, add `hover:scale-105`, add `animate-in fade-in slide-in-from-bottom-4` |
| 4 | `src/components/document-view/shared/FloatingDownloadButton.tsx` | Change from `rounded-[14px]` 52×52 to `rounded-full` 56×56. Replace CSS module with Tailwind classes matching canonical spec. |
| 5 | `src/components/document-view/shared/FloatingDownloadButton.module.css` | Delete or gut (replace with Tailwind) |
| 6 | `src/components/document-view/invoice/FloatingFAB.tsx` | Delete (dead code) |
| 7 | `src/components/document-view/invoice/InvoiceWorkspace.tsx:110-117` | Switch from `FloatingDocumentButton` + CSS module to `FloatingDownloadButton` (canonical) |
| 8 | `src/components/document-view/invoice/InvoiceWorkspace.module.css` | Remove `.fab` CSS rules (lines 405-432) |
| 9 | `src/components/csr/CsrFormScreen.tsx:993-1010` | Align desktop buttons to canonical: `rounded-full`, consistent shadow/hover |

---

## Verification

After changes:

```bash
bun run audit:load
bun run typecheck
```

Visual check: all FABs should be 56×56 circles with `bg-bd-button-primary-bg`, `shadow-lg`, consistent hover/active states.

---

## Risks

- `FloatingDownloadButton.module.css` is imported by `FloatingDownloadButton.tsx` and potentially by `InvoiceWorkspace.module.css`. Verify all CSS module references before deleting.
- Dashboard FAB has desktop visibility (`lg:` breakpoint). Ensure `MobileFab` accepts an optional `desktopVisible` prop or keep Dashboard inline but restyle to match canonical spec.
- `FormFooter.tsx` uses `animate-in` from `tailwind-animate`. Verify this utility is available before relying on it in other FABs.

---

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English
