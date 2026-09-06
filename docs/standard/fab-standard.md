# Floating Action Button (FAB) Standard — BIGDROPS

> **Version:** 1.0
> **Last Updated:** 2026-09-06
> **Scope:** All floating action buttons across the application (create, save, download).

---

## 1. Purpose

This standard defines the canonical FAB shape, size, icons, and placement rules. It prevents icon divergence — every FAB in the app must use the icons and shapes defined here. No new icon variants for existing FAB roles.

---

## 2. Canonical FAB Shape

All FABs share one container spec:

| Property | Value |
|---|---|
| Width × Height | 50 × 50 px |
| Border radius | 18 px (`rounded-[18px]`) |
| Background | `bg-bd-button-primary-bg` |
| Text color | `text-bd-button-primary-text` |
| Shadow | `shadow-lg` |
| Hover | `hover:scale-105` |
| Active | `active:scale-95` |
| Icon size | `h-5 w-5`, `stroke-[2]` |

No exceptions. Every FAB must use this container. Do not use `rounded-full`, `rounded-2xl`, `rounded-xl`, `h-14 w-14`, `h-[52px] w-[52px]`, or any other size/radius.

---

## 3. FAB Roles and Icons

### 3.1 Create / Plus

| Property | Value |
|---|---|
| Icon | Lucide `Plus` |
| Background | Gradient: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))` |
| Shadow | `0 10px 24px color-mix(in srgb, hsl(var(--primary)) 40%, transparent)` |

**Source:** `src/components/layout/MobileFab.tsx` (shared), `src/pages/Dashboard.tsx` (inline).

Do not use `PlusCircle`, `PlusSquare`, `Sparkles`, `Zap`, `Wand2`, or any other icon for the create FAB.

### 3.2 Save

| Property | Value |
|---|---|
| Icon | Lucide `SaveAll` |
| Background | `bg-bd-button-primary-bg` |

**Source:** `src/components/document/FormFooter.tsx`, `src/components/invoice/mobile/MobileInvoiceCollapsibleSections.tsx`, `src/components/csr/CsrFormScreen.tsx`.

Do not use `Save`, `CheckCircle`, `Bookmark`, `Archive`, `HardDrive`, `FileCheck`, `Database`, `ShieldCheck`, or any other icon for the save FAB.

### 3.3 Download

| Property | Value |
|---|---|
| Icon | Custom SVG (AB Download Manager — arrow + tray with sparkle accents) |
| Background | `bg-bd-button-primary-bg` (or `hsl(var(--primary))` via CSS module) |

**Source:** `src/components/document-view/shared/FloatingDownloadButton.tsx`.

The download icon is an inline SVG component (`DownloadIcon`), not a Lucide icon. Do not use `Download`, `ArrowDown`, `DownloadCloud`, or any other Lucide icon for the download FAB.

---

## 4. Placement Rules

| Context | Position | Offset |
|---|---|---|
| Mobile (bottom nav) | Fixed, bottom-right | `bottom: calc(82px + env(safe-area-inset-bottom))`, `right: 16px` |
| Desktop (CSR) | Fixed, bottom-right | `bottom: 24px`, `right: 24px` |
| Dashboard create | Fixed, bottom-right (mobile) / top-right (desktop) | `bottom: calc(82px + safe-area)`, `right: 16px` / `top: 96px`, `right: 32px` |

All FABs use `z-50` (mobile) or `z-30` (desktop secondary). Maximum one primary FAB per view.

---

## 5. Files

| File | FAB Role | Notes |
|---|---|---|
| `src/components/layout/MobileFab.tsx` | Create (shared) | Canonical create FAB component |
| `src/pages/Dashboard.tsx:131-146` | Create (inline) | Dashboard-specific create with panel |
| `src/components/document/FormFooter.tsx:56-63` | Save | Invoice/quotation form save |
| `src/components/invoice/mobile/MobileInvoiceCollapsibleSections.tsx:256-263` | Save | Invoice mobile save |
| `src/components/csr/CsrFormScreen.tsx:982-1010` | Save + Download | CSR mobile + desktop FABs |
| `src/components/document-view/shared/FloatingDownloadButton.tsx` | Download | Shared download FAB |
| `src/components/document-view/shared/FloatingDownloadButton.module.css` | Download | CSS module for download FAB |

---

## 6. Rules

1. **No new icons.** Every FAB must use the icon from section 3. Do not introduce new icon variants for existing roles.

2. **No new shapes.** Every FAB must use the 50×50 rounded-[18px] container. Do not use circles, larger squares, or custom radii.

3. **Use MobileFab for create.** All create FABs must use the shared `MobileFab` component. Do not inline create FABs unless the dashboard panel pattern is needed.

4. **Use SaveAll for save.** All save FABs must use `SaveAll` from lucide-react. Do not use `Save` or any other icon.

5. **Use custom SVG for download.** All download FABs must use the inline `DownloadIcon` component from `FloatingDownloadButton.tsx`. Do not use Lucide download icons.

6. **One primary FAB per view.** Each view may have one primary FAB (create or save). Secondary actions (download) may appear alongside but must not compete visually.

7. **Respect reduced motion.** FAB animations must degrade gracefully with `prefers-reduced-motion: reduce`.

---

## 7. Adding a New FAB

To add a new FAB to a view:

1. Determine the role (create, save, download).
2. Use the icon from section 3 for that role.
3. Use the container spec from section 2.
4. Place per section 4 rules.
5. If a shared component exists (MobileFab, FloatingDownloadButton), use it.
6. If inline, copy the exact className string from an existing FAB of the same role.
7. Do not introduce new icons, shapes, or sizes.
