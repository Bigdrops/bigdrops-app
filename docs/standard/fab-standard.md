# Floating Action Button (FAB) Standard — BIGDROPS

> **Version:** 1.1
> **Last Updated:** 2026-09-29
> **Scope:** Document-action FABs — the create, save, and download floating action buttons on document modules and document views. The Settings module FAB system (`.su-fab`, `.su-fab-float` in `src/components/settings/settings.css`) is a separate design system with its own container and motion family. It is out of scope for this standard and is currently non-conforming to the container spec in Section 2 (see Section 4.3).

---

## 1. Purpose

This standard defines the canonical FAB shape, size, icons, and placement rules. It prevents icon divergence — every FAB in the app must use the icons and shapes defined here. No new icon variants for existing FAB roles.

---

## 2. Canonical FAB Shape

All document-action FABs share one container spec:

| Property | Value |
|---|---|
| Width × Height | 50 × 50 px |
| Border radius | 18 px (`rounded-[18px]`) |
| Background | `bg-bd-button-primary-bg` |
| Text color | `text-bd-button-primary-text` |
| Shadow | `shadow-lg` |
| Hover feedback | `hover:scale-105` |
| Active/press feedback | `active:scale-95` |
| Icon size | `h-5 w-5`, `stroke-[2]` |

No exceptions. Every document-action FAB must use this container. Do not use `rounded-full`, `rounded-2xl`, `rounded-xl`, `h-14 w-14`, `h-[52px] w-[52px]`, or any other size/radius.

### 2.1 Ambient Motion

The shared document-action FABs carry a continuous ambient float at rest. Current carriers: `MobileFab` (shared create and CSR mobile save), `FormFooter` (form save), `FloatingDownloadButton` (download), and the CSR desktop save/download-blank FABs. The Dashboard inline create FAB is the one document-action FAB that does not float.

| Property | Value |
|---|---|
| Motion | Continuous ambient float (not a bounce) |
| Transform | translateY 0 → -3px → 0 |
| Cycle | 4 seconds, ease-in-out, infinite |
| Start | From mount; runs independently of user interaction |
| Reduced motion | Disabled under `prefers-reduced-motion: reduce` |

The ambient float supplements hover and active feedback. It does not replace them. The float is applied to a wrapper element around the button, never to the button itself, so the button's own hover and active transforms are preserved.

The Settings module FAB system uses a different motion family (a true bounce). See Section 4.3. The two motion families are distinct and must not be conflated.

---

## 3. FAB Roles and Icons

### 3.1 Create / Plus

| Property | Value |
|---|---|
| Icon | Lucide `Plus` |
| Background | Gradient: `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))` |
| Shadow | `0 10px 24px color-mix(in srgb, hsl(var(--primary)) 40%, transparent)` |

**Source:** `src/components/layout/MobileFab.tsx` (shared), `src/pages/Dashboard.tsx` (inline).

`MobileFab` is the shared, role-agnostic FAB component. It accepts an `icon` prop and defaults to `Plus`. It is used for create actions across list and workspace pages, and for the CSR mobile save action (with `SaveAll`). Use it whenever a FAB is not better served by a dedicated component (`FormFooter` save, `FloatingDownloadButton`).

Do not use `PlusCircle`, `PlusSquare`, `Sparkles`, `Zap`, `Wand2`, or any other icon for the create FAB.

### 3.2 Save

| Property | Value |
|---|---|
| Icon | Lucide `SaveAll` |
| Background | `bg-bd-button-primary-bg` |

**Source:** `src/components/document/FormFooter.tsx` (invoice, quotation, waybill forms), `src/components/csr/CsrFormScreen.tsx` (desktop), `src/components/layout/MobileFab.tsx` (CSR mobile, via the `icon` prop).

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

### 4.1 Clearance Principle

A FAB must clear the relevant bottom navigation, footer, or action surface beneath it by a contextual offset. The offset is a consequence of the surface geometry, not a fixed magic number. Where a layout exposes a navigation-offset token, use it. Where it does not, use a fixed value that clears the surface.

### 4.2 Current Contextual Values

| Context | Position | Offset |
|---|---|---|
| Mobile list/workspace create (`MobileFab`) | Fixed, bottom-right | `bottom: 94px`, `right: 16px` |
| Mobile form save (`FormFooter`) | Fixed, bottom-right | `bottom: calc(var(--bd-app-bottom-nav-offset, 72px) + env(safe-area-inset-bottom) + 16px)`, `right: 16px` (32px on `sm+`) |
| Mobile Dashboard create | Fixed, bottom-right | `bottom: calc(82px + env(safe-area-inset-bottom))`, `right: 16px` |
| Desktop (CSR) | Fixed, bottom-right | `bottom: 24px`, `right: 24px` |
| Dashboard create (desktop) | Fixed, top-right | `top: 96px`, `right: 32px` |

The `FormFooter` offset uses the `--bd-app-bottom-nav-offset` token so the FAB tracks the real navigation height. Prefer this token-based form when the host layout exposes it.

### 4.3 Z-Index and FAB Families

Document-action FABs use `z-50` (mobile) or `z-30` (desktop secondary). Maximum one primary FAB per view.

The Settings module FAB system (`.su-fab`, `.su-fab-float` in `src/components/settings/settings.css`) is a separate design system. It uses a 48px circular container and a true bounce motion. It is out of scope for this standard and is currently non-conforming to the Section 2 container spec. This standard does not legitimize that variant. Bringing Settings into conformance is a separate decision.

Known deviation: `FormFooter` currently uses `z-[60]`. The normative value is `z-50`. The deviation is recorded as non-conforming, not as an approved hierarchy change.

---

## 5. Files

| File | FAB Role | Notes |
|---|---|---|
| `src/components/layout/MobileFab.tsx` | Create (shared) | Canonical create FAB component |
| `src/pages/Dashboard.tsx` | Create (inline) | Dashboard-specific create with panel |
| `src/components/document/FormFooter.tsx` | Save | Invoice/quotation/waybill form save |
| `src/components/csr/CsrFormScreen.tsx` | Save + Download | CSR mobile + desktop FABs |
| `src/components/document-view/shared/FloatingDownloadButton.tsx` | Download | Shared download FAB |
| `src/components/document-view/shared/FloatingDownloadButton.module.css` | Download | CSS module for download FAB |
| `src/components/document-view/shared/FloatingDocumentButton.tsx` | Download | Accessible button primitive |
| `src/components/layout/fabFloat.css` | Motion | Shared ambient float + halo keyframes |

---

## 6. Rules

1. **No new icons.** Every document-action FAB must use the icon from section 3. Do not introduce new icon variants for existing roles.
2. **No new shapes.** Every document-action FAB must use the 50×50 rounded-[18px] container. Do not use circles, larger squares, or custom radii.
3. **Use MobileFab as the shared FAB.** `MobileFab` is role-agnostic. Use it for create and for any FAB action that does not have a dedicated component. It defaults to the `Plus` icon and accepts an `icon` prop (e.g., `SaveAll` for the CSR mobile save).
4. **Use SaveAll for save.** All save FABs must use `SaveAll` from lucide-react. Do not use `Save` or any other icon.
5. **Use custom SVG for download.** All download FABs must use the inline `DownloadIcon` component from `FloatingDownloadButton.tsx`. Do not use Lucide download icons.
6. **One primary FAB per view.** Each view may have one primary FAB (create or save). Secondary actions (download) may appear alongside but must not compete visually.
7. **Ambient float on shared document-action FABs.** The shared document-action FABs (`MobileFab`, `FormFooter` save, `FloatingDownloadButton`, CSR desktop FABs) carry the continuous ambient float defined in Section 2.1. The float supplements hover and active feedback and must not replace it. Apply the float to a wrapper element, never to the button itself.
8. **Respect reduced motion.** FAB animations must degrade gracefully with `prefers-reduced-motion: reduce`. The ambient float is disabled under reduced motion; hover and active transitions remain.

### Known Non-Conformances

These are implementation defects against still-valid rules. They are recorded as violations, not as approved variants:

- CSR desktop download-blank uses the Lucide `Download` icon (violates rule 5).
- Settings `.su-fab` uses a 48px circular container (violates rule 2; see Section 4.3).
- `FormFooter` uses `z-[60]` (violates the Section 4.3 z-index rule).
- CSR desktop FAB icons render at `h-6 w-6` (violates the Section 2 icon size).

---

## 7. Adding a New FAB

To add a new FAB to a view:

1. Determine the role (create, save, download).
2. Use the icon from section 3 for that role.
3. Use the container spec from section 2.
4. Place per section 4 rules.
5. If a shared component exists (MobileFab, FloatingDownloadButton), use it.
6. If inline, copy the exact className string from an existing FAB of the same role.
7. Apply the ambient float from Section 2.1 via a wrapper element.
8. Do not introduce new icons, shapes, or sizes.

Do not add FABs to Settings module screens. That module uses a separate FAB design system (Section 4.3).
